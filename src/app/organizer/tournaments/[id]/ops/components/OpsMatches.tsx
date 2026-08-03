'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { getMatchRoundLabel } from '@/utils/match-round-label';
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
  refereeId: string;
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

const STATUS_FILTERS: Array<{ value: Match['status'] | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'SCHEDULED', label: 'Sắp đấu' },
  { value: 'ONGOING', label: 'Đang đấu' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
  { value: 'DISPUTED', label: 'Cần xử lý' },
];

const BRANCH_LABELS: Record<string, string> = {
  MAIN: 'Nhánh chính',
  WINNERS: 'Nhánh thắng',
  LOSERS: 'Nhánh thua',
  GRAND_FINALS: 'Chung kết tổng',
};

const getBranchLabel = (branch: string | null | undefined) =>
  (branch && BRANCH_LABELS[branch]) || branch || 'Nhánh chính';

const OPERATION_OPTIONS: Array<{ value: MatchOperationAction; label: string; description: string }> = [
  { value: 'WALKOVER', label: 'Thắng trắng', description: 'Đối thủ không ra sân hoặc không đủ điều kiện thi đấu.' },
  { value: 'RETIREMENT', label: 'Chấn thương / bỏ cuộc', description: 'Trận kết thúc sớm do một bên xin dừng.' },
  { value: 'DISQUALIFICATION', label: 'Truất quyền', description: 'BTC xử thua do vi phạm điều lệ hoặc gian lận.' },
  { value: 'OVERRIDE_RESULT', label: 'Chốt lại kết quả', description: 'BTC chốt lại kết quả cuối cùng theo biên bản.' },
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
  const [statusFilter, setStatusFilter] = useState<Match['status'] | 'ALL'>('ALL');
  const [selectedScheduleMatch, setSelectedScheduleMatch] = useState<Match | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>({
    courtName: '',
    courtAddress: '',
    refereeId: '',
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
      refereeId: match.refereeId || '',
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
      refereeId: scheduleDraft.refereeId || null,
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
      tournament: { sportRules: tournamentSportRules },
    });
    const scorePresentation = getMatchScorePresentation(resolvedRules.kind);
    const sideOutState = resolvedRules.kind === 'PICKLEBALL_SIDE_OUT' ? readSideOutState(match) : null;
    const servingTeamLabel =
      sideOutState?.servingTeam === 1
        ? match.participant1?.teamName || 'Đội 1'
        : sideOutState?.servingTeam === 2
          ? match.participant2?.teamName || 'Đội 2'
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
    });

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
              {getBranchLabel(match.bracketBranch)} • {roundLabel} • Trận {match.matchOrder}
            </p>
            <p className="text-sm font-bold text-slate-900">
              {match.participant1?.teamName || 'Chờ xác định'} gặp {match.participant2?.teamName || 'Chờ xác định'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                {STATUS_FILTERS.find((option) => option.value === match.status)?.label ?? match.status}
              </span>
              {attentionCount > 0 || scoreOverride?.reason ? (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                  Cần chú ý: {attentionCount || 1}
                </span>
              ) : (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                  Không có ngoại lệ
                </span>
              )}
              {matchInsight?.hasCustomConfig ? (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                  Luật riêng
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
              <span>Sân: {match.courtName || 'Chưa gán'}</span>
              <span>Lịch: {match.scheduledAt ? formatDateTime(match.scheduledAt) : 'Chưa xếp lịch'}</span>
              <span>Trọng tài: {match.refereeName || (match.refereeId ? "đã phân công" : "chưa phân công")}</span>
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
                    {set.scoreOverride?.reason ? ' • ngoại lệ' : set.isFinished ? ' • chốt' : ' • đang đấu'}
                  </span>
                ))}
              </div>
            ) : null}
            <details
              className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-xs"
              open={attentionCount > 0 || isBlocked || isDirectAdvance}
            >
              <summary className="cursor-pointer list-none font-bold text-slate-700 [&::-webkit-details-marker]:hidden">
                Xem chi tiết điều phối
              </summary>
              <div className="mt-3 space-y-2">
            {isDirectAdvance ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800">
                Đi thẳng / miễn đấu: trận này không cần điều phối sân vì nhánh đã tự xác định đội đi tiếp.
              </div>
            ) : null}
            {specialResult?.action ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800">
                Quyết định BTC: {specialResult.action}
                {specialResult.reason ? ` • ${specialResult.reason}` : ''}
              </div>
            ) : null}
            {scoreOverride?.reason ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
                Ngoại lệ điểm số: {scoreOverride.reason}
                {scoreOverride.decidedAt ? ` • ${formatDateTime(scoreOverride.decidedAt)}` : ''}
              </div>
            ) : null}
            {overriddenSets.length > 0 ? (
              <details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-amber-950">
                <summary className="cursor-pointer font-bold">
                  Ngoại lệ theo set ({overriddenSets.length})
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
                  Thẻ & hình phạt ({penalties.length})
                </summary>
                <div className="mt-2 space-y-2">
                  {penalties.map((penalty) => (
                    <div key={penalty.id} className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2">
                      <p className="font-bold">
                        {penalty.team === 1 ? match.participant1?.teamName || 'Đội 1' : penalty.team === 2 ? match.participant2?.teamName || 'Đội 2' : 'Toàn trận'}: {penalty.label}
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
                Cấu hình riêng: {matchInsight.customConfigSummary.join(' • ')}
              </div>
            ) : null}
            {sideOutState ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
                {servingTeamLabel
                  ? `${servingTeamLabel} đang giao • lượt ${sideOutState.serverNumber}`
                  : 'Chưa chốt đội giao hiện tại'}
              </div>
            ) : null}
            {matchInsight?.dependencyBlocked ? (
              <div className="rounded-lg border border-slate-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900">
                Chưa đủ điều kiện nhánh đấu: {matchInsight.dependencySummary.join(' • ')}
              </div>
            ) : null}
            {!match.participant1Id || !match.participant2Id ? (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                Chưa đủ hai đối thủ. Chỉ nên điều phối sau khi nhánh trước chốt xong.
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
              Lịch
            </Button>
            <Button
              variant="outline"
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
              onClick={() => onFocusMatch?.(match.id)}
            >
              Xem sơ đồ
            </Button>
            <Button asChild variant="outline" className="border-slate-200 font-bold text-slate-700">
              <Link href={`/live/${match.id}`}>
                <TimerReset className="mr-2 h-4 w-4" />
                Mở bảng điểm
              </Link>
            </Button>
            <Button
              variant="outline"
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
              onClick={() => openOperationModal(match)}
              disabled={isBusy || isDirectAdvance || !match.participant1Id || !match.participant2Id}
            >
              <AlertOctagon className="mr-2 h-4 w-4" />
              Xử lý đặc biệt
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
              <h2 className="text-lg font-bold text-slate-900">Điều phối trận đấu</h2>
              <p className="text-sm font-medium text-slate-500">
                Đây là khu vực chính của ngày thi đấu: gọi trận, gán sân, cập nhật tỷ số và chốt các tình huống đặc biệt ngay tại bàn điều hành.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Đã xếp lịch</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{summary.scheduled}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">Chờ xếp lịch</p>
              <p className="mt-2 text-lg font-bold text-amber-700">{summary.unscheduledReady}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">Đang đấu</p>
              <p className="mt-2 text-lg font-bold text-blue-700">{summary.ongoing}</p>
            </div>
            <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-600">Đang nghẽn nhánh</p>
              <p className="mt-2 text-lg font-bold text-rose-700">{summary.blocked}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">Đi thẳng / miễn đấu</p>
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
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {statusFilter === 'ALL' ? (
            <>
              {renderMatchSection(
                'Các trận đã xếp lịch',
                'Đây là danh sách sắp đấu thực sự: đã đủ đối thủ và đã có thời gian thi đấu.',
                buckets.scheduled.slice(0, 8),
                'Chưa có trận nào được xếp lịch rõ ràng.',
              )}
              {renderMatchSection(
                'Các trận chờ điều phối',
                'Đã đủ hai đối thủ nhưng BTC chưa gán giờ/sân cụ thể.',
                buckets.unscheduledReady.slice(0, 8),
                'Không còn trận nào chờ xếp lịch.',
              )}
              {renderMatchSection(
                'Các trận chưa đủ điều kiện chạy',
                'Các trận này chưa nên xếp như trận bình thường vì còn chờ nhánh trước hoặc chưa đủ hai đối thủ.',
                buckets.blocked.slice(0, 8),
                'Không có trận nào đang nghẽn nhánh.',
              )}
              {renderMatchSection(
                'Các suất đi thẳng / miễn đấu',
                'Các cặp này đã được hệ thống cho đi tiếp tự động, không cần đưa vào hàng chờ điều phối sân.',
                buckets.directAdvance.slice(0, 8),
                'Hiện không có suất đi thẳng hoặc miễn đấu.',
              )}
            </>
          ) : filteredMatches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-bold text-slate-700">Không có trận phù hợp</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Đổi bộ lọc để xem thêm trận trong giải.</p>
            </div>
          ) : (
            filteredMatches.slice(0, 12).map(renderMatchCard)
          )}
        </div>
      </section>

      <Modal open={Boolean(selectedScheduleMatch)} onOpenChange={(open) => !open && setSelectedScheduleMatch(null)}>
        <ModalContent className="sm:max-w-2xl">
          <ModalHeader>
            <ModalTitle>Cập nhật lịch thi đấu</ModalTitle>
            <ModalDescription>Điều phối sân, lịch và trọng tài ngay từ panel vận hành.</ModalDescription>
          </ModalHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Tên sân</label>
              <input
                value={scheduleDraft.courtName}
                onChange={(event) => setScheduleDraft((current) => ({ ...current, courtName: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="Ví dụ: Sân trung tâm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Thời gian thi đấu</label>
              <DateTimePicker
                value={scheduleDraft.scheduledAt}
                onChange={(value) => setScheduleDraft((current) => ({ ...current, scheduledAt: value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">Địa chỉ sân</label>
              <input
                value={scheduleDraft.courtAddress}
                onChange={(event) => setScheduleDraft((current) => ({ ...current, courtAddress: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="Ví dụ: 12 Nguyễn Trãi, Quận 1"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">Trọng tài</label>
              <select
                value={scheduleDraft.refereeId}
                onChange={(event) => setScheduleDraft((current) => ({ ...current, refereeId: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Chưa phân công</option>
                {referees.map((referee) => (
                  <option key={referee.userId} value={referee.userId}>
                    {referee.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ModalFooter className="gap-2">
            <Button variant="outline" className="border-slate-200 text-slate-700" onClick={() => setSelectedScheduleMatch(null)}>
              Hủy
            </Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => void handleSubmitSchedule()}>
              Lưu lịch thi đấu
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal open={Boolean(selectedOperationMatch)} onOpenChange={(open) => !open && setSelectedOperationMatch(null)}>
        <ModalContent className="sm:max-w-2xl">
          <ModalHeader>
            <ModalTitle>Quyết định nghiệp vụ đặc biệt</ModalTitle>
          <ModalDescription>Chọn tình huống, đội được xử thắng và ghi lý do để lưu vào nhật ký giải.</ModalDescription>
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
                  <p className="text-sm font-bold text-slate-900">{option.label}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{option.description}</p>
                </button>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Đội thắng theo quyết định</label>
                <select
                  value={operationDraft.winnerId}
                  onChange={(event) => setOperationDraft((current) => ({ ...current, winnerId: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">Chọn đội thắng</option>
                  {selectedOperationMatch?.participant1Id ? (
                    <option value={selectedOperationMatch.participant1Id}>
                      {selectedOperationMatch.participant1?.teamName || 'Đội 1'}
                    </option>
                  ) : null}
                  {selectedOperationMatch?.participant2Id ? (
                    <option value={selectedOperationMatch.participant2Id}>
                      {selectedOperationMatch.participant2?.teamName || 'Đội 2'}
                    </option>
                  ) : null}
                </select>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-600">
                Kết quả này sẽ tự chốt trận, đẩy nhánh đấu đi tiếp và để lại audit log để BTC tra cứu sau.
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Lý do bắt buộc</label>
              <textarea
                value={operationDraft.reason}
                onChange={(event) => setOperationDraft((current) => ({ ...current, reason: event.target.value }))}
                className="min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Ví dụ: đội B xin dừng vì chấn thương cổ chân, đã xác nhận cùng trọng tài..."
              />
            </div>
          </div>

          <ModalFooter>
            <Button variant="outline" className="border-slate-200" onClick={() => setSelectedOperationMatch(null)}>
              Hủy
            </Button>
            <Button
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => void handleSubmitOperation()}
              disabled={
                !operationDraft.reason.trim() ||
                !operationDraft.winnerId ||
                activeMatchActionId === selectedOperationMatch?.id
              }
            >
              Áp dụng quyết định
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
