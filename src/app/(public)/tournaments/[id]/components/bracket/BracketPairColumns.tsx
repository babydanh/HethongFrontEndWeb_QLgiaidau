/**
 * BracketPairColumns — 2-Column Bracket View with SVG Connector Lines
 *
 * Renders Active Round column next to Next Round column connected by SVG lines.
 */

'use client';

import React from 'react';
import type { BracketMatch } from '@/features/tournaments/api';
import type { SportRuleKind } from '@/types/tournament';
import type { OnScheduleMatch, OnSelectBracketMatch } from './types';
import { CARD_W, CARD_H_PUBLIC, CARD_H_ORGANIZER } from './types';
import { isSlotBye } from './helpers';
import { MatchCard } from './MatchCard';

interface Props {
  activeRoundMatches: BracketMatch[];
  nextRoundMatches: BracketMatch[];
  activeRoundTitle: string;
  nextRoundTitle?: string;
  allMatches: BracketMatch[];
  onScheduleMatch?: OnScheduleMatch;
  selectedMatchId?: string | null;
  onSelectMatch?: OnSelectBracketMatch;
  fallbackSportRuleKind?: SportRuleKind;
}

export function BracketPairColumns({
  activeRoundMatches,
  nextRoundMatches,
  activeRoundTitle,
  nextRoundTitle,
  allMatches,
  onScheduleMatch,
  selectedMatchId,
  onSelectMatch,
  fallbackSportRuleKind,
}: Props) {
  const cardH = onScheduleMatch ? CARD_H_ORGANIZER : CARD_H_PUBLIC;
  const colGap = 56;
  const slotH1 = cardH + 20;

  const N1 = activeRoundMatches.length;
  const N2 = nextRoundMatches.length;

  if (N1 === 0) return null;

  const totalH = Math.max(N1 * slotH1, N2 * slotH1, 280);

  // Position map for matches
  const posMap = new Map<string, { x: number; y: number }>();

  const round1H = N1 * slotH1;
  const round1Top = (totalH - round1H) / 2;

  activeRoundMatches.forEach((m, idx) => {
    const y = round1Top + idx * slotH1 + slotH1 / 2;
    posMap.set(m.id, { x: 0, y });
  });

  if (N2 > 0) {
    const round2H = N2 * (totalH / N2);
    nextRoundMatches.forEach((m, idx) => {
      const slotH2 = totalH / N2;
      const y = idx * slotH2 + slotH2 / 2;
      posMap.set(m.id, { x: CARD_W + colGap, y });
    });
  }

  const svgW = N2 > 0 ? CARD_W * 2 + colGap : CARD_W;

  return (
    <div className="overflow-x-auto no-scrollbar py-2 animate-in fade-in slide-in-from-right-4 duration-300">
      <div
        className="relative mx-auto"
        style={{
          width: svgW,
          height: totalH + 48,
        }}
      >
        {/* Column Header Titles */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between pointer-events-none mb-3">
          <div style={{ width: CARD_W }} className="text-center">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-3.5 py-1 rounded-full shadow-sm">
              {activeRoundTitle}
            </span>
          </div>
          {N2 > 0 && nextRoundTitle && (
            <div style={{ width: CARD_W }} className="text-center">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-3.5 py-1 rounded-full">
                {nextRoundTitle}
              </span>
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="absolute top-10 inset-x-0 bottom-0">
          {/* SVG Connector Lines */}
          {N2 > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none"
              width={svgW}
              height={totalH}
            >
              {activeRoundMatches.map((m) => {
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
          )}

          {/* Active Round Cards */}
          {activeRoundMatches.map((match) => {
            const pos = posMap.get(match.id);
            if (!pos) return null;
            const isP1Bye = isSlotBye(match, 1, allMatches);
            const isP2Bye = isSlotBye(match, 2, allMatches);
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

          {/* Next Round Cards */}
          {N2 > 0 &&
            nextRoundMatches.map((match) => {
              const pos = posMap.get(match.id);
              if (!pos) return null;
              const isP1Bye = isSlotBye(match, 1, allMatches);
              const isP2Bye = isSlotBye(match, 2, allMatches);
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
  );
}
