/**
 * RoundRobinView — standings table + per-round match columns
 *
 * Shows a compact ranked table with all key stats, a tooltip explaining
 * the full tiebreaker chain, and a horizontal scroll of round-by-round
 * matches with schedule / venue details.
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Trophy,
  Play,
  Clock,
  Info,
  AlertTriangle,
  HelpCircle,
  X,
  CheckCircle2,
} from 'lucide-react';
import type { BracketMatch } from '@/features/tournaments/api';
import type { SportRuleKind, StageRoundConfig } from '@/types/tournament';
import { tournamentsApi } from '@/features/tournaments/api';
import { formatDateTime } from '@/utils/format';
import { getErrorMessage } from '@/utils/error';
import { calculateStandings, getConfiguredStandingsScoring, getFootballForm } from './helpers';
import type { OnScheduleMatch, OnSelectBracketMatch } from './types';
import { getBracketStatLabels, resolveBracketMatchRules } from './sportRuleDisplay';
import ParticipantIdentity from '@/components/ui/ParticipantIdentity';
import toast from 'react-hot-toast';

interface Props {
  matches: BracketMatch[];
  tiebreakerMode?: 'split' | 'playoff';
  onScheduleMatch?: OnScheduleMatch;
  selectedMatchId?: string | null;
  onSelectMatch?: OnSelectBracketMatch;
  tournamentId?: string;
  stageId?: string;
  fallbackSportRuleKind?: SportRuleKind;
  roundConfig?: StageRoundConfig | null;
  hideStandings?: boolean;
    /** The selected leg. Internal scheduler rounds are intentionally not exposed here. */
  activeLeg?: number;

}

export function RoundRobinView({
  matches,
  tiebreakerMode = 'split',
  onScheduleMatch,
  selectedMatchId,
  onSelectMatch,
  tournamentId,
  stageId,
  fallbackSportRuleKind,
  roundConfig,
  hideStandings = false,
  activeLeg = 1,
}: Props) {
  const translate = useTranslations('TournamentDetail');
  const sampleMatch = matches.find((match) => !match.isBye) ?? matches[0];
  const effectiveRuleKind = sampleMatch
    ? resolveBracketMatchRules(sampleMatch, fallbackSportRuleKind).kind
    : (fallbackSportRuleKind ?? 'BADMINTON');
  const statLabels = getBracketStatLabels(effectiveRuleKind, translate);
  const isFootball = effectiveRuleKind === 'FOOTBALL' || Boolean(sampleMatch?.scoreDetails?.football);
  const configuredScoring = getConfiguredStandingsScoring(roundConfig as Record<string, unknown> | null | undefined);
  const { standings, ties } = calculateStandings(matches, {
    tiebreakerMode,
    football: isFootball,
    scoring: configuredScoring,
  });
  const tieSet = new Set(ties.flatMap((g) => g.map((r) => r.participantId)));
  const allDone = matches.length > 0 && matches.filter((m) => !m.isBye).every((m) => m.status === 'COMPLETED');
  const hasTies = ties.length > 0;
  const [showInfo, setShowInfo] = useState(false);

  const teamsAdvancing = (() => {
    if (!roundConfig) return 0;
    if (roundConfig.advance_count && Number(roundConfig.advance_count) > 0) {
      return Number(roundConfig.advance_count);
    }
    const advanceConfig = (roundConfig as Record<string, unknown>)?.advanceConfig as { teamsAdvancing?: number } | undefined;
    return advanceConfig?.teamsAdvancing ?? 0;
  })();

  const scheduleMatches = matches.filter((match) => !match.isBye);


  return (
    <div className="flex flex-col gap-8">
      {!hideStandings && (
      <div>
        <h5 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-blue-500" /> {translate("standingsTitle")}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 hover:bg-slate-400 text-white transition-colors cursor-pointer flex-shrink-0"
            title={translate("standingsInfoTitle")}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </h5>

        {showInfo && (
          <div className="relative mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 pr-8 text-xs text-blue-900 leading-relaxed">
            <button
              onClick={() => setShowInfo(false)}
              className="absolute top-2 right-2 text-blue-400 hover:text-blue-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <p className="font-bold mb-1.5">{translate("standingsHowItWorks")}:</p>
            {isFootball ? (
              <ol className="list-decimal list-inside space-y-1 text-blue-800 font-medium">
                <li>{translate('footballPointsRule')}</li>
                <li>{translate('footballGoalDifferenceRule')}</li>
                <li>{translate('footballGoalsForRule')}</li>
                <li>{translate('footballHeadToHeadRule')}</li>
                <li>{translate('footballFairPlayRule')}</li>
                <li>{translate('footballWinsRule')}</li>
                <li>{tiebreakerMode === 'playoff' ? translate('footballPlayoffRule') : translate('footballSplitRule')}</li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-1 text-blue-800 font-medium">
                <li>{translate('standingsPointsRule')}</li>
                <li>{translate('standingsHeadToHeadRule')}</li>
                <li>{translate('standingsHeadToHeadSetDifferenceRule')}</li>
                <li>{translate('standingsHeadToHeadStatRule', { label: statLabels.aggregateDiffLabel, example: statLabels.aggregateExample })}</li>
                <li>{translate('standingsSetDifferenceRule')}</li>
                <li>{translate('standingsAggregateDifferenceRule', { difference: statLabels.aggregateDiffLabel, aggregate: statLabels.aggregateLabel })}</li>
                <li>{tiebreakerMode === 'playoff' ? translate('standingsPlayoffRule') : translate('standingsSplitRule')}</li>
              </ol>
            )}
            <p className="mt-2 pt-2 border-t border-blue-200 text-blue-700">
              {translate('differenceFormula', { aggregate: statLabels.aggregateLabel })}<br />
              <span className="text-blue-600">{statLabels.aggregateExample}</span>
            </p>
          </div>
        )}
 
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
              <tr>
                <th className="px-3 py-3 text-center w-10">#</th>
                <th className="px-3 py-3 text-left min-w-[130px]">{translate("teamHeader")}</th>
                <th className="px-3 py-3 text-center w-12">MP</th>
                {isFootball ? (
                  <>
                    <th className="px-3 py-3 text-center text-blue-600 w-9">W</th>
                    <th className="px-3 py-3 text-center text-amber-600 w-9">D</th>
                    <th className="px-3 py-3 text-center text-rose-500 w-9">L</th>
                    <th className="px-3 py-3 text-center w-12">GF</th>
                    <th className="px-3 py-3 text-center w-12">GA</th>
                    <th className="px-3 py-3 text-center min-w-[58px]">GD</th>
                    <th className="px-3 py-3 text-center text-blue-600 bg-blue-50/50 w-14">Pts</th>
                    <th className="px-3 py-3 text-center min-w-[92px]">Last 5</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-3 text-center text-blue-600 w-9">T</th>
                    <th className="px-3 py-3 text-center text-rose-500 w-9">B</th>
                    <th className="px-3 py-3 text-center text-blue-600 bg-blue-50/50 w-14">{translate('pointsColumn')}</th>
                    <th className="px-3 py-3 text-center min-w-[80px]">{translate('differenceColumn')}</th>
                  </>
                )}
                <th className="px-3 py-3 text-center w-10" />
              </tr>
            </thead>
            <tbody>
              {standings.map((row, idx) => {
                const isTied = tieSet.has(row.participantId);
                return (
                  <tr
                    key={row.participantId}
                    className={
                      'border-b border-slate-100 last:border-0 transition-colors ' +
                      (isTied
                        ? 'bg-amber-50/60 hover:bg-amber-50'
                        : idx === 0 && allDone && !hasTies
                          ? 'bg-amber-50/80 hover:bg-amber-100'
                          : 'hover:bg-slate-50/60')
                    }
                  >
                    <td className="px-3 py-3 text-center">
                      {isTied ? (
                        <span className="text-blue-500 font-bold text-xs">?</span>
                      ) : idx === 0 && allDone && !hasTies ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-amber-400 rounded-full ring-2 ring-amber-300 shadow-lg shadow-amber-200">
                           <Trophy className="w-4 h-4 text-white fill-white" />
                        </span>
                      ) : idx === 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-100 rounded-full">
                          <Trophy className="w-3.5 h-3.5 text-blue-500" />
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold text-xs">
                          {idx + 1}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        {row.seed != null && (
                          <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded font-bold leading-4">
                            #{row.seed}
                          </span>
                        )}
                        {row.teamName}
                        {teamsAdvancing > 0 && idx < teamsAdvancing && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {translate('advancesBadge')}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-500 font-medium">
                      {row.played}
                    </td>
                    {isFootball ? (
                      <>
                        <td className="px-3 py-3 text-center font-bold text-blue-600">{row.won}</td>
                        <td className="px-3 py-3 text-center font-bold text-amber-600">{row.draws}</td>
                        <td className="px-3 py-3 text-center font-bold text-rose-400">{row.lost}</td>
                        <td className="px-3 py-3 text-center font-medium">{row.pointsFor}</td>
                        <td className="px-3 py-3 text-center font-medium">{row.pointsAgainst}</td>
                        <td className={'px-3 py-3 text-center font-semibold ' + (row.pointsFor - row.pointsAgainst > 0 ? 'text-blue-600' : row.pointsFor - row.pointsAgainst < 0 ? 'text-rose-500' : 'text-slate-500')}>
                          {row.pointsFor - row.pointsAgainst >= 0 ? '+' : ''}{row.pointsFor - row.pointsAgainst}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-blue-700 bg-blue-50/20">{row.points}</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center justify-center gap-1">
                            {getFootballForm(matches, row.participantId).map((result, formIndex) => (
                              <span
                                key={`${row.participantId}-${formIndex}`}
                                title={result === 'W' ? translate('win') : result === 'D' ? translate('draw') : translate('loss')}
                                className={'inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ' + (result === 'W' ? 'bg-emerald-500' : result === 'D' ? 'bg-slate-400' : 'bg-rose-500')}
                              >
                                {result}
                              </span>
                            ))}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-3 text-center font-bold text-blue-600">{row.won}</td>
                        <td className="px-3 py-3 text-center font-bold text-rose-400">{row.lost}</td>
                        <td className="px-3 py-3 text-center font-bold text-blue-700 bg-blue-50/20">{row.points}</td>
                        <td className={'px-3 py-3 text-center font-semibold ' + (row.pointsFor - row.pointsAgainst > 0 ? 'text-blue-600' : row.pointsFor - row.pointsAgainst < 0 ? 'text-rose-500' : 'text-slate-500')}>
                          {row.pointsFor - row.pointsAgainst >= 0 ? '+' : ''}{row.pointsFor - row.pointsAgainst}
                        </td>
                      </>
                    )}
                    <td className="px-3 py-3 text-center">
                      {isTied &&
                        (tiebreakerMode === 'playoff' ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {translate('playoffTieLabel')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            {translate('tiedLabel')}
                          </span>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
 
        {ties.length > 0 && tiebreakerMode === 'playoff' && tournamentId && stageId && (
          <div className="mt-2 text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{translate('pointsTiedLabel')}:</span>
            {ties.map((group, gi) => (
              <div key={gi} className="inline-flex items-center gap-1.5">
                {group.map((row) => (
                  <span key={row.participantId} className="font-medium text-slate-600">{row.teamName}</span>
                ))}
                {group.length === 2 && (
                  <>
                    <button onClick={async () => {
                      const t = toast.loading(translate('creatingPlayoff'));
                      try {
                        await tournamentsApi.createPlayoffMatch(tournamentId!, {
                          stageId: stageId!,
                          participant1Id: group[0].participantId,
                          participant2Id: group[1].participantId,
                        });
                        toast.success(translate('playoffCreated'), { id: t });
                        setTimeout(() => window.location.reload(), 1500);
                      } catch (err) { toast.error(getErrorMessage(err), { id: t }); }
                    }} className="text-blue-500 hover:text-blue-700 hover:underline cursor-pointer">+ {translate('createPlayoff')}</button>
                    <button onClick={async () => {
                      if (!confirm(translate('earlyFinishConfirm'))) return;
                      const t = toast.loading(translate('endingStage'));
                      try {
                        await tournamentsApi.finalizeStage(tournamentId!, stageId!);
                        toast.success(translate('stageFinished'), { id: t });
                        setTimeout(() => window.location.reload(), 1500);
                      } catch (err) { toast.error(getErrorMessage(err), { id: t }); }
                    }} className="text-slate-300 hover:text-slate-500 cursor-pointer">({translate('skipShort')})</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Luon hien nut ket thuc som */}
        {tournamentId && stageId && (
          <div className="mt-2 flex justify-end">
            <button onClick={async () => {
              if (!confirm(translate('earlyFinishStageConfirm'))) return;
              const t = toast.loading(translate('endingStage'));
              try {
                await tournamentsApi.finalizeStage(tournamentId!, stageId!);
                toast.success(translate('stageFinished'), { id: t });
                setTimeout(() => window.location.reload(), 1500);
              } catch (err) { toast.error(getErrorMessage(err), { id: t }); }
            }} className="text-[10px] text-slate-400 hover:text-slate-600 underline underline-offset-2 cursor-pointer">
              {translate('finishStageAndCancelRemaining')}
            </button>
          </div>
        )}
      </div>
      )}      {/* All pairings for the selected leg are shown together. */}
      <div>
        <h5 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" /> {translate('matchSchedule')}
          <span className="text-[10px] text-slate-400 font-semibold normal-case">
            ({translate('matchCount', { count: matches.filter(m => !m.isBye).length })})
          </span>
        </h5>

        {scheduleMatches.length === 0 ? (
          <div className="w-full text-center py-10 text-slate-400 italic text-sm border border-dashed border-slate-200 rounded-lg">
            {translate("noMatches")}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {scheduleMatches.length > 0 && (
              <div key="selected-leg-schedule" className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 bg-slate-200/80 px-2.5 py-1 rounded-md">
                      {activeLeg ? translate('legLabel', { number: activeLeg }) : translate('matchSchedule')}
                    </span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="w-full bg-slate-50/60 rounded-lg border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {scheduleMatches
                      .sort((a, b) => a.matchOrder - b.matchOrder)
                      .map((m) => {
                        const done = m.status === 'COMPLETED';
                        const live = m.status === 'ONGOING';
                        return (
                          <div
                            key={m.id}
                            data-bracket-match-id={m.id}
                            onClick={() => onSelectMatch?.(m)}
                            className={
                              'flex min-h-[148px] cursor-pointer flex-col rounded-lg border p-3.5 text-xs font-semibold shadow-sm transition-all ' +
                              (selectedMatchId === m.id
                                ? 'border-amber-400 ring-4 ring-amber-100 bg-amber-50/60'
                                : live
                                  ? 'border-blue-300 bg-blue-50/50'
                                  : done
                                    ? 'border-emerald-100 bg-emerald-50/20'
                                    : 'border-slate-200/80 bg-white')
                            }
                          >
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                                {translate('matchNumber', { number: m.matchOrder })}
                              </span>
                              {live && (
                                <span className="flex items-center gap-0.5 text-[8px] font-bold text-blue-600 animate-pulse">
                                  <Play className="w-2 h-2 fill-blue-600" /> {translate('liveLabel')}
                                </span>
                              )}
                            </div>
                            <div className="space-y-2.5">
                              <div className="flex min-h-[34px] items-center justify-between gap-2">
                                <ParticipantIdentity
                                  participant={m.participant1}
                                  fallback={translate('pendingParticipant')}
                                  compact
                                />
                                <span className={'shrink-0 font-bold text-xs ' + (m.winnerId === m.participant1?.id ? 'text-emerald-700' : 'text-slate-400')}>
                                  {done || live ? m.p1SetsWon : '-'}
                                </span>
                              </div>
                              <div className="flex min-h-[34px] items-center justify-between gap-2">
                                <ParticipantIdentity
                                  participant={m.participant2}
                                  fallback={translate('pendingParticipant')}
                                  compact
                                />
                                <span className={'shrink-0 font-bold text-xs ' + (m.winnerId === m.participant2?.id ? 'text-emerald-700' : 'text-slate-400')}>
                                  {done || live ? m.p2SetsWon : '-'}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2.5 pt-2.5 border-t border-slate-200 flex flex-1 flex-col justify-end gap-1.5">
                              <div className="flex items-center gap-1 text-[8px] text-slate-400 font-bold">
                                <Clock className="w-2 h-2 flex-shrink-0" />
                                <span className="truncate">{m.scheduledAt ? formatDateTime(m.scheduledAt) : translate('schedulePending')}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[8px] text-slate-400 font-bold">
                                <Info className="w-2 h-2 flex-shrink-0" />
                                <span className="truncate">
                                  {m.courtName || m.tournament?.venueName ? (m.courtName || m.tournament?.venueName) + (m.courtAddress ? ' (' + m.courtAddress + ')' : '') : translate('unscheduledCourt')}
                                </span>
                              </div>
                              {onScheduleMatch && !done && m.participant1 && m.participant2 && (
                                <button onClick={() => onScheduleMatch(m)} className="mt-1 w-full text-[8px] font-bold text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 rounded-lg py-1 transition-colors cursor-pointer">
                                  {translate("scheduleVenueTime")}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
