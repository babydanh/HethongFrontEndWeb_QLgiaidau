import axios, { AxiosRequestConfig } from 'axios';
import { useAuthStore } from './zustand/authStore';
import toast from 'react-hot-toast';

let lastServerErrorToastAt = 0;
const SERVER_ERROR_TOAST_COOLDOWN_MS = 10000;

/**
 * Đọc giá trị cookie theo tên
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

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

export const getBaseUrl = () => {
  // If rendering on server-side (window is undefined), use internal NEXT_API_URL if provided
  if (typeof window === 'undefined') {
    return process.env.NEXT_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  }
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocalhost) {
    return `${window.location.protocol}//${window.location.hostname}:3000/api/v1`;
  }
  // Production: API is proxied through OLS on the same domain
  return `${window.location.origin}/api/v1`;
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // Match feeds can involve several joins and Redis fallback under load.
  // Do not treat a normal slow response as an empty feed.
  timeout: 15000,
});

// Request interceptor — gắn CSRF token cho state-changing requests
api.interceptors.request.use(
  (config) => {
    const method = config.method?.toUpperCase();
    if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = getCookie('csrf-token');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }> = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

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

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Because of withCredentials: true, the browser will automatically send the refreshToken cookie
        await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true });
        processQueue(null);

        // Retry the original request. Browser will now send the newly set accessToken cookie
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Refresh token failed -> Session is completely dead. Clear auth store state immediately.
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
            window.location.assign('/login');
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Do not turn a transient backend failure into a toast storm. Screens keep
    // their last successful snapshot and decide when the next reconciliation
    // is safe, instead of every caller retrying the same request here.
    if (error.response?.status >= 500) {
      const now = Date.now();
      if (now - lastServerErrorToastAt >= SERVER_ERROR_TOAST_COOLDOWN_MS) {
        lastServerErrorToastAt = now;
        toast.error('Hệ thống đang bận. Dữ liệu cũ vẫn được giữ lại, thử lại sau.');
      }
    }

    // A 429 is a back-pressure signal, not a missing resource. Reject once so
    // polling callers can back off without multiplying requests.
    if (error.response?.status === 429) {
      console.warn('[429] Public API is rate-limited; skipping client retry.');
    }

    return Promise.reject(error);
  }
);
