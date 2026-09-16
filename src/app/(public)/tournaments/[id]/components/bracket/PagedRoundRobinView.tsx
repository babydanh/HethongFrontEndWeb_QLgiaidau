'use client';

import React, { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, TableProperties } from 'lucide-react';
import type { BracketMatch, BracketStage } from '@/features/tournaments/api';
import type { SportRuleKind } from '@/types/tournament';
import type {
  OnScheduleMatch,
  OnSelectBracketMatch,
  RoundRobinGroupDragHandlers,
} from './types';
import { RoundRobinView } from './RoundRobinView';
import { GroupCrossMatrixView } from './GroupCrossMatrixView';
import { getRoundRobinRoundInfo } from '@/utils/match-round-label';

interface Props {
  matches: BracketMatch[];
  groupName?: string;
  onScheduleMatch?: OnScheduleMatch;
  selectedMatchId?: string | null;
  onSelectMatch?: OnSelectBracketMatch;
  onDoubleClickMatch?: OnSelectBracketMatch;
  tournamentId?: string;
  stageId?: string;
  fallbackSportRuleKind?: SportRuleKind;
  roundConfig?: BracketStage['roundConfig'];
  tiebreakerMode?: 'split' | 'playoff';
  groupId?: string;
  groupDragHandlers?: RoundRobinGroupDragHandlers;
}

export function PagedRoundRobinView({
  matches,
  groupName,
  onScheduleMatch,
  selectedMatchId,
  onSelectMatch,
  onDoubleClickMatch,
  tournamentId,
  stageId,
  fallbackSportRuleKind,
  roundConfig,
  tiebreakerMode,
  groupId,
  groupDragHandlers,
}: Props) {
  const translate = useTranslations('TournamentDetail');
  const [subView, setSubView] = useState<'matrix' | 'table'>('matrix');
  const [activeLeg, setActiveLeg] = useState(1);

  React.useEffect(() => {
    if (!selectedMatchId || !matches.length) return;
    const targetMatch = matches.find((m) => m.id === selectedMatchId);
    if (targetMatch) {
      const info = getRoundRobinRoundInfo(targetMatch, matches);
      if (info.leg && info.leg !== activeLeg) {
        // The selected match is an external selection; keep the visible leg in sync with it.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveLeg(info.leg);
      }
    }
  }, [activeLeg, matches, selectedMatchId]);
  const legCount = useMemo(() => {
    const persistedLegs = matches
      .map((match) => match.leg)
      .filter((leg): leg is number => typeof leg === 'number' && Number.isInteger(leg) && leg > 0);
    const configuredLegs = Number(roundConfig?.roundsToPlay ?? roundConfig?.rounds_to_play ?? 0);

    // Do not infer extra legs from roundNumber. A single-leg group stage can
    // legitimately have several internal rounds; only persisted legs or the
    // stage setting may expose a second leg.
    if (configuredLegs > 0) return Math.max(1, Math.trunc(configuredLegs));
    if (persistedLegs.length > 0) return Math.max(1, ...persistedLegs);
    return 1;
  }, [matches, roundConfig]);

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
    <div className="flex items-center gap-1.5">
      {exclude !== 'matrix' && (
        <button
          type="button"
          onClick={() => setSubView('matrix')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100/80 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <TableProperties className="h-3.5 w-3.5 text-sky-600" />
          <span>{translate('crossTable')}</span>
        </button>
      )}
      {exclude !== 'table' && (
        <button
          type="button"
          onClick={() => setSubView('table')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100/80 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <TableProperties className="h-3.5 w-3.5 text-emerald-600" />
          <span>{translate('standingsTable')}</span>
        </button>
      )}
    </div>
  );

  const legSelector = legCount > 1 ? (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/70 p-0.5" aria-label={translate('selectGroupLeg')}>
      <button
        type="button"
        onClick={() => changeLeg(currentLeg - 1)}
        disabled={currentLeg <= 1}
        className="rounded-md p-1 text-slate-500 transition-colors hover:bg-white hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label={translate('previousLeg')}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-16 text-center text-[11px] font-bold text-slate-600">
        {translate('legProgress', { current: currentLeg, total: legCount })}
      </span>
      <button
        type="button"
        onClick={() => changeLeg(currentLeg + 1)}
        disabled={currentLeg >= legCount}
        className="rounded-md p-1 text-slate-500 transition-colors hover:bg-white hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label={translate('nextLeg')}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  ) : null;

  const matrixHeaderActions = (
    <div className="flex items-center gap-2">
      {legSelector}
      {viewButtons('matrix')}
    </div>
  );

  const tableHeaderActions = (
    <div className="flex items-center gap-2">
      {viewButtons('table')}
    </div>
  );

  if (subView === 'matrix') {
    return (
      <div className="animate-in fade-in duration-200">
        <GroupCrossMatrixView
          matches={legMatches}
          groupName={groupName}
          activeLeg={currentLeg}
          legCount={legCount}
          throughRound={null}
          roundConfig={roundConfig as Record<string, unknown> | null | undefined}
          roundInfoMatches={matches}
          headerAction={matrixHeaderActions}
          groupId={groupId}
          groupDragHandlers={groupDragHandlers}
        />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-200">
      <RoundRobinView
        matches={legMatches}
        standingsMatches={matches}
        groupName={groupName}
        activeLeg={currentLeg}
        onScheduleMatch={onScheduleMatch}
        selectedMatchId={selectedMatchId}
        onSelectMatch={onSelectMatch}
        onDoubleClickMatch={onDoubleClickMatch}
        tournamentId={tournamentId}
        stageId={stageId}
        fallbackSportRuleKind={fallbackSportRuleKind}
        roundConfig={roundConfig}
        tiebreakerMode={tiebreakerMode}
        hideSchedule={true}
        headerAction={tableHeaderActions}
        groupId={groupId}
        groupDragHandlers={groupDragHandlers}
      />
    </div>
  );
}
