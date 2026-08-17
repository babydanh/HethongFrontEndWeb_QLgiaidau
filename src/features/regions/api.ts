import { api } from '@/lib/axios';
import { Region } from '@/types/region';

export type { Region };

interface RegionApiResponse {
  data?: Region[];
}

const unwrapList = (res: unknown): Region[] => {
  if (Array.isArray(res)) {
    return res as Region[];
  }
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as RegionApiResponse).data;
    if (Array.isArray(data)) {
      return data;
    }
  }
  return [];
};

export const regionsApi = {
  getProvinces: (search?: string): Promise<Region[]> => 
    api.get<Region[]>('/regions/provinces', { params: search ? { search } : {} }).then(unwrapList),

  getWards: (provinceCode: string, search?: string): Promise<Region[]> => 
    api.get<Region[]>('/regions/wards', { 
      params: { 
        provinceCode, 
        ...(search ? { search } : {}) 
      } 
    }).then(unwrapList),

  getWardsByProvince: (provinceCode: string, search?: string): Promise<Region[]> => 
    api.get<Region[]>('/regions/wards', { 
      params: { 
        provinceCode, 
        ...(search ? { search } : {}) 
      } 
    }).then(unwrapList),
};
