import { api } from '@/lib/axios';
import { User } from '@/lib/zustand/authStore';

export const authApi = {
  register: <T>(data: T) => api.post<{ user: User }>('/auth/register', data),
  login: <T>(data: T) => api.post<{ user: User }>('/auth/login', data),
  logout: (data: { refreshToken: string }) => api.post<{ success: boolean }>('/auth/logout', data),
};
