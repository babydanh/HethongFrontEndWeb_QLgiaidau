'use client';

import { useTranslations } from 'next-intl';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface RallyScoreControlsProps {
  team1Name: string;
  team2Name: string;
  currentPointTeam1: string;
  currentPointTeam2: string;
  isSubmitting: boolean;
  onUpdatePoints: (team: 1 | 2, action: 'inc' | 'dec') => void;
}

export function RallyScoreControls({
  team1Name,
  team2Name,
  currentPointTeam1,
  currentPointTeam2,
  isSubmitting,
  onUpdatePoints,
}: RallyScoreControlsProps) {
  const translate = useTranslations('OrganizerScoring');

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
      <div className="flex min-w-0 max-w-full flex-col items-center rounded-xl bg-slate-50/80 p-4 sm:p-5 border border-slate-100">
        <span className="mb-2 max-w-full truncate text-xs font-bold uppercase tracking-wider text-slate-700">
          {translate('team1')}: {team1Name}
        </span>
        <div className="mt-1 flex items-center gap-4 sm:gap-6">
          <button
            onClick={() => onUpdatePoints(1, 'dec')}
            disabled={isSubmitting}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-xs border border-slate-200/80 transition-all hover:bg-slate-100 hover:scale-105 active:scale-95 disabled:opacity-40 sm:h-12 sm:w-12 cursor-pointer"
            aria-label="Giảm điểm đội 1"
          >
            <Minus className="h-5 w-5" />
          </button>
          <span className={cn('w-12 text-center text-4xl font-extrabold tabular-nums text-slate-900 sm:w-16 sm:text-5xl')}>
            {currentPointTeam1}
          </span>
          <button
            onClick={() => onUpdatePoints(1, 'inc')}
            disabled={isSubmitting}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-40 sm:h-12 sm:w-12 cursor-pointer"
            aria-label="Tăng điểm đội 1"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex min-w-0 max-w-full flex-col items-center rounded-xl bg-slate-50/80 p-4 sm:p-5 border border-slate-100">
        <span className="mb-2 max-w-full truncate text-xs font-bold uppercase tracking-wider text-slate-700">
          {translate('team2')}: {team2Name}
        </span>
        <div className="mt-1 flex items-center gap-4 sm:gap-6">
          <button
            onClick={() => onUpdatePoints(2, 'dec')}
            disabled={isSubmitting}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-xs border border-slate-200/80 transition-all hover:bg-slate-100 hover:scale-105 active:scale-95 disabled:opacity-40 sm:h-12 sm:w-12 cursor-pointer"
            aria-label="Giảm điểm đội 2"
          >
            <Minus className="h-5 w-5" />
          </button>
          <span className={cn('w-12 text-center text-4xl font-extrabold tabular-nums text-slate-900 sm:w-16 sm:text-5xl')}>
            {currentPointTeam2}
          </span>
          <button
            onClick={() => onUpdatePoints(2, 'inc')}
            disabled={isSubmitting}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-40 sm:h-12 sm:w-12 cursor-pointer"
            aria-label="Tăng điểm đội 2"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
