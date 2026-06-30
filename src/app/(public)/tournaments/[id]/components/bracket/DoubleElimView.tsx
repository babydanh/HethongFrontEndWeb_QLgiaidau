/**
 * DoubleElimView — double-elimination bracket tree
 *
 * Renders Winners Bracket (upper), Losers Bracket (lower),
 * and Grand Final (rightmost column).
 *
 * Each bracket branch is laid out with its own positioning algorithm;
 * SVG connectors link winner-out edges.
 */

'use client';

import React, { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
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

export function DoubleElimView({
  upperMatches,
  lowerMatches,
  gfMatches,
  onScheduleMatch,
  selectedMatchId,
  onSelectMatch,
  fallbackSportRuleKind,
}: Props) {
  const cardH = onScheduleMatch ? CARD_H_ORGANIZER : CARD_H_PUBLIC;
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const ubByRound = buildMatchesByRound(upperMatches);
  const lbByRound = buildMatchesByRound(lowerMatches);

  const ubRounds = Object.keys(ubByRound)
    .map(Number)
    .sort((a, b) => a - b);
  const lbRounds = Object.keys(lbByRound)
    .map(Number)
    .sort((a, b) => a - b);

  const maxUbRound = ubRounds.length > 0 ? Math.max(...ubRounds) : 1;
  const maxLbRound = lbRounds.length > 0 ? Math.max(...lbRounds) : 1;

  // Estimate theoretical first round count of Winners Bracket
  let firstRoundCount = 1;
  ubRounds.forEach((r) => {
    const count = ubByRound[r]?.length || 0;
    const estimate = count * Math.pow(2, r - 1);
    if (estimate > firstRoundCount) firstRoundCount = estimate;
  });

  const SLOT_H_1 = cardH + 16;
  const UB_TOP = 48; // padding for round headers
  const UB_HEIGHT = firstRoundCount * SLOT_H_1;
  const LB_TOP = UB_TOP + UB_HEIGHT + 48;
  const LB_HEIGHT = UB_HEIGHT; // keep same height space

  const posMap = new Map<string, { x: number; y: number }>();

  // ── Winners Bracket Positioning ──
  ubRounds.forEach((r) => {
    const colX = (r - 1) * 2 * (CARD_W + COL_GAP);
    const slotH = Math.pow(2, r - 1) * SLOT_H_1;
    ubByRound[r]?.forEach((match) => {
      posMap.set(match.id, {
        x: colX,
        y: UB_TOP + (match.matchOrder - 1) * slotH + slotH / 2,
      });
    });
  });

  // ── Losers Bracket Positioning ──
  lbRounds.forEach((r) => {
    let colIndex = r - 1;
    if (r === maxLbRound) {
      colIndex = (maxUbRound - 1) * 2;
    }
    const colX = colIndex * (CARD_W + COL_GAP);
    const totalLbMatches = Math.pow(2, Math.floor((maxLbRound - r) / 2));
    const lbSlotH = LB_HEIGHT / totalLbMatches;
    lbByRound[r]?.forEach((match) => {
      posMap.set(match.id, {
        x: colX,
        y: LB_TOP + (match.matchOrder - 1) * lbSlotH + lbSlotH / 2,
      });
    });
  });

  // ── Grand Finals Positioning ──
  const columnsCount = Math.max(maxUbRound * 2 - 1, maxLbRound);
  const GF_X = columnsCount * (CARD_W + COL_GAP);

  const ubFinal = ubRounds.length > 0 ? ubByRound[maxUbRound]?.[0] : null;
  const lbFinal = lbRounds.length > 0 ? lbByRound[maxLbRound]?.[0] : null;
  const ubFinalPos = ubFinal ? posMap.get(ubFinal.id) : null;
  const lbFinalPos = lbFinal ? posMap.get(lbFinal.id) : null;

  const gfCenterY =
    ((ubFinalPos?.y ?? UB_TOP + UB_HEIGHT / 2) +
      (lbFinalPos?.y ?? LB_TOP + LB_HEIGHT / 2)) /
    2;

  const gfSorted = [...gfMatches].sort((a, b) => a.matchOrder - b.matchOrder);
  gfSorted.forEach((m, i) => {
    posMap.set(m.id, {
      x: GF_X + i * (CARD_W + COL_GAP),
      y: gfCenterY,
    });
  });

  const totalWidth =
    GF_X + (gfSorted.length || 1) * (CARD_W + COL_GAP) + 48;
  const totalHeight = LB_TOP + LB_HEIGHT + 48;

  const allMatches = [...upperMatches, ...lowerMatches, ...gfSorted];

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
          title="Thu nhỏ"
        >
          -
        </button>
        <span className="w-12 text-center select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.1, 1.5))}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100"
          title="Phóng to"
        >
          +
        </button>
        <button
          onClick={() => setZoom(1)}
          className="px-2.5 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100"
          title="Đặt lại tỷ lệ"
        >
          Mặc định
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100 text-slate-500 hover:text-slate-800"
          title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      <div
        className={`overflow-x-auto overflow-y-auto pb-6 max-h-[80vh] no-scrollbar ${isFullscreen ? 'flex-1 max-h-none' : ''}`}
      >
        <div
          style={{
            width: totalWidth * zoom,
            height: totalHeight * zoom,
            transition: 'width 0.15s ease-out, height 0.15s ease-out',
          }}
          className="relative"
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: totalWidth,
              height: totalHeight,
              transition: 'transform 0.15s ease-out',
            }}
            className="absolute inset-0"
          >
            {/* SVG Connectors */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={totalWidth}
              height={totalHeight}
              style={{ overflow: 'visible' }}
            >
              {allMatches.map((m) => {
                const startPos = posMap.get(m.id);
                if (!startPos) return null;

                const elements: React.ReactNode[] = [];

                // Winner next path
                if (m.nextMatchId) {
                  const endPos = posMap.get(m.nextMatchId);
                  if (endPos) {
                    const midX = (startPos.x + CARD_W + endPos.x) / 2;
                    const stroke =
                      m.status === 'COMPLETED' ? '#10b981' : '#cbd5e1';
                    elements.push(
                      <g
                        key={`win-${m.id}`}
                        stroke={stroke}
                        strokeWidth={1.5}
                        fill="none"
                        opacity={0.65}
                      >
                        <path
                          d={`M ${startPos.x + CARD_W} ${startPos.y} L ${midX} ${startPos.y} L ${midX} ${endPos.y} L ${endPos.x} ${endPos.y}`}
                        />
                      </g>,
                    );
                  }
                }

                return elements;
              })}
            </svg>

            {/* WB Section Label */}
            <div
              className="absolute flex items-center gap-2"
              style={{ top: UB_TOP - 32, left: 0 }}
            >
              <div className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest">
                  Nhánh thắng
              </span>
            </div>

            {/* LB Section Label */}
            <div
              className="absolute flex items-center gap-2"
              style={{ top: LB_TOP - 32, left: 0 }}
            >
              <div className="w-1 h-3.5 bg-rose-500 rounded-full" />
                <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest">
                  Nhánh thua
              </span>
            </div>

            {/* Grand Final Section Label */}
            {gfSorted.length > 0 && (
              <div
                className="absolute flex items-center gap-2"
                style={{
                  top: gfCenterY - cardH / 2 - 28,
                  left: GF_X,
                }}
              >
                <div className="w-1 h-3.5 bg-amber-500 rounded-full" />
                <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest">
                  Chung kết tổng
                </span>
              </div>
            )}

            {/* Render Match Cards */}
            {allMatches.map((match) => {
              const pos = posMap.get(match.id);
              if (!pos) return null;
              const isP1Bye = isSlotBye(match, 1, allMatches);
              const isP2Bye = isSlotBye(match, 2, allMatches);
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
