'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { DateTimePicker, Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  RefreshCw, 
  Loader2, 
  Plus, 
  Trash2, 
  UserPlus, 
  CheckCircle,
  Lock,
  ArrowRight,
  UserCheck,
  UserX,
  Users,
  Search,
} from 'lucide-react';
import { Tournament, TournamentParticipant } from '@/types/tournament';
import { formatDate } from '@/utils/format';
import {
  getParticipantStatusClassName,
  getParticipantStatusLabel,
  isParticipantApproved,
  isParticipantPendingApproval,
  isParticipantPendingPartner,
} from '@/utils/tournament-display';
import {
  isTournamentDraft,
  isTournamentRegistrationClosed,
  isTournamentRegistrationOpen,
} from '@/utils/tournament-status';
import toast from 'react-hot-toast';

interface RegistrationTabProps {
  tournament: Tournament;
  inviteLink: string;
  mockNamesText: string;
  setMockNamesText: (val: string) => void;
  isSeedingMock: boolean;
  isClearingMock: boolean;
  wildcardEmailOrPhone: string;
  setWildcardEmailOrPhone: (val: string) => void;
  wildcardTeamName: string;
  setWildcardTeamName: (val: string) => void;
  isAssigningWildcard: boolean;
  participants: TournamentParticipant[];
  activeParticipantActionId: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  setVisibility: (val: 'PUBLIC' | 'PRIVATE') => void;
  registrationStartDate: string;
  setRegistrationStartDate: (val: string) => void;
  registrationEndDate: string;
  setRegistrationEndDate: (val: string) => void;
  isSavingConfig: boolean;
  publishFeeAmount: number;
  handlePublish: () => void;
  handleOpenLockModal: () => void;
  handleSaveRegistrationSettings: () => void;
  handleRegenerateInviteCode: () => void;
  handleApproveParticipant: (participantId: string) => Promise<void>;
  handleRejectParticipant: (participantId: string) => Promise<void>;
  handleSeedMockData: () => void;
  handleClearMockData: () => void;
  handleAssignWildcard: () => void;
  onCopyInviteLink: () => void;
}

export function RegistrationTab({
  tournament,
  inviteLink,
  mockNamesText,
  setMockNamesText,
  isSeedingMock,
  isClearingMock,
  wildcardEmailOrPhone,
  setWildcardEmailOrPhone,
  wildcardTeamName,
  setWildcardTeamName,
  isAssigningWildcard,
  participants,
  activeParticipantActionId,
  visibility,
  setVisibility,
  registrationStartDate,
  setRegistrationStartDate,
  registrationEndDate,
  setRegistrationEndDate,
  isSavingConfig,
  publishFeeAmount,
  handlePublish,
  handleOpenLockModal,
  handleSaveRegistrationSettings,
  handleRegenerateInviteCode,
  handleApproveParticipant,
  handleRejectParticipant,
  handleSeedMockData,
  handleClearMockData,
  handleAssignWildcard,
  onCopyInviteLink
}: RegistrationTabProps) {
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<'ALL' | 'PENDING' | 'COMPLETE' | 'UNPAID' | 'REJECTED'>('ALL');

  const participantSummary = React.useMemo(() => ({
    total: participants.length,
    pending: participants.filter((participant) => isParticipantPendingApproval(participant.teamStatus)).length,
    approved: participants.filter((participant) => isParticipantApproved(participant.teamStatus)).length,
    unpaid: participants.filter((participant) => !participant.isPaid).length,
    rejected: participants.filter((participant) => participant.teamStatus === 'REJECTED').length,
    partnerInvite: participants.filter((participant) => Boolean(participant.teamInviteToken)).length,
  }), [participants]);

  const filteredParticipants = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return participants.filter((participant) => {
      const matchesFilter =
        filter === 'ALL' ? true :
        filter === 'PENDING'
          ? isParticipantPendingApproval(participant.teamStatus) || isParticipantPendingPartner(participant.teamStatus)
          :
        filter === 'COMPLETE' ? isParticipantApproved(participant.teamStatus) :
        filter === 'UNPAID' ? !participant.isPaid :
        participant.teamStatus === 'REJECTED';

      const matchesSearch =
        !normalizedSearch ||
        participant.teamName.toLowerCase().includes(normalizedSearch) ||
        participant.members.some((member) => (member.fullName || '').toLowerCase().includes(normalizedSearch));

      return matchesFilter && matchesSearch;
    });
  }, [filter, participants, search]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200">
      
      {/* LEFT COLUMN: PUBLISH STATUS & REGISTRATION CONTROL (span-2) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Publish Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 text-lg">Trạng thái phát hành giải đấu</h3>
          
          {isTournamentDraft(tournament.status) ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-400">ℹ</span>
                <p className="text-xs leading-relaxed font-medium">
                  Giải đấu đang ở trạng thái <strong>Bản nháp</strong>. Giải đấu chỉ hiển thị đối với bạn. Hãy kiểm tra kỹ thông tin cấu hình, thời gian và địa điểm thi đấu trước khi công bố.
                </p>
              </div>
              {publishFeeAmount > 0 && (
                <div className="text-xs font-semibold text-blue-700 bg-blue-50 p-3 rounded-xl border border-blue-200">
                  Khi bấm nút bên dưới, hệ thống sẽ chuyển sang bước thanh toán phí công bố giải đấu: {publishFeeAmount.toLocaleString('vi-VN')}đ.
                </div>
              )}
              <Button
                onClick={handlePublish}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full md:w-auto flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> {publishFeeAmount > 0 ? 'Thanh toán phí & công bố' : 'Công bố giải đấu'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-950 text-sm">Giải đấu đã được công bố!</p>
                    <p className="text-emerald-700 text-xs mt-1">Người chơi có thể đăng ký tài khoản và truy cập link để tham gia.</p>
                  </div>
                </div>
                
                {/* Lock list button */}
                {(isTournamentRegistrationOpen(tournament.status) || isTournamentRegistrationClosed(tournament.status)) && (
                  <Button
                    onClick={handleOpenLockModal}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <Lock className="w-4 h-4" /> Chốt danh sách & Tạo sơ đồ
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Thông tin đăng ký</h3>
            <p className="mt-1 text-xs font-semibold text-slate-455">
              Quản lý cách VĐV đi vào giải, khung thời gian mở đơn và bộ công cụ mời riêng cho đăng ký.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Chế độ nhận đăng ký</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE')}
                className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              >
                <option value="PUBLIC">Công khai: hiển thị trên danh sách và ai đủ điều kiện đều có thể vào đăng ký</option>
                <option value="PRIVATE">Riêng tư: chỉ ai có link hoặc mã mời mới vào được trang đăng ký</option>
              </select>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Dùng `Riêng tư` khi bạn muốn kiểm soát đầu vào theo partner, khách mời hoặc danh sách kín.
              </p>
            </div>

            <DateTimePicker
              label="Mở đăng ký vào lúc"
              value={registrationStartDate}
              onChange={setRegistrationStartDate}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DateTimePicker
              label="Đóng đăng ký vào lúc"
              value={registrationEndDate}
              onChange={setRegistrationEndDate}
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                Trạng thái đường dẫn
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-700">
                {visibility === 'PRIVATE'
                  ? 'Giải đang dùng luồng đăng ký riêng tư, phù hợp cho mời kín và ghép partner có kiểm soát.'
                  : 'Giải đang dùng luồng đăng ký công khai, VĐV có thể tự vào đăng ký nếu đáp ứng điều kiện.'}
              </p>
            </div>
          </div>

          {!isTournamentDraft(tournament.status) && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-blue-600">Mã mời đăng ký nhanh</p>
                  <p className="text-xl font-black tracking-[0.18em] text-blue-700">{tournament.inviteCode || 'Chưa có'}</p>
                  <p className="text-xs font-medium text-slate-600">
                    Gửi mã hoặc link này cho VĐV khi cần vào thẳng luồng đăng ký.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(tournament.inviteCode || '');
                        toast.success('Đã sao chép mã mời!');
                      }}
                    className="border-blue-200 bg-white text-blue-700 hover:bg-blue-100 font-bold text-xs"
                  >
                    Sao chép mã
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRegenerateInviteCode}
                    className="border-blue-200 bg-white text-blue-700 hover:bg-blue-100 font-bold text-xs"
                  >
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Tạo lại mã
                  </Button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/80 bg-white/80 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                  {visibility === 'PRIVATE' ? 'Đường dẫn đăng ký riêng tư' : 'Đường dẫn đăng ký hiện tại'}
                </p>
                <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{inviteLink}</p>
                  <Button
                    variant="outline"
                    onClick={onCopyInviteLink}
                    className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold"
                  >
                    Sao chép link
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-2">
            <Button
              onClick={handleSaveRegistrationSettings}
              disabled={isSavingConfig}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
            >
              {isSavingConfig ? 'Đang lưu...' : 'Lưu thông tin đăng ký'}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Duyệt hồ sơ đăng ký</h3>
              <p className="mt-1 text-xs font-semibold text-slate-455">
                Theo dõi toàn bộ trạng thái đăng ký, thanh toán và quyết định duyệt trước khi chốt danh sách.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-right">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-600">Chờ duyệt</p>
              <p className="mt-1 text-lg font-black text-amber-800">{participantSummary.pending}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Tổng hồ sơ</p>
              <p className="mt-2 text-lg font-black text-slate-900">{participantSummary.total}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-600">Chờ duyệt</p>
              <p className="mt-2 text-lg font-black text-amber-700">{participantSummary.pending}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-600">Đã duyệt</p>
              <p className="mt-2 text-lg font-black text-emerald-700">{participantSummary.approved}</p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-orange-600">Bị từ chối</p>
              <p className="mt-2 text-lg font-black text-orange-700">{participantSummary.rejected}</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-rose-600">Chưa thanh toán</p>
              <p className="mt-2 text-lg font-black text-rose-700">{participantSummary.unpaid}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-blue-600">Đang chờ ghép</p>
              <p className="mt-2 text-lg font-black text-blue-700">{participantSummary.partnerInvite}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_1fr]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên đội hoặc thành viên"
              icon={<Search className="h-4 w-4" />}
            />
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'ALL', label: 'Tất cả' },
                { value: 'PENDING', label: 'Chờ duyệt' },
                { value: 'COMPLETE', label: 'Đã duyệt' },
                { value: 'UNPAID', label: 'Chưa thanh toán' },
                { value: 'REJECTED', label: 'Bị từ chối' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value as typeof filter)}
                  className={[
                    'rounded-full border px-3 py-2 text-xs font-black transition-colors',
                    filter === option.value
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
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
                          Thử đổi bộ lọc hoặc từ khóa để rà lại toàn bộ danh sách đăng ký.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((participant) => {
                    const isBusy = activeParticipantActionId === participant.id;
                    const canApprove = isParticipantPendingApproval(participant.teamStatus);
                    const canReject = isParticipantPendingApproval(participant.teamStatus);

                    return (
                      <tr key={participant.id}>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-slate-900">{participant.teamName}</p>
                            {participant.teamInviteToken ? (
                              <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
                                Chờ ghép partner
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            Đăng ký {formatDate(participant.registeredAt)} • Seed: {participant.seed ?? 'Chưa có'}
                          </p>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap gap-2">
                            {(participant.members || []).map((member) => (
                              <span key={member.userId} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
                                {member.fullName || 'Chưa rõ'}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <span className={[
                            'inline-flex rounded-full border px-2.5 py-1 text-xs font-black',
                            getParticipantStatusClassName(participant.teamStatus),
                          ].join(' ')}>
                            {getParticipantStatusLabel(participant.teamStatus)}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`text-xs font-black ${participant.isPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {participant.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => { void handleApproveParticipant(participant.id); }}
                              disabled={!canApprove || isBusy}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                              {isBusy && canApprove ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                              Duyệt
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                const confirmed = window.confirm(`Bạn có chắc muốn từ chối hồ sơ của "${participant.teamName}" không?`);
                                if (confirmed) {
                                  void handleRejectParticipant(participant.id);
                                }
                              }}
                              disabled={!canReject || isBusy}
                              className="border-orange-200 text-orange-700 hover:bg-orange-50 font-bold"
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Từ chối
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-blue-600">Sang vận hành khi giải bắt đầu</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                Màn hình `Ops` dùng cho điều phối chuỗi trận, sân đấu, các vấn đề phát sinh và nhật ký vận hành trong ngày thi đấu.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-blue-200 bg-white text-blue-700 hover:bg-blue-100 shrink-0"
              onClick={() => { window.location.href = `/organizer/tournaments/${tournament.id}/ops`; }}
            >
              Mở panel vận hành
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: TESTING & WILDCARDS (span-1) */}
      <div className="space-y-6">
        
        {/* Mock Participant Testing Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-none" /> Bảng thử nghiệm dữ liệu ảo
            </h3>
            <p className="text-xs text-slate-455 mt-1 font-semibold">Tạo danh sách vận động viên ảo để kiểm thử sơ đồ thi đấu trước khi mở đăng ký thật.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách VĐV ảo</label>
            <Textarea
              value={mockNamesText}
              onChange={(e) => setMockNamesText(e.target.value)}
              placeholder="Mỗi dòng là 1 tên VĐV.&#10;Đánh đôi: Cứ 2 dòng liên tiếp xếp 1 đội.&#10;Ví dụ:&#10;VĐV A&#10;VĐV B"
              className="h-32 text-xs resize-none font-semibold text-slate-700"
              disabled={isSeedingMock || isClearingMock}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSeedMockData}
              disabled={isSeedingMock || isClearingMock || !mockNamesText.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm animate-none"
            >
              {isSeedingMock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Sinh VĐV ảo
            </Button>
            <Button
              variant="outline"
              onClick={handleClearMockData}
              disabled={isSeedingMock || isClearingMock}
              className="border-rose-250 hover:bg-rose-50 text-rose-600 font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 animate-none"
            >
              {isClearingMock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Dọn dẹp
            </Button>
          </div>
        </div>

        {/* Reserved Slots / Wildcards Direct Assignment */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600" /> Suất đặc cách
            </h3>
            <p className="text-xs text-slate-455 mt-1 font-semibold">Gán trực tiếp khách mời, nhà tài trợ vào danh sách thi đấu của hình thức đang chọn. Suất này bỏ qua mọi quy tắc giới hạn trình độ ELO.</p>
          </div>

          <Input
            label="Tài khoản Baseline (Email hoặc SĐT)"
            placeholder="partner@baseline.vn hoặc 09xxxx"
            value={wildcardEmailOrPhone}
            onChange={(e) => setWildcardEmailOrPhone(e.target.value)}
            className="bg-white text-xs h-10"
            disabled={isAssigningWildcard}
          />

          <Input
            label="Tên đội thi đấu đặc cách"
            placeholder="Ví dụ: Đội Khách Mời VIP"
            value={wildcardTeamName}
            onChange={(e) => setWildcardTeamName(e.target.value)}
            className="bg-white text-xs h-10"
            disabled={isAssigningWildcard}
          />

          <Button
            onClick={handleAssignWildcard}
            disabled={isAssigningWildcard || !wildcardEmailOrPhone.trim() || !wildcardTeamName.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm animate-none"
          >
            {isAssigningWildcard ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang gán...
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" /> Gán suất đặc cách
              </>
            )}
          </Button>
        </div>

      </div>

    </div>
  );
}
