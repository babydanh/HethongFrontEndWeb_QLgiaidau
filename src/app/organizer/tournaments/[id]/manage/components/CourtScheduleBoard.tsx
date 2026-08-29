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
  groupName?: string | null;
  status?: string | null;
  score1?: number | string | null;
  score2?: number | string | null;
  participant1Score?: number | string | null;
  participant2Score?: number | string | null;
  sets?: Array<{ score1?: number | null; score2?: number | null; participant1Score?: number | null; participant2Score?: number | null }>;
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
  isFullscreen?: boolean;
  onOpenMatch: (matchId: string) => void;
  onSaveScheduleDirect?: (matchId: string, courtId: string, scheduledAt: string) => Promise<void>;
}

type DraftAssignment = {
  courtId: string;
  scheduledAt: string;
  durationMinutes?: number;
};

type AssignmentPickerState = {
  courtId: string;
  courtName: string;
  scheduledAt: string;
  rowIndex: number;
};

type ScaleOption = {
  minutes: number;
  label: string;
};

type SelectionRange = {
  startCourtIndex: number;
  endCourtIndex: number;
  startRowIndex: number;
  endRowIndex: number;
};

type BlockedSlot = {
  id: string;
  courtId: string;
  scheduledAt: string;
  durationMinutes: number;
  label: string;
};

type RowResizeState = {
  rowIndex: number;
  startY: number;
  initialDurations: Record<number, number>;
  affectedRowIndices: number[];
};

type MatchCardResizeState = {
  matchId: string;
  startY: number;
  initialDurationMinutes: number;
  currentDurationMinutes: number;
};

const PIXELS_PER_MINUTE = 2.8; // 1 minute = 2.8px (30 mins = 84px height, ample space for score cards)

function formatMatchTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
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
  const rNum = match.roundNumber;
  const matchOrder = match.matchOrder;
  const rawStage = match.roundName || match.stage?.name || match.stageName || '';
  let clean = rawStage
    .replace(/^stage\b/gi, '')
    .replace(/vòng\s*loại\s*trực\s*tiếp/gi, '')
    .replace(/knockout/gi, '')
    .replace(/elimination/gi, '')
    .trim();
  clean = clean.replace(/^[•·\-\s]+|[•·\-\s]+$/g, '').trim();

  if (clean && clean.toLowerCase() !== 'stage') return clean;

  if (rNum) return `Vòng ${rNum}`;
  if (matchOrder) return `Trận #${matchOrder}`;
  return 'Trận đấu';
}

function extractMatchScores(match: ScheduleBoardMatch) {
  const m = match as unknown as Record<string, unknown>;
  const s1 = m.participant1Score ?? m.score1 ?? (Array.isArray(m.sets) && m.sets.length > 0 ? (m.sets as Array<Record<string, unknown>>).map(s => s.score1 ?? s.participant1Score).filter(v => v !== undefined && v !== null).join('-') : null);
  const s2 = m.participant2Score ?? m.score2 ?? (Array.isArray(m.sets) && m.sets.length > 0 ? (m.sets as Array<Record<string, unknown>>).map(s => s.score2 ?? s.participant2Score).filter(v => v !== undefined && v !== null).join('-') : null);
  return {
    score1: s1 !== null && s1 !== undefined && String(s1).trim() !== '' ? String(s1) : null,
    score2: s2 !== null && s2 !== undefined && String(s2).trim() !== '' ? String(s2) : null,
  };
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
  isFullscreen = false,
  onOpenMatch,
  onSaveScheduleDirect,
}: CourtScheduleBoardProps) {
  const t = useTranslations('OrganizerManage');
  const locale = useLocale();

  // Excel Row Durations (in minutes per row, default 30 mins)
  const [rowDurations, setRowDurations] = useState<Record<number, number>>({});
  const [rowResizeState, setRowResizeState] = useState<RowResizeState | null>(null);
  const [matchCardResize, setMatchCardResize] = useState<MatchCardResizeState | null>(null);

  // General State
  const [draftAssignments, setDraftAssignments] = useState<Record<string, DraftAssignment>>({});
  const [assignmentPicker, setAssignmentPicker] = useState<AssignmentPickerState | null>(null);
  const [selectedPickerMatchIds, setSelectedPickerMatchIds] = useState<string[]>([]);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [pickerDivisionFilter, setPickerDivisionFilter] = useState('all');
  const [queueOpen, setQueueOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Excel-like rectangular multi-cell range selection
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragAnchor, setDragAnchor] = useState<{ courtIndex: number; rowIndex: number } | null>(null);
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

  // Dynamic Excel Row Model
  const baseStartMinute = useMemo(() => {
    const [h, m] = defaultOperatingStart.split(':').map(Number);
    return (h || 8) * 60 + (m || 0);
  }, [defaultOperatingStart]);

  const baseEndMinute = useMemo(() => {
    const [h, m] = defaultOperatingEnd.split(':').map(Number);
    return (h || 22) * 60 + (m || 0);
  }, [defaultOperatingEnd]);

  const defaultTotalSlots = useMemo(() => {
    const diff = Math.max(120, baseEndMinute - baseStartMinute);
    return Math.ceil(diff / 30);
  }, [baseEndMinute, baseStartMinute]);

  const timelineRows = useMemo(() => {
    const startTimestamp = new Date(`${scheduleDate}T${defaultOperatingStart}:00`).getTime();
    const rows = [];
    let accumulatedMinutes = 0;
    let accumulatedTop = 0;

    for (let i = 0; i < defaultTotalSlots; i++) {
      const duration = rowDurations[i] ?? 30; // default 30 mins
      const rowStartTimestamp = startTimestamp + accumulatedMinutes * 60_000;
      const rowEndTimestamp = rowStartTimestamp + duration * 60_000;
      const rowHeight = duration * PIXELS_PER_MINUTE;

      rows.push({
        index: i,
        durationMinutes: duration,
        startMinutesFromBase: accumulatedMinutes,
        startTimeStr: formatMatchTime(new Date(rowStartTimestamp).toISOString()),
        endTimeStr: formatMatchTime(new Date(rowEndTimestamp).toISOString()),
        startTimestamp: rowStartTimestamp,
        endTimestamp: rowEndTimestamp,
        top: accumulatedTop,
        height: rowHeight,
      });

      accumulatedMinutes += duration;
      accumulatedTop += rowHeight;
    }

    return {
      rows,
      totalMinutes: accumulatedMinutes,
      totalHeight: accumulatedTop,
      startTimestamp,
    };
  }, [defaultOperatingStart, defaultTotalSlots, rowDurations, scheduleDate]);

  // Handle Dragging Row Divider on Left Time Column (Excel style +1p / -1p)
  useEffect(() => {
    if (!rowResizeState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const deltaMinutes = Math.round((event.clientY - rowResizeState.startY) / PIXELS_PER_MINUTE);
      const baseInitial = rowResizeState.initialDurations[rowResizeState.rowIndex] ?? 30;
      const newDuration = Math.max(5, Math.min(180, baseInitial + deltaMinutes));

      setRowDurations((prev) => {
        const next = { ...prev };
        // Sync all affected/selected rows to the exact same duration! (Excel multi-row resize behavior)
        for (const idx of rowResizeState.affectedRowIndices) {
          next[idx] = newDuration;
        }
        return next;
      });
    };

    const handlePointerUp = () => {
      setRowResizeState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [rowResizeState]);

  // Handle Match Card Bottom Edge Resizing (1-minute precision)
  useEffect(() => {
    if (!matchCardResize) return;

    const handlePointerMove = (event: PointerEvent) => {
      const deltaMinutes = Math.round((event.clientY - matchCardResize.startY) / PIXELS_PER_MINUTE);
      const durationMinutes = Math.max(5, matchCardResize.initialDurationMinutes + deltaMinutes);

      setMatchCardResize((prev) => prev ? { ...prev, currentDurationMinutes: durationMinutes } : null);
      setDraftAssignments((current) => {
        const existing = current[matchCardResize.matchId];
        if (!existing) return current;
        return { ...current, [matchCardResize.matchId]: { ...existing, durationMinutes } };
      });
    };

    const handlePointerUp = () => {
      setMatchCardResize(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [matchCardResize]);

  // Filtering for match picker
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

  const openAssignmentPicker = (courtId: string, scheduledAt: string, rowIndex: number) => {
    const court = courts.find((c) => c.id === courtId);
    setAssignmentSearch('');
    setPickerDivisionFilter('all');
    setSelectedPickerMatchIds([]);
    setAssignmentPicker({
      courtId,
      courtName: court?.courtName || 'Sân',
      scheduledAt,
      rowIndex,
    });
  };

  // Assign multiple matches cascading down across rows on this court
  const handleAssignMultipleMatches = async () => {
    if (!assignmentPicker || selectedPickerMatchIds.length === 0) return;

    setIsSavingDraft(true);
    try {
      const newDrafts: Record<string, DraftAssignment> = {};
      let currentRowIdx = assignmentPicker.rowIndex;

      for (const matchId of selectedPickerMatchIds) {
        const item = displayMatches.find((candidate) => candidate.match.id === matchId);
        if (!item) continue;

        const rowInfo = timelineRows.rows[currentRowIdx] || timelineRows.rows[timelineRows.rows.length - 1];
        const targetTime = new Date(rowInfo.startTimestamp).toISOString();
        const duration = item.durationMinutes || rowInfo.durationMinutes || 30;

        if (onSaveScheduleDirect) {
          await onSaveScheduleDirect(matchId, assignmentPicker.courtId, targetTime);
        }

        newDrafts[matchId] = {
          courtId: assignmentPicker.courtId,
          scheduledAt: targetTime,
          durationMinutes: duration,
        };

        currentRowIdx++;
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

  // Drag & drop support
  const handleDrop = (event: React.DragEvent<HTMLDivElement>, courtId: string) => {
    event.preventDefault();
    const matchId = event.dataTransfer.getData('text/plain');
    const item = displayMatches.find((candidate) => candidate.match.id === matchId);
    if (!item) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const rawY = Math.max(0, event.clientY - bounds.top);

    // Find closest row
    const targetRow = timelineRows.rows.find((r) => rawY >= r.top && rawY < r.top + r.height) || timelineRows.rows[0];
    const scheduledAt = new Date(targetRow.startTimestamp).toISOString();

    if (onSaveScheduleDirect) {
      void onSaveScheduleDirect(matchId, courtId, scheduledAt);
    }

    setDraftAssignments((current) => ({
      ...current,
      [matchId]: {
        courtId,
        scheduledAt,
        durationMinutes: current[matchId]?.durationMinutes ?? targetRow.durationMinutes,
      },
    }));
  };

  // Excel Range Selection Handlers
  const handleCellPointerDown = (courtIndex: number, rowIndex: number) => {
    setIsSelecting(true);
    setDragAnchor({ courtIndex, rowIndex });
    setSelectionRange({
      startCourtIndex: courtIndex,
      endCourtIndex: courtIndex,
      startRowIndex: rowIndex,
      endRowIndex: rowIndex,
    });
  };

  const handleCellPointerEnter = (courtIndex: number, rowIndex: number) => {
    if (!isSelecting || !dragAnchor) return;
    const minCourt = Math.min(dragAnchor.courtIndex, courtIndex);
    const maxCourt = Math.max(dragAnchor.courtIndex, courtIndex);
    const minRow = Math.min(dragAnchor.rowIndex, rowIndex);
    const maxRow = Math.max(dragAnchor.rowIndex, rowIndex);

    setSelectionRange({
      startCourtIndex: minCourt,
      endCourtIndex: maxCourt,
      startRowIndex: minRow,
      endRowIndex: maxRow,
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
    if (!selectionRange) return;
    const selectedCourtsList = courts.slice(selectionRange.startCourtIndex, selectionRange.endCourtIndex + 1);
    const unassignedList = [...unscheduledMatches];
    if (unassignedList.length === 0) return;

    let unassignedIdx = 0;
    const newDrafts: Record<string, DraftAssignment> = {};

    for (let rIdx = selectionRange.startRowIndex; rIdx <= selectionRange.endRowIndex; rIdx++) {
      const rowInfo = timelineRows.rows[rIdx];
      if (!rowInfo) continue;
      const targetTime = new Date(rowInfo.startTimestamp).toISOString();

      for (const court of selectedCourtsList) {
        if (unassignedIdx >= unassignedList.length) break;
        const targetMatch = unassignedList[unassignedIdx];

        if (onSaveScheduleDirect) {
          void onSaveScheduleDirect(targetMatch.match.id, court.id, targetTime);
        }

        newDrafts[targetMatch.match.id] = {
          courtId: court.id,
          scheduledAt: targetTime,
          durationMinutes: rowInfo.durationMinutes,
        };
        unassignedIdx++;
      }
      if (unassignedIdx >= unassignedList.length) break;
    }

    setDraftAssignments((prev) => ({ ...prev, ...newDrafts }));
    setSelectionRange(null);
  };

  // Canh đều thời gian các dòng được chọn (Distribute row durations evenly)
  const handleDistributeRowsEvenly = () => {
    if (!selectionRange) return;
    const rowCount = selectionRange.endRowIndex - selectionRange.startRowIndex + 1;
    if (rowCount <= 0) return;

    let totalDuration = 0;
    for (let r = selectionRange.startRowIndex; r <= selectionRange.endRowIndex; r++) {
      totalDuration += rowDurations[r] ?? 30;
    }

    const evenDuration = Math.max(5, Math.floor(totalDuration / rowCount));

    setRowDurations((prev) => {
      const next = { ...prev };
      for (let r = selectionRange.startRowIndex; r <= selectionRange.endRowIndex; r++) {
        next[r] = evenDuration;
      }
      return next;
    });
  };

  // Block/Lock selected slots
  const handleBlockSelection = () => {
    if (!selectionRange) return;
    const selectedCourtsList = courts.slice(selectionRange.startCourtIndex, selectionRange.endCourtIndex + 1);
    const newBlocked: BlockedSlot[] = [];

    for (let r = selectionRange.startRowIndex; r <= selectionRange.endRowIndex; r++) {
      const rowInfo = timelineRows.rows[r];
      if (!rowInfo) continue;
      const targetTime = new Date(rowInfo.startTimestamp).toISOString();

      for (const court of selectedCourtsList) {
        newBlocked.push({
          id: `${court.id}-${r}-${Date.now()}`,
          courtId: court.id,
          scheduledAt: targetTime,
          durationMinutes: rowInfo.durationMinutes,
          label: 'Giờ nghỉ / Khóa sân',
        });
      }
    }

    setBlockedSlots((prev) => [...prev, ...newBlocked]);
    setSelectionRange(null);
  };

  // Clear scheduled matches in selection
  const handleClearSelectionMatches = () => {
    if (!selectionRange) return;
    const selectedCourtIds = new Set(
      courts.slice(selectionRange.startCourtIndex, selectionRange.endCourtIndex + 1).map((c) => c.id),
    );

    const minTimestamp = timelineRows.rows[selectionRange.startRowIndex]?.startTimestamp ?? 0;
    const maxTimestamp = timelineRows.rows[selectionRange.endRowIndex]?.endTimestamp ?? Infinity;

    const matchesInSelection = displayMatches.filter((item) => {
      if (!item.courtId || !item.scheduledAt || !selectedCourtIds.has(item.courtId)) return false;
      const t = new Date(item.scheduledAt).getTime();
      return t >= minTimestamp && t < maxTimestamp;
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

    setSelectionRange(null);
  };

  const renderMatchCard = (item: (typeof displayMatches)[number], compact = false) => {
    const p1 = getParticipantName(item.match.participant1);
    const p2 = getParticipantName(item.match.participant2);
    const roundLabelStr = getCleanRoundLabel(item.match);
    const division = divisions.find((d) => d.id === item.match.divisionId);
    const { score1, score2 } = extractMatchScores(item.match);

    let cardTop = 0;
    const cardHeight = Math.max(72, (item.durationMinutes || 30) * PIXELS_PER_MINUTE - 4);
    const matchTime = new Date(item.scheduledAt || 0).getTime();

    const matchingRow = timelineRows.rows.find(
      (r) => matchTime >= r.startTimestamp && matchTime < r.endTimestamp,
    );

    if (matchingRow) {
      const offsetMinutes = (matchTime - matchingRow.startTimestamp) / 60_000;
      cardTop = matchingRow.top + offsetMinutes * PIXELS_PER_MINUTE + 2;
    } else {
      cardTop = Math.max(0, ((matchTime - timelineRows.startTimestamp) / 60_000) * PIXELS_PER_MINUTE + 2);
    }

    const isCurrentlyResizing = matchCardResize?.matchId === item.match.id;

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
        className={`group w-full rounded-lg border text-left transition-all cursor-pointer ${
          compact
            ? 'border-slate-200 bg-white p-2.5 hover:border-blue-400 hover:shadow-xs'
            : 'absolute inset-x-1 z-10 overflow-hidden px-2.5 py-1.5 shadow-2xs hover:border-blue-500 hover:shadow-sm'
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
                height: Math.max(72, cardHeight),
              }
            : undefined
        }
      >
        <div className="flex h-full flex-col justify-between overflow-hidden pointer-events-none">
          {/* Header of Card: Round Setting + Division Tag */}
          <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1 shrink-0">
            <span className="truncate text-[11px] font-bold text-slate-800 tracking-tight">
              {roundLabelStr}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {division && (
                <span className="truncate rounded bg-blue-50 px-1.5 py-0.2 text-[9px] font-bold text-blue-700 border border-blue-100">
                  {division.name}
                </span>
              )}
              <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                {item.durationMinutes || 30}p
              </span>
            </div>
          </div>

          {/* Body: 2 Participants/Teams with dedicated score on the right */}
          <div className="flex-1 flex flex-col justify-around py-0.5 min-w-0">
            {/* Team 1 Row */}
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                <span className="truncate text-xs font-semibold text-slate-900 leading-none">
                  {p1}
                </span>
              </div>
              {score1 !== null ? (
                <span className="shrink-0 min-w-[20px] text-center rounded bg-slate-100 px-1.5 py-0.2 text-[11px] font-bold text-slate-800 border border-slate-200">
                  {score1}
                </span>
              ) : null}
            </div>

            {/* Team 2 Row */}
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                <span className="truncate text-xs font-semibold text-slate-700 leading-none">
                  {p2}
                </span>
              </div>
              {score2 !== null ? (
                <span className="shrink-0 min-w-[20px] text-center rounded bg-slate-100 px-1.5 py-0.2 text-[11px] font-bold text-slate-800 border border-slate-200">
                  {score2}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Live Match Card Resize Handle */}
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
              setMatchCardResize({
                matchId: item.match.id,
                startY: event.clientY,
                initialDurationMinutes: item.durationMinutes,
                currentDurationMinutes: item.durationMinutes,
              });
            }}
            className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize bg-blue-400/20 hover:bg-blue-500/50 transition-colors flex items-center justify-center group-hover:opacity-100"
            title="Kéo lên/xuống để co giãn thời lượng theo từng phút"
          >
            <div className="h-0.5 w-6 rounded-full bg-slate-400 group-hover:bg-blue-600" />
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-1 relative w-full h-full flex flex-col" aria-labelledby="schedule-board-title" ref={boardRef}>
      {/* Floating Excel-like Selection Action Bar */}
      {selectionRange && (
        <div className="sticky top-1 z-40 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900 text-white px-3.5 py-2 shadow-lg border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-150 shrink-0">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Đã chọn{' '}
              <strong className="text-emerald-400 font-bold">
                {selectionRange.endCourtIndex - selectionRange.startCourtIndex + 1} sân × {selectionRange.endRowIndex - selectionRange.startRowIndex + 1} hàng
              </strong>{' '}
              ({timelineRows.rows[selectionRange.startRowIndex]?.startTimeStr} →{' '}
              {timelineRows.rows[selectionRange.endRowIndex]?.endTimeStr})
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              onClick={handleBulkScheduleSelection}
              disabled={unscheduledMatches.length === 0}
              className="h-7 px-2.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <Zap className="h-3 w-3" />
              Điền nhanh các trận
            </Button>

            <Button
              type="button"
              onClick={handleDistributeRowsEvenly}
              className="h-7 px-2.5 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-xs flex items-center gap-1.5"
              title="Canh đều thời lượng các dòng được chọn"
            >
              <ChevronsUpDown className="h-3 w-3" />
              Canh đều các dòng
            </Button>

            <Button
              type="button"
              onClick={handleBlockSelection}
              className="h-7 px-2.5 text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <Lock className="h-3 w-3" />
              Khóa giờ
            </Button>

            <Button
              type="button"
              onClick={handleClearSelectionMatches}
              className="h-7 px-2 text-[11px] font-semibold bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white rounded-lg shadow-xs flex items-center gap-1"
              title="Xóa các trận trong vùng chọn"
            >
              <Trash2 className="h-3 w-3" />
            </Button>

            <button
              type="button"
              onClick={() => setSelectionRange(null)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {courts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
          Chưa có sân nào được thiết lập
        </div>
      ) : (
        <div
          className={`${
            isFullscreen
              ? 'h-[calc(100vh-64px)]'
              : 'h-[calc(100vh-170px)] min-h-[580px]'
          } overflow-auto rounded-xl border border-slate-200 bg-white shadow-xs select-none flex-1`}
          role="region"
          aria-label={t('matchSchedule.court')}
          tabIndex={0}
        >
          <div
            className="grid min-w-[900px]"
            style={{
              gridTemplateColumns: `88px repeat(${courts.length}, minmax(260px, 1fr))`,
            }}
          >
            {/* Corner header */}
            <div className="sticky left-0 top-0 z-30 border-b border-r border-slate-200 bg-slate-50 px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">
              Khung giờ
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

            {/* Time Labels Sidebar (1 line = 1 cột mốc thời gian) */}
            <div
              className="relative border-r border-slate-200 bg-slate-50/80"
              style={{ height: timelineRows.totalHeight }}
            >
              {timelineRows.rows.map((row) => {
                const isRowSelected =
                  selectionRange &&
                  row.index >= selectionRange.startRowIndex &&
                  row.index <= selectionRange.endRowIndex;

                return (
                  <React.Fragment key={row.index}>
                    {/* The Row Container */}
                    <div
                      className={`absolute inset-x-0 border-b border-slate-200/80 transition-colors ${
                        isRowSelected ? 'bg-blue-100/60' : ''
                      }`}
                      style={{ top: row.top, height: row.height }}
                    >
                      {/* Excel Row Resize Divider Handle on the line */}
                      <div
                        role="presentation"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();

                          // If multiple rows are selected, resizing this one will resize ALL selected rows together (canh đều!)
                          const isMulti =
                            selectionRange &&
                            row.index >= selectionRange.startRowIndex &&
                            row.index <= selectionRange.endRowIndex;

                          const affected = isMulti
                            ? Array.from(
                                { length: selectionRange.endRowIndex - selectionRange.startRowIndex + 1 },
                                (_, i) => selectionRange.startRowIndex + i,
                              )
                            : [row.index];

                          const initDurs: Record<number, number> = {};
                          for (const idx of affected) {
                            initDurs[idx] = rowDurations[idx] ?? 30;
                          }

                          setRowResizeState({
                            rowIndex: row.index,
                            startY: e.clientY,
                            initialDurations: initDurs,
                            affectedRowIndices: affected,
                          });
                        }}
                        className="group absolute inset-x-0 bottom-0 -mb-1.5 h-3 cursor-row-resize flex items-center justify-center hover:bg-blue-400/30 transition-colors z-30"
                        title="Kéo đường line này để chỉnh mốc thời gian ô (1p / -1p). Tô nhiều ô sẽ canh đều toàn bộ!"
                      >
                        <div className="h-0.5 w-full bg-slate-300 group-hover:bg-blue-600 transition-colors" />
                      </div>
                    </div>

                    {/* Time Marker positioned EXACTLY on the horizontal Line */}
                    <div
                      className="absolute inset-x-0 -translate-y-1/2 flex items-center justify-center pointer-events-none z-20"
                      style={{ top: row.top }}
                    >
                      <span className="bg-slate-50/95 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-800 tracking-tight shadow-2xs border border-slate-200/80">
                        {row.startTimeStr}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Final End Time Marker on the bottom-most line */}
              {timelineRows.rows.length > 0 && (
                <div
                  className="absolute inset-x-0 -translate-y-1/2 flex items-center justify-center pointer-events-none z-20"
                  style={{ top: timelineRows.totalHeight }}
                >
                  <span className="bg-slate-50/95 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-800 tracking-tight shadow-2xs border border-slate-200/80">
                    {timelineRows.rows[timelineRows.rows.length - 1].endTimeStr}
                  </span>
                </div>
              )}
            </div>

            {/* Court Grid Columns with Excel-style Cells */}
            {courts.map((court, courtIndex) => {
              const courtMatches = scheduledMatches.filter((item) => item.courtId === court.id && item.scheduledAt);
              const courtBlocked = blockedSlots.filter((slot) => slot.courtId === court.id);

              return (
                <div
                  key={court.id}
                  className="relative border-r border-slate-200 bg-white"
                  style={{ height: timelineRows.totalHeight }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, court.id)}
                >
                  {/* Excel Cells (1 cell per time row) */}
                  {timelineRows.rows.map((row) => {
                    const isCellSelected =
                      selectionRange &&
                      courtIndex >= selectionRange.startCourtIndex &&
                      courtIndex <= selectionRange.endCourtIndex &&
                      row.index >= selectionRange.startRowIndex &&
                      row.index <= selectionRange.endRowIndex;

                    return (
                      <div
                        key={`${court.id}-${row.index}`}
                        className={`absolute inset-x-0 border-b border-slate-100 text-left transition-colors cursor-cell ${
                          isCellSelected
                            ? 'bg-blue-500/15 ring-1 ring-inset ring-blue-400/60'
                            : 'hover:bg-blue-50/40'
                        }`}
                        style={{
                          top: row.top,
                          height: row.height,
                        }}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          handleCellPointerDown(courtIndex, row.index);
                        }}
                        onPointerEnter={() => {
                          handleCellPointerEnter(courtIndex, row.index);
                        }}
                        onDoubleClick={() => {
                          const targetTime = new Date(row.startTimestamp).toISOString();
                          openAssignmentPicker(court.id, targetTime, row.index);
                        }}
                        onClick={() => {
                          if (!isSelecting && !selectionRange) {
                            const targetTime = new Date(row.startTimestamp).toISOString();
                            openAssignmentPicker(court.id, targetTime, row.index);
                          }
                        }}
                        title={`Click / Double click để chọn nhiều trận xếp vào ${court.courtName} lúc ${row.startTimeStr}`}
                      />
                    );
                  })}

                  {/* Blocked Slots Overlay */}
                  {courtBlocked.map((slot) => {
                    const t = new Date(slot.scheduledAt).getTime();
                    const matchingRow = timelineRows.rows.find((r) => t >= r.startTimestamp && t < r.endTimestamp) || timelineRows.rows[0];
                    const top = matchingRow.top;
                    const height = Math.max(38, slot.durationMinutes * PIXELS_PER_MINUTE - 4);

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

                  {/* Scheduled Match Cards */}
                  {courtMatches.map((item) => renderMatchCard(item))}
                </div>
              );
            })}
          </div>
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
