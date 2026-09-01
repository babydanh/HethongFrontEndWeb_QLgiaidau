'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  ArrowUpDown,
  Calendar,
  CalendarClock,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
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
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Minus,
  MoreHorizontal,
  Move,
  Plus,
  Printer,
  RotateCcw,
  RotateCw,
  Save,
  Scissors,
  Search,
  Send,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  Volume2,
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
  startCourtIndex: number;
  endCourtIndex: number;
  startRowIndex: number;
  endRowIndex: number;
  courtName: string;
  scheduledAt: string;
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

type ParsedVoiceCommand = {
  intent: 'schedule' | 'unassign' | 'block' | 'duration' | 'clear';
  rawText: string;
  roundLabel?: string;
  divisionId?: string;
  divisionName?: string;
  targetDate?: string;
  courtIds: string[];
  courtNames: string[];
  startHour?: number;
  startMinute?: number;
  endHour?: number;
  endMinute?: number;
  durationMinutes?: number;
  restBufferMinutes?: number;
  setCount?: number;
  competitorQuery?: string;
  blockReason?: string;
  matchedMatchIds: string[];
  description: string;
  evaluation?: {
    totalMatchesCount: number;
    estimatedStartStr: string;
    estimatedEndStr: string;
    courtCount: number;
    restBufferMinutes: number;
    courtEfficiencyPercent: number;
    dateLabel: string;
    safetyChecks: string[];
  };
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

function getLocalDateString(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

  // 3. Check if Group stage / Round Robin (e.g. A 1, B 2)
  const groupName = match.groupName || (lowerName.includes('bảng') ? rawRoundName : '');
  if (groupName || lowerName.includes('group') || lowerName.includes('vòng bảng')) {
    const cleanGroup = (groupName || rawRoundName)
      .replace(/giai\s*đoạn\s*\d*/gi, '')
      .replace(/stage\s*\d*/gi, '')
      .replace(/vòng\s*bảng\s*/gi, '')
      .replace(/bảng\s*/gi, '')
      .replace(/group\s*/gi, '')
      .trim();
    const legNum = match.leg || match.roundNumber;
    if (legNum) {
      return `${cleanGroup.toUpperCase()} ${legNum}`;
    }
    return cleanGroup.toUpperCase() || 'A 1';
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
    if (diff === 6) return 'NHÁNH THẮNG • VÒNG 1/64';
    if (diff === 7) return 'NHÁNH THẮNG • VÒNG 1/128';
    if (diff >= 8) return `NHÁNH THẮNG • VÒNG 1/${2 ** diff}`;
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
    if (diff === 7) return 'VÒNG 1/128';
    if (diff === 8) return 'VÒNG 1/256';
    if (diff > 8) return `VÒNG 1/${2 ** diff}`;
    return `VÒNG ${rNum}`;
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
  const [pickerRoundFilter, setPickerRoundFilter] = useState('all');
  const [queueOpen, setQueueOpen] = useState(false);
  const [queueDivisionFilter, setQueueDivisionFilter] = useState('all');
  const [queueRoundFilter, setQueueRoundFilter] = useState('all');
  const [autoScheduleMenuOpen, setAutoScheduleMenuOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // AI Voice & Natural Language Scheduling State
  const [aiVoiceModalOpen, setAiVoiceModalOpen] = useState(false);
  const [aiVoiceInput, setAiVoiceInput] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceParsedResult, setVoiceParsedResult] = useState<ParsedVoiceCommand | null>(null);

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
  const boardScrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScrollCourts = (direction: 'left' | 'right') => {
    if (!boardScrollContainerRef.current) return;
    const offset = direction === 'left' ? -380 : 380;
    boardScrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

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
    const draft = draftAssignments[match.id];
    const isExplicitlyUnassigned = draft !== undefined && (!draft.courtId || !draft.scheduledAt);

    const persisted = !isExplicitlyUnassigned && Boolean(match.scheduledAt && match.courtId);
    const assignment = persisted ? null : previewAssignmentByMatchId.get(match.id);
    const matchDuration =
      draft?.durationMinutes ??
      customMatchDurations[match.id] ??
      ((match as unknown as Record<string, unknown>).durationMinutes as number | undefined) ??
      (preview ? preview.durationMinutes + preview.bufferMinutes : defaultStepMinutes);

    return {
      match,
      scheduledAt: isExplicitlyUnassigned ? null : (draft?.scheduledAt ?? (persisted ? match.scheduledAt : assignment?.scheduledAt ?? null)),
      courtId: isExplicitlyUnassigned ? null : (draft?.courtId ?? (persisted ? match.courtId : assignment?.courtId ?? null)),
      durationMinutes: matchDuration,
      isPreview: !isExplicitlyUnassigned && !persisted && Boolean(assignment) && !draft,
      isDraft: Boolean(draft),
    };
  }), [customMatchDurations, defaultStepMinutes, draftAssignments, matches, preview, previewAssignmentByMatchId]);

  const availableScheduleDates = useMemo(() => {
    const dates = new Set<string>();
    for (const item of displayMatches) {
      if (item.scheduledAt) {
        const d = getLocalDateString(item.scheduledAt);
        if (d) dates.add(d);
      }
    }
    if (preview?.assignments) {
      for (const a of preview.assignments) {
        if (a.scheduledAt) {
          const d = getLocalDateString(a.scheduledAt);
          if (d) dates.add(d);
        }
      }
    }
    if (defaultDate) {
      const d = getLocalDateString(defaultDate);
      if (d) dates.add(d);
    }
    if (dates.size === 0) {
      const today = getLocalDateString(new Date().toISOString());
      if (today) dates.add(today);
    }
    return Array.from(dates).sort();
  }, [defaultDate, displayMatches, preview]);

  const [activeDate, setActiveDate] = useState<string | null>(null);

  const scheduleDate = useMemo(() => {
    if (activeDate && availableScheduleDates.includes(activeDate)) {
      return activeDate;
    }
    return availableScheduleDates[0] || getLocalDateString(new Date().toISOString()) || '2026-01-01';
  }, [activeDate, availableScheduleDates]);

  const scheduledMatches = useMemo(
    () =>
      displayMatches.filter((item) => {
        if (!item.courtId || !item.scheduledAt) return false;
        const matchDateStr = getLocalDateString(item.scheduledAt);
        return matchDateStr === scheduleDate;
      }),
    [displayMatches, scheduleDate],
  );

  const unscheduledMatches = useMemo(
    () => displayMatches.filter((item) => !item.courtId || !item.scheduledAt),
    [displayMatches],
  );

  const unscheduledRounds = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const item of unscheduledMatches) {
      const maxR = maxRoundByDivision.get(item.match.divisionId || 'default') || 1;
      const label = getAccurateRoundLabel(item.match, maxR);
      const existing = map.get(label) || { label, count: 0 };
      existing.count += 1;
      map.set(label, existing);
    }
    return Array.from(map.values());
  }, [unscheduledMatches, maxRoundByDivision]);

  const [isLocalFullscreen, setIsLocalFullscreen] = useState(false);
  const [conflictsModalOpen, setConflictsModalOpen] = useState(false);

  const handleToggleFullscreen = () => {
    setIsLocalFullscreen((prev) => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLocalFullscreen) {
        setIsLocalFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocalFullscreen]);

  // Helper to ignore placeholder / unassigned competitor names
  const isPlaceholderCompetitorName = (name?: string | null) => {
    if (!name) return true;
    const s = name.trim().toLowerCase();
    if (!s || s === '—' || s === '-' || s === '?' || s === 'null' || s === 'undefined') return true;
    if (
      s.includes('chưa xác định') ||
      s.includes('chờ xác định') ||
      s.includes('tbd') ||
      s.includes('bye') ||
      s.includes('đang chờ')
    ) {
      return true;
    }
    return false;
  };

  // Calculate player/team conflict between scheduled matches (Strict concurrent overlap)
  const scheduleConflicts = useMemo(() => {
    const map = new Map<string, { otherCourtName: string; otherTimeStr: string; competitorName: string }[]>();
    const courtNameMap = new Map(courts.map((c) => [c.id, c.courtName]));

    const scheduled = displayMatches.filter((m) => m.courtId && m.scheduledAt);

    for (let i = 0; i < scheduled.length; i++) {
      const m1 = scheduled[i];
      const t1 = new Date(m1.scheduledAt!).getTime();
      const dur1 = (draftAssignments[m1.match.id]?.durationMinutes || rowDurations[0] || defaultStepMinutes) * 60_000;
      const end1 = t1 + dur1;

      const p1Names = [
        m1.match.participant1?.teamName,
        m1.match.participant1?.name,
        m1.match.participant2?.teamName,
        m1.match.participant2?.name,
      ].filter((n): n is string => !isPlaceholderCompetitorName(n));

      if (p1Names.length === 0) continue;

      for (let j = i + 1; j < scheduled.length; j++) {
        const m2 = scheduled[j];
        if (m1.courtId === m2.courtId) continue;

        const t2 = new Date(m2.scheduledAt!).getTime();
        const dur2 = (draftAssignments[m2.match.id]?.durationMinutes || rowDurations[0] || defaultStepMinutes) * 60_000;
        const end2 = t2 + dur2;

        // Strict time overlap: both matches are occurring concurrently during the exact same time
        const isOverlap = Math.max(t1, t2) < Math.min(end1, end2);
        if (!isOverlap) continue;

        const p2Names = [
          m2.match.participant1?.teamName,
          m2.match.participant1?.name,
          m2.match.participant2?.teamName,
          m2.match.participant2?.name,
        ].filter((n): n is string => !isPlaceholderCompetitorName(n));

        const shared = p1Names.find((name) => p2Names.some((n2) => n2.toLowerCase() === name.toLowerCase()));
        if (shared) {
          const c1Name = courtNameMap.get(m1.courtId!) || 'Sân khác';
          const c2Name = courtNameMap.get(m2.courtId!) || 'Sân khác';
          const time1Str = formatMatchTime(m1.scheduledAt);
          const time2Str = formatMatchTime(m2.scheduledAt);

          const list1 = map.get(m1.match.id) || [];
          list1.push({ otherCourtName: c2Name, otherTimeStr: time2Str, competitorName: shared });
          map.set(m1.match.id, list1);

          const list2 = map.get(m2.match.id) || [];
          list2.push({ otherCourtName: c1Name, otherTimeStr: time1Str, competitorName: shared });
          map.set(m2.match.id, list2);
        }
      }
    }

    return map;
  }, [displayMatches, draftAssignments, rowDurations, defaultStepMinutes, courts]);

  const handleExportExcel = () => {
    const courtNameMap = new Map(courts.map((c) => [c.id, c.courtName]));
    const scheduled = displayMatches
      .filter((m) => m.courtId && m.scheduledAt)
      .sort((a, b) => {
        const ta = new Date(a.scheduledAt!).getTime();
        const tb = new Date(b.scheduledAt!).getTime();
        if (ta !== tb) return ta - tb;
        return (courtNameMap.get(a.courtId!) || '').localeCompare(courtNameMap.get(b.courtId!) || '');
      });

    if (scheduled.length === 0) {
      setSaveToast('Chưa có trận đấu nào được xếp lịch để xuất!');
      setTimeout(() => setSaveToast(null), 2500);
      return;
    }

    const rows = [
      ['STT', 'Sân thi đấu', 'Ngày thi đấu', 'Giờ thi đấu', 'Thời lượng (phút)', 'Nội dung', 'Vòng đấu / Bảng', 'Đội 1 / VĐV 1', 'Đội 2 / VĐV 2', 'Tỷ số', 'Trạng thái'],
    ];

    scheduled.forEach((m, idx) => {
      const courtName = courtNameMap.get(m.courtId!) || 'Sân chưa rõ';
      const timeStr = formatMatchTime(m.scheduledAt);
      const dateStr = formatDateLabel(m.scheduledAt || scheduleDate, locale);
      const div = divisions?.find((d) => d.id === m.match.divisionId)?.name || 'Chung';
      const roundStr = m.match.roundName || m.match.groupName || (m.match.roundNumber ? `Vòng ${m.match.roundNumber}` : '—');
      const t1 = m.match.participant1?.teamName || m.match.participant1?.name || 'Chưa xác định';
      const t2 = m.match.participant2?.teamName || m.match.participant2?.name || 'Chưa xác định';
      const scoreStr = m.match.sets && m.match.sets.length > 0
        ? m.match.sets.map((s) => `${s.score1 ?? s.participant1Score ?? 0}-${s.score2 ?? s.participant2Score ?? 0}`).join(', ')
        : (m.match.score1 !== null && m.match.score1 !== undefined ? `${m.match.score1} - ${m.match.score2}` : '—');
      const statusStr = m.match.status === 'COMPLETED' ? 'Đã kết thúc' : m.match.status === 'IN_PROGRESS' ? 'Đang diễn ra' : 'Chưa diễn ra';
      const dur = draftAssignments[m.match.id]?.durationMinutes || defaultStepMinutes;

      rows.push([
        String(idx + 1),
        courtName,
        dateStr,
        timeStr,
        String(dur),
        div,
        roundStr,
        t1,
        t2,
        scoreStr,
        statusStr,
      ]);
    });

    const csvContent = '\uFEFF' + rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lich_thi_dau_${scheduleDate || 'sporto'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSaveToast(`Đã xuất ${scheduled.length} trận đấu ra file Excel!`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handlePrintSchedule = () => {
    window.print();
  };

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
    try {
      const succeededMatchIds = new Set<string>();
      // 1. Save all draft assignments in parallel chunks (eliminates freeze/lag)
      if (onSaveScheduleDirect) {
        const chunkSize = 8;
        for (let i = 0; i < entries.length; i += chunkSize) {
          const chunk = entries.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map(async ([matchId, draft]) => {
              try {
                await onSaveScheduleDirect(matchId, draft.courtId, draft.scheduledAt, true);
                succeededMatchIds.add(matchId);
              } catch (e) {
                console.error(`Failed to save match ${matchId}:`, e);
              }
            })
          );
        }
      }

      // 2. If row durations were resized, synchronize scheduledAt timestamps for all scheduled matches
      if (hasRowDurationChanges && onSaveScheduleDirect) {
        const rowSyncTasks: Promise<void>[] = [];
        for (const item of scheduledMatches) {
          if (!draftAssignments[item.match.id] && item.courtId && item.scheduledAt) {
            const matchDate = new Date(item.scheduledAt);
            const matchMinutesFromStart = (matchDate.getHours() * 60 + matchDate.getMinutes()) - baseStartMinute;
            const rIdx = Math.max(0, Math.min(timelineRows.rows.length - 1, Math.round(matchMinutesFromStart / defaultStepMinutes)));
            const targetRow = timelineRows.rows[rIdx];
            if (targetRow) {
              const updatedTime = new Date(targetRow.startTimestamp).toISOString();
              if (updatedTime !== item.scheduledAt) {
                rowSyncTasks.push(onSaveScheduleDirect(item.match.id, item.courtId, updatedTime, true));
              }
            }
          }
        }
        if (rowSyncTasks.length > 0) {
          await Promise.all(rowSyncTasks);
        }
      }

      // 3. REFETCH BEFORE CLEARING LOCAL DRAFTS (Eliminates disappearing matches!)
      if (onRefetchData) {
        await onRefetchData();
      }

      setDraftAssignments((prev) => {
        const next = { ...prev };
        for (const id of succeededMatchIds) {
          delete next[id];
        }
        return next;
      });

      if (succeededMatchIds.size === entries.length) {
        setAutoSaveStatus('saved');
        if (!silent) {
          setSaveToast(`Đã lưu thành công ${succeededMatchIds.size} trận đấu!`);
          setTimeout(() => setSaveToast(null), 3000);
        }
      } else {
        setAutoSaveStatus('unsaved');
        if (!silent) {
          setSaveToast(`Đã lưu ${succeededMatchIds.size}/${entries.length} trận đấu.`);
          setTimeout(() => setSaveToast(null), 3500);
        }
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

  // Auto-Save Effect (Debounce 3.5s after user changes schedule)
  useEffect(() => {
    if (Object.keys(draftAssignments).length === 0) return;
    setAutoSaveStatus('unsaved');

    const timer = setTimeout(() => {
      void handleSaveAllDrafts(true);
    }, 3500);

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
      newDrafts[item.match.id] = {
        courtId: '',
        scheduledAt: '',
      };
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

    setCustomMatchDurations((prev) => ({ ...prev, [matchId]: newDuration }));

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
  const handleUnassignSingleMatch = async (matchId: string) => {
    const newDrafts = {
      ...draftAssignments,
      [matchId]: {
        courtId: '',
        scheduledAt: '',
      },
    };
    setDraftAssignments(newDrafts);
    pushHistory(newDrafts);
    setSaveToast('🗑️ Đã hủy xếp trận đấu (đưa về hàng chờ chưa xếp)!');
    setTimeout(() => setSaveToast(null), 2500);

    if (onSaveScheduleDirect) {
      await onSaveScheduleDirect(matchId, '', '', true);
    }
  };

  // Clear all scheduled matches (Reset entire schedule to queue)
  const handleClearAllSchedule = async () => {
    if (scheduledMatches.length === 0) return;
    if (!confirm(`Bạn có chắc muốn hủy xếp toàn bộ ${scheduledMatches.length} trận đấu để đưa về hàng chờ?`)) return;

    const newDrafts = { ...draftAssignments };
    for (const item of scheduledMatches) {
      newDrafts[item.match.id] = {
        courtId: '',
        scheduledAt: '',
      };
      if (onSaveScheduleDirect) {
        void onSaveScheduleDirect(item.match.id, '', '', true);
      }
    }

    setDraftAssignments(newDrafts);
    pushHistory(newDrafts);
    setBlockedSlots([]);
    setSelectionRange(null);
    setSaveToast(`🗑️ Đã hủy toàn bộ lịch thi đấu (${scheduledMatches.length} trận)!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Auto-Schedule Matches (AI Smart Fill with progressive tournament ordering, BO duration and athlete conflict avoidance)
  const handleAutoScheduleAll = (filterRoundLabel?: string, onlyReadyMatches = false) => {
    let candidateMatches = unscheduledMatches;
    if (filterRoundLabel && filterRoundLabel !== 'all') {
      candidateMatches = candidateMatches.filter((item) => {
        const maxR = maxRoundByDivision.get(item.match.divisionId || 'default') || 1;
        return getAccurateRoundLabel(item.match, maxR) === filterRoundLabel;
      });
    }

    if (onlyReadyMatches) {
      candidateMatches = candidateMatches.filter((item) => {
        const p1 = item.match.participant1?.teamName || item.match.participant1?.name;
        const p2 = item.match.participant2?.teamName || item.match.participant2?.name;
        const hasP1 = !isPlaceholderCompetitorName(p1);
        const hasP2 = !isPlaceholderCompetitorName(p2);
        const isRound1 = (item.match.leg || item.match.roundNumber || 1) === 1;
        return (hasP1 && hasP2) || isRound1;
      });
    }

    if (candidateMatches.length === 0 || courts.length === 0) {
      setSaveToast('Không có trận nào phù hợp trong hàng chờ để xếp.');
      setTimeout(() => setSaveToast(null), 2500);
      return;
    }

    // 1. Order unscheduled matches logically by division, stage (group first) & round ascending
    const sortedMatches = [...candidateMatches].sort((a, b) => {
      // Keep division matches grouped together
      if (a.match.divisionId !== b.match.divisionId) {
        return (a.match.divisionId || '').localeCompare(b.match.divisionId || '');
      }

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

    // Track the latest end timestamp of each (division + round) to ensure Round K+1 starts only after Round K
    const roundLatestEndTime = new Map<string, number>();

    for (const targetItem of sortedMatches) {
      const matchDuration = targetItem.durationMinutes || defaultStepMinutes;
      const targetParticipants = [
        targetItem.match.participant1?.teamName,
        targetItem.match.participant1?.name,
        targetItem.match.participant2?.teamName,
        targetItem.match.participant2?.name,
      ].filter((n): n is string => !isPlaceholderCompetitorName(n));

      const divId = targetItem.match.divisionId || 'default';
      const roundNum = targetItem.match.leg || targetItem.match.roundNumber || 1;

      // Round K+1 must not start before the previous round in the same division ends
      let earliestStartTime = 0;
      if (roundNum > 1) {
        const prevRoundKey = `${divId}_round_${roundNum - 1}`;
        earliestStartTime = roundLatestEndTime.get(prevRoundKey) || 0;
      }

      let placed = false;

      // Find earliest continuous time slot across all courts where neither court nor athletes are busy
      for (let rIdx = 0; rIdx < timelineRows.rows.length; rIdx++) {
        const rowInfo = timelineRows.rows[rIdx];
        if (!rowInfo) continue;
        const slotStart = rowInfo.startTimestamp;

        // Skip slot if it occurs before the previous round has finished
        if (slotStart < earliestStartTime) continue;

        const slotEnd = slotStart + matchDuration * 60_000;

        for (const court of courts) {
          // 1. Check if court is free for the entire duration [slotStart, slotEnd]
          const isCourtOccupied =
            Object.values(newDrafts).some((d) => {
              if (d.courtId !== court.id) return false;
              const dStart = new Date(d.scheduledAt).getTime();
              const dEnd = dStart + (d.durationMinutes || defaultStepMinutes) * 60_000;
              return slotStart < dEnd && slotEnd > dStart;
            }) ||
            displayMatches.some((m) => {
              if (m.courtId !== court.id || !m.scheduledAt || newDrafts[m.match.id]) return false;
              const mStart = new Date(m.scheduledAt).getTime();
              const mEnd = mStart + (m.durationMinutes || defaultStepMinutes) * 60_000;
              return slotStart < mEnd && slotEnd > mStart;
            });

          if (isCourtOccupied) continue;

          // 2. Check if any participant in targetItem is already playing in any court during [slotStart, slotEnd]
          const isParticipantBusy = targetParticipants.length > 0 && (
            Object.entries(newDrafts).some(([mId, d]) => {
              const dStart = new Date(d.scheduledAt).getTime();
              const dEnd = dStart + (d.durationMinutes || defaultStepMinutes) * 60_000;
              const isTimeOverlap = slotStart < dEnd && slotEnd > dStart;
              if (!isTimeOverlap) return false;

              const otherMatch = sortedMatches.find((m) => m.match.id === mId)?.match;
              if (!otherMatch) return false;
              const otherNames = [
                otherMatch.participant1?.teamName,
                otherMatch.participant1?.name,
                otherMatch.participant2?.teamName,
                otherMatch.participant2?.name,
              ].filter((n): n is string => !isPlaceholderCompetitorName(n));

              return targetParticipants.some((name) => otherNames.some((o) => o.toLowerCase() === name.toLowerCase()));
            }) ||
            displayMatches.some((m) => {
              if (!m.scheduledAt || m.match.id === targetItem.match.id || newDrafts[m.match.id]) return false;
              const mStart = new Date(m.scheduledAt).getTime();
              const mEnd = mStart + (m.durationMinutes || defaultStepMinutes) * 60_000;
              const isTimeOverlap = slotStart < mEnd && slotEnd > mStart;
              if (!isTimeOverlap) return false;

              const otherNames = [
                m.match.participant1?.teamName,
                m.match.participant1?.name,
                m.match.participant2?.teamName,
                m.match.participant2?.name,
              ].filter((n): n is string => !isPlaceholderCompetitorName(n));

              return targetParticipants.some((name) => otherNames.some((o) => o.toLowerCase() === name.toLowerCase()));
            })
          );

          if (!isParticipantBusy) {
            newDrafts[targetItem.match.id] = {
              courtId: court.id,
              scheduledAt: new Date(slotStart).toISOString(),
              durationMinutes: matchDuration,
            };
            scheduledCount++;
            placed = true;

            // Record latest end time for this round
            const currentRoundKey = `${divId}_round_${roundNum}`;
            const currentLatest = roundLatestEndTime.get(currentRoundKey) || 0;
            if (slotEnd > currentLatest) {
              roundLatestEndTime.set(currentRoundKey, slotEnd);
            }
            break;
          }
        }
        if (placed) break;
      }
    }

    const mergedDrafts = { ...draftAssignments, ...newDrafts };
    setDraftAssignments(mergedDrafts);
    pushHistory(mergedDrafts);
    const roundMsg = filterRoundLabel ? ` của ${filterRoundLabel}` : '';
    setSaveToast(`AI đã tự động xếp ${scheduledCount}/${sortedMatches.length} trận${roundMsg}! Bấm "Lưu lịch (Ctrl+S)" để hoàn tất.`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Reset All Rows to Default Duration
  const handleResetAllRowsEvenly = () => {
    setRowDurations({});
    setSaveToast('Đã đặt lại tất cả các mốc giờ về mặc định đều nhau!');
    setTimeout(() => setSaveToast(null), 2500);
  };

  // VIETNAMESE ADVANCED NLP ENGINE FOR VOICE & NATURAL LANGUAGE SCHEDULING
  const parseVoiceSchedulingCommand = (text: string): ParsedVoiceCommand => {
    const raw = text.trim();
    const lower = raw.toLowerCase();

    // 1. Detect Intent
    let intent: ParsedVoiceCommand['intent'] = 'schedule';
    if (
      lower.includes('khóa') ||
      lower.includes('nghỉ trưa') ||
      lower.includes('tạm nghỉ') ||
      lower.includes('bảo trì') ||
      lower.includes('tạm dừng') ||
      lower.includes('đóng sân')
    ) {
      intent = 'block';
    } else if (
      lower.includes('hủy') ||
      lower.includes('xóa') ||
      lower.includes('gỡ') ||
      lower.includes('bỏ xếp') ||
      lower.includes('reset')
    ) {
      intent = lower.includes('toàn bộ') || lower.includes('tất cả') ? 'clear' : 'unassign';
    } else if (
      (lower.includes('thời lượng') || lower.includes('mỗi trận')) &&
      !lower.includes('xếp') &&
      !lower.includes('vào sân')
    ) {
      intent = 'duration';
    }

    // 2. Extract Set count & Match Duration (e.g. "1 set 15p", "3 set 40p", "mỗi trận 30 phút", "20p")
    let durationMinutes: number | undefined;
    let setCount: number | undefined;

    const setDurMatch = lower.match(/(\d+)\s*set\s*(\d{1,3})\s*(?:phút|p\b)/);
    if (setDurMatch) {
      setCount = parseInt(setDurMatch[1], 10);
      durationMinutes = parseInt(setDurMatch[2], 10);
    } else {
      const singleDurMatch = lower.match(/(?:thời lượng|mỗi trận|trận)?\s*(\d{1,3})\s*(?:phút|p\b)/);
      if (singleDurMatch) {
        durationMinutes = parseInt(singleDurMatch[1], 10);
      }
    }

    // 3. Extract Rest / Buffer between matches (e.g., "cách nhau 5p nghỉ ngơi", "nghỉ 5p", "nghỉ giữa trận 10 phút")
    let restBufferMinutes: number | undefined;
    const restMatch = lower.match(/(?:cách nhau|nghỉ ngơi|nghỉ giữa trận|nghỉ|buffer|giãn cách)\s*(\d{1,2})\s*(?:phút|p\b)/);
    if (restMatch) {
      restBufferMinutes = parseInt(restMatch[1], 10);
    }

    // 4. Extract Target Date (e.g., "ngày 30/8", "ngày 31/08", "ngày 30 tháng 8", "30/08/2026")
    let targetDate: string | undefined;
    const dateMatch = lower.match(/ngày\s*(\d{1,2})[\s/.-](\d{1,2})(?:[\s/.-](\d{4}))?/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10);
      const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : new Date().getFullYear();
      const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const foundInAvailable = availableScheduleDates.find((d) => d === formattedDate);
      targetDate = foundInAvailable || formattedDate;
    }

    // 5. Extract Time (start hour & minute)
    let startHour: number | undefined;
    let startMinute: number | undefined;
    let endHour: number | undefined;
    let endMinute: number | undefined;

    // Range: "từ X đến Y" or "từ X tới Y"
    const rangeMatch = lower.match(/(?:từ\s*)(\d{1,2})(?:[h:](\d{2}))?\s*(?:đến|tới|-)\s*(\d{1,2})(?:[h:](\d{2}))?/);
    if (rangeMatch) {
      startHour = parseInt(rangeMatch[1], 10);
      startMinute = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : 0;
      endHour = parseInt(rangeMatch[3], 10);
      endMinute = rangeMatch[4] ? parseInt(rangeMatch[4], 10) : 0;
    } else {
      // Single time: "lúc 8 giờ", "8h30", "8:00", "từ 8h", "từ 14h"
      const singleTimeMatch = lower.match(/(?:lúc|từ|vào|đầu)\s*(\d{1,2})(?:[h:](\d{2})|\s*giờ(?:\s*(\d{2}))?)?/);
      if (singleTimeMatch) {
        startHour = parseInt(singleTimeMatch[1], 10);
        startMinute = singleTimeMatch[2] ? parseInt(singleTimeMatch[2], 10) : singleTimeMatch[3] ? parseInt(singleTimeMatch[3], 10) : 0;
      }
    }

    // Adjust PM if user says "chiều" / "tối"
    if ((lower.includes('chiều') || lower.includes('tối')) && startHour !== undefined && startHour < 12) {
      startHour += 12;
    }
    if ((lower.includes('chiều') || lower.includes('tối')) && endHour !== undefined && endHour < 12) {
      endHour += 12;
    }

    // 6. Extract Target Courts
    let targetCourtIds: string[] = [];
    let targetCourtNames: string[] = [];

    if (
      lower.includes('tất cả các sân') ||
      lower.includes('toàn bộ sân') ||
      lower.includes('mọi sân') ||
      lower.includes('các sân')
    ) {
      targetCourtIds = courts.map((c) => c.id);
      targetCourtNames = courts.map((c) => c.courtName);
    } else {
      // Check court range: "sân 1 đến sân 4", "sân 1 tới 4", "sân 1-4"
      const courtRangeMatch = lower.match(/sân\s*(\d+)\s*(?:đến|tới|-)\s*(?:sân\s*)?(\d+)/);
      if (courtRangeMatch) {
        const fromNum = parseInt(courtRangeMatch[1], 10);
        const toNum = parseInt(courtRangeMatch[2], 10);
        const minNum = Math.min(fromNum, toNum);
        const maxNum = Math.max(fromNum, toNum);
        const matched = courts.filter((c, idx) => idx + 1 >= minNum && idx + 1 <= maxNum);
        targetCourtIds = matched.map((c) => c.id);
        targetCourtNames = matched.map((c) => c.courtName);
      } else {
        // Find individual courts mentioned: "sân 1 và sân 2", "sân 1, 2"
        for (let i = 0; i < courts.length; i++) {
          const c = courts[i];
          const cNameLower = c.courtName.toLowerCase();
          const courtNum = `${i + 1}`;
          if (
            lower.includes(cNameLower) ||
            lower.includes(`sân ${courtNum}`) ||
            lower.includes(`san ${courtNum}`)
          ) {
            targetCourtIds.push(c.id);
            targetCourtNames.push(c.courtName);
          }
        }
      }
    }

    if (targetCourtIds.length === 0) {
      targetCourtIds = courts.map((c) => c.id);
      targetCourtNames = courts.map((c) => c.courtName);
    }

    // 7. Extract Round Label & Combined Rounds (e.g. "tứ kết và bán kết", "vòng 1/32", "chung kết")
    let roundLabel: string | undefined;
    const matchedRoundLabels: string[] = [];

    if (lower.includes('1/64') || lower.includes('vòng 64')) {
      const found = unscheduledRounds.find((r) => r.label.includes('1/64') || r.label.includes('64'))?.label || 'Vòng 1/64';
      matchedRoundLabels.push(found);
    }
    if (lower.includes('1/32') || lower.includes('vòng 32')) {
      const found = unscheduledRounds.find((r) => r.label.includes('1/32') || r.label.includes('32'))?.label || 'Vòng 1/32';
      matchedRoundLabels.push(found);
    }
    if (lower.includes('1/16') || lower.includes('vòng 16')) {
      const found = unscheduledRounds.find((r) => r.label.includes('1/16') || r.label.includes('16'))?.label || 'Vòng 1/16';
      matchedRoundLabels.push(found);
    }
    if (lower.includes('1/8') || lower.includes('vòng 8')) {
      const found = unscheduledRounds.find((r) => r.label.includes('1/8') || r.label.includes('8'))?.label || 'Vòng 1/8';
      matchedRoundLabels.push(found);
    }
    if (lower.includes('tứ kết') || lower.includes('1/4') || lower.includes('quarter')) {
      const found = unscheduledRounds.find((r) => r.label.toLowerCase().includes('tứ kết') || r.label.includes('1/4'))?.label || 'Tứ kết';
      matchedRoundLabels.push(found);
    }
    if (lower.includes('bán kết') || lower.includes('semi')) {
      const found = unscheduledRounds.find((r) => r.label.toLowerCase().includes('bán kết'))?.label || 'Bán kết';
      matchedRoundLabels.push(found);
    }
    if (lower.includes('chung kết') || lower.includes('final') || lower.includes('ck')) {
      const found = unscheduledRounds.find((r) => r.label.toLowerCase().includes('chung kết'))?.label || 'Chung kết';
      matchedRoundLabels.push(found);
    }
    if (lower.includes('vòng bảng') || lower.includes('bảng')) {
      const found = unscheduledRounds.find((r) => r.label.toLowerCase().includes('bảng'))?.label || 'Vòng bảng';
      matchedRoundLabels.push(found);
    }

    if (matchedRoundLabels.length > 0) {
      roundLabel = matchedRoundLabels.join(', ');
    }

    // 8. Extract Division
    let divisionId: string | undefined;
    let divisionName: string | undefined;
    for (const div of divisions) {
      if (lower.includes(div.name.toLowerCase())) {
        divisionId = div.id;
        divisionName = div.name;
        break;
      }
    }

    // 9. Extract Specific Competitor Query
    let competitorQuery: string | undefined;
    const compMatch = lower.match(/(?:của|vđv|đội|cặp)\s+([a-zA-Z0-9_\s/]+?)(?:\s+vào|\s+lúc|\s+từ|\s+mỗi|$)/);
    if (compMatch) {
      competitorQuery = compMatch[1].trim();
    }

    // 10. Match relevant matches from pool
    const pool = intent === 'unassign' ? displayMatches.filter((m) => m.courtId && m.scheduledAt) : unscheduledMatches;
    const matched = pool.filter((item) => {
      if (divisionId && item.match.divisionId !== divisionId) return false;
      if (matchedRoundLabels.length > 0) {
        const maxR = maxRoundByDivision.get(item.match.divisionId || 'default') || 1;
        const rLabel = getAccurateRoundLabel(item.match, maxR);
        const matchAny = matchedRoundLabels.some((lbl) => rLabel === lbl || rLabel.toLowerCase().includes(lbl.toLowerCase()));
        if (!matchAny) return false;
      }
      if (competitorQuery) {
        const p1 = `${item.match.participant1?.teamName || ''} ${item.match.participant1?.name || ''}`.toLowerCase();
        const p2 = `${item.match.participant2?.teamName || ''} ${item.match.participant2?.name || ''}`.toLowerCase();
        if (!p1.includes(competitorQuery) && !p2.includes(competitorQuery)) return false;
      }
      if (intent === 'unassign' && targetCourtIds.length > 0) {
        if (!targetCourtIds.includes(item.courtId || '')) return false;
      }
      return true;
    });

    const matchedMatches = matched.length === 0 && intent === 'schedule' && !competitorQuery && matchedRoundLabels.length === 0 && !divisionId ? unscheduledMatches : matched;

    // 11. Formulate Description & AI Evaluation
    const effectiveStartH = startHour !== undefined ? startHour : 8;
    const effectiveStartM = startMinute !== undefined ? startMinute : 0;
    const timeStr = `${String(effectiveStartH).padStart(2, '0')}:${String(effectiveStartM).padStart(2, '0')}`;
    const courtStr = targetCourtNames.length === courts.length ? 'tất cả các sân' : targetCourtNames.join(', ');
    const effectiveDuration = durationMinutes || defaultStepMinutes;
    const effectiveBuffer = restBufferMinutes || 0;
    const matchPlusBuffer = effectiveDuration + effectiveBuffer;

    let description = '';
    let evaluation: ParsedVoiceCommand['evaluation'] | undefined;

    if (intent === 'schedule') {
      const count = matchedMatches.length;
      const rStr = roundLabel ? ` (${roundLabel})` : '';
      const divStr = divisionName ? ` [${divisionName}]` : '';
      const durStr = `, ${effectiveDuration}p/trận${effectiveBuffer > 0 ? ` (+${effectiveBuffer}p nghỉ ngơi)` : ''}`;
      const dateStr = targetDate ? ` ngày ${formatDateLabel(targetDate, locale)}` : '';
      description = `⚡ Xếp ${count} trận${divStr}${rStr} vào ${courtStr}${dateStr} bắt đầu từ ${timeStr}${durStr}.`;

      const numCourts = Math.max(1, targetCourtIds.length);
      const totalRoundsCount = Math.ceil(count / numCourts);
      const totalMinutesNeeded = totalRoundsCount * matchPlusBuffer;
      const endTotalMinutes = effectiveStartH * 60 + effectiveStartM + totalMinutesNeeded;
      const endH = Math.floor(endTotalMinutes / 60) % 24;
      const endM = endTotalMinutes % 60;
      const estimatedEndStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      evaluation = {
        totalMatchesCount: count,
        estimatedStartStr: timeStr,
        estimatedEndStr,
        courtCount: numCourts,
        restBufferMinutes: effectiveBuffer,
        courtEfficiencyPercent: Math.min(100, Math.round((count / (totalRoundsCount * numCourts || 1)) * 100)),
        dateLabel: targetDate ? formatDateLabel(targetDate, locale) : formatDateLabel(scheduleDate, locale),
        safetyChecks: [
          '✓ Tự động kiểm tra không trùng giờ thi đấu của vận động viên',
          effectiveBuffer > 0 ? `✓ Giãn cách tối thiểu ${effectiveBuffer} phút nghỉ ngơi giữa các trận` : '✓ Tối ưu hóa chuyển sân liên tục',
          '✓ Bảo toàn thứ tự tuần tự các vòng đấu (Vòng bảng → Tứ kết → Bán kết → CK)',
        ],
      };
    } else if (intent === 'block') {
      const endTimeStr = endHour !== undefined ? `${String(endHour).padStart(2, '0')}:${String(endMinute || 0).padStart(2, '0')}` : '13:00';
      const reason = lower.includes('nghỉ trưa') ? 'Nghỉ trưa' : lower.includes('bảo trì') ? 'Bảo trì sân' : 'Tạm dừng sân';
      description = `🔒 Khóa ${courtStr} từ ${timeStr} đến ${endTimeStr} (${reason}).`;
    } else if (intent === 'unassign') {
      description = `🗑️ Hủy xếp ${matchedMatches.length} trận trên ${courtStr} đưa về hàng chờ.`;
    } else if (intent === 'clear') {
      description = `🗑️ Hủy toàn bộ lịch thi đấu của giải đưa về hàng chờ.`;
    } else if (intent === 'duration') {
      description = `⏱️ Đổi thời lượng cho ${matchedMatches.length} trận thành ${durationMinutes || 20} phút.`;
    }

    return {
      intent,
      rawText: raw,
      roundLabel,
      divisionId,
      divisionName,
      targetDate,
      courtIds: targetCourtIds,
      courtNames: targetCourtNames,
      startHour,
      startMinute,
      endHour,
      endMinute,
      durationMinutes,
      restBufferMinutes,
      setCount,
      competitorQuery,
      blockReason: lower.includes('nghỉ trưa') ? 'Nghỉ trưa' : lower.includes('bảo trì') ? 'Bảo trì sân' : 'Tạm dừng',
      matchedMatchIds: matchedMatches.map((m) => m.match.id),
      description,
      evaluation,
    };
  };

  // Voice Recognition Handler (Web Speech API with Live Interim Streaming)
  const startVoiceRecognition = () => {
    if (typeof window === 'undefined') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Trình duyệt của bạn không hỗ trợ Web Speech API. Bạn có thể gõ câu lệnh trực tiếp vào ô bên dưới!');
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRecognition as any)();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsVoiceListening(true);
        setVoiceError(null);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const text = (finalTranscript || interimTranscript).trim();
        if (text) {
          setAiVoiceInput(text);
          const parsed = parseVoiceSchedulingCommand(text);
          setVoiceParsedResult(parsed);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        setIsVoiceListening(false);
        if (event.error !== 'no-speech') {
          setVoiceError(`Lỗi micro (${event.error}). Bạn có thể gõ lệnh trực tiếp vào ô văn bản.`);
        }
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      recognition.start();
    } catch {
      setIsVoiceListening(false);
      setVoiceError('Không thể mở micro. Vui lòng cấp quyền micro trong trình duyệt.');
    }
  };

  // Execute Voice Command Plan
  const handleExecuteVoiceCommand = (cmd: ParsedVoiceCommand) => {
    if (cmd.intent === 'clear') {
      handleClearAllSchedule();
      setAiVoiceModalOpen(false);
      return;
    }

    // Switch date if a specific target date was mentioned
    if (cmd.targetDate && availableScheduleDates.includes(cmd.targetDate)) {
      setActiveDate(cmd.targetDate);
    }

    if (cmd.intent === 'block') {
      const sH = cmd.startHour ?? 12;
      const sM = cmd.startMinute ?? 0;
      const eH = cmd.endHour ?? sH + 1;
      const eM = cmd.endMinute ?? 0;

      const sStr = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`;
      const eStr = `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;

      const newSlots: BlockedSlot[] = [];
      const baseDateStr = cmd.targetDate || (defaultDate ? new Date(defaultDate).toISOString().split('T')[0] : scheduleDate);

      for (const cId of cmd.courtIds) {
        const sTime = new Date(`${baseDateStr}T${sStr}:00`).toISOString();
        const eTime = new Date(`${baseDateStr}T${eStr}:00`).toISOString();
        const durationMin = (eH * 60 + eM) - (sH * 60 + sM);
        newSlots.push({
          id: `block-${cId}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          courtId: cId,
          scheduledAt: sTime,
          durationMinutes: Math.max(15, durationMin),
          label: cmd.blockReason || 'Tạm dừng sân',
        });
      }

      setBlockedSlots((prev) => [...prev, ...newSlots]);
      setAiVoiceModalOpen(false);
      setSaveToast(`🔒 Đã khóa ${cmd.courtNames.length} sân từ ${sStr} đến ${eStr}!`);
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    const targetMatches = displayMatches.filter((m) => cmd.matchedMatchIds.includes(m.match.id));

    if (cmd.intent === 'unassign') {
      if (targetMatches.length === 0) {
        setSaveToast('Không tìm thấy trận nào phù hợp để hủy.');
        setTimeout(() => setSaveToast(null), 2500);
        return;
      }
      const newDrafts = { ...draftAssignments };
      for (const m of targetMatches) {
        newDrafts[m.match.id] = { courtId: '', scheduledAt: '' };
        if (onSaveScheduleDirect) {
          void onSaveScheduleDirect(m.match.id, '', '', true);
        }
      }
      setDraftAssignments(newDrafts);
      pushHistory(newDrafts);
      setAiVoiceModalOpen(false);
      setSaveToast(`🗑️ Đã hủy xếp ${targetMatches.length} trận đưa về hàng chờ!`);
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    if (cmd.intent === 'duration') {
      if (!cmd.durationMinutes || targetMatches.length === 0) return;
      const newCustoms = { ...customMatchDurations };
      const newDrafts = { ...draftAssignments };
      for (const m of targetMatches) {
        newCustoms[m.match.id] = cmd.durationMinutes;
        if (m.courtId && m.scheduledAt) {
          newDrafts[m.match.id] = {
            courtId: m.courtId,
            scheduledAt: m.scheduledAt,
            durationMinutes: cmd.durationMinutes,
          };
        }
      }
      setCustomMatchDurations(newCustoms);
      setDraftAssignments(newDrafts);
      pushHistory(newDrafts);
      setAiVoiceModalOpen(false);
      setSaveToast(`⏱️ Đã đặt thời lượng ${cmd.durationMinutes}p cho ${targetMatches.length} trận!`);
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    // Default intent: schedule
    if (targetMatches.length === 0) {
      setSaveToast('Không có trận nào trong hàng chờ phù hợp với yêu cầu.');
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    let startRowIdx = 0;
    if (cmd.startHour !== undefined) {
      const targetMin = cmd.startHour * 60 + (cmd.startMinute || 0) - baseStartMinute;
      startRowIdx = Math.max(0, Math.min(timelineRows.rows.length - 1, Math.round(targetMin / defaultStepMinutes)));
    }

    const targetCourts = courts.filter((c) => cmd.courtIds.includes(c.id));
    const effectiveCourts = targetCourts.length > 0 ? targetCourts : courts;

    const newDrafts: Record<string, DraftAssignment> = {};
    const newCustoms = { ...customMatchDurations };
    const restBuffer = cmd.restBufferMinutes || 0;
    let scheduledCount = 0;

    let courtCursor = 0;
    let rowCursor = startRowIdx;

    for (const targetItem of targetMatches) {
      const matchDur = cmd.durationMinutes || targetItem.durationMinutes || defaultStepMinutes;
      if (cmd.durationMinutes) {
        newCustoms[targetItem.match.id] = cmd.durationMinutes;
      }

      let placed = false;
      for (let r = rowCursor; r < timelineRows.rows.length; r++) {
        const rowInfo = timelineRows.rows[r];
        if (!rowInfo) continue;
        const slotStart = rowInfo.startTimestamp;
        const slotEnd = slotStart + (matchDur + restBuffer) * 60_000;

        for (let cOffset = 0; cOffset < effectiveCourts.length; cOffset++) {
          const cIdx = (courtCursor + cOffset) % effectiveCourts.length;
          const court = effectiveCourts[cIdx];

          const isCourtBusy =
            Object.values(newDrafts).some((d) => {
              if (d.courtId !== court.id) return false;
              const dStart = new Date(d.scheduledAt).getTime();
              const dEnd = dStart + ((d.durationMinutes || defaultStepMinutes) + restBuffer) * 60_000;
              return slotStart < dEnd && slotEnd > dStart;
            }) ||
            displayMatches.some((m) => {
              if (m.courtId !== court.id || !m.scheduledAt || newDrafts[m.match.id]) return false;
              const mStart = new Date(m.scheduledAt).getTime();
              const mEnd = mStart + ((m.durationMinutes || defaultStepMinutes) + restBuffer) * 60_000;
              return slotStart < mEnd && slotEnd > mStart;
            });

          if (!isCourtBusy) {
            newDrafts[targetItem.match.id] = {
              courtId: court.id,
              scheduledAt: new Date(slotStart).toISOString(),
              durationMinutes: matchDur,
            };
            scheduledCount++;
            placed = true;
            courtCursor = (cIdx + 1) % effectiveCourts.length;
            if (courtCursor === 0) {
              rowCursor = r + Math.max(1, Math.ceil((matchDur + restBuffer) / defaultStepMinutes));
            }
            break;
          }
        }
        if (placed) break;
      }
    }

    if (cmd.durationMinutes) {
      setCustomMatchDurations(newCustoms);
    }
    const merged = { ...draftAssignments, ...newDrafts };
    setDraftAssignments(merged);
    pushHistory(merged);
    setAiVoiceModalOpen(false);
    setSaveToast(`⚡ AI đã xếp ${scheduledCount}/${targetMatches.length} trận theo đúng yêu cầu! Đang tự động lưu...`);
    setTimeout(() => setSaveToast(null), 3500);
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

      setCustomMatchDurations((prev) => ({ ...prev, [matchCardResize.matchId]: durationMinutes }));
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
      const maxR = maxRoundByDivision.get(item.match.divisionId || 'default') || 1;
      const roundStr = getAccurateRoundLabel(item.match, maxR);
      if (pickerRoundFilter !== 'all' && roundStr !== pickerRoundFilter) {
        return false;
      }
      if (!query) return true;
      const p1 = getParticipantName(item.match.participant1).toLocaleLowerCase();
      const p2 = getParticipantName(item.match.participant2).toLocaleLowerCase();
      const orderStr = `#${item.match.matchOrder ?? ''}`.toLocaleLowerCase();
      return p1.includes(query) || p2.includes(query) || roundStr.toLocaleLowerCase().includes(query) || orderStr.includes(query);
    });
  }, [assignmentSearch, pickerDivisionFilter, pickerRoundFilter, unscheduledMatches, maxRoundByDivision]);

  // Filtering for Queue Modal
  const filteredQueueMatches = useMemo(() => {
    return unscheduledMatches.filter((item) => {
      if (queueDivisionFilter !== 'all' && item.match.divisionId !== queueDivisionFilter) {
        return false;
      }
      const maxR = maxRoundByDivision.get(item.match.divisionId || 'default') || 1;
      const roundStr = getAccurateRoundLabel(item.match, maxR);
      if (queueRoundFilter !== 'all' && roundStr !== queueRoundFilter) {
        return false;
      }
      return true;
    });
  }, [queueDivisionFilter, queueRoundFilter, unscheduledMatches, maxRoundByDivision]);

  const openAssignmentPicker = (courtId?: string, scheduledAt?: string, rowIndex?: number) => {
    setAssignmentSearch('');
    setPickerDivisionFilter('all');
    setPickerRoundFilter('all');
    setSelectedPickerMatchIds([]);

    if (selectionRange) {
      const startCourt = courts[selectionRange.startCourtIndex];
      const endCourt = courts[selectionRange.endCourtIndex];
      const rowInfo = timelineRows.rows[selectionRange.startRowIndex];
      const targetTime = rowInfo ? new Date(rowInfo.startTimestamp).toISOString() : scheduledAt || new Date().toISOString();

      const label =
        selectionRange.startCourtIndex === selectionRange.endCourtIndex
          ? startCourt?.courtName || 'Sân'
          : `${startCourt?.courtName || 'Sân'} → ${endCourt?.courtName || 'Sân'}`;

      setAssignmentPicker({
        startCourtIndex: selectionRange.startCourtIndex,
        endCourtIndex: selectionRange.endCourtIndex,
        startRowIndex: selectionRange.startRowIndex,
        endRowIndex: selectionRange.endRowIndex,
        courtName: label,
        scheduledAt: targetTime,
      });
      return;
    }

    const cIdx = courtId ? courts.findIndex((c) => c.id === courtId) : 0;
    const resolvedCourtIndex = cIdx >= 0 ? cIdx : 0;
    const resolvedRowIndex = typeof rowIndex === 'number' ? rowIndex : 0;
    const court = courts[resolvedCourtIndex];
    const rowInfo = timelineRows.rows[resolvedRowIndex];
    const targetTime = scheduledAt || (rowInfo ? new Date(rowInfo.startTimestamp).toISOString() : new Date().toISOString());

    setAssignmentPicker({
      startCourtIndex: resolvedCourtIndex,
      endCourtIndex: resolvedCourtIndex,
      startRowIndex: resolvedRowIndex,
      endRowIndex: resolvedRowIndex,
      courtName: court?.courtName || 'Sân',
      scheduledAt: targetTime,
    });
  };

  // Assign multiple matches in Row-Major order (Left-to-Right across courts, then down to next row)
  const handleAssignMultipleMatches = async () => {
    if (!assignmentPicker || selectedPickerMatchIds.length === 0) return;

    setIsSavingDraft(true);
    try {
      const newDrafts: Record<string, DraftAssignment> = {};
      let matchIdx = 0;

      const { startCourtIndex, endCourtIndex, startRowIndex } = assignmentPicker;

      // Iterate row-by-row, and within each row, fill left-to-right across courts
      let rIdx = startRowIndex;
      while (matchIdx < selectedPickerMatchIds.length && rIdx < timelineRows.rows.length) {
        const rowInfo = timelineRows.rows[rIdx];
        if (!rowInfo) break;
        const targetTime = new Date(rowInfo.startTimestamp).toISOString();

        for (let cIdx = startCourtIndex; cIdx <= endCourtIndex; cIdx++) {
          if (matchIdx >= selectedPickerMatchIds.length) break;
          const court = courts[cIdx];
          if (!court) continue;

          const matchId = selectedPickerMatchIds[matchIdx];
          const item = displayMatches.find((candidate) => candidate.match.id === matchId);
          if (!item) {
            matchIdx++;
            continue;
          }

          const duration = customMatchDurations[matchId] || item.durationMinutes || rowInfo.durationMinutes || defaultStepMinutes;

          newDrafts[matchId] = {
            courtId: court.id,
            scheduledAt: targetTime,
            durationMinutes: duration,
          };

          matchIdx++;
        }
        rIdx++;
      }

      setDraftAssignments((prev) => ({ ...prev, ...newDrafts }));
      pushHistory({ ...draftAssignments, ...newDrafts });
      setAssignmentPicker(null);
      setSelectedPickerMatchIds([]);
      setSelectionRange(null);
      setSaveToast(`Đã xếp ${matchIdx} trận theo thứ tự từ trái sang phải! Đang tự động lưu...`);
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
  const handleCellPointerDown = (courtIndex: number, rowIndex: number, e?: React.PointerEvent) => {
    if (e && e.button !== 0) return; // Only left click drags
    setIsSelecting(true);
    setDragAnchor({ courtIndex, rowIndex });
    setSelectionRange({
      startCourtIndex: courtIndex,
      endCourtIndex: courtIndex,
      startRowIndex: rowIndex,
      endRowIndex: rowIndex,
    });
  };

  const handleTimeRowPointerDown = (rowIndex: number, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setIsSelecting(true);
    setDragAnchor({ courtIndex: -1, rowIndex }); // -1 indicates row header selection
    setSelectionRange({
      startCourtIndex: 0,
      endCourtIndex: Math.max(0, courts.length - 1),
      startRowIndex: rowIndex,
      endRowIndex: rowIndex,
    });
  };

  const handleTimeRowPointerEnter = (rowIndex: number) => {
    if (!isSelecting || !dragAnchor) return;
    const minRow = Math.min(dragAnchor.rowIndex, rowIndex);
    const maxRow = Math.max(dragAnchor.rowIndex, rowIndex);
    setSelectionRange({
      startCourtIndex: 0,
      endCourtIndex: Math.max(0, courts.length - 1),
      startRowIndex: minRow,
      endRowIndex: maxRow,
    });
  };

  const handleCourtColPointerDown = (courtIndex: number, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setIsSelecting(true);
    setDragAnchor({ courtIndex, rowIndex: -1 }); // -1 indicates column header selection
    setSelectionRange({
      startCourtIndex: courtIndex,
      endCourtIndex: courtIndex,
      startRowIndex: 0,
      endRowIndex: Math.max(0, timelineRows.rows.length - 1),
    });
  };

  const handleCourtColPointerEnter = (courtIndex: number) => {
    if (!isSelecting || !dragAnchor) return;
    const minCourt = Math.min(dragAnchor.courtIndex, courtIndex);
    const maxCourt = Math.max(dragAnchor.courtIndex, courtIndex);
    setSelectionRange({
      startCourtIndex: minCourt,
      endCourtIndex: maxCourt,
      startRowIndex: 0,
      endRowIndex: Math.max(0, timelineRows.rows.length - 1),
    });
  };

  const handleCellPointerEnter = (courtIndex: number, rowIndex: number) => {
    if (!isSelecting || !dragAnchor) return;

    if (dragAnchor.courtIndex === -1) {
      // User started drag from Time Sidebar: select entire rows
      const minRow = Math.min(dragAnchor.rowIndex, rowIndex);
      const maxRow = Math.max(dragAnchor.rowIndex, rowIndex);
      setSelectionRange({
        startCourtIndex: 0,
        endCourtIndex: Math.max(0, courts.length - 1),
        startRowIndex: minRow,
        endRowIndex: maxRow,
      });
      return;
    }

    if (dragAnchor.rowIndex === -1) {
      // User started drag from Court Header: select entire columns
      const minCourt = Math.min(dragAnchor.courtIndex, courtIndex);
      const maxCourt = Math.max(dragAnchor.courtIndex, courtIndex);
      setSelectionRange({
        startCourtIndex: minCourt,
        endCourtIndex: maxCourt,
        startRowIndex: 0,
        endRowIndex: Math.max(0, timelineRows.rows.length - 1),
      });
      return;
    }

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

  // Multi-cell bulk schedule fill (Trái sang phải qua từng sân: Sân 1 -> Sân 2 -> Sân 3..., rồi mới xuống mốc giờ tiếp theo)
  const handleBulkScheduleSelection = async () => {
    if (!selectionRange) return;
    const unassignedList = [...unscheduledMatches];
    if (unassignedList.length === 0) {
      setSaveToast('Không còn trận đấu nào trong hàng chờ chưa xếp!');
      setTimeout(() => setSaveToast(null), 2500);
      return;
    }

    let unassignedIdx = 0;
    const newDrafts: Record<string, DraftAssignment> = {};

    for (let rIdx = selectionRange.startRowIndex; rIdx <= selectionRange.endRowIndex; rIdx++) {
      const rowInfo = timelineRows.rows[rIdx];
      if (!rowInfo) continue;
      const targetTime = new Date(rowInfo.startTimestamp).toISOString();

      for (let cIdx = selectionRange.startCourtIndex; cIdx <= selectionRange.endCourtIndex; cIdx++) {
        if (unassignedIdx >= unassignedList.length) break;
        const court = courts[cIdx];
        if (!court) continue;

        const targetMatch = unassignedList[unassignedIdx];
        const duration = customMatchDurations[targetMatch.match.id] || targetMatch.durationMinutes || rowInfo.durationMinutes || defaultStepMinutes;

        newDrafts[targetMatch.match.id] = {
          courtId: court.id,
          scheduledAt: targetTime,
          durationMinutes: duration,
        };
        unassignedIdx++;
      }
      if (unassignedIdx >= unassignedList.length) break;
    }

    setDraftAssignments((prev) => ({ ...prev, ...newDrafts }));
    pushHistory({ ...draftAssignments, ...newDrafts });
    setSaveToast(`Đã điền ${unassignedIdx} trận từ trái sang phải vào các sân! Đang tự động lưu...`);
    setTimeout(() => setSaveToast(null), 3000);
    setSelectionRange(null);
  };

  // Set duration of all matches / rows in the selection range
  const handleSetSelectionDuration = (durationMinutes: number) => {
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

    const newCustoms = { ...customMatchDurations };
    const newDrafts = { ...draftAssignments };

    for (const item of matchesInSelection) {
      newCustoms[item.match.id] = durationMinutes;
      newDrafts[item.match.id] = {
        courtId: item.courtId!,
        scheduledAt: item.scheduledAt!,
        durationMinutes,
      };
    }

    // Also update rowDurations for selected rows so the grid rows expand/contract accordingly
    const newRowDurations = { ...rowDurations };
    for (let r = selectionRange.startRowIndex; r <= selectionRange.endRowIndex; r++) {
      newRowDurations[r] = durationMinutes;
    }

    setCustomMatchDurations(newCustoms);
    setRowDurations(newRowDurations);
    setDraftAssignments(newDrafts);
    pushHistory(newDrafts);
    setSaveToast(`⏱️ Đã đặt thời lượng ${durationMinutes}p cho vùng chọn (${matchesInSelection.length} trận)!`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Canh đều thời gian các dòng được chọn (Distribute row durations evenly)
  const handleDistributeRowsEvenly = () => {
    if (!selectionRange) return;
    const rowCount = selectionRange.endRowIndex - selectionRange.startRowIndex + 1;
    if (rowCount <= 0) return;

    let totalDuration = 0;
    for (let r = selectionRange.startRowIndex; r <= selectionRange.endRowIndex; r++) {
      totalDuration += rowDurations[r] ?? defaultStepMinutes;
    }

    const evenDuration = Math.max(5, Math.floor(totalDuration / rowCount));

    setRowDurations((prev) => {
      const next = { ...prev };
      for (let r = selectionRange.startRowIndex; r <= selectionRange.endRowIndex; r++) {
        next[r] = evenDuration;
      }
      return next;
    });

    setSaveToast(`↕️ Đã canh đều các dòng trong vùng chọn (${evenDuration}p/dòng)!`);
    setTimeout(() => setSaveToast(null), 2500);
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
    const mTimestamp = matchDate.getTime();

    // In an Excel-like grid, map match directly to its precise Row Slot in timelineRows
    let matchingRow = timelineRows.rows.find(
      (r) => mTimestamp >= r.startTimestamp && mTimestamp < r.endTimestamp,
    );

    if (!matchingRow && timelineRows.rows.length > 0) {
      let minDiff = Infinity;
      for (const r of timelineRows.rows) {
        const diff = Math.abs(r.startTimestamp - mTimestamp);
        if (diff < minDiff) {
          minDiff = diff;
          matchingRow = r;
        }
      }
    }

    let matchRowIndex = matchingRow ? matchingRow.index : 0;
    if (!matchingRow && item.scheduledAt) {
      const matchMinutesFromStart =
        matchDate.getHours() * 60 + matchDate.getMinutes() - baseStartMinute;
      matchRowIndex = Math.max(
        0,
        Math.min(
          timelineRows.rows.length - 1,
          Math.round(matchMinutesFromStart / defaultStepMinutes),
        ),
      );
      matchingRow = timelineRows.rows[matchRowIndex] || timelineRows.rows[0];
    }
    if (!matchingRow) {
      matchingRow = timelineRows.rows[0];
    }

    const rowDuration = matchingRow.durationMinutes;
    const effectiveDuration =
      customMatchDurations[item.match.id] ??
      item.durationMinutes ??
      rowDurations[matchingRow.index] ??
      rowDuration;

    const cardTop = matchingRow.top + 2;
    const cardHeight = Math.max(48, effectiveDuration * currentPixelsPerMinute - 4);
    const matchTimeStr = formatMatchTime(item.scheduledAt) || matchingRow.startTimeStr;

    const boFormat = isFootball ? `${effectiveDuration}P` : getMatchBestOfFormat(item.match, division);

    const isCurrentlyResizing = matchCardResize?.matchId === item.match.id;
    const isCut = clipboard?.operation === 'cut' && clipboard.items.some((it) => it.matchId === item.match.id);

    const selMinC = selectionRange ? Math.min(selectionRange.startCourtIndex, selectionRange.endCourtIndex) : -1;
    const selMaxC = selectionRange ? Math.max(selectionRange.startCourtIndex, selectionRange.endCourtIndex) : -1;
    const selMinR = selectionRange ? Math.min(selectionRange.startRowIndex, selectionRange.endRowIndex) : -1;
    const selMaxR = selectionRange ? Math.max(selectionRange.startRowIndex, selectionRange.endRowIndex) : -1;

    const currentCourtIndex = courts.findIndex((c) => c.id === item.courtId);
    const isInsideSelection =
      Boolean(selectionRange) &&
      currentCourtIndex >= selMinC &&
      currentCourtIndex <= selMaxC &&
      matchRowIndex >= selMinR &&
      matchRowIndex <= selMaxR;

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
          const targetCIdx = courts.findIndex((c) => c.id === item.courtId);
          const isCurrentlyInside =
            Boolean(selectionRange) &&
            targetCIdx >= selMinC &&
            targetCIdx <= selMaxC &&
            matchRowIndex >= selMinR &&
            matchRowIndex <= selMaxR;

          if (!isCurrentlyInside && targetCIdx >= 0) {
            setSelectionRange({
              startCourtIndex: targetCIdx,
              endCourtIndex: targetCIdx,
              startRowIndex: matchRowIndex,
              endRowIndex: matchRowIndex,
            });
          }

          const hasMultiSelection = isCurrentlyInside && (selMinC !== selMaxC || selMinR !== selMaxR);

          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            courtId: item.courtId || '',
            courtName: courts.find((c) => c.id === item.courtId)?.courtName || 'Sân',
            courtIndex: targetCIdx >= 0 ? targetCIdx : 0,
            rowIndex: matchRowIndex,
            timeStr: matchTimeStr,
            matchId: hasMultiSelection ? undefined : item.match.id,
          });
        }}
        className={`group w-full rounded-xl border text-left transition-all cursor-pointer ${
          compact
            ? 'p-2.5 bg-white'
            : effectiveDuration >= 30
            ? 'absolute inset-x-1 z-10 overflow-hidden p-2.5 flex flex-col justify-between'
            : 'absolute inset-x-1 z-10 overflow-hidden p-1.5 flex flex-col justify-between'
        } ${
          isInsideSelection
            ? 'border-blue-600 bg-blue-50/95 ring-2 ring-blue-500 shadow-md z-20'
            : isCut
            ? 'opacity-40 border-dashed border-2 border-indigo-500 bg-indigo-50/80 animate-pulse'
            : isCompleted
            ? 'bg-slate-100/95 border-slate-300 text-slate-700 shadow-2xs'
            : isLive
            ? 'bg-amber-50/95 border-amber-400 text-amber-950 shadow-md ring-2 ring-amber-400/40'
            : 'bg-white border-slate-200 hover:border-blue-400 text-slate-900 shadow-xs'
        } ${
          item.isDraft && !isInsideSelection
            ? 'ring-2 ring-violet-400 border-violet-400 bg-violet-50/95'
            : item.isPreview && !isInsideSelection
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
                  isInsideSelection
                    ? 'text-blue-800 font-black'
                    : isCompleted
                    ? 'text-slate-600 font-bold'
                    : isFootball
                    ? 'text-emerald-700 font-black'
                    : 'text-blue-700 font-black'
                }`}
              >
                {(division?.name || (isFootball ? 'BÓNG ĐÁ' : 'NỘI DUNG')).toUpperCase()}
              </span>
              {isInsideSelection ? (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-blue-600 text-white shadow-2xs shrink-0">
                  ✓ Đã chọn
                </span>
              ) : (
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
              )}
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

          {/* Conflict Warning Badge if any */}
          {(() => {
            const conflicts = scheduleConflicts.get(item.match.id);
            if (!conflicts || conflicts.length === 0) return null;
            return (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100/95 border border-amber-300 text-[10px] font-black text-amber-900 shrink-0 pointer-events-auto cursor-pointer shadow-2xs hover:bg-amber-200 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setConflictsModalOpen(true);
                }}
                title={`⚠️ Cảnh báo trùng lịch VĐV "${conflicts[0].competitorName}" với ${conflicts[0].otherCourtName} (${conflicts[0].otherTimeStr})`}
              >
                <AlertTriangle className="h-3 w-3 text-amber-700 shrink-0" />
                <span className="truncate">Trùng VĐV: {conflicts[0].otherCourtName} ({conflicts[0].otherTimeStr})</span>
              </div>
            );
          })()}

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
    <section
      className={`relative w-full ${
        isLocalFullscreen
          ? 'fixed inset-0 z-50 bg-slate-100 p-3 flex flex-col overflow-hidden h-screen'
          : 'space-y-1.5 h-full flex flex-col'
      }`}
      aria-labelledby="schedule-board-title"
      ref={boardRef}
    >
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-2.5 shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* EXCEL HOME RIBBON TOOLBAR (Microsoft Excel / Google Sheets Inspired) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 shadow-xs backdrop-blur-xs">
        {/* Left: Functional Groups */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* GROUP 0: NGÀY THI ĐẤU (Interactive Date Selector) */}
          <div className="flex items-center gap-1 bg-slate-50/80 p-0.5 rounded-lg border border-slate-200/80">
            <label className="relative flex items-center gap-1.5 px-2 py-1 text-xs font-black text-slate-800 hover:bg-white rounded-md cursor-pointer transition-all border border-transparent hover:border-slate-300 hover:shadow-2xs">
              <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>{formatDateLabel(scheduleDate, locale)}</span>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setActiveDate(e.target.value);
                  }
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title="Bấm để chọn hoặc đổi ngày thi đấu"
              />
            </label>
            {availableScheduleDates.length > 1 && (
              <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1 ml-0.5">
                {availableScheduleDates.map((dStr, idx) => (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => setActiveDate(dStr)}
                    className={`h-6 px-2 rounded text-[11px] font-black transition-all cursor-pointer ${
                      scheduleDate === dStr
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-white'
                    }`}
                    title={dStr}
                  >
                    Ngày {idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* GROUP 1: LƯU & TỰ LƯU & LỊCH SỬ (File & History) */}
          <div className="flex items-center gap-1 bg-slate-50/80 p-0.5 rounded-lg border border-slate-200/80">
            <Button
              type="button"
              onClick={() => handleSaveAllDrafts(false)}
              disabled={isSavingDraft || pendingCount === 0}
              className={`h-7 px-2.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                pendingCount > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs animate-pulse'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
              }`}
              title="Lưu lịch thi đấu (Phím tắt: Ctrl + S)"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Lưu</span>
              {pendingCount > 0 && (
                <span className="rounded-full bg-blue-700 px-1 py-0.2 text-[9px] font-black text-white">
                  {pendingCount}
                </span>
              )}
            </Button>

            {/* Auto-Save Live Status Indicator */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold select-none shadow-2xs">
              {autoSaveStatus === 'saving' ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-amber-700 font-bold">Đang lưu...</span>
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

            {/* Undo / Redo buttons */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-white text-slate-700 disabled:opacity-30 cursor-pointer transition-colors"
              title="Hoàn tác (Ctrl + Z)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-white text-slate-700 disabled:opacity-30 cursor-pointer transition-colors"
              title="Làm lại (Ctrl + Y)"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* GROUP 2: BẢNG TẠM & CHỈNH SỬA (Clipboard: Cut, Copy, Paste) */}
          <div className="flex items-center gap-0.5 bg-slate-50/80 p-0.5 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={handleCut}
              className="h-7 px-2 flex items-center gap-1 rounded-md text-xs font-semibold hover:bg-white text-slate-700 transition-colors cursor-pointer"
              title="Cắt các ô/trận đã chọn (Ctrl + X)"
            >
              <Scissors className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Cắt</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="h-7 px-2 flex items-center gap-1 rounded-md text-xs font-semibold hover:bg-white text-slate-700 transition-colors cursor-pointer"
              title="Sao chép các ô/trận đã chọn (Ctrl + C)"
            >
              <Copy className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Chép</span>
            </button>
            <button
              type="button"
              onClick={handlePaste}
              disabled={!clipboard}
              className={`h-7 px-2 flex items-center gap-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                clipboard
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 shadow-2xs animate-pulse'
                  : 'text-slate-400 opacity-40 cursor-not-allowed'
              }`}
              title="Dán vào ô đã chọn (Ctrl + V)"
            >
              <Clipboard className="h-3.5 w-3.5" />
              <span>Dán{clipboard ? ` (${clipboard.items.length})` : ''}</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* GROUP 3: CÀI ĐẶT KHUNG GIỜ & THỂ THỨC (Dedicated Settings Button) */}
          <button
            type="button"
            onClick={() => {
              setTempStart(operatingStart);
              setTempEnd(operatingEnd);
              setTempStep(defaultStepMinutes);
              setTempMinutesPerSet(minutesPerSet);
              setTimeSettingsOpen(true);
            }}
            className="h-7 px-2.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group"
            title="Tùy chỉnh giờ mở sân, bước nhảy ô và thời lượng thi đấu theo set"
          >
            <Settings2 className="h-3.5 w-3.5 text-blue-600 group-hover:rotate-90 transition-transform duration-300" />
            <span>Cài đặt giờ</span>
            <span className="text-[10px] text-blue-700 font-black bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
              {operatingStart} – {operatingEnd} · {defaultStepMinutes}p/ô
            </span>
          </button>

          <div className="h-5 w-px bg-slate-200" />

          {/* GROUP 4: ĐIỀN LỊCH & HÀNG CHỜ (Scheduling & Queue) */}
          <div className="flex items-center gap-1">
            {/* Auto Schedule with Quick Round Menu */}
            <div className="relative flex items-center">
              <Button
                type="button"
                onClick={() => handleAutoScheduleAll()}
                disabled={unscheduledMatches.length === 0}
                className={`h-7 px-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                  unscheduledRounds.length > 1 ? 'rounded-l-lg rounded-r-none pr-1.5' : 'rounded-lg'
                }`}
                title="Tự động xếp toàn bộ các trận chưa xếp vào các ô sân trống"
              >
                <Zap className="h-3.5 w-3.5 text-amber-300" />
                <span>Tự động xếp</span>
                {unscheduledMatches.length > 0 && (
                  <span className="rounded-full bg-blue-500/90 px-1.5 py-0.2 text-[9px] font-black">
                    {unscheduledMatches.length}
                  </span>
                )}
              </Button>

              {unscheduledRounds.length > 1 && (
                <button
                  type="button"
                  onClick={() => setAutoScheduleMenuOpen((prev) => !prev)}
                  disabled={unscheduledMatches.length === 0}
                  className="h-7 px-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-r-lg border-l border-blue-500/80 flex items-center justify-center cursor-pointer disabled:opacity-40"
                  title="Chọn xếp nhanh theo từng vòng đấu cụ thể"
                >
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${autoScheduleMenuOpen ? 'rotate-90' : ''}`} />
                </button>
              )}

              {/* Round Dropdown Menu */}
              {autoScheduleMenuOpen && unscheduledRounds.length > 1 && (
                <div
                  className="absolute left-0 top-full mt-1 z-50 w-56 rounded-xl bg-white p-1.5 shadow-2xl border border-slate-200 text-xs animate-in fade-in zoom-in-95 duration-100 ring-1 ring-slate-900/5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2 py-1 border-b border-slate-100 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Tùy chọn tự động xếp
                  </div>
                  {/* Option 1: Only ready matches */}
                  <button
                    type="button"
                    onClick={() => {
                      handleAutoScheduleAll('all', true);
                      setAutoScheduleMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-700 font-bold transition-colors cursor-pointer text-left"
                  >
                    <span>⚡ Chỉ xếp trận sẵn sàng (Vòng 1 / Có VĐV)</span>
                  </button>

                  {/* Option 2: All rounds */}
                  <button
                    type="button"
                    onClick={() => {
                      handleAutoScheduleAll('all', false);
                      setAutoScheduleMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-blue-700 font-bold transition-colors cursor-pointer text-left"
                  >
                    <span>⚡ Xếp toàn bộ giải ({unscheduledMatches.length} trận)</span>
                  </button>

                  <div className="h-px bg-slate-100 my-1" />
                  <div className="px-2 py-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Theo từng vòng:
                  </div>
                  {unscheduledRounds.map((r) => (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() => {
                        handleAutoScheduleAll(r.label, false);
                        setAutoScheduleMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold transition-colors cursor-pointer text-left"
                    >
                      <span className="truncate">Xếp {r.label}</span>
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px] font-bold">
                        {r.count} trận
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Queue modal trigger */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setQueueOpen(true)}
              className="h-7 px-2.5 text-xs font-bold border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              <span>Hàng chờ</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                unscheduledMatches.length > 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600'
              }`}>
                {unscheduledMatches.length}
              </span>
            </Button>

            {/* AI Voice & Natural Language Command Button */}
            <button
              type="button"
              onClick={() => {
                setAiVoiceModalOpen(true);
                setAiVoiceInput('');
                setVoiceParsedResult(null);
                setVoiceError(null);
              }}
              className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shadow-blue-500/20 group"
              title="Ra lệnh xếp lịch bằng giọng nói AI hoặc văn bản tự nhiên"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300 group-hover:scale-110 transition-transform" />
              <span>Lệnh AI / Giọng nói</span>
            </button>

            {/* Conflict Warning Pill */}
            {scheduleConflicts.size > 0 && (
              <button
                type="button"
                onClick={() => setConflictsModalOpen(true)}
                className="h-7 px-2 text-xs font-bold bg-amber-50 border border-amber-300 text-amber-900 rounded-lg flex items-center gap-1 hover:bg-amber-100 transition-colors cursor-pointer animate-pulse"
                title="Có trận đấu bị trùng giờ VĐV ở các sân khác nhau. Bấm để xem chi tiết."
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span>{scheduleConflicts.size} trùng lịch</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Court Scrolling + Export, Print, Layout, Zoom, Fullscreen & Reset */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Quick Court Scroll Navigation Buttons (◀ Sân trước | Sân sau ▶) */}
          {courts.length > 1 && (
            <div className="flex items-center gap-0.5 bg-blue-50/80 border border-blue-200 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleScrollCourts('left')}
                className="h-6 px-2 rounded text-[11px] font-black text-blue-800 hover:bg-blue-600 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
                title="Cuộn ngang sang các sân trước (bên trái)"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Sân trước</span>
              </button>
              <button
                type="button"
                onClick={() => handleScrollCourts('right')}
                className="h-6 px-2 rounded text-[11px] font-black text-blue-800 hover:bg-blue-600 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
                title="Cuộn ngang sang các sân sau (bên phải)"
              >
                <span>Sân sau</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Export to Excel */}
          <Button
            type="button"
            variant="outline"
            onClick={handleExportExcel}
            disabled={scheduledMatches.length === 0}
            className="h-7 px-2 text-xs font-semibold border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
            title="Xuất lịch thi đấu theo sân ra file Excel (.CSV UTF-8)"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[11px] hidden sm:inline">Xuất Excel</span>
          </Button>

          {/* Print Schedule */}
          <Button
            type="button"
            variant="outline"
            onClick={handlePrintSchedule}
            disabled={scheduledMatches.length === 0}
            className="h-7 px-2 text-xs font-semibold border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
            title="In lịch thi đấu ra giấy hoặc lưu PDF"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-[11px] hidden sm:inline">In lịch</span>
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            type="button"
            variant="outline"
            onClick={handleToggleFullscreen}
            className={`h-7 px-2 text-xs font-semibold border-slate-200 rounded-lg flex items-center gap-1 cursor-pointer ${
              isLocalFullscreen ? 'bg-blue-50 text-blue-700 border-blue-300' : 'hover:bg-slate-50 text-slate-700'
            }`}
            title={isLocalFullscreen ? 'Thoát toàn màn hình (Esc)' : 'Mở toàn màn hình để dễ xếp lịch'}
          >
            {isLocalFullscreen ? <Minimize2 className="h-3.5 w-3.5 text-blue-600" /> : <Maximize2 className="h-3.5 w-3.5 text-slate-600" />}
            <span className="text-[11px] hidden sm:inline">{isLocalFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
          </Button>

          {/* Zoom Level Selector */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold text-slate-700">
            <span className="px-1.5 text-[10px] text-slate-400">Thu phóng:</span>
            {[0.8, 1.0, 1.25, 1.5].map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoomLevel(z)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
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
            className="h-7 px-2 text-xs font-semibold border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
            title="Đặt lại tất cả các mốc giờ về kích thước đều nhau"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="text-[11px]">Canh đều</span>
          </Button>

          {/* Clear All Schedule */}
          <Button
            type="button"
            variant="outline"
            onClick={handleClearAllSchedule}
            disabled={scheduledMatches.length === 0}
            className="h-7 px-2 text-xs font-semibold border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-lg cursor-pointer"
            title="Xóa toàn bộ lịch thi đấu"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {courts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
          Chưa có sân nào được thiết lập
        </div>
      ) : (
        <div
          ref={boardScrollContainerRef}
          onWheel={(e) => {
            if (e.shiftKey && boardScrollContainerRef.current) {
              boardScrollContainerRef.current.scrollLeft += e.deltaY;
            }
          }}
          className={`${
            isFullscreen || isLocalFullscreen
              ? 'flex-1 min-h-0'
              : 'h-[calc(100vh-210px)] min-h-[500px]'
          } overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xs select-none flex-1`}
          style={{
            scrollbarWidth: 'auto',
            scrollbarColor: '#94a3b8 #f1f5f9',
          }}
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

            {/* Court column headers: Drag or Click to Select Entire Column */}
            {courts.map((court, cIdx) => {
              const minC = selectionRange ? Math.min(selectionRange.startCourtIndex, selectionRange.endCourtIndex) : -1;
              const maxC = selectionRange ? Math.max(selectionRange.startCourtIndex, selectionRange.endCourtIndex) : -1;
              const isColSelected = Boolean(selectionRange) && cIdx >= minC && cIdx <= maxC;

              return (
                <div
                  key={court.id}
                  onPointerDown={(e) => handleCourtColPointerDown(cIdx, e)}
                  onPointerEnter={() => handleCourtColPointerEnter(cIdx)}
                  title={`Bấm hoặc kéo ngang để chọn cột ${court.courtName}`}
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
                const minR = selectionRange ? Math.min(selectionRange.startRowIndex, selectionRange.endRowIndex) : -1;
                const maxR = selectionRange ? Math.max(selectionRange.startRowIndex, selectionRange.endRowIndex) : -1;
                const isRowSelected = Boolean(selectionRange) && row.index >= minR && row.index <= maxR;

                return (
                  <React.Fragment key={row.index}>
                    {/* The Row Container: Drag or Click to Select Rows across all courts */}
                    <div
                      onPointerDown={(e) => handleTimeRowPointerDown(row.index, e)}
                      onPointerEnter={() => handleTimeRowPointerEnter(row.index)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectionRange({
                          startCourtIndex: 0,
                          endCourtIndex: Math.max(0, courts.length - 1),
                          startRowIndex: row.index,
                          endRowIndex: row.index,
                        });
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          courtId: courts[0]?.id || '',
                          courtName: 'Tất cả các sân',
                          courtIndex: 0,
                          rowIndex: row.index,
                          timeStr: row.startTimeStr,
                        });
                      }}
                      title={`Bấm hoặc kéo dọc để chọn hàng lúc ${row.startTimeStr} (Click phải để mở menu)`}
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
                    const minC = selectionRange ? Math.min(selectionRange.startCourtIndex, selectionRange.endCourtIndex) : -1;
                    const maxC = selectionRange ? Math.max(selectionRange.startCourtIndex, selectionRange.endCourtIndex) : -1;
                    const minR = selectionRange ? Math.min(selectionRange.startRowIndex, selectionRange.endRowIndex) : -1;
                    const maxR = selectionRange ? Math.max(selectionRange.startRowIndex, selectionRange.endRowIndex) : -1;

                    const isCellSelected =
                      Boolean(selectionRange) &&
                      courtIndex >= minC &&
                      courtIndex <= maxC &&
                      row.index >= minR &&
                      row.index <= maxR;

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
                          const isCurrentlyInside =
                            Boolean(selectionRange) &&
                            courtIndex >= minC &&
                            courtIndex <= maxC &&
                            row.index >= minR &&
                            row.index <= maxR;

                          if (!isCurrentlyInside) {
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

          {/* Round filters in Assignment Picker */}
          {unscheduledRounds.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 hide-scrollbar">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-0.5">Vòng:</span>
              <button
                type="button"
                onClick={() => setPickerRoundFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                  pickerRoundFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả vòng
              </button>
              {unscheduledRounds.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setPickerRoundFilter(r.label)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                    pickerRoundFilter === r.label
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r.label} ({r.count})
                </button>
              ))}
            </div>
          )}
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
                  : `Xếp ${selectedPickerMatchIds.length} trận (Trái sang phải)`}
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

              <div className="flex items-center gap-2">
                {unscheduledMatches.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (queueSelectedMatchIds.length === filteredQueueMatches.length) {
                        setQueueSelectedMatchIds([]);
                      } else {
                        setQueueSelectedMatchIds(filteredQueueMatches.map((m) => m.match.id));
                      }
                    }}
                    className="h-8 px-3 text-xs font-semibold rounded-lg border-slate-300 bg-white"
                  >
                    {queueSelectedMatchIds.length === filteredQueueMatches.length ? 'Bỏ chọn hết' : `Chọn tất cả (${filteredQueueMatches.length})`}
                  </Button>
                )}
              </div>
            </div>

            {/* Filter controls inside Queue */}
            <div className="space-y-1.5 pt-2">
              {/* Division filters */}
              {divisions.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-0.5">Nội dung:</span>
                  <button
                    type="button"
                    onClick={() => setQueueDivisionFilter('all')}
                    className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                      queueDivisionFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả ({unscheduledMatches.length})
                  </button>
                  {divisions.map((d) => {
                    const count = unscheduledMatches.filter((m) => m.match.divisionId === d.id).length;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setQueueDivisionFilter(d.id)}
                        className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                          queueDivisionFilter === d.id
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

              {/* Round filters */}
              {unscheduledRounds.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-0.5">Vòng:</span>
                  <button
                    type="button"
                    onClick={() => setQueueRoundFilter('all')}
                    className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                      queueRoundFilter === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả vòng
                  </button>
                  {unscheduledRounds.map((r) => (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() => setQueueRoundFilter(r.label)}
                      className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                        queueRoundFilter === r.label
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {r.label} ({r.count})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ModalHeader>

          {filteredQueueMatches.length > 0 ? (
            <div className="grid max-h-[50vh] gap-2 overflow-y-auto sm:grid-cols-2 py-2">
              {filteredQueueMatches.map((item) => {
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

      {/* POPUP MODAL: Cấu hình khung giờ & thể thức thi đấu riêng biệt */}
      <Modal open={timeSettingsOpen} onOpenChange={setTimeSettingsOpen}>
        <ModalContent className="max-w-lg rounded-2xl border border-slate-200 p-6 shadow-2xl">
          <ModalHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <ModalTitle className="text-base font-bold text-slate-900">
                  Cài đặt khung giờ &amp; Thể thức thi đấu
                </ModalTitle>
                <ModalDescription className="text-xs text-slate-500">
                  Tùy chỉnh giờ mở sân, bước nhảy ô trên bảng lịch và thời lượng theo từng thể thức
                </ModalDescription>
              </div>
            </div>
          </ModalHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* SECTION 1: KHUNG GIỜ MỞ SÂN */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>1. Khung giờ mở sân trong ngày</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Giờ bắt đầu</label>
                  <Input
                    type="time"
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                    className="h-9 text-xs rounded-lg border-slate-300 bg-white font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Giờ kết thúc</label>
                  <Input
                    type="time"
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                    className="h-9 text-xs rounded-lg border-slate-300 bg-white font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: BƯỚC NHẢY Ô TRÊN BẢNG LỊCH */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  <span>2. Bước nhảy ô thời gian (Mỗi ô trên bảng)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Tự nhập:</span>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={tempStep}
                    onChange={(e) => setTempStep(Math.max(5, Math.min(180, Number(e.target.value) || 15)))}
                    className="w-12 h-6 px-1 text-center text-xs font-black border border-slate-300 rounded bg-white text-blue-700"
                  />
                  <span className="text-[10px] text-slate-500 font-bold">phút</span>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-1.5 pt-1">
                {[10, 15, 20, 30, 45, 60].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setTempStep(step)}
                    className={`py-1.5 text-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      tempStep === step
                        ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {step}p
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500">
                💡 Khuyên dùng <strong>15p</strong> hoặc <strong>20p/ô</strong> để xếp lịch chuẩn xác và dễ nhìn.
              </p>
            </div>

            {/* SECTION 3: THỂ THỨC THI ĐẤU & SET */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span>3. Thời lượng theo Thể thức &amp; Set</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {tempMinutesPerSet}p / set
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[10, 15, 20, 25, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTempMinutesPerSet(mins)}
                    className={`py-1.5 text-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      tempMinutesPerSet === mins
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {mins}p/set
                  </button>
                ))}
              </div>

              {/* Format Preview Cards */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <span className="block text-[10px] font-black text-slate-400">BO1 (1 SET)</span>
                  <span className="text-xs font-black text-slate-900">{tempMinutesPerSet} phút</span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <span className="block text-[10px] font-black text-slate-400">BO3 (3 SETS)</span>
                  <span className="text-xs font-black text-slate-900">{tempMinutesPerSet * 3} phút</span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <span className="block text-[10px] font-black text-slate-400">BO5 (5 SETS)</span>
                  <span className="text-xs font-black text-slate-900">{tempMinutesPerSet * 5} phút</span>
                </div>
              </div>
            </div>
          </div>

          <ModalFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
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
                  setSaveToast('Đã áp dụng cấu hình khung giờ & thể thức mới!');
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

      {/* AI VOICE & NATURAL LANGUAGE SCHEDULING MODAL (SportO Brand Theme & Advanced NLP) */}
      <Modal open={aiVoiceModalOpen} onOpenChange={setAiVoiceModalOpen}>
        <ModalContent className="max-w-xl p-6 bg-white rounded-3xl shadow-2xl border border-slate-200">
          <ModalHeader className="border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <ModalTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  Lệnh Xếp Lịch Bằng Giọng Nói AI
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                    Voice &amp; NLP
                  </span>
                </ModalTitle>
                <ModalDescription className="text-xs text-slate-500">
                  Nói tiếng Việt hoặc gõ yêu cầu xếp lịch chi tiết theo giọng văn tự nhiên
                </ModalDescription>
              </div>
            </div>
          </ModalHeader>

          <div className="py-4 space-y-4">
            {/* Microphone Centerpiece with Soundwave Visualizer */}
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-linear-to-b from-blue-50/50 via-slate-50 to-blue-50/30 border border-blue-100/90 text-center relative overflow-hidden">
              <div className="relative flex items-center justify-center">
                {isVoiceListening && (
                  <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
                )}
                <button
                  type="button"
                  onClick={startVoiceRecognition}
                  disabled={isVoiceListening}
                  className={`h-20 w-20 rounded-full flex items-center justify-center shadow-xl transition-all cursor-pointer relative z-10 ${
                    isVoiceListening
                      ? 'bg-rose-600 text-white ring-8 ring-rose-500/30 scale-110 animate-pulse'
                      : 'bg-blue-600 hover:bg-blue-700 text-white ring-4 ring-blue-500/20 shadow-blue-600/30 hover:scale-105'
                  }`}
                  title={isVoiceListening ? 'Đang lắng nghe giọng nói của bạn...' : 'Bấm vào micro và nói câu lệnh bằng tiếng Việt'}
                >
                  <Mic className={`h-8 w-8 text-white ${isVoiceListening ? 'animate-bounce' : ''}`} />
                </button>
              </div>

              {/* Soundwave animation when recording */}
              {isVoiceListening && (
                <div className="flex items-center gap-1 mt-3.5 h-4">
                  {[40, 70, 100, 60, 90, 50, 80, 30].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-rose-500 rounded-full animate-pulse"
                      style={{ height: `${h}%`, animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </div>
              )}

              <div className="mt-3 space-y-0.5">
                <p className="text-xs font-bold text-slate-800">
                  {isVoiceListening ? '🔴 Đang lắng nghe... Hãy nói câu lệnh của bạn!' : 'Bấm vào micro để nói câu lệnh'}
                </p>
                <p className="text-[11px] text-slate-400 font-medium">
                  (Hoặc gõ/chỉnh sửa văn bản ở ô bên dưới)
                </p>
              </div>

              {voiceError && (
                <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium max-w-sm">
                  {voiceError}
                </div>
              )}
            </div>

            {/* Natural Language Text Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Nội dung câu lệnh:</span>
                {aiVoiceInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setAiVoiceInput('');
                      setVoiceParsedResult(null);
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                  >
                    Xóa
                  </button>
                )}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  value={aiVoiceInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAiVoiceInput(val);
                    if (val.trim()) {
                      const parsed = parseVoiceSchedulingCommand(val);
                      setVoiceParsedResult(parsed);
                    } else {
                      setVoiceParsedResult(null);
                    }
                  }}
                  placeholder="Ví dụ: 1 set 15p, 3 set 40p, cách nhau 5p nghỉ ngơi, vòng 1/32 ngày 30/8 từ 8h trên sân 1-4..."
                  className="h-10 text-xs rounded-xl bg-white border-slate-300 font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs focus-visible:ring-blue-500"
                />
                <Button
                  type="button"
                  disabled={!aiVoiceInput.trim()}
                  onClick={() => {
                    const parsed = parseVoiceSchedulingCommand(aiVoiceInput);
                    setVoiceParsedResult(parsed);
                  }}
                  className="h-10 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs shadow-blue-500/20"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Hidden / Subtle Hint Box (Thay thế các nút bấm gợi ý tĩnh) */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-700">💡 Cấu trúc câu lệnh mẫu: </span>
              <span className="text-slate-500 italic">
                &ldquo;1 set 15p, 3 set 40p, cách nhau 5p nghỉ ngơi, vòng 1/32 ngày 30/8 từ 8h trên sân 1-4, tứ kết và bán kết ngày 31/8 từ 14h&rdquo;
              </span>
            </div>

            {/* AI Evaluation & Action Plan Preview Card */}
            {voiceParsedResult && (
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/90 space-y-3 animate-in fade-in zoom-in-95 duration-150 shadow-2xs">
                <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-blue-950">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span>Đánh Giá Kế Hoạch &amp; Chỉ Số AI</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                    {voiceParsedResult.intent.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs font-semibold text-blue-900 bg-white/95 p-3 rounded-xl border border-blue-100 leading-relaxed shadow-2xs">
                  {voiceParsedResult.description}
                </p>

                {/* AI Evaluation Metrics Breakdown */}
                {voiceParsedResult.evaluation && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2 rounded-lg bg-white/90 border border-blue-100 flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Trận đấu khớp</span>
                        <span className="text-xs font-black text-blue-900">
                          {voiceParsedResult.evaluation.totalMatchesCount} trận
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/90 border border-blue-100 flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Phân bổ sân</span>
                        <span className="text-xs font-black text-blue-900">
                          {voiceParsedResult.evaluation.courtCount} sân ({voiceParsedResult.evaluation.courtEfficiencyPercent}%)
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/90 border border-blue-100 flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Khung giờ dự kiến</span>
                        <span className="text-xs font-black text-blue-900">
                          {voiceParsedResult.evaluation.estimatedStartStr} → {voiceParsedResult.evaluation.estimatedEndStr}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/90 border border-blue-100 flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Nghỉ giữa trận</span>
                        <span className="text-xs font-black text-blue-900">
                          {voiceParsedResult.evaluation.restBufferMinutes > 0 ? `${voiceParsedResult.evaluation.restBufferMinutes} phút` : 'Chuyển sân liên tục'}
                        </span>
                      </div>
                    </div>

                    {/* Safety & Compliance Audit */}
                    <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 space-y-1">
                      <div className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                        <span>🛡️ Đánh giá an toàn &amp; Thứ tự giải đấu:</span>
                      </div>
                      {voiceParsedResult.evaluation.safetyChecks.map((check, idx) => (
                        <p key={idx} className="text-[10px] font-medium text-emerald-800 pl-1">
                          {check}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <ModalFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAiVoiceModalOpen(false)}
              className="h-9 text-xs font-semibold cursor-pointer rounded-xl border-slate-300"
            >
              Đóng
            </Button>
            <Button
              type="button"
              disabled={!voiceParsedResult}
              onClick={() => {
                if (voiceParsedResult) {
                  handleExecuteVoiceCommand(voiceParsedResult);
                }
              }}
              className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
            >
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              <span>⚡ Thực hiện lệnh này</span>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* MINIMALIST & LUXURIOUS DESKTOP CONTEXT MENU (Anti-Slop, Clean Typography, Tuân thủ taste-skill) */}
      {contextMenu && (() => {
        const targetMatch = contextMenu.matchId ? displayMatches.find((m) => m.match.id === contextMenu.matchId) : undefined;
        const menuX = Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 270 : contextMenu.x);
        const menuY = Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 480 : contextMenu.y);

        const selMinC = selectionRange ? Math.min(selectionRange.startCourtIndex, selectionRange.endCourtIndex) : -1;
        const selMaxC = selectionRange ? Math.max(selectionRange.startCourtIndex, selectionRange.endCourtIndex) : -1;
        const selMinR = selectionRange ? Math.min(selectionRange.startRowIndex, selectionRange.endRowIndex) : -1;
        const selMaxR = selectionRange ? Math.max(selectionRange.startRowIndex, selectionRange.endRowIndex) : -1;

        const isMultiSelection = Boolean(
          selectionRange && (selMinC !== selMaxC || selMinR !== selMaxR)
        );

        const selectedMatchesList = isMultiSelection ? getSelectedMatchesInGrid() : [];

        return (
          <div
            className="fixed z-50 w-[270px] rounded-2xl bg-white/98 text-slate-900 p-1.5 shadow-2xl shadow-slate-900/15 border border-slate-200/90 text-xs select-none ring-1 ring-slate-950/5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
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
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 rounded-xl mb-1 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {isMultiSelection && selectionRange
                    ? `Vùng chọn (${selMaxC - selMinC + 1} sân × ${selMaxR - selMinR + 1} ô)`
                    : contextMenu.courtName}
                </p>
                <p className="text-xs font-black text-slate-900 truncate">
                  {isMultiSelection && selectionRange
                    ? `${timelineRows.rows[selMinR]?.startTimeStr} → ${timelineRows.rows[selMaxR]?.endTimeStr}${selectedMatchesList.length > 0 ? ` (${selectedMatchesList.length} trận)` : ''}`
                    : contextMenu.timeStr}
                </p>
              </div>
              {targetMatch && (
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black border border-blue-200/80">
                  #{targetMatch.match.matchOrder || targetMatch.match.id.slice(-3)}
                </span>
              )}
            </div>

            <div className="space-y-0.5">
              {/* Case 1: Right-clicked on an existing Match Card */}
              {targetMatch ? (
                <>
                  {/* Primary: View / Score */}
                  <button
                    type="button"
                    onClick={() => {
                      onOpenMatch(targetMatch.match.id);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-blue-50/70 hover:bg-blue-100 text-blue-800 transition-colors cursor-pointer text-left font-bold"
                  >
                    <span className="flex items-center gap-2">
                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                      Xem &amp; Nhập tỉ số
                    </span>
                    <ExternalLink className="h-3 w-3 text-blue-500" />
                  </button>

                  {/* Cut match */}
                  <button
                    type="button"
                    onClick={() => {
                      handleCut();
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-left font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Scissors className="h-3.5 w-3.5 text-slate-400" />
                      Cắt trận
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Ctrl+X</span>
                  </button>

                  {/* Copy match */}
                  <button
                    type="button"
                    onClick={() => {
                      handleCopy();
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-left font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      Sao chép trận
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Ctrl+C</span>
                  </button>

                  <div className="h-px bg-slate-100 my-1" />

                  {/* Duration Quick Picker */}
                  <div className="px-2.5 py-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
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
                            (customMatchDurations[targetMatch.match.id] || targetMatch.durationMinutes) === dur
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
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Chuyển sang sân:
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto">
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
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-200 cursor-pointer transition-colors"
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
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left font-bold"
                  >
                    <span className="flex items-center gap-2">
                      <Trash2 className="h-3.5 w-3.5" />
                      Hủy xếp (Đưa về hàng chờ)
                    </span>
                    <span className="text-[10px] font-mono text-rose-400 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">Del</span>
                  </button>
                </>
              ) : isMultiSelection && selectionRange ? (
                /* Case 2: Right-clicked on a Multi-Cell Range */
                <>
                  {/* 1. Quick Fill Left-to-Right */}
                  <button
                    type="button"
                    disabled={unscheduledMatches.length === 0}
                    onClick={() => {
                      handleBulkScheduleSelection();
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-blue-50/70 hover:bg-blue-100 text-blue-800 font-bold transition-colors cursor-pointer text-left disabled:opacity-40"
                  >
                    <span className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-blue-600" />
                      Điền nhanh ({unscheduledMatches.length} trận)
                    </span>
                    <span className="text-[10px] text-blue-600 bg-blue-100/80 px-1.5 py-0.5 rounded font-semibold">
                      Trái → Phải
                    </span>
                  </button>

                  {/* 2. Choose matches for selection */}
                  <button
                    type="button"
                    onClick={() => {
                      openAssignmentPicker();
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-800 font-semibold transition-colors cursor-pointer text-left"
                  >
                    <Plus className="h-3.5 w-3.5 text-blue-600" />
                    Chọn danh sách trận xếp vào...
                  </button>

                  {/* 3. Cut selection */}
                  <button
                    type="button"
                    onClick={() => {
                      handleCut();
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-left font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Scissors className="h-3.5 w-3.5 text-slate-400" />
                      Cắt các trận đã chọn
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Ctrl+X</span>
                  </button>

                  {/* 4. Copy selection */}
                  <button
                    type="button"
                    onClick={() => {
                      handleCopy();
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-left font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      Sao chép các trận
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Ctrl+C</span>
                  </button>

                  {/* 5. Paste if clipboard exists */}
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

                  <div className="h-px bg-slate-100 my-1" />

                  {/* Batch Duration Picker */}
                  <div className="px-2.5 py-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Đặt thời lượng cả vùng:
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {[15, 30, 45, 60].map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => {
                            handleSetSelectionDuration(dur);
                            setContextMenu(null);
                          }}
                          className="py-1 rounded text-[11px] font-bold border transition-all cursor-pointer text-center bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200"
                        >
                          {dur}p
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Move selection to another court */}
                  {courts.length > 1 && (
                    <div className="px-2.5 py-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Chuyển tất cả sang sân:
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto">
                        {courts.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              handleMoveSelectionToCourt(c.id);
                              setContextMenu(null);
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-200 cursor-pointer transition-colors"
                          >
                            {c.courtName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="h-px bg-slate-100 my-1" />

                  {/* 6. Distribute rows evenly */}
                  <button
                    type="button"
                    onClick={() => {
                      handleDistributeRowsEvenly();
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-left font-medium"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                    Canh đều thời lượng các dòng
                  </button>

                  {/* 7. Lock slots */}
                  <button
                    type="button"
                    onClick={() => {
                      handleBlockSelection();
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-left font-medium"
                  >
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    Khóa các khung giờ trong vùng chọn
                  </button>

                  <div className="h-px bg-slate-100 my-1" />

                  {/* 8. Delete / Unassign */}
                  <button
                    type="button"
                    onClick={() => {
                      handleClearSelectionMatches();
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left font-bold"
                  >
                    <span className="flex items-center gap-2">
                      <Trash2 className="h-3.5 w-3.5" />
                      Gỡ các trận trong vùng chọn
                    </span>
                    <span className="text-[10px] font-mono text-rose-400 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">Del</span>
                  </button>
                </>
              ) : (
                /* Case 3: Right-clicked on a single Empty Slot */
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
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-blue-50/70 hover:bg-blue-100 text-blue-800 transition-colors cursor-pointer text-left font-bold"
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
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-left font-medium disabled:opacity-40"
                  >
                    <span className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      Xếp 1 trận tiếp theo
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
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
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* POPUP MODAL: Danh sách xung đột trùng giờ VĐV */}
      <Modal open={conflictsModalOpen} onOpenChange={setConflictsModalOpen}>
        <ModalContent className="max-w-xl rounded-xl border border-slate-200">
          <ModalHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <ModalTitle className="text-base font-bold text-slate-900">
                  Cảnh báo trùng lịch thi đấu ({scheduleConflicts.size} trận)
                </ModalTitle>
                <ModalDescription className="text-xs text-slate-500">
                  Các VĐV / cặp đấu sau đây bị xếp thi đấu trong các khung giờ sát nhau hoặc trùng giờ ở 2 sân khác nhau
                </ModalDescription>
              </div>
            </div>
          </ModalHeader>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto p-1">
            {Array.from(scheduleConflicts.entries()).map(([matchId, conflictList]) => {
              const currentMatch = displayMatches.find((m) => m.match.id === matchId);
              const courtName = courts.find((c) => c.id === currentMatch?.courtId)?.courtName || 'Sân hiện tại';
              const timeStr = formatMatchTime(currentMatch?.scheduledAt);

              return (
                <div key={matchId} className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                    <span>{courtName} ({timeStr})</span>
                    <span className="text-[11px] font-medium text-amber-800">
                      {currentMatch?.match.participant1?.teamName || 'VĐV 1'} vs {currentMatch?.match.participant2?.teamName || 'VĐV 2'}
                    </span>
                  </div>
                  {conflictList.map((c, idx) => (
                    <div key={idx} className="text-xs text-slate-700 flex items-center gap-1.5 pl-2 border-l-2 border-amber-400">
                      <span>⚠️ VĐV <strong>&quot;{c.competitorName}&quot;</strong> cũng đang có lịch đấu tại <strong>{c.otherCourtName}</strong> lúc <strong>{c.otherTimeStr}</strong></span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <ModalFooter className="border-t border-slate-100 pt-3">
            <ModalClose asChild>
              <Button type="button" variant="outline" className="w-full text-xs font-semibold">
                Đã hiểu & Đóng
              </Button>
            </ModalClose>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </section>
  );
}
