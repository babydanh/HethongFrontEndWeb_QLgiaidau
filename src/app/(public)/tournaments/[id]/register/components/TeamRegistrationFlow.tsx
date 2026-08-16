'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { footballTeamsApi, tournamentsApi, type FootballRosterStatus, type FootballTeam } from '@/features/tournaments/api';
import { getErrorMessage } from '@/utils/error';
import { Check, Loader2, Plus, ShieldCheck, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  tournamentId: string;
  inviteCode?: string;
  divisionId?: string;
  categoryId?: string;
  currentUserId?: string;
  participantId?: string;
  participantTeamId?: string | null;
  rosterLockedAt?: string | null;
  teamSize: number;
  maxTeamSize?: number;
  maxReserve?: number;
  registrationMode?: string;
  onRegistrationChanged?: () => Promise<void> | void;
}

export default function TeamRegistrationFlow({
  tournamentId, inviteCode, divisionId, categoryId, currentUserId, participantId, participantTeamId, rosterLockedAt, teamSize, maxTeamSize, maxReserve = 0, registrationMode,
  onRegistrationChanged,
}: Props) {
  const router = useRouter();
  const [teams, setTeams] = useState<FootballTeam[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<NonNullable<FootballTeam['members']>>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedReserveIds, setSelectedReserveIds] = useState<string[]>([]);
  const [rosterStatus, setRosterStatus] = useState<FootballRosterStatus | null>(null);
  const [rosterLoading, setRosterLoading] = useState(Boolean(participantId));
  const cap = maxTeamSize ?? teamSize + maxReserve;

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    footballTeamsApi.get(selectedId).then(async (res) => {
      if (!active) return;
      const members = (res.data?.members ?? []).filter((member) => member.status === undefined || member.status === 'ACTIVE');
      setTeamMembers(members);
      const ids = members.map((member) => member.userId);
      const orderedIds = [
        ...(currentUserId && ids.includes(currentUserId) ? [currentUserId] : []),
        ...ids.filter((id) => id !== currentUserId),
      ];
      if (participantId) {
        try {
          const status = (await tournamentsApi.getFootballRosterStatus(tournamentId, participantId)).data;
          if (!active) return;
          setRosterStatus(status);
          setSelectedMemberIds(status.roster.filter((row) => row.role === 'MAIN').map((row) => row.userId).filter((id) => ids.includes(id)));
          setSelectedReserveIds(status.roster.filter((row) => row.role === 'RESERVE').map((row) => row.userId).filter((id) => ids.includes(id)));
        } catch {
          if (active) {
            setSelectedMemberIds(orderedIds.slice(0, teamSize));
            setSelectedReserveIds([]);
          }
        }
      } else {
        setSelectedMemberIds(orderedIds.slice(0, teamSize));
        setSelectedReserveIds([]);
      }
    }).catch(() => { if (active) { setTeamMembers([]); setSelectedMemberIds([]); } }).finally(() => { if (active) setRosterLoading(false); });
    return () => { active = false; };
  }, [currentUserId, participantId, selectedId, teamSize, tournamentId]);

  useEffect(() => {
    let active = true;
    footballTeamsApi.listMine().then((res) => {
      if (!active) return;
      const rows = (res.data ?? []).map((row) => row.team).filter((team) => team.status === 'ACTIVE' && team.categoryId === categoryId);
      setTeams(rows);
      const preferred = participantTeamId ? rows.find((row) => row.id === participantTeamId) : undefined;
      if (preferred || rows[0]) setSelectedId((preferred ?? rows[0]).id);
    }).catch(() => { if (active) setTeams([]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [categoryId, participantTeamId]);

  const createTeam = async () => {
    const name = newName.trim();
    if (!name || !categoryId) return toast.error('Vui lòng nhập tên đội và chọn đúng môn bóng đá.');
    setSaving(true);
    try {
      const res = await footballTeamsApi.create({ name, categoryId });
      const team = res.data;
      setTeams((current) => [team, ...current]);
      setSelectedId(team.id);
      setNewName('');
      toast.success('Đã tạo đội. Hãy vào trang đội để mời đủ thành viên.');
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setSaving(false); }
  };

  const submit = async () => {
    const team = teams.find((item) => item.id === selectedId);
    if (!team) return toast.error('Hãy chọn hoặc tạo một đội bóng trước.');
    setSaving(true);
    try {
      if (participantId) {
        await tournamentsApi.updateFootballRoster(tournamentId, participantId, {
          memberIds: selectedMemberIds,
          reserveMemberIds: selectedReserveIds,
        });
        toast.success(selectedMemberIds.length < teamSize ? 'Đã lưu roster nháp.' : 'Đã cập nhật roster đội.');
        await onRegistrationChanged?.();
        router.refresh();
        return;
      }
      const res = await tournamentsApi.register(tournamentId, {
        teamName: team.name,
        footballTeamId: team.id,
        memberIds: selectedMemberIds,
        reserveMemberIds: selectedReserveIds,
        inviteCode,
        divisionId,
        tournamentDivisionId: divisionId,
        rankingConsent: true,
      });
      const createdParticipantId = res.data?.participant?.id;
      if (createdParticipantId) router.push(`/payments/checkout?participantId=${createdParticipantId}&tournamentId=${tournamentId}&divisionId=${divisionId || ''}`);
      else {
        const isDraft = selectedMemberIds.length < teamSize;
        toast.success(
          isDraft
            ? 'Đã lưu đăng ký nháp. Hãy bổ sung đủ đội hình trước khi BTC khóa roster.'
            : registrationMode === 'APPROVAL'
              ? 'Đã gửi yêu cầu chờ BTC duyệt.'
            : 'Đăng ký đội thành công!',
        );
        await onRegistrationChanged?.();
        router.refresh();
      }
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-emerald-900"><ShieldCheck className="h-4 w-4" /> Đăng ký bằng đội bóng</p>
        <p className="mt-1 text-xs font-semibold text-emerald-700">Đội hình chính tối thiểu <b>{teamSize}</b> người · dự bị tối đa <b>{maxReserve}</b> · tổng tối đa <b>{cap}</b>. Có thể lưu nháp trước; BTC chỉ khóa khi đủ đội hình và xác nhận.</p>
      </div>
      {participantId && (rosterStatus?.entry?.status === 'LOCKED' || rosterLockedAt) && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Roster đã khóa, chỉ có thể xem đội hình.</p>}
      {loading ? <div className="flex items-center justify-center py-8 text-sm text-slate-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải đội của bạn…</div> : (
        <>
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-700"><Users className="h-4 w-4" /> Đội đủ điều kiện</p>
            {teams.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 px-4 py-5 text-center text-xs font-semibold text-slate-500">Bạn chưa có đội bóng phù hợp với môn này.</p> : (
              <div className="grid gap-2">
                {teams.map((team) => <button key={team.id} type="button" disabled={Boolean(participantId)} onClick={() => setSelectedId(team.id)} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${selectedId === team.id ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-emerald-300'} disabled:cursor-not-allowed disabled:opacity-70`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-500">{team.name.slice(0, 2).toUpperCase()}</div>
                  <span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-900">{team.name}</b><small className="text-xs font-semibold text-slate-500">{team.membership?.role === 'PLAYER' ? 'Thành viên' : 'Có quyền đăng ký'} · quản lý roster tại trang đội</small></span>
                  {selectedId === team.id && <Check className="h-5 w-5 text-emerald-600" />}
                </button>)}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Tạo đội nhanh</p>
            <div className="flex gap-2"><Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Tên đội, ví dụ FC Sao Vàng" /><Button type="button" onClick={createTeam} disabled={saving || !newName.trim()} variant="outline"><Plus className="h-4 w-4" /> Tạo</Button></div>
            <p className="mt-2 text-[11px] font-semibold text-slate-400">Sau khi tạo, hãy mời thành viên và hoàn thiện đội hình tại trang quản lý đội.</p>
          </div>
          {teamMembers.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-1 text-sm font-bold text-slate-800">Đội hình đăng ký</p>
              <p className="mb-3 text-xs font-semibold text-slate-500">Chọn tối đa {teamSize} cầu thủ chính và tối đa {maxReserve} dự bị. Có thể bổ sung sau khi đăng ký nháp.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {teamMembers.map((member) => {
                  const isMain = selectedMemberIds.includes(member.userId);
                  const isReserve = selectedReserveIds.includes(member.userId);
                  return <div key={member.userId} className="flex items-center gap-2 rounded-md border border-slate-100 px-2 py-2 text-xs font-semibold text-slate-700">
                    <span className="min-w-0 flex-1 truncate">{member.profile?.fullName || member.userId.slice(0, 8)}</span>
                    {member.role !== 'PLAYER' && <span className="text-[10px] text-slate-400">{member.role}</span>}
                    <button type="button" disabled={Boolean(rosterStatus?.entry?.status === 'LOCKED' || rosterLockedAt) || (!isMain && selectedMemberIds.length >= teamSize)} className={`rounded px-2 py-1 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-40 ${isMain ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`} onClick={() => {
                      setSelectedMemberIds((current) => isMain ? current.filter((id) => id !== member.userId) : [...current.filter((id) => id !== member.userId), member.userId]);
                      setSelectedReserveIds((current) => current.filter((id) => id !== member.userId));
                    }}>Chính</button>
                    <button type="button" disabled={Boolean(rosterStatus?.entry?.status === 'LOCKED' || rosterLockedAt) || (!isReserve && selectedReserveIds.length >= maxReserve)} className={`rounded px-2 py-1 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-40 ${isReserve ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`} onClick={() => {
                      setSelectedReserveIds((current) => isReserve ? current.filter((id) => id !== member.userId) : [...current.filter((id) => id !== member.userId), member.userId]);
                      setSelectedMemberIds((current) => current.filter((id) => id !== member.userId));
                    }}>Dự bị</button>
                    </div>;
                })}
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-500">Đang chọn: {selectedMemberIds.length} chính · {selectedReserveIds.length}/{maxReserve} dự bị.</p>
            </div>
          )}
        </>
      )}
      <Button type="button" onClick={submit} disabled={saving || loading || rosterLoading || Boolean(rosterStatus?.entry?.status === 'LOCKED' || rosterLockedAt) || !selectedId || selectedMemberIds.length === 0 || selectedReserveIds.length > maxReserve} className="w-full bg-emerald-600 hover:bg-emerald-700">{saving || rosterLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {participantId ? 'Cập nhật roster' : selectedMemberIds.length < teamSize ? 'Lưu đăng ký nháp' : 'Đăng ký đội đã chọn'}</Button>
    </div>
  );
}
