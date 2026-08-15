import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sporto - Nền tảng Quản lý và Tổ chức Giải đấu Thể thao',
    short_name: 'Sporto',
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
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/sporto_512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/sporto_1024.png',
        sizes: '1024x1024',
        type: 'image/png',
      },
      {
        src: '/sporto_v1.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
