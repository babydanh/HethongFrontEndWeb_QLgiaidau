'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { footballTeamsApi, tournamentsApi, type FootballRosterStatus, type FootballTeam } from '@/features/tournaments/api';
import { getErrorMessage } from '@/utils/error';
import { Check, Loader2, Plus, ShieldCheck, Users } from 'lucide-react';
import toast from 'react-hot-toast';

import RegistrationCustomFields, { validateRegistrationResponses } from './RegistrationCustomFields';
import type { RegistrationField } from '@/features/tournaments/registration-form';

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
  isRanked?: boolean;
  rankingConsent?: boolean;
  onRankingConsentChange?: (value: boolean) => void;
  rankingConsentLabel?: string;
  rankingConsentCondition?: string;
  rankingConsentRequiredMessage?: string;
  customResponses?: Record<string, unknown>;
  onCustomResponsesChange?: (updater: (current: Record<string, unknown>) => Record<string, unknown>) => void;
  registrationFields?: RegistrationField[];
  onRegistrationChanged?: () => Promise<void> | void;
}

export default function TeamRegistrationFlow({
  tournamentId, inviteCode, divisionId, categoryId, currentUserId, participantId, participantTeamId, rosterLockedAt, teamSize, maxTeamSize, maxReserve = 0, registrationMode, isRanked = false, rankingConsent = false, onRankingConsentChange, rankingConsentLabel, rankingConsentCondition, rankingConsentRequiredMessage, customResponses, onCustomResponsesChange, registrationFields,
  onRegistrationChanged,
}: Props) {
  const router = useRouter();
  const translate = useTranslations('TeamRegistration');
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
    if (!name || !categoryId) return toast.error(translate('createTeamValidation'));
    setSaving(true);
    try {
      const res = await footballTeamsApi.create({ name, categoryId });
      const team = res.data;
      setTeams((current) => [team, ...current]);
      setSelectedId(team.id);
      setNewName('');
      toast.success(translate('teamCreated'));
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setSaving(false); }
  };

  const submit = async () => {
    const team = teams.find((item) => item.id === selectedId);
    if (!team) return toast.error(translate('selectTeam'));
    if (!participantId && isRanked && !rankingConsent) {
      return toast.error(rankingConsentRequiredMessage || translate('selectTeam'));
    }
    if (!participantId && registrationFields && registrationFields.length > 0) {
      const customValidationError = validateRegistrationResponses(registrationFields, customResponses || {});
      if (customValidationError) {
        toast.error(customValidationError);
        return;
      }
    }
    setSaving(true);
    try {
      if (participantId) {
        await tournamentsApi.updateFootballRoster(tournamentId, participantId, {
          memberIds: selectedMemberIds,
          reserveMemberIds: selectedReserveIds,
        });
        toast.success(selectedMemberIds.length < teamSize ? translate('draftRosterSaved') : translate('rosterUpdated'));
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
        rankingConsent: isRanked ? rankingConsent : true,
        customResponses,
      });
      const createdParticipantId = res.data?.participant?.id;
      if (createdParticipantId && res.data?.paymentEligible === true) {
        router.push(`/payments/checkout?participantId=${createdParticipantId}&tournamentId=${tournamentId}&divisionId=${divisionId || ''}`);
      } else {
        const isDraft = selectedMemberIds.length < teamSize;
        toast.success(
          isDraft
            ? translate('draftRegistrationSaved')
            : registrationMode === 'APPROVAL'
              ? translate('approvalSubmitted')
            : translate('registrationSuccess'),
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
        <p className="flex items-center gap-2 text-sm font-bold text-emerald-900"><ShieldCheck className="h-4 w-4" /> {translate('registerByTeam')}</p>
        <p className="mt-1 text-xs font-semibold text-emerald-700">{translate('teamFormationLimits', { teamSize, maxReserve, cap })}</p>
      </div>
      {participantId && (rosterStatus?.entry?.status === 'LOCKED' || rosterLockedAt) && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{translate('rosterLockedView')}</p>}
      {loading ? <div className="flex items-center justify-center py-8 text-sm text-slate-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {translate('loadingTeams')}</div> : (
        <>
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-700"><Users className="h-4 w-4" /> {translate('eligibleTeams')}</p>
            {teams.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 px-4 py-5 text-center text-xs font-semibold text-slate-500">{translate('noSuitableTeam')}</p> : (
              <div className="grid gap-2">
                {teams.map((team) => <button key={team.id} type="button" disabled={Boolean(participantId)} onClick={() => setSelectedId(team.id)} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${selectedId === team.id ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-emerald-300'} disabled:cursor-not-allowed disabled:opacity-70`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-500">{team.name.slice(0, 2).toUpperCase()}</div>
                  <span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-900">{team.name}</b><small className="text-xs font-semibold text-slate-500">{team.membership?.role === 'PLAYER' ? translate('memberRole') : translate('registrationPermission')} · {translate('manageTeamHint')}</small></span>
                  {selectedId === team.id && <Check className="h-5 w-5 text-emerald-600" />}
                </button>)}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{translate('quickCreateTeam')}</p>
            <div className="flex gap-2"><Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={translate('teamNamePlaceholder')} /><Button type="button" onClick={createTeam} disabled={saving || !newName.trim()} variant="outline"><Plus className="h-4 w-4" /> {translate('create')}</Button></div>
            <p className="mt-2 text-[11px] font-semibold text-slate-400">{translate('manageTeamHint')}</p>
          </div>
          {teamMembers.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-1 text-sm font-bold text-slate-800">{translate('rosterTitle')}</p>
              <p className="mb-3 text-xs font-semibold text-slate-500">{translate('rosterInstructions', { teamSize, maxReserve })}</p>
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
                    }}>{translate('mainRole')}</button>
                    <button type="button" disabled={Boolean(rosterStatus?.entry?.status === 'LOCKED' || rosterLockedAt) || (!isReserve && selectedReserveIds.length >= maxReserve)} className={`rounded px-2 py-1 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-40 ${isReserve ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`} onClick={() => {
                      setSelectedReserveIds((current) => isReserve ? current.filter((id) => id !== member.userId) : [...current.filter((id) => id !== member.userId), member.userId]);
                      setSelectedMemberIds((current) => current.filter((id) => id !== member.userId));
                    }}>{translate('reserveRole')}</button>
                    </div>;
                })}
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-500">{translate('selectedSummary', { main: selectedMemberIds.length, reserve: selectedReserveIds.length, maxReserve })}</p>
            </div>
          )}
        </>
      )}
      {!participantId && registrationFields && registrationFields.length > 0 && (
        <RegistrationCustomFields
          tournamentId={tournamentId}
          fields={registrationFields}
          responses={customResponses || {}}
          onChange={(fieldId, value) =>
            onCustomResponsesChange?.((current) => ({ ...current, [fieldId]: value }))
          }
        />
      )}
      {!participantId && isRanked && rankingConsentLabel && (
        <label className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={rankingConsent}
            onChange={(event) => onRankingConsentChange?.(event.target.checked)}
            className="mt-1 h-4 w-4 accent-sky-600"
          />
          <span>
            {rankingConsentLabel}
            {rankingConsentCondition && <span className="mt-1 block text-xs text-slate-500">{rankingConsentCondition}</span>}
          </span>
        </label>
      )}
      <Button type="button" onClick={submit} disabled={saving || loading || rosterLoading || Boolean(rosterStatus?.entry?.status === 'LOCKED' || rosterLockedAt) || !selectedId || selectedMemberIds.length === 0 || selectedReserveIds.length > maxReserve} className="w-full bg-emerald-600 hover:bg-emerald-700">{saving || rosterLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {participantId ? translate('updateRoster') : selectedMemberIds.length < teamSize ? translate('saveDraft') : translate('registerSelectedTeam')}</Button>
    </div>
  );
}
