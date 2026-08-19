'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { tournamentsApi } from '@/features/tournaments/api';
import { communitiesApi } from '@/features/communities/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { getErrorMessage } from '@/utils/error';
import toast from 'react-hot-toast';
import { CheckCircle, AlertTriangle, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { BRAND } from '@/constants/brand';

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
    matchType?: 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES' | string;
    communityId?: string | null;
  };
  participantId?: string;
  communityId?: string;
  communityName?: string;
  clubPolicy?: string;
};

export default function LiteJoinPage({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = use(params);
  const router = useRouter();
  const translate = useTranslations('LiteJoin');
  const { user, isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<JoinStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isRequestingClub, setIsRequestingClub] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await tournamentsApi.getLiteJoinStatus(inviteCode);
      const nextStatus = res as unknown as JoinStatus;
      setStatus(nextStatus);

      // A public Quick tournament is not a super-lite club event. Keep the
      // legacy URL working, but hand it to the standard registration page so
      // doubles can invite/confirm a partner and singles still get the same
      // roster, ELO and approval rules as Advanced tournaments.
      if (nextStatus.tournament?.id && !nextStatus.tournament.communityId) {
        const params = new URLSearchParams({ invite: inviteCode });
        router.replace(`/tournaments/${nextStatus.tournament.id}/register?${params.toString()}`);
      }
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
      toast.success(translate('joinSuccess'));
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
      toast.success(translate('clubJoinRequestSent'));
      fetchStatus();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsRequestingClub(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!status?.tournament) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-sm w-full text-center space-y-4">
          <Image
            src={BRAND.assets.logoIcon}
            alt={`${BRAND.name} Logo`}
            width={200}
            height={80}
            className="h-20 w-auto object-contain mx-auto"
          />
          <h2 className="text-base font-bold text-slate-800">{translate('invalidTournament')}</h2>
          <p className="text-xs text-slate-500">{translate('invalidInvite')}</p>
          <Link href="/tournaments">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg py-2">
              {translate('viewTournamentList')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const t = status.tournament;
  const isUserLoggedIn = isAuthenticated || !!user;
  const showAuthRequired = !!status.requiresAuth && !isUserLoggedIn;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Sporto Official Logo — Big & Prominent */}
        <div className="text-center">
          <Image
            src={BRAND.assets.logoIcon}
            alt={`${BRAND.name} Logo`}
            width={240}
            height={90}
            className="h-20 sm:h-24 w-auto object-contain mx-auto mb-4"
            priority
          />

          {/* Optional Tournament Custom Logo if provided */}
          {(t.logoUrl || t.bannerUrl) && (
            <img
              src={t.logoUrl || t.bannerUrl}
              alt={t.name}
              className="w-16 h-16 rounded-lg object-cover border border-slate-200 mx-auto mb-3"
            />
          )}

          <h1 className="text-xl font-bold text-slate-900 leading-snug">{t.name}</h1>
          {t.category && (
            <span className="inline-block mt-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-full px-3 py-1">
              {t.category}
            </span>
          )}
        </div>

        {/* State 1: Already Joined */}
        {status.alreadyJoined ? (
          <div className="space-y-4 pt-2 text-center">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-1">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-emerald-900">{translate('alreadyJoined')}</p>
              <p className="text-xs text-emerald-700">{translate('profileReady')}</p>
            </div>
            <Link href={`/tournaments/${t.id}`}>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg cursor-pointer">
                {translate('viewTournamentDetails')}
              </Button>
            </Link>
          </div>
        ) : status.registrationClosed ? (
          /* State 2: Registration Closed */
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center space-y-1">
            <AlertTriangle className="w-7 h-7 text-amber-600 mx-auto mb-1" />
            <p className="text-sm font-bold text-amber-900">{translate('registrationClosed')}</p>
          </div>
        ) : status.tournamentFull ? (
          /* State 3: Tournament Full */
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center space-y-1">
            <AlertTriangle className="w-7 h-7 text-amber-600 mx-auto mb-1" />
            <p className="text-sm font-bold text-amber-900">{translate('tournamentFull')}</p>
          </div>
        ) : status.requiresClubJoin ? (
          /* State 4: Requires Club Join */
          <div className="space-y-4 pt-2 text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1">
              <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <p className="text-xs font-bold text-slate-900">{translate('clubJoinRequired')}</p>
              <p className="text-xs text-slate-600">
                {translate('clubTournamentJoinHint', { club: status.communityName || '' })}
              </p>
            </div>
            <Button onClick={handleRequestClub} disabled={isRequestingClub} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg cursor-pointer">
              {isRequestingClub ? translate('processing') : translate('joinClub')}
            </Button>
          </div>
        ) : showAuthRequired ? (
          /* State 5: Requires Auth (Only if NOT logged in) */
          <div className="space-y-4 pt-2">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center space-y-1">
              <p className="text-xs font-bold text-slate-800">{translate('loginRequired')}</p>
              <p className="text-xs text-slate-500">
                {translate('loginTournamentHint')}
              </p>
            </div>
            <Button
              onClick={() => router.push(`/login?redirect=/lite/tournaments/join/${inviteCode}`)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{translate('loginNow')}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          /* State 6: Can Join / Logged In — Primary Join Action */
          <div className="space-y-4 pt-2">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex items-center justify-between">
              <span className="text-slate-500 font-medium">{translate('competitionName')}</span>
              <span className="font-bold text-slate-900">{user?.fullName || user?.email || translate('competitionAccount')}</span>
            </div>
            <Button
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg cursor-pointer transition-colors"
            >
              {isJoining ? translate('processing') : translate('confirmJoin')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
