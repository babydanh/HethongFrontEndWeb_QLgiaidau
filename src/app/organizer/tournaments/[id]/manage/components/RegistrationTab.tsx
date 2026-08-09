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
  Shuffle,
  GripVertical,
} from 'lucide-react';
import { Tournament, TournamentParticipant } from '@/types/tournament';
import { Division } from '@/features/tournaments/api';
import { formatDate } from '@/utils/format';
import CountdownTimer from '@/components/shared/CountdownTimer';
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
import { LiteInviteQr } from '@/components/tournaments/LiteInviteQr';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RegistrationTabProps {
  tournament: Tournament;
  inviteLink: string;
  mockNamesText: string;
  setMockNamesText: (val: string) => void;
  isSeedingMock: boolean;
  isClearingMock: boolean;
  wildcardEmailOrPhone: string;
  setWildcardEmailOrPhone: (val: string) => void;
  wildcardPartnerEmailOrPhone: string;
  setWildcardPartnerEmailOrPhone: (val: string) => void;
  wildcardTeamName: string;
  setWildcardTeamName: (val: string) => void;
  isAssigningWildcard: boolean;
  participants: TournamentParticipant[];
  activeParticipantActionId: string | null;
  divisions: Division[];
  selectedDivisionId: string;
  setSelectedDivisionId: (val: string) => void;
  visibility: 'PUBLIC' | 'PRIVATE';
  setVisibility: (val: 'PUBLIC' | 'PRIVATE') => void;
  registrationMode: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY';
  setRegistrationMode: (val: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY') => void;
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
  handleRemoveWildcard?: (participantId: string) => Promise<void>;
  onCopyInviteLink: () => void;
  // ELO Constraints
  eloEnabled: boolean;
  setEloEnabled: (val: boolean) => void;
  eloMin: number;
  setEloMin: (val: number) => void;
  eloMax: number;
  setEloMax: (val: number) => void;
  eloMaxCombined: number;
  setEloMaxCombined: (val: number) => void;
  eloMaxGap: number;
  setEloMaxGap: (val: number) => void;
  // Seeding
  seedingMethod: 'ELO' | 'RANDOM' | 'MANUAL';
  setSeedingMethod: (val: 'ELO' | 'RANDOM' | 'MANUAL') => void;
  isAutoSeeding: boolean;
  handleAutoSeed: () => Promise<void>;
  handleSwapSeeds: (participantId1: string, participantId2: string) => Promise<void>;
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
  wildcardPartnerEmailOrPhone,
  setWildcardPartnerEmailOrPhone,
  wildcardTeamName,
  setWildcardTeamName,
  isAssigningWildcard,
  participants,
  activeParticipantActionId,
  divisions,
  selectedDivisionId,
  setSelectedDivisionId,
  visibility,
  setVisibility,
  registrationMode,
  setRegistrationMode,
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
  onCopyInviteLink,
  eloEnabled,
  setEloEnabled,
  eloMin,
  setEloMin,
  eloMax,
  setEloMax,
  eloMaxCombined,
  setEloMaxCombined,
  eloMaxGap,
  setEloMaxGap,
  seedingMethod,
  setSeedingMethod,
  isAutoSeeding,
  handleAutoSeed,
  handleSwapSeeds,
}: RegistrationTabProps) {
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<'ALL' | 'PENDING' | 'COMPLETE' | 'UNPAID' | 'REJECTED'>('ALL');
  const [editingSeed, setEditingSeed] = React.useState<string | null>(null);
  const [seedInputValue, setSeedInputValue] = React.useState('');

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
        (participant.members || []).some((member) => (member.fullName || '').toLowerCase().includes(normalizedSearch));

      return matchesFilter && matchesSearch;
    });
  }, [filter, participants, search]);

  const handleSeedEditStart = (participantId: string, currentSeed: number | null) => {
    setEditingSeed(participantId);
    setSeedInputValue(currentSeed != null ? String(currentSeed) : '');
  };

  const handleSeedEditSave = async (participantId: string) => {
    if (!seedInputValue.trim()) {
      setEditingSeed(null);
      return;
    }
    const seed = Number(seedInputValue);
    if (isNaN(seed) || seed < 1) return;
    try {
      const { tournamentsApi } = await import('@/features/tournaments/api');
      await tournamentsApi.updateParticipantSeed(tournament.id, participantId, seed);
      toast.success('Đã cập nhật seed!');
      setEditingSeed(null);
    } catch (err) {
      const { getErrorMessage } = await import('@/utils/error');
      toast.error(getErrorMessage(err));
    }
  };

  // ─── Kéo thả hạt giống ─────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleSeedDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const seeded = [...participants]
      .filter((p) => p.seed != null)
      .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));

    const oldIdx = seeded.findIndex((p) => p.id === active.id);
    const newIdx = seeded.findIndex((p) => p.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    // Swap seeds between the dragged item and the target
    const dragged = seeded[oldIdx];
    const target = seeded[newIdx];
    void handleSwapSeeds(dragged.id, target.id);
  };

  const canSeedMock = true;

  // ─── SortableSeedItem ─────────────────────────────────────────────
  function SortableSeedItem({ p }: { p: TournamentParticipant }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 50 : 'auto' as const,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5"
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors touch-none"
            title="Kéo để sắp xếp"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
            #{p.seed}
          </span>
          <span className="text-sm font-bold text-slate-900 truncate">{p.teamName}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200">
      
      {/* LEFT COLUMN: PUBLISH STATUS & REGISTRATION CONTROL (span-2) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Publish Status Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 text-lg">Trạng thái phát hành giải đấu</h3>
          
          {isTournamentDraft(tournament.status) ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-400">ℹ</span>
                <p className="text-xs leading-relaxed font-medium">
                  Giải đấu đang ở trạng thái <strong>Bản nháp</strong>. Giải đấu chỉ hiển thị đối với bạn. Hãy kiểm tra kỹ thông tin cấu hình, thời gian và địa điểm thi đấu trước khi công bố.
                </p>
              </div>
              {publishFeeAmount > 0 && (
                <div className="text-xs font-semibold text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50/60 rounded-lg border border-slate-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
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

        <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-start gap-4 justify-between border-b border-slate-100 pb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Thông tin đăng ký</h3>
              <p className="mt-1.5 text-xs font-semibold text-slate-455">
                Quản lý cách VĐV đi vào giải, khung thời gian mở đơn và bộ công cụ mời riêng cho đăng ký.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cột 1: Chế độ & Quyền truy cập */}
            <div className="space-y-4 bg-slate-50/60 border border-slate-100 p-5 rounded-lg">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Quyền truy cập & Xét duyệt</h4>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Hiển thị giải đấu</label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE')}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="PUBLIC">Công khai (Tìm kiếm được)</option>
                    <option value="PRIVATE">Không niêm yết (Chỉ truy cập qua link)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Chế độ nhận đăng ký</label>
                  <select
                    value={registrationMode}
                    onChange={(e) => setRegistrationMode(e.target.value as 'OPEN' | 'APPROVAL' | 'INVITE_ONLY')}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="OPEN">Tự do (Vào thẳng danh sách)</option>
                    <option value="APPROVAL">Xét duyệt (Chờ BTC phê duyệt)</option>
                    <option value="INVITE_ONLY">Chỉ nhận mã mời (Cần mã Code)</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    registrationMode === 'INVITE_ONLY' ? 'bg-amber-500 animate-pulse' :
                    registrationMode === 'APPROVAL' ? 'bg-blue-500' : 'bg-emerald-500'
                  }`} />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {registrationMode === 'INVITE_ONLY' && 'Đăng ký đóng kín'}
                    {registrationMode === 'APPROVAL' && 'Xét duyệt thủ công'}
                    {registrationMode === 'OPEN' && 'Mở tự do'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                  {registrationMode === 'OPEN' && 'Mọi VĐV đăng ký tham gia được chốt danh sách và tham gia giải ngay lập tức.'}
                  {registrationMode === 'APPROVAL' && 'Đăng ký của VĐV sẽ ở trạng thái chờ duyệt. BTC xét duyệt hồ sơ thủ công.'}
                  {registrationMode === 'INVITE_ONLY' && 'Chỉ những ai có link hoặc mã mời mới có thể truy cập và đăng ký tham gia.'}
                </p>
              </div>
            </div>

            {/* Cột 2: Khung thời gian nhận đăng ký */}
            <div className="space-y-4 bg-slate-50/60 border border-slate-100 p-5 rounded-lg flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Khung thời gian đăng ký</h4>
              </div>

              <div className="space-y-4">
                <div>
                  <DateTimePicker
                    label="Thời gian mở đăng ký"
                    value={registrationStartDate}
                    onChange={setRegistrationStartDate}
                  />
                  {registrationStartDate && (
                    <div className="mt-1">
                      <CountdownTimer
                        targetDate={registrationStartDate}
                        labels={{ active: 'Mở đăng ký sau', expired: 'Đã mở đăng ký' }}
                        variant="info"
                        size="sm"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <DateTimePicker
                    label="Thời gian đóng đăng ký"
                    value={registrationEndDate}
                    onChange={setRegistrationEndDate}
                  />
                  {registrationEndDate && (
                    <div className="mt-1">
                      <CountdownTimer
                        targetDate={registrationEndDate}
                        labels={{ active: 'Đóng đăng ký sau', expired: 'Đã đóng đăng ký' }}
                        variant="warning"
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed pt-2 border-t border-slate-200/60 mt-3">
                💡 Lưu ý: Trạng thái đóng/mở đăng ký sẽ tự động cập nhật theo dòng thời gian thiết lập ở trên.
              </p>
            </div>
          </div>

          {/* ELO Constraints */}
          <div className="bg-slate-50/60 border border-slate-100 rounded-lg p-5 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={eloEnabled}
                onChange={(e) => setEloEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-bold text-slate-800">Ràng buộc ELO</span>
                <p className="text-xs text-slate-500">Giới hạn trình độ VĐV khi đăng ký</p>
              </div>
            </label>

            {eloEnabled && (() => {
              const selDiv = divisions.find(d => d.id === selectedDivisionId);
              const isDoubles = selDiv?.matchType === 'DOUBLES' || selDiv?.matchType === 'MIXED_DOUBLES';
              return (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500">ELO tối thiểu</label>
                  <input type="number" min={0} max={3000} value={eloMin}
                    onChange={(e) => setEloMin(Math.max(0, Number(e.target.value)))}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500">ELO tối đa</label>
                  <input type="number" min={0} max={3000} value={eloMax}
                    onChange={(e) => setEloMax(Math.max(0, Number(e.target.value)))}
                    className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white" />
                </div>
                {isDoubles && (
                  <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500">Tổng ELO tối đa (đôi)</label>
                    <input type="number" min={0} max={6000} value={eloMaxCombined}
                      onChange={(e) => setEloMaxCombined(Math.max(0, Number(e.target.value)))}
                      className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500">Chênh lệch tối đa (đôi)</label>
                    <input type="number" min={0} max={1000} value={eloMaxGap}
                      onChange={(e) => setEloMaxGap(Math.max(0, Number(e.target.value)))}
                      className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white" />
                  </div>
                  </>
                )}
              </div>
            )})()}
          </div>

          {(visibility === 'PRIVATE' || registrationMode === 'INVITE_ONLY') && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">Mã mời đăng ký nhanh</p>
                  <p className="text-xl font-bold tracking-[0.18em] text-blue-700">{tournament.inviteCode || 'Chưa có'}</p>
                  <p className="text-xs font-medium text-slate-600">
                    {registrationMode === 'INVITE_ONLY'
                      ? 'Giải chỉ nhận mã mời: VĐV bắt buộc dùng mã/link này mới mở được form đăng ký.'
                      : visibility === 'PRIVATE'
                        ? 'Giải không niêm yết trong danh sách: chia sẻ link này để VĐV vào đăng ký (mã không bắt buộc).'
                        : 'Gửi mã hoặc link này cho VĐV khi cần vào thẳng luồng đăng ký.'}
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

              <div className="mt-4 rounded-lg border border-white/80 bg-white/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
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

              <div className="mt-4">
                <LiteInviteQr
                  inviteUrl={inviteLink}
                  tournamentName={tournament.name}
                  compact
                />
              </div>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-5 mt-2">
            <Button
              onClick={handleSaveRegistrationSettings}
              disabled={isSavingConfig}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-lg shadow-md shadow-blue-500/10 active:scale-[0.98] transition-all"
            >
              {isSavingConfig ? 'Đang lưu...' : 'Lưu thông tin đăng ký'}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Duyệt hồ sơ đăng ký</h3>
              <p className="mt-1 text-xs font-semibold text-slate-455">
                Theo dõi toàn bộ trạng thái đăng ký, thanh toán và quyết định duyệt trước khi chốt danh sách.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">Chờ duyệt</p>
              <p className="mt-1 text-lg font-bold text-amber-800">{participantSummary.pending}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Tổng hồ sơ</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{participantSummary.total}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">Chờ duyệt</p>
              <p className="mt-2 text-lg font-bold text-amber-700">{participantSummary.pending}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">Đã duyệt</p>
              <p className="mt-2 text-lg font-bold text-emerald-700">{participantSummary.approved}</p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">Bị từ chối</p>
              <p className="mt-2 text-lg font-bold text-amber-700">{participantSummary.rejected}</p>
            </div>
            <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-600">Chưa thanh toán</p>
              <p className="mt-2 text-lg font-bold text-rose-700">{participantSummary.unpaid}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">Đang chờ ghép</p>
              <p className="mt-2 text-lg font-bold text-blue-700">{participantSummary.partnerInvite}</p>
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
                    'rounded-full border px-3 py-2 text-xs font-bold transition-colors',
                    filter === option.value
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-650 hover:border-slate-300 hover:text-slate-900',
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
                <tr className="text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
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
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
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
                    const isMockParticipant = (participant.members || []).some((member) => member.isMock);
                    const canApprove = isParticipantPendingApproval(participant.teamStatus);
                    const canReject = isParticipantPendingApproval(participant.teamStatus) || isMockParticipant;

                    return (
                      <tr key={participant.id}>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                              {participant.seed != null && (
                                <span
                                  className="inline-flex items-center justify-center min-w-[28px] h-[22px] rounded-full border border-blue-300 bg-blue-50 text-blue-700 text-[11px] font-bold cursor-pointer hover:bg-blue-100 transition-colors px-2"
                                  title="Nhấp để sửa seed"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSeedEditStart(participant.id, participant.seed);
                                  }}
                                >
                                  #{participant.seed}
                                </span>
                              )}
                              {participant.teamName}
                            </p>
                            {editingSeed === participant.id && (
                              <div className="flex items-center gap-1 ml-1">
                                <input
                                  type="number"
                                  min={1}
                                  value={seedInputValue}
                                  onChange={(e) => setSeedInputValue(e.target.value)}
                                  className="w-16 h-7 border border-blue-400 rounded px-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') { void handleSeedEditSave(participant.id); }
                                    if (e.key === 'Escape') { setEditingSeed(null); }
                                  }}
                                  onBlur={() => { void handleSeedEditSave(participant.id); }}
                                />
                                <span className="text-[10px] text-slate-400 font-medium">#</span>
                              </div>
                            )}
                            {participant.isWildcard ? (
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                                Đặc cách
                              </span>
                            ) : participant.teamInviteToken ? (
                              <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                                Chờ ghép partner
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            Đăng ký {formatDate(participant.registeredAt)}
                            {participant.seed != null ? '' : ` • Seed: Chưa có`}
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
                          <span className={[
                            'inline-flex rounded-full border px-2.5 py-1 text-xs font-bold',
                            getParticipantStatusClassName(participant.teamStatus),
                          ].join(' ')}>
                            {getParticipantStatusLabel(participant.teamStatus)}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`text-xs font-bold ${participant.isPaid ? 'text-blue-600' : 'text-rose-600'}`}>
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
                                const confirmed = window.confirm(
                                  isMockParticipant
                                    ? `Bạn có chắc muốn xoá dữ liệu mock của "${participant.teamName}" không?`
                                    : `Bạn có chắc muốn từ chối hồ sơ của "${participant.teamName}" không?`,
                                );
                                if (confirmed) {
                                  void handleRejectParticipant(participant.id);
                                }
                              }}
                              disabled={!canReject || isBusy}
                              className={isMockParticipant
                                ? 'border-rose-200 text-rose-700 hover:bg-rose-50 font-bold'
                                : 'border-amber-200 text-amber-700 hover:bg-amber-50 font-bold'}
                            >
                              {isMockParticipant ? <Trash2 className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                              {isMockParticipant ? 'Xóa mock' : 'Từ chối'}
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

        <div className="rounded-lg border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">Sang vận hành khi giải bắt đầu</p>
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
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-none" /> Bảng thử nghiệm dữ liệu ảo
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              Tạo danh sách vận động viên ảo để thử nghiệm ghép cặp, bốc thăm và kiểm thử sơ đồ thi đấu bất kỳ lúc nào.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách VĐV ảo</label>
            <Textarea
              value={mockNamesText}
              onChange={(e) => setMockNamesText(e.target.value)}
              placeholder="Mỗi dòng là 1 tên VĐV.&#10;Đánh đôi: Cứ 2 dòng liên tiếp xếp 1 đội.&#10;Ví dụ:&#10;VĐV A&#10;VĐV B"
              className="h-32 text-xs resize-none font-semibold text-slate-700"
              disabled={!canSeedMock || isSeedingMock || isClearingMock}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSeedMockData}
              disabled={!canSeedMock || isSeedingMock || isClearingMock || !mockNamesText.trim()}
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

        {/* Xếp hạt giống */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Shuffle className="w-4 h-4 text-purple-600" /> Xếp hạt giống
            </h3>
            <p className="text-xs text-slate-455 mt-1 font-semibold">Phân loại đội mạnh yếu để tránh chạm nhau sớm.</p>
          </div>

          {/* Phương pháp xếp hạt giống */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phương pháp xếp hạt giống</label>
            <select
              value={seedingMethod}
              onChange={(e) => setSeedingMethod(e.target.value as 'ELO' | 'RANDOM' | 'MANUAL')}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="MANUAL">Xếp thủ công</option>
              <option value="ELO">Tự động theo ELO</option>
              <option value="RANDOM">Ngẫu nhiên</option>
            </select>
          </div>

          {/* Auto seeding button for ELO or RANDOM */}
          {(seedingMethod === 'ELO' || seedingMethod === 'RANDOM') && (
            <Button
              onClick={handleAutoSeed}
              disabled={isAutoSeeding || participants.length < 2}
              className="w-full text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm animate-none font-bold"
            >
              {isAutoSeeding ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang xếp hạt giống...</>
              ) : (
                <><Shuffle className="w-3.5 h-3.5" /> Tự động xếp hạt giống</>
              )}
            </Button>
          )}

          {/* Manual seed list (draggable up/down) */}
          {seedingMethod === 'MANUAL' && (
            <div className="space-y-1">
              {(() => {
                const seeded = [...participants]
                  .filter((p) => p.seed != null)
                  .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));
                const unseeded = [...participants]
                  .filter((p) => p.seed == null);

                if (participants.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                      <Shuffle className="w-6 h-6 text-slate-300" />
                      <p className="mt-2 text-sm font-bold text-slate-500">Chưa có đội nào được đăng ký</p>
                    </div>
                  );
                }

                return (
                  <>
                    {seeded.length > 0 && (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSeedDragEnd}>
                        <SortableContext items={seeded.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-1">
                            {seeded.map((p) => (
                              <SortableSeedItem key={p.id} p={p} />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                    {unseeded.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Chưa có seed ({unseeded.length} đội)
                        </p>
                        <div className="space-y-1">
                          {unseeded.map((p) => (
                            <div key={p.id} className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-400 text-xs font-bold shrink-0">
                                  ?
                                </span>
                                <span className="text-sm font-bold text-slate-500 truncate">{p.teamName}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSeedEditStart(p.id, null)}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
                              >
                                Gán seed
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Reserved Slots / Wildcards Direct Assignment */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" /> Suất đặc cách
            </h3>
            <p className="text-xs text-slate-455 mt-1 font-semibold">Gán trực tiếp khách mời, nhà tài trợ vào danh sách thi đấu. Bỏ qua mọi quy tắc giới hạn ELO.</p>
          </div>

          {/* Division Selector */}
          {divisions.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chọn hình thức</label>
              <div className="grid grid-cols-1 gap-2">
                {divisions.map((div) => {
                  const isActive = div.id === selectedDivisionId;
                  const matchLabel = div.matchType === 'SINGLES'
                    ? (div.genderRestriction === 'FEMALE' ? 'Đơn Nữ' : 'Đơn Nam')
                    : div.matchType === 'DOUBLES'
                      ? (div.genderRestriction === 'FEMALE' ? 'Đôi Nữ' : div.genderRestriction === 'MIXED' ? 'Đôi Nam Nữ' : 'Đôi Nam')
                      : 'Đôi Nam Nữ';
                  const bracketLabel = div.bracketType === 'DOUBLE_ELIMINATION' ? 'Loại kép'
                    : div.bracketType === 'ROUND_ROBIN' ? 'Vòng tròn' : 'Loại trực tiếp';
                  const count = div._count?.participants ?? 0;
                  return (
                    <button
                      key={div.id}
                      type="button"
                      onClick={() => {
                        setSelectedDivisionId(div.id);
                        setWildcardPartnerEmailOrPhone('');
                      }}
                      className={`relative w-full cursor-pointer rounded-lg border px-4 py-3 text-xs font-bold transition-all text-left ${
                        isActive
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-650 hover:border-emerald-200 hover:text-emerald-700'
                      }`}
                    >
                      <span className="block text-sm font-bold">{div.name}</span>
                      <span className="block text-[10px] font-semibold text-slate-500 mt-0.5">
                        {matchLabel} • {bracketLabel} • {count} hồ sơ
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected division info */}
          {(() => {
            const selDiv = divisions.find(d => d.id === selectedDivisionId);
            const isDoubles = selDiv?.matchType === 'DOUBLES' || selDiv?.matchType === 'MIXED_DOUBLES';
            return (
              <>
                {/* Player 1 Email */}
                <Input
                  label="Email hoặc SĐT người chơi"
                  placeholder="partner@vndcsport.vn hoặc 09xxxx"
                  value={wildcardEmailOrPhone}
                  onChange={(e) => setWildcardEmailOrPhone(e.target.value)}
                  className="bg-white text-xs h-10"
                  disabled={isAssigningWildcard}
                />

                {/* Partner Email (chỉ hiện khi đánh đôi) */}
                {isDoubles && (
                  <Input
                    label="Đồng đội (Email hoặc SĐT)"
                    placeholder="Nhập email/số điện thoại đồng đội"
                    value={wildcardPartnerEmailOrPhone}
                    onChange={(e) => setWildcardPartnerEmailOrPhone(e.target.value)}
                    className="bg-white text-xs h-10"
                    disabled={isAssigningWildcard}
                  />
                )}

                {/* Team Name */}
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
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang gán...</>
                  ) : (
                    <><CheckCircle className="w-3.5 h-3.5" /> Gán suất đặc cách</>
                  )}
                </Button>
              </>
            );
          })()}

          {/* Wildcard Participants List */}
          {(() => {
            const wildcards = participants.filter(p => p.isWildcard);
            if (wildcards.length === 0) return null;
            return (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
                  Đã gán đặc cách ({wildcards.length})
                </p>
                <div className="space-y-2">
                  {wildcards.map((p) => {
                    const divName = divisions.find(d => d.id === p.tournamentDivisionId)?.name || '';
                    return (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/40 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 truncate">{p.teamName}</span>
                            <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shrink-0">
                              Đặc cách
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {p.members?.map(m => m.fullName).filter(Boolean).join(', ') || 'Chưa có tên'}
                            {divName ? ` • ${divName}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Xoá suất đặc cách của "${p.teamName}"?`)) {
                              // handleRemoveWildcard(p.id)
                            }
                          }}
                          className="ml-2 rounded-lg p-1.5 text-rose-500 hover:bg-rose-100 transition-colors"
                          title="Xoá đặc cách"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

      </div>

    </div>
  );
}
