'use client';

import { useAuthStore } from '@/lib/zustand/authStore';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { BRAND } from '@/constants/brand';
import { buildMatchScoreSummary } from '@/features/matches/score-display';
import { Trophy, Calendar, Users, Activity, Settings, MapPin, Edit3, ShieldCheck, Loader2, Phone, UploadCloud, X, Mail, Camera, AlertTriangle, ChevronRight, Zap, Award, Bookmark } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslations } from "next-intl";
import { usersApi, UserProfile } from '@/features/users/api';
import { communitiesApi, Community } from '@/features/communities/api';
import { formatDate, formatCurrency } from '@/utils/format';
import {
  getTournamentStatusClassName,
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

const getAchievementMeta = (rank: AchievementRank) => {
  switch (rank) {
    case 1:
      return {
        label: 'Quán quân',
        colorClass: 'bg-amber-50',
        textClass: 'text-amber-700',
        borderClass: 'border-amber-200',
      };
    case 2:
      return {
        label: 'Á quân',
        colorClass: 'bg-slate-50',
        textClass: 'text-slate-700',
        borderClass: 'border-slate-200',
      };
    case 3:
    default:
      return {
        label: 'Hạng ba',
        colorClass: 'bg-amber-50',
        textClass: 'text-amber-700',
        borderClass: 'border-amber-200',
      };
  }
};

const hasUserInParticipant = (
  participant: BracketMatch['participant1'] | BracketMatch['participant2'],
  userId: string,
) => Boolean(participant?.members?.some((member) => member.userId === userId));

const deriveTournamentPlacement = (
  tournament: Tournament,
  stages: BracketStage[],
  userId: string,
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
    const meta = getAchievementMeta(result.isWinner ? 1 : 2);
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
      const meta = getAchievementMeta(3);
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
    const meta = getAchievementMeta(3);
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
  const { user } = useAuthStore();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [createdCommunities, setCreatedCommunities] = useState<Community[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [participatingTournaments, setParticipatingTournaments] = useState<Tournament[]>([]);
  const [organizedTournaments, setOrganizedTournaments] = useState<Tournament[]>([]);
  const [coOrganizerTournaments, setCoOrganizerTournaments] = useState<Tournament[]>([]);
  const [refereeTournaments, setRefereeTournaments] = useState<WorkspaceRefereeInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      return gr === 'FEMALE' ? 'Đơn Nữ' : 'Đơn Nam';
    }
    if (mt === 'DOUBLES') {
      return gr === 'FEMALE' ? 'Đôi Nữ' : 'Đôi Nam';
    }
    if (mt === 'MIXED_DOUBLES' || mt === 'MIXED' || gr === 'MIXED') {
      return 'Đôi Nam Nữ';
    }
    return mt === 'DOUBLES' ? 'Đôi' : mt === 'SINGLES' ? 'Đơn' : 'Đôi Nam Nữ';
  };

  const handleCoverClick = () => {
    coverInputRef.current?.click();
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB');
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

      toast.success('Đã cập nhật ảnh bìa');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi tải ảnh bìa lên');
    } finally {
      setIsUploadingCover(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const [data, communitiesRes, workspaceRes] = await Promise.all([
          usersApi.getProfile(),
          communitiesApi.getMyCommunities(),
          tournamentsApi.getMyWorkspace()
        ]);
        if (isMounted) {
          setProfileData(data);
          setCreatedCommunities(communitiesRes.data?.created || []);
          setJoinedCommunities(communitiesRes.data?.joined || []);
          setParticipatingTournaments(workspaceRes.data?.participatingTournaments || []);
          setOrganizedTournaments(workspaceRes.data?.organizedTournaments || []);
          setCoOrganizerTournaments(workspaceRes.data?.coOrganizerTournaments || []);
          setRefereeTournaments(workspaceRes.data?.refereeTournaments || workspaceRes.data?.refereeInvites || []);

          // Sync roles/details with useAuthStore so header displays updated roles immediately
          if (data) {
            useAuthStore.getState().setUser({
              ...data,
              roles: data.roles || [],
            });
          }

          const userRoles = data?.roles || [];
          if (!userRoles.includes('ORGANIZER') && !userRoles.includes('ADMIN')) {
            const res = await api.get<ApiResponse<VerificationTicket[]>>('/admin/verification-tickets/my');
            if (isMounted) {
              setTickets(res.data || []);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    try {
      setIsUploading(true);
      const res = await uploadApi.uploadImage(file);
      setEvidenceUrl(res.url);
      toast.success('Tải ảnh minh chứng lên thành công!');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi tải ảnh minh chứng lên');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitTicket = async () => {
    if (!phone.trim()) {
      toast.error('Vui lòng nhập số điện thoại liên hệ');
      return;
    }
    if (!evidenceUrl) {
      toast.error('Vui lòng tải lên ảnh minh chứng năng lực');
      return;
    }

    try {
      setIsSubmittingTicket(true);
      await api.post('/admin/verification-tickets', {
        evidenceUrls: [evidenceUrl],
        contactPhone: phone.trim()
      });
      toast.success('Gửi yêu cầu xác minh thành công! Đang chờ Admin duyệt.');
      setIsModalOpen(false);
      setPhone('');
      setEvidenceUrl('');

      const res = await api.get<ApiResponse<VerificationTicket[]>>('/admin/verification-tickets/my');
      setTickets(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi gửi yêu cầu');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const displayUser = profileData || user;

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
  const featuredRank = (userRankings?.publicRanks || [])
    .filter((rank) => rank.matchesPlayed > 0)
    .sort((a, b) => b.eloPoints - a.eloPoints)[0] || null;

  useEffect(() => {
    if (!displayUser?.id) return;

    if (matchesCursorUserRef.current !== displayUser.id) {
      matchesCursorUserRef.current = displayUser.id;
      matchesCursorByPageRef.current = { 1: null };
    }

    let isMounted = true;
    const fetchTabData = async () => {
      try {
        setIsLoadingTab(true);
        const [ranksRes, historyRes, followedRes, matchesRes] = await Promise.all([
          rankingsApi.getUserRankings(displayUser.id),
          rankingsApi.getUserEloHistory(displayUser.id),
          tournamentsApi.getFollowedTournaments(),
          matchesApi.getMatches({
            userId: displayUser.id,
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
            setMatches(matchesRes.data);
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
  }, [displayUser?.id, matchesPage]);

  useEffect(() => {
    let isMounted = true;
    const fetchAchievements = async () => {
      if (!displayUser?.id || participatingTournaments.length === 0) {
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
              return deriveTournamentPlacement(tournament, response.data.stages || [], displayUser.id);
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
  }, [displayUser?.id, participatingTournaments]);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
        {/* Cover Photo */}
        <div className="h-56 bg-slate-900 relative group overflow-hidden">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={coverInputRef}
            onChange={handleCoverChange}
          />
          {displayUser?.coverUrl ? (
            <img
              src={displayUser.coverUrl}
              alt="Cover"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-650 to-purple-650 opacity-90"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>

          <button
            type="button"
            onClick={handleCoverClick}
            disabled={isUploadingCover}
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-md border border-white/10 shadow-lg cursor-pointer"
          >
            {isUploadingCover ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            {translate("editCover")}
          </button>
        </div>

        <div className="px-6 md:px-10 pb-8 relative">
          {/* Avatar & Actions */}
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 -mt-16 mb-5 relative z-10">
            <RankAvatar
              src={displayUser?.avatarUrl}
              name={displayUser?.fullName}
              elo={featuredRank?.eloPoints}
              tierName={featuredRank?.tier?.name || featuredRank?.tierName}
              matchesPlayed={featuredRank?.matchesPlayed || 0}
              size="lg"
              ringClassName="ring-4 shadow-xl transition-transform duration-300 hover:scale-[1.03]"
            />
            <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
              <Link href="/profile/edit" className="w-full md:w-auto">
                <Button variant="outline" className="w-full md:w-auto border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-900 rounded-lg font-bold transition-all shadow-sm">
                  <Edit3 className="w-4 h-4 mr-2" /> {translate("editProfile")}
                </Button>
              </Link>
              <Button
                type="button"
                variant="secondary"
                className="w-full md:w-auto rounded-lg font-bold shadow-sm"
                onClick={() => setActiveTab('tournaments')}
              >
                <Bookmark className="w-4 h-4 mr-2" />
                Theo dõi
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                {isLoading ? (
                  <span className="w-48 h-8 bg-slate-200 animate-pulse rounded-lg"></span>
                ) : (
                  displayUser?.fullName || '{translate("anonymousUser")}'
                )}
                {((displayUser as unknown as Record<string, unknown>)?.roles as string[] | undefined)?.includes('ADMIN') && (
                  <span title={translate("systemAdmin")} className="bg-blue-50 p-1 rounded-full border border-blue-200">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                  </span>
                )}
              </h1>
              <p className="text-slate-500 font-semibold mt-0.5">
                {isLoading ? (
                  <span className="w-32 h-4 bg-slate-200 animate-pulse rounded inline-block mt-1"></span>
                ) : (
                  displayUser?.email
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {Array.from(new Set((displayUser as unknown as Record<string, unknown>)?.roles as string[] | undefined || user?.roles || [])).map((role: string) => {
                let roleLabel = role;
                let roleColor = 'bg-[#e0f2fe] text-[#1e3a8a]';
                if (role === 'PLAYER') {
                  roleLabel = 'Vận động viên';
                  roleColor = 'bg-[#e0f2fe] text-[#1e3a8a]';
                } else if (role === 'ORGANIZER') {
                  roleLabel = 'Ban tổ chức';
                  roleColor = 'bg-[#f3e8ff] text-[#6b21a8]';
                } else if (role === 'ADMIN') {
                  roleLabel = 'Quản trị viên';
                  roleColor = 'bg-[#fdf2e9] text-[#991b1b]';
                }
                return (
                  <span key={role} className={`px-3.5 py-1.5 text-xs font-bold rounded-md uppercase tracking-wider ${roleColor}`}>
                    {roleLabel}
                  </span>
                );
              })}
              {(() => {
                const activeRanks = userRankings?.publicRanks?.filter(r => r.matchesPlayed > 0) || [];
                if (activeRanks.length > 0) {
                  return activeRanks.map((rank) => (
                    <div key={rank.id} className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{rank.categoryName}:</span>
                      <EloTierBadge elo={rank.eloPoints} size="sm" />
                    </div>
                  ));
                }
                return (
                  <span className="bg-[#f3f4f6] text-[#4b5563] px-3.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider">
                    {translate("unranked")}
                  </span>
                );
              })()}
              {displayUser?.createdAt && (
                <span className="bg-[#f3f4f6] text-[#4b5563] px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> {translate("memberSince")} {formatDate(displayUser.createdAt, 'MM/yyyy')}
                </span>
              )}
            </div>
          </div>

          <div className="mt-8 flex overflow-x-auto gap-2 border-b border-slate-100 no-scrollbar relative z-10">
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
                className={`px-4 py-2 font-bold text-sm whitespace-nowrap transition-colors border-b-2 -mb-[1.5px] ${
                  activeTab === tab.id
                    ? 'text-blue-650 border-blue-650 bg-blue-50/5'
                    : 'text-slate-500 border-transparent hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Warning banner for missing gender */}
      {!isLoading && displayUser && !displayUser.gender && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <h4 className="font-bold text-amber-900 text-sm">{translate("genderMissing")}</h4>
              <p className="text-amber-700 text-xs mt-0.5">{translate("genderPrompt")}</p>
            </div>
          </div>
          <Link href="/profile/edit">
            <Button size="sm" variant="warning" className="font-bold text-xs">
              Cập nhật ngay
            </Button>
          </Link>
        </div>
      )}

      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex flex-col gap-6">
              {/* Giới thiệu */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">{translate("about")}</h3>
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 animate-pulse rounded w-full"></div>
                    <div className="h-4 bg-slate-200 animate-pulse rounded w-3/4"></div>
                  </div>
                ) : profileData?.bio ? (
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {profileData.bio}
                  </p>
                ) : (
                  <p className="text-slate-400 text-sm italic">
                    {translate("bioMissing")}
                  </p>
                )}
              </div>

              {/* Thông tin chi tiết */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
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
                      <span className="text-slate-900 font-semibold">{profileData?.gender || translate("notUpdated")}</span>
                    </div>
                    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                      <span className="text-slate-500 font-medium">Địa chỉ</span>
                      <span className="text-slate-900 font-semibold">{profileData?.address || translate("notUpdated")}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500 font-medium">Email liên hệ</span>
                      <span className="text-slate-900 font-semibold">{profileData?.email || translate("notUpdated")}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tài khoản hoàn tiền */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Tài khoản hoàn tiền</h3>
                  <Link href="/profile/edit" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
                    Chỉnh sửa
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
                    <p className="text-slate-400 text-xs italic">Chưa cấu hình tài khoản nhận hoàn tiền.</p>
                    <Link href="/profile/edit">
                      <Button size="sm" className="mt-2.5 text-xs font-bold px-3 py-1.5 h-auto">
                        Cấu hình ngay
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Yêu cầu quyền Ban tổ chức (Organizer) */}
              {!isLoading && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Vai trò Ban tổ chức</h3>
                  {(profileData?.roles || user?.roles || []).includes('ORGANIZER') ||
                   (profileData?.roles || user?.roles || []).includes('ADMIN') ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs font-semibold text-slate-700 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-950">
                        <ShieldCheck className="w-5 h-5 text-blue-600" />
                        Đã xác minh Ban tổ chức
                      </div>
                      <p className="text-emerald-700 leading-relaxed">
                        Chúc mừng! Tài khoản của bạn đã được phê duyệt quyền Ban tổ chức giải. Hiện tại bạn có quyền quản lý giải đấu và tạo chuỗi giải đấu chuyên nghiệp tính Rank ELO.
                      </p>
                    </div>
                  ) : tickets.length > 0 && tickets[0].status === 'PENDING' ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs font-semibold text-slate-700 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-amber-900">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        Đang chờ duyệt...
                      </div>
                      <p className="text-amber-700 leading-relaxed">
                        Yêu cầu nâng cấp tài khoản của bạn đang được Ban quản trị hệ thống xử lý.
                      </p>
                      <div className="pt-2 border-t border-amber-100/50 text-[10px] text-blue-600">
                        SĐT liên hệ: {tickets[0].contactPhone}
                      </div>
                    </div>
                  ) : tickets.length > 0 && tickets[0].status === 'REJECTED' ? (
                    <div className="space-y-4">
                      <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 text-xs font-semibold text-rose-800 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-sm text-rose-900">
                          <X className="w-4 h-4 text-rose-600" />
                          Yêu cầu bị từ chối
                        </div>
                        <p className="text-rose-700 leading-relaxed">
                          Lý do: <span className="font-bold text-rose-900">{tickets[0].rejectReason || 'Không có lý do chi tiết'}</span>
                        </p>
                      </div>
                      <Button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full font-bold"
                      >
                        Gửi lại yêu cầu
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                        Bạn mặc định có thể tự do tạo giải đấu nội bộ miễn phí trong Câu lạc bộ của mình. Chỉ gửi yêu cầu nếu bạn muốn tạo giải đấu công khai tính ELO toàn hệ thống hoặc chuỗi giải đấu lớn.
                      </p>
                      <Button
                        onClick={() => setIsModalOpen(true)}
                        variant="success"
                        className="w-full font-bold"
                      >
                        Yêu cầu quyền Ban tổ chức
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="md:col-span-2 space-y-6">
              {/* Câu lạc bộ của tôi */}
              {/* Câu lạc bộ của tôi */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Câu lạc bộ của tôi</h3>
                  <Link href="/communities/create">
                    <Button variant="success" size="sm" className="rounded-lg px-4 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Tạo câu lạc bộ
                    </Button>
                  </Link>
                </div>

                {isLoading ? (
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
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">CLB đã tạo / quản lý</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {createdCommunities.map(community => {
                            const isOwner = community.creatorId === displayUser?.id || community.myRole === 'OWNER';
                            const roleBadgeLabel = isOwner ? 'Người tạo / Chủ sở hữu' : community.myRole === 'MODERATOR' ? 'Quản trị viên' : 'Thành viên';
                            const roleBadgeStyle = isOwner ? 'bg-blue-50 text-blue-700 border-blue-200' : community.myRole === 'MODERATOR' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200';

                            return (
                              <Link href={`/communities/${community.id}`} key={community.id}>
                                <div className="flex items-center gap-4 p-4 rounded-lg border border-slate-100 hover:border-blue-500 hover:shadow-md transition-all group bg-slate-50 cursor-pointer">
                                  <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-200 relative shrink-0">
                                    <Image src={community.logoUrl || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop"} alt={community.name} fill className="object-cover" />
                                  </div>
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
                                        {community.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã vô hiệu hoá'}
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
                    {joinedCommunities.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">CLB đã tham gia</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {joinedCommunities.map(community => {
                            const isOwner = community.creatorId === displayUser?.id || community.myRole === 'OWNER';
                            const roleBadgeLabel = isOwner ? 'Người tạo / Chủ sở hữu' : community.myRole === 'MODERATOR' ? 'Quản trị viên' : 'Thành viên';
                            const roleBadgeStyle = isOwner ? 'bg-blue-50 text-blue-700 border-blue-200' : community.myRole === 'MODERATOR' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                            return (
                              <Link href={`/communities/${community.id}`} key={community.id}>
                                <div className="flex items-center gap-4 p-4 rounded-lg border border-slate-100 hover:border-emerald-500 hover:shadow-md transition-all group bg-slate-50 cursor-pointer">
                                  <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-200 relative shrink-0">
                                    <Image src={community.logoUrl || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop"} alt={community.name} fill className="object-cover" />
                                  </div>
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
                                        {community.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã vô hiệu hoá'}
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
                    <p className="text-slate-600 font-medium">Bạn chưa tham gia câu lạc bộ nào</p>
                    <p className="text-slate-400 text-sm mt-1 mb-4">Tham gia các câu lạc bộ thể thao để giao lưu và thi đấu</p>
                    <Link href="/communities">
                      <Button variant="outline">
                        Khám phá câu lạc bộ
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 text-center py-12 border-dashed">
                <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium text-lg">Chưa có dữ liệu hoạt động</p>
                <p className="text-slate-400 text-sm mt-1">Hãy tham gia giải đấu để bắt đầu ghi nhận thành tích!</p>
              </div>
            </div>
          </div>
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
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 border border-slate-200">Vừa kết thúc</span>
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 border border-rose-100 text-rose-700">Đang diễn ra</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 border border-emerald-100 text-emerald-700">Mở đăng ký</span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 border border-blue-100 text-blue-700">Sắp diễn ra</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {followedTournaments.map((tournament) => (
                  (() => {
                      const statusLabel = getTournamentStatusLabel(tournament.status);
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
                      ? (formattedEndDate ? `Kết thúc ${formattedEndDate}` : 'Giải đấu đã kết thúc')
                      : isLive
                        ? 'Đang diễn ra'
                        : isOpen
                          ? 'Mở đăng ký'
                          : isUpcoming
                            ? 'Sắp diễn ra'
                            : isCancelled
                              ? 'Đã hủy'
                              : 'Đang theo dõi';

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
                              📍 {tournament.locationAddress ? tournament.locationAddress.split(',').slice(-1)[0]?.trim() || 'Việt Nam' : translate("notUpdated")}
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
                                  {tournament.isRanked ? 'Xếp hạng ELO' : 'Phong trào'}
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
                                {tournament.entryFee ? formatCurrency(tournament.entryFee) : 'Miễn phí'}
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
                <h3 className="text-lg font-bold text-slate-700 mb-2">Chưa theo dõi giải đấu nào</h3>
                <p className="text-slate-500 max-w-sm mx-auto text-sm">
                  Theo dõi giải đấu để xem nhanh các giải bạn quan tâm ngay trong profile.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Danh hiệu thành tích</h3>
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
                              Giải public ELO
                            </span>
                          </div>
                          <h4 className="mt-2 text-base font-bold text-slate-900 line-clamp-1">{item.tournamentName}</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {item.tournamentDate ? formatDate(item.tournamentDate, 'dd/MM/yyyy') : 'Chưa có ngày kết thúc'}
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
                  <p className="text-slate-600 font-semibold">Chưa có danh hiệu thành tích</p>
                  <p className="text-slate-400 text-sm mt-1">Khi tham gia giải public ELO và vào top 3, badge sẽ tự hiện ở đây.</p>
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
                  const isP1 = match.participant1?.teamName?.toLowerCase() === displayUser?.fullName?.toLowerCase();

                  const isWinner = isCompleted && match.winnerId && (
                    (match.winnerId === match.participant1Id && isP1) ||
                    (match.winnerId === match.participant2Id && !isP1)
                  );

                  const opponentName = isP1
                    ? match.participant2?.teamName || 'Chưa xác định'
                    : match.participant1?.teamName || 'Chưa xác định';

                  return (
                    <div
                      key={match.id}
                      className="bg-white border border-slate-200 hover:border-slate-350 rounded-lg p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-450">
                          <span>{match.tournament?.name || 'Giải đấu'}</span>
                          <span>•</span>
                          <span>Vòng {match.roundNumber}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span className="text-slate-400">Đối thủ:</span>
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
                              Thắng
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-rose-250 uppercase tracking-wide">
                              Thua
                            </span>
                          )
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-250 uppercase tracking-wide">
                            Đang đấu
                          </span>
                        )}

                        <Link
                          href={`/live/${match.id}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0"
                        >
                          Chi tiết <ChevronRight className="w-4 h-4" />
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
                      Trước
                    </Button>
                    <span className="text-xs font-bold text-slate-500">Trang {matchesPage} / {matchesTotalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={matchesPage >= matchesTotalPages}
                      onClick={() => setMatchesPage(p => Math.min(matchesTotalPages, p + 1))}
                      className="border-slate-200 text-slate-650 hover:bg-slate-50"
                    >
                      Sau
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg border border-slate-200 border-dashed">
                <Activity className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">Chưa thi đấu trận nào</h3>
                <p className="text-slate-500 max-w-sm mx-auto text-sm">
                  Hãy tham gia giải đấu và cập nhật kết quả thi đấu để xem lịch sử trận đấu của bạn tại đây.
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
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Hạng Trình Độ ELO</h3>
                  </div>

                  {userRankings?.publicRanks && userRankings.publicRanks.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {userRankings.publicRanks.map((rank) => (
                        <div key={rank.id} className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                          <div className="space-y-1.5 flex-1">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-550 border border-slate-200">
                              {rank.categoryName} • {rank.matchType === 'SINGLES' ? 'Đánh đơn' : 'Đánh đôi'}
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Award className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                              <h4 className="font-bold text-slate-900 text-base">{rank.eloPoints} ELO</h4>
                              <EloTierBadge elo={rank.eloPoints} size="sm" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-center text-xs">
                              <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">Số Trận</div>
                                <div className="font-bold text-slate-700 mt-0.5">{rank.matchesPlayed}</div>
                              </div>
                              <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">Thắng</div>
                                <div className="font-bold text-blue-600 mt-0.5">{rank.matchesWon}</div>
                              </div>
                              <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">Chuỗi</div>
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
                      Bạn chưa tham gia thi đấu xếp hạng ELO chính thức.
                    </div>
                  )}
                </div>

                {eloHistory.length > 0 && (
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Biến động ELO theo thời gian</h3>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[...eloHistory].reverse().map((item, index) => ({
                            name: `Trận ${index + 1}`,
                            'ELO': item.newElo,
                            date: formatDate(item.createdAt, 'dd/MM/yyyy'),
                            reason: item.reason || (item.changedPoints > 0 ? 'Thắng' : 'Thua'),
                            tournament: item.match?.tournamentName || 'Giải đấu'
                          }))}
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
                                    <p className="text-slate-505 text-[10px] mt-0.5">{data.tournament}</p>
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

                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Lịch sử thay đổi ELO</h3>
                  {eloHistory.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {eloHistory.map((item) => {
                        const isGain = item.changedPoints >= 0;
                        return (
                          <div key={item.id} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-b-0">
                            <div>
                              <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.match?.tournamentName || 'Trận đấu xếp hạng'}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{formatDate(item.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                            </div>
                            <div className="flex items-center gap-3 text-right">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-bold">ELO mới</span>
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
                      Không có lịch sử biến động ELO.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal gửi yêu cầu xác minh */}
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <ModalContent className="max-w-md p-6">
          <ModalHeader>
            <ModalTitle className="text-xl font-bold text-slate-900">Đăng ký Ban tổ chức giải</ModalTitle>
            <p className="text-slate-500 text-xs mt-1 font-medium leading-relaxed">
              (Dùng để tạo chuỗi giải đấu hoặc giải đấu công khai tính Rank ELO. Nếu chỉ tổ chức giải nội bộ CLB thì bạn không cần đăng ký quyền này).
            </p>
          </ModalHeader>
          <div className="mt-4 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gmail liên hệ</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-500 font-semibold">
                <Mail className="w-4 h-4 text-slate-400" />
                {displayUser?.email}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Số điện thoại liên hệ <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Nhập số điện thoại liên lạc..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Ảnh minh chứng năng lực <span className="text-rose-500">*</span>
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
                    <span className="text-xs mt-2 font-medium">Đang tải ảnh lên...</span>
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

