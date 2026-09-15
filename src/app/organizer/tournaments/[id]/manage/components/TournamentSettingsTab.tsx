'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Globe2,
  LockKeyhole,
  Save,
  ShieldCheck,
  CalendarDays,
  Check,
  Copy,
  RefreshCw,
  Loader2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DateTimePicker } from '@/components/ui/Input';
import { LiteInviteQr } from '@/components/tournaments/LiteInviteQr';
import { PermissionsTab } from './PermissionsTab';
import { cn } from '@/utils/cn';
import type { RegistrationMode } from './RegistrationSettingsCard';

interface TournamentSettingsTabProps {
  id: string;
  tournament: {
    id: string;
    name?: string;
    status?: string;
    isRegistrationLocked?: boolean;
    inviteCode?: string | null;
    organizer?: {
      id: string;
      fullName: string;
      avatarUrl?: string | null;
    } | null;
    contactInfo?: {
      email?: string;
    } | null;
  } | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  setVisibility: (value: 'PUBLIC' | 'PRIVATE') => void;
  registrationMode: RegistrationMode;
  setRegistrationMode: (value: RegistrationMode) => void;
  registrationStartDate: string;
  setRegistrationStartDate: (value: string) => void;
  registrationEndDate: string;
  setRegistrationEndDate: (value: string) => void;
  isSavingConfig: boolean;
  disabled: boolean;
  handleSaveRegistrationSettings: () => void;
  inviteLink?: string;
  onRegenerateInviteCode?: () => void | Promise<void>;
  onCopyInviteCode?: () => void;
}

const getLocalDateTime = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function TournamentSettingsTab({
  id,
  tournament,
  visibility,
  setVisibility,
  registrationMode,
  setRegistrationMode,
  registrationStartDate,
  setRegistrationStartDate,
  registrationEndDate,
  setRegistrationEndDate,
  isSavingConfig,
  disabled,
  handleSaveRegistrationSettings,
  inviteLink,
  onRegenerateInviteCode,
  onCopyInviteCode,
}: TournamentSettingsTabProps) {
  const regTranslate = useTranslations('OrganizerRegistration');
  const [subSection, setSubSection] = useState<'registration' | 'organizers' | 'referees'>('registration');
  const now = React.useMemo(() => getLocalDateTime(new Date()), []);
  const showInviteTools = visibility === 'PRIVATE' || registrationMode === 'INVITE_ONLY';

  const modes: Array<{ value: RegistrationMode; label: string; description: string }> = [
    {
      value: 'OPEN',
      label: regTranslate('openModeShort'),
      description: regTranslate('openRegistrationOption'),
    },
    {
      value: 'APPROVAL',
      label: regTranslate('approvalModeShort'),
      description: regTranslate('approvalRegistrationOption'),
    },
    {
      value: 'INVITE_ONLY',
      label: regTranslate('inviteOnlyModeShort'),
      description: regTranslate('inviteOnlyRegistrationOption'),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Sub-tabs header */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-6 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setSubSection('registration')}
          className={cn(
            'pb-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-all border-b-2 -mb-[2px] flex items-center gap-2 cursor-pointer',
            subSection === 'registration'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <Globe2 className="w-4 h-4" />
          <span>Cấu hình đăng ký</span>
        </button>
        <button
          type="button"
          onClick={() => setSubSection('organizers')}
          className={cn(
            'pb-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-all border-b-2 -mb-[2px] flex items-center gap-2 cursor-pointer',
            subSection === 'organizers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <Users className="w-4 h-4" />
          <span>Ban tổ chức</span>
        </button>
        <button
          type="button"
          onClick={() => setSubSection('referees')}
          className={cn(
            'pb-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-all border-b-2 -mb-[2px] flex items-center gap-2 cursor-pointer',
            subSection === 'referees'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Trọng tài</span>
        </button>
      </div>

      {subSection === 'registration' ? (
        <div className="space-y-6 max-w-3xl">
          {/* Box Cấu hình đăng ký */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {regTranslate('registrationSidebarTitle')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập phạm vi hiển thị, chế độ duyệt hồ sơ và thời gian mở cổng đăng ký
                </p>
              </div>
              {disabled && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  {regTranslate('registrationLockedLabel')}
                </span>
              )}
            </div>

            {/* Chế độ hiển thị: Công khai / Riêng tư */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {regTranslate('visibilityLabel')}
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={visibility === 'PUBLIC'}
                disabled={disabled}
                onClick={() => setVisibility(visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC')}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-left transition hover:border-blue-200 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {visibility === 'PUBLIC' ? (
                    <Globe2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <LockKeyhole className="h-4 w-4 shrink-0 text-slate-500" />
                  )}
                  <div>
                    <span className="block text-sm font-bold text-slate-800">
                      {visibility === 'PUBLIC' ? regTranslate('publicShort') : regTranslate('privateShort')}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {visibility === 'PUBLIC' ? regTranslate('publicRegistrationOption') : regTranslate('privateRegistrationOption')}
                    </span>
                  </div>
                </span>
                <span
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                    visibility === 'PUBLIC' ? 'bg-emerald-600' : 'bg-slate-300'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      visibility === 'PUBLIC' ? 'translate-x-4.5' : 'translate-x-0.5'
                    )}
                  />
                </span>
              </button>
            </div>

            {/* Chế độ nhận đăng ký: Tự do / Xét duyệt / Mã mời */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {regTranslate('modeLabel')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {modes.map((mode) => {
                  const isSelected = registrationMode === mode.value;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => setRegistrationMode(mode.value)}
                      className={cn(
                        'rounded-lg border px-3 py-2.5 text-left transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{mode.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <p className="mt-1 text-[11px] font-normal text-slate-500 line-clamp-2">
                        {mode.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Khung thời gian đăng ký */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                <span>{regTranslate('scheduleLabel')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {regTranslate('startDateShort')}
                  </label>
                  <DateTimePicker
                    value={registrationStartDate}
                    onChange={setRegistrationStartDate}
                    disabled={disabled}
                    className="w-full text-xs"
                    min={now}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {regTranslate('endDateShort')}
                  </label>
                  <DateTimePicker
                    value={registrationEndDate}
                    onChange={setRegistrationEndDate}
                    disabled={disabled}
                    className="w-full text-xs"
                    min={registrationStartDate || now}
                  />
                </div>
              </div>
            </div>

            {/* Mã mời / QR Code cho giải riêng tư */}
            {showInviteTools && tournament?.inviteCode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <LockKeyhole className="w-3.5 h-3.5 text-amber-700" />
                    <span>{regTranslate('inviteCode')}</span>
                  </div>
                  {onRegenerateInviteCode && (
                    <button
                      type="button"
                      onClick={onRegenerateInviteCode}
                      className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{regTranslate('regenerateInviteCode')}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md border border-amber-300 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-800">
                    {tournament.inviteCode}
                  </div>
                  {onCopyInviteCode && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onCopyInviteCode}
                      className="h-8 text-xs border-amber-300 hover:bg-amber-100"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Sao chép
                    </Button>
                  )}
                </div>
                {inviteLink && (
                  <div className="pt-2 flex items-center justify-between border-t border-amber-200/60">
                    <LiteInviteQr
                      inviteUrl={inviteLink}
                      tournamentName={tournament?.name || 'SportO'}
                      compact
                    />
                  </div>
                )}
              </div>
            )}

            {/* Nút lưu cấu hình */}
            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                onClick={handleSaveRegistrationSettings}
                disabled={isSavingConfig || disabled}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingConfig ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{regTranslate('saveSettings')}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Nhúng PermissionsTab để mời Trọng tài và Ban tổ chức với logic gốc */
        <PermissionsTab
          id={id}
          tournament={tournament}
          initialSubTab={subSection === 'referees' ? 'referees' : 'organizers'}
        />
      )}
    </div>
  );
}
