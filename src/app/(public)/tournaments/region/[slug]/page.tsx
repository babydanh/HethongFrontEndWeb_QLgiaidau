import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { BRAND } from '@/constants/brand';
import type { Tournament } from '@/types/tournament';
import { getTournamentShortLocation } from '@/utils/tournament-location';
import { stripHtmlAndNormalize } from '@/utils/string';

export const revalidate = 3600;

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sporto.asia';
const apiUrl = process.env.NEXT_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://sporto.asia/api/v1';
const MIN_TOURNAMENTS_FOR_INDEXABLE_PAGE = 2;
const MAX_PUBLIC_TOURNAMENTS = 5000;
const PUBLIC_STATUSES = new Set([
  'UPCOMING',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
  'IN_PROGRESS',
  'ONGOING',
  'COMPLETED',
]);

type ApiEnvelope<T> = { data?: T; meta?: { nextCursor?: string | null; hasMore?: boolean } };

interface RegionLandingData {
  regionName: string;
  tournaments: Tournament[];
}

function normalizeRegionSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/^(tinh|thanh-pho|tp)\s+/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getTournamentRegion(tournament: Tournament): string | null {
  const location = tournament.tournamentConfig?.location;
  const value = location?.province?.trim() || tournament.city?.trim();
  return value || null;
}

function getRegionDisplayName(regionName: string): string {
  return regionName.replace(/^(Tỉnh|Thành phố|TP\.?)[\s.]+/i, '').trim();
}

async function fetchPublicTournaments(): Promise<Tournament[]> {
  const all: Tournament[] = [];
  let cursor: string | null = null;
  let pages = 0;

  while (all.length < MAX_PUBLIC_TOURNAMENTS && pages < 200) {
    pages += 1;
    const query = new URLSearchParams({ visibility: 'PUBLIC', limit: '50' });
    if (cursor) query.set('cursor', cursor);

    try {
      const response = await fetch(`${apiUrl}/tournaments?${query.toString()}`, {
        next: { revalidate },
      });
      if (!response.ok) break;
      const payload = (await response.json()) as ApiEnvelope<Tournament[]>;
      const data = Array.isArray(payload.data) ? payload.data : [];
      if (data.length === 0) break;
      all.push(...data);
      cursor = payload.meta?.nextCursor ?? null;
      if (!payload.meta?.hasMore || !cursor) break;
    } catch {
      break;
    }
  }

  return all.filter((tournament) => PUBLIC_STATUSES.has(String(tournament.status).toUpperCase()));
}

async function getRegionLandingData(slug: string): Promise<RegionLandingData | null> {
  const tournaments = await fetchPublicTournaments();
  const grouped = new Map<string, { regionName: string; tournaments: Tournament[] }>();

  for (const tournament of tournaments) {
    const regionName = getTournamentRegion(tournament);
    if (!regionName) continue;
    const regionSlug = normalizeRegionSlug(regionName);
    const current = grouped.get(regionSlug) ?? { regionName, tournaments: [] };
    current.tournaments.push(tournament);
    grouped.set(regionSlug, current);
  }

  const result = grouped.get(slug);
  if (!result || result.tournaments.length < MIN_TOURNAMENTS_FOR_INDEXABLE_PAGE) return null;
  return result;
}

export async function generateStaticParams() {
  const tournaments = await fetchPublicTournaments();
  const grouped = new Map<string, number>();

  for (const tournament of tournaments) {
    const regionName = getTournamentRegion(tournament);
    if (!regionName) continue;
    const slug = normalizeRegionSlug(regionName);
    grouped.set(slug, (grouped.get(slug) ?? 0) + 1);
  }

  return Array.from(grouped.entries())
    .filter(([, count]) => count >= MIN_TOURNAMENTS_FOR_INDEXABLE_PAGE)
    .map(([slug]) => ({ slug }));
}

function formatDate(startDate: string | null | undefined, endDate: string | null | undefined, locale: string, fallbackDate: string): string {
  if (!startDate) return fallbackDate;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return fallbackDate;
  const startText = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(start);
  if (!endDate) return startText;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return startText;
  const endText = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(end);
  return startText === endText ? startText : `${startText} – ${endText}`;
}

function statusKey(status: Tournament['status']) {
  if (status === 'REGISTRATION_OPEN') return 'statusRegistrationOpen' as const;
  if (status === 'REGISTRATION_CLOSED') return 'statusRegistrationClosed' as const;
  if (status === 'IN_PROGRESS' || status === 'ONGOING') return 'statusInProgress' as const;
  if (status === 'COMPLETED') return 'statusCompleted' as const;
  return 'statusUpcoming' as const;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getRegionLandingData(slug);
  const regionName = getRegionDisplayName(data?.regionName || slug);
  const locale = await getLocale();
  const translate = await getTranslations('TournamentRegionLanding');
  const title = translate('metadataTitle', { region: regionName });
  const description = data
    ? translate('metadataDescriptionWithData', { region: regionName })
    : translate('metadataDescriptionEmpty', { region: regionName });
  const canonical = `${baseUrl}/tournaments/region/${encodeURIComponent(slug)}`;

  return {
    title,
    description,
    keywords: [
      translate('keywordSports', { region: regionName.toLowerCase() }),
      translate('keywordSchedule', { region: regionName.toLowerCase() }),
      translate('keywordPickleball', { region: regionName.toLowerCase() }),
      translate('keywordSportsEnglish', { region: regionName.toLowerCase() }),
    ],
    robots: data ? { index: true, follow: true } : { index: false, follow: true },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: BRAND.name,
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'vi_VN',
      images: [{
        url: BRAND.assets.logo512,
        width: 512,
        height: 512,
        alt: translate('imageAlt', { region: regionName }),
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [BRAND.assets.logo512],
    },
  };
}

export default async function RegionTournamentLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getRegionLandingData(slug);
  if (!data) notFound();

  const locale = await getLocale();
  const translate = await getTranslations('TournamentRegionLanding');
  const dateLocale = locale === 'en' ? 'en-GB' : 'vi-VN';
  const regionName = getRegionDisplayName(data.regionName);
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: translate('itemListTitle', { region: regionName }),
    numberOfItems: data.tournaments.length,
    itemListElement: data.tournaments.map((tournament, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: tournament.name,
      url: `${baseUrl}/tournaments/${tournament.id}`,
    })),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SportO', item: baseUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: translate('breadcrumbTournaments'),
        item: `${baseUrl}/tournaments`,
      },
      { '@type': 'ListItem', position: 3, name: regionName },
    ],
  };

  return (
    <main className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section className="border-b bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container py-12 md:py-16">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            {translate('heroEyebrow')}
          </p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
            {translate('heroTitle', { region: regionName })}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            {translate('heroDescription', { region: regionName })}
          </p>
        </div>
      </section>

      <section className="container py-10">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">
              {translate('listTitle', { region: regionName })}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {translate('listCount', { count: data.tournaments.length })}
            </p>
          </div>
          <Link href="/tournaments" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
            {translate('viewAll')}
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {data.tournaments.map((tournament) => {
            const location = getTournamentShortLocation(tournament);
            const description = stripHtmlAndNormalize(tournament.description, 140);
            return (
              <Link
                key={tournament.id}
                href={`/tournaments/${tournament.id}`}
                className="group rounded-2xl border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold leading-7 group-hover:text-primary">{tournament.name}</h3>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    {translate(statusKey(tournament.status))}
                  </span>
                </div>
                <dl className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div>
                    <dt className="inline font-medium text-foreground">{translate('sportLabel')}</dt>
                    <dd className="inline">{tournament.category?.name || translate('sportFallback')}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-foreground">{translate('datesLabel')}</dt>
                    <dd className="inline">{formatDate(tournament.startDate, tournament.endDate, dateLocale, translate('fallbackDate'))}</dd>
                  </div>
                  {location && (
                    <div>
                      <dt className="inline font-medium text-foreground">{translate('locationLabel')}</dt>
                      <dd className="inline">{location}</dd>
                    </div>
                  )}
                </dl>
                {description && <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{description}</p>}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
