import { cn } from '@/utils/cn';
import { useTranslations } from 'next-intl';
import type { ReportStatus } from '../types';

const statusClasses: Record<ReportStatus, string> = {
  SUBMITTED: 'border-blue-200 bg-blue-50 text-blue-700',
  TRIAGED: 'border-blue-200 bg-blue-50 text-blue-700',
  UNDER_REVIEW: 'border-amber-200 bg-amber-50 text-amber-800',
  ESCALATED: 'border-slate-200 bg-rose-50 text-rose-700',
  RESOLVED: 'border-blue-200 bg-blue-50 text-blue-700',
  REJECTED: 'border-slate-200 bg-slate-100 text-slate-600',
};

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const translate = useTranslations('Reports');
  const labels: Record<ReportStatus, string> = {
    SUBMITTED: translate('statusSubmitted'),
    TRIAGED: translate('statusTriaged'),
    UNDER_REVIEW: translate('statusUnderReview'),
    ESCALATED: translate('statusEscalated'),
    RESOLVED: translate('statusResolved'),
    REJECTED: translate('statusRejected'),
  };

  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', statusClasses[status])}>
      {labels[status]}
    </span>
  );
}

