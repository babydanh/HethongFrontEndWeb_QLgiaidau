import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { BRAND } from '@/constants/brand';
import type { Category } from '@/types/category';
import type { Tournament } from '@/types/tournament';
import { getTournamentShortLocation } from '@/utils/tournament-location';
import { stripHtmlAndNormalize } from '@/utils/string';

export const revalidate = 3600;

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sporto.asia';
const apiUrl = process.env.NEXT_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://sporto.asia/api/v1';
const MIN_TOURNAMENTS_FOR_INDEXABLE_PAGE = 2;
const PUBLIC_STATUSES = new Set([
  'UPCOMING',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
  'IN_PROGRESS',
  'ONGOING',
  'COMPLETED',
]);

type ApiEnvelope<T> = { data?: T };

interface SportLandingData {
  category: Category;
  tournaments: Tournament[];
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      next: { revalidate },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as ApiEnvelope<T> | T;
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return (payload as ApiEnvelope<T>).data ?? null;
    }
    return payload as T;
  } catch {
    return null;
  }
}

async function getSportLandingData(slug: string): Promise<SportLandingData | null> {
  const categories = await fetchJson<Category[]>('/categories');
  const category = categories?.find((item) => item.isActive !== false && item.slug === slug);
  if (!category) return null;

  const query = new URLSearchParams({
    visibility: 'PUBLIC',
    categoryId: category.id,
    limit: '50',
  });
  const tournaments = (await fetchJson<Tournament[]>(`/tournaments?${query.toString()}`)) ?? [];
  const publicTournaments = tournaments.filter((tournament) =>
    PUBLIC_STATUSES.has(String(tournament.status).toUpperCase()),
  );

  if (publicTournaments.length < MIN_TOURNAMENTS_FOR_INDEXABLE_PAGE) return null;

  return { category, tournaments: publicTournaments };
}

export async function generateStaticParams() {
  const categories = (await fetchJson<Category[]>('/categories')) ?? [];
  const eligible: Array<{ slug: string }> = [];

  for (const category of categories.filter((item) => item.isActive !== false && item.slug)) {
    const query = new URLSearchParams({
      visibility: 'PUBLIC',
      categoryId: category.id,
      limit: '50',
    });
    const tournaments = (await fetchJson<Tournament[]>(`/tournaments?${query.toString()}`)) ?? [];
    const publicCount = tournaments.filter((tournament) =>
      PUBLIC_STATUSES.has(String(tournament.status).toUpperCase()),
    ).length;
    if (publicCount >= MIN_TOURNAMENTS_FOR_INDEXABLE_PAGE) {
      eligible.push({ slug: category.slug });
    }
  }

  return eligible;
}

interface SportLandingLabels {
  registrationOpen: string;
  registrationClosed: string;
  inProgress: string;
  completed: string;
  upcoming: string;
  dateToBeAnnounced: string;
}

function getStatusLabel(status: Tournament['status'], labels: SportLandingLabels): string {
  switch (status) {
    case 'REGISTRATION_OPEN':
      return labels.registrationOpen;
    case 'REGISTRATION_CLOSED':
      return labels.registrationClosed;
    case 'IN_PROGRESS':
    case 'ONGOING':
      return labels.inProgress;
    case 'COMPLETED':
      return labels.completed;
    default:
      return labels.upcoming;
  }
}

function formatTournamentDate(
  startDate: string | undefined,
  endDate: string | undefined,
  locale: string,
  fallbackDate: string,
): string {
  if (!startDate) return fallbackDate;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return fallbackDate;
  const dateLocale = locale === 'en' ? 'en-GB' : 'vi-VN';
  const startLabel = new Intl.DateTimeFormat(dateLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(start);
  if (!endDate) return startLabel;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return startLabel;
  const endLabel = new Intl.DateTimeFormat(dateLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(end);
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getSportLandingData(slug);
  const categoryName = data?.category.name || slug;
  const locale = await getLocale();
  const translate = await getTranslations('TournamentSportLanding');
  const title = translate('metadataTitle', { category: categoryName });
  const description = data
    ? translate('metadataDescriptionWithData', { category: categoryName })
    : translate('metadataDescriptionEmpty', { category: categoryName });
  const canonical = `${baseUrl}/tournaments/sport/${encodeURIComponent(slug)}`;

  return {
    title,
    description,
    keywords: [
      translate('keywordTournaments', { category: categoryName }),
      translate('keywordSchedule', { category: categoryName }),
      translate('keywordRegistration', { category: categoryName }),
      translate('keywordBrand', { category: categoryName }),
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
        alt: translate('imageAlt', { category: categoryName }),
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

export default async function SportTournamentLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getSportLandingData(slug);
  if (!data) notFound();

  const { category, tournaments } = data;
  const locale = await getLocale();
  const translate = await getTranslations('TournamentSportLanding');
  const statusLabels: SportLandingLabels = {
    registrationOpen: translate('statusRegistrationOpen'),
    registrationClosed: translate('statusRegistrationClosed'),
    inProgress: translate('statusInProgress'),
    completed: translate('statusCompleted'),
    upcoming: translate('statusUpcoming'),
    dateToBeAnnounced: translate('fallbackDate'),
  };
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: translate('itemListTitle', { category: category.name }),
    numberOfItems: tournaments.length,
    itemListElement: tournaments.map((tournament, index) => ({
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
      { '@type': 'ListItem', position: 3, name: category.name },
    ],
  };

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <section className="border-b bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container py-12 md:py-16">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            {translate('heroEyebrow')}
          </p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
            {translate('heroTitle', { category: category.name })}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            {translate('heroDescription', { category: category.name })}
          </p>
        </div>
      </section>

      <section className="container py-10">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">
              {translate('listTitle', { category: category.name })}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {translate('listCount', { count: tournaments.length })}
            </p>
          </div>
          <Link
            href="/tournaments"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {translate('viewAll')}
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {tournaments.map((tournament) => {
            const location = getTournamentShortLocation(tournament);
            const description = stripHtmlAndNormalize(tournament.description, 140);
            return (
              <Link
                key={tournament.id}
                href={`/tournaments/${tournament.id}`}
                className="group rounded-2xl border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold leading-7 group-hover:text-primary">
                    {tournament.name}
                  </h3>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    {getStatusLabel(tournament.status, statusLabels)}
                  </span>
                </div>
                <dl className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div>
                    <dt className="inline font-medium text-foreground">
                      {translate('datesLabel')}
                    </dt>
                    <dd className="inline">
                      {formatTournamentDate(tournament.startDate, tournament.endDate, locale, translate('fallbackDate'))}
                    </dd>
                  </div>
                  {location && (
                    <div>
                      <dt className="inline font-medium text-foreground">
                        {translate('locationLabel')}
                      </dt>
                      <dd className="inline">{location}</dd>
                    </div>
                  )}
                </dl>
                {description && (
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
