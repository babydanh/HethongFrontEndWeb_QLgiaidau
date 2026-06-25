'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertOctagon, CalendarClock, ClipboardPenLine, Play, TimerReset, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import type { Match } from '@/types/match';
import { formatDateTime } from '@/utils/format';
import type { MatchOperationAction, MatchOperationInput, MatchScheduleInput, OpsReferee } from '@/features/organizer/ops/types';

interface OpsMatchesProps {
  matches: Match[];
  referees: OpsReferee[];
  activeMatchActionId: string | null;
  onUpdateMatchStatus: (match: Match, status: Match['status']) => Promise<void>;
  onUpdateMatchSchedule: (match: Match, payload: MatchScheduleInput) => Promise<void>;
  onUpdateMatchScore: (match: Match, payload: { p1SetsWon: number; p2SetsWon: number }) => Promise<void>;
  onApplyMatchOperation: (match: Match, payload: MatchOperationInput) => Promise<void>;
  onCreateDispute: (match: Match, reason: string) => Promise<void>;
}

interface ScheduleDraft {
  courtName: string;
  courtAddress: string;
  refereeId: string;
  scheduledAt: string;
}

interface ScoreDraft {
  p1SetsWon: number;
  p2SetsWon: number;
}

interface OperationDraft {
  action: MatchOperationAction;
  reason: string;
  winnerId: string;
}

const STATUS_FILTERS: Array<{ value: Match['status'] | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'SCHEDULED', label: 'Sắp đấu' },
  { value: 'ONGOING', label: 'Đang đấu' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
  { value: 'DISPUTED', label: 'Sự cố' },
];

const STATUS_OPTIONS: Array<{ value: Match['status']; label: string }> = [
  { value: 'SCHEDULED', label: 'Sắp đấu' },
  { value: 'ONGOING', label: 'Đang đấu' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
  { value: 'DISPUTED', label: 'Đang tranh chấp' },
];

const OPERATION_OPTIONS: Array<{ value: MatchOperationAction; label: string; description: string }> = [
  { value: 'WALKOVER', label: 'Thắng trắng', description: 'Đối thủ không ra sân hoặc không đủ điều kiện thi đấu.' },
  { value: 'RETIREMENT', label: 'Chấn thương / bỏ cuộc', description: 'Trận kết thúc sớm do một bên xin dừng.' },
  { value: 'DISQUALIFICATION', label: 'Truất quyền', description: 'BTC xử thua do vi phạm điều lệ hoặc gian lận.' },
  { value: 'OVERRIDE_RESULT', label: 'Override kết quả', description: 'BTC chốt lại kết quả cuối cùng theo biên bản.' },
];

export function OpsMatches({
  matches,
  referees,
  activeMatchActionId,
  onUpdateMatchStatus,
  onUpdateMatchSchedule,
  onUpdateMatchScore,
  onApplyMatchOperation,
  onCreateDispute,
}: OpsMatchesProps) {
  const [statusFilter, setStatusFilter] = useState<Match['status'] | 'ALL'>('ALL');
  const [selectedScheduleMatch, setSelectedScheduleMatch] = useState<Match | null>(null);
  const [selectedScoreMatch, setSelectedScoreMatch] = useState<Match | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>({
    courtName: '',
    courtAddress: '',
    refereeId: '',
    scheduledAt: '',
  });
  const [scoreDraft, setScoreDraft] = useState<ScoreDraft>({
    p1SetsWon: 0,
    p2SetsWon: 0,
  });
  const [selectedDisputeMatch, setSelectedDisputeMatch] = useState<Match | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [selectedOperationMatch, setSelectedOperationMatch] = useState<Match | null>(null);
  const [operationDraft, setOperationDraft] = useState<OperationDraft>({
    action: 'WALKOVER',
    reason: '',
    winnerId: '',
  });

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => (statusFilter === 'ALL' ? true : match.status === statusFilter));
  }, [matches, statusFilter]);

  const summary = useMemo(() => {
    return {
      scheduled: matches.filter((match) => match.status === 'SCHEDULED').length,
      ongoing: matches.filter((match) => match.status === 'ONGOING').length,
      completed: matches.filter((match) => match.status === 'COMPLETED').length,
      disputed: matches.filter((match) => match.status === 'DISPUTED').length,
    };
  }, [matches]);

  const openScheduleModal = (match: Match) => {
    setSelectedScheduleMatch(match);
    setScheduleDraft({
      courtName: match.courtName || '',
      courtAddress: '',
      refereeId: match.refereeId || '',
      scheduledAt: match.scheduledAt ? match.scheduledAt.slice(0, 16) : '',
    });
  };

  const openScoreModal = (match: Match) => {
    setSelectedScoreMatch(match);
    setScoreDraft({
      p1SetsWon: match.p1SetsWon,
      p2SetsWon: match.p2SetsWon,
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

  const handleSubmitScore = async () => {
    if (!selectedScoreMatch) {
      return;
    }

    await onUpdateMatchScore(selectedScoreMatch, scoreDraft);
    setSelectedScoreMatch(null);
  };

  const handleSubmitDispute = async () => {
    if (!selectedDisputeMatch) {
      return;
    }

    await onCreateDispute(selectedDisputeMatch, disputeReason);
    setSelectedDisputeMatch(null);
    setDisputeReason('');
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

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Match Operations</h2>
              <p className="text-sm font-medium text-slate-500">
                Điều phối trận, cập nhật lịch và xử lý nhanh trạng thái hoặc tỷ số từ cùng một workspace.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Sắp đấu</p>
              <p className="mt-2 text-lg font-black text-slate-900">{summary.scheduled}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-blue-600">Đang đấu</p>
              <p className="mt-2 text-lg font-black text-blue-700">{summary.ongoing}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-600">Hoàn tất</p>
              <p className="mt-2 text-lg font-black text-emerald-700">{summary.completed}</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-rose-600">Sự cố</p>
              <p className="mt-2 text-lg font-black text-rose-700">{summary.disputed}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={[
                  'rounded-full border px-3 py-2 text-xs font-black transition-colors',
                  statusFilter === option.value
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {filteredMatches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-bold text-slate-700">Không có trận phù hợp</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Đổi bộ lọc để xem thêm trận trong giải.</p>
            </div>
          ) : (
            filteredMatches.slice(0, 12).map((match) => {
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

              return (
                <div key={match.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-2">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        {match.bracketBranch || 'MAIN'} • Round {match.roundNumber} • Trận {match.matchOrder}
                      </p>
                      <p className="text-sm font-black text-slate-900">
                        {match.participant1?.teamName || 'TBD'} vs {match.participant2?.teamName || 'TBD'}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                        <span>Trạng thái: {match.status}</span>
                        <span>Sân: {match.courtName || 'Chưa gán'}</span>
                        <span>Lịch: {match.scheduledAt ? formatDateTime(match.scheduledAt) : 'Chưa xếp lịch'}</span>
                        <span>Tỷ số set: {match.p1SetsWon} - {match.p2SetsWon}</span>
                      </div>
                      {specialResult?.action ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                          Quyết định BTC: {specialResult.action}
                          {specialResult.reason ? ` • ${specialResult.reason}` : ''}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <select
                        value={match.status}
                        onChange={(event) => {
                          void onUpdateMatchStatus(match, event.target.value as Match['status']);
                        }}
                        disabled={isBusy}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <Button
                        variant="outline"
                        className="border-slate-200 text-slate-700"
                        onClick={() => openScheduleModal(match)}
                        disabled={isBusy}
                      >
                        <CalendarClock className="mr-2 h-4 w-4" />
                        Lịch
                      </Button>
                      <Button
                        variant="outline"
                        className="border-slate-200 text-slate-700"
                        onClick={() => openScoreModal(match)}
                        disabled={isBusy}
                      >
                        <ClipboardPenLine className="mr-2 h-4 w-4" />
                        Tỷ số
                      </Button>
                      <Button
                        variant="outline"
                        className="border-slate-200 text-slate-700"
                        onClick={() => {
                          const nextStatus = match.status === 'ONGOING' ? 'COMPLETED' : 'ONGOING';
                          void onUpdateMatchStatus(match, nextStatus);
                        }}
                        disabled={isBusy}
                      >
                        {match.status === 'ONGOING' ? <Trophy className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                        {match.status === 'ONGOING' ? 'Kết thúc' : 'Bắt đầu'}
                      </Button>
                      <Button asChild variant="outline" className="border-slate-200 font-bold text-slate-700">
                        <Link href={`/live/${match.id}`}>
                          <TimerReset className="mr-2 h-4 w-4" />
                          Mở live
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="border-amber-200 text-amber-700 hover:bg-amber-50"
                        onClick={() => openOperationModal(match)}
                        disabled={isBusy || !match.participant1Id || !match.participant2Id}
                      >
                        <AlertOctagon className="mr-2 h-4 w-4" />
                        Quyết định
                      </Button>
                      <Button
                        variant="outline"
                        className="border-rose-200 text-rose-700 hover:bg-rose-50"
                        onClick={() => setSelectedDisputeMatch(match)}
                        disabled={isBusy}
                      >
                        Báo sự cố
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
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
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                placeholder="Ví dụ: Sân trung tâm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Thời gian thi đấu</label>
              <input
                type="datetime-local"
                value={scheduleDraft.scheduledAt}
                onChange={(event) => setScheduleDraft((current) => ({ ...current, scheduledAt: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">Địa chỉ sân</label>
              <input
                value={scheduleDraft.courtAddress}
                onChange={(event) => setScheduleDraft((current) => ({ ...current, courtAddress: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                placeholder="Ví dụ: 12 Nguyễn Trãi, Quận 1"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">Trọng tài</label>
              <select
                value={scheduleDraft.refereeId}
                onChange={(event) => setScheduleDraft((current) => ({ ...current, refereeId: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
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

      <Modal open={Boolean(selectedScoreMatch)} onOpenChange={(open) => !open && setSelectedScoreMatch(null)}>
        <ModalContent className="sm:max-w-lg">
          <ModalHeader>
            <ModalTitle>Cập nhật tỷ số nhanh</ModalTitle>
            <ModalDescription>Điền số set thắng hiện tại của hai đội để BTC ghi nhận tiến độ trận.</ModalDescription>
          </ModalHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">
                {selectedScoreMatch?.participant1?.teamName || 'Đội 1'}
              </label>
              <input
                type="number"
                min={0}
                value={scoreDraft.p1SetsWon}
                onChange={(event) => setScoreDraft((current) => ({ ...current, p1SetsWon: Number(event.target.value) }))}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">
                {selectedScoreMatch?.participant2?.teamName || 'Đội 2'}
              </label>
              <input
                type="number"
                min={0}
                value={scoreDraft.p2SetsWon}
                onChange={(event) => setScoreDraft((current) => ({ ...current, p2SetsWon: Number(event.target.value) }))}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              />
            </div>
          </div>

          <ModalFooter className="gap-2">
            <Button variant="outline" className="border-slate-200 text-slate-700" onClick={() => setSelectedScoreMatch(null)}>
              Hủy
            </Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => void handleSubmitScore()}>
              Lưu tỷ số
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal open={Boolean(selectedDisputeMatch)} onOpenChange={(open) => !open && setSelectedDisputeMatch(null)}>
        <ModalContent className="sm:max-w-xl">
          <ModalHeader>
            <ModalTitle>Mở sự cố/tranh chấp cho trận</ModalTitle>
            <ModalDescription>Nêu rõ nguyên nhân để BTC có thể theo dõi và xử lý trong panel vận hành.</ModalDescription>
          </ModalHeader>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Lý do</label>
            <textarea
              value={disputeReason}
              onChange={(event) => setDisputeReason(event.target.value)}
              className="min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Ví dụ: vận động viên chấn thương, phản ánh sai điểm, khiếu nại luật..."
            />
          </div>

          <ModalFooter>
            <Button variant="outline" className="border-slate-200" onClick={() => setSelectedDisputeMatch(null)}>
              Hủy
            </Button>
            <Button
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => void handleSubmitDispute()}
              disabled={!disputeReason.trim() || activeMatchActionId === selectedDisputeMatch?.id}
            >
              Ghi nhận sự cố
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal open={Boolean(selectedOperationMatch)} onOpenChange={(open) => !open && setSelectedOperationMatch(null)}>
        <ModalContent className="sm:max-w-2xl">
          <ModalHeader>
            <ModalTitle>Quyết định nghiệp vụ đặc biệt</ModalTitle>
            <ModalDescription>Áp dụng thắng trắng, chấn thương, truất quyền hoặc override kết quả và lưu vết đầy đủ cho BTC.</ModalDescription>
          </ModalHeader>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {OPERATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOperationDraft((current) => ({ ...current, action: option.value }))}
                  className={[
                    'rounded-2xl border p-4 text-left transition-colors',
                    operationDraft.action === option.value
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  ].join(' ')}
                >
                  <p className="text-sm font-black text-slate-900">{option.label}</p>
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
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
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
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-600">
                Kết quả này sẽ tự chốt trận, đẩy nhánh đấu đi tiếp và để lại audit log để BTC tra cứu sau.
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Lý do bắt buộc</label>
              <textarea
                value={operationDraft.reason}
                onChange={(event) => setOperationDraft((current) => ({ ...current, reason: event.target.value }))}
                className="min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
