'use client';

import React, { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TableProperties } from 'lucide-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BracketMatch, BracketStage } from '@/features/tournaments/api';
import type { SportRuleKind } from '@/types/tournament';
import type { OnScheduleMatch, OnSelectBracketMatch } from './types';
import { buildMatchesByRound } from './helpers';
import { RoundRobinView } from './RoundRobinView';
import { GroupCrossMatrixView } from './GroupCrossMatrixView';
import { getRoundRobinRoundInfo } from '@/utils/match-round-label';

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
  const translate = useTranslations('TournamentDetail');
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
    const persistedLegs = matches
      .map((match) => match.leg)
      .filter((leg): leg is number => typeof leg === 'number' && Number.isInteger(leg) && leg > 0);
    const configuredLegs = Number(roundConfig?.roundsToPlay ?? roundConfig?.rounds_to_play ?? 0);
    return Math.max(1, configuredLegs, ...persistedLegs, Math.ceil((rounds[rounds.length - 1] ?? 0) / roundsPerLeg));
  }, [matches, roundConfig, rounds, roundsPerLeg]);

  // Use a derived clamped leg to prevent out-of-bounds rendering
  const currentLeg = Math.min(Math.max(activeLeg, 1), legCount);

  const legMatches = useMemo(
    () => matches.filter((match) => getRoundRobinRoundInfo(match, matches).leg === currentLeg),
    [currentLeg, matches],
  );
  const legRounds = useMemo(
    () => Array.from(new Set(legMatches.map((match) => getRoundRobinRoundInfo(match, matches).roundWithinLeg))).sort((a, b) => a - b),
    [legMatches, matches],
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
    const firstRound = legRoundsForNav[0];
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
          <TableProperties className="h-4 w-4 text-sky-600" /> {translate('crossTable')}
        </button>
      )}
      {exclude !== 'table' && (
        <button
          type="button"
          onClick={() => setSubView('table')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
        >
          <TableProperties className="h-4 w-4 text-emerald-600" /> {translate('standingsTable')}
        </button>
      )}
    </div>
  );

  // Keep every team in the matrix, but calculate/display only results through
  // the selected round. This makes round navigation progressive without
  // dropping teams that have a BYE or play later in the leg.
  const cumulativeMatches = legMatches;

  // Round nav helpers
  const legRoundsForNav = legRounds;
  const canPrevRound = currentRound != null && legRoundsForNav.indexOf(currentRound) > 0;
  const canNextRound = currentRound != null && legRoundsForNav.indexOf(currentRound) < legRoundsForNav.length - 1;
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
      <span className="text-xs font-semibold text-slate-600 min-w-24 text-center">{translate('roundAndLeg', { leg: currentLeg, round: currentRound ?? '-' })}</span>
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
            {legCount > 1 ? translate('resultsAcrossLegs', { count: legCount }) : translate('resultsSummary')}
          </p>
          {viewButtons('matrix')}
        </div>
        {/* Cross matrix — navigated per round, shows cumulative scores */}
        <GroupCrossMatrixView
          matches={cumulativeMatches}
          groupName={legCount > 1 ? translate('crossTableLeg', { number: currentLeg }) : translate('crossTable')}
          activeLeg={currentLeg}
          legCount={legCount}
          onLegChange={changeLeg}
          roundNavigation={roundNavigation}
          throughRound={currentRound}
          roundConfig={roundConfig as Record<string, unknown> | null | undefined}
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
        <p className="text-xs font-semibold text-slate-500">{translate('resultsAcrossLegs', { count: legCount })}</p>
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
