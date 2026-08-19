'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { categoriesApi, Category } from '@/features/categories/api';
import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { ChevronRight, Trophy, LayoutGrid, RotateCw, Shield, Lock } from 'lucide-react';
import { communitiesApi, Community } from '@/features/communities/api';
import { buildDefaultSportRules } from '@/features/tournaments/sport-rules/defaults';
import { inferSportRuleKindFromCategory } from '@/features/tournaments/sport-rules/normalize';
import { normalizeMatchFormatForCategory } from '@/features/tournaments/match-format-options';



const createStep1Schema = (translate: ReturnType<typeof useTranslations>) => z.object({
  name: z.string().min(5, translate('nameMin')).max(150, translate('nameMax')),
  description: z.string().min(10, translate('descriptionMin')).max(1000, translate('descriptionMax')),
  categoryId: z.string().min(1, translate('categoryRequired')),
  tournamentType: z.enum(['CLUB', 'PUBLIC']).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
  isRanked: z.boolean(),
  registrationMode: z.enum(['OPEN', 'APPROVAL', 'INVITE_ONLY']),
  maxParticipants: z.string().refine((val) => {
    if (val === '') return true;
    const num = Number(val);
    return !isNaN(num) && num >= 2;
  }, translate('maxParticipantsMin')),
  minElo: z.string().optional().refine((val) => {
    if (!val || val === '') return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, translate('minEloMin')),
  maxElo: z.string().optional().refine((val) => {
    if (!val || val === '') return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, translate('maxEloMin')),
  maxCombinedElo: z.string().optional().refine((val) => {
    if (!val || val === '') return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, translate('maxCombinedEloMin')),
  maxTeammateGap: z.string().optional().refine((val) => {
    if (!val || val === '') return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, translate('maxTeammateGapMin')),
}).superRefine((data, ctx) => {
  if (data.minElo && data.maxElo && Number(data.minElo) > Number(data.maxElo)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: translate('minEloNotGreater'),
      path: ['minElo'],
    });
  }
});

type Step1Values = z.infer<ReturnType<typeof createStep1Schema>>;

export default function Step1Info() {
  const translate = useTranslations('OrganizerCreateStep1');
  const { formData, updateFormData, nextStep, validationTarget, clearValidationTarget } = useCreateTournamentStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clubCommunity, setClubCommunity] = useState<Community | null>(null);

  const { register, handleSubmit, setValue, setError, setFocus, control, formState: { errors } } = useForm<Step1Values>({
    resolver: zodResolver(createStep1Schema(translate)),
    defaultValues: {
      name: formData.name,
      description: formData.description,
      categoryId: formData.categoryId,
      tournamentType: formData.communityId ? (formData.tournamentType || 'CLUB') : 'PUBLIC',
      visibility: formData.visibility || 'PUBLIC',
      isRanked: formData.isRanked ?? true,
      registrationMode: formData.registrationMode || 'OPEN',
      maxParticipants: formData.maxParticipants ? String(formData.maxParticipants) : '16',
      minElo: formData.minElo !== null && formData.minElo !== undefined ? String(formData.minElo) : '',
      maxElo: formData.maxElo !== null && formData.maxElo !== undefined ? String(formData.maxElo) : '',
      maxCombinedElo: formData.maxCombinedElo !== null && formData.maxCombinedElo !== undefined ? String(formData.maxCombinedElo) : '',
      maxTeammateGap: formData.maxTeammateGap !== null && formData.maxTeammateGap !== undefined ? String(formData.maxTeammateGap) : '',
    },
  });

  useEffect(() => {
    if (validationTarget?.step !== 1) return;
    const field = validationTarget.field as keyof Step1Values;
    setError(field, { type: 'publish', message: validationTarget.message });
    setFocus(field);
    clearValidationTarget();
  }, [clearValidationTarget, setError, setFocus, validationTarget]);

  const watchIsRanked = useWatch({ control, name: 'isRanked' });
  const watchTournamentType = useWatch({ control, name: 'tournamentType' }) || (formData.communityId ? 'CLUB' : 'PUBLIC');
  const watchVisibility = useWatch({ control, name: 'visibility' }) || 'PUBLIC';
  const watchRegistrationMode = useWatch({ control, name: 'registrationMode' }) || 'OPEN';
  const [selectedFormat, setSelectedFormat] = useState<'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT'>(
    formData.format || 'SINGLE_ELIMINATION'
  );
  const [enableEloLimit, setEnableEloLimit] = useState<boolean>(() => {
    return (
      (formData.minElo !== null && formData.minElo !== undefined) ||
      (formData.maxElo !== null && formData.maxElo !== undefined) ||
      (formData.maxCombinedElo !== null && formData.maxCombinedElo !== undefined) ||
      (formData.maxTeammateGap !== null && formData.maxTeammateGap !== undefined)
    );
  });
  const [fees, setFees] = useState({
    feePublicRanked: 100000,
    feePublicUnranked: 50000,
    feeClub: 0,
    pctPublicRanked: 5,
    pctPublicUnranked: 5,
    pctClub: 0,
  });

  useEffect(() => {
    const fetchCategoriesAndFees = async () => {
      try {
        const catRes = await categoriesApi.getCategories();
        if (catRes.data) {
          const activeCats = catRes.data.filter((c) => {
            const catKey = c.slug || c.id;
            if (typeof window !== 'undefined') {
              const localOverride = localStorage.getItem(`sport_active_${catKey}`);
              if (localOverride === 'false') return false;
              if (localOverride === 'true') return true;
            }
            return c.isActive !== false && (c.categoryConfig as Record<string, unknown> | null | undefined)?.isActive !== false;
          });
          setCategories(activeCats);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setIsLoading(false);
      }

      try {
        const feesRes = await api.get<ApiResponse<{
          feePublicRanked: number;
          feePublicUnranked: number;
          feeClub: number;
          pctPublicRanked: number;
          pctPublicUnranked: number;
          pctClub: number;
        }>>('/tournaments/fees');
        if (feesRes.data) setFees(feesRes.data);
      } catch (error) {
        console.error('Failed to fetch fees config:', error);
      }
    };
    fetchCategoriesAndFees();

    if (formData.communityId) {
      communitiesApi.getCommunityById(formData.communityId)
        .then((res) => {
          const comm = (res as { data?: Community })?.data || (res as unknown as Community);
          if (comm) {
            setClubCommunity(comm);
            if (comm.categories?.[0]) {
              const clubCatId = comm.categories[0].id;
              setValue('categoryId', clubCatId);
              updateFormData({ categoryId: clubCatId });
            }
          }
        })
        .catch((err) => {
          console.error('Failed to fetch club community:', err);
        });
    }
  }, [formData.communityId, setValue, updateFormData]);

  const clubCategory = clubCommunity?.categories?.[0];
  const isClubLocked = Boolean(formData.communityId && clubCategory);

  const onSubmit = (data: Step1Values) => {
    const finalCategoryId = isClubLocked && clubCategory ? clubCategory.id : data.categoryId;
    const selectedCategory = categories.find((category) => category.id === finalCategoryId);
    const inferredKind = inferSportRuleKindFromCategory(selectedCategory);

    updateFormData({
      name: trimAndNormalizeSpaces(data.name),
      description: data.description ? trimAndNormalizeSpaces(data.description) : '',
      categoryId: finalCategoryId,
      format: selectedFormat,
      sportRules: buildDefaultSportRules(inferredKind),
      matchFormat: normalizeMatchFormatForCategory(formData.matchFormat, selectedCategory),
      selectedFormats: formData.selectedFormats
        .map((format) => normalizeMatchFormatForCategory(format, selectedCategory))
        .filter((format, index, collection) => collection.indexOf(format) === index),
      tournamentType: formData.communityId ? (data.tournamentType || 'CLUB') : 'PUBLIC',
      visibility: data.visibility,
      isRanked: data.isRanked,
      registrationMode: data.registrationMode,
      maxParticipants: data.maxParticipants === '' ? null : Number(data.maxParticipants),
      minElo: enableEloLimit && data.minElo !== '' && data.minElo !== undefined ? Number(data.minElo) : null,
      maxElo: enableEloLimit && data.maxElo !== '' && data.maxElo !== undefined ? Number(data.maxElo) : null,
      maxCombinedElo: enableEloLimit && data.maxCombinedElo !== '' && data.maxCombinedElo !== undefined ? Number(data.maxCombinedElo) : null,
      maxTeammateGap: enableEloLimit && data.maxTeammateGap !== '' && data.maxTeammateGap !== undefined ? Number(data.maxTeammateGap) : null,
    });
    nextStep();
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{translate('title')}</h2>
        <p className="text-sm text-slate-500">{translate('subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Input
          label={translate('tournamentName')}
          placeholder={translate('namePlaceholder')}
          {...register('name')}
          error={errors.name?.message}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                {translate('sport')} <span className="text-rose-500">*</span>
              </label>
              {isClubLocked && clubCategory && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  <Lock className="w-3 h-3" /> {translate('lockedByClub')}
                </span>
              )}
            </div>
            <select 
              {...register('categoryId')} 
              className={`border rounded-lg px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed ${
                errors.categoryId ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-500'
              }`}
              disabled={isLoading || isClubLocked}
            >
              <option value="">{isLoading ? translate('loading') : translate('chooseSport')}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {isClubLocked && clubCategory && (
              <p className="text-xs text-slate-500 font-medium">
                🔒 {translate('clubSportLocked', { name: clubCategory.name })}
              </p>
            )}
            {errors.categoryId && !isClubLocked && <p className="text-xs font-semibold text-rose-500">{errors.categoryId.message}</p>}
          </div>

          <div className="flex flex-col">
            <Input
              label={translate('maxParticipants')}
              placeholder={translate('maxParticipantsPlaceholder')}
              type="number"
              {...register('maxParticipants')}
              error={errors.maxParticipants?.message}
            />
            <p className="text-[11px] text-slate-400 mt-1 font-semibold pl-1">
              💡 {translate('maxParticipantsHint')}
            </p>
          </div>
        </div>

        {formData.communityId && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col gap-3">
            <label className="text-sm font-semibold text-slate-900">{translate('participants')} <span className="text-rose-500">*</span></label>
            <div className="flex flex-col sm:flex-row gap-4 mt-1">
              <label className="flex-1 flex flex-col p-4 border rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-all relative border-slate-200">
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    value="CLUB"
                    {...register('tournamentType')}
                    checked={watchTournamentType === 'CLUB'}
                    onChange={() => setValue('tournamentType', 'CLUB')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
                  />
                  <span className="text-sm font-bold text-slate-800">{translate('clubTournament')}</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-2 pl-6 leading-relaxed">
                  {translate('clubTournamentDescription')}
                </span>
              </label>

              <label className="flex-1 flex flex-col p-4 border rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-all relative border-slate-200">
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    value="PUBLIC"
                    {...register('tournamentType')}
                    checked={watchTournamentType === 'PUBLIC'}
                    onChange={() => setValue('tournamentType', 'PUBLIC')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
                  />
                  <span className="text-sm font-bold text-slate-800">{translate('publicTournament')}</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-2 pl-6 leading-relaxed">
                  {translate('publicTournamentDescription')}
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Ranked or Unranked Option */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col gap-3">
          <label className="text-sm font-semibold text-slate-900">{translate('performanceType')} <span className="text-rose-500">*</span></label>
          <div className="flex gap-6 mt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="isRanked" 
                checked={watchIsRanked === true} 
                onChange={() => setValue('isRanked', true)} 
                className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
              />
              <span className="text-sm font-semibold text-slate-800">{translate('rankedOption')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="isRanked" 
                checked={watchIsRanked === false} 
                onChange={() => setValue('isRanked', false)} 
                className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
              />
              <span className="text-sm font-semibold text-slate-800">{translate('unrankedOption')}</span>
            </label>
          </div>
          
          <div className="mt-1 text-xs leading-relaxed text-slate-500 border-t border-slate-200/60 pt-3">
            {watchTournamentType === 'CLUB' ? (
              <p className="text-slate-600 font-medium bg-slate-50/50 p-2.5 rounded-lg border border-slate-200/50">
                💡 {translate('clubRankedNote', { fee: fees.pctClub })}
              </p>
            ) : watchIsRanked ? (
              <p className="text-slate-600 font-medium bg-slate-50/50 p-2.5 rounded-lg border border-slate-200/50">
                💡 {translate('publicRankedNote', { fee: (fees.feePublicRanked / 1000).toString(), percent: fees.pctPublicRanked })}
              </p>
            ) : (
              <p className="text-slate-600 font-medium bg-slate-50/50 p-2.5 rounded-lg border border-slate-200/50">
                💡 {translate('publicUnrankedNote', { fee: (fees.feePublicUnranked / 1000).toString(), percent: fees.pctPublicUnranked })}
              </p>
            )}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col gap-3">
          <label className="text-sm font-semibold text-slate-900">{translate('visibility')} <span className="text-rose-500">*</span></label>
          <p className="text-xs text-slate-500">{translate('visibilityDescription')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
            <label className={`flex flex-col p-4 border rounded-lg bg-white cursor-pointer transition-all ${watchVisibility === 'PUBLIC' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-2">
                <input type="radio" value="PUBLIC" {...register('visibility')} checked={watchVisibility === 'PUBLIC'} onChange={() => setValue('visibility', 'PUBLIC')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-bold text-slate-800">{translate('publicVisibility')}</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-2 pl-6 leading-relaxed">
                {watchTournamentType === 'CLUB'
                  ? translate('publicClubVisibilityDescription')
                  : translate('publicGlobalVisibilityDescription')}
              </span>
            </label>

            <label className={`flex flex-col p-4 border rounded-lg bg-white cursor-pointer transition-all ${watchVisibility === 'PRIVATE' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-2">
                <input type="radio" value="PRIVATE" {...register('visibility')} checked={watchVisibility === 'PRIVATE'} onChange={() => setValue('visibility', 'PRIVATE')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-bold text-slate-800">{translate('privateVisibility')}</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-2 pl-6 leading-relaxed">
                {watchTournamentType === 'CLUB'
                  ? translate('privateClubVisibilityDescription')
                  : translate('privateGlobalVisibilityDescription')}
              </span>
            </label>
          </div>
        </div>

        {/* Registration Mode Option */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col gap-3">
          <label className="text-sm font-semibold text-slate-900">{translate('registrationMode')} <span className="text-rose-500">*</span></label>
          <div className="flex flex-col md:flex-row gap-4 mt-1">
            <label className="flex-1 flex flex-col p-4 border rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-all relative border-slate-200">
              <div className="flex items-center gap-2">
                <input 
                  type="radio" 
                  value="OPEN"
                  {...register('registrationMode')}
                  checked={watchRegistrationMode === 'OPEN'}
                  onChange={() => setValue('registrationMode', 'OPEN')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
                />
                <span className="text-sm font-bold text-slate-800">{translate('openRegistration')}</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-2 pl-6 leading-relaxed">
                {translate('openRegistrationDescription')}
              </span>
            </label>

            <label className="flex-1 flex flex-col p-4 border rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-all relative border-slate-200">
              <div className="flex items-center gap-2">
                <input 
                  type="radio" 
                  value="APPROVAL"
                  {...register('registrationMode')}
                  checked={watchRegistrationMode === 'APPROVAL'}
                  onChange={() => setValue('registrationMode', 'APPROVAL')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
                />
                <span className="text-sm font-bold text-slate-800">{translate('approvalRegistration')}</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-2 pl-6 leading-relaxed">
                {translate('approvalRegistrationDescription')}
              </span>
            </label>

            <label className="flex-1 flex flex-col p-4 border rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-all relative border-slate-200">
              <div className="flex items-center gap-2">
                <input 
                  type="radio" 
                  value="INVITE_ONLY"
                  {...register('registrationMode')}
                  checked={watchRegistrationMode === 'INVITE_ONLY'}
                  onChange={() => setValue('registrationMode', 'INVITE_ONLY')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
                />
                <span className="text-sm font-bold text-slate-800">{translate('inviteOnlyRegistration')}</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-2 pl-6 leading-relaxed">
                {translate('inviteOnlyRegistrationDescription')}
              </span>
            </label>
          </div>
        </div>

        {/* ELO Constraints Section */}
        {watchIsRanked && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableEloLimit}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setEnableEloLimit(checked);
                  if (!checked) {
                    setValue('minElo', '');
                    setValue('maxElo', '');
                    setValue('maxCombinedElo', '');
                    setValue('maxTeammateGap', '');
                  }
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <h4 className="text-sm font-bold text-slate-800">{translate('eloLimits')}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {translate('eloLimitsDescription')}
                </p>
              </div>
            </label>

            {enableEloLimit && (
              <div className="space-y-4 pt-2 border-t border-slate-200/80 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={translate('minElo')}
                    placeholder={translate('numberPlaceholder', { value: 800 })}
                    type="number"
                    {...register('minElo')}
                    error={errors.minElo?.message}
                  />
                  <Input
                    label={translate('maxElo')}
                    placeholder={translate('numberPlaceholder', { value: 1500 })}
                    type="number"
                    {...register('maxElo')}
                    error={errors.maxElo?.message}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200/60 pt-3">
                  <Input
                    label={translate('combinedElo')}
                    placeholder={translate('numberPlaceholder', { value: 2800 })}
                    type="number"
                    {...register('maxCombinedElo')}
                    error={errors.maxCombinedElo?.message}
                  />
                  <Input
                    label={translate('teammateGap')}
                    placeholder={translate('numberPlaceholder', { value: 300 })}
                    type="number"
                    {...register('maxTeammateGap')}
                    error={errors.maxTeammateGap?.message}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bracket Type Selection */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-slate-700">{translate('bracketFormat')}</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'SINGLE_ELIMINATION' as const, labelKey: 'singleElimination', icon: Trophy, descKey: 'singleEliminationDescription' },
              { id: 'DOUBLE_ELIMINATION' as const, labelKey: 'doubleElimination', icon: LayoutGrid, descKey: 'doubleEliminationDescription' },
              { id: 'ROUND_ROBIN' as const, labelKey: 'roundRobin', icon: RotateCw, descKey: 'roundRobinDescription' },
              { id: 'GROUP_STAGE_KNOCKOUT' as const, labelKey: 'groupStageKnockout', icon: Shield, descKey: 'groupStageKnockoutDescription' },
            ].map((opt) => {
              const isSelected = selectedFormat === opt.id;
              const Icon = opt.icon;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedFormat(opt.id)}
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
        </div>



        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">{translate('description')}</label>
          <Textarea
            placeholder={translate('descriptionPlaceholder')}
            className="h-24 resize-none"
            {...register('description')}
          />
          {errors.description && <p className="text-xs font-semibold text-rose-500">{errors.description.message}</p>}
        </div>

        <div className="flex justify-end mt-4 pt-6 border-t border-slate-100">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5">
            {translate('continue')} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </form>
    </div>
  );
}

