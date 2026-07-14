'use client';

import { useMemo, useState } from 'react';
import { MoreHorizontal, Search, ShieldAlert, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import type { TournamentParticipant } from '@/types/tournament';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import {
  getParticipantStatusClassName,
  getParticipantStatusLabel,
  isParticipantApproved,
} from '@/utils/tournament-display';

interface OpsParticipantsProps {
  participants: TournamentParticipant[];
  activeParticipantActionId: string | null;
  onKickParticipant: (participantId: string, reason: string) => Promise<void>;
}

type ParticipantFilter = 'ALL' | 'COMPLETE' | 'UNPAID' | 'KICKED' | 'DISCIPLINED';

interface KickDraft {
  id: string;
  teamName: string;
}

const FILTER_OPTIONS: Array<{ value: ParticipantFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'COMPLETE', label: 'Đủ điều kiện đấu' },
  { value: 'UNPAID', label: 'Chưa thanh toán' },
  { value: 'KICKED', label: 'Đã loại' },
  { value: 'DISCIPLINED', label: 'Kỷ luật khác' },
];

export function OpsParticipants({
  participants,
  activeParticipantActionId,
  onKickParticipant,
}: OpsParticipantsProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ParticipantFilter>('ALL');
  const [kickDraft, setKickDraft] = useState<KickDraft | null>(null);
  const [kickReason, setKickReason] = useState('Vi phạm điều lệ giải');

  const filteredParticipants = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return participants.filter((participant) => {
      const matchesFilter =
        filter === 'ALL' ? true :
        filter === 'COMPLETE' ? isParticipantApproved(participant.teamStatus) :
        filter === 'UNPAID' ? !participant.isPaid :
        filter === 'KICKED' ? participant.teamStatus === 'KICKED' :
        participant.teamStatus === 'DISQUALIFIED' || participant.teamStatus === 'NO_SHOW' || participant.teamStatus === 'WITHDRAWN';

      const matchesSearch =
        !normalizedSearch ||
        participant.teamName.toLowerCase().includes(normalizedSearch) ||
        participant.members.some((member) => (member.fullName || '').toLowerCase().includes(normalizedSearch));

      return matchesFilter && matchesSearch;
    });
  }, [filter, participants, search]);

  const summary = useMemo(() => {
    return {
      total: participants.length,
      active: participants.filter((participant) => isParticipantApproved(participant.teamStatus)).length,
      unpaid: participants.filter((participant) => !participant.isPaid).length,
      disciplined: participants.filter((participant) => participant.teamStatus === 'DISQUALIFIED' || participant.teamStatus === 'NO_SHOW' || participant.teamStatus === 'WITHDRAWN').length,
      kicked: participants.filter((participant) => participant.teamStatus === 'KICKED').length,
    };
  }, [participants]);

  const handleSubmitKick = async () => {
    if (!kickDraft) {
      return;
    }

    await onKickParticipant(kickDraft.id, kickReason);
    setKickDraft(null);
    setKickReason('Vi phạm điều lệ giải');
  };

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">Roster thi đấu & kỷ luật</h2>
            <p className="text-sm font-medium text-slate-500">
              Khối phụ trợ để rà roster đang thi đấu, các đội có rủi ro kỹ thuật và quyết định loại khỏi giải khi cần.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Boundary vận hành</p>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              Panel này không xử lý duyệt đăng ký. Nghiệp vụ còn lại là theo dõi roster thực tế, thanh toán và xử lý loại đội khi giải đang chạy.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_1fr]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên đội hoặc thành viên"
            icon={<Search className="h-4 w-4" />}
          />
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={cn(
                  'rounded-full border px-3 py-2 text-xs font-black transition-colors',
                  filter === option.value
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Tổng roster</p>
            <p className="mt-2 text-lg font-black text-slate-900">{summary.total}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-600">Đủ điều kiện đấu</p>
            <p className="mt-2 text-lg font-black text-emerald-700">{summary.active}</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-rose-600">Chưa thanh toán</p>
            <p className="mt-2 text-lg font-black text-rose-700">{summary.unpaid}</p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-orange-600">Kỷ luật khác</p>
            <p className="mt-2 text-lg font-black text-orange-700">{summary.disciplined}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-600">Đã loại</p>
            <p className="mt-2 text-lg font-black text-amber-700">{summary.kicked}</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                <th className="pb-3 pr-4">Đội/Cặp</th>
                <th className="pb-3 pr-4">Thành viên</th>
                <th className="pb-3 pr-4">Trạng thái</th>
                <th className="pb-3 pr-4">Thanh toán</th>
                <th className="pb-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12">
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                      <Users className="h-8 w-8 text-slate-300" />
                      <p className="mt-3 text-sm font-bold text-slate-700">Không có hồ sơ phù hợp</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        Thử đổi bộ lọc hoặc từ khóa tìm kiếm để xem đầy đủ danh sách.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((participant) => {
                  const isBusy = activeParticipantActionId === participant.id;
                  const canKick = participant.teamStatus !== 'KICKED' && participant.teamStatus !== 'WITHDRAWN';

                  return (
                    <tr key={participant.id}>
                      <td className="py-4 pr-4">
                        <p className="text-sm font-black text-slate-900">{participant.teamName}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          Đăng ký {formatDate(participant.registeredAt)} • Seed: {participant.seed ?? 'Chưa có'}
                        </p>
                      </td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap gap-2">
                            {(participant.members || []).map((member) => (
                              <span key={member.userId} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
                                {member.isMock ? 'VĐV ảo' : (member.fullName || 'Chưa rõ')}
                              </span>
                            ))}
                          </div>
                        </td>
                      <td className="py-4 pr-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${getParticipantStatusClassName(participant.teamStatus)}`}>
                          {getParticipantStatusLabel(participant.teamStatus)}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`text-xs font-black ${participant.isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {participant.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-200 font-bold text-slate-700"
                              disabled={isBusy}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Tác vụ vận hành</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={!canKick || isBusy}
                              onClick={() => {
                                setKickDraft({ id: participant.id, teamName: participant.teamName });
                                setKickReason('Vi phạm điều lệ giải');
                              }}
                            >
                              <ShieldAlert className="mr-2 h-4 w-4 text-rose-600" />
                              Loại khỏi giải
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={Boolean(kickDraft)}
        onOpenChange={(open) => {
          if (!open) {
            setKickDraft(null);
          }
        }}
      >
        <ModalContent className="sm:max-w-xl">
          <ModalHeader>
            <ModalTitle>Loại người chơi/đội khỏi giải</ModalTitle>
            <ModalDescription>
              Nghiệp vụ này phù hợp cho chấn thương, gian lận, vi phạm điều lệ hoặc quyết định kỹ thuật của BTC.
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Đối tượng bị xử lý</p>
              <p className="mt-2 text-sm font-black text-slate-900">{kickDraft?.teamName}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="kick-reason" className="text-sm font-bold text-slate-700">
                Lý do loại khỏi giải
              </label>
              <textarea
                id="kick-reason"
                value={kickReason}
                onChange={(event) => setKickReason(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="Ví dụ: Đội vi phạm điều lệ kiểm tra nhân sự trước giờ thi đấu."
              />
            </div>
          </div>

          <ModalFooter className="gap-2">
            <Button variant="outline" className="border-slate-200 text-slate-700" onClick={() => setKickDraft(null)}>
              Hủy
            </Button>
            <Button
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => {
                void handleSubmitKick();
              }}
              disabled={!kickReason.trim() || activeParticipantActionId === kickDraft?.id}
            >
              Xác nhận loại khỏi giải
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
