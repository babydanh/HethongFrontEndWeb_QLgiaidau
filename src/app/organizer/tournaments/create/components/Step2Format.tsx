'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { ChevronRight, ChevronLeft, Trophy, LayoutGrid, RotateCw, AlertTriangle } from 'lucide-react';
import { resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { buildDefaultSportRules } from '@/features/tournaments/sport-rules/defaults';
import { getAllowedSportRuleKinds, normalizeSportRuleKindForCategory } from '@/features/tournaments/sport-rules/options';
import { buildSportRulesPayload } from '@/features/tournaments/sport-rules/payload';
import { categoriesApi, type Category } from '@/features/categories/api';
import type { SportRuleKind } from '@/types/tournament';

const createStep2Schema = (translate: ReturnType<typeof useTranslations>) => z.object({
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
  }, translate('tiebreakMin')),
});

type Step2FormInput = z.infer<ReturnType<typeof createStep2Schema>>;

export default function Step2Format() {
  const translate = useTranslations('OrganizerCreateStep2');
  const { formData, updateFormData, nextStep, prevStep } = useCreateTournamentStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const resolvedRules = resolveSportRuleView(formData.sportRules);
  const selectedCategory = categories.find((category) => category.id === formData.categoryId);
  const availableSportRuleKinds = getAllowedSportRuleKinds(selectedCategory);
  const presentation = getSportRulePresentation(resolvedRules.kind);
  const optionPrefix = presentation.kind === 'FOOTBALL'
    ? 'matchOption'
    : presentation.kind === 'PICKLEBALL_SIDE_OUT'
      ? 'gameOption'
      : 'setOption';
  const localizedSetOptions = presentation.setOptions.map((option) => ({
    ...option,
    label: translate(`${optionPrefix}${option.value === 1 ? 'One' : option.value === 2 ? 'Two' : option.value === 3 ? 'Three' : 'Four'}`),
  }));
  const presentationCopy = (() => {
    const copyByKind = {
      BADMINTON: { sportLabel: 'sportBadminton', scoringLabel: 'scoringBadminton', setUnitLabel: 'setUnitBadminton', winByTwoLabel: 'winByTwoBadminton', presetSummary: 'presetBadminton', maxScorePlaceholder: 'maxScorePlaceholderBadminton', tiebreakLabel: 'tiebreakBadminton' },
      TABLE_TENNIS: { sportLabel: 'sportTableTennis', scoringLabel: 'scoringTableTennis', setUnitLabel: 'setUnitTableTennis', winByTwoLabel: 'winByTwoTableTennis', presetSummary: 'presetTableTennis', maxScorePlaceholder: 'maxScorePlaceholderTableTennis', tiebreakLabel: 'tiebreakTableTennis' },
      PICKLEBALL_RALLY: { sportLabel: 'sportPickleball', scoringLabel: 'scoringPickleballRally', setUnitLabel: 'setUnitPickleballRally', winByTwoLabel: 'winByTwoPickleballRally', presetSummary: 'presetPickleballRally', maxScorePlaceholder: 'maxScorePlaceholderPickleballRally', tiebreakLabel: 'tiebreakPickleballRally' },
      PICKLEBALL_SIDE_OUT: { sportLabel: 'sportPickleball', scoringLabel: 'scoringPickleballSideOut', setUnitLabel: 'setUnitPickleballSideOut', winByTwoLabel: 'winByTwoPickleballSideOut', presetSummary: 'presetPickleballSideOut', maxScorePlaceholder: 'maxScorePlaceholderPickleballSideOut', tiebreakLabel: 'tiebreakPickleballSideOut' },
      TENNIS: { sportLabel: 'sportTennis', scoringLabel: 'scoringTennis', setUnitLabel: 'setUnitTennis', winByTwoLabel: 'winByTwoTennis', presetSummary: 'presetTennis', maxScorePlaceholder: 'maxScorePlaceholderTennis', tiebreakLabel: 'tiebreakTennis' },
      FOOTBALL: { sportLabel: 'sportFootball', scoringLabel: 'scoringFootball', setUnitLabel: 'setUnitFootball', winByTwoLabel: 'winByTwoFootball', presetSummary: 'presetFootball', maxScorePlaceholder: 'maxScorePlaceholderFootball', tiebreakLabel: 'tiebreakFootball' },
    }[presentation.kind];
    return Object.fromEntries(Object.entries(copyByKind).map(([key, messageKey]) => [key, translate(messageKey)]));
  })();
  const setUnitLabel = presentationCopy.setUnitLabel;
  const winByTwoLabel = presentationCopy.winByTwoLabel;
  const isPickleballVariant =
    availableSportRuleKinds.includes('PICKLEBALL_RALLY') || availableSportRuleKinds.includes('PICKLEBALL_SIDE_OUT');
  const isTennisVariant = resolvedRules.kind === 'TENNIS';
  const supportsTiebreakInput = isTennisVariant || resolvedRules.kind === 'PICKLEBALL_SIDE_OUT';

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<Step2FormInput>({
    resolver: zodResolver(createStep2Schema(translate)),
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
        setCategories(response.data?.filter((c) => c.isActive !== false) ?? []);
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
        mode: 'STRICT',
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
    { id: 'SINGLE_ELIMINATION', labelKey: 'singleElimination', icon: Trophy, descKey: 'singleEliminationDescription' },
    { id: 'DOUBLE_ELIMINATION', labelKey: 'doubleElimination', icon: LayoutGrid, descKey: 'doubleEliminationDescription' },
    { id: 'ROUND_ROBIN', labelKey: 'roundRobin', icon: RotateCw, descKey: 'roundRobinDescription' },
    { id: 'GROUP_STAGE_KNOCKOUT', labelKey: 'groupStageKnockout', icon: LayoutGrid, descKey: 'groupStageKnockoutDescription' },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{translate('title')}</h2>
        <p className="text-sm text-slate-500">{translate('subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        
        {/* Format Selection */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-slate-700">{translate('formatSelection')}</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formatOptions.map((opt) => {
              const isSelected = selectedFormat === opt.id;
              const Icon = opt.icon;
              return (
                <div 
                  key={opt.id}
                  onClick={() => setValue('format', opt.id as 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT')}
                  className={`cursor-pointer rounded-lg border p-4 transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className={`font-bold mb-1 ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>{translate(opt.labelKey)}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{translate(opt.descKey)}</p>
                </div>
              );
            })}
          </div>
          {errors.format && <p className="text-xs font-semibold text-rose-500">{errors.format.message}</p>}
        </div>

        <Input
          label={translate('maxParticipants')}
          placeholder={translate('maxParticipantsPlaceholder')}
          type="number"
          {...register('maxParticipants')}
          error={errors.maxParticipants?.message}
        />

        {selectedFormat === 'ROUND_ROBIN' && Number(watch('maxParticipants')) > 15 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed font-medium">
              <strong className="font-bold text-amber-950">⚠️ {translate('roundRobinLimitTitle')}:</strong> {translate('roundRobinLimitDescription')}
              <br />
              {translate('roundRobinAlternativeDescription', { count: watch('maxParticipants') })}
            </div>
          </div>
        )}

        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-xs text-blue-700 leading-relaxed font-medium">
          <strong>💡 {translate('tip')}:</strong> {translate('maxTeamsTip')}
        </div>

        {isPickleballVariant && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-emerald-900">{translate('pickleballMode')}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-700">{translate('pickleballDescription')}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {([
                { kind: 'PICKLEBALL_RALLY', title: translate('pickleballRallyTitle'), description: translate('pickleballRallyDescription') },
                { kind: 'PICKLEBALL_SIDE_OUT', title: translate('pickleballSideOutTitle'), description: translate('pickleballSideOutDescription') },
              ] as const)
                .filter((option) => availableSportRuleKinds.includes(option.kind))
                .map((option) => {
                const isActive = resolvedRules.kind === option.kind;
                return (
                  <button
                    key={option.kind}
                    type="button"
                    onClick={() => handleSportKindChange(option.kind)}
                    className={`rounded-lg border px-4 py-3 text-left transition-all ${
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-slate-50 border border-slate-100 rounded-lg">
          <div className="md:col-span-2 mb-2 border-b border-slate-200 pb-2">
            <h4 className="font-bold text-slate-900">{translate('scoringRules')}</h4>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {presentationCopy.sportLabel}: {presentationCopy.scoringLabel}. {presentationCopy.presetSummary}
            </p>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">{translate('setToWin')}</label>
            <select {...register('setsToWin', { valueAsNumber: true })} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {localizedSetOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">{setUnitLabel}</label>
            <Input
              type="number"
                placeholder={presentationCopy.maxScorePlaceholder}
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
                label={presentationCopy.tiebreakLabel}
                type="number"
                placeholder={translate(resolvedRules.kind === 'TENNIS' ? 'tiebreakExampleTennis' : 'tiebreakExampleOther')}
                {...register('tiebreakPoints')}
                error={errors.tiebreakPoints?.message}
              />
            </div>
          )}
        </div>

        <div className="flex justify-between mt-4 pt-6 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={prevStep} className="border-slate-200 text-slate-600">
            <ChevronLeft className="w-4 h-4 mr-1" /> {translate('back')}
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            {translate('continue')} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </form>
    </div>
  );
}

