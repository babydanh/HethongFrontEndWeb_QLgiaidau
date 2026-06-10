import axios from 'axios';
import { useAuthStore } from './zustand/authStore';
import toast from 'react-hot-toast';

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3000/api/v1`;
  }
  return 'http://localhost:3000/api/v1';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized for token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Prevent infinite loop if refresh itself fails
      if (originalRequest.url === '/auth/refresh') {
        const wasAuthenticated = useAuthStore.getState().isAuthenticated;
        useAuthStore.getState().logout();
        if (wasAuthenticated) {
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          if (typeof window !== 'undefined') window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        // Because of withCredentials: true, the browser will automatically send the refreshToken cookie
        await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true });
        
        // Retry the original request. Browser will now send the newly set accessToken cookie
        return api(originalRequest);
      } catch (refreshError) {
        const wasAuthenticated = useAuthStore.getState().isAuthenticated;
        useAuthStore.getState().logout();
        if (wasAuthenticated) {
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          if (typeof window !== 'undefined') window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    // Catch-all server errors (500)
    if (error.response?.status >= 500) {
      toast.error('Hệ thống đang gặp sự cố. Vui lòng thử lại sau.');
    }

    return Promise.reject(error);
  }
);
