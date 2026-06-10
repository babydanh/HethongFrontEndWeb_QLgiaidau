import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { UserProfile, UpdateProfileDto } from '@/types/user';

export const updateProfile = async (data: UpdateProfileDto): Promise<ApiResponse<UserProfile>> => {
  const response = await api.patch('/users/profile', data);
  return response.data;
};

export const changePassword = async (data: { oldPassword: string; newPassword: string }): Promise<ApiResponse<null>> => {
  const response = await api.patch('/users/change-password', data);
  return response.data;
};
