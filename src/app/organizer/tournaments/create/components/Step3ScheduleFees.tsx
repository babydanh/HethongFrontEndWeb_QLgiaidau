'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input, DateTimePicker } from '@/components/ui/Input';
import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { ChevronRight, ChevronLeft, Calendar, DollarSign } from 'lucide-react';

const step3Schema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  registrationStartDate: z.string().optional(),
  registrationEndDate: z.string().optional(),
  entryFee: z.string().refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'Lệ phí phải là số không âm'),
}).superRefine((data, ctx) => {
  if (data.registrationStartDate && data.registrationEndDate) {
    const regStart = new Date(data.registrationStartDate);
    const regEnd = new Date(data.registrationEndDate);
    if (regStart >= regEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ngày bắt đầu đăng ký phải trước ngày kết thúc',
        path: ['registrationEndDate'],
      });
    }
  }

  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ngày bắt đầu phải trước ngày kết thúc',
        path: ['endDate'],
      });
    }
  }

  if (data.registrationEndDate && data.startDate) {
    const regEnd = new Date(data.registrationEndDate);
    const start = new Date(data.startDate);
    if (regEnd > start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ngày kết thúc đăng ký phải trước ngày bắt đầu thi đấu',
        path: ['registrationEndDate'],
      });
    }
  }
});

type Step3Values = z.infer<typeof step3Schema>;

export default function Step3ScheduleFees() {
  const { formData, updateFormData, nextStep, prevStep } = useCreateTournamentStore();
  const isClubTournament = formData.tournamentType === 'CLUB' || Boolean(formData.communityId);

  const { register, handleSubmit, control, formState: { errors } } = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      registrationStartDate: formData.registrationStartDate || undefined,
      registrationEndDate: formData.registrationEndDate || undefined,
      entryFee: isClubTournament ? '0' : String(formData.entryFee || 0),
    },
  });

  const onSubmit = (data: Step3Values) => {
    updateFormData({
      startDate: data.startDate,
      endDate: data.endDate,
      registrationStartDate: data.registrationStartDate,
      registrationEndDate: data.registrationEndDate,
      entryFee: isClubTournament ? 0 : Number(data.entryFee),
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
        
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-5 space-y-4">
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
                  value={field.value || ''}
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
                  value={field.value || ''}
                  onChange={field.onChange}
                  error={errors.registrationEndDate?.message}
                />
              )}
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 space-y-4">
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
                  value={field.value || ''}
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
                  value={field.value || ''}
                  onChange={field.onChange}
                  error={errors.endDate?.message}
                />
              )}
            />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-slate-900">Lệ Phí</h4>
          </div>

          {isClubTournament && (
            <div className="rounded-lg border border-emerald-200 bg-white px-4 py-3">
              <p className="text-sm font-bold text-emerald-900">Miễn phí cho giải trong câu lạc bộ</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-700">
                Giải thuộc CLB không thu lệ phí qua nền tảng. Nếu CLB có khoản nội bộ riêng, hãy ghi trong mô tả hoặc thông báo CLB.
              </p>
            </div>
          )}

          <div className={isClubTournament ? 'hidden' : ''}>
          <Input
            label="Lệ phí tham gia mỗi đội (VNĐ)"
            type="number"
            placeholder="0"
            min="0"
            {...register('entryFee')}
            error={errors.entryFee?.message}
          />
          </div>
        </div>

        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-xs text-blue-700 leading-relaxed font-semibold">
          <strong>💡 Lưu ý:</strong> Các thông tin về Lịch thi đấu và Lệ phí là <strong>KHÔNG BẮT BUỘC</strong> nhập ngay tại bước này. Bạn có thể bỏ trống và linh hoạt thiết lập/chỉnh sửa chi tiết trong trang quản lý giải đấu sau.
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
