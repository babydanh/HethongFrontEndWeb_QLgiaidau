import { api } from '@/lib/axios';
import { Region } from '@/types/region';

export type { Region };

const unwrapList = (res: any): Region[] => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
};

export const regionsApi = {
  getProvinces: (search?: string) => 
    api.get<Region[]>('/regions/provinces', { params: { search } }).then(unwrapList),

  getDistricts: (provinceCode: string, search?: string) => 
    api.get<Region[]>('/regions/districts', { params: { provinceCode, search } }).then(unwrapList),

  getWards: (provinceCodeOrDistrictCode: string, search?: string) => 
    api.get<Region[]>('/regions/wards', { 
      params: { 
        provinceCode: provinceCodeOrDistrictCode, 
        districtCode: provinceCodeOrDistrictCode, 
        search 
      } 
    }).then(unwrapList),
};
