import { api } from '@/lib/axios';

export const authApi = {
  register: <T>(data: T) => api.post('/auth/register', data),
  login: <T>(data: T) => api.post('/auth/login', data),
  logout: (data: { refreshToken: string }) => api.post('/auth/logout', data),
  // refresh endpoint is handled by Axios interceptor automatically
};
