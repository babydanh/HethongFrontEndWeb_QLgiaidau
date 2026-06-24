/**
 * SingleElimView — single-elimination bracket tree
 *
 * Lays out match cards in round columns with SVG connector lines.
 * Supports zoom (50 % – 150 %) and fullscreen.
 */

'use client';

import React, { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { BracketMatch } from '@/features/tournaments/api';
import type { OnScheduleMatch } from './types';
import { CARD_W, CARD_H_PUBLIC, CARD_H_ORGANIZER, COL_GAP } from './types';
import { buildMatchesByRound, getRoundLabel, isSlotBye } from './helpers';
import { MatchCard } from './MatchCard';

interface Props {
  matches: BracketMatch[];
  onScheduleMatch?: OnScheduleMatch;
}

export function SingleElimView({ matches, onScheduleMatch }: Props) {
  const cardH = onScheduleMatch ? CARD_H_ORGANIZER : CARD_H_PUBLIC;
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  const totalHeight = firstRoundCount * SLOT_H_1 + 48;
  const posMap = new Map<string, { x: number; y: number }>();

  rounds.forEach((r) => {
    const colX = (r - 1) * (CARD_W + COL_GAP);
    const slotH = Math.pow(2, r - 1) * SLOT_H_1;
    byRound[r]?.forEach((match) => {
      posMap.set(match.id, {
        x: colX,
        y: 24 + (match.matchOrder - 1) * slotH + slotH / 2,
      });
    });
  });

  const svgW = maxRound * CARD_W + (maxRound - 1) * COL_GAP + COL_GAP;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-50 p-6 overflow-hidden flex flex-col'
          : 'relative border border-slate-200/80 bg-slate-50/20 rounded-2xl p-4 shadow-sm'
      }
    >
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm rounded-xl p-1 text-xs font-bold text-slate-600">
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100"
          title="Zoom Out"
        >
          -
        </button>
        <span className="w-12 text-center select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.1, 1.5))}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setZoom(1)}
          className="px-2.5 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100"
          title="Reset Zoom"
        >
          Reset
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100 text-slate-500 hover:text-slate-800"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      <div
        className={`overflow-x-auto overflow-y-auto pb-4 max-h-[80vh] no-scrollbar ${isFullscreen ? 'flex-1 max-h-none' : ''}`}
      >
        <div
          style={{
            width: svgW * zoom,
            height: totalHeight * zoom,
            transition: 'width 0.15s ease-out, height 0.15s ease-out',
          }}
          className="relative"
        >
          {/* Round titles */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: svgW,
              transition: 'transform 0.15s ease-out',
            }}
            className="flex mb-6 flex-shrink-0"
          >
            <div className="flex" style={{ gap: COL_GAP }}>
              {Array.from({ length: maxRound }).map((_, ri) => (
                <div
                  key={ri}
                  style={{ width: CARD_W, flexShrink: 0 }}
                  className="text-center"
                >
                  <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                    {getRoundLabel(ri, maxRound)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive tree canvas */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: svgW,
              height: totalHeight,
              transition: 'transform 0.15s ease-out',
              marginTop: '44px',
            }}
            className="absolute"
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
                  m.status === 'COMPLETED' ? '#10b981' : '#cbd5e1';
                return (
                  <path
                    key={m.id}
                    d={`M ${startPos.x + CARD_W} ${startPos.y} L ${midX} ${startPos.y} L ${midX} ${endPos.y} L ${endPos.x} ${endPos.y}`}
                    stroke={stroke}
                    strokeWidth={1.5}
                    fill="none"
                    opacity={0.65}
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
              const actualCardH = match.isBye ? 100 : cardH;
              return (
                <div
                  key={match.id}
                  className="absolute"
                  style={{
                    left: pos.x,
                    top: pos.y - actualCardH / 2,
                  }}
                >
                  <MatchCard
                    match={match}
                    onScheduleMatch={onScheduleMatch}
                    isP1Bye={isP1Bye}
                    isP2Bye={isP2Bye}
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
