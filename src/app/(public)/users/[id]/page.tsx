'use client';

import { useEffect, useState, use } from 'react';
import { api } from '@/lib/axios';
import { ApiResponse } from '@/types/api';
import { Trophy, Award, Calendar, ArrowLeft, Loader2, Sparkles, Star, Zap, User } from 'lucide-react';
import Link from 'next/link';

interface UserRank {
  categoryId: string;
  categoryName: string;
  matchType: string;
  eloPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  winStreak: number;
}

interface PublicProfile {
  id: string;
  createdAt: string;
  fullName: string;
  avatarUrl: string | null;
  gender: string | null;
  bio: string | null;
  isVerified: boolean;
  ranks: UserRank[];
}

interface Match {
  id: string;
  roundNumber: number;
  status: string;
  participant1: { id: string; teamName: string } | null;
  participant2: { id: string; teamName: string } | null;
  p1SetsWon: number;
  p2SetsWon: number;
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
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      setIsLoading(true);
      try {
        const [profileRes, matchesRes] = await Promise.all([
          api.get<ApiResponse<PublicProfile>>(`/users/${id}/public`),
          api.get<ApiResponse<{ data: Match[] }>>(`/matches?userId=${id}&limit=10`),
        ]);
        setProfile(profileRes.data);
        setMatches(matchesRes.data.data || []);
      } catch (err: any) {
        console.error('Failed to fetch public profile:', err);
        setError(err.response?.data?.message || 'Không tìm thấy hồ sơ người dùng.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPublicData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-slate-450 font-medium text-sm">Đang tải hồ sơ VĐV...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center bg-slate-800 border border-slate-700 p-8 rounded-3xl max-w-md shadow-2xl">
          <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">{error || 'Không tìm thấy người dùng'}</h2>
          <p className="text-slate-400 text-sm mb-6">Tài khoản này có thể không tồn tại hoặc đã bị khóa.</p>
          <Link
            href="/tournaments"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-650/20"
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Decorative background */}
      <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-indigo-950/40 via-purple-950/20 to-transparent pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-4 pt-8 relative z-10">
        {/* Navigation */}
        <div className="mb-8">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl mb-8 flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Avatar Section */}
          <div className="relative">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center overflow-hidden shadow-xl">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 md:w-16 md:h-16 text-slate-500" />
              )}
            </div>
            {profile.isVerified && (
              <div className="absolute bottom-2 right-2 bg-indigo-600 text-white p-1 rounded-full border-2 border-slate-900" title="VĐV Đã Xác Minh">
                <CheckCircle className="w-4 h-4 fill-white text-indigo-600" />
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h1 className="text-3xl font-black text-white tracking-tight">{profile.fullName}</h1>
              {profile.isVerified && (
                <span className="px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider">
                  Baseline Verified
                </span>
              )}
            </div>

            <p className="text-slate-400 text-sm max-w-xl italic">
              {profile.bio || '"Chưa cập nhật tiểu sử cá nhân."'}
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-semibold text-slate-450 pt-2">
              <span className="bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700 flex items-center gap-1.5">
                Giới tính: <strong className="text-slate-200">{getGenderLabel(profile.gender)}</strong>
              </span>
              <span className="bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> Gia nhập:{' '}
                <strong className="text-slate-200">
                  {new Date(profile.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' })}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* ELO Rankings section */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xl font-extrabold text-white">Xếp hạng trình độ ELO</h2>
          </div>

          {profile.ranks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.ranks.map((rank) => (
                <div
                  key={`${rank.categoryId}-${rank.matchType}`}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg flex items-center justify-between transition-all group"
                >
                  <div className="space-y-2.5 flex-1">
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                      {rank.categoryName} • {getMatchTypeLabel(rank.matchType)}
                    </span>
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                      <h4 className="font-extrabold text-white text-base">{rank.eloPoints} ELO</h4>
                    </div>
                    {/* Stats detail */}
                    <div className="grid grid-cols-3 gap-2 pt-1.5 text-center">
                      <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-850">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Số Trận</div>
                        <div className="text-xs font-black text-slate-300">{rank.matchesPlayed}</div>
                      </div>
                      <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-850">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Thắng</div>
                        <div className="text-xs font-black text-emerald-500">{rank.matchesWon}</div>
                      </div>
                      <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-850">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Chuỗi</div>
                        <div className="text-xs font-black text-indigo-400 flex items-center justify-center gap-0.5">
                          <Zap className="w-3 h-3 fill-indigo-400 shrink-0" /> {rank.winStreak}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400 text-sm">
              Người chơi chưa tham gia thi đấu xếp hạng ELO chính thức.
            </div>
          )}
        </div>

        {/* Recent Match History */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xl font-extrabold text-white">Lịch sử thi đấu gần đây</h2>
          </div>

          {matches.length > 0 ? (
            <div className="flex flex-col gap-4">
              {matches.map((match) => {
                const isCompleted = match.status === 'COMPLETED';
                const isP1 = match.participant1?.teamName === profile.fullName || 
                  (match.participant1?.id && profile.ranks.some(r => r.categoryId === match.id)); // fallback match logic
                const isWinner = isCompleted && match.winnerId && (
                  (match.winnerId === match.participant1?.id && match.participant1?.teamName === profile.fullName) ||
                  (match.winnerId === match.participant2?.id && match.participant2?.teamName === profile.fullName)
                );

                const opponentName = match.participant1?.teamName === profile.fullName
                  ? match.participant2?.teamName || 'TBD'
                  : match.participant1?.teamName || 'TBD';

                return (
                  <div
                    key={match.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <span>{match.group?.stage?.name || 'Giải đấu'}</span>
                        <span>•</span>
                        <span>Vòng {match.roundNumber}</span>
                      </div>
                      <div className="text-sm font-bold text-white flex items-center gap-2.5">
                        <span className="text-slate-400">Đối thủ:</span>
                        <span className="text-indigo-300 font-extrabold">{opponentName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                      {/* Set scores details */}
                      <div className="bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 text-sm font-black text-slate-350 tabular-nums">
                        {match.p1SetsWon} - {match.p2SetsWon}
                      </div>

                      {/* Result badge */}
                      {isCompleted ? (
                        isWinner ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                            Thắng
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wide">
                            Thua
                          </span>
                        )
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wide">
                          Đang đấu
                        </span>
                      )}

                      <Link
                        href={`/live/${match.id}`}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 shrink-0"
                      >
                        Chi tiết <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400 text-sm">
              Chưa ghi nhận lịch sử trận đấu nào gần đây.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Dummy check circle component mapping for safety
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
    </svg>
  );
}
