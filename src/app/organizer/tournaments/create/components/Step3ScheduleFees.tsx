'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input, DateTimePicker } from '@/components/ui/Input';
import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { ChevronRight, ChevronLeft, Calendar, DollarSign } from 'lucide-react';

const step3Schema = z.object({
  startDate: z.string().min(1, 'Ngày bắt đầu không được để trống'),
  endDate: z.string().min(1, 'Ngày kết thúc không được để trống'),
  registrationStartDate: z.string().min(1, 'Ngày bắt đầu đăng ký không được để trống'),
  registrationEndDate: z.string().min(1, 'Ngày kết thúc đăng ký không được để trống'),
  entryFee: z.string().refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'Lệ phí phải là số không âm'),
}).superRefine((data, ctx) => {
  const regStart = new Date(data.registrationStartDate);
  const regEnd = new Date(data.registrationEndDate);
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  if (regStart >= regEnd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ngày bắt đầu đăng ký phải trước ngày kết thúc',
      path: ['registrationEndDate'],
    });
  }

  if (start >= end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ngày bắt đầu phải trước ngày kết thúc',
      path: ['endDate'],
    });
  }

  if (regEnd > start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ngày kết thúc đăng ký phải trước ngày bắt đầu thi đấu',
      path: ['registrationEndDate'],
    });
  }
});

type Step3Values = z.infer<typeof step3Schema>;

export default function Step3ScheduleFees() {
  const { formData, updateFormData, nextStep, prevStep } = useCreateTournamentStore();

  const { register, handleSubmit, control, formState: { errors } } = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      startDate: formData.startDate,
      endDate: formData.endDate,
      registrationStartDate: formData.registrationStartDate,
      registrationEndDate: formData.registrationEndDate,
      entryFee: String(formData.entryFee),
    },
  });

  const onSubmit = (data: Step3Values) => {
    updateFormData({
      startDate: data.startDate,
      endDate: data.endDate,
      registrationStartDate: data.registrationStartDate,
      registrationEndDate: data.registrationEndDate,
      entryFee: Number(data.entryFee),
    });
    nextStep();
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Lịch Thi Đấu & Lệ Phí</h2>
        <p className="text-sm text-slate-500">Thiết lập thời gian thi đấu và lệ phí tham gia cho giải đấu.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-slate-900">Thời Gian Đăng Ký</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="registrationStartDate"
              control={control}
              render={({ field }) => (
                <DateTimePicker
                  label="Ngày bắt đầu đăng ký"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.registrationStartDate?.message}
                />
              )}
            />
            <Controller
              name="registrationEndDate"
              control={control}
              render={({ field }) => (
                <DateTimePicker
                  label="Ngày kết thúc đăng ký"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.registrationEndDate?.message}
                />
              )}
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-slate-900">Thời Gian Thi Đấu</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <DateTimePicker
                  label="Ngày bắt đầu thi đấu"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.startDate?.message}
                />
              )}
            />
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <DateTimePicker
                  label="Ngày kết thúc thi đấu"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.endDate?.message}
                />
              )}
            />
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h4 className="font-bold text-slate-900">Lệ Phí</h4>
          </div>

          <Input
            label="Lệ phí tham gia mỗi đội (VNĐ)"
            type="number"
            placeholder="0"
            min="0"
            {...register('entryFee')}
            error={errors.entryFee?.message}
          />
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
