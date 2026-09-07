'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { clubMatchSessionsApi, type ClubMatchApiError } from '@/features/club-match-sessions/api';
import { communitiesApi, type CommunityMemberRecord } from '@/features/communities/api';
import { socketClient } from '@/lib/socket';
import type { ClubMatchParticipant, ClubMatchSession, ClubSessionMatch } from '@/types/club-match-session';
import { getErrorMessage, isHttpStatusError } from '@/utils/error';

export default function ClubMatchSessionPage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = use(params);
  const t = useTranslations('ClubMatchSession');
  const [session, setSession] = useState<ClubMatchSession | null>(null);
  const [participants, setParticipants] = useState<ClubMatchParticipant[]>([]);
  const [matches, setMatches] = useState<ClubSessionMatch[]>([]);
  const [clubMembers, setClubMembers] = useState<CommunityMemberRecord[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [sideAPlayers, setSideAPlayers] = useState<string[]>([]);
  const [sideBPlayers, setSideBPlayers] = useState<string[]>([]);
  const [matchStatus, setMatchStatus] = useState('');
  const [preferredPartners, setPreferredPartners] = useState<string[]>([]);
  const [preferredOpponents, setPreferredOpponents] = useState<string[]>([]);
  const [avoidedPlayers, setAvoidedPlayers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [mockName, setMockName] = useState('');
  const [creatingMock, setCreatingMock] = useState(false);
  const [participantCursor, setParticipantCursor] = useState<string | null>(null);
  const [matchCursor, setMatchCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [memberCursor, setMemberCursor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError(false);
    const [sessionResponse, participantsResponse, matchesResponse, membersResponse] = await Promise.all([
      clubMatchSessionsApi.get(sessionId),
      clubMatchSessionsApi.participants(sessionId),
      clubMatchSessionsApi.matches(sessionId, { status: matchStatus || undefined }),
      communitiesApi.getMembers(id, { status: 'JOINED', limit: 100 }),
    ]);
    setSession(sessionResponse);
    setParticipants(participantsResponse.data ?? []);
    setMatches(matchesResponse.data ?? []);
    setParticipantCursor(participantsResponse.meta.nextCursor);
    setMatchCursor(matchesResponse.meta.nextCursor);
    setClubMembers(membersResponse.data ?? []);
    setMemberCursor(membersResponse.meta?.nextCursor ?? null);
    setPreferredPartners(sessionResponse.viewerPreferences?.preferredPartnerUserIds ?? []);
    setPreferredOpponents(sessionResponse.viewerPreferences?.preferredOpponentUserIds ?? []);
    setAvoidedPlayers(sessionResponse.viewerPreferences?.avoidUserIds ?? []);
  }, [id, matchStatus, sessionId]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refresh().catch((error) => {
        setLoadError(true);
        toast.error(getErrorMessage(error));
      });
    }, 0);
    const socket = socketClient.getMatchSocket();
    const join = () => socket.emit('joinClubMatchSession', sessionId);
    const onMatchUpdate = () => void refresh().catch(() => setLoadError(true));
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
      if (isHttpStatusError(error, 409)) await refresh().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const forceSelected = () => run(
    () => clubMatchSessionsApi.forceParticipants(sessionId, selectedMembers, crypto.randomUUID()),
    'participantsAssigned',
  );

  const createMockParticipant = async () => {
    const name = mockName.trim();
    if (!name || creatingMock) return;
    setCreatingMock(true);
    try {
      await clubMatchSessionsApi.createMockParticipant(sessionId, name);
      setMockName('');
      toast.success(t('mockParticipantCreated'));
      await refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCreatingMock(false);
    }
  };

  const savePreferences = () => run(
    () => clubMatchSessionsApi.updatePreferences(
      sessionId,
      preferredPartners,
      preferredOpponents,
      avoidedPlayers,
      session?.viewerPreferences?.version,
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

  const assignPlayer = (userId: string, side: 'A' | 'B') => {
    setSideAPlayers((current) =>
      side === 'A'
        ? current.includes(userId)
          ? current.filter((idValue) => idValue !== userId)
          : current.length < 2
            ? [...current, userId]
            : current
        : current.filter((idValue) => idValue !== userId),
    );
    setSideBPlayers((current) =>
      side === 'B'
        ? current.includes(userId)
          ? current.filter((idValue) => idValue !== userId)
          : current.length < 2
            ? [...current, userId]
            : current
        : current.filter((idValue) => idValue !== userId),
    );
  };

  const createMatch = async (
    confirmWarnings = false,
    idempotencyKey = crypto.randomUUID(),
  ) => {
    const sideSize = sideAPlayers.length;
    if (
      ![1, 2].includes(sideSize) ||
      sideBPlayers.length !== sideSize
    ) {
      toast.error(t('selectBalancedPlayers'));
      return;
    }
    setBusy(true);
    try {
      await clubMatchSessionsApi.createMatch(sessionId, {
        sideAUserIds: sideAPlayers,
        sideBUserIds: sideBPlayers,
        confirmWarnings,
      }, idempotencyKey);
      setSideAPlayers([]);
      setSideBPlayers([]);
      toast.success(t('matchCreated'));
      await refresh();
    } catch (error) {
      const body = (error as AxiosError<ClubMatchApiError>).response?.data;
      if (body?.code === 'PAIRING_WARNINGS_REQUIRE_CONFIRMATION' && window.confirm(t('confirmPairingWarnings', { count: body.warnings?.length ?? 0 }))) {
        await createMatch(true, idempotencyKey);
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setBusy(false);
    }
  };

  const saveScore = (match: ClubSessionMatch, complete: boolean) => run(
    () => complete
      ? clubMatchSessionsApi.completeMatch(match, match.p1SetsWon, match.p2SetsWon)
      : clubMatchSessionsApi.updateScore(match, match.p1SetsWon, match.p2SetsWon),
    complete ? 'matchCompleted' : 'scoreSaved',
  );

  const changeLocalScore = (matchId: string, side: 'A' | 'B', delta: number) => {
    setMatches((current) => current.map((match) => match.id === matchId ? {
      ...match,
      p1SetsWon: side === 'A' ? Math.max(0, match.p1SetsWon + delta) : match.p1SetsWon,
      p2SetsWon: side === 'B' ? Math.max(0, match.p2SetsWon + delta) : match.p2SetsWon,
    } : match));
  };

  if (loadError && !session) return <main className="min-h-screen bg-slate-50 p-8 text-center"><p className="text-rose-700" role="alert">{t('loadFailed')}</p><Button className="mt-4" variant="outline" onClick={() => void refresh()}>{t('retry')}</Button></main>;
  if (!session) return <main className="min-h-screen bg-slate-50 p-8 text-center text-slate-600">{t('loading')}</main>;

  const activeIds = new Set(participants.filter((item) => item.participant.status === 'ACTIVE').map((item) => item.participant.userId));
  const pairingReady =
    [1, 2].includes(sideAPlayers.length) &&
    sideAPlayers.length === sideBPlayers.length;
  const preferenceOptions = participants.filter((item) =>
    item.participant.status === 'ACTIVE' &&
    item.participant.userId !== session.viewerParticipant?.userId,
  );
  const loadMoreParticipants = async () => {
    if (!participantCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await clubMatchSessionsApi.participants(sessionId, { cursor: participantCursor });
      setParticipants((current) => [...current, ...page.data.filter((item) => !current.some((existing) => existing.participant.id === item.participant.id))]);
      setParticipantCursor(page.meta.nextCursor);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally { setLoadingMore(false); }
  };
  const loadMoreMatches = async () => {
    if (!matchCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await clubMatchSessionsApi.matches(sessionId, { cursor: matchCursor, status: matchStatus || undefined });
      setMatches((current) => [...current, ...page.data.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setMatchCursor(page.meta.nextCursor);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally { setLoadingMore(false); }
  };
  const loadMoreMembers = async () => {
    if (!memberCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await communitiesApi.getMembers(id, { status: 'JOINED', limit: 100, cursor: memberCursor });
      setClubMembers((current) => [...current, ...(page.data ?? []).filter((item) => !current.some((existing) => existing.member.id === item.member.id))]);
      setMemberCursor(page.meta?.nextCursor ?? null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally { setLoadingMore(false); }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href={`/communities/${id}/manage/tournaments`} className="text-sm font-semibold text-blue-700">{t('back')}</Link>
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-950">{session.resolvedName}</h1><p className="mt-2 text-sm text-slate-600">{session.description || t('noDescription')}</p></div><div className="flex gap-2"><Badge>{t(`status.${session.status}`)}</Badge><Badge>{session.isRanked ? t('rankedShort') : t('unrankedShort')}</Badge></div></div>
          <div className="mt-5 flex flex-wrap gap-3">{session.capabilities?.canJoin && <Button disabled={busy} onClick={() => void run(() => clubMatchSessionsApi.selfJoin(sessionId), 'joined')}>{t('join')}</Button>}{session.capabilities?.canWithdraw && <Button disabled={busy} variant="outline" onClick={() => void run(() => clubMatchSessionsApi.withdraw(sessionId), 'withdrawn')}>{t('withdraw')}</Button>}{session.capabilities?.canManage && ['OPEN', 'LIVE'].includes(session.status) && <Button disabled={busy} variant="outline" onClick={() => transition('CLOSE')}>{t('closeRegistration')}</Button>}{session.capabilities?.canManage && !['ENDED', 'CANCELLED'].includes(session.status) && <><Button disabled={busy} variant="secondary" onClick={() => transition('END')}>{t('endSession')}</Button><Button disabled={busy} variant="destructive" onClick={() => transition('CANCEL')}>{t('cancelSession')}</Button></>}</div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">{t('participants')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('participantSelectionHint')}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center justify-between text-sm font-bold text-blue-900"><span>{t('sideA')}</span><span>{sideAPlayers.length}/2</span></div>
              <p className="mt-2 text-sm text-blue-800">{sideAPlayers.map((userId) => participants.find((item) => item.participant.userId === userId)?.fullName).filter(Boolean).join(' · ') || t('noPlayers')}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center justify-between text-sm font-bold text-amber-900"><span>{t('sideB')}</span><span>{sideBPlayers.length}/2</span></div>
              <p className="mt-2 text-sm text-amber-800">{sideBPlayers.map((userId) => participants.find((item) => item.participant.userId === userId)?.fullName).filter(Boolean).join(' · ') || t('noPlayers')}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">{participants.map((item) => { const userId = item.participant.userId; const assignedSide = sideAPlayers.includes(userId) ? 'A' : sideBPlayers.includes(userId) ? 'B' : null; const sideFull = sideAPlayers.length >= 2 && !sideAPlayers.includes(userId) || sideBPlayers.length >= 2 && !sideBPlayers.includes(userId); return <div key={item.participant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"><div className="flex min-w-0 items-center gap-3"><span className="truncate"><span className="text-sm font-semibold">{item.fullName}</span><span className="ml-2 text-xs text-slate-500">{t(`participantSource.${item.participant.source}`)} · {t(`participantStatus.${item.participant.status}`)}</span></span>{item.isMock && <Badge>{t('mockPlayer')}</Badge>}{assignedSide && <Badge>{assignedSide}</Badge>}</div><div className="flex items-center gap-2">{item.participant.status === 'ACTIVE' && <><Button size="sm" variant={assignedSide === 'A' ? 'default' : 'outline'} disabled={busy || (sideFull && assignedSide !== 'A')} onClick={() => assignPlayer(userId, 'A')}>{t('sideA')}</Button><Button size="sm" variant={assignedSide === 'B' ? 'default' : 'outline'} disabled={busy || (sideFull && assignedSide !== 'B')} onClick={() => assignPlayer(userId, 'B')}>{t('sideB')}</Button></>}{session.capabilities?.canManage && item.participant.status === 'ACTIVE' && <Button size="sm" variant="destructive" disabled={busy} onClick={() => { if (window.confirm(t('removeParticipantConfirm', { name: item.fullName ?? '' }))) void run(() => clubMatchSessionsApi.removeParticipant(sessionId, item.participant.userId, item.participant.version), 'participantRemoved'); }}>{t('removeParticipant')}</Button>}</div></div>; })}</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {clubMembers.map((record) => {
              const userId = record.member.userId;
              const checked = selectedMembers.includes(userId);
              return <label key={userId} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"><input type="checkbox" checked={checked} onChange={() => setSelectedMembers((value) => checked ? value.filter((idValue) => idValue !== userId) : [...value, userId])} /><span className="flex-1 text-sm font-semibold">{record.user.fullName}</span>{activeIds.has(userId) && <Badge>{t('active')}</Badge>}</label>;
            })}
          </div>
          {memberCursor && <Button className="mt-3" variant="outline" disabled={loadingMore} onClick={() => void loadMoreMembers()}>{t('loadMoreMembers')}</Button>}
          {participantCursor && <Button className="mt-3" variant="outline" disabled={loadingMore} onClick={() => void loadMoreParticipants()}>{t('loadMore')}</Button>}
          {session.capabilities?.canManage && session.status === 'OPEN' && <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3"><input value={mockName} onChange={(event) => setMockName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void createMockParticipant(); }} placeholder={t('mockNamePlaceholder')} maxLength={255} className="min-w-52 flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400" /><Button disabled={busy || creatingMock || !mockName.trim()} variant="outline" onClick={() => void createMockParticipant()}>{creatingMock ? t('creatingMock') : t('createMockParticipant')}</Button><span className="w-full text-xs text-amber-800">{t('mockNoElo')}</span></div>}
          <div className="mt-4 flex flex-wrap items-center gap-3">{session.capabilities?.canManage && <Button disabled={busy || selectedMembers.length === 0} variant="outline" onClick={forceSelected}>{t('assignSelected')}</Button>}{session.capabilities?.canCreateMatch && <><span className="text-xs text-slate-500">{t('pairingDerivedHint')}</span><Button disabled={busy || !pairingReady} onClick={() => void createMatch()}>{t('createMatch')}</Button></>}</div>
        </section>

        {session.viewerParticipant?.status === 'ACTIVE' && <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">{t('preferences')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('preferencesHint')}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
               { value: preferredPartners, setValue: setPreferredPartners, label: t('preferredPartner') },
               { value: preferredOpponents, setValue: setPreferredOpponents, label: t('preferredOpponent') },
               { value: avoidedPlayers, setValue: setAvoidedPlayers, label: t('avoidPlayer') },
            ].map((field) => <label key={field.label} className="space-y-2"><span className="text-sm font-semibold">{field.label}</span><select multiple className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2" value={field.value} onChange={(event) => field.setValue(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}>{preferenceOptions.map((item) => <option disabled={[...preferredPartners, ...preferredOpponents, ...avoidedPlayers].includes(item.participant.userId) && !field.value.includes(item.participant.userId)} key={item.participant.userId} value={item.participant.userId}>{item.fullName}</option>)}</select></label>)}
          </div>
          <Button className="mt-4" variant="outline" disabled={busy} onClick={savePreferences}>{t('savePreferences')}</Button>
        </section>}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{t('matches')}</h2><select aria-label={t('matchStatusFilter')} className="h-10 rounded-lg border border-slate-300 px-3" value={matchStatus} onChange={(event) => setMatchStatus(event.target.value)}><option value="">{t('allMatchStatuses')}</option>{(['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const).map((status) => <option key={status} value={status}>{t(`matchStatus.${status}`)}</option>)}</select></div>
          {matches.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{t('noMatches')}</div>}
          {matches.map((match) => { const canEdit = session.capabilities?.canManage || [...match.sideAUserIds, ...match.sideBUserIds].includes(session.viewerParticipant?.userId ?? ''); const editable = canEdit && !['COMPLETED', 'CANCELLED'].includes(match.status); const eloDelta = Object.values(match.eloDelta ?? {}).reduce((sum, value) => sum + Math.abs(value), 0); return <article key={match.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div className="font-semibold">{match.participant1.members.map((member) => member?.fullName).join(' · ')} <span className="px-2 text-slate-400">{t('versus')}</span> {match.participant2.members.map((member) => member?.fullName).join(' · ')}</div><Badge>{t(`matchStatus.${match.status}`)}</Badge></div><div className="mt-4 flex flex-wrap items-center gap-2"><Button aria-label={t('decreaseSideA')} disabled={!editable || busy} size="sm" variant="outline" onClick={() => changeLocalScore(match.id, 'A', -1)}>-</Button><span className="w-8 text-center text-xl font-bold">{match.p1SetsWon}</span><Button aria-label={t('increaseSideA')} disabled={!editable || busy} size="sm" variant="outline" onClick={() => changeLocalScore(match.id, 'A', 1)}>+</Button><span className="px-3">:</span><Button aria-label={t('decreaseSideB')} disabled={!editable || busy} size="sm" variant="outline" onClick={() => changeLocalScore(match.id, 'B', -1)}>-</Button><span className="w-8 text-center text-xl font-bold">{match.p2SetsWon}</span><Button aria-label={t('increaseSideB')} disabled={!editable || busy} size="sm" variant="outline" onClick={() => changeLocalScore(match.id, 'B', 1)}>+</Button>{editable && <><Button size="sm" disabled={busy} onClick={() => void saveScore(match, false)}>{t('saveScore')}</Button><Button size="sm" disabled={busy || match.p1SetsWon === match.p2SetsWon} variant="secondary" onClick={() => void saveScore(match, true)}>{t('complete')}</Button></>}</div><p className="mt-3 text-xs text-slate-500">{t('eloStatus', { status: t(`eloStates.${match.eloStatus}`) })}{match.eloStatus === 'APPLIED' && eloDelta > 0 ? ` · ${t('eloDelta', { value: eloDelta })}` : ''}</p></article>; })}
          {matchCursor && <div className="flex justify-center"><Button variant="outline" disabled={loadingMore} onClick={() => void loadMoreMatches()}>{t('loadMore')}</Button></div>}
        </section>
      </div>
    </main>
  );
}
