'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trophy, Calendar, MapPin, Users, ArrowLeft, Loader2, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Division, tournamentsApi, Tournament } from '@/features/tournaments/api';
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
      fetchSelectedDivisionDetails(selectedDivisionId);
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
        setNeedInviteValidation(false);

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
        } else if (t.divisions && t.divisions.length > 0) {
          setAllDivisions(t.divisions.map(normalizeDivision));
          setSelectedDivisionId(t.divisions[0].id);
        } else {
          setSelectedDivisionId(t.id);
          setSelectedDivision(t);
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
    fetchTournament();
  }, [id, inviteCode]);

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
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-105 text-blue-600 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Giải đấu riêng tư</h2>
            <p className="text-slate-500 text-xs leading-relaxed">
              Giải đấu này đang ở chế độ riêng tư (PRIVATE). Vui lòng nhập mã mời (Invite Code) do Ban tổ chức cung cấp để mở khóa trang đăng ký.
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
  const isNotOpen = tournament.status !== 'REGISTRATION_OPEN';

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
              isDoubles ? (
                <DoublesRegistrationFlow tournament={selectedDivision} inviteCode={inviteCode} divisionId={selectedDivisionId || undefined} />
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
    </div>
  );
}
