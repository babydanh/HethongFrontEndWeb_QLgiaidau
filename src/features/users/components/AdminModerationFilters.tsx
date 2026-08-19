'use client';

import { Calendar, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/utils/cn';
import type {
  AdminUserRoleFilter,
  AdminUserStatusFilter,
} from '@/features/users/adminModerationApi';
import type { SystemRole } from '@/features/users/api';
import { SYSTEM_ROLE_OPTIONS } from './SystemRoleModal';

interface AdminModerationFiltersProps {
  search: string;
  dateFrom: string;
  dateTo: string;
  roleFilter: AdminUserRoleFilter;
  statusFilter: AdminUserStatusFilter;
  disabled?: boolean;
  onSearchChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onRoleFilterChange: (value: AdminUserRoleFilter) => void;
  onStatusFilterChange: (value: AdminUserStatusFilter) => void;
  onSubmit: () => void;
}

const STATUS_OPTIONS: readonly {
  value: AdminUserStatusFilter;
  label: string;
}[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'BANNED', label: 'Đã xử phạt' },
];

export function AdminModerationFilters({
  search,
  dateFrom,
  dateTo,
  roleFilter,
  statusFilter,
  disabled = false,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onSubmit,
}: AdminModerationFiltersProps) {
  const translate = useTranslations('AdminModeration');
  return (
    <>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {translate('moderationTitle')}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {translate('moderationDescription')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onStatusFilterChange(option.value)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                statusFilter === option.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {translate(option.value === 'ALL' ? 'statusAll' : option.value === 'ACTIVE' ? 'statusActive' : 'statusBanned')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="flex min-w-0 flex-1 gap-3"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder={translate('searchPlaceholder')}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={disabled}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {translate('search')}
          </button>
        </form>

        <div className="grid gap-2 sm:grid-cols-3 xl:flex xl:min-w-[580px]">
          <label className="flex min-w-0 items-center gap-2">
            <span className="sr-only">{translate('fromDate')}</span>
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="text"
              inputMode="numeric"
              placeholder={translate('fromDatePlaceholder')}
              value={dateFrom}
              onChange={(event) => onDateFromChange(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500"
            />
          </label>
          <label className="flex min-w-0 items-center gap-2">
            <span className="sr-only">{translate('toDate')}</span>
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="text"
              inputMode="numeric"
              placeholder={translate('toDatePlaceholder')}
              value={dateTo}
              onChange={(event) => onDateToChange(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500"
            />
          </label>
          <label className="min-w-0 xl:min-w-[170px]">
            <span className="sr-only">{translate('roleFilter')}</span>
            <select
              aria-label={translate('roleFilter')}
              value={roleFilter}
              disabled={disabled}
              onChange={(event) =>
                onRoleFilterChange(event.target.value as SystemRole | 'ALL')
              }
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 disabled:opacity-60"
            >
              <option value="ALL">{translate('allRoles')}</option>
              {SYSTEM_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {translate(
                    option.value === 'PLAYER'
                      ? 'rolePlayer'
                      : option.value === 'REFEREE'
                        ? 'roleReferee'
                        : option.value === 'ORGANIZER'
                          ? 'roleOrganizer'
                          : option.value === 'MODERATOR'
                            ? 'roleModerator'
                            : 'roleAdmin',
                  )}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </>
  );
}
