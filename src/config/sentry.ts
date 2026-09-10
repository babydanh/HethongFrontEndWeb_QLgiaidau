export function getSentrySampleRate(
  value: string | undefined,
  fallback = 0.1,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, 0), 1);
}

