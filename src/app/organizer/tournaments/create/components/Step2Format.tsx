'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { ChevronRight, ChevronLeft, Trophy, LayoutGrid, RotateCw } from 'lucide-react';
import { resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { buildDefaultSportRules } from '@/features/tournaments/sport-rules/defaults';
import { getAllowedSportRuleKinds, normalizeSportRuleKindForCategory } from '@/features/tournaments/sport-rules/options';
import { buildSportRulesPayload } from '@/features/tournaments/sport-rules/payload';
import { categoriesApi, type Category } from '@/features/categories/api';
import type { SportRuleKind } from '@/types/tournament';

const step2Schema = z.object({
  format: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'GROUP_STAGE_KNOCKOUT']),
  maxParticipants: z.string(),
  setsToWin: z.number().min(1).max(5),
  pointsPerSet: z.number().min(1).max(50),
  winByTwo: z.boolean(),
  tiebreakPoints: z.string().optional().refine((value) => {
    if (!value || value.trim() === '') {
      return true;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 1;
  }, 'Điểm tie-break phải lớn hơn hoặc bằng 1'),
});

type Step2FormInput = z.infer<typeof step2Schema>;

export default function Step2Format() {
  const { formData, updateFormData, nextStep, prevStep } = useCreateTournamentStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const resolvedRules = resolveSportRuleView(formData.sportRules);
  const selectedCategory = categories.find((category) => category.id === formData.categoryId);
  const availableSportRuleKinds = getAllowedSportRuleKinds(selectedCategory);
  const presentation = getSportRulePresentation(resolvedRules.kind);
  const setUnitLabel = presentation.setUnitLabel;
  const winByTwoLabel = presentation.winByTwoLabel;
  const isPickleballVariant =
    availableSportRuleKinds.includes('PICKLEBALL_RALLY') || availableSportRuleKinds.includes('PICKLEBALL_SIDE_OUT');
  const isTennisVariant = resolvedRules.kind === 'TENNIS';
  const supportsTiebreakInput = isTennisVariant || resolvedRules.kind === 'PICKLEBALL_SIDE_OUT';

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<Step2FormInput>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      format: formData.format,
      maxParticipants: formData.maxParticipants ? String(formData.maxParticipants) : '',
      setsToWin: resolvedRules.setsToWin,
      pointsPerSet: resolvedRules.pointsPerSet,
      winByTwo: resolvedRules.winByTwo,
      tiebreakPoints: resolvedRules.tiebreakPoints ? String(resolvedRules.tiebreakPoints) : '',
    },
  });

  const selectedFormat = watch('format');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await categoriesApi.getCategories();
        setCategories(response.data ?? []);
      } catch {
        setCategories([]);
      }
    };

    void loadCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategory) {
      return;
    }

    const normalizedKind = normalizeSportRuleKindForCategory(resolvedRules.kind, selectedCategory);
    if (normalizedKind === resolvedRules.kind) {
      return;
    }

    const nextRules = buildDefaultSportRules(normalizedKind);
    const nextResolvedRules = resolveSportRuleView(nextRules);
    updateFormData({ sportRules: nextRules });
    setValue('setsToWin', nextResolvedRules.setsToWin);
    setValue('pointsPerSet', nextResolvedRules.pointsPerSet);
    setValue('winByTwo', nextResolvedRules.winByTwo);
    setValue('tiebreakPoints', nextResolvedRules.tiebreakPoints ? String(nextResolvedRules.tiebreakPoints) : '');
  }, [resolvedRules.kind, selectedCategory, setValue, updateFormData]);

  const handleSportKindChange = (nextKind: SportRuleKind) => {
    const normalizedKind = normalizeSportRuleKindForCategory(nextKind, selectedCategory);
    const nextRules = buildDefaultSportRules(normalizedKind);
    const nextResolvedRules = resolveSportRuleView(nextRules);

    updateFormData({ sportRules: nextRules });
    setValue('setsToWin', nextResolvedRules.setsToWin);
    setValue('pointsPerSet', nextResolvedRules.pointsPerSet);
    setValue('winByTwo', nextResolvedRules.winByTwo);
    setValue('tiebreakPoints', nextResolvedRules.tiebreakPoints ? String(nextResolvedRules.tiebreakPoints) : '');
  };

  const onSubmit = (data: Step2FormInput) => {
    const parsedTiebreakPoints = data.tiebreakPoints && data.tiebreakPoints.trim() !== ''
      ? Number(data.tiebreakPoints)
      : undefined;

    updateFormData({
      format: data.format,
      maxParticipants: data.maxParticipants === '' ? null : Number(data.maxParticipants),
      sportRules: buildSportRulesPayload({
        kind: normalizeSportRuleKindForCategory(resolvedRules.kind, selectedCategory),
        setsToWin: data.setsToWin,
        pointsPerSet: data.pointsPerSet,
        winByTwo: data.winByTwo,
        maxPoints: formData.sportRules.maxPoints as number | undefined,
        tiebreakPoints: supportsTiebreakInput ? parsedTiebreakPoints : null,
      }),
    });
    nextStep();
  };

  const formatOptions = [
    { id: 'SINGLE_ELIMINATION', label: 'Loại Trực Tiếp', icon: Trophy, desc: 'Đội thua sẽ bị loại khỏi giải đấu ngay lập tức.' },
    { id: 'DOUBLE_ELIMINATION', label: 'Nhánh Thắng / Nhánh Thua', icon: LayoutGrid, desc: 'Đội thua một trận sẽ rớt xuống nhánh thua.' },
    { id: 'ROUND_ROBIN', label: 'Vòng Tròn Tính Điểm', icon: RotateCw, desc: 'Tất cả các đội đều gặp nhau một lần.' },
    { id: 'GROUP_STAGE_KNOCKOUT', label: 'Vòng Bảng + Loại Trực Tiếp', icon: LayoutGrid, desc: 'Chia bảng đấu vòng tròn, sau đó các đội nhất bảng vào vòng loại trực tiếp.' },
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
                  onClick={() => setValue('format', opt.id as 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT')}
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

        {isPickleballVariant && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-900">Chọn mode tính điểm Pickleball</p>
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              `Rally` dễ vận hành và nhập tỷ số. `Side-out` chuẩn sâu hơn, chỉ bên giao bóng mới ghi điểm.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {([
                { kind: 'PICKLEBALL_RALLY', title: 'Rally Scoring', description: 'Mỗi pha bóng đều có điểm, phù hợp giải phổ thông và dễ live score.' },
                { kind: 'PICKLEBALL_SIDE_OUT', title: 'Side-out Scoring', description: 'Chỉ đội giao mới lên điểm, đúng kiểu pickleball truyền thống hơn.' },
              ] as const)
                .filter((option) => availableSportRuleKinds.includes(option.kind))
                .map((option) => {
                const isActive = resolvedRules.kind === option.kind;
                return (
                  <button
                    key={option.kind}
                    type="button"
                    onClick={() => handleSportKindChange(option.kind)}
                    className={`rounded-xl border px-4 py-3 text-left transition-all ${
                      isActive
                        ? 'border-emerald-500 bg-white ring-2 ring-emerald-200'
                        : 'border-emerald-100 bg-white/80 hover:border-emerald-300'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-900">{option.title}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="md:col-span-2 mb-2 border-b border-slate-200 pb-2">
            <h4 className="font-bold text-slate-900">Quy định tính điểm</h4>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {presentation.sportLabel}: {presentation.scoringLabel}. {presentation.presetSummary}
            </p>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Số Set chạm (chạm là thắng)</label>
            <select {...register('setsToWin', { valueAsNumber: true })} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {presentation.setOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">{setUnitLabel}</label>
            <Input
              type="number"
              placeholder={presentation.maxScorePlaceholder}
              {...register('pointsPerSet', { valueAsNumber: true })}
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3 mt-2">
            <input type="checkbox" id="winByTwo" {...register('winByTwo')} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-slate-300" />
            <label htmlFor="winByTwo" className="text-sm font-medium text-slate-700 cursor-pointer">
              {winByTwoLabel}
            </label>
          </div>

          {supportsTiebreakInput && (
            <div className="md:col-span-2">
              <Input
                label={presentation.tiebreakLabel}
                type="number"
                placeholder={resolvedRules.kind === 'TENNIS' ? 'Ví dụ: 7' : 'Ví dụ: 11'}
                {...register('tiebreakPoints')}
                error={errors.tiebreakPoints?.message}
              />
            </div>
          )}
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
