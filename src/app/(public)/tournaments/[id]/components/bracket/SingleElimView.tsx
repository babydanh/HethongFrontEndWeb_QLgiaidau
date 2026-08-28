/**
 * SingleElimView — single-elimination bracket tree
 *
 * Lays out match cards in round columns with SVG connector lines.
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
import { buildMatchesByRound, getRoundLabel, isSlotBye } from './helpers';
import { MatchCard } from './MatchCard';
import { useBracketPanZoom } from './useBracketPanZoom';

interface Props {
  matches: BracketMatch[];
  onScheduleMatch?: OnScheduleMatch;
  selectedMatchId?: string | null;
  onSelectMatch?: OnSelectBracketMatch;
  onDoubleClickMatch?: OnSelectBracketMatch;
  fallbackSportRuleKind?: SportRuleKind;
  panEnabled?: boolean;
  dragHandlers?: BracketDragHandlers;
}

export function SingleElimView({
  matches,
  onScheduleMatch,
  selectedMatchId,
  onSelectMatch,
  onDoubleClickMatch,
  fallbackSportRuleKind,
  panEnabled = true,
  dragHandlers,
}: Props) {
  const translate = useTranslations('BracketView');
  const roundLabelTranslations = {
    final: translate('singleFinal'),
    semifinal: translate('singleSemifinal'),
    quarterfinal: translate('singleQuarterfinal'),
    roundOf: (number: number) => {
      if (number === 128) return translate('singleRound128');
      if (number === 64) return translate('singleRound64');
      if (number === 32) return translate('singleRound32');
      if (number === 16) return translate('singleRound16');
      return translate('singleRound', { number });
    },
  };
  const cardH = onScheduleMatch ? CARD_H_ORGANIZER : CARD_H_PUBLIC;
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { pan, isDragging, resetPan, panHandlers } = useBracketPanZoom(
    { enabled: panEnabled, minZoom: 0.2, maxZoom: 2.5 },
    (delta) => {
      if (delta === 0) {
        // Double tap toggle: toggle between auto-fit and 100%
        handleAutoFit();
      } else {
        setZoom((current) => Math.min(2.5, Math.max(0.2, current + delta)));
      }
    },
  );

  const byRound = buildMatchesByRound(matches);
  const rounds = Object.keys(byRound)
    .map(Number)
    .sort((a, b) => a - b);
  if (!rounds.length) return null;

  const maxRound = Math.max(...rounds);
  let firstRoundCount = 1;
  rounds.forEach((r) => {
    const count = byRound[r]?.length || 0;
    const estimate = count * Math.pow(2, r - 1);
    if (estimate > firstRoundCount) firstRoundCount = estimate;
  });

  const SLOT_H_1 = cardH + 16;
  const roundGap = COL_GAP;
  const totalHeight = firstRoundCount * SLOT_H_1 + 48;
  const posMap = new Map<string, { x: number; y: number }>();

  rounds.forEach((r) => {
    const colX = (r - 1) * (CARD_W + roundGap);
    const slotH = Math.pow(2, r - 1) * SLOT_H_1;
    const roundMatches = byRound[r] ?? [];
    const roundH = roundMatches.length * slotH;
    const roundTop = 24 + (totalHeight - 48 - roundH) / 2;

    roundMatches.forEach((match, index) => {
      posMap.set(match.id, {
        x: colX,
        y: roundTop + index * slotH + slotH / 2,
      });
    });
  });

  const svgW = maxRound * CARD_W + Math.max(0, maxRound - 1) * roundGap + 48;

  // Auto-fit function to scale whole bracket to viewport width
  const handleAutoFit = useCallback(() => {
    if (!containerRef.current) return;
    const clientW = containerRef.current.clientWidth - 32;
    if (clientW > 0 && svgW > 0) {
      const targetZoom = Math.min(1.0, Math.max(0.25, clientW / svgW));
      setZoom(Number(targetZoom.toFixed(2)));
      resetPan();
    }
  }, [svgW, resetPan]);

  // Initial Auto-fit on mobile screens
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      handleAutoFit();
    }
  }, [handleAutoFit]);

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-50 p-4 sm:p-6 overflow-hidden flex flex-col'
          : 'relative rounded-xl p-0.5 sm:p-1'
      }
    >
      {/* Zoom & Fit Controls */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1 sm:gap-1.5 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm rounded-lg p-1 text-xs font-bold text-slate-600">
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.1, 0.2))}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100 text-sm font-black"
          title={translate('zoomOut')}
          aria-label={translate('zoomOut')}
        >
          -
        </button>
        <span className="w-11 sm:w-12 text-center text-[11px] sm:text-xs select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.1, 2.5))}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100 text-sm font-black"
          title={translate('zoomIn')}
          aria-label={translate('zoomIn')}
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
          title={translate('resetZoom')}
        >
          100%
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100 text-slate-500 hover:text-slate-800"
          title={isFullscreen ? translate('exitFullscreen') : translate('fullscreen')}
          aria-label={isFullscreen ? translate('exitFullscreen') : translate('fullscreen')}
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
        className={`relative pb-4 min-h-[420px] max-h-[82vh] touch-none select-none ${
          isFullscreen ? 'flex-1 max-h-none min-h-0' : ''
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} overflow-hidden rounded-lg`}
        style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
      >
        {/* Pan & Zoom Canvas Container */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
            width: svgW,
            height: totalHeight + 60,
            transition: isDragging ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)',
            willChange: 'transform',
          }}
          className="absolute left-4 top-4"
        >
          {/* Round titles header */}
          <div
            style={{ width: svgW }}
            className="flex mb-4 flex-shrink-0"
          >
            <div className="flex" style={{ gap: roundGap }}>
              {Array.from({ length: maxRound }).map((_, ri) => (
                <div
                  key={ri}
                  style={{ width: CARD_W, flexShrink: 0 }}
                  className="text-center"
                >
                  <span className="inline-block text-[10.5px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border bg-white/90 text-slate-700 border-slate-200/80 shadow-2xs">
                    {getRoundLabel(ri, maxRound, '', roundLabelTranslations)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive tree canvas */}
          <div
            style={{
              width: svgW,
              height: totalHeight,
              marginTop: '8px',
            }}
            className="relative"
          >
            {/* SVG connectors */}
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
                const stroke =
                  m.status === 'COMPLETED' ? '#2563eb' : '#cbd5e1';
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
              })}
            </svg>

            {/* Match cards */}
            {matches.map((match) => {
              const pos = posMap.get(match.id);
              if (!pos) return null;
              const isP1Bye = isSlotBye(match, 1, matches);
              const isP2Bye = isSlotBye(match, 2, matches);
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
    </div>
  );
}
