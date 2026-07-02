'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2,
  Clock3,
  Loader2,
  RotateCcw,
  Shield,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import { tournamentsApi, StaffMember, TournamentReferee } from '@/features/tournaments/api';
import { getErrorMessage } from '@/utils/error';
import toast from 'react-hot-toast';

interface PermissionsTabProps {
  id: string;
  tournament: {
    id: string;
    organizer?: {
      id: string;
      fullName: string;
      avatarUrl?: string | null;
    } | null;
    contactInfo?: {
      email?: string;
    } | null;
  } | null;
}

const roleMap: Record<'organizers' | 'referees' | 'viewers', string> = {
  organizers: 'CO_ORGANIZER',
  referees: 'REFEREE',
  viewers: 'SPECTATOR',
};

const refereeStatusMeta: Record<
  string,
  { label: string; badgeClassName: string; cardClassName: string; icon: React.ReactNode }
> = {
  INVITED: {
    label: 'Chờ phản hồi',
    badgeClassName: 'bg-amber-50 text-amber-700 border-amber-200',
    cardClassName: 'border-amber-200 bg-amber-50/50',
    icon: <Clock3 className="w-4 h-4 text-amber-600" />,
  },
  ACCEPTED: {
    label: 'Đã nhận lời',
    badgeClassName: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cardClassName: 'border-emerald-200 bg-emerald-50/40',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  },
  DECLINED: {
    label: 'Đã từ chối',
    badgeClassName: 'bg-rose-50 text-rose-700 border-rose-200',
    cardClassName: 'border-rose-200 bg-rose-50/40',
    icon: <XCircle className="w-4 h-4 text-rose-600" />,
  },
};

export function PermissionsTab({ id, tournament }: PermissionsTabProps) {
  const [subTab, setSubTab] = useState<'organizers' | 'referees' | 'viewers'>('organizers');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [referees, setReferees] = useState<TournamentReferee[]>([]);
  const [refereeFilter, setRefereeFilter] = useState<'all' | 'INVITED' | 'ACCEPTED' | 'DECLINED'>('all');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [busyRefereeId, setBusyRefereeId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'reinvite' | 'revoke';
    referee: TournamentReferee;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [staffRes, refereesRes] = await Promise.all([
        tournamentsApi.getTournamentStaff(id),
        tournamentsApi.getTournamentReferees(id),
      ]);
      if (staffRes.data) setStaff(staffRes.data);
      if (refereesRes.data) setReferees(refereesRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách phân quyền.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const currentRole = roleMap[subTab];
  const filteredStaff = staff.filter((member) => member.role === currentRole);
  const pendingReferees = referees.filter((referee) => referee.status === 'INVITED');
  const acceptedReferees = referees.filter((referee) => referee.status === 'ACCEPTED');
  const declinedReferees = referees.filter((referee) => referee.status === 'DECLINED');
  const displayedReferees =
    refereeFilter === 'all'
      ? referees
      : referees.filter((referee) => referee.status === refereeFilter);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setIsAdding(true);
    try {
      if (subTab === 'referees') {
        await tournamentsApi.addTournamentReferee(id, trimmedEmail);
        toast.success('Đã gửi lời mời trọng tài.');
      } else {
        await tournamentsApi.addTournamentStaff(id, { email: trimmedEmail, role: currentRole });
        toast.success('Thêm nhân sự thành công.');
      }
      setEmail('');
      await fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await tournamentsApi.removeTournamentStaff(id, userId);
      toast.success('Đã xóa nhân sự.');
      await fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleReinvite = async (referee: TournamentReferee) => {
    try {
      setBusyRefereeId(referee.id);
      await tournamentsApi.addTournamentReferee(id, referee.email);
      toast.success('Đã gửi lại lời mời trọng tài.');
      await fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyRefereeId(null);
    }
  };

  const handleRevokeInvite = async (referee: TournamentReferee) => {
    try {
      setBusyRefereeId(referee.id);
      await tournamentsApi.removeTournamentRefereeInvite(id, referee.id);
      toast.success('Đã thu hồi lời mời trọng tài.');
      await fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyRefereeId(null);
    }
  };

  const filterEmptyLabelMap: Record<typeof refereeFilter, string> = {
    all: 'Chưa có trọng tài nào. Hãy gửi lời mời đầu tiên bằng email ở trên.',
    INVITED: 'Hiện không còn lời mời nào đang chờ phản hồi.',
    ACCEPTED: 'Chưa có trọng tài nào nhận lời để sẵn sàng điều hành trận.',
    DECLINED: 'Chưa có trọng tài nào từ chối lời mời.',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
      <div className="border-b pb-2 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quản lý phân quyền</h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Mời đúng người vào đúng vai trò để vận hành giải rõ ràng và có kiểm soát.
          </p>
        </div>
        <div className="flex border-b border-slate-200 gap-6 mt-2">
          {(['organizers', 'referees', 'viewers'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={
                'pb-3 font-bold text-sm transition-all border-b-2 -mb-[2px] ' +
                (subTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800')
              }
            >
              {tab === 'organizers' ? 'Ban tổ chức' : tab === 'referees' ? 'Trọng tài' : 'Khách xem'}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'referees' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700">Đang chờ phản hồi</div>
              <div className="mt-2 text-3xl font-black text-amber-800">{pendingReferees.length}</div>
              <div className="mt-1 text-xs text-amber-700">Đã mời nhưng chưa nhận vai trò.</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Đã nhận lời</div>
              <div className="mt-2 text-3xl font-black text-emerald-800">{acceptedReferees.length}</div>
              <div className="mt-1 text-xs text-emerald-700">Có thể phân công vào các trận đấu.</div>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-rose-700">Đã từ chối</div>
              <div className="mt-2 text-3xl font-black text-rose-800">{declinedReferees.length}</div>
              <div className="mt-1 text-xs text-rose-700">Cần mời người thay thế nếu vẫn thiếu.</div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
            {refereeFilter === 'INVITED'
              ? 'Các lời mời đang chờ phản hồi có thể được thu hồi nếu bạn muốn đổi người.'
              : refereeFilter === 'DECLINED'
                ? 'Với người đã từ chối, bạn có thể mời lại nếu đã trao đổi xong hoặc họ đổi quyết định.'
                : refereeFilter === 'ACCEPTED'
                  ? 'Người đã nhận lời là nguồn trọng tài sẵn sàng để bạn gán vào lịch trận.'
                  : 'Theo dõi toàn bộ trạng thái trọng tài tại đây để tránh thiếu người ở ngày thi đấu.'}
          </div>
        </div>
      ) : null}

      <form
        onSubmit={handleAdd}
        className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex sm:flex-row items-end gap-4 max-w-xl"
      >
        <div className="flex-1 w-full space-y-1">
          <label className="block text-xs font-bold text-slate-700">
            {subTab === 'referees' ? 'Email trọng tài' : 'Email người dùng'}
          </label>
          <Input
            type="email"
            placeholder={subTab === 'referees' ? 'trongtai@example.com' : 'email@example.com'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white text-sm h-10 w-full"
            required
          />
        </div>
        <Button
          type="submit"
          disabled={isAdding || !email.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-5 rounded-xl shrink-0"
        >
          {isAdding
            ? subTab === 'referees'
              ? 'Đang gửi mời...'
              : 'Đang thêm...'
            : subTab === 'referees'
              ? 'Gửi lời mời'
              : 'Thêm'}
        </Button>
      </form>

      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
          {subTab === 'organizers' ? (
            <Users className="w-5 h-5 text-indigo-600" />
          ) : subTab === 'referees' ? (
            <Shield className="w-5 h-5 text-blue-600" />
          ) : (
            <UserCheck className="w-5 h-5 text-violet-600" />
          )}
          {subTab === 'referees'
            ? 'Danh sách trọng tài và trạng thái phản hồi'
            : `Danh sách ${subTab === 'organizers' ? 'ban tổ chức' : 'khách xem'}`}
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tải dữ liệu phân quyền...
          </div>
        ) : subTab === 'referees' ? (
          <>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'Tất cả', count: referees.length },
                { key: 'INVITED', label: 'Chờ phản hồi', count: pendingReferees.length },
                { key: 'ACCEPTED', label: 'Đã nhận lời', count: acceptedReferees.length },
                { key: 'DECLINED', label: 'Đã từ chối', count: declinedReferees.length },
              ].map((filterOption) => (
                <button
                  key={filterOption.key}
                  type="button"
                  onClick={() => setRefereeFilter(filterOption.key as typeof refereeFilter)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    refereeFilter === filterOption.key
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {filterOption.label} ({filterOption.count})
                </button>
              ))}
            </div>

            {displayedReferees.length === 0 ? (
              <div className="text-center py-10 text-slate-400 italic text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                {filterEmptyLabelMap[refereeFilter]}
              </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {displayedReferees.map((referee) => {
                const meta = refereeStatusMeta[referee.status] || refereeStatusMeta.INVITED;
                const isBusy = busyRefereeId === referee.id;
                return (
                  <div
                    key={referee.id}
                    className={`rounded-2xl border p-4 shadow-sm ${meta.cardClassName}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 shrink-0 uppercase overflow-hidden">
                        {referee.avatarUrl ? (
                          <img src={referee.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          referee.fullName?.charAt(0) || '?'
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-sm truncate">{referee.fullName}</div>
                            <div className="text-[11px] text-slate-500 mt-1 truncate">{referee.email}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {referee.status === 'ACCEPTED'
                                ? 'Đã sẵn sàng để được gán trận.'
                                : referee.status === 'DECLINED'
                                  ? 'Người này đã từ chối lời mời hiện tại.'
                                  : 'Đang chờ người dùng phản hồi lời mời.'}
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${meta.badgeClassName}`}>
                            {meta.icon}
                            {meta.label}
                          </span>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          {referee.status === 'DECLINED' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmAction({ type: 'reinvite', referee })}
                              disabled={isBusy}
                              className="h-8 border-amber-200 text-amber-700 hover:bg-amber-50 font-bold"
                            >
                              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1.5" />}
                              Mời lại
                            </Button>
                          ) : null}
                          {referee.status === 'INVITED' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmAction({ type: 'revoke', referee })}
                              disabled={isBusy}
                              className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 font-bold"
                            >
                              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
                              Thu hồi
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-10 text-slate-400 italic text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            Chưa có ai. Nhập email bên trên để thêm vào vai trò này.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredStaff.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative group overflow-hidden"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 shrink-0 uppercase overflow-hidden">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    member.fullName?.charAt(0) || '?'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 text-xs truncate">{member.fullName}</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate">{member.email}</div>
                </div>
                <button
                  onClick={() => handleRemove(member.userId)}
                  className="text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  title="Xóa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <ModalContent className="max-w-md rounded-2xl bg-white p-6">
          <ModalHeader>
            <ModalTitle className="text-slate-900">
              {confirmAction?.type === 'revoke' ? 'Thu hồi lời mời trọng tài?' : 'Gửi lại lời mời trọng tài?'}
            </ModalTitle>
            <ModalDescription className="text-slate-500">
              {confirmAction?.type === 'revoke'
                ? `Lời mời đang chờ phản hồi của ${confirmAction?.referee.fullName} sẽ bị xóa khỏi danh sách chờ.`
                : `Hệ thống sẽ gửi lại lời mời trọng tài cho ${confirmAction?.referee.fullName} qua email ${confirmAction?.referee.email}.`}
            </ModalDescription>
          </ModalHeader>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {confirmAction?.type === 'revoke'
              ? 'Chỉ nên thu hồi khi bạn đã quyết định đổi người hoặc lời mời được gửi nhầm.'
              : 'Chỉ nên mời lại khi bạn đã trao đổi trước với người được mời để tránh gây phiền.'}
          </div>
          <ModalFooter className="mt-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)} className="border-slate-200">
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === 'revoke') {
                  void handleRevokeInvite(confirmAction.referee).finally(() => setConfirmAction(null));
                  return;
                }
                void handleReinvite(confirmAction.referee).finally(() => setConfirmAction(null));
              }}
              disabled={Boolean(confirmAction && busyRefereeId === confirmAction.referee.id)}
              className={
                confirmAction?.type === 'revoke'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }
            >
              {confirmAction && busyRefereeId === confirmAction.referee.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : confirmAction?.type === 'revoke' ? (
                'Xác nhận thu hồi'
              ) : (
                'Xác nhận mời lại'
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
