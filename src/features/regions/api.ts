import { api } from '@/lib/axios';

export interface Region {
  code: string;
  name: string;
  fullName: string;
  codeName?: string;
  provinceCode?: string;
  districtCode?: string;
}

export const regionsApi = {
  getProvinces: async (search?: string): Promise<Region[]> => {
    const res = await api.get('/regions/provinces', { params: { search } });
    return res.data.data;
  },

  getDistricts: async (provinceCode: string, search?: string): Promise<Region[]> => {
    const res = await api.get('/regions/districts', { params: { provinceCode, search } });
    return res.data.data;
  },

  getWards: async (districtCode: string, search?: string): Promise<Region[]> => {
    const res = await api.get('/regions/wards', { params: { districtCode, search } });
    return res.data.data;
  },
};
