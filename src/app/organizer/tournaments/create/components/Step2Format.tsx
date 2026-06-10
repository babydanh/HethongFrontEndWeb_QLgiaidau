'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { ChevronRight, ChevronLeft, Trophy, LayoutGrid, RotateCw } from 'lucide-react';

const step2Schema = z.object({
  format: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN']),
  maxParticipants: z.string(),
  setsToWin: z.number().min(1).max(5),
  pointsPerSet: z.number().min(1).max(50),
  winByTwo: z.boolean(),
});

type Step2FormInput = z.infer<typeof step2Schema>;

export default function Step2Format() {
  const { formData, updateFormData, nextStep, prevStep } = useCreateTournamentStore();

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<Step2FormInput>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      format: formData.format,
      maxParticipants: formData.maxParticipants ? String(formData.maxParticipants) : '',
      setsToWin: formData.sportRules.setsToWin,
      pointsPerSet: formData.sportRules.pointsPerSet,
      winByTwo: formData.sportRules.winByTwo,
    },
  });

  const selectedFormat = watch('format');

  const onSubmit = (data: Step2FormInput) => {
    updateFormData({
      format: data.format,
      maxParticipants: data.maxParticipants === '' ? null : Number(data.maxParticipants),
      sportRules: {
        setsToWin: data.setsToWin,
        pointsPerSet: data.pointsPerSet,
        winByTwo: data.winByTwo,
      }
    });
    nextStep();
  };

  const formatOptions = [
    { id: 'SINGLE_ELIMINATION', label: 'Loại Trực Tiếp', icon: Trophy, desc: 'Đội thua sẽ bị loại khỏi giải đấu ngay lập tức.' },
    { id: 'DOUBLE_ELIMINATION', label: 'Nhánh Thắng / Nhánh Thua', icon: LayoutGrid, desc: 'Đội thua một trận sẽ rớt xuống nhánh thua.' },
    { id: 'ROUND_ROBIN', label: 'Vòng Tròn Tính Điểm', icon: RotateCw, desc: 'Tất cả các đội đều gặp nhau một lần.' },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Thể thức thi đấu</h2>
        <p className="text-sm text-slate-500">Quy định cách thức các đội đối đầu và tính điểm.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        
        {/* Format Selection */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-slate-700">Hình thức tổ chức</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formatOptions.map((opt) => {
              const isSelected = selectedFormat === opt.id;
              const Icon = opt.icon;
              return (
                <div 
                  key={opt.id}
                  onClick={() => setValue('format', opt.id as any)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className={`font-bold mb-1 ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>{opt.label}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
                </div>
              );
            })}
          </div>
          {errors.format && <p className="text-xs font-semibold text-red-500">{errors.format.message}</p>}
        </div>

        <Input
          label="Số đội tham gia tối đa"
          placeholder="Để trống nếu không giới hạn"
          type="number"
          {...register('maxParticipants')}
          error={errors.maxParticipants?.message}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="md:col-span-2 mb-2 border-b border-slate-200 pb-2">
            <h4 className="font-bold text-slate-900">Quy định tính điểm</h4>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Số Set chạm (chạm là thắng)</label>
            <select {...register('setsToWin', { valueAsNumber: true })} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={1}>1 Set</option>
              <option value={2}>2 Set (Best of 3)</option>
              <option value={3}>3 Set (Best of 5)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Điểm mỗi Set</label>
            <Input type="number" {...register('pointsPerSet', { valueAsNumber: true })} />
          </div>

          <div className="md:col-span-2 flex items-center gap-3 mt-2">
            <input type="checkbox" id="winByTwo" {...register('winByTwo')} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-slate-300" />
            <label htmlFor="winByTwo" className="text-sm font-medium text-slate-700 cursor-pointer">
              Bắt buộc thắng cách biệt 2 điểm (Deuce)
            </label>
          </div>
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
