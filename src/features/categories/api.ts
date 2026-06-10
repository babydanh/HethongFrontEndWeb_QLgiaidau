import { api } from '@/lib/axios';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryConfig: Record<string, unknown>;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export const categoriesApi = {
  getCategories: () => api.get<ApiResponse<Category[]>>('/categories').then(res => res.data),
};
