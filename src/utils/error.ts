export interface ApiError {
  message: string | string[];
  error?: string;
  statusCode?: number;
}

interface ErrorWithResponse {
  response?: {
    status?: number;
    data?: ApiError;
  };
  message?: string;
}
/**
 * Trích xuất câu báo lỗi có ý nghĩa từ object error `unknown` (thường bắt từ try/catch Axios)
 */
export const getErrorMessage = (error: unknown, fallbackMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.'): string => {
  if (!error) return fallbackMessage;

  // Lỗi từ Axios response mapping với ApiError của backend
  const err = error as ErrorWithResponse;
  
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

export const isHttpStatusError = (error: unknown, status: number): boolean => {
  const err = error as ErrorWithResponse;
  return err.response?.status === status;
};

export const isNetworkError = (error: unknown): boolean => {
  const err = error as ErrorWithResponse;
  return !err.response && err.message === 'Network Error';
};
