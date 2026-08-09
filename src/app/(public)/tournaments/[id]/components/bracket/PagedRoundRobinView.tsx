'use client';

import React, { useEffect, useMemo, useState } from 'react';
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

interface LegNavigationProps {
  activeLeg: number;
  legCount: number;
  onChange: (leg: number) => void;
}

function LegNavigation({ activeLeg, legCount, onChange }: LegNavigationProps) {
  if (legCount <= 1) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Chọn lượt thi đấu">
      {Array.from({ length: legCount }, (_, index) => index + 1).map((leg) => (
        <button
          key={leg}
          type="button"
          onClick={() => onChange(leg)}
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
            activeLeg === leg
              ? 'border-sky-500 bg-sky-500 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700'
          }`}
        >
          Lượt {leg}
        </button>
      ))}
    </div>
  );
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
  const [activeLeg, setActiveLeg] = useState(1);
  const [activeRoundIndex, setActiveRoundIndex] = useState(0);

  const byRound = useMemo(() => buildMatchesByRound(matches), [matches]);
  const rounds = useMemo(
    () => Object.keys(byRound).map(Number).sort((a, b) => a - b),
    [byRound],
  );

  const participantCount = useMemo(() => {
    const ids = new Set<string>();
    matches.forEach((match) => {
      if (match.participant1?.id) ids.add(match.participant1.id);
      if (match.participant2?.id) ids.add(match.participant2.id);
    });
    return ids.size;
  }, [matches]);

  const roundsPerLeg = useMemo(() => {
    const slotCount = participantCount % 2 === 0 ? participantCount : participantCount + 1;
    return Math.max(1, slotCount - 1);
  }, [participantCount]);

  const legCount = useMemo(() => {
    const maxRound = rounds[rounds.length - 1] ?? 0;
    return Math.max(1, Math.ceil(maxRound / roundsPerLeg));
  }, [rounds, roundsPerLeg]);

  useEffect(() => {
    setActiveLeg((current) => Math.min(Math.max(current, 1), legCount));
  }, [legCount]);

  useEffect(() => {
    setActiveRoundIndex(0);
  }, [activeLeg]);

  const legRounds = useMemo(
    () => rounds.filter((round) => Math.floor((round - 1) / roundsPerLeg) + 1 === activeLeg),
    [activeLeg, rounds, roundsPerLeg],
  );
  const legMatches = useMemo(
    () => legRounds.flatMap((round) => byRound[round] ?? []),
    [byRound, legRounds],
  );

  const currentRound = legRounds[activeRoundIndex] ?? legRounds[0];
  const currentMatches = currentRound ? byRound[currentRound] ?? [] : [];
  const currentLocalRound = currentRound ? ((currentRound - 1) % roundsPerLeg) + 1 : 1;

  const viewButtons = (exclude: 'matrix' | 'table' | 'rounds') => (
    <div className="flex flex-wrap justify-end gap-2">
      {exclude !== 'rounds' && (
        <button
          type="button"
          onClick={() => setSubView('rounds')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <LayoutGrid className="h-4 w-4 text-sky-600" /> Theo vòng
        </button>
      )}
      {exclude !== 'matrix' && (
        <button
          type="button"
          onClick={() => setSubView('matrix')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <TableProperties className="h-4 w-4 text-sky-600" /> Bảng chéo
        </button>
      )}
      {exclude !== 'table' && (
        <button
          type="button"
          onClick={() => setSubView('table')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <TableProperties className="h-4 w-4 text-emerald-600" /> Bảng xếp hạng
        </button>
      )}
    </div>
  );

  if (subView === 'matrix') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <LegNavigation activeLeg={activeLeg} legCount={legCount} onChange={setActiveLeg} />
          {viewButtons('matrix')}
        </div>
        <GroupCrossMatrixView matches={legMatches} groupName={`Bảng chéo - Lượt ${activeLeg}`} />
      </div>
    );
  }

  if (subView === 'table') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-500">Tổng hợp kết quả {legCount} lượt thi đấu</p>
          {viewButtons('table')}
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
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Vòng tròn tính điểm</span>
          <h3 className="text-base font-bold text-slate-900 sm:text-lg">Lượt {activeLeg} · Vòng {currentLocalRound}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {viewButtons('rounds')}
          <button
            type="button"
            onClick={() => setActiveRoundIndex((current) => Math.max(current - 1, 0))}
            disabled={activeRoundIndex === 0}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 disabled:opacity-40"
            aria-label="Vòng trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-12 text-center text-xs font-semibold text-slate-600">
            {legRounds.length ? activeRoundIndex + 1 : 0} / {legRounds.length}
          </span>
          <button
            type="button"
            onClick={() => setActiveRoundIndex((current) => Math.min(current + 1, legRounds.length - 1))}
            disabled={!legRounds.length || activeRoundIndex === legRounds.length - 1}
            className="rounded-lg bg-sky-500 p-1.5 text-white disabled:opacity-40"
            aria-label="Vòng tiếp theo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <LegNavigation activeLeg={activeLeg} legCount={legCount} onChange={setActiveLeg} />

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {legRounds.map((round, index) => {
          const isActive = index === activeRoundIndex;
          return (
            <button
              key={round}
              type="button"
              onClick={() => setActiveRoundIndex(index)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-colors ${
                isActive
                  ? 'border-sky-500 bg-sky-500 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Vòng {((round - 1) % roundsPerLeg) + 1}
              <span className={`rounded px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                {byRound[round]?.length ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div
        key={`rr-${activeLeg}-${currentRound}`}
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
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
