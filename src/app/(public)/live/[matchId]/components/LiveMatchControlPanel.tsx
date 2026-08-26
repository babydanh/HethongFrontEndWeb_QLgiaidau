'use client';

import type { SportRuleKind } from '@/types/tournament';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Check, Play, Trophy } from 'lucide-react';
import { formatTennisPointDisplay } from '@/features/matches/live-score-state';
import type {
  Match,
  MatchPenaltyRecord,
  MatchScore,
  PickleballSideOutState,
  TennisLivePointState,
} from '@/types/match';
import { cn } from '@/utils/cn';
import { getMatchScorePresentation } from '@/features/matches/score-display';
import type { ScoreEntryGuidance } from '@/features/tournaments/sport-rules/ui-guidance';
import type { ScoreRuleWarning } from '@/features/matches/score-rule-warnings';
import { TennisOfficialPanel } from './TennisOfficialPanel';
import { PickleballOfficialPanel } from './PickleballOfficialPanel';
import { BadmintonOfficialPanel } from './BadmintonOfficialPanel';
import { TableTennisOfficialPanel } from './TableTennisOfficialPanel';
import { PenaltyPanel } from './PenaltyPanel';
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FootballOfficialPanel } from './FootballOfficialPanel';
import type { FootballEventType, FootballMatchPhase, FootballScoreState } from '@/features/matches/football-score';

export interface LiveMatchControlPanelProps {
  canControlLiveMatch: boolean;
  isSubmitting: boolean;
  match: Match;
  team1Name: string;
  team2Name: string;
  currentSet: MatchScore;
  scores: MatchScore[];
  activeSetIndex: number;
  scorePresentation: ReturnType<typeof getMatchScorePresentation>;
  scoreGuidance: ScoreEntryGuidance;
  sportKind: SportRuleKind;
  isPickleballSideOut: boolean;
  sideOutState: PickleballSideOutState;
  isTennis: boolean;
  tennisPointState: TennisLivePointState | null;
  penalties: MatchPenaltyRecord[];
  scoreWarnings: ScoreRuleWarning[];
  isLiteMatch: boolean;
  isSingleSetMatch: boolean;
  overrideEnabled: boolean;
  overrideReason: string;
  onOverrideEnabledChange: (enabled: boolean) => void;
  onOverrideReasonChange: (value: string) => void;
  onStartMatch: () => void;
  onUpdatePoints: (team: 1 | 2, action: 'inc' | 'dec') => void;
  onFinishSet: () => void;
  onCompleteMatch: (winnerTeam: 1 | 2) => void;
  onSetServingTeam: (team: 1 | 2) => void;
  onSideOut: () => void;
  onAddPenalty: (team: 1 | 2 | null, kind: string, label: string, note?: string) => void;
  isFootball?: boolean;
  shootoutGoals?: { p1Goals: number; p2Goals: number };
  onShootoutGoalsChange?: (goals: { p1Goals: number; p2Goals: number }) => void;
  footballScore?: FootballScoreState;
  onFootballGoal?: (team: 1 | 2) => void;
  onFootballUndoGoal?: (team: 1 | 2) => void;
  onFootballPhaseChange?: (phase: FootballMatchPhase) => void;
  onFootballEvent?: (type: FootballEventType, team: 1 | 2) => void;
  onFootballMinuteChange?: (minute: number) => void;
  onFootballAddedMinuteChange?: (addedMinute: number) => void;
}

export function LiveMatchControlPanel({
  canControlLiveMatch,
  isSubmitting,
  match,
  team1Name,
  team2Name,
  currentSet,
  scores,
  activeSetIndex,
  scorePresentation,
  scoreGuidance: _scoreGuidance,
  sportKind,
  isPickleballSideOut,
  sideOutState,
  isTennis,
  tennisPointState,
  penalties,
  scoreWarnings,
  isLiteMatch,
  isSingleSetMatch,
  overrideEnabled,
  overrideReason,
  onOverrideEnabledChange,
  onOverrideReasonChange,
  onStartMatch,
  onUpdatePoints,
  onFinishSet,
  onCompleteMatch,
  onSetServingTeam,
  onSideOut,
  onAddPenalty,
  isFootball = false,
  shootoutGoals = { p1Goals: 0, p2Goals: 0 },
  onShootoutGoalsChange,
  footballScore,
  onFootballGoal,
  onFootballUndoGoal,
  onFootballPhaseChange,
  onFootballEvent,
  onFootballMinuteChange,
  onFootballAddedMinuteChange,
}: LiveMatchControlPanelProps) {
  const translate = useTranslations('Common');
  const [confirmWinner, setConfirmWinner] = useState<1 | 2 | null>(null);
  const [confirmFinishSequence, setConfirmFinishSequence] = useState(false);
  const [activeTab, setActiveTab] = useState<'score' | 'penalty'>('score');

  const handleCompleteMatch = (team: 1 | 2) => {
    setConfirmWinner(team);
  };

  if (!canControlLiveMatch) {
    return null;
  }

  const servingTeamName =
    sideOutState.servingTeam === 1
      ? team1Name
      : sideOutState.servingTeam === 2
        ? team2Name
        : translate('unknownTeam');
  const currentPointTeam1 = tennisPointState ? formatTennisPointDisplay(tennisPointState.team1Point) : String(currentSet.team1Score);
  const currentPointTeam2 = tennisPointState ? formatTennisPointDisplay(tennisPointState.team2Point) : String(currentSet.team2Score);
  const isBadminton = sportKind === 'BADMINTON';
  const isTableTennis = sportKind === 'TABLE_TENNIS';

  return (
    <div className="flex flex-col flex-1 min-h-full justify-between space-y-4">
      {/* Top Controls: Tabs & Set Progress */}
      <div className="space-y-3">
        {/* Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('score')}
            className={cn(
              'flex-1 rounded-lg py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer',
              activeTab === 'score' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {translate("scoreAction")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('penalty')}
            className={cn(
              'flex-1 rounded-lg py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer',
              activeTab === 'penalty' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {translate("foulAction")}
          </button>
        </div>

        {activeTab === 'penalty' ? null : (
          <>
            {isPickleballSideOut ? (
              <PickleballOfficialPanel
                team1Name={team1Name}
                team2Name={team2Name}
                servingTeamName={servingTeamName}
                serverNumber={sideOutState.serverNumber}
                isSubmitting={isSubmitting}
                servingTeam={sideOutState.servingTeam}
                onSetServingTeam={onSetServingTeam}
                onSideOut={onSideOut}
              />
            ) : null}

            {!isFootball && !isLiteMatch && scoreWarnings.length > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900">
                <span className="font-bold">⚠️ {translate("ruleWarning")}</span>
                <div className="mt-1 space-y-0.5">
                  {scoreWarnings.map((warning) => (
                    <p key={warning.id}>• {warning.message}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Set Progress Header */}
            {!isFootball ? (
              <div className="rounded-xl bg-white p-3 shadow-xs border border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{translate("setProgressTitle")}:</span>
                    <span className="text-sm font-black text-slate-900">
                      Set {activeSetIndex + 1} ({currentSet.team1Score} - {currentSet.team2Score})
                    </span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {scores.map((set, index) => (
                      <span
                        key={`set-pill-${index}`}
                        className={cn(
                          'rounded-lg px-2.5 py-1 text-xs font-extrabold tabular-nums',
                          index === activeSetIndex && !set.isFinished
                            ? 'bg-blue-600 text-white shadow-xs'
                            : set.isFinished
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-slate-50 text-slate-400',
                        )}
                      >
                        Set {index + 1}: {set.team1Score}-{set.team2Score}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {!isFootball && !isLiteMatch ? (
              <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-xs">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{translate("refereeMode")}: </span>
                    <span className="text-xs font-bold text-slate-900">
                      {overrideEnabled ? translate('overrideEnabledLabel') : translate('defaultRulesLabel')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOverrideEnabledChange(!overrideEnabled)}
                    className={cn(
                      'rounded-lg px-3 py-1 text-xs font-bold transition-colors cursor-pointer',
                      overrideEnabled
                        ? 'bg-amber-500 text-white'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100',
                    )}
                  >
                    {overrideEnabled ? translate('overrideToggleOn') : translate('overrideToggleOff')}
                  </button>
                </div>

                {overrideEnabled ? (
                  <div className="mt-2.5 space-y-1">
                    <label className="text-[11px] font-bold uppercase text-amber-800">
                      {translate('overrideReasonRequired')}
                    </label>
                    <input
                      type="text"
                      value={overrideReason}
                      onChange={(event) => onOverrideReasonChange(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder={translate('overrideReasonPlaceholder')}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Middle Scoring Section - Expands Vertically to Fill Height */}
      {activeTab === 'penalty' ? (
        <div className="flex-1 flex flex-col justify-center">
          <PenaltyPanel
            team1Name={team1Name}
            team2Name={team2Name}
            sportKind={sportKind}
            penalties={penalties}
            isSubmitting={isSubmitting}
            onAddPenalty={onAddPenalty}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between rounded-2xl bg-white p-4 sm:p-5 shadow-xs min-h-0 space-y-4">
          {match.status === 'SCHEDULED' ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-slate-50 p-8 text-center min-h-[240px]">
              <AlertCircle className="mb-2 h-14 w-14 text-blue-500" />
              <h4 className="mb-1 text-lg font-bold text-slate-800">{translate('scheduledTitle')}</h4>
              {!match.participant1Id || !match.participant2Id ? (
                <p className="mt-2 text-sm font-bold text-blue-600">
                  {translate('waitingForParticipants')}
                </p>
              ) : (
                <button
                  onClick={onStartMatch}
                  disabled={isSubmitting}
                  className="mt-5 flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-3.5 text-base font-extrabold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Play className="h-5 w-5 fill-current" /> {translate('startMatch')}
                </button>
              )}
            </div>
          ) : null}

          {match.status === 'ONGOING' ? (
            <div className="flex flex-1 flex-col justify-between space-y-5 min-h-0">
              {/* Main Score Area */}
              <div className="flex-1 flex flex-col justify-center min-h-0">
                {isFootball && footballScore && onFootballGoal && onFootballUndoGoal && onFootballPhaseChange && onFootballEvent && onFootballMinuteChange && onFootballAddedMinuteChange ? (
                  <FootballOfficialPanel
                    team1Name={team1Name}
                    team2Name={team2Name}
                    score={footballScore}
                    isSubmitting={isSubmitting}
                    onGoal={onFootballGoal}
                    onUndoGoal={onFootballUndoGoal}
                    onPhaseChange={onFootballPhaseChange}
                    onEvent={onFootballEvent}
                    onMinuteChange={onFootballMinuteChange}
                    onAddedMinuteChange={onFootballAddedMinuteChange}
                  />
                ) : isTennis ? (
                  <TennisOfficialPanel
                    match={match}
                    team1Name={team1Name}
                    team2Name={team2Name}
                    currentSet={currentSet}
                    currentPointTeam1={currentPointTeam1}
                    currentPointTeam2={currentPointTeam2}
                    tennisPointState={tennisPointState}
                    isSubmitting={false}
                    onUpdatePoints={onUpdatePoints}
                  />
                ) : isBadminton ? (
                  <BadmintonOfficialPanel
                    team1Name={team1Name}
                    team2Name={team2Name}
                    currentPointTeam1={currentPointTeam1}
                    currentPointTeam2={currentPointTeam2}
                    isSubmitting={false}
                    onUpdatePoints={onUpdatePoints}
                  />
                ) : isTableTennis ? (
                  <TableTennisOfficialPanel
                    team1Name={team1Name}
                    team2Name={team2Name}
                    currentPointTeam1={currentPointTeam1}
                    currentPointTeam2={currentPointTeam2}
                    isSubmitting={false}
                    onUpdatePoints={onUpdatePoints}
                  />
                ) : (
                  <BadmintonOfficialPanel
                    team1Name={team1Name}
                    team2Name={team2Name}
                    currentPointTeam1={currentPointTeam1}
                    currentPointTeam2={currentPointTeam2}
                    isSubmitting={false}
                    onUpdatePoints={onUpdatePoints}
                  />
                )}
              </div>

              {/* Bottom Action Buttons: Big, Prominent, Clear */}
              <div className="pt-3 border-t border-slate-100">
                {isSingleSetMatch && !isFootball ? (
                  <p className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold leading-relaxed text-blue-800">
                    {translate(isLiteMatch ? 'singleSetMatchHint' : 'strictSingleSetMatchHint')}
                  </p>
                ) : null}
                {isFootball ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleCompleteMatch(1)}
                      disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-5 text-sm sm:text-base font-black text-white shadow-md transition-all hover:bg-emerald-700 active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      <Trophy className="h-5 w-5" /> {team1Name} thắng
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCompleteMatch(2)}
                      disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-5 text-sm sm:text-base font-black text-white shadow-md transition-all hover:bg-emerald-700 active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      <Trophy className="h-5 w-5" /> {team2Name} thắng
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {(!isSingleSetMatch || !isLiteMatch) ? (
                      <button
                        type="button"
                        onClick={() => setConfirmFinishSequence(true)}
                        disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 px-5 text-sm sm:text-base font-black text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-98 disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="h-5 w-5 stroke-[2.5]" /> {translate('finishCurrentSet')}
                      </button>
                    ) : null}

                    <div className={cn('flex flex-1 gap-2.5', isSingleSetMatch && 'w-full')}>
                      <button
                        type="button"
                        onClick={() => handleCompleteMatch(1)}
                        disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3.5 px-3 text-xs sm:text-sm font-black text-white shadow-md transition-all hover:bg-emerald-700 active:scale-98 disabled:opacity-50 cursor-pointer"
                      >
                        <Trophy className="h-4 w-4 shrink-0" /> <span className="truncate">{team1Name} thắng</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCompleteMatch(2)}
                        disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3.5 px-3 text-xs sm:text-sm font-black text-white shadow-md transition-all hover:bg-emerald-700 active:scale-98 disabled:opacity-50 cursor-pointer"
                      >
                        <Trophy className="h-4 w-4 shrink-0" /> <span className="truncate">{team2Name} thắng</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {match.status === 'COMPLETED' ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-slate-50 p-8 text-center min-h-[200px]">
              <Trophy className="mb-2 h-14 w-14 text-blue-500" />
              <h4 className="mb-1 text-lg font-extrabold text-slate-800">{translate('completedTitle')}</h4>
              <p className="text-sm font-semibold text-slate-600">
                {translate('winnerLabel')}:{' '}
                <span className="font-bold text-blue-600">
                  {match.winnerId === match.participant1Id ? team1Name : team2Name}
                </span>
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Mini Winner Confirm Modal */}
      <Modal open={confirmWinner !== null} onOpenChange={(open) => !open && setConfirmWinner(null)}>
        <ModalContent className="max-w-sm rounded-2xl border-0 bg-white p-5 shadow-2xl">
          <ModalHeader className="text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <ModalTitle className="text-base font-extrabold text-slate-900">
                  Xác nhận chốt thắng trận
                </ModalTitle>
                <ModalDescription className="mt-0.5 text-xs font-semibold text-slate-500">
                  Trao chiến thắng cho: <span className="font-bold text-slate-900">{confirmWinner === 1 ? team1Name : team2Name}</span>
                </ModalDescription>
              </div>
            </div>
          </ModalHeader>

          {isFootball && (
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-800 truncate block">{team1Name}</label>
                <input
                  type="number"
                  min={0}
                  value={shootoutGoals.p1Goals}
                  onChange={(e) => onShootoutGoalsChange?.({ ...shootoutGoals, p1Goals: Number(e.target.value) })}
                  className="h-9 w-full rounded-lg border border-emerald-300 bg-white px-2.5 text-sm font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-800 truncate block">{team2Name}</label>
                <input
                  type="number"
                  min={0}
                  value={shootoutGoals.p2Goals}
                  onChange={(e) => onShootoutGoalsChange?.({ ...shootoutGoals, p2Goals: Number(e.target.value) })}
                  className="h-9 w-full rounded-lg border border-emerald-300 bg-white px-2.5 text-sm font-bold"
                />
              </div>
            </div>
          )}

          <ModalFooter className="mt-5 flex flex-row justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-700 text-xs font-bold px-4 py-2"
              onClick={() => setConfirmWinner(null)}
            >
              {translate('cancelActionShort')}
            </Button>
            <Button
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-2"
              onClick={() => {
                if (confirmWinner) {
                  onCompleteMatch(confirmWinner);
                }
                setConfirmWinner(null);
              }}
            >
              Chốt thắng
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Mini Finish Set Modal */}
      <Modal
        open={confirmFinishSequence}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setConfirmFinishSequence(false);
          }
        }}
      >
        <ModalContent className="max-w-sm rounded-2xl border-0 bg-white p-5 shadow-2xl">
          <ModalHeader className="text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Check className="h-5 w-5" />
              </div>
              <div>
                  <ModalTitle className="text-base font-extrabold text-slate-900">
                    {translate('finishCurrentSet')}
                  </ModalTitle>
                  <ModalDescription className="mt-0.5 text-xs font-semibold text-slate-500">
                    {translate('saveCurrentSetScore', {
                      set: activeSetIndex + 1,
                      score1: currentSet.team1Score,
                      score2: currentSet.team2Score,
                    })}
                  </ModalDescription>
              </div>
            </div>
          </ModalHeader>

          <ModalFooter className="mt-5 flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-700 text-xs font-bold px-4 py-2"
              disabled={isSubmitting}
              onClick={() => setConfirmFinishSequence(false)}
            >
              {translate('cancelActionShort')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="default"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="bg-blue-600 font-extrabold text-white hover:bg-blue-700 text-xs px-4 py-2"
              onClick={() => {
                setConfirmFinishSequence(false);
                onFinishSet();
              }}
            >
              {translate('confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
