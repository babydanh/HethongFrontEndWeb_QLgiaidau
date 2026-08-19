'use client';

import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { ChevronRight, ChevronLeft, MapPin } from 'lucide-react';

const createStep3VenueSchema = (translate: ReturnType<typeof useTranslations>) => z.object({
  registrationStartDate: z.string().min(1, translate('validationVenueRegistrationStart')),
  registrationEndDate: z.string().min(1, translate('validationVenueRegistrationEnd')),
  startDate: z.string().min(1, translate('validationVenueStart')),
  endDate: z.string().min(1, translate('validationVenueEnd')),
  venueId: z.string().optional(),
}).refine(data => new Date(data.registrationEndDate) >= new Date(data.registrationStartDate), {
  message: translate('validationVenueOrder'),
  path: ['registrationEndDate']
}).refine(data => new Date(data.startDate) > new Date(data.registrationEndDate), {
  message: translate('validationVenueAfterRegistration'),
  path: ['startDate']
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: translate('validationVenueEndAfterStart'),
  path: ['endDate']
});

type Step3Values = z.infer<ReturnType<typeof createStep3VenueSchema>>;

export default function Step3Venue() {
  const translate = useTranslations('OrganizerCreateStep3');
  const { formData, updateFormData, nextStep, prevStep } = useCreateTournamentStore();

  const { register, handleSubmit, formState: { errors } } = useForm<Step3Values>({
    resolver: zodResolver(createStep3VenueSchema(translate)),
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
        <h2 className="text-xl font-bold text-slate-900 mb-2">{translate('venueTitle')}</h2>
        <p className="text-sm text-slate-500">{translate('venueSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="md:col-span-2 border-b border-slate-100 pb-2 mb-2">
            <h4 className="font-bold text-slate-900">{translate('registrationSection')}</h4>
          </div>
          
          <Input
            label={translate('registrationStart')}
            type="date"
            {...register('registrationStartDate')}
            error={errors.registrationStartDate?.message}
          />
          <Input
            label={translate('registrationEnd')}
            type="date"
            {...register('registrationEndDate')}
            error={errors.registrationEndDate?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="md:col-span-2 border-b border-slate-100 pb-2 mb-2">
            <h4 className="font-bold text-slate-900">{translate('competitionSection')}</h4>
          </div>
          
          <Input
            label={translate('competitionStart')}
            type="date"
            {...register('startDate')}
            error={errors.startDate?.message}
          />
          <Input
            label={translate('competitionEnd')}
            type="date"
            {...register('endDate')}
            error={errors.endDate?.message}
          />
        </div>

        <div className="flex flex-col gap-1.5 p-5 bg-slate-50 border border-slate-200 rounded-lg">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-500" /> {translate('venueLabel')}
          </label>
          <select 
            {...register('venueId')} 
            className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{translate('venueOptional')}</option>
            {/* Use valid UUIDs for mock values to pass backend validation */}
            <option value="00000000-0000-0000-0000-000000000001">{translate('venueTennis')}</option>
            <option value="00000000-0000-0000-0000-000000000002">{translate('venuePickleball')}</option>
            <option value="00000000-0000-0000-0000-000000000003">{translate('venuePhuTho')}</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">{translate('venueDescription')}</p>
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

