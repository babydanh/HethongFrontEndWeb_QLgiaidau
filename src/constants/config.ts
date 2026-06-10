/**
 * Cấu hình chung cho toàn bộ app
 */
export const APP_CONFIG = {
  SITE_NAME: 'TournaHub',
  SITE_DESCRIPTION: 'Nền tảng quản lý giải đấu thể thao chuyên nghiệp',
  DEFAULT_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 50,
  SUPPORTED_SPORTS: ['Pickleball', 'Tennis', 'Cầu lông'],
};

/**
 * Định dạng ngày giờ tiêu chuẩn
 */
export const DATE_FORMATS = {
  DISPLAY_DATE: 'DD/MM/YYYY',
  DISPLAY_DATETIME: 'DD/MM/YYYY HH:mm',
  API_DATE: 'YYYY-MM-DD',
};

/**
 * Các mã lỗi chung để tiện so sánh (nếu cần)
 */
export const ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  INTERNAL_SERVER_ERROR: 500,
};
