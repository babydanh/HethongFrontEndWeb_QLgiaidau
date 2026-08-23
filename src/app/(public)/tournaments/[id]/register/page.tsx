'use client';

import { useEffect, useState, useMemo, use } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Trophy, Calendar, MapPin, Users, ArrowLeft, Loader2, CheckCircle, AlertTriangle, ShieldAlert, CreditCard, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Division,
  MyRegistrationParticipant,
  tournamentsApi,
  Tournament,
  TournamentParticipant,
} from '@/features/tournaments/api';
import { usersApi } from '@/features/users/api';
import { rankingsApi } from '@/features/rankings/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { cn } from '@/utils/cn';
import { getErrorMessage } from '@/utils/error';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { formatDate, formatCurrency } from '@/utils/format';
import { getSportLogo } from '@/constants/sports';
import { MatchTypeDB } from '@/types/tournament';
import toast from 'react-hot-toast';
import DoublesRegistrationFlow from './components/DoublesRegistrationFlow';
import TeamRegistrationFlow from './components/TeamRegistrationFlow';
import { divisionsApi } from '@/features/tournaments/api';
import { isClubLiteTournament } from '@/features/tournaments/lite-qr';
import { WithdrawModal } from '@/components/shared/WithdrawModal';
import { isTournamentDraft, isTournamentOpenForRegistration, isTournamentUpcoming } from '@/utils/tournament-status';
import { readRegistrationFormConfig } from '@/features/tournaments/registration-form';
import RegistrationCustomFields, { validateRegistrationResponses } from './components/RegistrationCustomFields';

const createRegisterSchema = (messages: { teamNameMinLength: string; teamNameTooLong: string }) => z.object({
  teamName: z.string().min(3, messages.teamNameMinLength).max(100, messages.teamNameTooLong),
});

type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;

type NormalizableDivision = {
  id: string;
  name: string;
  matchType?: string | null;
  genderRestriction?: string | null;
  status?: string;
  categoryId?: string;
  maxParticipants?: number;
  entryFee?: number;
  minElo?: number | null;
  maxElo?: number | null;
  bracketType?: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT' | null;
  _count?: {
    participants: number;
    matches?: number;
  };
};

const normalizeGenderValue = (value?: string | null): 'MALE' | 'FEMALE' | 'MIXED' | 'OTHER' | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === 'MALE' || normalized === 'NAM') {
    return 'MALE';
  }
  if (normalized === 'FEMALE' || normalized === 'NỮ' || normalized === 'NU') {
    return 'FEMALE';
  }
  if (normalized === 'MIXED') {
    return 'MIXED';
  }
  return 'OTHER';
};

const getDivisionMatchLabel = (matchType?: string | null, genderRestriction?: string | null, translate?: (key: string) => string) => {
  const singlesLabel = translate?.('singlesLabel') ?? 'Singles';
  const doublesLabel = translate?.('doublesLabel') ?? 'Doubles';
  const genderLabel =
    genderRestriction === 'MALE' ? (translate?.('maleLabel') ?? 'Male') :
    genderRestriction === 'FEMALE' ? (translate?.('femaleLabel') ?? 'Female') :
    genderRestriction === 'MIXED' ? (translate?.('mixedGenderLabel') ?? 'Mixed') : '';

  if (matchType === 'SINGLES') {
    return genderLabel ? `${singlesLabel} ${genderLabel}` : singlesLabel;
  }
  if (matchType === 'DOUBLES') {
    return genderLabel ? `${doublesLabel} ${genderLabel}` : doublesLabel;
  }
  if (matchType === 'MIXED_DOUBLES') {
    return translate?.('mixedDoublesLabel') ?? 'Mixed Doubles';
  }
  return translate?.('unknownLabel') ?? 'Unknown';
};

const normalizeMatchType = (value?: string | null): Division['matchType'] | undefined => {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'SINGLES' || normalized === 'SINGLE' || normalized === 'ĐƠN') {
    return MatchTypeDB.SINGLES;
  }
  if (normalized === 'MIXED_DOUBLES' || normalized === 'MIXED-DOUBLES' || normalized === 'ĐÔI NAM NỮ') {
    return MatchTypeDB.MIXED_DOUBLES;
  }
  if (normalized === 'DOUBLES' || normalized === 'DOUBLE' || normalized === 'ĐÔI') {
    return MatchTypeDB.DOUBLES;
  }
  return undefined;
};

const getDivisionBracketLabel = (bracketType?: string | null, translate?: (key: string) => string) => {
  if (bracketType === 'SINGLE_ELIMINATION') {
      return translate?.('singleElimination') ?? 'Single Elimination';
  }
  if (bracketType === 'DOUBLE_ELIMINATION') {
      return translate?.('doubleElimination') ?? 'Double Elimination';
  }
  if (bracketType === 'ROUND_ROBIN') {
      return translate?.('roundRobin') ?? 'Round Robin';
  }
  if (bracketType === 'GROUP_STAGE_KNOCKOUT') {
      return translate?.('groupStageKnockout') ?? 'Group Stage + Knockout';
  }
  return translate?.('unknownLabel') ?? 'Unknown';
};

const normalizeRegisteredParticipant = (
  participant?: MyRegistrationParticipant | TournamentParticipant | null,
): TournamentParticipant | null => {
  if (!participant) {
    return null;
  }

  return {
    ...participant,
    members: participant.members ?? ('teamMembers' in participant ? participant.teamMembers : undefined) ?? [],
  };
};

export default function TournamentRegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const router = useRouter();
  const translate = useTranslations('Common');
  const tournamentTranslate = useTranslations('TournamentDetail');
  const registrationTranslate = useTranslations('TournamentRegistration');
  const registerValidationSchema = createRegisterSchema({ teamNameMinLength: registrationTranslate('teamNameMinLength'), teamNameTooLong: registrationTranslate('teamNameTooLong') });
  const searchParams = useSearchParams();
  const urlInvite = searchParams.get('invite') || '';
  const requestedDivisionId = searchParams.get('divisionId') || '';

  const { user, isAuthenticated } = useAuthStore();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [participant, setParticipant] = useState<TournamentParticipant | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Division select states
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
  const [allDivisions, setAllDivisions] = useState<Division[]>([]);

  // Invite states for Private Tournaments
  const [inviteCode, setInviteCode] = useState(urlInvite);
  const [needInviteValidation, setNeedInviteValidation] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [isValidatingInvite, setIsValidatingInvite] = useState(false);
  const [rankingConsent, setRankingConsent] = useState(false);
  const [customResponses, setCustomResponses] = useState<Record<string, unknown>>({});

  const { register, handleSubmit } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerValidationSchema),
  });

  const normalizeDivision = (division: NormalizableDivision): Division => ({
    id: division.id,
    name: division.name,
    // Do not default missing API data to doubles; the UI will show "Chưa rõ".
    matchType: normalizeMatchType(division.matchType) as Division['matchType'],
    genderRestriction: (division.genderRestriction ?? null) as Division['genderRestriction'],
    status: division.status || 'DRAFT',
    categoryId: division.categoryId,
    maxParticipants: division.maxParticipants,
    entryFee: division.entryFee,
    minElo: division.minElo,
    maxElo: division.maxElo,
    bracketType: division.bracketType,
    _count: division._count
      ? {
          participants: division._count.participants,
          matches: division._count.matches ?? 0,
        }
      : undefined,
  });

  const buildSelectedDivision = (
    baseTournament: Tournament,
    division: Division,
  ): Tournament => ({
    ...baseTournament,
    name: division.name,
    matchType: division.matchType,
    genderRestriction: division.genderRestriction,
    format: division.bracketType ?? baseTournament.format,
    entryFee: division.entryFee ?? baseTournament.entryFee,
    maxParticipants: division.maxParticipants ?? baseTournament.maxParticipants,
    _count: division._count ?? baseTournament._count,
  });

  const applyDivisionSelection = (
    divisionList: NormalizableDivision[],
    baseTournament: Tournament,
    preferredDivisionId?: string,
  ) => {
    const normalizedDivisions = divisionList.map(normalizeDivision);
    setAllDivisions(normalizedDivisions);

    if (normalizedDivisions.length === 0) {
      setSelectedDivisionId('');
      return;
    }

    const preferredDivision = preferredDivisionId
      ? normalizedDivisions.find((division) => division.id === preferredDivisionId)
      : null;
    const nextDivisionId = preferredDivision?.id ?? normalizedDivisions[0].id;
    setSelectedDivisionId(nextDivisionId);
  };

  const fetchTournament = async (code?: string) => {
    try {
      setIsLoading(true);
      const paramsObj: Record<string, unknown> = {};
      if (code) {
        paramsObj.invite = code;
      } else if (inviteCode) {
        paramsObj.invite = inviteCode;
      }

      const res = await tournamentsApi.getTournamentById(id, paramsObj);
      if (res.data) {
        const t = res.data;
        setTournament(t);

        // Only Club Lite uses the one-tap join page. Public Quick Create is
        // persisted through the Lite API for compatibility, but registration
        // must use this full flow (especially doubles partner registration).
        if (isClubLiteTournament(t)) {
          if (t.inviteCode) {
            router.replace(`/lite/tournaments/join/${t.inviteCode}`);
          } else {
            toast.error(registrationTranslate('quickTournamentNoJoinLink'));
            router.push('/tournaments');
          }
          return;
        }

        const regMode = t.tournamentConfig?.registrationMode || 'OPEN';
        if (regMode === 'INVITE_ONLY' && !inviteCode) {
          setNeedInviteValidation(true);
        } else {
          setNeedInviteValidation(false);
        }

        try {
          const divisionRes = await divisionsApi.getDivisions(t.id);
          const divisionSource =
            divisionRes.data && divisionRes.data.length > 0
              ? divisionRes.data
              : t.divisions || [];

          if (divisionSource.length > 0) {
            applyDivisionSelection(divisionSource, t, requestedDivisionId);
          } else {
            setSelectedDivisionId('');
            setAllDivisions([]);
          }
        } catch (e) {
          console.error('Failed to fetch division context', e);
          setSelectedDivisionId('');
          setAllDivisions([]);
        }

      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { status?: number } };
      if (errorResponse.response?.status === 403 || errorResponse.response?.status === 400) {
        setNeedInviteValidation(true);
      } else {
        toast.error(registrationTranslate('tournamentLoadFailed'));
        router.push('/tournaments');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchTournament();
    });
  }, [id, inviteCode, isAuthenticated, requestedDivisionId]);

  useEffect(() => {
    const fetchRegistrationStatus = async () => {
      if (!isAuthenticated || !tournament) {
        setParticipant(null);
        setIsRegistered(false);
        return;
      }

      try {
        const regRes = await tournamentsApi.getMyRegistration(
          id,
          selectedDivisionId || undefined,
        );
        const normalizedParticipant = normalizeRegisteredParticipant(regRes.data?.participant);
        if (regRes.data?.registered && normalizedParticipant) {
          setParticipant(normalizedParticipant);
          setIsRegistered(true);
          if (normalizedParticipant.tournamentDivisionId && normalizedParticipant.tournamentDivisionId !== selectedDivisionId) {
            setSelectedDivisionId(normalizedParticipant.tournamentDivisionId);
          }
        } else {
          setParticipant(null);
          setIsRegistered(false);
        }
      } catch (e) {
        console.error('Failed to fetch user registration status', e);
      }
    };

    fetchRegistrationStatus();
  }, [id, isAuthenticated, selectedDivisionId, tournament]);

  // Bank refund form modal states
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankError, setBankError] = useState('');

  const buildTournamentDetailHref = (tournamentId: string) => {
    const params = new URLSearchParams();
    if (inviteCode) {
      params.set('invite', inviteCode);
    }
    if (selectedDivisionId) {
      params.set('divisionId', selectedDivisionId);
    }
    return `/tournaments/${tournamentId}${params.toString() ? `?${params.toString()}` : ''}`;
  };

  const buildCheckoutHref = (participantId: string) => {
    const params = new URLSearchParams({
      participantId,
      tournamentId: id,
    });
    if (selectedDivisionId) {
      params.set('divisionId', selectedDivisionId);
    }
    if (inviteCode) {
      params.set('invite', inviteCode);
    }
    return `/payments/checkout?${params.toString()}`;
  };

  const handleWithdrawClick = async () => {
    if (participant?.isPaid && Number(selectedDivision?.entryFee) > 0) {
      // Open modal to get bank info
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
      // Free tournament or unpaid, can withdraw immediately with confirmation
      if (confirm(registrationTranslate('withdrawConfirm'))) {
        executeWithdraw();
      }
    }
  };

  const executeWithdraw = async (bankData?: { bankName: string; bankAccountNumber: string; bankAccountName: string }) => {
    try {
      setIsWithdrawing(true);
      await tournamentsApi.withdraw(id, bankData, selectedDivisionId || undefined);
      toast.success(registrationTranslate('withdrawalSuccess'));
      setParticipant(null);
      setIsRegistered(false);
      setShowWithdrawModal(false);
      fetchTournament();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleConfirmWithdrawWithBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountName.trim()) {
      setBankError(registrationTranslate('bankFieldsRequired'));
      return;
    }
    executeWithdraw({
      bankName: bankName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankAccountName: bankAccountName.trim().toUpperCase(),
    });
  };


  const handleValidateInviteCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = trimAndNormalizeSpaces(inviteInput);
    if (!cleanCode) {
      toast.error(registrationTranslate('inviteCodeRequired'));
      return;
    }

    try {
      setIsValidatingInvite(true);
      const res = await tournamentsApi.validateInvite(id, cleanCode);
      if (res.data) {
        setInviteCode(cleanCode);
        setTournament(res.data);
        setNeedInviteValidation(false);
        toast.success(registrationTranslate('inviteConfirmed'));
      }
    } catch (err) {
      toast.error(translate('invalidInvite'));
    } finally {
      setIsValidatingInvite(false);
    }
  };

  const onSubmitSingles = async (data: RegisterFormValues) => {
    if (!isAuthenticated || !user) {
      toast.error(translate('loginToRegister'))
      const params = new URLSearchParams();
      if (inviteCode) {
        params.set('invite', inviteCode);
      }
      if (selectedDivisionId) {
        params.set('divisionId', selectedDivisionId);
      }
      const redirectUrl = `/tournaments/${id}/register${params.toString() ? `?${params.toString()}` : ''}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    if (!selectedDivision) {
      toast.error(registrationTranslate('registrationModeRequired'));
      return;
    }

    if (selectedDivisionData && eloCheck && !eloCheck.ok) {
      toast.error(eloCheck.message || registrationTranslate('eloMismatch'));
      return;
    }

    if (tournament?.isRanked && !rankingConsent) {
      toast.error(registrationTranslate('eloConsentRequired'));
      return;
    }

    const customError = validateRegistrationResponses(registrationFields, customResponses, registrationTranslate);
    if (customError) {
      toast.error(customError);
      return;
    }

    try {
      setIsSubmitting(true);
      const cleanData = {
        teamName: trimAndNormalizeSpaces(data.teamName) || user?.fullName || registrationTranslate('athleteFallback'),
        inviteCode: inviteCode || undefined,
        tournamentDivisionId: selectedDivisionId || undefined,
        rankingConsent,
        customResponses,
      };

      const res = await tournamentsApi.register(id, cleanData);
      const participantId = res?.data?.participant?.id;

      toast.success(translate('registrationSuccess'))

      if (entryFeeVal > 0 && participantId) {
        const params = new URLSearchParams({
          tournamentId: id,
          participantId,
        });
        if (selectedDivisionId) {
          params.set('divisionId', selectedDivisionId);
        }
        if (inviteCode) {
          params.set('invite', inviteCode);
        }
        router.push(`/payments/checkout?${params.toString()}`);
      } else {
        const params = new URLSearchParams();
        if (inviteCode) {
          params.set('invite', inviteCode);
        }
        if (selectedDivisionId) {
          params.set('divisionId', selectedDivisionId);
        }
        router.push(`/tournaments/${id}${params.toString() ? `?${params.toString()}` : ''}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is not logged in, show redirect info
  useEffect(() => {
    if (!isLoading && !needInviteValidation && !isAuthenticated) {
      toast.error(translate('loginToRegister'))
      const params = new URLSearchParams();
      if (inviteCode) {
        params.set('invite', inviteCode);
      }
      if (selectedDivisionId) {
        params.set('divisionId', selectedDivisionId);
      }
      const redirectUrl = `/tournaments/${id}/register${params.toString() ? `?${params.toString()}` : ''}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
    }
  }, [isLoading, needInviteValidation, isAuthenticated, id, inviteCode, router, selectedDivisionId]);

  const selectedDivisionData = allDivisions.find((division) => division.id === selectedDivisionId) ?? null;
  const selectedDivision = tournament && selectedDivisionData
    ? buildSelectedDivision(tournament, selectedDivisionData)
    : tournament;

  const [eloCheck, setEloCheck] = useState<{ ok: boolean; message?: string } | null>(null);
  const [eloLoading, setEloLoading] = useState(false);

  useEffect(() => {
    if (!selectedDivisionData || !user?.id || !selectedDivisionData.categoryId) {
      return;
    }

    const categoryId = selectedDivisionData.categoryId;

    const checkElo = async () => {
      setEloLoading(true);
      try {
        const res = await rankingsApi.getUserRank(user.id, categoryId);
        const elo = res.eloPoints || 1000;
        const minElo = selectedDivisionData.minElo || 0;
        const maxElo = selectedDivisionData.maxElo || 9999;

        if (elo < minElo) {
          setEloCheck({ ok: false, message: registrationTranslate('eloBelowMinimum', { elo, minElo }) });
        } else if (elo > maxElo) {
          setEloCheck({ ok: false, message: registrationTranslate('eloAboveMaximum', { elo, maxElo }) });
        } else {
          setEloCheck({ ok: true, message: registrationTranslate('eloMatches', { elo }) });
        }
      } catch {
        setEloCheck(null);
      } finally {
        setEloLoading(false);
      }
    };

    checkElo();
  }, [selectedDivisionData?.id, user?.id]);

  // Derived state to avoid cascading state updates in useEffect
  const currentEloCheck = (!selectedDivisionData || !user?.id || !selectedDivisionData.categoryId) ? null : eloCheck;

  const configuredRegistrationForm = useMemo(
    () => readRegistrationFormConfig(tournament?.tournamentConfig?.registrationForm, allDivisions.map((division) => division.id)),
    [tournament?.tournamentConfig?.registrationForm, allDivisions],
  );

  const registrationFields = useMemo(() => {
    return configuredRegistrationForm.status === 'PUBLISHED' &&
      (configuredRegistrationForm.divisionIds.length === 0 || configuredRegistrationForm.divisionIds.includes(selectedDivisionId))
      ? configuredRegistrationForm.fields
      : [];
  }, [configuredRegistrationForm, selectedDivisionId]);

  useEffect(() => {
    if (!user || registrationFields.length === 0) return;

    setCustomResponses((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const field of registrationFields) {
        if (next[field.id] !== undefined && next[field.id] !== '') continue;

        const labelLower = field.label.toLowerCase();
        const isEmailField = field.type === 'EMAIL' || labelLower.includes('email') || labelLower.includes('gmail');
        const isPhoneField = field.type === 'PHONE' || labelLower.includes('điện thoại') || labelLower.includes('sđt') || labelLower.includes('phone');

        if (isEmailField && user.email) {
          next[field.id] = user.email;
          changed = true;
        } else if (isPhoneField && user.phoneNumber) {
          next[field.id] = user.phoneNumber;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [user, registrationFields]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium text-sm">{registrationTranslate('loadingTournament')}</p>
      </div>
    );
  }

  // Render invite code prompt for private tournaments
  if (needInviteValidation) {
    const isInviteOnlyMode = tournament?.tournamentConfig?.registrationMode === 'INVITE_ONLY';
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-105 text-blue-600 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {isInviteOnlyMode ? registrationTranslate('inviteOnlyTitle') : registrationTranslate('privateTournamentTitle')}
            </h2>
            <p className="text-slate-500 text-xs leading-relaxed">
{isInviteOnlyMode
                ? registrationTranslate('inviteOnlyDescription')
                : registrationTranslate('privateTournamentDescription')}
            </p>
          </div>

          <form onSubmit={handleValidateInviteCode} className="space-y-4">
            <Input
              label={registrationTranslate('inviteCodeLabel')}
              placeholder={registrationTranslate('inviteCodePlaceholder')}
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              className="text-center font-bold tracking-widest text-lg"
              maxLength={20}
              disabled={isValidatingInvite}
            />

            <Button
              type="submit"
              disabled={isValidatingInvite || !inviteInput.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 flex items-center justify-center gap-1.5"
            >
              {isValidatingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : registrationTranslate('validateInvite')}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/tournaments')}
              className="w-full border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold"
            >
              {registrationTranslate('backToTournamentList')}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (!tournament) return null;



  const isLocked = tournament.isRegistrationLocked;
  const isExpired = tournament.registrationEndDate ? new Date() > new Date(tournament.registrationEndDate) : false;
  // Cho phép đăng ký sớm nếu đang là DRAFT nhưng có inviteCode trùng khớp
  const isDraftInviteOnly = isTournamentDraft(tournament.status) && inviteCode && tournament.inviteCode === inviteCode;
  const isNotOpen =
    !isTournamentOpenForRegistration(tournament.status) &&
    !isTournamentUpcoming(tournament.status) &&
    !isDraftInviteOnly;

  const isProfileIncomplete = isAuthenticated && user && (!user.fullName || !user.phoneNumber || !user.gender);

  if (isProfileIncomplete) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center animate-in fade-in duration-200">
        <div className="max-w-md w-full bg-white p-8 rounded-lg border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{registrationTranslate('profileIncompleteTitle')}</h2>
            <p className="text-slate-550 text-xs leading-relaxed font-semibold">
              {registrationTranslate('profileIncompleteDescription')}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => router.push('/profile')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg shadow-md"
          >
            {registrationTranslate('updateProfileNow')}
          </Button>
        </div>
      </div>
    );
  }

  if (isLocked || isExpired || isNotOpen) {
    let title = tournamentTranslate('registrationClosed');
    let message = tournamentTranslate('registrationClosed');
    if (isLocked) {
      title = tournamentTranslate('registrationLocked');
      message = tournamentTranslate('registrationLockedNotice');
    } else if (isExpired) {
      title = tournamentTranslate('registrationExpired');
      message = tournamentTranslate('registrationExpiredNotice');
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
            onClick={() => router.push(buildTournamentDetailHref(tournament.id))}
            className="w-full border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold"
          >
            {registrationTranslate('backToTournament')}
          </Button>
        </div>
      </div>
    );
  }

  const entryFeeVal = selectedDivision ? Number(selectedDivision.entryFee || 0) : 0;
  const isDoubles = selectedDivision ? (selectedDivision.matchType === 'DOUBLES' || selectedDivision.matchType === 'MIXED_DOUBLES') : false;
  // Team sport (bóng đá): config có teamSize → đăng ký đội nhiều người.
  const isFootballCategory = tournament?.category?.slug?.toLowerCase() === 'football' || tournament?.sportRules?.kind === 'FOOTBALL';
  const isTeamSport = isFootballCategory || (tournament?.tournamentConfig?.teamSize != null || tournament?.tournamentConfig?.minTeamSize != null);
  const effectiveFootballTeamSize = tournament?.tournamentConfig?.teamSize ?? (isFootballCategory ? 11 : 7);

  const userGender = normalizeGenderValue(user?.gender);
  const divisionGender = normalizeGenderValue(selectedDivision?.genderRestriction);
  const isGenderMismatched =
    userGender &&
    divisionGender &&
    divisionGender !== 'MIXED' &&
    userGender !== divisionGender;

  return (
    <div className="min-h-screen bg-slate-50 py-8 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push(buildTournamentDetailHref(tournament.id))}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {registrationTranslate('backToTournament')}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (5/12) - Sticky tournament info and division selector */}
          <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24">
            {/* Tournament Hero Card with Banner & Modern Clean Look */}
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all">
              {/* Banner Image or Sport Gradient Cover */}
              <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-slate-100">
                {tournament.bannerUrl ? (
                  <img
                    src={tournament.bannerUrl}
                    alt={tournament.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />

                {/* Badges on Banner */}
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-sm">
                    {tournament.category?.name || registrationTranslate('sportFallback')}
                  </span>
                  {tournament.visibility === 'PRIVATE' && (
                    <span className="rounded-full bg-blue-600/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      {translate('privateInvite')}
                    </span>
                  )}
                </div>
              </div>

              {/* Tournament Details Content */}
              <div className="p-5 sm:p-6 space-y-4">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-snug">
                  {tournament.name}
                </h1>

                <div className="grid grid-cols-1 gap-2.5 text-xs text-slate-600 border-t border-slate-100 pt-3.5">
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-500 font-medium">{translate('openingDate')}:</span>
                    <span className="font-semibold text-slate-900">{tournament.startDate ? formatDate(tournament.startDate) : translate('notUpdated')}</span>
                  </div>
                  {tournament.locationAddress && (
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-slate-500 font-medium">{registrationTranslate('locationLabel')}:</span>
                      <span className="font-semibold text-slate-900 truncate max-w-[200px]" title={tournament.locationAddress}>{tournament.locationAddress}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-500 font-medium">{registrationTranslate('formatLabel')}:</span>
                    <span className="font-bold text-blue-600">{
                      tournament.format === 'SINGLE_ELIMINATION' ? registrationTranslate('singleElimination') :
                      tournament.format === 'DOUBLE_ELIMINATION' ? registrationTranslate('doubleElimination') :
                      tournament.format === 'ROUND_ROBIN' ? registrationTranslate('roundRobin') :
                      tournament.format === 'GROUP_STAGE_KNOCKOUT' ? registrationTranslate('groupStageKnockout') : tournament.format
                    }</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Division selector cards */}
            {allDivisions.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {registrationTranslate('selectCompetitionContent')}
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {registrationTranslate('selectCompetitionHelp')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                  {allDivisions.map((div) => {
                    const isActive = selectedDivisionId === div.id;
                    const matchLabel = getDivisionMatchLabel(div.matchType, div.genderRestriction, registrationTranslate);
                    const bracketLabel = getDivisionBracketLabel(div.bracketType, registrationTranslate);
                    const participantCount = div._count?.participants ?? 0;
                    return (
                      <button
                        key={div.id}
                        type="button"
                        onClick={() => setSelectedDivisionId(div.id)}
                        disabled={isSubmitting}
                        className={cn(
                          'relative w-full cursor-pointer rounded-xl border p-3.5 text-xs font-bold transition-all text-left',
                          'flex items-center justify-between gap-3',
                          isActive
                            ? 'border-transparent text-white shadow-md'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/20',
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeDivision"
                            className="absolute inset-0 bg-blue-600 rounded-xl z-0"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <div className="relative z-10 flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-bold leading-tight truncate">{div.name}</span>
                          <span className={`text-[10px] font-bold ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                            {matchLabel} • {bracketLabel}
                          </span>
                          <span className={`text-[9px] font-semibold ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
                            {registrationTranslate('participantCount', { count: participantCount, max: div.maxParticipants ? ` / ${div.maxParticipants}` : '' })}
                            {(div.minElo != null || div.maxElo != null) && ` • ELO: ${div.minElo ?? 0} - ${div.maxElo ?? '∞'}`}
                          </span>
                        </div>
                        <span className={cn(
                          'relative z-10 shrink-0 text-xs font-bold px-2.5 py-1 rounded-full',
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700',
                        )}>
                          {Number(div.entryFee ?? 0) > 0 ? formatCurrency(Number(div.entryFee)) : translate('free')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedDivision && (
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3.5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">{registrationTranslate('selectedContent')}:</span>
                      <span className="font-bold text-slate-900">{selectedDivision.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">{registrationTranslate('matchFee')}:</span>
                      <span className="font-bold text-blue-600">
                        {entryFeeVal > 0 ? formatCurrency(entryFeeVal) : translate('free')}
                      </span>
                    </div>

                    {/* ELO Check UI */}
                    {selectedDivision && eloLoading && (
                      <div className="pt-1 text-xs text-slate-400 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> {registrationTranslate('checkingElo')}
                      </div>
                    )}
                    {eloCheck && !eloCheck.ok && (
                      <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 font-semibold">
                        ⚠️ {eloCheck.message}
                      </div>
                    )}
                    {eloCheck?.ok && (
                      <div className="mt-1 text-xs text-emerald-700 font-medium">
                        ✓ {eloCheck.message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column (7/12) - Main Form & Registration Flow */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
              {selectedDivision ? (
                <>
                {isGenderMismatched ? (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-6 text-center space-y-3 animate-in fade-in duration-200">
                    <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
                    <p className="text-base font-bold text-rose-900">{registrationTranslate('genderMismatch')}</p>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed max-w-md mx-auto">
                      {registrationTranslate('genderOnlyFor', { content: selectedDivision?.name || registrationTranslate('singlesLabel') })}{' '}
                      <strong>{divisionGender === 'MALE' ? registrationTranslate('maleLabel') : registrationTranslate('femaleLabel')}</strong>. {registrationTranslate('profileGenderIs')}{' '}
                      <strong>{userGender === 'MALE' ? registrationTranslate('maleLabel') : userGender === 'FEMALE' ? registrationTranslate('femaleLabel') : registrationTranslate('otherGenderLabel')}</strong>.
                    </p>
                    <Button
                      onClick={() => router.push('/profile')}
                      variant="outline"
                      className="border-slate-200 text-rose-700 hover:bg-rose-100 text-xs font-bold px-4 h-9 mx-auto block"
                    >
                      {registrationTranslate('changeProfileGender')}
                    </Button>
                  </div>
                ) : isTeamSport ? (
                  <TeamRegistrationFlow
                    tournamentId={id}
                    inviteCode={inviteCode}
                    divisionId={selectedDivisionId || undefined}
                    categoryId={selectedDivision?.categoryId}
                    currentUserId={user?.id}
                    participantId={participant?.id}
                    participantTeamId={participant?.footballTeamId}
                    rosterLockedAt={participant?.rosterLockedAt}
                    teamSize={effectiveFootballTeamSize}
                    maxTeamSize={tournament?.tournamentConfig?.maxTeamSize}
                    maxReserve={tournament?.tournamentConfig?.maxReserve ?? 0}
                    registrationMode={tournament?.tournamentConfig?.registrationMode}
                    isRanked={Boolean(tournament?.isRanked)}
                    rankingConsent={rankingConsent}
                    onRankingConsentChange={setRankingConsent}
                    rankingConsentLabel={registrationTranslate('rankingConsentPrefix')}
                    rankingConsentCondition={registrationTranslate('rankedContentCondition')}
                    rankingConsentRequiredMessage={registrationTranslate('eloConsentRequired')}
                    customResponses={customResponses}
                    onCustomResponsesChange={setCustomResponses}
                    registrationFields={registrationFields}
                    onRegistrationChanged={() => fetchTournament()}
                  />
                ) : isDoubles ? (
                  <DoublesRegistrationFlow
                    tournament={selectedDivision}
                    tournamentId={id}
                    inviteCode={inviteCode}
                    divisionId={selectedDivisionId || undefined}
                    customResponses={customResponses}
                    onCustomResponsesChange={setCustomResponses}
                    registrationFields={registrationFields}
                  />
                ) : isRegistered && participant ? (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {participant.teamStatus === 'COMPLETE'
                          ? registrationTranslate('approvedRegistrationSuccess')
                          : (tournament?.tournamentConfig?.registrationMode === 'APPROVAL') ? registrationTranslate('approvalRequestSubmitted') : registrationTranslate('openRegistrationSuccess')}
                      </h3>
                      <p className="text-slate-500 text-xs max-w-sm mx-auto">
                        {participant.teamStatus === 'COMPLETE'
                                                    ? registrationTranslate('approvedRegistrationDescription')
                          : (tournament?.tournamentConfig?.registrationMode === 'APPROVAL')
                            ? registrationTranslate('approvalRequestDescription')
                            : <>{registrationTranslate('singlesRegistrationDescription')} <strong className="text-slate-700">{selectedDivision?.name}</strong>.</>}
                      </p>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      <div className="bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {registrationTranslate('registrationInfo')}: {participant.teamName}
                      </div>
                      <div className="px-4 py-3 flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">{registrationTranslate('fullNameLabel')}:</span>
                        <span className="text-slate-900 font-bold">{user?.fullName}</span>
                      </div>
                      <div className="px-4 py-3 flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">{registrationTranslate('feeStatus')}:</span>
                        {participant.isPaid ? (
                          <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-xs">{registrationTranslate('closedStatus')}</span>
                        ) : (
                          <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 text-xs">{translate('pendingPayment')}</span>
                        )}
                      </div>
                    </div>

                    {entryFeeVal > 0 ? (
                      <div className="space-y-4">
                        {!participant.isPaid && (
                          <div className="flex gap-3 pt-2">
                            <Button
                              variant="outline"
                              onClick={handleWithdrawClick}
                              disabled={isWithdrawing}
                              className="flex-1 border-rose-200 hover:bg-rose-50 text-rose-600 font-bold py-3 text-sm flex items-center justify-center gap-1.5 h-12"
                            >
                              <Trash2 className="w-4 h-4" /> {registrationTranslate('cancelAndWithdraw')}
                            </Button>
                            <Button
                              onClick={() => {
                                router.push(buildCheckoutHref(participant.id));
                              }}
                              className="flex-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 h-12"
                            >
                              <CreditCard className="w-4 h-4" /> {registrationTranslate('paymentLabel')}
                            </Button>
                          </div>
                        )}

                        {participant.isPaid && (
                          <div className="space-y-3">
                            <Button
                              variant="outline"
                              onClick={handleWithdrawClick}
                              disabled={isWithdrawing}
                              className="w-full border-rose-200 hover:bg-rose-50 text-rose-600 font-bold py-2.5 text-sm flex items-center justify-center gap-1.5 h-11"
                            >
                              <Trash2 className="w-4 h-4" /> {translate('withdraw')}
                            </Button>
                            <Button
                              onClick={() => router.push(buildTournamentDetailHref(id))}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-sm h-11"
                            >
                              {registrationTranslate('backToTournament')}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold p-4 rounded-xl text-center">
                          {translate('freeRegistrationComplete')}
                        </div>

                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={handleWithdrawClick}
                            disabled={isWithdrawing}
                            className="flex-1 border-rose-200 hover:bg-rose-50 text-rose-600 font-bold py-3 text-sm flex items-center justify-center gap-1.5 h-12"
                          >
                            <Trash2 className="w-4 h-4" /> {translate('withdraw')}
                          </Button>
                          <Button
                            onClick={() => router.push(buildTournamentDetailHref(id))}
                            className="flex-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm h-12"
                          >
                            {translate('openTournament')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" /> {translate('registerSingles')}
                      </h2>
                      <p className="text-slate-500 text-xs mt-1">
                        {translate('enterCompetitionName')}
                      </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmitSingles)} className="space-y-5">
                      {tournament?.isRanked && (
                        <label className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={rankingConsent}
                            onChange={(event) => setRankingConsent(event.target.checked)}
                            className="mt-1 h-4 w-4 accent-sky-600"
                          />
                          <span>
                            {registrationTranslate('rankingConsentPrefix')}
                            <span className="mt-1 block text-xs text-slate-500">
                              {registrationTranslate('rankedContentCondition')}
                            </span>
                          </span>
                        </label>
                      )}
                      {/* Thẻ thông tin Vận động viên */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
<span className="text-xs font-bold uppercase tracking-wider text-slate-500">{registrationTranslate('athleteInfoTitle')}</span>
                          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{registrationTranslate('primaryAccount')}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-500 block">{registrationTranslate('fullNameFieldLabel')}</span>
                            <span className="font-bold text-slate-900 text-sm">{user?.fullName || translate('notUpdated')}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">{registrationTranslate('phoneFieldLabel')}</span>
                            <span className="font-semibold text-slate-800">{user?.phoneNumber || translate('notUpdated')}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">{registrationTranslate('emailFieldLabel')}</span>
                            <span className="font-semibold text-slate-800 truncate block">{user?.email || translate('notUpdated')}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">{registrationTranslate('registrationContentLabel')}</span>
                            <span className="font-bold text-blue-600">{selectedDivision?.name || registrationTranslate('singlesLabel')}</span>
                          </div>
                        </div>
                        <input type="hidden" {...register('teamName')} value={user?.fullName || registrationTranslate('athleteFallback')} />
                      </div>

                      {/* Thông tin đăng ký bổ sung (Custom Fields) */}
                      {registrationFields && registrationFields.length > 0 && (
                        <RegistrationCustomFields
                          tournamentId={id}
                          fields={registrationFields}
                          responses={customResponses}
                          onChange={(fieldId, value) =>
                            setCustomResponses((current) => ({ ...current, [fieldId]: value }))
                          }
                        />
                      )}

                      {/* Chi tiết lệ phí & xác nhận */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                        <div className="flex justify-between items-center text-xs text-slate-600">
<span>{registrationTranslate('registrationModeLabel')}</span>
                          <span className="font-semibold text-slate-800">{registrationTranslate('singlesRegistrationMode')}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-600">
<span>{registrationTranslate('competitionFormatLabel')}</span>
                          <span className="font-semibold text-slate-800">
                            {selectedDivision?.format === 'ROUND_ROBIN' ? registrationTranslate('formatRoundRobinLabel') :
                             selectedDivision?.format === 'GROUP_STAGE_KNOCKOUT' ? registrationTranslate('formatGroupStageKnockoutLabel') :
                             selectedDivision?.format === 'DOUBLE_ELIMINATION' ? registrationTranslate('formatDoubleEliminationLabel') : registrationTranslate('formatSingleEliminationLabel')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200/80">
                          <span className="text-slate-700 font-bold">{translate('entryFee')}:</span>
                          <span className="font-extrabold text-base text-blue-600">
                            {entryFeeVal > 0 ? formatCurrency(entryFeeVal) : translate('free')}
                          </span>
                        </div>
                      </div>

                      {/* Lưu ý & Quy định thi đấu */}
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2 text-xs text-slate-600">
<p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">{registrationTranslate('beforeConfirmationTitle')}</p>
                        <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-500 list-disc list-inside">
                          <li>{registrationTranslate('beforeConfirmationPresence')}</li>
                          <li>{registrationTranslate('beforeConfirmationEquipment')}</li>
                          <li>{registrationTranslate('beforeConfirmationTracking')}</li>
                        </ul>
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 text-sm"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> {translate('processingRegistration')}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            {translate('confirmTournamentRegistration')}
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                )}
                </>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-sm font-semibold">{registrationTranslate('selectContentToContinue')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        tournamentId={id}
        divisionId={selectedDivisionId || undefined}
        isPaid={participant?.isPaid || false}
        defaultBankName={bankName}
        defaultBankAccountNumber={bankAccountNumber}
        defaultBankAccountName={bankAccountName}
        onWithdrawSuccess={() => {
          setParticipant(null);
          setIsRegistered(false);
          fetchTournament();
        }}
      />
    </div>
  );
}
