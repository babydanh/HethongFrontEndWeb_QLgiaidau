/**
 * Định dạng tiền tệ VND
 * VD: 30000 -> "30.000 ₫"
 */
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Định dạng số nguyên có dấu phẩy
 * VD: 12500 -> "12,500"
 */
export const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Rút gọn chuỗi dài
 * VD: "Đây là một đoạn text rất dài" -> "Đây là một..."
 */
export const truncateText = (text: string | null | undefined, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Định dạng ngày tháng
 * VD: "2026-06-09T00:00:00.000Z" -> "09/06/2026"
 */
export const formatDate = (dateString: string | Date | null | undefined, formatStr: string = 'dd/MM/yyyy'): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  if (formatStr === 'MM/yyyy') {
    return `${month}/${year}`;
  }
  
  return `${day}/${month}/${year}`;
};

/**
 * Định dạng ngày giờ theo chuẩn dd/MM/yyyy HH:mm
 */
export const formatDateTime = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};
