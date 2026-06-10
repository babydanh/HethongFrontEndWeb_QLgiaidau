'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { ChevronLeft, CheckCircle, Info, Loader2 } from 'lucide-react';
import { tournamentsApi } from '@/features/tournaments/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/utils/error';

export default function Step2Confirm() {
  const { formData, prevStep, reset } = useCreateTournamentStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleCreateDraft = async () => {
    try {
      setIsSubmitting(true);
      
      const { format, ...rest } = formData;

      const finalData: Record<string, unknown> = {
        name: rest.name,
        categoryId: rest.categoryId,
        description: rest.description || '',
        tournamentType: rest.tournamentType || 'PUBLIC',
        matchType: rest.matchType || 'DOUBLES',
        maxParticipants: rest.maxParticipants || 16,
        entryFee: 0,
        platformFeePerPlayer: rest.tournamentType === 'CLUB' ? 0 : 10000,
        sportRules: {
          setsToWin: 2,
          pointsPerSet: 21,
          winByTwo: true,
        },
        tournamentConfig: {
          bracketType: 'SINGLE_ELIMINATION',
          maxTeams: rest.maxParticipants || 16,
        },
      };

      if (rest.communityId) {
        finalData.communityId = rest.communityId;
      }

      // Call API to create draft
      const res = await tournamentsApi.createTournament(finalData);
      
      toast.success('Tạo bản nháp giải đấu thành công!');
      reset(); // Clear persist storage
      
      const tournamentId = res?.data?.id;
      if (tournamentId) {
        // Redirect to detail manage dashboard
        router.push(`/organizer/tournaments/${tournamentId}/manage`);
      } else {
        router.push('/organizer/tournaments');
      }
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

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
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
              {formData.matchType === 'SINGLES' ? 'Đơn (Singles)' :
               formData.matchType === 'DOUBLES' ? 'Đôi (Doubles)' : 'Đôi nam nữ (Mixed)'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Phạm vi tổ chức</span>
            <span className="font-semibold text-slate-900">
              {formData.tournamentType === 'CLUB' ? 'Nội bộ CLB (Club)' : 'Công khai (Public)'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-medium">Số đội tối đa</span>
            <span className="font-semibold text-slate-900">
              {formData.maxParticipants || 16} đội
            </span>
          </div>

          {formData.description && (
            <div className="flex flex-col gap-1 md:col-span-2">
              <span className="text-slate-400 font-medium">Mô tả ngắn</span>
              <span className="text-slate-700">{formData.description}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 text-blue-700 bg-blue-50 p-4 rounded-xl border border-blue-100">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed font-medium">
          <p className="font-bold mb-1">Quy trình lưu nháp:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Sau khi xác nhận, giải đấu sẽ được tạo ở trạng thái <strong>Bản nháp (DRAFT)</strong>.</li>
            <li>Giải đấu sẽ ẩn khỏi danh sách công khai và chỉ xuất hiện ở trang quản trị của bạn.</li>
            <li>Bạn có thể tùy biến các thông số chi tiết như lịch thi đấu, sơ đồ thi đấu, lệ phí sàn, địa điểm cụ thể và luật thể thao trong trang Quản lý giải đấu trước khi chính thức công bố.</li>
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
