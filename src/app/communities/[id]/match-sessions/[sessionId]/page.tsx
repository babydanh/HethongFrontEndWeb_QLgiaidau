'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { clubMatchSessionsApi } from '@/features/club-match-sessions/api';
import { communitiesApi, type CommunityMemberRecord } from '@/features/communities/api';
import { socketClient } from '@/lib/socket';
import type { ClubMatchParticipant, ClubMatchSession, ClubSessionMatch } from '@/types/club-match-session';
import { getErrorMessage } from '@/utils/error';

type ConflictBody = { code?: string; warnings?: Array<{ code: string; userIds: string[] }> };

export default function ClubMatchSessionPage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = use(params);
  const t = useTranslations('ClubMatchSession');
  const [session, setSession] = useState<ClubMatchSession | null>(null);
  const [participants, setParticipants] = useState<ClubMatchParticipant[]>([]);
  const [matches, setMatches] = useState<ClubSessionMatch[]>([]);
  const [clubMembers, setClubMembers] = useState<CommunityMemberRecord[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [matchType, setMatchType] = useState<'SINGLES' | 'DOUBLES'>('SINGLES');
  const [preferredPartner, setPreferredPartner] = useState('');
  const [preferredOpponent, setPreferredOpponent] = useState('');
  const [avoidedPlayer, setAvoidedPlayer] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [sessionResponse, participantsResponse, matchesResponse, membersResponse] = await Promise.all([
      clubMatchSessionsApi.get(sessionId),
      clubMatchSessionsApi.participants(sessionId),
      clubMatchSessionsApi.matches(sessionId),
      communitiesApi.getMembers(id, { status: 'JOINED', limit: 100 }),
    ]);
    setSession(sessionResponse);
    setParticipants(participantsResponse.data ?? []);
    setMatches(matchesResponse.data ?? []);
    setClubMembers(membersResponse.data ?? []);
  }, [id, sessionId]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refresh().catch((error) => toast.error(getErrorMessage(error)));
    }, 0);
    const socket = socketClient.getMatchSocket();
    const join = () => socket.emit('joinClubMatchSession', sessionId);
    const onMatchUpdate = () => void refresh();
    socket.on('connect', join);
    socket.on('match:update', onMatchUpdate);
    if (!socket.connected) socket.connect(); else join();
    return () => {
      window.clearTimeout(initialRefresh);
      socket.emit('leaveClubMatchSession', sessionId);
      socket.off('connect', join);
      socket.off('match:update', onMatchUpdate);
    };
  }, [refresh, sessionId]);

  const run = async (action: () => Promise<unknown>, successKey: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(t(successKey));
      await refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const forceSelected = () => run(
    () => clubMatchSessionsApi.forceParticipants(sessionId, selected, crypto.randomUUID()),
    'participantsAssigned',
  );

  const savePreferences = () => run(
    () => clubMatchSessionsApi.updatePreferences(
      sessionId,
      preferredPartner ? [preferredPartner] : [],
      preferredOpponent ? [preferredOpponent] : [],
      avoidedPlayer ? [avoidedPlayer] : [],
    ),
    'preferencesSaved',
  );

  const transition = (action: 'CLOSE' | 'END' | 'CANCEL') => {
    if (!session) return;
    const version = session.version;
    if (action === 'CANCEL' && !window.confirm(t('cancelSessionConfirm'))) return;
    void run(
      () => clubMatchSessionsApi.transition(sessionId, action, version),
      'sessionUpdated',
    );
  };

  const createMatch = async (confirmWarnings = false) => {
    const sideSize = matchType === 'SINGLES' ? 1 : 2;
    if (selected.length !== sideSize * 2) {
      toast.error(t(matchType === 'SINGLES' ? 'selectTwoPlayers' : 'selectFourPlayers'));
      return;
    }
    setBusy(true);
    try {
      await clubMatchSessionsApi.createMatch(sessionId, {
        sideAUserIds: selected.slice(0, sideSize),
        sideBUserIds: selected.slice(sideSize),
        matchType,
        confirmWarnings,
      }, crypto.randomUUID());
      setSelected([]);
      toast.success(t('matchCreated'));
      await refresh();
    } catch (error) {
      const body = (error as AxiosError<ConflictBody>).response?.data;
      if (body?.code === 'PAIRING_WARNINGS_REQUIRE_CONFIRMATION' && window.confirm(t('confirmPairingWarnings', { count: body.warnings?.length ?? 0 }))) {
        await createMatch(true);
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setBusy(false);
    }
  };

  const saveScore = (match: ClubSessionMatch, complete: boolean) => run(
    () => complete
      ? clubMatchSessionsApi.completeMatch(match.id, match.p1SetsWon, match.p2SetsWon, match.revision)
      : clubMatchSessionsApi.updateScore(match.id, match.p1SetsWon, match.p2SetsWon, match.revision),
    complete ? 'matchCompleted' : 'scoreSaved',
  );

  const changeLocalScore = (matchId: string, side: 'A' | 'B', delta: number) => {
    setMatches((current) => current.map((match) => match.id === matchId ? {
      ...match,
      p1SetsWon: side === 'A' ? Math.max(0, match.p1SetsWon + delta) : match.p1SetsWon,
      p2SetsWon: side === 'B' ? Math.max(0, match.p2SetsWon + delta) : match.p2SetsWon,
    } : match));
  };

  if (!session) return <main className="min-h-screen bg-slate-50 p-8 text-center text-slate-600">{t('loading')}</main>;

  const activeIds = new Set(participants.filter((item) => item.participant.status === 'ACTIVE').map((item) => item.participant.userId));
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href={`/communities/${id}/manage/tournaments`} className="text-sm font-semibold text-blue-700">{t('back')}</Link>
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-950">{session.resolvedName}</h1><p className="mt-2 text-sm text-slate-600">{session.description || t('noDescription')}</p></div><div className="flex gap-2"><Badge>{t(`status.${session.status}`)}</Badge><Badge>{session.isRanked ? t('rankedShort') : t('unrankedShort')}</Badge></div></div>
          <div className="mt-5 flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void run(() => clubMatchSessionsApi.selfJoin(sessionId), 'joined')}>{t('join')}</Button><Button disabled={busy} variant="outline" onClick={() => void run(() => clubMatchSessionsApi.withdraw(sessionId), 'withdrawn')}>{t('withdraw')}</Button>{session.capabilities?.canManage && ['OPEN', 'LIVE'].includes(session.status) && <Button disabled={busy} variant="outline" onClick={() => transition('CLOSE')}>{t('closeRegistration')}</Button>}{session.capabilities?.canManage && !['ENDED', 'CANCELLED'].includes(session.status) && <><Button disabled={busy} variant="secondary" onClick={() => transition('END')}>{t('endSession')}</Button><Button disabled={busy} variant="destructive" onClick={() => transition('CANCEL')}>{t('cancelSession')}</Button></>}</div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">{t('participants')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('participantSelectionHint')}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {clubMembers.map((record) => {
              const userId = record.member.userId;
              const checked = selected.includes(userId);
              return <label key={userId} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"><input type="checkbox" checked={checked} onChange={() => setSelected((value) => checked ? value.filter((idValue) => idValue !== userId) : [...value, userId])} /><span className="flex-1 text-sm font-semibold">{record.user.fullName}</span>{activeIds.has(userId) && <Badge>{t('active')}</Badge>}</label>;
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">{session.capabilities?.canManage && <Button disabled={busy || selected.length === 0} variant="outline" onClick={forceSelected}>{t('assignSelected')}</Button>}<select className="h-10 rounded-lg border border-slate-300 px-3" value={matchType} onChange={(event) => setMatchType(event.target.value as typeof matchType)}><option value="SINGLES">{t('singles')}</option><option value="DOUBLES">{t('doubles')}</option></select><Button disabled={busy} onClick={() => void createMatch()}>{t('createMatch')}</Button></div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">{t('preferences')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('preferencesHint')}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { value: preferredPartner, setValue: setPreferredPartner, label: t('preferredPartner') },
              { value: preferredOpponent, setValue: setPreferredOpponent, label: t('preferredOpponent') },
              { value: avoidedPlayer, setValue: setAvoidedPlayer, label: t('avoidPlayer') },
            ].map((field) => <label key={field.label} className="space-y-2"><span className="text-sm font-semibold">{field.label}</span><select className="h-10 w-full rounded-lg border border-slate-300 px-3" value={field.value} onChange={(event) => field.setValue(event.target.value)}><option value="">{t('noPreference')}</option>{participants.filter((item) => item.participant.status === 'ACTIVE').map((item) => <option key={item.participant.userId} value={item.participant.userId}>{item.fullName}</option>)}</select></label>)}
          </div>
          <Button className="mt-4" variant="outline" disabled={busy} onClick={savePreferences}>{t('savePreferences')}</Button>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t('matches')}</h2>
          {matches.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{t('noMatches')}</div>}
          {matches.map((match) => <article key={match.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div className="font-semibold">{match.participant1.members.map((member) => member?.fullName).join(' · ')} <span className="px-2 text-slate-400">{t('versus')}</span> {match.participant2.members.map((member) => member?.fullName).join(' · ')}</div><Badge>{t(`matchStatus.${match.status}`)}</Badge></div><div className="mt-4 flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" onClick={() => changeLocalScore(match.id, 'A', -1)}>-</Button><span className="w-8 text-center text-xl font-bold">{match.p1SetsWon}</span><Button size="sm" variant="outline" onClick={() => changeLocalScore(match.id, 'A', 1)}>+</Button><span className="px-3">:</span><Button size="sm" variant="outline" onClick={() => changeLocalScore(match.id, 'B', -1)}>-</Button><span className="w-8 text-center text-xl font-bold">{match.p2SetsWon}</span><Button size="sm" variant="outline" onClick={() => changeLocalScore(match.id, 'B', 1)}>+</Button>{match.status !== 'COMPLETED' && <><Button size="sm" disabled={busy} onClick={() => void saveScore(match, false)}>{t('saveScore')}</Button><Button size="sm" disabled={busy || match.p1SetsWon === match.p2SetsWon} variant="secondary" onClick={() => void saveScore(match, true)}>{t('complete')}</Button></>}</div><p className="mt-3 text-xs text-slate-500">{t('eloStatus', { status: t(`eloStates.${match.eloStatus}`) })}</p></article>)}
        </section>
      </div>
    </main>
  );
}
