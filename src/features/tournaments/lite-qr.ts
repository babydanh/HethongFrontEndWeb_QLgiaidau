const LITE_JOIN_PATH = '/lite/tournaments/join/';

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
