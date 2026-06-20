'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { ChevronLeft, CheckCircle, Info, Loader2 } from 'lucide-react';
import { tournamentsApi, divisionsApi } from '@/features/tournaments/api';
import type { CreateDivisionInput } from '@/features/tournaments/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/utils/error';
import { formatCurrency } from '@/utils/format';
import { GenderRestriction } from '@/types/tournament';
import type { TournamentFeesConfig } from '@/features/tournaments/api';

export default function Step4ReviewSubmit() {
  const { formData, getDivisionsFromFormats, prevStep, reset } = useCreateTournamentStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feesConfig, setFeesConfig] = useState<TournamentFeesConfig>({
    feePublicRanked: 100000,
    feePublicUnranked: 50000,
    feeClub: 0,
    pctPublicRanked: 5,
    pctPublicUnranked: 5,
    pctClub: 0,
  });
  const router = useRouter();

  const divisions = getDivisionsFromFormats();
  const primaryDivision = divisions[0];
  const publishFee = formData.tournamentType === 'CLUB'
    ? feesConfig.feeClub
    : formData.isRanked
      ? feesConfig.feePublicRanked
      : feesConfig.feePublicUnranked;

  useEffect(() => {
    const loadFees = async () => {
      try {
        const res = await tournamentsApi.getFeesConfig();
        if (res.data) setFeesConfig(res.data);
      } catch {
        // Keep default fee config when the public config endpoint is unavailable.
      }
    };
    void loadFees();
  }, []);

  const handleCreateTournament = async () => {
    try {
      setIsSubmitting(true);

      if (!primaryDivision) {
        throw new Error('Vui lòng chọn ít nhất một hình thức thi đấu.');
      }

      // 1. Create one tournament. Match formats are stored as tournament_divisions.
      const finalTournamentData: Record<string, unknown> = {
        name: formData.name,
        categoryId: formData.categoryId,
        description: formData.description || '',
        tournamentType: formData.tournamentType || 'PUBLIC',
        matchType: primaryDivision.matchType,
        genderRestriction: primaryDivision.genderRestriction,
        isRanked: formData.isRanked,
        maxParticipants: formData.maxParticipants || 16,
        entryFee: formData.entryFee || 0,
        startDate: formData.startDate,
        endDate: formData.endDate,
        registrationStartDate: formData.registrationStartDate,
        registrationEndDate: formData.registrationEndDate,
        sportRules: {
          setsToWin: 2,
          pointsPerSet: 21,
          winByTwo: true,
        },
        tournamentConfig: {
          bracketType: formData.format,
          maxTeams: formData.maxParticipants || 16,
          minElo: formData.minElo,
          maxElo: formData.maxElo,
          maxCombinedElo: formData.maxCombinedElo,
          maxTeammateGap: formData.maxTeammateGap,
        },
      };

      if (formData.communityId) {
        finalTournamentData.communityId = formData.communityId;
      }

      const tournamentRes = await tournamentsApi.createTournament(finalTournamentData);
      const tournamentId = tournamentRes.data?.id;
      if (!tournamentId) {
        throw new Error('Không thể tạo Giải đấu. Vui lòng thử lại.');
      }

      // 2. Create divisions for each selected format under the tournament.
      const divisionPromises = divisions.map((div) => {
        const divisionInput: CreateDivisionInput = {
          tournamentId,
          name: div.name,
          matchType: div.matchType,
          genderRestriction: div.genderRestriction as GenderRestriction,
          maxParticipants: formData.maxParticipants,
          entryFee: formData.entryFee || 0,
          bracketType: formData.format,
        };
        return divisionsApi.createDivision(tournamentId, divisionInput);
      });

      await Promise.all(divisionPromises);

      toast.success(`Tạo giải đấu với ${divisions.length} bảng thi đấu thành công!`);
      reset();

      router.push(`/organizer/tournaments/${tournamentId}/manage`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Xác Nhận & Tạo Giải Đấu</h2>
        <p className="text-sm text-slate-500">Kiểm tra lại thông tin trước khi tạo giải đấu.</p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Tên Giải Đấu</span>
            <span className="font-semibold text-slate-900">{formData.name}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Số Bảng Thi Đấu</span>
            <span className="font-semibold text-slate-900">{divisions.length}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Phạm Vi Tổ Chức</span>
            <span className="font-semibold text-slate-900">
              {formData.tournamentType === 'CLUB' ? 'Nội Bộ CLB' : 'Công Khai'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Tính Chất</span>
            <span className="font-semibold text-slate-900">
              {formData.isRanked ? 'Xếp Hạng' : 'Phong Trào'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Lệ phí tham gia / người</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(formData.entryFee || 0)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Phí tạo/công bố giải</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(publishFee)}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h4 className="font-bold text-slate-900 mb-3">Các Bảng Thi Đấu</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {divisions.map((div, idx) => (
            <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-white">
              <p className="font-semibold text-slate-900">{div.name}</p>
              <p className="text-xs text-slate-500 mt-1">
                {div.matchType} • {div.genderRestriction}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 text-blue-700 bg-blue-50 p-4 rounded-lg border border-blue-100">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="text-xs font-medium leading-relaxed">
          <strong>Lưu ý:</strong> Giải đấu sẽ được tạo ở trạng thái DRAFT. Lệ phí tham gia là khoản VĐV trả khi đăng ký; phí tạo/công bố giải sẽ được thanh toán mock khi bạn bấm công bố trong trang quản lý.
        </p>
      </div>

      <div className="flex justify-between mt-4 pt-6 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={isSubmitting}
          className="border-slate-200 text-slate-600"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Quay Lại
        </Button>
        <Button
          type="button"
          onClick={handleCreateTournament}
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Đang Tạo...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-1.5" /> Tạo Giải Đấu
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
