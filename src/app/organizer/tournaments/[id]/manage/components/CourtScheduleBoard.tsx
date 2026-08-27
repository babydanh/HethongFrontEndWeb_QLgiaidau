'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarClock } from 'lucide-react';
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

  const scheduledMatches = displayMatches.filter(
    (item) => Boolean(item.scheduledAt && item.courtId),
  );
  const unscheduledMatches = displayMatches.filter(
    (item) => !item.scheduledAt || !item.courtId,
  );

  const timeline = useMemo(() => {
    if (!preview) return null;
    const start = new Date(preview.operatingWindow.start).getTime();
    const end = new Date(preview.operatingWindow.end).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    const increment = preview.gridIncrementMinutes;
    const totalMinutes = Math.ceil((end - start) / 60_000);
    const marks = Array.from({ length: Math.floor(totalMinutes / increment) + 1 }, (_, index) => ({
      top: index * increment * PIXELS_PER_MINUTE,
      label: formatMatchTime(new Date(start + index * increment * 60_000).toISOString()),
    }));
    return { start, end, increment, totalMinutes, marks, height: totalMinutes * PIXELS_PER_MINUTE };
  }, [preview]);

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

  return (
    <section className="space-y-4 border border-slate-200 bg-white p-5 md:p-6">
      <div className="flex items-start gap-3">
        <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
        <div>
          <h3 className="text-lg font-bold text-slate-900">{t('tabs.schedule')}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{t('matchSchedule.inherited')}</p>
        </div>
      </div>

      {courts.length === 0 ? (
        <div className="border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          {t('status.notSet')}
        </div>
      ) : timeline ? (
        <div className="space-y-3">
          {preview ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              <strong>{t('previewBoard')}</strong>
              <span>{t('previewDraft')}</span>
              <span>{t('dragDraftHint')}</span>
              <span>{gridStepMinutes} {t('minutesShort')} {t('gridIncrement')}</span>
            </div>
          ) : null}
          <div className="overflow-x-auto border border-slate-200" role="region" aria-label={t('matchSchedule.court')} tabIndex={0}>
            <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `68px repeat(${Math.max(courts.length, 1)}, minmax(180px, 1fr))` }}>
              <div className="border-b border-r border-slate-200 bg-slate-50 px-2 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('time')}</div>
              {courts.map((court) => (
                <div key={court.id} className="border-b border-r border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-900">
                  {court.courtName}
                </div>
              ))}
              <div className="relative border-r border-slate-200 bg-slate-50" style={{ height: timeline.height }}>
                {timeline.marks.map((mark) => (
                  <span key={mark.top} className="absolute left-2 -translate-y-1/2 text-[11px] text-slate-500" style={{ top: mark.top }}>
                    {mark.label}
                  </span>
                ))}
              </div>
              {courts.map((court) => {
                const courtMatches = scheduledMatches
                  .filter((item) => item.courtId === court.id && item.scheduledAt)
                  .sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime());
                return (
                                    <div key={court.id} className="relative border-r border-slate-200 bg-white" style={{ height: timeline.height }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, court.id)}>

                    {timeline.marks.map((mark) => (
                      <span key={`${court.id}-${mark.top}`} className="pointer-events-none absolute inset-x-0 border-t border-slate-100" style={{ top: mark.top }} />
                    ))}
                    {courtMatches.map((item) => {
                      const start = new Date(item.scheduledAt || 0).getTime();
                      const top = Math.max(0, (start - timeline.start) / 60_000 * PIXELS_PER_MINUTE);
                      const slotDuration = item.durationMinutes;
                      const height = Math.max(68, slotDuration * PIXELS_PER_MINUTE);
                      return (
                        <button
                          key={item.match.id}
                          type="button"
                          draggable
                          onDragStart={(event) => event.dataTransfer.setData('text/plain', item.match.id)}
                          onClick={() => onOpenMatch(item.match.id)}
                          className={`absolute inset-x-1 z-10 overflow-hidden border px-2 py-2 text-left shadow-sm transition-colors hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.isDraft ? 'border-violet-500 bg-violet-50' : item.isPreview ? 'border-dashed border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}
                          style={{ top, height }}
                        >
                          <p className="text-[11px] font-bold text-blue-700">{formatMatchTime(item.scheduledAt)}</p>
                          <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-800">{matchLabel(item.match, t)}</p>
                          <p className="mt-1 text-[10px] text-slate-500">R{item.match.roundNumber ?? '—'} · #{item.match.matchOrder ?? '—'}</p>
                          <span role="presentation" onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setDraftAssignments((current) => ({ ...current, [item.match.id]: { courtId: item.courtId!, scheduledAt: item.scheduledAt!, durationMinutes: item.durationMinutes } })); setResizeState({ matchId: item.match.id, startY: event.clientY, initialDurationMinutes: item.durationMinutes }); }} className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize bg-violet-300/50" aria-label={t('resizeDraft')} />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto" role="region" aria-label={t('matchSchedule.court')} tabIndex={0}>
          <div className="grid min-w-[640px] gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(courts.length, 1)}, minmax(180px, 1fr))` }}>
            {courts.map((court) => {
              const courtMatches = scheduledMatches
                .filter((item) => item.courtId === court.id)
                .sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime());
              return (
                <div key={court.id} className="min-h-40 border border-slate-200 bg-slate-50/60">
                  <div className="border-b border-slate-200 bg-white px-3 py-3">
                    <p className="text-sm font-bold text-slate-900">{court.courtName}</p>
                    <p className="mt-1 text-xs text-slate-500">{courtMatches.length} · {t('matchSchedule.court')}</p>
                  </div>
                  <div className="space-y-2 p-2">
                    {courtMatches.length === 0 ? (
                      <p className="px-2 py-4 text-center text-xs text-slate-400">{t('status.notSet')}</p>
                    ) : courtMatches.map((item) => (
                      <button key={item.match.id} type="button" onClick={() => onOpenMatch(item.match.id)} className="w-full border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <p className="text-xs font-bold text-blue-700">{formatMatchTime(item.scheduledAt)}</p>
                        <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-800">{matchLabel(item.match, t)}</p>
                        <p className="mt-1 text-[11px] text-slate-500">R{item.match.roundNumber ?? '—'} · #{item.match.matchOrder ?? '—'}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {unscheduledMatches.length > 0 && (
        <div className="border-t border-slate-200 pt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-900">{t('unscheduledCourt')}</p>
            <span className="text-xs font-semibold text-slate-500">{unscheduledMatches.length}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {unscheduledMatches.map((item) => (
              <button key={`unscheduled-${item.match.id}`} type="button" draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', item.match.id)} onClick={() => onOpenMatch(item.match.id)} className="border border-dashed border-slate-300 bg-white px-3 py-3 text-left transition-colors hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <p className="text-sm font-semibold text-slate-800">{matchLabel(item.match, t)}</p>
                <p className="mt-1 text-xs text-slate-500">R{item.match.roundNumber ?? '—'} · #{item.match.matchOrder ?? '—'}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
