'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  CalendarClock,
  Check,
  CheckSquare,
  ChevronsUpDown,
  GripVertical,
  Layers,
  Lock,
  Minus,
  Plus,
  Search,
  Sparkles,
  Square,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
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
  currentDurationMinutes: number;
};

type AssignmentPickerState = {
  courtId: string;
  courtName: string;
  scheduledAt: string;
  minuteOffset: number;
};

type SelectionRange = {
  startCourtIndex: number;
  endCourtIndex: number;
  startMinute: number;
  endMinute: number;
};

type BlockedSlot = {
  id: string;
  courtId: string;
  scheduledAt: string;
  durationMinutes: number;
  label: string;
};

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

  // Dynamic Row Height Scaling (Pixels per Minute)
  const [pixelsPerMinute, setPixelsPerMinute] = useState<number>(2); // Default 2px/min (30m = 60px)
  const [isResizingRowScale, setIsResizingRowScale] = useState(false);
  const rowScaleStartY = useRef<number>(0);
  const rowScaleStartVal = useRef<number>(2);

  // State
  const [draftAssignments, setDraftAssignments] = useState<Record<string, DraftAssignment>>({});
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [assignmentPicker, setAssignmentPicker] = useState<AssignmentPickerState | null>(null);
  const [selectedPickerMatchIds, setSelectedPickerMatchIds] = useState<string[]>([]);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [pickerDivisionFilter, setPickerDivisionFilter] = useState('all');
  const [queueOpen, setQueueOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Excel-like range selection
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragAnchor, setDragAnchor] = useState<{ courtIndex: number; minute: number } | null>(null);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);

  const boardRef = useRef<HTMLDivElement>(null);

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

  // 1-minute precision resizing handler
  useEffect(() => {
    if (!resizeState) return;
    const handlePointerMove = (event: PointerEvent) => {
      const deltaMinutes = Math.round((event.clientY - resizeState.startY) / pixelsPerMinute);
      const durationMinutes = Math.max(5, resizeState.initialDurationMinutes + deltaMinutes);
      
      setResizeState((prev) => prev ? { ...prev, currentDurationMinutes: durationMinutes } : null);
      setDraftAssignments((current) => {
        const existing = current[resizeState.matchId];
        if (!existing) return current;
        return { ...current, [resizeState.matchId]: { ...existing, durationMinutes } };
      });
    };

    const handlePointerUp = () => {
      setResizeState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [pixelsPerMinute, resizeState]);

  // Sidebar drag to expand / shrink row scale (Pixels Per Minute)
  useEffect(() => {
    if (!isResizingRowScale) return;
    const handlePointerMove = (event: PointerEvent) => {
      const deltaY = event.clientY - rowScaleStartY.current;
      const nextScale = Math.min(5, Math.max(0.8, rowScaleStartVal.current + deltaY * 0.01));
      setPixelsPerMinute(Number(nextScale.toFixed(2)));
    };

    const handlePointerUp = () => {
      setIsResizingRowScale(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizingRowScale]);

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
      top: index * increment * pixelsPerMinute,
      minute: index * increment,
      label: formatMatchTime(new Date(start + index * increment * 60_000).toISOString()),
    }));
    return { start, end, increment, totalMinutes, marks, height: totalMinutes * pixelsPerMinute };
  }, [defaultOperatingEnd, defaultOperatingStart, pixelsPerMinute, preview, scheduleDate]);

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

  const openAssignmentPicker = (courtId: string, scheduledAt: string, minuteOffset: number) => {
    const court = courts.find((c) => c.id === courtId);
    setAssignmentSearch('');
    setPickerDivisionFilter('all');
    setSelectedPickerMatchIds([]);
    setAssignmentPicker({
      courtId,
      courtName: court?.courtName || 'Sân',
      scheduledAt,
      minuteOffset,
    });
  };

  // Assign multiple selected matches cascading down on this court
  const handleAssignMultipleMatches = async () => {
    if (!assignmentPicker || selectedPickerMatchIds.length === 0 || !timeline) return;

    setIsSavingDraft(true);
    try {
      let currentMinute = assignmentPicker.minuteOffset;
      const newDrafts: Record<string, DraftAssignment> = {};

      for (const matchId of selectedPickerMatchIds) {
        const item = displayMatches.find((candidate) => candidate.match.id === matchId);
        if (!item) continue;
        const targetTime = new Date(timeline.start + currentMinute * 60_000).toISOString();
        const duration = item.durationMinutes || gridStepMinutes;

        if (onSaveScheduleDirect) {
          await onSaveScheduleDirect(matchId, assignmentPicker.courtId, targetTime);
        }

        newDrafts[matchId] = {
          courtId: assignmentPicker.courtId,
          scheduledAt: targetTime,
          durationMinutes: duration,
        };

        currentMinute += duration;
      }

      setDraftAssignments((prev) => ({ ...prev, ...newDrafts }));
      setAssignmentPicker(null);
      setSelectedPickerMatchIds([]);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const togglePickerMatchSelection = (matchId: string) => {
    setSelectedPickerMatchIds((prev) =>
      prev.includes(matchId) ? prev.filter((id) => id !== matchId) : [...prev, matchId],
    );
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, courtId: string) => {
    event.preventDefault();
    if (!timeline) return;
    const matchId = event.dataTransfer.getData('text/plain');
    const item = displayMatches.find((candidate) => candidate.match.id === matchId);
    if (!item) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const rawMinutes = Math.max(0, (event.clientY - bounds.top) / pixelsPerMinute);
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

  // Excel Range Selection Handlers
  const handleCellPointerDown = (courtIndex: number, minute: number) => {
    setIsSelecting(true);
    setDragAnchor({ courtIndex, minute });
    setSelectionRange({
      startCourtIndex: courtIndex,
      endCourtIndex: courtIndex,
      startMinute: minute,
      endMinute: minute + gridStepMinutes,
    });
  };

  const handleCellPointerEnter = (courtIndex: number, minute: number) => {
    if (!isSelecting || !dragAnchor) return;
    const minCourt = Math.min(dragAnchor.courtIndex, courtIndex);
    const maxCourt = Math.max(dragAnchor.courtIndex, courtIndex);
    const minMinute = Math.min(dragAnchor.minute, minute);
    const maxMinute = Math.max(dragAnchor.minute, minute) + gridStepMinutes;

    setSelectionRange({
      startCourtIndex: minCourt,
      endCourtIndex: maxCourt,
      startMinute: minMinute,
      endMinute: maxMinute,
    });
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      setIsSelecting(false);
      setDragAnchor(null);
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, []);

  // Multi-cell bulk schedule fill
  const handleBulkScheduleSelection = async () => {
    if (!selectionRange || !timeline) return;
    const selectedCourtsList = courts.slice(selectionRange.startCourtIndex, selectionRange.endCourtIndex + 1);
    const unassignedList = [...unscheduledMatches];
    if (unassignedList.length === 0) return;

    let unassignedIdx = 0;
    const newDrafts: Record<string, DraftAssignment> = {};

    for (let m = selectionRange.startMinute; m < selectionRange.endMinute; m += gridStepMinutes) {
      for (const court of selectedCourtsList) {
        if (unassignedIdx >= unassignedList.length) break;
        const targetMatch = unassignedList[unassignedIdx];
        const targetTime = new Date(timeline.start + m * 60_000).toISOString();

        if (onSaveScheduleDirect) {
          void onSaveScheduleDirect(targetMatch.match.id, court.id, targetTime);
        }

        newDrafts[targetMatch.match.id] = {
          courtId: court.id,
          scheduledAt: targetTime,
          durationMinutes: gridStepMinutes,
        };
        unassignedIdx++;
      }
      if (unassignedIdx >= unassignedList.length) break;
    }

    setDraftAssignments((prev) => ({ ...prev, ...newDrafts }));
    setSelectionRange(null);
  };

  // Canh đều các trận trong vùng chọn (Distribute evenly)
  const handleDistributeEvenly = async () => {
    if (!selectionRange || !timeline) return;
    const selectedCourtsList = courts.slice(selectionRange.startCourtIndex, selectionRange.endCourtIndex + 1);
    const totalSelectedMinutes = selectionRange.endMinute - selectionRange.startMinute;

    const newDrafts: Record<string, DraftAssignment> = {};

    for (const court of selectedCourtsList) {
      const matchesOnThisCourt = displayMatches.filter((item) => {
        if (item.courtId !== court.id || !item.scheduledAt) return false;
        const matchMin = Math.round((new Date(item.scheduledAt).getTime() - timeline.start) / 60_000);
        return matchMin >= selectionRange.startMinute && matchMin < selectionRange.endMinute;
      });

      if (matchesOnThisCourt.length === 0) continue;

      const evenDuration = Math.max(5, Math.floor(totalSelectedMinutes / matchesOnThisCourt.length));
      let currentMin = selectionRange.startMinute;

      for (const mItem of matchesOnThisCourt) {
        const targetTime = new Date(timeline.start + currentMin * 60_000).toISOString();
        if (onSaveScheduleDirect) {
          void onSaveScheduleDirect(mItem.match.id, court.id, targetTime);
        }
        newDrafts[mItem.match.id] = {
          courtId: court.id,
          scheduledAt: targetTime,
          durationMinutes: evenDuration,
        };
        currentMin += evenDuration;
      }
    }

    setDraftAssignments((prev) => ({ ...prev, ...newDrafts }));
    setSelectionRange(null);
  };

  // Block/Lock selected slots
  const handleBlockSelection = () => {
    if (!selectionRange || !timeline) return;
    const selectedCourtsList = courts.slice(selectionRange.startCourtIndex, selectionRange.endCourtIndex + 1);
    const newBlocked: BlockedSlot[] = [];

    for (const court of selectedCourtsList) {
      const targetTime = new Date(timeline.start + selectionRange.startMinute * 60_000).toISOString();
      newBlocked.push({
        id: `${court.id}-${selectionRange.startMinute}-${Date.now()}`,
        courtId: court.id,
        scheduledAt: targetTime,
        durationMinutes: selectionRange.endMinute - selectionRange.startMinute,
        label: 'Giờ nghỉ / Khóa sân',
      });
    }

    setBlockedSlots((prev) => [...prev, ...newBlocked]);
    setSelectionRange(null);
  };

  // Clear scheduled matches in selection
  const handleClearSelectionMatches = () => {
    if (!selectionRange || !timeline) return;
    const selectedCourtIds = new Set(
      courts.slice(selectionRange.startCourtIndex, selectionRange.endCourtIndex + 1).map((c) => c.id),
    );

    const matchesInSelection = displayMatches.filter((item) => {
      if (!item.courtId || !item.scheduledAt || !selectedCourtIds.has(item.courtId)) return false;
      const matchMin = Math.round((new Date(item.scheduledAt).getTime() - timeline.start) / 60_000);
      return matchMin >= selectionRange.startMinute && matchMin < selectionRange.endMinute;
    });

    for (const item of matchesInSelection) {
      if (onSaveScheduleDirect) {
        void onSaveScheduleDirect(item.match.id, '', '');
      }
    }

    setDraftAssignments((prev) => {
      const copy = { ...prev };
      for (const item of matchesInSelection) {
        delete copy[item.match.id];
      }
      return copy;
    });

    setBlockedSlots((prev) =>
      prev.filter((slot) => {
        if (!selectedCourtIds.has(slot.courtId)) return true;
        const slotMin = Math.round((new Date(slot.scheduledAt).getTime() - timeline.start) / 60_000);
        return !(slotMin >= selectionRange.startMinute && slotMin < selectionRange.endMinute);
      }),
    );

    setSelectionRange(null);
  };

  const renderMatchCard = (item: (typeof displayMatches)[number], compact = false) => {
    const division = divisions.find((d) => d.id === item.match.divisionId);
    const roundLabelStr = getCleanRoundLabel(item.match);
    const p1 = getParticipantName(item.match.participant1);
    const p2 = getParticipantName(item.match.participant2);

    // 1-minute accurate duration rendering
    const duration = item.durationMinutes || 30;
    const cardHeight = Math.max(46, duration * pixelsPerMinute - 4);
    const cardTop = Math.max(
      0,
      (((new Date(item.scheduledAt || 0).getTime() - (timeline?.start || 0)) / 60_000) *
        pixelsPerMinute) + 2,
    );

    const isCurrentlyResizing = resizeState?.matchId === item.match.id;

    return (
      <div
        key={item.match.id}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', item.match.id);
        }}
        onClick={(event) => {
          event.stopPropagation();
          onOpenMatch(item.match.id);
        }}
        className={`group w-full rounded-md border text-left transition-all cursor-pointer ${
          compact
            ? 'border-slate-200 bg-white p-2.5 hover:border-blue-400 hover:shadow-xs'
            : 'absolute inset-x-1 z-10 overflow-hidden px-2 py-1 shadow-2xs hover:border-blue-500 hover:shadow-sm'
        } ${
          item.isDraft
            ? 'border-violet-400 bg-violet-50/95 text-violet-950 ring-1 ring-violet-300'
            : item.isPreview
            ? 'border-dashed border-blue-400 bg-blue-50/95 text-blue-950'
            : 'border-slate-200 bg-white hover:border-blue-400'
        } ${isCurrentlyResizing ? 'ring-2 ring-blue-500 shadow-md' : ''}`}
        style={
          !compact
            ? {
                top: cardTop,
                height: cardHeight,
              }
            : undefined
        }
      >
        <div className="flex h-full flex-col justify-between overflow-hidden pointer-events-none">
          {/* Header of Card: Round Setting + Division Tag */}
          <div className="flex items-center justify-between gap-1 border-b border-slate-100/90 pb-0.5">
            <span className="truncate text-[10px] font-bold text-slate-800">
              {roundLabelStr}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {division && (
                <span className="truncate rounded-xs bg-slate-100 px-1 py-0 text-[9px] font-semibold text-slate-600 border border-slate-200/80">
                  {division.name}
                </span>
              )}
              <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1 rounded-xs border border-blue-100">
                {duration}p
              </span>
            </div>
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

        {/* Live Resize Handle - Pull up/down by 1 minute */}
        {!compact && (
          <div
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
                currentDurationMinutes: item.durationMinutes,
              });
            }}
            className="absolute inset-x-0 bottom-0 h-2.5 cursor-ns-resize bg-blue-400/20 hover:bg-blue-500/50 transition-colors flex items-center justify-center group-hover:opacity-100"
            title="Kéo lên/xuống để co giãn thời lượng theo từng 1 phút"
          >
            <div className="h-0.5 w-6 rounded-full bg-slate-400 group-hover:bg-blue-600" />
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-3 relative" aria-labelledby="schedule-board-title" ref={boardRef}>
      {/* Top Status and Scale Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
          <CalendarClock className="h-4 w-4 shrink-0 text-blue-600" />
          <div className="min-w-0">
            <h3 id="schedule-board-title" className="truncate font-bold text-slate-900 text-xs sm:text-sm">
              {formatDateLabel(scheduleDate, locale)}
            </h3>
            <p className="text-[11px] text-slate-500">
              Đã xếp {scheduledMatches.length}/{displayMatches.length} trận · Double click để chọn nhiều trận tự sắp xuống
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Row Height Scale / Zoom buttons */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-slate-600">
            <span className="text-[10px] font-semibold px-1.5 text-slate-500">Độ cao ô:</span>
            <button
              type="button"
              onClick={() => setPixelsPerMinute((p) => Math.max(0.8, Number((p - 0.3).toFixed(1))))}
              className="p-1 rounded hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs transition-colors"
              title="Thu hẹp ô (-1p scale)"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="text-[11px] font-bold px-1 min-w-8 text-center text-slate-800">
              {Math.round(pixelsPerMinute * 30)}px
            </span>
            <button
              type="button"
              onClick={() => setPixelsPerMinute((p) => Math.min(5, Number((p + 0.3).toFixed(1))))}
              className="p-1 rounded hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs transition-colors"
              title="Mở rộng ô (+1p scale)"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setQueueOpen(true)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700 shadow-xs"
          >
            Trận chưa xếp ({unscheduledMatches.length})
          </button>
        </div>
      </div>

      {/* Floating Excel-like Selection Action Bar */}
      {selectionRange && (
        <div className="sticky top-2 z-40 flex flex-wrap items-center justify-between gap-2.5 rounded-xl bg-slate-900 text-white px-4 py-2.5 shadow-lg border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Đã chọn{' '}
              <strong className="text-emerald-400 font-bold">
                {selectionRange.endCourtIndex - selectionRange.startCourtIndex + 1} sân
              </strong>{' '}
              ({formatMatchTime(new Date(timeline?.start ? timeline.start + selectionRange.startMinute * 60_000 : 0).toISOString())} →{' '}
              {formatMatchTime(new Date(timeline?.start ? timeline.start + selectionRange.endMinute * 60_000 : 0).toISOString())})
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              onClick={handleBulkScheduleSelection}
              disabled={unscheduledMatches.length === 0}
              className="h-7.5 px-3 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <Zap className="h-3 w-3" />
              Điền nhanh các trận
            </Button>

            <Button
              type="button"
              onClick={handleDistributeEvenly}
              className="h-7.5 px-3 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-xs flex items-center gap-1.5"
              title="Canh đều thời gian các trận trong vùng chọn"
            >
              <ChevronsUpDown className="h-3 w-3" />
              Canh đều các trận
            </Button>

            <Button
              type="button"
              onClick={handleBlockSelection}
              className="h-7.5 px-3 text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <Lock className="h-3 w-3" />
              Khóa giờ
            </Button>

            <Button
              type="button"
              onClick={handleClearSelectionMatches}
              className="h-7.5 px-2.5 text-[11px] font-semibold bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white rounded-lg shadow-xs flex items-center gap-1"
              title="Xóa các trận trong vùng chọn"
            >
              <Trash2 className="h-3 w-3" />
            </Button>

            <button
              type="button"
              onClick={() => setSelectionRange(null)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {courts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
          Chưa có sân nào được thiết lập
        </div>
      ) : timeline ? (
        <div
          className="max-h-[min(72vh,760px)] overflow-auto rounded-xl border border-slate-200 bg-white shadow-xs select-none"
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
            {/* Corner header - can drag to scale rows */}
            <div
              className="sticky left-0 top-0 z-30 border-b border-r border-slate-200 bg-slate-50 px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center cursor-ns-resize hover:bg-blue-50 transition-colors"
              onPointerDown={(e) => {
                setIsResizingRowScale(true);
                rowScaleStartY.current = e.clientY;
                rowScaleStartVal.current = pixelsPerMinute;
              }}
              title="Kéo lên/xuống để mở rộng hoặc thu hẹp chiều cao dòng thời gian"
            >
              Giờ ↕
            </div>

            {/* Court column headers */}
            {courts.map((court, cIdx) => {
              const count = scheduledMatches.filter((item) => item.courtId === court.id).length;
              const isColSelected =
                selectionRange &&
                cIdx >= selectionRange.startCourtIndex &&
                cIdx <= selectionRange.endCourtIndex;

              return (
                <div
                  key={court.id}
                  className={`sticky top-0 z-20 border-b border-r border-slate-200 px-3 py-2.5 backdrop-blur-xs transition-colors ${
                    isColSelected ? 'bg-blue-50/90 text-blue-900 border-b-blue-400' : 'bg-slate-50/90 text-slate-900'
                  }`}
                >
                  <p className="truncate text-xs font-bold">{court.courtName}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{count} trận đã xếp</p>
                </div>
              );
            })}

            {/* Time labels sidebar - draggable to adjust scale */}
            <div
              className="relative border-r border-slate-200 bg-slate-50/50 cursor-ns-resize hover:bg-blue-50/50 transition-colors"
              style={{ height: timeline.height }}
              onPointerDown={(e) => {
                setIsResizingRowScale(true);
                rowScaleStartY.current = e.clientY;
                rowScaleStartVal.current = pixelsPerMinute;
              }}
              title="Kéo lề thời gian lên/xuống để mở rộng hoặc thu hẹp độ cao ô"
            >
              {timeline.marks.map((mark) => (
                <span
                  key={mark.top}
                  className="absolute left-1.5 -translate-y-1/2 text-[10px] font-semibold text-slate-400 pointer-events-none"
                  style={{ top: mark.top }}
                >
                  {mark.label}
                </span>
              ))}
            </div>

            {/* Court Grid Columns */}
            {courts.map((court, courtIndex) => {
              const courtMatches = scheduledMatches
                .filter((item) => item.courtId === court.id && item.scheduledAt)
                .sort(
                  (a, b) =>
                    new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime(),
                );

              const courtBlocked = blockedSlots.filter((slot) => slot.courtId === court.id);

              return (
                <div
                  key={court.id}
                  className="relative border-r border-slate-200 bg-white"
                  style={{ height: timeline.height }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, court.id)}
                >
                  {/* Clickable & Draggable Excel Slots */}
                  {timeline.marks.map((mark) => {
                    const isCellSelected =
                      selectionRange &&
                      courtIndex >= selectionRange.startCourtIndex &&
                      courtIndex <= selectionRange.endCourtIndex &&
                      mark.minute >= selectionRange.startMinute &&
                      mark.minute < selectionRange.endMinute;

                    return (
                      <div
                        key={`${court.id}-${mark.top}`}
                        className={`absolute inset-x-0 z-0 border-t border-slate-100 text-left transition-colors cursor-cell ${
                          isCellSelected
                            ? 'bg-blue-500/15 border-blue-400 ring-1 ring-inset ring-blue-400/50'
                            : 'hover:bg-blue-50/40'
                        }`}
                        style={{
                          top: mark.top,
                          height: gridStepMinutes * pixelsPerMinute,
                        }}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          handleCellPointerDown(courtIndex, mark.minute);
                        }}
                        onPointerEnter={() => {
                          handleCellPointerEnter(courtIndex, mark.minute);
                        }}
                        onDoubleClick={() => {
                          const targetTime = new Date(
                            timeline.start + mark.minute * 60_000,
                          ).toISOString();
                          openAssignmentPicker(court.id, targetTime, mark.minute);
                        }}
                        onClick={() => {
                          if (!isSelecting && !selectionRange) {
                            const targetTime = new Date(
                              timeline.start + mark.minute * 60_000,
                            ).toISOString();
                            openAssignmentPicker(court.id, targetTime, mark.minute);
                          }
                        }}
                        title={`Click / Double click để chọn nhiều trận xếp vào ${court.courtName} lúc ${mark.label}`}
                      />
                    );
                  })}

                  {/* Blocked Slots Overlay */}
                  {courtBlocked.map((slot) => {
                    const top = Math.max(
                      0,
                      (((new Date(slot.scheduledAt).getTime() - timeline.start) / 60_000) *
                        pixelsPerMinute) + 2,
                    );
                    const height = Math.max(40, slot.durationMinutes * pixelsPerMinute - 4);
                    return (
                      <div
                        key={slot.id}
                        className="absolute inset-x-1 z-10 rounded-md border border-amber-300 bg-amber-50/90 p-2 text-amber-900 shadow-2xs flex items-center justify-between"
                        style={{ top, height }}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                          <Lock className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                          <span className="truncate">{slot.label}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setBlockedSlots((prev) => prev.filter((b) => b.id !== slot.id))}
                          className="p-0.5 rounded text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Scheduled match cards */}
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

      {/* POPUP MODAL: Chọn nhiều trận đấu tự động sắp nối tiếp nhau */}
      <Modal
        open={assignmentPicker !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAssignmentPicker(null);
            setSelectedPickerMatchIds([]);
          }
        }}
      >
        <ModalContent className="max-w-2xl rounded-xl border border-slate-200">
          <ModalHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div>
                  <ModalTitle className="text-base font-bold text-slate-900">
                    Xếp trận đấu vào {assignmentPicker?.courtName}
                  </ModalTitle>
                  <ModalDescription className="text-xs text-slate-500">
                    Bắt đầu từ:{' '}
                    <strong className="text-blue-700 font-semibold">
                      {formatMatchTime(assignmentPicker?.scheduledAt)}
                    </strong>{' '}
                    ({formatDateLabel(scheduleDate, locale)}) · Chọn nhiều trận sẽ tự động xếp nối tiếp nhau
                  </ModalDescription>
                </div>
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

          {/* Search bar & Bulk selection controls */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={assignmentSearch}
                onChange={(e) => setAssignmentSearch(e.target.value)}
                placeholder="Tìm kiếm người chơi, tên đội hoặc vòng đấu..."
                className="h-9 pl-8 text-xs rounded-lg border-slate-300 bg-white"
              />
            </div>

            {filteredPickerMatches.length > 0 && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (selectedPickerMatchIds.length === filteredPickerMatches.length) {
                      setSelectedPickerMatchIds([]);
                    } else {
                      setSelectedPickerMatchIds(filteredPickerMatches.map((m) => m.match.id));
                    }
                  }}
                  className="h-9 px-3 text-xs font-semibold rounded-lg border-slate-300 bg-white"
                >
                  {selectedPickerMatchIds.length === filteredPickerMatches.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                </Button>
              </div>
            )}
          </div>

          {/* Match cards list with multi-selection support */}
          {filteredPickerMatches.length > 0 ? (
            <div className="grid max-h-[50vh] gap-2 overflow-y-auto sm:grid-cols-2 pt-1">
              {filteredPickerMatches.map((item) => {
                const div = divisions.find((d) => d.id === item.match.divisionId);
                const roundLabelStr = getCleanRoundLabel(item.match);
                const p1 = getParticipantName(item.match.participant1);
                const p2 = getParticipantName(item.match.participant2);
                const isSelected = selectedPickerMatchIds.includes(item.match.id);

                return (
                  <div
                    key={item.match.id}
                    onClick={() => togglePickerMatchSelection(item.match.id)}
                    className={`flex flex-col justify-between rounded-lg border p-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-400 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div>
                      {/* Header: Clean round setting & Division */}
                      <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1 mb-2">
                        <div className="flex items-center gap-1.5">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                          <span className="text-[11px] font-bold text-slate-800">
                            {roundLabelStr}
                          </span>
                        </div>
                        {div && (
                          <span className="rounded-xs bg-slate-100 px-1.5 py-0.2 text-[9px] font-semibold text-slate-600 border border-slate-200">
                            {div.name}
                          </span>
                        )}
                      </div>

                      {/* 2 Teams / Participants */}
                      <div className="space-y-1 pl-5">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          <span className="truncate text-xs font-bold text-slate-900">
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

                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                      <span>Thời lượng: {item.durationMinutes || 30} phút</span>
                      <span className={`font-semibold ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                        {isSelected ? '✓ Đã chọn' : 'Nhấp để chọn'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center bg-slate-50">
              <Layers className="mx-auto h-6 w-6 text-slate-400 mb-1.5" />
              <p className="text-xs font-semibold text-slate-600">Không có trận đấu phù hợp</p>
            </div>
          )}

          {/* Modal Footer with Cascading Multi-Schedule Button */}
          <ModalFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <div className="text-xs font-medium text-slate-600">
              Đã chọn: <strong className="text-blue-600 font-bold">{selectedPickerMatchIds.length}</strong> trận
            </div>

            <div className="flex items-center gap-2">
              <ModalClose asChild>
                <Button type="button" variant="outline" className="h-9 px-4 rounded-lg text-xs font-semibold border-slate-300">
                  Hủy
                </Button>
              </ModalClose>
              <Button
                type="button"
                onClick={handleAssignMultipleMatches}
                disabled={isSavingDraft || selectedPickerMatchIds.length === 0}
                className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                {isSavingDraft
                  ? 'Đang xếp...'
                  : `Xếp ${selectedPickerMatchIds.length} trận nối tiếp nhau`}
              </Button>
            </div>
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
              Bạn có thể kéo thả trận đấu vào các ô trên bảng lịch hoặc click vào ô lưới để chọn.
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
