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

  // 1. Controls State (Default 15 minutes per grid row according to tournament setting)
  const [stepMinutes, setStepMinutes] = useState<number>(15);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [activeDate, setActiveDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 2. Extract Real Courts from props, tournament, or matches
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
      { id: 'court-1', courtName: 'Sân 1', venueName: defaultVenue },
      { id: 'court-2', courtName: 'Sân 2', venueName: defaultVenue },
      { id: 'court-3', courtName: 'Sân 3', venueName: defaultVenue },
      { id: 'court-4', courtName: 'Sân 4', venueName: defaultVenue },
    ];
  }, [initialCourts, matches, tournament]);

  // 3. Extract Schedule Dates (dates with scheduled matches or tournament dates)
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

  // Default active date
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

  // 5. Operating Window & Grid Metrics (06:00 to 24:00, 15p per step row)
  const operatingStartHour = 6; // 06:00
  const operatingEndHour = 24; // 24:00
  const cellBaseHeight = stepMinutes === 15 ? 44 : stepMinutes === 30 ? 64 : 88;
  const cellHeight = Math.round(cellBaseHeight * zoomLevel);
  const pixelsPerMinute = cellHeight / stepMinutes;

  const totalSlots = Math.floor(((operatingEndHour - operatingStartHour) * 60) / stepMinutes);
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
    const offset = direction === 'left' ? -350 : 350;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.max(0.7, Math.min(1.5, Math.round((prev + delta) * 10) / 10)));
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

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs ${
        isFullscreen ? 'fixed inset-0 z-50 p-4 bg-white rounded-none border-none' : 'w-full'
      }`}
    >
      {/* ── 1. TOP TOOLBAR RIBBON ── */}
      <div className="p-2.5 sm:p-3 border-b border-slate-200/90 bg-white flex flex-col gap-2.5">
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

          {/* Right: Step Interval, Search, Zoom Controls, Navigation, Fullscreen */}
          <div className="flex items-center gap-1.5 flex-wrap ml-auto">
            {/* Step Interval Switcher (15p setting by default) */}
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
                disabled={zoomLevel >= 1.5}
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

      {/* ── 2. FULL COURT TIMELINE GRID TABLE (15p Steps, Sticky Headers, Real Courts) ── */}
      <div className="relative overflow-hidden bg-white">
        <div ref={scrollRef} className="max-h-[640px] overflow-auto select-none scrollbar-thin">
          <div
            className="grid min-w-[760px]"
            style={{
              gridTemplateColumns: `80px repeat(${Math.max(1, resolvedCourts.length)}, minmax(200px, 1fr))`,
            }}
          >
            {/* Top-Left Corner Sticky Header */}
            <div className="sticky top-0 left-0 z-30 flex items-center justify-center border-b border-r border-slate-200 bg-slate-100/95 backdrop-blur-xs p-2 text-xs font-extrabold text-slate-700 uppercase">
              <Clock className="mr-1 h-3.5 w-3.5 text-blue-600" />
              <span>{translate('timelineHourHeader')}</span>
            </div>

            {/* Top Sticky Court Column Headers */}
            {resolvedCourts.map((court, idx) => {
              const courtMatches = scheduledMatchesForDate.filter((m) => m.courtId === court.id);
              return (
                <div
                  key={court.id}
                  className="sticky top-0 z-20 flex items-center justify-between border-b border-r border-slate-200 bg-slate-50/95 backdrop-blur-xs px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-900">{court.courtName}</p>
                    {court.venueName && (
                      <p className="truncate text-[10px] font-semibold text-slate-400">{court.venueName}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 px-2 py-0.5 text-[9px] font-bold shrink-0 ml-1">
                    {courtMatches.length} trận
                  </span>
                </div>
              );
            })}

            {/* Time Column (Sticky Left with 15-minute slot marks) */}
            <div className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50/95">
              {timeSlots.map((slot) => {
                return (
                  <div
                    key={slot.label}
                    className={`flex items-start justify-end pr-2.5 border-b text-[11px] transition-colors ${
                      slot.isHour
                        ? 'border-slate-300 text-slate-900 bg-slate-100/70 font-black'
                        : 'border-slate-200/60 text-slate-400 font-medium'
                    }`}
                    style={{ height: `${cellHeight}px` }}
                  >
                    <span className="-mt-2.5">{slot.label}</span>
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
                          slot.isHour ? 'border-slate-200 bg-slate-50/20' : 'border-slate-100/80 border-dashed'
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
                    const topPos = Math.max(0, matchStartMinutes * pixelsPerMinute);
                    const duration = match.matchConfig && typeof match.matchConfig.durationMinutes === 'number'
                      ? match.matchConfig.durationMinutes
                      : 15;
                    const cardHeight = Math.max(40, duration * pixelsPerMinute - 4);

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
                        className={`absolute inset-x-1.5 z-10 flex flex-col justify-between rounded-xl border p-2 shadow-xs transition-all cursor-pointer hover:shadow-md hover:ring-2 hover:ring-blue-400 ${
                          isLive
                            ? 'border-rose-400 bg-rose-50/90 text-rose-950 ring-2 ring-rose-500/30 animate-pulse'
                            : isCompleted
                            ? 'border-slate-200 bg-slate-50/95 text-slate-800'
                            : 'border-blue-200 bg-white text-slate-900 hover:border-blue-400'
                        } ${isHighlighted ? 'ring-3 ring-amber-400 scale-[1.01] z-20' : ''}`}
                        style={{
                          top: `${topPos + 2}px`,
                          height: `${cardHeight}px`,
                        }}
                        title={`Trận #${match.matchOrder || ''} • ${formatTimeLabel(mDate.getHours(), mDate.getMinutes())} • Bấm để xem chi tiết`}
                      >
                        {/* Match Card Top: Time & Badges */}
                        <div className="flex items-center justify-between gap-1 text-[10px] font-bold">
                          <span className="flex items-center gap-1 text-blue-600 font-mono font-black">
                            <Clock className="h-3 w-3" />
                            {formatTimeLabel(mDate.getHours(), mDate.getMinutes())} ({duration}p)
                          </span>

                          <div className="flex items-center gap-1">
                            {isLive && (
                              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-black text-[9px] flex items-center gap-0.5 animate-pulse">
                                <Flame className="h-2.5 w-2.5" />
                                LIVE
                              </span>
                            )}
                            <span className="px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-600">
                              #{match.matchOrder || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Competitors */}
                        <div className="space-y-0.5 my-auto">
                          <div className={`flex items-center justify-between text-xs font-bold truncate ${isP1Winner ? 'text-blue-600 font-black' : 'text-slate-900'}`}>
                            <span className="truncate flex items-center gap-1">
                              {isP1Winner && <Trophy className="h-3 w-3 text-amber-500 shrink-0" />}
                              <span className="truncate">{p1Name}</span>
                            </span>
                            {(p1Score !== undefined || isCompleted || isLive) && (
                              <span className="font-mono font-black text-xs shrink-0 ml-1">
                                {p1Score ?? '--'}
                              </span>
                            )}
                          </div>

                          <div className={`flex items-center justify-between text-xs font-bold truncate ${isP2Winner ? 'text-blue-600 font-black' : 'text-slate-900'}`}>
                            <span className="truncate flex items-center gap-1">
                              {isP2Winner && <Trophy className="h-3 w-3 text-amber-500 shrink-0" />}
                              <span className="truncate">{p2Name}</span>
                            </span>
                            {(p2Score !== undefined || isCompleted || isLive) && (
                              <span className="font-mono font-black text-xs shrink-0 ml-1">
                                {p2Score ?? '--'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Meta Footer */}
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                          <span className="truncate max-w-[120px]">{roundTitle}</span>
                          <span className="text-blue-600 font-bold flex items-center gap-0.5">
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
                const stageLabel = (mRaw.roundName || mRaw.stageName || m.stage?.name || 'Vòng sau') as string;
                const isLive = m.status === 'ONGOING';
                const isCompleted = m.status === 'COMPLETED';
                const p1Score = (mRaw.participant1Score ?? mRaw.score1) as string | number | undefined;
                const p2Score = (mRaw.participant2Score ?? mRaw.score2) as string | number | undefined;
                const isP1Winner = isCompleted && ((Number(p1Score) || 0) > (Number(p2Score) || 0));
                const isP2Winner = isCompleted && ((Number(p2Score) || 0) > (Number(p1Score) || 0));

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
                        <span className="truncate flex items-center gap-1">
                          {isP1Winner && <Trophy className="h-3 w-3 text-amber-500 shrink-0" />}
                          <span className="truncate">{getCompetitorDisplayName(m.participant1)}</span>
                        </span>
                        {(p1Score !== undefined || isCompleted || isLive) && (
                          <span className="font-mono font-black text-xs ml-1 shrink-0">
                            {p1Score ?? '--'}
                          </span>
                        )}
                      </div>

                      <div className={`flex items-center justify-between text-xs font-bold ${isP2Winner ? 'text-blue-600 font-black' : 'text-slate-900'}`}>
                        <span className="truncate flex items-center gap-1">
                          {isP2Winner && <Trophy className="h-3 w-3 text-amber-500 shrink-0" />}
                          <span className="truncate">{getCompetitorDisplayName(m.participant2)}</span>
                        </span>
                        {(p2Score !== undefined || isCompleted || isLive) && (
                          <span className="font-mono font-black text-xs ml-1 shrink-0">
                            {p2Score ?? '--'}
                          </span>
                        )}
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
