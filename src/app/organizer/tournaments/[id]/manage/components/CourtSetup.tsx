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
  isWorkspaceOpen: boolean;
  onOpenWorkspace: () => void;
}

export function CourtSetup({
  venue,
  courts,
  newCourtName,
  setNewCourtName,
  isSaving,
  onAdd,
  isWorkspaceOpen,
  onOpenWorkspace,
}: CourtSetupProps) {
  const t = useTranslations('OrganizerManage');

  return (
    <section className="border border-slate-200 rounded-lg bg-white p-5 md:p-6 space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            {t('courtSetupStep')}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{t('courtSetupTitle')}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            {t('courtSetupHint')}
          </p>
        </div>
        <MapPin className="hidden h-5 w-5 shrink-0 text-blue-600 sm:block" aria-hidden="true" />
      </div>

      {!venue ? (
        <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{t('createVenueFirst')}</p>
        </div>
      ) : (
        <>
          <div className="border-l-2 border-blue-600 pl-3 text-sm">
            <p className="font-semibold text-slate-900">{venue.name}</p>
            <p className="mt-0.5 text-slate-500">{venue.locationAddress}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
            <Button
              type="button"
              onClick={onAdd}
              disabled={isSaving || !newCourtName.trim()}
              className="h-10 shrink-0 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {isSaving ? t('matchSchedule.saving') : t('createDivision.add')}
            </Button>
          </div>

          {courts.length === 0 ? (
            <div className="border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
              {t('status.notSet')}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label={t('matchSchedule.court')}>
                {courts.map((court) => (
                  <div key={court.id} className="border border-slate-200 px-3 py-3">
                    <p className="font-semibold text-slate-800">{court.courtName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {court.status === 'AVAILABLE' ? t('courtAvailable') : court.status === 'MAINTENANCE' ? t('courtMaintenance') : t('courtStatusUnknown')}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">{t('workspaceOptInHint')}</p>
                {!isWorkspaceOpen && <Button type="button" onClick={onOpenWorkspace} className="min-h-10 bg-slate-900 text-white hover:bg-slate-700">{t('openWorkspace')}</Button>}
                {isWorkspaceOpen && <span className="text-xs font-semibold text-emerald-700">{t('workspaceOpen')}</span>}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
