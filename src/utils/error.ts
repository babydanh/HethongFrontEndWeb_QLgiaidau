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

type SupportedLocale = 'vi' | 'en';

const DEFAULT_MESSAGES: Record<SupportedLocale, { generic: string; network: string; rateLimit: string; staleData: string }> = {
  vi: {
    generic: 'Đã xảy ra lỗi. Vui lòng thử lại.',
    network: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.',
    rateLimit: 'Hệ thống đang nhận nhiều yêu cầu. Vui lòng chờ vài giây rồi thử lại.',
    staleData: 'Hệ thống đang bận. Dữ liệu cũ vẫn được giữ lại, thử lại sau.',
  },
  en: {
    generic: 'Something went wrong. Please try again.',
    network: 'Unable to connect to the server. Check your connection.',
    rateLimit: 'The system is receiving many requests. Please wait a few seconds and try again.',
    staleData: 'The system is busy. Your last saved data is still available; please try again later.',
  },
};

const getCurrentLocale = (): SupportedLocale => {
  if (typeof document === 'undefined') return 'vi';
  return document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'vi';
};

const hasVietnameseText = (message: string): boolean =>
  /[ăâđêôơưĂÂĐÊÔƠƯ]|\b(không|vui lòng|bạn|đã|chưa|phải|cần|tìm thấy|quyền|tin nhắn|tài khoản|thử lại)\b/i.test(message);

const hasEnglishText = (message: string): boolean =>
  /\b(the|please|your|you|cannot|can't|unable|failed|invalid|expired|not found|access|permission|server|try again|something went wrong)\b/i.test(message);

const hasTechnicalText = (message: string): boolean =>
  /\b(axios|exception|stack trace|sql|postgres|query failed|econn|jwt|token malformed|undefined|null|nan|internal server error|status code|request failed|network error)\b/i.test(message) ||
  /\b[A-Za-z]+Error\b/.test(message) ||
  message.includes(' at ');

const isWrongLocale = (message: string, locale: SupportedLocale): boolean => {
  if (locale === 'en') return hasVietnameseText(message);
  return hasEnglishText(message) && !hasVietnameseText(message);
};

const resolveFallback = (fallbackMessage: string | undefined, locale: SupportedLocale, preferred: keyof typeof DEFAULT_MESSAGES.vi = 'generic'): string => {
  if (fallbackMessage && !isWrongLocale(fallbackMessage, locale) && !hasTechnicalText(fallbackMessage)) {
    return fallbackMessage;
  }
  return DEFAULT_MESSAGES[locale][preferred];
};

const readResponseMessage = (error: ErrorWithResponse): string | null => {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.find((item) => typeof item === 'string' && item.trim())?.trim() ?? null;
  return typeof message === 'string' && message.trim() ? message.trim() : null;
};

/**
 * Extracts a user-safe error message from an unknown Axios/Fetch error.
 * Backend messages are retained only when they are human-readable and match the active UI language.
 */
export const getErrorMessage = (
  error: unknown,
  fallbackMessage?: string,
  rateLimitMessage?: string,
  preferredFallback: keyof typeof DEFAULT_MESSAGES.vi = 'generic',
): string => {
  const locale = getCurrentLocale();
  const fallback = resolveFallback(fallbackMessage, locale, preferredFallback);
  if (!error || typeof error !== 'object') return fallback;

  const err = error as ErrorWithResponse;

  if (err.response?.status === 429) {
    return resolveFallback(rateLimitMessage, locale, 'rateLimit');
  }

  if (err.message === 'Network Error') return fallbackMessage ? fallback : DEFAULT_MESSAGES[locale].network;

  const responseMessage = readResponseMessage(err);
  if (responseMessage && !hasTechnicalText(responseMessage) && !isWrongLocale(responseMessage, locale)) {
    return responseMessage;
  }

  if (err.message && !hasTechnicalText(err.message) && !isWrongLocale(err.message, locale)) {
    return err.message;
  }

  return fallback;
};

export const getRetryAfterSeconds = (error: unknown): number | null => {
  if (!error || typeof error !== 'object') return null;
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
  if (!error || typeof error !== 'object') return false;
  const err = error as ErrorWithResponse;
  return err.response?.status === status;
};

export const isNetworkError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const err = error as ErrorWithResponse;
  return !err.response && err.message === 'Network Error';
};
