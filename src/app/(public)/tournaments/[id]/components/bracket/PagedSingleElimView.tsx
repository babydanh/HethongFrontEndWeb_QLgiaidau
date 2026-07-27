/**
 * PagedSingleElimView — Full Tree Bracket with Auto-Focus & Smooth Camera Scroll Navigation
 *
 * Renders the full connected tree with continuous SVG lines.
 * Auto-scrolls camera to the current active round on load.
 * Controls (< Vòng trước / Vòng tiếp > and Pills) smoothly scroll the camera to the selected round column.
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

  // Find baseline first-round match count for vertical slot height
  let firstRoundCount = 1;
  rounds.forEach((r) => {
    const count = byRound[r]?.length || 0;
    const estimate = count * Math.pow(2, r - 1);
    if (estimate > firstRoundCount) firstRoundCount = estimate;
  });

  const SLOT_H_1 = cardH + 20;
  const roundGap = COL_GAP + 28;
  const totalHeight = Math.max(firstRoundCount * SLOT_H_1 + 60, 360);

  // Position map for all matches in the full tree
  const posMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    rounds.forEach((r) => {
      const colX = (r - 1) * (CARD_W + roundGap);
      const slotH = Math.pow(2, r - 1) * SLOT_H_1;
      const roundMatches = byRound[r] ?? [];
      const roundH = roundMatches.length * slotH;
      const roundTop = 32 + (totalHeight - 64 - roundH) / 2;

      roundMatches.forEach((match, index) => {
        map.set(match.id, {
          x: colX,
          y: roundTop + index * slotH + slotH / 2,
        });
      });
    });
    return map;
  }, [rounds, byRound, totalHeight, roundGap, CARD_W, SLOT_H_1]);

  const svgW = maxRound * CARD_W + (maxRound - 1) * roundGap + 48;

  // Auto-detect active round index (round with IN_PROGRESS, SCHEDULED, or READY matches)
  const defaultRoundIndex = useMemo(() => {
    const idx = rounds.findIndex((r) =>
      byRound[r]?.some(
        (m) => m.status === 'IN_PROGRESS' || m.status === 'SCHEDULED' || m.status === 'READY',
      ),
    );
    return idx >= 0 ? idx : 0;
  }, [rounds, byRound]);

  const [activeRoundIndex, setActiveRoundIndex] = useState<number>(defaultRoundIndex);

  // Function to smoothly scroll viewport camera to focus on target round column
  const scrollToRoundIndex = (index: number) => {
    setActiveRoundIndex(index);
    if (!scrollContainerRef.current) return;
    const r = rounds[index];
    if (!r) return;
    const colX = (r - 1) * (CARD_W + roundGap);
    const targetScrollLeft = Math.max(0, colX * zoom - 24);
    scrollContainerRef.current.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth',
    });
  };

  // Auto scroll to active round on mount or when default round changes
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToRoundIndex(defaultRoundIndex);
    }, 150);
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
      {/* Top Header Controls — Minimal Light Style */}
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

      {/* Scrollable Tree Viewport */}
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
            transition: 'width 0.15s ease-out, height 0.15s ease-out',
          }}
          className="relative"
        >
          {/* Round Titles Canvas Header */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: svgW,
              transition: 'transform 0.15s ease-out',
            }}
            className="flex mb-4 flex-shrink-0"
          >
            <div className="flex" style={{ gap: roundGap }}>
              {rounds.map((r, idx) => (
                <div
                  key={r}
                  style={{ width: CARD_W, flexShrink: 0 }}
                  className="text-center"
                >
                  <button
                    onClick={() => scrollToRoundIndex(idx)}
                    className={`inline-block text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full border transition-all cursor-pointer ${
                      idx === activeRoundIndex
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {getRoundLabel(r - 1, maxRound)}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Tree Canvas */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: svgW,
              height: totalHeight,
              transition: 'transform 0.15s ease-out',
              marginTop: '40px',
            }}
            className="absolute"
          >
            {/* SVG Connectors between rounds */}
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
                const stroke = m.status === 'COMPLETED' ? '#10b981' : '#cbd5e1';

                return (
                  <path
                    key={m.id}
                    d={`M ${startPos.x + CARD_W} ${startPos.y} L ${midX} ${startPos.y} L ${midX} ${endPos.y} L ${endPos.x} ${endPos.y}`}
                    stroke={stroke}
                    strokeWidth={1.5}
                    fill="none"
                    opacity={0.8}
                  />
                );
              })}
            </svg>

            {/* Match Cards */}
            {matches.map((match) => {
              const pos = posMap.get(match.id);
              if (!pos) return null;
              const isP1Bye = isSlotBye(match, 1, matches);
              const isP2Bye = isSlotBye(match, 2, matches);
              return (
                <div
                  key={match.id}
                  className="absolute transition-transform duration-200 hover:-translate-y-0.5"
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
