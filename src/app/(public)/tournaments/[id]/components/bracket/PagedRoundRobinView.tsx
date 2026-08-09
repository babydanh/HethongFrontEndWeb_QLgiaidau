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
  const [subView, setSubView] = useState<'matrix' | 'table'>('table');
  const [activeLeg, setActiveLeg] = useState(1);

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

  const legRounds = useMemo(
    () => rounds.filter((round) => Math.floor((round - 1) / roundsPerLeg) + 1 === activeLeg),
    [activeLeg, rounds, roundsPerLeg],
  );
  const legMatches = useMemo(
    () => legRounds.flatMap((round) => byRound[round] ?? []),
    [byRound, legRounds],
  );

  const viewButtons = (exclude: 'matrix' | 'table') => (
    <div className="flex flex-wrap justify-end gap-2">
      {exclude !== 'matrix' && (
        <button
          type="button"
          onClick={() => setSubView('matrix')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
        >
          <TableProperties className="h-4 w-4 text-sky-600" /> Bảng chéo
        </button>
      )}
      {exclude !== 'table' && (
        <button
          type="button"
          onClick={() => setSubView('table')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
        >
          <TableProperties className="h-4 w-4 text-emerald-600" /> Bảng xếp hạng
        </button>
      )}
    </div>
  );

  if (subView === 'matrix') {
    return (
      <div className="flex flex-col gap-4 animate-in fade-in duration-200">
        <div className="flex justify-end">
          {viewButtons('matrix')}
        </div>
        <GroupCrossMatrixView 
          matches={legMatches} 
          groupName={`Bảng chéo - Lượt ${activeLeg}`}
          activeLeg={activeLeg}
          legCount={legCount}
          onLegChange={setActiveLeg}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
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
