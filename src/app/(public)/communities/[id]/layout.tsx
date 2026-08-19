import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Community } from '@/types/community';
import { stripHtmlAndNormalize } from '@/utils/string';
import { BRAND } from '@/constants/brand';

interface CommunityPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CommunityPageProps): Promise<Metadata> {
  const translate = await getTranslations('Common');
  const { id } = await params;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  const canonical = `/communities/${id}`;

  try {
    const response = await fetch(`${apiBaseUrl}/communities/${id}`, { cache: 'no-store' });
    if (response.ok) {
      const payload = (await response.json()) as { data?: Community };
      const community = payload.data;

      if (community) {
        const cleanDesc = stripHtmlAndNormalize(community.description, 160);
        const imageUrl = community.bannerUrl || community.logoUrl || BRAND.assets.defaultCommunityLogo;
        const title = translate('clubMetadataTitle', { name: community.name, brand: BRAND.name });
        const description = cleanDesc || translate('clubMetadataDescription', { name: community.name, brand: BRAND.name });


        return {
          title,
          description,
          alternates: { canonical },
          openGraph: {
            title,
            description,
            url: canonical,
            siteName: 'Sporto',
            type: 'website',
            images: [{ url: imageUrl, alt: community.name }],
          },
          twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [imageUrl],
          },
        };
      }
    }
  } catch (error) {
    console.error('Failed to generate community metadata:', error);
  }

  return {
    alternates: { canonical },
  };
}

export default function CommunityDetailLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
