export interface TournamentLocationInput {
  city?: string | null;
  locationAddress?: string | null;
  venue?: {
    name?: string | null;
    locationAddress?: string | null;
  } | null;
  tournamentConfig?: {
    location?: {
      venueName?: string | null;
      address?: string | null;
      province?: string | null;
      district?: string | null;
      ward?: string | null;
      display?: string | null;
    } | null;
  } | null;
}

export interface MatchLocationInput {
  city?: string | null;
  courtName?: string | null;
  courtAddress?: string | null;
  tournament?: {
    venueName?: string | null;
    venueAddress?: string | null;
  } | null;
}

const normalizeLocationPart = (value: string): string => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[.\/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const metropolitanAliases: Record<string, string> = {
    'thanh pho ho chi minh': 'tp_hcm',
    'tp ho chi minh': 'tp_hcm',
    'tp hcm': 'tp_hcm',
    'tphcm': 'tp_hcm',
    'ho chi minh': 'tp_hcm',
    'thanh pho ha noi': 'tp_hn',
    'tp ha noi': 'tp_hn',
    'tphn': 'tp_hn',
    'ha noi': 'tp_hn',
    'thanh pho da nang': 'tp_danang',
    'tp da nang': 'tp_danang',
    'da nang': 'tp_danang',
    'thanh pho hai phong': 'tp_haiphong',
    'tp hai phong': 'tp_haiphong',
    'hai phong': 'tp_haiphong',
    'thanh pho can tho': 'tp_cantho',
    'tp can tho': 'tp_cantho',
    'can tho': 'tp_cantho',
  };
  if (metropolitanAliases[normalized]) return metropolitanAliases[normalized];

  return normalized
    .replace(/^(thanh pho|tinh|quan|huyen|thi xa|phuong|xa|tp|q|h|tx|p|x)\s+/, '')
    .trim();
};

const uniqueParts = (values: Array<string | null | undefined>): string[] => {
  const parts = values
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Map(parts.map((value) => [normalizeLocationPart(value), value])).values());
};

export const getTournamentLocationParts = (input: TournamentLocationInput): string[] => {
  const legacyLocation = input.tournamentConfig?.location;
  return uniqueParts([
    input.venue?.name,
    input.venue?.locationAddress,
    input.locationAddress,
    legacyLocation?.display,
    legacyLocation?.venueName,
    legacyLocation?.address,
    legacyLocation?.ward,
    legacyLocation?.district,
    legacyLocation?.province,
    input.city,
  ]);
};

export const getTournamentLocationLabel = (input: TournamentLocationInput): string =>
  getTournamentLocationParts(input).join(', ');

/**
 * Trả về địa chỉ ngắn gọn (Phường/Xã, Quận/Huyện, Tỉnh/TP) cho thẻ giải đấu
 * Giúp tránh tràn dòng và ẩn số nhà / tên đường chi tiết
 */
export const getTournamentShortLocation = (input: TournamentLocationInput): string => {
  const legacyLocation = input.tournamentConfig?.location;
  
  // 1. Ưu tiên cấu trúc hành chính rõ ràng nếu có
  const structuredParts = uniqueParts([
    legacyLocation?.ward,
    legacyLocation?.district,
    legacyLocation?.province || input.city,
  ]);

  if (structuredParts.length >= 2) {
    return structuredParts.join(', ');
  }

  // 2. Phân tích chuỗi địa chỉ đầy đủ (lấy 2 phần cuối: ví dụ Phường ..., TP. Hồ Chí Minh)
  const fullRaw = input.venue?.locationAddress || input.locationAddress || legacyLocation?.display || legacyLocation?.address || input.city || '';
  if (fullRaw) {
    const rawParts = uniqueParts([fullRaw]);

    if (rawParts.length > 2) {
      return rawParts.slice(-2).join(', ');
    }
    if (rawParts.length > 0) {
      return rawParts.join(', ');
    }
  }

  return getTournamentLocationLabel(input);
};

export const getMatchLocationParts = (input: MatchLocationInput): string[] =>
  uniqueParts([
    input.courtName,
    input.courtAddress,
    input.tournament?.venueName,
    input.tournament?.venueAddress,
    input.city,
  ]);

export const getMatchCourtParts = (input: MatchLocationInput): string[] =>
  uniqueParts([input.courtName, input.courtAddress]);

export const getMatchCourtLabel = (input: MatchLocationInput): string =>
  getMatchCourtParts(input).join(', ');

export const getMatchLocationLabel = (input: MatchLocationInput): string =>
  getMatchLocationParts(input).join(', ');
