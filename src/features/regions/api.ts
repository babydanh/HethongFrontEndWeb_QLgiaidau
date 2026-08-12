import { api } from '@/lib/axios';

import { Region } from '@/types/region';
import { ApiResponse } from '@/types/api';

export type { Region };

export const regionsApi = {
  getProvinces: (search?: string) => 
    api.get<ApiResponse<Region[]>>('/regions/provinces', { params: { search } }).then(res => res.data),

  getDistricts: (provinceCode: string, search?: string) => 
    api.get<ApiResponse<Region[]>>('/regions/districts', { params: { provinceCode, search } }).then(res => res.data),

  getWards: (districtCode: string, search?: string) => 
    api.get<ApiResponse<Region[]>>('/regions/wards', { params: { districtCode, search } }).then(res => res.data),
};

