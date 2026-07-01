'use client';

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

export interface LiveMatchControlPanelProps {
  canControlLiveMatch: boolean;
  isSubmitting: boolean;
  match: Match;
  team1Name: string;
  team2Name: string;
  currentSet: MatchScore;
  scorePresentation: ReturnType<typeof getMatchScorePresentation>;
  scoreGuidance: ScoreEntryGuidance;
  sportKind: 'BADMINTON' | 'TABLE_TENNIS' | 'PICKLEBALL_RALLY' | 'PICKLEBALL_SIDE_OUT' | 'TENNIS';
  isPickleballSideOut: boolean;
  sideOutState: PickleballSideOutState;
  isTennis: boolean;
  tennisPointState: TennisLivePointState | null;
  penalties: MatchPenaltyRecord[];
  scoreWarnings: ScoreRuleWarning[];
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
}

export function LiveMatchControlPanel({
  canControlLiveMatch,
  isSubmitting,
  match,
  team1Name,
  team2Name,
  currentSet,
  scorePresentation,
  scoreGuidance,
  sportKind,
  isPickleballSideOut,
  sideOutState,
  isTennis,
  tennisPointState,
  penalties,
  scoreWarnings,
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
}: LiveMatchControlPanelProps) {
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

      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
        {scoreGuidance.targetSummary}
        <div className="mt-1 text-xs font-semibold text-blue-700">
          Ví dụ hợp lệ: {scoreGuidance.examples.join(' • ')}. {scoreGuidance.operatorHint}
        </div>
        {isTennis ? (
          <div className="mt-2 text-xs font-semibold text-blue-700">
            Tennis live sẽ lên theo pha bóng `0 - 15 - 30 - 40 - A`; đủ điều kiện thì hệ thống tự chốt game và nhảy sang loạt phụ khi set đang là `6 - 6`.
          </div>
        ) : null}
      </div>

      <PenaltyPanel
        team1Name={team1Name}
        team2Name={team2Name}
        sportKind={sportKind}
        penalties={penalties}
        isSubmitting={isSubmitting}
        onAddPenalty={onAddPenalty}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Chế độ trọng tài</p>
            <p className="mt-2 text-sm font-black text-slate-900">
              {overrideEnabled ? 'Chế độ ngoại lệ đang bật' : 'Bám luật mặc định'}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Bật chế độ ngoại lệ khi trọng tài/BTC cần chốt điểm lệch preset chuẩn của môn, nhưng vẫn phải lưu lý do để audit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOverrideEnabledChange(!overrideEnabled)}
            className={cn(
              'rounded-xl border px-4 py-2 text-xs font-black transition-colors',
              overrideEnabled
                ? 'border-amber-500 bg-amber-500 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
            )}
          >
            {overrideEnabled ? 'Tắt ngoại lệ' : 'Bật ngoại lệ'}
          </button>
        </div>

        {overrideEnabled ? (
          <div className="mt-4 space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
              Lý do ngoại lệ bắt buộc
            </label>
            <textarea
              value={overrideReason}
              onChange={(event) => onOverrideReasonChange(event.target.value)}
              className="min-h-24 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-slate-800"
              placeholder="Ví dụ: trận chung kết áp dụng loạt phụ rút gọn theo thống nhất của trọng tài và BTC..."
            />
            <p className="text-xs font-medium text-amber-700">
              Hệ thống sẽ lưu người quyết định, thời điểm và lý do vào audit log của trận.
            </p>
          </div>
        ) : null}
      </div>

      {scoreWarnings.length > 0 ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-900">
          <p className="font-black">Cảnh báo bám luật mặc định</p>
          <div className="mt-2 space-y-1 text-xs font-semibold text-orange-800">
            {scoreWarnings.map((warning) => (
              <p key={warning.id}>- {warning.message}</p>
            ))}
          </div>
          {!overrideEnabled ? (
            <p className="mt-2 text-xs font-semibold text-orange-800">
              Nếu trọng tài xác nhận đây là kết quả đặc biệt nhưng hợp lệ, hãy bật chế độ ngoại lệ rồi ghi rõ lý do.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg md:p-8">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Bảng điều khiển trận đấu</h3>
            <p className="text-xs text-slate-500">Cập nhật điểm số và trạng thái trận đấu theo thời gian thực</p>
          </div>
        </div>

        {match.status === 'SCHEDULED' ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <AlertCircle className="mb-2 h-12 w-12 text-blue-500" />
            <h4 className="mb-1 font-bold text-slate-800">Trận đấu chưa bắt đầu</h4>
            {!match.participant1Id || !match.participant2Id ? (
              <>
                <p className="mb-6 max-w-sm rounded-lg border border-amber-100 bg-amber-50 p-2.5 text-xs font-bold text-amber-600">
                  Chưa xác định đầy đủ hai đối thủ tham gia thi đấu. Vui lòng chờ các trận ở vòng trước hoàn thành.
                </p>
                <button
                  disabled
                  className="flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-200 px-6 py-3 font-bold text-slate-400 transition-all"
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
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-50"
                >
                  <Play className="h-4 w-4 fill-current" /> Bắt đầu trận đấu
                </button>
              </>
            )}
          </div>
        ) : null}

        {match.status === 'ONGOING' ? (
          <div className="space-y-8">
            {isTennis ? (
              <TennisOfficialPanel
                match={match}
                team1Name={team1Name}
                team2Name={team2Name}
                currentSet={currentSet}
                currentPointTeam1={currentPointTeam1}
                currentPointTeam2={currentPointTeam2}
                tennisPointState={tennisPointState}
                isSubmitting={isSubmitting}
                onUpdatePoints={onUpdatePoints}
              />
            ) : isBadminton ? (
              <BadmintonOfficialPanel
                team1Name={team1Name}
                team2Name={team2Name}
                currentPointTeam1={currentPointTeam1}
                currentPointTeam2={currentPointTeam2}
                isSubmitting={isSubmitting}
                onUpdatePoints={onUpdatePoints}
              />
            ) : isTableTennis ? (
              <TableTennisOfficialPanel
                team1Name={team1Name}
                team2Name={team2Name}
                currentPointTeam1={currentPointTeam1}
                currentPointTeam2={currentPointTeam2}
                isSubmitting={isSubmitting}
                onUpdatePoints={onUpdatePoints}
              />
            ) : (
              <BadmintonOfficialPanel
                team1Name={team1Name}
                team2Name={team2Name}
                currentPointTeam1={currentPointTeam1}
                currentPointTeam2={currentPointTeam2}
                isSubmitting={isSubmitting}
                onUpdatePoints={onUpdatePoints}
              />
            )}

            <div className="flex flex-col justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row">
              <button
                onClick={onFinishSet}
                disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                <Check className="h-4 w-4 text-emerald-500" /> {scorePresentation.completeActionLabel}
              </button>

              <div className="flex flex-1 gap-3">
                <button
                  onClick={() => onCompleteMatch(1)}
                  disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Trophy className="h-4 w-4" /> Đội 1 Thắng
                </button>
                <button
                  onClick={() => onCompleteMatch(2)}
                  disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Trophy className="h-4 w-4" /> Đội 2 Thắng
                </button>
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
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
            <Trophy className="mb-2 h-12 w-12 text-emerald-500" />
            <h4 className="mb-1 font-bold text-slate-800">Trận đấu đã hoàn thành</h4>
            <p className="text-xs text-slate-500">
              Người chiến thắng:{' '}
              <span className="font-bold text-emerald-600">
                {match.winnerId === match.participant1Id ? team1Name : team2Name}
              </span>
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
