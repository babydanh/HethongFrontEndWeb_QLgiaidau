import type { SportRuleKind } from '@/types/tournament';

export type SchedulePresetId = 'recommended' | 'fast' | 'safe' | 'custom';

export interface SchedulePreset {
  id: Exclude<SchedulePresetId, 'custom'>;
  playDurationMinutes: number;
  bufferMinutes: number;
  labelKey: 'schedulePresetFast' | 'schedulePresetRecommended' | 'schedulePresetSafe';
  descriptionKey: 'schedulePresetFastHint' | 'schedulePresetRecommendedHint' | 'schedulePresetSafeHint';
}

type PresetSet = Record<Exclude<SchedulePresetId, 'custom'>, SchedulePreset>;

const makePreset = (
  id: Exclude<SchedulePresetId, 'custom'>,
  playDurationMinutes: number,
  bufferMinutes: number,
): SchedulePreset => ({
  id,
  playDurationMinutes,
  bufferMinutes,
  labelKey: id === 'fast' ? 'schedulePresetFast' : id === 'safe' ? 'schedulePresetSafe' : 'schedulePresetRecommended',
  descriptionKey: id === 'fast' ? 'schedulePresetFastHint' : id === 'safe' ? 'schedulePresetSafeHint' : 'schedulePresetRecommendedHint',
});

const PRESETS: Record<SportRuleKind, PresetSet> = {
  BADMINTON: { fast: makePreset('fast', 30, 5), recommended: makePreset('recommended', 45, 5), safe: makePreset('safe', 60, 10) },
  TABLE_TENNIS: { fast: makePreset('fast', 25, 5), recommended: makePreset('recommended', 40, 5), safe: makePreset('safe', 55, 10) },
  PICKLEBALL_RALLY: { fast: makePreset('fast', 30, 5), recommended: makePreset('recommended', 40, 5), safe: makePreset('safe', 55, 10) },
  PICKLEBALL_SIDE_OUT: { fast: makePreset('fast', 25, 5), recommended: makePreset('recommended', 35, 5), safe: makePreset('safe', 50, 10) },
  TENNIS: { fast: makePreset('fast', 35, 10), recommended: makePreset('recommended', 50, 10), safe: makePreset('safe', 70, 15) },
  FOOTBALL: { fast: makePreset('fast', 50, 10), recommended: makePreset('recommended', 60, 10), safe: makePreset('safe', 75, 15) },
};

const FALLBACK_PRESETS = PRESETS.BADMINTON;

export function getSchedulePresets(kind: SportRuleKind | null | undefined, setsToWin?: number | null): PresetSet {
  const base = PRESETS[kind ?? 'BADMINTON'] ?? FALLBACK_PRESETS;
  if (kind === 'TENNIS' && (setsToWin ?? 1) > 1) {
    return {
      ...base,
      fast: { ...base.fast, playDurationMinutes: 60 },
      recommended: { ...base.recommended, playDurationMinutes: 90 },
      safe: { ...base.safe, playDurationMinutes: 120 },
    };
  }
  return base;
}

export function getSchedulePreset(
  kind: SportRuleKind | null | undefined,
  id: Exclude<SchedulePresetId, 'custom'>,
  setsToWin?: number | null,
) {
  return getSchedulePresets(kind, setsToWin)[id];
}
