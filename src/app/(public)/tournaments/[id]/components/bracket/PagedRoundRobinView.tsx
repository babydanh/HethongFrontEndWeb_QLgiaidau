'use client';

import React, { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TableProperties } from 'lucide-react';
import type { BracketMatch, BracketStage } from '@/features/tournaments/api';
import type { SportRuleKind } from '@/types/tournament';
import type { OnScheduleMatch, OnSelectBracketMatch } from './types';
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
    const maxRoundNumber = Math.max(0, ...matches.map((match) => match.roundNumber));
    return Math.max(1, configuredLegs, ...persistedLegs, Math.ceil(maxRoundNumber / roundsPerLeg));
  }, [matches, roundConfig, roundsPerLeg]);

  // Use a derived clamped leg to prevent out-of-bounds rendering
  const currentLeg = Math.min(Math.max(activeLeg, 1), legCount);

  const legMatches = useMemo(
    () => matches.filter((match) => getRoundRobinRoundInfo(match, matches).leg === currentLeg),
    [currentLeg, matches],
  );
  const changeLeg = (nextLeg: number) => {
    setActiveLeg(Math.min(Math.max(nextLeg, 1), legCount));
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

  const legSelector = legCount > 1 ? (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" aria-label={translate('selectGroupLeg')}>
      {Array.from({ length: legCount }, (_, index) => index + 1).map((leg) => (
        <button
          key={leg}
          type="button"
          onClick={() => changeLeg(leg)}
          aria-pressed={currentLeg === leg}
          className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${currentLeg === leg ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'}`}
        >
          {translate('legLabel', { number: leg })}
        </button>
      ))}
    </div>
  ) : null;

  if (subView === 'matrix') {
    return (
      <div className="flex flex-col gap-4 animate-in fade-in duration-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-500">
            {legCount > 1 ? translate('resultsAcrossLegs', { count: legCount }) : translate('resultsSummary')}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {legSelector}
            {viewButtons('matrix')}
          </div>
        </div>
        {/* Cross matrix for the complete selected leg. */}
        <GroupCrossMatrixView
          matches={legMatches}
          groupName={translate('crossTable')}
          activeLeg={currentLeg}
          legCount={legCount}
          throughRound={null}
          roundConfig={roundConfig as Record<string, unknown> | null | undefined}
          roundInfoMatches={matches}
        />
        {/* Match list — every pairing in the selected leg, without internal round pagination. */}
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
          activeLeg={currentLeg}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-slate-500">{translate('resultsAcrossLegs', { count: legCount })}</p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {legSelector}
          {viewButtons('table')}
        </div>
      </div>
      <RoundRobinView
        matches={legMatches}
        activeLeg={currentLeg}
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
