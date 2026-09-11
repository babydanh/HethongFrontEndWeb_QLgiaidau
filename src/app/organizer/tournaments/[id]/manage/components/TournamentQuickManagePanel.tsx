'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GitMerge,
  Radio,
  UserPlus,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Match } from '@/types/match';
import type { Tournament, TournamentParticipant } from '@/types/tournament';

interface TournamentQuickManagePanelProps {
  tournament: Tournament;
  participants: TournamentParticipant[];
  divisions: Array<{ id: string }>;
  matches: Match[];
  statusLabel: string;
  onOpenRegistration: () => void;
  onOpenSchedule: () => void;
  onOpenBracket?: () => void;
  onOpenOperations: () => void;
}

interface QuickAction {
  key: string;
  label: string;
  count: number;
  icon: LucideIcon;
  tone: string;
  onClick: () => void;
}

export function TournamentQuickManagePanel({
  tournament,
  participants,
  divisions,
  matches,
  statusLabel,
  onOpenRegistration,
  onOpenSchedule,
  onOpenBracket,
  onOpenOperations,
}: TournamentQuickManagePanelProps) {
  const t = useTranslations('OrganizerManage');
  const [isExpanded, setIsExpanded] = useState(true);
  const participantCount = tournament._summary?.participantCount ?? participants.length;
  const scheduledCount = matches.filter((match) => Boolean(match.scheduledAt && match.courtId)).length;
  const liveCount = tournament._summary?.matchesLive ?? matches.filter((match) => match.status === 'ONGOING').length;

  const quickActions: QuickAction[] = [
    {
      key: 'registration',
      label: t('overview.quickManageRegistration'),
      count: participantCount,
      icon: UserPlus,
      tone: 'text-blue-700 bg-blue-50 group-hover:bg-blue-100',
      onClick: onOpenRegistration,
    },
    {
      key: 'schedule',
      label: t('overview.quickManageSchedule'),
      count: scheduledCount,
      icon: CalendarDays,
      tone: 'text-violet-700 bg-violet-50 group-hover:bg-violet-100',
      onClick: onOpenSchedule,
    },
    {
      key: 'bracket',
      label: t('overview.quickManageBracket'),
      count: divisions.length,
      icon: GitMerge,
      tone: 'text-amber-700 bg-amber-50 group-hover:bg-amber-100',
      onClick: onOpenBracket ?? (() => undefined),
    },
    {
      key: 'live',
      label: t('overview.quickManageLive'),
      count: liveCount,
      icon: Radio,
      tone: 'text-rose-700 bg-rose-50 group-hover:bg-rose-100',
      onClick: onOpenOperations,
    },
  ];

  return (
    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-xs" aria-labelledby="quick-manage-title">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Radio className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="quick-manage-title" className="text-sm font-bold text-slate-900">
                {t('overview.quickManageTitle')}
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {statusLabel}
              </span>
            </div>
            <p className="truncate text-[11px] text-slate-500">{t('overview.quickManageSubtitle')}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          aria-controls="quick-manage-actions"
          aria-label={t(isExpanded ? 'overview.quickManageCollapse' : 'overview.quickManageExpand')}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className="hidden sm:inline">
            {t(isExpanded ? 'overview.quickManageCollapse' : 'overview.quickManageExpand')}
          </span>
          {isExpanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      {isExpanded ? (
        <div id="quick-manage-actions" className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                type="button"
                onClick={action.onClick}
                className="group flex min-h-16 items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${action.tone}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-800">{action.label}</span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    {t('overview.quickManageCount', { count: action.count })}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
