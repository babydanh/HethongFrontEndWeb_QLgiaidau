'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SchedulePlanPreview } from '@/features/tournaments/api';
import type { CourtSetupItem } from './CourtSetup';

interface ScheduleBoardMatch {
  id: string;
  roundNumber?: number | null;
  matchOrder?: number | null;
  scheduledAt?: string | null;
  courtId?: string | null;
  participant1?: { teamName?: string | null } | null;
  participant2?: { teamName?: string | null } | null;
}

interface CourtScheduleBoardProps {
  courts: CourtSetupItem[];
  matches: ScheduleBoardMatch[];
  preview?: SchedulePlanPreview | null;
  defaultDate?: string | null;
  defaultOperatingStart?: string;
  defaultOperatingEnd?: string;
  onOpenMatch: (matchId: string) => void;
}

type DraftAssignment = {
  courtId: string;
  scheduledAt: string;
  durationMinutes: number;
};

type ResizeState = {
  matchId: string;
  startY: number;
  initialDurationMinutes: number;
};

const PIXELS_PER_MINUTE = 1.25;

function formatMatchTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function matchLabel(
  match: ScheduleBoardMatch,
  t: (key: 'teamTbd') => string,
) {
  return `${match.participant1?.teamName || t('teamTbd')} vs ${match.participant2?.teamName || t('teamTbd')}`;
}

export function CourtScheduleBoard({
  courts,
  matches,
  preview = null,
  defaultDate,
  defaultOperatingStart = '08:00',
  defaultOperatingEnd = '22:00',
  onOpenMatch,
}: CourtScheduleBoardProps) {
  const t = useTranslations('OrganizerManage');
  const [draftAssignments, setDraftAssignments] = useState<Record<string, DraftAssignment>>({});
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const previewAssignmentByMatchId = useMemo(
    () => new Map(preview?.assignments.map((assignment) => [assignment.matchId, assignment]) ?? []),
    [preview],
  );
  const displayMatches = useMemo(() => matches.map((match) => {
    const persisted = Boolean(match.scheduledAt && match.courtId);
    const assignment = persisted ? null : previewAssignmentByMatchId.get(match.id);
    const draft = draftAssignments[match.id];
    return {
      match,
      scheduledAt: draft?.scheduledAt ?? (persisted ? match.scheduledAt : assignment?.scheduledAt ?? null),
      courtId: draft?.courtId ?? (persisted ? match.courtId : assignment?.courtId ?? null),
      durationMinutes: draft?.durationMinutes ?? (preview ? preview.durationMinutes + preview.bufferMinutes : 60),
      isPreview: !persisted && Boolean(assignment) && !draft,
      isDraft: Boolean(draft),
    };
  }), [draftAssignments, matches, preview, previewAssignmentByMatchId]);
  const gridStepMinutes = preview?.minimumStartIntervalMinutes ?? preview?.gridIncrementMinutes ?? 30;

  useEffect(() => {
    if (!resizeState) return;
    const handlePointerMove = (event: PointerEvent) => {
      const deltaMinutes = Math.round(((event.clientY - resizeState.startY) / PIXELS_PER_MINUTE) / gridStepMinutes) * gridStepMinutes;
      const durationMinutes = Math.max(gridStepMinutes, resizeState.initialDurationMinutes + deltaMinutes);
      setDraftAssignments((current) => {
        const existing = current[resizeState.matchId];
        if (!existing) return current;
        return { ...current, [resizeState.matchId]: { ...existing, durationMinutes } };
      });
    };
    const handlePointerUp = () => setResizeState(null);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [gridStepMinutes, resizeState]);

  const scheduledMatches = displayMatches.filter((item) => Boolean(item.scheduledAt && item.courtId));
  const unscheduledMatches = displayMatches.filter((item) => !item.scheduledAt || !item.courtId);

  const timeline = useMemo(() => {
    const start = preview
      ? new Date(preview.operatingWindow.start).getTime()
      : defaultDate && /^\\d{4}-\\d{2}-\\d{2}$/.test(defaultDate)
        ? new Date(`${defaultDate}T${defaultOperatingStart}:00.000Z`).getTime()
        : Number.NaN;
    const end = preview
      ? new Date(preview.operatingWindow.end).getTime()
      : defaultDate && /^\\d{4}-\\d{2}-\\d{2}$/.test(defaultDate)
        ? new Date(`${defaultDate}T${defaultOperatingEnd}:00.000Z`).getTime()
        : Number.NaN;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    const increment = preview?.gridIncrementMinutes ?? 30;
    const totalMinutes = Math.ceil((end - start) / 60_000);
    const marks = Array.from({ length: Math.floor(totalMinutes / increment) + 1 }, (_, index) => ({
      top: index * increment * PIXELS_PER_MINUTE,
      label: formatMatchTime(new Date(start + index * increment * 60_000).toISOString()),
    }));
    return { start, end, increment, totalMinutes, marks, height: totalMinutes * PIXELS_PER_MINUTE };
  }, [defaultDate, defaultOperatingEnd, defaultOperatingStart, preview]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, courtId: string) => {
    event.preventDefault();
    if (!timeline) return;
    const matchId = event.dataTransfer.getData('text/plain');
    const item = displayMatches.find((candidate) => candidate.match.id === matchId);
    if (!item) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const rawMinutes = Math.max(0, (event.clientY - bounds.top) / PIXELS_PER_MINUTE);
    const snappedMinutes = Math.round(rawMinutes / gridStepMinutes) * gridStepMinutes;
    const scheduledAt = new Date(timeline.start + snappedMinutes * 60_000).toISOString();
    setDraftAssignments((current) => ({
      ...current,
      [matchId]: {
        courtId,
        scheduledAt,
        durationMinutes: current[matchId]?.durationMinutes ?? item.durationMinutes,
      },
    }));
  };

  const renderMatchCard = (item: (typeof displayMatches)[number], compact = false) => (
    <button
      key={item.match.id}
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', item.match.id);
      }}
      onClick={() => onOpenMatch(item.match.id)}
      className={`group w-full border text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${compact ? 'border-dashed border-slate-300 bg-white px-3 py-3 hover:border-blue-400' : 'absolute inset-x-1 z-10 overflow-hidden px-2 py-2 shadow-sm hover:border-blue-500'} ${item.isDraft ? 'border-violet-500 bg-violet-50' : item.isPreview ? 'border-dashed border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}
      style={!compact ? {
        top: Math.max(0, (new Date(item.scheduledAt || 0).getTime() - (timeline?.start || 0)) / 60_000 * PIXELS_PER_MINUTE),
        height: Math.max(68, item.durationMinutes * PIXELS_PER_MINUTE),
      } : undefined}
    >
      <span className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 opacity-70 group-hover:opacity-100" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block text-[11px] font-bold text-blue-700">{formatMatchTime(item.scheduledAt)}</span>
          <span className={`mt-1 block font-semibold text-slate-800 ${compact ? 'text-sm' : 'line-clamp-2 text-xs'}`}>{matchLabel(item.match, t)}</span>
          <span className="mt-1 block text-[10px] text-slate-500">R{item.match.roundNumber ?? '—'} · #{item.match.matchOrder ?? '—'}</span>
        </span>
      </span>
      {!compact && (
        <span
          role="presentation"
          onPointerDown={(event) => {
            event.stopPropagation();
            event.preventDefault();
            setDraftAssignments((current) => ({
              ...current,
              [item.match.id]: {
                courtId: item.courtId!,
                scheduledAt: item.scheduledAt!,
                durationMinutes: item.durationMinutes,
              },
            }));
            setResizeState({ matchId: item.match.id, startY: event.clientY, initialDurationMinutes: item.durationMinutes });
          }}
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize bg-violet-300/50 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={t('resizeDraft')}
        />
      )}
    </button>
  );

  return (
    <section className="space-y-3" aria-labelledby="schedule-board-title">
      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-slate-200 py-2.5">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <CalendarClock className="h-4 w-4 text-blue-600" aria-hidden="true" />
          <h3 id="schedule-board-title" className="font-semibold">{t('tabs.schedule')}</h3>
          <span className="text-xs text-slate-500">{scheduledMatches.length}/{displayMatches.length}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 bg-white ring-1 ring-slate-300" aria-hidden="true" />{t('scheduled')}</span>
          {preview && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 border border-dashed border-blue-500 bg-blue-50" aria-hidden="true" />{t('previewDraft')}</span>}
          {Object.keys(draftAssignments).length > 0 && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 bg-violet-200 ring-1 ring-violet-500" aria-hidden="true" />{t('draft')}</span>}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border border-slate-200 bg-slate-50/70 p-3 xl:max-h-[720px] xl:overflow-y-auto" aria-label={t('unscheduledCourt')}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-slate-900">{t('unscheduledCourt')}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t('dragDraftHint')}</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{unscheduledMatches.length}</span>
          </div>
          {unscheduledMatches.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {unscheduledMatches.map((item) => renderMatchCard(item, true))}
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-xs text-slate-500">{t('allScheduled')}</div>
          )}
        </aside>

        <div className="min-w-0">
          {courts.length === 0 ? (
            <div className="border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">{t('status.notSet')}</div>
          ) : timeline ? (
            <div className="overflow-auto border border-slate-200 bg-white" role="region" aria-label={t('matchSchedule.court')} tabIndex={0}>
              <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `68px repeat(${courts.length}, minmax(180px, 1fr))` }}>
                <div className="sticky left-0 top-0 z-30 border-b border-r border-slate-200 bg-slate-50 px-2 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('time')}</div>
                {courts.map((court) => (
                  <div key={court.id} className="sticky top-0 z-20 border-b border-r border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-900">{court.courtName}</div>
                ))}
                <div className="relative border-r border-slate-200 bg-slate-50" style={{ height: timeline.height }}>
                  {timeline.marks.map((mark) => <span key={mark.top} className="absolute left-2 -translate-y-1/2 text-[11px] text-slate-500" style={{ top: mark.top }}>{mark.label}</span>)}
                </div>
                {courts.map((court) => {
                  const courtMatches = scheduledMatches
                    .filter((item) => item.courtId === court.id && item.scheduledAt)
                    .sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime());
                  return (
                    <div key={court.id} className="relative border-r border-slate-200 bg-white" style={{ height: timeline.height }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, court.id)}>
                      {timeline.marks.map((mark) => <span key={`${court.id}-${mark.top}`} className="pointer-events-none absolute inset-x-0 border-t border-slate-100" style={{ top: mark.top }} />)}
                      {courtMatches.map((item) => renderMatchCard(item))}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2" style={{ gridTemplateColumns: `repeat(${Math.min(courts.length, 3)}, minmax(0, 1fr))` }}>
              {courts.map((court) => {
                const courtMatches = scheduledMatches
                  .filter((item) => item.courtId === court.id)
                  .sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime());
                return (
                  <div key={court.id} className="min-h-40 border border-slate-200 bg-slate-50/60">
                    <div className="border-b border-slate-200 bg-white px-3 py-3"><p className="text-sm font-bold text-slate-900">{court.courtName}</p><p className="mt-1 text-xs text-slate-500">{courtMatches.length} · {t('matchSchedule.court')}</p></div>
                    <div className="space-y-2 p-2">{courtMatches.length === 0 ? <p className="px-2 py-4 text-center text-xs text-slate-400">{t('status.notSet')}</p> : courtMatches.map((item) => renderMatchCard(item, true))}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
