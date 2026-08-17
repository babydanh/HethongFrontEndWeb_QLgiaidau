'use client';

import { useEffect, useState, use } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/axios';
import { ApiResponse } from '@/types/api';
import { Trophy, Award, Calendar, ArrowLeft, Loader2, Sparkles, Star, Zap, User, Camera, ShieldCheck, MapPin, Activity, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { buildMatchScoreSummary } from '@/features/matches/score-display';
import { formatDate } from '@/utils/format';
import { Button } from '@/components/ui/Button';
import { rankingsApi, PlayerRanking, EloHistoryLog } from '@/features/rankings/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getErrorMessage } from '@/utils/error';
import { EloTierBadge } from '@/components/ui/EloTierBadge';
import { RankAvatar } from '@/components/ui/RankAvatar';
import { ReportViolationButton } from '@/features/reports/components/ReportViolationButton';
import { useAuthStore } from '@/lib/zustand/authStore';
import { BRAND } from '@/constants/brand';

interface UserRank {
  categoryId: string;
  categoryName: string;
  matchType: string;
  eloPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  winStreak: number;
  tierName?: string | null;
  partnerName?: string | null;
}

interface PublicProfile {
  id: string;
  createdAt: string;
  isMock?: boolean;
  fullName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  gender: string | null;
  bio: string | null;
  isVerified: boolean;
  role?: string;
  roles?: string[];
  ranks: UserRank[];
  pairRanks?: UserRank[];
  achievements?: {
    tournamentId: string;
    tournamentName: string;
    rank: 1 | 2 | 3;
    completedAt: string | null;
    tournamentDate: string | null;
  }[];
}

interface Match {
  id: string;
  roundNumber: number;
  status: string;
  participant1: { id: string; teamName: string } | null;
  participant2: { id: string; teamName: string } | null;
  p1SetsWon: number;
  p2SetsWon: number;
  scoreDetails?: Record<string, unknown> | null;
  winnerId: string | null;
  completedAt: string | null;
  group?: {
    name: string;
    stage?: {
      name: string;
    };
  } | null;
}

export default function PublicUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const translate = useTranslations('PublicProfile');
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { user } = useAuthStore();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [eloHistory, setEloHistory] = useState<EloHistoryLog[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'achievements' | 'elo'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hideEloSection = profile?.isMock === true;
  const tabs = hideEloSection
    ? [
        { id: 'overview', label: translate('overview') },
        { id: 'matches', label: translate('matches') },
        { id: 'achievements', label: translate('achievements') },
      ] as const
    : [
        { id: 'overview', label: translate('overview') },
        { id: 'matches', label: translate('matches') },
        { id: 'achievements', label: translate('achievements') },
        { id: 'elo', label: translate('elo') },
      ] as const;

  useEffect(() => {
    if (hideEloSection && activeTab === 'elo') {
      setActiveTab('overview');
    }
  }, [activeTab, hideEloSection]);

  useEffect(() => {
    const fetchPublicData = async () => {
      setIsLoading(true);
      try {
        const [profileRes, matchesRes, eloHistoryRes] = await Promise.all([
          api.get<ApiResponse<PublicProfile>>(`/users/${id}/public`),
          api.get<ApiResponse<Match[]>>(`/matches?userId=${id}&limit=10`),
          rankingsApi.getUserEloHistory(id).catch(() => ({ data: [] }))
        ]);

        setProfile(profileRes.data);
        setMatches(matchesRes.data || []);
        setEloHistory(eloHistoryRes?.data || []);
      } catch (err: unknown) {
        console.error('Failed to fetch public profile:', err);
        setError(getErrorMessage(err) || 'Không tìm thấy hồ sơ người dùng.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPublicData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-slate-500 font-bold text-sm">Đang tải hồ sơ thành viên...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-6">
        <div className="text-center bg-white border border-slate-200 p-8 rounded-xl max-w-md shadow-lg">
          <div className="w-24 h-24 flex items-center justify-center mx-auto mb-4">
            <img src={BRAND.assets.logoIcon} alt={BRAND.name} className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{error || 'Không tìm thấy người dùng'}</h2>
          <p className="text-slate-500 text-sm mb-6 font-medium">Tài khoản này có thể không tồn tại hoặc đã bị khóa khỏi hệ thống.</p>
          <Link
            href="/tournaments"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-md"
          >
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const getMatchTypeLabel = (matchType: string) => {
    return matchType === 'SINGLES' ? 'Đánh đơn' : 'Đánh đôi';
  };

  const getGenderLabel = (gender: string | null) => {
    if (!gender) return 'Chưa cập nhật';
    return gender === 'MALE' ? 'Nam' : gender === 'FEMALE' ? 'Nữ' : 'Khác';
  };

  const displayedRanks = [...(profile.ranks || []), ...(profile.pairRanks || [])];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <ReportViolationButton
          targetType="USER"
          targetId={profile.id}
          targetLabel={profile.fullName}
          hidden={user?.id === profile.id}
        />
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
        {/* Cover Photo */}
        <div className="h-56 bg-slate-900 relative group overflow-hidden">
          {profile.coverUrl ? (
            <img
              src={profile.coverUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-650 to-purple-650 opacity-90"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>
        </div>

        <div className="px-6 md:px-10 pb-8 relative">
          {/* Avatar & Info */}
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 -mt-16 mb-5 relative z-10">
            {(() => {
              const featuredRank = displayedRanks
                .filter((rank) => rank.matchesPlayed > 0)
                .sort((a, b) => b.eloPoints - a.eloPoints)[0];
              return (
                <RankAvatar
                  src={profile.avatarUrl}
                  name={profile.fullName}
                  elo={featuredRank?.eloPoints}
                  tierName={featuredRank?.tierName}
                  matchesPlayed={featuredRank?.matchesPlayed || 0}
                  size="lg"
                  ringClassName="ring-4 shadow-xl transition-transform duration-300 hover:scale-[1.03]"
                />
              );
            })()}
          </div>

          {/* Info */}
          <div className="space-y-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                {profile.fullName}
                {profile.isVerified && (
                  <span title="Thành viên đã xác minh" className="bg-blue-50 p-1 rounded-full border border-blue-200">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                  </span>
                )}
              </h1>
            </div>

      <div className="flex flex-wrap items-center gap-2">
              {Array.from(new Set(profile.roles || (profile.role ? [profile.role] : ['PLAYER']))).map((role: string) => {
                let roleLabel = 'Vận động viên';
                let roleColor = 'bg-[#e0f2fe] text-[#1e3a8a]';
                if (role === 'ORGANIZER') {
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
              {profile.isVerified && (
                <span className="px-3.5 py-1.5 text-xs font-bold rounded-md bg-[#dcfce7] text-[#166534] uppercase tracking-wider">
                  Đã xác minh
                </span>
              )}
              {!hideEloSection && (() => {
                const activeRanks = displayedRanks.filter(r => r.matchesPlayed > 0);
                if (activeRanks.length > 0) {
                  return activeRanks.map((rank) => (
                    <div key={`${rank.categoryId}-${rank.matchType}`} className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-bold shrink-0">
                      <span className="text-[10px] font-bold text-slate-550 uppercase mr-1">{rank.categoryName}:</span>
                      <EloTierBadge elo={rank.eloPoints} tierName={rank.tierName || undefined} size="sm" className="scale-90 origin-left" />
                    </div>
                  ));
                }
                return (
                  <span className="bg-[#f3f4f6] text-[#4b5563] px-3.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider">
                    Chưa xếp hạng
                  </span>
                );
              })()}
              {profile.achievements?.length ? (
                <span className="bg-slate-50 border border-slate-200 text-slate-600 px-3.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-blue-500" /> {profile.achievements.length} danh hiệu
                </span>
              ) : null}
              {profile.createdAt && (
                <span className="bg-[#f3f4f6] text-[#4b5563] px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tham gia từ {formatDate(profile.createdAt, 'MM/yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-1 no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 font-bold text-sm whitespace-nowrap transition-all border-b-2 cursor-pointer -mb-[2px] ${
              activeTab === tab.id
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-550 border-transparent hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex flex-col gap-6">
              {/* Giới thiệu */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Giới thiệu</h3>
                {profile.bio ? (
                  <p className="text-slate-650 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-slate-400 text-sm italic font-medium">
                    Chưa cập nhật phần giới thiệu bản thân.
                  </p>
                )}
              </div>

              {/* Thông tin chi tiết */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Thông tin chi tiết</h3>
                <div className="flex flex-col gap-4 text-sm">
                  <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                    <span className="text-slate-500 font-medium">Giới tính</span>
                    <span className="text-slate-900 font-semibold">{getGenderLabel(profile.gender)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 text-center py-12 border-dashed">
                <Activity className="w-12 h-12 text-slate-350 mx-auto mb-3" />
                <p className="text-slate-550 font-semibold text-lg">Chưa có dữ liệu hoạt động</p>
                <p className="text-slate-450 text-xs font-medium mt-1">Hệ thống ghi nhận hoạt động tự động khi bắt đầu tham gia các giải đấu.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-6">
            {matches.length > 0 ? (
              <div className="flex flex-col gap-4">
                {matches.map((match) => {
                  const isCompleted = match.status === 'COMPLETED';
                  const isP1 = match.participant1?.teamName?.toLowerCase() === profile.fullName?.toLowerCase();

                  const isWinner = isCompleted && match.winnerId && (
                    (match.winnerId === match.participant1?.id && isP1) ||
                    (match.winnerId === match.participant2?.id && !isP1)
                  );

                  const opponentName = isP1
                    ? match.participant2?.teamName || 'Chưa xác định'
                    : match.participant1?.teamName || 'Chưa xác định';

                  return (
                    <div
                      key={match.id}
                      className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                          <span>{match.group?.stage?.name || 'Giải đấu'}</span>
                          <span>•</span>
                          <span>Vòng {match.roundNumber}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span className="text-slate-400">Đối thủ:</span>
                          <span className="text-blue-600 font-bold">{opponentName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 text-sm font-bold text-slate-700 tabular-nums">
                          {buildMatchScoreSummary({
                            p1SetsWon: match.p1SetsWon,
                            p2SetsWon: match.p2SetsWon,
                            scoreDetails: match.scoreDetails as Record<string, unknown> | null | undefined,
                            tournament: { sportRules: null },
                          })}
                        </div>

                        {isCompleted ? (
                          isWinner ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                              Thắng
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">
                              Thua
                            </span>
                          )
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                            Đang đấu
                          </span>
                        )}

                        <Link
                          href={`/live/${match.id}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-750 flex items-center gap-1 shrink-0"
                        >
                          Chi tiết <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg border border-slate-200 border-dashed">
                <Activity className="w-16 h-16 text-slate-350 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">Chưa thi đấu trận nào</h3>
                <p className="text-slate-500 max-w-sm mx-auto text-sm font-medium">
                  Thành viên này chưa ghi nhận trận đấu chính thức nào gần đây trên hệ thống.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Danh hiệu thành tích</h3>
              </div>
              {profile.achievements && profile.achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...profile.achievements]
                    .sort((a, b) => a.rank - b.rank || (b.completedAt || '').localeCompare(a.completedAt || ''))
                    .map((item) => {
                      const badgeClass =
                        item.rank === 1
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : item.rank === 2
                            ? 'bg-slate-50 text-slate-700 border-slate-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200';
                      const title = item.rank === 1 ? 'Quán quân' : item.rank === 2 ? 'Á quân' : 'Hạng ba';

                      return (
                        <div key={`${item.tournamentId}-${item.rank}`} className={`rounded-lg border p-4 shadow-sm ${badgeClass}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border bg-white ${badgeClass}`}>
                                {title}
                              </span>
                              <h4 className="mt-2 text-base font-bold text-slate-900 line-clamp-1">{item.tournamentName}</h4>
                              <p className="text-xs text-slate-500 mt-1">
                                {item.tournamentDate ? formatDate(item.tournamentDate, 'dd/MM/yyyy') : 'Chưa có ngày kết thúc'}
                              </p>
                            </div>
                            <div className={`shrink-0 w-12 h-12 rounded-lg border flex items-center justify-center font-bold bg-white ${badgeClass}`}>
                              {item.rank}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-lg">
                  <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-semibold">Chưa có danh hiệu thành tích</p>
                  <p className="text-slate-400 text-sm mt-1">Danh hiệu sẽ hiện khi người chơi có top 3 ở giải public ELO.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!hideEloSection && activeTab === 'elo' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Hạng Trình Độ ELO</h3>
                </div>

                {displayedRanks.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {displayedRanks.map((rank) => (
                      <div key={`${rank.categoryId}-${rank.matchType}`} className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                        <div className="space-y-1.5 flex-1">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">
                            {rank.categoryName} • {getMatchTypeLabel(rank.matchType)}
                          </span>
                          <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                            <h4 className="font-bold text-slate-900 text-base">{rank.eloPoints} ELO {rank.partnerName ? `• Đôi với ${rank.partnerName}` : ''}</h4>
                            <EloTierBadge elo={rank.eloPoints} tierName={rank.tierName || undefined} size="sm" />
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Số Trận</div>
                              <div className="font-bold text-slate-700 mt-0.5">{rank.matchesPlayed}</div>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Thắng</div>
                              <div className="font-bold text-blue-600 mt-0.5">{rank.matchesWon}</div>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Chuỗi</div>
                              <div className="font-bold text-blue-600 mt-0.5 flex items-center justify-center gap-0.5">
                                <Zap className="w-3 h-3 fill-blue-500 text-blue-650" /> {rank.winStreak}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-450 text-sm font-medium">
                    Chưa tham gia thi đấu xếp hạng ELO chính thức.
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

              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Lịch sử thay đổi ELO</h3>
                {eloHistory.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {eloHistory.map((item) => {
                      const isGain = item.changedPoints >= 0;
                      return (
                        <div key={item.id} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-b-0">
                          <div>
                            <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.match?.tournamentName || translate('rankingMatch')}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{formatDate(item.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                          </div>
                          <div className="flex items-center gap-3 text-right">
                            <div>
                              <span className="text-[10px] text-slate-450 block font-bold">ELO mới</span>
                              <span className="text-sm font-bold text-slate-750">{item.newElo}</span>
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
                  <div className="text-center py-6 text-slate-400 text-sm font-medium">
                    {translate('eloEmpty')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
