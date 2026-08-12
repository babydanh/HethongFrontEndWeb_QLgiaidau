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

/**
 * Loại bỏ toàn bộ thẻ HTML và HTML entities, chuẩn hóa khoảng trắng để làm SEO meta description
 */
export const stripHtmlAndNormalize = (
  str: string | null | undefined,
  maxLength = 160,
): string => {
  if (!str) return '';
  let text = str;
  // Giải mã HTML entities (kể cả bị encode kép như &lt;p&gt;)
  for (let i = 0; i < 2; i += 1) {
    text = text
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&amp;/gi, '&')
      .replace(/&nbsp;/gi, ' ');
  }
  // Xóa toàn bộ thẻ HTML <...>
  text = text.replace(/<[^>]*>?/gm, ' ');
  // Chuẩn hóa nhiều khoảng trắng/xuống dòng thành 1 khoảng trắng
  text = text.replace(/\s+/g, ' ').trim();

  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
};


