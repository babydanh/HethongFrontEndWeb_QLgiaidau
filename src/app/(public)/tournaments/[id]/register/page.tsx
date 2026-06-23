'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trophy, Calendar, MapPin, Users, ArrowLeft, Loader2, CheckCircle, AlertTriangle, ShieldAlert, CreditCard, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Division, tournamentsApi, Tournament, TournamentParticipant } from '@/features/tournaments/api';
import { usersApi } from '@/features/users/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { getErrorMessage } from '@/utils/error';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { formatDate, formatCurrency } from '@/utils/format';
import toast from 'react-hot-toast';
import DoublesRegistrationFlow from './components/DoublesRegistrationFlow';

const registerSchema = z.object({
  teamName: z.string().min(3, 'Tên đội phải có ít nhất 3 ký tự').max(100, 'Tên đội quá dài'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function TournamentRegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const router = useRouter();
  const searchParams = useSearchParams();
  const urlInvite = searchParams.get('invite') || '';

  const { user, isAuthenticated } = useAuthStore();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [participant, setParticipant] = useState<TournamentParticipant | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Division select states
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<Tournament | null>(null);
  const [allDivisions, setAllDivisions] = useState<Division[]>([]);
  const [isLoadingDivision, setIsLoadingDivision] = useState(false);
  
  // Invite states for Private Tournaments
  const [inviteCode, setInviteCode] = useState(urlInvite);
  const [needInviteValidation, setNeedInviteValidation] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [isValidatingInvite, setIsValidatingInvite] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const normalizeDivision = (division: {
    id: string;
    name: string;
    matchType?: string | null;
    genderRestriction?: string | null;
    status?: string;
    categoryId?: string;
    maxParticipants?: number;
    entryFee?: number;
  }): Division => ({
    id: division.id,
    name: division.name,
    matchType: (division.matchType || 'DOUBLES') as Division['matchType'],
    genderRestriction: (division.genderRestriction ?? null) as Division['genderRestriction'],
    status: division.status || 'DRAFT',
    categoryId: division.categoryId,
    maxParticipants: division.maxParticipants,
    entryFee: division.entryFee,
  });

  const fetchSelectedDivisionDetails = async (divId: string) => {
    try {
      setIsLoadingDivision(true);
      const division = allDivisions.find((item) => item.id === divId);
      if (division && tournament) {
        setSelectedDivision({
          ...tournament,
          name: division.name,
          matchType: division.matchType,
          genderRestriction: division.genderRestriction,
          entryFee: division.entryFee ?? tournament.entryFee,
          maxParticipants: division.maxParticipants ?? tournament.maxParticipants,
        });
      } else if (!division && tournament) {
        setSelectedDivision(tournament);
      }
    } catch (err) {
      console.error('Failed to load division details:', err);
    } finally {
      setIsLoadingDivision(false);
    }
  };

  useEffect(() => {
    if (selectedDivisionId && selectedDivisionId !== selectedDivision?.id) {
      Promise.resolve().then(() => {
        fetchSelectedDivisionDetails(selectedDivisionId);
      });
    }
  }, [selectedDivisionId, allDivisions, tournament]);

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
        
        const regMode = t.tournamentConfig?.registrationMode || 'OPEN';
        if (regMode === 'INVITE_ONLY' && !inviteCode) {
          setNeedInviteValidation(true);
        } else {
          setNeedInviteValidation(false);
        }

        if (t.parentId) {
          setSelectedDivisionId(t.id);
          setSelectedDivision(t);
          try {
            const pRes = await tournamentsApi.getParentTournamentById(t.parentId);
            if (pRes.data && pRes.data.divisions) {
              setAllDivisions(pRes.data.divisions.map(normalizeDivision));
            }
          } catch (e) {
            console.error('Failed to fetch parent/sister divisions', e);
          }
        }

        // Check registration
        if (isAuthenticated) {
          try {
            const regRes = await tournamentsApi.getMyRegistration(id);
            if (regRes.data && regRes.data.registered && regRes.data.participant) {
              setParticipant(regRes.data.participant);
              setIsRegistered(true);
            } else {
              setParticipant(null);
              setIsRegistered(false);
            }
          } catch (e) {
            console.error('Failed to fetch user registration status', e);
          }
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
  }, [id, inviteCode, isAuthenticated]);

  // Bank refund form modal states
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankError, setBankError] = useState('');

  const handleWithdrawClick = async () => {
    if (participant?.isPaid && Number(selectedDivision?.entryFee) > 0) {
      // Open modal to get bank info
      try {
        const freshProfile = await usersApi.getProfile();
        const profile = (freshProfile as any).data || freshProfile;
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
      await tournamentsApi.withdraw(id, bankData);
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
      const redirectUrl = `/tournaments/${id}/register${inviteCode ? `?invite=${inviteCode}` : ''}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    if (!selectedDivision) {
      toast.error('Vui lòng chọn hình thức đăng ký thi đấu');
      return;
    }

    try {
      setIsSubmitting(true);
      const cleanData = {
        teamName: trimAndNormalizeSpaces(data.teamName),
        inviteCode: inviteCode || undefined,
        tournamentDivisionId: selectedDivisionId || undefined,
      };

      const res = await tournamentsApi.register(id, cleanData);
      const participantId = res?.data?.participant?.id;

      toast.success('Đăng ký tham gia thành công!');

      // Skip payment step for testing convenience
      router.push(`/tournaments/${id}`);
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
      const redirectUrl = `/tournaments/${id}/register${inviteCode ? `?invite=${inviteCode}` : ''}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
    }
  }, [isLoading, needInviteValidation, isAuthenticated, id, inviteCode, router]);

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
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
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
  const isDraftInviteOnly = tournament.status === 'DRAFT' && inviteCode && tournament.inviteCode === inviteCode;
  const isNotOpen = tournament.status !== 'REGISTRATION_OPEN' && !isDraftInviteOnly;

  const isProfileIncomplete = isAuthenticated && user && (!user.fullName || !user.phoneNumber || !user.gender);

  if (isProfileIncomplete) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center animate-in fade-in duration-200">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Hồ sơ chưa hoàn thiện</h2>
            <p className="text-slate-550 text-xs leading-relaxed font-semibold">
              Bạn cần cập nhật đầy đủ Họ tên, Số điện thoại và Giới tính trong hồ sơ cá nhân để được đăng ký tham gia giải đấu.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => router.push('/profile')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-md"
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
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
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

  const userGender = user?.gender?.toUpperCase();
  const divisionGender = selectedDivision?.genderRestriction?.toUpperCase();
  const isGenderMismatched = userGender && divisionGender && divisionGender !== 'MIXED' && userGender !== divisionGender;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => router.push(`/tournaments/${tournament.id}`)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại giải đấu
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header Card */}
          <div className="p-6 md:p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative">
            {tournament.visibility === 'PRIVATE' && (
              <div className="absolute top-4 right-4 bg-blue-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-md tracking-wider">
                MỜI RIÊNG TƯ
              </div>
            )}

            <span className="bg-blue-600/20 text-blue-300 text-[10px] font-black px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-wider">
              {tournament.category?.name || 'Tennis'}
            </span>
            <h1 className="text-xl md:text-2xl font-black mt-2 mb-3 leading-tight text-white">{tournament.name}</h1>

            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-semibold text-slate-350 border-t border-slate-700/50 pt-4 mt-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Khai mạc: {tournament.startDate ? formatDate(tournament.startDate) : 'Chưa cập nhật'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-400" />
                <span className="truncate">{tournament.locationAddress || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>
                  Định dạng giải đấu: {
                    tournament.format === 'SINGLE_ELIMINATION' ? 'Loại trực tiếp (Single)' :
                    tournament.format === 'DOUBLE_ELIMINATION' ? 'Nhánh thắng thua (Double)' :
                    tournament.format === 'ROUND_ROBIN' ? 'Vòng tròn tính điểm' : tournament.format
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Form / Flow Content */}
          <div className="p-6 md:p-8">
            {/* Division dropdown selector */}
            {allDivisions.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-6">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hình thức đăng ký thi đấu</label>
                <select
                  value={selectedDivisionId}
                  onChange={(e) => setSelectedDivisionId(e.target.value)}
                  disabled={isLoadingDivision || isSubmitting}
                  className="border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-12 shadow-sm cursor-pointer"
                >
                  {allDivisions.map((div) => (
                    <option key={div.id} value={div.id}>
                      {div.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isLoadingDivision ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                <p className="text-xs text-slate-400 font-medium animate-pulse">Đang tải thông tin hình thức...</p>
              </div>
            ) : selectedDivision ? (
              isGenderMismatched ? (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 text-center space-y-3 animate-in fade-in duration-200">
                  <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                  <p className="text-sm font-bold text-rose-900">Giới tính không phù hợp</p>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                    Hình thức thi đấu này ({selectedDivision?.name || 'Đơn'}) chỉ dành cho giới tính{' '}
                    <strong>{divisionGender === 'MALE' ? 'Nam' : 'Nữ'}</strong>. Giới tính trong hồ sơ của bạn hiện tại là{' '}
                    <strong>{userGender === 'MALE' ? 'Nam' : 'Nữ'}</strong>.
                  </p>
                  <Button
                    onClick={() => router.push('/profile')}
                    variant="outline"
                    className="border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold px-4 h-9 mx-auto block"
                  >
                    Thay đổi giới tính trong hồ sơ
                  </Button>
                </div>
              ) : isDoubles ? (
                <DoublesRegistrationFlow tournament={selectedDivision} inviteCode={inviteCode} divisionId={selectedDivisionId || undefined} />
              ) : isRegistered && participant ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 font-bold">Đăng ký tham gia thành công!</h3>
                    <p className="text-slate-500 text-xs max-w-sm mx-auto">
                      Bạn đã đăng ký thi đấu đơn ở nội dung: <strong className="text-slate-700">{selectedDivision?.name}</strong>.
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y">
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
                        <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Đã đóng</span>
                      ) : (
                        <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Chờ thanh toán</span>
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
                            className="flex-1 border-rose-200 hover:bg-rose-50 text-rose-600 font-bold py-3 text-sm flex items-center justify-center gap-1.5 animate-all h-12"
                          >
                            <Trash2 className="w-4 h-4" /> Hủy & Rút
                          </Button>
                          <Button
                            onClick={() => router.push(`/payments/checkout?participantId=${participant.id}&tournamentId=${id}`)}
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
                            <Trash2 className="w-4 h-4" /> Hủy & Rút lui
                          </Button>
                          <Button
                            onClick={() => router.push(`/tournaments/${id}`)}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-sm h-11"
                          >
                            Quay lại trang giải đấu
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold p-4 rounded-xl text-center">
                        Nội dung này được miễn phí lệ phí tham gia. Bạn đã hoàn tất đăng ký!
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={handleWithdrawClick}
                          disabled={isWithdrawing}
                          className="flex-1 border-rose-200 hover:bg-rose-50 text-rose-600 font-bold py-3 text-sm flex items-center justify-center gap-1.5 h-12"
                        >
                          <Trash2 className="w-4 h-4" /> Hủy & Rút lui
                        </Button>
                        <Button
                          onClick={() => router.push(`/tournaments/${id}`)}
                          className="flex-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm h-12"
                        >
                          Truy cập trang giải đấu
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" /> Đăng ký thi đấu đơn
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">
                      Nhập tên thi đấu của bạn (hoặc tên đội cá nhân đại diện).
                    </p>
                  </div>

                  <form onSubmit={handleSubmit(onSubmitSingles)} className="space-y-5">
                    <Input
                      label="Tên đội / Tên thi đấu"
                      placeholder="Ví dụ: Nguyễn Văn A - Hà Nội"
                      {...register('teamName')}
                      error={errors.teamName?.message}
                      disabled={isSubmitting}
                    />

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-semibold">Lệ phí giải đấu:</span>
                        <span className="font-extrabold text-slate-900">
                          {entryFeeVal > 0 ? formatCurrency(entryFeeVal) : 'Miễn phí'}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý đăng ký...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Xác nhận Đăng ký tham gia
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              )
            ) : null}
          </div>
        </div>
      </div>

      {/* Modal Hoàn Tiền Thủ Công */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-extrabold text-slate-900">Thông tin hoàn trả lệ phí</h3>
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-slate-650 p-1 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmWithdrawWithBank}>
              <div className="p-6 space-y-4.5">
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs text-slate-650 leading-relaxed font-semibold">
                  Giải đấu có thu phí. Ban tổ chức sẽ đối soát và thực hiện hoàn trả lại lệ phí giải đấu qua số tài khoản ngân hàng bạn cung cấp dưới đây.
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tên ngân hàng / Ví (Ví dụ: MB Bank, Vietcombank...)</label>
                  <Input
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Nhập tên ngân hàng..."
                    className="font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Số tài khoản ngân hàng</label>
                  <Input
                    required
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="Nhập số tài khoản..."
                    className="font-bold text-slate-800 tracking-wider"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Họ và tên chủ tài khoản (Viết hoa không dấu)</label>
                  <Input
                    required
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="Ví dụ: NGUYEN VAN A"
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
                  className="px-4 py-2 border-slate-205 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={isWithdrawing}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-500/10"
                >
                  {isWithdrawing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Xác nhận rút & hoàn tiền
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
