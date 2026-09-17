const MEDIA_LIST_SEPARATOR = /(?:\r?\n|,\s*(?=(?:https?:\/\/|data:image\/|\/)))/i;

/**
 * Normalize community media values without treating commas inside a URL as
 * list separators (for example Cloudinary transformations such as `c_fill,w_1200`).
 * Older records may contain multiple URLs separated by commas or newlines, so
 * only commas followed by a new URL are considered separators.
 */
export function normalizeCommunityMediaSources(
  ...values: Array<string | null | undefined>
): string[] {
  const sources: string[] = [];

  for (const value of values) {
    const trimmedValue = value?.trim();
    if (!trimmedValue) continue;

    let candidates: unknown[] = [trimmedValue];
    if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmedValue) as unknown;
        if (Array.isArray(parsed)) candidates = parsed;
      } catch {
        // Keep the original value when legacy data is not valid JSON.
      }
    }

    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      for (const source of candidate.split(MEDIA_LIST_SEPARATOR)) {
        const normalized = source.trim();
        if (normalized && !sources.includes(normalized)) sources.push(normalized);
      }
    }
  }

  return sources;
}
