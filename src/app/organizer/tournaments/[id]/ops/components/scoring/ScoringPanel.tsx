'use client';

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
  if (!match) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
        Không có dữ liệu trận để nhập điểm.
      </div>
    );
  }

  const resolvedRules = resolveMatchSportRules({
    matchConfig: match.matchConfig,
    tournament: { sportRules: tournamentSportRules },
  });
  const scorePresentation = getMatchScorePresentation(resolvedRules.kind);
  const scoreGuidance = getScoreEntryGuidance(resolvedRules.kind);
  const quickScoreTemplates = getQuickScoreTemplates(
    resolvedRules.kind,
    resolvedRules.pointsPerSet,
    resolvedRules.maxPoints,
  );
  const sideOutState =
    resolvedRules.kind === 'PICKLEBALL_SIDE_OUT'
      ? scoreDraft.sideOutState ?? readSideOutState(match) ?? buildEmptySideOutState()
      : null;
  const servingTeamLabel =
    sideOutState?.servingTeam === 1
      ? match.participant1?.teamName || 'Đội 1'
      : sideOutState?.servingTeam === 2
        ? match.participant2?.teamName || 'Đội 2'
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
  const scoreWarnings = getScoreRuleWarnings(scoreDraft.sets, resolvedRules);
  const canSubmitScore = hasEnteredScore && !hasDrawnFinishedSet && (overrideEnabled || scoreWarnings.length === 0);
  const activeSetSummary = activeSet
    ? `${scorePresentation.sequenceLabel.charAt(0).toUpperCase() + scorePresentation.sequenceLabel.slice(1)} hiện tại ${activeSet.team1Score} - ${activeSet.team2Score}${activeSet.isFinished ? ' (đã chốt)' : ' (đang mở)'}`
    : 'Chưa có ${scorePresentation.sequenceLabel} đang mở';

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
        {scorePresentation.sportLabel} • {scorePresentation.summaryLabel} • Chạm đích: {resolvedRules.pointsPerSet}
        {resolvedRules.kind === 'TENNIS' ? ` game, loạt phụ ${resolvedRules.tiebreakPoints}` : ''}
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
        {activeSetSummary}
        <div className="mt-1 text-xs font-medium text-emerald-700">
          Modal này chỉ nên có 1 {scorePresentation.sequenceLabel} đang mở. Nếu có nhiều dòng 0-0 chưa chốt, backend tennis sẽ từ chối.
        </div>
      </div>
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
        {scoreGuidance.targetSummary}
        <div className="mt-1 text-xs font-semibold text-blue-700">
          Ví dụ hợp lệ: {scoreGuidance.examples.join(' • ')}. {scoreGuidance.operatorHint}
        </div>
      </div>

      {!isLiteMode && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Chế độ trọng tài / BTC</p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {overrideEnabled ? 'Ngoại lệ đang bật' : 'Theo luật mặc định'}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Chỉ bật khi cần chốt tỷ số khác luật mặc định. Hệ thống vẫn lưu đầy đủ người quyết định và lý do.
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
              {overrideEnabled ? 'Tắt ngoại lệ' : 'Bật ngoại lệ'}
            </button>
          </div>

          {overrideEnabled && !isLiteMode ? (
            <div className="mt-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
                Lý do ngoại lệ bắt buộc
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
                placeholder="Ví dụ: trận tranh hạng ba thống nhất chơi loạt phụ rút gọn theo quyết định trọng tài và BTC..."
              />
              <p className="text-xs font-medium text-amber-700">
                Hệ thống sẽ ghi lại người quyết định, thời điểm và lý do ngoại lệ của trận.
              </p>
            </div>
          ) : null}
        </div>
      )}

      {isLiteMode && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
          ⚡ Giải đang dùng luật Tự do (Lite Mode). Trọng tài được tùy ý ghi/chỉnh điểm số không bị giới hạn.
        </div>
      )}

      {sideOutState ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
          {servingTeamLabel
            ? `${servingTeamLabel} đang giữ quyền giao • lượt ${sideOutState.serverNumber}. Panel này sẽ lưu luôn trạng thái giao bóng hiện tại.`
            : 'Chế độ mất quyền giao đang bật nhưng trận chưa chốt đội giao hiện tại ở bảng điểm trực tiếp.'}
        </div>
      ) : null}

      {sideOutState ? (
        <div className="grid gap-3 rounded-lg border border-blue-200 bg-white p-4 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-500">Điều khiển giao bóng trong modal</p>
            <p className="mt-2 text-sm font-bold text-slate-900">
              {sideOutState.servingTeam == null
                ? 'Chưa chọn đội giao hiện tại'
                : `${servingTeamLabel} đang giao • lượt ${sideOutState.serverNumber}`}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Dùng khi cần chốt lại trạng thái giao bóng cùng lúc với việc nhập tỷ số game pickleball.
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
                {match.participant1?.teamName || 'Đội 1'} giao
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
                {match.participant2?.teamName || 'Đội 2'} giao
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
                Lượt giao 1
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
                Lượt giao 2
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
              Mất quyền giao
            </button>
          </div>
        </div>
      ) : null}

      {scoreWarnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          <p className="font-bold">Cảnh báo bám luật mặc định</p>
          <div className="mt-2 space-y-1 text-xs font-semibold text-amber-800">
            {scoreWarnings.map((warning) => (
              <p key={warning.id}>- {warning.message}</p>
            ))}
          </div>
          {!overrideEnabled ? (
            <p className="mt-2 text-xs font-semibold text-amber-800">
              Nếu biên bản trọng tài xác nhận đây là kết quả hợp lệ ngoài preset, hãy bật chế độ ngoại lệ rồi ghi rõ lý do.
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
                    Đang diễn ra
                  </span>
                ) : null}
                {set.scoreOverride?.reason ? (
                  <span className="ml-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                    Ngoại lệ
                  </span>
                ) : set.isFinished ? (
                  <span className="ml-2 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">
                    Đã chốt
                  </span>
                ) : index === activeSetIndex ? (
                  <span className="ml-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                    Set hiện tại
                  </span>
                ) : (
                  <span className="ml-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Chưa mở
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Set đã chốt sẽ giữ lại. Set hiện tại mới được nhập điểm và chốt ở nút lưu.
              </p>
              {set.scoreOverride?.reason ? (
                <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800">
                  Lý do ngoại lệ: {set.scoreOverride.reason}
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
                      {match.participant1?.teamName || 'Đội 1'} {template.winnerScore}-{template.loserScore}
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
                      {match.participant2?.teamName || 'Đội 2'} {template.loserScore}-{template.winnerScore}
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
                  Xóa nhanh {scorePresentation.sequenceLabel} này
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600">{match.participant1?.teamName || 'Đội 1'}</label>
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
              <label className="text-xs font-bold text-slate-600">{match.participant2?.teamName || 'Đội 2'}</label>
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
          {scorePresentation.wonSummaryLabel} {match.participant1?.teamName || 'Đội 1'}: <span className="font-bold">{p1Won}</span>
        </div>
        <div>
          {scorePresentation.wonSummaryLabel} {match.participant2?.teamName || 'Đội 2'}: <span className="font-bold">{p2Won}</span>
        </div>
      </div>

      {!canSubmitScore ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
            {finishedSets.length === 0
              ? hasEnteredScore
                ? `Set hiện tại đang ở mức ${activeSet.team1Score} - ${activeSet.team2Score}. Hãy chốt bằng một tỉ số không hòa trước khi lưu.`
                : `Chưa có ${scorePresentation.sequenceLabel} nào được chốt. Hãy nhập điểm cho set hiện tại trước khi lưu.`
              : `${scorePresentation.sequenceLabel.charAt(0).toUpperCase() + scorePresentation.sequenceLabel.slice(1)} không được hòa. Hãy kiểm tra lại tỉ số đã nhập.`}
        </div>
      ) : null}
      {overrideEnabled && !canSubmitWithOverride ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
          Đã bật ngoại lệ, cần nhập lý do để BTC và trọng tài tra cứu lại sau.
        </div>
      ) : null}

      <ModalFooter className="gap-2">
        <Button variant="outline" className="border-slate-200 text-slate-700" onClick={onCancel}>
          Hủy
        </Button>
        <Button
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={onSubmit}
          disabled={!canSubmitScore || !canSubmitWithOverride || isSubmitting}
        >
          Lưu tỷ số
        </Button>
      </ModalFooter>
    </div>
  );
}
