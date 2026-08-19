import { api } from '@/lib/axios';
import { Region } from '@/types/region';

export type { Region };

interface RegionApiResponse {
  data?: Region[];
}

const normalizeRegionLabel = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi-VN');

export const sortRegions = (regions: Region[]) =>
  [...regions].sort((a, b) => {
    const byLabel = normalizeRegionLabel(a.fullName || a.name).localeCompare(
      normalizeRegionLabel(b.fullName || b.name),
      'vi-VN',
    );
    return byLabel || a.code.localeCompare(b.code, 'en');
  });

const unwrapList = (res: unknown): Region[] => {
  if (Array.isArray(res)) {
    return sortRegions(res as Region[]);
  }
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as RegionApiResponse).data;
    if (Array.isArray(data)) {
      return sortRegions(data);
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
