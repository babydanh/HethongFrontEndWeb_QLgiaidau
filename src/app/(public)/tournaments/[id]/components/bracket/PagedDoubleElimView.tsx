/**
 * PagedDoubleElimView — Full Tree Double Elimination with World Cup Style Focus Animations
 */

'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ShieldCheck, Flame, Maximize2, Minimize2 } from 'lucide-react';
import type { BracketMatch } from '@/features/tournaments/api';
import type { SportRuleKind } from '@/types/tournament';
import type { OnScheduleMatch, OnSelectBracketMatch } from './types';
import { CARD_W, CARD_H_PUBLIC, CARD_H_ORGANIZER, COL_GAP } from './types';
import { buildMatchesByRound, isSlotBye } from './helpers';
import { MatchCard } from './MatchCard';

interface Props {
  upperMatches: BracketMatch[];
  lowerMatches: BracketMatch[];
  gfMatches: BracketMatch[];
  onScheduleMatch?: OnScheduleMatch;
  selectedMatchId?: string | null;
  onSelectMatch?: OnSelectBracketMatch;
  fallbackSportRuleKind?: SportRuleKind;
}

type BranchTab = 'upper' | 'lower';

export function PagedDoubleElimView({
  upperMatches,
  lowerMatches,
  gfMatches,
  onScheduleMatch,
  selectedMatchId,
  onSelectMatch,
  fallbackSportRuleKind,
}: Props) {
  const cardH = onScheduleMatch ? CARD_H_ORGANIZER : CARD_H_PUBLIC;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Merge Grand Finals into Upper Bracket as the final round
  const combinedUpperMatches = useMemo(() => {
    if (!gfMatches.length) return upperMatches;
    const maxUbRound = upperMatches.length > 0
      ? Math.max(...upperMatches.map((m) => m.roundNumber))
      : 0;
    return [
      ...upperMatches,
      ...gfMatches.map((m) => ({
        ...m,
        roundNumber: maxUbRound + 1,
      })),
    ];
  }, [upperMatches, gfMatches]);

  const ubByRound = useMemo(() => buildMatchesByRound(combinedUpperMatches), [combinedUpperMatches]);
  const lbByRound = useMemo(() => buildMatchesByRound(lowerMatches), [lowerMatches]);

  const ubRounds = useMemo(
    () =>
      Object.keys(ubByRound)
        .map(Number)
        .sort((a, b) => a - b),
    [ubByRound],
  );
  const lbRounds = useMemo(
    () =>
      Object.keys(lbByRound)
        .map(Number)
        .sort((a, b) => a - b),
    [lbByRound],
  );

  // Auto-detect branch and round currently active
  const defaultBranch: BranchTab = useMemo(() => {
    const hasLiveOrScheduled = (list: BracketMatch[]) =>
      list.some((m) => m.status === 'IN_PROGRESS' || m.status === 'SCHEDULED' || m.status === 'READY');
    if (hasLiveOrScheduled(lowerMatches) && !hasLiveOrScheduled(combinedUpperMatches)) return 'lower';
    return 'upper';
  }, [combinedUpperMatches, lowerMatches]);

  const [activeBranch, setActiveBranch] = useState<BranchTab>(defaultBranch);

  const activeBranchRounds = activeBranch === 'upper' ? ubRounds : lbRounds;
  const activeBranchByRound = activeBranch === 'upper' ? ubByRound : lbByRound;
  const activeBranchMatches = activeBranch === 'upper' ? combinedUpperMatches : lowerMatches;

  const defaultRoundIndex = useMemo(() => {
    const idx = activeBranchRounds.findIndex((r) =>
      activeBranchByRound[r]?.some(
        (m) => m.status === 'IN_PROGRESS' || m.status === 'SCHEDULED' || m.status === 'READY',
      ),
    );
    return idx >= 0 ? idx : 0;
  }, [activeBranchRounds, activeBranchByRound]);

  const [activeRoundIndex, setActiveRoundIndex] = useState<number>(defaultRoundIndex);

  const maxUbRound = ubRounds.length;
  const getUbLabel = (r: number) => {
    if (gfMatches.length > 0 && r === maxUbRound) return 'Chung kết Tổng';
    const fromEnd = ubRounds.length - (ubRounds.indexOf(r) + 1);
    if (fromEnd === 0 || (gfMatches.length > 0 && fromEnd === 1)) return 'Chung kết Nhánh thắng';
    if (fromEnd === 1 || (gfMatches.length > 0 && fromEnd === 2)) return 'Bán kết Nhánh thắng';
    if (fromEnd === 2 || (gfMatches.length > 0 && fromEnd === 3)) return 'Tứ kết Nhánh thắng';
    return `Vòng ${r} Nhánh thắng`;
  };

  const getLbLabel = (r: number) => {
    const fromEnd = lbRounds.length - (lbRounds.indexOf(r) + 1);
    if (fromEnd === 0) return 'Chung kết Nhánh thua';
    if (fromEnd === 1) return 'Bán kết Nhánh thua';
    return `Lượt ${r} Nhánh thua`;
  };

  const getRoundTitle = (r: number) =>
    activeBranch === 'upper' ? getUbLabel(r) : getLbLabel(r);

  const slotHBase = cardH + 20;
  const roundGap = COL_GAP + 28;

  // Calculate compact posMap for active branch matches
  const posMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();

    activeBranchRounds.forEach((r, idx) => {
      const colX = idx * (CARD_W + roundGap);
      const roundMatches = activeBranchByRound[r] ?? [];

      roundMatches.forEach((match, index) => {
        const feeders = activeBranchMatches.filter((m) => m.nextMatchId === match.id);
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
          y = count > 0 ? ySum / count : 32 + index * slotHBase + cardH / 2;
        } else {
          const step = slotHBase * Math.pow(1.4, Math.min(idx, 2));
          y = 32 + index * step + cardH / 2;
        }
        map.set(match.id, { x: colX, y });
      });
    });

    return map;
  }, [activeBranchRounds, activeBranchByRound, activeBranchMatches, cardH, roundGap, CARD_W, slotHBase]);

  // Calculate total bounding height
  const totalHeight = useMemo(() => {
    let maxY = 320;
    posMap.forEach((pos) => {
      if (pos.y + cardH / 2 + 40 > maxY) {
        maxY = pos.y + cardH / 2 + 40;
      }
    });
    return maxY;
  }, [posMap, cardH]);

  const numRounds = activeBranchRounds.length;
  const svgW = numRounds * CARD_W + Math.max(0, numRounds - 1) * roundGap + 48;

  const scrollToRoundIndex = (index: number) => {
    setActiveRoundIndex(index);
    if (!scrollContainerRef.current) return;
    const colX = index * (CARD_W + roundGap);
    const targetScrollLeft = Math.max(0, colX * zoom - 24);

    const r = activeBranchRounds[index];
    const matchesInRound = activeBranchByRound[r] ?? [];
    let targetScrollTop = 0;
    if (matchesInRound.length > 0) {
      let ySum = 0;
      let count = 0;
      matchesInRound.forEach((m) => {
        const p = posMap.get(m.id);
        if (p) {
          ySum += p.y;
          count++;
        }
      });
      if (count > 0) {
        const avgY = ySum / count;
        const containerH = scrollContainerRef.current.clientHeight || 450;
        targetScrollTop = Math.max(0, avgY * zoom - containerH / 2);
      }
    }

    scrollContainerRef.current.scrollTo({
      left: targetScrollLeft,
      top: targetScrollTop,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToRoundIndex(defaultRoundIndex);
    }, 150);
    return () => clearTimeout(timer);
  }, [defaultRoundIndex, activeBranch]);

  const currentRound = activeBranchRounds[activeRoundIndex] ?? activeBranchRounds[0];

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-50 p-6 overflow-hidden flex flex-col gap-4'
          : 'relative flex flex-col gap-4 w-full'
      }
    >
      {/* Branch Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => {
            setActiveBranch('upper');
            setActiveRoundIndex(0);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
            activeBranch === 'upper'
              ? 'bg-blue-50 text-blue-700 border-blue-200 font-extrabold shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Nhánh Thắng</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100/60 text-blue-700 font-semibold">
            {combinedUpperMatches.length}
          </span>
        </button>

        {lowerMatches.length > 0 && (
          <button
            onClick={() => {
              setActiveBranch('lower');
              setActiveRoundIndex(0);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
              activeBranch === 'lower'
                ? 'bg-rose-50 text-rose-700 border-rose-200 font-extrabold shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-600" />
            <span>Nhánh Thua</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100/60 text-rose-700 font-semibold">
              {lowerMatches.length}
            </span>
          </button>
        )}
      </div>

      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/90 border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
        <div>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
            Vòng {activeRoundIndex + 1} / {activeBranchRounds.length}
          </span>
          <h4 className="text-sm sm:text-base font-bold text-slate-900">
            {getRoundTitle(currentRound)}
          </h4>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <button
            onClick={() => scrollToRoundIndex(Math.max(activeRoundIndex - 1, 0))}
            disabled={activeRoundIndex === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 transition-all shadow-sm cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Vòng trước
          </button>
          <button
            onClick={() => scrollToRoundIndex(Math.min(activeRoundIndex + 1, activeBranchRounds.length - 1))}
            disabled={activeRoundIndex === activeBranchRounds.length - 1}
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
        {activeBranchRounds.map((r, idx) => {
          const isActive = idx === activeRoundIndex;
          const matchCount = activeBranchByRound[r]?.length ?? 0;
          return (
            <button
              key={r}
              onClick={() => scrollToRoundIndex(idx)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{getRoundTitle(r)}</span>
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
            transition: 'width 0.2s ease-out, height 0.2s ease-out',
          }}
          className="relative"
        >
          {/* Round Titles Canvas Header */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: svgW,
              transition: 'transform 0.2s ease-out',
            }}
            className="flex mb-4 flex-shrink-0"
          >
            <div className="flex" style={{ gap: roundGap }}>
              {activeBranchRounds.map((r, idx) => {
                const isActive = idx === activeRoundIndex;
                return (
                  <div
                    key={r}
                    style={{ width: CARD_W, flexShrink: 0 }}
                    className="text-center"
                  >
                    <button
                      onClick={() => scrollToRoundIndex(idx)}
                      className={`inline-block text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full border transition-all duration-300 cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105 ring-2 ring-blue-400/30'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {getRoundTitle(r)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Tree Canvas */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: svgW,
              height: totalHeight,
              transition: 'transform 0.2s ease-out',
              marginTop: '36px',
            }}
            className="absolute"
          >
            {/* SVG Connectors between rounds with dynamic highlight animation */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={svgW}
              height={totalHeight}
            >
              {activeBranchMatches.map((m) => {
                const startPos = posMap.get(m.id);
                if (!startPos || !m.nextMatchId) return null;
                const endPos = posMap.get(m.nextMatchId);
                if (!endPos) return null;

                const isConnectedToActive =
                  m.roundNumber === currentRound ||
                  activeBranchMatches.find((nm) => nm.id === m.nextMatchId)?.roundNumber === currentRound;

                const midX = (startPos.x + CARD_W + endPos.x) / 2;
                const stroke = isConnectedToActive
                  ? '#2563eb'
                  : m.status === 'COMPLETED'
                    ? '#10b981'
                    : '#cbd5e1';

                return (
                  <path
                    key={m.id}
                    d={`M ${startPos.x + CARD_W} ${startPos.y} L ${midX} ${startPos.y} L ${midX} ${endPos.y} L ${endPos.x} ${endPos.y}`}
                    stroke={stroke}
                    strokeWidth={isConnectedToActive ? 2.5 : 1.5}
                    fill="none"
                    opacity={isConnectedToActive ? 1 : 0.6}
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>

            {/* Match Cards with Smooth Round Focus Scale & Opacity Animations */}
            {activeBranchMatches.map((match) => {
              const pos = posMap.get(match.id);
              if (!pos) return null;
              const isP1Bye = isSlotBye(match, 1, activeBranchMatches);
              const isP2Bye = isSlotBye(match, 2, activeBranchMatches);
              const isActiveRound = match.roundNumber === currentRound;

              return (
                <div
                  key={match.id}
                  className={`absolute transition-all duration-300 ${
                    isActiveRound
                      ? 'scale-105 z-20 opacity-100 drop-shadow-md'
                      : 'scale-100 z-10 opacity-75 hover:opacity-100 hover:scale-102'
                  }`}
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
