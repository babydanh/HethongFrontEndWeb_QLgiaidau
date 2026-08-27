'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, WandSparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
  preview: SchedulePlanPreview | null;
  isPreviewing: boolean;
  onPreview: (payload: SchedulePlanPreviewInput) => Promise<SchedulePlanPreview | null>;
}

const STRATEGY = 'ROUND_ORDER_EARLIEST_AVAILABLE' as const;

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
  preview,
  isPreviewing,
  onPreview,
}: QuickSchedulePanelProps) {
  const t = useTranslations('OrganizerManage');
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic');
  const [divisionId, setDivisionId] = useState(defaultDivisionId || '');
  const [date, setDate] = useState(defaultDate?.slice(0, 10) || '');
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[] | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [bufferMinutes, setBufferMinutes] = useState(5);
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
      durationMinutes: mode === 'basic' ? 45 : durationMinutes,
      bufferMinutes: mode === 'basic' ? 5 : bufferMinutes,
      strategy: STRATEGY,
    };
    if (mode === 'advanced') {
      payload.operatingWindow = {
        start: `${date}T${windowStart}:00.000Z`,
        end: `${date}T${windowEnd}:00.000Z`,
      };
    }
    await onPreview(payload);
  };

  return (
    <section className="border border-blue-200 bg-blue-50/30 rounded-lg p-5 md:p-6 space-y-5">
      <div className="flex items-start gap-3">
        <WandSparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">{t('createSchedule')}</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{t('matchSchedule')}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{t('currentBracketDescription')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 border border-slate-200 bg-white p-1" role="tablist" aria-label={t('matchSchedule')}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'basic'}
          onClick={() => setMode('basic')}
          className={`min-h-10 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${mode === 'basic' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Basic
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'advanced'}
          onClick={() => setMode('advanced')}
          className={`min-h-10 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${mode === 'advanced' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Advanced
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            {t('selectDivisionFirst')}
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
            label={t('roundModal.dateLabel')}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">{t('matchSchedule.court')}</p>
            <button
              type="button"
              onClick={() => setSelectedCourtIds(allCourtsSelected ? [] : courts.map((court) => court.id))}
              className="text-xs font-semibold text-blue-700 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {allCourtsSelected ? t('skipShort') : t('fullView')}
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
          <div className="grid grid-cols-1 gap-4 border-l-2 border-blue-600 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input label="Duration (minutes)" type="number" min={15} max={240} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} />
            <Input label="Buffer (minutes)" type="number" min={0} max={60} value={bufferMinutes} onChange={(event) => setBufferMinutes(Number(event.target.value))} />
            <Input label="Start time" type="time" value={windowStart} onChange={(event) => setWindowStart(event.target.value)} />
            <Input label="End time" type="time" value={windowEnd} onChange={(event) => setWindowEnd(event.target.value)} />
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-blue-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            45 phút + 5 phút buffer · {t('roundModal.courtPlaceholder')}
          </p>
          <Button
            type="submit"
            disabled={isPreviewing || !date || effectiveCourtIds.length === 0}
            className="min-h-11 bg-blue-600 text-white hover:bg-blue-700"
          >
            <CalendarClock className="mr-2 h-4 w-4" aria-hidden="true" />
            {isPreviewing ? t('processing') : t('createSchedule')}
          </Button>
        </div>
      </form>

      {preview && (
        <div className="space-y-4 border-t border-blue-200 pt-4" aria-live="polite">
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="border border-slate-200 bg-white px-2 py-3"><strong className="block text-lg text-slate-900">{preview.readiness.assignedCount}</strong><span className="text-xs text-slate-500">{t('matchCount', { count: preview.readiness.assignedCount })}</span></div>
            <div className="border border-slate-200 bg-white px-2 py-3"><strong className="block text-lg text-slate-900">{preview.readiness.skippedCount}</strong><span className="text-xs text-slate-500">{t('unscheduledCourt')}</span></div>
            <div className="border border-slate-200 bg-white px-2 py-3"><strong className="block text-lg text-slate-900">{preview.durationMinutes + preview.bufferMinutes}</strong><span className="text-xs text-slate-500">min/slot</span></div>
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
              {t('roundModal.courtPlaceholder')} · {preview.skipped.length}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
