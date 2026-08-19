import axios, { AxiosRequestConfig } from 'axios';
import { useAuthStore } from './zustand/authStore';
import toast from 'react-hot-toast';

let lastServerErrorToastAt = 0;
const SERVER_ERROR_TOAST_COOLDOWN_MS = 10000;
const ANONYMOUS_CLIENT_ID_KEY = 'sporto_anonymous_client_id_v1';
const RATE_LIMIT_RETRY_KEY = '__rate_limit_retry_count';
const MAX_RATE_LIMIT_RETRIES = 1;
const SNAPSHOT_TTL_MS = 10 * 60 * 1000;

type ManagedRequestConfig = AxiosRequestConfig & {
  __sharedDedupeKey?: string;
  __skipSharedDedupe?: boolean;
  [RATE_LIMIT_RETRY_KEY]?: number;
  extra?: Record<string, unknown>;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

type Snapshot = { data: unknown; savedAt: number };

const inFlightGetRequests = new Map<string, Deferred<unknown>>();
const publicGetSnapshots = new Map<string, Snapshot>();

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

class SharedGetRequestError extends Error {
  constructor(readonly sharedPromise: Promise<unknown>) {
    super('Request is already in flight');
    this.name = 'SharedGetRequestError';
  }
}

function getRequestMeta(config: AxiosRequestConfig | undefined): ManagedRequestConfig {
  return (config ?? {}) as ManagedRequestConfig;
}

function stableParams(params: unknown): string {
  if (!params || typeof params !== 'object') return String(params ?? '');
  if (params instanceof URLSearchParams) return params.toString();
  const entries = Object.entries(params as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify(entries);
}

function getRequestKey(config: AxiosRequestConfig): string {
  const headers = config.headers as Record<string, unknown> | undefined;
  const auth = headers?.Authorization ?? headers?.authorization ?? '';
  const clientId = headers?.['x-client-id'] ?? '';
  return [
    config.baseURL ?? '',
    config.url ?? '',
    stableParams(config.params),
    String(auth),
    String(clientId),
  ].join('|');
}

function isPublicSnapshotRequest(config: AxiosRequestConfig): boolean {
  const meta = getRequestMeta(config);
  if (meta.extra?.noCache === true) return false;
  const path = (config.url ?? '').split('?')[0];
  return path === '/tournaments/public' || path === '/communities' || path.startsWith('/rankings');
}

function isSharedGetEligible(config: AxiosRequestConfig): boolean {
  if (config.method?.toUpperCase() !== 'GET') return false;
  const meta = getRequestMeta(config);
  if (meta.__skipSharedDedupe === true || meta.extra?.noDedupe === true || meta.extra?.noCache === true) {
    return false;
  }
  const path = (config.url ?? '').split('?')[0];
  // Realtime and match-detail calls must remain independent so navigating
  // between live matches never waits for another screen's request.
  return !path.startsWith('/live') &&
    !path.startsWith('/chat') &&
    !path.startsWith('/notifications') &&
    !path.startsWith('/matches/');
}

function getHeaderValue(headers: unknown, name: string): string | null {
  if (!headers || typeof headers !== 'object') return null;
  const typedHeaders = headers as { get?: (headerName: string) => string | null } & Record<string, unknown>;
  const fromGetter = typedHeaders.get?.(name);
  if (fromGetter) return fromGetter;
  const raw = typedHeaders[name] ?? typedHeaders[name.toLowerCase()];
  return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] ?? null : null;
}

function retryAfterMs(headers: unknown): number {
  const raw = getHeaderValue(headers, 'retry-after');
  if (!raw) return 1000 + Math.floor(Math.random() * 250);
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) {
    return Math.min(10000, Math.max(0, seconds * 1000) + Math.floor(Math.random() * 250));
  }
  const dateMs = Date.parse(raw) - Date.now();
  return Math.min(10000, Math.max(0, dateMs) + Math.floor(Math.random() * 250));
}

function getAnonymousClientId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = window.localStorage.getItem(ANONYMOUS_CLIENT_ID_KEY);
    if (existing && /^[a-zA-Z0-9._:-]{8,128}$/.test(existing)) return existing;
    const generated = typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
    window.localStorage.setItem(ANONYMOUS_CLIENT_ID_KEY, generated);
    return generated;
  } catch {
    return null;
  }
}

/**
 * Đọc giá trị cookie theo tên
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

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
    ...(process.env.NEXT_PUBLIC_APP_API_KEY
      ? { 'x-app-key': process.env.NEXT_PUBLIC_APP_API_KEY }
      : {}),
  },
  withCredentials: true,
  // Match feeds can involve several joins and Redis fallback under load.
  // Do not treat a normal slow response as an empty feed.
  timeout: 15000,
});

// Request interceptor — gắn CSRF token cho state-changing requests
api.interceptors.request.use(
  (config) => {
    const anonymousClientId = getAnonymousClientId();
    if (anonymousClientId) {
      config.headers = config.headers ?? {};
      config.headers['x-client-id'] = anonymousClientId;
    }

    const managedConfig = getRequestMeta(config);
    if (isSharedGetEligible(config)) {
      const key = getRequestKey(config);
      const existing = inFlightGetRequests.get(key);
      if (existing) {
        return Promise.reject(new SharedGetRequestError(existing.promise));
      }
      const deferred = createDeferred<unknown>();
      inFlightGetRequests.set(key, deferred);
      managedConfig.__sharedDedupeKey = key;
    }

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
  (response) => {
    const managedConfig = getRequestMeta(response.config);
    const key = managedConfig.__sharedDedupeKey;
    if (key) {
      const deferred = inFlightGetRequests.get(key);
      if (deferred) {
        inFlightGetRequests.delete(key);
        deferred.resolve(response.data);
      }
    }

    if (isPublicSnapshotRequest(response.config)) {
      const snapshotKey = getRequestKey(response.config);
      publicGetSnapshots.set(snapshotKey, { data: response.data, savedAt: Date.now() });
      if (publicGetSnapshots.size > 100) {
        const oldest = [...publicGetSnapshots.entries()]
          .sort(([, left], [, right]) => left.savedAt - right.savedAt)[0]?.[0];
        if (oldest) publicGetSnapshots.delete(oldest);
      }
    }
    return response.data;
  },
  async (error) => {
    if (error instanceof SharedGetRequestError) {
      return error.sharedPromise;
    }

    const originalRequest = error.config;
    const managedRequest = getRequestMeta(originalRequest);
    const sharedKey = managedRequest.__sharedDedupeKey;
    const settleSharedRequest = (result: { data: unknown } | Error) => {
      if (!sharedKey) return;
      const deferred = inFlightGetRequests.get(sharedKey);
      if (!deferred) return;
      inFlightGetRequests.delete(sharedKey);
      if (result instanceof Error) deferred.reject(result);
      else deferred.resolve(result.data);
    };

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

    if (error.response?.status === 429) {
      const retryCount = managedRequest[RATE_LIMIT_RETRY_KEY] ?? 0;
      const snapshotKey = originalRequest ? getRequestKey(originalRequest) : '';
      const snapshot = snapshotKey ? publicGetSnapshots.get(snapshotKey) : undefined;

      if (isSharedGetEligible(originalRequest) && snapshot && Date.now() - snapshot.savedAt < SNAPSHOT_TTL_MS) {
        settleSharedRequest({ data: snapshot.data });
        return snapshot.data;
      }

      // Only idempotent GET requests get one controlled retry. The request
      // stays out of the dedupe map while waiting, so navigation never blocks
      // on another page's pending request.
      if (isSharedGetEligible(originalRequest) && retryCount < MAX_RATE_LIMIT_RETRIES) {
        await new Promise<void>((resolve) => setTimeout(resolve, retryAfterMs(error.response?.headers)));
        const retryConfig = {
          ...originalRequest,
          __skipSharedDedupe: true,
          [RATE_LIMIT_RETRY_KEY]: retryCount + 1,
        } as ManagedRequestConfig;
        try {
          return await api.request(retryConfig);
        } catch (retryError) {
          error = retryError;
        }
      }

      settleSharedRequest(error instanceof Error ? error : new Error('Rate limited request failed'));
      return Promise.reject(error);
    }

    settleSharedRequest(error instanceof Error ? error : new Error('Request failed'));
    return Promise.reject(error);
  }
);

