import axios, { AxiosRequestConfig } from 'axios';
import { useAuthStore } from './zustand/authStore';
import toast from 'react-hot-toast';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'axios' {
  export interface AxiosInstance {
    request<T = unknown, R = T, D = unknown>(config: AxiosRequestConfig<D>): Promise<R>;
    get<T = unknown, R = T, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    delete<T = unknown, R = T, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    head<T = unknown, R = T, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    options<T = unknown, R = T, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    post<T = unknown, R = T, D = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig<D>): Promise<R>;
    put<T = unknown, R = T, D = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig<D>): Promise<R>;
    patch<T = unknown, R = T, D = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig<D>): Promise<R>;
  }
}

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
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh for auth-related routes
    const isAuthRoute = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].some(
      (route) => originalRequest.url?.includes(route)
    );

    // Also skip if we're currently on a guest page (login/register) — prevents stale-cookie loops
    const isOnGuestPage =
      typeof window !== 'undefined' &&
      ['/login', '/register'].some((p) => window.location.pathname.startsWith(p));

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      // If on the login/register page, just clear local state and bail out — do not try to refresh
      if (isOnGuestPage) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // Prevent infinite loop if refresh itself fails
      if (originalRequest.url === '/auth/refresh') {
        useAuthStore.getState().logout();
        try {
          await axios.post(`${api.defaults.baseURL}/auth/logout`, {}, { withCredentials: true });
        } catch (e) {
          console.error('Failed to clear cookies:', e);
        }
        if (typeof window !== 'undefined') {
          const isProtectedRoute = ['/organizer', '/admin', '/profile', '/dashboard'].some(
            (route) => window.location.pathname.startsWith(route)
          );
          if (isProtectedRoute && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }

      try {
        // Because of withCredentials: true, the browser will automatically send the refreshToken cookie
        await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true });

        // Retry the original request. Browser will now send the newly set accessToken cookie
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        try {
          await axios.post(`${api.defaults.baseURL}/auth/logout`, {}, { withCredentials: true });
        } catch (e) {
          console.error('Failed to clear cookies:', e);
        }
        if (typeof window !== 'undefined') {
          const isProtectedRoute = ['/organizer', '/admin', '/profile', '/dashboard'].some(
            (route) => window.location.pathname.startsWith(route)
          );
          if (isProtectedRoute && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
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
