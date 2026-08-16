import { MetadataRoute } from 'next';
import { BRAND } from '@/constants/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} - ${BRAND.tagline}`,
    short_name: BRAND.name,
    description: 'Nền tảng tổ chức, quản lý và đăng ký tham gia giải đấu thể thao chuyên nghiệp (Pickleball, Cầu lông, Quần vợt, Bóng bàn, Bóng đá).',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0284c7',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: BRAND.assets.appleTouchIcon,
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: BRAND.assets.logo512,
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: BRAND.assets.logo1024,
        sizes: '1024x1024',
        type: 'image/png',
      },
      {
        src: BRAND.assets.logoIcon,
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
