'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { ChevronLeft, CheckCircle, Info, Loader2 } from 'lucide-react';
import { tournamentsApi, divisionsApi } from '@/features/tournaments/api';
import type { CreateDivisionInput } from '@/features/tournaments/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/utils/error';
import { formatCurrency, formatDateTime } from '@/utils/format';
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
    allowEntryFees: true,
  });
  const submittingRef = useRef(false);
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

  const validateTournamentDraft = () => {
    if (!formData.name.trim()) throw new Error('Thiếu tên giải đấu ở Bước 1.');
    if (!formData.categoryId) throw new Error('Thiếu bộ môn thi đấu ở Bước 1.');
    if (!formData.sportRules || typeof formData.sportRules !== 'object' || !('kind' in formData.sportRules)) {
      throw new Error('Chưa xác định được bộ luật theo môn đã chọn. Vui lòng quay lại chọn môn.');
    }
    if (!primaryDivision || divisions.length === 0) throw new Error('Bạn chưa chọn hình thức thi đấu ở Bước 2.');

    if (formData.registrationStartDate && formData.registrationEndDate) {
      const registrationStart = new Date(formData.registrationStartDate);
      const registrationEnd = new Date(formData.registrationEndDate);
      if (registrationStart >= registrationEnd) {
        throw new Error('Ngày bắt đầu đăng ký phải trước ngày kết thúc đăng ký.');
      }
      if (formData.startDate) {
        const tournamentStart = new Date(formData.startDate);
        if (registrationEnd > tournamentStart) {
          throw new Error('Hạn chót đăng ký phải trước hoặc bằng ngày bắt đầu thi đấu.');
        }
      }
    }

    if (formData.startDate && formData.endDate) {
      const tournamentStart = new Date(formData.startDate);
      const tournamentEnd = new Date(formData.endDate);
      if (tournamentStart >= tournamentEnd) {
        throw new Error('Ngày bắt đầu thi đấu phải trước ngày kết thúc.');
      }
    }

    if ((formData.maxParticipants ?? 0) < 2) {
      throw new Error('Số đội tham gia tối đa phải lớn hơn hoặc bằng 2.');
    }
    if ((formData.entryFee ?? 0) < 0) {
      throw new Error('Lệ phí tham gia không được là số âm.');
    }
  };

  const handleCreateTournament = async () => {
    if (submittingRef.current) return;
    try {
      submittingRef.current = true;
      setIsSubmitting(true);
      validateTournamentDraft();

      if (!primaryDivision) {
        throw new Error('Vui lòng chọn ít nhất một hình thức thi đấu.');
      }

      // 1. Create one tournament. Match formats are stored as tournament_divisions.
      const isClubTournament = formData.tournamentType === 'CLUB' || Boolean(formData.communityId);
      const effectiveEntryFee = isClubTournament || !feesConfig.allowEntryFees
        ? 0
        : formData.entryFee || 0;
      const finalTournamentData: Record<string, unknown> = {
        name: formData.name,
        categoryId: formData.categoryId,
        description: formData.description || '',
        tournamentType: formData.tournamentType || 'PUBLIC',
        visibility: formData.visibility || 'PUBLIC',
        matchType: primaryDivision.matchType,
        genderRestriction: primaryDivision.genderRestriction,
        isRanked: formData.isRanked,
        maxParticipants: formData.maxParticipants || 16,
        entryFee: effectiveEntryFee,
        startDate: formData.startDate,
        endDate: formData.endDate,
        registrationStartDate: formData.registrationStartDate,
        registrationEndDate: formData.registrationEndDate,
        sportRules: formData.sportRules,
        tournamentConfig: {
          bracketType: formData.format as string,
          maxTeams: formData.maxParticipants || 16,
          minElo: formData.minElo,
          maxElo: formData.maxElo,
          maxCombinedElo: formData.maxCombinedElo,
          maxTeammateGap: formData.maxTeammateGap,
          registrationMode: formData.registrationMode || 'OPEN',
          registrationScope: isClubTournament ? 'CLUB_MEMBERS_ONLY' : 'PUBLIC_OPEN',
          // Team sport (bóng đá): sân 5/7/11 + thể thức nâng cao
          ...(formData.teamSize != null ? { teamSize: formData.teamSize } : {}),
          ...(formData.teamSizeOptions ? { teamSizeOptions: formData.teamSizeOptions } : {}),
          ...(formData.minTeamSize != null ? { minTeamSize: formData.minTeamSize } : {}),
          ...(formData.maxTeamSize != null ? { maxTeamSize: formData.maxTeamSize } : {}),
          ...(formData.maxReserve != null ? { maxReserve: formData.maxReserve } : {}),
          ...(formData.twoLegged != null ? { twoLegged: formData.twoLegged } : {}),
          ...(formData.awayGoalsRule != null ? { awayGoalsRule: formData.awayGoalsRule } : {}),
          ...(formData.penaltyShootout != null ? { penaltyShootout: formData.penaltyShootout } : {}),
          ...(formData.allowDraw != null ? { allowDraw: formData.allowDraw } : {}),
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
      // Same format may intentionally appear more than once. The division name
      // and its ELO/settings distinguish variants such as Low ELO / High ELO.
      const divisionPromises = divisions.map((div) => {
        const divisionInput: CreateDivisionInput = {
          name: div.name,
          matchType: div.matchType,
          genderRestriction: div.genderRestriction as GenderRestriction,
          maxParticipants: formData.maxParticipants,
          entryFee: effectiveEntryFee,
          bracketType: formData.format as 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN',
        };
        return divisionsApi.createDivision(tournamentId, divisionInput);
      });

      await Promise.all(divisionPromises);

      toast.success(`Tạo giải đấu với ${divisions.length} bảng thi đấu thành công!`);
      reset();

      router.push(`/organizer/tournaments/${tournamentId}/manage`);
    } catch (error) {
      submittingRef.current = false;
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

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
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
            <span className="text-slate-400 font-medium">Đối Tượng Tham Gia</span>
            <span className="font-semibold text-slate-900">
              {formData.tournamentType === 'CLUB' ? 'Nội Bộ CLB' : 'Mở Rộng'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Cách Tính Thành Tích</span>
            <span className="font-semibold text-slate-900">
              {formData.isRanked ? 'Xếp Hạng' : 'Phong Trào'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Chế độ đăng ký</span>
            <span className="font-semibold text-slate-900">
              {formData.registrationMode === 'OPEN'
                ? 'Tự do đăng ký'
                : formData.registrationMode === 'APPROVAL'
                  ? 'Cần xét duyệt'
                  : 'Chỉ nhận mã mời'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Hiển thị giải đấu</span>
            <span className="font-semibold text-slate-900">
              {formData.visibility === 'PRIVATE' ? 'Không niêm yết' : 'Công khai'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Lệ phí tham gia / người</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(feesConfig.allowEntryFees ? formData.entryFee || 0 : 0)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Phí tạo/công bố giải</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(publishFee)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Đăng ký mở từ</span>
            <span className="font-semibold text-slate-900">
              {formData.registrationStartDate ? formatDateTime(formData.registrationStartDate) : 'Chưa thiết lập'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Đăng ký kết thúc</span>
            <span className="font-semibold text-slate-900">
              {formData.registrationEndDate ? formatDateTime(formData.registrationEndDate) : 'Chưa thiết lập'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Thi đấu bắt đầu</span>
            <span className="font-semibold text-slate-900">
              {formData.startDate ? formatDateTime(formData.startDate) : 'Chưa thiết lập'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Thi đấu kết thúc</span>
            <span className="font-semibold text-slate-900">
              {formData.endDate ? formatDateTime(formData.endDate) : 'Chưa thiết lập'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Số đội tối đa</span>
            <span className="font-semibold text-slate-900">
              {formData.maxParticipants ?? 'Chưa thiết lập'}
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

