import { MetadataRoute } from 'next';

interface ApiTournament {
  id: string;
  updatedAt?: string;
  createdAt?: string;
}

interface ApiCommunity {
  id: string;
  updatedAt?: string;
  createdAt?: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://giaidau.vnvar.com';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://giaidau.vnvar.com/api/v1';

  // 1. Static Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/tournaments`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/communities`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/matches`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/download`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // 2. Dynamic Tournament Routes
  let tournamentRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${apiUrl}/tournaments?limit=100&visibility=PUBLIC`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const tournaments: ApiTournament[] = Array.isArray(data.data) ? data.data : data.data?.items || [];
      tournamentRoutes = tournaments.map((t) => ({
        url: `${baseUrl}/tournaments/${t.id}`,
        lastModified: t.updatedAt ? new Date(t.updatedAt) : t.createdAt ? new Date(t.createdAt) : new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch tournaments for sitemap:', error);
  }

  // 3. Dynamic Community Routes
  let communityRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${apiUrl}/communities?limit=100`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const communities: ApiCommunity[] = Array.isArray(data.data) ? data.data : data.data?.items || [];
      communityRoutes = communities.map((c) => ({
        url: `${baseUrl}/communities/${c.id}`,
        lastModified: c.updatedAt ? new Date(c.updatedAt) : c.createdAt ? new Date(c.createdAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch communities for sitemap:', error);
  }

  return [...staticRoutes, ...tournamentRoutes, ...communityRoutes];
}
