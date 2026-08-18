const LITE_JOIN_PATH = '/lite/tournaments/join/';

/**
 * Đúng chuẩn phân biệt LOẠI GIẢI: giải lite (nhanh) vs giải nâng cao.
 * Dùng field `isLite` (top-level hoặc trong tournamentConfig) — KHÔNG dùng `mode` (scoring).
 * Fallback an toàn cho giải lite cũ (mode='LITE' + hideAdvancedSettings=true) trước migration.
 */
export function isLiteTournament(t: {
  isLite?: boolean;
  tournamentConfig?: {
    isLite?: boolean;
    mode?: 'LITE' | 'ADVANCED' | 'STRICT' | string;
    hideAdvancedSettings?: boolean;
  } | null;
} | null | undefined): boolean {
  if (!t) return false;
  const cfg = t.tournamentConfig;
  if (t.isLite === true) return true;
  if (cfg?.isLite === true) return true;
  if (cfg?.mode === 'LITE' && cfg?.hideAdvancedSettings === true) return true;
  return false;
}

/**
 * Club Lite is the intentionally short, one-tap registration flow.
 *
 * Public Quick Create still uses the Lite creation API for backwards
 * compatibility, but it must use the normal registration workspace (including
 * partner/roster registration for doubles). Community ownership is the
 * durable discriminator between those two products.
 */
export function isClubLiteTournament(t: {
  communityId?: string | null;
  isLite?: boolean;
  tournamentConfig?: {
    isLite?: boolean;
    mode?: 'LITE' | 'ADVANCED' | 'STRICT' | string;
    hideAdvancedSettings?: boolean;
  } | null;
} | null | undefined): boolean {
  return isLiteTournament(t) && Boolean(t?.communityId);
}

export function buildLiteJoinUrl(inviteCode: string, origin: string): string {
  const cleanCode = inviteCode.trim();
  if (!cleanCode) return '';

  const base = new URL(origin);
  base.pathname = `${LITE_JOIN_PATH}${encodeURIComponent(cleanCode)}`;
  base.search = '';
  base.hash = '';
  return base.toString().replace(/\/$/, '');
}

export function isScannableLiteJoinUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const segments = url.pathname.split('/').filter(Boolean);
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      segments.length === 4 &&
      segments[0] === 'lite' &&
      segments[1] === 'tournaments' &&
      segments[2] === 'join' &&
      Boolean(segments[3])
    );
  } catch {
    return false;
  }
}

/**
 * Kiểm tra link mời quét được bằng camera điện thoại:
 * - `/lite/tournaments/join/{code}` — giải Lite (mở trang tham gia)
 * - `/tournaments/{id}/register?invite={code}` — giải đầy đủ (mở thẳng form đăng ký)
 */
export function isScannableJoinUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    const segments = url.pathname.split('/').filter(Boolean);

    if (
      segments.length === 4 &&
      segments[0] === 'lite' &&
      segments[1] === 'tournaments' &&
      segments[2] === 'join' &&
      Boolean(segments[3])
    ) {
      return true;
    }

    if (
      segments.length === 3 &&
      segments[0] === 'tournaments' &&
      segments[2] === 'register' &&
      Boolean(segments[1]) &&
      Boolean(url.searchParams.get('invite'))
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
