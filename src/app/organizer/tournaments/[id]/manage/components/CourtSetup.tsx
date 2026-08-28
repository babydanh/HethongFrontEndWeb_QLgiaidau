'use client';

import { useTranslations } from 'next-intl';
import { MapPin, Plus, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export interface CourtSetupItem {
  id: string;
  courtName: string;
  status?: string;
}

interface CourtSetupProps {
  venue: {
    name: string;
    locationAddress: string;
  } | null;
  courts: CourtSetupItem[];
  newCourtName: string;
  setNewCourtName: (value: string) => void;
  isSaving: boolean;
  onAdd: () => void;
  operatingStart: string;
  setOperatingStart: (value: string) => void;
  operatingEnd: string;
  setOperatingEnd: (value: string) => void;
  onCourtClick: (courtId: string) => void;
}

export function CourtSetup({
  venue,
  courts,
  newCourtName,
  setNewCourtName,
  isSaving,
  onAdd,
  onCourtClick,
}: CourtSetupProps) {
  const t = useTranslations('OrganizerManage');

  return (
    <section className="border border-slate-200 bg-white p-5 md:p-6" aria-labelledby="court-setup-title">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h3 id="court-setup-title" className="text-lg font-bold text-slate-900">{t('courtSetupTitle')}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{t('courtSetupHint')}</p>
        </div>
        <MapPin className="hidden h-5 w-5 shrink-0 text-blue-600 sm:block" aria-hidden="true" />
      </div>

      {!venue ? (
        <div className="mt-5 flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{t('createVenueFirst')}</p>
        </div>
      ) : (
        <>
          <div className="mt-5 border-l-2 border-blue-600 pl-3 text-sm">
            <p className="font-semibold text-slate-900">{venue.name}</p>
            <p className="mt-0.5 text-slate-500">{venue.locationAddress}</p>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                label={t('courtName')}
                value={newCourtName}
                maxLength={100}
                onChange={(event) => setNewCourtName(event.target.value)}
                placeholder={t('courtNamePlaceholder')}
                disabled={isSaving}
              />
            </div>
            <Button type="button" onClick={onAdd} disabled={isSaving || !newCourtName.trim()} className="h-10 shrink-0 bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {isSaving ? t('matchSchedule.saving') : t('createDivision.add')}
            </Button>
          </div>

          {courts.length === 0 ? (
            <div className="mt-5 border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">{t('status.notSet')}</div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label={t('matchSchedule.court')}>
              {courts.map((court) => (
                <button key={court.id} type="button" onClick={() => onCourtClick(court.id)} className="border border-slate-200 bg-white px-4 py-4 text-left text-base font-semibold text-slate-900 transition-colors hover:border-blue-400 hover:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <span className="block truncate">{court.courtName}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
