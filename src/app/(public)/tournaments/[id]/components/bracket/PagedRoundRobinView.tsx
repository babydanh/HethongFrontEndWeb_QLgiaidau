'use client';

import React, { useMemo, useState } from 'react';
import { TableProperties } from 'lucide-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BracketMatch, BracketStage } from '@/features/tournaments/api';
import type { SportRuleKind } from '@/types/tournament';
import type { OnScheduleMatch, OnSelectBracketMatch } from './types';
import { buildMatchesByRound } from './helpers';
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
  const [subView, setSubView] = useState<'matrix' | 'table'>('matrix');
  const [activeLeg, setActiveLeg] = useState(1);
  // Shared round state — drives both cross table and match list
  const [activeRound, setActiveRound] = useState<number | null>(null);

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

  // Use a derived clamped leg to prevent out-of-bounds rendering
  const currentLeg = Math.min(Math.max(activeLeg, 1), legCount);

  const legRounds = useMemo(
    () => rounds.filter((round) => Math.floor((round - 1) / roundsPerLeg) + 1 === currentLeg),
    [currentLeg, rounds, roundsPerLeg],
  );
  const legMatches = useMemo(
    () => legRounds.flatMap((round) => byRound[round] ?? []),
    [byRound, legRounds],
  );

  // Round numbers stay global across legs. Keep the cursor in the selected leg.
  const currentRound = activeRound != null && legRounds.includes(activeRound)
    ? activeRound
    : legRounds[0] ?? null;

  const changeLeg = (nextLeg: number) => {
    const clampedLeg = Math.min(Math.max(nextLeg, 1), legCount);
    setActiveLeg(clampedLeg);
    // Round numbers are global across legs. Move the round cursor with the
    // leg so the matrix never keeps rendering the previous leg's snapshot.
    const firstRound = rounds.find(
      (round) => Math.floor((round - 1) / roundsPerLeg) + 1 === clampedLeg,
    );
    setActiveRound(firstRound ?? null);
  };

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

  // Cumulative matches up to currentRound (for cross table — shows progressive results)
  // Guard: if currentRound belongs to a different leg, fall back to all legMatches
  const cumulativeMatches = legMatches;

  // Round nav helpers
  const legRoundsForNav = legRounds;
  const canPrevRound = currentRound != null && legRoundsForNav.indexOf(currentRound) > 0;
  const canNextRound = currentRound != null && legRoundsForNav.indexOf(currentRound) < legRoundsForNav.length - 1;
  const roundLabel = currentRound != null
    ? `Lượt ${legRoundsForNav.indexOf(currentRound) + 1} / ${legRoundsForNav.length}`
    : '';

  const roundNavigation = legRoundsForNav.length > 1 ? (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => {
          const idx = legRoundsForNav.indexOf(currentRound!);
          if (idx > 0) setActiveRound(legRoundsForNav[idx - 1]);
        }}
        disabled={!canPrevRound}
        className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-xs font-semibold text-slate-600 min-w-14 text-center">{roundLabel}</span>
      <button
        type="button"
        onClick={() => {
          const idx = legRoundsForNav.indexOf(currentRound!);
          if (idx < legRoundsForNav.length - 1) setActiveRound(legRoundsForNav[idx + 1]);
        }}
        disabled={!canNextRound}
        className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  ) : null;

  if (subView === 'matrix') {
    return (
      <div className="flex flex-col gap-4 animate-in fade-in duration-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-500">
            Tổng hợp kết quả {legCount > 1 ? `${legCount} lượt thi đấu` : 'thi đấu'}
          </p>
          {viewButtons('matrix')}
        </div>
        {/* Cross matrix — navigated per round, shows cumulative scores */}
        <GroupCrossMatrixView
          matches={cumulativeMatches}
          groupName={legCount > 1 ? `Bảng chéo - Lượt ${currentLeg}` : 'Bảng chéo'}
          activeLeg={currentLeg}
          legCount={legCount}
          onLegChange={changeLeg}
          roundNavigation={roundNavigation}
        />
        {/* Match list — controlled by same activeRound */}
        <RoundRobinView
          matches={legMatches}
          onScheduleMatch={onScheduleMatch}
          selectedMatchId={selectedMatchId}
          onSelectMatch={onSelectMatch}
          tournamentId={tournamentId}
          stageId={stageId}
          fallbackSportRuleKind={fallbackSportRuleKind}
          roundConfig={roundConfig}
          tiebreakerMode={tiebreakerMode}
          hideStandings={true}
          activeRound={currentRound}
          onRoundChange={setActiveRound}
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
