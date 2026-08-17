import { api } from '@/lib/axios';
import { Region } from '@/types/region';

export type { Region };

const unwrapList = (res: unknown): Region[] => {
  const payload = res as { data?: unknown };
  if (Array.isArray(res)) return res as Region[];
  if (payload && Array.isArray(payload.data)) return payload.data as Region[];
  return [];
};

export const regionsApi = {
  getProvinces: (search?: string) => 
    api.get<Region[]>('/regions/provinces', { params: { search } }).then(unwrapList),

  getDistricts: (provinceCode: string, search?: string) => 
    api.get<Region[]>('/regions/districts', { params: { provinceCode, search } }).then(unwrapList),

  /** API v2: administrative hierarchy is Province -> Ward/Commune. */
  getWardsByProvince: (provinceCode: string, search?: string) =>
    api.get<Region[]>('/regions/wards', { params: { provinceCode, search } }).then(unwrapList),

  getWards: (provinceCodeOrDistrictCode: string, search?: string) => 
    api.get<Region[]>('/regions/wards', { 
      params: { 
        provinceCode: provinceCodeOrDistrictCode, 
        districtCode: provinceCodeOrDistrictCode, 
        search 
      } 
    }).then(unwrapList),
};
