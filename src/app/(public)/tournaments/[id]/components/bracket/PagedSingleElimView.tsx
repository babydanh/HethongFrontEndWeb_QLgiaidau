/**
 * PagedSingleElimView — World Cup / Google style round-by-round Single Elimination Bracket
 */

'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Trophy, Sparkles } from 'lucide-react';
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

  // Active round index (0-indexed inside rounds array)
  const [activeRoundIndex, setActiveRoundIndex] = useState<number>(0);

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
    <div className="flex flex-col gap-6 w-full">
      {/* Top Header & Round Carousel Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Trophy className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                Vòng {activeRoundIndex + 1} / {rounds.length}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <Sparkles className="w-2.5 h-2.5" /> World Cup View
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {getRoundLabel(currentRound - 1, maxRound)}
            </h3>
          </div>
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-slate-800 sm:border-t-0">
          <button
            onClick={handlePrev}
            disabled={activeRoundIndex === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-200 transition-all border border-slate-700/80 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Vòng trước
          </button>
          <span className="text-xs font-medium text-slate-400">
            {currentMatches.length} trận đấu
          </span>
          <button
            onClick={handleNext}
            disabled={activeRoundIndex === rounds.length - 1}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white transition-all shadow-md shadow-blue-600/30 cursor-pointer"
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 scale-[1.02]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <span>{getRoundLabel(r - 1, maxRound)}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
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
