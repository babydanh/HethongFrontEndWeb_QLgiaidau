'use client';

import React, { useId, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Tournament } from '@/features/tournaments/api';
import type { Match } from '@/types/match';
import { communitiesApi } from '@/features/communities/api';
import { matchesApi } from '@/features/matches/api';
import { clubMatchSessionsApi } from '@/features/club-match-sessions/api';
import type { ClubSessionMatch } from '@/types/club-match-session';
import { ClubMatchScoreEntryModal, type ScoreMatch } from '@/features/club-match-sessions/ClubMatchScoreEntryModal';
import { InfiniteScrollTrigger } from '@/components/ui/infinite-scroll-trigger';
import { extractMatchScores } from '@/features/matches/score-display';
import { socketClient } from '@/lib/socket';
import { formatDateTime } from '@/utils/format';
import { getMatchRoundLabel, type RoundLabelTranslations } from '@/utils/match-round-label';
import { useAuthStore } from '@/lib/zustand/authStore';
import { rankingsApi, PlayerRanking } from '@/features/rankings/api';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';
import {
  Clock,
  Search,
  RefreshCw,
  Activity,
  ChevronRight,
  Trophy,
  Crown,
  ShieldCheck,
  Flame,
  Users,
  Plus,
} from 'lucide-react';
import { ClubStandaloneMatchModal } from '@/components/ClubStandaloneMatchModal';

interface Props {
  communityId: string;
}

type TimelineFilter = 'ALL' | 'MY_MATCHES' | 'COMPLETED' | 'ONGOING';

interface MatchWithTournament extends Match {
  tournamentName?: string;
  isClubSessionMatch?: boolean;
  isStandaloneMatch?: boolean;
  clubMatchSessionId?: string | null;
  sessionStatus?: string;
  eloDelta?: Record<string, number> | null;
  sideAUserIds?: string[];
  sideBUserIds?: string[];
  totalSetsPlayed?: number;
  eloChange?: number;
}

const ACTIVITY_PAGE_SIZE = 10;

type CursorState = {
  hasMore: boolean;
  nextCursor: string | null;
};

type ActivityPagination = {
  standalone: CursorState;
  sessions: CursorState;
  sessionMatches: Record<string, CursorState>;
  tournaments: Record<string, CursorState>;
  sessionMeta: Record<string, { name: string; status: string }>;
  pendingSessionIds: string[];
};

const emptyCursorState = (): CursorState => ({ hasMore: false, nextCursor: null });

function readCursorState(meta?: { hasMore?: boolean; nextCursor?: string | null }): CursorState {
  const hasMore = meta?.hasMore === true && Boolean(meta.nextCursor);
  return { hasMore, nextCursor: hasMore ? meta?.nextCursor ?? null : null };
}

function mapClubMatchProjection(
  match: ClubSessionMatch,
  context: 'SESSION' | 'STANDALONE',
  communityId: string,
  tournamentName: string,
  sessionId?: string,
): MatchWithTournament {
  const p1Members = match.participant1.members.map((member) => ({
    id: member.id || member.userId || '',
    userId: member.userId,
    fullName: member.fullName || '',
    avatarUrl: member.avatarUrl || null,
    isMock: member.isMock,
  }));
  const p2Members = match.participant2.members.map((member) => ({
    id: member.id || member.userId || '',
    userId: member.userId,
    fullName: member.fullName || '',
    avatarUrl: member.avatarUrl || null,
    isMock: member.isMock,
  }));
  const winnerId = match.status === 'COMPLETED'
    ? match.p1SetsWon > match.p2SetsWon ? 'SIDE_A' : match.p2SetsWon > match.p1SetsWon ? 'SIDE_B' : undefined
    : undefined;

  return {
    id: match.id,
    groupId: sessionId || match.standaloneMatchId || match.id,
    bracketBranch: 'MAIN',
    tournamentId: '',
    tournamentName,
    roundNumber: 0,
    status: match.status,
    participant1Id: 'SIDE_A',
    participant2Id: 'SIDE_B',
    winnerId,
    p1SetsWon: match.p1SetsWon ?? 0,
    p2SetsWon: match.p2SetsWon ?? 0,
    totalSetsPlayed: (match.p1SetsWon ?? 0) + (match.p2SetsWon ?? 0),
    isBye: false,
    matchOrder: 1,
    scoreDetails: match.scoreDetails || {},
    scheduledAt: match.scheduledAt || match.startedAt || match.updatedAt || undefined,
    startedAt: match.startedAt || undefined,
    completedAt: match.completedAt || undefined,
    updatedAt: match.updatedAt || new Date().toISOString(),
    participant1: { id: 'SIDE_A', teamName: p1Members.map((member) => member.fullName).filter(Boolean).join(' · ') || 'A', members: p1Members },
    participant2: { id: 'SIDE_B', teamName: p2Members.map((member) => member.fullName).filter(Boolean).join(' · ') || 'B', members: p2Members },
    isClubSessionMatch: context === 'SESSION',
    isStandaloneMatch: context === 'STANDALONE',
    contextType: context === 'SESSION' ? 'CLUB_SOCIAL_MATCH_SESSION' : 'CLUB_STANDALONE_MATCH',
    communityId: match.communityId || communityId,
    clubMatchSessionId: sessionId || null,
    sessionStatus: undefined,
    eloDelta: match.eloDelta,
    sideAUserIds: match.sideAUserIds,
    sideBUserIds: match.sideBUserIds,
    sportRules: match.sportRules as Match['sportRules'],
    tournamentConfig: match.tournamentConfig as Match['tournamentConfig'],
    revision: match.revision,
  };
}

function hasActivityCursor(pagination: ActivityPagination) {
  return pagination.standalone.hasMore || pagination.sessions.hasMore ||
    Object.values(pagination.sessionMatches).some((cursor) => cursor.hasMore) ||
    Object.values(pagination.tournaments).some((cursor) => cursor.hasMore) ||
    pagination.pendingSessionIds.length > 0;
}

function toScoreMatch(match: MatchWithTournament): ScoreMatch {
  const mapMembers = (participant: Match['participant1'], side: 'A' | 'B') => (participant?.members || []).map((member, index) => ({
    id: `${match.id}-${side}-${index}`,
    userId: member.userId,
    fullName: member.fullName || null,
    avatarUrl: member.avatarUrl || null,
    isMock: member.isMock,
  }));
  return {
    id: match.id,
    status: match.status === 'DISPUTED' ? 'COMPLETED' : match.status,
    revision: match.revision ?? 0,
    p1SetsWon: match.p1SetsWon ?? 0,
    p2SetsWon: match.p2SetsWon ?? 0,
    scoreDetails: match.scoreDetails,
    sportRules: match.sportRules as Record<string, unknown> | null | undefined,
    tournamentConfig: match.tournamentConfig as Record<string, unknown> | null | undefined,
    participant1: { id: 'SIDE_A', members: mapMembers(match.participant1, 'A') },
    participant2: { id: 'SIDE_B', members: mapMembers(match.participant2, 'B') },
  };
}

type MatchParticipant = NonNullable<Match['participant1']>;
type MatchParticipantMember = NonNullable<MatchParticipant['members']>[number];

function getParticipantProfileId(
  participantId?: string | null,
  member?: MatchParticipantMember,
): string | undefined {
  if (member?.userId) return member.userId;
  if (participantId && !participantId.startsWith('SIDE_')) return participantId;
  return undefined;
}

function ParticipantAvatarStack({
  participant,
  participantId,
  fallbackLogoUrl,
  fallbackName,
  winner,
  communityId,
}: {
  participant: Match['participant1'];
  participantId?: string | null;
  fallbackLogoUrl?: string | null;
  fallbackName: string;
  winner: boolean;
  communityId: string;
}) {
  const { openUserProfile } = useUserProfileModalStore();
  const members = participant?.members || [];
  const items: Array<{
    userId?: string;
    fullName?: string | null;
    avatarUrl?: string | null;
  }> = members.length > 0
    ? members.slice(0, 2)
    : [{
        userId: getParticipantProfileId(participantId),
        fullName: fallbackName,
        avatarUrl: fallbackLogoUrl,
      }];

  return (
    <div className="flex shrink-0 items-center -space-x-2">
      {items.map((member, index) => {
        const targetUserId = getParticipantProfileId(participantId, member);
        const displayName = member.fullName || fallbackName;
        const avatarUrl = member.avatarUrl || (members.length === 0 ? fallbackLogoUrl : null);

        return (
          <button
            key={`${targetUserId || displayName}-${index}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (!targetUserId) return;
              openUserProfile(
                {
                  id: targetUserId,
                  fullName: displayName,
                  avatarUrl,
                },
                event.currentTarget.getBoundingClientRect(),
                communityId,
              );
            }}
            title={`Xem hồ sơ ${displayName}`}
            aria-label={`Xem hồ sơ ${displayName}`}
            className={`relative w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-transform active:scale-90 overflow-hidden border shadow-2xs ${
              winner
                ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-600 text-white'
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300'
            }`}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{displayName.charAt(0).toUpperCase() || '?'}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function isMockOrPlaceholderParticipant(name?: string | null, isMock?: boolean): boolean {
  if (isMock === true) return true;
  if (!name) return true;
  const normalized = name
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (!normalized) return true;
  if (
    normalized.includes('(VĐV ẢO)') ||
    normalized.includes('VĐV ẢO') ||
    normalized.includes('VDV AO') ||
    normalized.includes('VĐV AO') ||
    normalized.includes('(ẢO)') ||
    normalized.includes('[ẢO]') ||
    normalized.includes('MOCK')
  ) {
    return true;
  }
  const placeholders = new Set([
    'TBD',
    'TBA',
    'BYE',
    'WAITING',
    'PENDING',
    'CHỜ XÁC ĐỊNH',
    'CHO XAC DINH',
    'ĐANG CHỜ',
    'DANG CHO',
    'CHƯA XÁC ĐỊNH',
    'CHUA XAC DINH',
  ]);
  return placeholders.has(normalized);
}

function isRenderablePublicMatch(match: MatchWithTournament): boolean {
  if (match.isBye) return false;
  const p1 = match.participant1;
  const p2 = match.participant2;
  const p1Id = match.participant1Id || p1?.id;
  const p2Id = match.participant2Id || p2?.id;
  if (!p1Id || !p2Id) return false;

  const t1Name = p1?.teamName;
  const t2Name = p2?.teamName;
  if (isMockOrPlaceholderParticipant(t1Name, p1?.isMock)) return false;
  if (isMockOrPlaceholderParticipant(t2Name, p2?.isMock)) return false;

  const p1Members = p1?.members || [];
  const p2Members = p2?.members || [];
  if (p1Members.some((mem) => isMockOrPlaceholderParticipant(mem.fullName, mem.isMock))) {
    return false;
  }
  if (p2Members.some((mem) => isMockOrPlaceholderParticipant(mem.fullName, mem.isMock))) {
    return false;
  }

  return true;
}

/**
 * Shape-matched skeleton loader following taste-skill rules (Mục 6)
 */
function ClubActivitySkeleton() {
  return (
    <div className="space-y-6 pt-2" aria-label="Loading club activity feed">
      <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="relative group">
            <div className="absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full bg-slate-200 ring-4 ring-white animate-pulse" />
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs animate-pulse space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="h-4 bg-slate-200 rounded-md w-36" />
                <div className="h-4 bg-slate-200 rounded-md w-24" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-200" />
                    <div className="h-4 bg-slate-200 rounded-md w-40" />
                    <div className="h-4.5 bg-slate-200 rounded-full w-9" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 bg-slate-200 rounded-md" />
                    <div className="w-7 h-7 bg-slate-200 rounded-md" />
                    <div className="w-7 h-7 bg-slate-200 rounded-md" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-200" />
                    <div className="h-4 bg-slate-200 rounded-md w-36" />
                    <div className="h-4.5 bg-slate-200 rounded-full w-9" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 bg-slate-200 rounded-md" />
                    <div className="w-7 h-7 bg-slate-200 rounded-md" />
                    <div className="w-7 h-7 bg-slate-200 rounded-md" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                <div className="h-3.5 bg-slate-200 rounded-md w-32" />
                <div className="h-7 bg-slate-200 rounded-lg w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClubActivityTab({ communityId }: Props) {
  const searchInputId = useId();
  const matchTranslate = useTranslations('Match');
  const commonTranslate = useTranslations('Common');

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<MatchWithTournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<TimelineFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStandaloneModalOpen, setIsStandaloneModalOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [scoreMatch, setScoreMatch] = useState<ScoreMatch | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(ACTIVITY_PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<ActivityPagination>({
    standalone: emptyCursorState(),
    sessions: emptyCursorState(),
    sessionMatches: {},
    tournaments: {},
    sessionMeta: {},
    pendingSessionIds: [],
  });
  const matchesRef = useRef<MatchWithTournament[]>([]);
  const paginationRef = useRef<ActivityPagination>(pagination);
  const visibleLimitRef = useRef(ACTIVITY_PAGE_SIZE);
  const loadMoreInFlightRef = useRef(false);

  const roundLabelTranslations = useMemo<RoundLabelTranslations>(() => ({
    roundGrandFinal: matchTranslate('roundGrandFinal'),
    roundFinal: matchTranslate('roundFinal'),
    roundSemifinal: matchTranslate('roundSemifinal'),
    roundQuarterfinal: matchTranslate('roundQuarterfinal'),
    roundGroupStage: matchTranslate('roundGroupStage'),
    winnersBracket: matchTranslate('winnersBracket'),
    losersBracket: matchTranslate('losersBracket'),
    playoff: matchTranslate('phasePlayoff'),
    roundOf: (round) => matchTranslate('roundOf', { round }),
    legSuffix: (leg) => `${matchTranslate('leg')} ${leg}`,
  }), [matchTranslate]);

  const commitActivityMatches = useCallback((items: MatchWithTournament[], nextPagination: ActivityPagination) => {
    const uniqueMatches = [...new Map(items.map((item) => [item.id, item])).values()];
    matchesRef.current = uniqueMatches;
    paginationRef.current = nextPagination;
    setMatches(uniqueMatches);
    setPagination(nextPagination);
    visibleLimitRef.current = ACTIVITY_PAGE_SIZE;
    setVisibleLimit(ACTIVITY_PAGE_SIZE);
  }, []);

  const appendActivityMatches = useCallback((items: MatchWithTournament[]) => {
    if (items.length === 0) return;
    const uniqueMatches = [...new Map([...matchesRef.current, ...items].map((item) => [item.id, item])).values()];
    matchesRef.current = uniqueMatches;
    setMatches(uniqueMatches);
  }, []);

  // Fetch the first cursor page from every current activity source. The UI only reveals ten rows;
  // later triggers reveal the local buffer before asking the server for another cursor page.
  const fetchClubMatches = useCallback(async (isRefresh = false) => {
    if (!communityId) return;
    if (isRefresh) {
      setIsRefreshing(true);
    }

    try {
      const allMatches: MatchWithTournament[] = [];
      const nextPagination: ActivityPagination = {
        standalone: emptyCursorState(),
        sessions: emptyCursorState(),
        sessionMatches: {},
        tournaments: {},
        sessionMeta: {},
        pendingSessionIds: [],
      };

      // 1. Get community tournaments & their real matches
      try {
        const tourRes = await communitiesApi.getTournaments(communityId);
        const tourList = Array.isArray(tourRes?.data) ? tourRes.data : [];
        setTournaments(tourList);

        if (tourList.length > 0) {
          const recentTournaments = tourList.slice(0, 5);
          const matchPromises = recentTournaments.map(async (t) => {
            try {
              const res = await matchesApi.getMatches({
                tournament_id: t.id,
                limit: ACTIVITY_PAGE_SIZE,
                status: '',
              });
              nextPagination.tournaments[t.id] = readCursorState(res.meta);
              const matchItems = Array.isArray(res?.data) ? (res.data as Match[]) : [];
              return matchItems
                .map((m) => ({
                  ...m,
                  tournamentName: t.name,
                }))
                .filter(isRenderablePublicMatch);
            } catch {
              return [] as MatchWithTournament[];
            }
          });

          const results = await Promise.all(matchPromises);
          allMatches.push(...results.flat());
        }
      } catch (err) {
        console.warn('Failed to fetch club tournaments', err);
      }

      // 2. Get club match sessions (buổi giao lưu) & their real matches (parity with mobile app)
      try {
        const sessionPage = await clubMatchSessionsApi.list(communityId, { limit: ACTIVITY_PAGE_SIZE });
        const sessions = sessionPage.data || [];
        nextPagination.sessions = readCursorState(sessionPage.meta);
        sessions.forEach((session) => {
          nextPagination.sessionMeta[session.id] = {
            name: session.resolvedName || session.name || matchTranslate('clubSessionBadge'),
            status: session.status,
          };
        });

        const sessionPromises = sessions.map(async (session) => {
          try {
            const matchesPage = await clubMatchSessionsApi.matches(session.id, { limit: ACTIVITY_PAGE_SIZE });
            nextPagination.sessionMatches[session.id] = readCursorState(matchesPage.meta);
            const sMatches = matchesPage.data || [];

            const sessionMapped = sMatches
              .map((sm) => mapClubMatchProjection(sm, 'SESSION', communityId, session.resolvedName || session.name || matchTranslate('clubSessionBadge'), session.id))
              .map((item) => ({ ...item, sessionStatus: session.status }))
              .filter(isRenderablePublicMatch);

            return sessionMapped;
          } catch {
            return [] as MatchWithTournament[];
          }
        });

        const sessionResults = await Promise.all(sessionPromises);
        allMatches.push(...sessionResults.flat());
      } catch (err) {
        console.warn('Failed to fetch club match sessions', err);
      }

      // 3. Get standalone matches (trận riêng lẻ)
      try {
        const standalonePage = await clubMatchSessionsApi.standaloneMatches(communityId, { limit: ACTIVITY_PAGE_SIZE });
        const standaloneList = standalonePage.data || [];
        nextPagination.standalone = readCursorState(standalonePage.meta);

        for (const sm of standaloneList) {
          const standaloneMatch = mapClubMatchProjection(sm, 'STANDALONE', communityId, matchTranslate('clubStandaloneMatchBadge'));

          if (isRenderablePublicMatch(standaloneMatch)) {
            allMatches.push(standaloneMatch);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch standalone matches', err);
      }

      commitActivityMatches(allMatches, nextPagination);
    } catch (err) {
      console.error('Failed to fetch club activity matches', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [communityId, commitActivityMatches, matchTranslate]);

  const loadMoreActivity = useCallback(async () => {
    if (loadMoreInFlightRef.current || !communityId) return;
    const currentLimit = visibleLimitRef.current;
    if (matchesRef.current.length > currentLimit) {
      visibleLimitRef.current += ACTIVITY_PAGE_SIZE;
      setVisibleLimit(visibleLimitRef.current);
      return;
    }
    if (!hasActivityCursor(paginationRef.current)) return;

    loadMoreInFlightRef.current = true;
    setIsLoadingMore(true);
    const current = paginationRef.current;
    const nextPagination: ActivityPagination = {
      standalone: { ...current.standalone },
      sessions: { ...current.sessions },
      sessionMatches: { ...current.sessionMatches },
      tournaments: { ...current.tournaments },
      sessionMeta: { ...current.sessionMeta },
      pendingSessionIds: [...current.pendingSessionIds],
    };
    let incoming: MatchWithTournament[] = [];

    try {
      if (nextPagination.standalone.hasMore && nextPagination.standalone.nextCursor) {
        const page = await clubMatchSessionsApi.standaloneMatches(communityId, {
          limit: ACTIVITY_PAGE_SIZE,
          cursor: nextPagination.standalone.nextCursor,
        });
        nextPagination.standalone = readCursorState(page.meta);
        incoming = page.data.map((item) => mapClubMatchProjection(item, 'STANDALONE', communityId, matchTranslate('clubStandaloneMatchBadge'))).filter(isRenderablePublicMatch);
      } else {
        const tournamentEntry = Object.entries(nextPagination.tournaments).find(([, state]) => state.hasMore && state.nextCursor);
        if (tournamentEntry) {
          const [tournamentId, state] = tournamentEntry;
          const tournament = tournaments.find((item) => item.id === tournamentId);
          const page = await matchesApi.getMatches({
            tournament_id: tournamentId,
            limit: ACTIVITY_PAGE_SIZE,
            cursor: state.nextCursor,
            status: '',
          });
          nextPagination.tournaments[tournamentId] = readCursorState(page.meta);
          incoming = (page.data as Match[])
            .map((item) => ({ ...item, tournamentName: tournament?.name }))
            .filter(isRenderablePublicMatch);
        } else {
          let sessionId = Object.entries(nextPagination.sessionMatches).find(([, state]) => state.hasMore && state.nextCursor)?.[0];
          if (!sessionId && nextPagination.pendingSessionIds.length === 0 && nextPagination.sessions.hasMore && nextPagination.sessions.nextCursor) {
            const page = await clubMatchSessionsApi.list(communityId, {
              limit: ACTIVITY_PAGE_SIZE,
              cursor: nextPagination.sessions.nextCursor,
            });
            nextPagination.sessions = readCursorState(page.meta);
            page.data.forEach((session) => {
              nextPagination.sessionMeta[session.id] = {
                name: session.resolvedName || session.name || matchTranslate('clubSessionBadge'),
                status: session.status,
              };
              nextPagination.pendingSessionIds.push(session.id);
            });
          }
          sessionId = sessionId || nextPagination.pendingSessionIds.shift();
          if (sessionId) {
            const state = nextPagination.sessionMatches[sessionId] || emptyCursorState();
            const page = await clubMatchSessionsApi.matches(sessionId, {
              limit: ACTIVITY_PAGE_SIZE,
              cursor: state.nextCursor || undefined,
            });
            nextPagination.sessionMatches[sessionId] = readCursorState(page.meta);
            const session = nextPagination.sessionMeta[sessionId];
            incoming = page.data
              .map((item) => mapClubMatchProjection(item, 'SESSION', communityId, session?.name || matchTranslate('clubSessionBadge'), sessionId))
              .map((item) => ({ ...item, sessionStatus: session?.status }))
              .filter(isRenderablePublicMatch);
          }
        }
      }

      const beforeCount = matchesRef.current.length;
      paginationRef.current = nextPagination;
      setPagination(nextPagination);
      appendActivityMatches(incoming);
      const addedCount = matchesRef.current.length - beforeCount;
      if (addedCount > 0) {
        visibleLimitRef.current += Math.min(ACTIVITY_PAGE_SIZE, addedCount);
        setVisibleLimit(visibleLimitRef.current);
      }
    } catch (error) {
      console.warn('Failed to load more club activity', error);
    } finally {
      loadMoreInFlightRef.current = false;
      setIsLoadingMore(false);
    }
  }, [appendActivityMatches, communityId, matchTranslate, tournaments]);

  const { user } = useAuthStore();
  const { openUserProfile } = useUserProfileModalStore();
  const [userMembership, setUserMembership] = useState<{
    role: string;
    status: string;
    tags?: string[];
  } | null>(null);
  const [userRanking, setUserRanking] = useState<PlayerRanking | null>(null);

  // Fetch current user info in this community
  useEffect(() => {
    if (!communityId || !user?.id) {
      return;
    }

    let isMounted = true;
    Promise.allSettled([
      communitiesApi.getMyMembership(communityId),
      rankingsApi.getUserRankings(user.id),
      communitiesApi.getMembers(communityId, { limit: 100 }),
    ]).then(([membershipRes, rankingRes, membersRes]) => {
      if (!isMounted) return;

      // Parse membership & tags
      let role = 'MEMBER';
      let status = 'JOINED';
      let tags: string[] = [];

      if (membershipRes.status === 'fulfilled') {
        const payload = (membershipRes.value as unknown as { data?: { role?: string; status?: string } }).data
          ?? (membershipRes.value as unknown as { role?: string; status?: string });
        if (payload?.role) role = payload.role;
        if (payload?.status) status = payload.status;
      }

      if (membersRes.status === 'fulfilled') {
        const memberList = membersRes.value?.data || [];
        const found = memberList.find((m) => m.member?.userId === user.id);
        if (found?.member?.tags) {
          tags = found.member.tags;
        }
      }

      setUserMembership({ role, status, tags });

      // Parse user rankings in this club
      if (rankingRes.status === 'fulfilled') {
        const ownRank = rankingRes.value.communityRanks?.find(
          (r) => r.communityId === communityId
        );
        setUserRanking(ownRank || null);
      }
    }).finally(() => {
    });

    return () => {
      isMounted = false;
    };
  }, [communityId, user?.id]);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (active) {
        await fetchClubMatches();
      }
    })();

    return () => {
      active = false;
    };
  }, [fetchClubMatches]);

  // The community room is the cross-device path: a match created in the app
  // or on the web is immediately reconciled into the same activity feed.
  useEffect(() => {
    const socket = socketClient.getMatchSocket();
    const parsePayload = (raw: unknown): Record<string, unknown> | null => {
      if (typeof raw === 'string') {
        try {
          const parsed: unknown = JSON.parse(raw);
          return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed as Record<string, unknown>
            : null;
        } catch {
          return null;
        }
      }
      return raw && typeof raw === 'object' && !Array.isArray(raw)
        ? raw as Record<string, unknown>
        : null;
    };

    const handleMatchUpdate = (raw: unknown) => {
      const updatedMatch = parsePayload(raw);
      if (!updatedMatch?.id) return;

      // Community events carry a complete projection for create/score/status.
      // Refetching keeps the Web card shape identical to the App projection.
      const eventCommunityId = updatedMatch.communityId
        ?? (updatedMatch.community as Record<string, unknown> | undefined)?.id;
      const isClubEvent =
        updatedMatch.contextType === 'CLUB_SOCIAL_MATCH_SESSION' ||
        updatedMatch.contextType === 'CLUB_STANDALONE_MATCH' ||
        eventCommunityId === communityId;
      if (!isClubEvent) return;
      void fetchClubMatches();
    };

    const join = () => socket.emit('joinClubCommunity', communityId);
    socket.on('connect', join);
    socket.on('match:update', handleMatchUpdate);
    if (!socket.connected) socket.connect(); else join();
    const recoveryTimer = window.setInterval(() => {
      void fetchClubMatches();
    }, 30000);

    return () => {
      window.clearInterval(recoveryTimer);
      socket.emit('leaveClubCommunity', communityId);
      socket.off('connect', join);
      socket.off('match:update', handleMatchUpdate);
    };
  }, [communityId, fetchClubMatches]);

  useEffect(() => {
    const socket = socketClient.getMatchSocket();
    const handleScoreOrStatus = (raw: unknown) => {
      if (!raw) return;
      // Match-scoped events can be received when the user opens a score board;
      // refresh the feed so the card gets the same authoritative projection.
      void fetchClubMatches();
    };
    socket.on('score:update', handleScoreOrStatus);
    socket.on('match:status', handleScoreOrStatus);
    socket.on('elo:update', handleScoreOrStatus);
    return () => {
      socket.off('score:update', handleScoreOrStatus);
      socket.off('match:status', handleScoreOrStatus);
      socket.off('elo:update', handleScoreOrStatus);
    };
  }, [fetchClubMatches]);

  // Listen for filter request from UserProfilePopover
  useEffect(() => {
    const handleFilterMatches = (event: Event) => {
      const customEvent = event as CustomEvent<{ query?: string }>;
      if (customEvent.detail?.query) {
        setSearchQuery(customEvent.detail.query);
        setFilter('ALL');
      }
    };

    window.addEventListener('sporto:filter-club-matches', handleFilterMatches);
    return () => {
      window.removeEventListener('sporto:filter-club-matches', handleFilterMatches);
    };
  }, []);

  // Active matches list: direct from API
  const effectiveMatches = matches;

  // Filter and sort for timeline view
  const timelineMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const currentUserId = user?.id;
    const currentUserName = (user?.fullName || '').toLowerCase();

    return effectiveMatches
      .filter((m) => {
        if (filter === 'COMPLETED' && m.status !== 'COMPLETED') return false;
        if (filter === 'ONGOING' && m.status !== 'ONGOING') return false;

        if (filter === 'MY_MATCHES') {
          if (!currentUserId && !currentUserName) return false;
          const p1Id = m.participant1Id || m.participant1?.id;
          const p2Id = m.participant2Id || m.participant2?.id;
          const isP1 =
            p1Id === currentUserId ||
            (m.participant1?.members || []).some((mem) => mem.userId === currentUserId) ||
            (m.sideAUserIds || []).includes(currentUserId || '');
          const isP2 =
            p2Id === currentUserId ||
            (m.participant2?.members || []).some((mem) => mem.userId === currentUserId) ||
            (m.sideBUserIds || []).includes(currentUserId || '');
          const t1Name = (m.participant1?.teamName || '').toLowerCase();
          const t2Name = (m.participant2?.teamName || '').toLowerCase();
          const nameMatch = currentUserName && (t1Name.includes(currentUserName) || t2Name.includes(currentUserName));
          if (!isP1 && !isP2 && !nameMatch) return false;
        }

        if (query) {
          const t1 = (m.participant1?.teamName || '').toLowerCase();
          const t2 = (m.participant2?.teamName || '').toLowerCase();
          const tName = (m.tournamentName || '').toLowerCase();
          const m1 = (m.participant1?.members || []).some((mem) => (mem.fullName || '').toLowerCase().includes(query));
          const m2 = (m.participant2?.members || []).some((mem) => (mem.fullName || '').toLowerCase().includes(query));
          if (!t1.includes(query) && !t2.includes(query) && !tName.includes(query) && !m1 && !m2) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (a.status === 'ONGOING' && b.status !== 'ONGOING') return -1;
        if (b.status === 'ONGOING' && a.status !== 'ONGOING') return 1;

        const timeA = new Date(a.completedAt || a.updatedAt || a.startedAt || a.scheduledAt || 0).getTime();
        const timeB = new Date(b.completedAt || b.updatedAt || b.startedAt || b.scheduledAt || 0).getTime();
        return timeB - timeA;
      });
  }, [effectiveMatches, filter, searchQuery, user?.id, user?.fullName]);

  const visibleTimelineMatches = timelineMatches.slice(0, visibleLimit);
  const hasMoreActivity = timelineMatches.length > visibleLimit || hasActivityCursor(pagination);

  // Compute user matches count in this club
  const userMatchesCount = useMemo(() => {
    if (!user?.id && !user?.fullName) return 0;
    const currentUserId = user?.id;
    const currentUserName = (user?.fullName || '').toLowerCase();

    return effectiveMatches.filter((m) => {
      const p1Id = m.participant1Id || m.participant1?.id;
      const p2Id = m.participant2Id || m.participant2?.id;
      const isP1 =
        p1Id === currentUserId ||
        (m.participant1?.members || []).some((mem) => mem.userId === currentUserId) ||
        (m.sideAUserIds || []).includes(currentUserId || '');
      const isP2 =
        p2Id === currentUserId ||
        (m.participant2?.members || []).some((mem) => mem.userId === currentUserId) ||
        (m.sideBUserIds || []).includes(currentUserId || '');
      const t1Name = (m.participant1?.teamName || '').toLowerCase();
      const t2Name = (m.participant2?.teamName || '').toLowerCase();
      return isP1 || isP2 || (currentUserName && (t1Name.includes(currentUserName) || t2Name.includes(currentUserName)));
    }).length;
  }, [effectiveMatches, user?.id, user?.fullName]);

  return (
    <div className="space-y-6">
      {/* 🏅 My Club Profile Banner (Linear / Clean Anti-Slop HUD) */}
      {user?.id && (
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: User Identity, Role, Tags */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName || 'Me'} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}</span>
                  )}
                </div>
                {userMembership?.role === 'OWNER' && (
                  <span title={matchTranslate('clubRoleOwner')} className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center ring-2 ring-white shadow-2xs">
                    <Crown className="w-3 h-3" />
                  </span>
                )}
                {userMembership?.role === 'MODERATOR' && (
                  <span title={matchTranslate('clubRoleModerator')} className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center ring-2 ring-white shadow-2xs">
                    <ShieldCheck className="w-3 h-3" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm sm:text-base truncate">
                    {user.fullName || matchTranslate('clubMemberFallback')}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                    {userMembership?.role === 'OWNER'
                      ? matchTranslate('clubRoleOwner')
                      : userMembership?.role === 'MODERATOR'
                      ? matchTranslate('clubRoleModerator')
                      : matchTranslate('clubRoleMember')}
                  </span>
                  {/* Member Tags */}
                  {userMembership?.tags && userMembership.tags.length > 0 && (
                    userMembership.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200/60"
                      >
                        {t}
                      </span>
                    ))
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {matchTranslate('clubMyProfileSubtitle')}
                </p>
              </div>
            </div>

            {/* Right: Quick Telemetry Pills (Anti-slop Monospace Metrics) */}
            <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              {/* ELO Telemetry */}
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{matchTranslate('clubPointsLabel')}</p>
                <p className="text-sm font-black font-mono text-blue-700">
                  {userRanking?.eloPoints ? `${userRanking.eloPoints} ELO` : matchTranslate('clubUnranked')}
                </p>
              </div>

              {/* Matches Record */}
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{matchTranslate('clubMatchesCountLabel')}</p>
                <p className="text-sm font-black font-mono text-slate-800">
                  {matchTranslate('clubActivityMatchesCount', { count: userMatchesCount })}
                </p>
              </div>

              {/* Win Streak / Form */}
              {userRanking && typeof userRanking.winStreak === 'number' && userRanking.winStreak > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1 justify-end">
                    <Flame className="w-3 h-3" /> {matchTranslate('clubFormLabel')}
                  </p>
                  <p className="text-sm font-black font-mono text-emerald-700">
                    W{userRanking.winStreak}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header bar: Title & Subtitle + Search & Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              {matchTranslate('clubActivityTitle')}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {matchTranslate('clubActivitySubtitle')}
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter buttons */}
          <div className="flex items-center gap-0.5 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`h-7 rounded-md px-2 transition-colors ${
                filter === 'ALL'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {matchTranslate('clubActivityFilterAll')}
            </button>
            {user?.id && (
              <button
                type="button"
                onClick={() => setFilter('MY_MATCHES')}
                className={`flex h-7 items-center gap-1 rounded-md px-2 transition-colors ${
                  filter === 'MY_MATCHES'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{matchTranslate('clubActivityFilterMyMatches')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setFilter('ONGOING')}
              className={`h-7 rounded-md px-2 transition-colors ${
                filter === 'ONGOING'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {matchTranslate('clubActivityFilterOngoing')}
            </button>
            <button
              type="button"
              onClick={() => setFilter('COMPLETED')}
              className={`h-7 rounded-md px-2 transition-colors ${
                filter === 'COMPLETED'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {matchTranslate('clubActivityFilterCompleted')}
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <label htmlFor={searchInputId} className="sr-only">
              {matchTranslate('searchPlaceholder')}
            </label>
            <input
              id={searchInputId}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={matchTranslate('clubActivitySearchPlaceholder')}
              className="h-7 w-36 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-400 focus:outline-hidden sm:w-52"
            />
          </div>

          {/* Create Standalone Match button */}
          <button
            type="button"
            onClick={() => setIsStandaloneModalOpen(true)}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-blue-700 active:bg-blue-800"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{commonTranslate('club_createMatchStandalone')}</span>
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => void fetchClubMatches(true)}
            disabled={isRefreshing}
            title={matchTranslate('clubActivityRefresh')}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isLoading && matches.length === 0 ? (
        <ClubActivitySkeleton />
      ) : timelineMatches.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl bg-white text-slate-500">
          <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">{matchTranslate('clubActivityEmptyTitle')}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {filter === 'MY_MATCHES'
              ? matchTranslate('clubActivityEmptyMyMatches')
              : matchTranslate('clubActivityEmptyDesc')}
          </p>
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 pt-1">
          {visibleTimelineMatches.map((match) => {
            const isCompleted = match.status === 'COMPLETED';
            const isOngoing = match.status === 'ONGOING';

            const p1 = match.participant1;
            const p2 = match.participant2;
            const p1Id = match.participant1Id || p1?.id;
            const p2Id = match.participant2Id || p2?.id;
            const p1ProfileId = getParticipantProfileId(p1Id, p1?.members?.[0]);
            const p2ProfileId = getParticipantProfileId(p2Id, p2?.members?.[0]);

            const isP1Winner = isCompleted && match.winnerId === p1Id;
            const isP2Winner = isCompleted && match.winnerId === p2Id;

            const roundLabel = getMatchRoundLabel({
              match,
              translations: roundLabelTranslations,
            });
            const sets = extractMatchScores(match.scoreDetails);
            const totalSets = sets.length;
            const displaySets = totalSets > 5 ? sets.slice(totalSets - 5) : sets;
            const skippedSetsCount = totalSets > 5 ? totalSets - 5 : 0;

            // Real avatar/logo resolution
            const p1Logo = p1?.members?.[0]?.avatarUrl || null;
            const p2Logo = p2?.members?.[0]?.avatarUrl || null;

            // ELO delta calculation / extraction
            let p1EloDelta: string | null = null;
            let p2EloDelta: string | null = null;

            if (match.isClubSessionMatch && match.eloDelta && isCompleted) {
              const p1MemberUserIds = (match.participant1?.members || []).map((m) => m.userId).filter((id): id is string => Boolean(id));
              const p2MemberUserIds = (match.participant2?.members || []).map((m) => m.userId).filter((id): id is string => Boolean(id));

              const p1Delta = p1MemberUserIds.map((uid) => match.eloDelta?.[uid]).find((d) => typeof d === 'number');
              const p2Delta = p2MemberUserIds.map((uid) => match.eloDelta?.[uid]).find((d) => typeof d === 'number');

              if (typeof p1Delta === 'number') {
                p1EloDelta = `${p1Delta > 0 ? '+' : ''}${p1Delta}`;
              }
              if (typeof p2Delta === 'number') {
                p2EloDelta = `${p2Delta > 0 ? '+' : ''}${p2Delta}`;
              }
            } else if (isCompleted && match.winnerId) {
              const rawEloDelta = match.scoreDetails?.eloDelta;
              const eloDelta = typeof rawEloDelta === 'number' ? rawEloDelta : match.eloChange;
              if (typeof eloDelta === 'number' && Number.isFinite(eloDelta)) {
                p1EloDelta = isP1Winner ? `+${eloDelta}` : `-${eloDelta}`;
                p2EloDelta = isP2Winner ? `+${eloDelta}` : `-${eloDelta}`;
              }
            }

            const displayTime = match.completedAt
              ? formatDateTime(match.completedAt)
              : match.startedAt
              ? `Bắt đầu lúc ${formatDateTime(match.startedAt)}`
              : match.scheduledAt
              ? formatDateTime(match.scheduledAt)
              : null;
            const isClubActivityMatch = match.isClubSessionMatch || match.isStandaloneMatch;
            const openScoreFromCard = () => {
              setScoreMatch(toScoreMatch(match));
              setIsScoreModalOpen(true);
            };

            return (
              <div key={match.id} className="relative group">
                {/* Timeline node marker */}
                <div
                  className={`absolute -left-[31px] top-3.5 w-3.5 h-3.5 rounded-full ring-4 ring-white transition-colors ${
                    isOngoing
                      ? 'bg-blue-600 ring-blue-100 animate-pulse'
                      : isCompleted
                      ? 'bg-slate-400'
                      : 'bg-slate-200'
                  }`}
                />

                {/* Match Card Container */}
                <div
                  className={`rounded-xl border border-slate-200/90 bg-white transition-all shadow-2xs overflow-hidden ${isClubActivityMatch ? 'cursor-pointer hover:border-blue-300' : 'hover:border-slate-300'}`}
                  role={isClubActivityMatch ? 'button' : undefined}
                  tabIndex={isClubActivityMatch ? 0 : undefined}
                  aria-label={isClubActivityMatch ? matchTranslate('clubOpenScoring') : undefined}
                  onClick={isClubActivityMatch ? (event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest('a,button,input,select,textarea')) return;
                    openScoreFromCard();
                  } : undefined}
                  onKeyDown={isClubActivityMatch ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openScoreFromCard();
                    }
                  } : undefined}
                >
                  {/* Top Metadata Header */}
                  <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2 flex-wrap">
                      {match.isStandaloneMatch ? (
                        <span className="inline-flex items-center rounded-md bg-violet-600 px-2.5 py-1 font-bold text-white shadow-2xs">
                          {matchTranslate('clubStandaloneMatchBadge')}
                        </span>
                      ) : match.tournamentName && (
                        match.isClubSessionMatch ? (
                          <Link
                            href={`/communities/${communityId}/match-sessions/${match.clubMatchSessionId}`}
                            title={matchTranslate('clubSessionView')}
                            className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50/90 hover:bg-emerald-100/90 hover:text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-200/80 transition-colors shadow-2xs group/sname"
                          >
                            <Users className="w-3.5 h-3.5 text-emerald-600 group-hover/sname:scale-110 transition-transform" />
                            <span className="underline decoration-transparent group-hover/sname:decoration-emerald-700 underline-offset-2 transition-all">
                              {match.tournamentName}
                            </span>
                          </Link>
                        ) : (
                          <Link
                            href={`/tournaments/${match.tournamentId}`}
                            title={`Xem chi tiết giải đấu ${match.tournamentName}`}
                            className="inline-flex items-center gap-1.5 font-bold text-blue-700 bg-blue-50/90 hover:bg-blue-100/90 hover:text-blue-800 px-2.5 py-1 rounded-md border border-blue-200/80 transition-colors shadow-2xs group/tname"
                          >
                            <Trophy className="w-3.5 h-3.5 text-blue-600 group-hover/tname:scale-110 transition-transform" />
                            <span className="underline decoration-transparent group-hover/tname:decoration-blue-700 underline-offset-2 transition-all">
                              {match.tournamentName}
                            </span>
                          </Link>
                        )
                      )}
                      <span className="font-semibold text-slate-800 text-xs">
                        {match.isStandaloneMatch
                          ? matchTranslate('clubStandaloneMatchRound')
                          : match.isClubSessionMatch
                          ? matchTranslate('clubSessionFriendlyRound')
                          : roundLabel || `Trận #${match.matchOrder}`}
                      </span>
                      {/* Match Format badge */}
                      {sets.length > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {sets.length > 1 ? `Bo${sets.length}` : '1 Set'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isOngoing && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                          Đang diễn ra
                        </span>
                      )}
                      {/* Match Duration if completed */}
                      {isCompleted && match.startedAt && match.completedAt && (
                        (() => {
                          const durationMin = Math.max(1, Math.round((new Date(match.completedAt).getTime() - new Date(match.startedAt).getTime()) / 60000));
                          return (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-mono font-medium bg-slate-50 text-slate-500 border border-slate-200/80">
                              {durationMin} phút
                            </span>
                          );
                        })()
                      )}
                      {displayTime && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {displayTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Teams & Set Scores Panel */}
                  <div className="p-4 space-y-3">
                    {/* Header showing S1, S2, S3... above score columns */}
                    {displaySets.length > 0 && (
                      <div className="flex justify-end items-center gap-1.5 pr-0.5 font-mono text-[9px] font-bold text-slate-400">
                        {skippedSetsCount > 0 && (
                          <span className="text-[8.5px] font-semibold text-slate-400 pr-1 select-none">
                            +{skippedSetsCount} set trước
                          </span>
                        )}
                        {displaySets.map((_, index) => {
                          const setNumber = skippedSetsCount + index + 1;
                          return (
                            <span key={index} className="w-7 text-center">S{setNumber}</span>
                          );
                        })}
                      </div>
                    )}

                      {/* Team 1 Row */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <ParticipantAvatarStack
                            participant={p1}
                            participantId={p1Id}
                            fallbackLogoUrl={p1Logo}
                            fallbackName={p1?.teamName || matchTranslate('unknownTeam')}
                            winner={isP1Winner}
                            communityId={communityId}
                          />
                        <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              const targetUserId = p1ProfileId;
                              if (targetUserId) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                openUserProfile(
                                  {
                                    id: targetUserId,
                                    fullName: p1?.teamName || matchTranslate('unknownTeam'),
                                    avatarUrl: p1Logo,
                                  },
                                  rect,
                                  communityId,
                                );
                              }
                            }}
                            className={`truncate text-sm text-left hover:underline cursor-pointer ${
                              isP1Winner ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                            }`}
                            title={p1?.teamName || matchTranslate('unknownTeam')}
                          >
                            {p1?.teamName || matchTranslate('unknownTeam')}
                          </button>
                          {/* +/- ELO Pill */}
                          {p1EloDelta && (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold select-none tracking-tight ${
                                isP1Winner
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                              }`}
                              title={`Thay đổi ELO: ${p1EloDelta}`}
                            >
                              {p1EloDelta}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Set Scores for Team 1 */}
                      <div className="flex items-center gap-1.5 shrink-0 font-mono">
                        {displaySets.length > 0 ? (
                          displaySets.map((s, idx) => {
                            const s1 = s.team1Score;
                            const s2 = s.team2Score;
                            const isSetWinner = typeof s1 === 'number' && typeof s2 === 'number' && s1 > s2;
                            return (
                              <span
                                key={idx}
                                className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded ${
                                  isSetWinner
                                    ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                                    : 'bg-slate-100 text-slate-700 font-semibold'
                                }`}
                              >
                                {s1 ?? '-'}
                              </span>
                            );
                          })
                        ) : (
                          <span className="w-7 h-7 flex items-center justify-center text-xs font-bold rounded bg-slate-100 text-slate-700">
                            {match.p1SetsWon ?? 0}
                          </span>
                        )}
                      </div>
                    </div>

                      {/* Team 2 Row */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <ParticipantAvatarStack
                            participant={p2}
                            participantId={p2Id}
                            fallbackLogoUrl={p2Logo}
                            fallbackName={p2?.teamName || matchTranslate('unknownTeam')}
                            winner={isP2Winner}
                            communityId={communityId}
                          />
                        <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              const targetUserId = p2ProfileId;
                              if (targetUserId) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                openUserProfile(
                                  {
                                    id: targetUserId,
                                    fullName: p2?.teamName || matchTranslate('unknownTeam'),
                                    avatarUrl: p2Logo,
                                  },
                                  rect,
                                  communityId,
                                );
                              }
                            }}
                            className={`truncate text-sm text-left hover:underline cursor-pointer ${
                              isP2Winner ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                            }`}
                            title={p2?.teamName || matchTranslate('unknownTeam')}
                          >
                            {p2?.teamName || matchTranslate('unknownTeam')}
                          </button>
                          {/* +/- ELO Pill */}
                          {p2EloDelta && (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold select-none tracking-tight ${
                                isP2Winner
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                              }`}
                              title={`Thay đổi ELO: ${p2EloDelta}`}
                            >
                              {p2EloDelta}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Set Scores for Team 2 */}
                      <div className="flex items-center gap-1.5 shrink-0 font-mono">
                        {displaySets.length > 0 ? (
                          displaySets.map((s, idx) => {
                            const s1 = s.team1Score;
                            const s2 = s.team2Score;
                            const isSetWinner = typeof s1 === 'number' && typeof s2 === 'number' && s2 > s1;
                            return (
                              <span
                                key={idx}
                                className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded ${
                                  isSetWinner
                                    ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                                    : 'bg-slate-100 text-slate-700 font-semibold'
                                }`}
                              >
                                {s2 ?? '-'}
                              </span>
                            );
                          })
                        ) : (
                          <span className="w-7 h-7 flex items-center justify-center text-xs font-bold rounded bg-slate-100 text-slate-700">
                            {match.p2SetsWon ?? 0}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer details: Time & Action link */}
                  <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3 text-slate-500 flex-wrap">
                      {displayTime && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {displayTime}
                        </span>
                      )}
                    </div>

                    {match.isClubSessionMatch || match.isStandaloneMatch ? (
                      <button
                        type="button"
                        onClick={() => {
                          setScoreMatch(toScoreMatch(match));
                          setIsScoreModalOpen(true);
                        }}
                        className="group/btn inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-700 transition-colors hover:text-blue-600"
                      >
                        <span>{matchTranslate('clubOpenScoring')}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-all group-hover/btn:translate-x-0.5 group-hover/btn:text-blue-600" />
                      </button>
                    ) : (
                      <Link
                        href={`/live/${match.id}`}
                        className="group/btn inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-700 transition-colors hover:text-blue-600"
                      >
                        <span>{matchTranslate('detailsAction')}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-all group-hover/btn:translate-x-0.5 group-hover/btn:text-blue-600" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <InfiniteScrollTrigger
            hasMore={hasMoreActivity}
            isLoading={isLoadingMore}
            onLoadMore={() => void loadMoreActivity()}
          />
        </div>
      )}

      {/* Standalone Match Modal */}
      <ClubStandaloneMatchModal
        key={`standalone-modal-${isStandaloneModalOpen ? 'open' : 'closed'}`}
        communityId={communityId}
        isOpen={isStandaloneModalOpen}
        onClose={() => setIsStandaloneModalOpen(false)}
        onMatchCreated={(createdMatch) => {
          setScoreMatch(createdMatch);
          setIsScoreModalOpen(true);
          void fetchClubMatches(true);
        }}
      />
      <ClubMatchScoreEntryModal
        key={scoreMatch?.id ?? 'no-score-match'}
        match={scoreMatch}
        open={isScoreModalOpen}
        onOpenChange={(open) => {
          setIsScoreModalOpen(open);
          if (!open) setScoreMatch(null);
        }}
        onSaved={() => void fetchClubMatches(true)}
      />
    </div>
  );
}
