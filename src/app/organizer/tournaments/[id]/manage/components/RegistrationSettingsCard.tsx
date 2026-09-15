import React from 'react';
import { useTranslations } from 'next-intl';
import { CalendarDays, Check, Copy, Globe2, LockKeyhole, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DateTimePicker } from '@/components/ui/Input';
import { LiteInviteQr } from '@/components/tournaments/LiteInviteQr';
import { cn } from '@/utils/cn';

export type RegistrationMode = 'OPEN' | 'APPROVAL' | 'INVITE_ONLY';

interface RegistrationSettingsCardProps {
  visibility: 'PUBLIC' | 'PRIVATE';
  setVisibility: (value: 'PUBLIC' | 'PRIVATE') => void;
  registrationMode: RegistrationMode;
  setRegistrationMode: (value: RegistrationMode) => void;
  registrationStartDate: string;
  setRegistrationStartDate: (value: string) => void;
  registrationEndDate: string;
  setRegistrationEndDate: (value: string) => void;
  isSaving: boolean;
  disabled: boolean;
  onSave: () => void;
  inviteLink?: string;
  inviteCode?: string | null;
  tournamentName?: string;
  onCopyInviteCode?: () => void;
  onRegenerateInviteCode?: () => void | Promise<void>;
}

const getLocalDateTime = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function RegistrationSettingsCard({
  visibility,
  setVisibility,
  registrationMode,
  setRegistrationMode,
  registrationStartDate,
  setRegistrationStartDate,
  registrationEndDate,
  setRegistrationEndDate,
  isSaving,
  disabled,
  onSave,
  inviteLink,
  inviteCode,
  tournamentName,
  onCopyInviteCode,
  onRegenerateInviteCode,
}: RegistrationSettingsCardProps) {
  const translate = useTranslations('OrganizerRegistration');
  const now = React.useMemo(() => getLocalDateTime(new Date()), []);
  const showInviteTools = visibility === 'PRIVATE' || registrationMode === 'INVITE_ONLY';
  const modes: Array<{ value: RegistrationMode; label: string; description: string }> = [
    {
      value: 'OPEN',
      label: translate('openModeShort'),
      description: translate('openRegistrationOption'),
    },
    {
      value: 'APPROVAL',
      label: translate('approvalModeShort'),
      description: translate('approvalRegistrationOption'),
    },
    {
      value: 'INVITE_ONLY',
      label: translate('inviteOnlyModeShort'),
      description: translate('inviteOnlyRegistrationOption'),
    },
  ];

  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50/45 p-3.5 sm:p-4" aria-label={translate('registrationSidebarTitle')}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Globe2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="truncate text-sm font-bold text-slate-900">
            {translate('registrationSidebarTitle')}
          </h2>
        </div>
        {disabled && <LockKeyhole className="h-4 w-4 shrink-0 text-slate-400" aria-label={translate('registrationLockedLabel')} />}
      </div>

      <div className="mt-3 space-y-3">
        <button
          type="button"
          role="switch"
          aria-checked={visibility === 'PUBLIC'}
          aria-label={translate('visibilityLabel')}
          disabled={disabled}
          onClick={() => setVisibility(visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC')}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/80 bg-white px-3 py-2 text-left shadow-2xs transition hover:border-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex min-w-0 items-center gap-2">
            {visibility === 'PUBLIC' ? <Globe2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />}
            <span className="truncate text-xs font-bold text-slate-800">{translate('publicShort')}</span>
          </span>
          <span className={cn('relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors', visibility === 'PUBLIC' ? 'bg-emerald-500' : 'bg-slate-300')}>
            <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform', visibility === 'PUBLIC' ? 'translate-x-4' : 'translate-x-0.5')} />
          </span>
        </button>

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{translate('registrationModeLabel')}</p>
          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={translate('registrationModeLabel')}>
            {modes.map((mode) => {
              const active = registrationMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={active}
                  aria-label={mode.description}
                  disabled={disabled}
                  onClick={() => setRegistrationMode(mode.value)}
                  className={cn(
                    'min-h-10 rounded-lg border px-1.5 py-2 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60',
                    active ? 'border-blue-500 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700',
                  )}
                >
                  {active && <Check className="mx-auto mb-0.5 h-3 w-3" aria-hidden="true" />}
                  <span className="block truncate">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 border-t border-blue-100 pt-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
            <CalendarDays className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
            <span>{translate('registrationWindowTitle')}</span>
          </div>
          <DateTimePicker
            label={translate('registrationOpenLabel')}
            value={registrationStartDate}
            min={now}
            onChange={setRegistrationStartDate}
            disabled={disabled}
            className="h-10 text-xs"
          />
          <DateTimePicker
            label={translate('registrationCloseLabel')}
            value={registrationEndDate}
            min={registrationStartDate || now}
            onChange={setRegistrationEndDate}
            disabled={disabled}
            className="h-10 text-xs"
          />
        </div>

        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={disabled || isSaving}
          className="w-full gap-1.5 bg-blue-600 text-xs font-bold text-white hover:bg-blue-700"
        >
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          {isSaving ? translate('saving') : translate('saveRegistrationInfo')}
        </Button>

        {showInviteTools && inviteLink && (
          <details className="rounded-lg border border-slate-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-bold text-slate-700 [&::-webkit-details-marker]:hidden">
              <span className="truncate">{translate('quickInviteTitle')}</span>
              <span className="shrink-0 font-mono text-[11px] text-blue-700">{inviteCode || translate('inviteCodeMissing')}</span>
            </summary>
            <div className="space-y-2 border-t border-slate-100 p-2.5">
              <div className="flex items-center gap-1.5">
                <span className="min-w-0 flex-1 truncate rounded-md bg-slate-50 px-2 py-1.5 font-mono text-[11px] text-slate-700">
                  {inviteCode || translate('inviteCodeMissing')}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={onCopyInviteCode}
                  disabled={disabled || !inviteCode}
                  title={translate('copyCode')}
                  aria-label={translate('copyCode')}
                  className="h-8 w-8 shrink-0"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => void onRegenerateInviteCode?.()}
                  disabled={disabled || !onRegenerateInviteCode}
                  title={translate('regenerateCode')}
                  aria-label={translate('regenerateCode')}
                  className="h-8 w-8 shrink-0"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
              <LiteInviteQr
                inviteUrl={inviteLink}
                tournamentName={tournamentName || 'SportO'}
                compact
              />
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
