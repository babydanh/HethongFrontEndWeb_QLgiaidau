import { MetadataRoute } from 'next';

export const revalidate = 3600;

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sporto.asia';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://sporto.asia/api/v1';

// Backend DTO giới hạn limit tối đa 50 (@Max(50)); limit > 50 -> 400 -> sitemap mất toàn bộ dynamic URL.
const PAGE_SIZE = 50;
// Sitemap.xml cho phép tối đa 50.000 URL; giới hạn hợp lý mỗi loại để build nhanh, tránh sitemap khổng lồ.
const MAX_URLS_PER_TYPE = 5000;
// Safety cap số trang (đề phòng meta.totalPages thiếu hoặc sai).
const MAX_PAGES = 200;
const MAX_FETCH_ATTEMPTS = 2;

interface ApiItem {
  id: string;
  updatedAt?: string;
  createdAt?: string;
}

interface ListPage {
  data: ApiItem[];
  meta?: { totalPages?: number; nextCursor?: string | null; hasMore?: boolean };
}

async function fetchListPage(path: string, params: Record<string, string>): Promise<ListPage> {
  const search = new URLSearchParams(params).toString();
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(`${apiUrl}${path}?${search}`, {
        next: { revalidate },
      });
      if (res.ok) {
        const json = await res.json();
        const data: ApiItem[] = Array.isArray(json?.data) ? json.data : [];
        return { data, meta: json?.meta as ListPage['meta'] | undefined };
      }

      lastError = new Error(`Sitemap request failed: ${path} returned ${res.status}`);
      if (res.status !== 429 && res.status < 500) break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error(`Sitemap request failed: ${path}`);
}

/**
 * Phân trang toàn bộ danh sách.
 * - Sử dụng limit = PAGE_SIZE (50) thay vì limit lớn hơn -> tránh 400 từ backend.
 * - Dừng khi: trang rỗng, vượt meta.totalPages, đạt MAX_URLS_PER_TYPE, hoặc vượt safety cap.
 */
async function fetchAllPages(path: string, params: Record<string, string>): Promise<ApiItem[]> {
  const all: ApiItem[] = [];
  let cursor: string | null = null;
  let pageCount = 0;

  while (all.length < MAX_URLS_PER_TYPE && pageCount < MAX_PAGES) {
    pageCount += 1;
    const result = await fetchListPage(path, {
      ...params,
      limit: String(PAGE_SIZE),
      ...(cursor ? { cursor } : {}),
    });
    if (result.data.length === 0) break;

    all.push(...result.data);
    cursor = result.meta?.nextCursor ?? null;
    if (!result.meta?.hasMore || !cursor) break;
  }

  return all;
}

function toRouteUrl(
  url: string,
  item: ApiItem,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  priority: number,
): MetadataRoute.Sitemap[number] {
  // Không phát sinh lastModified giả (new Date()) khi thiếu timestamp -> tránh Google thấy sitemap "thay đổi" dù dữ liệu không đổi.
  const entry: MetadataRoute.Sitemap[number] = { url, changeFrequency, priority };
  const lastModified = item.updatedAt ?? item.createdAt;
  if (lastModified) {
    const date = new Date(lastModified);
    if (!Number.isNaN(date.getTime())) {
      entry.lastModified = date;
    }
  }
  return entry;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Static Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/tournaments`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/communities`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/matches`, changeFrequency: 'always', priority: 0.8 },
    { url: `${baseUrl}/download`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // 2. Dynamic Tournament Routes
  // Backend GET /tournaments: service findAll luôn ép visibility='PUBLIC'
  // (tournaments.service.ts findAll -> repositories.findAll({ ...query, visibility: 'PUBLIC' })),
  // đồng thời repository loại DRAFT/PENDING_APPROVAL/SUSPENDED/CANCELLED khi không truyền createdBy.
  // Truyền visibility=PUBLIC tường minh để không đưa giải PRIVATE vào sitemap.
  const tournaments = await fetchAllPages('/tournaments', { visibility: 'PUBLIC' });
  const tournamentRoutes: MetadataRoute.Sitemap = tournaments.map((t) =>
    toRouteUrl(`${baseUrl}/tournaments/${t.id}`, t, 'daily', 0.8),
  );

  // 3. Dynamic Community Routes
  // Backend GET /communities: repository luôn lọc visibility != 'PRIVATE' (communities.repository.ts findAll)
  // và controller mặc định status='ACTIVE' khi không truyền all/status.
  // Truyền status=ACTIVE tường minh để tránh index CLB đang PENDING/SUSPENDED/DEACTIVATED.
  const communities = await fetchAllPages('/communities', { status: 'ACTIVE' });
  const communityRoutes: MetadataRoute.Sitemap = communities.map((c) =>
    toRouteUrl(`${baseUrl}/communities/${c.id}`, c, 'weekly', 0.7),
  );

  return [...staticRoutes, ...tournamentRoutes, ...communityRoutes];
}

