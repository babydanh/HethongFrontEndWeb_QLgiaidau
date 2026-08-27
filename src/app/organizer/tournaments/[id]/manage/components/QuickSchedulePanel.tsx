'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, WandSparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toApiIsoDateTime } from '@/utils/dateTimeInput';
import { getSchedulePresets, type SchedulePresetId } from '@/features/tournaments/schedule-presets';
import type { SportRuleKind } from '@/types/tournament';
import type {
  Division,
  SchedulePlanPreview,
  SchedulePlanPreviewInput,
} from '@/features/tournaments/api';
import type { CourtSetupItem } from './CourtSetup';

interface QuickSchedulePanelProps {
  courts: CourtSetupItem[];
  divisions: Division[];
  defaultDivisionId?: string | null;
  defaultDate?: string | null;
  sportRuleKind?: SportRuleKind | null;
  setsToWin?: number | null;
  preview: SchedulePlanPreview | null;
  isPreviewing: boolean;
  onPreview: (payload: SchedulePlanPreviewInput) => Promise<SchedulePlanPreview | null>;
}

const STRATEGY = 'ROUND_ORDER_EARLIEST_AVAILABLE' as const;
const GRID_INCREMENTS = [5, 10, 15] as const;

type PresetId = Exclude<SchedulePresetId, 'custom'>;

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function QuickSchedulePanel({
  courts,
  divisions,
  defaultDivisionId,
  defaultDate,
  sportRuleKind,
  setsToWin,
  preview,
  isPreviewing,
  onPreview,
}: QuickSchedulePanelProps) {
  const t = useTranslations('OrganizerManage');
  const presets = useMemo(() => getSchedulePresets(sportRuleKind, setsToWin), [sportRuleKind, setsToWin]);
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic');
  const [divisionId, setDivisionId] = useState(defaultDivisionId || '');
  const [date, setDate] = useState(defaultDate?.slice(0, 10) || '');
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[] | null>(null);
  const [presetId, setPresetId] = useState<SchedulePresetId>('recommended');
  const [durationMinutes, setDurationMinutes] = useState(() => presets.recommended.playDurationMinutes);
  const [bufferMinutes, setBufferMinutes] = useState(() => presets.recommended.bufferMinutes);
  const [gridIncrementMinutes, setGridIncrementMinutes] = useState<5 | 10 | 15>(10);
  const [windowStart, setWindowStart] = useState('08:00');
  const [windowEnd, setWindowEnd] = useState('22:00');

  const effectiveCourtIds = useMemo(() => {
    const available = new Set(courts.map((court) => court.id));
    return selectedCourtIds === null
      ? courts.map((court) => court.id)
      : selectedCourtIds.filter((courtId) => available.has(courtId));
  }, [courts, selectedCourtIds]);
  const allCourtsSelected = effectiveCourtIds.length === courts.length && courts.length > 0;
  const courtNameById = useMemo(
    () => new Map(courts.map((court) => [court.id, court.courtName])),
    [courts],
  );

  const selectPreset = (nextPresetId: PresetId) => {
    const nextPreset = presets[nextPresetId];
    setPresetId(nextPresetId);
    setDurationMinutes(nextPreset.playDurationMinutes);
    setBufferMinutes(nextPreset.bufferMinutes);
  };

  const toggleCourt = (courtId: string) => {
    setSelectedCourtIds((current) =>
      (current ?? courts.map((court) => court.id)).includes(courtId)
        ? (current ?? courts.map((court) => court.id)).filter((id) => id !== courtId)
        : [...(current ?? courts.map((court) => court.id)), courtId],
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!date || effectiveCourtIds.length === 0) return;
    const payload: SchedulePlanPreviewInput = {
      divisionId: divisionId || undefined,
      date,
      courtIds: effectiveCourtIds,
      durationMinutes,
      bufferMinutes,
      gridIncrementMinutes,
      strategy: STRATEGY,
    };
    if (mode === 'advanced') {
      const start = toApiIsoDateTime(`${date}T${windowStart}`);
      const end = toApiIsoDateTime(`${date}T${windowEnd}`);
      if (!start || !end) return;
      payload.operatingWindow = { start, end };
    }
    await onPreview(payload);
  };

  return (
    <section className="space-y-5 border border-blue-200 bg-blue-50/30 p-5 md:p-6">
      <div className="flex items-start gap-3">
        <WandSparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">{t('quickSchedule')}</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{t('previewSchedule')}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{t('previewNoWrite')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 border border-slate-200 bg-white p-1" role="tablist" aria-label={t('matchSchedule.title')}>
        <button
          type="button"
          role="tab"
          aria-label={t('basicMode')}
          aria-selected={mode === 'basic'}
          onClick={() => setMode('basic')}
          className={`min-h-10 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${mode === 'basic' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          {t('basicMode')}
        </button>
        <button
          type="button"
          role="tab"
          aria-label={t('advancedMode')}
          aria-selected={mode === 'advanced'}
          onClick={() => setMode('advanced')}
          className={`min-h-10 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${mode === 'advanced' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          {t('advancedMode')}
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            {t('divisionLabel')}
            <select
              value={divisionId}
              onChange={(event) => setDivisionId(event.target.value)}
              className="mt-1.5 h-10 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('allDivisions')}</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>{division.name}</option>
              ))}
            </select>
          </label>
          <Input
            label={t('startDate')}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-slate-700">{t('durationTemplate')}</legend>
          <p className="text-xs leading-5 text-slate-500">{t('presetSportHint')}</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {(Object.keys(presets) as PresetId[]).map((id) => {
              const preset = presets[id];
              const selected = presetId === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectPreset(id)}
                  className={`min-h-20 border px-3 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${selected ? 'border-blue-600 bg-blue-50 text-blue-950' : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300'}`}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                    {t(preset.labelKey)}
                    <span className="text-xs font-normal text-slate-500">{preset.playDurationMinutes + preset.bufferMinutes} {t('minutesShort')}</span>
                  </span>
                  <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{t(preset.descriptionKey)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">{t('matchSchedule.court')}</p>
            <button
              type="button"
              onClick={() => setSelectedCourtIds(allCourtsSelected ? [] : courts.map((court) => court.id))}
              className="text-xs font-semibold text-blue-700 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {allCourtsSelected ? t('clearAllCourts') : t('selectAllCourts')}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {courts.map((court) => (
              <label key={court.id} className="flex min-h-11 items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={effectiveCourtIds.includes(court.id)}
                  onChange={() => toggleCourt(court.id)}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="truncate">{court.courtName}</span>
              </label>
            ))}
          </div>
          {courts.length === 0 && <p className="mt-2 text-sm text-slate-500">{t('status.notSet')}</p>}
        </div>

        {mode === 'advanced' && (
          <div className="space-y-4 border-l-2 border-blue-600 bg-white p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input label={t('playDuration')} type="number" min={15} max={240} step={5} value={durationMinutes} onChange={(event) => { setPresetId('custom'); setDurationMinutes(Number(event.target.value)); }} />
              <Input label={t('bufferMinutes')} type="number" min={0} max={60} step={5} value={bufferMinutes} onChange={(event) => { setPresetId('custom'); setBufferMinutes(Number(event.target.value)); }} />
              <Input label={t('startTime')} type="time" value={windowStart} onChange={(event) => setWindowStart(event.target.value)} />
              <Input label={t('endTime')} type="time" value={windowEnd} onChange={(event) => setWindowEnd(event.target.value)} />
            </div>
            <label className="block max-w-xs text-sm font-semibold text-slate-700">
              {t('gridIncrement')}
              <select
                value={gridIncrementMinutes}
                onChange={(event) => setGridIncrementMinutes(Number(event.target.value) as 5 | 10 | 15)}
                className="mt-1.5 h-10 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              >
                {GRID_INCREMENTS.map((increment) => <option key={increment} value={increment}>{increment} {t('minutesShort')}</option>)}
              </select>
            </label>
            {presetId === 'custom' && <p className="text-xs text-blue-700">{t('customPresetHint')}</p>}
          </div>
        )}

        <p className="border border-blue-100 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
          {t('slotSummary', { play: durationMinutes, buffer: bufferMinutes, total: durationMinutes + bufferMinutes, increment: gridIncrementMinutes })}
        </p>

        <div className="flex flex-col gap-3 border-t border-blue-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            {t('defaultSchedulePolicyHint')}
          </p>
          <Button
            type="submit"
            disabled={isPreviewing || !date || effectiveCourtIds.length === 0}
            className="min-h-11 bg-blue-600 text-white hover:bg-blue-700"
          >
            <CalendarClock className="mr-2 h-4 w-4" aria-hidden="true" />
            {isPreviewing ? t('processing') : t('previewSchedule')}
          </Button>
        </div>
      </form>

      {preview && (
        <div className="space-y-4 border-t border-blue-200 pt-4" aria-live="polite">
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="border border-slate-200 bg-white px-2 py-3"><strong className="block text-lg text-slate-900">{preview.readiness.assignedCount}</strong><span className="text-xs text-slate-500">{t('assignedMatches')}</span></div>
            <div className="border border-slate-200 bg-white px-2 py-3"><strong className="block text-lg text-slate-900">{preview.readiness.skippedCount}</strong><span className="text-xs text-slate-500">{t('skippedMatches')}</span></div>
            <div className="border border-slate-200 bg-white px-2 py-3"><strong className="block text-lg text-slate-900">{preview.durationMinutes + preview.bufferMinutes}</strong><span className="text-xs text-slate-500">{t('slotMinutes')}</span></div>
          </div>
          {preview.assignments.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {preview.assignments.map((assignment) => (
                <div key={assignment.matchId} className="border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm">
                  <p className="font-semibold text-slate-800">{courtNameById.get(assignment.courtId) || assignment.courtId}</p>
                  <p className="mt-1 text-xs text-slate-600">{formatTime(assignment.scheduledAt)} · #{assignment.matchId.slice(0, 8)}</p>
                </div>
              ))}
            </div>
          )}
          {preview.skipped.length > 0 && (
            <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
              {t('skippedMatches')} · {preview.skipped.length}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
