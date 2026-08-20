export interface ApiError {
  message: string | string[];
  error?: string;
  statusCode?: number;
}

interface ErrorWithResponse {
  response?: {
    status?: number;
    data?: ApiError;
    headers?: unknown;
  };
  message?: string;
}
/**
 * Trích xuất câu báo lỗi có ý nghĩa từ object error `unknown` (thường bắt từ try/catch Axios)
 */
export const getErrorMessage = (
  error: unknown,
  fallbackMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.',
  rateLimitMessage = fallbackMessage,
): string => {
  if (!error) return fallbackMessage;

  // Never expose the backend throttler exception name to users.
  const err = error as ErrorWithResponse;
  if (err.response?.status === 429) {
    return rateLimitMessage;
  }

  // Lỗi từ Axios response mapping với ApiError của backend
  if (err.response?.data?.message) {
    // Backend thường trả về string hoặc mảng validation strings
    const msg = err.response.data.message;
    if (Array.isArray(msg) && msg.length > 0) {
      return msg[0]; // Trả về lỗi validation đầu tiên
    }
    return String(msg);
  }

  // Fallback về lỗi mặc định của JS Error
  if (err.message) {
    return err.message;
  }

  return fallbackMessage;
};

export const getRetryAfterSeconds = (error: unknown): number | null => {
  const err = error as ErrorWithResponse;
  if (err.response?.status !== 429) return null;

  const headers = err.response.headers as
    | { get?: (name: string) => string | null; [key: string]: unknown }
    | undefined;
  const rawHeader = headers?.get?.('retry-after')
    ?? headers?.['retry-after']
    ?? headers?.['Retry-After'];
  const raw = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  if (typeof raw !== 'string' || !raw.trim()) return null;

  const seconds = Number(raw);
  if (Number.isFinite(seconds)) {
    return Math.max(1, Math.ceil(seconds));
  }

  const dateMs = Date.parse(raw) - Date.now();
  return Number.isFinite(dateMs) && dateMs > 0 ? Math.max(1, Math.ceil(dateMs / 1000)) : null;
};

export const isHttpStatusError = (error: unknown, status: number): boolean => {
  const err = error as ErrorWithResponse;
  return err.response?.status === status;
};

export const isNetworkError = (error: unknown): boolean => {
  const err = error as ErrorWithResponse;
  return !err.response && err.message === 'Network Error';
};

