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
  const [subView, setSubView] = useState<'matrix' | 'table' | 'rounds'>('matrix');
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
            <LayoutGrid className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Vòng Tròn Tính Điểm
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Lượt trận thứ {currentRound}
            </h3>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t border-slate-100 sm:border-t-0 flex-wrap">
          <button
            onClick={() => setSubView('table')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <TableProperties className="w-4 h-4 text-slate-500" /> Bảng xếp hạng
          </button>
          <button
            onClick={() => setSubView('matrix')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer mr-2 shadow-sm"
          >
            <TableProperties className="w-4 h-4 text-blue-600" /> Bảng chéo Matrix
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveRoundIndex((p) => Math.max(p - 1, 0))}
              disabled={activeRoundIndex === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-bold text-slate-700 transition-all border border-slate-200 cursor-pointer shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-600 min-w-[60px] text-center">
              {activeRoundIndex + 1} / {rounds.length}
            </span>
            <button
              onClick={() => setActiveRoundIndex((p) => Math.min(p + 1, rounds.length - 1))}
              disabled={activeRoundIndex === rounds.length - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-xs font-bold text-white transition-all shadow-sm cursor-pointer"
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
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-[1.02]'
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
