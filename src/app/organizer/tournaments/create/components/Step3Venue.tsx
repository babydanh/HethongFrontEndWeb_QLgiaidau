'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { ChevronRight, ChevronLeft, MapPin } from 'lucide-react';

// For date validation: registration starts before ends, tournament starts after registration ends, etc.
const step3Schema = z.object({
  registrationStartDate: z.string().min(1, 'Vui lòng chọn ngày mở đăng ký'),
  registrationEndDate: z.string().min(1, 'Vui lòng chọn ngày đóng đăng ký'),
  startDate: z.string().min(1, 'Vui lòng chọn ngày khai mạc'),
  endDate: z.string().min(1, 'Vui lòng chọn ngày bế mạc'),
  venueId: z.string().optional(),
}).refine(data => new Date(data.registrationEndDate) >= new Date(data.registrationStartDate), {
  message: 'Ngày đóng đăng ký phải sau ngày mở',
  path: ['registrationEndDate']
}).refine(data => new Date(data.startDate) >= new Date(data.registrationEndDate), {
  message: 'Giải đấu chỉ được bắt đầu sau khi đóng đăng ký',
  path: ['startDate']
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
  message: 'Ngày bế mạc phải sau ngày khai mạc',
  path: ['endDate']
});

type Step3Values = z.infer<typeof step3Schema>;

export default function Step3Venue() {
  const { formData, updateFormData, nextStep, prevStep } = useCreateTournamentStore();

  const { register, handleSubmit, formState: { errors } } = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      registrationStartDate: formData.registrationStartDate,
      registrationEndDate: formData.registrationEndDate,
      startDate: formData.startDate,
      endDate: formData.endDate,
      venueId: formData.venueId,
    },
  });

  const onSubmit = (data: Step3Values) => {
    updateFormData({
      ...data,
      venueId: data.venueId === '' ? undefined : data.venueId,
    });
    nextStep();
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Thời gian & Địa điểm</h2>
        <p className="text-sm text-slate-500">Lên lịch trình cụ thể để các đội tuyển có thể chuẩn bị.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="md:col-span-2 border-b border-slate-100 pb-2 mb-2">
            <h4 className="font-bold text-slate-900">Thời gian đăng ký</h4>
          </div>
          
          <Input
            label="Mở đăng ký"
            type="date"
            {...register('registrationStartDate')}
            error={errors.registrationStartDate?.message}
          />
          <Input
            label="Đóng đăng ký"
            type="date"
            {...register('registrationEndDate')}
            error={errors.registrationEndDate?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="md:col-span-2 border-b border-slate-100 pb-2 mb-2">
            <h4 className="font-bold text-slate-900">Thời gian diễn ra</h4>
          </div>
          
          <Input
            label="Ngày khai mạc"
            type="date"
            {...register('startDate')}
            error={errors.startDate?.message}
          />
          <Input
            label="Ngày bế mạc (Dự kiến)"
            type="date"
            {...register('endDate')}
            error={errors.endDate?.message}
          />
        </div>

        <div className="flex flex-col gap-1.5 p-5 bg-slate-50 border border-slate-200 rounded-lg">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-500" /> Địa điểm thi đấu (Venue)
          </label>
          <select 
            {...register('venueId')} 
            className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Tùy chọn (Chưa xác định) --</option>
            {/* Use valid UUIDs for mock values to pass backend validation */}
            <option value="00000000-0000-0000-0000-000000000001">Cụm sân Tennis Lan Anh</option>
            <option value="00000000-0000-0000-0000-000000000002">Sân Pickleball Quận 7</option>
            <option value="00000000-0000-0000-0000-000000000003">Nhà thi đấu Phú Thọ</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">Việc chọn sẵn Venue hệ thống sẽ giúp bạn quản lý sơ đồ sân dễ dàng hơn.</p>
        </div>

        <div className="flex justify-between mt-4 pt-6 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={prevStep} className="border-slate-200 text-slate-600">
            <ChevronLeft className="w-4 h-4 mr-1" /> Quay lại
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            Tiếp tục <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </form>
    </div>
  );
}

