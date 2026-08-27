'use client';

import React from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Input, DateTimePicker } from '@/components/ui/Input';
import { Tournament, BracketStage } from '@/types/tournament';
import { Region } from '@/features/regions/api';
import { useAutoAddressParser } from '@/utils/vietnamAddressParser';
import { CourtSetup, CourtSetupItem } from './CourtSetup';

interface Venue {
  id: string;
  name: string;
  locationAddress: string;
}

interface ScheduleTabProps {
  validationField?: string | null;
  tournament: Tournament;
  bracket: { stages: BracketStage[] } | null;
  venues: Venue[];
  customVenueName: string;
  setCustomVenueName: (val: string) => void;
  customVenueAddress: string;
  setCustomVenueAddress: (val: string) => void;
  provinceCode: string;
  setProvinceCode: (val: string) => void;
  wardCode: string;
  setWardCode: (val: string) => void;
  provinces: Region[];
  wards: Region[];
  setWards?: (wards: Region[]) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  isSavingConfig: boolean;
  handleSaveScheduleDetails: () => void;
  courtVenue: Venue | null;
  courts: CourtSetupItem[];
  newCourtName: string;
  setNewCourtName: (value: string) => void;
  isSavingCourt: boolean;
  handleAddTournamentCourt: () => void;
}

export function ScheduleTab({
  validationField,
  tournament: _tournament,
  bracket: _bracket,
  venues: _venues,
  customVenueName,
  setCustomVenueName,
  customVenueAddress,
  setCustomVenueAddress,
  provinceCode,
  setProvinceCode,
  wardCode,
  setWardCode,
  provinces,
  wards,
  setWards,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  isSavingConfig,
  handleSaveScheduleDetails,
  courtVenue,
  courts,
  newCourtName,
  setNewCourtName,
  isSavingCourt,
  handleAddTournamentCourt,
}: ScheduleTabProps) {
  const t = useTranslations('OrganizerManage');
  void _tournament;
  void _bracket;
  void _venues;
  const autoDetectedAddress = useAutoAddressParser({
    addressValue: customVenueAddress,
    provinces,
    wards,
    onSelectProvince: setProvinceCode,
    onSelectWard: setWardCode,
    onWardsLoaded: (loadedWards) => setWards?.(loadedWards),
  });

  return (
    <div className="space-y-5">
      <section className="border border-slate-200 bg-white p-5 md:p-6" aria-labelledby="schedule-setup-title">
        <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
          <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">{t('scheduleSetupStep')}</p>
            <h2 id="schedule-setup-title" className="mt-1 text-xl font-bold text-slate-900">{t('scheduleSetupTitle')}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{t('scheduleSetupHint')}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-slate-900">{t('venueStepTitle')}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{t('venueStepHint')}</p>
            </div>
            <Input label={t('venueName')} placeholder={t('venueNamePlaceholder')} value={customVenueName} onChange={(event) => setCustomVenueName(event.target.value)} />
            <Input label={t('addressDetails')} placeholder={t('addressPlaceholder')} value={customVenueAddress} onChange={(event) => setCustomVenueAddress(event.target.value)} />
            {autoDetectedAddress.isMatched && autoDetectedAddress.province && <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600"><Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span>{autoDetectedAddress.province.fullName || autoDetectedAddress.province.name}{autoDetectedAddress.ward ? ` · ${autoDetectedAddress.ward.fullName || autoDetectedAddress.ward.name}` : ''}</span></div>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">{t('province')}<select value={provinceCode} onChange={(event) => setProvinceCode(event.target.value)} className="mt-1.5 h-10 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"><option value="">{t('chooseProvince')}</option>{provinces.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}</select></label>
              <label className="text-sm font-semibold text-slate-700">{t('ward')}<select value={wardCode} onChange={(event) => setWardCode(event.target.value)} disabled={!provinceCode} className="mt-1.5 h-10 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"><option value="">{t('chooseWard')}</option>{wards.map((ward) => <option key={ward.code} value={ward.code}>{ward.name}</option>)}</select></label>
            </div>
            {validationField === 'venue' && <p className="text-xs font-semibold text-rose-600">{t('venueRequired')}</p>}
          </div>

          <div className="space-y-4 border-l-0 border-slate-200 lg:border-l lg:pl-5">
            <div>
              <p className="text-sm font-bold text-slate-900">{t('timeStepTitle')}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{t('timeStepHint')}</p>
            </div>
            <DateTimePicker label={t('openingDate')} value={startDate} onChange={setStartDate} />
            <DateTimePicker label={t('closingDate')} value={endDate} onChange={setEndDate} />
            {validationField === 'dates' && <p className="text-xs font-semibold text-rose-600">{t('datesInvalid')}</p>}
          </div>
        </div>
      </section>

      <CourtSetup venue={courtVenue} courts={courts} newCourtName={newCourtName} setNewCourtName={setNewCourtName} isSaving={isSavingCourt} onAdd={handleAddTournamentCourt} />

      <div className="flex justify-end border-t border-slate-200 pt-4">
        <Button onClick={handleSaveScheduleDetails} disabled={isSavingConfig} className="min-h-11 bg-blue-600 px-6 font-bold text-white hover:bg-blue-700">{isSavingConfig ? t('savingSchedule') : t('saveSchedule')}</Button>
      </div>
    </div>
  );
}
