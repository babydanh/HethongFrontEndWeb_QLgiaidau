'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Trophy,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Search,
  Flame,
  Layers,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';
import type { BracketMatch, Tournament, Division } from '@/features/tournaments/api';
import { useTranslations } from 'next-intl';

export interface PublicCourtItem {
  id: string;
  courtName: string;
  venueName?: string;
  status?: string;
}

interface PublicCourtScheduleBoardProps {
  tournament: Tournament;
  matches: BracketMatch[];
  courts?: PublicCourtItem[];
  divisions?: Division[];
  selectedDivisionId?: string;
  onOpenMatchDetail?: (match: BracketMatch) => void;
  onSwitchToList?: () => void;
  isLoading?: boolean;
}

const BASE_PIXELS_PER_MINUTE = 9.6; // 1 minute = 9.6px (15 mins = 144px height)

function getLocalDateString(isoString?: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeLabel(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatMatchTime(isoString?: string | null): string {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '--:--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

function formatDayLabel(dateStr: string): string {
  if (!dateStr) return 'Ngày thi đấu';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(dateObj);
  return `${weekday}, ${d}/${m}/${y}`;
}

function getParticipantPlayers(p?: { teamName?: string | null; name?: string | null } | null): string[] {
  if (!p) return [];
  const full = (p.teamName || p.name || '').trim();
  if (!full) return [];
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
    divName.includes('futsal');

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

interface CompetitorDisplayData {
  avatars: Array<{ initial: string; bg: string; imgUrl?: string }>;
  displayLabel: string;
  fullName: string;
}

function formatCompetitorDisplay(
  p?: { teamName?: string | null; name?: string | null; logo?: string | null; avatarUrl?: string | null; avatar?: string | null } | null,
  isFootball = false,
  isSingles = false,
): CompetitorDisplayData {
  if (!p) {
    return {
      avatars: [{ initial: '?', bg: 'bg-slate-100 border-slate-300 text-slate-600' }],
      displayLabel: 'Chờ xác định',
      fullName: 'Chờ xác định',
    };
  }

  const rawFull = (p.teamName || p.name || 'Chờ xác định').trim();
  const rawLogo = p.logo || p.avatarUrl || p.avatar || undefined;

  if (isFootball) {
    const words = rawFull.split(/\s+/).filter(Boolean);
    const shortLabel = words.length > 3 ? words.slice(-2).join(' ') : rawFull;
    const initial =
      words.length >= 2
        ? (words[0][0] + words[1][0]).toUpperCase()
        : rawFull.slice(0, 2).toUpperCase();

    return {
      avatars: [{ initial, bg: 'bg-emerald-100 border-emerald-300 text-emerald-800', imgUrl: rawLogo }],
      displayLabel: shortLabel,
      fullName: rawFull,
    };
  }

  if (isSingles) {
    const shortName = getShortTwoWords(rawFull);
    const initial = shortName.charAt(0).toUpperCase();

    return {
      avatars: [{ initial, bg: 'bg-blue-100 border-blue-300 text-blue-800', imgUrl: rawLogo }],
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
    avatars: [{ initial: shortName.charAt(0).toUpperCase(), bg: 'bg-blue-100 border-blue-300 text-blue-800', imgUrl: rawLogo }],
    displayLabel: shortName,
    fullName: rawFull,
  };
}

function getCompetitorDisplayName(participant?: { teamName?: string | null; name?: string | null; placeholder?: string | null } | null): string {
  if (!participant) return 'Chờ xác định';
  return participant.teamName || participant.name || participant.placeholder || 'Chờ xác định';
}

function getMatchBestOfFormat(match: BracketMatch, division?: { name?: string; roundConfig?: unknown } | null): string {
  const m = match as unknown as Record<string, unknown>;
  const matchConfig = (m.matchConfig || m.rules || {}) as Record<string, unknown>;
  const roundConfig = (division?.roundConfig || {}) as Record<string, unknown>;

  const setsToWin = Number(matchConfig.setsToWin ?? matchConfig.sets_to_win ?? 0);
  const bestOf = Number(matchConfig.bestOf ?? matchConfig.best_of ?? roundConfig.bestOf ?? roundConfig.best_of ?? 0);

  if (bestOf === 5 || setsToWin === 3) return 'BO5';
  if (bestOf === 3 || setsToWin === 2) return 'BO3';
  return 'BO1';
}

function extractSetScores(match: BracketMatch) {
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

function getAccurateRoundLabel(match: BracketMatch, maxRound = 1): string {
  const m = match as unknown as Record<string, unknown>;
  const rawRoundName = String(m.roundName || m.stageName || match.stage?.name || m.stageType || '').trim();
  const lowerName = rawRoundName.toLowerCase();
  const bracketCode = String(m.bracketCode || m.bracket_code || m.branch || m.bracket || '').toLowerCase();

  // 1. Check if Grand Final
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
  const groupName = (m.groupName as string) || (lowerName.includes('bảng') ? rawRoundName : '');
  if (groupName || lowerName.includes('group') || lowerName.includes('vòng bảng')) {
    const cleanGroup = (groupName || rawRoundName)
      .replace(/giai\s*đoạn\s*\d*/gi, '')
      .replace(/stage\s*\d*/gi, '')
      .replace(/vòng\s*bảng\s*/gi, '')
      .replace(/bảng\s*/gi, '')
      .replace(/group\s*/gi, '')
      .trim();
    const legNum = (m.leg as number) || match.roundNumber;
    if (legNum) {
      return `${cleanGroup.toUpperCase()} ${legNum}`;
    }
    return cleanGroup.toUpperCase() || 'A 1';
  }

  const rNum = (match.roundNumber as number) || 1;

  // 4. Check Double Elimination: Winners Bracket
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

  // 5. Check Double Elimination: Losers Bracket
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

  // 7. Clean custom name
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

  return `VÒNG ${rNum}`;
}

export default function PublicCourtScheduleBoard({
  tournament,
  matches,
  courts: initialCourts = [],
  divisions = [],
  onOpenMatchDetail,
  onSwitchToList,
}: PublicCourtScheduleBoardProps) {
  const translate = useTranslations('TournamentDetail');
  const matchTranslate = useTranslations('Match');

  // 1. Resolve Tournament Schedule Settings
  const tournamentConfig = (tournament.tournamentConfig || {}) as Record<string, unknown>;
  const configuredOperatingStart = String(tournamentConfig.operatingStart || (tournament as unknown as Record<string, unknown>).operatingStart || '08:00');
  const configuredOperatingEnd = String(tournamentConfig.operatingEnd || (tournament as unknown as Record<string, unknown>).operatingEnd || '22:00');
  const configuredStepMinutes = Number(tournamentConfig.stepMinutes || tournamentConfig.gridIncrementMinutes) || 15;
  const configuredMinutesPerSet = Number(tournamentConfig.minutesPerSet) || 15;

  const [stepMinutes, setStepMinutes] = useState<number>(configuredStepMinutes);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [activeDate, setActiveDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Compute maximum round to accurately name knockout rounds
  const maxRound = useMemo(() => {
    let max = 1;
    for (const m of matches) {
      const r = (m.roundNumber as number) || (m as unknown as { round_number?: number }).round_number || 1;
      if (r > max) max = r;
    }
    return max;
  }, [matches]);

  // 2. Extract Real Courts from settings, props, or matches
  const resolvedCourts = useMemo<PublicCourtItem[]>(() => {
    const map = new Map<string, PublicCourtItem>();

    for (const c of initialCourts) {
      if (c && c.id) {
        map.set(c.id, {
          id: c.id,
          courtName: c.courtName || `Sân ${map.size + 1}`,
          venueName: c.venueName || (tournament as unknown as { venueName?: string })?.venueName || tournament.locationAddress || undefined,
        });
      }
    }

    for (const m of matches) {
      if (m.courtId && !map.has(m.courtId)) {
        map.set(m.courtId, {
          id: m.courtId,
          courtName: m.courtName || m.courtAddress || `Sân ${map.size + 1}`,
          venueName: (tournament as unknown as { venueName?: string })?.venueName || tournament.locationAddress || undefined,
        });
      }
    }

    const list = Array.from(map.values());
    if (list.length > 0) return list;

    const defaultVenue = (tournament as unknown as { venueName?: string })?.venueName || tournament.locationAddress || 'Sân thi đấu';
    return [
      { id: 'court-1', courtName: 'DANH', venueName: defaultVenue },
      { id: 'court-2', courtName: 'DAN2', venueName: defaultVenue },
      { id: 'court-3', courtName: 'SÂN 3', venueName: defaultVenue },
      { id: 'court-4', courtName: 'SÂN 4', venueName: defaultVenue },
      { id: 'court-5', courtName: 'SÂN 5', venueName: defaultVenue },
      { id: 'court-6', courtName: 'SÂN 6', venueName: defaultVenue },
    ];
  }, [initialCourts, matches, tournament]);

  // 3. Extract Schedule Dates (Only dates with scheduled matches or tournament dates)
  const availableScheduleDates = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const m of matches) {
      if (m.scheduledAt) {
        const dStr = getLocalDateString(m.scheduledAt);
        if (dStr) set.add(dStr);
      }
    }
    if (set.size === 0 && tournament.startDate) {
      const startD = getLocalDateString(tournament.startDate);
      if (startD) set.add(startD);
    }
    if (set.size === 0 && tournament.endDate) {
      const endD = getLocalDateString(tournament.endDate);
      if (endD) set.add(endD);
    }

    const sorted = Array.from(set).sort();
    if (sorted.length > 0) return sorted;
    return [getLocalDateString(new Date().toISOString())];
  }, [matches, tournament.startDate, tournament.endDate]);

  // Default active date: prioritize date that has matches
  useEffect(() => {
    if (!activeDate && availableScheduleDates.length > 0) {
      const matchWithDate = matches.find((m) => m.scheduledAt);
      if (matchWithDate?.scheduledAt) {
        const matchD = getLocalDateString(matchWithDate.scheduledAt);
        if (matchD && availableScheduleDates.includes(matchD)) {
          setActiveDate(matchD);
          return;
        }
      }
      setActiveDate(availableScheduleDates[0]);
    }
  }, [activeDate, availableScheduleDates, matches]);

  // 4. Split matches into Scheduled vs Unscheduled
  const { scheduledMatchesForDate, unscheduledMatches, matchesByDateCount } = useMemo(() => {
    const scheduled: BracketMatch[] = [];
    const unscheduled: BracketMatch[] = [];
    const countMap: Record<string, number> = {};

    for (const d of availableScheduleDates) {
      countMap[d] = 0;
    }

    for (const m of matches) {
      if (m.scheduledAt && m.courtId) {
        const dStr = getLocalDateString(m.scheduledAt);
        if (countMap[dStr] !== undefined) {
          countMap[dStr]++;
        }
        if (dStr === activeDate) {
          scheduled.push(m);
        }
      } else {
        unscheduled.push(m);
      }
    }

    return {
      scheduledMatchesForDate: scheduled,
      unscheduledMatches: unscheduled,
      matchesByDateCount: countMap,
    };
  }, [matches, activeDate, availableScheduleDates]);

  // 5. Operating Window & Grid Metrics (Start at 08:00 to 22:00)
  const [startH] = configuredOperatingStart.split(':').map(Number);
  const [endH] = configuredOperatingEnd.split(':').map(Number);
  const operatingStartHour = Number.isFinite(startH) ? startH : 8;
  const operatingEndHour = (Number.isFinite(endH) && endH > 0) ? (endH === 0 ? 24 : endH) : 22;

  const currentPixelsPerMinute = BASE_PIXELS_PER_MINUTE * zoomLevel;
  const cellHeight = Math.round(stepMinutes * currentPixelsPerMinute);

  const totalSlots = Math.max(1, Math.floor(((operatingEndHour - operatingStartHour) * 60) / stepMinutes));
  const timeSlots = useMemo(() => {
    const slots: Array<{ label: string; hour: number; minute: number; isHour: boolean; topPx: number }> = [];
    for (let i = 0; i < totalSlots; i++) {
      const totalMin = operatingStartHour * 60 + i * stepMinutes;
      const hour = Math.floor(totalMin / 60);
      const minute = totalMin % 60;
      slots.push({
        label: formatTimeLabel(hour, minute),
        hour,
        minute,
        isHour: minute === 0,
        topPx: i * cellHeight,
      });
    }
    return slots;
  }, [totalSlots, operatingStartHour, stepMinutes, cellHeight]);

  const gridTotalHeight = totalSlots * cellHeight;

  // 6. Navigation Controls
  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const offset = direction === 'left' ? -380 : 380;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.max(0.7, Math.min(1.4, Math.round((prev + delta) * 10) / 10)));
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const queryLower = searchQuery.trim().toLowerCase();

  const filteredUnscheduledMatches = useMemo(() => {
    if (!queryLower) return unscheduledMatches;
    return unscheduledMatches.filter((m) => {
      const p1 = getCompetitorDisplayName(m.participant1).toLowerCase();
      const p2 = getCompetitorDisplayName(m.participant2).toLowerCase();
      return p1.includes(queryLower) || p2.includes(queryLower);
    });
  }, [unscheduledMatches, queryLower]);

  // Compute dynamic match duration based on settings or matchConfig
  const resolveMatchDuration = (match: BracketMatch) => {
    const mRaw = match as unknown as Record<string, unknown>;
    if (typeof mRaw.durationMinutes === 'number' && mRaw.durationMinutes > 0) {
      return mRaw.durationMinutes;
    }
    if (match.matchConfig && typeof match.matchConfig.durationMinutes === 'number' && match.matchConfig.durationMinutes > 0) {
      return match.matchConfig.durationMinutes;
    }
    const matchDivId = String(mRaw.divisionId || '');
    const div = divisions.find((d) => d.id === matchDivId);
    const setsToWin = div?.roundConfig?.setsToWin;
    const sets = div?.roundConfig?.max_sets || (setsToWin ? (setsToWin * 2 - 1) : 1);
    if (sets === 1) return configuredMinutesPerSet;
    if (sets === 3) return configuredMinutesPerSet * 3 + 5;
    return configuredStepMinutes;
  };

  return (
    <div
      ref={containerRef}
      className={`isolate flex flex-col bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs relative z-0 ${
        isFullscreen ? 'fixed inset-0 !z-50 p-4 bg-white rounded-none border-none' : 'w-full'
      }`}
    >
      {/* ── 1. TOP TOOLBAR RIBBON (Date, Step Switcher, Search, Zoom, Fullscreen) ── */}
      <div className="p-2.5 sm:p-3 border-b border-slate-200/90 bg-white flex flex-col gap-2.5 relative z-10">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Left: View Mode Pills + Date Selector Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {onSwitchToList && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{translate('viewModeTimeline')}</span>
                </button>
                <button
                  type="button"
                  onClick={onSwitchToList}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>{translate('viewModeList')}</span>
                </button>
              </div>
            )}

            {/* Date Selector Pills (Only dates with matches) */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-[480px] p-0.5 scrollbar-none">
              {availableScheduleDates.map((dateStr) => {
                const isActive = dateStr === activeDate;
                const matchCount = matchesByDateCount[dateStr] || 0;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setActiveDate(dateStr)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200'
                    }`}
                  >
                    <Calendar className="h-3 w-3" />
                    <span>{formatDayLabel(dateStr)}</span>
                    {matchCount > 0 && (
                      <span className={`px-1 py-0.2 rounded text-[10px] font-black ${isActive ? 'bg-blue-500/80 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {matchCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Step Interval, Search, Zoom Controls, Navigation, Fullscreen */}
          <div className="flex items-center gap-1.5 flex-wrap ml-auto">
            {/* Step Interval Switcher */}
            <div className="flex items-center bg-slate-50 border border-slate-200 p-0.5 rounded-lg text-[11px] font-bold text-slate-700">
              <span className="px-1.5 text-slate-400 font-semibold flex items-center gap-1">
                <SlidersHorizontal className="h-3 w-3" />
                <span className="hidden sm:inline">Khung:</span>
              </span>
              {[15, 30, 60].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setStepMinutes(step)}
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                    stepMinutes === step
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {step}p
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <div className="relative w-32 sm:w-44">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={translate('timelineSearchPlaceholder')}
                className="h-7 pl-7 pr-2.5 text-xs rounded-lg border font-medium bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg border shadow-2xs bg-slate-50 border-slate-200">
              <button
                type="button"
                onClick={() => handleZoom(-0.1)}
                disabled={zoomLevel <= 0.7}
                className="h-6 w-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white transition-all disabled:opacity-30 cursor-pointer"
                title={translate('timelineZoomOut')}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1.0)}
                className="h-6 px-1.5 rounded text-[11px] font-bold text-slate-700 hover:bg-white transition-all cursor-pointer"
                title={translate('timelineZoomReset')}
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                type="button"
                onClick={() => handleZoom(0.1)}
                disabled={zoomLevel >= 1.4}
                className="h-6 w-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white transition-all disabled:opacity-30 cursor-pointer"
                title={translate('timelineZoomIn')}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Court Scroll Buttons */}
            {resolvedCourts.length > 2 && (
              <div className="flex items-center gap-0.5 bg-blue-50/80 border border-blue-200 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleScroll('left')}
                  className="h-6 px-2 rounded text-[11px] font-bold text-blue-800 hover:bg-blue-600 hover:text-white flex items-center gap-0.5 transition-all cursor-pointer"
                  title={translate('timelinePrevCourtTitle')}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{translate('timelinePrevCourts')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScroll('right')}
                  className="h-6 px-2 rounded text-[11px] font-bold text-blue-800 hover:bg-blue-600 hover:text-white flex items-center gap-0.5 transition-all cursor-pointer"
                  title={translate('timelineNextCourtTitle')}
                >
                  <span className="hidden sm:inline">{translate('timelineNextCourts')}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Fullscreen Mode */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="h-7 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs"
              title={isFullscreen ? translate('timelineExitFullscreen') : translate('timelineFullscreen')}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5 text-blue-600" />}
              <span className="hidden sm:inline">{isFullscreen ? translate('timelineExitFullscreen') : translate('timelineFullscreen')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. FULL COURT TIMELINE GRID TABLE (Terracotta Orange Header & Soft Yellow Time Sidebar) ── */}
      <div className="relative overflow-hidden bg-white z-0">
        <div ref={scrollRef} className="max-h-[680px] overflow-auto select-none scrollbar-thin">
          <div
            className="grid min-w-[840px]"
            style={{
              gridTemplateColumns: `84px repeat(${Math.max(1, resolvedCourts.length)}, minmax(260px, 1fr))`,
            }}
          >
            {/* Top-Left Corner Sticky Header (Terracotta Orange) */}
            <div className="sticky top-0 left-0 z-20 flex items-center justify-center border-b border-r border-orange-800 bg-[#c2410c] text-white p-2.5">
              <Clock className="h-4 w-4 text-white" />
            </div>

            {/* Top Sticky Court Column Headers (Terracotta Orange) */}
            {resolvedCourts.map((court) => {
              return (
                <div
                  key={court.id}
                  className="sticky top-0 z-10 border-b border-r border-orange-800/80 bg-[#c2410c] px-3.5 py-2.5 text-center text-white select-none"
                >
                  <p className="truncate text-xs font-extrabold uppercase tracking-wider">{court.courtName}</p>
                </div>
              );
            })}

            {/* Time Column (Sticky Left with Soft Yellow Sidebar Background #fef08a) */}
            <div className="sticky left-0 z-10 border-r border-amber-300 bg-[#fef08a]">
              {timeSlots.map((slot) => {
                return (
                  <div
                    key={slot.label}
                    className="flex items-start justify-end pr-2.5 border-b border-amber-300/80 text-[11px] font-bold text-slate-900"
                    style={{ height: `${cellHeight}px` }}
                  >
                    <span className="-mt-2.5 font-black">{slot.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Court Grid Columns & Cells */}
            {resolvedCourts.map((court) => {
              const courtMatches = scheduledMatchesForDate.filter((m) => m.courtId === court.id);

              return (
                <div
                  key={court.id}
                  className="relative border-r border-slate-200 bg-white"
                  style={{ height: `${gridTotalHeight}px` }}
                >
                  {/* Background 15-minute Grid Cells */}
                  {timeSlots.map((slot) => {
                    return (
                      <div
                        key={slot.label}
                        className={`border-b transition-colors hover:bg-blue-50/30 ${
                          slot.isHour ? 'border-slate-200' : 'border-slate-100 border-dashed'
                        }`}
                        style={{ height: `${cellHeight}px` }}
                      />
                    );
                  })}

                  {/* Scheduled Match Cards */}
                  {courtMatches.map((match) => {
                    if (!match.scheduledAt) return null;
                    const mDate = new Date(match.scheduledAt);
                    const matchStartMinutes = (mDate.getHours() - operatingStartHour) * 60 + mDate.getMinutes();
                    const topPos = Math.max(0, matchStartMinutes * currentPixelsPerMinute);
                    const duration = resolveMatchDuration(match);
                    const cardHeight = Math.max(76, duration * currentPixelsPerMinute - 6);

                    const isLive = match.status === 'ONGOING' || match.status === 'IN_PROGRESS';
                    const isCompleted = match.status === 'COMPLETED';

                    const mRaw = match as unknown as Record<string, unknown>;
                    const p1Score = (mRaw.participant1Score ?? mRaw.score1) as string | number | undefined;
                    const p2Score = (mRaw.participant2Score ?? mRaw.score2) as string | number | undefined;
                    const isP1Winner = isCompleted && ((Number(p1Score) || 0) > (Number(p2Score) || 0));
                    const isP2Winner = isCompleted && ((Number(p2Score) || 0) > (Number(p1Score) || 0));
                    
                    // Accurate Round Label Calculation (e.g. VÒNG 1/32, VÒNG 1/16, TỨ KẾT, BÁN KẾT, CHUNG KẾT)
                    const roundTitle = getAccurateRoundLabel(match, maxRound);

                    // Match Division Name & Format
                    const matchDiv = divisions.find((d) => d.id === (mRaw.divisionId as string));
                    const divTitle = matchDiv?.name || (tournament.name || 'NỘI DUNG');
                    const { isFootball, isSingles } = detectSportAndFormat(matchDiv);
                    const boFormat = isFootball ? `${duration}P` : getMatchBestOfFormat(match, matchDiv);

                    const setList = extractSetScores(match);
                    const c1 = formatCompetitorDisplay(match.participant1, isFootball, isSingles);
                    const c2 = formatCompetitorDisplay(match.participant2, isFootball, isSingles);

                    const isHighlighted = queryLower && (c1.fullName.toLowerCase().includes(queryLower) || c2.fullName.toLowerCase().includes(queryLower));

                    return (
                      <div
                        key={match.id}
                        onClick={() => onOpenMatchDetail?.(match)}
                        className={`absolute inset-x-1 z-10 flex flex-col justify-between rounded-xl border p-2.5 shadow-2xs transition-all cursor-pointer hover:shadow-md hover:ring-2 hover:ring-blue-400 select-none ${
                          isLive
                            ? 'border-amber-400 bg-amber-50/95 text-amber-950 ring-2 ring-amber-400/40 shadow-md'
                            : isCompleted
                            ? 'border-slate-300 bg-slate-100/95 text-slate-700 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-900 hover:border-blue-400 shadow-xs'
                        } ${isHighlighted ? 'ring-3 ring-amber-400 scale-[1.01] z-20' : ''}`}
                        style={{
                          top: `${topPos + 2}px`,
                          height: `${cardHeight}px`,
                        }}
                        title={`Trận #${match.matchOrder || ''} • ${formatMatchTime(match.scheduledAt)} • Bấm để xem chi tiết`}
                      >
                        {/* 1. Header: Division Name + Format Badge + Time + Duration */}
                        <div className="flex items-center justify-between gap-1 border-b border-slate-200/80 pb-1 text-xs font-black shrink-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate uppercase tracking-tight text-[11px] text-blue-700 font-black">
                              {divTitle}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black shrink-0 bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {boFormat}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 text-[10px]">
                            {isLive && (
                              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-black text-[9px] flex items-center gap-0.5 animate-pulse">
                                <Flame className="h-2.5 w-2.5" />
                                LIVE
                              </span>
                            )}
                            <span className="font-bold px-1.5 py-0.2 rounded border text-blue-800 bg-blue-50 border-blue-200">
                              {formatMatchTime(match.scheduledAt)}
                            </span>
                            <span className="text-slate-700 font-bold bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                              {duration}p
                            </span>
                          </div>
                        </div>

                        {/* 2. Competitors with Avatars & Set Score Boxes (BO1, BO3, BO5) */}
                        <div className="space-y-1.5 my-auto py-1">
                          {/* Competitor 1 */}
                          <div className="flex items-center justify-between gap-1.5 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                              <div className="flex -space-x-1.5 shrink-0">
                                {c1.avatars.map((av, idx) => (
                                  av.imgUrl ? (
                                    <img
                                      key={idx}
                                      src={av.imgUrl}
                                      alt={av.initial}
                                      className="h-5 w-5 rounded-full object-cover border border-slate-200 shadow-2xs z-10"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <span
                                      key={idx}
                                      className={`h-5 w-5 rounded-full border flex items-center justify-center text-[10px] shrink-0 font-black shadow-2xs z-10 ${
                                        isP1Winner ? 'bg-blue-600 text-white border-blue-700' : av.bg
                                      }`}
                                    >
                                      {av.initial}
                                    </span>
                                  )
                                ))}
                              </div>
                              <span className={`truncate text-xs font-bold ${isP1Winner ? 'text-blue-700 font-black' : 'text-slate-900'}`} title={c1.fullName}>
                                {c1.displayLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isFootball ? (
                                setList.length > 0 ? (
                                  <span
                                    className={`min-w-[24px] h-[20px] px-1 flex items-center justify-center rounded text-xs font-black border shadow-2xs ${
                                      Number(setList[0]?.s1) > Number(setList[0]?.s2)
                                        ? 'bg-emerald-600 text-white border-emerald-700'
                                        : 'bg-white text-slate-800 border-slate-300'
                                    }`}
                                  >
                                    {setList[0]?.s1}
                                  </span>
                                ) : (
                                  <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded bg-slate-50 text-xs font-bold text-slate-400 border border-slate-200">
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

                          {/* Competitor 2 */}
                          <div className="flex items-center justify-between gap-1.5 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                              <div className="flex -space-x-1.5 shrink-0">
                                {c2.avatars.map((av, idx) => (
                                  av.imgUrl ? (
                                    <img
                                      key={idx}
                                      src={av.imgUrl}
                                      alt={av.initial}
                                      className="h-5 w-5 rounded-full object-cover border border-slate-200 shadow-2xs z-10"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <span
                                      key={idx}
                                      className={`h-5 w-5 rounded-full border flex items-center justify-center text-[10px] shrink-0 font-black shadow-2xs z-10 ${
                                        isP2Winner ? 'bg-blue-600 text-white border-blue-700' : av.bg
                                      }`}
                                    >
                                      {av.initial}
                                    </span>
                                  )
                                ))}
                              </div>
                              <span className={`truncate text-xs font-bold ${isP2Winner ? 'text-blue-700 font-black' : 'text-slate-900'}`} title={c2.fullName}>
                                {c2.displayLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isFootball ? (
                                setList.length > 0 ? (
                                  <span
                                    className={`min-w-[24px] h-[20px] px-1 flex items-center justify-center rounded text-xs font-black border shadow-2xs ${
                                      Number(setList[0]?.s2) > Number(setList[0]?.s1)
                                        ? 'bg-emerald-600 text-white border-emerald-700'
                                        : 'bg-white text-slate-800 border-slate-300'
                                    }`}
                                  >
                                    {setList[0]?.s2}
                                  </span>
                                ) : (
                                  <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded bg-slate-50 text-xs font-bold text-slate-400 border border-slate-200">
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
                        </div>

                        {/* 3. Card Footer: Accurate Round Label & Match Status / Details */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-200/80">
                          <span className="truncate max-w-[130px] font-bold text-slate-600">
                            {roundTitle}
                          </span>
                          <span className="text-blue-600 font-bold flex items-center gap-0.5 hover:underline">
                            <span>{isCompleted ? matchTranslate('statusFinished') : translate('timelineMatchDetails')}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. UNSCHEDULED MATCHES SECTION / DRAWER ── */}
      {unscheduledMatches.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50/60 p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="text-xs font-extrabold text-slate-800">
                {translate('timelineUnscheduledCount', { count: unscheduledMatches.length })}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsQueueOpen((prev) => !prev)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1"
            >
              <span>{isQueueOpen ? translate('timelineHideQueue') : translate('timelineShowQueue')}</span>
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isQueueOpen ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {isQueueOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {filteredUnscheduledMatches.map((m) => {
                const mRaw = m as unknown as Record<string, unknown>;
                const stageLabel = getAccurateRoundLabel(m, maxRound);
                const isLive = m.status === 'ONGOING';
                const isCompleted = m.status === 'COMPLETED';
                const p1Score = (mRaw.participant1Score ?? mRaw.score1) as string | number | undefined;
                const p2Score = (mRaw.participant2Score ?? mRaw.score2) as string | number | undefined;
                const isP1Winner = isCompleted && ((Number(p1Score) || 0) > (Number(p2Score) || 0));
                const isP2Winner = isCompleted && ((Number(p2Score) || 0) > (Number(p1Score) || 0));

                const uDiv = divisions.find((d) => d.id === (mRaw.divisionId as string));
                const { isFootball: uIsFootball, isSingles: uIsSingles } = detectSportAndFormat(uDiv);
                const uc1 = formatCompetitorDisplay(m.participant1, uIsFootball, uIsSingles);
                const uc2 = formatCompetitorDisplay(m.participant2, uIsFootball, uIsSingles);
                const uSetList = extractSetScores(m);

                return (
                  <div
                    key={m.id}
                    onClick={() => onOpenMatchDetail?.(m)}
                    className="p-2.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between gap-2 group"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pb-1 border-b border-slate-100">
                      <span className="text-slate-700">#{m.matchOrder || '—'} · {stageLabel}</span>
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded text-[9px]">
                        {translate('timelinePendingAssignment')}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className={`flex items-center justify-between text-xs font-bold ${isP1Winner ? 'text-blue-600 font-black' : 'text-slate-900'}`}>
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                          <div className="flex -space-x-1 shrink-0">
                            {uc1.avatars.map((av, idx) => (
                              <span
                                key={idx}
                                className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center text-[9px] shrink-0 font-black ${av.bg}`}
                              >
                                {av.initial}
                              </span>
                            ))}
                          </div>
                          <span className="truncate flex items-center gap-1">
                            {isP1Winner && <Trophy className="h-3 w-3 text-amber-500 shrink-0" />}
                            <span className="truncate">{uc1.displayLabel}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {uSetList.length > 0 ? (
                            uSetList.map((s, idx) => (
                              <span
                                key={idx}
                                className={`min-w-[18px] h-[18px] px-0.5 flex items-center justify-center rounded text-[10px] font-black border ${
                                  Number(s.s1) > Number(s.s2) ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 text-slate-800 border-slate-200'
                                }`}
                              >
                                {s.s1}
                              </span>
                            ))
                          ) : (
                            <span className="font-mono font-black text-xs text-slate-400">--</span>
                          )}
                        </div>
                      </div>

                      <div className={`flex items-center justify-between text-xs font-bold ${isP2Winner ? 'text-blue-600 font-black' : 'text-slate-900'}`}>
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                          <div className="flex -space-x-1 shrink-0">
                            {uc2.avatars.map((av, idx) => (
                              <span
                                key={idx}
                                className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center text-[9px] shrink-0 font-black ${av.bg}`}
                              >
                                {av.initial}
                              </span>
                            ))}
                          </div>
                          <span className="truncate flex items-center gap-1">
                            {isP2Winner && <Trophy className="h-3 w-3 text-amber-500 shrink-0" />}
                            <span className="truncate">{uc2.displayLabel}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {uSetList.length > 0 ? (
                            uSetList.map((s, idx) => (
                              <span
                                key={idx}
                                className={`min-w-[18px] h-[18px] px-0.5 flex items-center justify-center rounded text-[10px] font-black border ${
                                  Number(s.s2) > Number(s.s1) ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 text-slate-800 border-slate-200'
                                }`}
                              >
                                {s.s2}
                              </span>
                            ))
                          ) : (
                            <span className="font-mono font-black text-xs text-slate-400">--</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>Chờ xếp giờ</span>
                      <span className="text-blue-600 font-bold group-hover:underline flex items-center gap-0.5">
                        <span>{translate('timelineMatchDetails')}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
