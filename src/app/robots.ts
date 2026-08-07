import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://giaidau.vnvar.com';

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
