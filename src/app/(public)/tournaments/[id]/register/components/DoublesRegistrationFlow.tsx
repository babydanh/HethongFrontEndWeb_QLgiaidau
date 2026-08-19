'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  MyRegistrationParticipant,
  tournamentsApi,
  Tournament,
  TournamentParticipant,
} from '@/features/tournaments/api';
import { usersApi, UserProfile } from '@/features/users/api';
import { getErrorMessage } from '@/utils/error';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { formatCurrency } from '@/utils/format';
import {
  isParticipantPendingPartner,
  isParticipantReadyForNextStep,
} from '@/utils/tournament-display';
import { Copy, Check, Loader2, QrCode, Users, CreditCard, CheckCircle, AlertTriangle, ArrowRight, Trash2, Search, UserMinus, X, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { getRegistrationModeUi } from '../../../registrationMode';
import ShareModal from '@/components/common/ShareModal';

interface Props {
  tournament: Tournament;
  tournamentId: string;
  inviteCode?: string;
  divisionId?: string;
  customResponses?: Record<string, unknown>;
}

type RegistrationParticipant = TournamentParticipant & {
  teamInviteLink?: string | null;
  paymentEligible?: boolean;
};

const normalizeRegistrationParticipant = (
  participant?: (MyRegistrationParticipant | TournamentParticipant) & { paymentEligible?: boolean } | null,
  fallbackTeamInviteLink?: string | null,
  paymentEligible?: boolean,
): RegistrationParticipant | null => {
  if (!participant) {
    return null;
  }

  return {
    ...participant,
    members: participant.members ?? ('teamMembers' in participant ? participant.teamMembers : undefined) ?? [],
    teamInviteLink: ('teamInviteLink' in participant ? participant.teamInviteLink : undefined) ?? fallbackTeamInviteLink ?? null,
    paymentEligible: paymentEligible ?? participant.paymentEligible,
  };
};

export default function DoublesRegistrationFlow({ tournament, tournamentId, inviteCode, divisionId, customResponses }: Props) {
  const router = useRouter();
  const registrationTranslate = useTranslations('RegistrationMode');
  const doublesTranslate = useTranslations('DoublesRegistration');
  const registrationModeUi = getRegistrationModeUi(registrationTranslate, tournament.tournamentConfig?.registrationMode);
  const isApprovalMode = registrationModeUi.mode === 'APPROVAL';
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [teamName, setTeamName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [participant, setParticipant] = useState<RegistrationParticipant | null>(null);
  const [copied, setCopied] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Partner search states
  const [partnerQuery, setPartnerQuery] = useState('');
  const [searchedPartner, setSearchedPartner] = useState<UserProfile | null>(null);
  const [isSearchingPartner, setIsSearchingPartner] = useState(false);
  const [partnerSearchError, setPartnerSearchError] = useState('');
  const [inviteLater, setInviteLater] = useState(false);
  const [rankingConsent, setRankingConsent] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isCheckingInitial, setIsCheckingInitial] = useState(true);

  useEffect(() => {
    if (step !== 2 || !participant?.partnerInviteExpiresAt) {
      return;
    }

    const endTime = new Date(participant.partnerInviteExpiresAt).getTime();
    if (!Number.isFinite(endTime)) {
      return;
    }

    let handledExpiry = false;
    const updateCountdown = () => {
      const diff = endTime - Date.now();
      if (diff <= 0) {
        if (handledExpiry) return;
        handledExpiry = true;
        setTimeLeft(registrationTranslate('inviteExpired'));
        tournamentsApi.getMyRegistration(tournamentId, divisionId).then((res) => {
          if (!res.data?.registered || (res.data.participant?.teamStatus as string) === 'EXPIRED') {
            setParticipant(null);
            setStep(1);
          }
          toast.error(registrationTranslate('partnerInviteExpiredOrClosed'));
        }).catch(() => undefined);
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setTimeLeft(`${hours > 0 ? doublesTranslate('timeHours', { value: hours }) : ''}${doublesTranslate('timeMinutes', { value: minutes })}${doublesTranslate('timeSeconds', { value: seconds.toString().padStart(2, '0') })}`);
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);
    return () => clearInterval(intervalId);
  }, [step, participant?.partnerInviteExpiresAt, tournamentId, divisionId]);

  // Check if user already has an active registration when component mounts
  useEffect(() => {
    const checkRegistration = async () => {
      try {
        const res = await tournamentsApi.getMyRegistration(tournamentId, divisionId);
        if (res.data && res.data.registered && res.data.participant) {
          const part = normalizeRegistrationParticipant(res.data.participant, undefined, res.data.paymentEligible);
          if (!part) {
            return;
          }
          setParticipant(part);
          if (isParticipantPendingPartner(part.teamStatus)) {
            setStep(2);
          } else if (isParticipantReadyForNextStep(part.teamStatus)) {
            setStep(3);
          }
        }
      } catch (err) {
        console.error('Lỗi kiểm tra đăng ký:', err);
      } finally {
        setIsCheckingInitial(false);
      }
    };
    checkRegistration();
  }, [tournamentId, divisionId]);

  // Polling for teammate to join during Step 2
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (step === 2 && participant?.id) {
      if (!isPolling) {
        Promise.resolve().then(() => setIsPolling(true));
      }
      intervalId = setInterval(async () => {
        try {
          const res = await tournamentsApi.getMyRegistration(tournamentId, divisionId);
          if (res.data && res.data.registered && res.data.participant) {
            const part = normalizeRegistrationParticipant(res.data.participant, undefined, res.data.paymentEligible);
            if (!part) {
              return;
            }
            if (isParticipantReadyForNextStep(part.teamStatus)) {
              setParticipant(part);
              setStep(3);
              toast.success(doublesTranslate('partnerJoined'), { id: 'partner-joined' });
              clearInterval(intervalId);
            } else if (part.teamStatus === 'EXPIRED' || part.teamStatus === 'REJECTED' || part.teamStatus === 'WITHDRAWN') {
              setParticipant(null);
              setStep(1);
              toast.error(
                part.teamStatus === 'REJECTED' ? doublesTranslate('partnerRejected') :
                part.teamStatus === 'WITHDRAWN' ? doublesTranslate('teamWithdrawn') :
                doublesTranslate('inviteExpired'),
                { id: 'partner-rejected' }
              );
              clearInterval(intervalId);
            }
          }
        } catch (err) {
          console.error('Lỗi khi kiểm tra trạng thái đội:', err);
        }
      }, 3000);
    } else {
      if (isPolling) {
        Promise.resolve().then(() => setIsPolling(false));
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [step, participant?.id, tournamentId, isPolling, divisionId]);

  const handleSearchPartner = async () => {
    const q = trimAndNormalizeSpaces(partnerQuery);
    if (!q) {
      setPartnerSearchError(registrationTranslate('partnerSearchRequired'));
      return;
    }
    try {
      setIsSearchingPartner(true);
      setPartnerSearchError('');
      const res = await usersApi.searchUsersByQuery(q);
      const results = res || [];
      if (Array.isArray(results) && results.length > 0) {
        setSearchedPartner(results[0]);
      } else {
        setSearchedPartner(null);
        setPartnerSearchError(doublesTranslate('partnerSearchNotFound'));
      }
    } catch (err) {
      console.error(err);
      setPartnerSearchError(doublesTranslate('partnerSearchError'));
    } finally {
      setIsSearchingPartner(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = trimAndNormalizeSpaces(teamName);
    if (cleanName.length < 3) {
      toast.error(registrationTranslate('teamNameMinLength'));
      return;
    }

    if (!inviteLater && !searchedPartner) {
      toast.error(registrationTranslate('partnerSearchConfirm'));
      return;
    }

    if (tournament?.isRanked && !rankingConsent) {
      toast.error(doublesTranslate('rankingConsentRequired'));
      return;
    }

    try {
      setIsSubmitting(true);
      const partnerEmailOrPhone = inviteLater ? undefined : (searchedPartner?.email || searchedPartner?.phoneNumber || partnerQuery);
      const res = await tournamentsApi.register(tournamentId, {
        teamName: cleanName,
        inviteCode,
        partnerEmailOrPhone,
        tournamentDivisionId: divisionId,
        rankingConsent,
        customResponses,
      });

      if (res.data) {
        const part = normalizeRegistrationParticipant(res.data.participant, res.data.teamInviteLink, res.data.paymentEligible);
        if (!part) {
          toast.error(doublesTranslate('validRegistrationData'));
          return;
        }
        setParticipant(part);
        toast.success(
          isApprovalMode && isParticipantReadyForNextStep(part.teamStatus)
            ? doublesTranslate('approvalSubmitted')
            : partnerEmailOrPhone
              ? doublesTranslate('doublesRegistered')
              : registrationTranslate('teamCreatedInviteNextStep'),
        );
        if (isParticipantReadyForNextStep(part.teamStatus)) {
          setStep(3);
        } else {
          setStep(2);
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualCheck = async () => {
    try {
      toast.loading(doublesTranslate('manualCheckLoading'), { id: 'manual-check' });
      const res = await tournamentsApi.getMyRegistration(tournamentId, divisionId);
      if (res.data && res.data.registered && res.data.participant) {
        const part = normalizeRegistrationParticipant(res.data.participant, undefined, res.data.paymentEligible);
        if (!part) {
          toast.error(doublesTranslate('manualCheckError'), { id: 'manual-check' });
          return;
        }
        setParticipant(part);
        if (isParticipantReadyForNextStep(part.teamStatus)) {
          setStep(3);
          toast.success(doublesTranslate('partnerJoinedManual'), { id: 'manual-check' });
        } else {
          toast.error(doublesTranslate('noPartnerYet'), { id: 'manual-check' });
        }
      } else {
        toast.error(doublesTranslate('manualCheckError'), { id: 'manual-check' });
      }
    } catch (err) {
      toast.error(getErrorMessage(err), { id: 'manual-check' });
    }
  };

  // Bank refund form modal states for doubles
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankError, setBankError] = useState('');

  const handleWithdrawClick = async () => {
    if (participant?.isPaid && Number(tournament.entryFee) > 0) {
      try {
        const freshProfile = await usersApi.getProfile();
        const profile = freshProfile;
        setBankName(profile?.bankName || '');
        setBankAccountNumber(profile?.bankAccountNumber || '');
        setBankAccountName(profile?.bankAccountName || '');
      } catch (err) {
        console.error('Failed to load profile for bank autofill:', err);
      }
      setBankError('');
      setShowWithdrawModal(true);
    } else {
      if (confirm(doublesTranslate('withdrawConfirm'))) {
        executeWithdraw();
      }
    }
  };

  const executeWithdraw = async (bankData?: { bankName: string; bankAccountNumber: string; bankAccountName: string }) => {
    try {
      setIsWithdrawing(true);
      await tournamentsApi.withdraw(tournamentId, bankData, divisionId);
      toast.success(registrationTranslate('withdrawSuccess'));
      setParticipant(null);
      setTeamName('');
      setStep(1);
      setShowWithdrawModal(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleConfirmWithdrawWithBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountName.trim()) {
      setBankError(doublesTranslate('bankRequired'));
      return;
    }
    executeWithdraw({
      bankName: bankName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankAccountName: bankAccountName.trim().toUpperCase(),
    });
  };

  const handlePayment = () => {
    if (!participant?.id || participant.paymentEligible !== true) return;
    const params = new URLSearchParams({
      participantId: participant.id,
      tournamentId,
    });
    if (divisionId) {
      params.set('divisionId', divisionId);
    }
    router.push(`/payments/checkout?${params.toString()}`);
  };

  const partnerLink = participant?.teamInviteLink
    ? participant.teamInviteLink.startsWith('http')
      ? participant.teamInviteLink
      : `${window.location.origin}${participant.teamInviteLink.startsWith('/') ? '' : '/'}${participant.teamInviteLink}`
    : participant?.teamInviteToken
      ? `${window.location.origin}/tournaments/${tournamentId}/join-team?pid=${participant.id}&token=${participant.teamInviteToken}${divisionId ? `&divisionId=${encodeURIComponent(divisionId)}` : ''}`
      : '';

  const qrImageUrl = partnerLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(partnerLink)}`
    : '';

  const copyToClipboard = () => {
    if (!partnerLink) return;
    navigator.clipboard.writeText(partnerLink);
    setCopied(true);
    toast.success(registrationTranslate('copiedInviteLink'));
    setTimeout(() => setCopied(false), 2000);
  };

  if (isCheckingInitial) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500 animate-pulse">{doublesTranslate('loadingRegistration')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress Tracker */}
      <div className="flex items-center justify-between max-w-md mx-auto bg-white border rounded-lg p-4 shadow-sm text-xs font-bold text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>1</span>
          <span className={step === 1 ? 'text-blue-600 font-bold' : ''}>{doublesTranslate('stepCreateTeam')}</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300" />
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>2</span>
          <span className={step === 2 ? 'text-blue-600 font-bold' : ''}>{doublesTranslate('stepInvitePartner')}</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300" />
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>3</span>
          <span className={step === 3 ? 'text-blue-600 font-bold' : ''}>
            {isApprovalMode ? doublesTranslate('stepApprovalOrComplete') : doublesTranslate('stepPaymentOrComplete')}
          </span>
        </div>
      </div>

      {/* STEP 1: CREATE TEAM */}
      {step === 1 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> {doublesTranslate('stepOneTitle')}
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              {doublesTranslate('formatDescriptionPrefix')}
              <strong>
                {tournament.genderRestriction === 'MIXED'
                  ? doublesTranslate('formatMixed')
                  : tournament.genderRestriction === 'FEMALE'
                  ? doublesTranslate('formatFemale')
                  : doublesTranslate('formatMale')}
              </strong>
              . {doublesTranslate('captainDescription')}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-4 flex gap-3 text-xs leading-relaxed font-semibold">
            <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">{doublesTranslate('pairingDeadlineTitle')}</p>
<p className="mt-1">{doublesTranslate('pairingDeadlineText', { hours: 1 })}</p>
            </div>
          </div>

          <form onSubmit={handleCreateTeam} className="space-y-5">
            <Input
              label={doublesTranslate('teamNameLabel')}
              placeholder={doublesTranslate('teamNamePlaceholder')}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={isSubmitting}
            />

            {/* Checkbox: Invite Later */}
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="inviteLater"
                checked={inviteLater}
                onChange={(e) => {
                  setInviteLater(e.target.checked);
                  if (e.target.checked) {
                    setSearchedPartner(null);
                    setPartnerSearchError('');
                  }
                }}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="inviteLater" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                {doublesTranslate('inviteLater')}
              </label>
            </div>

            {/* Partner Search Form (only if not inviting later) */}
            {!inviteLater && (
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-4">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">{doublesTranslate('partnerInfo')}</span>
                
                {searchedPartner ? (
                  // Display verified partner profile
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-emerald-300 bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm uppercase overflow-hidden">
                        {searchedPartner.avatarUrl ? (
                          <img src={searchedPartner.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          searchedPartner.fullName?.charAt(0) || 'TV'
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-950">{searchedPartner.fullName}</p>
                        <p className="text-[10px] text-emerald-700 font-semibold">{searchedPartner.email || searchedPartner.phoneNumber}</p>
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSearchedPartner(null)}
                      className="border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-bold text-xs h-9 flex items-center gap-1.5 px-3 rounded-lg"
                    >
                      <UserMinus className="w-3.5 h-3.5" /> {doublesTranslate('removeSelection')}
                    </Button>
                  </div>
                ) : (
                  // Display search input
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{doublesTranslate('partnerSearchLabel')}</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder={doublesTranslate('partnerSearchPlaceholder')}
                          value={partnerQuery}
                          onChange={(e) => setPartnerQuery(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 h-11"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleSearchPartner}
                        disabled={isSearchingPartner || !partnerQuery.trim()}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 h-11 shrink-0 flex items-center gap-1.5"
                      >
                        {isSearchingPartner ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        {doublesTranslate('search')}
                      </Button>
                    </div>
                    
                    {partnerSearchError && (
                      <p className="text-[11px] text-rose-600 font-semibold leading-normal flex items-start gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
                        <span>{partnerSearchError}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {tournament?.isRanked && (
              <label className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={rankingConsent}
                  onChange={(event) => setRankingConsent(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-sky-600"
                />
                <span>
                  {doublesTranslate('rankingConsent')}
                  <span className="mt-1 block text-xs text-slate-500">{doublesTranslate('unrankedHint')}</span>
                </span>
              </label>
            )}

            {/* Fee summary block */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center font-semibold">
                <span className="text-slate-500">{doublesTranslate('baseFee')}</span>
                <span className="text-slate-800 font-bold">{Number(tournament.entryFee) > 0 ? formatCurrency(Number(tournament.entryFee)) : doublesTranslate('free')} {doublesTranslate('perTeam')}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-sm border-t border-slate-200 pt-2.5">
                <span className="text-slate-700">{doublesTranslate('totalFee')}</span>
                <span className="text-blue-700 font-bold">
                  {Number(tournament.entryFee) > 0 ? formatCurrency(Number(tournament.entryFee)) : doublesTranslate('free')}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !teamName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 shadow-md shadow-blue-500/10 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {doublesTranslate('submitProcessing')}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {inviteLater ? doublesTranslate('createTeamInvite') : doublesTranslate('registerAndPair')}
                </>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* STEP 2: SHARE INVITE LINK & POLL */}
      {step === 2 && participant && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          <div className="space-y-1 text-center max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-slate-900">{doublesTranslate('stepTwoTitle')}</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              {partnerLink ? doublesTranslate('stepTwoWithLink', { teamName: participant.teamName }) : doublesTranslate('stepTwoWaiting', { teamName: participant.teamName })}
            </p>
          </div>

          {timeLeft && (
            <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 text-center animate-in fade-in duration-300">
              <span className="text-[10px] font-bold text-rose-650 block uppercase tracking-wider">{doublesTranslate('timeRemaining')}</span>
              <span className="text-lg font-bold text-rose-600 mt-1 block tracking-wider tabular-nums">{timeLeft}</span>
            </div>
          )}

          {partnerLink ? (
            <>
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center bg-slate-50 border p-6 rounded-lg max-w-xs mx-auto">
                <div className="bg-white p-2 rounded-lg border shadow-sm">
                  <QRCodeSVG value={partnerLink} size={160} level="M" />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-3">{doublesTranslate('scanQr')}</p>
              </div>

              {/* Share link input copy */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{doublesTranslate('inviteLink')}</label>
                <div className="flex items-start gap-2">
                  <Input
                    value={partnerLink}
                    readOnly
                    className="bg-slate-50 text-slate-650 cursor-default select-all text-xs"
                  />
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    className="border-slate-200 hover:bg-slate-50 text-slate-700 shrink-0 flex items-center gap-1.5 font-bold h-11"
                  >
                    {copied ? <Check className="w-4 h-4 text-blue-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? doublesTranslate('copied') : doublesTranslate('copy')}
                  </Button>
                  <Button
                    onClick={() => setIsShareModalOpen(true)}
                    variant="outline"
                    className="border-blue-200 hover:bg-blue-50 text-blue-700 shrink-0 flex items-center gap-1.5 font-bold h-11"
                  >
                    <Share2 className="w-4 h-4" />
                    {doublesTranslate('share')}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 text-center animate-in fade-in duration-300">
              <CheckCircle className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-blue-900">{doublesTranslate('notificationSentTitle')}</h4>
              <p className="text-xs text-blue-700 mt-2 leading-relaxed max-w-sm mx-auto">
                {doublesTranslate('notificationSentDescription')}
              </p>
            </div>
          )}

          {/* Polling Indicator */}
          <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-5 bg-blue-50/20 text-center space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{doublesTranslate('waitingPartner')}</span>
            </div>
            <p className="text-[10px] text-slate-400 max-w-xs">
              {doublesTranslate('waitingPartnerHint')}
            </p>
            <div className="flex items-center gap-3 w-full max-w-xs pt-2">
              <Button
                variant="outline"
                onClick={handleManualCheck}
                className="flex-1 text-slate-700 border-slate-200 hover:bg-slate-55 bg-white text-xs font-bold"
              >
                {doublesTranslate('checkManually')}
              </Button>
              <Button
                variant="outline"
                onClick={handleWithdrawClick}
                            disabled={isWithdrawing}
                className="flex-1 text-rose-600 border-rose-100 hover:bg-rose-50 bg-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> {doublesTranslate('withdrawAction')}
              </Button>
            </div>
          </div>
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            shareUrl={partnerLink}
            title={`${doublesTranslate('share')} ${participant?.teamName || ''} - ${tournament.name}`}
          />
        </div>
      )}

      {/* STEP 3: PAYMENT / COMPLETE */}
      {step === 3 && participant && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {participant.teamStatus === 'COMPLETE'
                ? doublesTranslate('stepThreeCompleteTitle')
                : isApprovalMode ? doublesTranslate('stepThreeApprovalTitle') : doublesTranslate('stepThreeRegisteredTitle')}
            </h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              {participant.teamStatus === 'COMPLETE'
                ? doublesTranslate('stepThreeCompleteDescription')
                : isApprovalMode
                  ? doublesTranslate('stepThreeApprovalDescription')
                  : doublesTranslate('stepThreeRegisteredDescription')}
            </p>
          </div>

          {/* Team Members List */}
          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y">
            <div className="bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              {doublesTranslate('teamMembers', { teamName: participant.teamName })}
            </div>
            {participant.members?.map((m, idx: number) => (
              <div key={m.userId || idx} className="px-4 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                    {m.fullName?.substring(0, 2) || doublesTranslate('memberFallback').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{m.fullName || doublesTranslate('memberFallback')}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{m.role === 'MAIN' ? doublesTranslate('leaderRole') : doublesTranslate('partnerRole')}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-650 bg-blue-50 px-2.5 py-0.5 rounded-full">
                  {m.elo?.eloPoints || 1000} {doublesTranslate('personalElo')}
                </span>
              </div>
            ))}
          </div>

          {/* Action Details */}
          {isApprovalMode && participant.teamStatus !== 'COMPLETE' ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-center text-xs font-semibold text-blue-800">
                {doublesTranslate('approvalHint')}
              </div>
              <Button
                onClick={() => router.push(`/tournaments/${tournament.id}`)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 text-sm"
              >
                {doublesTranslate('viewTournament')}
              </Button>
            </div>
          ) : Number(tournament.entryFee || 0) > 0 ? (
            <div className="space-y-4">
              <div className="bg-slate-50 border p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-500">{doublesTranslate('tournamentFee')}</span>
                  <span className="text-slate-900 font-bold">{formatCurrency(Number(tournament.entryFee))} {doublesTranslate('perTeam')}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>{doublesTranslate('paymentStatus')}</span>
                  {participant.isPaid ? (
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">{doublesTranslate('paid')}</span>
                  ) : (
                    <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">{doublesTranslate('awaitingPayment')}</span>
                  )}
                </div>
              </div>

              {participant?.paymentEligible === true && (
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleWithdrawClick}
                            disabled={isWithdrawing}
                    className="flex-1 border-rose-200 hover:bg-rose-50 text-rose-600 font-bold py-3 text-sm flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" /> {doublesTranslate('withdrawAction')}
                  </Button>
                  <Button
                    onClick={handlePayment}
                    className="flex-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/10"
                  >
                    <CreditCard className="w-4 h-4" /> {doublesTranslate('paymentAction')}
                  </Button>
                </div>
              )}

              {participant.isPaid && (
                <Button
                  onClick={() => router.push(`/tournaments/${tournament.id}`)}
                  className="w-full bg-slate-900 hover:bg-slate-855 text-white font-bold py-3 text-sm"
                >
                  {doublesTranslate('viewTournament')}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold p-4 rounded-lg text-center">
                {doublesTranslate('freeTournamentNotice')}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleWithdrawClick}
                            disabled={isWithdrawing}
                  className="flex-1 border-rose-200 hover:bg-rose-50 text-rose-600 font-bold py-3 text-sm flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> {doublesTranslate('withdrawAction')}
                </Button>
                <Button
                  onClick={() => router.push(`/tournaments/${tournament.id}`)}
                  className="flex-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm"
                >
                  {doublesTranslate('visitTournament')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Hoàn Tiền Thủ Công cho Đánh Đôi */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">{doublesTranslate('refundTitle')}</h3>
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-slate-650 p-1 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmWithdrawWithBank}>
              <div className="p-6 space-y-4.5">
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-xs text-slate-650 leading-relaxed font-semibold">
                  {doublesTranslate('refundDescription')}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{doublesTranslate('bankNameLabel')}</label>
                  <Input
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder={doublesTranslate('bankNamePlaceholder')}
                    className="font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{doublesTranslate('bankAccountNumberLabel')}</label>
                  <Input
                    required
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder={doublesTranslate('bankAccountNumberPlaceholder')}
                    className="font-bold text-slate-800 tracking-wider"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{doublesTranslate('bankAccountNameLabel')}</label>
                  <Input
                    required
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder={doublesTranslate('bankAccountNamePlaceholder')}
                    className="font-bold text-slate-800 uppercase"
                  />
                </div>

                {bankError && (
                  <p className="text-xs font-bold text-rose-600 animate-pulse">{bankError}</p>
                )}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg"
                >
                  {doublesTranslate('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isWithdrawing}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-rose-500/10"
                >
                  {isWithdrawing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  {doublesTranslate('confirmWithdraw')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
