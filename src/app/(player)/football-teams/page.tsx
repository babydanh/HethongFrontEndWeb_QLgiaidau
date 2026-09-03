'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { footballTeamsApi, type FootballTeam, type FootballTeamMemberCandidate } from '@/features/tournaments/api';
import { categoriesApi, type Category } from '@/features/categories/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getErrorMessage } from '@/utils/error';
import { uploadApi } from '@/features/upload/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { RankAvatar } from '@/components/ui/RankAvatar';
import { Shield, Users, Plus, Search, UserPlus, Save, Trash2, Camera, Loader2, Trophy, Flame, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FootballTeamsPage() {
  const translate = useTranslations('FootballTeams');
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
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => teams.find((team) => team.id === selectedId) ?? null, [teams, selectedId]);
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?.id;
  const allMembers = selected?.members ?? [];
  const currentMembershipRole = selected?.members?.find((member) => member.userId === currentUserId)?.role ?? selected?.membership?.role;
  const canManageTeam = currentMembershipRole === 'CAPTAIN' || currentMembershipRole === 'MANAGER';
  const activeMembers = allMembers.filter((member) => member.status === undefined || member.status === 'ACTIVE');
  const invitedMembers = allMembers.filter((member) => member.status !== undefined && member.status !== 'ACTIVE');
  const footballCategory = categories.find((category) => category.isActive && /football|bóng đá|soccer/i.test(`${category.name} ${category.slug ?? ''}`));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [teamRes, categoryRes] = await Promise.all([footballTeamsApi.listMine(), categoriesApi.getCategories()]);
      const activeTeams = (teamRes.data ?? []).map((item) => item.team).filter((team) => team.status === 'ACTIVE');
      setTeams(activeTeams);
      setCategories(categoryRes.data ?? []);
      const selectedTeam = activeTeams.find((team) => team.id === requestedTeamId) ?? activeTeams[0];
      if (selectedTeam) {
        setSelectedId(selectedTeam.id);
        setName(selectedTeam.name);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [requestedTeamId]);

  useEffect(() => {
    const task = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(task);
  }, [load]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    footballTeamsApi.get(selectedId).then((response) => {
      const detail = response.data;
      if (cancelled || !detail?.members) return;
      setTeams((current) => current.map((team) => (team.id === selectedId ? { ...team, ...detail, members: detail.members } : team)));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [selectedId]);

  // Reset logo preview when selected team changes
  useEffect(() => {
    setLogoPreview(null);
  }, [selectedId]);

  const create = async () => {
    if (!newName.trim() || !footballCategory?.id) return toast.error(translate('categoryNotFound'));
    setSaving(true);
    try {
      const response = await footballTeamsApi.create({ name: newName.trim(), categoryId: footballCategory.id });
      const team = response.data;
      setTeams((current) => [team, ...current]);
      setSelectedId(team.id);
      setName(team.name);
      setNewName('');
      toast.success(translate('teamCreated'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!canManageTeam || !selected || !name.trim()) return;
    setSaving(true);
    try {
      const response = await footballTeamsApi.update(selected.id, { name: name.trim() });
      setTeams((current) => current.map((team) => team.id === selected.id ? response.data : team));
      setName(response.data.name);
      toast.success(translate('teamNameSaved'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    if (!canManageTeam || !selected) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 5MB.');
      return;
    }

    // Hiển thị preview ngay lập tức
    const localUrl = URL.createObjectURL(file);
    setLogoPreview(localUrl);
    setUploadingLogo(true);

    try {
      const uploaded = await uploadApi.uploadImage(file);
      const logoUrl = uploaded.url;
      const response = await footballTeamsApi.update(selected.id, { logoUrl });
      const updatedTeam = response.data || { ...selected, logoUrl };
      setTeams((current) => current.map((team) => (team.id === selected.id ? { ...team, ...updatedTeam, logoUrl } : team)));
      setLogoPreview(null);
      toast.success(translate('logoUpdated'));
    } catch (error) {
      setLogoPreview(null);
      toast.error(getErrorMessage(error));
    } finally {
      setUploadingLogo(false);
      URL.revokeObjectURL(localUrl);
    }
  };

  const search = async () => {
    if (!canManageTeam || !selected || candidateQuery.trim().length < 2) return setCandidates([]);
    try {
      const response = await footballTeamsApi.searchCandidates(selected.id, candidateQuery.trim());
      setCandidates(response.data ?? []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const invite = async (userId: string) => {
    if (!canManageTeam || !selected) return;
    try {
      await footballTeamsApi.invite(selected.id, userId);
      setCandidates((current) => current.filter((candidate) => candidate.id !== userId));
      toast.success(translate('inviteSent'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const remove = async (userId: string) => {
    if (!canManageTeam || !selected || !window.confirm(translate('confirmRemoveMember'))) return;
    try {
      await footballTeamsApi.removeMember(selected.id, userId);
      await load();
      toast.success(translate('memberRemoved'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const cancelInvite = async (userId: string) => {
    if (!canManageTeam || !selected) return;
    try {
      await footballTeamsApi.cancelInvite(selected.id, userId);
      await load();
      toast.success(translate('inviteCanceled'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const changeRole = async (userId: string, role: 'CAPTAIN' | 'MANAGER' | 'PLAYER') => {
    if (!canManageTeam || !selected) return;
    try {
      await footballTeamsApi.updateMember(selected.id, userId, role);
      await load();
      toast.success(translate('roleUpdated'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const currentLogo = logoPreview || selected?.logoUrl;
  const captainMember = allMembers.find((m) => m.role === 'CAPTAIN');
  const isCaptainCurrentUser = captainMember?.userId === currentUserId;
  const captainDisplayName = captainMember?.profile?.fullName || (isCaptainCurrentUser ? (currentUser?.fullName || 'Bạn') : 'Đội trưởng');

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header đồng bộ Sporto Brand Vibe */}
      <header className="border-b border-blue-100 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
          {translate('football')}
        </div>
        <h1 className="mt-2 text-3xl font-black text-slate-950 tracking-tight">{translate('title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{translate('description')}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
        {/* Sidebar: Danh sách đội */}
        <aside className="space-y-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-black text-slate-900 text-sm tracking-tight">{translate('activeTeams')}</h2>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-100">
              {teams.length}/3
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span>{translate('loading')}</span>
            </div>
          ) : teams.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-500">
              {translate('noTeams')}
            </p>
          ) : (
            <div className="space-y-2">
              {teams.map((team) => {
                const isSelected = selectedId === team.id;
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(team.id);
                      setName(team.name);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-1 ring-blue-400'
                        : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50/60'
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 text-xs font-black text-white shadow-2xs">
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} className="h-full w-full object-cover" />
                      ) : (
                        team.name.slice(0, 2).toUpperCase()
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm font-bold text-slate-900">{team.name}</b>
                      <small className="text-[11px] font-semibold text-blue-600">
                        ELO {team.rank?.eloPoints ?? 1000}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Form tạo đội */}
          <div className="border-t border-slate-100 pt-3">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder={translate('newTeamName')}
              className="text-xs"
            />
            <Button
              className="mt-2 w-full gap-1.5 font-bold"
              disabled={saving || !newName.trim()}
              onClick={create}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {translate('createTeam')}
            </Button>
          </div>
        </aside>

        {/* Khu vực chi tiết đội bóng */}
        <section className="space-y-6">
          {!selected ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
              {translate('selectOrCreate')}
            </div>
          ) : (
            <>
              {/* Card Header Đội bóng & Đổi Logo */}
              <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-xs">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploadingLogo || !canManageTeam}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadLogo(file);
                    event.currentTarget.value = '';
                  }}
                />

                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Team Logo Badge */}
                    <div className="relative shrink-0">
                      <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-blue-200 bg-linear-to-br from-blue-500 to-indigo-600 shadow-sm">
                        {currentLogo ? (
                          <img
                            src={currentLogo}
                            alt={translate('teamLogoAlt')}
                            className="h-full w-full object-cover bg-white"
                          />
                        ) : (
                          <span className="text-2xl font-black text-white tracking-wider">
                            {selected.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}

                        {uploadingLogo && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 text-[9px] font-bold text-white">
                            <Loader2 className="h-5 w-5 animate-spin mb-0.5" />
                            Đang lưu…
                          </div>
                        )}
                      </div>

                      {/* Nút bấm Camera nhỏ đè ở góc Logo */}
                      {canManageTeam && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingLogo}
                          title={translate('clickToChangeLogo')}
                          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-transform active:scale-95"
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {translate('team')}
                        </span>
                        {captainMember && (
                          <span className="text-[11px] font-semibold text-slate-500">
                            · Đội trưởng:{' '}
                            <b className="text-slate-800">{captainDisplayName}</b>
                            {isCaptainCurrentUser && (
                              <span className="ml-1 rounded bg-blue-100 px-1 py-0.2 text-[9px] font-bold text-blue-700">
                                {translate('you')}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <h2 className="mt-0.5 text-2xl font-black text-slate-950 tracking-tight">{selected.name}</h2>
                      
                      {/* Nút "Đổi logo đội" rõ ràng công khai */}
                      {canManageTeam && (
                        <div className="mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingLogo}
                            onClick={() => fileInputRef.current?.click()}
                            className="h-7 text-xs font-bold gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {uploadingLogo ? 'Đang tải lên…' : 'Đổi logo đội'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badge ELO và Thành tích */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-bold text-blue-700 shadow-2xs">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span>ELO {selected.rank?.eloPoints ?? 1000}</span>
                    </div>
                    {selected.rank?.winStreak && selected.rank.winStreak >= 2 && (
                      <div className="flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-bold text-amber-700">
                        <Flame className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span>{selected.rank.winStreak}W</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chỉnh sửa tên đội */}
                <div className="mt-5 flex gap-2">
                  <Input
                    value={name}
                    readOnly={!canManageTeam}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Tên đội bóng"
                    className="max-w-md"
                  />
                  {canManageTeam && (
                    <Button
                      disabled={saving || name.trim() === selected.name || !name.trim()}
                      onClick={save}
                      className="gap-1.5 font-bold"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {translate('save')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Danh sách thành viên */}
              <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <h2 className="font-black text-slate-950 text-base tracking-tight">
                      {translate('members', {
                        count: activeMembers.length,
                        invited: invitedMembers.length > 0 ? translate('invitedCount', { count: invitedMembers.length }) : '',
                      })}
                    </h2>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {allMembers.map((member) => {
                    const invited = member.status !== undefined && member.status !== 'ACTIVE';
                    const isCurrentUser = member.userId === currentUserId;
                    const realName = member.profile?.fullName || (isCurrentUser ? currentUser?.fullName : null);
                    const displayName = realName || `Cầu thủ #${member.userId.slice(0, 6)}`;
                    const avatarUrl = member.profile?.avatarUrl || (isCurrentUser ? currentUser?.avatarUrl : null);
                    const isCaptain = member.role === 'CAPTAIN';

                    return (
                      <div
                        key={member.userId}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                          invited
                            ? 'border-amber-200 bg-amber-50/50'
                            : isCaptain
                              ? 'border-blue-200 bg-blue-50/30 shadow-2xs'
                              : 'border-slate-200 bg-white'
                        }`}
                      >
                        {/* Avatar & Captain Armband Badge */}
                        <div className="relative shrink-0">
                          <RankAvatar
                            src={avatarUrl}
                            name={displayName}
                            size="md"
                            className="h-11 w-11 shadow-xs"
                            ringClassName="ring-1 ring-blue-100"
                          />
                          {isCaptain && (
                            <span
                              className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-amber-500 text-[9px] font-black text-slate-950 shadow-xs"
                              title="Đội trưởng"
                            >
                              C
                            </span>
                          )}
                        </div>

                        {/* Tên & Vai trò */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <b className="block truncate text-xs font-extrabold text-slate-900" title={displayName}>
                              {displayName}
                            </b>
                            {isCurrentUser && (
                              <span className="rounded bg-blue-100 px-1 py-0.2 text-[9px] font-bold text-blue-700">
                                {translate('you')}
                              </span>
                            )}
                          </div>

                          {invited ? (
                            <span className="mt-0.5 block text-[11px] italic text-amber-600 font-medium">
                              {translate('invitedWaiting')}
                            </span>
                          ) : canManageTeam && !isCurrentUser ? (
                            <select
                              value={member.role}
                              onChange={(event) =>
                                void changeRole(
                                  member.userId,
                                  event.target.value as 'CAPTAIN' | 'MANAGER' | 'PLAYER'
                                )
                              }
                              className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
                            >
                              <option value="CAPTAIN">{translate('captain')}</option>
                              <option value="MANAGER">{translate('manager')}</option>
                              <option value="PLAYER">{translate('player')}</option>
                            </select>
                          ) : (
                            <span className="mt-0.5 inline-block text-[11px] font-bold text-slate-500">
                              {member.role === 'CAPTAIN'
                                ? '⭐ ' + translate('captain')
                                : member.role === 'MANAGER'
                                  ? translate('manager')
                                  : translate('player')}
                            </span>
                          )}
                        </div>

                        {/* Thao tác xóa / hủy */}
                        {canManageTeam && !isCurrentUser && (
                          <div className="flex items-center gap-1">
                            {invited ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void cancelInvite(member.userId)}
                                className="h-7 text-[11px] text-amber-700 hover:bg-amber-100"
                              >
                                {translate('cancelInvite')}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => void remove(member.userId)}
                                className="h-7 w-7 p-0"
                                title={translate('removeMember')}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Khu vực mời thành viên */}
              {canManageTeam && (
                <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                    <h2 className="font-black text-slate-950 text-base tracking-tight">{translate('inviteMembers')}</h2>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Input
                      value={candidateQuery}
                      onChange={(event) => setCandidateQuery(event.target.value)}
                      placeholder={translate('searchPlaceholder')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void search();
                      }}
                    />
                    <Button onClick={search} className="gap-1.5 font-bold">
                      <Search className="h-4 w-4" />
                      {translate('search')}
                    </Button>
                  </div>

                  {candidates.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                      {candidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors"
                        >
                          <RankAvatar
                            src={candidate.avatarUrl}
                            name={candidate.fullName || candidate.email || candidate.id}
                            size="sm"
                            className="h-8 w-8"
                          />
                          <div className="min-w-0 flex-1">
                            <b className="block truncate text-xs font-bold text-slate-900">
                              {candidate.fullName || 'Người dùng'}
                            </b>
                            <small className="block truncate text-[11px] text-slate-500">{candidate.email}</small>
                          </div>
                          <Button size="sm" onClick={() => invite(candidate.id)} className="font-bold text-xs">
                            {translate('invite')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
