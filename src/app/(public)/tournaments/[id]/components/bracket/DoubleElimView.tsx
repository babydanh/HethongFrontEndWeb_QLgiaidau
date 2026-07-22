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
  // Use the actual round-1 count as the baseline for losers-band spacing.
  // Estimating from later rounds can inflate the slot grid and make the losers
  // bracket look duplicated or stretched.
  const firstRoundCount = ubByRound[1]?.length || 1;
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
  // Column index: sequential r-1, except LB final which aligns with UB final column
  visibleLbRounds.forEach((r) => {
    let colIndex = hideLbRound1 ? r - 2 : r - 1;
    if (r === maxLbRound) {
      colIndex = (maxUbRound - 1) * 2;
    }
    const colX = colIndex * (CARD_W + COL_GAP);
    const slotH = Math.pow(2, Math.floor((r - 1) / 2)) * SLOT_H_1;
    const roundMatches = lbByRound[r] ?? [];
    const roundH = roundMatches.length * slotH;
    const roundTop = LB_TOP + (LB_HEIGHT - roundH) / 2;

    roundMatches.forEach((match, index) => {
      posMap.set(match.id, {
        x: colX,
        y: roundTop + index * slotH + slotH / 2,
      });
    });
  });

  // ── Grand Finals Positioning ──
  const columnsCount = Math.max(maxUbRound * 2 - 1, maxLbRound);
  const GF_X = columnsCount * (CARD_W + COL_GAP);

  const ubFinal = ubRounds.length > 0 ? ubByRound[maxUbRound]?.[0] : null;
  const lbFinal = visibleLbRounds.length > 0 ? lbByRound[maxLbRound]?.[0] : null;
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

  const allMatchesForLogic = [...upperMatches, ...lowerMatches, ...gfSorted];
  const visibleLowerMatches = visibleLbRounds.flatMap((round) => lbByRound[round] || []);
  const allMatches = [...upperMatches, ...visibleLowerMatches, ...gfSorted];
  const getUpperRoundHeader = (fromEnd: number) => {
    if (fromEnd === 0) return 'CK NHÁNH THẮNG';
    if (fromEnd === 1) return 'BK NHÁNH THẮNG';
    if (fromEnd === 2) return 'TỨ KẾT NHÁNH THẮNG';
    if (fromEnd >= 3 && fromEnd <= 5) return `VÒNG ${2 ** (fromEnd + 1)} NHÁNH THẮNG`;
    return 'VÒNG LOẠI NHÁNH THẮNG';
  };
  const getLowerRoundHeader = (fromEnd: number, displayRound: number) => {
    if (fromEnd === 0) return 'CK NHÁNH THUA';
    if (fromEnd === 1) return 'BK NHÁNH THUA';
    return `LƯỢT NHÁNH THUA ${displayRound}`;
  };

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-50 p-6 overflow-hidden flex flex-col'
          : 'relative border border-slate-200/80 bg-slate-50/20 rounded-lg p-4 shadow-sm'
      }
    >
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm rounded-lg p-1 text-xs font-bold text-slate-600">
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
              {allMatchesForLogic.map((m) => {
                const startPos = posMap.get(m.id);
                if (!startPos) return null;

                const elements: React.ReactNode[] = [];
                const makePath = (endPos: { x: number; y: number }, stroke: string, dashed = false) => {
                  const midX = (startPos.x + CARD_W + endPos.x) / 2;
                  return (
                  <path
                    d={`M ${startPos.x + CARD_W} ${startPos.y} L ${midX} ${startPos.y} L ${midX} ${endPos.y} L ${endPos.x} ${endPos.y}`}
                    stroke={stroke}
                    strokeWidth={1.5}
                    fill="none"
                    opacity={0.72}
                    strokeDasharray={dashed ? '5 4' : undefined}
                  />
                  );
                };

                // Winner next path
                if (m.nextMatchId) {
                  const endPos = posMap.get(m.nextMatchId);
                  if (endPos) {
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
                        {makePath(endPos, stroke)}
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
              style={{ top: UB_TOP - 56, left: 0 }}
            >
              <div className="w-1 h-3.5 bg-blue-500 rounded-full" />
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
                  Nhánh thắng
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
                    Nhánh thua
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
                <div className="w-1 h-3.5 bg-slate-1000 rounded-full" />
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
                  Chung kết tổng
                </span>
              </div>
            )}
            {gfSorted.length === 1 && (
              <div
                className="absolute flex flex-col items-start gap-2"
                style={{
                  top: gfCenterY + cardH / 2 + 18,
                  left: GF_X,
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3.5 bg-slate-400 rounded-full" />
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    Chung kết phụ
                  </span>
                </div>
                <div className="text-[9px] font-bold text-slate-400 bg-white/90 border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
                  Nếu đội nhánh thắng thua ở trận đầu
                </div>
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
                  className="absolute"
                  style={{
                    left: pos.x,
                    top: pos.y - cardH / 2,
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
