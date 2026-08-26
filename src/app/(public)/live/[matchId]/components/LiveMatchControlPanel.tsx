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
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('score')}
          className={cn(
            'flex-1 rounded-lg py-2 text-xs sm:text-sm font-bold transition-all',
            activeTab === 'score' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {translate("scoreAction")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('penalty')}
          className={cn(
            'flex-1 rounded-lg py-2 text-xs sm:text-sm font-bold transition-all',
            activeTab === 'penalty' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {translate("foulAction")}
        </button>
      </div>

      {activeTab === 'penalty' ? (
        <PenaltyPanel
          team1Name={team1Name}
          team2Name={team2Name}
          sportKind={sportKind}
          penalties={penalties}
          isSubmitting={isSubmitting}
          onAddPenalty={onAddPenalty}
        />
      ) : (
        <div className="space-y-4">
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
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-900">
              <span className="font-bold">⚠️ {translate("ruleWarning")}</span>
              <div className="mt-1 space-y-0.5">
                {scoreWarnings.map((warning) => (
                  <p key={warning.id}>• {warning.message}</p>
                ))}
              </div>
            </div>
          ) : null}

          {/* Clean Set Progress (minimal borders) */}
          {!isFootball ? (
            <div className="rounded-xl bg-white p-3.5 shadow-xs border border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{translate("setProgressTitle")}</p>
                  <p className="mt-0.5 text-sm font-extrabold text-slate-900">
                    Set {activeSetIndex + 1}: <span className="text-blue-600">{currentSet.team1Score}</span> - <span className="text-blue-600">{currentSet.team2Score}</span>
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {scores.filter((set) => set.isFinished).length} set đã xong
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {scores.map((set, index) => (
                  <div
                    key={`set-log-${index}`}
                    className={cn(
                      'min-w-[120px] flex-1 rounded-xl p-2.5 transition-all',
                      index === activeSetIndex && !set.isFinished
                        ? 'bg-blue-50/80 ring-1 ring-blue-300'
                        : 'bg-slate-50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700">Set {index + 1}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase',
                          set.scoreOverride?.reason
                            ? 'bg-amber-100 text-amber-800'
                            : set.isFinished
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700',
                        )}
                      >
                        {set.scoreOverride?.reason ? translate('overrideStatus') : set.isFinished ? 'ĐÃ CHỐT' : 'ĐANG ĐẤU'}
                      </span>
                    </div>
                    <p className="mt-1 text-lg font-black text-slate-900 tabular-nums">
                      {set.team1Score} - {set.team2Score}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!isFootball && !isLiteMatch ? (
            <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{translate("refereeMode")}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {overrideEnabled ? translate('overrideEnabledLabel') : translate('defaultRulesLabel')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOverrideEnabledChange(!overrideEnabled)}
                  className={cn(
                    'rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer',
                    overrideEnabled
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100',
                  )}
                >
                  {overrideEnabled ? translate('overrideToggleOn') : translate('overrideToggleOff')}
                </button>
              </div>

              {overrideEnabled ? (
                <div className="mt-3 space-y-1.5">
                  <label className="text-xs font-bold uppercase text-amber-800">
                    {translate('overrideReasonRequired')}
                  </label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(event) => onOverrideReasonChange(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder={translate('overrideReasonPlaceholder')}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Main Action/Match Box */}
          <div className="rounded-2xl bg-white p-4 shadow-xs space-y-4">
            {match.status === 'SCHEDULED' ? (
              <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 p-8 text-center">
                <AlertCircle className="mb-2 h-12 w-12 text-blue-500" />
                <h4 className="mb-1 text-base font-bold text-slate-800">{translate('scheduledTitle')}</h4>
                {!match.participant1Id || !match.participant2Id ? (
                  <p className="mt-2 text-xs font-bold text-blue-600">
                    {translate('waitingForParticipants')}
                  </p>
                ) : (
                  <button
                    onClick={onStartMatch}
                    disabled={isSubmitting}
                    className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-current" /> {translate('startMatch')}
                  </button>
                )}
              </div>
            ) : null}

            {match.status === 'ONGOING' ? (
              <div className="space-y-4">
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

                {/* Big, Clear Action Buttons */}
                <div className="pt-2 border-t border-slate-100">
                  {isFootball ? (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handleCompleteMatch(1)}
                        disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-4 text-sm font-extrabold text-white shadow-md transition-all hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                      >
                        <Trophy className="h-4 w-4" /> {team1Name} thắng
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCompleteMatch(2)}
                        disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-4 text-sm font-extrabold text-white shadow-md transition-all hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                      >
                        <Trophy className="h-4 w-4" /> {team2Name} thắng
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => setConfirmFinishSequence(true)}
                        disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 px-4 text-sm font-extrabold text-white shadow-md transition-all hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="h-4 w-4" /> Chốt set hiện tại
                      </button>

                      <div className="flex flex-1 gap-2">
                        <button
                          type="button"
                          onClick={() => handleCompleteMatch(1)}
                          disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3 px-3 text-xs sm:text-sm font-extrabold text-white shadow-md transition-all hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                        >
                          <Trophy className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{team1Name} thắng</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCompleteMatch(2)}
                          disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3 px-3 text-xs sm:text-sm font-extrabold text-white shadow-md transition-all hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                        >
                          <Trophy className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{team2Name} thắng</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {match.status === 'COMPLETED' ? (
              <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 p-6 text-center">
                <Trophy className="mb-2 h-12 w-12 text-blue-500" />
                <h4 className="mb-1 font-bold text-slate-800">{translate('completedTitle')}</h4>
                <p className="text-xs text-slate-500">
                  {translate('winnerLabel')}{' '}
                  <span className="font-bold text-blue-600">
                    {match.winnerId === match.participant1Id ? team1Name : team2Name}
                  </span>
                </p>
              </div>
            ) : null}
          </div>
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
                  if (!isLiteMatch && !overrideEnabled) {
                    onOverrideEnabledChange(true);
                  }
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
                  Chốt set hiện tại
                </ModalTitle>
                <ModalDescription className="mt-0.5 text-xs font-semibold text-slate-500">
                  Lưu điểm set {activeSetIndex + 1}: <span className="font-bold text-slate-900">{currentSet.team1Score} - {currentSet.team2Score}</span>
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
