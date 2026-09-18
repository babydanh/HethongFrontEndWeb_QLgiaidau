'use client';

import { useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crown,
  Flame,
  Plus,
  Radio,
  Search,
  Settings,
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
import { BrandLogo } from '@/components/ui/BrandLogo';
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
  onUpdateMemberScoring: (enabled: boolean) => void;
  onForceSelected: (userIds?: string[]) => void;
  onCreateMock: () => void;
  onSavePreferences: () => void;
  onCreateMatch: (onCreated?: (match: ClubSessionMatch) => void) => void;
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

function ClubLogoWithFallback({
  url,
  name,
  className = 'w-11 h-11',
}: {
  url?: string | null;
  name?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return (
      <img
        src={url}
        alt={name || 'Club Logo'}
        className={`${className} rounded-full border border-blue-200 object-cover shadow-xs shrink-0`}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className={`${className} rounded-full border border-blue-100 bg-blue-50/80 flex items-center justify-center p-2 shadow-xs shrink-0`}
      title={name || 'SPORTO'}
    >
      <BrandLogo variant="icon" className="w-full h-full object-contain" />
    </div>
  );
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
      className={`group block overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md ${isLive ? 'border-rose-200' : 'border-slate-200'}`}
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
  onUpdateMemberScoring,
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hostMember = clubMembers.find((m) => m.member.role === 'OWNER') || clubMembers.find((m) => m.member.role === 'MODERATOR');
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
    { id: 'matches', label: t('matchesTab'), icon: <Swords className="h-4 w-4" />, count: matches.length },
    { id: 'statistics', label: t('statisticsTab'), icon: <BarChart3 className="h-4 w-4" /> },
  ];

  if (session.pairingMode === 'BRACKET') {
    const bracketHref = session.bracketTournamentId
      ? session.capabilities?.canManage
        ? `/lite/tournaments/${session.bracketTournamentId}/manage?tab=bracket`
        : `/tournaments/${session.bracketTournamentId}?tab=bracket`
      : null;
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Trophy className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{t('bracketMode')}</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">{session.resolvedName}</h1>
              <p className="mt-2 text-sm text-slate-600">{t('bracketManagedHint')}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {bracketHref ? (
              <Link href={bracketHref} className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
                {t('openBracket')}
              </Link>
            ) : (
              <span className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800">
                {t('bracketUnavailable')}
              </span>
            )}
            <Link href={`/communities/${communityId}`} className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {t('backToClub')}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/50 py-6 sm:py-8 px-4 sm:px-6">
      {/* ── Card 1: Master Container (Clean Modern Rounding) ── */}
      <div className="mx-auto max-w-7xl w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5 sm:p-7 md:p-8 space-y-6">
        {/* Top Bar: Back Link + Organizer Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
          <Link
            href={`/communities/${communityId}/manage/tournaments`}
            className="inline-flex items-center text-xs sm:text-sm font-semibold text-slate-500 hover:text-blue-600 transition group"
          >
            <ChevronLeft className="w-4 h-4 mr-1.5 transition group-hover:-translate-x-0.5" />
            {t('back')}
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {session.capabilities?.canManage && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSettingsOpen(true)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
                >
                  <Settings className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                  Cài đặt
                </Button>
                {['OPEN', 'LIVE'].includes(session.status) && (
                  <Button size="sm" disabled={busy} variant="outline" onClick={() => onTransition('CLOSE')} className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs">
                    {t('closeRegistration')}
                  </Button>
                )}
                {!['ENDED', 'CANCELLED'].includes(session.status) && (
                  <Button size="sm" disabled={busy} variant="secondary" onClick={() => onTransition('END')} className="px-2.5 py-1 text-xs font-medium text-blue-700 hover:text-blue-800 bg-blue-50 border border-blue-200/80 rounded-lg hover:bg-blue-100 transition shadow-xs">
                    {t('endSession')}
                  </Button>
                )}
                {!['ENDED', 'CANCELLED'].includes(session.status) && (
                  <Button
                    size="sm"
                    disabled={busy}
                    variant="outline"
                    onClick={() => onTransition('CANCEL')}
                    className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 bg-white border border-rose-200 hover:border-rose-300 hover:bg-rose-50 rounded-lg transition shadow-xs"
                  >
                    {t('cancelSession')}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Main Layout Grid: Split Left (Seamless) and Right ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* ── Left Column ── */}
          <section className="lg:col-span-7 space-y-6">
            <div className="space-y-4">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusClasses(session.status)}`}>
                  {session.status === 'OPEN' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
                  {t(`status.${session.status}`)}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200/70">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  {session.isRanked ? t('rankedShort') : t('unrankedShort')}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {t('sessionType')}
                </span>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {session.resolvedName}
                </h1>
              </div>

              {/* Host Bar (Reclub Style) & Schedule */}
              <div className="flex flex-wrap items-center justify-between gap-3 py-1 text-xs">
                {hostMember ? (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      name={hostMember.user.fullName}
                      userId={hostMember.user.id}
                      avatarUrl={hostMember.user.avatarUrl}
                      className="w-8 h-8 ring-2 ring-blue-100"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600">
                        <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        <span>Host • Người tổ chức</span>
                      </div>
                      <div className="font-bold text-slate-800 truncate text-xs">
                        {hostMember.user.fullName}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0 text-slate-600 font-semibold text-xs">
                    <CalendarDays className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{communityName || t('clubSessionLabel')}</span>
                  </div>
                )}

                {session.startAt && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200/70 shrink-0 self-start sm:self-center text-slate-700 font-medium shadow-xs">
                    <Clock3 className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{formatSessionDate(session.startAt, locale, '')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Seamless Tab Navigation */}
            <nav className="flex h-fit min-w-0 overflow-x-auto border-b border-slate-200/80 gap-2" aria-label={t('tabNavigation')}>
              {tabs.map((tab) => (
                <SessionTabButton key={tab.id} active={activeTab === tab.id} icon={tab.icon} onClick={() => setActiveTab(tab.id)}>
                  {tab.label}{typeof tab.count === 'number' && <span className="ml-1 text-xs opacity-70">({tab.count})</span>}
                </SessionTabButton>
              ))}
            </nav>

            {/* Tab content */}
            <div className="space-y-6 pt-1">
              {activeTab === 'overview' && (
                <div>
                  {session.description && session.description.trim() ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                        Mô tả buổi giao lưu
                      </h3>
                      {session.description.includes('<') ? (
                        <div
                          className="prose prose-slate max-w-none text-slate-800 text-sm leading-relaxed editorjs-content-view"
                          dangerouslySetInnerHTML={{ __html: session.description }}
                        />
                      ) : (
                        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                          {session.description}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-6 text-center text-xs text-slate-400">
                      Buổi giao lưu chưa có mô tả chi tiết.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'matches' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Swords className="w-5 h-5 text-blue-600" />
                        {t('matches')}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">{t('openScoring')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {session.capabilities?.canCreateMatch && (
                        <Button size="sm" disabled={busy} onClick={() => setPairingOpen(true)}>
                          <Swords className="mr-1.5 h-4 w-4" />{t('createMatch')}
                        </Button>
                      )}
                      <select aria-label={t('matchStatusFilter')} className="h-9 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium" value={matchStatus} onChange={(event) => setMatchStatus(event.target.value)}>
                        <option value="">{t('allMatchStatuses')}</option>
                        {(['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const).map((status) => (
                          <option key={status} value={status}>{t(`matchStatus.${status}`)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {matches.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{t('noMatches')}</div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">{matches.map((match) => <MatchCard key={match.id} match={match} isTennis={isTennis} t={t} />)}</div>
                  )}
                  {matchCursor && (
                    <div className="flex justify-center"><Button variant="outline" size="sm" disabled={loadingMore} onClick={onLoadMoreMatches}>{t('loadMore')}</Button></div>
                  )}
                </div>
              )}

              {activeTab === 'statistics' && (
                <StatisticsPanel stats={playerStats} completedMatches={completedMatches.length} t={t} />
              )}
            </div>
          </section>

          {/* ── Right Column: Card con DUY NHẤT (Right Nested Card) ── */}
          <aside className="lg:col-span-5" data-purpose="registration-card">
            <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-6 shadow-sm">
              {/* Card Header: Club branding with blue tick */}
              <div className="flex items-center gap-3.5 pb-4 mb-4 border-b border-slate-200/80">
                <ClubLogoWithFallback
                  url={communityLogoUrl}
                  name={communityName || t('clubSessionLabel')}
                  className="w-12 h-12"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {communityName || t('clubSessionLabel')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{t('clubContextHint')}</p>
                </div>
              </div>

              {/* Registration Roster */}
              <RegistrationRoster
                slots={slots}
                activeCount={activeParticipants.length}
                maxParticipants={session.maxParticipants}
                t={t}
                canJoin={session.capabilities?.canJoin === true}
                canWithdraw={session.capabilities?.canWithdraw === true}
                canManage={session.capabilities?.canManage === true}
                busy={busy}
                onJoin={onJoin}
                onWithdraw={onWithdraw}
                clubMembers={clubMembers}
                activeUserIds={activeIds}
                onAddMember={(userId) => onForceSelected([userId])}
                onAddMock={onCreateMock}
                mockName={mockName}
                setMockName={setMockName}
                creatingMock={creatingMock}
              />
            </div>
          </aside>
        </div>
      </div>

      {pairingOpen && (
        <PairingModal
          participants={activeParticipants}
          sideAPlayers={sideAPlayers}
          sideBPlayers={sideBPlayers}
          pairingReady={pairingReady}
          busy={busy}
          t={t}
          assignPlayer={assignPlayer}
          onClose={() => setPairingOpen(false)}
          onCreate={() => {
            setPairingOpen(false);
            onCreateMatch();
          }}
        />
      )}

      {settingsOpen && (
        <SessionSettingsModal
          session={session}
          busy={busy}
          t={t}
          preferenceOptions={preferenceOptions}
          preferredPartners={preferredPartners}
          setPreferredPartners={setPreferredPartners}
          preferredOpponents={preferredOpponents}
          setPreferredOpponents={setPreferredOpponents}
          avoidedPlayers={avoidedPlayers}
          setAvoidedPlayers={setAvoidedPlayers}
          onUpdateMemberScoring={onUpdateMemberScoring}
          onSavePreferences={onSavePreferences}
          onClose={() => setSettingsOpen(false)}
        />
      )}
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

function RegistrationRoster({
  slots,
  activeCount,
  maxParticipants,
  t,
  canJoin,
  canWithdraw,
  canManage,
  busy,
  onJoin,
  onWithdraw,
  clubMembers,
  activeUserIds,
  onAddMember,
  onAddMock,
  mockName,
  setMockName,
  creatingMock,
}: {
  slots: Array<ClubMatchParticipant | null>;
  activeCount: number;
  maxParticipants: number;
  t: (key: string, values?: Record<string, string | number>) => string;
  canJoin: boolean;
  canWithdraw: boolean;
  canManage: boolean;
  busy: boolean;
  onJoin: () => void;
  onWithdraw: () => void;
  clubMembers: CommunityMemberRecord[];
  activeUserIds: Set<string>;
  onAddMember: (userId: string) => void;
  onAddMock: () => void;
  mockName: string;
  setMockName: (val: string) => void;
  creatingMock: boolean;
}) {
  const pageSize = 16;
  const [page, setPage] = useState(0);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const pageCount = Math.max(1, Math.ceil(slots.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleSlots = slots.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const handleEmptySlotClick = (slotNumber: number) => {
    if (canManage) {
      setSelectedSlotIndex(slotNumber);
      setAddModalOpen(true);
    } else if (canJoin) {
      onJoin();
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-base font-bold text-slate-900">{t('registrationTitle')}</h2>
          <p className="text-xs text-slate-500">{t('registrationSlotSubtitle')}</p>
        </div>
        <div className="text-right">
          <span className="text-base font-extrabold text-blue-600">{activeCount}</span>
          <span className="text-xs font-semibold text-slate-400">/{maxParticipants}</span>
        </div>
      </div>

      {/* Slots Grid: 4 columns */}
      <div className="grid grid-cols-4 gap-y-4 gap-x-3 py-6">
        {visibleSlots.map((item, index) => {
          const slotNumber = currentPage * pageSize + index + 1;
          if (!item) {
            const isClickable = canManage || canJoin;
            return (
              <button
                key={`slot-${slotNumber}`}
                type="button"
                disabled={busy || !isClickable}
                onClick={() => handleEmptySlotClick(slotNumber)}
                className={`group flex flex-col items-center transition ${
                  isClickable ? 'cursor-pointer' : 'cursor-default opacity-70'
                }`}
                title={canManage ? `Thêm người vào slot #${slotNumber}` : canJoin ? t('join') : `Slot #${slotNumber}`}
              >
                <div className="w-12 h-12 rounded-full border-[1.5px] border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 transition group-hover:border-blue-500 group-hover:text-blue-600 group-hover:bg-blue-50/50">
                  <span className="text-lg font-light leading-none">+</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1.5 font-medium group-hover:text-blue-600">
                  Slot #{slotNumber}
                </span>
              </button>
            );
          }
          return (
            <div key={item.participant.id} className="flex flex-col items-center min-w-0">
              <Avatar
                name={item.fullName}
                userId={item.participant.userId}
                avatarUrl={item.avatarUrl}
                mock={item.isMock}
                className="w-12 h-12"
              />
              <span
                title={item.fullName || undefined}
                className="text-[11px] font-medium text-slate-700 mt-1.5 truncate max-w-[70px] text-center"
              >
                {shortDisplayName(item.fullName) || `Slot #${slotNumber}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Pagination Bar */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between py-3 border-t border-slate-200 text-xs text-slate-500 mb-5">
          <button
            type="button"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-400 hover:text-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={t('previousPage')}
            title={t('previousPage')}
            disabled={currentPage === 0}
            onClick={() => setPage((value) => Math.max(value - 1, 0))}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-medium text-slate-600">
            {t('rosterPage', { page: currentPage + 1, pages: pageCount })}
          </span>
          <button
            type="button"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 hover:text-slate-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={t('nextPage')}
            title={t('nextPage')}
            disabled={currentPage === pageCount - 1}
            onClick={() => setPage((value) => Math.min(value + 1, pageCount - 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Action Button */}
      {canWithdraw ? (
        <Button
          className="w-full rounded-xl py-3.5 px-6 font-semibold shadow-md transition-all flex items-center justify-center gap-2"
          variant="outline"
          disabled={busy}
          onClick={onWithdraw}
        >
          {t('withdraw')}
        </Button>
      ) : canJoin ? (
        <button
          type="button"
          disabled={busy}
          onClick={onJoin}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{t('join')}</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      ) : null}

      {/* Modal Thêm người vào slot (khi ấn dấu +) */}
      {addModalOpen && (
        <AddSlotParticipantModal
          slotNumber={selectedSlotIndex}
          clubMembers={clubMembers}
          activeUserIds={activeUserIds}
          busy={busy}
          mockName={mockName}
          setMockName={setMockName}
          creatingMock={creatingMock}
          onAddMember={(userId) => {
            onAddMember(userId);
            setAddModalOpen(false);
          }}
          onAddMock={() => {
            onAddMock();
            setAddModalOpen(false);
          }}
          onClose={() => setAddModalOpen(false)}
        />
      )}
    </div>
  );
}

function AddSlotParticipantModal({
  slotNumber,
  clubMembers,
  activeUserIds,
  busy,
  mockName,
  setMockName,
  creatingMock,
  onAddMember,
  onAddMock,
  onClose,
}: {
  slotNumber: number | null;
  clubMembers: CommunityMemberRecord[];
  activeUserIds: Set<string>;
  busy: boolean;
  mockName: string;
  setMockName: (val: string) => void;
  creatingMock: boolean;
  onAddMember: (userId: string) => void;
  onAddMock: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'members' | 'mock'>('members');

  const normalized = search.trim().toLowerCase();
  const availableMembers = clubMembers.filter((record) => {
    if (activeUserIds.has(record.member.userId)) return false;
    if (!normalized) return true;
    return (
      (record.user.fullName || '').toLowerCase().includes(normalized) ||
      (record.user.email || '').toLowerCase().includes(normalized)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Thêm người chơi {slotNumber ? `vào Slot #${slotNumber}` : ''}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Chọn thành viên câu lạc bộ hoặc tạo khách mời</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-slate-200/80 bg-slate-50/50 px-5 pt-2">
          <button
            type="button"
            onClick={() => setTab('members')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${
              tab === 'members'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Thành viên CLB ({clubMembers.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('mock')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${
              tab === 'mock'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Khách mời ngoài
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {tab === 'members' ? (
            <>
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm thành viên theo tên..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Members List */}
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                {availableMembers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    {normalized ? 'Không tìm thấy thành viên phù hợp' : 'Tất cả thành viên đã tham gia slot'}
                  </div>
                ) : (
                  availableMembers.map((record) => (
                    <div
                      key={record.member.userId}
                      className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-50 rounded-xl transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          name={record.user.fullName}
                          userId={record.member.userId}
                          avatarUrl={record.user.avatarUrl}
                          className="h-10 w-10"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {record.user.fullName || 'Thành viên'}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {record.member.role === 'OWNER'
                              ? '👑 Trưởng CLB'
                              : record.member.role === 'MODERATOR'
                              ? '🛡️ Ban quản trị'
                              : 'Thành viên'}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => onAddMember(record.member.userId)}
                        className="text-xs px-3 py-1 font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 transition"
                      >
                        Thêm vào slot
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                Tạo một hồ sơ người chơi tạm thời (khách mời không thuộc hệ thống hoặc chưa có tài khoản).
              </p>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Tên khách mời</label>
                <input
                  type="text"
                  value={mockName}
                  onChange={(e) => setMockName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && mockName.trim()) onAddMock();
                  }}
                  placeholder="Nhập tên người chơi khách..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <Button
                disabled={busy || creatingMock || !mockName.trim()}
                onClick={onAddMock}
                className="w-full rounded-xl py-2.5 font-semibold"
              >
                {creatingMock ? 'Đang tạo...' : 'Xác nhận thêm khách mời'}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}

function SessionSettingsModal({
  session,
  busy,
  t,
  preferenceOptions,
  preferredPartners,
  setPreferredPartners,
  preferredOpponents,
  setPreferredOpponents,
  avoidedPlayers,
  setAvoidedPlayers,
  onUpdateMemberScoring,
  onSavePreferences,
  onClose,
}: {
  session: ClubMatchSession;
  busy: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  preferenceOptions: ClubMatchParticipant[];
  preferredPartners: string[];
  setPreferredPartners: Dispatch<SetStateAction<string[]>>;
  preferredOpponents: string[];
  setPreferredOpponents: Dispatch<SetStateAction<string[]>>;
  avoidedPlayers: string[];
  setAvoidedPlayers: Dispatch<SetStateAction<string[]>>;
  onUpdateMemberScoring: (enabled: boolean) => void;
  onSavePreferences: () => void;
  onClose: () => void;
}) {
  const canManage = session.capabilities?.canManage === true;
  const isParticipant = Boolean(session.viewerParticipant);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Cài đặt buổi giao lưu</h3>
              <p className="text-xs text-slate-500">Quản lý quyền hạn & tuỳ chọn ghép cặp</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Organizer Settings */}
          {canManage && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Quyền quản trị
              </h4>
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="pr-4">
                  <div className="text-sm font-semibold text-slate-800">
                    Thành viên tự nhập điểm
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cho phép người chơi trong buổi tự cập nhật tỉ số các trận đấu
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(session.memberScoringEnabled)}
                  disabled={busy}
                  onClick={() => onUpdateMemberScoring(!session.memberScoringEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    session.memberScoringEnabled ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      session.memberScoringEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Participant Preferences */}
          {isParticipant && preferenceOptions.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Tuỳ chọn ghép cặp cá nhân
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chọn người muốn chung đội hoặc đối đầu khi xếp cặp tự động
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={onSavePreferences}
                  className="rounded-lg text-xs font-semibold"
                >
                  Lưu tuỳ chọn
                </Button>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Ưu tiên chung đội (Đồng đội):
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-lg border border-slate-200 bg-slate-50/50">
                    {preferenceOptions.map((opt) => {
                      const selected = preferredPartners.includes(opt.participant.userId);
                      return (
                        <button
                          key={opt.participant.userId}
                          type="button"
                          onClick={() => {
                            setPreferredPartners((prev) =>
                              selected
                                ? prev.filter((id) => id !== opt.participant.userId)
                                : [...prev, opt.participant.userId]
                            );
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                            selected
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Avatar
                            name={opt.fullName}
                            avatarUrl={opt.avatarUrl}
                            className="w-4 h-4"
                          />
                          <span>{shortDisplayName(opt.fullName)}</span>
                          {selected && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Ưu tiên đối đầu (Đối thủ):
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-lg border border-slate-200 bg-slate-50/50">
                    {preferenceOptions.map((opt) => {
                      const selected = preferredOpponents.includes(opt.participant.userId);
                      return (
                        <button
                          key={opt.participant.userId}
                          type="button"
                          onClick={() => {
                            setPreferredOpponents((prev) =>
                              selected
                                ? prev.filter((id) => id !== opt.participant.userId)
                                : [...prev, opt.participant.userId]
                            );
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                            selected
                              ? 'bg-amber-600 text-white'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Avatar
                            name={opt.fullName}
                            avatarUrl={opt.avatarUrl}
                            className="w-4 h-4"
                          />
                          <span>{shortDisplayName(opt.fullName)}</span>
                          {selected && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-lg text-xs font-medium">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
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
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={t('closeForm')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <PairingSide
            title={t('sideA')}
            players={sideAPlayers}
            participants={participants}
            tone="blue"
          />
          <PairingSide
            title={t('sideB')}
            players={sideBPlayers}
            participants={participants}
            tone="amber"
          />
        </div>

        <div className="mt-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('searchParticipants')}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
          {filteredParticipants.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{t('noParticipantsFound')}</p>
          ) : (
            filteredParticipants.map((item) => {
              const userId = item.participant.userId;
              const isSideA = sideAPlayers.includes(userId);
              const isSideB = sideBPlayers.includes(userId);
              const disabledA = !isSideA && sideAPlayers.length >= 2;
              const disabledB = !isSideB && sideBPlayers.length >= 2;

              return (
                <div
                  key={userId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 transition hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar
                      name={item.fullName}
                      userId={userId}
                      avatarUrl={item.avatarUrl}
                      mock={item.isMock}
                      className="h-8 w-8"
                    />
                    <div className="min-w-0">
                      <p
                        title={item.fullName || undefined}
                        className="truncate text-sm font-semibold text-slate-900"
                      >
                        {shortDisplayName(item.fullName)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {item.isMock ? t('mockPlayer') : item.participant.source}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
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
  return <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs divide-y divide-slate-100">
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{t('sessionType')}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{t('statisticsTitle')}</h2><p className="mt-1 text-sm text-slate-500">{t('statisticsHint')}</p></div><BarChart3 className="h-6 w-6 text-blue-600" /></div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryMetric icon={<Swords className="h-4 w-4" />} value={String(completedMatches)} label={t('completedMatches')} />
        <SummaryMetric icon={<Users className="h-4 w-4" />} value={String(rankedStats.length)} label={t('playersWithResults')} />
        <SummaryMetric icon={<Trophy className="h-4 w-4" />} value={String(rankedStats[0]?.wins ?? 0)} label={t('topWins')} />
        <SummaryMetric icon={<Flame className="h-4 w-4" />} value={rankedStats[0]?.streak ? `${rankedStats[0].streak}` : '—'} label={t('currentStreak')} />
      </div>
    </div>
    <div className="p-5 sm:p-6 bg-slate-50/20">
      <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold text-slate-900">{t('playerStatistics')}</h2><span className="text-xs font-medium text-slate-500">{t('completedMatchesOnly')}</span></div>
      {stats.length === 0 ? <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{t('noParticipants')}</p> : <div className="mt-4 overflow-x-auto"><div className="min-w-[620px] space-y-2">
        {stats.map((stat, index) => <div key={stat.id} className="grid grid-cols-[auto_minmax(0,1fr)_72px_92px_92px_90px] items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-xs">
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
