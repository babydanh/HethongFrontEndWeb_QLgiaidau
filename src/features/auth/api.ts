import { api } from '@/lib/axios';

export const authApi = {
  register: <T>(data: T) => api.post('/auth/register', data).then(res => res.data),
  login: <T>(data: T) => api.post('/auth/login', data).then(res => res.data),
  logout: (data: { refreshToken: string }) => api.post('/auth/logout', data).then(res => res.data),
  // refresh endpoint is handled by Axios interceptor automatically
};
