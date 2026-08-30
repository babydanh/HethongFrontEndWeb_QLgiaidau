'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  ArrowRightLeft,
  CalendarClock,
  Check,
  CheckSquare,
  ChevronsUpDown,
  Clipboard,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  GripVertical,
  Info,
  Layers,
  Lock,
  Minus,
  MoreHorizontal,
  Move,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Scissors,
  Search,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  X,
  Zap,
  ZoomIn,
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
  leg?: number | null;
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
  onSaveScheduleDirect?: (matchId: string, courtId: string, scheduledAt: string, silent?: boolean) => Promise<void>;
  onRefetchData?: () => Promise<any> | void;
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
  maxAllowedDurationMinutes: number;
};

const PIXELS_PER_MINUTE = 9.6; // 1 minute = 9.6px (15 mins = 144px height, high spacious grid matching previous 30p view)

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

function getAccurateRoundLabel(match: ScheduleBoardMatch, maxRound = 1) {
  const m = match as unknown as Record<string, unknown>;
  const rawRoundName = String(match.roundName || m.stageName || match.stage?.name || m.stageType || '').trim();
  const lowerName = rawRoundName.toLowerCase();
  const bracketCode = String(m.bracketCode || m.bracket_code || m.branch || m.bracket || '').toLowerCase();

  // 1. Check if Grand Final (Chung kết tổng trong nhánh thắng - nhánh thua)
  if (lowerName.includes('grand final') || lowerName.includes('chung kết tổng') || lowerName.includes('ck tổng')) {
    if (lowerName.includes('reset') || lowerName.includes('trận 2') || m.isResetMatch) {
      return 'CHUNG KẾT TỔNG (TRẬN 2)';
    }
    return 'CHUNG KẾT TỔNG';
  }

  // 2. Check if 3rd place match
  if (lowerName.includes('tranh hạng 3') || lowerName.includes('3rd') || lowerName.includes('third')) {
    return 'TRANH HẠNG 3';
  }

  // 3. Check if Group stage / Round Robin (Vòng Bảng)
  const groupName = match.groupName || (lowerName.includes('bảng') ? rawRoundName : '');
  if (groupName || lowerName.includes('group') || lowerName.includes('vòng bảng')) {
    const cleanGroup = (groupName || rawRoundName)
      .replace(/giai\s*đoạn\s*\d*/gi, '')
      .replace(/stage\s*\d*/gi, '')
      .replace(/group\s*/gi, 'BẢNG ')
      .trim();
    const legNum = match.leg || match.roundNumber;
    if (legNum) {
      return `${cleanGroup.toUpperCase()} • LƯỢT ${legNum}`;
    }
    return cleanGroup.toUpperCase();
  }

  const rNum = match.roundNumber || 1;

  // 4. Check Double Elimination: Nhánh Thắng (Winners / Upper Bracket)
  const isWinners =
    lowerName.includes('nhánh thắng') ||
    lowerName.includes('winner') ||
    lowerName.includes('upper') ||
    bracketCode.includes('upper') ||
    bracketCode.includes('wb');

  if (isWinners) {
    const diff = Math.max(0, maxRound - rNum);
    if (diff === 0) return 'CHUNG KẾT NHÁNH THẮNG';
    if (diff === 1) return 'BÁN KẾT NHÁNH THẮNG';
    if (diff === 2) return 'TỨ KẾT NHÁNH THẮNG';
    if (diff === 3) return 'NHÁNH THẮNG • VÒNG 1/8';
    if (diff === 4) return 'NHÁNH THẮNG • VÒNG 1/16';
    if (diff === 5) return 'NHÁNH THẮNG • VÒNG 1/32';
    return `NHÁNH THẮNG • VÒNG ${rNum}`;
  }

  // 5. Check Double Elimination: Nhánh Thua (Losers / Lower Bracket)
  const isLosers =
    lowerName.includes('nhánh thua') ||
    lowerName.includes('loser') ||
    lowerName.includes('lower') ||
    bracketCode.includes('lower') ||
    bracketCode.includes('lb');

  if (isLosers) {
    const diff = Math.max(0, maxRound - rNum);
    if (diff === 0) return 'CHUNG KẾT NHÁNH THUA';
    if (diff === 1) return 'BÁN KẾT NHÁNH THUA';
    if (diff === 2) return 'TỨ KẾT NHÁNH THUA';
    return `NHÁNH THUA • VÒNG ${rNum}`;
  }

  // 6. Check standard Knockout by distance from final
  const isKnockout =
    maxRound > 1 ||
    lowerName.includes('knockout') ||
    lowerName.includes('loại trực tiếp') ||
    lowerName.includes('elimination');

  if (isKnockout && maxRound >= 1) {
    const diff = maxRound - rNum;
    if (diff === 0) return 'CHUNG KẾT';
    if (diff === 1) return 'BÁN KẾT';
    if (diff === 2) return 'TỨ KẾT';
    if (diff === 3) return 'VÒNG 1/8';
    if (diff === 4) return 'VÒNG 1/16';
    if (diff === 5) return 'VÒNG 1/32';
    if (diff === 6) return 'VÒNG 1/64';
  }

  // 7. Clean custom name if valid
  let clean = rawRoundName
    .replace(/^stage\s*\d*/gi, '')
    .replace(/stage/gi, '')
    .replace(/vòng\s*loại\s*trực\s*tiếp/gi, '')
    .replace(/knockout/gi, '')
    .replace(/elimination/gi, '')
    .replace(/giai\s*đoạn\s*\d*/gi, '')
    .trim();
  clean = clean.replace(/^[•·\-\s:]+|[•·\-\s:]+$/g, '').trim();

  if (clean && !clean.toLowerCase().includes('stage')) {
    return clean.toUpperCase();
  }

  if (rNum) return `VÒNG ${rNum}`;
  if (match.matchOrder) return `TRẬN #${match.matchOrder}`;
  return 'VÒNG ĐẤU';
}

function getMatchBestOfFormat(match: ScheduleBoardMatch, division?: { name?: string; roundConfig?: unknown } | null): string {
  const m = match as unknown as Record<string, unknown>;
  const matchConfig = (m.matchConfig || m.rules || {}) as Record<string, unknown>;
  const roundConfig = (division?.roundConfig || {}) as Record<string, unknown>;

  const setsToWin = Number(matchConfig.setsToWin ?? matchConfig.sets_to_win ?? 0);
  const bestOf = Number(matchConfig.bestOf ?? matchConfig.best_of ?? roundConfig.bestOf ?? roundConfig.best_of ?? 0);

  if (bestOf === 5 || setsToWin === 3) return 'BO5';
  if (bestOf === 3 || setsToWin === 2) return 'BO3';
  return 'BO1';
}

function extractSetScores(match: ScheduleBoardMatch) {
  const m = match as unknown as Record<string, unknown>;
  const setList: Array<{ s1: string | number; s2: string | number }> = [];

  if (Array.isArray(m.sets) && m.sets.length > 0) {
    for (const set of m.sets as Array<Record<string, unknown>>) {
      const s1 = set.score1 ?? set.participant1Score ?? '';
      const s2 = set.score2 ?? set.participant2Score ?? '';
      if (s1 !== '' || s2 !== '') {
        setList.push({ s1: String(s1), s2: String(s2) });
      }
    }
  }

  if (setList.length === 0) {
    const s1 = m.participant1Score ?? m.score1;
    const s2 = m.participant2Score ?? m.score2;
    if (s1 !== undefined && s1 !== null && s1 !== '') {
      setList.push({ s1: String(s1), s2: s2 !== undefined && s2 !== null ? String(s2) : '' });
    }
  }

  return setList;
}

function getParticipantPlayers(p?: { teamName?: string | null; name?: string | null } | null): string[] {
  if (!p) return ['Chờ xác định'];
  const full = (p.teamName || p.name || 'Chờ xác định').trim();
  if (full.includes('/') || full.includes('&')) {
    return full.split(/[/&]/).map((s) => s.trim()).filter(Boolean);
  }
  if (full.includes(' - ')) {
    return full.split(' - ').map((s) => s.trim()).filter(Boolean);
  }
  return [full];
}

function cleanDisplayName(name: string): string {
  return name.trim().replace(/^(QA\s*|Cặp\s*|Đôi\s*|VĐV\s*|Đội\s*)/i, '').trim();
}

function getShortTwoWords(name: string): string {
  const cleaned = cleanDisplayName(name);
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return cleaned;
  return parts.slice(-2).join(' ');
}

function detectSportAndFormat(
  match: ScheduleBoardMatch,
  division?: { name?: string; matchFormat?: string; format?: string; sportType?: string } | null,
) {
  const divName = (division?.name || '').toLowerCase();
  const formatStr = (division?.matchFormat || division?.format || '').toLowerCase();
  const sportStr = (division?.sportType || '').toLowerCase();

  const isFootball =
    sportStr.includes('football') ||
    sportStr.includes('soccer') ||
    sportStr.includes('futsal') ||
    divName.includes('bóng đá') ||
    divName.includes('football') ||
    divName.includes('futsal') ||
    divName.includes('sân 5') ||
    divName.includes('sân 7') ||
    divName.includes('sân 11');

  const isSingles =
    !isFootball &&
    (divName.includes('đơn') ||
      divName.includes('singles') ||
      formatStr.includes('single') ||
      formatStr === '1v1');

  const isDoubles =
    !isFootball &&
    !isSingles &&
    (divName.includes('đôi') ||
      divName.includes('doubles') ||
      divName.includes('nam nữ') ||
      formatStr.includes('double') ||
      formatStr === '2v2');

  return { isFootball, isSingles, isDoubles };
}

function formatCompetitorDisplay(
  p?: { teamName?: string | null; name?: string | null; logo?: string | null } | null,
  isFootball = false,
  isSingles = false,
): {
  avatars: Array<{ initial: string; bg: string }>;
  displayLabel: string;
  fullName: string;
} {
  if (!p) {
    return {
      avatars: [{ initial: '?', bg: 'bg-slate-100 border-slate-300 text-slate-600' }],
      displayLabel: 'Chờ xác định',
      fullName: 'Chờ xác định',
    };
  }

  const rawFull = (p.teamName || p.name || 'Chờ xác định').trim();

  if (isFootball) {
    const words = rawFull.split(/\s+/).filter(Boolean);
    const shortLabel = words.length > 3 ? words.slice(-2).join(' ') : rawFull;
    const initial =
      words.length >= 2
        ? (words[0][0] + words[1][0]).toUpperCase()
        : rawFull.slice(0, 2).toUpperCase();

    return {
      avatars: [{ initial, bg: 'bg-emerald-100 border-emerald-300 text-emerald-800' }],
      displayLabel: shortLabel,
      fullName: rawFull,
    };
  }

  if (isSingles) {
    const shortName = getShortTwoWords(rawFull);
    const initial = shortName.charAt(0).toUpperCase();

    return {
      avatars: [{ initial, bg: 'bg-blue-100 border-blue-300 text-blue-800' }],
      displayLabel: shortName,
      fullName: rawFull,
    };
  }

  // Doubles / Pairs (2 players)
  const players = getParticipantPlayers(p);
  if (players.length >= 2) {
    const shortNames = players.map(getShortTwoWords);
    return {
      avatars: [
        { initial: shortNames[0].charAt(0).toUpperCase(), bg: 'bg-orange-100 border-orange-300 text-orange-800' },
        { initial: shortNames[1].charAt(0).toUpperCase(), bg: 'bg-amber-100 border-amber-300 text-amber-800' },
      ],
      displayLabel: shortNames.join(' / '),
      fullName: rawFull,
    };
  }

  // Default: 1 player or team
  const shortName = getShortTwoWords(rawFull);
  return {
    avatars: [{ initial: shortName.charAt(0).toUpperCase(), bg: 'bg-blue-100 border-blue-300 text-blue-800' }],
    displayLabel: shortName,
    fullName: rawFull,
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
  onRefetchData,
}: CourtScheduleBoardProps) {
  const t = useTranslations('OrganizerManage');
  const locale = useLocale();

  // Dynamic Timeline Configuration
  const [operatingStart, setOperatingStart] = useState(defaultOperatingStart || '06:00');
  const [operatingEnd, setOperatingEnd] = useState(defaultOperatingEnd || '24:00');
  const [defaultStepMinutes, setDefaultStepMinutes] = useState(15);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [timeSettingsOpen, setTimeSettingsOpen] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Form temp state for Time Settings Modal
  const [tempStart, setTempStart] = useState(operatingStart);
  const [tempEnd, setTempEnd] = useState(operatingEnd);
  const [tempStep, setTempStep] = useState(15);
  const [minutesPerSet, setMinutesPerSet] = useState(15);
  const [tempMinutesPerSet, setTempMinutesPerSet] = useState(15);

  // Excel Row Durations (in minutes per row, default step)
  const [rowDurations, setRowDurations] = useState<Record<number, number>>({});
  const [rowResizeState, setRowResizeState] = useState<RowResizeState | null>(null);
  const [matchCardResize, setMatchCardResize] = useState<MatchCardResizeState | null>(null);

  // General State
  const [customMatchDurations, setCustomMatchDurations] = useState<Record<string, number>>({});
  const [draftAssignments, setDraftAssignments] = useState<Record<string, DraftAssignment>>({});
  const [assignmentPicker, setAssignmentPicker] = useState<AssignmentPickerState | null>(null);
  const [selectedPickerMatchIds, setSelectedPickerMatchIds] = useState<string[]>([]);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [pickerDivisionFilter, setPickerDivisionFilter] = useState('all');
  const [queueOpen, setQueueOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Undo / Redo History Stack
  const [history, setHistory] = useState<Array<{ draftAssignments: Record<string, DraftAssignment>; rowDurations: Record<number, number> }>>([
    { draftAssignments: {}, rowDurations: {} },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Excel-like rectangular multi-cell range selection
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragAnchor, setDragAnchor] = useState<{ courtIndex: number; rowIndex: number } | null>(null);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);

  const [queueSelectedMatchIds, setQueueSelectedMatchIds] = useState<string[]>([]);
  const [queueTargetCourtId, setQueueTargetCourtId] = useState<string>(courts[0]?.id || '');
  const [queueTargetRowIndex, setQueueTargetRowIndex] = useState<number>(0);
  const boardRef = useRef<HTMLDivElement>(null);

  // Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    courtId: string;
    courtName: string;
    courtIndex: number;
    rowIndex: number;
    timeStr: string;
    matchId?: string;
  } | null>(null);

  const pendingCount = Object.keys(draftAssignments).length;
  const currentPixelsPerMinute = PIXELS_PER_MINUTE * zoomLevel;

  // Compute maximum round per division to accurately resolve Knockout round names
  const maxRoundByDivision = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of matches) {
      const divId = item.divisionId || 'default';
      const r = item.roundNumber || 1;
      const current = map.get(divId) || 1;
      if (r > current) {
        map.set(divId, r);
      }
    }
    return map;
  }, [matches]);

  const previewAssignmentByMatchId = useMemo(
    () => new Map(preview?.assignments.map((assignment) => [assignment.matchId, assignment]) ?? []),
    [preview],
  );

  const displayMatches = useMemo(() => matches.map((match) => {
    const persisted = Boolean(match.scheduledAt && match.courtId);
    const assignment = persisted ? null : previewAssignmentByMatchId.get(match.id);
    const draft = draftAssignments[match.id];
    const matchDuration =
      draft?.durationMinutes ??
      customMatchDurations[match.id] ??
      ((match as unknown as Record<string, unknown>).durationMinutes as number | undefined) ??
      (preview ? preview.durationMinutes + preview.bufferMinutes : defaultStepMinutes);

    return {
      match,
      scheduledAt: draft?.scheduledAt ?? (persisted ? match.scheduledAt : assignment?.scheduledAt ?? null),
      courtId: draft?.courtId ?? (persisted ? match.courtId : assignment?.courtId ?? null),
      durationMinutes: matchDuration,
      isPreview: !persisted && Boolean(assignment) && !draft,
      isDraft: Boolean(draft),
    };
  }), [customMatchDurations, defaultStepMinutes, draftAssignments, matches, preview, previewAssignmentByMatchId]);

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
    const [h, m] = operatingStart.split(':').map(Number);
    return (h ?? 6) * 60 + (m || 0);
  }, [operatingStart]);

  const baseEndMinute = useMemo(() => {
    const [h, m] = operatingEnd.split(':').map(Number);
    if (h === 0 || h === 24) return 24 * 60;
    return (h || 24) * 60 + (m || 0);
  }, [operatingEnd]);

  const defaultTotalSlots = useMemo(() => {
    const diff = Math.max(defaultStepMinutes * 2, baseEndMinute - baseStartMinute);
    return Math.ceil(diff / defaultStepMinutes);
  }, [baseEndMinute, baseStartMinute, defaultStepMinutes]);

  const timelineRows = useMemo(() => {
    const startTimestamp = new Date(`${scheduleDate}T${operatingStart}:00`).getTime();
    const rows = [];
    let accumulatedMinutes = 0;
    let accumulatedTop = 0;

    for (let i = 0; i < defaultTotalSlots; i++) {
      const duration = rowDurations[i] ?? defaultStepMinutes;
      const rowStartTimestamp = startTimestamp + accumulatedMinutes * 60_000;
      const rowEndTimestamp = rowStartTimestamp + duration * 60_000;
      const rowHeight = duration * currentPixelsPerMinute;

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
  }, [currentPixelsPerMinute, defaultStepMinutes, defaultTotalSlots, operatingStart, rowDurations, scheduleDate]);

  // Undo / Redo State Helpers
  const pushHistory = (newDrafts: Record<string, DraftAssignment>, newDurations?: Record<number, number>) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const nextEntry = {
        draftAssignments: newDrafts,
        rowDurations: newDurations ?? (sliced[sliced.length - 1]?.rowDurations || rowDurations),
      };
      return [...sliced, nextEntry];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const newIdx = historyIndex - 1;
    const state = history[newIdx];
    if (state) {
      setHistoryIndex(newIdx);
      setDraftAssignments(state.draftAssignments);
      setRowDurations(state.rowDurations);
      setSaveToast('↩️ Đã hoàn tác (Undo)');
      setTimeout(() => setSaveToast(null), 1500);
    }
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIdx = historyIndex + 1;
    const state = history[newIdx];
    if (state) {
      setHistoryIndex(newIdx);
      setDraftAssignments(state.draftAssignments);
      setRowDurations(state.rowDurations);
      setSaveToast('↪️ Đã làm lại (Redo)');
      setTimeout(() => setSaveToast(null), 1500);
    }
  };

  // Handle Save All Drafts (Manual Click or Auto-Save)
  const handleSaveAllDrafts = async (silent = false) => {
    const hasRowDurationChanges = Object.keys(rowDurations).length > 0;
    const entries = Object.entries(draftAssignments);

    if (entries.length === 0 && !hasRowDurationChanges) {
      if (!silent) {
        setSaveToast('Lịch thi đấu đã ở trạng thái mới nhất!');
        setTimeout(() => setSaveToast(null), 2500);
      }
      return;
    }

    setIsSavingDraft(true);
    setAutoSaveStatus('saving');
    let successCount = 0;
    try {
      // 1. Save all draft assignments
      for (const [matchId, draft] of entries) {
        if (onSaveScheduleDirect) {
          await onSaveScheduleDirect(matchId, draft.courtId, draft.scheduledAt, true);
          successCount++;
        }
      }

      // 2. If row durations were resized, synchronize scheduledAt timestamps for all scheduled matches to match their row
      if (hasRowDurationChanges) {
        for (const item of scheduledMatches) {
          if (!draftAssignments[item.match.id] && item.courtId && item.scheduledAt) {
            const matchDate = new Date(item.scheduledAt);
            const matchMinutesFromStart = (matchDate.getHours() * 60 + matchDate.getMinutes()) - baseStartMinute;
            const rIdx = Math.max(0, Math.min(timelineRows.rows.length - 1, Math.round(matchMinutesFromStart / defaultStepMinutes)));
            const targetRow = timelineRows.rows[rIdx];
            if (targetRow) {
              const updatedTime = new Date(targetRow.startTimestamp).toISOString();
              if (updatedTime !== item.scheduledAt && onSaveScheduleDirect) {
                await onSaveScheduleDirect(item.match.id, item.courtId, updatedTime, true);
                successCount++;
              }
            }
          }
        }
      }

      setDraftAssignments({});
      setAutoSaveStatus('saved');
      if (!silent) {
        setSaveToast(`Đã lưu thành công lịch thi đấu!`);
        setTimeout(() => setSaveToast(null), 3000);
      }
      if (onRefetchData) {
        await onRefetchData();
      }
    } catch (err) {
      console.error('Failed to save drafts:', err);
      setAutoSaveStatus('unsaved');
      if (!silent) {
        setSaveToast('Có lỗi xảy ra khi lưu lịch thi đấu.');
        setTimeout(() => setSaveToast(null), 3000);
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Auto-Save Effect (Debounce 1.5s after user changes schedule)
  useEffect(() => {
    if (Object.keys(draftAssignments).length === 0) return;
    setAutoSaveStatus('unsaved');

    const timer = setTimeout(() => {
      void handleSaveAllDrafts(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [draftAssignments]);

  // Clipboard state for Excel-like Cut (Ctrl+X), Copy (Ctrl+C), Paste (Ctrl+V)
  const [clipboard, setClipboard] = useState<{
    operation: 'cut' | 'copy';
    items: Array<{
      matchId: string;
      relativeCourtIndex: number;
      relativeRowIndex: number;
      durationMinutes: number;
    }>;
  } | null>(null);

  const getSelectedMatchesInGrid = () => {
    if (!selectionRange) return [];
    const minC = Math.min(selectionRange.startCourtIndex, selectionRange.endCourtIndex);
    const maxC = Math.max(selectionRange.startCourtIndex, selectionRange.endCourtIndex);
    const minR = Math.min(selectionRange.startRowIndex, selectionRange.endRowIndex);
    const maxR = Math.max(selectionRange.startRowIndex, selectionRange.endRowIndex);

    const items: Array<{
      matchId: string;
      relativeCourtIndex: number;
      relativeRowIndex: number;
      durationMinutes: number;
    }> = [];

    for (let cIdx = minC; cIdx <= maxC; cIdx++) {
      const court = courts[cIdx];
      if (!court) continue;
      for (let rIdx = minR; rIdx <= maxR; rIdx++) {
        const row = timelineRows.rows[rIdx];
        if (!row) continue;
        const rowStart = row.startTimestamp;
        const rowEnd = rowStart + (rowDurations[rIdx] ?? defaultStepMinutes) * 60_000;

        const foundMatch = displayMatches.find((m) => {
          if (m.courtId !== court.id || !m.scheduledAt) return false;
          const mStart = new Date(m.scheduledAt).getTime();
          return mStart >= rowStart && mStart < rowEnd;
        });

        if (foundMatch && !items.some((it) => it.matchId === foundMatch.match.id)) {
          items.push({
            matchId: foundMatch.match.id,
            relativeCourtIndex: cIdx - minC,
            relativeRowIndex: rIdx - minR,
            durationMinutes: foundMatch.durationMinutes || defaultStepMinutes,
          });
        }
      }
    }
    return items;
  };

  const handleCut = () => {
    const items = getSelectedMatchesInGrid();
    if (items.length === 0) {
      setSaveToast('✂️ Hãy quét chọn ô có trận đấu để cắt (Ctrl + X)');
      setTimeout(() => setSaveToast(null), 2500);
      return;
    }

    setClipboard({
      operation: 'cut',
      items,
    });
    setSaveToast(`✂️ Đã cắt ${items.length} trận đấu! Chọn ô đích và bấm Ctrl + V để dán.`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleCopy = () => {
    const items = getSelectedMatchesInGrid();
    if (items.length === 0) {
      setSaveToast('📋 Hãy quét chọn ô có trận đấu để sao chép (Ctrl + C)');
      setTimeout(() => setSaveToast(null), 2500);
      return;
    }

    setClipboard({
      operation: 'copy',
      items,
    });
    setSaveToast(`📋 Đã sao chép ${items.length} trận đấu! Chọn ô đích và bấm Ctrl + V.`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handlePaste = () => {
    if (!clipboard || clipboard.items.length === 0) {
      setSaveToast('Bộ nhớ tạm trống. Vui lòng bấm Ctrl + X (Cắt) trước.');
      setTimeout(() => setSaveToast(null), 2500);
      return;
    }

    if (!selectionRange) {
      setSaveToast('Vui lòng click chọn ô đích trên bảng rồi bấm Ctrl + V để dán.');
      setTimeout(() => setSaveToast(null), 2500);
      return;
    }

    const targetStartCourt = Math.min(selectionRange.startCourtIndex, selectionRange.endCourtIndex);
    const targetStartRow = Math.min(selectionRange.startRowIndex, selectionRange.endRowIndex);

    const newDrafts: Record<string, DraftAssignment> = { ...draftAssignments };
    let pastedCount = 0;

    for (const item of clipboard.items) {
      const courtIdx = targetStartCourt + item.relativeCourtIndex;
      const rowIdx = targetStartRow + item.relativeRowIndex;

      if (courtIdx >= courts.length || rowIdx >= timelineRows.rows.length) {
        continue;
      }

      const court = courts[courtIdx];
      const row = timelineRows.rows[rowIdx];
      if (!court || !row) continue;

      const targetTimeIso = new Date(row.startTimestamp).toISOString();
      newDrafts[item.matchId] = {
        courtId: court.id,
        scheduledAt: targetTimeIso,
        durationMinutes: item.durationMinutes,
      };
      pastedCount++;
    }

    if (pastedCount === 0) {
      setSaveToast('Không thể dán ra ngoài phạm vi bảng thời gian.');
      setTimeout(() => setSaveToast(null), 2500);
      return;
    }

    setDraftAssignments(newDrafts);
    pushHistory(newDrafts);

    if (clipboard.operation === 'cut') {
      setClipboard(null);
    }

    setSaveToast(`📋 Đã dán ${pastedCount} trận đấu! Đang tự động lưu...`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Clear scheduled matches in selection (Delete / Backspace / Trash button)
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

    const newDrafts = { ...draftAssignments };
    for (const item of matchesInSelection) {
      delete newDrafts[item.match.id];
      if (onSaveScheduleDirect) {
        void onSaveScheduleDirect(item.match.id, '', '', true);
      }
    }

    setDraftAssignments(newDrafts);
    pushHistory(newDrafts);

    // Also clear blocked slots in selection if any
    setBlockedSlots((prev) =>
      prev.filter((slot) => {
        if (!selectedCourtIds.has(slot.courtId)) return true;
        const t = new Date(slot.scheduledAt).getTime();
        return !(t >= minTimestamp && t < maxTimestamp);
      }),
    );

    if (matchesInSelection.length > 0) {
      setSaveToast(`🗑️ Đã hủy xếp ${matchesInSelection.length} trận đấu (đưa về hàng chờ)!`);
      setTimeout(() => setSaveToast(null), 2500);
    }
    setSelectionRange(null);
  };

  // Keyboard shortcut: Ctrl+Z, Ctrl+Y, Ctrl+X, Ctrl+C, Ctrl+V, Ctrl+S, Ctrl+A, Delete, Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleCut();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSaveAllDrafts(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (courts.length > 0 && timelineRows.rows.length > 0) {
          setSelectionRange({
            startCourtIndex: 0,
            endCourtIndex: courts.length - 1,
            startRowIndex: 0,
            endRowIndex: timelineRows.rows.length - 1,
          });
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectionRange) {
          e.preventDefault();
          handleClearSelectionMatches();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clipboard, courts, defaultStepMinutes, displayMatches, draftAssignments, history, historyIndex, rowDurations, selectionRange, timelineRows.rows]);

  // Close Context Menu on Click Outside or Escape
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  // Set duration of a specific match
  const handleSetMatchDuration = (matchId: string, newDuration: number) => {
    const match = displayMatches.find((m) => m.match.id === matchId);
    if (!match || !match.courtId || !match.scheduledAt) return;

    const newDrafts = {
      ...draftAssignments,
      [matchId]: {
        courtId: match.courtId,
        scheduledAt: match.scheduledAt,
        durationMinutes: newDuration,
      },
    };
    setDraftAssignments(newDrafts);
    pushHistory(newDrafts);
    setSaveToast(`⏱️ Đã đặt thời lượng trận thành ${newDuration} phút!`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Move single match to a target court
  const handleMoveSingleMatchToCourt = (matchId: string, targetCourtId: string) => {
    const match = displayMatches.find((m) => m.match.id === matchId);
    if (!match || !match.scheduledAt) return;

    const newDrafts = {
      ...draftAssignments,
      [matchId]: {
        courtId: targetCourtId,
        scheduledAt: match.scheduledAt,
        durationMinutes: match.durationMinutes,
      },
    };
    setDraftAssignments(newDrafts);
    pushHistory(newDrafts);
    const targetCourt = courts.find((c) => c.id === targetCourtId);
    setSaveToast(`Đã chuyển trận sang ${targetCourt?.courtName || 'sân mới'}!`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Unassign single match (return to queue)
  const handleUnassignSingleMatch = (matchId: string) => {
    if (onSaveScheduleDirect) {
      void onSaveScheduleDirect(matchId, '', '', true);
    }
    const newDrafts = { ...draftAssignments };
    delete newDrafts[matchId];
    setDraftAssignments(newDrafts);
    setSaveToast('🗑️ Đã hủy xếp trận đấu (đưa về hàng chờ chưa xếp).');
    setTimeout(() => setSaveToast(null), 2500);
    if (onRefetchData) {
      void onRefetchData();
    }
  };

  // Auto-Schedule All Unscheduled Matches (AI Smart Fill with progressive tournament ordering and BO duration)
  const handleAutoScheduleAll = () => {
    if (unscheduledMatches.length === 0 || courts.length === 0) return;

    // 1. Order unscheduled matches logically by stage & round
    const sortedMatches = [...unscheduledMatches].sort((a, b) => {
      // Group stage matches first
      const aIsGroup = Boolean(a.match.groupName || a.match.leg);
      const bIsGroup = Boolean(b.match.groupName || b.match.leg);
      if (aIsGroup && !bIsGroup) return -1;
      if (!aIsGroup && bIsGroup) return 1;

      // Then by leg / round number ascending
      const rA = a.match.leg || a.match.roundNumber || 1;
      const rB = b.match.leg || b.match.roundNumber || 1;
      if (rA !== rB) return rA - rB;

      // Then by match order
      return (a.match.matchOrder || 0) - (b.match.matchOrder || 0);
    });

    const newDrafts: Record<string, DraftAssignment> = {};
    let scheduledCount = 0;

    for (const targetItem of sortedMatches) {
      const matchDuration = targetItem.durationMinutes || defaultStepMinutes;
      let placed = false;

      // Find earliest continuous time slot across all courts
      for (let rIdx = 0; rIdx < timelineRows.rows.length; rIdx++) {
        const rowInfo = timelineRows.rows[rIdx];
        if (!rowInfo) continue;
        const slotStart = rowInfo.startTimestamp;
        const slotEnd = slotStart + matchDuration * 60_000;

        for (const court of courts) {
          // Check if court is free for the entire duration [slotStart, slotEnd]
          const isOccupied =
            Object.values(newDrafts).some((d) => {
              if (d.courtId !== court.id) return false;
              const dStart = new Date(d.scheduledAt).getTime();
              const dEnd = dStart + (d.durationMinutes || defaultStepMinutes) * 60_000;
              return slotStart < dEnd && slotEnd > dStart;
            }) ||
            displayMatches.some((m) => {
              if (m.courtId !== court.id || !m.scheduledAt) return false;
              const mStart = new Date(m.scheduledAt).getTime();
              const mEnd = mStart + (m.durationMinutes || defaultStepMinutes) * 60_000;
              return slotStart < mEnd && slotEnd > mStart;
            });

          if (!isOccupied) {
            newDrafts[targetItem.match.id] = {
              courtId: court.id,
              scheduledAt: new Date(slotStart).toISOString(),
              durationMinutes: matchDuration,
            };
            scheduledCount++;
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
    }

    setDraftAssignments((prev) => ({ ...prev, ...newDrafts }));
    setSaveToast(`AI đã tự động xếp ${scheduledCount}/${sortedMatches.length} trận đấu! Bấm "Lưu lịch (Ctrl+S)" để hoàn tất.`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Reset All Rows to Default Duration
  const handleResetAllRowsEvenly = () => {
    setRowDurations({});
    setSaveToast('Đã đặt lại tất cả các mốc giờ về mặc định đều nhau!');
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Clear All Scheduled Matches
  const handleClearAllSchedule = () => {
    if (scheduledMatches.length === 0) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch thi đấu của tất cả các sân?')) return;

    for (const item of scheduledMatches) {
      if (onSaveScheduleDirect) {
        void onSaveScheduleDirect(item.match.id, '', '', true);
      }
    }
    setDraftAssignments({});
    setSaveToast('Đã xóa toàn bộ lịch đã xếp.');
    setTimeout(() => setSaveToast(null), 2500);
    if (onRefetchData) {
      void onRefetchData();
    }
  };

  // Handle Dragging Row Divider on Left Time Column (Excel style +1p / -1p)
  useEffect(() => {
    if (!rowResizeState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const deltaMinutes = Math.round((event.clientY - rowResizeState.startY) / currentPixelsPerMinute);
      const baseInitial = rowResizeState.initialDurations[rowResizeState.rowIndex] ?? defaultStepMinutes;
      const newDuration = Math.max(5, Math.min(180, baseInitial + deltaMinutes));

      setRowDurations((prev) => {
        const next = { ...prev };
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
      const deltaMinutes = Math.round((event.clientY - matchCardResize.startY) / currentPixelsPerMinute);
      const unclamped = matchCardResize.initialDurationMinutes + deltaMinutes;
      const durationMinutes = Math.max(3, Math.min(matchCardResize.maxAllowedDurationMinutes, unclamped));

      setMatchCardResize((prev) => (prev ? { ...prev, currentDurationMinutes: durationMinutes } : null));
      setDraftAssignments((current) => {
        const existing = current[matchCardResize.matchId];
        const matchItem = displayMatches.find((m) => m.match.id === matchCardResize.matchId);
        return {
          ...current,
          [matchCardResize.matchId]: {
            courtId: existing?.courtId ?? matchItem?.courtId ?? '',
            scheduledAt: existing?.scheduledAt ?? matchItem?.scheduledAt ?? '',
            durationMinutes,
          },
        };
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
  }, [currentPixelsPerMinute, displayMatches, matchCardResize]);

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
      const maxR = maxRoundByDivision.get(item.match.divisionId || 'default') || 1;
      const roundStr = getAccurateRoundLabel(item.match, maxR).toLocaleLowerCase();
      const orderStr = `#${item.match.matchOrder ?? ''}`.toLocaleLowerCase();
      return p1.includes(query) || p2.includes(query) || roundStr.includes(query) || orderStr.includes(query);
    });
  }, [assignmentSearch, pickerDivisionFilter, unscheduledMatches, maxRoundByDivision]);

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
      setSaveToast(`Đã xếp ${selectedPickerMatchIds.length} trận! Bấm "Lưu lịch (Ctrl+S)" để hoàn tất.`);
      setTimeout(() => setSaveToast(null), 3000);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const togglePickerMatchSelection = (matchId: string) => {
    setSelectedPickerMatchIds((prev) =>
      prev.includes(matchId) ? prev.filter((id) => id !== matchId) : [...prev, matchId],
    );
  };

  // Drag & drop support with Smart Conflict Prevention / Position Swapping
  const handleDrop = (event: React.DragEvent<HTMLDivElement>, courtId: string) => {
    event.preventDefault();
    const matchId = event.dataTransfer.getData('text/plain');
    const item = displayMatches.find((candidate) => candidate.match.id === matchId);
    if (!item) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const rawY = Math.max(0, event.clientY - bounds.top);

    // Find closest target row
    const targetRow = timelineRows.rows.find((r) => rawY >= r.top && rawY < r.top + r.height) || timelineRows.rows[0];
    const targetStart = targetRow.startTimestamp;
    const targetDuration = item.durationMinutes || targetRow.durationMinutes || defaultStepMinutes;
    const targetEnd = targetStart + targetDuration * 60_000;

    // Check if there is already a conflicting match on this court overlapping this time slot
    const conflictingItem = displayMatches.find((m) => {
      if (m.match.id === matchId || m.courtId !== courtId || !m.scheduledAt) return false;
      const mStart = new Date(m.scheduledAt).getTime();
      const mDuration = m.durationMinutes || defaultStepMinutes;
      const mEnd = mStart + mDuration * 60_000;
      return targetStart < mEnd && targetEnd > mStart;
    });

    if (conflictingItem) {
      const oldCourtId = item.courtId;
      const oldScheduledAt = item.scheduledAt;
      const oldDuration = item.durationMinutes;

      if (oldCourtId && oldScheduledAt) {
        // SWAP: Exchange places between the two scheduled matches
        setDraftAssignments((current) => ({
          ...current,
          [matchId]: {
            courtId,
            scheduledAt: new Date(targetStart).toISOString(),
            durationMinutes: targetDuration,
          },
          [conflictingItem.match.id]: {
            courtId: oldCourtId,
            scheduledAt: oldScheduledAt,
            durationMinutes: oldDuration ?? targetDuration,
          },
        }));
        setSaveToast(`Đã hoán đổi vị trí 2 trận đấu! Bấm "Lưu lịch (Ctrl+S)" để hoàn tất.`);
        setTimeout(() => setSaveToast(null), 3000);
        return;
      } else {
        // Unscheduled match: Find next continuous empty slot on this court
        let nextAvailableStart: number | null = null;
        for (const row of timelineRows.rows) {
          if (row.startTimestamp < targetStart) continue;
          const slotStart = row.startTimestamp;
          const slotEnd = slotStart + targetDuration * 60_000;
          const hasOverlap = displayMatches.some((m) => {
            if (m.match.id === matchId || m.courtId !== courtId || !m.scheduledAt) return false;
            const mStart = new Date(m.scheduledAt).getTime();
            const mEnd = mStart + (m.durationMinutes || defaultStepMinutes) * 60_000;
            return slotStart < mEnd && slotEnd > mStart;
          });
          if (!hasOverlap) {
            nextAvailableStart = slotStart;
            break;
          }
        }

        if (nextAvailableStart) {
          const newScheduledAt = new Date(nextAvailableStart).toISOString();
          setDraftAssignments((current) => ({
            ...current,
            [matchId]: {
              courtId,
              scheduledAt: newScheduledAt,
              durationMinutes: targetDuration,
            },
          }));
          setSaveToast(`Khung giờ đã có trận, đã xếp vào giờ trống tiếp theo (${formatMatchTime(newScheduledAt)})!`);
          setTimeout(() => setSaveToast(null), 3500);
          return;
        } else {
          setSaveToast(`Sân đã kín lịch trong khung giờ này!`);
          setTimeout(() => setSaveToast(null), 3000);
          return;
        }
      }
    }

    // No conflict: Assign directly
    const scheduledAt = new Date(targetStart).toISOString();
    setDraftAssignments((current) => ({
      ...current,
      [matchId]: {
        courtId,
        scheduledAt,
        durationMinutes: targetDuration,
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

  // Move all matches in selection to a target court
  const handleMoveSelectionToCourt = (targetCourtId: string) => {
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

    if (matchesInSelection.length === 0) {
      setSaveToast('Không có trận đấu nào trong vùng chọn để chuyển!');
      setTimeout(() => setSaveToast(null), 2500);
      return;
    }

    const newDrafts: Record<string, DraftAssignment> = {};
    for (const item of matchesInSelection) {
      newDrafts[item.match.id] = {
        courtId: targetCourtId,
        scheduledAt: item.scheduledAt!,
        durationMinutes: item.durationMinutes,
      };
    }

    setDraftAssignments((prev) => ({ ...prev, ...newDrafts }));
    const targetCourt = courts.find((c) => c.id === targetCourtId);
    setSaveToast(`Đã chuyển ${matchesInSelection.length} trận sang ${targetCourt?.courtName || 'sân mới'}! Bấm "Lưu lịch (Ctrl+S)" để hoàn tất.`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Assign multiple selected matches from the queue to a target court & start time
  const handleAssignQueueMatches = () => {
    if (queueSelectedMatchIds.length === 0 || !queueTargetCourtId) return;

    const newDrafts: Record<string, DraftAssignment> = {};
    let currentRowIdx = queueTargetRowIndex;

    for (const matchId of queueSelectedMatchIds) {
      const item = displayMatches.find((m) => m.match.id === matchId);
      if (!item) continue;

      const rowInfo = timelineRows.rows[currentRowIdx] || timelineRows.rows[timelineRows.rows.length - 1];
      const targetTime = new Date(rowInfo.startTimestamp).toISOString();
      const duration = item.durationMinutes || rowInfo.durationMinutes || defaultStepMinutes;

      newDrafts[matchId] = {
        courtId: queueTargetCourtId,
        scheduledAt: targetTime,
        durationMinutes: duration,
      };

      currentRowIdx++;
    }

    setDraftAssignments((prev) => ({ ...prev, ...newDrafts }));
    setQueueOpen(false);
    setQueueSelectedMatchIds([]);
    const targetCourt = courts.find((c) => c.id === queueTargetCourtId);
    setSaveToast(`Đã xếp ${queueSelectedMatchIds.length} trận vào ${targetCourt?.courtName || 'sân'}! Bấm "Lưu lịch (Ctrl+S)" để hoàn tất.`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  const renderMatchCard = (item: (typeof displayMatches)[number], compact = false) => {
    const divId = item.match.divisionId || 'default';
    const maxRound = maxRoundByDivision.get(divId) || 1;
    const roundLabelStr = getAccurateRoundLabel(item.match, maxRound);
    const division = divisions.find((d) => d.id === item.match.divisionId) || ((item.match as unknown as Record<string, unknown>).divisionName ? { name: String((item.match as unknown as Record<string, unknown>).divisionName) } : null);
    const { isFootball, isSingles, isDoubles } = detectSportAndFormat(item.match, division);
    const setList = extractSetScores(item.match);
    const c1 = formatCompetitorDisplay(item.match.participant1, isFootball, isSingles);
    const c2 = formatCompetitorDisplay(item.match.participant2, isFootball, isSingles);

    // Determine status & styling
    const rawStatus = String((item.match as unknown as Record<string, unknown>).status || '').toUpperCase();
    const isCompleted = rawStatus === 'COMPLETED' || rawStatus === 'FINISHED' || setList.length > 0;
    const isLive = rawStatus === 'IN_PROGRESS' || rawStatus === 'LIVE';

    const matchDate = new Date(item.scheduledAt || 0);

    // In an Excel-like grid, map match to its discrete Row Slot Index
    let matchRowIndex = 0;
    if (item.scheduledAt) {
      const matchMinutesFromStart = (matchDate.getHours() * 60 + matchDate.getMinutes()) - baseStartMinute;
      matchRowIndex = Math.max(0, Math.min(timelineRows.rows.length - 1, Math.round(matchMinutesFromStart / defaultStepMinutes)));
    }
    const matchingRow = timelineRows.rows[matchRowIndex] || timelineRows.rows[0];

    const rowDuration = matchingRow.durationMinutes;
    const effectiveDuration = (item.isDraft && item.durationMinutes)
      ? item.durationMinutes
      : (rowDurations[matchingRow.index] ?? item.durationMinutes ?? rowDuration);

    const cardTop = matchingRow.top + 2;
    const cardHeight = Math.max(48, effectiveDuration * currentPixelsPerMinute - 4);
    const matchTimeStr = matchingRow.startTimeStr;

    const boFormat = isFootball ? `${effectiveDuration}P` : getMatchBestOfFormat(item.match, division);

    const isCurrentlyResizing = matchCardResize?.matchId === item.match.id;
    const isCut = clipboard?.operation === 'cut' && clipboard.items.some((it) => it.matchId === item.match.id);

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
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const cIdx = courts.findIndex((c) => c.id === item.courtId);
          if (cIdx >= 0) {
            setSelectionRange({
              startCourtIndex: cIdx,
              endCourtIndex: cIdx,
              startRowIndex: matchRowIndex,
              endRowIndex: matchRowIndex,
            });
          }
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            courtId: item.courtId || '',
            courtName: courts.find((c) => c.id === item.courtId)?.courtName || 'Sân',
            courtIndex: cIdx >= 0 ? cIdx : 0,
            rowIndex: matchRowIndex,
            timeStr: matchTimeStr,
            matchId: item.match.id,
          });
        }}
        className={`group w-full rounded-xl border text-left transition-all cursor-pointer ${
          compact
            ? 'p-2.5 bg-white'
            : effectiveDuration >= 30
            ? 'absolute inset-x-1 z-10 overflow-hidden p-2.5 flex flex-col justify-between'
            : 'absolute inset-x-1 z-10 overflow-hidden p-1.5 flex flex-col justify-between'
        } ${
          isCut
            ? 'opacity-40 border-dashed border-2 border-indigo-500 bg-indigo-50/80 animate-pulse'
            : isCompleted
            ? 'bg-slate-100/95 border-slate-300 text-slate-700 shadow-2xs'
            : isLive
            ? 'bg-amber-50/95 border-amber-400 text-amber-950 shadow-md ring-2 ring-amber-400/40'
            : 'bg-white border-slate-200 hover:border-blue-400 text-slate-900 shadow-xs'
        } ${
          item.isDraft
            ? 'ring-2 ring-violet-400 border-violet-400 bg-violet-50/95'
            : item.isPreview
            ? 'border-dashed border-blue-400 bg-blue-50/95'
            : ''
        } ${isCurrentlyResizing ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
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
          {/* Header Row: DIVISION NAME | FORMAT BADGE (BO1/BO3/BO5 or 90P) | Time | Duration */}
          <div className="flex items-center justify-between gap-1 border-b border-slate-200/80 pb-0.5 text-xs font-black shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`truncate uppercase tracking-tight text-[11px] ${
                  isCompleted ? 'text-slate-600 font-bold' : isFootball ? 'text-emerald-700 font-black' : 'text-blue-700 font-black'
                }`}
              >
                {(division?.name || (isFootball ? 'BÓNG ĐÁ' : 'NỘI DUNG')).toUpperCase()}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-black shrink-0 ${
                  isCompleted
                    ? 'bg-slate-200 text-slate-600 border border-slate-300'
                    : isFootball
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                {boFormat}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 text-[10px]">
              <span
                className={`font-bold px-1.5 py-0.2 rounded border ${
                  isCompleted
                    ? 'text-slate-600 bg-slate-200/70 border-slate-300'
                    : isLive
                    ? 'text-amber-800 bg-amber-100 border-amber-300 animate-pulse'
                    : isFootball
                    ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                    : 'text-blue-800 bg-blue-50 border-blue-200'
                }`}
              >
                {matchTimeStr}
              </span>
              <span className="text-slate-700 font-bold bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                {effectiveDuration}p
              </span>
            </div>
          </div>

          {/* Competitor 1 Row */}
          <div className="flex items-center justify-between gap-1.5 min-w-0 py-0.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
              <div className="flex -space-x-1.5 shrink-0">
                {c1.avatars.map((av, idx) => (
                  <span
                    key={idx}
                    className={`h-5 w-5 rounded-full border flex items-center justify-center text-[10px] shrink-0 font-black shadow-2xs z-10 ${av.bg}`}
                  >
                    {av.initial}
                  </span>
                ))}
              </div>
              <span className="truncate text-xs font-bold text-slate-900" title={c1.fullName}>
                {c1.displayLabel}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isFootball ? (
                setList.length > 0 ? (
                  <span
                    className={`min-w-[24px] h-[22px] px-1.5 flex items-center justify-center rounded text-xs font-black border shadow-2xs ${
                      Number(setList[0]?.s1) > Number(setList[0]?.s2)
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-white text-slate-800 border-slate-300'
                    }`}
                  >
                    {setList[0]?.s1}
                  </span>
                ) : (
                  <span className="min-w-[24px] h-[22px] flex items-center justify-center rounded bg-slate-50 text-xs font-bold text-slate-400 border border-slate-200">
                    -
                  </span>
                )
              ) : setList.length > 0 ? (
                setList.map((s, idx) => {
                  const isWinner = Number(s.s1) > Number(s.s2);
                  return (
                    <span
                      key={idx}
                      className={`min-w-[20px] h-[20px] px-1 flex items-center justify-center rounded text-[11px] font-black border shadow-2xs ${
                        isWinner ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-800 border-slate-300'
                      }`}
                    >
                      {s.s1}
                    </span>
                  );
                })
              ) : (
                <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded bg-slate-50 px-1 text-[11px] font-bold text-slate-400 border border-slate-200">
                  -
                </span>
              )}
            </div>
          </div>

          {/* Competitor 2 Row */}
          <div className="flex items-center justify-between gap-1.5 min-w-0 py-0.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
              <div className="flex -space-x-1.5 shrink-0">
                {c2.avatars.map((av, idx) => (
                  <span
                    key={idx}
                    className={`h-5 w-5 rounded-full border flex items-center justify-center text-[10px] shrink-0 font-black shadow-2xs z-10 ${av.bg}`}
                  >
                    {av.initial}
                  </span>
                ))}
              </div>
              <span className="truncate text-xs font-bold text-slate-900" title={c2.fullName}>
                {c2.displayLabel}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isFootball ? (
                setList.length > 0 ? (
                  <span
                    className={`min-w-[24px] h-[22px] px-1.5 flex items-center justify-center rounded text-xs font-black border shadow-2xs ${
                      Number(setList[0]?.s2) > Number(setList[0]?.s1)
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-white text-slate-800 border-slate-300'
                    }`}
                  >
                    {setList[0]?.s2}
                  </span>
                ) : (
                  <span className="min-w-[24px] h-[22px] flex items-center justify-center rounded bg-slate-50 text-xs font-bold text-slate-400 border border-slate-200">
                    -
                  </span>
                )
              ) : setList.length > 0 ? (
                setList.map((s, idx) => {
                  const isWinner = Number(s.s2) > Number(s.s1);
                  return (
                    <span
                      key={idx}
                      className={`min-w-[20px] h-[20px] px-1 flex items-center justify-center rounded text-[11px] font-black border shadow-2xs ${
                        isWinner ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-800 border-slate-300'
                      }`}
                    >
                      {s.s2}
                    </span>
                  );
                })
              ) : (
                <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded bg-slate-50 px-1 text-[11px] font-bold text-slate-400 border border-slate-200">
                  -
                </span>
              )}
            </div>
          </div>

          {/* Footer Row: [BẢNG A / VÒNG 1]  [ Trạng thái ] */}
          <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-slate-200/60 shrink-0 text-xs">
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-black border ${
                isCompleted
                  ? 'bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              {roundLabelStr.toUpperCase()}
            </span>
            {isCompleted ? (
              <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">
                Đã kết thúc
              </span>
            ) : isLive ? (
              <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Đang diễn ra
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[10px]">
                Chưa diễn ra
              </span>
            )}
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

              const currentStartTimestamp = new Date(item.scheduledAt).getTime();
              // Find all other matches on the same court scheduled after this match
              const otherMatchesOnCourt = displayMatches.filter(
                (m) => m.match.id !== item.match.id && m.courtId === item.courtId && m.scheduledAt,
              );
              const futureMatchStarts = otherMatchesOnCourt
                .map((m) => new Date(m.scheduledAt!).getTime())
                .filter((t) => t > currentStartTimestamp);

              const futureBlockedStarts = blockedSlots
                .filter((b) => b.courtId === item.courtId)
                .map((b) => new Date(b.scheduledAt).getTime())
                .filter((t) => t > currentStartTimestamp);

              const dayEndTimestamp = timelineRows.rows.length > 0
                ? timelineRows.rows[timelineRows.rows.length - 1].endTimestamp
                : currentStartTimestamp + 360 * 60_000;

              const candidates = [...futureMatchStarts, ...futureBlockedStarts, dayEndTimestamp];
              const nextObstacleTimestamp = Math.min(...candidates);

              const maxAllowedDurationMinutes = Math.max(
                3,
                Math.floor((nextObstacleTimestamp - currentStartTimestamp) / (60 * 1000)),
              );

              setDraftAssignments((current) => ({
                ...current,
                [item.match.id]: {
                  courtId: item.courtId!,
                  scheduledAt: item.scheduledAt!,
                  durationMinutes: effectiveDuration,
                },
              }));
              setMatchCardResize({
                matchId: item.match.id,
                startY: event.clientY,
                initialDurationMinutes: effectiveDuration,
                currentDurationMinutes: effectiveDuration,
                maxAllowedDurationMinutes,
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
    <section className="space-y-1.5 relative w-full h-full flex flex-col" aria-labelledby="schedule-board-title" ref={boardRef}>
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-2.5 shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Excel Ribbon Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white border border-slate-200 p-2 shadow-2xs shrink-0">
        {/* Left: Save + Undo/Redo + Auto Fill + Time Config */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Save Button with Badge & Keyboard shortcut hint */}
          <Button
            type="button"
            onClick={() => handleSaveAllDrafts(false)}
            disabled={isSavingDraft}
            className={`h-8 px-3 text-xs font-black rounded-lg shadow-xs flex items-center gap-2 transition-all cursor-pointer ${
              pendingCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400 ring-offset-1 animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Lưu tất cả thay đổi lịch (Phím tắt: Ctrl + S)"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSavingDraft ? 'Đang lưu...' : 'Lưu lịch (Ctrl+S)'}</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-white text-emerald-700 px-1.5 py-0.2 text-[10px] font-black">
                {pendingCount}
              </span>
            )}
          </Button>

          {/* Undo Button (Ctrl+Z) */}
          <Button
            type="button"
            variant="outline"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="h-8 px-2.5 text-xs font-bold border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-40"
            title="Hoàn tác (Phím tắt: Ctrl + Z)"
          >
            <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
            <span className="hidden sm:inline">Hoàn tác</span>
          </Button>

          {/* Redo Button (Ctrl+Y) */}
          <Button
            type="button"
            variant="outline"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="h-8 px-2.5 text-xs font-bold border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-40"
            title="Làm lại (Phím tắt: Ctrl + Y hoặc Ctrl + Shift + Z)"
          >
            <RotateCw className="h-3.5 w-3.5 text-blue-600" />
            <span className="hidden sm:inline">Làm lại</span>
          </Button>

          {/* Auto-Save Live Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold select-none">
            {autoSaveStatus === 'saving' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-amber-700 font-bold">Đang tự lưu...</span>
              </>
            ) : autoSaveStatus === 'unsaved' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-blue-700 font-bold">Đang xếp...</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-emerald-700 font-bold">Tự lưu: Bật</span>
              </>
            )}
          </div>

          {/* AI / Smart Auto-Schedule */}
          <Button
            type="button"
            onClick={handleAutoScheduleAll}
            disabled={unscheduledMatches.length === 0}
            className="h-8 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Tự động xếp toàn bộ các trận chưa xếp vào các ô sân trống"
          >
            <Zap className="h-3.5 w-3.5 text-amber-300" />
            <span>Tự động xếp lịch</span>
            {unscheduledMatches.length > 0 && (
              <span className="rounded-full bg-blue-500/80 px-1.5 py-0.2 text-[10px]">
                {unscheduledMatches.length}
              </span>
            )}
          </Button>

          {/* Time & Slot Configuration Modal Trigger */}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setTempStart(operatingStart);
              setTempEnd(operatingEnd);
              setTempStep(defaultStepMinutes);
              setTimeSettingsOpen(true);
            }}
            className="h-8 px-2.5 text-xs font-bold border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
            title="Tùy chỉnh giờ bắt đầu, giờ kết thúc và bước nhảy thời gian"
          >
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            <span>{operatingStart} – {operatingEnd}</span>
            <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
              {defaultStepMinutes}p/ô
            </span>
          </Button>

          {/* Unscheduled Matches Queue Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setQueueOpen(true)}
            className="h-8 px-2.5 text-xs font-bold border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5 text-slate-500" />
            <span>Trận chưa xếp</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
              unscheduledMatches.length > 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600'
            }`}>
              {unscheduledMatches.length}
            </span>
          </Button>
        </div>

        {/* Right: Zoom + Reset Rows + Clear All */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Zoom Level Selector */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold text-slate-700">
            <span className="px-1.5 text-[10px] text-slate-400">Thu phóng:</span>
            {[0.8, 1.0, 1.25, 1.5].map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoomLevel(z)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                  zoomLevel === z ? 'bg-white text-blue-700 shadow-2xs border border-slate-200' : 'hover:text-slate-900'
                }`}
              >
                {Math.round(z * 100)}%
              </button>
            ))}
          </div>

          {/* Reset Rows Evenly */}
          <Button
            type="button"
            variant="outline"
            onClick={handleResetAllRowsEvenly}
            className="h-8 px-2.5 text-xs font-semibold border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
            title="Đặt lại tất cả các mốc giờ về kích thước đều nhau"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Canh đều</span>
          </Button>

          {/* Clear All Schedule */}
          <Button
            type="button"
            variant="outline"
            onClick={handleClearAllSchedule}
            disabled={scheduledMatches.length === 0}
            className="h-8 px-2 text-xs font-semibold border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-lg cursor-pointer"
            title="Xóa toàn bộ lịch thi đấu"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

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

            {/* Cut / Copy / Paste Buttons */}
            <Button
              type="button"
              onClick={handleCut}
              className="h-7 px-2 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg shadow-xs flex items-center gap-1 border border-slate-700 cursor-pointer"
              title="Cắt các trận trong vùng chọn (Phím tắt: Ctrl + X)"
            >
              <Scissors className="h-3 w-3 text-indigo-400" />
              <span>Cắt (Ctrl+X)</span>
            </Button>

            <Button
              type="button"
              onClick={handleCopy}
              className="h-7 px-2 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg shadow-xs flex items-center gap-1 border border-slate-700 cursor-pointer"
              title="Sao chép các trận trong vùng chọn (Phím tắt: Ctrl + C)"
            >
              <Copy className="h-3 w-3 text-blue-400" />
              <span>Sao chép (Ctrl+C)</span>
            </Button>

            {clipboard && (
              <Button
                type="button"
                onClick={handlePaste}
                className="h-7 px-2.5 text-[11px] font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-xs flex items-center gap-1 cursor-pointer animate-pulse"
                title="Dán các trận từ bộ nhớ tạm (Phím tắt: Ctrl + V)"
              >
                <Clipboard className="h-3 w-3" />
                <span>Dán ({clipboard.items.length})</span>
              </Button>
            )}

            <Button
              type="button"
              onClick={handleBlockSelection}
              className="h-7 px-2.5 text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <Lock className="h-3 w-3" />
              Khóa giờ
            </Button>

            {/* Move selected matches to another court */}
            <div className="relative">
              <select
                onChange={(e) => {
                  const targetCourtId = e.target.value;
                  if (!targetCourtId) return;
                  handleMoveSelectionToCourt(targetCourtId);
                  e.target.value = '';
                }}
                defaultValue=""
                className="h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-bold px-2 cursor-pointer outline-hidden hover:bg-slate-700"
              >
                <option value="" disabled>
                  Chuyển sang sân khác...
                </option>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    Chuyển sang {c.courtName}
                  </option>
                ))}
              </select>
            </div>

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
              gridTemplateColumns: `72px repeat(${courts.length}, minmax(310px, 1fr))`,
            }}
          >
            {/* Corner header: Click to Select All */}
            <div
              onClick={() => {
                if (courts.length > 0 && timelineRows.rows.length > 0) {
                  setSelectionRange({
                    startCourtIndex: 0,
                    endCourtIndex: courts.length - 1,
                    startRowIndex: 0,
                    endRowIndex: timelineRows.rows.length - 1,
                  });
                }
              }}
              title="Bấm để chọn toàn bộ bảng lịch (Ctrl + A)"
              className="sticky left-0 top-0 z-30 border-b border-r border-orange-800 bg-[#c2410c] hover:bg-orange-800 text-white p-2.5 flex items-center justify-center cursor-pointer transition-colors"
            >
              <Clock className="h-4 w-4 text-white" />
            </div>

            {/* Court column headers: Click to Select Entire Column */}
            {courts.map((court, cIdx) => {
              const isColSelected =
                selectionRange &&
                cIdx >= selectionRange.startCourtIndex &&
                cIdx <= selectionRange.endCourtIndex;

              return (
                <div
                  key={court.id}
                  onClick={() => {
                    setSelectionRange({
                      startCourtIndex: cIdx,
                      endCourtIndex: cIdx,
                      startRowIndex: 0,
                      endRowIndex: timelineRows.rows.length - 1,
                    });
                  }}
                  title={`Bấm để chọn toàn bộ cột ${court.courtName}`}
                  className={`sticky top-0 z-20 border-b border-r border-orange-800/80 px-3 py-2.5 text-center text-white transition-colors cursor-pointer select-none ${
                    isColSelected ? 'bg-orange-700 ring-2 ring-inset ring-amber-300' : 'bg-[#c2410c] hover:bg-orange-600'
                  }`}
                >
                  <p className="truncate text-xs font-extrabold uppercase tracking-wider">{court.courtName}</p>
                </div>
              );
            })}

            {/* Time Labels Sidebar (1 line = 1 cột mốc thời gian, sticky on horizontal scroll) */}
            <div
              className="sticky left-0 z-20 border-r border-amber-300 bg-[#fef08a] shadow-xs"
              style={{ height: timelineRows.totalHeight }}
            >
              {timelineRows.rows.map((row) => {
                const isRowSelected =
                  selectionRange &&
                  row.index >= selectionRange.startRowIndex &&
                  row.index <= selectionRange.endRowIndex;

                return (
                  <React.Fragment key={row.index}>
                    {/* The Row Container: Click to Select Entire Row */}
                    <div
                      onClick={() => {
                        setSelectionRange({
                          startCourtIndex: 0,
                          endCourtIndex: courts.length - 1,
                          startRowIndex: row.index,
                          endRowIndex: row.index,
                        });
                      }}
                      title={`Bấm để chọn toàn bộ hàng lúc ${row.startTimeStr}`}
                      className={`absolute inset-x-0 border-b border-amber-300/80 transition-colors cursor-pointer select-none ${
                        isRowSelected ? 'bg-amber-300/80 ring-2 ring-inset ring-amber-500' : 'hover:bg-amber-200'
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
                            initDurs[idx] = rowDurations[idx] ?? defaultStepMinutes;
                          }

                          setRowResizeState({
                            rowIndex: row.index,
                            startY: e.clientY,
                            initialDurations: initDurs,
                            affectedRowIndices: affected,
                          });
                        }}
                        className="absolute -bottom-1 inset-x-0 h-2 cursor-row-resize z-20 group hover:bg-amber-500/40 transition-colors"
                        title="Kéo viền đường line này để co giãn thời gian từng 1 phút như Excel"
                      >
                        <div className="h-0.5 w-full bg-transparent group-hover:bg-amber-600" />
                      </div>
                    </div>

                    {/* Centered Time Label: Row 0 has top-1 so it is never clipped */}
                    <div
                      className={`absolute ${row.index === 0 ? 'top-1' : '-translate-y-1/2'} left-0 right-0 px-0.5 text-center font-extrabold text-[11px] text-slate-800 pointer-events-none select-none z-10`}
                      style={row.index === 0 ? undefined : { top: row.top }}
                    >
                      <span className="inline-block bg-amber-100/95 px-1 py-0.5 rounded text-[11px] font-black text-slate-900 border border-amber-300/80 shadow-2xs">
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
                  <span className="bg-slate-50/95 px-1.5 py-0.5 rounded text-[11px] font-black text-slate-900 tracking-tight shadow-2xs border border-slate-200/80">
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
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (
                            !selectionRange ||
                            courtIndex < selectionRange.startCourtIndex ||
                            courtIndex > selectionRange.endCourtIndex ||
                            row.index < selectionRange.startRowIndex ||
                            row.index > selectionRange.endRowIndex
                          ) {
                            setSelectionRange({
                              startCourtIndex: courtIndex,
                              endCourtIndex: courtIndex,
                              startRowIndex: row.index,
                              endRowIndex: row.index,
                            });
                          }
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            courtId: court.id,
                            courtName: court.courtName,
                            courtIndex,
                            rowIndex: row.index,
                            timeStr: row.startTimeStr,
                          });
                        }}
                        title={`Click / Click phải để mở menu thao tác hoặc xếp trận vào ${court.courtName} lúc ${row.startTimeStr}`}
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
                const maxR = maxRoundByDivision.get(item.match.divisionId || 'default') || 1;
                const roundLabelStr = getAccurateRoundLabel(item.match, maxR);
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

      {/* POPUP MODAL: Danh sách trận chưa xếp lịch (Multi-Select & Bulk Assign) */}
      <Modal open={queueOpen} onOpenChange={setQueueOpen}>
        <ModalContent className="max-w-3xl rounded-xl border border-slate-200">
          <ModalHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <ModalTitle className="text-base font-bold text-slate-900">
                  Danh sách trận chưa xếp lịch ({unscheduledMatches.length})
                </ModalTitle>
                <ModalDescription className="text-xs text-slate-500">
                  Tích chọn nhiều trận để xếp hàng loạt vào sân và khung giờ bạn muốn.
                </ModalDescription>
              </div>

              {unscheduledMatches.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (queueSelectedMatchIds.length === unscheduledMatches.length) {
                      setQueueSelectedMatchIds([]);
                    } else {
                      setQueueSelectedMatchIds(unscheduledMatches.map((m) => m.match.id));
                    }
                  }}
                  className="h-8 px-3 text-xs font-semibold rounded-lg border-slate-300 bg-white"
                >
                  {queueSelectedMatchIds.length === unscheduledMatches.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                </Button>
              )}
            </div>
          </ModalHeader>

          {unscheduledMatches.length > 0 ? (
            <div className="grid max-h-[50vh] gap-2 overflow-y-auto sm:grid-cols-2 py-2">
              {unscheduledMatches.map((item) => {
                const isSelected = queueSelectedMatchIds.includes(item.match.id);
                const div = divisions.find((d) => d.id === item.match.divisionId);
                const maxR = maxRoundByDivision.get(item.match.divisionId || 'default') || 1;
                const roundLabelStr = getAccurateRoundLabel(item.match, maxR);
                const p1 = getParticipantName(item.match.participant1);
                const p2 = getParticipantName(item.match.participant2);

                return (
                  <div
                    key={item.match.id}
                    onClick={() => {
                      setQueueSelectedMatchIds((prev) =>
                        isSelected ? prev.filter((id) => id !== item.match.id) : [...prev, item.match.id],
                      );
                    }}
                    className={`group relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 shadow-xs ring-2 ring-blue-500/30'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
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

                      <div className="space-y-1 pl-5 pt-2">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          <span className="truncate text-xs font-bold text-slate-900">{p1}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                          <span className="truncate text-xs font-semibold text-slate-700">{p2}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                      <span>{item.durationMinutes || 15}p</span>
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
              <p className="text-xs font-semibold text-slate-600">Tất cả các trận đã được xếp lịch!</p>
            </div>
          )}

          <ModalFooter className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Destination Court Selector */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-slate-600">Sân:</span>
                <select
                  value={queueTargetCourtId}
                  onChange={(e) => setQueueTargetCourtId(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-800"
                >
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courtName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Time Selector */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-slate-600">Giờ bắt đầu:</span>
                <select
                  value={queueTargetRowIndex}
                  onChange={(e) => setQueueTargetRowIndex(Number(e.target.value))}
                  className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-800"
                >
                  {timelineRows.rows.map((r) => (
                    <option key={r.index} value={r.index}>
                      {r.startTimeStr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ModalClose asChild>
                <Button type="button" variant="outline" className="h-8 rounded-lg text-xs font-semibold border-slate-300 cursor-pointer">
                  Đóng
                </Button>
              </ModalClose>
              <Button
                type="button"
                onClick={handleAssignQueueMatches}
                disabled={queueSelectedMatchIds.length === 0 || !queueTargetCourtId}
                className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
              >
                Xếp {queueSelectedMatchIds.length} trận đã chọn vào sân
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* POPUP MODAL: Cấu hình mốc thời gian & bước nhảy */}
      <Modal open={timeSettingsOpen} onOpenChange={setTimeSettingsOpen}>
        <ModalContent className="max-w-md rounded-2xl border border-slate-200 p-5 shadow-2xl">
          <ModalHeader>
            <ModalTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Cấu hình mốc thời gian thi đấu
            </ModalTitle>
            <ModalDescription className="text-xs text-slate-500">
              Thiết lập khung giờ hoạt động trong ngày và thời lượng từng bước nhảy của bảng lịch.
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Giờ bắt đầu</label>
                <Input
                  type="time"
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                  className="h-9 text-xs rounded-lg border-slate-300 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Giờ kết thúc</label>
                <Input
                  type="time"
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                  className="h-9 text-xs rounded-lg border-slate-300 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Bước nhảy thời gian mỗi ô (Duration / Slot)
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[15, 20, 30, 45, 60].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setTempStep(step)}
                    className={`py-2 text-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      tempStep === step
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {step}p
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Thời lượng ước tính 1 Set đấu (Tự động tính cho BO1, BO3, BO5)
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[10, 15, 20, 25, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTempMinutesPerSet(mins)}
                    className={`py-2 text-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      tempMinutesPerSet === mins
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {mins}p/set
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                👉 BO1 = {tempMinutesPerSet}p • BO3 = {tempMinutesPerSet * 3}p • BO5 = {tempMinutesPerSet * 5}p
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-900 leading-relaxed">
              💡 <strong>Mẹo:</strong> Bạn có thể dùng chuột kéo trực tiếp viền các đường line mốc giờ ở cột màu vàng bên trái của bảng lịch để co/giãn từng phút tùy ý như Excel.
            </div>
          </div>

          <ModalFooter className="pt-2 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTempStart(defaultOperatingStart || '06:00');
                setTempEnd(defaultOperatingEnd || '24:00');
                setTempStep(15);
                setTempMinutesPerSet(15);
              }}
              className="h-8 text-xs font-semibold cursor-pointer"
            >
              Mặc định
            </Button>
            <div className="flex items-center gap-2">
              <ModalClose asChild>
                <Button type="button" variant="outline" className="h-8 text-xs font-semibold cursor-pointer">
                  Hủy
                </Button>
              </ModalClose>
              <Button
                type="button"
                onClick={() => {
                  setOperatingStart(tempStart);
                  setOperatingEnd(tempEnd);
                  setDefaultStepMinutes(tempStep);
                  setMinutesPerSet(tempMinutesPerSet);
                  setRowDurations({});
                  setTimeSettingsOpen(false);
                  setSaveToast('Đã áp dụng cấu hình mốc giờ & thời lượng set mới!');
                  setTimeout(() => setSaveToast(null), 2500);
                }}
                className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
              >
                Áp dụng
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* MINIMALIST & LUXURIOUS DESKTOP CONTEXT MENU (Anti-Slop, Clean Typography, Tuân thủ taste-skill) */}
      {contextMenu && (() => {
        const targetMatch = contextMenu.matchId ? displayMatches.find((m) => m.match.id === contextMenu.matchId) : undefined;
        const menuX = Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 260 : contextMenu.x);
        const menuY = Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 460 : contextMenu.y);

        return (
          <div
            className="fixed z-50 min-w-[240px] max-w-[280px] rounded-xl bg-white text-slate-900 p-1.5 shadow-2xl border border-slate-200/90 text-xs font-medium animate-in fade-in zoom-in-95 duration-100 select-none ring-1 ring-slate-950/5"
            style={{
              left: Math.max(10, menuX),
              top: Math.max(10, menuY),
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {/* Header info */}
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-slate-100 text-xs font-bold text-slate-900">
              <span className="truncate flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                {contextMenu.courtName} • {contextMenu.timeStr}
              </span>
              {targetMatch && (
                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                  #{targetMatch.match.matchOrder || targetMatch.match.id.slice(-3)}
                </span>
              )}
            </div>

            <div className="py-1 space-y-0.5">
              {/* If right-clicked on an existing Match Card */}
              {targetMatch ? (
                <>
                  {/* View / Edit Match Details */}
                  <button
                    type="button"
                    onClick={() => {
                      onOpenMatch(targetMatch.match.id);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-slate-800 hover:text-blue-700 transition-colors cursor-pointer text-left font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                      Xem & Nhập tỉ số
                    </span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </button>

                  {/* Cut match */}
                  <button
                    type="button"
                    onClick={() => {
                      handleCut();
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Scissors className="h-3.5 w-3.5 text-slate-500" />
                      Cắt trận đấu
                    </span>
                    <span className="text-[10px] font-mono font-medium text-slate-400">Ctrl+X</span>
                  </button>

                  {/* Copy match */}
                  <button
                    type="button"
                    onClick={() => {
                      handleCopy();
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      Sao chép trận
                    </span>
                    <span className="text-[10px] font-mono font-medium text-slate-400">Ctrl+C</span>
                  </button>

                  <div className="h-px bg-slate-100 my-1" />

                  {/* Duration Quick Picker */}
                  <div className="px-2.5 py-1">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1">
                      Thời lượng trận:
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {[15, 30, 45, 60].map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => {
                            handleSetMatchDuration(targetMatch.match.id, dur);
                            setContextMenu(null);
                          }}
                          className={`py-1 rounded text-[11px] font-bold border transition-all cursor-pointer text-center ${
                            targetMatch.durationMinutes === dur
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200'
                          }`}
                        >
                          {dur}p
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Move to another court */}
                  {courts.length > 1 && (
                    <div className="px-2.5 py-1">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1">
                        Chuyển sang sân:
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-[72px] overflow-y-auto">
                        {courts
                          .filter((c) => c.id !== targetMatch.courtId)
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                handleMoveSingleMatchToCourt(targetMatch.match.id, c.id);
                                setContextMenu(null);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 hover:bg-emerald-600 hover:text-white text-slate-700 border border-slate-200 cursor-pointer transition-colors"
                            >
                              {c.courtName}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="h-px bg-slate-100 my-1" />

                  {/* Unassign / Remove from schedule */}
                  <button
                    type="button"
                    onClick={() => {
                      handleUnassignSingleMatch(targetMatch.match.id);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left font-semibold"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hủy xếp (Đưa về hàng chờ)
                  </button>
                </>
              ) : (
                /* Right-clicked on an empty cell or slot */
                <>
                  {/* Paste if clipboard has items */}
                  {clipboard && (
                    <button
                      type="button"
                      onClick={() => {
                        handlePaste();
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer text-left font-bold"
                    >
                      <span className="flex items-center gap-2">
                        <Clipboard className="h-3.5 w-3.5 text-emerald-600" />
                        Dán {clipboard.items.length} trận vào đây
                      </span>
                      <span className="text-[10px] font-mono font-medium text-emerald-700">Ctrl+V</span>
                    </button>
                  )}

                  {/* Pick match to assign */}
                  <button
                    type="button"
                    onClick={() => {
                      const row = timelineRows.rows[contextMenu.rowIndex];
                      if (row) {
                        const targetTime = new Date(row.startTimestamp).toISOString();
                        openAssignmentPicker(contextMenu.courtId, targetTime, contextMenu.rowIndex);
                      }
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-slate-800 hover:text-blue-700 transition-colors cursor-pointer text-left font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="h-3.5 w-3.5 text-blue-600" />
                      Chọn trận xếp vào ô này...
                    </span>
                  </button>

                  {/* Auto-fill next match into this slot */}
                  <button
                    type="button"
                    disabled={unscheduledMatches.length === 0}
                    onClick={() => {
                      if (unscheduledMatches.length === 0) return;
                      const nextMatch = unscheduledMatches[0];
                      const row = timelineRows.rows[contextMenu.rowIndex];
                      if (row) {
                        const targetTime = new Date(row.startTimestamp).toISOString();
                        const newDrafts = {
                          ...draftAssignments,
                          [nextMatch.match.id]: {
                            courtId: contextMenu.courtId,
                            scheduledAt: targetTime,
                            durationMinutes: nextMatch.durationMinutes || defaultStepMinutes,
                          },
                        };
                        setDraftAssignments(newDrafts);
                        pushHistory(newDrafts);
                        setSaveToast(`Đã xếp trận tiếp theo vào ${contextMenu.courtName} lúc ${contextMenu.timeStr}!`);
                        setTimeout(() => setSaveToast(null), 2500);
                      }
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-left disabled:opacity-40"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      Điền trận kế tiếp
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {unscheduledMatches.length} còn
                    </span>
                  </button>

                  {/* Lock / Block slot */}
                  <button
                    type="button"
                    onClick={() => {
                      handleBlockSelection();
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-left font-medium"
                  >
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    Khóa khung giờ này
                  </button>

                  <div className="h-px bg-slate-100 my-1" />

                  {/* Undo & Redo */}
                  <div className="grid grid-cols-2 gap-1 px-1">
                    <button
                      type="button"
                      disabled={historyIndex <= 0}
                      onClick={() => {
                        handleUndo();
                        setContextMenu(null);
                      }}
                      className="flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] disabled:opacity-40 cursor-pointer font-semibold border border-slate-200"
                    >
                      <RotateCcw className="h-3 w-3 text-slate-500" />
                      Hoàn tác
                    </button>
                    <button
                      type="button"
                      disabled={historyIndex >= history.length - 1}
                      onClick={() => {
                        handleRedo();
                        setContextMenu(null);
                      }}
                      className="flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] disabled:opacity-40 cursor-pointer font-semibold border border-slate-200"
                    >
                      <RotateCw className="h-3 w-3 text-slate-500" />
                      Làm lại
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </section>
  );
}
