import { api } from '@/lib/axios';
import { User } from '@/lib/zustand/authStore';
import { ApiResponse } from '@/types/api';

export const authApi = {
  register: <T>(data: T) => api.post<{ user: User }>('/auth/register', data),
  login: <T>(data: T) => api.post<{ user: User }>('/auth/login', data),
  logout: (data: { refreshToken: string }) => api.post<{ success: boolean }>('/auth/logout', data),
  requestEmailVerification: () => api.post<ApiResponse<unknown>>('/auth/verify-email/request').then(res => res.data),
  confirmEmailVerification: (token: string) => api.post<ApiResponse<unknown>>('/auth/verify-email/confirm', { token }).then(res => res.data),
  requestPhoneVerification: (phoneNumber?: string) => api.post<ApiResponse<unknown>>('/auth/verify-phone/request', { phoneNumber }).then(res => res.data),
  confirmPhoneVerification: (code: string) => api.post<ApiResponse<unknown>>('/auth/verify-phone/confirm', { code }).then(res => res.data),
};
