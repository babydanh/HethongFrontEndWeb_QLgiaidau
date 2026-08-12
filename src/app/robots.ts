import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sporto.asia';

  return {
    rules: {
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
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
