'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { ChevronLeft, CheckCircle, Info } from 'lucide-react';
import { tournamentsApi } from '@/features/tournaments/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/utils/error';

const step4Schema = z.object({
  entryFee: z.number().min(0, 'Lệ phí không được là số âm'),
});

type Step4Values = z.infer<typeof step4Schema>;

interface CreateTournamentPayload {
  entryFee: number;
  tournamentConfig: Record<string, unknown>;
  venueId?: string;
  communityId?: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export default function Step4Fees() {
  const { formData, updateFormData, prevStep, reset } = useCreateTournamentStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm<Step4Values>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      entryFee: formData.entryFee,
    },
  });

  const onSubmit = async (data: Step4Values) => {
    try {
      setIsSubmitting(true);
      
      // Transform and Clean data to match backend CreateTournamentDto
      const { format, ...rest } = formData;
      
      const finalData: CreateTournamentPayload = {
        ...rest,
        entryFee: data.entryFee,
        tournamentConfig: {
          bracketType: format,
          maxTeams: rest.maxParticipants || 16,
        },
      };

      // UUID Validation Regex
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const simpleUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // Clean venueId: If not a valid UUID, remove it
      if (finalData.venueId && !simpleUuidRegex.test(finalData.venueId)) {
        delete finalData.venueId;
      }
      if (finalData.venueId === '') {
        delete finalData.venueId;
      }

      // Clean communityId: Ensure it's valid if provided
      if (finalData.communityId && !simpleUuidRegex.test(finalData.communityId)) {
        delete finalData.communityId;
      }

      // Ensure empty strings are not sent for date fields
      ['registrationStartDate', 'registrationEndDate', 'startDate', 'endDate'].forEach(key => {
        if (finalData[key] === '') {
          delete finalData[key];
        }
      });

      // Call API
      const res = await tournamentsApi.createTournament(finalData);
      
      toast.success('Tạo giải đấu thành công!');
      reset(); // Clear persist storage
      
      // Navigate to the newly created tournament or dashboard
      // Usually the API returns the created resource inside data object
      const tournamentId = res?.data?.id;
      if (tournamentId) {
        router.push(`/tournaments/${tournamentId}`);
      } else {
        router.push('/dashboard');
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
        <h2 className="text-xl font-bold text-slate-900 mb-2">Lệ phí & Hoàn tất</h2>
        <p className="text-sm text-slate-500">Thiết lập lệ phí tham gia và kiểm tra lại thông tin giải đấu.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <h4 className="font-bold text-slate-900 mb-4">Lệ phí tham gia (VNĐ)</h4>
          <Input
            type="number"
            placeholder="Ví dụ: 500000"
            {...register('entryFee', { valueAsNumber: true })}
            error={errors.entryFee?.message}
          />
          <div className="mt-3 flex items-start gap-2 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              <strong>Lưu ý về Thanh toán:</strong> Nền tảng sẽ thu hộ lệ phí tham gia và tự động đối soát. Phí nền tảng (Platform fee) là 5% trên tổng lệ phí thu được. Nhập 0 nếu giải đấu miễn phí.
            </p>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <h4 className="font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Tóm tắt giải đấu</h4>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div className="text-slate-500">Tên giải đấu:</div>
            <div className="font-semibold text-slate-900">{formData.name || 'Chưa nhập'}</div>
            
            <div className="text-slate-500">Thể thức:</div>
            <div className="font-semibold text-slate-900">{formData.format}</div>
            
            <div className="text-slate-500">Số đội tối đa:</div>
            <div className="font-semibold text-slate-900">{formData.maxParticipants || 'Không giới hạn'}</div>
            
            <div className="text-slate-500">Khai mạc:</div>
            <div className="font-semibold text-slate-900">{formData.startDate || 'Chưa chọn'}</div>
          </div>
        </div>

        <div className="flex justify-between mt-4 pt-6 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={prevStep} disabled={isSubmitting} className="border-slate-200 text-slate-600">
            <ChevronLeft className="w-4 h-4 mr-1" /> Quay lại
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30">
            {isSubmitting ? 'Đang xử lý...' : (
              <>
                <CheckCircle className="w-4 h-4 mr-1.5" /> Hoàn tất tạo giải
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
