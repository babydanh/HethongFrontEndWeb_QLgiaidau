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
} from 'lucide-react';
import type { BracketMatch, Tournament, Division } from '@/features/tournaments/api';
import { extractMatchScores } from '@/features/matches/score-display';
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

const BASE_PIXELS_PER_MINUTE = 2.4; // 15 mins = 36px, 30 mins = 72px, 60 mins = 144px

function getLocalDateString(isoString?: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  return `${weekday}, ${d}/${m}`;
}

function getCompetitorDisplayName(participant?: { teamName?: string | null; name?: string | null; placeholder?: string | null } | null): string {
  if (!participant) return 'Chờ xác định';
  return participant.teamName || participant.name || participant.placeholder || 'Chờ xác định';
}

export default function PublicCourtScheduleBoard({
  tournament,
  matches,
  courts: initialCourts = [],
  onOpenMatchDetail,
  onSwitchToList,
}: PublicCourtScheduleBoardProps) {
  const translate = useTranslations('TournamentDetail');
  const matchTranslate = useTranslations('Match');

  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [activeDate, setActiveDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Extract Courts (Combine configured courts + matches with assigned court)
  const resolvedCourts = useMemo<PublicCourtItem[]>(() => {
    const map = new Map<string, PublicCourtItem>();

    // Configured courts from props
    for (const c of initialCourts) {
      map.set(c.id, c);
    }

    // Auto-detect courts from matches if any
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

    const fallbackVenue = (tournament as unknown as { venueName?: string })?.venueName || tournament.locationAddress || 'Khu A';

    // Fallback default placeholder courts if tournament has no courts defined yet
    return [
      { id: 'court-1', courtName: 'Sân 1', venueName: fallbackVenue },
      { id: 'court-2', courtName: 'Sân 2', venueName: fallbackVenue },
      { id: 'court-3', courtName: 'Sân 3', venueName: fallbackVenue },
      { id: 'court-4', courtName: 'Sân 4', venueName: fallbackVenue },
    ];
  }, [initialCourts, matches, tournament]);

  // 2. Extract Available Competition Dates from scheduled matches
  const availableScheduleDates = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const m of matches) {
      if (m.scheduledAt) {
        const dStr = getLocalDateString(m.scheduledAt);
        if (dStr) set.add(dStr);
      }
    }
    if (tournament.startDate) {
      const startD = getLocalDateString(tournament.startDate);
      if (startD) set.add(startD);
    }
    if (tournament.endDate) {
      const endD = getLocalDateString(tournament.endDate);
      if (endD) set.add(endD);
    }

    const sorted = Array.from(set).sort();
    if (sorted.length > 0) return sorted;
    return [getLocalDateString(new Date().toISOString())];
  }, [matches, tournament.startDate, tournament.endDate]);

  // Set default active date
  useEffect(() => {
    if (!activeDate && availableScheduleDates.length > 0) {
      const todayStr = getLocalDateString(new Date().toISOString());
      const hasToday = availableScheduleDates.includes(todayStr);
      const ongoingMatch = matches.find((m) => m.status === 'ONGOING' && m.scheduledAt);
      if (ongoingMatch?.scheduledAt) {
        setActiveDate(getLocalDateString(ongoingMatch.scheduledAt));
      } else if (hasToday) {
        setActiveDate(todayStr);
      } else {
        setActiveDate(availableScheduleDates[0]);
      }
    }
  }, [activeDate, availableScheduleDates, matches]);

  const visibleCourts = resolvedCourts;

  // 3. Split matches into Scheduled (for active date) vs Unscheduled
  const { dateScheduledMatches, unscheduledMatches, matchesByDateCount } = useMemo(() => {
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
      dateScheduledMatches: scheduled,
      unscheduledMatches: unscheduled,
      matchesByDateCount: countMap,
    };
  }, [matches, activeDate, availableScheduleDates]);

  // 4. Operating Window & Timeline Rows
  const operatingStartHour = 7; // 07:00
  const operatingEndHour = 23; // 23:00
  const totalOperatingMinutes = (operatingEndHour - operatingStartHour) * 60;
  const currentPixelsPerMinute = BASE_PIXELS_PER_MINUTE * zoomLevel;
  const timelineHeight = totalOperatingMinutes * currentPixelsPerMinute;

  // Time marks (every 30 mins)
  const timeMarks = useMemo(() => {
    const marks: Array<{ timeStr: string; topPx: number; isHour: boolean }> = [];
    for (let m = 0; m <= totalOperatingMinutes; m += 30) {
      const totalMin = operatingStartHour * 60 + m;
      const h = Math.floor(totalMin / 60);
      const min = totalMin % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      marks.push({
        timeStr,
        topPx: m * currentPixelsPerMinute,
        isHour: min === 0,
      });
    }
    return marks;
  }, [totalOperatingMinutes, operatingStartHour, currentPixelsPerMinute]);

  // 5. Navigation Controls
  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const offset = direction === 'left' ? -350 : 350;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.max(0.65, Math.min(1.6, Math.round((prev + delta) * 10) / 10)));
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

  // Filter matches by search query
  const queryLower = searchQuery.trim().toLowerCase();

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-100/90 border border-slate-200/90 rounded-2xl overflow-hidden transition-all shadow-xs ${
        isFullscreen ? 'fixed inset-0 z-50 p-3 bg-slate-900 text-white rounded-none border-none' : 'w-full'
      }`}
    >
      {/* 1. TOP RIBBON TOOLBAR (Navigation, Zoom, Dates, Mode Switcher) */}
      <div className={`p-2.5 sm:p-3 border-b flex flex-col gap-2.5 ${isFullscreen ? 'bg-slate-800/95 border-slate-700' : 'bg-white border-slate-200/90'}`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Left: View Mode + Date Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher Pills */}
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

            {/* Date Selector Pills */}
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

          {/* Right: Search, Zoom, Court Navigation & Fullscreen */}
          <div className="flex items-center gap-1.5 flex-wrap ml-auto">
            {/* Quick Search */}
            <div className="relative w-36 sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={translate('timelineSearchPlaceholder')}
                className={`h-7 pl-7 pr-2.5 text-xs rounded-lg border font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500 ${
                  isFullscreen ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>

            {/* Zoom Controls */}
            <div className={`flex items-center gap-0.5 p-0.5 rounded-lg border shadow-2xs ${isFullscreen ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              <button
                type="button"
                onClick={() => handleZoom(-0.1)}
                disabled={zoomLevel <= 0.65}
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
                disabled={zoomLevel >= 1.6}
                className="h-6 w-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white transition-all disabled:opacity-30 cursor-pointer"
                title={translate('timelineZoomIn')}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Court Scroll Buttons */}
            {visibleCourts.length > 2 && (
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
              className={`h-7 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isFullscreen ? 'bg-blue-600 text-white border-blue-500 shadow-xs' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
              }`}
              title={isFullscreen ? translate('timelineExitFullscreen') : translate('timelineFullscreen')}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5 text-blue-600" />}
              <span className="hidden sm:inline">{isFullscreen ? translate('timelineExitFullscreen') : translate('timelineFullscreen')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TIMELINE SCHEDULE BOARD CONTAINER */}
      <div className="relative flex-1 overflow-hidden min-h-[520px] flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-auto relative scrollbar-thin">
          <div className="inline-flex min-w-full flex-col">
            {/* STICKY TOP COURT HEADERS */}
            <div className={`sticky top-0 z-30 flex border-b shadow-xs ${isFullscreen ? 'bg-slate-800 border-slate-700' : 'bg-slate-50/95 backdrop-blur-md border-slate-200'}`}>
              {/* Left Top Corner (Time Label) */}
              <div className={`sticky left-0 z-40 w-16 sm:w-20 shrink-0 border-r flex items-center justify-center p-2.5 font-black text-xs uppercase tracking-wider ${
                isFullscreen ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}>
                <Clock className="h-3.5 w-3.5 mr-1 text-blue-600" />
                <span>{translate('timelineHourHeader')}</span>
              </div>

              {/* Court Column Headers */}
              <div className="flex flex-1">
                {visibleCourts.map((court, idx) => {
                  const courtMatches = dateScheduledMatches.filter((m) => m.courtId === court.id);
                  return (
                    <div
                      key={court.id}
                      className={`w-64 sm:w-72 shrink-0 border-r p-2.5 flex flex-col items-center justify-center text-center ${
                        isFullscreen ? 'border-slate-700 bg-slate-800' : idx % 2 === 0 ? 'bg-white/80 border-slate-200' : 'bg-blue-50/30 border-slate-200'
                      }`}
                    >
                      <span className={`text-xs font-black truncate max-w-full ${isFullscreen ? 'text-white' : 'text-slate-900'}`}>
                        {court.courtName}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {court.venueName && (
                          <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[120px]">
                            {court.venueName}
                          </span>
                        )}
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                          {translate('timelineCourtMatchesCount', { count: courtMatches.length })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TIMELINE GRID BODY */}
            <div className="relative flex" style={{ height: `${timelineHeight}px` }}>
              {/* STICKY LEFT TIME COLUMN */}
              <div className={`sticky left-0 z-20 w-16 sm:w-20 shrink-0 border-r select-none ${
                isFullscreen ? 'bg-slate-800/95 border-slate-700' : 'bg-slate-50/95 border-slate-200'
              }`}>
                {timeMarks.map((mark) => (
                  <div
                    key={mark.timeStr}
                    className="absolute w-full flex items-center justify-center"
                    style={{ top: `${mark.topPx}px` }}
                  >
                    <span
                      className={`text-[10px] font-mono font-bold -translate-y-1/2 px-1 rounded ${
                        mark.isHour
                          ? isFullscreen ? 'text-blue-400 bg-slate-700/80 font-black' : 'text-blue-800 bg-blue-50 font-black'
                          : 'text-slate-400'
                      }`}
                    >
                      {mark.timeStr}
                    </span>
                  </div>
                ))}
              </div>

              {/* HORIZONTAL GRID LINES */}
              <div className="absolute inset-0 pointer-events-none">
                {timeMarks.map((mark) => (
                  <div
                    key={`line-${mark.timeStr}`}
                    className={`absolute left-0 right-0 ${
                      mark.isHour
                        ? isFullscreen ? 'border-b border-slate-700' : 'border-b border-slate-200'
                        : isFullscreen ? 'border-b border-slate-800/80 border-dashed' : 'border-b border-slate-100 border-dashed'
                    }`}
                    style={{ top: `${mark.topPx}px` }}
                  />
                ))}
              </div>

              {/* COURT COLUMNS WITH MATCH CARDS */}
              <div className="flex flex-1 relative">
                {visibleCourts.map((court, courtIdx) => {
                  const courtMatches = dateScheduledMatches.filter((m) => m.courtId === court.id);

                  return (
                    <div
                      key={court.id}
                      className={`w-64 sm:w-72 shrink-0 border-r relative ${
                        isFullscreen ? 'border-slate-700' : courtIdx % 2 === 0 ? 'bg-white/40 border-slate-200' : 'bg-slate-50/30 border-slate-200'
                      }`}
                    >
                      {courtMatches.map((match) => {
                        if (!match.scheduledAt) return null;
                        const matchDate = new Date(match.scheduledAt);
                        const matchStartMinutes = matchDate.getHours() * 60 + matchDate.getMinutes();
                        const offsetFromStartMinutes = Math.max(0, matchStartMinutes - operatingStartHour * 60);
                        const topPx = offsetFromStartMinutes * currentPixelsPerMinute;
                        const durationMinutes = match.matchConfig && typeof match.matchConfig.durationMinutes === 'number'
                          ? match.matchConfig.durationMinutes
                          : 30;
                        const heightPx = Math.max(52, durationMinutes * currentPixelsPerMinute);

                        const p1Name = getCompetitorDisplayName(match.participant1);
                        const p2Name = getCompetitorDisplayName(match.participant2);
                        const isHighlighted = queryLower && (p1Name.toLowerCase().includes(queryLower) || p2Name.toLowerCase().includes(queryLower));

                        const isLive = match.status === 'ONGOING' || match.status === 'IN_PROGRESS';
                        const isCompleted = match.status === 'COMPLETED';
                        const mRaw = match as unknown as Record<string, unknown>;
                        const p1Score = (mRaw.participant1Score ?? mRaw.score1) as string | number | undefined;
                        const p2Score = (mRaw.participant2Score ?? mRaw.score2) as string | number | undefined;
                        const isP1Winner = isCompleted && ((Number(p1Score) || 0) > (Number(p2Score) || 0));
                        const isP2Winner = isCompleted && ((Number(p2Score) || 0) > (Number(p1Score) || 0));
                        const roundTitle = (mRaw.roundName || mRaw.stageName || match.stage?.name || 'Vòng đấu') as string;

                        return (
                          <div
                            key={match.id}
                            onClick={() => onOpenMatchDetail?.(match)}
                            className={`absolute left-1.5 right-1.5 rounded-xl border p-2 flex flex-col justify-between transition-all cursor-pointer select-none group shadow-xs hover:shadow-md hover:z-20 ${
                              isLive
                                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/30 animate-pulse text-rose-950'
                                : isCompleted
                                ? isFullscreen ? 'bg-slate-800/90 border-slate-700 text-slate-300' : 'bg-slate-50/95 border-slate-200/90 text-slate-700'
                                : isFullscreen ? 'bg-blue-950/80 border-blue-800 text-white hover:border-blue-500' : 'bg-white border-blue-200/90 text-slate-900 hover:border-blue-400'
                            } ${isHighlighted ? 'ring-3 ring-amber-400 scale-[1.02] z-30' : ''}`}
                            style={{
                              top: `${topPx}px`,
                              height: `${heightPx}px`,
                            }}
                            title={`Trận #${match.matchOrder || ''} • ${formatMatchTime(match.scheduledAt)} • Bấm để xem chi tiết`}
                          >
                            {/* Card Header (Time, Order, Live Badge) */}
                            <div className="flex items-center justify-between gap-1 text-[10px] font-bold">
                              <span className="flex items-center gap-1 text-blue-600 font-mono font-black">
                                <Clock className="h-3 w-3" />
                                {formatMatchTime(match.scheduledAt)}
                              </span>

                              <div className="flex items-center gap-1">
                                {isLive && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-black text-[9px] flex items-center gap-0.5 animate-pulse">
                                    <Flame className="h-2.5 w-2.5" />
                                    LIVE
                                  </span>
                                )}
                                <span className={`px-1 py-0.2 rounded font-semibold ${isFullscreen ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                  #{match.matchOrder || courtIdx + 1}
                                </span>
                              </div>
                            </div>

                            {/* Competitor Rows */}
                            <div className="space-y-1 my-auto">
                              {/* Participant 1 */}
                              <div className={`flex items-center justify-between text-xs font-bold truncate ${isP1Winner ? 'text-blue-600 font-black' : ''}`}>
                                <span className="truncate flex items-center gap-1">
                                  {isP1Winner && <Trophy className="h-3 w-3 text-amber-500 shrink-0" />}
                                  <span className="truncate">{p1Name}</span>
                                </span>
                                {(p1Score !== undefined || isCompleted || isLive) && (
                                  <span className="font-mono font-black text-xs ml-1 shrink-0">
                                    {p1Score ?? '--'}
                                  </span>
                                )}
                              </div>

                              {/* Participant 2 */}
                              <div className={`flex items-center justify-between text-xs font-bold truncate ${isP2Winner ? 'text-blue-600 font-black' : ''}`}>
                                <span className="truncate flex items-center gap-1">
                                  {isP2Winner && <Trophy className="h-3 w-3 text-amber-500 shrink-0" />}
                                  <span className="truncate">{p2Name}</span>
                                </span>
                                {(p2Score !== undefined || isCompleted || isLive) && (
                                  <span className="font-mono font-black text-xs ml-1 shrink-0">
                                    {p2Score ?? '--'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card Footer: Set breakdown & Round label */}
                            <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium pt-1 border-t border-slate-100/60">
                              <span className="truncate max-w-[110px]">
                                {roundTitle}
                              </span>
                              <span className="text-blue-600 font-bold group-hover:underline flex items-center gap-0.5">
                                <span>{translate('timelineMatchDetails')}</span>
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

        {/* 3. BOTTOM FLOATING BAR (Unscheduled matches indicator) */}
        {unscheduledMatches.length > 0 && (
          <div className={`border-t px-3 py-2 flex items-center justify-between text-xs z-30 shadow-md ${
            isFullscreen ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-bold">
                {translate('timelineUnscheduledCount', { count: unscheduledMatches.length })}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsQueueDrawerOpen((prev) => !prev)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1"
            >
              <span>{isQueueDrawerOpen ? translate('timelineHideQueue') : translate('timelineShowQueue')}</span>
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isQueueDrawerOpen ? 'rotate-90' : ''}`} />
            </button>
          </div>
        )}

        {/* 4. UNSCHEDULED MATCHES COLLAPSIBLE DRAWER */}
        {isQueueDrawerOpen && unscheduledMatches.length > 0 && (
          <div className={`p-3 border-t max-h-56 overflow-y-auto space-y-2 z-30 ${
            isFullscreen ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {unscheduledMatches.map((m) => {
                const mRaw = m as unknown as Record<string, unknown>;
                const stageLabel = (mRaw.roundName || mRaw.stageName || m.stage?.name || 'Vòng sau') as string;
                return (
                  <div
                    key={m.id}
                    onClick={() => onOpenMatchDetail?.(m)}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                      isFullscreen ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                      <span>#{m.matchOrder || '—'} · {stageLabel}</span>
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                        {translate('timelinePendingAssignment')}
                      </span>
                    </div>
                    <div className="text-xs font-bold space-y-0.5">
                      <p className="truncate">{getCompetitorDisplayName(m.participant1)}</p>
                      <p className="truncate text-slate-400 font-normal">vs</p>
                      <p className="truncate">{getCompetitorDisplayName(m.participant2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
