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
import { Trophy, CheckCircle, AlertTriangle, Users, Shield } from 'lucide-react';
import Link from 'next/link';

type JoinStatus = {
  requiresAuth?: boolean;
  requiresClubJoin?: boolean;
  clubJoinPending?: boolean;
  alreadyJoined?: boolean;
  registrationClosed?: boolean;
  tournamentFull?: boolean;
  canJoin?: boolean;
  tournament?: { id: string; name: string; category?: string };
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
    if (!isAuthenticated) {
      router.replace(`/login?redirect=/lite/tournaments/join/${inviteCode}`);
      return;
    }
    fetchStatus();
  }, [inviteCode, isAuthenticated, fetchStatus, router]);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await tournamentsApi.joinLite(inviteCode);
      toast.success('Tham gia thành công!');
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
      toast.success('Đã gửi yêu cầu vào CLB!');
      fetchStatus();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsRequestingClub(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (!status?.tournament)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Không tìm thấy giải đấu
      </div>
    );

  const t = status.tournament;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900">{t.name}</h1>
          {t.category && <p className="text-sm text-slate-500 mt-1">{t.category}</p>}
        </div>

        {/* Already joined */}
        {status.alreadyJoined && (
          <div className="text-center space-y-3">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
            <p className="text-sm text-slate-600">Bạn đã tham gia giải này</p>
            <Link href={`/tournaments/${t.id}`}>
              <Button className="w-full">Xem giải đấu</Button>
            </Link>
          </div>
        )}

        {/* Registration closed */}
        {status.registrationClosed && (
          <div className="text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Giải đã đóng đăng ký</p>
          </div>
        )}

        {/* Tournament full */}
        {status.tournamentFull && (
          <div className="text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Giải đã đủ số lượng</p>
          </div>
        )}

        {/* Requires club join - OPEN */}
        {status.requiresClubJoin && status.clubPolicy === 'OPEN' && (
          <div className="space-y-3 text-center">
            <Users className="w-10 h-10 text-blue-500 mx-auto" />
            <p className="text-sm text-slate-600">
              Bạn chưa là thành viên CLB <strong>{status.communityName}</strong>
            </p>
            <Button onClick={handleRequestClub} disabled={isRequestingClub} className="w-full">
              {isRequestingClub ? 'Đang gửi...' : 'Vào CLB & Tham gia'}
            </Button>
          </div>
        )}

        {/* Requires club join - APPROVAL */}
        {status.requiresClubJoin && status.clubPolicy === 'APPROVAL' && (
          <div className="space-y-3 text-center">
            <Shield className="w-10 h-10 text-amber-500 mx-auto" />
            <p className="text-sm text-slate-600">
              CLB <strong>{status.communityName}</strong> cần duyệt thành viên
            </p>
            <Button onClick={handleRequestClub} disabled={isRequestingClub} className="w-full">
              {isRequestingClub ? 'Đang gửi...' : 'Xin vào CLB'}
            </Button>
            <p className="text-xs text-slate-400">
              Bạn cần được duyệt trước khi tham gia giải
            </p>
          </div>
        )}

        {/* Requires club join - INVITE_ONLY */}
        {status.requiresClubJoin && status.clubPolicy === 'INVITE_ONLY' && (
          <div className="text-center">
            <Shield className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600">
              CLB <strong>{status.communityName}</strong> chỉ dành cho thành viên được mời
            </p>
          </div>
        )}

        {/* Club join pending */}
        {status.clubJoinPending && (
          <div className="text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Yêu cầu vào CLB đang chờ duyệt</p>
          </div>
        )}

        {/* Can join */}
        {status.canJoin && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium mb-1">Tên thi đấu</p>
              <p className="text-sm font-bold text-slate-900">
                {user?.fullName || 'Chưa cập nhật'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Tên sẽ được lấy từ tài khoản
              </p>
            </div>
            <Button onClick={handleJoin} disabled={isJoining} className="w-full">
              {isJoining ? 'Đang tham gia...' : 'Tham gia'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
