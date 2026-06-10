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

const step4Schema = z.object({
  entryFee: z.number().min(0, 'Lệ phí không được là số âm'),
});

type Step4Values = z.infer<typeof step4Schema>;

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
      // Combine all data
      const finalData = {
        ...formData,
        entryFee: data.entryFee,
      };

      // Call API
      const res = await tournamentsApi.createTournament(finalData);
      
      toast.success('Tạo giải đấu thành công!');
      reset(); // Clear persist storage
      
      // Navigate to the newly created tournament or dashboard
      // Usually the API returns the created resource inside data object
      const tournamentId = res?.data?.id || res?.id;
      if (tournamentId) {
        router.push(`/tournaments/${tournamentId}`);
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đã có lỗi xảy ra khi tạo giải đấu');
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
        
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h4 className="font-bold text-slate-900 mb-4">Lệ phí tham gia (VNĐ)</h4>
          <Input
            type="number"
            placeholder="Ví dụ: 500000"
            {...register('entryFee', { valueAsNumber: true })}
            error={errors.entryFee?.message}
          />
          <div className="mt-3 flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              <strong>Lưu ý về Thanh toán:</strong> Nền tảng sẽ thu hộ lệ phí tham gia và tự động đối soát. Phí nền tảng (Platform fee) là 5% trên tổng lệ phí thu được. Nhập 0 nếu giải đấu miễn phí.
            </p>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
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
