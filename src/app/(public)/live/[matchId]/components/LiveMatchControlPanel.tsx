'use client';

import type { SportRuleKind } from '@/types/tournament';

import { useState } from 'react';
import { Activity, AlertCircle, Check, Play, Trophy } from 'lucide-react';
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
  // Bóng đá: luân lưu phân định khi hòa knockout
  isFootball?: boolean;
  shootoutGoals?: { p1Goals: number; p2Goals: number };
  onShootoutGoalsChange?: (goals: { p1Goals: number; p2Goals: number }) => void;
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
  scoreGuidance,
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
}: LiveMatchControlPanelProps) {
  const [confirmWinner, setConfirmWinner] = useState<1 | 2 | null>(null);
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
        : 'Chưa xác định đội giao';
  const currentPointTeam1 = tennisPointState ? formatTennisPointDisplay(tennisPointState.team1Point) : String(currentSet.team1Score);
  const currentPointTeam2 = tennisPointState ? formatTennisPointDisplay(tennisPointState.team2Point) : String(currentSet.team2Score);
  const isBadminton = sportKind === 'BADMINTON';
  const isTableTennis = sportKind === 'TABLE_TENNIS';
  return (
    <>
      <div className="sticky top-0 z-20 -mx-1 min-w-0 border-b border-slate-200 bg-white/95 px-1 py-2 backdrop-blur">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('score')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-colors',
              activeTab === 'score' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            Tính điểm
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('penalty')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-colors',
              activeTab === 'penalty' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            Phạt / Lỗi
          </button>
        </div>
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
         {!isLiteMatch && scoreWarnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          <span className="font-bold">⚠️ Cảnh báo bám luật:</span>
          <div className="mt-1 space-y-0.5">
            {scoreWarnings.map((warning) => (
              <p key={warning.id}>• {warning.message}</p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
        {scoreGuidance.targetSummary}
        <span className="ml-1 opacity-75">| {scoreGuidance.examples.join(', ')}</span>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Tiến trình set</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              Set hiện tại: {activeSetIndex + 1} · {currentSet.team1Score} - {currentSet.team2Score}
            </p>
          </div>
          <p className="text-xs font-semibold text-slate-500">
            {scores.filter((set) => set.isFinished).length} set đã chốt
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {scores.map((set, index) => (
            <div
              key={`set-log-${index}`}
              className={cn(
                'min-w-[150px] flex-1 rounded-lg border px-3 py-2',
                index === activeSetIndex && !set.isFinished
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-slate-200 bg-slate-50',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">Set {index + 1}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                    set.scoreOverride?.reason
                      ? 'bg-amber-100 text-amber-800'
                      : set.isFinished
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700',
                  )}
                >
                  {set.scoreOverride?.reason ? 'Ngoại lệ' : set.isFinished ? 'Đã chốt' : 'Đang đấu'}
                </span>
              </div>
              <p className="mt-1 text-base font-bold text-slate-950">
                {set.team1Score} - {set.team2Score}
              </p>
              {set.scoreOverride?.reason ? (
                <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-amber-800" title={set.scoreOverride.reason}>
                  {set.scoreOverride.reason}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {!isLiteMatch ? <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Chế độ trọng tài</p>
            <p className="mt-2 text-sm font-bold text-slate-900">
              {overrideEnabled ? 'Ngoại lệ đang bật' : 'Theo luật mặc định'}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Chỉ bật khi trọng tài/BTC cần chốt điểm khác luật mặc định và luôn phải ghi lý do.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOverrideEnabledChange(!overrideEnabled)}
            className={cn(
              'rounded-lg border px-4 py-2 text-xs font-bold transition-colors',
              overrideEnabled
                ? 'border-amber-500 bg-amber-500 text-white'
                : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
            )}
          >
            {overrideEnabled ? 'Tắt ngoại lệ' : 'Bật ngoại lệ'}
          </button>
        </div>

        {overrideEnabled ? (
          <div className="mt-4 space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
              Lý do ngoại lệ bắt buộc
            </label>
            <textarea
              value={overrideReason}
              onChange={(event) => onOverrideReasonChange(event.target.value)}
              className="min-h-24 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
              placeholder="Ví dụ: trận chung kết áp dụng loạt phụ rút gọn theo thống nhất của trọng tài và BTC..."
            />
            <p className="text-xs font-medium text-amber-700">
              Hệ thống sẽ lưu người quyết định, thời điểm và lý do của trận.
            </p>
          </div>
        ) : null}
      </div> : null}

      <div className="min-w-0 rounded-xl border border-slate-100 bg-white p-3 shadow-lg sm:p-4 md:p-5">
        <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Bảng điều khiển trận đấu</h3>
            <p className="text-xs text-slate-500">Cập nhật điểm số và trạng thái trận đấu theo thời gian thực</p>
          </div>
        </div>

        {match.status === 'SCHEDULED' ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <AlertCircle className="mb-2 h-12 w-12 text-blue-500" />
            <h4 className="mb-1 font-bold text-slate-800">Trận đấu chưa bắt đầu</h4>
            {!match.participant1Id || !match.participant2Id ? (
              <>
                <p className="mb-6 max-w-sm rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-blue-600">
                  Chưa xác định đầy đủ hai đối thủ tham gia thi đấu. Vui lòng chờ các trận ở vòng trước hoàn thành.
                </p>
                <button
                  disabled
                  className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-slate-200 px-6 py-3 font-bold text-slate-400 transition-all"
                >
                  <Play className="h-4 w-4 fill-current" /> Bắt đầu trận đấu
                </button>
              </>
            ) : (
              <>
                <p className="mb-6 max-w-sm text-xs text-slate-500">
                  Hãy kích hoạt trận đấu để bắt đầu ghi điểm {scorePresentation.sequenceLabel} đấu.
                </p>
                <button
                  onClick={onStartMatch}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-bold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-50"
                >
                  <Play className="h-4 w-4 fill-current" /> Bắt đầu trận đấu
                </button>
              </>
            )}
          </div>
        ) : null}

        {match.status === 'ONGOING' ? (
          <div className="space-y-6">
            {isTennis ? (
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

            <div className="sticky bottom-0 z-10 -mx-3 flex min-w-0 flex-col justify-between gap-3 border-t border-slate-100 bg-white/95 px-3 pb-1 pt-3 backdrop-blur sm:-mx-4 sm:flex-row sm:px-4 md:-mx-5 md:px-5">
              <button
                onClick={onFinishSet}
                disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-3 font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                <Check className="h-4 w-4 text-blue-500" /> {scorePresentation.completeActionLabel}
              </button>

              <div className="flex flex-grow flex-col items-end gap-2">
                <p className="text-right text-[11px] font-semibold text-slate-500">
                  {isLiteMatch ? 'Giải Lite cho phép BTC chốt nhanh theo thực tế trận đấu.' : 'Chốt thắng thẳng chỉ dùng khi đã bật ngoại lệ và nhập lý do.'}
                </p>
                <div className="flex flex-wrap justify-end gap-2">
                <button
                  onClick={() => handleCompleteMatch(1)}
                  disabled={isSubmitting || !match.participant1Id || !match.participant2Id || (!isLiteMatch && !isFootball && (!overrideEnabled || !overrideReason.trim()))}
                  className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none', isLiteMatch ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700')}
                >
                  <Trophy className="h-3.5 w-3.5" /> {isLiteMatch ? 'Đội 1 thắng' : 'Đội 1 thắng ngoại lệ'}
                </button>
                <button
                  onClick={() => handleCompleteMatch(2)}
                  disabled={isSubmitting || !match.participant1Id || !match.participant2Id || (!isLiteMatch && !isFootball && (!overrideEnabled || !overrideReason.trim()))}
                  className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none', isLiteMatch ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700')}
                >
                  <Trophy className="h-3.5 w-3.5" /> {isLiteMatch ? 'Đội 2 thắng' : 'Đội 2 thắng ngoại lệ'}
                </button>
                </div>
              </div>
              {isTennis ? (
                <p className="mt-3 text-center text-xs font-semibold text-slate-500">
                  Game hiện tại của set: {currentSet.team1Score} - {currentSet.team2Score}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {match.status === 'COMPLETED' ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
            <Trophy className="mb-2 h-12 w-12 text-blue-500" />
            <h4 className="mb-1 font-bold text-slate-800">Trận đấu đã hoàn thành</h4>
            <p className="text-xs text-slate-500">
              Người chiến thắng:{' '}
              <span className="font-bold text-blue-600">
                {match.winnerId === match.participant1Id ? team1Name : team2Name}
              </span>
            </p>
          </div>
        ) : null}
      </div>
        </>
      )}

      <Modal open={confirmWinner !== null} onOpenChange={(open) => !open && setConfirmWinner(null)}>
        <ModalContent className="max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
          <ModalHeader className="text-center sm:text-left">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 sm:mx-0">
              <AlertCircle className="h-6 w-6" />
            </div>
            <ModalTitle className="mt-3 text-lg font-bold text-slate-900 sm:mt-4">
              Xác nhận chốt thắng ngoại lệ
            </ModalTitle>
            <ModalDescription className="mt-2 text-sm font-semibold text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn chốt kết quả chiến thắng toàn trận cho đội:
              <span className="mt-1.5 block text-base font-bold text-slate-900 underline decoration-blue-500 decoration-2 underline-offset-4">
                {confirmWinner === 1 ? team1Name : team2Name}
              </span>
              {isFootball ? (
                <span className="mt-2 block rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                  ⚽ Trận hòa ở vòng loại trực tiếp — nhập kết quả LUÂN LƯU để phân định.
                </span>
              ) : (
                <>
                  Hành động này sẽ kết thúc trận đấu và khóa bảng điểm. Lý do ngoại lệ:
                  <span className="mt-2 block rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800">
                    {overrideReason.trim()}
                  </span>
                </>
              )}
            </ModalDescription>
          </ModalHeader>

          {isFootball && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-800">{team1Name} (luân lưu)</label>
                <input
                  type="number"
                  min={0}
                  value={shootoutGoals.p1Goals}
                  onChange={(e) => onShootoutGoalsChange?.({ ...shootoutGoals, p1Goals: Number(e.target.value) })}
                  className="h-10 w-full rounded-lg border border-emerald-300 bg-white px-3 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-800">{team2Name} (luân lưu)</label>
                <input
                  type="number"
                  min={0}
                  value={shootoutGoals.p2Goals}
                  onChange={(e) => onShootoutGoalsChange?.({ ...shootoutGoals, p2Goals: Number(e.target.value) })}
                  className="h-10 w-full rounded-lg border border-emerald-300 bg-white px-3 text-sm"
                />
              </div>
            </div>
          )}

          <ModalFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="w-full border-slate-200 text-slate-700 sm:w-auto"
              onClick={() => setConfirmWinner(null)}
            >
              Hủy thao tác
            </Button>
            <Button
              disabled={!isFootball && (!overrideEnabled || !overrideReason.trim())}
              variant="warning"
              className="w-full font-bold disabled:bg-slate-200 disabled:text-slate-400 sm:w-auto"
              onClick={() => {
                if (confirmWinner) {
                  onCompleteMatch(confirmWinner);
                }
                setConfirmWinner(null);
              }}
            >
              {isFootball ? 'Chốt thắng (luân lưu)' : 'Chốt thắng ngoại lệ'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
