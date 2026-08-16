import { api } from '@/lib/axios';
import { Category } from '@/types/category';
import { ApiResponse } from '@/types/api';

export type { Category };

export const categoriesApi = {
  getCategories: (params?: { includeInactive?: boolean }) => api.get<ApiResponse<Category[]>>('/categories', { params }),
  getAdminCategories: () => api.get<ApiResponse<Category[]>>('/categories/admin/all'),
  getCategoryById: (id: string) => api.get<ApiResponse<Category>>(`/categories/${id}`),
  createCategory: (data: Partial<Category>) => api.post<ApiResponse<Category>>('/categories', data),
  updateCategory: (id: string, data: Partial<Category>) => api.patch<ApiResponse<Category>>(`/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/categories/${id}`),
};

