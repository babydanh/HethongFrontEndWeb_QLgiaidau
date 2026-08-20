'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Trophy, Calendar, MapPin, Users, ArrowLeft, Loader2, CheckCircle, AlertTriangle, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { tournamentsApi, divisionsApi, Tournament, TournamentParticipant, type Division } from '@/features/tournaments/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { getErrorMessage } from '@/utils/error';
import { formatDate, formatCurrency } from '@/utils/format';
import { getSportLogo } from '@/constants/sports';
import toast from 'react-hot-toast';

export default function AcceptPartnerPage({ params }: { params: Promise<{ id: string; participantId: string }> }) {
  const resolvedParams = use(params);
  const { id, participantId } = resolvedParams;

  const router = useRouter();
  const translate = useTranslations('AcceptPartner');
  const { user, isAuthenticated } = useAuthStore();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participant, setParticipant] = useState<TournamentParticipant | null>(null);
  const [division, setDivision] = useState<Division | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !participantId) {
        toast.error(translate('invalidInvite'));
        router.push('/tournaments');
        return;
      }

      try {
        setIsLoading(true);
        // Fetch tournament
        const tRes = await tournamentsApi.getTournamentById(id);
        if (tRes.data) {
          setTournament(tRes.data);
        }

        // Fetch participants to find the target team
        const pRes = await tournamentsApi.getTournamentParticipants(id);
        if (pRes.data) {
          const targetTeam = pRes.data.find(p => p.id === participantId);
          if (targetTeam) {
            setParticipant(targetTeam);
            if (targetTeam.tournamentDivisionId) {
              const divRes = await divisionsApi.getDivisions(id);
              if (divRes.data) {
                setDivision(divRes.data.find(d => d.id === targetTeam.tournamentDivisionId) ?? null);
              }
            }
          } else {
            toast.error(translate('teamNotFound'));
            router.push(`/tournaments/${id}`);
          }
        }
      } catch (err) {
        toast.error(translate('loadInviteFailed'));
        router.push(`/tournaments/${id}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, participantId, router]);

  const handleJoin = async () => {
    if (!isAuthenticated || !user) {
      toast.error(translate('loginToAccept'));
      const redirectUrl = `/tournaments/${id}/participants/${participantId}/accept-partner`;
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    // Client-side validation: Gender checks
    const targetRestriction =
      division?.genderRestriction ||
      tournament?.genderRestriction;

    if (targetRestriction) {
      const normalizeGender = (val?: string | null) => {
        if (!val) return null;
        const n = val.trim().toUpperCase();
        if (['MALE', 'MEN', 'NAM'].includes(n)) return 'MALE';
        if (['FEMALE', 'WOMEN', 'NU', 'NỮ'].includes(n)) return 'FEMALE';
        if (n === 'MIXED') return 'MIXED';
        return 'OTHER';
      };

      const userGender = normalizeGender(user.gender);
      const restriction = normalizeGender(targetRestriction);

      if (restriction === 'MALE' && userGender !== 'MALE') {
        toast.error(translate('maleOnly'));
        return;
      }
      if (restriction === 'FEMALE' && userGender !== 'FEMALE') {
        toast.error(translate('femaleOnly'));
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await tournamentsApi.acceptPartnerInvite(participantId);

      toast.success(translate('joinSuccess'));

      const entryFee = Number(tournament?.entryFee || 0);

      if (entryFee > 0 && !participant?.isPaid) {
        const params = new URLSearchParams({
          participantId,
          tournamentId: id,
        });
        if (participant?.tournamentDivisionId) {
          params.set('divisionId', participant.tournamentDivisionId);
        }
        router.push(`/payments/checkout?${params.toString()}`);
      } else {
        router.push(`/tournaments/${id}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!isAuthenticated || !user) {
      toast.error(translate('loginToAct'));
      const redirectUrl = `/tournaments/${id}/participants/${participantId}/accept-partner`;
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    try {
      setIsRejecting(true);
      await tournamentsApi.rejectPartnerInvite(participantId);
      toast.success(translate('rejectSuccess'));
      router.push(`/tournaments/${id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsRejecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium text-sm">{translate('loadingTeam')}</p>
      </div>
    );
  }

  if (!tournament || !participant) return null;

  const isLocked = tournament.isRegistrationLocked;
  const isExpired = tournament.registrationEndDate ? new Date() > new Date(tournament.registrationEndDate) : false;
  const isNotOpen =
    tournament.status !== 'REGISTRATION_OPEN' &&
    tournament.status !== 'UPCOMING' &&
    tournament.status !== 'DRAFT';

  if (isLocked || isExpired || isNotOpen || participant.teamStatus !== 'PENDING_PARTNER') {
    let title = translate('invalidTitle');
    let message = translate('invalidMessage');
    if (isLocked) {
      title = translate('registrationLockedTitle');
      message = translate('registrationLockedMessage');
    } else if (isExpired) {
      title = translate('registrationExpiredTitle');
      message = translate('registrationExpiredMessage');
    } else if (isNotOpen) {
      title = translate('registrationClosedTitle');
      message = translate('registrationClosedMessage');
    }

    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="text-slate-550 text-xs leading-relaxed font-semibold">{message}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/tournaments/${tournament.id}`)}
            className="w-full border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-bold"
          >
            {translate('backToTournament')}
          </Button>
        </div>
      </div>
    );
  }

  const leader = participant.members?.find(m => m.role === 'MAIN') || participant.members?.[0];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => router.push(`/tournaments/${tournament.id}`)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {translate('backToTournamentShort')}
        </button>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 md:p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative">
            <span className="flex items-center gap-1 bg-blue-600/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-wider w-fit">
              {(() => {
                const logo = getSportLogo(tournament.category?.name);
                return logo ? (
                  <img src={logo} alt={tournament.category?.name || ''} className="w-3 h-3 object-contain" />
                ) : null;
              })()}
              {tournament.category?.name || translate('defaultSport')}
            </span>
            <h1 className="text-xl md:text-2xl font-bold mt-2 mb-3 text-white">{tournament.name}</h1>

            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-350 font-semibold">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>{translate('opening')} {tournament.startDate ? formatDate(tournament.startDate) : translate('notScheduled')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-400" />
                <span className="truncate">{tournament.locationAddress || translate('notUpdated')}</span>
              </div>
            </div>
          </div>

          {/* Invite Card Body */}
          <div className="p-6 md:p-8 space-y-6">
            <div className="text-center space-y-2 max-w-sm mx-auto">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-105 text-blue-600 mb-1">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">{translate('directPairInvite')}</h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                {translate('invitedToTeam', { team: participant.teamName || '' })}
              </p>
            </div>

            {/* Team Leader Profile */}
            {leader && (
              <div className="bg-slate-50 border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm uppercase">
                    {leader.fullName?.substring(0, 2) || 'LD'}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{translate('teamLeader')}</p>
                    <p className="text-sm font-bold text-slate-800">{leader.fullName || translate('defaultUser')}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  {leader.elo?.eloPoints || 1000} ELO
                </span>
              </div>
            )}

            <div className="space-y-3">
              {tournament.genderRestriction && (
                <div className="flex items-start gap-2.5 bg-slate-50 text-slate-700 text-xs font-semibold p-3.5 rounded-lg border border-slate-200/50">
                  <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900">{translate('genderRequirement')}</p>
                    <p className="mt-0.5 leading-relaxed text-slate-600 font-medium">
                      {translate('genderRestrictionHint', {
                        restriction:
                          tournament.genderRestriction === 'MALE'
                            ? translate('maleOnlyLabel')
                            : tournament.genderRestriction === 'FEMALE'
                              ? translate('femaleOnlyLabel')
                              : translate('mixedDoublesLabel'),
                      })}
                    </p>
                  </div>
                </div>
              )}

              {Number(tournament.entryFee || 0) > 0 && (
                <div className="flex items-start gap-2.5 bg-blue-50 text-blue-800 text-xs font-semibold p-3.5 rounded-lg border border-blue-200/50">
                  <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-blue-950">{translate('entryFeeTitle')}</p>
                    <p className="mt-0.5 leading-relaxed text-slate-650 font-medium">
                      {translate('entryFeeHint', { fee: `${formatCurrency(Number(tournament.entryFee))}` })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              {!isAuthenticated && (
                <p className="text-xs text-blue-600 font-semibold text-center mb-2">
                  {translate('loginToRespond')}
                </p>
              )}
              <Button
                onClick={handleJoin}
                disabled={isSubmitting || isRejecting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {translate('processing')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {!isAuthenticated ? translate('loginAndAccept') : translate('acceptTeam')}
                  </>
                )}
              </Button>
              <Button
                onClick={handleReject}
                disabled={isSubmitting || isRejecting}
                variant="outline"
                className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 font-bold py-3 flex items-center justify-center gap-1.5"
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {translate('processing')}
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    {translate('rejectInvitation')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
