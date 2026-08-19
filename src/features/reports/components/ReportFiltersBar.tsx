import { Filter, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Input, DatePicker } from '@/components/ui/Input';

import {
  REPORT_CATEGORIES,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  type ReportCategory,
  type ReportStatus,
  type ReportTargetType,
  type ReportFilters,
} from '../types';

interface ReportFiltersBarProps {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
}

export function ReportFiltersBar({ filters, onChange }: ReportFiltersBarProps) {
  const translate = useTranslations('Reports');
  const statusLabels: Record<ReportStatus, string> = {
    SUBMITTED: translate('statusSubmitted'),
    TRIAGED: translate('statusTriaged'),
    UNDER_REVIEW: translate('statusUnderReview'),
    ESCALATED: translate('statusEscalated'),
    RESOLVED: translate('statusResolved'),
    REJECTED: translate('statusRejected'),
  };
  const targetLabels: Record<ReportTargetType, string> = {
    USER: translate('targetUser'),
    TOURNAMENT: translate('targetTournament'),
    MATCH: translate('targetMatch'),
    COMMUNITY: translate('targetCommunity'),
  };
  const categoryLabels: Record<ReportCategory, string> = {
    CHEATING: translate('categoryCheating'),
    RULE_VIOLATION: translate('categoryRuleViolation'),
    ABUSIVE_BEHAVIOR: translate('categoryAbusiveBehavior'),
    FAKE_INFORMATION: translate('categoryFakeInformation'),
    PAYMENT_FRAUD: translate('categoryPaymentFraud'),
    UNSAFE_ORGANIZATION: translate('categoryUnsafeOrganization'),
    OTHER: translate('categoryOther'),
  };
  const update = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
    onChange({ ...filters, page: 1, [key]: value || undefined });
  };
  const hasFilters = Boolean(
    filters.search || filters.status || filters.targetType || filters.category || filters.dateFrom || filters.dateTo,
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <Filter className="h-4 w-4 text-blue-600" /> {translate('filtersTitle')}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Input
          value={filters.search ?? ''}
          onChange={(event) => update('search', event.target.value)}
          placeholder={translate('searchPlaceholder')}
          icon={<Search className="h-4 w-4" />}
          className="h-10"
        />
        <select value={filters.status ?? ''} onChange={(event) => update('status', event.target.value as ReportFilters['status'])} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">
          <option value="">{translate('allStatuses')}</option>
          {REPORT_STATUSES.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}
        </select>
        <select value={filters.targetType ?? ''} onChange={(event) => update('targetType', event.target.value as ReportFilters['targetType'])} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">
          <option value="">{translate('allTargets')}</option>
          {REPORT_TARGET_TYPES.map((value) => <option key={value} value={value}>{targetLabels[value]}</option>)}
        </select>
        <select value={filters.category ?? ''} onChange={(event) => update('category', event.target.value as ReportFilters['category'])} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">
          <option value="">{translate('allCategories')}</option>
          {REPORT_CATEGORIES.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}
        </select>
        <DatePicker value={filters.dateFrom ?? ''} onChange={(val) => update('dateFrom', val)} className="h-10" />
        <DatePicker value={filters.dateTo ?? ''} onChange={(val) => update('dateTo', val)} className="h-10" />
        {hasFilters ? (
          <Button variant="outline" className="h-10" onClick={() => onChange({ page: 1, limit: filters.limit })}>
            <X className="mr-2 h-4 w-4" /> {translate('clearFilters')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

