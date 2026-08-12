/**
 * Mapping tên môn thể thao -> logo SVG/PNG
 * Dùng cho toàn bộ app để hiển thị icon môn thi đấu thống nhất
 */

export const SPORT_LOGOS: Record<string, string> = {
  'Tennis': '/images/tennis.svg',
  'Quần vợt': '/images/tennis.svg',
  'tennis': '/images/tennis.svg',

  'Cầu lông': '/images/badminton.svg',
  'Badminton': '/images/badminton.svg',
  'badminton': '/images/badminton.svg',

  'Bóng bàn': '/images/ping-pong.svg',
  'Ping pong': '/images/ping-pong.svg',
  'Ping Pong': '/images/ping-pong.svg',
  'Table tennis': '/images/ping-pong.svg',
  'Table Tennis': '/images/ping-pong.svg',

  'Pickleball': '/images/Pickleball.png',
  'pickleball': '/images/Pickleball.png',

  'Bóng đá': '/images/football.svg',
  'Football': '/images/football.svg',
  'football': '/images/football.svg',
};

/**
 * Lấy đường dẫn logo dựa theo tên môn thể thao
 * @param name Tên môn thể thao (không phân biệt hoa/thường)
 * @returns Đường dẫn logo, hoặc null nếu không tìm thấy
 */
export function getSportLogo(name?: string | null): string | null {
  if (!name) return null;

  // Try exact match first
  if (SPORT_LOGOS[name]) return SPORT_LOGOS[name];

  // Try lowercase
  const lower = name.toLowerCase();
  if (SPORT_LOGOS[lower]) return SPORT_LOGOS[lower];

  // Try contains logic
  if (lower.includes('tennis') || lower.includes('quần vợt')) return '/images/tennis.svg';
  if (lower.includes('badminton') || lower.includes('cầu lông')) return '/images/badminton.svg';
  if (lower.includes('bóng bàn') || lower.includes('ping')) return '/images/ping-pong.svg';
  if (lower.includes('pickleball')) return '/images/Pickleball.png';
  if (lower.includes('bóng đá') || lower.includes('football') || lower.includes('soccer')) return '/images/football.svg';

  return null;
}

/**
 * Lấy màu sắc chủ đạo cho từng môn thể thao
 */
export function getSportColor(name?: string | null): string {
  if (!name) return 'bg-slate-500';
  const lower = name.toLowerCase();
  if (lower.includes('tennis') || lower.includes('quần vợt')) return 'bg-amber-500';
  if (lower.includes('badminton') || lower.includes('cầu lông')) return 'bg-blue-500';
  if (lower.includes('bóng bàn') || lower.includes('ping')) return 'bg-rose-500';
  if (lower.includes('pickleball')) return 'bg-emerald-500';
  if (lower.includes('bóng đá') || lower.includes('football') || lower.includes('soccer')) return 'bg-teal-600';
  return 'bg-slate-500';
}

