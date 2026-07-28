import type { Metadata } from 'next';
import type { Community } from '@/types/community';

interface CommunityPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CommunityPageProps): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

  try {
    const response = await fetch(`${baseUrl}/communities/${id}`, { cache: 'no-store' });
    if (response.ok) {
      const payload = (await response.json()) as { data?: Community };
      const community = payload.data;

      if (community) {
        const title = `${community.name} | VNDC Sport`;
        const description = community.description
          ? community.description.replace(/<[^>]*>/g, '').slice(0, 160)
          : `Khám phá câu lạc bộ ${community.name} trên VNDC Sport.`;
        const imageUrl = community.bannerUrl || community.logoUrl || 'https://giaidau.vnvar.com/vndcsport.svg';

        return {
          title,
          description,
          openGraph: {
            title,
            description,
            siteName: 'VNDC Sport',
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
    title: 'Câu lạc bộ | VNDC Sport',
    description: 'Khám phá các câu lạc bộ thể thao trên VNDC Sport.',
  };
}

export default function CommunityDetailLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
