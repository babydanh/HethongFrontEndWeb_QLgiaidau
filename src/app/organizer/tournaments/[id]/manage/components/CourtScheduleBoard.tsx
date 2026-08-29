'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, GripVertical, Layers, Search, Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import type { Division, SchedulePlanPreview } from '@/features/tournaments/api';
import type { CourtSetupItem } from './CourtSetup';

interface ScheduleBoardMatch {
  id: string;
  divisionId?: string | null;
  roundNumber?: number | null;
  matchOrder?: number | null;
  scheduledAt?: string | null;
  courtId?: string | null;
  stage?: {
    name?: string | null;
  } | null;
  stageName?: string | null;
  roundName?: string | null;
  participant1?: { teamName?: string | null; name?: string | null } | null;
  participant2?: { teamName?: string | null; name?: string | null } | null;
}

interface CourtScheduleBoardProps {
  courts: CourtSetupItem[];
  matches: ScheduleBoardMatch[];
  divisions?: Division[];
  preview?: SchedulePlanPreview | null;
  defaultDate?: string | null;
  defaultOperatingStart?: string;
  defaultOperatingEnd?: string;
  onOpenMatch: (matchId: string) => void;
  onSaveScheduleDirect?: (matchId: string, courtId: string, scheduledAt: string) => Promise<void>;
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

type AssignmentPickerState = {
  courtId: string;
  courtName: string;
  scheduledAt: string;
};

const PIXELS_PER_MINUTE = 2; // 30 mins = 60px

function formatMatchTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDateLabel(value: string | null, locale: string) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getCleanRoundLabel(match: ScheduleBoardMatch) {
  const rawStage = match.stage?.name || match.stageName || match.roundName || '';
  // Bỏ chữ "Vòng loại trực tiếp", "Knockout", "Elimination"
  let clean = rawStage
    .replace(/vòng\s*loại\s*trực\s*tiếp/gi, '')
    .replace(/knockout/gi, '')
    .replace(/elimination/gi, '')
    .trim();
  clean = clean.replace(/^[•·\-\s]+|[•·\-\s]+$/g, '').trim();

  if (clean) return clean;

  const rNum = match.roundNumber;
  if (rNum) return `Vòng ${rNum}`;
  return 'Trận đấu';
}

function getParticipantName(p?: { teamName?: string | null; name?: string | null } | null) {
  if (!p) return 'Chờ xác định';
  return p.teamName || p.name || 'Chờ xác định';
}

export function CourtScheduleBoard({
  courts,
  matches,
  divisions = [],
  preview = null,
  defaultDate,
  defaultOperatingStart = '08:00',
  defaultOperatingEnd = '22:00',
  onOpenMatch,
  onSaveScheduleDirect,
}: CourtScheduleBoardProps) {
  const t = useTranslations('OrganizerManage');
  const locale = useLocale();
  const [draftAssignments, setDraftAssignments] = useState<Record<string, DraftAssignment>>({});
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [assignmentPicker, setAssignmentPicker] = useState<AssignmentPickerState | null>(null);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [pickerDivisionFilter, setPickerDivisionFilter] = useState('all');
  const [queueOpen, setQueueOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

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
      durationMinutes: draft?.durationMinutes ?? (preview ? preview.durationMinutes + preview.bufferMinutes : 30),
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

  const scheduleDate = useMemo(() => {
    if (preview?.assignments?.[0]?.scheduledAt) {
      const match = preview.assignments[0].scheduledAt.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match?.[1]) return match[1];
    }
    if (defaultDate) {
      const match = defaultDate.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match?.[1]) return match[1];
    }
    const scheduled = matches.find((item) => item.scheduledAt)?.scheduledAt;
    if (scheduled) {
      const match = scheduled.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match?.[1]) return match[1];
    }
    return new Date().toISOString().slice(0, 10);
  }, [defaultDate, matches, preview]);

  const scheduledMatches = useMemo(
    () => displayMatches.filter((item) => Boolean(item.courtId && item.scheduledAt)),
    [displayMatches],
  );

  const unscheduledMatches = useMemo(
    () => displayMatches.filter((item) => !item.courtId || !item.scheduledAt),
    [displayMatches],
  );

  const timeline = useMemo(() => {
    const startStr = preview ? preview.operatingWindow.start : `${scheduleDate}T${defaultOperatingStart}:00`;
    const endStr = preview ? preview.operatingWindow.end : `${scheduleDate}T${defaultOperatingEnd}:00`;
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    const increment = preview?.gridIncrementMinutes ?? 30;
    const totalMinutes = Math.ceil((end - start) / 60_000);
    const marks = Array.from({ length: Math.floor(totalMinutes / increment) + 1 }, (_, index) => ({
      top: index * increment * PIXELS_PER_MINUTE,
      label: formatMatchTime(new Date(start + index * increment * 60_000).toISOString()),
    }));
    return { start, end, increment, totalMinutes, marks, height: totalMinutes * PIXELS_PER_MINUTE };
  }, [defaultOperatingEnd, defaultOperatingStart, preview, scheduleDate]);

  const filteredPickerMatches = useMemo(() => {
    const query = assignmentSearch.trim().toLocaleLowerCase();
    return unscheduledMatches.filter((item) => {
      if (pickerDivisionFilter !== 'all' && item.match.divisionId !== pickerDivisionFilter) {
        return false;
      }
      if (!query) return true;
      const p1 = getParticipantName(item.match.participant1).toLocaleLowerCase();
      const p2 = getParticipantName(item.match.participant2).toLocaleLowerCase();
      const roundStr = getCleanRoundLabel(item.match).toLocaleLowerCase();
      const orderStr = `#${item.match.matchOrder ?? ''}`.toLocaleLowerCase();
      return p1.includes(query) || p2.includes(query) || roundStr.includes(query) || orderStr.includes(query);
    });
  }, [assignmentSearch, pickerDivisionFilter, unscheduledMatches]);

  const openAssignmentPicker = (courtId: string, scheduledAt: string) => {
    const court = courts.find((c) => c.id === courtId);
    setAssignmentSearch('');
    setPickerDivisionFilter('all');
    setAssignmentPicker({
      courtId,
      courtName: court?.courtName || 'Sân',
      scheduledAt,
    });
  };

  const assignMatchToPickerCell = async (matchId: string) => {
    if (!assignmentPicker) return;
    const item = displayMatches.find((candidate) => candidate.match.id === matchId);
    if (!item) return;

    if (onSaveScheduleDirect) {
      setIsSavingDraft(true);
      try {
        await onSaveScheduleDirect(matchId, assignmentPicker.courtId, assignmentPicker.scheduledAt);
      } finally {
        setIsSavingDraft(false);
      }
    }

    setDraftAssignments((current) => ({
      ...current,
      [matchId]: {
        courtId: assignmentPicker.courtId,
        scheduledAt: assignmentPicker.scheduledAt,
        durationMinutes: current[matchId]?.durationMinutes ?? item.durationMinutes,
      },
    }));
    setAssignmentPicker(null);
  };

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
    
    if (onSaveScheduleDirect) {
      void onSaveScheduleDirect(matchId, courtId, scheduledAt);
    }

    setDraftAssignments((current) => ({
      ...current,
      [matchId]: {
        courtId,
        scheduledAt,
        durationMinutes: current[matchId]?.durationMinutes ?? item.durationMinutes,
      },
    }));
  };

  const renderMatchCard = (item: (typeof displayMatches)[number], compact = false) => {
    const division = divisions.find((d) => d.id === item.match.divisionId);
    const roundLabelStr = getCleanRoundLabel(item.match);
    const p1 = getParticipantName(item.match.participant1);
    const p2 = getParticipantName(item.match.participant2);

    // Fit precisely inside 30-min slot (60px height - 6px gap = 54px)
    const duration = item.durationMinutes || 30;
    const cardHeight = Math.max(54, duration * PIXELS_PER_MINUTE - 6);
    const cardTop = Math.max(
      0,
      (((new Date(item.scheduledAt || 0).getTime() - (timeline?.start || 0)) / 60_000) *
        PIXELS_PER_MINUTE) + 3,
    );

    return (
      <button
        key={item.match.id}
        type="button"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', item.match.id);
        }}
        onClick={(event) => {
          event.stopPropagation();
          onOpenMatch(item.match.id);
        }}
        className={`group w-full rounded-md border text-left transition-all ${
          compact
            ? 'border-slate-200 bg-white p-2.5 hover:border-blue-400 hover:shadow-xs'
            : 'absolute inset-x-1 z-10 overflow-hidden px-2 py-1 shadow-2xs hover:border-blue-500 hover:shadow-sm'
        } ${
          item.isDraft
            ? 'border-violet-400 bg-violet-50/95 text-violet-950'
            : item.isPreview
            ? 'border-dashed border-blue-400 bg-blue-50/95 text-blue-950'
            : 'border-slate-200 bg-white hover:border-blue-400'
        }`}
        style={
          !compact
            ? {
                top: cardTop,
                height: cardHeight,
              }
            : undefined
        }
      >
        <div className="flex h-full flex-col justify-between overflow-hidden">
          {/* Header of Card: Round Setting + Division Tag */}
          <div className="flex items-center justify-between gap-1 border-b border-slate-100/90 pb-0.5">
            <span className="truncate text-[10px] font-bold text-slate-800">
              {roundLabelStr}
            </span>
            {division && (
              <span className="truncate rounded-xs bg-slate-100 px-1 py-0 text-[9px] font-semibold text-slate-600 border border-slate-200/80">
                {division.name}
              </span>
            )}
          </div>

          {/* Body: 2 Participants/Teams */}
          <div className="flex-1 flex flex-col justify-center space-y-0.5 min-w-0 pt-0.5">
            <div className="flex items-center gap-1 min-w-0">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
              <span className="truncate text-[10px] sm:text-[11px] font-semibold text-slate-900 leading-tight">
                {p1}
              </span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
              <span className="truncate text-[10px] sm:text-[11px] font-semibold text-slate-700 leading-tight">
                {p2}
              </span>
            </div>
          </div>
        </div>

        {!compact && (
          <span
            role="presentation"
            onPointerDown={(event) => {
              event.stopPropagation();
              event.preventDefault();
              if (!item.courtId || !item.scheduledAt) return;
              setDraftAssignments((current) => ({
                ...current,
                [item.match.id]: {
                  courtId: item.courtId!,
                  scheduledAt: item.scheduledAt!,
                  durationMinutes: item.durationMinutes,
                },
              }));
              setResizeState({
                matchId: item.match.id,
                startY: event.clientY,
                initialDurationMinutes: item.durationMinutes,
              });
            }}
            className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize bg-blue-300/40 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label={t('resizeDraft')}
          />
        )}
      </button>
    );
  };

  return (
    <section className="space-y-3" aria-labelledby="schedule-board-title">
      {/* Top Status and Queue Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
          <CalendarClock className="h-4 w-4 shrink-0 text-blue-600" />
          <div className="min-w-0">
            <h3 id="schedule-board-title" className="truncate font-bold text-slate-900 text-xs sm:text-sm">
              {formatDateLabel(scheduleDate, locale)}
            </h3>
            <p className="text-[11px] text-slate-500">
              Đã xếp lịch {scheduledMatches.length}/{displayMatches.length} trận đấu
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setQueueOpen(true)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700 shadow-xs"
          >
            Trận chưa xếp ({unscheduledMatches.length})
          </button>
        </div>
      </div>

      {courts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
          Chưa có sân nào được thiết lập
        </div>
      ) : timeline ? (
        <div
          className="max-h-[min(72vh,760px)] overflow-auto rounded-xl border border-slate-200 bg-white shadow-xs"
          role="region"
          aria-label={t('matchSchedule.court')}
          tabIndex={0}
        >
          <div
            className="grid min-w-[900px]"
            style={{
              gridTemplateColumns: `64px repeat(${courts.length}, minmax(210px, 1fr))`,
            }}
          >
            {/* Corner header */}
            <div className="sticky left-0 top-0 z-30 border-b border-r border-slate-200 bg-slate-50 px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">
              Giờ
            </div>

            {/* Court column headers */}
            {courts.map((court) => {
              const count = scheduledMatches.filter((item) => item.courtId === court.id).length;
              return (
                <div
                  key={court.id}
                  className="sticky top-0 z-20 border-b border-r border-slate-200 bg-slate-50/90 backdrop-blur-xs px-3 py-2.5"
                >
                  <p className="truncate text-xs font-bold text-slate-900">{court.courtName}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{count} trận đã xếp</p>
                </div>
              );
            })}

            {/* Time labels sidebar */}
            <div className="relative border-r border-slate-200 bg-slate-50/40" style={{ height: timeline.height }}>
              {timeline.marks.map((mark) => (
                <span
                  key={mark.top}
                  className="absolute left-1.5 -translate-y-1/2 text-[10px] font-semibold text-slate-400"
                  style={{ top: mark.top }}
                >
                  {mark.label}
                </span>
              ))}
            </div>

            {/* Court Grid Columns */}
            {courts.map((court) => {
              const courtMatches = scheduledMatches
                .filter((item) => item.courtId === court.id && item.scheduledAt)
                .sort(
                  (a, b) =>
                    new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime(),
                );
              return (
                <div
                  key={court.id}
                  className="relative border-r border-slate-200 bg-white"
                  style={{ height: timeline.height }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, court.id)}
                >
                  {/* Clickable slot buttons for every 30-min time slot */}
                  {timeline.marks.map((mark) => (
                    <button
                      key={`${court.id}-${mark.top}`}
                      type="button"
                      className="absolute inset-x-0 z-0 border-t border-slate-100 text-left hover:bg-blue-50/50 transition-colors focus:bg-blue-50 focus:outline-hidden"
                      style={{
                        top: mark.top,
                        height: gridStepMinutes * PIXELS_PER_MINUTE,
                      }}
                      onClick={() => {
                        const targetTime = new Date(
                          timeline.start + (mark.top / PIXELS_PER_MINUTE) * 60_000,
                        ).toISOString();
                        openAssignmentPicker(court.id, targetTime);
                      }}
                      title={`Bấm để chọn trận xếp vào ${court.courtName} lúc ${mark.label}`}
                    />
                  ))}

                  {/* Scheduled match cards - precisely 54px fitting in 60px slot */}
                  {courtMatches.map((item) => renderMatchCard(item))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
          Chưa có khung giờ hoạt động
        </div>
      )}

      {/* POPUP MODAL: Chọn trận đấu xếp vào ô giờ */}
      <Modal
        open={assignmentPicker !== null}
        onOpenChange={(open) => {
          if (!open) setAssignmentPicker(null);
        }}
      >
        <ModalContent className="max-w-xl rounded-xl border border-slate-200">
          <ModalHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <ModalTitle className="text-base font-bold text-slate-900">
                  Xếp trận đấu vào {assignmentPicker?.courtName}
                </ModalTitle>
                <ModalDescription className="text-xs text-slate-500">
                  Thời gian: <strong className="text-blue-700 font-semibold">{formatMatchTime(assignmentPicker?.scheduledAt)}</strong> ({formatDateLabel(scheduleDate, locale)})
                </ModalDescription>
              </div>
            </div>
          </ModalHeader>

          {/* Division filters */}
          {divisions.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 hide-scrollbar">
              <button
                type="button"
                onClick={() => setPickerDivisionFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                  pickerDivisionFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả nội dung ({unscheduledMatches.length})
              </button>
              {divisions.map((d) => {
                const count = unscheduledMatches.filter((m) => m.match.divisionId === d.id).length;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setPickerDivisionFilter(d.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                      pickerDivisionFilter === d.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {d.name} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Search bar */}
          <div className="relative pt-1">
            <Search className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={assignmentSearch}
              onChange={(e) => setAssignmentSearch(e.target.value)}
              placeholder="Tìm kiếm người chơi, tên đội hoặc vòng đấu..."
              className="h-9 pl-8 text-xs rounded-lg border-slate-300 bg-white"
            />
          </div>

          {/* Match cards list - Clean framed structure matching user request */}
          {filteredPickerMatches.length > 0 ? (
            <div className="grid max-h-[50vh] gap-2 overflow-y-auto sm:grid-cols-2 pt-1">
              {filteredPickerMatches.map((item) => {
                const div = divisions.find((d) => d.id === item.match.divisionId);
                const roundLabelStr = getCleanRoundLabel(item.match);
                const p1 = getParticipantName(item.match.participant1);
                const p2 = getParticipantName(item.match.participant2);
                return (
                  <button
                    key={item.match.id}
                    type="button"
                    disabled={isSavingDraft}
                    onClick={() => assignMatchToPickerCell(item.match.id)}
                    className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3 text-left transition-all hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-xs group"
                  >
                    <div>
                      {/* Header: Clean round setting & Division */}
                      <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1 mb-2">
                        <span className="text-[11px] font-bold text-slate-800">
                          {roundLabelStr}
                        </span>
                        {div && (
                          <span className="rounded-xs bg-slate-100 px-1.5 py-0.2 text-[9px] font-semibold text-slate-600 border border-slate-200">
                            {div.name}
                          </span>
                        )}
                      </div>

                      {/* 2 Teams / Participants */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          <span className="truncate text-xs font-bold text-slate-900 group-hover:text-blue-700">
                            {p1}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                          <span className="truncate text-xs font-semibold text-slate-700">
                            {p2}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 group-hover:underline">
                        <Check className="h-3.5 w-3.5" />
                        Chọn xếp vào ô này
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center bg-slate-50">
              <Layers className="mx-auto h-6 w-6 text-slate-400 mb-1.5" />
              <p className="text-xs font-semibold text-slate-600">Không có trận đấu phù hợp</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tất cả các trận thuộc nội dung này đã được xếp lịch hoặc không tìm thấy kết quả.
              </p>
            </div>
          )}

          <ModalFooter className="border-t border-slate-100 pt-3">
            <ModalClose asChild>
              <Button type="button" variant="outline" className="h-8 rounded-lg text-xs font-semibold border-slate-300">
                Đóng
              </Button>
            </ModalClose>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* POPUP MODAL: Danh sách trận chưa xếp lịch */}
      <Modal open={queueOpen} onOpenChange={setQueueOpen}>
        <ModalContent className="max-w-2xl rounded-xl border border-slate-200">
          <ModalHeader>
            <ModalTitle className="text-base font-bold text-slate-900">
              Danh sách trận chưa xếp lịch ({unscheduledMatches.length})
            </ModalTitle>
            <ModalDescription className="text-xs text-slate-500">
              Bạn có thể kéo thả trận đấu vào các ô trên bảng lịch hoặc bấm vào ô lưới để chọn.
            </ModalDescription>
          </ModalHeader>
          {unscheduledMatches.length > 0 ? (
            <div className="grid max-h-[55vh] gap-2 overflow-y-auto sm:grid-cols-2 py-2">
              {unscheduledMatches.map((item) => renderMatchCard(item, true))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center bg-slate-50">
              <p className="text-xs font-semibold text-slate-600">Tất cả các trận đã được xếp lịch!</p>
            </div>
          )}
          <ModalFooter className="pt-2">
            <ModalClose asChild>
              <Button type="button" variant="outline" className="h-8 rounded-lg text-xs font-semibold border-slate-300">
                Đóng
              </Button>
            </ModalClose>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </section>
  );
}
