import type { Metadata } from 'next';
import type { Community } from '@/types/community';
import { stripHtmlAndNormalize } from '@/utils/string';

interface CommunityPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CommunityPageProps): Promise<Metadata> {
  const { id } = await params;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  const canonical = `/communities/${id}`;

  try {
    const response = await fetch(`${apiBaseUrl}/communities/${id}`, { cache: 'no-store' });
    if (response.ok) {
      const payload = (await response.json()) as { data?: Community };
      const community = payload.data;

      if (community) {
        const title = `${community.name} | Sporto`;
        const cleanDesc = stripHtmlAndNormalize(community.description, 160);
        const description = cleanDesc || `Khám phá câu lạc bộ ${community.name} trên Sporto.`;
        const imageUrl = community.bannerUrl || community.logoUrl || 'https://sporto.asia/sporto_v1.svg';


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
    title: 'Câu lạc bộ | Sporto',
    description: 'Khám phá các câu lạc bộ thể thao trên Sporto.',
    alternates: { canonical },
  };
}

export default function CommunityDetailLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
