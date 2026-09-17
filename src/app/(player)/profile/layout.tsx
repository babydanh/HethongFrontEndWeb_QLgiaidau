import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BRAND } from '@/constants/brand';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  const title = `${BRAND.name} - Hồ sơ cá nhân`;
  const description = 'Quản lý thông tin hồ sơ vận động viên, theo dõi thứ hạng ELO, danh hiệu và lịch thi đấu trên hệ thống SportO.';
  const canonical = `${BRAND.domain}/profile`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: BRAND.name,
      type: 'profile',
      images: [
        {
          url: BRAND.assets.logo512,
          width: 512,
          height: 512,
          alt: BRAND.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [BRAND.assets.logo512],
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
