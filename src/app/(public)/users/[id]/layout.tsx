import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BRAND } from '@/constants/brand';

interface PublicProfileSummary {
  id: string;
  fullName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  isVerified?: boolean;
  ranks?: Array<{ matchesPlayed?: number; eloPoints?: number }>;
  pairRanks?: Array<{ matchesPlayed?: number; eloPoints?: number }>;
}

interface ApiEnvelope<T> {
  data?: T;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sporto.asia';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

async function fetchPublicProfile(id: string): Promise<PublicProfileSummary | null> {
  try {
    const response = await fetch(`${apiUrl}/users/${encodeURIComponent(id)}/public`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as ApiEnvelope<PublicProfileSummary> | PublicProfileSummary;
    if ('data' in payload && payload.data && typeof payload.data === 'object' && 'id' in payload.data) {
      return payload.data;
    }
    return 'id' in payload ? payload : null;
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
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await fetchPublicProfile(id);
  const translate = await getTranslations('PublicProfile');
  const name = profile?.fullName?.trim() || translate('fallbackName');
  const canonical = `${baseUrl}/users/${encodeURIComponent(id)}`;
  const playedMatches = [...(profile?.ranks || []), ...(profile?.pairRanks || [])]
    .reduce((sum, rank) => sum + Number(rank.matchesPlayed || 0), 0);
  const title = profile
    ? `${name} — ${translate('metadataTitleSuffix')}`
    : translate('notFoundTitle');
  const description = profile
    ? cleanDescription(profile.bio) || translate('metadataDescriptionTemplate', { name })
    : translate('notFoundDescription');
  const image = profile?.coverUrl || profile?.avatarUrl || `${baseUrl}/sporto_v1.svg`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: profile ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: BRAND.name,
      type: 'profile',
      images: [{ url: image, alt: `${BRAND.name} — ${name}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    other: profile
      ? {
          'profile:first_name': name.split(' ')[0] || name,
          'profile:username': id,
          'profile:has_played_matches': String(playedMatches > 0),
        }
      : undefined,
  };
}

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
