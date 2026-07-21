'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useCreateTournamentStore, resolveMatchFormat } from '@/lib/zustand/createTournamentStore';
import { ChevronLeft, CheckCircle, Info, Loader2 } from 'lucide-react';
import { divisionsApi, tournamentsApi } from '@/features/tournaments/api';
import type { CreateDivisionInput } from '@/features/tournaments/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/utils/error';
import { GenderRestriction } from '@/types/tournament';
import { buildDefaultSportRules } from '@/features/tournaments/sport-rules/defaults';

export default function Step2Confirm() {
  const { formData, prevStep, reset } = useCreateTournamentStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleCreateDraft = async () => {
    try {
      setIsSubmitting(true);
      
      const rest = formData;

      // 1. Resolve backend matchType + genderRestriction + divisionName from the UI matchFormat
      const { matchType, genderRestriction, divisionName } = resolveMatchFormat(rest.matchFormat || 'MALE_DOUBLES');

      // 2. Tạo một giải đấu; hình thức thi đấu lưu riêng ở tournament_divisions.
      const finalData: Record<string, unknown> = {
        name: rest.name,
        categoryId: rest.categoryId,
        description: rest.description || '',
        tournamentType: rest.tournamentType || 'PUBLIC',
        visibility: rest.visibility || 'PUBLIC',
        matchType,
        genderRestriction,
        isRanked: rest.isRanked,
        maxParticipants: rest.maxParticipants || 16,
        entryFee: 0,
        sportRules: rest.sportRules ?? buildDefaultSportRules('BADMINTON'),
        tournamentConfig: {
          bracketType: 'SINGLE_ELIMINATION',
          maxTeams: rest.maxParticipants || 16,
          minElo: rest.minElo,
          maxElo: rest.maxElo,
          maxCombinedElo: rest.maxCombinedElo,
          maxTeammateGap: rest.maxTeammateGap,
          registrationMode: rest.registrationMode || 'OPEN',
        },
      };

      if (rest.communityId) {
        finalData.communityId = rest.communityId;
      }

      // Call API to create draft
      const res = await tournamentsApi.createTournament(finalData);
      const tournamentId = res?.data?.id;
      if (!tournamentId) {
        throw new Error('Không thể tạo Giải đấu. Vui lòng thử lại.');
      }

      const divisionInput: CreateDivisionInput = {
        name: divisionName,
        matchType,
        genderRestriction: genderRestriction as GenderRestriction,
        maxParticipants: rest.maxParticipants,
        entryFee: 0,
      };
      await divisionsApi.createDivision(tournamentId, divisionInput);
      
      toast.success('Tạo bản nháp giải đấu thành công!');
      reset(); // Clear persist storage
      
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
        <h2 className="text-xl font-bold text-slate-900 mb-2">Xác nhận tạo bản nháp</h2>
        <p className="text-sm text-slate-500">Xem lại thông tin và xác nhận lưu bản nháp giải đấu.</p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h4 className="font-bold text-slate-900">Chi tiết giải đấu nháp</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Tên giải đấu</span>
            <span className="font-semibold text-slate-900">{formData.name}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Hình thức thi đấu</span>
            <span className="font-semibold text-slate-900">
              {resolveMatchFormat(formData.matchFormat || 'MALE_DOUBLES').divisionName}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Đối tượng tham gia</span>
            <span className="font-semibold text-slate-900">
              {formData.tournamentType === 'CLUB' ? 'Nội bộ CLB' : 'Mở rộng'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Cách tính thành tích</span>
            <span className="font-semibold text-slate-950">
              {formData.isRanked ? 'Xếp hạng hệ thống' : 'Giải phong trào'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Số đội tối đa</span>
            <span className="font-semibold text-slate-900">
              {formData.maxParticipants || 16} đội
            </span>
          </div>

          {formData.isRanked && (formData.minElo !== null || formData.maxElo !== null) && (
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 font-medium">Giới hạn ELO cá nhân</span>
              <span className="font-semibold text-slate-900">
                {formData.minElo !== null ? `${formData.minElo}` : '0'} - {formData.maxElo !== null ? `${formData.maxElo}` : 'Không giới hạn'}
              </span>
            </div>
          )}

          {formData.isRanked && (formData.matchFormat === 'MALE_DOUBLES' || formData.matchFormat === 'FEMALE_DOUBLES' || formData.matchFormat === 'MIXED_DOUBLES') && (formData.maxCombinedElo !== null || formData.maxTeammateGap !== null) && (
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 font-medium">Giới hạn ELO đồng đội</span>
              <span className="font-semibold text-slate-900">
                {formData.maxCombinedElo !== null ? `Tổng ELO ≤ ${formData.maxCombinedElo}` : ''}
                {formData.maxCombinedElo !== null && formData.maxTeammateGap !== null ? ' | ' : ''}
                {formData.maxTeammateGap !== null ? `Chênh lệch ≤ ${formData.maxTeammateGap}` : ''}
              </span>
            </div>
          )}

          {formData.description && (
            <div className="flex flex-col gap-1 md:col-span-2">
              <span className="text-slate-400 font-medium">Mô tả ngắn</span>
              <span className="text-slate-700">{formData.description}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 text-blue-700 bg-blue-50 p-4 rounded-lg border border-blue-100">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed font-medium">
          <p className="font-bold mb-1">Quy trình lưu nháp:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Sau khi xác nhận, giải đấu sẽ được tạo ở trạng thái <strong>Bản nháp</strong>.</li>
            <li>Giải đấu sẽ ẩn khỏi danh sách công khai và chỉ xuất hiện ở trang quản trị của bạn.</li>
            <li>Bạn có thể tùy biến các thông số chi tiết như lịch thi đấu, sơ đồ thi đấu, phí nền tảng theo phần trăm, địa điểm cụ thể và luật thể thao trong trang Quản lý giải đấu trước khi chính thức công bố.</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-between mt-4 pt-6 border-t border-slate-100">
        <Button 
          type="button" 
          variant="outline" 
          onClick={prevStep} 
          disabled={isSubmitting} 
          className="border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Quay lại
        </Button>
        <Button 
          type="button" 
          onClick={handleCreateDraft} 
          disabled={isSubmitting} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-600/20"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Đang tạo...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-1.5" /> Xác nhận & tạo bản nháp
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
