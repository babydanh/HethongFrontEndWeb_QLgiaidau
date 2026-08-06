/**
 * PagedRoundRobinView — World Cup style Round Robin / Group Stage view
 *
 * Carousel Round Navigation (Lượt 1, Lượt 2...) combined with Match Cards & Standings
 */

'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, TableProperties } from 'lucide-react';
import type { BracketMatch, BracketStage } from '@/features/tournaments/api';
import type { SportRuleKind } from '@/types/tournament';
import type { OnScheduleMatch, OnSelectBracketMatch } from './types';
import { buildMatchesByRound } from './helpers';
import { MatchCard } from './MatchCard';
import { RoundRobinView } from './RoundRobinView';

import { GroupCrossMatrixView } from './GroupCrossMatrixView';

interface Props {
  matches: BracketMatch[];
  onScheduleMatch?: OnScheduleMatch;
  selectedMatchId?: string | null;
  onSelectMatch?: OnSelectBracketMatch;
  tournamentId?: string;
  stageId?: string;
  fallbackSportRuleKind?: SportRuleKind;
  roundConfig?: BracketStage['roundConfig'];
  tiebreakerMode?: 'split' | 'playoff';
}

export function PagedRoundRobinView({
  matches,
  onScheduleMatch,
  selectedMatchId,
  onSelectMatch,
  tournamentId,
  stageId,
  fallbackSportRuleKind,
  roundConfig,
  tiebreakerMode,
}: Props) {
  const [subView, setSubView] = useState<'rounds' | 'table' | 'matrix'>('rounds');
  const byRound = useMemo(() => buildMatchesByRound(matches), [matches]);
  const rounds = useMemo(
    () =>
      Object.keys(byRound)
        .map(Number)
        .sort((a, b) => a - b),
    [byRound],
  );

  const [activeRoundIndex, setActiveRoundIndex] = useState<number>(0);

  const currentRound = rounds[activeRoundIndex] ?? rounds[0];
  const currentMatches = byRound[currentRound] ?? [];

  if (subView === 'matrix') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setSubView('rounds')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-sm cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4 text-blue-600" /> Xem theo Lượt trận
          </button>
          <button
            onClick={() => setSubView('table')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-sm cursor-pointer"
          >
            <TableProperties className="w-4 h-4 text-emerald-600" /> Bảng xếp hạng
          </button>
        </div>
        <GroupCrossMatrixView matches={matches} />
      </div>
    );
  }

  if (subView === 'table') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setSubView('rounds')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-sm cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4 text-blue-600" /> Xem theo Lượt trận
          </button>
          <button
            onClick={() => setSubView('matrix')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-sm cursor-pointer"
          >
            <TableProperties className="w-4 h-4 text-purple-600" /> Bảng chéo Matrix
          </button>
        </div>
        <RoundRobinView
          matches={matches}
          onScheduleMatch={onScheduleMatch}
          selectedMatchId={selectedMatchId}
          onSelectMatch={onSelectMatch}
          tournamentId={tournamentId}
          stageId={stageId}
          fallbackSportRuleKind={fallbackSportRuleKind}
          roundConfig={roundConfig}
          tiebreakerMode={tiebreakerMode}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header & Sub-view Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Vòng Tròn Tính Điểm
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Lượt trận thứ {currentRound}
            </h3>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t border-slate-800 sm:border-t-0 flex-wrap">
          <button
            onClick={() => setSubView('table')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            <TableProperties className="w-4 h-4" /> Bảng xếp hạng
          </button>
          <button
            onClick={() => setSubView('matrix')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer mr-2"
          >
            <TableProperties className="w-4 h-4" /> Bảng chéo Matrix
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveRoundIndex((p) => Math.max(p - 1, 0))}
              disabled={activeRoundIndex === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-200 transition-all border border-slate-700 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-400 min-w-[60px] text-center">
              {activeRoundIndex + 1} / {rounds.length}
            </span>
            <button
              onClick={() => setActiveRoundIndex((p) => Math.min(p + 1, rounds.length - 1))}
              disabled={activeRoundIndex === rounds.length - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Round Selector Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {rounds.map((r, idx) => {
          const isActive = idx === activeRoundIndex;
          return (
            <button
              key={r}
              onClick={() => setActiveRoundIndex(idx)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-[1.02]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>Lượt trận {r}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                {byRound[r]?.length ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Matches Grid */}
      <div
        key={`rr-${currentRound}`}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-right-4 duration-300"
      >
        {currentMatches.map((match) => (
          <div key={match.id} className="transition-transform duration-200 hover:-translate-y-0.5">
            <MatchCard
              match={match}
              onScheduleMatch={onScheduleMatch}
              onSelectMatch={onSelectMatch}
              selected={selectedMatchId === match.id}
              fallbackSportRuleKind={fallbackSportRuleKind}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
