'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input, DateTimePicker } from '@/components/ui/Input';
import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { ChevronRight, ChevronLeft, Calendar, DollarSign, MapPin } from 'lucide-react';
import { tournamentsApi } from '@/features/tournaments/api';
import { regionsApi, type Region } from '@/features/regions/api';

const getCurrentIsoMinute = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const createStep3Schema = (translate: ReturnType<typeof useTranslations>) => z.object({
  startDate: z.string().min(1, translate('validationStartRequired')),
  endDate: z.string().min(1, translate('validationEndRequired')),
  registrationStartDate: z.string().min(1, translate('validationRegistrationStartRequired')),
  registrationEndDate: z.string().min(1, translate('validationRegistrationEndRequired')),
  venueName: z.string().max(200).optional(),
  locationAddress: z.string().max(500).optional(),
  province: z.string().max(120).optional(),
  district: z.string().max(120).optional(),
  ward: z.string().max(120).optional(),
  entryFee: z.string().refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, translate('validationFeeNonNegative')),
}).superRefine((data, ctx) => {
  const currentNow = new Date();
  currentNow.setMinutes(currentNow.getMinutes() - 2); // 2-minute buffer

  if (data.registrationStartDate) {
    const regStart = new Date(data.registrationStartDate);
    if (regStart < currentNow) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: translate('validationRegistrationStartFuture'),
        path: ['registrationStartDate'],
      });
    }
  }

  if (data.registrationStartDate && data.registrationEndDate) {
    const regStart = new Date(data.registrationStartDate);
    const regEnd = new Date(data.registrationEndDate);
    if (regStart >= regEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: translate('validationRegistrationOrder'),
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
        message: translate('validationCompetitionOrder'),
        path: ['endDate'],
      });
    }
  }

  if (data.registrationEndDate && data.startDate) {
    const regEnd = new Date(data.registrationEndDate);
    const start = new Date(data.startDate);
    if (regEnd >= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: translate('validationRegistrationBeforeCompetition'),
        path: ['registrationEndDate'],
      });
    }
  }
});

type Step3Values = z.infer<ReturnType<typeof createStep3Schema>>;

export default function Step3ScheduleFees() {
  const translate = useTranslations('OrganizerCreateStep3');
  const { formData, updateFormData, nextStep, prevStep, validationTarget, clearValidationTarget } = useCreateTournamentStore();
  const isClubTournament = formData.tournamentType === 'CLUB' || Boolean(formData.communityId);
  const [allowEntryFees, setAllowEntryFees] = useState(true);
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const defaultRegistrationStart = formData.registrationStartDate || getCurrentIsoMinute();

  const { register, handleSubmit, control, setValue, setError, setFocus, formState: { errors } } = useForm<Step3Values>({
    resolver: zodResolver(createStep3Schema(translate)),
    defaultValues: {
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      registrationStartDate: defaultRegistrationStart,
      registrationEndDate: formData.registrationEndDate || undefined,
      venueName: formData.venueName || '',
      locationAddress: formData.locationAddress || '',
      province: formData.province || '',
      district: formData.district || '',
      ward: formData.ward || '',
      entryFee: isClubTournament ? '0' : String(formData.entryFee || 0),
    },
  });

  useEffect(() => {
    if (validationTarget?.step !== 3) return;
    const field = validationTarget.field as keyof Step3Values;
    setError(field, { type: 'publish', message: validationTarget.message });
    setFocus(field);
    clearValidationTarget();
  }, [clearValidationTarget, setError, setFocus, validationTarget]);

  useEffect(() => {
    let cancelled = false;
    void regionsApi.getProvinces().then((items) => {
      if (!cancelled) setProvinces(items);
    }).catch(() => {
      if (!cancelled) setProvinces([]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const province = provinces.find((item) => {
      const label = item.fullName || item.name;
      return label === formData.province || item.name === formData.province;
    });
    setSelectedProvinceCode(province?.code || '');
    if (!province) setWards([]);
  }, [formData.province, provinces]);

  useEffect(() => {
    if (!selectedProvinceCode) {
      setWards([]);
      return;
    }
    let cancelled = false;
    void regionsApi.getWardsByProvince(selectedProvinceCode).then((items) => {
      if (!cancelled) setWards(items);
    }).catch(() => {
      if (!cancelled) setWards([]);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedProvinceCode]);

  useEffect(() => {
    const loadFeePolicy = async () => {
      try {
        const response = await tournamentsApi.getFeesConfig();
        const isAllowed = response.data?.allowEntryFees !== false;
        setAllowEntryFees(isAllowed);
        if (!isAllowed) {
          setValue('entryFee', '0');
          updateFormData({ entryFee: 0 });
        }
      } catch {
        // Backend remains the final policy enforcement layer.
      }
    };
    void loadFeePolicy();
  }, [setValue, updateFormData]);

  const onSubmit = (data: Step3Values) => {
    updateFormData({
      startDate: data.startDate,
      endDate: data.endDate,
      registrationStartDate: data.registrationStartDate,
      registrationEndDate: data.registrationEndDate,
      entryFee: isClubTournament || !allowEntryFees ? 0 : Number(data.entryFee),
      venueName: data.venueName?.trim() || '',
      locationAddress: data.locationAddress?.trim() || '',
      province: data.province?.trim() || '',
      district: data.district?.trim() || '',
      ward: data.ward?.trim() || '',
    });
    nextStep();
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{translate('title')}</h2>
        <p className="text-sm text-slate-500">{translate('subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-slate-900">{translate('registrationPeriod')}</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="registrationStartDate"
              control={control}
              render={({ field }) => (
                <DateTimePicker
                  label={translate('registrationStart')}
                  name={field.name}
                  value={field.value || ''}
                  min={getCurrentIsoMinute()}
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
                  label={translate('registrationEnd')}
                  name={field.name}
                  value={field.value || ''}
                  min={getCurrentIsoMinute()}
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
            <h4 className="font-bold text-slate-900">{translate('competitionPeriod')}</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <DateTimePicker
                  label={translate('competitionStart')}
                  name={field.name}
                  value={field.value || ''}
                  min={getCurrentIsoMinute()}
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
                  label={translate('competitionEnd')}
                  name={field.name}
                  value={field.value || ''}
                  min={getCurrentIsoMinute()}
                  onChange={field.onChange}
                  error={errors.endDate?.message}
                />
              )}
            />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-rose-500" />
            <h4 className="font-bold text-slate-900">{translate('locationTitle')}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={translate('venueName')} placeholder={translate('venueNamePlaceholder')} {...register('venueName')} error={errors.venueName?.message} />
            <Input label={translate('locationAddress')} placeholder={translate('locationAddressPlaceholder')} {...register('locationAddress')} error={errors.locationAddress?.message} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">{translate('province')}</label>
              <select
                {...register('province')}
                onChange={(event) => {
                  setValue('province', event.target.value, { shouldDirty: true, shouldValidate: true });
                  setSelectedProvinceCode(event.target.selectedOptions[0]?.dataset.code || '');
                  setValue('ward', '', { shouldDirty: true });
                }}
                className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{translate('provincePlaceholder')}</option>
                {provinces.map((item) => <option key={item.code} value={item.fullName || item.name} data-code={item.code}>{item.fullName || item.name}</option>)}
              </select>
            </div>
            <Input label={translate('district')} placeholder={translate('districtPlaceholder')} {...register('district')} error={errors.district?.message} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">{translate('ward')}</label>
              <select {...register('ward')} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{translate('wardPlaceholder')}</option>
                {wards.map((item) => <option key={item.code} value={item.fullName || item.name}>{item.fullName || item.name}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500">{translate('locationDescription')}</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-slate-900">{translate('entryFee')}</h4>
          </div>

          {isClubTournament && (
            <div className="rounded-lg border border-emerald-200 bg-white px-4 py-3">
              <p className="text-sm font-bold text-emerald-900">{translate('clubFreeTitle')}</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-700">{translate('clubFreeDescription')}</p>
            </div>
          )}

          {!isClubTournament && !allowEntryFees && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-bold text-amber-900">{translate('feesDisabledTitle')}</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-amber-700">{translate('feesDisabledDescription')}</p>
            </div>
          )}
          {!isClubTournament && allowEntryFees && (
            <Input
              label={translate('entryFeePerTeam')}
              type="number"
              placeholder="0"
              min="0"
              {...register('entryFee')}
              error={errors.entryFee?.message}
            />
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
