'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Division, Tournament, divisionsApi, tournamentsApi } from '@/features/tournaments/api';
import { isClubLiteTournament } from '@/features/tournaments/lite-qr';
import { Button } from '@/components/ui/Button';
import { Calendar, MapPin, Users, Trophy, Share2, AlertCircle, User, Phone, Mail, Globe, Bookmark } from 'lucide-react';
import Link from 'next/link';
import OverviewTab from './components/OverviewTab';
import TeamsTab from './components/TeamsTab';
import BracketTab from './components/BracketTab';
import MatchesTab from './components/MatchesTab';
import LiveMatchesTab from './components/LiveMatchesTab';
import RegisterModal from './components/RegisterModal';
import { useAuthStore } from '@/lib/zustand/authStore';
import GalleryCarousel from '@/components/ui/GalleryCarousel';
import { triggerShare } from '@/utils/share.util';
import ShareModal from '@/components/common/ShareModal';
import CountdownTimer from '@/components/shared/CountdownTimer';
import toast from 'react-hot-toast';
import { BRAND } from '@/constants/brand';
import { getSportLogo } from '@/constants/sports';
import { socketClient } from '@/lib/socket';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';
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



interface Props {
  tournamentId: string;
  initialTournament: Tournament | null;
}

type TournamentDetailTab = 'live' | 'overview' | 'teams' | 'bracket' | 'matches';

const TOURNAMENT_DETAIL_TABS: TournamentDetailTab[] = [
  'overview',
  'teams',
  'bracket',
  'matches',
];

export default function TournamentDetailClient({ tournamentId, initialTournament }: Props) {
  const translate = useTranslations('TournamentDetail');
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
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
  const [divisionsList, setDivisionsList] = useState<Division[]>([]);
  const selectedDivision: Tournament | null = (() => {
    if (!tournament || !selectedDivisionId) {
      return tournament;
    }

    const division = divisionsList.find((item) => item.id === selectedDivisionId);
    if (!division) {
      return tournament;
    }

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
  })();
  const activeTournament = selectedDivision ?? tournament;

  const isOwner = !!user?.id && !!activeTournament?.organizerId && user.id === activeTournament.organizerId;
  const [activeTab, setActiveTab] = useState<TournamentDetailTab>('overview');
  const [liveMatchesCount, setLiveMatchesCount] = useState(0);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Check live matches count
  useEffect(() => {
    let active = true;
    const checkLive = async () => {
      try {
        const params: Record<string, string | number> = {
          tournament_id: tournamentId,
          status: 'ONGOING',
          limit: 100,
        };
        if (selectedDivisionId) params.division_id = selectedDivisionId;
        const res = await matchesApi.getMatches(params);
        const data = Array.isArray(res) ? res : (res.data || []);
        if (active) {
          const count = (data as { status: string }[]).filter((m) => m.status === 'ONGOING').length;
          setLiveMatchesCount(count);
        }
      } catch {
        // silent fallback
      }
    };
    checkLive();
    return () => {
      active = false;
    };
  }, [tournamentId, selectedDivisionId]);

  // Handle socket live match updates for live badge
  useEffect(() => {
    const socket = socketClient.getMatchSocket();
    const joinTournament = () => socket.emit('joinTournament', tournamentId);
    const handleMatchUpdate = (rawMatch: { status?: string; tournamentId?: string } | string) => {
      let updatedMatch: { status?: string; tournamentId?: string };
      try {
        updatedMatch = typeof rawMatch === 'string'
          ? JSON.parse(rawMatch) as { status?: string; tournamentId?: string }
          : rawMatch;
      } catch {
        return;
      }
      if (updatedMatch?.tournamentId !== tournamentId) return;
      // Refresh live count
      const params: Record<string, string | number> = {
        tournament_id: tournamentId,
        status: 'ONGOING',
        limit: 100,
      };
      if (selectedDivisionId) params.division_id = selectedDivisionId;
      matchesApi.getMatches(params).then((res) => {
        const data = Array.isArray(res) ? res : (res.data || []);
        const count = (data as { status: string }[]).filter((m) => m.status === 'ONGOING').length;
        setLiveMatchesCount(count);
      }).catch(() => {});
    };

    socket.on('connect', joinTournament);
    socket.on('match:update', handleMatchUpdate);
    if (socket.connected) joinTournament();

    return () => {
      socket.off('connect', joinTournament);
      socket.off('match:update', handleMatchUpdate);
    };
  }, [tournamentId, selectedDivisionId]);

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
  }, [tournamentId, tournament]);

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
      tournamentsApi.getTournamentById(tournamentId)
        .then((response) => {
          if (response.data) setTournament(response.data);
        })
        .catch(() => {
          // Keep the last confirmed snapshot; the 15-second API refresh remains the fallback.
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
  }, [tournamentId]);

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
      if (!tournament?.id) {
        return;
      }
      try {
        const divisionsRes = await divisionsApi.getDivisions(tournament.id);
        const requestedDivisionId = searchParams.get('divisionId');
        if (divisionsRes.data && divisionsRes.data.length > 0) {
          const divisionsWithCount = divisionsRes.data.map(d => {
            const original = tournament?.divisions?.find(td => td.id === d.id);
            return { ...d, _count: original?._count || d._count };
          });
          setDivisionsList(divisionsWithCount);
          const preferredDivision = requestedDivisionId
            ? divisionsRes.data.find((division) => division.id === requestedDivisionId)
            : null;
          const nextDivisionId = preferredDivision?.id ?? divisionsRes.data[0].id;
          Promise.resolve().then(() => {
            setSelectedDivisionId((currentDivisionId) =>
              currentDivisionId === nextDivisionId ? currentDivisionId : nextDivisionId,
            );
          });
        } else {
          Promise.resolve().then(() => {
            setSelectedDivisionId((currentDivisionId) =>
              currentDivisionId === '' ? currentDivisionId : '',
            );
          });
        }
      } catch (err: unknown) {
        console.error('Failed to load parent/divisions context:', err);
      }
    };
    loadParentAndDivisions();
  }, [searchParams, tournament?.id]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');

    if (!requestedTab || !TOURNAMENT_DETAIL_TABS.includes(requestedTab as TournamentDetailTab)) {
      return;
    }

    if (activeTab !== requestedTab) {
      Promise.resolve().then(() => {
        setActiveTab(requestedTab as TournamentDetailTab);
      });
    }
  }, [activeTab, searchParams]);

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

  let registrationButtonLabel = registrationModeUi.ctaLabel;
  let isRegistrationButtonDisabled = false;

  if (isRegistrationOpen) {
    if (isRegistrationLocked) {
      registrationButtonLabel = translate('registrationLocked');
      isRegistrationButtonDisabled = true;
    } else if (isRegistrationExpired) {
      registrationButtonLabel = translate('registrationExpired');
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

  const formatDateRange = (start?: string, end?: string) => {
    if (!start && !end) return translate('notUpdated');
    const sStr = start ? formatDate(start) : '...';
    const eStr = end ? formatDate(end) : '...';
    return `${sStr} - ${eStr}`;
  };

  const tabs: { id: TournamentDetailTab; label: string; badge?: number; isLive?: boolean }[] = [
    ...(liveMatchesCount > 0
      ? [{ id: 'live' as const, label: 'LIVE', badge: liveMatchesCount, isLive: true }]
      : []),
    { id: 'overview', label: translate('overview') },
    { id: 'teams', label: translate('tabs.teams') },
    { id: 'bracket', label: translate('tabs.bracket') },
    { id: 'matches', label: translate('tabs.matches') },
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {/* Banner Carousel Showcase */}
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 pt-4 md:pt-6">
        <div className="relative w-full h-56 sm:h-72 md:h-[380px] lg:h-[460px] xl:h-[500px] rounded-lg md:rounded-2xl overflow-hidden shadow-xl">
          <GalleryCarousel
            images={activeTournament.galleryImages && activeTournament.galleryImages.length > 0 ? activeTournament.galleryImages : []}
            defaultBanner={activeTournament.bannerUrl || undefined}
            className="w-full h-56 sm:h-72 md:h-[380px] lg:h-[460px] xl:h-[500px]"
          />

          {!hidePublicBannerText && (
            <div className="absolute bottom-4 left-6 md:bottom-6 md:left-8 z-10 space-y-1">
              <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow-md tracking-wide uppercase truncate">
                {tournament.name}
              </h1>
            </div>
          )}
        </div>
      </div>

      {/* Info Panel below banner */}
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 mt-6">
        <div className="bg-white border border-slate-200/80 rounded-lg p-5 md:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full md:w-auto">
            <Link
              href={`/tournaments/${activeTournament.id}`}
              className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full p-1.5 flex items-center justify-center border border-slate-200 shadow-md flex-shrink-0 hover:scale-105 transition-transform cursor-pointer"
              title={translate('viewTournamentDetails')}
            >
              <img
                src={activeTournament.logoUrl || BRAND.assets.defaultTournamentLogo}
                alt={activeTournament.name}
                className="w-full h-full object-contain rounded-full p-2"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = BRAND.assets.defaultTournamentLogo;
                }}
              />
            </Link>
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {activeTournament.category?.name && (
                  <span className="px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200 shadow-sm flex items-center gap-1.5">
                    {(() => {
                      const logo = getSportLogo(activeTournament.category?.name);
                      return logo ? (
                        <img src={logo} alt={activeTournament.category?.name || ''} className="w-3.5 h-3.5 object-contain" />
                      ) : null;
                    })()}
                    {activeTournament.category.name}
                  </span>
                )}
                <span className={`px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-md border shadow-sm ${getTournamentStatusClassName(activeTournament.status)}`}>
                  {getTournamentStatusLabel(activeTournament.status, statusLabels).toUpperCase()}
                </span>
                <span className="px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 shadow-sm flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-blue-500" />
                  {(() => {
                    const fmt = (activeTournament.format ?? '').replace('.', '_').replace(' ', '_').toUpperCase();
                    if (fmt === 'SINGLE_ELIMINATION') return translate('format.singleElimination');
                    if (fmt === 'DOUBLE_ELIMINATION') return translate('format.doubleElimination');
                    if (fmt === 'ROUND_ROBIN') return translate('format.roundRobin');
                    if (fmt === 'GROUP_STAGE_KNOCKOUT') return translate('format.groupStageKnockout');
                    return fmt;
                  })()}
                </span>
                <span className={`px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-md border shadow-sm ${
                  activeTournament.isRanked
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                }`}>
                  {activeTournament.isRanked ? `⭐ ${translate('rankedBadge')}` : `🎾 ${translate('casualBadge')}`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 font-medium">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {activeTournament.startDate ? (
                    <>
                      {formatDate(activeTournament.startDate)}
                      {activeTournament.endDate && ` - ${formatDate(activeTournament.endDate)}`}
                    </>
                  ) : translate('dateNotSet')}
                </span>
                <span className="flex min-w-0 max-w-full items-start gap-1.5 md:max-w-[min(100%,760px)]">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="break-words whitespace-normal leading-6" title={getTournamentLocationLabel(activeTournament)}>
                    {getTournamentLocationLabel(activeTournament) || translate('venueNotUpdated')}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-stretch md:items-center">
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              {user?.id && (
                <Button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  variant={isFollowing ? 'default' : 'outline'}
                  className={`flex-1 md:flex-none font-bold shadow-sm h-10 text-xs md:text-sm ${
                    isFollowing
                      ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 mr-1.5 ${isFollowing ? 'fill-current' : ''}`} />
                  {isFollowing ? translate('followActive') : translate('follow')}
                </Button>
              )}
              <Button onClick={handleShareClick} variant="outline" className="bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 flex-1 md:flex-none font-bold shadow-sm h-10 text-xs md:text-sm">
                <Share2 className="w-3.5 h-3.5 mr-1.5" /> {translate("share")}
              </Button>
              <ReportViolationButton
                targetType="TOURNAMENT"
                targetId={tournament.id}
                targetLabel={tournament.name}
                hidden={isOwner}
                compact
              />
            </div>

            {!isOwner && !isTournamentDraft(activeTournament.status) && (
              <Button
                disabled={isRegistrationButtonDisabled}
                className={`${
                  isRegistrationButtonDisabled
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-200 hover:bg-slate-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/10'
                } font-bold w-full md:w-auto shadow-sm h-10 text-xs md:text-sm`}
                onClick={() => {
                  if (isRegistrationButtonDisabled) return;
                  if (isClubLiteTournament(activeTournament)) {
                    if (activeTournament.inviteCode) {
                      router.push(`/lite/tournaments/join/${activeTournament.inviteCode}`);
                    } else {
                      toast.error(translate('joinLinkUnavailable'));
                    }
                    return;
                  }
                  const needsRegistrationPage = activeTournament.visibility === 'PRIVATE' ||
                                                registrationModeUi.mode !== 'OPEN' ||
                                                divisionsList.length > 0 ||
                                                hasAdvancedRegistrationForm;
                  if (needsRegistrationPage) {
                    router.push(registerHref);
                  } else {
                    setIsRegisterModalOpen(true);
                  }
                }}
              >
                {registrationButtonLabel}
              </Button>
            )}
            {isOwner && !isTournamentDraft(activeTournament.status) && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-center w-full md:w-auto shadow-sm flex items-center justify-center h-10">
                <p className="text-xs text-slate-600 font-bold whitespace-nowrap">
                  {translate('ownerLabel')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">

          {/* Left Area - Tabs & Content (takes 3 cols) */}
          <div className="lg:col-span-3 space-y-6 min-w-0 max-w-full overflow-hidden">
            {/* Tabs */}
            <div className="flex overflow-x-auto gap-1.5 sm:gap-2 mb-2 no-scrollbar pb-1">
              {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
                      tab.isLive
                        ? isActive
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                          : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100/80 animate-pulse'
                        : isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-200/60 text-slate-600 hover:bg-slate-300/60 hover:text-slate-900'
                    }`}
                  >
                    {tab.isLive && (
                      <span className="w-2 h-2 rounded-full bg-current animate-ping shrink-0" />
                    )}
                    <span>{tab.label}</span>
                    {tab.badge != null && (
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
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

            {/* Tab Content */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3 sm:p-6 md:p-8 min-h-[500px] min-w-0 max-w-full overflow-hidden">
              {/* Division selector inside tab card */}
              {divisionsList.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 mb-6 gap-3">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-slate-900 text-sm">{translate('competitionContentTitle')}</h3>
                    <p className="text-[11px] text-slate-400 font-bold">{translate('competitionContentDescription')}</p>
                  </div>
                  <select
                    value={selectedDivisionId}
                    onChange={(e) => setSelectedDivisionId(e.target.value)}
                    disabled={false}
                    className="border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs h-10 w-full sm:w-60 shadow-sm cursor-pointer"
                  >
                    {divisionsList.map((div) => (
                      <option key={div.id} value={div.id}>
                        {div.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedDivision ? (
                <>
                  {activeTab === 'live' && (
                    <LiveMatchesTab
                      key={selectedDivisionId || 'all'}
                      tournament={selectedDivision}
                      tournamentId={tournament.id}
                      divisionId={selectedDivisionId || undefined}
                      onLiveCountChange={(count) => {
                        setLiveMatchesCount(count);
                        if (count === 0 && activeTab === 'live') {
                          setActiveTab('overview');
                        }
                      }}
                    />
                  )}
                  {activeTab === 'overview' && <OverviewTab key={selectedDivisionId || 'all'} tournament={selectedDivision} />}
                  {activeTab === 'teams' && (
                    <TeamsTab
                      key={selectedDivisionId || 'all'}
                      tournament={selectedDivision}
                      tournamentId={tournament.id}
                      divisionId={selectedDivisionId || undefined}
                      participantId={searchParams.get('participantId') || undefined}
                    />
                  )}
                  {activeTab === 'bracket' && (
                    <BracketTab
                      key={selectedDivisionId || 'all'}
                      tournament={selectedDivision}
                      tournamentId={tournament.id}
                      divisionId={selectedDivisionId || undefined}
                    />
                  )}
                  {activeTab === 'matches' && (
                    <MatchesTab
                      key={selectedDivisionId || 'all'}
                      tournament={selectedDivision}
                      tournamentId={tournament.id}
                      divisionId={selectedDivisionId || undefined}
                    />
                  )}
                </>
              ) : (
                <p className="text-center text-slate-400 italic py-12">{translate("rankingDataUnavailable")}</p>
              )}
            </div>
          </div>

          {/* Right Area - Registration & Info Card (takes 1 col) */}
          <div className="lg:col-span-1 lg:sticky lg:top-6">
            <div className="bg-white rounded-lg border border-slate-250/80 p-6 flex flex-col gap-6 shadow-sm">
              {showRegistrationDetails && (
                <>
              {/* Entry Fee */}
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">{translate("entryFee")}</span>
                <div className="text-2xl font-bold text-blue-600">
                  {selectedDivision?.entryFee && selectedDivision.entryFee > 0
                    ? `${Number(selectedDivision.entryFee).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} VND`
                    : translate('free')}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{translate("feeAtRegistration")}</p>

                {/* Selected Division ELO Range Indicator */}
                {(() => {
                  const activeDiv = divisionsList.find(d => d.id === selectedDivisionId);
                  if (!activeDiv || (activeDiv.minElo === null && activeDiv.maxElo === null)) return null;
                  const isDoublesDiv = activeDiv.matchType === 'DOUBLES' || activeDiv.matchType === 'MIXED_DOUBLES';
                  return (
                    <div className="mt-3 bg-blue-50/60 border border-blue-100 rounded-lg p-2.5">
                      <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block mb-0.5">
                        {isDoublesDiv ? translate('eloRequirementDoubles') : translate('eloRequirementSingles')}
                      </span>
                      <span className="text-xs font-bold text-blue-700">
                        {activeDiv.minElo !== null ? activeDiv.minElo : '0'}
                        {' - '}
                        {activeDiv.maxElo !== null ? activeDiv.maxElo : translate('unlimited')}
                      </span>
                    </div>
                  );
                })()}
              </div>

                </>
              )}

              {/* Organizer Info */}
              <div className="border-t border-slate-100 pt-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{translate('organizerLabel')}</span>
                {activeTournament.organizer?.id ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      openUserProfile(
                        {
                          id: activeTournament.organizer.id,
                          fullName: activeTournament.organizer.fullName || translate('organizerDefault'),
                          avatarUrl: activeTournament.organizer.avatarUrl || null,
                          isTrusted: activeTournament.organizer.isTrusted,
                        },
                        rect,
                      );
                    }}
                    className="flex items-center gap-3 text-left w-full p-2 -ml-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer group"
                  >
                    {activeTournament.organizer?.avatarUrl ? (
                      <img
                        src={activeTournament.organizer.avatarUrl}
                        alt={activeTournament.organizer?.fullName || 'BTC'}
                        className="w-10 h-10 rounded-full border border-slate-200 object-cover shadow-sm group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm group-hover:scale-105 transition-transform">
                        <User className="w-5 h-5 text-blue-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-slate-900 font-bold text-sm truncate group-hover:text-blue-600 transition-colors">
                          {activeTournament.organizer?.fullName || translate('organizerDefault')}
                        </p>
                        {activeTournament.organizer?.isTrusted ? (
                          <span className="inline-flex items-center text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-md shrink-0" title={translate('organizerTrusted')}>
                            👑 {translate('organizerTrusted')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[9px] font-bold bg-slate-100 text-slate-650 px-1.5 py-0.2 rounded-md shrink-0" title={translate('organizerNew')}>
                            🔰 {translate('organizerNew')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{translate("organizerLabel")}</p>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    {activeTournament.organizer?.avatarUrl ? (
                      <img
                        src={activeTournament.organizer.avatarUrl}
                        alt={activeTournament.organizer?.fullName || 'BTC'}
                        className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                        <User className="w-5 h-5 text-blue-500" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-slate-900 font-bold text-sm">{activeTournament.organizer?.fullName || translate('organizerDefault')}</p>
                        {activeTournament.organizer?.isTrusted ? (
                          <span className="inline-flex items-center text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-md" title={translate('organizerTrusted')}>
                            👑 {translate('organizerTrusted')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[9px] font-bold bg-slate-100 text-slate-650 px-1.5 py-0.2 rounded-md" title={translate('organizerNew')}>
                            🔰 {translate('organizerNew')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{translate("organizerLabel")}</p>
                    </div>
                  </div>
                )}
              </div>

              {showRegistrationDetails && (
                <>
              {/* Slots Progress Bar for all divisions */}
              {divisionsList.length > 0 ? (
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <span className="text-xs font-bold text-slate-450 uppercase tracking-wider block">{translate("profilesByTable")}</span>
                  {divisionsList.map((div) => {
                    const divParticipants = div._count?.participants ?? 0;
                    const divMax = div.maxParticipants ?? activeTournament.maxParticipants ?? 16;
                    const divPercent = divMax > 0 ? Math.min(100, Math.round((divParticipants / divMax) * 100)) : 0;
                    const isDivDoubles = div.matchType === 'DOUBLES' || div.matchType === 'MIXED_DOUBLES';
                    const hasElo = div.minElo !== null || div.maxElo !== null;
                    return (
                      <div key={div.id} className="space-y-1">
                        <div className="flex justify-between items-center text-[11px] font-bold">
                          <div className="flex flex-col min-w-0">
                            <span className="text-slate-700 truncate max-w-[150px]">{div.name}</span>
                            {hasElo && (
                              <span className="text-[9px] text-blue-600 font-bold">
                                {isDivDoubles ? translate('eloRequirementDoubles') : translate('eloRequirementSingles')}: {div.minElo !== null ? div.minElo : '0'} - {div.maxElo !== null ? div.maxElo : '∞'}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-500">{divParticipants} / {divMax} ({divPercent}%)</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              divPercent >= 90 ? 'bg-rose-500' : divPercent >= 70 ? 'bg-amber-500' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${divPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                maxParticipants > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                      <span className="text-slate-500 uppercase tracking-wider">{translate('participantsCount')}</span>
                      <span className="text-slate-800">{participantCount} / {maxParticipants}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percentageFilled >= 90 ? 'bg-rose-500' : percentageFilled >= 70 ? 'bg-amber-500' : 'bg-blue-650'
                        }`}
                        style={{ width: `${percentageFilled}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{translate('slotsFilled', { percentage: percentageFilled })}</p>
                  </div>
                )
              )}

              {/* Registration Period */}
              <div className="border-t border-slate-100 pt-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{translate("registrationPeriod")}</span>
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-450 mt-0.5 shrink-0" />
                  <div className="text-xs font-semibold text-slate-700 leading-normal">
                    {formatDateRange(activeTournament.registrationStartDate, activeTournament.registrationEndDate)}
                  </div>
                </div>

                {/* Smart Sequential Countdown Timer (Chỉ hiện 1 đếm ngược duy nhất) */}
                {(() => {
                  const now = new Date();
                  const regStart = activeTournament.registrationStartDate ? new Date(activeTournament.registrationStartDate) : null;
                  const regEnd = activeTournament.registrationEndDate ? new Date(activeTournament.registrationEndDate) : null;
                  const tourStart = activeTournament.startDate ? new Date(activeTournament.startDate) : null;
                  const tourEnd = activeTournament.endDate ? new Date(activeTournament.endDate) : null;

                  // 1. Chưa tới ngày mở đăng ký -> CHỈ ĐẾM NGƯỢC THỜI GIAN MỞ ĐĂNG KÝ
                  if (regStart && now < regStart) {
                    return (
                      <CountdownTimer
                        targetDate={activeTournament.registrationStartDate!}
                        labels={{ active: translate('registrationOpensAfter'), expired: translate('registrationOpened'), dayLabel: commonTranslate('countdownDay') }}
                        variant="info"
                      />
                    );
                  }

                  // 2. Đã mở đăng ký, chưa đóng -> CHỈ ĐẾM NGƯỢC HẠN ĐÓNG ĐĂNG KÝ
                  if (regEnd && now < regEnd) {
                    return (
                      <CountdownTimer
                        targetDate={activeTournament.registrationEndDate!}
                        labels={{ active: translate('closeRegistrationAfter'), expired: translate('registrationClosed'), dayLabel: commonTranslate('countdownDay') }}
                        variant="warning"
                      />
                    );
                  }

                  // 3. Đã đóng đăng ký, chưa khởi tranh -> Đếm ngược ngày khởi tranh
                  if (tourStart && now < tourStart) {
                    return (
                      <CountdownTimer
                        targetDate={activeTournament.startDate!}
                        labels={{ active: translate('startAfter'), expired: translate('started'), dayLabel: commonTranslate('countdownDay') }}
                        variant="danger"
                      />
                    );
                  }

                  // 4. Giải đang diễn ra -> Đếm ngược ngày kết thúc
                  if (isTournamentInProgress(activeTournament.status) && tourEnd && now < tourEnd) {
                    return (
                      <div>
                        <CountdownTimer
                          targetDate={activeTournament.endDate!}
                          labels={{ active: translate('endAfter'), expired: translate('completed'), dayLabel: commonTranslate('countdownDay') }}
                          variant="danger"
                        />
                        <p className="text-[10px] text-slate-400 mt-1 italic">{translate("scheduleMayChange")}</p>
                      </div>
                    );
                  }

                  // 5. Đã kết thúc
                  if (isTournamentCompleted(activeTournament.status) || (regEnd && now >= regEnd && !tourStart)) {
                    return (
                      <div className="mt-2 p-2.5 border rounded-lg bg-slate-50 border-slate-200 text-slate-400">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-slate-400" />
                          <span className="text-xs font-bold text-slate-400">{translate('completed')}</span>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}

              </div>

              {/* Warnings and Info Banners */}
              {isRegistrationOpen && isRegistrationLocked && (
                <div className="bg-slate-50 border border-amber-250/60 rounded-lg p-3.5 flex items-start gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-amber-800 leading-normal">
                    {translate("registrationLockedNotice")}
                  </p>
                </div>
              )}
              {isRegistrationOpen && isRegistrationExpired && (
                <div className="bg-rose-50 border border-rose-250/60 rounded-lg p-3.5 flex items-start gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-rose-800 leading-normal">
                    {translate("registrationExpiredNotice")}
                  </p>
                </div>
              )}

              {/* Action Button */}
              {!isOwner && !isTournamentDraft(activeTournament.status) && (
                  <div className="mt-1 block w-full">
                    {isClubLiteTournament(activeTournament) ? (
                      activeTournament.inviteCode ? (
                        <Link
                          href={`/lite/tournaments/join/${activeTournament.inviteCode}`}
                          className="block w-full"
                        >
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-sm cursor-pointer text-sm">
                            {translate('liteJoin')}
                          </Button>
                        </Link>
                      ) : (
                        <Button disabled className="w-full bg-slate-100 text-slate-400 font-semibold py-2.5 rounded-lg border border-slate-200 text-sm cursor-not-allowed">
                          {translate('joinLinkUnavailable')}
                        </Button>
                      )
                    ) : isRegistrationButtonDisabled ? (
                    <Button disabled className="w-full bg-slate-100 text-slate-400 font-bold py-2.5 rounded-lg border border-slate-200 text-sm cursor-not-allowed">
                      {registrationButtonLabel}
                    </Button>
                  ) : (
                    <Link href={registerHref} className="block w-full">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg shadow-md cursor-pointer text-sm">
                        {registrationButtonLabel}
                      </Button>
                    </Link>
                  )}
                </div>
              )}

                </>
              )}

              {isOwner && !isTournamentDraft(activeTournament.status) && (
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3.5 mt-1 text-center">
                    <p className="text-xs text-slate-800 font-bold">
                    {translate('ownerAdminLabel')}
                  </p>
                  <Link
                    href={isClubLiteTournament(activeTournament)
                      ? `/organizer/tournaments/${activeTournament.id}/manage`
                      : `/organizer/tournaments/${activeTournament.id}/manage`
                    }
                    className="mt-1.5 block text-xs text-blue-600 font-bold hover:underline"
                  >
                    {isClubLiteTournament(activeTournament)
                      ? translate('manageLite')
                      : translate('manageBracketSchedule')
                    }
                  </Link>
                </div>
              )}
            </div>

            {/* Contact Info Card */}
            {activeTournament.contactInfo && (
              <div className="bg-white rounded-lg border border-slate-250/80 p-6 flex flex-col gap-2.5 shadow-sm mt-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{translate('contactInfo')}</span>
                {activeTournament.contactInfo.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-slate-450 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700">{activeTournament.contactInfo.phone}</span>
                  </div>
                )}
                {activeTournament.contactInfo.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-slate-450 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 truncate">{activeTournament.contactInfo.email}</span>
                  </div>
                )}
                {Object.entries(activeTournament.contactInfo)
                  .filter(([key]) => key !== 'phone' && key !== 'email')
                  .map(([key, val]) => {
                    if (!val) return null;
                    const lowercaseKey = key.toLowerCase();
                    const isUrl = typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));

                    let IconComponent: React.ComponentType<React.SVGProps<SVGSVGElement>> = Globe;
                    let iconColor = 'text-slate-450';

                    if (lowercaseKey.includes('instagram')) {
                      IconComponent = InstagramIcon;
                      iconColor = 'text-pink-600';
                    } else if (lowercaseKey.includes('zalo')) {
                      IconComponent = ZaloIcon;
                      iconColor = 'text-blue-650';
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
