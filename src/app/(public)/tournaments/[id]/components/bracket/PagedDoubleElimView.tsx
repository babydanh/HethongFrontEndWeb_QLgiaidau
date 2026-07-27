/**
 * PagedDoubleElimView — Clean Branch-Based Round Navigation (Option 1 Tab Switcher)
 *
 * Tab Switcher: [ 🏆 Nhánh Thắng ] | [ 💀 Nhánh Thua ] | [ 👑 Chung Kết ]
 * Auto-detects and defaults to the currently ongoing / upcoming active round!
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ShieldCheck, Flame, Crown } from 'lucide-react';
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

type BranchTab = 'upper' | 'lower' | 'grand_finals';

export function PagedDoubleElimView({
  upperMatches,
  lowerMatches,
  gfMatches,
  onScheduleMatch,
  selectedMatchId,
  onSelectMatch,
  fallbackSportRuleKind,
}: Props) {
  const ubByRound = useMemo(() => buildMatchesByRound(upperMatches), [upperMatches]);
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

  // Auto-detect branch and round that is currently active/ongoing
  const defaultBranch: BranchTab = useMemo(() => {
    const hasLiveOrScheduled = (list: BracketMatch[]) =>
      list.some((m) => m.status === 'IN_PROGRESS' || m.status === 'SCHEDULED' || m.status === 'READY');
    if (hasLiveOrScheduled(upperMatches)) return 'upper';
    if (hasLiveOrScheduled(lowerMatches)) return 'lower';
    if (hasLiveOrScheduled(gfMatches)) return 'grand_finals';
    return 'upper';
  }, [upperMatches, lowerMatches, gfMatches]);

  const [activeBranch, setActiveBranch] = useState<BranchTab>(defaultBranch);
  const [activeUbIndex, setActiveUbIndex] = useState<number>(0);
  const [activeLbIndex, setActiveLbIndex] = useState<number>(0);

  // Auto-detect initial active round in UB & LB
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

  const getUbLabel = (r: number) => {
    const fromEnd = ubRounds.length - (ubRounds.indexOf(r) + 1);
    if (fromEnd === 0) return 'Chung kết Nhánh thắng';
    if (fromEnd === 1) return 'Bán kết Nhánh thắng';
    if (fromEnd === 2) return 'Tứ kết Nhánh thắng';
    return `Vòng ${r} Nhánh thắng`;
  };

  const getLbLabel = (r: number) => {
    const fromEnd = lbRounds.length - (lbRounds.indexOf(r) + 1);
    if (fromEnd === 0) return 'Chung kết Nhánh thua';
    if (fromEnd === 1) return 'Bán kết Nhánh thua';
    return `Lượt ${r} Nhánh thua`;
  };

  const allMatchesForLogic = useMemo(
    () => [...upperMatches, ...lowerMatches, ...gfMatches],
    [upperMatches, lowerMatches, gfMatches],
  );

  const currentUbRound = ubRounds[activeUbIndex] ?? ubRounds[0];
  const currentUbMatches = ubByRound[currentUbRound] ?? [];

  const currentLbRound = lbRounds[activeLbIndex] ?? lbRounds[0];
  const currentLbMatches = lbByRound[currentLbRound] ?? [];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Branch Tabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 shadow-inner overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveBranch('upper')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeBranch === 'upper'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.01]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-blue-300" />
          <span>Nhánh Thắng</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeBranch === 'upper' ? 'bg-white/20' : 'bg-slate-200 text-slate-600'}`}>
            {upperMatches.length} trận
          </span>
        </button>

        {lowerMatches.length > 0 && (
          <button
            onClick={() => setActiveBranch('lower')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeBranch === 'lower'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20 scale-[1.01]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-300" />
            <span>Nhánh Thua</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeBranch === 'lower' ? 'bg-white/20' : 'bg-slate-200 text-slate-600'}`}>
              {lowerMatches.length} trận
            </span>
          </button>
        )}

        {gfMatches.length > 0 && (
          <button
            onClick={() => setActiveBranch('grand_finals')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeBranch === 'grand_finals'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20 scale-[1.01]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-200" />
            <span>Chung Kết Tổng</span>
          </button>
        )}
      </div>

      {/* BRANCH 1: UPPER BRACKET */}
      {activeBranch === 'upper' && (
        <div className="flex flex-col gap-5">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-lg border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  Vòng {activeUbIndex + 1} / {ubRounds.length}
                </span>
                <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {getUbLabel(currentUbRound)}
                </h4>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-slate-800 sm:border-t-0">
              <button
                onClick={() => setActiveUbIndex((p) => Math.max(p - 1, 0))}
                disabled={activeUbIndex === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-200 transition-all border border-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Vòng trước
              </button>
              <span className="text-xs font-medium text-slate-400">
                {currentUbMatches.length} trận
              </span>
              <button
                onClick={() => setActiveUbIndex((p) => Math.min(p + 1, ubRounds.length - 1))}
                disabled={activeUbIndex === ubRounds.length - 1}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
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
        <div className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-rose-950 text-white rounded-xl p-4 sm:p-5 shadow-lg border border-rose-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
                <Flame className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
                  Lượt {activeLbIndex + 1} / {lbRounds.length}
                </span>
                <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {getLbLabel(currentLbRound)}
                </h4>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-rose-900 sm:border-t-0">
              <button
                onClick={() => setActiveLbIndex((p) => Math.max(p - 1, 0))}
                disabled={activeLbIndex === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-900 hover:bg-rose-800 disabled:opacity-40 text-xs font-bold text-rose-100 transition-all border border-rose-800 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Vòng trước
              </button>
              <span className="text-xs font-medium text-rose-300">
                {currentLbMatches.length} trận
              </span>
              <button
                onClick={() => setActiveLbIndex((p) => Math.min(p + 1, lbRounds.length - 1))}
                disabled={activeLbIndex === lbRounds.length - 1}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md scale-[1.02]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50'
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

      {/* BRANCH 3: GRAND FINALS */}
      {activeBranch === 'grand_finals' && gfMatches.length > 0 && (
        <div className="flex flex-col gap-5">
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl p-5 shadow-lg flex items-center gap-3">
            <Crown className="w-6 h-6 text-amber-200" />
            <div>
              <span className="text-xs font-semibold text-amber-200 uppercase tracking-wider">
                Trận Quyết Định Ngôi Vương
              </span>
              <h4 className="text-lg font-bold text-white">Chung Kết Tổng (Grand Finals)</h4>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {gfMatches.map((match) => {
              const isP1Bye = isSlotBye(match, 1, allMatchesForLogic);
              const isP2Bye = isSlotBye(match, 2, allMatchesForLogic);
              return (
                <div key={match.id}>
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
