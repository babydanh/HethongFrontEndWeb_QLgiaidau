'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useTranslations } from 'next-intl';

type Setter<T> = Dispatch<SetStateAction<T>>;

type DivisionConstraintsSectionProps = {
  maxParticipants: string;
  setMaxParticipants: Setter<string>;
  limitEnabled: boolean;
  setLimitEnabled: Setter<boolean>;
  eloEnabled: boolean;
  setEloEnabled: Setter<boolean>;
  minElo: number | null;
  setMinElo: Setter<number | null>;
  maxElo: number | null;
  setMaxElo: Setter<number | null>;
  entryFeeOverrideEnabled: boolean;
  setEntryFeeOverrideEnabled: Setter<boolean>;
  entryFee: string;
  setEntryFee: Setter<string>;
  isCreating: boolean;
};

export function DivisionConstraintsSection({
  maxParticipants,
  setMaxParticipants,
  limitEnabled,
  setLimitEnabled,
  eloEnabled,
  setEloEnabled,
  minElo,
  setMinElo,
  maxElo,
  setMaxElo,
  entryFeeOverrideEnabled,
  setEntryFeeOverrideEnabled,
  entryFee,
  setEntryFee,
  isCreating,
}: DivisionConstraintsSectionProps) {
  const translate = useTranslations('OrganizerManage');

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <label htmlFor="division-limit" className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
          <input id="division-limit" type="checkbox" checked={limitEnabled} onChange={(event) => setLimitEnabled(event.target.checked)} disabled={isCreating} className="h-4 w-4 accent-blue-600" />
          {translate('createDivision.participantLimitShort')}
        </label>
        {limitEnabled && (
          <input aria-label={translate('createDivision.maxCount')} type="text" inputMode="numeric" pattern="[0-9]*" value={maxParticipants} onChange={(event) => setMaxParticipants(event.target.value.replace(/[^0-9]/g, '').slice(0, 3))} onBlur={() => { const parsed = Number(maxParticipants); const normalized = Number.isFinite(parsed) && parsed > 0 ? Math.min(128, Math.max(2, parsed)) : 2; setMaxParticipants(String(normalized)); }} disabled={isCreating} className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <label htmlFor="division-elo" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input id="division-elo" type="checkbox" checked={eloEnabled} onChange={(event) => setEloEnabled(event.target.checked)} disabled={isCreating} className="h-4 w-4 accent-blue-600" />
          {translate('createDivision.eloLimitShort')}
        </label>
        {eloEnabled && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input aria-label={translate('createDivision.minElo')} type="number" min={0} max={3000} value={minElo ?? ''} onChange={(event) => setMinElo(event.target.value === '' ? null : Number(event.target.value))} disabled={isCreating} placeholder={translate('createDivision.noLimit')} className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            <input aria-label={translate('createDivision.maxElo')} type="number" min={0} max={3000} value={maxElo ?? ''} onChange={(event) => setMaxElo(event.target.value === '' ? null : Number(event.target.value))} disabled={isCreating} placeholder={translate('createDivision.noLimit')} className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <label htmlFor="division-entry-fee-override" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input id="division-entry-fee-override" type="checkbox" checked={entryFeeOverrideEnabled} onChange={(event) => setEntryFeeOverrideEnabled(event.target.checked)} disabled={isCreating} className="h-4 w-4 accent-blue-600" />
          {translate('createDivision.entryFeeOverrideShort')}
        </label>
        {entryFeeOverrideEnabled ? (
          <input aria-label={translate('createDivision.entryFeeOverrideShort')} type="text" inputMode="numeric" value={entryFee} onChange={(event) => setEntryFee(event.target.value.replace(/[^0-9]/g, '').slice(0, 12))} disabled={isCreating} placeholder={translate('createDivision.entryFeeOverridePlaceholder')} className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        ) : (
          <p className="mt-2 text-[11px] leading-tight text-slate-500">{translate('createDivision.entryFeeOverrideHint')}</p>
        )}
      </div>
    </div>
  );
}
