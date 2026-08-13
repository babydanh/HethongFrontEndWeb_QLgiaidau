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
 * Format số dạng compact (K, M)
 * n < 1000: số nguyên (999)
 * n >= 1000: "1K", "2.5K", "12K"
 * n >= 1000000: "1M"
 */
export const formatCompact = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '0';
  if (n < 1000) return String(Math.round(n));
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
  }
  const k = n / 1000;
  return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
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

/**
 * Chuẩn hóa ngày người dùng nhập (dd/MM/yyyy hoặc yyyy-MM-dd) thành ISO date-only.
 * Trả về null khi ngày không hợp lệ để caller chủ động hiển thị lỗi.
 */
export const parseDateInputToIso = (value: string): string | null => {
  const input = value.trim();
  const vietnameseMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input);
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  const parts = vietnameseMatch
    ? [vietnameseMatch[3], vietnameseMatch[2], vietnameseMatch[1]]
    : isoMatch
      ? [isoMatch[1], isoMatch[2], isoMatch[3]]
      : null;

  if (!parts) return null;
  const [year, month, day] = parts.map((part) => Number.parseInt(part, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

