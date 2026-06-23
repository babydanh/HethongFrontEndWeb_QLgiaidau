'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trophy, Calendar, MapPin, Users, DollarSign, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { getErrorMessage } from '@/utils/error';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { formatDate, formatCurrency } from '@/utils/format';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  teamName: z.string().min(3, 'Tên đội phải có ít nhất 3 ký tự').max(100, 'Tên đội quá dài'),
  partnerEmailOrPhone: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function JoinTournamentPage({ params }: { params: Promise<{ inviteCode: string }> }) {
  const resolvedParams = use(params);
  const inviteCode = resolvedParams.inviteCode;
  
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [divisions, setDivisions] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        setIsLoading(true);
        const res = await tournamentsApi.getTournamentByInviteCode(inviteCode);
        if (res.data) {
          setTournament(res.data);
          
          if (res.data.parentId) {
            const parentRes = await tournamentsApi.getParentTournamentById(res.data.parentId);
            if (parentRes.data && parentRes.data.divisions) {
              setDivisions(parentRes.data.divisions);
            }
          }
        } else {
          toast.error('Không tìm thấy giải đấu hoặc mã mời không hợp lệ');
          router.push('/tournaments');
        }
      } catch (err) {
        toast.error('Không tìm thấy giải đấu hoặc mã mời không hợp lệ');
        router.push('/tournaments');
      } finally {
        setIsLoading(false);
      }
    };

    if (inviteCode) {
      fetchTournament();
    }
  }, [inviteCode, router]);

  const onSubmit = async (data: RegisterFormValues) => {
    if (!isAuthenticated || !user) {
      toast.error('Vui lòng đăng nhập để đăng ký tham gia giải đấu');
      router.push(`/login?redirect=/tournaments/join/${inviteCode}`);
      return;
    }

    try {
      setIsSubmitting(true);
      const cleanData = {
        teamName: trimAndNormalizeSpaces(data.teamName),
        memberIds: [user.id],
        partnerEmailOrPhone: data.partnerEmailOrPhone ? trimAndNormalizeSpaces(data.partnerEmailOrPhone) : undefined,
      };

      const res = await tournamentsApi.joinTournamentByInviteCode(inviteCode, cleanData);
      const participantId = res?.data?.participantId;

      toast.success('Đăng ký tham gia thành công!');
      
      const entryFee = Number(tournament?.entryFee || 0);
      if (entryFee > 0 && participantId && tournament) {
        router.push(`/payments/checkout?participantId=${participantId}&tournamentId=${tournament.id}`);
      } else if (tournament) {
        router.push(`/tournaments/${tournament.id}`);
      } else {
        router.push('/tournaments');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium text-sm">Đang tải thông tin giải đấu...</p>
      </div>
    );
  }

  if (!tournament) return null;

  const entryFeeVal = Number(tournament.entryFee || 0);
  const availableDivisions = divisions.length > 0 ? divisions : [tournament];
  const selectedDivision = availableDivisions.find((div) => div.inviteCode === inviteCode) || tournament;
  const selectedDivisionLabel = selectedDivision.matchType === 'SINGLES'
    ? (selectedDivision.genderRestriction === 'FEMALE' ? 'Đơn Nữ' : 'Đơn Nam')
    : selectedDivision.matchType === 'DOUBLES'
    ? (selectedDivision.genderRestriction === 'FEMALE' ? 'Đôi Nữ' : 'Đôi Nam')
    : 'Đôi Nam Nữ';

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <button 
          onClick={() => router.push('/tournaments')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 md:p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative">
            <div className="absolute top-4 right-4 bg-emerald-500 text-white font-bold text-xs px-2.5 py-1 rounded-md">
              ĐƯỢC MỜI
            </div>
            
            <h1 className="text-2xl md:text-3xl font-black mb-3 leading-tight text-white">{tournament.name}</h1>
            
            {tournament.description && (
              <p className="text-slate-300 text-xs line-clamp-2 mb-4 leading-relaxed">
                {tournament.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs font-semibold text-slate-300 border-t border-slate-700/50 pt-4 mt-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>{tournament.startDate ? formatDate(tournament.startDate) : 'Chưa xếp lịch'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-400 text-xs" />
                <span className="truncate">{tournament.locationAddress || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>
                  Thể thức: {tournament.format === 'SINGLE_ELIMINATION' ? 'Loại trực tiếp' :
                             tournament.format === 'DOUBLE_ELIMINATION' ? 'Nhánh thắng/thua' :
                             tournament.format === 'ROUND_ROBIN' ? 'Vòng tròn tính điểm' : tournament.format}
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Đăng ký tham gia giải đấu
              </h2>
              <p className="text-slate-500 text-xs mt-1">
                Giải đấu yêu cầu nhập thông tin tên đội của bạn để ghi nhận thi đấu.
              </p>
            </div>

            {availableDivisions.length > 0 && (
              <div className="space-y-1.5 pb-2 border-b border-slate-100">
                <label className="text-xs font-bold text-slate-700 block">Hình thức thi đấu</label>
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-3 text-xs text-blue-900">
                  Bạn đang đăng ký cho hình thức: <span className="font-black">{selectedDivision.name} ({selectedDivisionLabel})</span>
                </div>
                {availableDivisions.length > 1 && (
                  <select
                    value={inviteCode}
                    onChange={(e) => router.push(`/tournaments/join/${e.target.value}`)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    {availableDivisions.map((div) => {
                      const label = div.matchType === 'SINGLES' 
                        ? (div.genderRestriction === 'FEMALE' ? 'Đơn Nữ' : 'Đơn Nam')
                        : div.matchType === 'DOUBLES'
                        ? (div.genderRestriction === 'FEMALE' ? 'Đôi Nữ' : 'Đôi Nam')
                        : 'Đôi Nam Nữ';
                      return (
                        <option key={div.id} value={div.inviteCode || ''}>
                          {div.name} ({label})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Tên đội / Tên thi đấu"
                placeholder="Ví dụ: Team Lan Anh Cầu Giấy"
                {...register('teamName')}
                error={errors.teamName?.message}
              />

              {(selectedDivision.matchType === 'DOUBLES' || selectedDivision.matchType === 'MIXED_DOUBLES') && (
                <Input
                  label="Tài khoản Baseline của đồng đội (Email hoặc SĐT)"
                  placeholder="partner@baseline.vn hoặc 08xxxx (Không bắt buộc)"
                  {...register('partnerEmailOrPhone')}
                  error={errors.partnerEmailOrPhone?.message}
                />
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-semibold">Lệ phí giải đấu:</span>
                  <span className="font-extrabold text-slate-900">
                    {entryFeeVal > 0 ? formatCurrency(entryFeeVal) : 'Miễn phí'}
                  </span>
                </div>
              </div>

              {!isAuthenticated ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
                  Bạn cần đăng nhập tài khoản trước khi hoàn tất đăng ký. Hệ thống sẽ tự động chuyển hướng bạn quay lại trang này sau khi đăng nhập thành công.
                </div>
              ) : null}

              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 shadow-md shadow-blue-500/10"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang xử lý đăng ký...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {!isAuthenticated ? 'Đăng nhập & Đăng ký' : 'Xác nhận tham gia'}
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
