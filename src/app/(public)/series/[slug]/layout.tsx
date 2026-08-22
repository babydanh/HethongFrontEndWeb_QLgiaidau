import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BRAND } from '@/constants/brand';

interface SeriesSummary {
  slug: string;
  name: string;
  description?: string | null;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  visibility?: 'PUBLIC' | 'PRIVATE';
  startDate?: string | null;
  endDate?: string | null;
  _count?: { legs?: number; events?: number };
}

interface SeriesPayload {
  series?: SeriesSummary;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sporto.asia';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://sporto.asia/api/v1';

async function fetchSeries(slug: string): Promise<SeriesSummary | null> {
  try {
    const response = await fetch(`${apiUrl}/series/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as SeriesPayload;
    return payload.series ?? null;
  } catch {
    return null;
  }
}

function cleanDescription(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, 155) : undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const series = await fetchSeries(slug);
  const translate = await getTranslations('SeriesDetail');
  const name = series?.name || translate('fallbackName');
  const title = series
    ? `${name} — ${translate('metadataTitleSuffix')}`
    : translate('notFoundTitle');
  const description = series
    ? cleanDescription(series.description) || translate('metadataDescriptionTemplate', { name })
    : translate('notFoundDescription');
  const canonical = `${baseUrl}/series/${encodeURIComponent(slug)}`;
  const image = series?.bannerUrl || series?.logoUrl || `${baseUrl}/sporto_v1.svg`;
  const indexable = Boolean(
    series
      && series.visibility === 'PUBLIC'
      && (series.status === 'ACTIVE' || series.status === 'COMPLETED'),
  );

  return {
    title,
    description,
    alternates: { canonical },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: BRAND.name,
      type: 'website',
      images: [{ url: image, alt: `${BRAND.name} — ${name}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default function SeriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
