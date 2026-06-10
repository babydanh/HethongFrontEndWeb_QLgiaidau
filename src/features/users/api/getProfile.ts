import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { UserProfile } from '@/types/user';

export const getProfile = async (): Promise<ApiResponse<UserProfile>> => {
  const response = await api.get('/users/profile');
  return response.data;
};
