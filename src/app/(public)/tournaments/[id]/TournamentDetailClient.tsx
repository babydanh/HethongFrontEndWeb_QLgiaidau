'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { divisionsApi, tournamentsApi } from '@/features/tournaments/api';
import { communitiesApi, type Community } from '@/features/communities/api';
import type { Division, MyRegistrationResponse, Tournament, TournamentResult, TournamentSponsor } from '@/features/tournaments/api';
import type { Match } from '@/types/match';
import { isClubLiteTournament } from '@/features/tournaments/lite-qr';
import { Button } from '@/components/ui/Button';
import { Calendar, MapPin, Users, Trophy, Share2, AlertCircle, User, Phone, Mail, Globe, Bookmark, ChevronRight, ChevronLeft, CreditCard, CheckCircle, CheckCircle2, Clock, ArrowUpRight, GitBranch, GitFork, GitMerge, RotateCw } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import Link from 'next/link';
import OverviewTab from './components/OverviewTab';
import TeamsTab from './components/TeamsTab';
import BracketTab from './components/BracketTab';
import MatchesTab from './components/MatchesTab';
import SponsorsTab from './components/SponsorsTab';
import LiveMatchesTab from './components/LiveMatchesTab';
import ResultsTab from './components/ResultsTab';
import RegisterModal from './components/RegisterModal';
import CommunityTournamentRosterWidget from '@/app/(public)/communities/[id]/components/CommunityTournamentRosterWidget';
import { useAuthStore } from '@/lib/zustand/authStore';
import GalleryCarousel from '@/components/ui/GalleryCarousel';
import { triggerShare } from '@/utils/share.util';
import ShareModal from '@/components/common/ShareModal';
import CountdownTimer from '@/components/shared/CountdownTimer';
import toast from 'react-hot-toast';
import { cn } from '@/utils/cn';
import { BRAND } from '@/constants/brand';
import { getSportLogo } from '@/constants/sports';
import { socketClient } from '@/lib/socket';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';
import { useDebounce } from '@/hooks/useDebounce';
import { matchesApi } from '@/features/matches/api';

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const ZaloIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <text x="7.5" y="15" fill="currentColor" fontSize="10" fontWeight="900" style={{ fontFamily: 'system-ui' }}>z</text>
  </svg>
);
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDate } from '@/utils/format';
import { ReportViolationButton } from '@/features/reports/components/ReportViolationButton';
import {
  getTournamentStatusClassName,
  getTournamentStatusLabel,
  isTournamentCancelled,
  isTournamentCompleted,
  isTournamentDraft,
  isTournamentInProgress,
  isTournamentOpenForRegistration,
  isTournamentRegistrationClosed,
  isTournamentUpcoming,
} from '@/utils/tournament-status';
import { getRegistrationModeUi } from '../registrationMode';
import { getTournamentLocationLabel } from '@/utils/tournament-location';

const getBracketFormatIcon = (format?: string) => {
  const normalized = String(format || '').toUpperCase();
  if (normalized.includes('ROUND_ROBIN')) {
    return RotateCw;
  }
  if (normalized.includes('GROUP_STAGE') || normalized.includes('GROUP')) {
    return GitFork;
  }
  if (normalized.includes('DOUBLE_ELIMINATION') || normalized.includes('DOUBLE_ELIM')) {
    return GitMerge;
  }
  return GitBranch;
};
interface Props {
  tournamentId: string;
  initialTournament: Tournament | null;
  initialDivisions?: Division[];
  initialHasResults?: boolean;
  initialResults?: TournamentResult | null;
  initialCompletedDivisionIds?: Record<string, boolean>;
}

type TournamentDetailTab = 'live' | 'results' | 'overview' | 'teams' | 'bracket' | 'matches' | 'sponsors';

const TOURNAMENT_DETAIL_TABS: TournamentDetailTab[] = [
  'overview',
  'results',
  'teams',
  'bracket',
  'matches',
  'sponsors',
];

function createDivisionTournament(tournament: Tournament, division: Division): Tournament {
  return {
    ...tournament,
    id: tournament.id,
    name: division.name || tournament.name,
    matchType: division.matchType,
    genderRestriction: division.genderRestriction ?? null,
    format: division.bracketType ?? tournament.format,
    prizeDescription: division.prizeDescription ?? tournament.prizeDescription,
    status: tournament.status,
    maxParticipants: division.maxParticipants ?? tournament.maxParticipants,
    entryFee: division.entryFee ?? tournament.entryFee,
    _count: {
      ...(tournament._count || { matches: 0, participants: 0 }),
      participants: division._count?.participants ?? 0,
    },
  };
}

export default function TournamentDetailClient({
  tournamentId,
  initialTournament,
  initialDivisions = [],
  initialHasResults = false,
  initialResults,
  initialCompletedDivisionIds,
}: Props) {
  const translate = useTranslations('TournamentDetail');
  const reduceMotion = useReducedMotion();
  const registrationTranslate = useTranslations('RegistrationMode');
const commonTranslate = useTranslations('Common');
  const locale = useLocale();
  const statusLabels = {
    DRAFT: translate('status.draft'),
    PENDING_APPROVAL: translate('status.pendingApproval'),
    PENDING_DELETE: translate('status.pendingDelete'),
    UPCOMING: translate('status.upcoming'),
    REGISTRATION_OPEN: translate('status.registrationOpen'),
    REGISTRATION_CLOSED: translate('status.registrationClosed'),
    IN_PROGRESS: translate('status.inProgress'),
    COMPLETED: translate('status.completed'),
    CANCELLED: translate('status.cancelled'),
  };
  const [tournament, setTournament] = useState<Tournament | null>(initialTournament);
  const [isInitialLoading, setIsInitialLoading] = useState(!initialTournament);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>(
    () => searchParams?.get('divisionId') || initialDivisions[0]?.id || ''
  );
  const [openDivisionId, setOpenDivisionId] = useState<string>(
    () => searchParams?.get('divisionId') || initialDivisions[0]?.id || ''
  );
  const [divisionsList, setDivisionsList] = useState<Division[]>(initialDivisions);
  const [initialDivisionId] = useState(() => searchParams?.get('divisionId') || initialDivisions[0]?.id || '');
  const visibleDivisionId = openDivisionId || selectedDivisionId;
  const selectedDivision: Tournament | null = (() => {
    if (!tournament || !visibleDivisionId) {
      return tournament;
    }

    const division = divisionsList.find((item) => item.id === visibleDivisionId);
    return division ? createDivisionTournament(tournament, division) : tournament;
  })();
  const activeTournament = selectedDivision ?? tournament;

  const isOwner = !!user?.id && !!activeTournament?.organizerId && user.id === activeTournament.organizerId;
  const { openUserById, openUserProfile } = useUserProfileModalStore();
  const [activeTab, setActiveTab] = useState<TournamentDetailTab>(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'overview' || tabParam === 'teams' || tabParam === 'bracket' || tabParam === 'matches' || tabParam === 'sponsors' || tabParam === 'results' || tabParam === 'live') {
      return tabParam as TournamentDetailTab;
    }
    if (initialHasResults || isTournamentCompleted(initialTournament?.status)) {
      return 'results';
    }
    return 'overview';
  });
  const [liveCountsByDivision, setLiveCountsByDivision] = useState<Record<string, number>>({});
  const liveRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveRefreshInFlightRef = useRef(false);
  const hasAutoOpenedLiveRef = useRef(false);
  const hasUserNavigatedRef = useRef(false);
  const pendingNavigatedTabRef = useRef<TournamentDetailTab | null>(null);
  const liveMatchesCount = Object.values(liveCountsByDivision).reduce((total, count) => total + count, 0);
  const activeLiveMatchesCount = visibleDivisionId
    ? liveCountsByDivision[visibleDivisionId] ?? 0
    : liveMatchesCount;
  const activeDivisionHasMatches = Boolean(
    visibleDivisionId && divisionsList.find((division) => division.id === visibleDivisionId)?._count?.matches,
  );
  const handleLiveCountChange = useCallback((divisionId: string, count: number) => {
    setLiveCountsByDivision((current) => {
      if (current[divisionId] === count) return current;
      return { ...current, [divisionId]: count };
    });
  }, []);
  const [publicSponsors, setPublicSponsors] = useState<TournamentSponsor[]>([]);
  const [hasConfirmedResults, setHasConfirmedResults] = useState(initialHasResults);
  const [completedDivisionIds, setCompletedDivisionIds] = useState<Record<string, boolean>>(
    initialCompletedDivisionIds ?? {}
  );
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [myRegistration, setMyRegistration] = useState<MyRegistrationResponse | null>(null);
  const [isRegistrationStatusLoading, setIsRegistrationStatusLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [pendingDivisionId, setPendingDivisionId] = useState<string | null>(null);
  const debouncedDivisionId = useDebounce(pendingDivisionId, 140);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
      if (!window.location.hash) {
        window.scrollTo(0, 0);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    tournamentsApi.getPublicSponsors(tournamentId)
      .then((response) => {
        if (active) setPublicSponsors(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        // Sponsor content is optional; a failed request must not break tournament operations.
        if (active) setPublicSponsors([]);
      });
    return () => {
      active = false;
    };
  }, [tournamentId]);

  useEffect(() => {
    let active = true;
    const loadRegistrationStatus = async () => {
      if (!user?.id || !activeTournament?.id || isOwner) {
        if (active) setMyRegistration(null);
        return;
      }

      if (active) setIsRegistrationStatusLoading(true);
      try {
        const response = await tournamentsApi.getMyRegistration(
          activeTournament.id,
          selectedDivisionId || undefined,
        );
        if (active) setMyRegistration(response.data ?? null);
      } catch {
        if (active) setMyRegistration(null);
      } finally {
        if (active) setIsRegistrationStatusLoading(false);
      }
    };

    void loadRegistrationStatus();
    return () => {
      active = false;
    };
  }, [activeTournament?.id, isOwner, selectedDivisionId, user?.id]);

  const checkResultsRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let active = true;
    const checkResults = async () => {
      try {
        const divisionIdsToCheck = divisionsList.length > 0
          ? divisionsList.map((d) => d.id)
          : [undefined];

        const results = await Promise.allSettled(
          divisionIdsToCheck.map((dId) => tournamentsApi.getTournamentResults(tournamentId, dId))
        );

        const completedMap: Record<string, boolean> = {};
        divisionsList.forEach((div) => {
          if (isTournamentCompleted(div.status)) {
            completedMap[div.id] = true;
          }
        });

        let foundResults = false;
        results.forEach((res, idx) => {
          const dId = divisionIdsToCheck[idx];
          if (res.status === 'fulfilled' && res.value?.data) {
            const data = res.value.data;
            const awards = data.awards ?? [];
            const hasTop1 = awards.some((a) => a.rank === 1 && (Boolean(a.participant?.teamName) || Boolean(a.participant?.members?.length)));
            const hasAwards = awards.length >= 1 || data.finalized;
            if (hasAwards || hasTop1) {
              foundResults = true;
            }
            if (dId && (data.finalized || hasTop1)) {
              completedMap[dId] = true;
            }
          }
        });

        const isFinished = Boolean(
          foundResults ||
          (activeTournament?.status && isTournamentCompleted(activeTournament.status)) ||
          (tournament?.status && isTournamentCompleted(tournament.status))
        );
        if (active) {
          setCompletedDivisionIds(completedMap);
          setHasConfirmedResults(isFinished);
          if (isFinished && !hasUserNavigatedRef.current && !searchParams?.get('tab')) {
            setActiveTab((currentTab) => (currentTab === 'overview' ? 'results' : currentTab));
          }
        }
      } catch {
        if (active) {
          const isFinished = Boolean(
            (activeTournament?.status && isTournamentCompleted(activeTournament.status)) ||
            (tournament?.status && isTournamentCompleted(tournament.status))
          );
          setHasConfirmedResults(isFinished);
        }
      }
    };
    checkResultsRef.current = checkResults;
    void checkResults();
    return () => {
      active = false;
    };
  }, [activeTournament?.status, divisionsList, selectedDivisionId, tournament?.status, tournamentId]);

  const refreshLiveCounts = useCallback(async (signal?: AbortSignal) => {
    if (liveRefreshInFlightRef.current) return;
    liveRefreshInFlightRef.current = true;
    try {
      const response = await matchesApi.getMatches(
        {
          tournament_id: tournamentId,
          status: 'ONGOING,IN_PROGRESS,LIVE,PLAYING',
          limit: 100,
        },
        signal,
      );
      const rawRes = response as unknown;
      const list = Array.isArray(rawRes)
        ? rawRes
        : Array.isArray((rawRes as { data?: unknown })?.data)
          ? (rawRes as { data: Match[] }).data
          : Array.isArray((rawRes as { data?: { data?: unknown } })?.data?.data)
            ? (rawRes as { data: { data: Match[] } }).data.data
            : [];
      const ongoing = (list as Match[]).filter((match) => {
        const status = String(match.status ?? '').toUpperCase();
        return ['ONGOING', 'IN_PROGRESS', 'LIVE', 'PLAYING'].includes(status)
          && !match.isBye
          && !match.completedAt
          && !match.winnerId;
      });
      const nextCounts: Record<string, number> = {};
      for (const match of ongoing) {
        const divisionId = match.divisionId || selectedDivisionId || 'default';
        if (!divisionId) continue;
        nextCounts[divisionId] = (nextCounts[divisionId] ?? 0) + 1;
      }
      setLiveCountsByDivision(nextCounts);
    } catch {
      // Fail closed: an unverified snapshot must never keep a stale LIVE badge visible.
      setLiveCountsByDivision({});
    } finally {
      liveRefreshInFlightRef.current = false;
    }
  }, [selectedDivisionId, tournamentId]);

  // Reconcile once immediately, then periodically. Socket updates only schedule
  // one bounded refresh so rapid score/status events cannot create request storms.
  useEffect(() => {
    const controller = new AbortController();
    const socket = socketClient.getMatchSocket();
    const joinTournament = () => socket.emit('joinTournament', tournamentId);
    const scheduleLiveRefresh = () => {
      if (liveRefreshTimerRef.current) clearTimeout(liveRefreshTimerRef.current);
      liveRefreshTimerRef.current = setTimeout(() => {
        liveRefreshTimerRef.current = null;
        void refreshLiveCounts(controller.signal);
      }, 180);
    };
    const handleMatchUpdate = (rawMatch: { tournamentId?: string } | string) => {
      let updatedMatch: { tournamentId?: string };
      try {
        updatedMatch = typeof rawMatch === 'string'
          ? JSON.parse(rawMatch) as { tournamentId?: string }
          : rawMatch;
      } catch {
        return;
      }
      if (updatedMatch?.tournamentId === tournamentId) {
        scheduleLiveRefresh();
        void checkResultsRef.current();
      }
    };

    void refreshLiveCounts(controller.signal);
    const pollId = window.setInterval(() => {
      void refreshLiveCounts(controller.signal);
    }, 30000);
    socket.on('connect', joinTournament);
    socket.on('match:update', handleMatchUpdate);
    if (socket.connected) joinTournament();

    return () => {
      controller.abort();
      window.clearInterval(pollId);
      if (liveRefreshTimerRef.current) {
        clearTimeout(liveRefreshTimerRef.current);
        liveRefreshTimerRef.current = null;
      }
      socket.off('connect', joinTournament);
      socket.off('match:update', handleMatchUpdate);
    };
  }, [refreshLiveCounts, tournamentId]);

  const isCompleted = Boolean(
    (activeTournament?.status && isTournamentCompleted(activeTournament.status)) ||
    (tournament?.status && isTournamentCompleted(tournament.status))
  );
  const showResultsTab = Boolean(hasConfirmedResults || isCompleted);

  // If activeTab is 'live' but there are no live matches in any division,
  // automatically redirect activeTab to 'results' (if results exist) or 'overview'
  useEffect(() => {
    if (activeTab === 'live' && liveMatchesCount === 0) {
      const fallbackTab: TournamentDetailTab = showResultsTab ? 'results' : 'overview';
      setActiveTab(fallbackTab);
      if (typeof window !== 'undefined') {
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.get('tab') === 'live') {
          if (fallbackTab === 'overview') {
            currentUrl.searchParams.delete('tab');
          } else {
            currentUrl.searchParams.set('tab', fallbackTab);
          }
          window.history.replaceState(null, '', currentUrl.pathname + currentUrl.search);
        }
      }
    }
  }, [activeTab, liveMatchesCount, showResultsTab]);

  useEffect(() => {
    if (!debouncedDivisionId || searchParams.get('divisionId') === debouncedDivisionId) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('divisionId', debouncedDivisionId);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/tournaments/${tournamentId}?${nextParams.toString()}`);
    }
  }, [debouncedDivisionId, searchParams, tournamentId]);

  const handleTabSelect = (tabId: TournamentDetailTab) => {
    hasUserNavigatedRef.current = true;
    pendingNavigatedTabRef.current = tabId;
    setActiveTab(tabId);
    const nextParams = new URLSearchParams(searchParams.toString());
    if (tabId === 'overview') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', tabId);
    }
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/tournaments/${tournamentId}?${nextParams.toString()}`);
    }
  };

  const handleDivisionSelect = (divisionId: string) => {
    hasUserNavigatedRef.current = true;
    if (openDivisionId === divisionId) {
      setPendingDivisionId(null);
      setOpenDivisionId('');
      return;
    }
    setSelectedDivisionId(divisionId);
    setOpenDivisionId(divisionId);
    setPendingDivisionId(divisionId);
  };

  const handleShareClick = async () => {
    if (!activeTournament) return;
    const shareData = {
      title: activeTournament.name,
      text: translate('shareText', { name: activeTournament.name }),
      url: typeof window !== 'undefined' ? window.location.href : '',
    };

    // Gọi Web Share API nếu có (trên mobile), nếu không (trên desktop) nó trả về false để mở Modal
    const sharedNative = await triggerShare(shareData);
    if (!sharedNative) {
      setIsShareModalOpen(true);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // If we already have the correct tournament, do not fetch or set state synchronously
    if (tournament && tournament.id === tournamentId) {
      return;
    }

    const loadTournament = async () => {
      setIsInitialLoading(true);
      setInitialLoadError(null);
      const delays = [0, 500, 1500];
      try {
        let response: Awaited<ReturnType<typeof tournamentsApi.getTournamentById>> | null = null;
        let lastError: unknown;
        for (let attempt = 0; attempt < delays.length; attempt += 1) {
          if (delays[attempt] > 0) {
            await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
          }
          try {
            response = await tournamentsApi.getTournamentById(tournamentId);
            break;
          } catch (error: unknown) {
            lastError = error;
            const status = (error as { response?: { status?: number } })?.response?.status;
            if (status && status !== 429 && status < 500) throw error;
          }
        }
        if (!response) throw lastError ?? new Error('Unable to load tournament data');
        if (!isMounted) {
          return;
        }
        setTournament(response.data ?? null);
        if (!response.data) {
          setInitialLoadError(translate('tournamentNotFound'));
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error('Failed to hydrate tournament detail on client:', error);
        setTournament(null);
        setInitialLoadError(translate('tournamentLoadError'));
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    loadTournament();

    return () => {
      isMounted = false;
    };
  }, [tournamentId, tournament, translate]);

  useEffect(() => {
    const socket = socketClient.getMatchSocket();
    const joinTournament = () => socket.emit('joinTournament', tournamentId);
    const handleRegistrationUpdate = (raw: unknown) => {
      let payload: { tournamentId?: string } | null = null;
      try {
        payload = typeof raw === 'string' ? JSON.parse(raw) as { tournamentId?: string } : raw as { tournamentId?: string };
      } catch {
        return;
      }
      if (payload?.tournamentId !== tournamentId) return;
      Promise.all([
        tournamentsApi.getTournamentById(tournamentId),
        user?.id ? tournamentsApi.getMyRegistration(tournamentId, selectedDivisionId || undefined) : Promise.resolve(null),
      ])
        .then(([tournamentResponse, registrationResponse]) => {
          if (tournamentResponse.data) setTournament(tournamentResponse.data);
          if (registrationResponse?.data) setMyRegistration(registrationResponse.data);
        })
        .catch(() => {
          // Keep the last confirmed snapshot; the bounded API refresh remains the fallback.
        });
    };

    socket.on('connect', joinTournament);
    socket.on('registration:update', handleRegistrationUpdate);
    if (!socket.connected) socket.connect();
    else joinTournament();

    return () => {
      socket.off('connect', joinTournament);
      socket.off('registration:update', handleRegistrationUpdate);
      socket.emit('leaveTournament', tournamentId);
    };
  }, [selectedDivisionId, tournamentId, user?.id]);

  useEffect(() => {
    if (!user?.id || !tournament?.id) return;
    const apiWithFollow = tournamentsApi as unknown as {
      getFollowedTournaments: () => Promise<{ data?: Tournament[] }>;
    };
    apiWithFollow.getFollowedTournaments().then((res) => {
      const followed = Array.isArray(res.data) ? res.data : [];
      setIsFollowing(followed.some((t: Tournament) => t.id === tournament.id));
    }).catch(() => {});
  }, [tournament?.id, user?.id]);

  const [community, setCommunity] = useState<Community | null>(null);

  useEffect(() => {
    if (tournament?.communityId) {
      communitiesApi.getCommunityById(tournament.communityId)
        .then((res) => {
          const data = (res as { data?: Community })?.data || (res as unknown as Community);
          if (data) setCommunity(data);
        })
        .catch(() => {});
    }
  }, [tournament?.communityId]);

  const toggleFollow = async () => {
    if (!user?.id || !tournament?.id) return;
    setFollowLoading(true);
    const apiWithFollow = tournamentsApi as unknown as {
      unfollowTournament: (id: string) => Promise<unknown>;
      followTournament: (id: string) => Promise<unknown>;
    };
    try {
      if (isFollowing) {
        await apiWithFollow.unfollowTournament(tournament.id);
        setIsFollowing(false);
      } else {
        await apiWithFollow.followTournament(tournament.id);
        setIsFollowing(true);
      }
    } catch { /* ignore */ } finally {
      setFollowLoading(false);
    }
  };

  useEffect(() => {
    const loadParentAndDivisions = async () => {
      if (!tournament?.id) return;
      try {
        const divisionsRes = await divisionsApi.getDivisions(tournament.id);
        const divisionsWithCount: Division[] = (divisionsRes.data ?? []).map((division) => {
          const original = tournament.divisions?.find((item) => item.id === division.id);
          return {
            ...division,
            _count: {
              participants: division._count?.participants ?? original?._count?.participants ?? 0,
              matches: division._count?.matches ?? original?._count?.matches ?? 0,
            },
          };
        });
        setDivisionsList(divisionsWithCount);
        const preferredDivision = initialDivisionId
          ? divisionsWithCount.find((division) => division.id === initialDivisionId)
          : null;
        const nextDivisionId = preferredDivision?.id ?? divisionsWithCount[0]?.id ?? '';
        Promise.resolve().then(() => {
          setSelectedDivisionId((currentDivisionId) =>
            currentDivisionId === nextDivisionId ? currentDivisionId : nextDivisionId,
          );
          if (nextDivisionId) {
            setOpenDivisionId(nextDivisionId);
          }
        });
      } catch (err: unknown) {
        console.error('Failed to load parent/divisions context:', err);
      }
    };
    void loadParentAndDivisions();
  }, [initialDivisionId, tournament?.id, tournament?.divisions]);

  useEffect(() => {
    const requestedDivisionId = searchParams.get('divisionId');
    if (!requestedDivisionId || !divisionsList.some((division) => division.id === requestedDivisionId)) return;
    Promise.resolve().then(() => {
      setSelectedDivisionId((currentDivisionId) =>
        currentDivisionId === requestedDivisionId ? currentDivisionId : requestedDivisionId,
      );
      setOpenDivisionId(requestedDivisionId);
    });
  }, [divisionsList, searchParams]);

  useEffect(() => {
    const rawTab = searchParams.get('tab');
    const defaultTab: TournamentDetailTab = showResultsTab ? 'results' : 'overview';
    const requestedTab: TournamentDetailTab =
      rawTab && TOURNAMENT_DETAIL_TABS.includes(rawTab as TournamentDetailTab)
        ? (rawTab as TournamentDetailTab)
        : defaultTab;

    // If an intentional user click navigation is in progress:
    if (pendingNavigatedTabRef.current !== null) {
      if (requestedTab === pendingNavigatedTabRef.current) {
        pendingNavigatedTabRef.current = null; // Caught up!
      } else {
        // Router params not yet updated to target tab, do NOT overwrite activeTab!
        return;
      }
    }

    if (requestedTab === 'sponsors' && publicSponsors.length === 0) {
      if (activeTab === 'sponsors') {
        Promise.resolve().then(() => setActiveTab(defaultTab));
      }
      return;
    }

    if (activeTab !== requestedTab) {
      Promise.resolve().then(() => {
        setActiveTab(requestedTab);
      });
    }
  }, [activeTab, publicSponsors.length, searchParams, showResultsTab]);

  useEffect(() => {
    if (showResultsTab && !hasUserNavigatedRef.current && !searchParams.get('tab')) {
      setActiveTab('results');
    }
  }, [showResultsTab, searchParams]);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-5 text-sm font-semibold text-slate-600 shadow-sm">
          {translate('loading')}
        </div>
      </div>
    );
  }

  if (!tournament || !activeTournament) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">{translate('loadErrorTitle')}</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {initialLoadError || translate('loadErrorFallback')}
          </p>
          <div className="mt-4">
            <Button onClick={() => router.push('/tournaments')} className="bg-blue-600 hover:bg-blue-700 text-white">
              {translate('backToTournaments')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isRegistrationLocked = activeTournament.isRegistrationLocked;
  const isRegistrationExpired = activeTournament.registrationEndDate ? new Date() > new Date(activeTournament.registrationEndDate) : false;
  const isRegistrationOpen = isTournamentOpenForRegistration(activeTournament.status);
  const showRegistrationDetails = !isTournamentInProgress(activeTournament.status) && !isTournamentCompleted(activeTournament.status);
  const registrationModeUi = getRegistrationModeUi(registrationTranslate, activeTournament.tournamentConfig?.registrationMode);
  const hasAdvancedRegistrationForm = activeTournament.tournamentConfig?.registrationForm?.status === 'PUBLISHED';
  const hidePublicBannerText = activeTournament.tournamentConfig?.hideFeaturedCardText === true;

  const areAllDivisionsFull = divisionsList.length > 0
    ? divisionsList.every((d) => {
        const current = d._count?.participants ?? 0;
        const max = d.maxParticipants ?? 0;
        return max > 0 && current >= max;
      })
    : (activeTournament.maxParticipants != null &&
       activeTournament.maxParticipants > 0 &&
       (activeTournament._count?.participants ?? 0) >= activeTournament.maxParticipants);

  let registrationButtonLabel = registrationModeUi.ctaLabel;
  let isRegistrationButtonDisabled = isRegistrationStatusLoading;
  const isRegisteredUser = myRegistration?.registered === true;
  // Backend is the source of truth: only COMPLETE, unpaid registrations with a
  // valid positive fee may enter checkout. This prevents PENDING_PARTNER,
  // PENDING_APPROVAL, WAITLISTED and football draft rosters from opening a
  // checkout page that the payment guard must reject.
  const canResumePayment = isRegisteredUser && myRegistration?.paymentEligible === true;
  const isUnpaidUser = canResumePayment;

  if (isRegisteredUser) {
    if (canResumePayment) {
      registrationButtonLabel = '💳 ' + (translate('continuePayment') || 'Thanh toán ngay');
      isRegistrationButtonDisabled = false;
    } else {
      registrationButtonLabel = translate('alreadyRegistered') || 'Đã đăng ký';
      isRegistrationButtonDisabled = true;
    }
  } else if (isRegistrationOpen) {
    if (isRegistrationLocked) {
      registrationButtonLabel = translate('registrationLocked') || 'Đã khóa đăng ký';
      isRegistrationButtonDisabled = true;
    } else if (isRegistrationExpired) {
      registrationButtonLabel = translate('registrationExpired') || 'Hết hạn đăng ký';
      isRegistrationButtonDisabled = true;
    } else if (areAllDivisionsFull) {
      registrationButtonLabel = translate('registrationFull') || 'Đã đủ hồ sơ';
      isRegistrationButtonDisabled = true;
    }
  } else if (isTournamentUpcoming(activeTournament.status) || isTournamentRegistrationClosed(activeTournament.status)) {
    registrationButtonLabel = translate('registrationClosed');
    isRegistrationButtonDisabled = true;
  } else if (isTournamentInProgress(activeTournament.status)) {
    registrationButtonLabel = translate('inProgress');
    isRegistrationButtonDisabled = true;
  } else if (isTournamentCompleted(activeTournament.status)) {
    registrationButtonLabel = translate('completed');
    isRegistrationButtonDisabled = true;
  } else if (isTournamentCancelled(activeTournament.status)) {
    registrationButtonLabel = translate('cancelled');
    isRegistrationButtonDisabled = true;
  } else {
    isRegistrationButtonDisabled = true;
    registrationButtonLabel = translate('notOpen');
  }

  const participantCount = selectedDivision ? (selectedDivision._summary?.participantCount ?? selectedDivision._count?.participants ?? 0) : 0;
  const maxParticipants = selectedDivision ? (selectedDivision.maxParticipants ?? 0) : 0;
  const percentageFilled = maxParticipants > 0 ? Math.min(100, Math.round((participantCount / maxParticipants) * 100)) : 0;
  const registerParams = new URLSearchParams();
  if (selectedDivisionId) {
    registerParams.set('divisionId', selectedDivisionId);
  }
  const inviteCode = searchParams.get('invite');
  const inviteParticipantId = searchParams.get('pid');
  const teamInviteToken = searchParams.get('token');
  if (inviteCode) {
    registerParams.set('invite', inviteCode);
  }
  if (inviteParticipantId && teamInviteToken) {
    registerParams.set('pid', inviteParticipantId);
    registerParams.set('token', teamInviteToken);
  }
  const registerHref = `/tournaments/${activeTournament.id}/register${registerParams.toString() ? `?${registerParams.toString()}` : ''}`;

  const isClubLite = isClubLiteTournament(activeTournament) || (Boolean(activeTournament.isLite) && Boolean(activeTournament.communityId));

  const formatDateRange = (start?: string, end?: string) => {
    if (!start && !end) return translate('notUpdated');
    const sStr = start ? formatDate(start) : '...';
    const eStr = end ? formatDate(end) : '...';
    return `${sStr} - ${eStr}`;
  };

  const tabs: { id: TournamentDetailTab; label: string; badge?: number; isLive?: boolean; isGolden?: boolean }[] = [
    ...(liveMatchesCount > 0
      ? [{ id: 'live' as const, label: translate('liveTabLabel'), badge: liveMatchesCount, isLive: true }]
      : []),
    ...(showResultsTab
      ? [{ id: 'results' as const, label: translate('resultsTabLabel'), isGolden: true }]
      : []),
    { id: 'overview' as const, label: translate('overview') },
    { id: 'teams' as const, label: translate('tabs.teams') },
    { id: 'bracket' as const, label: translate('tabs.bracket') },
    ...(!isClubLite ? [{ id: 'matches' as const, label: translate('tabs.matches') }] : []),
    ...(publicSponsors.length > 0
      ? [{ id: 'sponsors' as const, label: translate('tabs.sponsors') }]
      : []),
  ];

  const tournamentLogo = activeTournament.logoUrl || tournament?.logoUrl;
  const hasTournamentLogo = Boolean(tournamentLogo && typeof tournamentLogo === 'string' && tournamentLogo.trim().length > 0);

  const renderOrganizerBlock = () => {
    const organizer = activeTournament.organizer || tournament?.organizer;
    const organizerId = organizer?.id || activeTournament.organizerId || tournament?.organizerId;
    const displayAvatar = organizer?.avatarUrl;
    const displayName = organizer?.fullName || translate('organizerDefault') || 'SPORTO Organizer';
    const isClickable = Boolean(organizerId);

    const handleOrganizerClick = (e: React.MouseEvent<HTMLElement>) => {
      if (!organizerId) return;
      const rect = e.currentTarget.getBoundingClientRect();
      openUserById(organizerId, organizer?.fullName || displayName, organizer?.avatarUrl || null, rect);
    };

    return (
      <div
        onClick={isClickable ? handleOrganizerClick : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={isClickable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOrganizerClick(e as unknown as React.MouseEvent<HTMLElement>);
          }
        } : undefined}
        className={`flex items-center gap-3 transition-all rounded-xl p-2 -m-1 ${
          isClickable ? 'cursor-pointer hover:bg-slate-50 active:bg-slate-100 group' : ''
        }`}
        title={isClickable ? `Xem hồ sơ của ${displayName}` : displayName}
      >
        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs group-hover:border-blue-400 group-hover:ring-2 group-hover:ring-blue-100 transition-all">
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayName}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <User className="w-5 h-5 text-slate-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
            {translate('organizerLabel') || 'Người sáng lập giải đấu'}
          </p>
          <div className="flex items-center gap-1">
            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors" title={displayName}>
              {displayName}
            </p>
            {isClickable && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMetadataCard = () => {
    const isLive = isTournamentInProgress(activeTournament.status) || liveMatchesCount > 0;
    const isFinished = isCompleted || (hasConfirmedResults && liveMatchesCount === 0);

    return (
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs space-y-3 sm:space-y-3.5">
        {hasTournamentLogo ? (
          /* When tournament HAS Logo -> Display Logo + Badges + Title at Top */
          <div className="flex items-start gap-3.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-white shadow-md p-0.5 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-slate-200/80">
              <img
                src={tournamentLogo || ''}
                alt={tournament.name}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Status Badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-md shadow-2xs ${
                  isLive
                    ? 'bg-rose-600 text-white'
                    : isFinished
                      ? 'bg-slate-700 text-white'
                      : 'bg-emerald-600 text-white'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-white animate-pulse' : 'bg-white'}`} />
                  {isLive
                    ? (translate('inProgress') || 'Đang diễn ra')
                    : isFinished
                      ? (translate('completed') || 'Đã kết thúc')
                      : (translate('upcoming') || 'Sắp diễn ra')}
                </span>

                {/* Sport Badge */}
                {activeTournament.category?.name && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-600 text-white shadow-2xs inline-flex items-center gap-1">
                    {(() => {
                      const logo = getSportLogo(activeTournament.category?.name);
                      return logo ? (
                        <img src={logo} alt={activeTournament.category?.name || ''} className="w-3 h-3 object-contain brightness-0 invert" />
                      ) : null;
                    })()}
                    {activeTournament.category.name}
                  </span>
                )}

                {/* Ranked / Casual Badge */}
                <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md shadow-2xs ${
                  activeTournament.isRanked ? 'bg-amber-500 text-white' : 'bg-slate-800 text-white'
                }`}>
                  {activeTournament.isRanked ? `⭐ ${translate('rankedBadge')}` : (translate('casualBadge') || 'Giải phong trào')}
                </span>
              </div>

              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                {tournament.name}
              </h1>
            </div>
          </div>
        ) : (
          /* When tournament DOES NOT have custom logo -> show Organizer at top + Title below */
          <>
            {renderOrganizerBlock()}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Status Badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-md shadow-2xs ${
                  isLive
                    ? 'bg-rose-600 text-white'
                    : isFinished
                      ? 'bg-slate-700 text-white'
                      : 'bg-emerald-600 text-white'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-white animate-pulse' : 'bg-white'}`} />
                  {isLive
                    ? (translate('inProgress') || 'Đang diễn ra')
                    : isFinished
                      ? (translate('completed') || 'Đã kết thúc')
                      : (translate('upcoming') || 'Sắp diễn ra')}
                </span>

                {/* Sport Badge */}
                {activeTournament.category?.name && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-600 text-white shadow-2xs inline-flex items-center gap-1">
                    {(() => {
                      const logo = getSportLogo(activeTournament.category?.name);
                      return logo ? (
                        <img src={logo} alt={activeTournament.category?.name || ''} className="w-3 h-3 object-contain brightness-0 invert" />
                      ) : null;
                    })()}
                    {activeTournament.category.name}
                  </span>
                )}

                {/* Ranked / Casual Badge */}
                <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md shadow-2xs ${
                  activeTournament.isRanked ? 'bg-amber-500 text-white' : 'bg-slate-800 text-white'
                }`}>
                  {activeTournament.isRanked ? `⭐ ${translate('rankedBadge')}` : (translate('casualBadge') || 'Giải phong trào')}
                </span>
              </div>

              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                {tournament.name}
              </h1>
            </div>
          </>
        )}

      {/* Key Details Rows (Đen đậm, rõ ràng, không dùng màu mè) */}
      <div className="space-y-2.5 pt-3 border-t border-slate-100 text-slate-900">
        {/* Dates */}
        <div className="flex items-start gap-2.5">
          <Calendar className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
          <p className="font-extrabold text-slate-900 text-sm leading-snug">
            {activeTournament.startDate ? (
              <>
                {formatDate(activeTournament.startDate)}
                {activeTournament.endDate && ` - ${formatDate(activeTournament.endDate)}`}
              </>
            ) : translate('dateNotSet')}
          </p>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
          <p className="font-semibold text-slate-800 text-xs sm:text-[13px] leading-relaxed break-words" title={getTournamentLocationLabel(activeTournament)}>
            {getTournamentLocationLabel(activeTournament) || translate('venueNotUpdated')}
          </p>
        </div>

        {/* Divisions Count */}
        <div className="flex items-center gap-2.5">
          <Trophy className="w-4 h-4 text-slate-700 shrink-0" />
          <p className="font-extrabold text-slate-900 text-xs sm:text-[13px]">
            {divisionsList.length || 1} <span className="font-semibold text-slate-700">{translate('competitionContentTitle') || 'Nội dung thi đấu'}</span>
          </p>
        </div>

        {/* Participants / Teams Count */}
        <div className="flex items-center gap-2.5">
          <Users className="w-4 h-4 text-slate-700 shrink-0" />
          <p className="font-extrabold text-slate-900 text-xs sm:text-[13px]">
            {divisionsList.reduce((acc, d) => acc + (d._count?.participants ?? 0), 0) || activeTournament._count?.participants || 0} <span className="font-semibold text-slate-700">{translate('participantsCount') || 'Số lượng hồ sơ'}</span>
          </p>
        </div>
      </div>

      {/* Smart Sequential Countdown Timer */}
      {(() => {
        const now = new Date();
        const regStart = activeTournament.registrationStartDate ? new Date(activeTournament.registrationStartDate) : null;
        const regEnd = activeTournament.registrationEndDate ? new Date(activeTournament.registrationEndDate) : null;
        const tourStart = activeTournament.startDate ? new Date(activeTournament.startDate) : null;
        const tourEnd = activeTournament.endDate ? new Date(activeTournament.endDate) : null;

        // 1. Chưa tới ngày mở đăng ký -> CHỈ ĐẾM NGƯỢC THỜI GIAN MỞ ĐĂNG KÝ
        if (regStart && now < regStart) {
          return (
            <div className="pt-2 border-t border-slate-100">
              <CountdownTimer
                targetDate={activeTournament.registrationStartDate!}
                labels={{
                  active: translate('registrationOpensAfter') || 'Mở đăng ký sau',
                  expired: translate('registrationOpened') || 'Đã mở đăng ký',
                  dayLabel: commonTranslate('countdownDay') || 'ngày',
                }}
                variant="info"
                size="md"
              />
            </div>
          );
        }

        // 2. Đang mở đăng ký, chưa đóng -> CHỈ ĐẾM NGƯỢC HẠN ĐÓNG ĐĂNG KÝ
        if (regEnd && now < regEnd && !isRegistrationLocked) {
          return (
            <div className="pt-2 border-t border-slate-100">
              <CountdownTimer
                targetDate={activeTournament.registrationEndDate!}
                labels={{
                  active: translate('closeRegistrationAfter') || 'Đóng đăng ký sau',
                  expired: translate('registrationClosed') || 'Đã đóng đăng ký',
                  dayLabel: commonTranslate('countdownDay') || 'ngày',
                }}
                variant="warning"
                size="md"
              />
            </div>
          );
        }

        // 3. Đã đóng đăng ký, chưa khởi tranh -> Đếm ngược ngày khởi tranh
        if (tourStart && now < tourStart) {
          return (
            <div className="pt-2 border-t border-slate-100">
              <CountdownTimer
                targetDate={activeTournament.startDate!}
                labels={{
                  active: translate('startAfter') || 'Khởi tranh sau',
                  expired: translate('started') || 'Đã khởi tranh',
                  dayLabel: commonTranslate('countdownDay') || 'ngày',
                }}
                variant="danger"
                size="md"
              />
            </div>
          );
        }

        // 4. Đang diễn ra -> Đếm ngược ngày kết thúc
        if (isTournamentInProgress(activeTournament.status) && tourEnd && now < tourEnd) {
          return (
            <div className="pt-2 border-t border-slate-100">
              <CountdownTimer
                targetDate={activeTournament.endDate!}
                labels={{
                  active: translate('endAfter') || 'Kết thúc sau',
                  expired: translate('completed') || 'Đã kết thúc',
                  dayLabel: commonTranslate('countdownDay') || 'ngày',
                }}
                variant="danger"
                size="md"
              />
            </div>
          );
        }

        return null;
      })()}

      {/* Primary CTA Button */}
      <div className="pt-1">
        {!isOwner && !isTournamentDraft(activeTournament.status) && (
          <div>
            {canResumePayment ? (
              <Button
                type="button"
                onClick={() => {
                  const resumeParticipantId = myRegistration?.participant?.id;
                  if (resumeParticipantId) {
                    const checkoutParams = new URLSearchParams({
                      participantId: resumeParticipantId,
                      tournamentId,
                    });
                    const resumeDivisionId =
                      myRegistration?.participant?.tournamentDivisionId || selectedDivisionId;
                    if (resumeDivisionId) checkoutParams.set('divisionId', resumeDivisionId);
                    if (inviteCode) checkoutParams.set('invite', inviteCode);
                    router.push(`/payments/checkout?${checkoutParams.toString()}`);
                  } else {
                    router.push(registerHref);
                  }
                }}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-3 rounded-lg shadow-md cursor-pointer text-sm flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                {translate('continuePayment') || 'Thanh toán ngay'}
              </Button>
            ) : isRegisteredUser ? (
              <Button
                type="button"
                disabled
                className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold py-3 rounded-lg text-sm cursor-not-allowed flex items-center justify-center gap-2 shadow-2xs"
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{translate('alreadyRegistered') || 'Đã đăng ký'}</span>
              </Button>
            ) : isRegistrationOpen && areAllDivisionsFull ? (
              <Button
                type="button"
                disabled
                className="w-full bg-slate-100 border border-slate-200 text-slate-400 font-bold py-3 rounded-lg text-sm cursor-not-allowed flex items-center justify-center gap-2 shadow-2xs"
              >
                <Users className="w-4 h-4 text-slate-400" />
                <span>{translate('registrationFull') || 'Đã đủ hồ sơ'}</span>
              </Button>
            ) : isRegistrationOpen && (isRegistrationLocked || isRegistrationExpired) ? (
              <Button
                type="button"
                disabled
                className="w-full bg-slate-100 border border-slate-200 text-slate-400 font-bold py-3 rounded-lg text-sm cursor-not-allowed flex items-center justify-center gap-2 shadow-2xs"
              >
                <span>{registrationButtonLabel}</span>
              </Button>
            ) : isTournamentInProgress(activeTournament.status) || isTournamentCompleted(activeTournament.status) ? (
              <Button
                type="button"
                onClick={() => handleTabSelect('matches')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md text-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                {translate('tabs.matches') || 'Lịch thi đấu'}
              </Button>
            ) : isRegistrationButtonDisabled ? (
              <Button
                type="button"
                disabled
                className="w-full bg-slate-100 border border-slate-200 text-slate-400 font-bold py-3 rounded-lg text-sm cursor-not-allowed flex items-center justify-center gap-2 shadow-2xs"
              >
                <span>{registrationButtonLabel}</span>
              </Button>
            ) : isClubLiteTournament(activeTournament) ? (
              activeTournament.inviteCode ? (
                <Link href={`/lite/tournaments/join/${activeTournament.inviteCode}`} className="block w-full">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md text-sm">
                    {translate('liteJoin')}
                  </Button>
                </Link>
              ) : (
                <Button disabled className="w-full bg-slate-100 text-slate-400 font-bold py-3 rounded-lg text-sm">
                  {translate('joinLinkUnavailable')}
                </Button>
              )
            ) : (
              <Button
                type="button"
                onClick={() => {
                  const needsRegistrationPage =
                    activeTournament.visibility === 'PRIVATE' ||
                    registrationModeUi.mode !== 'OPEN' ||
                    divisionsList.length > 0 ||
                    hasAdvancedRegistrationForm;
                  if (needsRegistrationPage) {
                    router.push(registerHref);
                  } else {
                    setIsRegisterModalOpen(true);
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-xs text-sm cursor-pointer"
              >
                {registrationButtonLabel}
              </Button>
            )}
          </div>
        )}

        {isOwner && !isTournamentDraft(activeTournament.status) && (
          <div className="space-y-2">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-700 font-bold">
                {translate('ownerLabel') || 'Bạn là Ban Tổ Chức giải này'}
              </p>
            </div>
            <Link
              href={`/organizer/tournaments/${activeTournament.id}/manage`}
              className="block w-full"
            >
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg shadow-sm text-sm">
                {translate('manageBracketSchedule') || 'Quản lý nhánh đấu & Lịch trình'}
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Fee & Registration Lock Status (Timeline đã có đồng hồ đếm ngược trực quan ở trên) */}
      {(isRegistrationLocked || Number(activeTournament.entryFee) > 0) && (
        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          {isRegistrationLocked && (
            <div className="flex items-center justify-between text-xs font-bold text-amber-800 bg-amber-50/90 px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
              <span>{translate('registrationLocked') || 'Đã khóa đăng ký'}</span>
              <span>🔒</span>
            </div>
          )}
          {Number(activeTournament.entryFee) > 0 && (
            <div className="flex items-center justify-between text-slate-700 pt-0.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{translate('entryFee') || 'Lệ phí tham gia'}:</span>
              <span className="font-black text-blue-600 text-base sm:text-lg tracking-tight">
                {formatCurrency(activeTournament.entryFee)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Secondary Utility Actions (Follow, Share, Report) */}
      <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
        {user?.id && (
          <Button
            onClick={toggleFollow}
            disabled={followLoading}
            variant={isFollowing ? 'default' : 'outline'}
            className={`flex-1 font-bold shadow-xs h-9 text-xs rounded-lg ${
              isFollowing
                ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 mr-1 ${isFollowing ? 'fill-current' : ''}`} />
            {isFollowing ? translate('followActive') : translate('follow')}
          </Button>
        )}
        <Button
          onClick={handleShareClick}
          variant="outline"
          className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-bold shadow-xs h-9 text-xs rounded-lg"
        >
          <Share2 className="w-3.5 h-3.5 mr-1" /> {translate("share")}
        </Button>
        <ReportViolationButton
          targetType="TOURNAMENT"
          targetId={tournament.id}
          targetLabel={tournament.name}
          hidden={isOwner}
          compact
        />
      </div>
    </div>
    );
  };

  const renderContactCard = () => {
    const hasContact = Boolean(
      activeTournament.contactInfo &&
      Object.values(activeTournament.contactInfo).some((v) => typeof v === 'string' && v.trim().length > 0)
    );

    if (!hasContact && !hasTournamentLogo) return null;

    return (
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 flex flex-col gap-3 shadow-xs">
        {hasContact && (
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{translate('contactInfo') || 'THÔNG TIN LIÊN HỆ'}</span>
            {activeTournament.contactInfo?.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-700">{activeTournament.contactInfo.phone}</span>
              </div>
            )}
            {activeTournament.contactInfo?.email && (
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-700 truncate">{activeTournament.contactInfo.email}</span>
              </div>
            )}
            {Object.entries(activeTournament.contactInfo || {})
              .filter(([key]) => key !== 'phone' && key !== 'email')
              .map(([key, val]) => {
                if (!val) return null;
                const lowercaseKey = key.toLowerCase();
                const isUrl = typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));

                let IconComponent: React.ComponentType<React.SVGProps<SVGSVGElement>> = Globe;
                let iconColor = 'text-slate-400';

                if (lowercaseKey.includes('instagram')) {
                  IconComponent = InstagramIcon;
                  iconColor = 'text-pink-600';
                } else if (lowercaseKey.includes('zalo')) {
                  IconComponent = ZaloIcon;
                  iconColor = 'text-blue-600';
                }

                return (
                  <div key={key} className="flex items-center gap-2.5">
                    <IconComponent className={`w-4 h-4 shrink-0 ${iconColor}`} />
                    <span className="text-xs font-bold text-slate-500">{key}:</span>
                    {isUrl ? (
                      <a href={val as string} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline truncate">
                        {val}
                      </a>
                    ) : (
                      <span className="text-xs font-semibold text-slate-700 truncate">{val}</span>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* If tournament HAS logo -> Show Creator at bottom under contact info */}
        {hasTournamentLogo && (
          <div className={hasContact ? "pt-3 border-t border-slate-100" : ""}>
            {renderOrganizerBlock()}
          </div>
        )}
      </div>
    );
  };

  const renderLiteEventHeader = () => {
    const isLive = isTournamentInProgress(activeTournament.status) || liveMatchesCount > 0;
    const isFinished = isCompleted || (hasConfirmedResults && liveMatchesCount === 0);
    const locationLabel = getTournamentLocationLabel(activeTournament);
    const sportLogo = getSportLogo(activeTournament.category?.name);

    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg shadow-2xs ${
            isLive
              ? 'bg-rose-600 text-white'
              : isFinished
                ? 'bg-slate-700 text-white'
                : 'bg-emerald-600 text-white'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-white animate-pulse' : 'bg-white'}`} />
            {isLive
              ? (translate('inProgress') || 'Đang diễn ra')
              : isFinished
                ? (translate('completed') || 'Đã kết thúc')
                : (translate('upcoming') || 'Sắp diễn ra')}
          </span>

          {/* Sport Badge */}
          {activeTournament.category?.name && (
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white shadow-2xs inline-flex items-center gap-1.5">
              {sportLogo && (
                <img src={sportLogo} alt={activeTournament.category.name} className="w-3.5 h-3.5 object-contain brightness-0 invert" />
              )}
              {activeTournament.category.name}
            </span>
          )}

          {/* Format Badge: Đơn / Đôi (No gender clutter) */}
          {(() => {
            const rawFormat = (activeTournament as unknown as Record<string, unknown>)?.format ||
              activeTournament?.divisions?.[0]?.matchType ||
              activeTournament?.matchType ||
              '';
            const isDoubles = String(rawFormat).toUpperCase().includes('DOUBLES') || String(rawFormat).toLowerCase() === 'doubles';
            const isFootball =
              activeTournament?.category?.name?.toLowerCase().includes('bóng đá') ||
              activeTournament?.category?.name?.toLowerCase().includes('football');
            const formatText = isFootball
              ? `Bóng đá ${activeTournament?.tournamentConfig?.teamSize || 7} người`
              : isDoubles ? 'Đánh Đôi' : 'Đánh Đơn';

            return (
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
                {formatText}
              </span>
            );
          })()}

          {/* Ranked / Casual Badge */}
          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg shadow-2xs ${
            activeTournament.isRanked ? 'bg-amber-500 text-white' : 'bg-slate-800 text-white'
          }`}>
            {activeTournament.isRanked ? `⭐ ${translate('rankedBadge')}` : (translate('casualBadge') || 'Giải phong trào')}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          {tournament.name}
        </h1>

        {/* Key Event Details (Time, Fee, Location) - Only render items that have configured values */}
        {(() => {
          const hasDate = Boolean(activeTournament.startDate || (activeTournament as unknown as Record<string, unknown>).startTime);
          const hasLocation = Boolean(locationLabel);
          const hasFee = Number(activeTournament.entryFee) > 0;
          const showEventDetails = hasDate || hasLocation || hasFee;

          if (!showEventDetails) return null;

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-700 font-medium">
              {/* Time */}
              {hasDate && (
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-extrabold text-slate-900">
                      {activeTournament.startDate ? formatDate(activeTournament.startDate) : ''}
                      {(activeTournament as unknown as Record<string, unknown>).startTime ? ` · ${(activeTournament as unknown as Record<string, unknown>).startTime}` : ''}
                    </span>
                    {activeTournament.endDate && (
                      <span className="text-xs text-slate-500">
                        {translate('status.startDate')} {formatDate(activeTournament.startDate)} - {formatDate(activeTournament.endDate)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Fee */}
              {hasFee && (
                <div className="flex items-start gap-2.5">
                  <CreditCard className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Lệ phí tham gia</span>
                    <span className="text-sm font-black text-slate-900">
                      {formatCurrency(activeTournament.entryFee)} / người
                    </span>
                  </div>
                </div>
              )}

              {/* Location */}
              {hasLocation && (
                <div className={`flex items-start gap-2.5 ${hasDate || hasFee ? 'sm:col-span-2 pt-1 border-t border-dashed border-slate-100' : ''}`}>
                  <MapPin className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="block font-bold text-slate-900 leading-snug">{locationLabel}</span>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(locationLabel)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline mt-0.5"
                    >
                      <span>Xem trên bản đồ</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  const renderLiteSidebar = () => {
    const isCommunityTournament = Boolean(tournament?.communityId);
    const rawClubLogo = isCommunityTournament
      ? (community?.logoUrl || community?.bannerUrl)
      : (tournament?.logoUrl || tournament?.organizer?.avatarUrl);
    const hasCustomClubLogo = Boolean(rawClubLogo && !rawClubLogo.includes('.svg'));
    const clubLogo = rawClubLogo || '/sporto_v1_with_text.svg';
    const clubName = isCommunityTournament
      ? (community?.name || 'Câu lạc bộ')
      : (tournament?.organizer?.fullName || 'Ban tổ chức');
    const clubHref = tournament?.communityId ? `/communities/${tournament.communityId}` : '#';

    return (
      <div className="space-y-4">
        {/* Presented by Club Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            MANG ĐẾN BỞI
          </span>
          <Link
            href={clubHref}
            className="flex items-center gap-3 group"
          >
            <div className="h-12 w-12 rounded-full border border-slate-200 bg-slate-50 overflow-hidden shrink-0 group-hover:border-blue-400 transition-colors shadow-2xs">
              <img
                src={clubLogo}
                alt={clubName}
                className={cn(
                  'h-full w-full rounded-full',
                  hasCustomClubLogo ? 'object-cover' : 'object-contain p-1.5'
                )}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.src = '/sporto_v1_with_text.svg';
                  img.className = 'h-full w-full object-contain p-1.5 rounded-full';
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                {clubName}
              </h4>
              {isCommunityTournament && (
                <span className="text-[11px] text-blue-600 font-bold group-hover:underline inline-flex items-center gap-0.5">
                  <span>Trang Câu lạc bộ</span>
                  <ArrowUpRight className="w-3 h-3" />
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* Slot Roster Grid Confirmation Widget */}
        <CommunityTournamentRosterWidget
          tournamentId={tournament.id}
          communityId={tournament.communityId || undefined}
          communityLogoUrl={clubLogo}
          hideHeader={true}
          initialTournamentName={tournament.name}
          categoryName={activeTournament.category?.name}
          status={activeTournament.status}
          inviteCode={activeTournament.inviteCode}
          maxParticipants={activeTournament.maxParticipants}
          startDate={activeTournament.startDate}
        />

        {/* Contact Info Card */}
        {renderContactCard()}

        {/* Follow & Share */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-2">
          {user?.id && (
            <Button
              onClick={toggleFollow}
              disabled={followLoading}
              variant={isFollowing ? 'default' : 'outline'}
              className={`flex-1 font-bold shadow-xs h-9 text-xs rounded-lg ${
                isFollowing
                  ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 mr-1 ${isFollowing ? 'fill-current' : ''}`} />
              {isFollowing ? translate('followActive') : translate('follow')}
            </Button>
          )}
          <Button
            onClick={handleShareClick}
            variant="outline"
            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-bold shadow-xs h-9 text-xs rounded-lg"
          >
            <Share2 className="w-3.5 h-3.5 mr-1" /> {translate("share")}
          </Button>
          <ReportViolationButton
            targetType="TOURNAMENT"
            targetId={tournament.id}
            targetLabel={tournament.name}
            hidden={isOwner}
            compact
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <div className="max-w-screen-2xl mx-auto px-3.5 sm:px-4 md:px-8 pt-3 sm:pt-4 md:pt-6">
        {/* Back navigation */}
        <div className="mb-2.5 sm:mb-3.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-200/70 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{translate('back') || 'Quay lại'}</span>
          </button>
        </div>

        {/* Main 2-Column Grid (Laptop/Desktop: 2 columns, Mobile: 1 column) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start">
          {/* Left Column: Hero Banner / Lite Header + Mobile Metadata + Tabs + Tab Content */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-3 sm:space-y-4 min-w-0 max-w-full overflow-hidden">
            {isClubLite ? (
              <>
                {/* Sleek Event Header for Club Lite */}
                {renderLiteEventHeader()}

                {/* Mobile Lite Sidebar: Presented by & Slot Roster Grid on mobile */}
                <div className="block lg:hidden space-y-3 sm:space-y-4">
                  {renderLiteSidebar()}
                </div>
              </>
            ) : (
              <>
                {/* Banner Container for standard tournaments */}
                <div className="relative w-full h-[175px] sm:h-[240px] md:h-[380px] lg:h-[440px] rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-slate-100">
                  <GalleryCarousel
                    images={activeTournament.galleryImages && activeTournament.galleryImages.length > 0 ? activeTournament.galleryImages : []}
                    defaultBanner={activeTournament.bannerUrl || undefined}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Mobile Metadata Container */}
                <div className="block lg:hidden space-y-3 sm:space-y-4">
                  {renderMetadataCard()}
                </div>
              </>
            )}

            {/* Horizontal Tabs */}
            <div className="flex overflow-x-auto gap-1.5 sm:gap-2 mb-2 no-scrollbar pb-1">
              {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabSelect(tab.id)}
                    className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
                      tab.isLive
                        ? isActive
                          ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20'
                          : 'bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100/80'
                        : tab.isGolden
                          ? isActive
                            ? 'bg-amber-500 text-white font-extrabold shadow-sm border border-amber-500 hover:bg-amber-600'
                            : 'bg-amber-100 text-amber-950 border border-amber-400 font-extrabold shadow-xs hover:bg-amber-200'
                          : isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {tab.isLive && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-current motion-safe:animate-ping motion-reduce:animate-none" />
                    )}
                    <span>{tab.label}</span>
                    {tab.badge != null && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isActive ? 'bg-white text-rose-600' : 'bg-rose-600 text-white'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content Container */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-6 md:p-7 min-h-[400px] min-w-0 max-w-full overflow-hidden">
              {/* Compact vertical content rows with inline selected detail */}
              {divisionsList.length > 0 && activeTab !== 'overview' && activeTab !== 'sponsors' && (
                <div className="mb-2" aria-label={translate('competitionContentTitle')}>
                  <div className="flex flex-col overflow-hidden divide-y divide-slate-100 rounded-xl">
                    {divisionsList.map((division) => {
                      const isActive = division.id === openDivisionId;
                      const divisionTournament = tournament ? createDivisionTournament(tournament, division) : null;
                      const liveCount = liveCountsByDivision[division.id] ?? 0;
                      const participantCount = division._count?.participants ?? 0;
                      const maxParticipants = division.maxParticipants ?? 0;
                      const participantCapacity = maxParticipants > 0
                        ? `${participantCount} / ${maxParticipants}`
                        : `${participantCount}`;
                      return (
                        <div
                          key={division.id}
                          className="scroll-mt-[calc(var(--app-header-height)+1rem)]"
                        >
                          <button
                            type="button"
                            aria-current={isActive ? 'true' : undefined}
                            aria-expanded={isActive}
                            onClick={() => handleDivisionSelect(division.id)}
                            className={`group flex min-h-[60px] w-full items-center gap-3 px-3 py-3 text-left transition-all rounded-xl sm:px-4 ${
                              isActive
                                ? 'bg-blue-50/80 text-blue-950 font-bold'
                                : 'bg-slate-50/60 text-slate-700 hover:bg-slate-100/70 hover:text-slate-900'
                            }`}
                          >
                            {(() => {
                              const divisionObj = division as unknown as Record<string, unknown>;
                              const tournamentObj = tournament as unknown as Record<string, unknown>;
                              const divTourObj = divisionTournament as unknown as Record<string, unknown>;
                              const bracketFormat = (division.bracketType || divisionObj.format || divTourObj?.bracketType || divTourObj?.format || tournamentObj?.bracketType || tournament?.format) as string | undefined;
                              const BracketIcon = getBracketFormatIcon(bracketFormat);
                              return (
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                  isActive
                                    ? 'bg-blue-600 text-white shadow-2xs'
                                    : 'bg-white text-slate-500 border border-slate-200/80 group-hover:text-blue-600 group-hover:border-blue-200'
                                }`}>
                                  <BracketIcon className="h-4 w-4" aria-hidden="true" />
                                </span>
                              );
                            })()}
                              {/* Title */}
                              {(() => {
                                let displayName = division.name;
                                if (isClubLite) {
                                  const isFootball =
                                    activeTournament?.category?.name?.toLowerCase().includes('bóng đá') ||
                                    activeTournament?.category?.name?.toLowerCase().includes('football');
                                  if (isFootball) {
                                    displayName = `Bóng đá ${activeTournament?.tournamentConfig?.teamSize || 7} người`;
                                  } else {
                                    const rawFormat = division.matchType || '';
                                    const isDoubles = String(rawFormat).toUpperCase().includes('DOUBLES') || String(division.name).toLowerCase().includes('đôi');
                                    displayName = isDoubles ? 'Đánh Đôi' : 'Đánh Đơn';
                                  }
                                }
                                return (
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-bold sm:text-base">{displayName}</span>
                                  </span>
                                );
                              })()}
                            {liveCount > 0 && (
                              <span
                                aria-label={translate('divisionLiveCount', { count: liveCount })}
                                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700 sm:text-xs"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 motion-safe:animate-pulse motion-reduce:animate-none" aria-hidden="true" />
                                <span>{liveCount}</span>
                              </span>
                            )}
                            {Boolean(completedDivisionIds[division.id] || isTournamentCompleted(division.status)) && (
                              <span
                                title={translate('status.completed')}
                                className="inline-flex shrink-0 items-center justify-center rounded-full p-1 bg-slate-100 text-slate-600 border border-slate-200/80 shadow-2xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              </span>
                            )}
                            <span
                              aria-label={`${translate('participantsCount')}: ${participantCapacity}`}
                              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold sm:text-sm transition-colors ${
                                isActive ? 'bg-white text-blue-700 shadow-2xs' : 'bg-white/80 text-slate-600 border border-slate-200/60'
                              }`}
                            >
                              <Users className="h-3.5 w-3.5" aria-hidden="true" />
                              {participantCapacity}
                            </span>
                          </button>

                          <div
                            className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                              isActive ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] pointer-events-none'
                            }`}
                          >
                            <div className="overflow-hidden">
                              {isActive && divisionTournament && (
                                <div
                                  id="selected-division-content"
                                  className="pt-3 pb-2 px-0"
                                >
                                  {activeTab === 'live' && (
                                    <LiveMatchesTab
                                      key={division.id}
                                      tournament={divisionTournament}
                                      tournamentId={tournament.id}
                                      divisionId={division.id}
                                      onLiveCountChange={handleLiveCountChange}
                                    />
                                  )}
                                  {activeTab === 'results' && (
                                    <ResultsTab
                                      key={division.id}
                                      tournamentId={tournament.id}
                                      divisionId={division.id}
                                      tournamentName={activeTournament.name}
                                    />
                                  )}
                                  {activeTab === 'teams' && (
                                    <TeamsTab
                                      key={division.id}
                                      tournament={divisionTournament}
                                      tournamentId={tournament.id}
                                      divisionId={division.id}
                                      participantId={searchParams.get('participantId') || undefined}
                                    />
                                  )}
                                  {activeTab === 'bracket' && (
                                    <BracketTab
                                      key={division.id}
                                      tournament={divisionTournament}
                                      tournamentId={tournament.id}
                                      divisionId={division.id}
                                    />
                                  )}
                                  {activeTab === 'matches' && (
                                    <MatchesTab
                                      key={division.id}
                                      tournament={divisionTournament}
                                      tournamentId={tournament.id}
                                      divisionId={division.id}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'overview' && <OverviewTab key="overview" tournament={tournament} />}
              {activeTab === 'sponsors' && <SponsorsTab sponsors={publicSponsors} />}
            </div>

            {/* Mobile Contact Container */}
            <div className="block lg:hidden">
              {renderContactCard()}
            </div>
          </div>

          {/* Right Column: Organizer, Title, Metadata Card & Actions (Sticky on Desktop) */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-4 lg:sticky lg:top-[calc(var(--app-header-height)+1rem)] space-y-4 min-w-0">
            {isClubLite ? (
              renderLiteSidebar()
            ) : (
              <>
                {renderMetadataCard()}
                {renderContactCard()}
              </>
            )}
          </div>
        </div>
      </div>

      <RegisterModal
        tournamentId={activeTournament.id}
        tournamentName={tournament.name}
        entryFee={selectedDivision ? (Number(selectedDivision.entryFee) || 0) : 0}
        matchType={selectedDivision?.matchType || divisionsList[0]?.matchType}
        isRanked={Boolean(activeTournament.isRanked)}
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={typeof window !== 'undefined' ? window.location.href : ''}
        title={activeTournament.name}
      />
    </div>
  );
}
