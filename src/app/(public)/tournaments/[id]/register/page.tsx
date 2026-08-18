'use client';

import { useEffect, useState, use } from 'react';
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

const registerSchema = z.object({
  teamName: z.string().min(3, 'Tên đội phải có ít nhất 3 ký tự').max(100, 'Tên đội quá dài'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

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

const getDivisionMatchLabel = (matchType?: string | null, genderRestriction?: string | null) => {
  const genderLabel =
    genderRestriction === 'MALE' ? 'Nam' :
    genderRestriction === 'FEMALE' ? 'Nữ' :
    genderRestriction === 'MIXED' ? 'Nam Nữ' : '';

  if (matchType === 'SINGLES') {
    return genderLabel ? `Đơn ${genderLabel}` : 'Đơn';
  }
  if (matchType === 'DOUBLES') {
    return genderLabel ? `Đôi ${genderLabel}` : 'Đôi';
  }
  if (matchType === 'MIXED_DOUBLES') {
    return 'Đôi Nam Nữ';
  }
  return 'Chưa rõ';
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

const getDivisionBracketLabel = (bracketType?: string | null) => {
  if (bracketType === 'SINGLE_ELIMINATION') {
    return 'Loại trực tiếp';
  }
  if (bracketType === 'DOUBLE_ELIMINATION') {
    return 'Nhánh thắng/thua';
  }
  if (bracketType === 'ROUND_ROBIN') {
    return 'Vòng tròn';
  }
  if (bracketType === 'GROUP_STAGE_KNOCKOUT') {
    return 'Vòng bảng + Loại trực tiếp';
  }
  return 'Chưa rõ';
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

  const { register, handleSubmit } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
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
            toast.error('Giải đấu nhanh chưa có đường dẫn tham gia.');
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
        toast.error('Không thể tải thông tin giải đấu. Có thể giải đấu không tồn tại.');
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
      if (confirm('Bạn có chắc chắn muốn hủy đăng ký và rút lui khỏi giải đấu?')) {
        executeWithdraw();
      }
    }
  };

  const executeWithdraw = async (bankData?: { bankName: string; bankAccountNumber: string; bankAccountName: string }) => {
    try {
      setIsWithdrawing(true);
      await tournamentsApi.withdraw(id, bankData, selectedDivisionId || undefined);
      toast.success('Đã rút khỏi giải đấu thành công.');
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
      setBankError('Vui lòng điền đầy đủ 3 trường thông tin ngân hàng.');
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
      toast.error('Vui lòng nhập mã mời');
      return;
    }

    try {
      setIsValidatingInvite(true);
      const res = await tournamentsApi.validateInvite(id, cleanCode);
      if (res.data) {
        setInviteCode(cleanCode);
        setTournament(res.data);
        setNeedInviteValidation(false);
        toast.success('Xác nhận mã mời thành công!');
      }
    } catch (err) {
      toast.error('Mã mời không đúng hoặc đã hết hạn.');
    } finally {
      setIsValidatingInvite(false);
    }
  };

  const onSubmitSingles = async (data: RegisterFormValues) => {
    if (!isAuthenticated || !user) {
      toast.error('Vui lòng đăng nhập để đăng ký tham gia giải đấu');
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
      toast.error('Vui lòng chọn hình thức đăng ký thi đấu');
      return;
    }

    if (selectedDivisionData && eloCheck && !eloCheck.ok) {
      toast.error(eloCheck.message || 'ELO của bạn không phù hợp với nội dung này.');
      return;
    }

    if (tournament?.isRanked && !rankingConsent) {
      toast.error('Vui lòng đồng ý cho phép lưu và hiển thị kết quả, điểm ELO trên bảng xếp hạng.');
      return;
    }

    try {
      setIsSubmitting(true);
      const cleanData = {
        teamName: trimAndNormalizeSpaces(data.teamName) || user?.fullName || 'Vận động viên',
        inviteCode: inviteCode || undefined,
        tournamentDivisionId: selectedDivisionId || undefined,
        rankingConsent,
      };

      const res = await tournamentsApi.register(id, cleanData);
      const participantId = res?.data?.participant?.id;

      toast.success('Đăng ký tham gia thành công!');

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
      toast.error('Vui lòng đăng nhập trước khi tiến hành đăng ký.');
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
          setEloCheck({ ok: false, message: `ELO của bạn (${elo}) thấp hơn yêu cầu tối thiểu (${minElo}) cho nội dung này.` });
        } else if (elo > maxElo) {
          setEloCheck({ ok: false, message: `ELO của bạn (${elo}) cao hơn yêu cầu tối đa (${maxElo}) cho nội dung này.` });
        } else {
          setEloCheck({ ok: true, message: `ELO của bạn (${elo}) phù hợp với nội dung này.` });
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium text-sm">Đang tải thông tin giải đấu...</p>
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
              {isInviteOnlyMode ? 'Giải đấu yêu cầu mã mời' : 'Giải đấu riêng tư'}
            </h2>
            <p className="text-slate-500 text-xs leading-relaxed">
              {isInviteOnlyMode
                ? 'Giải đấu này ở chế độ chỉ nhận mã mời. Vui lòng nhập mã mời (Invite Code) do Ban tổ chức cung cấp để mở khóa trang đăng ký.'
                : 'Giải đấu này đang ở chế độ riêng tư. Vui lòng nhập mã mời (Invite Code) do Ban tổ chức cung cấp để mở khóa trang đăng ký.'}
            </p>
          </div>

          <form onSubmit={handleValidateInviteCode} className="space-y-4">
            <Input
              label="Mã mời đăng ký"
              placeholder="Nhập mã mời 8 ký tự..."
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
              {isValidatingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xác thực mã mời'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/tournaments')}
              className="w-full border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold"
            >
              Quay lại danh sách giải
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
            <h2 className="text-xl font-bold text-slate-900">Hồ sơ chưa hoàn thiện</h2>
            <p className="text-slate-550 text-xs leading-relaxed font-semibold">
              Bạn cần cập nhật đầy đủ Họ tên, Số điện thoại và Giới tính trong hồ sơ cá nhân để được đăng ký tham gia giải đấu.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => router.push('/profile')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg shadow-md"
          >
            Cập nhật hồ sơ ngay
          </Button>
        </div>
      </div>
    );
  }

  if (isLocked || isExpired || isNotOpen) {
    let title = 'Đăng ký đã đóng';
    let message = 'Giải đấu hiện không nhận đăng ký mới.';
    if (isLocked) {
      title = 'Đăng ký đã khóa';
      message = 'Giải đấu đã tạm ngưng nhận đăng ký mới từ Ban tổ chức.';
    } else if (isExpired) {
      title = 'Đăng ký hết hạn';
      message = 'Hạn đăng ký giải đấu này đã kết thúc.';
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
            Quay lại trang giải đấu
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
          <ArrowLeft className="w-4 h-4" /> Quay lại giải đấu
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (5/12) - Sticky tournament info and division selector */}
          <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24">
            {/* Header Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 text-white rounded-2xl border border-slate-700/60 shadow-md p-6 sm:p-7 relative overflow-hidden">
              {tournament.visibility === 'PRIVATE' && (
                <div className="absolute top-4 right-4 bg-blue-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-md tracking-wider">
                  {translate('privateInvite')}
                </div>
              )}

              <span className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-400/20 uppercase tracking-wider mb-3">
                {(() => {
                  const logo = getSportLogo(tournament.category?.name);
                  return logo ? (
                    <img src={logo} alt={tournament.category?.name || ''} className="w-3 h-3 object-contain" />
                  ) : null;
                })()}
                {tournament.category?.name || 'Thể thao'}
              </span>

              <h1 className="text-xl sm:text-2xl font-bold leading-tight text-white mb-4">
                {tournament.name}
              </h1>

              <div className="space-y-2.5 text-xs font-medium text-slate-300 border-t border-slate-700/60 pt-4">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>{translate('openingDate')}: <strong className="text-white">{tournament.startDate ? formatDate(tournament.startDate) : translate('notUpdated')}</strong></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="truncate">{tournament.locationAddress || translate('notUpdated')}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Định dạng: <strong className="text-white">{
                      tournament.format === 'SINGLE_ELIMINATION' ? 'Loại trực tiếp (Single)' :
                      tournament.format === 'DOUBLE_ELIMINATION' ? 'Nhánh thắng thua (Double)' :
                      tournament.format === 'ROUND_ROBIN' ? 'Vòng tròn tính điểm' :
                      tournament.format === 'GROUP_STAGE_KNOCKOUT' ? 'Vòng bảng + Loại trực tiếp' : tournament.format
                    }</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Division selector cards */}
            {allDivisions.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Chọn nội dung thi đấu
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Chọn đúng nội dung bạn muốn tham gia trước khi điền thông tin đăng ký.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                  {allDivisions.map((div) => {
                    const isActive = selectedDivisionId === div.id;
                    const matchLabel = getDivisionMatchLabel(div.matchType, div.genderRestriction);
                    const bracketLabel = getDivisionBracketLabel(div.bracketType);
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
                            {participantCount}{div.maxParticipants ? ` / ${div.maxParticipants}` : ''} hồ sơ
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
                      <span className="text-slate-500 font-semibold">Nội dung đang chọn:</span>
                      <span className="font-bold text-slate-900">{selectedDivision.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Lệ phí thi đấu:</span>
                      <span className="font-bold text-blue-600">
                        {entryFeeVal > 0 ? formatCurrency(entryFeeVal) : translate('free')}
                      </span>
                    </div>

                    {/* ELO Check UI */}
                    {selectedDivision && eloLoading && (
                      <div className="pt-1 text-xs text-slate-400 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Đang kiểm tra ELO...
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
                isGenderMismatched ? (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-6 text-center space-y-3 animate-in fade-in duration-200">
                    <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
                    <p className="text-base font-bold text-rose-900">Giới tính không phù hợp</p>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed max-w-md mx-auto">
                      Nội dung thi đấu này ({selectedDivision?.name || 'Đơn'}) chỉ dành cho giới tính{' '}
                      <strong>{divisionGender === 'MALE' ? 'Nam' : 'Nữ'}</strong>. Giới tính trong hồ sơ của bạn hiện tại là{' '}
                      <strong>{userGender === 'MALE' ? 'Nam' : userGender === 'FEMALE' ? 'Nữ' : 'Khác'}</strong>.
                    </p>
                    <Button
                      onClick={() => router.push('/profile')}
                      variant="outline"
                      className="border-slate-200 text-rose-700 hover:bg-rose-100 text-xs font-bold px-4 h-9 mx-auto block"
                    >
                      Thay đổi giới tính trong hồ sơ
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
                    onRegistrationChanged={() => fetchTournament()}
                  />
                ) : isDoubles ? (
                  <DoublesRegistrationFlow
                    tournament={selectedDivision}
                    tournamentId={id}
                    inviteCode={inviteCode}
                    divisionId={selectedDivisionId || undefined}
                  />
                ) : isRegistered && participant ? (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {participant.teamStatus === 'COMPLETE'
                          ? 'Đăng ký thành công! / BTC đã duyệt'
                          : (tournament?.tournamentConfig?.registrationMode === 'APPROVAL') ? 'Đã gửi yêu cầu tham gia!' : 'Đăng ký tham gia thành công!'}
                      </h3>
                      <p className="text-slate-500 text-xs max-w-sm mx-auto">
                        {participant.teamStatus === 'COMPLETE'
                          ? 'Yêu cầu tham gia của bạn đã được xét duyệt thành công.'
                          : (tournament?.tournamentConfig?.registrationMode === 'APPROVAL')
                            ? 'Yêu cầu tham gia của bạn đang chờ BTC duyệt.'
                            : <>Bạn đã đăng ký thi đấu đơn ở nội dung: <strong className="text-slate-700">{selectedDivision?.name}</strong>.</>}
                      </p>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      <div className="bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Thông tin đăng ký: {participant.teamName}
                      </div>
                      <div className="px-4 py-3 flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Họ và tên:</span>
                        <span className="text-slate-900 font-bold">{user?.fullName}</span>
                      </div>
                      <div className="px-4 py-3 flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Trạng thái lệ phí:</span>
                        {participant.isPaid ? (
                          <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-xs">Đã đóng</span>
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
                              <Trash2 className="w-4 h-4" /> Hủy & Rút
                            </Button>
                            <Button
                              onClick={() => {
                                router.push(buildCheckoutHref(participant.id));
                              }}
                              className="flex-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 h-12"
                            >
                              <CreditCard className="w-4 h-4" /> Thanh toán
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
                              Quay lại trang giải đấu
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
                            {translate('registrationConsent')} ELO trên bảng xếp hạng.
                            <span className="mt-1 block text-xs text-slate-500">
                              Đây là điều kiện của nội dung giải có xếp hạng; giải không xếp hạng không cập nhật ELO.
                            </span>
                          </span>
                        </label>
                      )}
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                        <p className="text-xs text-blue-600 font-medium mb-1">Tên thi đấu</p>
                        <p className="text-sm font-bold text-slate-900">{user?.fullName || translate('notUpdated')}</p>
                        <p className="text-xs text-slate-500 mt-1">Tên sẽ được lấy từ tài khoản của bạn</p>
                        <input type="hidden" {...register('teamName')} value={user?.fullName || 'Vận động viên'} />
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-semibold">{translate('entryFee')}:</span>
                          <span className="font-bold text-slate-900">
                            {entryFeeVal > 0 ? formatCurrency(entryFeeVal) : translate('free')}
                          </span>
                        </div>
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
                )
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-sm font-semibold">Vui lòng chọn nội dung thi đấu ở cột bên trái để tiếp tục</p>
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
