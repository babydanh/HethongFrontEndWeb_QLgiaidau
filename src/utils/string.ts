/**
 * Loại bỏ khoảng trắng thừa ở đầu, cuối và giữa các từ
 * Ví dụ: "   Nguyễn   Văn    A   " -> "Nguyễn Văn A"
 */
export const trimAndNormalizeSpaces = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ');
};

/**
 * Loại bỏ khoảng trắng thừa ở đầu và cuối chuỗi (dùng cho password, email, text thông thường)
 * Ví dụ: "  test@email.com  " -> "test@email.com"
 */
export const trimSpaces = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.trim();
};

/**
 * Viết hoa chữ cái đầu tiên của chuỗi
 */
export const capitalizeFirstLetter = (str: string | null | undefined): string => {
  if (!str) return '';
  const trimmed = trimSpaces(str);
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};
