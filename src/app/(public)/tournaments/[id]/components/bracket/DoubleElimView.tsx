/**
 * DoubleElimView — double-elimination bracket tree
 *
 * Renders Winners Bracket (upper), Losers Bracket (lower),
 * and Grand Final (rightmost column).
 * Supports multi-touch pinch to zoom, touch drag/pan (20 % – 250 %), auto-fit, and fullscreen.
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Maximize2, Minimize2, Scan } from 'lucide-react';
import type { BracketMatch } from '@/features/tournaments/api';
import type { SportRuleKind } from '@/types/tournament';
import type {
  BracketDragHandlers,
  OnScheduleMatch,
  OnSelectBracketMatch,
} from './types';
import { CARD_W, CARD_H_PUBLIC, CARD_H_ORGANIZER, COL_GAP } from './types';
import { buildMatchesByRound, isSlotBye } from './helpers';
import { MatchCard } from './MatchCard';
import { useBracketPanZoom } from './useBracketPanZoom';

interface Props {
  upperMatches: BracketMatch[];
  lowerMatches: BracketMatch[];
  gfMatches: BracketMatch[];
  onScheduleMatch?: OnScheduleMatch;
  selectedMatchId?: string | null;
  onSelectMatch?: OnSelectBracketMatch;
  onDoubleClickMatch?: OnSelectBracketMatch;
  fallbackSportRuleKind?: SportRuleKind;
  panEnabled?: boolean;
  dragHandlers?: BracketDragHandlers;
}

export function DoubleElimView({
  upperMatches,
  lowerMatches,
  gfMatches,
  onScheduleMatch,
  selectedMatchId,
  onSelectMatch,
  onDoubleClickMatch,
  fallbackSportRuleKind,
  panEnabled = true,
  dragHandlers,
}: Props) {
  const translate = useTranslations('TournamentDetail');
  const bracketTranslate = useTranslations('BracketView');
  const cardH = onScheduleMatch ? CARD_H_ORGANIZER : CARD_H_PUBLIC;
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { pan, isDragging, resetPan, panHandlers } = useBracketPanZoom(
    { enabled: panEnabled, minZoom: 0.2, maxZoom: 2.5 },
    (delta) => {
      if (delta === 0) {
        handleAutoFit();
      } else {
        setZoom((current) => Math.min(2.5, Math.max(0.2, current + delta)));
      }
    },
  );

  const ubByRound = buildMatchesByRound(upperMatches);
  const lbByRound = buildMatchesByRound(lowerMatches);

  const ubRounds = Object.keys(ubByRound)
    .map(Number)
    .sort((a, b) => a - b);
  const lbRounds = Object.keys(lbByRound)
    .map(Number)
    .sort((a, b) => a - b);

  const maxUbRound = ubRounds.length > 0 ? Math.max(...ubRounds) : 1;
  const lbRound1 = lbByRound[1] ?? [];
  const hideLbRound1 =
    lbRound1.length > 0 &&
    lbRound1.every(
      (match) =>
        match.isBye &&
        match.status === 'COMPLETED' &&
        !match.participant1 &&
        !match.participant2,
    );
  const visibleLbRounds = lbRounds.filter((round) => !(hideLbRound1 && round === 1));
  const maxLbRound =
    visibleLbRounds.length > 0 ? Math.max(...visibleLbRounds) : 1;
  const lbRoundLabelOffset = hideLbRound1 ? 1 : 0;

  const SLOT_H_1 = cardH + 16;
  const UB_TOP = 72; // padding for round headers
  const bracketGap = 64;

  // Find max matches count in any Winners Bracket round
  let maxUbMatchesInRound = 1;
  ubRounds.forEach((r) => {
    const count = ubByRound[r]?.length || 0;
    if (count > maxUbMatchesInRound) maxUbMatchesInRound = count;
  });

  // Find max matches count in any Losers Bracket round
  let maxLbMatchesInRound = 1;
  visibleLbRounds.forEach((r) => {
    const count = lbByRound[r]?.length || 0;
    if (count > maxLbMatchesInRound) maxLbMatchesInRound = count;
  });

  const UB_HEIGHT = maxUbMatchesInRound * SLOT_H_1;
  const LB_TOP = UB_TOP + UB_HEIGHT + bracketGap; // Compact gap between brackets
  const LB_HEIGHT = maxLbMatchesInRound * SLOT_H_1;

  const posMap = new Map<string, { x: number; y: number }>();

  // ── Winners Bracket Positioning ──
  ubRounds.forEach((r) => {
    const colX = (r - 1) * 2 * (CARD_W + COL_GAP);
    const slotH = Math.pow(2, r - 1) * SLOT_H_1;
    const roundMatches = ubByRound[r] ?? [];
    const roundH = roundMatches.length * slotH;
    const roundTop = UB_TOP + (UB_HEIGHT - roundH) / 2;

    roundMatches.forEach((match, index) => {
      posMap.set(match.id, {
        x: colX,
        y: roundTop + index * slotH + slotH / 2,
      });
    });
  });

  // ── Losers Bracket Positioning ──
  visibleLbRounds.forEach((r) => {
    let colIndex = hideLbRound1 ? r - 2 : r - 1;
    if (r === maxLbRound) {
      colIndex = (maxUbRound - 1) * 2;
    }
    const colX = colIndex * (CARD_W + COL_GAP);
    const roundMatches = lbByRound[r] ?? [];

    const effectiveIndex = r - lbRoundLabelOffset;
    const power = Math.floor((effectiveIndex - 1) / 2);
    const slotH = Math.pow(2, Math.max(0, power)) * SLOT_H_1;
    const roundH = roundMatches.length * slotH;
    const roundTop = LB_TOP + (LB_HEIGHT - roundH) / 2;

    roundMatches.forEach((match, index) => {
      posMap.set(match.id, {
        x: colX,
        y: roundTop + index * slotH + slotH / 2,
      });
    });
  });

  // ── Grand Final Positioning ──
  const gfSorted = [...gfMatches].sort(
    (a, b) => a.roundNumber - b.roundNumber || a.matchOrder - b.matchOrder,
  );
  const GF_X = (maxUbRound - 1) * 2 * (CARD_W + COL_GAP) + CARD_W + COL_GAP;
  const gfCenterY = (UB_TOP + UB_HEIGHT / 2 + LB_TOP + LB_HEIGHT / 2) / 2;

  gfSorted.forEach((match, index) => {
    const offset = (index - (gfSorted.length - 1) / 2) * (cardH + 24);
    posMap.set(match.id, {
      x: GF_X,
      y: gfCenterY + offset,
    });
  });

  const totalWidth =
    GF_X + (gfSorted.length > 0 ? CARD_W + COL_GAP : 0) + 48;
  const totalHeight = LB_TOP + LB_HEIGHT + 48;

  // Auto-fit function to scale whole bracket to viewport width
  const handleAutoFit = useCallback(() => {
    if (!containerRef.current) return;
    const clientW = containerRef.current.clientWidth - 32;
    if (clientW > 0 && totalWidth > 0) {
      const targetZoom = Math.min(1.0, Math.max(0.2, clientW / totalWidth));
      setZoom(Number(targetZoom.toFixed(2)));
      resetPan();
    }
  }, [totalWidth, resetPan]);

  // Initial Auto-fit on mobile screens
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      handleAutoFit();
    }
  }, [handleAutoFit]);

  const allMatches = [...upperMatches, ...lowerMatches, ...gfMatches];
  const allMatchesForLogic = allMatches;

  const getUpperRoundHeader = (fromEnd: number) => {
    if (fromEnd === 0) return bracketTranslate('upperFinal');
    if (fromEnd === 1) return bracketTranslate('upperSemifinal');
    if (fromEnd === 2) return bracketTranslate('upperQuarterfinal');
    if (fromEnd === 3) return bracketTranslate('upperRound16');
    if (fromEnd === 4) return bracketTranslate('upperRound32');
    if (fromEnd === 5) return bracketTranslate('upperRound64');
    if (fromEnd === 6) return bracketTranslate('upperRound128');
    return bracketTranslate('upperRound', { number: fromEnd + 1 });
  };

  const getLowerRoundHeader = (fromEnd: number, currentRound: number) => {
    if (fromEnd === 0) return bracketTranslate('lowerFinal');
    if (fromEnd === 1) return bracketTranslate('lowerSemifinal');
    if (fromEnd === 2) return bracketTranslate('lowerQuarterfinal');
    if (fromEnd === 3) return bracketTranslate('lowerRound16');
    if (fromEnd === 4) return bracketTranslate('lowerRound32');
    if (fromEnd === 5) return bracketTranslate('lowerRound64');
    if (fromEnd === 6) return bracketTranslate('lowerRound128');
    return bracketTranslate('lowerRound', { number: currentRound });
  };

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-50 p-4 sm:p-6 overflow-hidden flex flex-col'
          : 'relative rounded-xl p-0.5 sm:p-1'
      }
    >
      {/* Zoom Controls */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1 sm:gap-1.5 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm rounded-lg p-1 text-xs font-bold text-slate-600">
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.1, 0.2))}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100 text-sm font-black"
          title={bracketTranslate('zoomOut')}
          aria-label={bracketTranslate('zoomOut')}
        >
          -
        </button>
        <span className="w-11 sm:w-12 text-center text-[11px] sm:text-xs select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.1, 2.5))}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100 text-sm font-black"
          title={bracketTranslate('zoomIn')}
          aria-label={bracketTranslate('zoomIn')}
        >
          +
        </button>
        <button
          onClick={handleAutoFit}
          className="px-2 h-8 sm:h-9 flex items-center justify-center gap-1 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100 text-[11px] font-bold text-blue-600"
          title="Vừa màn hình"
        >
          <Scan className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Vừa màn hình</span>
        </button>
        <button
          onClick={() => {
            setZoom(1);
            resetPan();
          }}
          className="hidden sm:flex px-2.5 h-9 items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100"
          title={bracketTranslate('resetZoom')}
        >
          100%
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100 text-slate-500 hover:text-slate-800"
          title={isFullscreen ? bracketTranslate('exitFullscreen') : bracketTranslate('fullscreen')}
          aria-label={isFullscreen ? bracketTranslate('exitFullscreen') : bracketTranslate('fullscreen')}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      <div
        ref={containerRef}
        {...panHandlers}
        className={`relative pb-6 min-h-[460px] max-h-[82vh] touch-none select-none ${
          isFullscreen ? 'flex-1 max-h-none min-h-0' : ''
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} overflow-hidden rounded-lg`}
        style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
            width: totalWidth,
            height: totalHeight,
            transition: isDragging ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)',
            willChange: 'transform',
          }}
          className="absolute left-4 top-4"
        >
          {/* SVG Connectors */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={totalWidth}
            height={totalHeight}
            style={{ overflow: 'visible' }}
          >
            {allMatchesForLogic.map((m) => {
              const startPos = posMap.get(m.id);
              if (!startPos) return null;

              if (m.nextMatchId) {
                const endPos = posMap.get(m.nextMatchId);
                if (endPos) {
                  const stroke =
                    m.status === 'COMPLETED' ? '#2563eb' : '#cbd5e1';
                  const midX = (startPos.x + CARD_W + endPos.x) / 2;
                  return (
                    <path
                      key={m.id}
                      d={`M ${startPos.x + CARD_W} ${startPos.y} H ${midX} V ${endPos.y} H ${endPos.x}`}
                      stroke={stroke}
                      strokeWidth={stroke === '#2563eb' ? 2 : 1.5}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={stroke === '#2563eb' ? 0.9 : 0.65}
                    />
                  );
                }
              }
              return null;
            })}
          </svg>

          {/* WB Section Label */}
          <div
            className="absolute flex items-center gap-2"
            style={{ top: UB_TOP - 56, left: 0 }}
          >
            <div className="w-1 h-3.5 bg-blue-500 rounded-full" />
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
              {translate('winnersBracket')}
            </span>
          </div>

          {/* LB Section Label */}
          {visibleLbRounds.length > 0 && (
            <div
              className="absolute flex items-center gap-2"
              style={{ top: LB_TOP - 56, left: 0 }}
            >
              <div className="w-1 h-3.5 bg-rose-500 rounded-full" />
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
                {translate('losersBracket')}
              </span>
            </div>
          )}

          {/* WB Round Headers */}
          {ubRounds.map((r) => {
            const fromEnd = ubRounds.length - (ubRounds.indexOf(r) + 1);
            const label = getUpperRoundHeader(fromEnd);
            const colX = (r - 1) * 2 * (CARD_W + COL_GAP);
            return (
              <div
                key={`ub-${r}`}
                className="absolute flex justify-center"
                style={{ left: colX, width: CARD_W, top: UB_TOP - 36 }}
              >
                <div className="text-[10px] font-bold text-blue-650 uppercase tracking-widest bg-blue-50/80 border border-blue-100 rounded-full px-3 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                  {label}
                </div>
              </div>
            );
          })}

          {/* LB Round Headers */}
          {visibleLbRounds.map((r) => {
            const fromEnd = visibleLbRounds.length - (visibleLbRounds.indexOf(r) + 1);
            const displayRound = r - lbRoundLabelOffset;
            const label = getLowerRoundHeader(fromEnd, displayRound);
            let colIndex = hideLbRound1 ? r - 2 : r - 1;
            if (r === maxLbRound) {
              colIndex = (maxUbRound - 1) * 2;
            }
            const colX = colIndex * (CARD_W + COL_GAP);
            return (
              <div
                key={`lb-${r}`}
                className="absolute flex justify-center"
                style={{ left: colX, width: CARD_W, top: LB_TOP - 36 }}
              >
                <div className="text-[10px] font-bold text-rose-650 uppercase tracking-widest bg-rose-50/80 border border-rose-100 rounded-full px-3 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                  {label}
                </div>
              </div>
            );
          })}

          {/* Grand Final Section Label */}
          {gfSorted.length > 0 && (
            <div
              className="absolute flex items-center gap-2"
              style={{
                top: gfCenterY - cardH / 2 - 28,
                left: GF_X,
              }}
            >
              <div className="w-1 h-3.5 bg-slate-900 rounded-full" />
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
                {translate('grandFinal')}
              </span>
            </div>
          )}

          {/* Render Match Cards */}
          {allMatches.map((match) => {
            const pos = posMap.get(match.id);
            if (!pos) return null;
            const isP1Bye = isSlotBye(match, 1, allMatchesForLogic);
            const isP2Bye = isSlotBye(match, 2, allMatchesForLogic);
            return (
              <div
                key={match.id}
                className="absolute motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none"
                style={{
                  transform: `translate3d(${pos.x}px, ${pos.y - cardH / 2}px, 0)`,
                  width: CARD_W,
                  willChange: 'transform',
                }}
              >
                <MatchCard
                  match={match}
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
  );
}
