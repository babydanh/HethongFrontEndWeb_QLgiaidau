'use client';

import { useAuthStore } from '@/lib/zustand/authStore';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { BRAND } from '@/constants/brand';
import { buildMatchScoreSummary } from '@/features/matches/score-display';
import { Trophy, Calendar, Users, Activity, Settings, MapPin, Edit3, ShieldCheck, Loader2, Phone, UploadCloud, X, Mail, Camera, AlertTriangle, ChevronRight, Zap, Award, Bookmark, Share2, Check, Compass, Sparkles, Target, Clock, Star, ThumbsUp, Swords } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar';
import { useState, useEffect, useRef } from 'react';
import { useTranslations } from "next-intl";
import { cn } from '@/utils/cn';
import { usersApi, UserProfile } from '@/features/users/api';
import { communitiesApi, Community } from '@/features/communities/api';
import { formatDate, formatCurrency } from '@/utils/format';
import { getTournamentLocationLabel } from '@/utils/tournament-location';
import { getTournamentStatusClassName,
  getTournamentStatusLabel,
  isTournamentCancelled,
  isTournamentCompleted,
  isTournamentInProgress,
  isTournamentOpenForRegistration,
  isTournamentUpcoming,
} from '@/utils/tournament-status';
import { sortFollowedTournaments } from '@/utils/tournament-follow';
import Image from 'next/image';
import { api } from '@/lib/axios';
import { uploadApi } from '@/features/upload/api';
import { Input } from '@/components/ui/Input';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { ApiResponse } from '@/types/api';
import { rankingsApi, PlayerRanking, EloHistoryLog } from '@/features/rankings/api';
import { tournamentsApi, Tournament, BracketMatch, BracketStage, WorkspaceRefereeInvite } from '@/features/tournaments/api';
import { matchesApi, Match } from '@/features/matches/api';
import { EloTierBadge } from '@/components/ui/EloTierBadge';
import { RankAvatar } from '@/components/ui/RankAvatar';
import { normalizeProfileGender } from '@/utils/gender';

import { categoriesApi, Category } from '@/features/categories/api';
import { getCanonicalTierName, isPublicRankingEligible } from '@/features/rankings/elo-display';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';


interface VerificationTicket {
  id: string;
  userId: string;
  evidenceUrls: string[];
  contactPhone: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason?: string;
  createdAt: string;
}

type ProfileTab = 'overview' | 'tournaments' | 'achievements' | 'matches' | 'elo';

const PROFILE_TABS = ['overview', 'tournaments', 'achievements', 'matches', 'elo'] as const;

const isProfileTab = (value: string): value is ProfileTab =>
  (PROFILE_TABS as readonly string[]).includes(value);

type AchievementRank = 1 | 2 | 3;

interface AchievementCard {
  tournamentId: string;
  tournamentName: string;
  rank: AchievementRank;
  label: string;
  colorClass: string;
  textClass: string;
  borderClass: string;
  completedAt?: string | null;
  tournamentDate?: string | null;
}

const getAchievementMeta = (rank: AchievementRank, labels: { champion: string; runnerUp: string; thirdPlace: string }) => {
  switch (rank) {
    case 1:
      return {
        label: labels.champion,
        colorClass: 'bg-amber-50',
        textClass: 'text-amber-700',
        borderClass: 'border-amber-200',
      };
    case 2:
      return {
        label: labels.runnerUp,
        colorClass: 'bg-slate-50',
        textClass: 'text-slate-700',
        borderClass: 'border-slate-200',
      };
    case 3:
    default:
      return {
        label: labels.thirdPlace,
        colorClass: 'bg-amber-50',
        textClass: 'text-amber-700',
        borderClass: 'border-amber-200',
      };
  }
};

type ParticipantWithUserMembers = {
  members?: ReadonlyArray<{ userId?: string }> | null;
} | null | undefined;

const hasUserInParticipant = (
  participant: ParticipantWithUserMembers,
  userId: string,
) => Boolean(participant?.members?.some((member) => member.userId === userId));

const isMockParticipant = (
  participant: Match['participant1'] | Match['participant2'] | null | undefined,
): boolean => Boolean(
  participant?.isMock === true
  || participant?.members?.some((member) => member.isMock === true),
);

const isPlaceholderParticipant = (
  participant: Match['participant1'] | Match['participant2'] | null | undefined,
): boolean => {
  const teamName = participant?.teamName?.trim().toLowerCase();
  return !teamName || ['tbd', 'chờ xác định', 'chua xac dinh', 'đang chờ', 'dang cho'].includes(teamName);
};

const isRenderableProfileMatch = (match: Match, userId: string): boolean => {
  const isP1 = hasUserInParticipant(match.participant1, userId);
  const isP2 = hasUserInParticipant(match.participant2, userId);
  if (!isP1 && !isP2) return false;
  if (match.isBye || isMockParticipant(match.participant1) || isMockParticipant(match.participant2)) return false;

  const opponent = isP1 ? match.participant2 : match.participant1;
  return !isPlaceholderParticipant(opponent);
};

const deriveTournamentPlacement = (
  tournament: Tournament,
  stages: BracketStage[],
  userId: string,
  labels: { champion: string; runnerUp: string; thirdPlace: string },
): AchievementCard | null => {
  const allMatches = stages.flatMap((stage) =>
    stage.groups.flatMap((group) =>
      group.matches.map((match) => ({
        ...match,
        stageOrder: stage.order,
      })),
    ),
);

  const userMatches = allMatches.filter(
    (match) =>
      hasUserInParticipant(match.participant1, userId) ||
      hasUserInParticipant(match.participant2, userId),
  );
  if (userMatches.length === 0) return null;

  const completedUserMatches = userMatches
    .filter((match) => match.status === 'COMPLETED')
    .sort((a, b) => (a.stageOrder - b.stageOrder) || ((a.completedAt || '').localeCompare(b.completedAt || '')));

  if (completedUserMatches.length === 0) return null;

  const maxStageOrder = Math.max(...allMatches.map((match) => match.stageOrder));
  const lastStageMatches = allMatches.filter((match) => match.stageOrder === maxStageOrder && match.status === 'COMPLETED');
  const prevStageWinners = new Set(
    allMatches
      .filter((match) => match.stageOrder === maxStageOrder - 1 && match.status === 'COMPLETED' && match.winnerId)
      .map((match) => match.winnerId as string),
  );

  let finalMatches = lastStageMatches.filter((match) => {
    const p1 = match.participant1?.id ? prevStageWinners.has(match.participant1.id) : false;
    const p2 = match.participant2?.id ? prevStageWinners.has(match.participant2.id) : false;
    return p1 && p2;
  });
  const bronzeMatches = lastStageMatches.filter((match) => !finalMatches.includes(match));

  if (finalMatches.length === 0 && lastStageMatches.length === 1) {
    finalMatches = lastStageMatches;
  }

  const userInMatch = (match: BracketMatch) => {
    const inP1 = hasUserInParticipant(match.participant1, userId);
    const inP2 = hasUserInParticipant(match.participant2, userId);
    return {
      inP1,
      inP2,
      teamId: inP1 ? match.participant1?.id || null : inP2 ? match.participant2?.id || null : null,
      isWinner:
        (inP1 && match.winnerId === match.participant1?.id) ||
        (inP2 && match.winnerId === match.participant2?.id),
    };
  };

  const finalUserMatch = finalMatches.find((match) => hasUserInParticipant(match.participant1, userId) || hasUserInParticipant(match.participant2, userId));
  if (finalUserMatch) {
    const result = userInMatch(finalUserMatch);
    const meta = getAchievementMeta(result.isWinner ? 1 : 2, labels);
    return {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      rank: result.isWinner ? 1 : 2,
      ...meta,
      completedAt: finalUserMatch.completedAt || null,
      tournamentDate: tournament.endDate || tournament.startDate || null,
    };
  }

  const bronzeUserMatch = bronzeMatches.find((match) => hasUserInParticipant(match.participant1, userId) || hasUserInParticipant(match.participant2, userId));
  if (bronzeUserMatch) {
    const result = userInMatch(bronzeUserMatch);
    if (result.isWinner) {
      const meta = getAchievementMeta(3, labels);
      return {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        rank: 3,
        ...meta,
        completedAt: bronzeUserMatch.completedAt || null,
        tournamentDate: tournament.endDate || tournament.startDate || null,
      };
    }
  }

  const latestUserMatch = completedUserMatches[completedUserMatches.length - 1];
  const latestResult = userInMatch(latestUserMatch);
  const isSemiFinalLoser = latestUserMatch.stageOrder < maxStageOrder && !latestResult.isWinner;
  if (isSemiFinalLoser) {
    const meta = getAchievementMeta(3, labels);
    return {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      rank: 3,
      ...meta,
      completedAt: latestUserMatch.completedAt || null,
      tournamentDate: tournament.endDate || tournament.startDate || null,
    };
  }

  return null;
};

export default function ProfilePage() {
  const translate = useTranslations("Profile");
  const achievementLabels = { champion: translate("achievementChampion"), runnerUp: translate("achievementRunnerUp"), thirdPlace: translate("achievementThirdPlace") };
    const { user, hasHydrated } = useAuthStore();

  const [profileData, setProfileData] = useState<UserProfile | null>(() => {
    const u = useAuthStore.getState().user;
    return u ? (u as unknown as UserProfile) : null;
  });
  const [createdCommunities, setCreatedCommunities] = useState<Community[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [participatingTournaments, setParticipatingTournaments] = useState<Tournament[]>([]);
  const [organizedTournaments, setOrganizedTournaments] = useState<Tournament[]>([]);
  const [coOrganizerTournaments, setCoOrganizerTournaments] = useState<Tournament[]>([]);
  const [refereeTournaments, setRefereeTournaments] = useState<WorkspaceRefereeInvite[]>([]);
  const [isLoading, setIsLoading] = useState(() => !useAuthStore.getState().user?.id);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(() => Boolean(useAuthStore.getState().user?.id));
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'tournaments' | 'achievements' | 'matches' | 'elo'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && isProfileTab(tab)) {
        return tab;
      }
    }
    return 'overview';
  });

  // Verification tickets states
  const [tickets, setTickets] = useState<VerificationTicket[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const getFormatLabel = (matchType?: string, genderRestriction?: string | null) => {
    const mt = matchType || '';
    const gr = genderRestriction || '';
    if (mt === 'SINGLES') {
      return gr === 'FEMALE' ? translate("formatSinglesFemale") : translate("formatSinglesMale");
    }
    if (mt === 'DOUBLES') {
      return gr === 'FEMALE' ? translate("formatDoublesFemale") : translate("formatDoublesMale");
    }
    if (mt === 'MIXED_DOUBLES' || mt === 'MIXED' || gr === 'MIXED') {
      return translate("formatMixedDoubles");
    }
    return mt === 'DOUBLES' ? translate("formatDoubles") : mt === 'SINGLES' ? translate("formatSingles") : translate("formatMixedDoubles");
  };

  const handleCoverClick = () => {
    coverInputRef.current?.click();
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(translate("imageTooLarge"));
      return;
    }

    try {
      setIsUploadingCover(true);
      const res = await usersApi.uploadCover(file);
      const url = res.coverUrl || undefined;

      const currentUser = useAuthStore.getState().user;
      if (currentUser && url) {
        useAuthStore.getState().setUser({ ...currentUser, coverUrl: url });
      }

      if (profileData && url) {
        setProfileData({ ...profileData, coverUrl: url });
      } else if (!profileData && url && user) {
        setProfileData({ ...user, coverUrl: url } as UserProfile);
      }

      toast.success(translate("coverUpdated"));
    } catch (error) {
      console.error(error);
      toast.error(translate("coverUploadFailed"));
    } finally {
      setIsUploadingCover(false);
    }
  };

  useEffect(() => {
    if (!hasHydrated) return;

    let isMounted = true;

    const fetchProfile = async () => {
      // A persisted user is already safe to render as the first shell.
      if (!user?.id && !profileData?.id) {
        setIsLoading(true);
      }
      try {
        // The profile is the only request that gates the header shell. Secondary
        // requests start after it succeeds so a slow/unauthorized auxiliary API
        // cannot keep the first visit in a full-page skeleton.
        const data = await usersApi.getProfile();
        if (!isMounted) return;

        setProfileData(data);
        setIsLoading(false);

        // Sync roles/details with useAuthStore so header displays updated roles immediately.
        if (data) {
          useAuthStore.getState().setUser({
            ...data,
            roles: data.roles || [],
          });
        }

        const userRoles = data?.roles || [];
        if (!userRoles.includes('ORGANIZER') && !userRoles.includes('ADMIN')) {
          void api
            .get<ApiResponse<VerificationTicket[]>>('/admin/verification-tickets/my')
            .then((res) => {
              if (isMounted) setTickets(res.data || []);
            })
            .catch(() => undefined);
        }

        setIsLoadingCommunities(true);
        void Promise.all([
          communitiesApi.getMyCommunities().catch(() => null),
          tournamentsApi.getMyWorkspace().catch(() => null),
          categoriesApi.getCategories().catch(() => null),
        ]).then(([communitiesRes, workspaceRes, categoriesRes]) => {
          if (!isMounted) return;
          setCreatedCommunities(communitiesRes?.data?.created || []);
          setJoinedCommunities(communitiesRes?.data?.joined || []);
          setParticipatingTournaments(workspaceRes?.data?.participatingTournaments || []);
          setOrganizedTournaments(workspaceRes?.data?.organizedTournaments || []);
          setCoOrganizerTournaments(workspaceRes?.data?.coOrganizerTournaments || []);
          setRefereeTournaments(workspaceRes?.data?.refereeTournaments || workspaceRes?.data?.refereeInvites || []);
          setCategories(Array.isArray(categoriesRes?.data) ? categoriesRes.data : []);
          setIsLoadingCommunities(false);
        }).catch(() => {
          if (isMounted) setIsLoadingCommunities(false);
        });
      } catch (error) {
        console.error('Failed to fetch profile', error);
        if (isMounted) {
          setIsLoading(false);
          setIsLoadingCommunities(false);
        }
      }
    };

    void fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [hasHydrated, user?.id]);

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(translate("imageTooLarge"));
      return;
    }

    try {
      setIsUploading(true);
      const res = await uploadApi.uploadImage(file);
      setEvidenceUrl(res.url);
      toast.success(translate("evidenceUploadSuccess"));
    } catch (error) {
      console.error(error);
      toast.error(translate("evidenceUploadFailed"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitTicket = async () => {
    if (!phone.trim()) {
      toast.error(translate("phoneRequired"));
      return;
    }
    if (!evidenceUrl) {
      toast.error(translate("evidenceRequired"));
      return;
    }

    try {
      setIsSubmittingTicket(true);
      await api.post('/admin/verification-tickets', {
        evidenceUrls: [evidenceUrl],
        contactPhone: phone.trim()
      });
      toast.success(translate("verificationSubmitted"));
      setIsModalOpen(false);
      setPhone('');
      setEvidenceUrl('');

      const res = await api.get<ApiResponse<VerificationTicket[]>>('/admin/verification-tickets/my');
      setTickets(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error(translate("verificationSubmitFailed"));
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const displayUser = profileData || user;
  const loadedProfileUserId = profileData?.id;

  const [userRankings, setUserRankings] = useState<{ publicRanks: PlayerRanking[]; communityRanks: PlayerRanking[] } | null>(null);
  const [eloHistory, setEloHistory] = useState<EloHistoryLog[]>([]);
  const [followedTournaments, setFollowedTournaments] = useState<Tournament[]>([]);
  const [achievements, setAchievements] = useState<AchievementCard[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const [matchesPage, setMatchesPage] = useState(1);
  const [matchesTotalPages, setMatchesTotalPages] = useState(1);
  const matchesCursorByPageRef = useRef<Record<number, string | null>>({ 1: null });
  const matchesCursorUserRef = useRef<string | null>(null);
  const eligiblePublicRanks = (userRankings?.publicRanks || [])
    .filter(isPublicRankingEligible);
  const latestEloHistory = [...eloHistory]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0] || null;
  const featuredRank = eligiblePublicRanks
    .sort((a, b) => b.eloPoints - a.eloPoints)[0] || null;
  const featuredElo = featuredRank?.eloPoints ?? latestEloHistory?.newElo ?? null;

  useEffect(() => {
        if (!loadedProfileUserId) return;

    if (matchesCursorUserRef.current !== loadedProfileUserId) {
      matchesCursorUserRef.current = loadedProfileUserId;

      matchesCursorByPageRef.current = { 1: null };
    }

    let isMounted = true;
    const fetchTabData = async () => {
      try {
        setIsLoadingTab(true);
        const [ranksRes, historyRes, followedRes, matchesRes] = await Promise.all([
                    rankingsApi.getUserRankings(loadedProfileUserId),
          rankingsApi.getUserEloHistory(loadedProfileUserId),
          tournamentsApi.getFollowedTournaments(),
          matchesApi.getMatches({
            userId: loadedProfileUserId,

            limit: 10,
            ...(matchesCursorByPageRef.current[matchesPage]
              ? { cursor: matchesCursorByPageRef.current[matchesPage] }
              : {}),
          })
        ]);

        if (isMounted) {
          setUserRankings(ranksRes);
          setEloHistory(historyRes?.data || []);
          setFollowedTournaments(sortFollowedTournaments(followedRes?.data || []));

          if (matchesRes?.data) {
            const visibleMatches = matchesRes.data.filter((match) =>
              isRenderableProfileMatch(match, loadedProfileUserId),
            );
            setMatches(visibleMatches);
            setMatchesTotalPages(matchesRes.meta?.totalPages || 1);
            matchesCursorByPageRef.current[matchesPage + 1] = matchesRes.meta?.nextCursor ?? null;
          } else {
            setMatches([]);
            setMatchesTotalPages(1);
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile tab data', err);
      } finally {
        if (isMounted) {
          setIsLoadingTab(false);
        }
      }
    };

    fetchTabData();

    return () => {
      isMounted = false;
    };
  }, [loadedProfileUserId, matchesPage]);

  useEffect(() => {
    let isMounted = true;
    const fetchAchievements = async () => {
            if (!loadedProfileUserId || participatingTournaments.length === 0) {

        if (isMounted) setAchievements([]);
        return;
      }

      try {
        const completedRankedTournaments = participatingTournaments.filter(
          (tournament) => tournament.isRanked && isTournamentCompleted(tournament.status),
        );

        const bracketResults = await Promise.all(
          completedRankedTournaments.map(async (tournament) => {
            try {
              const response = await tournamentsApi.getTournamentBracket(tournament.id);
                            return deriveTournamentPlacement(tournament, response.data.stages || [], loadedProfileUserId, achievementLabels);

            } catch (error) {
              console.error('Failed to load bracket for achievement', tournament.id, error);
              return null;
            }
          }),
        );

        if (isMounted) {
          setAchievements(
            bracketResults
              .filter((item): item is AchievementCard => Boolean(item))
              .sort((a, b) => {
                if (a.rank !== b.rank) return a.rank - b.rank;
                return (b.completedAt || '').localeCompare(a.completedAt || '');
              }),
          );
        }
      } catch (error) {
        console.error('Failed to fetch achievements', error);
        if (isMounted) setAchievements([]);
      }
    };

    fetchAchievements();

    return () => {
      isMounted = false;
    };
  }, [loadedProfileUserId, participatingTournaments]);

  // Aggregate stats across ranks or fallback to featured rank
  const totalMatchesPlayed = userRankings?.publicRanks?.reduce((sum, r) => sum + (r.matchesPlayed || 0), 0) || featuredRank?.matchesPlayed || (matches.length > 0 ? matches.length : (latestEloHistory ? 1 : 0));
  const totalMatchesWon = userRankings?.publicRanks?.reduce((sum, r) => sum + (r.matchesWon || 0), 0) || featuredRank?.matchesWon || matches.filter(m => m.status === 'COMPLETED' && m.winnerId && ((m.winnerId === m.participant1Id && m.participant1?.members?.some(mem => mem.userId === loadedProfileUserId)) || (m.winnerId === m.participant2Id && m.participant2?.members?.some(mem => mem.userId === loadedProfileUserId)))).length;
  const overallWinRate = totalMatchesPlayed > 0 ? Math.round((totalMatchesWon / totalMatchesPlayed) * 100) : 0;

  // Frequent opponents extracted from actual user matches
  const frequentOpponents = (() => {
    if (!loadedProfileUserId || matches.length === 0) return [];
    const oppMap = new Map<string, { id: string; name: string; avatarUrl?: string | null; elo: number; matchCount: number }>();
    matches.forEach(m => {
      const isP1 = hasUserInParticipant(m.participant1, loadedProfileUserId);
      const isP2 = hasUserInParticipant(m.participant2, loadedProfileUserId);
      const opp = isP1 ? m.participant2 : isP2 ? m.participant1 : null;
      if (opp && !isMockParticipant(opp) && !isPlaceholderParticipant(opp)) {
        const oppName = opp.teamName?.trim() || 'Vận động viên';
        const oppId = opp.id || oppName;
        const existing = oppMap.get(oppId);
        if (existing) {
          existing.matchCount += 1;
        } else {
          oppMap.set(oppId, {
            id: oppId,
            name: oppName,
            avatarUrl: opp.members?.[0]?.avatarUrl || null,
            elo: 1450 + (oppName.length * 17) % 150,
            matchCount: 1,
          });
        }
      }
    });
    return Array.from(oppMap.values()).sort((a, b) => b.matchCount - a.matchCount).slice(0, 3);
  })();

  const handleCopyProfileLink = () => {
    if (typeof window !== 'undefined') {
      void navigator.clipboard.writeText(window.location.href);
      toast.success(translate("profileLinkCopied"));
    }
  };

  const isOwner = Boolean(user?.id && (!loadedProfileUserId || loadedProfileUserId === user.id));

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-5 md:px-8 py-6 flex flex-col gap-6">

      {/* ─── Cover Banner (Độc lập ở trên cùng) ─── */}
      <div className="relative h-60 sm:h-72 md:h-80 bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800 shadow-md select-none">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={coverInputRef}
          onChange={handleCoverChange}
        />

        {/* Background cover image or gradient */}
        {displayUser?.coverUrl ? (
          <img
            src={displayUser.coverUrl}
            alt="Cover"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0a192f] to-[#0f2d59] overflow-hidden">
            <div className="absolute -top-24 -left-20 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 left-1/3 w-72 h-72 bg-sky-400/15 rounded-full blur-2xl pointer-events-none" />
            <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
              <defs>
                <pattern id="sporto-court-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1" />
                  <circle cx="30" cy="30" r="1.5" fill="rgba(56, 189, 248, 0.6)" />
                </pattern>
                <linearGradient id="sporto-court-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#sporto-court-grid)" />
              <circle cx="85%" cy="30%" r="140" fill="none" stroke="url(#sporto-court-grad)" strokeWidth="2" strokeDasharray="6 6" />
              <circle cx="85%" cy="30%" r="200" fill="none" stroke="url(#sporto-court-grad)" strokeWidth="1.5" opacity="0.6" />
              <path d="M -50 280 L 400 -100" stroke="url(#sporto-court-grad)" strokeWidth="1.5" strokeDasharray="8 8" />
            </svg>
          </div>
        )}

        {/* Vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

        {/* Action buttons on top-right of banner */}
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10 flex gap-2">
          {isOwner ? (
            <>
              <Link href="/profile/edit">
                <Button
                  type="button"
                  className="bg-black/40 hover:bg-black/60 text-white border border-white/20 font-bold text-xs h-8 sm:h-9 px-3 rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur-md transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-300" />
                  <span>{translate("editProfile")}</span>
                </Button>
              </Link>
              <button
                type="button"
                onClick={handleCopyProfileLink}
                className="bg-black/40 hover:bg-black/60 text-white px-2.5 sm:px-3 h-8 sm:h-9 rounded-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md border border-white/20 shadow-lg active:scale-95 cursor-pointer transition-all duration-200"
                title={translate("shareProfile")}
              >
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">{translate("shareProfile")}</span>
              </button>
              <button
                type="button"
                onClick={handleCoverClick}
                disabled={isUploadingCover}
                className="bg-black/40 hover:bg-black/60 text-white px-2.5 sm:px-3 h-8 sm:h-9 rounded-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md border border-white/20 shadow-lg active:scale-95 cursor-pointer transition-all duration-200"
                title={translate("editCover")}
              >
                {isUploadingCover ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span className="hidden md:inline">{translate("editCover")}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCopyProfileLink}
                className="bg-black/40 hover:bg-black/60 text-white px-2.5 sm:px-3 h-8 sm:h-9 rounded-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md border border-white/20 shadow-lg active:scale-95 cursor-pointer transition-all duration-200"
                title={translate("shareProfile")}
              >
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">{translate("shareProfile")}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Warning banner for missing gender */}
      {!isLoading && displayUser && !displayUser.gender && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-bold text-amber-900 text-sm">{translate("genderMissing")}</h4>
              <p className="text-amber-700 text-xs mt-0.5">{translate("genderPrompt")}</p>
            </div>
          </div>
          <Link href="/profile/edit">
            <Button size="sm" variant="warning" className="font-bold text-xs">
              {translate("updateNow")}
            </Button>
          </Link>
        </div>
      )}

      {/* Main 2-Column Bento Grid - Layout chuẩn Figma với Left Card thụt vô trong so với mép banner */}
      <div className="min-h-[400px] relative z-20 px-2 sm:px-6 md:px-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* LEFT COLUMN: Identity Profile Card & Personal Attributes (thụt vô trong lề banner) */}
          <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-5 -mt-24 sm:-mt-28 md:-mt-32">
            {/* Primary Athlete Card (Left Card with Avatar, Name, Badges & Actions - Bỏ khối ELO theo Figma) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 flex flex-col items-center text-center relative overflow-hidden">
              {/* Avatar with Ring & Online Status */}
              <div className="relative mt-2 mb-3">
                <RankAvatar
                  src={displayUser?.avatarUrl}
                  name={displayUser?.fullName}
                  elo={featuredRank?.eloPoints ?? latestEloHistory?.newElo ?? undefined}
                  tierName={featuredRank?.tierName || featuredRank?.tier?.name || undefined}
                  categoryName={featuredRank?.categoryName || (latestEloHistory ? categories.find(c => c.id === latestEloHistory.categoryId)?.name : undefined)}
                  matchesPlayed={featuredRank?.matchesPlayed || (latestEloHistory ? 1 : 0)}
                  size="lg"
                  className="!h-24 !w-24 border-4 border-white shadow-lg transition-transform duration-300 hover:scale-[1.02]"
                  ringClassName="ring-2 ring-slate-100"
                />
                <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-white" title={translate("onlineNow")}>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </span>
              </div>

              {/* Athlete Name & Badges */}
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center justify-center gap-1.5 tracking-tight">
                {isLoading ? (
                  <span className="w-32 h-6 bg-slate-200 animate-pulse rounded-lg inline-block"></span>
                ) : (
                  displayUser?.fullName || translate("anonymousUser")
                )}
                {displayUser?.roles?.includes('ADMIN') && (
                  <span title={translate("systemAdmin")} className="bg-blue-50 p-1 rounded-full border border-blue-200 inline-flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  </span>
                )}
                {displayUser?.isVerified && (
                  <span title={translate("verified")} className="bg-blue-500 p-0.5 rounded-full text-white inline-flex items-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </h1>

              {/* Email & Location */}
              <div className="mt-1 space-y-0.5 text-xs text-slate-500 font-medium">
                <p className="truncate max-w-[220px] text-slate-400">{displayUser?.email}</p>
                {displayUser?.createdAt && (
                  <p className="flex items-center justify-center gap-1 text-slate-400 text-[11px] pt-0.5">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{translate("memberSince")} {formatDate(displayUser.createdAt, 'MM/yyyy')}</span>
                  </p>
                )}
              </div>

              {/* Role Tags */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                {Array.from(new Set(displayUser?.roles || (displayUser?.role ? [displayUser.role] : []) || user?.roles || [])).map((role: string) => {
                  let roleLabel = role;
                  let roleColor = 'bg-blue-50 text-blue-700 border-blue-200';
                  if (role === 'PLAYER') {
                    roleLabel = translate("rolePlayer");
                    roleColor = 'bg-blue-50 text-blue-700 border-blue-200';
                  } else if (role === 'ORGANIZER') {
                    roleLabel = translate("roleOrganizer");
                    roleColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                  } else if (role === 'ADMIN') {
                    roleLabel = translate("roleModerator");
                    roleColor = 'bg-purple-50 text-purple-700 border-purple-200';
                  }
                  return (
                    <span key={role} className={`px-2 py-0.5 text-[10px] font-bold rounded-md border uppercase tracking-wider ${roleColor}`}>
                      {roleLabel}
                    </span>
                  );
                })}
              </div>

              {/* Action Buttons in Left Profile Card */}
              <div className="w-full flex flex-col gap-2 mt-5">
                {isOwner ? (
                  <>
                    <Link href="/tournaments" className="w-full">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-xs h-9 px-4 text-xs cursor-pointer">
                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                        {translate("quickChallenge")}
                      </Button>
                    </Link>
                    <Link href="/profile/edit" className="w-full">
                      <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-all shadow-xs h-9 px-4 text-xs cursor-pointer">
                        <Edit3 className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> {translate("editProfile")}
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href={`/tournaments?challengeUser=${loadedProfileUserId || ''}`} className="w-full">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-xs h-9 px-4 text-xs cursor-pointer">
                        <Swords className="w-3.5 h-3.5 mr-1.5" />
                        {translate("quickChallenge")}
                      </Button>
                    </Link>
                    <button
                      type="button"
                      onClick={handleCopyProfileLink}
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-slate-500" />
                      {translate("shareProfile")}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Giới thiệu bản thân (Bio) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">{translate("about")}</h3>
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 animate-pulse rounded w-full"></div>
                  <div className="h-4 bg-slate-200 animate-pulse rounded w-3/4"></div>
                </div>
              ) : profileData?.bio ? (
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  {profileData.bio}
                </p>
              ) : (
                <p className="text-slate-400 text-xs italic">
                  {translate("bioMissing")}
                </p>
              )}
            </div>

              {/* Bộ môn & Kỹ năng sở trường */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{translate("sportsAndSkills")}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    Pickleball
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Cầu lông (Badminton)
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-750 border border-slate-200">
                    Đánh đôi nam / nữ
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-750 border border-slate-200">
                    Dink kỹ thuật
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-750 border border-slate-200">
                    Phản xạ lưới nhanh
                  </span>
                </div>
              </div>

              {/* Thông tin chi tiết */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">{translate("details")}</h3>
                {isLoading ? (
                  <div className="space-y-4">
                    <div className="h-4 bg-slate-200 animate-pulse rounded w-full"></div>
                    <div className="h-4 bg-slate-200 animate-pulse rounded w-3/4"></div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 text-sm">
                    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                      <span className="text-slate-500 font-medium">{translate("dateOfBirth")}</span>
                      <span className="text-slate-900 font-semibold">
                        {profileData?.dateOfBirth
                          ? `${new Date(profileData.dateOfBirth).getDate().toString().padStart(2, '0')}/${(new Date(profileData.dateOfBirth).getMonth() + 1).toString().padStart(2, '0')}/${new Date(profileData.dateOfBirth).getFullYear()}`
                          : translate("notUpdated")}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                      <span className="text-slate-500 font-medium">{translate("gender")}</span>
                      <span className="text-slate-900 font-semibold">
                        {(() => {
                          const gender = normalizeProfileGender(profileData?.gender);
                          if (gender === 'MALE') return translate('male');
                          if (gender === 'FEMALE') return translate('female');
                          if (gender === 'OTHER') return translate('other');
                          return profileData?.gender || translate('notUpdated');
                        })()}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                      <span className="text-slate-500 font-medium">{translate("addressLabel")}</span>
                      <span className="text-slate-900 font-semibold">{profileData?.address || translate("notUpdated")}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500 font-medium">{translate("contactEmailLabel")}</span>
                      <span className="text-slate-900 font-semibold">{profileData?.email || translate("notUpdated")}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tài khoản hoàn tiền - Chỉ hiển thị với chính chủ */}
              {isOwner && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{translate("bankWallet")}</h3>
                    <Link href="/profile/edit" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
                      {translate("editProfile")}
                    </Link>
                  </div>
                  {isLoading ? (
                    <div className="space-y-3">
                      <div className="h-4 bg-slate-200 animate-pulse rounded w-full"></div>
                      <div className="h-4 bg-slate-200 animate-pulse rounded w-3/4"></div>
                    </div>
                  ) : profileData?.bankName ? (
                    <div className="flex flex-col gap-3 text-sm">
                      <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
                        <span className="text-slate-500 font-medium">{translate("bankWallet")}</span>
                        <span className="text-slate-900 font-semibold">{profileData.bankName}</span>
                      </div>
                      <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
                        <span className="text-slate-500 font-medium">{translate("accountOrWalletNumber")}</span>
                        <span className="text-slate-900 font-bold text-blue-650">{profileData.bankAccountNumber}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500 font-medium">{translate("accountHolder")}</span>
                        <span className="text-slate-900 font-semibold uppercase">{profileData.bankAccountName}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      <p className="text-slate-400 text-xs italic">{translate("refundAccountMissing")}</p>
                      <Link href="/profile/edit">
                        <Button size="sm" className="mt-2.5 text-xs font-bold px-3 py-1.5 h-auto">
                          {translate("configureNow")}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* {translate("requestOrganizerRole")} (Organizer) - Chỉ hiển thị với chính chủ */}
              {isOwner && !isLoading && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{translate("roleOrganizer")}</h3>
                  {(profileData?.roles || user?.roles || []).includes('ORGANIZER') ||
                   (profileData?.roles || user?.roles || []).includes('ADMIN') ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs font-semibold text-slate-700 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-950">
                        <ShieldCheck className="w-5 h-5 text-blue-600" />
                        {translate("organizerVerifiedLabel")}
                      </div>
                      <p className="text-emerald-700 leading-relaxed">
                        {translate("organizerApprovedDescription")}
                      </p>
                    </div>
                  ) : tickets.length > 0 && tickets[0].status === 'PENDING' ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs font-semibold text-slate-700 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-sm text-amber-900">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          {translate("organizerPendingLabel")}
                        </div>
                        <p className="text-amber-700 leading-relaxed">
                          {translate("organizerPendingDescription")}
                        </p>
                        <div className="pt-2 border-t border-amber-100/50 text-[10px] text-blue-600">
                          {translate("contactPhoneDisplay")}: {tickets[0].contactPhone}
                        </div>
                    </div>
                  ) : tickets.length > 0 && tickets[0].status === 'REJECTED' ? (
                    <div className="space-y-4">
                      <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 text-xs font-semibold text-rose-800 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-sm text-rose-900">
                          <X className="w-4 h-4 text-rose-600" />
                          {translate("organizerRejectedLabel")}
                        </div>
                        <p className="text-rose-700 leading-relaxed">
                          {translate("reasonLabel")}: <span className="font-bold text-rose-900">{tickets[0].rejectReason || translate("noDetailedReason")}</span>
                        </p>
                      </div>
                      <Button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full font-bold"
                      >
                        {translate("resubmitRequest")}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                        {translate("organizerInfoDescription")}
                      </p>
                      <Button
                        onClick={() => setIsModalOpen(true)}
                        variant="success"
                        className="w-full font-bold"
                      >
                        {translate("requestOrganizerRole")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 w-full space-y-5">
              {/* Navigation Tabs Bar: Underline Style, Không đè lên banner */}
              <div className="bg-white rounded-xl border border-slate-200 px-3 sm:px-6 flex items-center overflow-x-auto no-scrollbar shadow-2xs">
                <div className="flex gap-4 sm:gap-8">
                  {([
                    { id: 'overview', label: translate("overview") },
                    { id: 'tournaments', label: translate("following") },
                    { id: 'achievements', label: translate("achievements") },
                    { id: 'matches', label: translate("matches") },
                    { id: 'elo', label: translate("eloStats") }
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "py-3 text-xs sm:text-sm font-bold border-b-2 -mb-px transition-all cursor-pointer whitespace-nowrap",
                        activeTab === tab.id
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === 'overview' && (
                <>
                  {/* Lịch sẵn sàng thi đấu & giao lưu */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                          {translate("upcomingMatchesTitle")}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('tournaments')}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {translate("viewAllSchedule")}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {participatingTournaments.length > 0 ? (
                      <div className="space-y-2.5">
                        {participatingTournaments.slice(0, 3).map((tourney) => (
                          <Link
                            key={tourney.id}
                            href={`/tournaments/${tourney.id}`}
                            className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 font-black text-xs flex flex-col items-center justify-center shrink-0 border border-blue-100">
                                <span className="text-[10px] uppercase font-bold text-blue-500">Thg</span>
                                <span className="text-sm leading-none">{new Date(tourney.startDate || Date.now()).getMonth() + 1}</span>
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                  {tourney.name}
                                </h4>
                                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                  {getTournamentLocationLabel(tourney) || 'Sân thể thao Sporto'}
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-800 transition-colors">
                              {tourney.status || 'UPCOMING'}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                        <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-semibold">Chưa có lịch thi đấu giải sắp tới.</p>
                        <Link href="/tournaments" className="inline-block mt-2">
                          <Button size="sm" variant="outline" className="text-xs font-bold h-8">
                            Khám phá giải đấu ngay
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Đồng đội & Đối thủ thường xuyên */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                            {translate("frequentOpponentsTitle")}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{translate("frequentOpponentsSub")}</p>
                      </div>
                      {frequentOpponents.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('matches')}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {translate("viewAllOpponents")}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {frequentOpponents.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {frequentOpponents.map((opp) => (
                          <div
                            key={opp.id}
                            className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center gap-3"
                          >
                            <Avatar className="w-10 h-10 rounded-full border border-slate-200 shrink-0">
                              <AvatarImage src={opp.avatarUrl || undefined} alt={opp.name} />
                              <AvatarFallback className="text-xs font-bold bg-blue-100 text-blue-700">
                                {opp.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-slate-900 truncate">{opp.name}</h4>
                              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                                {opp.matchCount} {translate("matchesWithUser")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-semibold">Chưa ghi nhận đối thủ thường xuyên qua các trận đấu gần đây.</p>
                      </div>
                    )}
                  </div>

                  {/* Câu lạc bộ của tôi */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{translate("myClubs")}</h3>
                  <Link href="/communities/create">
                    <Button variant="success" size="sm" className="rounded-lg px-4 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {translate("createClub")}
                    </Button>
                  </Link>
                </div>

                {isLoading || isLoadingCommunities ? (
                  <div className="animate-pulse flex gap-4">
                    <div className="w-16 h-16 bg-slate-200 rounded-full"></div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ) : createdCommunities.length > 0 || joinedCommunities.length > 0 ? (
                  <div className="space-y-6">
                    {createdCommunities.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">{translate("clubsManagedLabel")}</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {createdCommunities.map(community => {
                            const isOwner = community.creatorId === displayUser?.id || community.myRole === 'OWNER';
                            const isPending = community.status === 'PENDING';
                            const isRejected = community.status === 'REJECTED';
                            const roleBadgeLabel = isOwner ? translate("clubOwner") : community.myRole === 'MODERATOR' ? translate("clubModerator") : translate("clubMember");
                            const roleBadgeStyle = isOwner ? 'bg-blue-50 text-blue-700 border-blue-200' : community.myRole === 'MODERATOR' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200';

                            return (
                              <div key={community.id} className="flex items-center gap-4 p-4 rounded-lg border border-slate-100 hover:border-blue-500 hover:shadow-md transition-all group bg-slate-50">
                                <Link href={`/communities/${community.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                                  {Boolean(community.logoUrl?.trim()) && (
                                    <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-200 relative shrink-0 bg-white flex items-center justify-center">
                                      <Image
                                        src={community.logoUrl!}
                                        alt={community.name}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-grow">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{community.name}</h4>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${roleBadgeStyle}`}>
                                        {roleBadgeLabel}
                                      </span>
                                      <p className={`text-xs flex items-center gap-1 ${isRejected ? 'text-rose-700' : isPending ? 'text-amber-700' : 'text-emerald-600'}`}>
                                        <span className={`w-2 h-2 rounded-full inline-block ${isRejected ? 'bg-rose-500' : isPending ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                        {isRejected ? translate("clubRejected") : isPending ? translate("clubPending") : translate("clubActive")}
                                      </p>
                                    </div>
                                    {isRejected && community.rejectedReason && (
                                      <p className="mt-1 line-clamp-2 text-xs text-rose-700">{community.rejectedReason}</p>
                                    )}
                                  </div>
                                </Link>
                                {isOwner && isRejected && (
                                  <Link
                                    href={`/communities/create?resubmitId=${community.id}`}
                                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                  >
                                    {translate("clubResubmit")}
                                  </Link>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {joinedCommunities.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">{translate("clubsJoinedLabel")}</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {joinedCommunities.map(community => {
                            const isOwner = community.creatorId === displayUser?.id || community.myRole === 'OWNER';
                            const roleBadgeLabel = isOwner ? translate("clubOwner") : community.myRole === 'MODERATOR' ? translate("clubModerator") : translate("clubMember");
                            const roleBadgeStyle = isOwner ? 'bg-blue-50 text-blue-700 border-blue-200' : community.myRole === 'MODERATOR' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                            return (
                              <Link href={`/communities/${community.id}`} key={community.id}>
                                <div className="flex items-center gap-4 p-4 rounded-lg border border-slate-100 hover:border-emerald-500 hover:shadow-md transition-all group bg-slate-50 cursor-pointer">
                                  {Boolean(community.logoUrl?.trim()) && (
                                    <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-200 relative shrink-0 bg-white flex items-center justify-center">
                                      <Image
                                        src={community.logoUrl!}
                                        alt={community.name}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-grow">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{community.name}</h4>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${roleBadgeStyle}`}>
                                        {roleBadgeLabel}
                                      </span>
                                      <p className={`text-xs flex items-center gap-1 ${community.status === 'ACTIVE' ? 'text-emerald-600' : 'text-amber-700'}`}>
                                        <span className={`w-2 h-2 rounded-full inline-block ${community.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                        {community.status === 'ACTIVE' ? translate("clubActive") : translate("clubInactive")}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-lg">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">{translate("clubsEmptyTitle")}</p>
                    <p className="text-slate-400 text-sm mt-1 mb-4">{translate("clubsEmptyDescription")}</p>
                    <Link href="/communities">
                      <Button variant="outline">
                        {translate("exploreClubs")}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center py-12 border-dashed">
                <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium text-lg">{translate("activityEmpty")}</p>
                <p className="text-slate-400 text-sm mt-1">{translate("activityHint")}</p>
              </div>
            </>
          )}

        {activeTab === 'tournaments' && (
          <div className="space-y-6">
            {isLoadingTab ? (
              <div className="flex justify-center items-center py-12 bg-white rounded-lg border border-slate-200">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : followedTournaments.length > 0 ? (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 border border-slate-200">{translate("statusEnded")}</span>
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 border border-rose-100 text-rose-700">{translate("statusInProgress")}</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 border border-emerald-100 text-emerald-700">{translate("statusRegistrationOpen")}</span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 border border-blue-100 text-blue-700">{translate("statusUpcoming")}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {followedTournaments.map((tournament) => (
                  (() => {
                      const statusLabel = getTournamentStatusLabel(tournament.status, {
                        DRAFT: translate("statusDraft"),
                        PENDING_APPROVAL: translate("statusPendingApproval"),
                        PENDING_DELETE: translate("statusPendingDelete"),
                        UPCOMING: translate("statusUpcoming"),
                        REGISTRATION_OPEN: translate("statusRegistrationOpen"),
                        REGISTRATION_CLOSED: translate("statusRegistrationClosed"),
                        IN_PROGRESS: translate("statusInProgress"),
                        ONGOING: translate("statusInProgress"),
                        COMPLETED: translate("statusEnded"),
                        CANCELLED: translate("statusCancelled"),
                      });
                      const statusClassName = getTournamentStatusClassName(tournament.status);
                      const isEnded = isTournamentCompleted(tournament.status);
                    const isLive = isTournamentInProgress(tournament.status);
                    const isUpcoming = isTournamentUpcoming(tournament.status);
                    const isOpen = isTournamentOpenForRegistration(tournament.status);
                    const isCancelled = isTournamentCancelled(tournament.status);
                    const coverImage = tournament.logoUrl || tournament.bannerUrl || null;
                    const formattedStartDate = tournament.startDate ? formatDate(tournament.startDate, 'dd/MM/yyyy') : null;
                    const formattedEndDate = tournament.endDate ? formatDate(tournament.endDate, 'dd/MM/yyyy') : null;
                      const statusHint = isEnded
                        ? (formattedEndDate ? translate("endedOn", { date: formattedEndDate }) : translate("statusEndedHint"))
                        : isLive
                          ? translate("statusInProgress")
                          : isOpen
                            ? translate("statusRegistrationOpen")
                            : isUpcoming
                              ? translate("statusUpcoming")
                              : isCancelled
                                ? translate("statusCancelled")
                                : translate("statusFollowing");

                    return (
                      <Link
                        key={tournament.id}
                        href={`/tournaments/${tournament.id}`}
                        className="bg-white rounded-lg border border-slate-200 shadow-sm hover:border-slate-350 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer"
                      >
                        {/* Top: Large Image Banner */}
                        <div className="relative aspect-[2.1/1] w-full bg-slate-100 overflow-hidden">
                          {coverImage ? (
                            <img
                              src={coverImage}
                              alt={tournament.name}
                              className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-103 ${isEnded ? 'grayscale opacity-60' : ''}`}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-650 to-blue-800 opacity-90 group-hover:scale-103 transition-transform duration-500 flex items-center justify-center">
                              <img
                                src={BRAND.assets.logoIcon}
                                alt={`${BRAND.name} Logo`}
                                className="w-20 h-auto object-contain opacity-75"
                              />
                            </div>
                          )}

                          {/* Status Overlay (Top-Left) */}
                          <div className="absolute top-3 left-3 z-10">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border ${statusClassName}`}>
                              {isOpen && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              )}
                              {isUpcoming && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              )}
                              {isLive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              )}
                              {isEnded && (
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              )}
                              {statusLabel}
                            </span>
                          </div>

                          {/* Bookmark Button (Top-Right) */}
                          <button className="absolute top-3 right-3 p-1.5 bg-white/90 rounded-full text-blue-500 hover:text-blue-600 transition-colors shadow-sm z-10 cursor-pointer">
                            <Bookmark className="w-4 h-4 fill-amber-500" />
                          </button>

                          {/* Location Overlay (Bottom-Left) */}
                          <div className="absolute bottom-3 left-3 z-10">
                            <span className="bg-white/95 text-slate-800 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border border-slate-200 flex items-center gap-1">
                              {getTournamentLocationLabel(tournament) || translate("notUpdated")}
                            </span>
                          </div>
                        </div>

                        {/* Bottom: Details Section */}
                        <div className="p-4 flex gap-4 flex-grow">
                          {/* Left Column: Date Block */}
                          <div className="flex flex-col items-center shrink-0 border-r border-slate-100 pr-4">
                            <div className="flex items-baseline gap-0.5 text-xl font-bold text-slate-900 leading-none">
                              <span>{tournament.startDate ? new Date(tournament.startDate).getDate().toString().padStart(2, '0') : '--'}</span>
                              <span className="text-slate-300 font-normal text-sm">-</span>
                              <span>{tournament.endDate ? new Date(tournament.endDate).getDate().toString().padStart(2, '0') : '--'}</span>
                            </div>
                            <div className="flex gap-3 mt-1 text-[9px] font-bold text-slate-400">
                              <span>{tournament.startDate ? (new Date(tournament.startDate).getMonth() + 1).toString().padStart(2, '0') : '--'}</span>
                              <span>{tournament.endDate ? (new Date(tournament.endDate).getMonth() + 1).toString().padStart(2, '0') : '--'}</span>
                            </div>
                          </div>

                          {/* Right Column: Name & Category Block */}
                          <div className="flex flex-col justify-between flex-grow min-w-0">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold uppercase tracking-wider mb-1">
                                <span className="text-slate-500">{tournament.category?.name?.toUpperCase() || 'MULTISPORT'}</span>
                                <span className="text-slate-300">•</span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                  tournament.isRanked
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-50 text-slate-600 border border-slate-200'
                                }`}>
                                  {tournament.isRanked ? translate("rankedElo") : translate("recreational")}
                                </span>
                              </div>

                              <p className="text-[10px] text-slate-500 font-medium leading-relaxed line-clamp-2 mt-2">
                                {statusHint}
                                {formattedStartDate && formattedEndDate && !isEnded ? ` • ${formattedStartDate} → ${formattedEndDate}` : ''}
                              </p>

                              <h3 className="text-sm font-bold text-slate-900 uppercase leading-snug line-clamp-2">
                                {tournament.name}
                              </h3>
                            </div>

                            {/* Metadata summary */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-500 font-bold mt-2 uppercase tracking-wider">
                              <span className="text-blue-600 font-bold">
                                {tournament.entryFee ? formatCurrency(tournament.entryFee) : translate("free")}
                              </span>
                              {tournament.divisions && tournament.divisions.length > 0 ? (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <div className="flex flex-wrap gap-1">
                                    {tournament.divisions.map((div) => {
                                      const label = getFormatLabel(div.matchType, div.genderRestriction);
                                      return (
                                        <span key={div.id} className="bg-slate-100 px-1 py-0.5 rounded text-slate-650 text-[8px] border border-slate-200 font-bold">
                                          {label} ({div._count?.participants || 0}/{div.maxParticipants || '-'})
                                        </span>
                                      );
                                    })}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="bg-slate-100 px-1 py-0.5 rounded text-slate-650 text-[8px] border border-slate-200 font-bold">
                                    {getFormatLabel(tournament.matchType, tournament.genderRestriction)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })()
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg border border-slate-200 border-dashed">
                <Bookmark className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">{translate("followedTournamentsEmptyTitle")}</h3>
                <p className="text-slate-500 max-w-sm mx-auto text-sm">
                  {translate("followedTournamentsEmpty")}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{translate("achievementsTitle")}</h3>
              </div>
              {achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((item) => (
                    <div
                      key={`${item.tournamentId}-${item.rank}`}
                      className={`rounded-lg border p-4 shadow-sm ${item.colorClass} ${item.borderClass}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${item.textClass} ${item.borderClass} bg-white`}>
                              {item.label}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              {translate("publicEloTournament")}
                            </span>
                          </div>
                          <h4 className="mt-2 text-base font-bold text-slate-900 line-clamp-1">{item.tournamentName}</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {item.tournamentDate ? formatDate(item.tournamentDate, 'dd/MM/yyyy') : translate("noEndDate")}
                          </p>
                        </div>
                        <div className={`shrink-0 w-12 h-12 rounded-lg border flex items-center justify-center font-bold ${item.textClass} ${item.borderClass} bg-white`}>
                          {item.rank}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-lg">
                  <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-semibold">{translate("achievementsEmptyTitle")}</p>
                  <p className="text-slate-400 text-sm mt-1">{translate("achievementsEmptyDescription")}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-6">
            {isLoadingTab ? (
              <div className="flex justify-center items-center py-12 bg-white rounded-lg border border-slate-200">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : matches.length > 0 ? (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {matches.map((match) => {
                  const isCompleted = match.status === 'COMPLETED';
                  const profileUserId = displayUser?.id;
                  const isP1 = Boolean(profileUserId && match.participant1?.members?.some((member) => member.userId === profileUserId));
                  const isP2 = Boolean(profileUserId && match.participant2?.members?.some((member) => member.userId === profileUserId));

                  const isWinner = isCompleted && Boolean(match.winnerId) && (
                    (match.winnerId === match.participant1Id && isP1) ||
                    (match.winnerId === match.participant2Id && isP2)
                  );

                  const opponentName = isP1
                    ? match.participant2?.teamName || translate("opponentUnknown")
                    : isP2
                      ? match.participant1?.teamName || translate("opponentUnknown")
                      : translate("opponentUnknown");

                  return (
                    <div
                      key={match.id}
                      className="bg-white border border-slate-200 hover:border-slate-350 rounded-lg p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-450">
                          <span>{match.tournament?.name || translate("tournamentFallback")}</span>
                          <span>•</span>
                          <span>{translate("round", { number: match.roundNumber })}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span className="text-slate-400">{translate("opponent")}:</span>
                          <span className="text-blue-650 font-bold">{opponentName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 text-sm font-bold text-slate-705 tabular-nums">
                          {buildMatchScoreSummary({
                            p1SetsWon: match.p1SetsWon,
                            p2SetsWon: match.p2SetsWon,
                            scoreDetails: match.scoreDetails as Record<string, unknown> | null | undefined,
                            tournament: { sportRules: null },
                          })}
                        </div>

                        {isCompleted ? (
                          isWinner ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-emerald-250 uppercase tracking-wide">
                              {translate("win")}
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-rose-250 uppercase tracking-wide">
                              {translate("loss")}
                            </span>
                          )
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-250 uppercase tracking-wide">
                            {translate("matchInProgress")}
                          </span>
                        )}

                        <Link
                          href={`/live/${match.id}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0"
                        >
                          {translate("details")} <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {matchesTotalPages > 1 && (
                  <div className="flex justify-center items-center gap-3 mt-6 pt-4 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={matchesPage <= 1}
                      onClick={() => setMatchesPage(p => Math.max(1, p - 1))}
                      className="border-slate-200 text-slate-650 hover:bg-slate-50"
                    >
                      {translate("previous")}
                    </Button>
                    <span className="text-xs font-bold text-slate-500">{translate("pageOf", { page: matchesPage, total: matchesTotalPages })}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={matchesPage >= matchesTotalPages}
                      onClick={() => setMatchesPage(p => Math.min(matchesTotalPages, p + 1))}
                      className="border-slate-200 text-slate-650 hover:bg-slate-50"
                    >
                      {translate("next")}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg border border-slate-200 border-dashed">
                <Activity className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">{translate("matchesEmptyTitle")}</h3>
                <p className="text-slate-500 max-w-sm mx-auto text-sm">
                  {translate("matchesEmptyDescription")}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'elo' && (
          <div className="space-y-6">
            {isLoadingTab ? (
              <div className="flex justify-center items-center py-12 bg-white rounded-lg border border-slate-200">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{translate("eloRankTitle")}</h3>
                  </div>

                                    {eligiblePublicRanks.length > 0 ? (

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {eligiblePublicRanks.map((rank) => (

                        <div key={rank.id} className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                          <div className="space-y-1.5 flex-1">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-550 border border-slate-200">
                              {rank.categoryName} • {rank.matchType === 'SINGLES' ? translate("singles") : translate("doubles")}
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Award className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                              <h4 className="font-bold text-slate-900 text-base">{rank.eloPoints} ELO</h4>
                              <EloTierBadge
                                elo={rank.eloPoints}
                                tierName={getCanonicalTierName(rank)}
                                categoryName={rank.categoryName}
                                size="sm"
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-center text-xs">
                              <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">{translate("matchesPlayed")}</div>
                                <div className="font-bold text-slate-700 mt-0.5">{rank.matchesPlayed}</div>
                              </div>
                              <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">{translate("wins")}</div>
                                <div className="font-bold text-blue-600 mt-0.5">{rank.matchesWon}</div>
                              </div>
                              <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">{translate("streak")}</div>
                                <div className="font-bold text-blue-600 mt-0.5 flex items-center justify-center gap-0.5">
                                  <Zap className="w-3 h-3 fill-blue-500 text-blue-600" /> {rank.winStreak}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-400 text-sm">
                      {translate("eloEmptyDescription")}
                    </div>
                  )}
                </div>

                {eloHistory.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">{translate("eloHistoryTitle")}</h3>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[...eloHistory].reverse().map((item, index) => {
                            const norm = item.reason?.toUpperCase().trim() || '';
                            let reasonLabel = item.changedPoints > 0 ? translate("win") : translate("loss");
                            if (norm === 'ADMIN_ADD') reasonLabel = translate("adminAdd");
                            else if (norm === 'ADMIN_SUBTRACT') reasonLabel = translate("adminSubtract");
                            else if (norm === 'ADMIN_SET') reasonLabel = translate("adminSet");
                            else if (norm.startsWith('ADMIN_')) reasonLabel = translate("adminEloAdjustment");
                            else if (norm === 'INACTIVITY_DECAY') reasonLabel = translate("eloInactivityDecay");

                            return {
                              name: translate("matchLabel", { number: index + 1 }),
                              'ELO': item.newElo,
                              date: formatDate(item.createdAt, 'dd/MM/yyyy'),
                              reason: reasonLabel,
                              tournament: item.match?.tournamentName || (norm.startsWith('ADMIN_') ? translate("adminEloAdjustment") : translate("tournamentFallback"))
                            };
                          })}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={['dataMin - 50', 'dataMax + 50']} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-900 text-white p-3 rounded-lg border border-slate-800 text-xs shadow-md">
                                    <p className="font-bold">{data.date}</p>
                                    <p className="text-blue-400 mt-1 font-bold">ELO: {data.ELO}</p>
                                    <p className="text-slate-400 mt-0.5">{data.reason}</p>
                                    <p className="text-slate-500 text-[10px] mt-0.5">{data.tournament}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="ELO"
                            stroke="#2563eb"
                            strokeWidth={3}
                            dot={{ r: 4, stroke: '#2563eb', strokeWidth: 2, fill: '#fff' }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">{translate("eloHistorySectionTitle")}</h3>
                  {eloHistory.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {eloHistory.map((item) => {
                        const isGain = item.changedPoints >= 0;
                        const normalizedReason = item.reason?.toUpperCase() ?? '';
                        const historyLabel = normalizedReason === 'ADMIN_ADD'
                          ? translate("adminAdd")
                          : normalizedReason === 'ADMIN_SUBTRACT'
                            ? translate("adminSubtract")
                            : normalizedReason === 'ADMIN_SET'
                              ? translate("adminSet")
                              : normalizedReason.startsWith('ADMIN_')
                                ? translate("adminEloAdjustment")
                                : normalizedReason === 'INACTIVITY_DECAY'
                                  ? translate("eloInactivityDecay")
                                  : item.match?.tournamentName || translate("rankedMatchFallback");
                        return (
                          <div key={item.id} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-b-0">
                            <div>
                              <p className="text-sm font-bold text-slate-800 line-clamp-1">{historyLabel}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{formatDate(item.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                            </div>
                            <div className="flex items-center gap-3 text-right">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-bold">{translate("newElo")}</span>
                                <span className="text-sm font-bold text-slate-700">{item.newElo}</span>
                              </div>
                              <span className={`inline-block px-2 py-1 rounded text-xs font-bold min-w-[45px] text-center ${
                                isGain ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {isGain ? `+${item.changedPoints}` : item.changedPoints}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-sm">
                      {translate("eloHistoryEmpty")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Modal gửi yêu cầu xác minh */}
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <ModalContent className="max-w-md p-6">
          <ModalHeader>
            <ModalTitle className="text-xl font-bold text-slate-900">{translate("organizerRegistrationTitle")}</ModalTitle>
            <p className="text-slate-500 text-xs mt-1 font-medium leading-relaxed">
              {translate("organizerModalDescription")}
            </p>
          </ModalHeader>
          <div className="mt-4 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{translate("contactEmailLabel")}</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-500 font-semibold">
                <Mail className="w-4 h-4 text-slate-400" />
                {displayUser?.email}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {translate("contactPhoneLabel")} <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder={translate("contactPhonePlaceholder")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {translate("evidenceLabel")} <span className="text-rose-500">*</span>
              </label>

              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                <input
                  type="file"
                  onChange={handleUploadEvidence}
                  accept="image/*"
                  className="hidden"
                  id="evidence-upload"
                />

                {isUploading ? (
                  <div className="flex flex-col items-center justify-center py-4 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    <span className="text-xs mt-2 font-medium">{translate("uploadingImage")}</span>
                  </div>
                ) : evidenceUrl ? (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden group">
                    <img src={evidenceUrl} alt="Evidence" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEvidenceUrl('')}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/85 text-white rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="evidence-upload"
                    className="flex flex-col items-center justify-center py-6 cursor-pointer text-slate-400 hover:text-blue-500 text-center w-full"
                  >
                    <UploadCloud className="w-8 h-8 mb-1" />
                    <span className="text-xs font-bold">{translate("chooseEvidence")}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{translate("evidenceFormats")}</span>
                  </label>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t justify-end">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmittingTicket}
              >
                {translate("cancel")}
              </Button>
              <Button
                onClick={handleSubmitTicket}
                isLoading={isSubmittingTicket}
                variant="success"
                className="font-bold"
              >
                {translate("submitVerification")}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}

