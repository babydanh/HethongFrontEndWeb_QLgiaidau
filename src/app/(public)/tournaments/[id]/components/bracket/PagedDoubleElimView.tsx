/**
 * PagedDoubleElimView — Smooth FLIP Morphing Double Elimination Bracket Animations
 *
 * Cards fluidly glide, slide, and morph into new 3-round positions over 350ms cubic-bezier transitions.
 * SVG connector lines dynamically stretch and morph with the cards. Zero snapping or blinking.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, ShieldCheck, Flame, Maximize2, Minimize2 } from 'lucide-react';
import type { BracketMatch } from '@/features/tournaments/api';
import type { SportRuleKind } from '@/types/tournament';
import type {
  BracketDragHandlers,
  OnScheduleMatch,
  OnSelectBracketMatch,
} from './types';
import { CARD_W, CARD_H_PUBLIC, CARD_H_ORGANIZER, COL_GAP, MATCH_GAP_Y } from './types';
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
  dragHandlers?: BracketDragHandlers;
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
  dragHandlers,
}: Props) {
  const translate = useTranslations('BracketView');
  const cardH = onScheduleMatch ? CARD_H_ORGANIZER : CARD_H_PUBLIC;
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

  // Auto-detect branch
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

  // Sliding 3-Round Window Logic
  const visibleStartIndex = useMemo(() => {
    if (activeBranchRounds.length <= 3) return 0;
    return Math.max(0, Math.min(activeRoundIndex - 1, activeBranchRounds.length - 3));
  }, [activeRoundIndex, activeBranchRounds.length]);

  const visibleRounds = useMemo(() => {
    return activeBranchRounds.slice(visibleStartIndex, visibleStartIndex + 3);
  }, [activeBranchRounds, visibleStartIndex]);

  const getUbLabel = (r: number) => {
    const rIndex = ubRounds.indexOf(r);
    if (rIndex < 0) return translate('upperRound', { number: r });
    if (gfMatches.length > 0 && rIndex === ubRounds.length - 1) return translate('grandFinal');

    const ubOnlyRounds = gfMatches.length > 0 ? ubRounds.length - 1 : ubRounds.length;
    const fromUbEnd = ubOnlyRounds - 1 - rIndex;

    if (fromUbEnd === 0) return translate('upperFinal');
    if (fromUbEnd === 1) return translate('upperSemifinal');
    if (fromUbEnd === 2) return translate('upperQuarterfinal');
    if (fromUbEnd === 3) return translate('upperRound16');
    if (fromUbEnd === 4) return translate('upperRound32');
    if (fromUbEnd === 5) return translate('upperRound64');
    if (fromUbEnd === 6) return translate('upperRound128');
    return translate('upperRound', { number: r });
  };

  const getLbLabel = (r: number) => {
    const rIndex = lbRounds.indexOf(r);
    if (rIndex < 0) return translate('lowerRound', { number: r });
    const fromLbEnd = lbRounds.length - 1 - rIndex;

    if (fromLbEnd === 0) return translate('lowerFinal');
    if (fromLbEnd === 1) return translate('lowerSemifinal');
    if (fromLbEnd === 2) return translate('lowerQuarterfinal');
    if (fromLbEnd === 3) return translate('lowerRound16');
    if (fromLbEnd === 4) return translate('lowerRound32');
    if (fromLbEnd === 5) return translate('lowerRound64');
    if (fromLbEnd === 6) return translate('lowerRound128');
    return translate('lowerRound', { number: r });
  };

  const getRoundTitle = (r: number) =>
    activeBranch === 'upper' ? getUbLabel(r) : getLbLabel(r);

  const currentRound = activeBranchRounds[activeRoundIndex] ?? activeBranchRounds[0];
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  React.useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const numVisible = visibleRounds.length;

  // Dynamic responsive card width and gap
  const { cardW, roundGap } = useMemo(() => {
    if (!containerWidth || numVisible <= 0) {
      return { cardW: CARD_W, roundGap: COL_GAP };
    }
    const available = containerWidth - 56;
    const minNeeded = numVisible * CARD_W + Math.max(0, numVisible - 1) * 36;

    if (available >= minNeeded) {
      const targetGap = Math.min(64, Math.max(36, Math.floor(available * 0.05)));
      const candidateW = Math.floor((available - (numVisible - 1) * targetGap) / numVisible);
      const finalCardW = Math.min(320, Math.max(CARD_W, candidateW));
      const remaining = available - numVisible * finalCardW;
      const finalGap = numVisible > 1
        ? Math.min(72, Math.max(36, Math.floor(remaining / (numVisible - 1))))
        : COL_GAP;
      return { cardW: finalCardW, roundGap: finalGap };
    }

    return { cardW: CARD_W, roundGap: 36 };
  }, [containerWidth, numVisible]);

  // Calculate compact posMap for visible rounds (top-aligned at y = 16px)
  const posMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const visibleSet = new Set(visibleRounds);

    visibleRounds.forEach((r, vIdx) => {
      const colX = vIdx * (cardW + roundGap);
      const roundMatches = activeBranchByRound[r] ?? [];

      let previousY = Number.NEGATIVE_INFINITY;
      roundMatches.forEach((match, index) => {
        const feeders = activeBranchMatches.filter(
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
          y = count > 0
            ? ySum / count
            : 16 + index * (cardH + MATCH_GAP_Y) + cardH / 2;
        } else {
          const step = (cardH + MATCH_GAP_Y) * Math.pow(1.35, Math.min(vIdx, 2));
          y = 16 + index * step + cardH / 2;
        }

        // A feeder average can collapse two cards onto the same vertical band.
        // Enforce a minimum center distance per column so cards never overlap,
        // while keeping the connector geometry based on the final positions.
        const minimumY = Number.isFinite(previousY)
          ? previousY + cardH + MATCH_GAP_Y
          : 16 + cardH / 2;
        y = Math.max(y, minimumY);
        map.set(match.id, { x: colX, y });
        previousY = y;
      });
    });

    return map;
  }, [visibleRounds, activeBranchByRound, activeBranchMatches, cardH, cardW, roundGap]);

  // Calculate dynamic bounding height to fit matches tightly
  const totalHeight = useMemo(() => {
    let maxY = 180;
    posMap.forEach((pos) => {
      if (pos.y + cardH / 2 + 20 > maxY) {
        maxY = pos.y + cardH / 2 + 20;
      }
    });
    return maxY;
  }, [posMap, cardH]);

  const svgW = Math.max(
    containerWidth > 0 ? containerWidth - 32 : 0,
    numVisible * cardW + Math.max(0, numVisible - 1) * roundGap + 32
  );

  // Auto-scroll horizontally when active round changes to ensure active column (e.g. Finals) is never cut off
  React.useEffect(() => {
    if (!viewportRef.current) return;
    const activeVisibleIdx = visibleRounds.indexOf(activeBranchRounds[activeRoundIndex]);
    if (activeVisibleIdx >= 0) {
      const colX = activeVisibleIdx * (cardW + roundGap) * zoom;
      const containerW = viewportRef.current.clientWidth;
      const targetScroll = Math.max(0, colX - (containerW - cardW * zoom) / 2);
      viewportRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, [activeRoundIndex, visibleRounds, zoom, cardW, roundGap, activeBranchRounds]);

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex flex-col gap-3 overflow-hidden bg-slate-50 p-2 sm:gap-4 sm:p-6'
          : 'relative flex min-w-0 w-full flex-col gap-4'
      }
    >
      {/* Branch Tabs Switcher */}
      <div className="flex min-w-0 flex-wrap gap-2 overflow-x-auto border-b border-slate-200 pb-2 no-scrollbar">
        <button
          onClick={() => {
            setActiveBranch('upper');
            setActiveRoundIndex(0);
          }}
          className={`flex min-w-[calc(50%-0.25rem)] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-all whitespace-nowrap sm:min-w-0 sm:px-4 ${
            activeBranch === 'upper'
              ? 'bg-blue-50 text-blue-700 border-blue-200 font-extrabold shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>{translate('upperTab')}</span>
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
            className={`flex min-w-[calc(50%-0.25rem)] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-all whitespace-nowrap sm:min-w-0 sm:px-4 ${
              activeBranch === 'lower'
                ? 'bg-rose-50 text-rose-700 border-rose-200 font-extrabold shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-600" />
            <span>{translate('lowerTab')}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100/60 text-rose-700 font-semibold">
              {lowerMatches.length}
            </span>
          </button>
        )}
      </div>

      {/* Top Navigation & Controls Bar */}
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
            {translate('roundProgress', { current: activeRoundIndex + 1, total: activeBranchRounds.length })}
          </span>
          <h4 className="text-sm sm:text-base font-bold text-slate-900">
            {getRoundTitle(currentRound)}
          </h4>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
          <button
            onClick={() => setActiveRoundIndex(Math.max(activeRoundIndex - 1, 0))}
            disabled={activeRoundIndex === 0}
            className="flex min-w-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-100 disabled:opacity-40 sm:px-3 sm:py-1.5"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">{translate('previousMobile')}</span><span className="hidden sm:inline">{translate('previous')}</span>
          </button>
          <button
            onClick={() => setActiveRoundIndex(Math.min(activeRoundIndex + 1, activeBranchRounds.length - 1))}
            disabled={activeRoundIndex === activeBranchRounds.length - 1}
            className="flex min-w-0 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-40 sm:px-3 sm:py-1.5"
          >
            <span className="sm:hidden">{translate('nextMobile')}</span><span className="hidden sm:inline">{translate('next')}</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>

          <div className="col-span-2 hidden h-px w-full bg-slate-200 sm:block sm:h-4 sm:w-px" />

          {/* Zoom controls */}
          <div className="col-span-2 flex min-w-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-bold text-slate-600 shadow-sm sm:col-span-1">
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.1, 0.6))}
              className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded text-slate-700"
              title={translate('zoomOut')}
            >
              -
            </button>
            <span className="w-9 text-center text-[11px] select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.1, 1.4))}
              className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded text-slate-700"
              title={translate('zoomIn')}
            >
              +
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded text-slate-500 hover:text-slate-900"
              title={isFullscreen ? translate('exitFullscreen') : translate('fullscreen')}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* GPU-Accelerated Adaptive Tree Viewport */}
      <div
        ref={viewportRef}
        className={`min-h-0 min-w-0 touch-pan-x touch-pan-y overflow-x-auto overflow-y-auto scroll-smooth rounded-xl border border-slate-200/80 bg-slate-50/40 p-2 shadow-inner scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 sm:p-4 ${
          isFullscreen ? 'flex-1 max-h-none' : ''
        }`}
      >
        <div
          style={{
            width: svgW * zoom,
            height: (totalHeight + 36) * zoom,
          }}
          className="relative"
        >
          {/* Round Titles Header for Visible 3 Rounds */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: svgW,
            }}
            className="flex mb-2 flex-shrink-0"
          >
            <div className="flex" style={{ gap: roundGap }}>
              {visibleRounds.map((r) => {
                const globalIdx = activeBranchRounds.indexOf(r);
                const isActive = globalIdx === activeRoundIndex;
                return (
                  <div
                    key={r}
                    style={{ width: cardW, flexShrink: 0 }}
                    className="text-center"
                  >
                    <button
                      onClick={() => setActiveRoundIndex(globalIdx)}
                      className={`inline-block text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full border transition-all duration-300 cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {getRoundTitle(r)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Canvas with Smooth Fluid Morphing Transitions */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: svgW,
              height: totalHeight,
              marginTop: '32px',
            }}
            className="absolute"
          >
            {/* SVG Connectors with Smooth Fluid Morphing */}
            <svg
              className="pointer-events-none absolute inset-0 z-0"
              width={svgW}
              height={totalHeight}
            >
              {activeBranchMatches.map((m) => {
                const startPos = posMap.get(m.id);
                if (!startPos || !m.nextMatchId) return null;
                const endPos = posMap.get(m.nextMatchId);
                if (!endPos) return null;

                const midX = (startPos.x + cardW + endPos.x) / 2;
                const isBlue = m.status === 'COMPLETED' || m.status === 'ONGOING' || m.status === 'IN_PROGRESS';
                const stroke = isBlue ? '#2563eb' : '#cbd5e1';

                return (
                  <path
                    key={m.id}
                    d={`M ${startPos.x + cardW} ${startPos.y} H ${midX} V ${endPos.y} H ${endPos.x}`}
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

            {/* Match Cards with Smooth FLIP Position Gliding Transitions */}
            {activeBranchMatches.map((match) => {
              const pos = posMap.get(match.id);
              if (!pos) return null;
              const isP1Bye = isSlotBye(match, 1, activeBranchMatches);
              const isP2Bye = isSlotBye(match, 2, activeBranchMatches);

              return (
                <div
                  key={match.id}
                  className="absolute isolate z-10"
                  style={{
                    transform: `translate3d(${pos.x}px, ${pos.y - cardH / 2}px, 0px)`,
                    width: cardW,
                    transition: 'transform 350ms cubic-bezier(0.23, 1, 0.32, 1), opacity 180ms ease-out',
                    willChange: 'transform',
                  }}
                >
                  <MatchCard
                    match={match}
                    cardWidth={cardW}
                    onScheduleMatch={onScheduleMatch}
                    onSelectMatch={onSelectMatch}
                    selected={selectedMatchId === match.id}
                    isP1Bye={isP1Bye}
                    isP2Bye={isP2Bye}
                    fallbackSportRuleKind={fallbackSportRuleKind}
                    dragHandlers={dragHandlers}
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
