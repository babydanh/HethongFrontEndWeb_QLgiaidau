/**
 * PagedSingleElimView — Minimal & Light Single Elimination Bracket View
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import type { BracketMatch } from '@/features/tournaments/api';
import type { SportRuleKind } from '@/types/tournament';
import type { OnScheduleMatch, OnSelectBracketMatch } from './types';
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
  const byRound = useMemo(() => buildMatchesByRound(matches), [matches]);
  const rounds = useMemo(
    () =>
      Object.keys(byRound)
        .map(Number)
        .sort((a, b) => a - b),
    [byRound],
  );

  const maxRound = rounds.length > 0 ? Math.max(...rounds) : 1;

  // Auto-detect ongoing / upcoming round index
  const defaultRoundIndex = useMemo(() => {
    const idx = rounds.findIndex((r) =>
      byRound[r]?.some(
        (m) => m.status === 'IN_PROGRESS' || m.status === 'SCHEDULED' || m.status === 'READY',
      ),
    );
    return idx >= 0 ? idx : 0;
  }, [rounds, byRound]);

  const [activeRoundIndex, setActiveRoundIndex] = useState<number>(defaultRoundIndex);

  useEffect(() => {
    setActiveRoundIndex(defaultRoundIndex);
  }, [defaultRoundIndex]);

  if (!rounds.length) {
    return (
      <div className="py-12 text-center text-slate-400 italic text-sm">
        Chưa có dữ liệu trận đấu trong nhánh đấu.
      </div>
    );
  }

  const currentRound = rounds[activeRoundIndex] ?? rounds[0];
  const currentMatches = byRound[currentRound] ?? [];

  const handlePrev = () => {
    setActiveRoundIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setActiveRoundIndex((prev) => Math.min(prev + 1, rounds.length - 1));
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Header & Round Carousel Navigation - Minimal Light */}
      <div className="flex items-center justify-between gap-3 bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3">
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

        {/* Navigation Arrows */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={activeRoundIndex === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 transition-all shadow-sm cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Vòng trước
          </button>
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
            {currentMatches.length} trận
          </span>
          <button
            onClick={handleNext}
            disabled={activeRoundIndex === rounds.length - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-xs font-bold text-white transition-all shadow-sm cursor-pointer"
          >
            Vòng tiếp <ChevronRight className="w-4 h-4" />
          </button>
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
              onClick={() => setActiveRoundIndex(idx)}
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

      {/* Matches Grid List for Active Round */}
      <div
        key={currentRound}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-right-4 duration-300"
      >
        {currentMatches.map((match) => {
          const isP1Bye = isSlotBye(match, 1, matches);
          const isP2Bye = isSlotBye(match, 2, matches);
          return (
            <div
              key={match.id}
              className="transition-transform duration-200 hover:-translate-y-0.5"
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
  );
}
