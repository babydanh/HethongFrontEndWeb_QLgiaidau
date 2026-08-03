import { api } from '@/lib/axios';

export type AdPlacementSlot =
  // Website Placements
  | 'HOMEPAGE_SIDEBAR'
  | 'TOURNAMENTS_BOTTOM'
  | 'MATCHES_BOTTOM'
  | 'GLOBAL_HEADER'
  // Mobile App Placements
  | 'APP_HOME_FEED'
  | 'APP_MATCHES_BOTTOM'
  | 'APP_COMMUNITY_FEED'
  | 'APP_TOURNAMENT_DETAIL';

export type AdBannerType = 'IMAGE_LINK' | 'CUSTOM_HTML';

export interface Advertisement {
  id: string;
  title: string;
  description?: string | null;
  bannerType: AdBannerType;
  imageUrl?: string | null;
  targetUrl?: string | null;
  ctaText?: string | null;
  customHtml?: string | null;
  placementSlot: AdPlacementSlot;
  displayOrder: number;
  viewsCount: number;
  clicksCount: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdvertisementPayload {
  title: string;
  description?: string;
  bannerType?: AdBannerType;
  imageUrl?: string;
  targetUrl?: string;
  ctaText?: string;
  customHtml?: string;
  placementSlot: AdPlacementSlot;
  displayOrder?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface UpdateAdvertisementPayload extends Partial<CreateAdvertisementPayload> {}

export interface AdvertisementsListResponse {
  items: Advertisement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const advertisementsApi = {
  // Public API
  getActiveBySlot: async (slot: AdPlacementSlot): Promise<Advertisement[]> => {
    try {
      const data = await api.get<Advertisement[]>(`/advertisements/active?slot=${slot}`);
      return data || [];
    } catch {
      return [];
    }
  },

  recordView: async (id: string): Promise<void> => {
    try {
      await api.post(`/advertisements/${id}/view`);
    } catch {
      // fire-and-forget
    }
  },

  recordClick: async (id: string): Promise<void> => {
    try {
      await api.post(`/advertisements/${id}/click`);
    } catch {
      // fire-and-forget
    }
  },

  // Admin API
  listForAdmin: async (params?: {
    placementSlot?: AdPlacementSlot;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AdvertisementsListResponse> => {
    const data = await api.get<AdvertisementsListResponse>('/advertisements/admin/list', {
      params,
    });
    return data;
  },

  getById: async (id: string): Promise<Advertisement> => {
    const data = await api.get<Advertisement>(`/advertisements/${id}`);
    return data;
  },

  create: async (payload: CreateAdvertisementPayload): Promise<Advertisement> => {
    const data = await api.post<Advertisement>('/advertisements', payload);
    return data;
  },

  update: async (id: string, payload: UpdateAdvertisementPayload): Promise<Advertisement> => {
    const data = await api.patch<Advertisement>(`/advertisements/${id}`, payload);
    return data;
  },

  toggleActive: async (id: string): Promise<Advertisement> => {
    const data = await api.patch<Advertisement>(`/advertisements/${id}/toggle`);
    return data;
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const data = await api.delete<{ success: boolean; message: string }>(`/advertisements/${id}`);
    return data;
  },
};
