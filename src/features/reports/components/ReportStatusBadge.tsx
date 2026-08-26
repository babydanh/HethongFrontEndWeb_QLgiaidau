import { cn } from '@/utils/cn';
import { useTranslations } from 'next-intl';
import type { ReportStatus } from '../types';

const statusClasses: Record<ReportStatus, string> = {
  SUBMITTED: 'bg-blue-600 text-white font-bold shadow-2xs',
  TRIAGED: 'bg-sky-600 text-white font-bold shadow-2xs',
  UNDER_REVIEW: 'bg-amber-600 text-white font-bold shadow-2xs',
  ESCALATED: 'bg-rose-600 text-white font-bold shadow-2xs',
  RESOLVED: 'bg-emerald-600 text-white font-bold shadow-2xs',
  REJECTED: 'bg-slate-700 text-white font-bold shadow-2xs',
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

