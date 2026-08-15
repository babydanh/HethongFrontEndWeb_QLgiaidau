import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sporto.asia';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/tournaments',
          '/tournaments/*',
          '/live/*',
          '/communities',
          '/communities/*',
          '/matches',
          '/download',
          '/privacy',
          '/*.ico',
          '/*.png',
          '/*.svg',
          '/*.jpg',
          '/*.jpeg',
          '/*.webp',
          '/favicon.ico',
          '/icon.png',
          '/apple-icon.png',
          '/apple-touch-icon.png',
          '/manifest.webmanifest',
          '/manifest.json',
        ],
        disallow: [
          '/admin',
          '/organizer',
          '/moderation',
          '/profile',
          '/lite',
          '/auth',
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
          '/favicon.ico',
          '/icon.png',
          '/apple-touch-icon.png',
          '/sporto_512.png',
          '/sporto_1024.png',
          '/sporto_v1.svg',
          '/sporto_v1_with_text.svg',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
