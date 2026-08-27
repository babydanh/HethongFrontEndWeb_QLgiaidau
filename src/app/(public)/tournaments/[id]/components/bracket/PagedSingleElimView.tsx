/**
 * PagedSingleElimView — Smooth FLIP Morphing Bracket Re-ordering Animations
 *
 * Cards fluidly glide, slide, and morph into new 3-round positions over 350ms cubic-bezier transitions.
 * SVG connector lines dynamically stretch and morph with the cards. Zero snapping or blinking.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Trophy, Maximize2, Minimize2 } from 'lucide-react';
import type { BracketMatch } from '@/features/tournaments/api';
import type { SportRuleKind } from '@/types/tournament';
import type {
  BracketDragHandlers,
  OnScheduleMatch,
  OnSelectBracketMatch,
} from './types';
import { CARD_W, CARD_H_PUBLIC, CARD_H_ORGANIZER, COL_GAP, MATCH_GAP_Y } from './types';
import { buildMatchesByRound, getRoundLabel, isSlotBye } from './helpers';
import { MatchCard } from './MatchCard';

interface Props {
  matches: BracketMatch[];
  onScheduleMatch?: OnScheduleMatch;
  selectedMatchId?: string | null;
  onSelectMatch?: OnSelectBracketMatch;
  onDoubleClickMatch?: OnSelectBracketMatch;
  fallbackSportRuleKind?: SportRuleKind;
  dragHandlers?: BracketDragHandlers;
}

export function PagedSingleElimView({
  matches,
  onScheduleMatch,
  selectedMatchId,
  onSelectMatch,
  onDoubleClickMatch,
  fallbackSportRuleKind,
  dragHandlers,
}: Props) {
  const bracketTranslate = useTranslations('BracketView');
  const cardH = onScheduleMatch ? CARD_H_ORGANIZER : CARD_H_PUBLIC;
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

  // Sliding 3-Round Window Logic
  const visibleStartIndex = useMemo(() => {
    if (rounds.length <= 3) return 0;
    return Math.max(0, Math.min(activeRoundIndex - 1, rounds.length - 3));
  }, [activeRoundIndex, rounds.length]);

  const visibleRounds = useMemo(() => {
    return rounds.slice(visibleStartIndex, visibleStartIndex + 3);
  }, [rounds, visibleStartIndex]);

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
      const roundMatches = byRound[r] ?? [];

      let previousY = Number.NEGATIVE_INFINITY;
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
          y = count > 0
            ? ySum / count
            : 16 + index * (cardH + MATCH_GAP_Y) + cardH / 2;
        } else {
          const step = (cardH + MATCH_GAP_Y) * Math.pow(1.35, Math.min(vIdx, 2));
          y = 16 + index * step + cardH / 2;
        }

        const minimumY = Number.isFinite(previousY)
          ? previousY + cardH + MATCH_GAP_Y
          : 16 + cardH / 2;
        y = Math.max(y, minimumY);
        map.set(match.id, { x: colX, y });
        previousY = y;
      });
    });

    return map;
  }, [visibleRounds, byRound, matches, cardH, cardW, roundGap]);

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

  const roundLabelTranslations = {
    final: bracketTranslate('singleFinal'),
    semifinal: bracketTranslate('singleSemifinal'),
    quarterfinal: bracketTranslate('singleQuarterfinal'),
    roundOf: (number: number) => {
      if (number === 128) return bracketTranslate('singleRound128');
      if (number === 64) return bracketTranslate('singleRound64');
      if (number === 32) return bracketTranslate('singleRound32');
      if (number === 16) return bracketTranslate('singleRound16');
      return bracketTranslate('singleRound', { number });
    },
  };

  const currentRound = rounds[activeRoundIndex] ?? rounds[0];

  // Auto-scroll horizontally when active round changes to ensure active column (e.g. Finals) is never cut off
  React.useEffect(() => {
    if (!viewportRef.current) return;
    const activeVisibleIdx = visibleRounds.indexOf(rounds[activeRoundIndex]);
    if (activeVisibleIdx >= 0) {
      const colX = activeVisibleIdx * (cardW + roundGap) * zoom;
      const containerW = viewportRef.current.clientWidth;
      const targetScroll = Math.max(0, colX - (containerW - cardW * zoom) / 2);
      viewportRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, [activeRoundIndex, visibleRounds, zoom, cardW, roundGap, rounds]);

  if (!rounds.length) {
    return (
      <div className="py-12 text-center text-slate-400 italic text-sm">
        {bracketTranslate('noMatches')}
      </div>
    );
  }

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex flex-col gap-3 overflow-hidden bg-slate-50 p-2 sm:gap-4 sm:p-6'
          : 'relative flex min-w-0 w-full flex-col gap-4'
      }
    >
      {/* Top Navigation & Controls Bar */}
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              {bracketTranslate('roundProgress', { current: activeRoundIndex + 1, total: rounds.length })}
            </span>
            <h4 className="text-sm sm:text-base font-bold text-slate-900">
              {getRoundLabel(currentRound - 1, maxRound, '', roundLabelTranslations)}
            </h4>
          </div>
        </div>

        {/* Navigation Arrows & Zoom */}
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
          <button
            onClick={() => setActiveRoundIndex(Math.max(activeRoundIndex - 1, 0))}
            disabled={activeRoundIndex === 0}
            className="flex min-w-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-100 disabled:opacity-40 sm:px-3 sm:py-1.5"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">{bracketTranslate('previousMobile')}</span><span className="hidden sm:inline">{bracketTranslate('previous')}</span>
          </button>
          <button
            onClick={() => setActiveRoundIndex(Math.min(activeRoundIndex + 1, rounds.length - 1))}
            disabled={activeRoundIndex === rounds.length - 1}
            className="flex min-w-0 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-40 sm:px-3 sm:py-1.5"
          >
            <span className="sm:hidden">{bracketTranslate('nextMobile')}</span><span className="hidden sm:inline">{bracketTranslate('next')}</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>

          <div className="col-span-2 hidden h-px w-full bg-slate-200 sm:block sm:h-4 sm:w-px" />

          {/* Zoom controls */}
          <div className="col-span-2 flex min-w-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-bold text-slate-600 shadow-sm sm:col-span-1">
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.1, 0.6))}
              className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded text-slate-700"
              title={bracketTranslate('zoomOut')}
            >
              -
            </button>
            <span className="w-9 text-center text-[11px] select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.1, 1.4))}
              className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded text-slate-700"
              title={bracketTranslate('zoomIn')}
            >
              +
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded text-slate-500 hover:text-slate-900"
              title={isFullscreen ? bracketTranslate('exitFullscreen') : bracketTranslate('fullscreen')}
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
                const globalIdx = rounds.indexOf(r);
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
                      {getRoundLabel(r - 1, maxRound, '', roundLabelTranslations)}
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
              {matches.map((m) => {
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
            {matches.map((match) => {
              const pos = posMap.get(match.id);
              if (!pos) return null;
              const isP1Bye = isSlotBye(match, 1, matches);
              const isP2Bye = isSlotBye(match, 2, matches);

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
                    onDoubleClickMatch={onDoubleClickMatch}
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
