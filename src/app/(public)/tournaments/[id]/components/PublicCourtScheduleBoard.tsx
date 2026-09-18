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
  Search,
  Flame,
  ExternalLink,
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

  if (matchConfig.mode === 'LITE' || matchConfig.scoringMode === 'FREE') return 'LITE';

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

  const stepMinutes = configuredStepMinutes;
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
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

  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string>('all');

  // Extract unique venues
  const uniqueVenues = useMemo(() => {
    const map = new Map<string, { id: string; name: string; courtCount: number }>();
    for (const c of resolvedCourts) {
      const vName = c.venueName || 'Địa điểm chính';
      const existing = map.get(vName);
      if (existing) {
        existing.courtCount++;
      } else {
        map.set(vName, { id: vName, name: vName, courtCount: 1 });
      }
    }
    return Array.from(map.values());
  }, [resolvedCourts]);

  const displayedCourts = useMemo(() => {
    if (selectedVenueFilter === 'all') return resolvedCourts;
    return resolvedCourts.filter((c) => (c.venueName || 'Địa điểm chính') === selectedVenueFilter);
  }, [resolvedCourts, selectedVenueFilter]);

  const [selectedDate, setSelectedDate] = useState<string>('');

  // 3. Extract Schedule Dates (Only actual configured dates in settings or scheduled matches)
  const availableScheduleDates = useMemo<string[]>(() => {
    const set = new Set<string>();
    if (typeof tournamentConfig.scheduleDate === 'string' && tournamentConfig.scheduleDate) {
      const dStr = getLocalDateString(tournamentConfig.scheduleDate);
      if (dStr) set.add(dStr);
    }
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
    const sorted = Array.from(set).filter(Boolean).sort();
    if (sorted.length > 0) return sorted;
    return [getLocalDateString(new Date().toISOString())];
  }, [tournamentConfig.scheduleDate, matches, tournament.startDate]);

  // Default active date: prioritize date that has matches
  const defaultScheduleDate = useMemo(() => {
    if (availableScheduleDates.length === 0) return '';
    const matchWithDate = matches.find((m) => m.scheduledAt);
    if (matchWithDate?.scheduledAt) {
      const matchD = getLocalDateString(matchWithDate.scheduledAt);
      if (matchD && availableScheduleDates.includes(matchD)) {
        return matchD;
      }
    }
    return availableScheduleDates[0] || '';
  }, [availableScheduleDates, matches]);

  const activeDate = (selectedDate && availableScheduleDates.includes(selectedDate))
    ? selectedDate
    : defaultScheduleDate;

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
        isFullscreen ? 'fixed inset-0 !z-50 bg-white rounded-none border-none h-screen w-screen' : 'w-full'
      }`}
    >
      {/* ── 1. TOP TOOLBAR RIBBON (Date, Search, Zoom, Fullscreen) ── */}
      <div className="p-2.5 sm:p-3 border-b border-slate-200/90 bg-white flex flex-col gap-2.5 relative z-10">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Left: Date Selector Pills (Only dates in setting or with matches) */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full sm:max-w-[650px] p-0.5 scrollbar-none">
            {availableScheduleDates.map((dateStr) => {
              const isActive = dateStr === activeDate;
              const matchCount = matchesByDateCount[dateStr] || 0;
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className={`h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  <Calendar className={`h-3 w-3 ${isActive ? 'text-slate-200' : 'text-slate-400'}`} />
                  <span>{formatDayLabel(dateStr)}</span>
                  {matchCount > 0 && (
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
                      {matchCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Search, Zoom Controls, Fullscreen */}
          <div className="flex items-center gap-1.5 flex-wrap ml-auto">
            {/* Quick Search */}
            <div className="relative w-32 sm:w-40 md:w-48 shrink-0">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={translate('timelineSearchPlaceholder')}
                className="h-7 w-full pl-6.5 pr-2 text-xs rounded-lg border font-medium bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-400"
              />
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg border shadow-2xs bg-slate-50 border-slate-200 shrink-0">
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
                className="h-6 min-w-[38px] px-1 rounded text-[11px] font-bold text-slate-700 hover:bg-white transition-all cursor-pointer text-center"
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

        {/* Multi-Venue Selector Row (If tournament has >= 2 venues) */}
        {uniqueVenues.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1.5 border-t border-slate-100 scrollbar-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-0.5 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-orange-600" />
              Địa điểm:
            </span>
            <button
              type="button"
              onClick={() => setSelectedVenueFilter('all')}
              className={`h-6 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedVenueFilter === 'all'
                  ? 'bg-orange-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tất cả cụm sân ({resolvedCourts.length})
            </button>
            {uniqueVenues.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVenueFilter(v.id)}
                className={`h-6 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedVenueFilter === v.id
                    ? 'bg-orange-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {v.name} ({v.courtCount} sân)
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. FULL COURT TIMELINE GRID TABLE (Terracotta Orange Header & Soft Yellow Time Sidebar) ── */}
      <div className="relative overflow-hidden bg-white z-0 flex-1 flex flex-col min-h-0">
        <div
          ref={scrollRef}
          className={`w-full overflow-auto select-none scrollbar-thin ${
            isFullscreen ? 'flex-1 h-full' : 'max-h-[calc(100vh-220px)] min-h-[580px]'
          }`}
        >
          <div
            className="grid w-full min-w-full"
            style={{
              gridTemplateColumns: `54px repeat(${Math.max(1, displayedCourts.length)}, minmax(${displayedCourts.length <= 2 ? '320px' : '250px'}, 1fr))`,
            }}
          >
            {/* Top-Left Corner Sticky Header (Terracotta Orange z-30) */}
            <div className="sticky top-0 left-0 z-30 flex items-center justify-center border-b border-r border-orange-800 bg-[#c2410c] text-white p-2">
              <Clock className="h-3.5 w-3.5 text-white" />
            </div>

            {/* Top Sticky Court Column Headers (Terracotta Orange z-20) */}
            {displayedCourts.map((court) => {
              return (
                <div
                  key={court.id}
                  className="sticky top-0 z-20 border-b border-r border-orange-800/80 bg-[#c2410c] px-2.5 py-2 text-center text-white select-none"
                >
                  <p className="truncate text-xs font-extrabold uppercase tracking-wider">{court.courtName}</p>
                  {court.venueName && uniqueVenues.length > 1 && (
                    <p className="truncate text-[9px] font-medium text-orange-200 mt-0.5">{court.venueName}</p>
                  )}
                </div>
              );
            })}

            {/* Time Column (Sticky Left with Soft Yellow Sidebar Background #fef08a z-10) */}
            <div className="sticky left-0 z-10 border-r border-amber-300 bg-[#fef08a] relative" style={{ height: `${gridTotalHeight}px` }}>
              {timeSlots.map((slot, idx) => {
                return (
                  <React.Fragment key={slot.label}>
                    {/* Background slot border */}
                    <div
                      className="absolute inset-x-0 border-b border-amber-300/80"
                      style={{ top: `${slot.topPx}px`, height: `${cellHeight}px` }}
                    />
                    {/* Time Label on the mark line */}
                    <div
                      className={`absolute ${idx === 0 ? 'top-1' : '-translate-y-1/2'} left-0 right-0 px-0.5 text-center font-extrabold text-[11px] text-slate-800 pointer-events-none select-none z-10`}
                      style={idx === 0 ? undefined : { top: `${slot.topPx}px` }}
                    >
                      <span className="inline-block bg-amber-100/95 px-1 py-0.5 rounded text-[10px] sm:text-[11px] font-black text-slate-900 border border-amber-300/80 shadow-2xs">
                        {slot.label}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
              {/* Bottom end time mark */}
              {timeSlots.length > 0 && (
                <div
                  className="absolute inset-x-0 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10 px-0.5"
                  style={{ top: `${gridTotalHeight}px` }}
                >
                  <span className="inline-block bg-amber-100/95 px-1 py-0.5 rounded text-[10px] sm:text-[11px] font-black text-slate-900 border border-amber-300/80 shadow-2xs">
                    {formatTimeLabel(operatingEndHour, 0)}
                  </span>
                </div>
              )}
            </div>

            {/* Court Grid Columns & Cells */}
            {displayedCourts.map((court) => {
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
                        className={`absolute inset-x-1 z-[5] flex flex-col justify-between rounded-xl border p-2.5 shadow-2xs transition-all cursor-pointer hover:shadow-xs hover:border-slate-300 select-none ${
                          isLive
                            ? 'border-amber-400 bg-amber-50/95 text-amber-950 ring-1 ring-amber-400/40 shadow-xs'
                            : isCompleted
                            ? 'border-slate-200 bg-slate-50/80 text-slate-700'
                            : 'border-slate-200 bg-white text-slate-900'
                        } ${isHighlighted ? 'ring-2 ring-amber-400 scale-[1.01] z-[6]' : ''}`}
                        style={{
                          top: `${topPos + 2}px`,
                          height: `${cardHeight}px`,
                        }}
                        title={`Trận #${match.matchOrder || ''} • ${formatMatchTime(match.scheduledAt)} • Bấm để xem chi tiết`}
                      >
                        {/* 1. Header: Division Name + Format Badge + Time + Duration */}
                        <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1 text-xs font-black shrink-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate uppercase tracking-tight text-[11px] text-slate-600 font-bold">
                              {divTitle}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 bg-slate-100 text-slate-600 border border-slate-200">
                              {boFormat}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 text-[10px]">
                            {isLive && (
                              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center gap-0.5 animate-pulse">
                                <Flame className="h-2.5 w-2.5" />
                                LIVE
                              </span>
                            )}
                            <span className="font-bold px-1.5 py-0.2 rounded border text-slate-700 bg-slate-50 border-slate-200">
                              {formatMatchTime(match.scheduledAt)}
                            </span>
                            <span className="text-slate-600 font-bold bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
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
                                        isP1Winner ? 'bg-sky-500 text-white border-sky-400' : av.bg
                                      }`}
                                    >
                                      {av.initial}
                                    </span>
                                  )
                                ))}
                              </div>
                              <span className={`truncate text-xs font-bold ${isP1Winner ? 'text-sky-700 font-black' : 'text-slate-900'}`} title={c1.fullName}>
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
                                      className={`min-w-[20px] h-[20px] px-1 flex items-center justify-center rounded text-[11px] font-bold border shadow-2xs ${
                                        isWinner ? 'bg-sky-500 text-white border-sky-400' : 'bg-white text-slate-700 border-slate-200'
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
                                        isP2Winner ? 'bg-sky-500 text-white border-sky-400' : av.bg
                                      }`}
                                    >
                                      {av.initial}
                                    </span>
                                  )
                                ))}
                              </div>
                              <span className={`truncate text-xs font-bold ${isP2Winner ? 'text-sky-700 font-black' : 'text-slate-900'}`} title={c2.fullName}>
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
                                        isWinner ? 'bg-sky-500 text-white border-sky-400' : 'bg-white text-slate-800 border-slate-300'
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
    </div>
  );
}
