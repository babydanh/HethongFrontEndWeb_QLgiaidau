'use client';

import { useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Plus,
  Radio,
  Settings2,
  ShieldCheck,
  Swords,
  Trophy,
  X,
  UserPlus,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { CommunityMemberRecord } from '@/features/communities/api';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';
import type {
  ClubMatchParticipant,
  ClubMatchSession,
  ClubSessionMatch,
} from '@/types/club-match-session';

type SessionAction = 'CLOSE' | 'END' | 'CANCEL';
type SessionTab = 'overview' | 'participants' | 'matches' | 'statistics';

type Props = {
  communityId: string;
  communityName?: string | null;
  communityLogoUrl?: string | null;
  session: ClubMatchSession;
  participants: ClubMatchParticipant[];
  clubMembers: CommunityMemberRecord[];
  selectedMembers: string[];
  setSelectedMembers: Dispatch<SetStateAction<string[]>>;
  sideAPlayers: string[];
  sideBPlayers: string[];
  assignPlayer: (userId: string, side: 'A' | 'B') => void;
  preferredPartners: string[];
  setPreferredPartners: Dispatch<SetStateAction<string[]>>;
  preferredOpponents: string[];
  setPreferredOpponents: Dispatch<SetStateAction<string[]>>;
  avoidedPlayers: string[];
  setAvoidedPlayers: Dispatch<SetStateAction<string[]>>;
  matches: ClubSessionMatch[];
  matchStatus: string;
  setMatchStatus: (value: string) => void;
  mockName: string;
  setMockName: (value: string) => void;
  creatingMock: boolean;
  busy: boolean;
  loadingMore: boolean;
  participantCursor: string | null;
  matchCursor: string | null;
  memberCursor: string | null;
  onJoin: () => void;
  onWithdraw: () => void;
  onTransition: (action: SessionAction) => void;
  onForceSelected: () => void;
  onCreateMock: () => void;
  onSavePreferences: () => void;
  onCreateMatch: () => void;
  onLoadMoreParticipants: () => void;
  onLoadMoreMatches: () => void;
  onLoadMoreMembers: () => void;
};

function formatSessionDate(value: string | null, locale: string, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function initials(name: string | null | undefined) {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase();
}

function shortDisplayName(name: string | null | undefined) {
  const value = (name || '').trim();
  if (!value) return '?';
  const parts = value.split(/\s+/);
  return parts[parts.length - 1] || value;
}

function Avatar({
  name,
  avatarUrl,
  userId,
  mock = false,
  className = 'h-11 w-11',
}: {
  name: string | null | undefined;
  avatarUrl?: string | null;
  userId?: string | null;
  mock?: boolean;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const openUserById = useUserProfileModalStore((state) => state.openUserById);
  const content = avatarUrl && !imageFailed ? (
    <img
      src={avatarUrl}
      alt={name || 'Player'}
      className={`${className} rounded-full border-2 border-white object-cover shadow-sm ${mock ? 'grayscale' : ''}`}
      onError={() => setImageFailed(true)}
    />
  ) : (
    <span className={`${className} inline-flex items-center justify-center rounded-full border-2 border-white bg-blue-100 text-sm font-bold text-blue-700 shadow-sm`}>
      {initials(name)}
    </span>
  );
  if (!userId) return content;
  return (
    <button
      type="button"
      aria-label={`Mở hồ sơ ${name || 'người chơi'}`}
      className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        openUserById(userId, name || '', avatarUrl || null, event.currentTarget.getBoundingClientRect());
      }}
    >
      {content}
    </button>
  );
}

function statusClasses(status: ClubMatchSession['status']) {
  if (status === 'OPEN') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status === 'LIVE') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'CLOSED') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'CANCELLED') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function readSetScores(match: ClubSessionMatch) {
  const rawSets = match.scoreDetails?.sets;
  if (!Array.isArray(rawSets)) return [];
  return rawSets.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const team1Score = Number(record.team1Score);
    const team2Score = Number(record.team2Score);
    return Number.isFinite(team1Score) && Number.isFinite(team2Score)
      ? [{ team1Score, team2Score, isFinished: record.isFinished === true }]
      : [];
  });
}

function readTennisGamePoints(match: ClubSessionMatch) {
  const liveState = match.scoreDetails?.liveState;
  const pointState = liveState && typeof liveState === 'object' && !Array.isArray(liveState)
    ? (liveState as Record<string, unknown>).tennisPointState
    : null;
  const rawPoints = pointState && typeof pointState === 'object' && !Array.isArray(pointState)
    ? pointState as Record<string, unknown>
    : {};
  const normalize = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) return String(Math.max(0, Math.trunc(value)));
    return value === '15' || value === '30' || value === '40' || value === 'A' ? value : '0';
  };
  return {
    team1: normalize(rawPoints.team1Point),
    team2: normalize(rawPoints.team2Point),
  };
}

function sideMembers(match: ClubSessionMatch, side: 'A' | 'B') {
  return (side === 'A' ? match.participant1 : match.participant2).members ?? [];
}

function sideName(match: ClubSessionMatch, side: 'A' | 'B', fallback: string) {
  const names = sideMembers(match, side)
    .map((member) => shortDisplayName(member.fullName))
    .filter(Boolean);
  return names.join(' / ') || fallback;
}

type PlayerStat = {
  id: string;
  name: string;
  avatarUrl: string | null;
  played: number;
  wins: number;
  losses: number;
  eloDelta: number;
  streak: number;
  streakType: 'WIN' | 'LOSS' | 'NONE';
};

function buildPlayerStats(participants: ClubMatchParticipant[], matches: ClubSessionMatch[]) {
  const stats = new Map<string, PlayerStat>();
  participants
    .filter((item) => item.participant.status === 'ACTIVE')
    .forEach((item) => {
      stats.set(item.participant.userId, {
        id: item.participant.userId,
        name: item.fullName || item.participant.userId,
        avatarUrl: item.avatarUrl,
        played: 0,
        wins: 0,
        losses: 0,
        eloDelta: 0,
        streak: 0,
        streakType: 'NONE',
      });
    });

  const chronologicalMatches = matches.filter((match) => match.status === 'COMPLETED').slice().reverse();
  chronologicalMatches.forEach((match) => {
    const winner = match.p1SetsWon === match.p2SetsWon ? null : match.p1SetsWon > match.p2SetsWon ? 'A' : 'B';
    (['A', 'B'] as const).forEach((side) => {
      const won = winner === side;
      const lost = winner !== null && !won;
      sideMembers(match, side).forEach((member) => {
        if (!member.userId) return;
        const stat = stats.get(member.userId);
        if (!stat) return;
        stat.played += 1;
        if (won) stat.wins += 1;
        if (lost) stat.losses += 1;
        if (winner) {
          const streakType = won ? 'WIN' : 'LOSS';
          stat.streak = stat.streakType === streakType ? stat.streak + 1 : 1;
          stat.streakType = streakType;
        }
        const delta = match.eloDelta?.[member.userId];
        if (typeof delta === 'number' && Number.isFinite(delta)) stat.eloDelta += delta;
      });
    });
  });

  return [...stats.values()].sort((left, right) => right.wins - left.wins || right.played - left.played || right.eloDelta - left.eloDelta);
}

function MatchCard({ match, isTennis, t }: { match: ClubSessionMatch; isTennis: boolean; t: (key: string, values?: Record<string, string | number>) => string }) {
  const sets = readSetScores(match);
  const sideA = sideMembers(match, 'A');
  const sideB = sideMembers(match, 'B');
  const isLive = match.status === 'ONGOING';
  const deltas = Object.values(match.eloDelta ?? {}).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const totalElo = deltas.reduce((sum, value) => sum + value, 0);
  const eloText = match.eloStatus === 'APPLIED' && deltas.length > 0
    ? `ELO ${totalElo >= 0 ? '+' : ''}${totalElo}`
    : t('eloStatus', { status: t(`eloStates.${match.eloStatus}`) });
  const currentGamePoints = isTennis && isLive ? readTennisGamePoints(match) : null;

  return (
    <Link
      href={`/live/${match.id}?scoring=1`}
      className={`group block overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md ${isLive ? 'border-rose-200' : 'border-slate-200'}`}
    >
      <div className={`flex items-center justify-between border-b px-4 py-2.5 ${isLive ? 'border-rose-100 bg-rose-50/70' : 'border-slate-100 bg-slate-50/70'}`}>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${isLive ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {isLive && <Radio className="h-3.5 w-3.5 animate-pulse" />}
            {t(`matchStatus.${match.status}`)}
          </span>
          <span className="text-xs font-semibold text-slate-500">{t('matchType')}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-5 sm:px-6">
        <MatchSide members={sideA} name={sideName(match, 'A', t('sideA'))} align="left" />
        <div className="min-w-[74px] text-center">
          <div className={`text-3xl font-black tracking-tight ${isLive ? 'text-rose-600' : 'text-slate-900'}`}>
            {match.p1SetsWon} : {match.p2SetsWon}
          </div>
          {sets.length > 0 && (
            <div className="mt-2 flex max-w-[132px] flex-wrap justify-center gap-1">
              {sets.map((set, index) => (
                <span key={`${match.id}-${index}`} className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${index === sets.length - 1 && !sets[index].isFinished ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  {set.team1Score}-{set.team2Score}
                </span>
              ))}
            </div>
          )}
          {currentGamePoints && (
            <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
              <span className="truncate">{t('currentGamePoints')}</span>
              <span className="shrink-0 tabular-nums">{currentGamePoints.team1} - {currentGamePoints.team2}</span>
            </div>
          )}
        </div>
        <MatchSide members={sideB} name={sideName(match, 'B', t('sideB'))} align="right" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs font-semibold text-slate-500 sm:px-6">
        <span className={match.eloStatus === 'APPLIED' ? 'text-emerald-700' : 'text-slate-500'}>{eloText}</span>
        <span className="text-blue-600">{t('openScoring')}</span>
      </div>
    </Link>
  );
}

function MatchSide({
  members,
  name,
  align,
}: {
  members: Array<{ userId?: string | null; fullName: string | null; avatarUrl?: string | null; isMock?: boolean }>;
  name: string;
  align: 'left' | 'right';
}) {
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <div className={`flex ${align === 'right' ? 'justify-end' : 'justify-start'} -space-x-3`}>
        {members.slice(0, 2).map((member, index) => (
          <Avatar key={`${member.userId || member.fullName}-${index}`} name={member.fullName} userId={member.userId} avatarUrl={member.avatarUrl} mock={member.isMock} className="h-10 w-10" />
        ))}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-bold leading-tight text-slate-900">{name}</p>
    </div>
  );
}

export function ClubMatchSessionDetailView({
  communityId,
  communityName,
  communityLogoUrl,
  session,
  participants,
  clubMembers,
  selectedMembers,
  setSelectedMembers,
  sideAPlayers,
  sideBPlayers,
  assignPlayer,
  preferredPartners,
  setPreferredPartners,
  preferredOpponents,
  setPreferredOpponents,
  avoidedPlayers,
  setAvoidedPlayers,
  matches,
  matchStatus,
  setMatchStatus,
  mockName,
  setMockName,
  creatingMock,
  busy,
  loadingMore,
  participantCursor,
  matchCursor,
  memberCursor,
  onJoin,
  onWithdraw,
  onTransition,
  onForceSelected,
  onCreateMock,
  onSavePreferences,
  onCreateMatch,
  onLoadMoreParticipants,
  onLoadMoreMatches,
  onLoadMoreMembers,
}: Props) {
  const t = useTranslations('ClubMatchSession');
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<SessionTab>('overview');
  const [pairingOpen, setPairingOpen] = useState(false);
  const [mockFormOpen, setMockFormOpen] = useState(false);
  const activeParticipants = participants.filter((item) => item.participant.status === 'ACTIVE');
  const activeIds = new Set(activeParticipants.map((item) => item.participant.userId));
  const pairingReady = [1, 2].includes(sideAPlayers.length) && sideAPlayers.length === sideBPlayers.length;
  const preferenceOptions = activeParticipants.filter((item) => item.participant.userId !== session.viewerParticipant?.userId);
  const selectedPreferenceIds = new Set([...preferredPartners, ...preferredOpponents, ...avoidedPlayers]);
  const slotCount = Math.max(session.maxParticipants, activeParticipants.length, 8);
  const slots = Array.from({ length: slotCount }, (_, index) => activeParticipants[index] ?? null);
  const completedMatches = matches.filter((match) => match.status === 'COMPLETED');
  const liveMatches = matches.filter((match) => match.status === 'ONGOING');
  const playerStats = buildPlayerStats(activeParticipants, matches);
  const categoryText = `${session.category?.slug ?? ''} ${session.category?.name ?? ''}`.toLowerCase();
  const isTennis = categoryText.includes('tennis') || categoryText.includes('quan vot');
  const tabs: Array<{ id: SessionTab; label: string; icon: ReactNode; count?: number }> = [
    { id: 'overview', label: t('overviewTab'), icon: <Trophy className="h-4 w-4" /> },
    { id: 'participants', label: t('participantsTab'), icon: <Users className="h-4 w-4" />, count: activeParticipants.length },
    { id: 'matches', label: t('matchesTab'), icon: <Swords className="h-4 w-4" />, count: matches.length },
    { id: 'statistics', label: t('statisticsTab'), icon: <BarChart3 className="h-4 w-4" /> },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-5">
        <Link href={`/communities/${communityId}/manage/tournaments`} className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-900">
          <ChevronLeft className="h-4 w-4" />
          {t('back')}
        </Link>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-7 lg:col-start-1">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className={`border px-3 py-1 text-xs font-semibold ${statusClasses(session.status)}`}>{t(`status.${session.status}`)}</Badge>
                <Badge className="border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{session.isRanked ? t('rankedShort') : t('unrankedShort')}</Badge>
                <Badge className="border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">{t('sessionType')}</Badge>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{session.resolvedName}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">{session.description || t('noDescription')}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
            {session.startAt && <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-blue-600" />{formatSessionDate(session.startAt, locale, '')}</span>}
            {session.endAt && <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-blue-600" />{formatSessionDate(session.endAt, locale, '')}</span>}
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-600" />{session.isRanked ? t('rankedHint') : t('unrankedHint')}</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {session.capabilities?.canWithdraw && <Button disabled={busy} variant="outline" onClick={onWithdraw}>{t('withdraw')}</Button>}
            {session.capabilities?.canManage && ['OPEN', 'LIVE'].includes(session.status) && <Button disabled={busy} variant="outline" onClick={() => onTransition('CLOSE')}>{t('closeRegistration')}</Button>}
            {session.capabilities?.canManage && !['ENDED', 'CANCELLED'].includes(session.status) && <Button disabled={busy} variant="secondary" onClick={() => onTransition('END')}>{t('endSession')}</Button>}
            {session.capabilities?.canManage && !['ENDED', 'CANCELLED'].includes(session.status) && <Button disabled={busy} variant="destructive" onClick={() => onTransition('CANCEL')}>{t('cancelSession')}</Button>}
          </div>
        </section>

        <aside className="self-start rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:col-start-2 lg:row-start-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('clubContextLabel')}</p>
          <div className="mt-4 flex items-center gap-3">
            <Avatar name={communityName || t('clubSessionLabel')} avatarUrl={communityLogoUrl} className="h-12 w-12" />
            <div className="min-w-0"><p className="truncate font-bold text-slate-900">{communityName || t('clubSessionLabel')}</p><p className="mt-1 text-xs text-slate-500">{t('clubContextHint')}</p></div>
          </div>
        </aside>

        <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-2">
        <nav className="flex h-fit min-w-0 overflow-x-auto rounded-xl border border-slate-200/80 bg-white px-2 shadow-xs" aria-label={t('tabNavigation')}>
          {tabs.map((tab) => (
            <SessionTabButton key={tab.id} active={activeTab === tab.id} icon={tab.icon} onClick={() => setActiveTab(tab.id)}>
              {tab.label}{typeof tab.count === 'number' && <span className="ml-1 text-xs opacity-70">({tab.count})</span>}
            </SessionTabButton>
          ))}
        </nav>

        <div className="space-y-4">

        {activeTab === 'overview' && <section className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{t('sessionType')}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{t('overviewTitle')}</h2></div>
              <span className="text-sm font-medium text-slate-500">{t('counts', { participants: activeParticipants.length, matches: matches.length })}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryMetric icon={<Users className="h-4 w-4" />} value={`${activeParticipants.length}/${session.maxParticipants}`} label={t('participants')} />
              <SummaryMetric icon={<Swords className="h-4 w-4" />} value={String(matches.length)} label={t('matches')} />
              <SummaryMetric icon={<Radio className="h-4 w-4" />} value={String(liveMatches.length)} label={t('liveMatches')} />
              <SummaryMetric icon={<CheckCircle2 className="h-4 w-4" />} value={String(completedMatches.length)} label={t('completedMatches')} />
            </div>
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">{t('overviewHint')}</p>
              <p className="mt-1 leading-6">{t('registrationOpensImmediately')} {t('pairingDerivedHint')}.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">{t('basicInfoTitle')}</h2>
            <div className="mt-5 space-y-4 text-sm">
              {session.startAt && <InfoRow icon={<CalendarDays className="h-4 w-4" />} label={t('startAt')} value={formatSessionDate(session.startAt, locale, '')} />}
              {session.endAt && <InfoRow icon={<Clock3 className="h-4 w-4" />} label={t('endAt')} value={formatSessionDate(session.endAt, locale, '')} />}
              <InfoRow icon={<ShieldCheck className="h-4 w-4" />} label={t('ranked')} value={session.isRanked ? t('rankedHint') : t('unrankedHint')} />
            </div>
          </div>
        </section>}

        {activeTab === 'participants' && <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-lg font-bold text-slate-900">{t('participants')}</h2><p className="mt-1 text-sm text-slate-500">{t('participantsOnlyHint')}</p></div>
            <span className="text-sm font-medium text-slate-500">{activeParticipants.length}/{session.maxParticipants}</span>
          </div>

          <div className="mt-5 space-y-2">
            {activeParticipants.map((item) => {
              return (
                <div key={item.participant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3"><Avatar name={item.fullName} userId={item.participant.userId} avatarUrl={item.avatarUrl} mock={item.isMock} className="h-9 w-9" /><div className="min-w-0"><p title={item.fullName || undefined} className="truncate text-sm font-semibold text-slate-900">{shortDisplayName(item.fullName)}</p><p className="text-[11px] text-slate-500">{t(`participantSource.${item.participant.source}`)} · {t(`participantStatus.${item.participant.status}`)}</p></div>{item.isMock && <Badge className="border border-amber-200 bg-amber-50 text-[10px] font-medium text-amber-700">{t('mockPlayer')}</Badge>}</div>
                  <span className="text-xs font-medium text-slate-400">{t('joinedLabel')}</span>
                </div>
              );
            })}
          </div>
          {participantCursor && <Button className="mt-3" variant="outline" disabled={loadingMore} onClick={onLoadMoreParticipants}>{t('loadMore')}</Button>}

          {session.capabilities?.canManage && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <div className="mb-3 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-blue-600" /><h3 className="font-semibold text-slate-900">{t('assignSelected')}</h3></div>{session.status === 'OPEN' && <Button type="button" size="sm" variant="outline" aria-expanded={mockFormOpen} aria-label={t('createMockParticipant')} title={t('createMockParticipant')} onClick={() => setMockFormOpen((value) => !value)}><Plus className="h-4 w-4" /><span className="sr-only">{t('createMockParticipant')}</span></Button>}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {clubMembers.map((record) => {
                  const userId = record.member.userId;
                  const checked = selectedMembers.includes(userId);
                  return <label key={userId} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200/80 p-3 transition hover:border-blue-300"><input type="checkbox" checked={checked} onChange={() => setSelectedMembers((value) => checked ? value.filter((id) => id !== userId) : [...value, userId])} /><Avatar name={record.user.fullName} userId={userId} avatarUrl={record.user.avatarUrl} className="h-8 w-8" /><span title={record.user.fullName || undefined} className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{shortDisplayName(record.user.fullName)}</span>{activeIds.has(userId) && <Badge className="border border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700">{t('active')}</Badge>}</label>;
                })}
              </div>
              {memberCursor && <Button className="mt-3" variant="outline" disabled={loadingMore} onClick={onLoadMoreMembers}>{t('loadMoreMembers')}</Button>}
              <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" disabled={busy || selectedMembers.length === 0} onClick={onForceSelected}>{t('assignSelected')}</Button></div>
              {session.status === 'OPEN' && mockFormOpen && <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3"><input value={mockName} onChange={(event) => setMockName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onCreateMock(); }} placeholder={t('mockNamePlaceholder')} maxLength={255} className="min-w-52 flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400" /><Button disabled={busy || creatingMock || !mockName.trim()} variant="outline" onClick={onCreateMock}>{creatingMock ? t('creatingMock') : t('createMockParticipant')}</Button><span className="w-full text-xs text-amber-800">{t('mockNoElo')}</span></div>}
            </div>
          )}
          </div>

          {session.viewerParticipant?.status === 'ACTIVE' && <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-start gap-3"><div className="rounded-xl bg-blue-50 p-2 text-blue-600"><Settings2 className="h-5 w-5" /></div><div><h2 className="text-lg font-bold text-slate-900">{t('preferences')}</h2><p className="mt-1 text-sm text-slate-500">{t('preferencesHint')}</p></div></div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              { value: preferredPartners, setValue: setPreferredPartners, label: t('preferredPartner') },
              { value: preferredOpponents, setValue: setPreferredOpponents, label: t('preferredOpponent') },
              { value: avoidedPlayers, setValue: setAvoidedPlayers, label: t('avoidPlayer') },
            ].map((field) => <label key={field.label} className="space-y-2"><span className="text-sm font-semibold text-slate-800">{field.label}</span><select multiple className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" value={field.value} onChange={(event) => field.setValue(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}>{preferenceOptions.map((item) => <option disabled={selectedPreferenceIds.has(item.participant.userId) && !field.value.includes(item.participant.userId)} key={item.participant.userId} value={item.participant.userId}>{shortDisplayName(item.fullName)}</option>)}</select></label>)}
          </div>
          <Button className="mt-4" variant="outline" disabled={busy} onClick={onSavePreferences}>{t('savePreferences')}</Button>
          </div>}
        </section>}

        {activeTab === 'matches' && <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">{t('matches')}</h2><p className="mt-1 text-sm text-slate-500">{t('openScoring')}</p></div><div className="flex flex-wrap items-center gap-2">{session.capabilities?.canCreateMatch && <Button disabled={busy} onClick={() => setPairingOpen(true)}><Swords className="mr-2 h-4 w-4" />{t('createMatch')}</Button>}<select aria-label={t('matchStatusFilter')} className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium" value={matchStatus} onChange={(event) => setMatchStatus(event.target.value)}><option value="">{t('allMatchStatuses')}</option>{(['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const).map((status) => <option key={status} value={status}>{t(`matchStatus.${status}`)}</option>)}</select></div></div>
          {matches.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{t('noMatches')}</div> : <div className="grid gap-4 lg:grid-cols-2">{matches.map((match) => <MatchCard key={match.id} match={match} isTennis={isTennis} t={t} />)}</div>}
          {matchCursor && <div className="flex justify-center"><Button variant="outline" disabled={loadingMore} onClick={onLoadMoreMatches}>{t('loadMore')}</Button></div>}
        </section>}

        {activeTab === 'statistics' && <StatisticsPanel stats={playerStats} completedMatches={completedMatches.length} t={t} />}
        </div>
        </div>
        <RegistrationRoster slots={slots} activeCount={activeParticipants.length} maxParticipants={session.maxParticipants} t={t} canJoin={session.capabilities?.canJoin === true} canWithdraw={session.capabilities?.canWithdraw === true} busy={busy} onJoin={onJoin} onWithdraw={onWithdraw} />
      </div>
        {pairingOpen && <PairingModal participants={activeParticipants} sideAPlayers={sideAPlayers} sideBPlayers={sideBPlayers} pairingReady={pairingReady} busy={busy} t={t} assignPlayer={assignPlayer} onClose={() => setPairingOpen(false)} onCreate={() => { setPairingOpen(false); onCreateMatch(); }} />}
      </div>
    </main>
  );
}

function SummaryMetric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3"><div className="flex items-center gap-1.5 text-blue-600">{icon}<span className="text-xl font-bold text-slate-900">{value}</span></div><p className="mt-1 truncate text-[11px] font-medium text-slate-500">{label}</p></div>;
}

function SessionTabButton({ children, icon, active, onClick }: { children: ReactNode; icon: ReactNode; active: boolean; onClick: () => void }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-semibold transition sm:gap-2 sm:px-4 sm:py-3.5 sm:text-sm ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'}`}>{icon}{children}</button>;
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex items-start gap-3"><span className="mt-0.5 text-blue-600">{icon}</span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 font-medium text-slate-700">{value}</p></div></div>;
}

function RegistrationRoster({ slots, activeCount, maxParticipants, t, canJoin, canWithdraw, busy, onJoin, onWithdraw }: {
  slots: Array<ClubMatchParticipant | null>;
  activeCount: number;
  maxParticipants: number;
  t: (key: string, values?: Record<string, string | number>) => string;
  canJoin: boolean;
  canWithdraw: boolean;
  busy: boolean;
  onJoin: () => void;
  onWithdraw: () => void;
}) {
  const pageSize = 16;
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(slots.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleSlots = slots.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  return <aside className="self-start rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:col-start-2 lg:row-start-2">
    <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold text-slate-900">{t('registrationTitle')}</h2><span className="text-sm font-medium text-slate-500">{activeCount}/{maxParticipants}</span></div>
    <div className="mt-5 grid grid-cols-4 gap-x-2 gap-y-5">
      {visibleSlots.map((item, index) => {
        const slotNumber = currentPage * pageSize + index + 1;
        if (!item) {
          const emptySlot = <><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-white text-xl font-light text-slate-400">+</div><p className="mt-2 text-[11px] font-medium text-slate-400">Slot #{slotNumber}</p></>;
          return canJoin
            ? <button key={`slot-${slotNumber}`} type="button" disabled={busy} onClick={onJoin} className="min-w-0 cursor-pointer rounded-xl p-1 text-center transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60">{emptySlot}</button>
            : <div key={`slot-${slotNumber}`} className="min-w-0 text-center">{emptySlot}</div>;
        }
        return <div key={item.participant.id} className="min-w-0 text-center"><div className="flex justify-center"><Avatar name={item.fullName} userId={item.participant.userId} avatarUrl={item.avatarUrl} mock={item.isMock} className="h-12 w-12" /></div><p title={item.fullName || undefined} className="mt-2 truncate text-[11px] font-semibold text-slate-800">{shortDisplayName(item.fullName) || `#${slotNumber}`}</p></div>;
      })}
    </div>
    {pageCount > 1 && <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><Button size="sm" variant="outline" aria-label={t('previousPage')} title={t('previousPage')} disabled={currentPage === 0} onClick={() => setPage((value) => Math.max(value - 1, 0))}><ChevronLeft className="h-4 w-4" /></Button><span className="text-xs font-medium text-slate-500">{t('rosterPage', { page: currentPage + 1, pages: pageCount })}</span><Button size="sm" variant="outline" aria-label={t('nextPage')} title={t('nextPage')} disabled={currentPage === pageCount - 1} onClick={() => setPage((value) => Math.min(value + 1, pageCount - 1))}><ChevronRight className="h-4 w-4" /></Button></div>}
    {canWithdraw && <div className="mt-6 border-t border-slate-100 pt-4"><Button className="w-full" size="sm" variant="outline" disabled={busy} onClick={onWithdraw}>{t('withdraw')}</Button></div>}
  </aside>;
}

function PairingModal({ participants, sideAPlayers, sideBPlayers, pairingReady, busy, t, assignPlayer, onClose, onCreate }: {
  participants: ClubMatchParticipant[];
  sideAPlayers: string[];
  sideBPlayers: string[];
  pairingReady: boolean;
  busy: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  assignPlayer: (userId: string, side: 'A' | 'B') => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLowerCase();
  const filteredParticipants = normalizedSearch
    ? participants.filter((item) => {
        const name = (item.fullName || '').toLowerCase();
        return name.includes(normalizedSearch);
      })
    : participants;

  const aCount = sideAPlayers.length;
  const bCount = sideBPlayers.length;
  const statusLabel =
    aCount > 0 && aCount === bCount && aCount <= 2
      ? aCount === 1
        ? t('singlesReady')
        : t('doublesReady')
      : t('selectBalancedPlayers');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-match-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{t('matchesTab')}</p>
            <h2 id="create-match-title" className="mt-1 text-lg font-bold text-slate-900">
              {t('createMatchFormTitle')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{t('createMatchFormHint')}</p>
          </div>
          <button
            type="button"
            aria-label={t('closeForm')}
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <PairingSide title={t('sideA')} players={sideAPlayers} participants={participants} tone="blue" />
          <PairingSide title={t('sideB')} players={sideBPlayers} participants={participants} tone="amber" />
        </div>

        <div className="mt-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchParticipantsHint')}
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {filteredParticipants.length === 0 ? (
            <div className="py-8 text-center text-xs font-medium text-slate-400">{t('noParticipantsFound')}</div>
          ) : (
            filteredParticipants.map((item) => {
              const userId = item.participant.userId;
              const isSideA = sideAPlayers.includes(userId);
              const isSideB = sideBPlayers.includes(userId);
              const disabledA = !isSideA && sideAPlayers.length >= 2;
              const disabledB = !isSideB && sideBPlayers.length >= 2;

              return (
                <div
                  key={item.participant.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={item.fullName}
                      userId={userId}
                      avatarUrl={item.avatarUrl}
                      mock={item.isMock}
                      className="h-8 w-8"
                    />
                    <span
                      title={item.fullName || undefined}
                      className="min-w-0 truncate text-sm font-semibold text-slate-900"
                    >
                      {shortDisplayName(item.fullName)}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      size="sm"
                      variant={isSideA ? 'default' : 'outline'}
                      disabled={busy || disabledA}
                      onClick={() => assignPlayer(userId, 'A')}
                      className={`h-8 min-w-[54px] font-bold text-xs ${
                        isSideA ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
                      }`}
                    >
                      {t('sideA')}
                    </Button>
                    <Button
                      size="sm"
                      variant={isSideB ? 'default' : 'outline'}
                      disabled={busy || disabledB}
                      onClick={() => assignPlayer(userId, 'B')}
                      className={`h-8 min-w-[54px] font-bold text-xs ${
                        isSideB ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
                      }`}
                    >
                      {t('sideB')}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <p
            className={`text-xs font-semibold ${
              pairingReady ? 'text-emerald-600' : 'text-slate-500'
            }`}
          >
            {statusLabel}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={onClose}>
              {t('closeForm')}
            </Button>
            <Button disabled={busy || !pairingReady} onClick={onCreate}>
              <Swords className="mr-2 h-4 w-4" />
              {t('createMatch')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatisticsPanel({ stats, completedMatches, t }: { stats: PlayerStat[]; completedMatches: number; t: (key: string, values?: Record<string, string | number>) => string }) {
  const rankedStats = stats.filter((stat) => stat.played > 0);
  return <section className="space-y-4">
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{t('sessionType')}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{t('statisticsTitle')}</h2><p className="mt-1 text-sm text-slate-500">{t('statisticsHint')}</p></div><BarChart3 className="h-6 w-6 text-blue-600" /></div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryMetric icon={<Swords className="h-4 w-4" />} value={String(completedMatches)} label={t('completedMatches')} />
        <SummaryMetric icon={<Users className="h-4 w-4" />} value={String(rankedStats.length)} label={t('playersWithResults')} />
        <SummaryMetric icon={<Trophy className="h-4 w-4" />} value={String(rankedStats[0]?.wins ?? 0)} label={t('topWins')} />
        <SummaryMetric icon={<Flame className="h-4 w-4" />} value={rankedStats[0]?.streak ? `${rankedStats[0].streak}` : '—'} label={t('currentStreak')} />
      </div>
    </div>
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
      <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold text-slate-900">{t('playerStatistics')}</h2><span className="text-xs font-medium text-slate-500">{t('completedMatchesOnly')}</span></div>
      {stats.length === 0 ? <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{t('noParticipants')}</p> : <div className="mt-4 overflow-x-auto"><div className="min-w-[620px] space-y-2">
        {stats.map((stat, index) => <div key={stat.id} className="grid grid-cols-[auto_minmax(0,1fr)_72px_92px_92px_90px] items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3">
          <span className="w-5 text-center text-xs font-bold text-slate-400">{index + 1}</span><div className="flex min-w-0 items-center gap-2"><Avatar name={stat.name} userId={stat.id} avatarUrl={stat.avatarUrl} className="h-9 w-9" /><span title={stat.name} className="truncate text-sm font-semibold text-slate-900">{shortDisplayName(stat.name)}</span></div>
          <StatValue label={t('played')} value={String(stat.played)} /><StatValue label={t('winLoss')} value={`${stat.wins}–${stat.losses}`} /><StatValue label={t(stat.streakType === 'WIN' ? 'winningStreak' : stat.streakType === 'LOSS' ? 'losingStreak' : 'streak')} value={stat.streak ? String(stat.streak) : '—'} tone={stat.streakType === 'WIN' ? 'positive' : stat.streakType === 'LOSS' ? 'negative' : 'default'} /><StatValue label="ELO" value={`${stat.eloDelta >= 0 ? '+' : ''}${stat.eloDelta}`} tone={stat.eloDelta >= 0 ? 'positive' : 'negative'} />
        </div>)}
      </div></div>}
    </div>
  </section>;
}

function StatValue({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'positive' | 'negative' }) {
  const toneClass = tone === 'positive' ? 'text-emerald-700' : tone === 'negative' ? 'text-rose-700' : 'text-slate-800';
  return <div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className={`mt-1 text-sm font-bold ${toneClass}`}>{value}</p></div>;
}

function PairingSide({
  title,
  players,
  participants,
  tone,
}: {
  title: string;
  players: string[];
  participants: ClubMatchParticipant[];
  tone: 'blue' | 'amber';
}) {
  const classes = tone === 'blue' ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-amber-200 bg-amber-50 text-amber-900';
  return <div className={`rounded-xl border p-4 ${classes}`}><div className="flex items-center justify-between text-sm font-bold"><span>{title}</span><span>{players.length}/2</span></div><div className="mt-3 flex flex-wrap gap-2">{players.length ? players.map((userId) => { const item = participants.find((candidate) => candidate.participant.userId === userId); return <span key={userId} title={item?.fullName || userId} className="inline-flex min-w-0 items-center gap-2 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold"><Avatar name={item?.fullName} userId={userId} avatarUrl={item?.avatarUrl} className="h-6 w-6" />{shortDisplayName(item?.fullName) || userId}</span>; }) : <span className="text-sm opacity-70">Chưa chọn</span>}</div></div>;
}
