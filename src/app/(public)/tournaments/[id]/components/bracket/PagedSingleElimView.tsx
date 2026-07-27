/**
 * PagedSingleElimView — 3-Round Sliding Window Bracket View
 *
 * Displays exactly 3 rounds per page window with compact Y-spacing (no blank top gaps),
 * uniform 1.5px Royal Blue (#2563eb) SVG connectors, and smooth navigation.
 */

'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Trophy, Maximize2, Minimize2 } from 'lucide-react';
import type { BracketMatch } from '@/features/tournaments/api';
import type { SportRuleKind } from '@/types/tournament';
import type { OnScheduleMatch, OnSelectBracketMatch } from './types';
import { CARD_W, CARD_H_PUBLIC, CARD_H_ORGANIZER, COL_GAP } from './types';
import { buildMatchesByRound, getRoundLabel, isSlotBye } from './helpers';
import { MatchCard } from './MatchCard';

interface Props {
  matches: BracketMatch[];
  onScheduleMatch?: OnScheduleMatch;
  selectedMatchId?: string | null;
  onSelectMatch?: OnSelectBracketMatch;
  fallbackSportRuleKind?: SportRuleKind;
}

export function PagedSingleElimView({
  matches,
  onScheduleMatch,
  selectedMatchId,
  onSelectMatch,
  fallbackSportRuleKind,
}: Props) {
  const cardH = onScheduleMatch ? CARD_H_ORGANIZER : CARD_H_PUBLIC;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const byRound = useMemo(() => buildMatchesByRound(matches), [matches]);
  const rounds = useMemo(
    () =>
      Object.keys(byRound)
        .map(Number)
        .sort((a, b) => a - b),
    [byRound],
  );

  const maxRound = rounds.length > 0 ? Math.max(...rounds) : 1;
  const roundGap = COL_GAP + 20;

  // Auto-detect active round index
  const defaultRoundIndex = useMemo(() => {
    const idx = rounds.findIndex((r) =>
      byRound[r]?.some(
        (m) => m.status === 'IN_PROGRESS' || m.status === 'SCHEDULED' || m.status === 'READY',
      ),
    );
    return idx >= 0 ? idx : 0;
  }, [rounds, byRound]);

  const [activeRoundIndex, setActiveRoundIndex] = useState<number>(defaultRoundIndex);

  // Sliding 3-Round Window Logic
  const visibleStartIndex = useMemo(() => {
    if (rounds.length <= 3) return 0;
    return Math.max(0, Math.min(activeRoundIndex - 1, rounds.length - 3));
  }, [activeRoundIndex, rounds.length]);

  const visibleRounds = useMemo(() => {
    return rounds.slice(visibleStartIndex, visibleStartIndex + 3);
  }, [rounds, visibleStartIndex]);

  // Calculate compact posMap for visible rounds only
  const posMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const visibleSet = new Set(visibleRounds);

    visibleRounds.forEach((r, vIdx) => {
      const colX = vIdx * (CARD_W + roundGap);
      const roundMatches = byRound[r] ?? [];

      roundMatches.forEach((match, index) => {
        const feeders = matches.filter(
          (m) => m.nextMatchId === match.id && visibleSet.has(m.roundNumber),
        );

        let y = 0;
        if (feeders.length > 0) {
          let ySum = 0;
          let count = 0;
          feeders.forEach((f) => {
            const fPos = map.get(f.id);
            if (fPos) {
              ySum += fPos.y;
              count++;
            }
          });
          y = count > 0 ? ySum / count : 24 + index * (cardH + 20) + cardH / 2;
        } else {
          const step = (cardH + 20) * Math.pow(1.3, Math.min(vIdx, 2));
          y = 24 + index * step + cardH / 2;
        }
        map.set(match.id, { x: colX, y });
      });
    });

    return map;
  }, [visibleRounds, byRound, matches, cardH, roundGap, CARD_W]);

  // Calculate total bounding height for visible rounds
  const totalHeight = useMemo(() => {
    let maxY = 240;
    posMap.forEach((pos) => {
      if (pos.y + cardH / 2 + 30 > maxY) {
        maxY = pos.y + cardH / 2 + 30;
      }
    });
    return maxY;
  }, [posMap, cardH]);

  const numVisible = visibleRounds.length;
  const svgW = numVisible * CARD_W + Math.max(0, numVisible - 1) * roundGap + 36;

  // Smooth scroll reset when switching rounds
  const scrollToRoundIndex = (index: number) => {
    setActiveRoundIndex(index);
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToRoundIndex(defaultRoundIndex);
    }, 100);
    return () => clearTimeout(timer);
  }, [defaultRoundIndex]);

  if (!rounds.length) {
    return (
      <div className="py-12 text-center text-slate-400 italic text-sm">
        Chưa có dữ liệu trận đấu trong nhánh đấu.
      </div>
    );
  }

  const currentRound = rounds[activeRoundIndex] ?? rounds[0];

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-50 p-6 overflow-hidden flex flex-col gap-4'
          : 'relative flex flex-col gap-4 w-full'
      }
    >
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/90 border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              Vòng {activeRoundIndex + 1} / {rounds.length}
            </span>
            <h4 className="text-sm sm:text-base font-bold text-slate-900">
              {getRoundLabel(currentRound - 1, maxRound)}
            </h4>
          </div>
        </div>

        {/* Navigation Arrows & Zoom */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <button
            onClick={() => scrollToRoundIndex(Math.max(activeRoundIndex - 1, 0))}
            disabled={activeRoundIndex === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 transition-all shadow-sm cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Vòng trước
          </button>
          <button
            onClick={() => scrollToRoundIndex(Math.min(activeRoundIndex + 1, rounds.length - 1))}
            disabled={activeRoundIndex === rounds.length - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-xs font-bold text-white transition-all shadow-sm cursor-pointer"
          >
            Vòng tiếp <ChevronRight className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-bold text-slate-600 shadow-sm">
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.1, 0.6))}
              className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded text-slate-700"
              title="Thu nhỏ"
            >
              -
            </button>
            <span className="w-9 text-center text-[11px] select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.1, 1.4))}
              className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded text-slate-700"
              title="Phóng to"
            >
              +
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded text-slate-500 hover:text-slate-900"
              title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Round Selector Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {rounds.map((r, idx) => {
          const isActive = idx === activeRoundIndex;
          const matchCount = byRound[r]?.length ?? 0;
          return (
            <button
              key={r}
              onClick={() => scrollToRoundIndex(idx)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{getRoundLabel(r - 1, maxRound)}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {matchCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Tree Viewport (3 Rounds Window) */}
      <div
        ref={scrollContainerRef}
        className={`overflow-x-auto overflow-y-auto pb-4 border border-slate-200/80 bg-slate-50/40 rounded-xl p-4 shadow-inner no-scrollbar ${
          isFullscreen ? 'flex-1 max-h-none' : 'max-h-[75vh]'
        }`}
        style={{ scrollBehavior: 'smooth' }}
      >
        <div
          style={{
            width: svgW * zoom,
            height: totalHeight * zoom,
            transition: 'width 0.2s ease-out, height 0.2s ease-out',
          }}
          className="relative"
        >
          {/* Round Titles Header for Visible 3 Rounds */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: svgW,
              transition: 'transform 0.2s ease-out',
            }}
            className="flex mb-3 flex-shrink-0"
          >
            <div className="flex" style={{ gap: roundGap }}>
              {visibleRounds.map((r) => {
                const globalIdx = rounds.indexOf(r);
                const isActive = globalIdx === activeRoundIndex;
                return (
                  <div
                    key={r}
                    style={{ width: CARD_W, flexShrink: 0 }}
                    className="text-center"
                  >
                    <button
                      onClick={() => scrollToRoundIndex(globalIdx)}
                      className={`inline-block text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {getRoundLabel(r - 1, maxRound)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Tree Canvas for Visible 3 Rounds */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: svgW,
              height: totalHeight,
              transition: 'transform 0.2s ease-out',
              marginTop: '32px',
            }}
            className="absolute"
          >
            {/* SVG Connectors between visible 3 rounds (Uniform 1.5px Royal Blue / Slate) */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={svgW}
              height={totalHeight}
            >
              {matches.map((m) => {
                const startPos = posMap.get(m.id);
                if (!startPos || !m.nextMatchId) return null;
                const endPos = posMap.get(m.nextMatchId);
                if (!endPos) return null;

                const midX = (startPos.x + CARD_W + endPos.x) / 2;
                const isBlue = m.status === 'COMPLETED' || m.status === 'ONGOING' || m.status === 'IN_PROGRESS';
                const stroke = isBlue ? '#2563eb' : '#cbd5e1';

                return (
                  <path
                    key={m.id}
                    d={`M ${startPos.x + CARD_W} ${startPos.y} H ${midX} V ${endPos.y} H ${endPos.x}`}
                    stroke={stroke}
                    strokeWidth={1.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isBlue ? 0.95 : 0.65}
                  />
                );
              })}
            </svg>

            {/* Match Cards for Visible 3 Rounds */}
            {matches.map((match) => {
              const pos = posMap.get(match.id);
              if (!pos) return null;
              const isP1Bye = isSlotBye(match, 1, matches);
              const isP2Bye = isSlotBye(match, 2, matches);

              return (
                <div
                  key={match.id}
                  className="absolute transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    left: pos.x,
                    top: pos.y - cardH / 2,
                    width: CARD_W,
                  }}
                >
                  <MatchCard
                    match={match}
                    onScheduleMatch={onScheduleMatch}
                    onSelectMatch={onSelectMatch}
                    selected={selectedMatchId === match.id}
                    isP1Bye={isP1Bye}
                    isP2Bye={isP2Bye}
                    fallbackSportRuleKind={fallbackSportRuleKind}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
