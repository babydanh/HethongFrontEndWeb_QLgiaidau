'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { tournamentsApi } from '@/features/tournaments/api';
import { usersApi, UserProfile } from '@/features/users/api';
import { getErrorMessage } from '@/utils/error';
import { trimAndNormalizeSpaces } from '@/utils/string';
import {
  Check,
  Loader2,
  Users,
  Search,
  Trash2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  tournamentId: string;
  inviteCode?: string;
  divisionId?: string;
  teamSize: number;
  maxTeamSize?: number;
  maxReserve?: number;
  registrationMode?: string;
}

interface TeamMember {
  userId: string;
  fullName: string;
  role: 'MAIN' | 'RESERVE';
}

export default function TeamRegistrationFlow({
  tournamentId,
  inviteCode,
  divisionId,
  teamSize,
  maxTeamSize,
  maxReserve = 0,
  registrationMode,
}: Props) {
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cap = maxTeamSize ?? teamSize + maxReserve;
  const mainCount = members.filter((m) => m.role === 'MAIN').length;
  const reserveCount = members.filter((m) => m.role === 'RESERVE').length;
  const isFull = members.length >= cap;

  const doSearch = async () => {
    const q = trimAndNormalizeSpaces(search);
    if (!q) return;
    setLoading(true);
    try {
      const res = await usersApi.searchUsersByQuery(q);
      const list = (Array.isArray(res) ? res : []) as UserProfile[];
      setResults(list.filter((u) => !members.some((m) => m.userId === u.id)));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const addMember = (user: UserProfile, role: 'MAIN' | 'RESERVE') => {
    if (isFull) {
      toast.error(`Đội đã đủ ${cap} thành viên.`);
      return;
    }
    if (role === 'MAIN' && mainCount >= teamSize) {
      toast.error(`Đội hình chính thức tối đa ${teamSize} người. Thêm vào dự bị.`);
      role = 'RESERVE';
    }
    if (role === 'RESERVE' && reserveCount >= maxReserve) {
      toast.error(`Chỉ được tối đa ${maxReserve} dự bị.`);
      return;
    }
    setMembers((prev) => [
      ...prev,
      { userId: user.id, fullName: user.fullName || user.email || 'Thành viên', role },
    ]);
    setSearch('');
    setResults([]);
  };

  const removeMember = (userId: string) => {
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  };

  const submit = async () => {
    if (!trimAndNormalizeSpaces(teamName)) {
      toast.error('Vui lòng nhập tên đội.');
      return;
    }
    if (mainCount < teamSize) {
      toast.error(`Đội cần tối thiểu ${teamSize} cầu thủ chính thức (hiện có ${mainCount}).`);
      return;
    }
    setSubmitting(true);
    try {
      const memberIds = members.map((m) => m.userId);
      const res = await tournamentsApi.register(tournamentId, {
        teamName: trimAndNormalizeSpaces(teamName),
        inviteCode,
        divisionId,
        tournamentDivisionId: divisionId,
        memberIds,
        rankingConsent: true,
      });
      const payload = res.data;
      const participantId = payload?.participant?.id;
      const teamInviteLink = payload?.teamInviteLink;
      if (participantId) {
        router.push(
          `/payments/checkout?participantId=${participantId}&tournamentId=${tournamentId}&divisionId=${divisionId || ''}`,
        );
      } else if (teamInviteLink) {
        toast.success('Đăng ký thành công! Hãy mời thêm thành viên qua link.');
        router.refresh();
      } else {
        toast.success(registrationMode === 'APPROVAL' ? 'Đã gửi yêu cầu chờ BTC duyệt.' : 'Đăng ký thành công!');
        router.refresh();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-bold text-emerald-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Đăng ký đội bóng đá
        </p>
        <p className="mt-1 text-xs font-semibold text-emerald-700">
          Đội hình chính thức tối thiểu <b>{teamSize}</b> người · Dự bị tối đa <b>{maxReserve}</b> · Tổng tối đa <b>{cap}</b> người
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Tên đội</label>
        <Input
          placeholder="VD: FC Sao Vàng"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Users className="w-4 h-4" /> Danh sách thành viên ({members.length}/{cap})
        </label>

        {members.length > 0 && (
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{m.fullName}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    m.role === 'MAIN' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {m.role === 'MAIN' ? 'Chính thức' : 'Dự bị'}
                  </span>
                </div>
                <button onClick={() => removeMember(m.userId)} className="text-slate-400 hover:text-rose-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Tìm thành viên theo tên / email / SĐT"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          />
          <Button type="button" onClick={doSearch} disabled={loading} variant="outline">
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {results.length > 0 && (
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-auto">
            {results.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-semibold text-slate-800">
                  {u.fullName || u.email || 'Người dùng'}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => addMember(u, 'MAIN')}
                    disabled={mainCount >= teamSize}
                    className="text-[11px] font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-40"
                  >
                    Chính thức
                  </button>
                  <button
                    onClick={() => addMember(u, 'RESERVE')}
                    disabled={reserveCount >= maxReserve}
                    className="text-[11px] font-bold px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-40"
                  >
                    Dự bị
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Đăng ký đội
      </Button>
      <p className="text-xs text-slate-400 text-center">
        Sau khi đăng ký, bạn có thể mời thêm thành viên qua link hoặc email/SĐT.
      </p>
    </div>
  );
}
