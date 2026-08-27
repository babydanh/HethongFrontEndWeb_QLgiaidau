import type { SportRuleKind } from '@/types/tournament';

export type SchedulePresetId = 'recommended' | 'fast' | 'safe' | 'custom';
export type ScheduleTimingModel = 'MATCH_TOTAL' | 'PER_SET' | 'PER_HALF';

export interface ScheduleTimingValues {
  timingModel: ScheduleTimingModel;
  unitDurationMinutes: number;
  unitCount: number;
  betweenUnitBreakMinutes: number;
  changeoverMinutes: number;
}

export interface SchedulePreset extends ScheduleTimingValues {
  id: Exclude<SchedulePresetId, 'custom'>;
  labelKey: 'schedulePresetFast' | 'schedulePresetRecommended' | 'schedulePresetSafe';
  descriptionKey: 'schedulePresetFastHint' | 'schedulePresetRecommendedHint' | 'schedulePresetSafeHint';
}

type PresetSet = Record<Exclude<SchedulePresetId, 'custom'>, SchedulePreset>;

const makePreset = (
  id: Exclude<SchedulePresetId, 'custom'>,
  timingModel: ScheduleTimingModel,
  unitDurationMinutes: number,
  unitCount: number,
  betweenUnitBreakMinutes: number,
  changeoverMinutes: number,
): SchedulePreset => ({
  id,
  timingModel,
  unitDurationMinutes,
  unitCount,
  betweenUnitBreakMinutes,
  changeoverMinutes,
  labelKey: id === 'fast' ? 'schedulePresetFast' : id === 'safe' ? 'schedulePresetSafe' : 'schedulePresetRecommended',
  descriptionKey: id === 'fast' ? 'schedulePresetFastHint' : id === 'safe' ? 'schedulePresetSafeHint' : 'schedulePresetRecommendedHint',
});

const PRESETS: Record<SportRuleKind, PresetSet> = {
  BADMINTON: {
    fast: makePreset('fast', 'PER_SET', 12, 3, 2, 5),
    recommended: makePreset('recommended', 'PER_SET', 14, 3, 3, 5),
    safe: makePreset('safe', 'PER_SET', 17, 3, 5, 10),
  },
  TABLE_TENNIS: {
    fast: makePreset('fast', 'PER_SET', 7, 3, 2, 5),
    recommended: makePreset('recommended', 'PER_SET', 8, 5, 2, 5),
    safe: makePreset('safe', 'PER_SET', 10, 5, 3, 10),
  },
  PICKLEBALL_RALLY: {
    fast: makePreset('fast', 'PER_SET', 14, 3, 2, 5),
    recommended: makePreset('recommended', 'PER_SET', 18, 3, 3, 5),
    safe: makePreset('safe', 'PER_SET', 23, 3, 5, 10),
  },
  PICKLEBALL_SIDE_OUT: {
    fast: makePreset('fast', 'MATCH_TOTAL', 25, 1, 0, 5),
    recommended: makePreset('recommended', 'MATCH_TOTAL', 35, 1, 0, 5),
    safe: makePreset('safe', 'MATCH_TOTAL', 50, 1, 0, 10),
  },
  TENNIS: {
    fast: makePreset('fast', 'PER_SET', 35, 1, 0, 10),
    recommended: makePreset('recommended', 'PER_SET', 50, 1, 0, 10),
    safe: makePreset('safe', 'PER_SET', 70, 1, 0, 15),
  },
  FOOTBALL: {
    fast: makePreset('fast', 'PER_HALF', 20, 2, 5, 10),
    recommended: makePreset('recommended', 'PER_HALF', 20, 2, 10, 10),
    safe: makePreset('safe', 'PER_HALF', 30, 2, 10, 15),
  },
};

const FALLBACK_PRESETS = PRESETS.BADMINTON;

export function calculateScheduleTiming(values: ScheduleTimingValues) {
  const unitCount = Math.max(1, Math.trunc(values.unitCount));
  const unitDurationMinutes = Math.max(1, Math.trunc(values.unitDurationMinutes));
  const betweenUnitBreakMinutes = Math.max(0, Math.trunc(values.betweenUnitBreakMinutes));
  const changeoverMinutes = Math.max(0, Math.trunc(values.changeoverMinutes));
  const estimatedPlayMinutes = values.timingModel === 'MATCH_TOTAL'
    ? unitDurationMinutes
    : unitDurationMinutes * unitCount + betweenUnitBreakMinutes * Math.max(0, unitCount - 1);
  return {
    estimatedPlayMinutes,
    changeoverMinutes,
    courtOccupancyMinutes: estimatedPlayMinutes + changeoverMinutes,
  };
}

export function getSchedulePresets(kind: SportRuleKind | null | undefined, setsToWin?: number | null): PresetSet {
  const base = PRESETS[kind ?? 'BADMINTON'] ?? FALLBACK_PRESETS;
  const isPerSet = base.recommended.timingModel === 'PER_SET';
  const defaultUnitCount = kind === 'FOOTBALL'
    ? 2
    : isPerSet
      ? Math.max(1, (setsToWin ?? 1) * 2 - 1)
      : 1;
  return Object.fromEntries(
    (Object.keys(base) as Array<Exclude<SchedulePresetId, 'custom'>>).map((id) => [
      id,
      { ...base[id], unitCount: base[id].timingModel === 'PER_SET' ? defaultUnitCount : base[id].unitCount },
    ]),
  ) as PresetSet;
}

export function getSchedulePreset(
  kind: SportRuleKind | null | undefined,
  id: Exclude<SchedulePresetId, 'custom'>,
  setsToWin?: number | null,
) {
  return getSchedulePresets(kind, setsToWin)[id];
}
