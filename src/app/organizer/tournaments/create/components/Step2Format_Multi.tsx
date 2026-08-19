'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCreateTournamentStore, type MatchFormat } from '@/lib/zustand/createTournamentStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { ChevronLeft, ChevronRight, CheckCircle2, Zap } from 'lucide-react';
import { resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { categoriesApi, type Category } from '@/features/categories/api';
import { getAllowedMatchFormatOptions, normalizeMatchFormatForCategory } from '@/features/tournaments/match-format-options';

const BRACKET_TYPE_OPTIONS: { value: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT'; labelKey: 'singleElimination' | 'doubleElimination' | 'roundRobin' | 'groupStageKnockout'; }[] = [
  { value: 'SINGLE_ELIMINATION', labelKey: 'singleElimination' },
  { value: 'DOUBLE_ELIMINATION', labelKey: 'doubleElimination' },
  { value: 'ROUND_ROBIN', labelKey: 'roundRobin' },
  { value: 'GROUP_STAGE_KNOCKOUT', labelKey: 'groupStageKnockout' },
];

export default function Step2FormatMulti() {
  const translate = useTranslations('OrganizerCreateStep2');
  const { formData, updateFormData, nextStep, prevStep, validationTarget, clearValidationTarget } = useCreateTournamentStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const resolvedRules = resolveSportRuleView(formData.sportRules);
  const presentation = getSportRulePresentation(resolvedRules.kind);
  const [bracketType, setBracketType] = useState<'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT'>(
    (formData.format as 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT') || 'SINGLE_ELIMINATION'
  );
  const selectedFormats = Array.isArray(formData.selectedFormats) ? formData.selectedFormats : [];
  const selectedCategory = categories.find((category) => category.id === formData.categoryId);
  const formatOptions = getAllowedMatchFormatOptions(selectedCategory);
  const selected = selectedFormats.length > 0 ? selectedFormats : [formData.matchFormat];
  const isFootball = resolvedRules.kind === 'FOOTBALL';
  const footballGender = formData.footballGenderRestriction ?? null;

  useEffect(() => {
    if (validationTarget?.step !== 2) return;
    setStep2Error(validationTarget.message);
    clearValidationTarget();
  }, [clearValidationTarget, validationTarget]);

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
    if (isFootball) return;
    if (!selectedCategory) {
      return;
    }

    const normalizedMatchFormat = normalizeMatchFormatForCategory(formData.matchFormat, selectedCategory);
    const normalizedSelectedFormats = (selectedFormats.length > 0 ? selectedFormats : [formData.matchFormat])
      .map((format) => normalizeMatchFormatForCategory(format, selectedCategory))
      .filter((format, index, collection) => collection.indexOf(format) === index);

    const shouldUpdateMatchFormat = normalizedMatchFormat !== formData.matchFormat;
    const shouldUpdateSelectedFormats = normalizedSelectedFormats.join('|') !== selected.join('|');
    if (!shouldUpdateMatchFormat && !shouldUpdateSelectedFormats) {
      return;
    }

    updateFormData({
      matchFormat: normalizedMatchFormat,
      selectedFormats: normalizedSelectedFormats,
    });
  }, [formData.matchFormat, isFootball, selected, selectedCategory, selectedFormats, updateFormData]);

  const toggleFormat = (format: MatchFormat) => {
    setStep2Error(null);
    const newSelected = selected.includes(format)
      ? selected.filter((f) => f !== format)
      : [...selected, format];
    updateFormData({ selectedFormats: newSelected });
  };

  // Team sport (bóng đá): khi chọn sân → set minTeamSize/maxTeamSize/maxReserve
  const [teamSize, setTeamSize] = useState<5 | 7 | 11>(7);
  const [maxReserve, setMaxReserve] = useState(3);
  const [twoLegged, setTwoLegged] = useState(false);
  const [awayGoalsRule, setAwayGoalsRule] = useState(false);
  const [penaltyShootout, setPenaltyShootout] = useState(true);
  const [allowDraw, setAllowDraw] = useState(true);

  // Keep the football controls in sync with the persisted wizard draft. The
  // controls are intentionally local while editing, but they must hydrate
  // whenever the user returns to this step or Zustand restores a saved draft.
  useEffect(() => {
    if (!isFootball) return;

    const persistedTeamSize = formData.teamSize;
    if (persistedTeamSize === 5 || persistedTeamSize === 7 || persistedTeamSize === 11) {
      setTeamSize(persistedTeamSize);
    }
    if (typeof formData.maxReserve === 'number' && Number.isFinite(formData.maxReserve)) {
      setMaxReserve(Math.max(0, Math.min(20, Math.floor(formData.maxReserve))));
    }
    if (typeof formData.twoLegged === 'boolean') setTwoLegged(formData.twoLegged);
    if (typeof formData.awayGoalsRule === 'boolean') setAwayGoalsRule(formData.awayGoalsRule);
    if (typeof formData.penaltyShootout === 'boolean') setPenaltyShootout(formData.penaltyShootout);
    if (typeof formData.allowDraw === 'boolean') setAllowDraw(formData.allowDraw);
  }, [
    formData.allowDraw,
    formData.awayGoalsRule,
    formData.maxReserve,
    formData.penaltyShootout,
    formData.teamSize,
    formData.twoLegged,
    isFootball,
  ]);

  useEffect(() => {
    const persistedFormat = formData.format;
    if (BRACKET_TYPE_OPTIONS.some((option) => option.value === persistedFormat)) {
      setBracketType(persistedFormat as typeof bracketType);
    }
  }, [formData.format]);

  const setFootballTeamSize = (size: 5 | 7 | 11) => {
    setTeamSize(size);
    updateFormData({
      teamSize: size,
      minTeamSize: size,
      teamSizeOptions: [5, 7, 11],
      maxTeamSize: size + maxReserve,
    });
  };

  const setFootballReserveLimit = (reserve: number) => {
    const safeReserve = Math.max(0, Math.min(20, Math.floor(reserve)));
    setMaxReserve(safeReserve);
    updateFormData({
      maxReserve: safeReserve,
      maxTeamSize: teamSize + safeReserve,
    });
  };

  const handleNext = () => {
    if (!isFootball && selected.length === 0) {
      setStep2Error(translate('matchTypeRequired'));
      return;
    }
    const next: Record<string, unknown> = { format: bracketType };
    if (isFootball) {
      next.footballGenderRestriction = footballGender;
      next.matchFormat = 'MALE_DOUBLES';
      next.selectedFormats = ['MALE_DOUBLES'];
      next.teamSize = teamSize;
      next.teamSizeOptions = [5, 7, 11];
      next.minTeamSize = teamSize;
      next.maxTeamSize = teamSize + maxReserve;
      next.maxReserve = maxReserve;
      next.twoLegged = twoLegged;
      next.awayGoalsRule = awayGoalsRule;
      next.penaltyShootout = penaltyShootout;
      next.allowDraw = allowDraw;
    }
    updateFormData(next);
    nextStep();
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{translate('multiTitle')}</h2>
        <p className="text-sm text-slate-500">{translate('multiDescription')}</p>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm font-bold text-blue-900">
          {translate('currentRules', { rules: presentation.sportLabel })}
        </p>
        <p className="mt-1 text-xs font-semibold text-blue-700">
          {presentation.presetSummary}
        </p>
      </div>

      {!isFootball && <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg', step2Error && 'border border-rose-500 p-2')}>
        {formatOptions.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleFormat(opt.value)}
              className={cn(
                'relative p-4 rounded-lg border-2 transition-all text-left',
                isSelected
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="font-semibold text-slate-900">{opt.label}</span>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                )}
              </div>
            </button>
          );
        })}
      </div>}
      {isFootball && (
        <div className={cn('rounded-lg border border-slate-200 bg-white p-4', step2Error && 'border-rose-500')}>
          <p className="text-sm font-semibold text-slate-800">{translate('footballGenderTitle')}</p>
          <p className="mt-1 text-xs text-slate-500">{translate('footballGenderDescription')}</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {([
              { value: 'MALE' as const, label: translate('male'), description: translate('maleTeam') },
              { value: 'FEMALE' as const, label: translate('female'), description: translate('femaleTeam') },
              { value: null, label: translate('openGender'), description: translate('allGenders') },
            ]).map((option) => (
              <button
                key={option.value ?? 'OPEN'}
                type="button"
                onClick={() => { setStep2Error(null); updateFormData({ footballGenderRestriction: option.value }); }}
                className={cn(
                  'rounded-lg border-2 p-3 text-left transition-all',
                  footballGender === option.value
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-white hover:border-slate-300',
                )}
              >
                <span className="block font-semibold text-slate-900">{option.label}</span>
                <span className="mt-1 block text-xs text-slate-500">{option.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {step2Error && <p className="text-sm font-semibold text-rose-500">{step2Error}</p>}

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
        <label className="text-sm font-semibold text-slate-700">{translate('selectBracketType')} <span className="text-rose-500">*</span></label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BRACKET_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setBracketType(opt.value);
                updateFormData({ format: opt.value });
              }}
              className={cn(
                'p-3.5 rounded-lg border-2 transition-all text-left text-sm font-semibold',
                bracketType === opt.value
                  ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 text-emerald-900'
                  : 'border-slate-300 bg-white hover:border-slate-400 text-slate-700'
              )}
            >
              {translate(opt.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="text-sm font-medium">
          {selected.length === 0 && translate('selectionNone')}
          {selected.length === 1 && translate('selectionOne', { count: selected.length })}
          {selected.length > 1 && translate('selectionMany', { count: selected.length })}
        </p>
      </div>

      {isFootball && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 space-y-4">
          <p className="text-sm font-bold text-emerald-900">⚽ {translate('footballSectionTitle')}</p>

          <div>
            <label className="text-sm font-semibold text-emerald-800">{translate('fieldLabel')}</label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {([5, 7, 11] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setFootballTeamSize(size)}
                  className={cn(
                    'p-3 rounded-lg border-2 text-center font-bold',
                    teamSize === size
                      ? 'border-emerald-500 bg-white ring-2 ring-emerald-200 text-emerald-900'
                      : 'border-emerald-200 bg-white/70 text-emerald-700 hover:border-emerald-300',
                  )}
                >
                  {translate('fieldOption', { size })}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              {translate('minimumPlayers', { count: teamSize })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-emerald-800">{translate('maximumSubstitutes')}</label>
              <select
                value={maxReserve}
                onChange={(e) => setFootballReserveLimit(Number(e.target.value))}
                className="mt-1 w-full border border-emerald-300 rounded-lg px-3 py-2 bg-white text-emerald-900"
              >
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{translate('peopleUnit', { count: n })}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-emerald-800">{translate('knockoutFormat')}</label>
              <label className="flex items-center gap-2 text-sm text-emerald-800">
                <input type="checkbox" checked={twoLegged} onChange={(e) => { setTwoLegged(e.target.checked); updateFormData({ twoLegged: e.target.checked }); }} className="w-4 h-4" />
                {translate('homeAwayLegs')}
              </label>
              {twoLegged && (
                <label className="flex items-center gap-2 text-sm text-emerald-800">
                  <input type="checkbox" checked={awayGoalsRule} onChange={(e) => { setAwayGoalsRule(e.target.checked); updateFormData({ awayGoalsRule: e.target.checked }); }} className="w-4 h-4" />
                  {translate('awayGoalsRule')}
                </label>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-emerald-800">
              <input type="checkbox" checked={allowDraw} onChange={(e) => { setAllowDraw(e.target.checked); updateFormData({ allowDraw: e.target.checked }); }} className="w-4 h-4" />
              {translate('allowDraw')}
            </label>
            <label className="flex items-center gap-2 text-sm text-emerald-800">
              <input type="checkbox" checked={penaltyShootout} onChange={(e) => { setPenaltyShootout(e.target.checked); updateFormData({ penaltyShootout: e.target.checked }); }} className="w-4 h-4" />
              {translate('penaltyShootout')}
            </label>
          </div>
        </div>
      )}

      <div className="flex justify-between mt-4 pt-6 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={prevStep} className="border-slate-200 text-slate-600">
          <ChevronLeft className="w-4 h-4 mr-1" /> {translate('back')}
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          disabled={selected.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300"
        >
          {translate('continue')} <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

