'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { AlertOctagon, CalendarClock, TimerReset } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DateTimePicker } from '@/components/ui/Input';
import { extractMatchScores, getMatchScorePresentation, resolveMatchSportRules } from '@/features/matches/score-display';
import { readSideOutState } from '@/features/matches/side-out';
import type { SportRulesEnvelope } from '@/types/tournament';
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import type { Match, MatchPenaltyRecord } from '@/types/match';
import { formatDateTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import { getMatchRoundLabel, type RoundLabelTranslations } from '@/utils/match-round-label';
import type { MatchOperationAction, MatchOperationInput, MatchScheduleInput, OpsReferee } from '@/features/organizer/ops/types';

interface OpsMatchesProps {
  matches: Match[];
  referees: OpsReferee[];
  activeMatchActionId: string | null;
  focusedMatchId?: string | null;
  onFocusMatch?: (matchId: string) => void;
  tournamentSportRules?: SportRulesEnvelope | null;
  matchInsights?: Record<string, {
    hasCustomConfig: boolean;
    customConfigSummary: string[];
    dependencyBlocked: boolean;
    dependencySummary: string[];
  }>;
  onUpdateMatchSchedule: (match: Match, payload: MatchScheduleInput) => Promise<void>;
  onApplyMatchOperation: (match: Match, payload: MatchOperationInput) => Promise<void>;
}

interface ScheduleDraft {
  courtName: string;
  courtAddress: string;
  scheduledAt: string;
}

interface OperationDraft {
  action: MatchOperationAction;
  reason: string;
  winnerId: string;
}

interface MatchBucket {
  scheduled: Match[];
  unscheduledReady: Match[];
  blocked: Match[];
  directAdvance: Match[];
}

const STATUS_FILTERS: Array<{ value: Match['status'] | 'ALL'; labelKey: string }> = [
  { value: 'ALL', labelKey: 'statusAll' },
  { value: 'SCHEDULED', labelKey: 'statusScheduled' },
  { value: 'ONGOING', labelKey: 'statusOngoing' },
  { value: 'COMPLETED', labelKey: 'statusCompleted' },
  { value: 'DISPUTED', labelKey: 'statusDisputed' },
];

const BRANCH_LABEL_KEYS: Record<string, string> = {
  MAIN: 'branchMain',
  WINNERS: 'branchWinners',
  LOSERS: 'branchLosers',
  GRAND_FINALS: 'branchGrandFinals',
};

const OPERATION_OPTIONS: Array<{ value: MatchOperationAction; labelKey: string; descriptionKey: string }> = [
  { value: 'WALKOVER', labelKey: 'operationWalkover', descriptionKey: 'operationWalkoverDescription' },
  { value: 'NO_SHOW', labelKey: 'operationNoShow', descriptionKey: 'operationNoShowDescription' },
  { value: 'RETIREMENT', labelKey: 'operationRetirement', descriptionKey: 'operationRetirementDescription' },
  { value: 'DISQUALIFICATION', labelKey: 'operationDisqualification', descriptionKey: 'operationDisqualificationDescription' },
  { value: 'OVERRIDE_RESULT', labelKey: 'operationOverrideResult', descriptionKey: 'operationOverrideResultDescription' },
  { value: 'POSTPONE', labelKey: 'operationPostpone', descriptionKey: 'operationPostponeDescription' },
  { value: 'ABANDON', labelKey: 'operationAbandon', descriptionKey: 'operationAbandonDescription' },
];

export function OpsMatches({
  matches,
  referees,
  activeMatchActionId,
  focusedMatchId,
  onFocusMatch,
  tournamentSportRules,
  matchInsights,
  onUpdateMatchSchedule,
  onApplyMatchOperation,
}: OpsMatchesProps) {
  const matchTranslate = useTranslations('Match');
  const translate = useTranslations('OrganizerOpsMatches');
  const roundLabelTranslations: RoundLabelTranslations = {
    roundGrandFinal: matchTranslate('roundGrandFinal'),
    roundFinal: matchTranslate('roundFinal'),
    roundSemifinal: matchTranslate('roundSemifinal'),
    roundQuarterfinal: matchTranslate('roundQuarterfinal'),
    roundGroupStage: matchTranslate('roundGroupStage'),
    winnersBracket: matchTranslate('winnersBracket'),
    losersBracket: matchTranslate('losersBracket'),
    playoff: matchTranslate('phasePlayoff'),
    roundOf: (round) => matchTranslate('roundOf', { round }),
    legSuffix: (leg) => `${matchTranslate('leg')} ${leg}`,
  };
  const [statusFilter, setStatusFilter] = useState<Match['status'] | 'ALL'>('ALL');
  const [selectedScheduleMatch, setSelectedScheduleMatch] = useState<Match | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>({
    courtName: '',
    courtAddress: '',
    scheduledAt: '',
  });
  const [selectedOperationMatch, setSelectedOperationMatch] = useState<Match | null>(null);
  const [operationDraft, setOperationDraft] = useState<OperationDraft>({
    action: 'WALKOVER',
    reason: '',
    winnerId: '',
  });

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => (statusFilter === 'ALL' ? true : match.status === statusFilter));
  }, [matches, statusFilter]);

  const buckets = useMemo<MatchBucket>(() => {
    const nextBuckets: MatchBucket = {
      scheduled: [],
      unscheduledReady: [],
      blocked: [],
      directAdvance: [],
    };

    for (const match of matches) {
      const matchInsight = matchInsights?.[match.id];
      const missingOpponent = !match.participant1Id || !match.participant2Id;
      const isDirectAdvance = match.isBye || (!!match.winnerId && missingOpponent);

      if (isDirectAdvance) {
        nextBuckets.directAdvance.push(match);
        continue;
      }

      if (match.status === 'SCHEDULED') {
        if (matchInsight?.dependencyBlocked || missingOpponent) {
          nextBuckets.blocked.push(match);
          continue;
        }

        if (match.scheduledAt) {
          nextBuckets.scheduled.push(match);
          continue;
        }

        nextBuckets.unscheduledReady.push(match);
      }
    }

    nextBuckets.scheduled.sort((left, right) => {
      const leftTime = left.scheduledAt ? new Date(left.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.scheduledAt ? new Date(right.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return left.roundNumber - right.roundNumber || left.matchOrder - right.matchOrder;
    });

    nextBuckets.unscheduledReady.sort((left, right) =>
      left.roundNumber - right.roundNumber || left.matchOrder - right.matchOrder,
    );
    nextBuckets.blocked.sort((left, right) =>
      left.roundNumber - right.roundNumber || left.matchOrder - right.matchOrder,
    );
    nextBuckets.directAdvance.sort((left, right) =>
      left.roundNumber - right.roundNumber || left.matchOrder - right.matchOrder,
    );

    return nextBuckets;
  }, [matchInsights, matches]);

  const summary = useMemo(() => {
    return {
      scheduled: buckets.scheduled.length,
      unscheduledReady: buckets.unscheduledReady.length,
      blocked: buckets.blocked.length,
      directAdvance: buckets.directAdvance.length,
      ongoing: matches.filter((match) => match.status === 'ONGOING').length,
      completed: matches.filter((match) => match.status === 'COMPLETED').length,
      disputed: matches.filter((match) => match.status === 'DISPUTED').length,
    };
  }, [buckets, matches]);

  useEffect(() => {
    if (!focusedMatchId) {
      return;
    }

    const card = document.getElementById(`ops-match-card-${focusedMatchId}`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusedMatchId]);

  const openScheduleModal = (match: Match) => {
    setSelectedScheduleMatch(match);
    setScheduleDraft({
      courtName: match.courtName || '',
      courtAddress: '',
      scheduledAt: match.scheduledAt ? match.scheduledAt.slice(0, 16) : '',
    });
  };

  const handleSubmitSchedule = async () => {
    if (!selectedScheduleMatch) {
      return;
    }

    await onUpdateMatchSchedule(selectedScheduleMatch, {
      courtName: scheduleDraft.courtName.trim() || null,
      courtAddress: scheduleDraft.courtAddress.trim() || null,
      scheduledAt: scheduleDraft.scheduledAt ? new Date(scheduleDraft.scheduledAt).toISOString() : null,
    });
    setSelectedScheduleMatch(null);
  };

  const openOperationModal = (match: Match) => {
    setSelectedOperationMatch(match);
    setOperationDraft({
      action: 'WALKOVER',
      reason: '',
      winnerId: match.participant1Id || match.participant2Id || '',
    });
  };

  const handleSubmitOperation = async () => {
    if (!selectedOperationMatch) {
      return;
    }

    await onApplyMatchOperation(selectedOperationMatch, {
      action: operationDraft.action,
      reason: operationDraft.reason,
      winnerId: operationDraft.winnerId,
    });
    setSelectedOperationMatch(null);
    setOperationDraft({
      action: 'WALKOVER',
      reason: '',
      winnerId: '',
    });
  };

  const renderMatchCard = (match: Match) => {
    const isBusy = activeMatchActionId === match.id;
    const specialResult =
      match.scoreDetails &&
      typeof match.scoreDetails === 'object' &&
      'specialResult' in match.scoreDetails
        ? (match.scoreDetails.specialResult as {
            action?: string;
            reason?: string;
          } | undefined)
        : undefined;
    const scoreOverride =
      match.scoreDetails &&
      typeof match.scoreDetails === 'object' &&
      'scoreOverride' in match.scoreDetails
        ? (match.scoreDetails.scoreOverride as {
            reason?: string;
            decidedAt?: string;
          } | undefined)
        : undefined;
    const matchInsight = matchInsights?.[match.id];
    const isDirectAdvance = match.isBye || (!!match.winnerId && (!match.participant1Id || !match.participant2Id));
    const isBlocked = !!matchInsight?.dependencyBlocked || !match.participant1Id || !match.participant2Id;
    const resolvedRules = resolveMatchSportRules({
      matchConfig: match.matchConfig,
      stageRoundConfig: match.stage?.roundConfig ?? match.group?.stage?.roundConfig ?? null,
      tournament: { sportRules: tournamentSportRules },
    });
    const scorePresentation = getMatchScorePresentation(resolvedRules.kind);
    const sideOutState = resolvedRules.kind === 'PICKLEBALL_SIDE_OUT' ? readSideOutState(match) : null;
    const servingTeamLabel =
      sideOutState?.servingTeam === 1
        ? match.participant1?.teamName || translate('teamOne')
        : sideOutState?.servingTeam === 2
          ? match.participant2?.teamName || translate('teamTwo')
          : null;
    const matchSets = extractMatchScores(match.scoreDetails);
    const overriddenSets = matchSets
      .map((set, index) => ({ set, index }))
      .filter(({ set }) => Boolean(set.scoreOverride?.reason));
    const penalties = Array.isArray(match.scoreDetails?.penalties)
      ? (match.scoreDetails.penalties as MatchPenaltyRecord[])
      : [];
    const attentionCount = overriddenSets.length + penalties.length + (specialResult?.action ? 1 : 0);
    const scoreSummary = matchSets.length > 0
      ? `${scorePresentation.wonSummaryLabel}: ${match.p1SetsWon} - ${match.p2SetsWon} • ${matchSets.length} ${scorePresentation.sequenceLabel}`
      : `${scorePresentation.wonSummaryLabel}: ${match.p1SetsWon} - ${match.p2SetsWon}`;
        const roundLabel = getMatchRoundLabel({
      match,
      matches,
      tournamentFormat: match.stage?.type,
      translations: roundLabelTranslations,
    });
    const isRoundRobinMatch = match.stage?.type === 'ROUND_ROBIN' || match.stage?.type === 'GROUP_STAGE' || Boolean(match.group?.name);
    const matchHeaderLabel = isRoundRobinMatch
      ? roundLabel
      : `${roundLabel} • ${translate('matchNumber', { number: match.matchOrder })}`;
    const branchLabel = match.bracketBranch && BRANCH_LABEL_KEYS[match.bracketBranch]
      ? translate(BRANCH_LABEL_KEYS[match.bracketBranch])
      : match.bracketBranch || null;
    const shouldRenderBranchLabel = Boolean(
      branchLabel && branchLabel !== roundLabel && !roundLabel.startsWith(`${branchLabel} •`),
    );

    return (

      <div
        key={match.id}
        id={`ops-match-card-${match.id}`}
        className={cn(
          'rounded-lg border bg-slate-50 p-4 transition-all',
          focusedMatchId === match.id
            ? 'border-amber-400 ring-4 ring-amber-100'
            : 'border-slate-200',
        )}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              {shouldRenderBranchLabel ? `${branchLabel} • ` : ''}{matchHeaderLabel}
            </p>
            <p className="text-sm font-bold text-slate-900">
              {match.participant1?.teamName || translate('tbd')} {translate('versus')} {match.participant2?.teamName || translate('tbd')}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                {(() => { const option = STATUS_FILTERS.find((item) => item.value === match.status); return option ? translate(option.labelKey) : match.status; })()}
              </span>
              {attentionCount > 0 || scoreOverride?.reason ? (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                  {translate('attentionCount', { count: attentionCount || 1 })}
                </span>
              ) : (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                  {translate('noExceptions')}
                </span>
              )}
              {matchInsight?.hasCustomConfig ? (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                  {translate('customRules')}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
              <span>{translate('court')}: {match.courtName || translate('unassigned')}</span>
              <span>{translate('schedule')}: {match.scheduledAt ? formatDateTime(match.scheduledAt) : translate('scheduleUnset')}</span>
              <span>{translate('referee')}: {match.refereeName || (match.refereeId ? translate('refereeAssigned') : translate('refereeUnassigned'))}</span>
              <span>{scoreSummary}</span>
            </div>
            {matchSets.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {matchSets.map((set, index) => (
                  <span
                    key={`ops-set-${match.id}-${index}`}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 text-[11px] font-bold',
                      set.scoreOverride?.reason
                        ? 'border-amber-300 bg-amber-50 text-amber-900'
                        : set.isFinished
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-blue-200 bg-blue-50 text-blue-800',
                    )}
                    title={set.scoreOverride?.reason || undefined}
                  >
                    {scorePresentation.sequenceLabel} {index + 1}: {set.team1Score}-{set.team2Score}
                    {set.scoreOverride?.reason ? ` • ${translate('exception')}` : set.isFinished ? ` • ${translate('locked')}` : ` • ${translate('inProgress')}`}
                  </span>
                ))}
              </div>
            ) : null}
            <details
              className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-xs"
              open={attentionCount > 0 || isBlocked || isDirectAdvance}
            >
              <summary className="cursor-pointer list-none font-bold text-slate-700 [&::-webkit-details-marker]:hidden">
                {translate('detailsSummary')}
              </summary>
              <div className="mt-3 space-y-2">
            {isDirectAdvance ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800">
                {translate('directAdvanceInfo')}
              </div>
            ) : null}
            {specialResult?.action ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800">
                {translate('organizerDecision')}: {specialResult.action}
                {specialResult.reason ? ` • ${specialResult.reason}` : ''}
              </div>
            ) : null}
            {scoreOverride?.reason ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
                {translate('scoreException')}: {scoreOverride.reason}
                {scoreOverride.decidedAt ? ` • ${formatDateTime(scoreOverride.decidedAt)}` : ''}
              </div>
            ) : null}
            {overriddenSets.length > 0 ? (
              <details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-amber-950">
                <summary className="cursor-pointer font-bold">
                  {translate('setExceptions', { count: overriddenSets.length })}
                </summary>
                <div className="mt-2 space-y-2">
                  {overriddenSets.map(({ set, index }) => (
                    <p key={`override-detail-${match.id}-${index}`} className="font-semibold">
                      {scorePresentation.sequenceLabel} {index + 1} ({set.team1Score}-{set.team2Score}): {set.scoreOverride?.reason}
                      {set.scoreOverride?.decidedAt ? ` • ${formatDateTime(set.scoreOverride.decidedAt)}` : ''}
                    </p>
                  ))}
                </div>
              </details>
            ) : null}
            {penalties.length > 0 ? (
              <details className="rounded-lg border border-slate-200 bg-rose-50 px-3 py-2 text-xs text-rose-950">
                <summary className="cursor-pointer font-bold">
                  {translate('cardsAndPenalties', { count: penalties.length })}
                </summary>
                <div className="mt-2 space-y-2">
                  {penalties.map((penalty) => (
                    <div key={penalty.id} className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2">
                      <p className="font-bold">
                        {penalty.team === 1 ? match.participant1?.teamName || translate('teamOne') : penalty.team === 2 ? match.participant2?.teamName || translate('teamTwo') : translate('wholeMatch')}: {penalty.label}
                      </p>
                      <p className="mt-1 font-medium text-rose-800">
                        {penalty.note || penalty.kind} • {formatDateTime(penalty.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
            {matchInsight?.hasCustomConfig ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
                {translate('customConfiguration')}: {matchInsight.customConfigSummary.join(' • ')}
              </div>
            ) : null}
            {sideOutState ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
                {servingTeamLabel
                  ? translate('servingStatus', { team: servingTeamLabel, server: sideOutState.serverNumber })
                  : translate('serverNotConfirmed')}
              </div>
            ) : null}
            {matchInsight?.dependencyBlocked ? (
              <div className="rounded-lg border border-slate-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900">
                {translate('dependencyBlocked')}: {matchInsight.dependencySummary.join(' • ')}
              </div>
            ) : null}
            {!match.participant1Id || !match.participant2Id ? (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                {translate('opponentsNotReady')}
              </div>
            ) : null}
              </div>
            </details>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
            <Button
              variant="outline"
              className="border-slate-200 text-slate-700"
              onClick={() => openScheduleModal(match)}
              disabled={isBusy || isDirectAdvance || isBlocked}
            >
              <CalendarClock className="mr-2 h-4 w-4" />
                            {translate('scheduleAction')}

            </Button>
            <Button
              variant="outline"
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
              onClick={() => onFocusMatch?.(match.id)}
            >
              {translate('viewBracket')}
            </Button>
            <Button asChild variant="outline" className="border-slate-200 font-bold text-slate-700">
              <Link href={`/live/${match.id}`}>
                <TimerReset className="mr-2 h-4 w-4" />
                {translate('openScoreboard')}
              </Link>
            </Button>
            <Button
              variant="outline"
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
              onClick={() => openOperationModal(match)}
              disabled={
                isBusy ||
                isDirectAdvance ||
                match.status === 'COMPLETED' ||
                match.status === 'DISPUTED' ||
                !match.participant1Id ||
                !match.participant2Id
              }
            >
              <AlertOctagon className="mr-2 h-4 w-4" />
              {translate('specialOperation')}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderMatchSection = (
    title: string,
    description: string,
    items: Match[],
    emptyLabel: string,
  ) => (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-700">{title}</h3>
        <p className="mt-1 text-xs font-medium text-slate-500">{description}</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
          <p className="text-sm font-bold text-slate-700">{emptyLabel}</p>
        </div>
      ) : (
        items.map(renderMatchCard)
      )}
    </div>
  );

  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{translate('title')}</h2>
              <p className="text-sm font-medium text-slate-500">
                {translate('subtitle')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{translate('scheduledCount')}</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{summary.scheduled}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">{translate('unscheduledCount')}</p>
              <p className="mt-2 text-lg font-bold text-amber-700">{summary.unscheduledReady}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">{translate('ongoingCount')}</p>
              <p className="mt-2 text-lg font-bold text-blue-700">{summary.ongoing}</p>
            </div>
            <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-600">{translate('blockedCount')}</p>
              <p className="mt-2 text-lg font-bold text-rose-700">{summary.blocked}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">{translate('directAdvanceCount')}</p>
              <p className="mt-2 text-lg font-bold text-emerald-700">{summary.directAdvance}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  'rounded-full border px-3 py-2 text-xs font-bold transition-colors',
                  statusFilter === option.value
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
                )}
              >
                {translate(option.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {statusFilter === 'ALL' ? (
            <>
              {renderMatchSection(
                translate('scheduledSectionTitle'),
                translate('scheduledSectionDescription'),
                buckets.scheduled.slice(0, 8),
                translate('scheduledSectionEmpty'),
              )}
              {renderMatchSection(
                translate('readySectionTitle'),
                translate('readySectionDescription'),
                buckets.unscheduledReady.slice(0, 8),
                translate('readySectionEmpty'),
              )}
              {renderMatchSection(
                translate('blockedSectionTitle'),
                translate('blockedSectionDescription'),
                buckets.blocked.slice(0, 8),
                translate('blockedSectionEmpty'),
              )}
              {renderMatchSection(
                translate('directAdvanceSectionTitle'),
                translate('directAdvanceSectionDescription'),
                buckets.directAdvance.slice(0, 8),
                translate('directAdvanceSectionEmpty'),
              )}
            </>
          ) : filteredMatches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-bold text-slate-700">{translate('filteredEmptyTitle')}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{translate('filteredEmptyDescription')}</p>
            </div>
          ) : (
            filteredMatches.slice(0, 12).map(renderMatchCard)
          )}
        </div>
      </section>

      <Modal open={Boolean(selectedScheduleMatch)} onOpenChange={(open) => !open && setSelectedScheduleMatch(null)}>
        <ModalContent className="sm:max-w-2xl">
          <ModalHeader>
            <ModalTitle>{translate('scheduleModalTitle')}</ModalTitle>
            <ModalDescription>{translate('scheduleModalDescription')}</ModalDescription>
          </ModalHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{translate('courtNameLabel')}</label>
              <input
                value={scheduleDraft.courtName}
                onChange={(event) => setScheduleDraft((current) => ({ ...current, courtName: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
                placeholder={translate('courtNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{translate('matchTimeLabel')}</label>
              <DateTimePicker
                value={scheduleDraft.scheduledAt}
                onChange={(value) => setScheduleDraft((current) => ({ ...current, scheduledAt: value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">{translate('courtAddressLabel')}</label>
              <input
                value={scheduleDraft.courtAddress}
                onChange={(event) => setScheduleDraft((current) => ({ ...current, courtAddress: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
                placeholder={translate('courtAddressPlaceholder')}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">{translate('referee')}</label>
              <div className="flex h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                {translate('refereeStatus', { status: referees.length > 0 ? translate('refereeAutoAssigned') : translate('refereeNoneAccepted') })}
              </div>
            </div>
          </div>

          <ModalFooter className="gap-2">
            <Button variant="outline" className="border-slate-200 text-slate-700" onClick={() => setSelectedScheduleMatch(null)}>
              {translate('cancel')}
            </Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => void handleSubmitSchedule()}>
              {translate('saveSchedule')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal open={Boolean(selectedOperationMatch)} onOpenChange={(open) => !open && setSelectedOperationMatch(null)}>
        <ModalContent className="sm:max-w-2xl">
          <ModalHeader>
            <ModalTitle>{translate('specialOperationTitle')}</ModalTitle>
          <ModalDescription>{translate('specialOperationDescription')}</ModalDescription>
          </ModalHeader>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {OPERATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOperationDraft((current) => ({ ...current, action: option.value }))}
                  className={cn(
                    'rounded-lg border p-4 text-left transition-colors',
                    operationDraft.action === option.value
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  <p className="text-sm font-bold text-slate-900">{translate(option.labelKey)}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{translate(option.descriptionKey)}</p>
                </button>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{translate('winnerLabel')}</label>
                <select
                  value={operationDraft.winnerId}
                  onChange={(event) => setOperationDraft((current) => ({ ...current, winnerId: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  disabled={operationDraft.action === 'POSTPONE' || operationDraft.action === 'ABANDON'}
                >
                  <option value="">
                    {operationDraft.action === 'POSTPONE' || operationDraft.action === 'ABANDON'
                      ? translate('noWinnerRequired')
                      : translate('selectWinner')}
                  </option>
                  {selectedOperationMatch?.participant1Id ? (
                    <option value={selectedOperationMatch.participant1Id}>
                      {selectedOperationMatch.participant1?.teamName || translate('teamOne')}
                    </option>
                  ) : null}
                  {selectedOperationMatch?.participant2Id ? (
                    <option value={selectedOperationMatch.participant2Id}>
                      {selectedOperationMatch.participant2?.teamName || translate('teamTwo')}
                    </option>
                  ) : null}
                </select>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-600">
                {operationDraft.action === 'POSTPONE'
                  ? translate('postponeHint')
                  : operationDraft.action === 'ABANDON'
                    ? translate('abandonHint')
                    : translate('operationResultHint')}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{translate('reasonLabel')}</label>
              <textarea
                value={operationDraft.reason}
                onChange={(event) => setOperationDraft((current) => ({ ...current, reason: event.target.value }))}
                className="min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder={translate('reasonPlaceholder')}
              />
            </div>
          </div>

          <ModalFooter>
            <Button variant="outline" className="border-slate-200" onClick={() => setSelectedOperationMatch(null)}>
              {translate('cancel')}
            </Button>
            <Button
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => void handleSubmitOperation()}
              disabled={
                !operationDraft.reason.trim() ||
                ((operationDraft.action !== 'POSTPONE' && operationDraft.action !== 'ABANDON') &&
                  !operationDraft.winnerId) ||
                activeMatchActionId === selectedOperationMatch?.id
              }
            >
              {translate('applyDecision')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
