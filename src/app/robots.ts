import { MetadataRoute } from 'next';
import { BRAND } from '@/constants/brand';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || BRAND.domain;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/*',
          '/organizer/*',
          '/moderation/*',
          '/profile/*',
          '/lite/*',
          '/auth/*',
        ],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: [
          '/',
          '/*.png',
          '/*.ico',
          '/*.svg',
          '/*.jpg',
          '/*.jpeg',
          '/*.webp',
          BRAND.assets.favicon,
          '/icon.png',
          BRAND.assets.appleTouchIcon,
          BRAND.assets.logo512,
          BRAND.assets.logo1024,
          BRAND.assets.logoIcon,
          BRAND.assets.logoFull,
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
