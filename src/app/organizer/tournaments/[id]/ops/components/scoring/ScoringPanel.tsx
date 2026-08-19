'use client';

import { useTranslations } from 'next-intl';
import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/Button';
import { ModalFooter } from '@/components/ui/Modal';
import {
  extractMatchScores,
  getMatchScorePresentation,
  resolveMatchSportRules,
} from '@/features/matches/score-display';
import { getScoreRuleWarnings } from '@/features/matches/score-rule-warnings';
import {
  getQuickScoreTemplates,
  getScoreEntryGuidance,
} from '@/features/tournaments/sport-rules/ui-guidance';
import {
  buildEmptySideOutState,
  computeNextSideOutState,
  readSideOutState,
  setServingTeamSideOutState,
} from '@/features/matches/side-out';
import type { Match, MatchScore, PickleballSideOutState } from '@/types/match';
import type { SportRulesEnvelope } from '@/types/tournament';
import { cn } from '@/utils/cn';

export interface ScoreDraft {
  sets: MatchScore[];
  sideOutState?: PickleballSideOutState;
  overrideEnabled?: boolean;
  overrideReason?: string;
  // Bóng đá: luân lưu phân định khi hòa ở knockout
  shootout?: {
    p1Goals: number;
    p2Goals: number;
    winnerId?: string | null;
  };
}

interface ScoringPanelProps {
  match: Match | null;
  scoreDraft: ScoreDraft;
  setScoreDraft: Dispatch<SetStateAction<ScoreDraft>>;
  tournamentSportRules?: SportRulesEnvelope | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

const applyQuickScoreTemplate = (
  currentSets: MatchScore[],
  index: number,
  winnerTeam: 1 | 2,
  winnerScore: number,
  loserScore: number,
): MatchScore[] =>
  currentSets.map((item, itemIndex) => {
    if (itemIndex !== index) {
      return item;
    }

    return winnerTeam === 1
      ? { ...item, team1Score: winnerScore, team2Score: loserScore, isFinished: true }
      : { ...item, team1Score: loserScore, team2Score: winnerScore, isFinished: true };
  });

export const buildScoreDraft = (
  match: Match,
  tournamentSportRules?: SportRulesEnvelope | null,
): ScoreDraft => {
  const resolvedRules = resolveMatchSportRules({
    matchConfig: match.matchConfig,
    tournament: { sportRules: tournamentSportRules },
  });
  const existingSets = extractMatchScores(match.scoreDetails);
  const seededSets = [...existingSets];
  const hasOpenSet = seededSets.some((set) => !set.isFinished);
  if (!hasOpenSet && match.status !== 'COMPLETED' && (resolvedRules.mode === 'LITE' || seededSets.length < resolvedRules.bestOf)) {
    seededSets.push({ team1Score: 0, team2Score: 0, isFinished: false });
  }
  if (seededSets.length === 0) {
    seededSets.push({ team1Score: 0, team2Score: 0, isFinished: false });
  }

  return {
    sets: seededSets,
    sideOutState:
      resolvedRules.kind === 'PICKLEBALL_SIDE_OUT'
        ? readSideOutState(match)
        : undefined,
    // Mỗi lần mở modal bắt đầu ở chế độ chuẩn; ngoại lệ cũ chỉ là lịch sử của set đã chốt.
    overrideEnabled: false,
    overrideReason: '',
  };
};

export function ScoringPanel({
  match,
  scoreDraft,
  setScoreDraft,
  tournamentSportRules,
  isSubmitting,
  onCancel,
  onSubmit,
}: ScoringPanelProps) {
  const translate = useTranslations('TournamentDetail');
  const scoringTranslate = useTranslations('OrganizerScoring');
  const team1Fallback = scoringTranslate('team1');
  const team2Fallback = scoringTranslate('team2');

  if (!match) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
        {scoringTranslate('noMatch')}
      </div>
    );
  }

  const resolvedRules = resolveMatchSportRules({
    matchConfig: match.matchConfig,
    tournament: { sportRules: tournamentSportRules },
  });
  const scorePresentation = getMatchScorePresentation(resolvedRules.kind, translate);
  const scoreGuidance = getScoreEntryGuidance(resolvedRules.kind, translate);
  const quickScoreTemplates = getQuickScoreTemplates(
    resolvedRules.kind,
    resolvedRules.pointsPerSet,
    resolvedRules.maxPoints,
    translate,
  );
  const sideOutState =
    resolvedRules.kind === 'PICKLEBALL_SIDE_OUT'
      ? scoreDraft.sideOutState ?? readSideOutState(match) ?? buildEmptySideOutState()
      : null;
  const servingTeamLabel =
    sideOutState?.servingTeam === 1
      ? match.participant1?.teamName || team1Fallback
      : sideOutState?.servingTeam === 2
        ? match.participant2?.teamName || team2Fallback
        : null;
  const activeSetIndex = scoreDraft.sets.findIndex((set) => !set.isFinished);
  const activeSet = activeSetIndex !== -1
    ? scoreDraft.sets[activeSetIndex]
    : scoreDraft.sets[scoreDraft.sets.length - 1] ?? { team1Score: 0, team2Score: 0, isFinished: false };
  const finishedSets = scoreDraft.sets.filter((set) => set.isFinished);
  const hasDrawnFinishedSet = finishedSets.some((set) => set.team1Score === set.team2Score);
  const p1Won = finishedSets.filter((set) => set.team1Score > set.team2Score).length;
  const p2Won = finishedSets.filter((set) => set.team2Score > set.team1Score).length;
  const hasEnteredScore = scoreDraft.sets.some((set) => set.team1Score !== 0 || set.team2Score !== 0);
  const isLiteMode = resolvedRules.mode === 'LITE';
  const overrideEnabled = scoreDraft.overrideEnabled === true || isLiteMode;
  const overrideReason = scoreDraft.overrideReason ?? '';
  const canSubmitWithOverride = !overrideEnabled || isLiteMode || overrideReason.trim().length > 0;
  const clampScore = (value: number) =>
    overrideEnabled
      ? Math.max(0, value)
      : Math.min(resolvedRules.maxPoints, Math.max(0, value));
  const scoreWarnings = getScoreRuleWarnings(scoreDraft.sets, resolvedRules, translate);
  const isFootball = resolvedRules.kind === 'FOOTBALL';
  // Football draws can be decided by a shootout when one has been entered.
  const hasShootout = isFootball && scoreDraft.shootout?.winnerId != null;
  const canSubmitScore = hasEnteredScore && (!hasDrawnFinishedSet || hasShootout) && (overrideEnabled || scoreWarnings.length === 0);
  const activeSetSummary = activeSet
    ? scoringTranslate('currentSummary', {
        label: scorePresentation.sequenceLabel.charAt(0).toUpperCase() + scorePresentation.sequenceLabel.slice(1),
        team1: activeSet.team1Score,
        team2: activeSet.team2Score,
        status: activeSet.isFinished
          ? scoringTranslate('finalizedSuffix')
          : scoringTranslate('openSuffix'),
      })
    : scoringTranslate('noOpenSequence', { label: scorePresentation.sequenceLabel });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
        {scoringTranslate('scoreHeader', {
          sport: scorePresentation.sportLabel,
          summary: scorePresentation.summaryLabel,
          points: resolvedRules.pointsPerSet,
        })}
        {resolvedRules.kind === 'TENNIS'
          ? scoringTranslate('tiebreakSuffix', { points: resolvedRules.tiebreakPoints })
          : ''}
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
        {activeSetSummary}
        <div className="mt-1 text-xs font-medium text-emerald-700">
          {scoringTranslate('oneOpenNotice', { label: scorePresentation.sequenceLabel })}
        </div>
      </div>
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
        {scoreGuidance.targetSummary}
        <div className="mt-1 text-xs font-semibold text-blue-700">
                  {scoringTranslate('validExamplePrefix')} {scoreGuidance.examples.join(' • ')}. {scoreGuidance.operatorHint}
        </div>
      </div>

      {!isLiteMode && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{scoringTranslate('refereeModeTitle')}</p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {overrideEnabled ? scoringTranslate('overrideEnabled') : scoringTranslate('defaultRules')}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {scoringTranslate('overrideDescription')}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setScoreDraft((current) => ({
                  ...current,
                  overrideEnabled: !(current.overrideEnabled === true),
                  overrideReason: current.overrideEnabled === true ? '' : current.overrideReason ?? '',
                }))
              }
              className={cn(
                'rounded-lg border px-4 py-2 text-xs font-bold transition-colors',
                overrideEnabled
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
              )}
            >
              {overrideEnabled ? scoringTranslate('disableOverride') : scoringTranslate('enableOverride')}
            </button>
          </div>

          {overrideEnabled && !isLiteMode ? (
            <div className="mt-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
                {scoringTranslate('overrideReasonRequired')}
              </label>
              <textarea
                value={overrideReason}
                onChange={(event) =>
                  setScoreDraft((current) => ({
                    ...current,
                    overrideReason: event.target.value,
                  }))
                }
                className="min-h-24 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                placeholder={scoringTranslate('overridePlaceholder')}
              />
              <p className="text-xs font-medium text-amber-700">
                {scoringTranslate('overrideAuditNotice')}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {isLiteMode && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
          {scoringTranslate('liteNotice')}
        </div>
      )}

      {sideOutState ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
          {servingTeamLabel
            ? scoringTranslate('servingNow', { team: servingTeamLabel, number: sideOutState.serverNumber })
            : scoringTranslate('sideOutNotSelected')}
        </div>
      ) : null}

      {sideOutState ? (
        <div className="grid gap-3 rounded-lg border border-blue-200 bg-white p-4 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-500">{scoringTranslate('sideOutControlsTitle')}</p>
            <p className="mt-2 text-sm font-bold text-slate-900">
              {sideOutState.servingTeam == null
                ? scoringTranslate('noServingTeam')
                : scoringTranslate('serveTurn', { number: sideOutState.serverNumber })}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {scoringTranslate('sideOutDescription')}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setScoreDraft((current) => ({
                    ...current,
                    sideOutState: setServingTeamSideOutState(
                      1,
                      current.sideOutState?.openingSequenceDone ?? false,
                    ),
                  }))
                }
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-bold transition-colors',
                  sideOutState.servingTeam === 1
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300',
                )}
              >
                {match.participant1?.teamName || team1Fallback} {scoringTranslate('serve')}
              </button>
              <button
                type="button"
                onClick={() =>
                  setScoreDraft((current) => ({
                    ...current,
                    sideOutState: setServingTeamSideOutState(
                      2,
                      current.sideOutState?.openingSequenceDone ?? false,
                    ),
                  }))
                }
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-bold transition-colors',
                  sideOutState.servingTeam === 2
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300',
                )}
              >
                {match.participant2?.teamName || team2Fallback} {scoringTranslate('serve')}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setScoreDraft((current) => ({
                    ...current,
                    sideOutState: current.sideOutState
                      ? { ...current.sideOutState, serverNumber: 1 }
                      : current.sideOutState,
                  }))
                }
                disabled={sideOutState.servingTeam == null}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {scoringTranslate('serveTurn', { number: 1 })}
              </button>
              <button
                type="button"
                onClick={() =>
                  setScoreDraft((current) => ({
                    ...current,
                    sideOutState: current.sideOutState
                      ? { ...current.sideOutState, serverNumber: 2, openingSequenceDone: true }
                      : current.sideOutState,
                  }))
                }
                disabled={sideOutState.servingTeam == null}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {scoringTranslate('serveTurn', { number: 2 })}
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                setScoreDraft((current) => ({
                  ...current,
                  sideOutState: current.sideOutState
                    ? computeNextSideOutState(current.sideOutState)
                    : current.sideOutState,
                }))
              }
              disabled={sideOutState.servingTeam == null}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-100 disabled:opacity-50"
            >
              {scoringTranslate('sideOutLoss')}
            </button>
          </div>
        </div>
      ) : null}

      {scoreWarnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          <p className="font-bold">{scoringTranslate('warningTitle')}</p>
          <div className="mt-2 space-y-1 text-xs font-semibold text-amber-800">
            {scoreWarnings.map((warning) => (
              <p key={warning.id}>- {warning.message}</p>
            ))}
          </div>
          {!overrideEnabled ? (
            <p className="mt-2 text-xs font-semibold text-amber-800">
              {scoringTranslate('warningOverrideHint')}
            </p>
          ) : null}
        </div>
      ) : null}

          <div className="grid gap-3">
        {scoreDraft.sets.map((set, index) => (
          <div
            key={`score-row-${index}`}
             className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_120px_120px] sm:p-4"
          >
            <div>
              <p className="text-sm font-bold text-slate-900">
                {scorePresentation.sequenceLabel.charAt(0).toUpperCase() + scorePresentation.sequenceLabel.slice(1)} {index + 1}
                {!set.isFinished && index === activeSetIndex ? (
                  <span className="ml-2 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">
                    {scoringTranslate('inProgress')}
                  </span>
                ) : null}
                {set.scoreOverride?.reason ? (
                  <span className="ml-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                    {scoringTranslate('override')}
                  </span>
                ) : set.isFinished ? (
                  <span className="ml-2 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">
                    {scoringTranslate('finalized')}
                  </span>
                ) : index === activeSetIndex ? (
                  <span className="ml-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                    {scoringTranslate('currentSequence', { label: scorePresentation.sequenceLabel })}
                  </span>
                ) : (
                  <span className="ml-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    {scoringTranslate('notStarted')}
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {scoringTranslate('sequenceDescription', { label: scorePresentation.sequenceLabel })}
              </p>
              {set.scoreOverride?.reason ? (
                <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800">
                  {scoringTranslate('overrideReasonPrefix')} {set.scoreOverride.reason}
                </p>
              ) : null}

              <div className="mt-3 grid gap-2">
                {quickScoreTemplates.map((template) => (
                  <div key={`${template.id}-${index}`} className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setScoreDraft((current) => ({
                          ...current,
                          sets: applyQuickScoreTemplate(current.sets, index, 1, template.winnerScore, template.loserScore),
                        }))
                      }
                      className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                    >
                      {match.participant1?.teamName || team1Fallback} {template.winnerScore}-{template.loserScore}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setScoreDraft((current) => ({
                          ...current,
                          sets: applyQuickScoreTemplate(current.sets, index, 2, template.winnerScore, template.loserScore),
                        }))
                      }
                      className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                    >
                      {match.participant2?.teamName || team2Fallback} {template.loserScore}-{template.winnerScore}
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setScoreDraft((current) => ({
                      ...current,
                      sets: current.sets.map((item, itemIndex) =>
                        itemIndex === index ? { team1Score: 0, team2Score: 0, isFinished: false } : item,
                      ),
                    }))
                  }
                  className="w-fit rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
                >
                  {scoringTranslate('clearQuickSequence', { label: scorePresentation.sequenceLabel })}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600">{match.participant1?.teamName || team1Fallback}</label>
                <input
                type="number"
                min={0}
                max={overrideEnabled ? undefined : resolvedRules.maxPoints}
                value={set.team1Score}
                onChange={(event) =>
                  setScoreDraft((current) => ({
                    ...current,
                    sets: current.sets.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            team1Score: clampScore(Number(event.target.value)),
                          }
                        : item,
                    ),
                  }))
                }
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600">{match.participant2?.teamName || team2Fallback}</label>
                <input
                type="number"
                min={0}
                max={overrideEnabled ? undefined : resolvedRules.maxPoints}
                value={set.team2Score}
                onChange={(event) =>
                  setScoreDraft((current) => ({
                    ...current,
                    sets: current.sets.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            team2Score: clampScore(Number(event.target.value)),
                          }
                        : item,
                    ),
                  }))
                }
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
        <div>
          {scorePresentation.wonSummaryLabel} {match.participant1?.teamName || team1Fallback}: <span className="font-bold">{p1Won}</span>
        </div>
        <div>
          {scorePresentation.wonSummaryLabel} {match.participant2?.teamName || team2Fallback}: <span className="font-bold">{p2Won}</span>
        </div>
      </div>

      {!canSubmitScore ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
              {finishedSets.length === 0
              ? hasEnteredScore
                ? scoringTranslate('currentSetDraw', {
                    team1: activeSet.team1Score,
                    team2: activeSet.team2Score,
                  })
                : scoringTranslate('noFinalizedSequence', { label: scorePresentation.sequenceLabel })
              : scoringTranslate('sequenceDraw', {
                  label: scorePresentation.sequenceLabel.charAt(0).toUpperCase() + scorePresentation.sequenceLabel.slice(1),
                })}
        </div>
      ) : null}
      {overrideEnabled && !canSubmitWithOverride ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
          {scoringTranslate('overrideReasonNeeded')}
        </div>
      ) : null}

      {isFootball && hasDrawnFinishedSet && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-bold text-amber-900">
            {scoringTranslate('shootoutTitle')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-amber-800">{match.participant1?.teamName || team1Fallback} ({scoringTranslate('shootoutLabel')})</label>
              <input
                type="number"
                min={0}
                value={scoreDraft.shootout?.p1Goals ?? 0}
                onChange={(e) =>
                  setScoreDraft((current) => ({
                    ...current,
                    shootout: {
                      ...(current.shootout ?? { p1Goals: 0, p2Goals: 0 }),
                      p1Goals: Number(e.target.value),
                    },
                  }))
                }
                className="h-10 w-full rounded-lg border border-amber-300 bg-white px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-amber-800">{match.participant2?.teamName || team2Fallback} ({scoringTranslate('shootoutLabel')})</label>
              <input
                type="number"
                min={0}
                value={scoreDraft.shootout?.p2Goals ?? 0}
                onChange={(e) =>
                  setScoreDraft((current) => ({
                    ...current,
                    shootout: {
                      ...(current.shootout ?? { p1Goals: 0, p2Goals: 0 }),
                      p2Goals: Number(e.target.value),
                    },
                  }))
                }
                className="h-10 w-full rounded-lg border border-amber-300 bg-white px-3 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={scoreDraft.shootout?.winnerId === match.participant1?.id ? 'default' : 'outline'}
              onClick={() =>
                setScoreDraft((current) => ({
                  ...current,
                  shootout: {
                    ...current.shootout,
                    p1Goals: current.shootout?.p1Goals ?? 0,
                    p2Goals: current.shootout?.p2Goals ?? 0,
                    winnerId: match.participant1?.id,
                  },
                }))
              }
              className="flex-1"
            >
              {match.participant1?.teamName || team1Fallback} {scoringTranslate('winsShootout')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={scoreDraft.shootout?.winnerId === match.participant2?.id ? 'default' : 'outline'}
              onClick={() =>
                setScoreDraft((current) => ({
                  ...current,
                  shootout: {
                    ...current.shootout,
                    p1Goals: current.shootout?.p1Goals ?? 0,
                    p2Goals: current.shootout?.p2Goals ?? 0,
                    winnerId: match.participant2?.id,
                  },
                }))
              }
              className="flex-1"
            >
              {match.participant2?.teamName || team2Fallback} {scoringTranslate('winsShootout')}
            </Button>
          </div>
        </div>
      )}

      <ModalFooter className="gap-2">
        <Button variant="outline" className="border-slate-200 text-slate-700" onClick={onCancel}>
          {scoringTranslate('cancel')}
        </Button>
        <Button
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={onSubmit}
          disabled={!canSubmitScore || !canSubmitWithOverride || isSubmitting}
        >
          {scoringTranslate('saveScore')}
        </Button>
      </ModalFooter>
    </div>
  );
}
