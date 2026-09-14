const LITE_JOIN_PATH = '/lite/tournaments/join/';

type TournamentConfigDiscriminator = {
  isLite?: boolean;
  mode?: 'LITE' | 'ADVANCED' | 'STRICT' | string;
  hideAdvancedSettings?: boolean;
};

type TournamentProductShape = {
  communityId?: string | null;
  isLite?: boolean;
  tournamentConfig?: TournamentConfigDiscriminator | null;
};

/**
 * Nhận diện họ sản phẩm Lite/Quick, không phải riêng giao diện Siêu Lite.
 * `mode` là cấu hình tính điểm nên không được dùng một mình để nhận diện sản phẩm.
 * `isLite` là cờ sản phẩm chung mà backend dùng cho cả Siêu Lite và Lite/Quick.
 */
export function isLiteTournament(t: TournamentProductShape | null | undefined): boolean {
  if (!t) return false;
  const cfg = t.tournamentConfig;
  if (t.isLite === true) return true;
  if (cfg?.isLite === true) return true;
  // Legacy records created before the explicit isLite flag are only Lite when
  // the old UI marker is present as well. `mode`/`scoringMode` alone describe
  // scoring behavior and may also be used by full/advanced tournaments.
  if (cfg?.mode === 'LITE' && cfg.hideAdvancedSettings === true) return true;
  return false;
}

/**
 * Nhận diện đúng sản phẩm Siêu Lite.
 *
 * Siêu Lite phải có cờ Lite và marker `hideAdvancedSettings=true`. Marker này
 * là ranh giới backend dùng để nói rằng giải được mở bằng workspace tối giản.
 * Vì vậy Lite/Quick có division, ELO hoặc gender restriction vẫn là Lite product
 * nhưng không phải Siêu Lite.
 */
export function isSuperLiteTournament(t: TournamentProductShape | null | undefined): boolean {
  if (!t || t.tournamentConfig?.hideAdvancedSettings !== true) return false;

  const cfg = t.tournamentConfig;
  const hasExplicitLiteFlag = t.isLite === true || cfg?.isLite === true;
  const hasLegacyLiteMarker = cfg?.mode === 'LITE';
  return hasExplicitLiteFlag || hasLegacyLiteMarker;
}

/**
 * Club Super Lite is the intentionally short, one-tap registration flow.
 *
 * Public Quick Create still uses the Lite creation API for backwards
 * compatibility, but it must use the normal registration workspace (including
 * partner/roster registration for doubles). Community ownership plus the
 * Super Lite marker are the durable discriminators for the compact flow.
 */
export function isClubSuperLiteTournament(t: TournamentProductShape | null | undefined): boolean {
  return isSuperLiteTournament(t) && Boolean(t?.communityId);
}

/**
 * Backward-compatible name for existing route call sites. New code should use
 * `isClubSuperLiteTournament` when the compact Club workspace is intended.
 */
export function isClubLiteTournament(t: TournamentProductShape | null | undefined): boolean {
  return isClubSuperLiteTournament(t);
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
