'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/Button';
import { clubMatchSessionsApi, type ClubMatchApiError } from '@/features/club-match-sessions/api';
import { ClubMatchSessionDetailView } from '@/features/club-match-sessions/ClubMatchSessionDetailView';
import { communitiesApi, type Community, type CommunityMemberRecord } from '@/features/communities/api';
import { socketClient } from '@/lib/socket';
import type { ClubMatchParticipant, ClubMatchSession, ClubSessionMatch } from '@/types/club-match-session';
import { getErrorMessage, isHttpStatusError } from '@/utils/error';

type SessionAction = 'CLOSE' | 'END' | 'CANCEL';

export default function ClubMatchSessionPage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = use(params);
  const t = useTranslations('ClubMatchSession');
  const [session, setSession] = useState<ClubMatchSession | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
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
    const [sessionResponse, participantsResponse, matchesResponse, membersResponse, communityResponse] = await Promise.all([
      clubMatchSessionsApi.get(sessionId),
      clubMatchSessionsApi.participants(sessionId),
      clubMatchSessionsApi.matches(sessionId, { status: matchStatus || undefined }),
      communitiesApi.getMembers(id, { status: 'JOINED', limit: 100 }),
      communitiesApi.getCommunityById(id),
    ]);
    setSession(sessionResponse);
    const communityData = (communityResponse as { data?: Community })?.data || (communityResponse as unknown as Community);
    setCommunity(communityData);
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

  const transition = (action: SessionAction) => {
    if (!session) return;
    if (action === 'CANCEL' && !window.confirm(t('cancelSessionConfirm'))) return;
    void run(() => clubMatchSessionsApi.transition(sessionId, action, session.version), 'sessionUpdated');
  };

  const assignPlayer = (userId: string, side: 'A' | 'B') => {
    setSideAPlayers((current) => side === 'A'
      ? current.includes(userId)
        ? current.filter((idValue) => idValue !== userId)
        : current.length < 2 ? [...current, userId] : current
      : current.filter((idValue) => idValue !== userId));
    setSideBPlayers((current) => side === 'B'
      ? current.includes(userId)
        ? current.filter((idValue) => idValue !== userId)
        : current.length < 2 ? [...current, userId] : current
      : current.filter((idValue) => idValue !== userId));
  };

  const createMatch = async (confirmWarnings = false, idempotencyKey = crypto.randomUUID()) => {
    if (![1, 2].includes(sideAPlayers.length) || sideBPlayers.length !== sideAPlayers.length) {
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

  if (loadError && !session) return <main className="min-h-screen bg-slate-50 p-8 text-center"><p className="text-rose-700" role="alert">{t('loadFailed')}</p><Button className="mt-4" variant="outline" onClick={() => void refresh()}>{t('retry')}</Button></main>;
  if (!session) return <main className="min-h-screen bg-slate-50 p-8 text-center text-slate-600">{t('loading')}</main>;

  return (
    <ClubMatchSessionDetailView
      communityId={id}
      communityName={community?.name}
      communityLogoUrl={community?.logoUrl}
      session={session}
      participants={participants}
      clubMembers={clubMembers}
      selectedMembers={selectedMembers}
      setSelectedMembers={setSelectedMembers}
      sideAPlayers={sideAPlayers}
      sideBPlayers={sideBPlayers}
      assignPlayer={assignPlayer}
      preferredPartners={preferredPartners}
      setPreferredPartners={setPreferredPartners}
      preferredOpponents={preferredOpponents}
      setPreferredOpponents={setPreferredOpponents}
      avoidedPlayers={avoidedPlayers}
      setAvoidedPlayers={setAvoidedPlayers}
      matches={matches}
      matchStatus={matchStatus}
      setMatchStatus={setMatchStatus}
      mockName={mockName}
      setMockName={setMockName}
      creatingMock={creatingMock}
      busy={busy}
      loadingMore={loadingMore}
      participantCursor={participantCursor}
      matchCursor={matchCursor}
      memberCursor={memberCursor}
      onJoin={() => void run(() => clubMatchSessionsApi.selfJoin(sessionId), 'joined')}
      onWithdraw={() => void run(() => clubMatchSessionsApi.withdraw(sessionId), 'withdrawn')}
      onTransition={transition}
      onForceSelected={forceSelected}
      onCreateMock={() => void createMockParticipant()}
      onSavePreferences={savePreferences}
      onCreateMatch={() => void createMatch()}
      onLoadMoreParticipants={() => void loadMoreParticipants()}
      onLoadMoreMatches={() => void loadMoreMatches()}
      onLoadMoreMembers={() => void loadMoreMembers()}
    />
  );
}
