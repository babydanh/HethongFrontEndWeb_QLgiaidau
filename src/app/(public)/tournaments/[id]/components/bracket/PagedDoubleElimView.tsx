/**
 * PagedDoubleElimView — Minimal & Light Branch-Based Round Navigation
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ShieldCheck, Flame } from 'lucide-react';
import type { BracketMatch } from '@/features/tournaments/api';
import type { SportRuleKind } from '@/types/tournament';
import type { OnScheduleMatch, OnSelectBracketMatch } from './types';
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

type BranchTab = 'upper' | 'lower';

export function PagedDoubleElimView({
  upperMatches,
  lowerMatches,
  gfMatches,
  onScheduleMatch,
  selectedMatchId,
  onSelectMatch,
  fallbackSportRuleKind,
}: Props) {
  // If there are Grand Finals matches, include them as the last round in Upper Bracket
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

  // Auto-detect branch and round currently active
  const defaultBranch: BranchTab = useMemo(() => {
    const hasLiveOrScheduled = (list: BracketMatch[]) =>
      list.some((m) => m.status === 'IN_PROGRESS' || m.status === 'SCHEDULED' || m.status === 'READY');
    if (hasLiveOrScheduled(lowerMatches) && !hasLiveOrScheduled(combinedUpperMatches)) return 'lower';
    return 'upper';
  }, [combinedUpperMatches, lowerMatches]);

  const [activeBranch, setActiveBranch] = useState<BranchTab>(defaultBranch);
  const [activeUbIndex, setActiveUbIndex] = useState<number>(0);
  const [activeLbIndex, setActiveLbIndex] = useState<number>(0);

  useEffect(() => {
    const findActiveIndex = (rounds: number[], byRoundMap: Record<number, BracketMatch[]>) => {
      const idx = rounds.findIndex((r) =>
        byRoundMap[r]?.some(
          (m) => m.status === 'IN_PROGRESS' || m.status === 'SCHEDULED' || m.status === 'READY',
        ),
      );
      return idx >= 0 ? idx : 0;
    };
    setActiveUbIndex(findActiveIndex(ubRounds, ubByRound));
    setActiveLbIndex(findActiveIndex(lbRounds, lbByRound));
  }, [ubRounds, lbRounds, ubByRound, lbByRound]);

  const maxUbRound = ubRounds.length;
  const getUbLabel = (r: number) => {
    if (gfMatches.length > 0 && r === maxUbRound) return 'Chung kết Tổng';
    const fromEnd = ubRounds.length - (ubRounds.indexOf(r) + 1);
    if (fromEnd === 0 || (gfMatches.length > 0 && fromEnd === 1)) return 'Chung kết Nhánh thắng';
    if (fromEnd === 1 || (gfMatches.length > 0 && fromEnd === 2)) return 'Bán kết Nhánh thắng';
    if (fromEnd === 2 || (gfMatches.length > 0 && fromEnd === 3)) return 'Tứ kết Nhánh thắng';
    return `Vòng ${r} Nhánh thắng`;
  };

  const getLbLabel = (r: number) => {
    const fromEnd = lbRounds.length - (lbRounds.indexOf(r) + 1);
    if (fromEnd === 0) return 'Chung kết Nhánh thua';
    if (fromEnd === 1) return 'Bán kết Nhánh thua';
    return `Lượt ${r} Nhánh thua`;
  };

  const allMatchesForLogic = useMemo(
    () => [...combinedUpperMatches, ...lowerMatches],
    [combinedUpperMatches, lowerMatches],
  );

  const currentUbRound = ubRounds[activeUbIndex] ?? ubRounds[0];
  const currentUbMatches = ubByRound[currentUbRound] ?? [];

  const currentLbRound = lbRounds[activeLbIndex] ?? lbRounds[0];
  const currentLbMatches = lbByRound[currentLbRound] ?? [];

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Branch Tabs Switcher - Minimal Light Design */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveBranch('upper')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
            activeBranch === 'upper'
              ? 'bg-blue-50 text-blue-700 border-blue-200 font-extrabold shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Nhánh Thắng</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100/60 text-blue-700 font-semibold">
            {combinedUpperMatches.length}
          </span>
        </button>

        {lowerMatches.length > 0 && (
          <button
            onClick={() => setActiveBranch('lower')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
              activeBranch === 'lower'
                ? 'bg-rose-50 text-rose-700 border-rose-200 font-extrabold shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-600" />
            <span>Nhánh Thua</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100/60 text-rose-700 font-semibold">
              {lowerMatches.length}
            </span>
          </button>
        )}
      </div>

      {/* BRANCH 1: UPPER BRACKET */}
      {activeBranch === 'upper' && (
        <div className="flex flex-col gap-4">
          {/* Header Controls - Minimal Light */}
          <div className="flex items-center justify-between gap-3 bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3">
            <div>
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                Vòng {activeUbIndex + 1} / {ubRounds.length}
              </span>
              <h4 className="text-sm sm:text-base font-bold text-slate-900">
                {getUbLabel(currentUbRound)}
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveUbIndex((p) => Math.max(p - 1, 0))}
                disabled={activeUbIndex === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 transition-all shadow-sm cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Vòng trước
              </button>
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                {currentUbMatches.length} trận
              </span>
              <button
                onClick={() => setActiveUbIndex((p) => Math.min(p + 1, ubRounds.length - 1))}
                disabled={activeUbIndex === ubRounds.length - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-xs font-bold text-white transition-all shadow-sm cursor-pointer"
              >
                Vòng tiếp <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* UB Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {ubRounds.map((r, idx) => {
              const isActive = idx === activeUbIndex;
              return (
                <button
                  key={r}
                  onClick={() => setActiveUbIndex(idx)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{getUbLabel(r)}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                    {ubByRound[r]?.length ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* UB Grid */}
          <div
            key={`ub-${currentUbRound}`}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-right-4 duration-300"
          >
            {currentUbMatches.map((match) => {
              const isP1Bye = isSlotBye(match, 1, allMatchesForLogic);
              const isP2Bye = isSlotBye(match, 2, allMatchesForLogic);
              return (
                <div key={match.id} className="transition-transform duration-200 hover:-translate-y-0.5">
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
      )}

      {/* BRANCH 2: LOWER BRACKET */}
      {activeBranch === 'lower' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 bg-rose-50/60 border border-rose-200 rounded-xl px-4 py-3">
            <div>
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                Lượt {activeLbIndex + 1} / {lbRounds.length}
              </span>
              <h4 className="text-sm sm:text-base font-bold text-slate-900">
                {getLbLabel(currentLbRound)}
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveLbIndex((p) => Math.max(p - 1, 0))}
                disabled={activeLbIndex === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 transition-all shadow-sm cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Vòng trước
              </button>
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                {currentLbMatches.length} trận
              </span>
              <button
                onClick={() => setActiveLbIndex((p) => Math.min(p + 1, lbRounds.length - 1))}
                disabled={activeLbIndex === lbRounds.length - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-xs font-bold text-white transition-all shadow-sm cursor-pointer"
              >
                Vòng tiếp <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* LB Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {lbRounds.map((r, idx) => {
              const isActive = idx === activeLbIndex;
              return (
                <button
                  key={r}
                  onClick={() => setActiveLbIndex(idx)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{getLbLabel(r)}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                    {lbByRound[r]?.length ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* LB Grid */}
          <div
            key={`lb-${currentLbRound}`}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-right-4 duration-300"
          >
            {currentLbMatches.map((match) => {
              const isP1Bye = isSlotBye(match, 1, allMatchesForLogic);
              const isP2Bye = isSlotBye(match, 2, allMatchesForLogic);
              return (
                <div key={match.id} className="transition-transform duration-200 hover:-translate-y-0.5">
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
      )}
    </div>
  );
}
