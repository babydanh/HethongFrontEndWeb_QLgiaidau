'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { tournamentsApi } from '@/features/tournaments/api';
import { communitiesApi } from '@/features/communities/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { getErrorMessage } from '@/utils/error';
import toast from 'react-hot-toast';
import { Trophy, CheckCircle, AlertTriangle, Users, Shield, ArrowRight, Sparkles, MapPin, Calendar } from 'lucide-react';
import Link from 'next/link';

type JoinStatus = {
  requiresAuth?: boolean;
  requiresClubJoin?: boolean;
  clubJoinPending?: boolean;
  alreadyJoined?: boolean;
  registrationClosed?: boolean;
  tournamentFull?: boolean;
  canJoin?: boolean;
  tournament?: {
    id: string;
    name: string;
    category?: string;
    logoUrl?: string;
    bannerUrl?: string;
    locationName?: string;
    startDate?: string;
  };
  participantId?: string;
  communityId?: string;
  communityName?: string;
  clubPolicy?: string;
};

export default function LiteJoinPage({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = use(params);
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<JoinStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isRequestingClub, setIsRequestingClub] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await tournamentsApi.getLiteJoinStatus(inviteCode);
      setStatus(res as unknown as JoinStatus);
    } catch {
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [inviteCode]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchStatus(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchStatus, isAuthenticated]);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await tournamentsApi.joinLite(inviteCode);
      toast.success('Tham gia giải đấu thành công!');
      if (status?.tournament?.id) router.push(`/tournaments/${status.tournament.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsJoining(false);
    }
  };

  const handleRequestClub = async () => {
    if (!status?.communityId) return;
    setIsRequestingClub(true);
    try {
      await communitiesApi.joinCommunity(status.communityId);
      toast.success('Đã gửi yêu cầu tham gia CLB!');
      fetchStatus();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsRequestingClub(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!status?.tournament) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Không tìm thấy giải đấu</h2>
          <p className="text-xs text-slate-500">Mã mời không tồn tại hoặc đã hết hạn.</p>
          <Link href="/tournaments">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-2.5">
              Khám phá giải đấu khác
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const t = status.tournament;

  return (
    <div className="min-h-screen bg-slate-100/70 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden flex flex-col">
        {/* Tournament Card Top Header / Banner */}
        <div className="relative h-32 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)]" />
          <div className="relative text-center">
            <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/20 uppercase tracking-widest">
              <Sparkles className="w-3 h-3 text-amber-300" /> VN SPORT TOURNAMENT
            </span>
          </div>
        </div>

        {/* Tournament Avatar / Logo in Center */}
        <div className="relative px-6 pb-6 pt-0 text-center flex flex-col items-center">
          <div className="-mt-14 mb-4 relative">
            {t.logoUrl || t.bannerUrl ? (
              <img
                src={t.logoUrl || t.bannerUrl}
                alt={t.name}
                className="w-24 h-24 rounded-2xl object-cover shadow-lg ring-4 ring-white bg-white mx-auto"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 ring-4 ring-white shadow-lg flex items-center justify-center mx-auto text-white">
                <Trophy className="w-12 h-12 stroke-[1.75]" />
              </div>
            )}
          </div>

          {/* Tournament Name & Meta Info */}
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug max-w-xs">
            {t.name}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {t.category && (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200/80 text-xs font-bold px-2.5 py-0.5 rounded-full">
                ⚡ {t.category}
              </span>
            )}
            {status.communityName && (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                <Users className="w-3 h-3 text-slate-500" /> CLB {status.communityName}
              </span>
            )}
          </div>

          {(t.locationName || t.startDate) && (
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500 font-medium mt-3">
              {t.startDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> {t.startDate}
                </span>
              )}
              {t.locationName && (
                <span className="flex items-center gap-1 truncate max-w-[180px]">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {t.locationName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100 w-full" />

        {/* Dynamic Action Section */}
        <div className="p-6 bg-slate-50/50 flex-1 flex flex-col justify-center space-y-4">
          {/* Case 1: Requires Auth */}
          {status.requiresAuth && (
            <div className="space-y-4 text-center">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600">
                  <Shield className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-800">Yêu cầu đăng nhập</p>
                <p className="text-xs text-slate-500">
                  Vui lòng đăng nhập tài khoản VN Sport để xác nhận tham gia giải đấu.
                </p>
              </div>

              <Button
                onClick={() => router.push(`/login?redirect=/lite/tournaments/join/${inviteCode}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm py-3 rounded-xl shadow-md transition-all shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Đăng nhập ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Case 2: Already Joined */}
          {status.alreadyJoined && (
            <div className="text-center space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="text-base font-extrabold text-emerald-900">Bạn đã tham gia giải này!</h3>
                <p className="text-xs text-emerald-700 font-medium">
                  Hồ sơ thi đấu của bạn đã được ghi nhận trong danh sách.
                </p>
              </div>
              <Link href={`/tournaments/${t.id}`}>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-3 cursor-pointer">
                  Xem chi tiết giải đấu
                </Button>
              </Link>
            </div>
          )}

          {/* Case 3: Registration Closed */}
          {status.registrationClosed && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-2">
              <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
              <h3 className="text-base font-extrabold text-amber-900">Giải đấu đã đóng đăng ký</h3>
              <p className="text-xs text-amber-700">Ban tổ chức đã ngưng nhận thêm hồ sơ tham gia.</p>
            </div>
          )}

          {/* Case 4: Tournament Full */}
          {status.tournamentFull && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-2">
              <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
              <h3 className="text-base font-extrabold text-amber-900">Giải đấu đã đủ số lượng</h3>
              <p className="text-xs text-amber-700">Đã đạt tối đa số lượng VĐV / Đội tham gia.</p>
            </div>
          )}

          {/* Case 5: Requires Club Join - OPEN */}
          {status.requiresClubJoin && status.clubPolicy === 'OPEN' && (
            <div className="space-y-4 text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
                <Users className="w-8 h-8 text-blue-600 mx-auto" />
                <p className="text-sm font-bold text-slate-900">Tham gia CLB để đấu</p>
                <p className="text-xs text-slate-600">
                  Giải đấu thuộc CLB <strong>{status.communityName}</strong>. Vui lòng tham gia CLB trước.
                </p>
              </div>
              <Button onClick={handleRequestClub} disabled={isRequestingClub} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-3 cursor-pointer">
                {isRequestingClub ? 'Đang gửi...' : 'Vào CLB Ngay'}
              </Button>
            </div>
          )}

          {/* Case 6: Requires Club Join - APPROVAL */}
          {status.requiresClubJoin && status.clubPolicy === 'APPROVAL' && (
            <div className="space-y-4 text-center">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                <Shield className="w-8 h-8 text-amber-600 mx-auto" />
                <p className="text-sm font-bold text-amber-900">CLB cần duyệt thành viên</p>
                <p className="text-xs text-amber-700">
                  Gửi yêu cầu gia nhập CLB <strong>{status.communityName}</strong> để Ban quản trị phê duyệt.
                </p>
              </div>
              <Button onClick={handleRequestClub} disabled={isRequestingClub} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl py-3 cursor-pointer">
                {isRequestingClub ? 'Đang gửi...' : 'Gửi yêu cầu xin vào CLB'}
              </Button>
            </div>
          )}

          {/* Case 7: Can Join Now */}
          {status.canJoin && (
            <div className="space-y-4">
              <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                  {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'V'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-blue-600">Vận động viên</p>
                  <p className="text-sm font-extrabold text-slate-900 truncate">
                    {user?.fullName || 'Tài khoản thi đấu'}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-3.5 rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
              >
                <span>{isJoining ? 'Đang tham gia...' : 'Xác nhận tham gia giải'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
