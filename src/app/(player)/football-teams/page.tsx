'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { footballTeamsApi, type FootballTeam, type FootballTeamMemberCandidate } from '@/features/tournaments/api';
import { categoriesApi, type Category } from '@/features/categories/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getErrorMessage } from '@/utils/error';
import { uploadApi } from '@/features/upload/api';
import { Shield, Users, Plus, Search, UserPlus, Save, LogOut, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FootballTeamsPage() {
  const searchParams = useSearchParams();
  const requestedTeamId = searchParams.get('teamId');
  const [teams, setTeams] = useState<FootballTeam[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [newName, setNewName] = useState('');
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidates, setCandidates] = useState<FootballTeamMemberCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const selected = useMemo(() => teams.find((team) => team.id === selectedId) ?? null, [teams, selectedId]);
  const allMembers = selected?.members ?? [];
  const activeMembers = allMembers.filter((member) => member.status === undefined || member.status === 'ACTIVE');
  const invitedMembers = allMembers.filter((member) => member.status !== undefined && member.status !== 'ACTIVE');
  const footballCategory = categories.find((category) => category.isActive && /football|bóng đá|soccer/i.test(`${category.name} ${category.slug ?? ''}`));

  const load = async () => {
    setLoading(true);
    try {
      const [teamRes, categoryRes] = await Promise.all([footballTeamsApi.listMine(), categoriesApi.getCategories()]);
      const activeTeams = (teamRes.data ?? []).map((item) => item.team).filter((team) => team.status === 'ACTIVE');
      setTeams(activeTeams);
      setCategories(categoryRes.data ?? []);
      const selectedTeam = activeTeams.find((team) => team.id === requestedTeamId) ?? activeTeams[0];
      if (selectedTeam) { setSelectedId(selectedTeam.id); setName(selectedTeam.name); }
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (selected) setName(selected.name); }, [selected]);
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    footballTeamsApi.get(selectedId).then((response) => {
      const detail = response.data;
      if (cancelled || !detail?.members) return;
      setTeams((current) => current.map((team) => (team.id === selectedId ? { ...team, members: detail.members } : team)));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [selectedId]);

  const create = async () => {
    if (!newName.trim() || !footballCategory?.id) return toast.error('Không tìm thấy danh mục bóng đá đang hoạt động.');
    setSaving(true);
    try {
      const response = await footballTeamsApi.create({ name: newName.trim(), categoryId: footballCategory.id });
      const team = response.data;
      setTeams((current) => [team, ...current]); setSelectedId(team.id); setNewName('');
      toast.success('Đã tạo đội bóng.');
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setSaving(false); }
  };

  const save = async () => {
    if (!selected || !name.trim()) return;
    setSaving(true);
    try { const response = await footballTeamsApi.update(selected.id, { name: name.trim() }); setTeams((current) => current.map((team) => team.id === selected.id ? response.data : team)); toast.success('Đã lưu tên đội.'); }
    catch (error) { toast.error(getErrorMessage(error)); }
    finally { setSaving(false); }
  };

  const uploadLogo = async (file: File) => {
    if (!selected) return;
    setUploadingLogo(true);
    try {
      const uploaded = await uploadApi.uploadImage(file);
      const response = await footballTeamsApi.update(selected.id, { logoUrl: uploaded.url });
      setTeams((current) => current.map((team) => team.id === selected.id ? response.data : team));
      toast.success('Đã cập nhật logo đội.');
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setUploadingLogo(false); }
  };

  const search = async () => {
    if (!selected || candidateQuery.trim().length < 2) return setCandidates([]);
    try { const response = await footballTeamsApi.searchCandidates(selected.id, candidateQuery.trim()); setCandidates(response.data ?? []); }
    catch (error) { toast.error(getErrorMessage(error)); }
  };

  const invite = async (userId: string) => {
    if (!selected) return;
    try { await footballTeamsApi.invite(selected.id, userId); setCandidates((current) => current.filter((candidate) => candidate.id !== userId)); toast.success('Đã gửi lời mời.'); }
    catch (error) { toast.error(getErrorMessage(error)); }
  };

  const remove = async (userId: string) => {
    if (!selected || !window.confirm('Xóa thành viên khỏi đội?')) return;
    try { await footballTeamsApi.removeMember(selected.id, userId); await load(); toast.success('Đã xóa thành viên.'); }
    catch (error) { toast.error(getErrorMessage(error)); }
  };

  const cancelInvite = async (userId: string) => {
    if (!selected) return;
    try { await footballTeamsApi.cancelInvite(selected.id, userId); await load(); toast.success('Đã hủy lời mời.'); }
    catch (error) { toast.error(getErrorMessage(error)); }
  };

  const changeRole = async (userId: string, role: 'CAPTAIN' | 'MANAGER' | 'PLAYER') => {
    if (!selected) return;
    try { await footballTeamsApi.updateMember(selected.id, userId, role); await load(); toast.success('Đã cập nhật vai trò.'); }
    catch (error) { toast.error(getErrorMessage(error)); }
  };

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
    <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Bóng đá</p><h1 className="mt-1 text-3xl font-black text-slate-950">Đội bóng của tôi</h1><p className="mt-2 text-sm text-slate-500">Tạo đội, quản lý thành viên và dùng chung ELO bóng đá cho các giải.</p></header>
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between"><h2 className="font-bold text-slate-900">Đội đang hoạt động</h2><span className="text-xs font-bold text-slate-400">{teams.length}/3</span></div>
        {loading ? <p className="py-6 text-center text-sm text-slate-400">Đang tải…</p> : teams.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-center text-xs text-slate-500">Chưa có đội bóng.</p> : teams.map((team) => <button key={team.id} type="button" onClick={() => setSelectedId(team.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${selectedId === team.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}><span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">{team.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{team.name}</b><small className="text-xs text-slate-500">ELO {team.rank?.eloPoints ?? 1000}</small></span></button>)}
        <div className="border-t border-slate-100 pt-3"><Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Tên đội mới" /><Button className="mt-2 w-full" disabled={saving || !newName.trim()} onClick={create}><Plus className="h-4 w-4" /> Tạo đội</Button></div>
      </aside>
      <section className="space-y-6">
        {!selected ? <div className="rounded-2xl border border-dashed p-12 text-center text-slate-500">Chọn hoặc tạo đội để quản lý.</div> : <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><label className="group relative flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-black text-slate-500"><input className="sr-only" type="file" accept="image/*" disabled={uploadingLogo} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadLogo(file); event.currentTarget.value = ''; }} />{selected.logoUrl ? <img src={selected.logoUrl} alt="Logo đội" className="h-full w-full object-cover" /> : selected.name.slice(0, 2).toUpperCase()}<span className="absolute inset-0 hidden items-center justify-center bg-slate-950/55 text-[10px] font-bold text-white group-hover:flex">Đổi</span></label><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Đội bóng</p><h2 className="mt-1 text-2xl font-black text-slate-950">{selected.name}</h2></div></div><div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"><Shield className="h-4 w-4" /> ELO {selected.rank?.eloPoints ?? 1000}</div></div><div className="mt-5 flex gap-2"><Input value={name} onChange={(event) => setName(event.target.value)} /><Button disabled={saving || name.trim() === selected.name} onClick={save}><Save className="h-4 w-4" /> Lưu</Button></div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-emerald-600" /><h2 className="font-black text-slate-950">Thành viên ({activeMembers.length}{invitedMembers.length > 0 ? ` · ${invitedMembers.length} đang mời` : ''})</h2></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{allMembers.map((member) => { const invited = member.status !== undefined && member.status !== 'ACTIVE'; return <div key={member.userId} className={`flex items-center gap-3 rounded-xl border p-3 ${invited ? 'border-amber-200 bg-amber-50/60' : 'border-slate-100'}`}><span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">{member.userId.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><b className="block truncate text-xs">{member.userId}</b>{invited ? <span className="mt-1 block text-[11px] italic text-amber-600">Đang mời - chờ xác nhận</span> : <select value={member.role} onChange={(event) => void changeRole(member.userId, event.target.value as 'CAPTAIN' | 'MANAGER' | 'PLAYER')} className="mt-1 rounded border border-slate-200 px-1.5 py-1 text-[11px] font-semibold"><option value="CAPTAIN">Đội trưởng</option><option value="MANAGER">Quản lý</option><option value="PLAYER">Cầu thủ</option></select>}</span>{invited ? <button type="button" onClick={() => void cancelInvite(member.userId)} className="text-rose-500" aria-label="Hủy lời mời"><Trash2 className="h-4 w-4" /></button> : member.role !== 'CAPTAIN' && <button type="button" onClick={() => remove(member.userId)} className="text-rose-500" aria-label="Xóa thành viên"><Trash2 className="h-4 w-4" /></button>}</div>; })}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-emerald-600" /><h2 className="font-black text-slate-950">Mời thành viên</h2></div><div className="mt-3 flex gap-2"><Input value={candidateQuery} onChange={(event) => setCandidateQuery(event.target.value)} placeholder="Tìm tên hoặc email" /><Button onClick={search}><Search className="h-4 w-4" /> Tìm</Button></div>{candidates.length > 0 && <div className="mt-3 space-y-2">{candidates.map((candidate) => <div key={candidate.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><span className="flex-1 text-sm font-semibold">{candidate.fullName || candidate.id}</span><Button size="sm" onClick={() => invite(candidate.id)}>Mời</Button></div>)}</div>}</div>
        </>}
      </section>
    </div>
  </main>;
}
