'use client';

import { useEffect, useState } from 'react';
import { useCreateTournamentStore, type MatchFormat } from '@/lib/zustand/createTournamentStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { ChevronLeft, ChevronRight, CheckCircle2, Zap } from 'lucide-react';
import { resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { categoriesApi, type Category } from '@/features/categories/api';
import { getAllowedMatchFormatOptions, normalizeMatchFormatForCategory } from '@/features/tournaments/match-format-options';

const BRACKET_TYPE_OPTIONS: { value: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT'; label: string; }[] = [
  { value: 'SINGLE_ELIMINATION', label: 'Loại trực tiếp (Single Elimination)' },
  { value: 'DOUBLE_ELIMINATION', label: 'Nhánh thắng/thua (Double Elimination)' },
  { value: 'ROUND_ROBIN', label: 'Vòng tròn tính điểm (Round Robin)' },
  { value: 'GROUP_STAGE_KNOCKOUT', label: 'Vòng bảng + Loại trực tiếp (Group Stage)' },
];

export default function Step2FormatMulti() {
  const { formData, updateFormData, nextStep, prevStep } = useCreateTournamentStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const resolvedRules = resolveSportRuleView(formData.sportRules);
  const presentation = getSportRulePresentation(resolvedRules.kind);
  const [bracketType, setBracketType] = useState<'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT'>(
    (formData.format as 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT') || 'SINGLE_ELIMINATION'
  );
  const selectedFormats = Array.isArray(formData.selectedFormats) ? formData.selectedFormats : [];
  const selectedCategory = categories.find((category) => category.id === formData.categoryId);
  const formatOptions = getAllowedMatchFormatOptions(selectedCategory);
  const selected = selectedFormats.length > 0 ? selectedFormats : [formData.matchFormat];

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
  }, [formData.matchFormat, selected, selectedCategory, selectedFormats, updateFormData]);

  const toggleFormat = (format: MatchFormat) => {
    const newSelected = selected.includes(format)
      ? selected.filter((f) => f !== format)
      : [...selected, format];
    updateFormData({ selectedFormats: newSelected });
  };

  const handleNext = () => {
    if (selected.length === 0) return;
    updateFormData({ format: bracketType });
    nextStep();
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Chọn Hình Thức Thi Đấu</h2>
        <p className="text-sm text-slate-500">Bạn có thể chọn một hoặc nhiều hình thức. Mỗi hình thức sẽ tạo một bảng thi đấu riêng.</p>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm font-bold text-blue-900">
          Bộ luật hiện tại: {presentation.sportLabel}
        </p>
        <p className="mt-1 text-xs font-semibold text-blue-700">
          {presentation.presetSummary}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
        <label className="text-sm font-semibold text-slate-700">Chọn Loại nhánh thi đấu <span className="text-rose-500">*</span></label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BRACKET_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBracketType(opt.value)}
              className={cn(
                'p-3.5 rounded-lg border-2 transition-all text-left text-sm font-semibold',
                bracketType === opt.value
                  ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 text-emerald-900'
                  : 'border-slate-300 bg-white hover:border-slate-400 text-slate-700'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="text-sm font-medium">
          {selected.length === 0 && 'Vui lòng chọn ít nhất một hình thức.'}
          {selected.length === 1 && `Bạn chọn ${selected.length} hình thức. Sẽ tạo 1 bảng thi đấu.`}
          {selected.length > 1 && `Bạn chọn ${selected.length} hình thức. Sẽ tạo ${selected.length} bảng thi đấu riêng biệt.`}
        </p>
      </div>

      <div className="flex justify-between mt-4 pt-6 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={prevStep} className="border-slate-200 text-slate-600">
          <ChevronLeft className="w-4 h-4 mr-1" /> Quay lại
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          disabled={selected.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300"
        >
          Tiếp tục <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

