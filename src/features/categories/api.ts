import { api } from '@/lib/axios';
import { Category } from '@/types/category';
import { ApiResponse } from '@/types/api';

export type { Category };

export const categoriesApi = {
  getCategories: () => api.get<ApiResponse<Category[]>>('/categories'),
};
