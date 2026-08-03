'use client';

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
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-6">
      <div className="flex min-w-0 max-w-full flex-col items-center rounded-lg border border-slate-150 bg-slate-50 p-3 sm:p-5">
        <span className="mb-2 max-w-full truncate text-xs font-bold uppercase tracking-wider text-slate-400">
          Đội 1: {team1Name}
        </span>
        <div className="mt-1 flex items-center gap-3 sm:gap-6">
          <button
            onClick={() => onUpdatePoints(1, 'dec')}
            disabled={isSubmitting}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-50 sm:h-12 sm:w-12"
          >
            <Minus className="h-5 w-5" />
          </button>
          <span className={cn('w-10 text-center text-3xl font-bold tabular-nums text-slate-900 sm:w-12 sm:text-4xl')}>
            {currentPointTeam1}
          </span>
          <button
            onClick={() => onUpdatePoints(1, 'inc')}
            disabled={isSubmitting}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-colors hover:bg-blue-700 disabled:opacity-50 sm:h-12 sm:w-12"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex min-w-0 max-w-full flex-col items-center rounded-lg border border-slate-150 bg-slate-50 p-3 sm:p-5">
        <span className="mb-2 max-w-full truncate text-xs font-bold uppercase tracking-wider text-slate-400">
          Đội 2: {team2Name}
        </span>
        <div className="mt-1 flex items-center gap-3 sm:gap-6">
          <button
            onClick={() => onUpdatePoints(2, 'dec')}
            disabled={isSubmitting}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-50 sm:h-12 sm:w-12"
          >
            <Minus className="h-5 w-5" />
          </button>
          <span className={cn('w-10 text-center text-3xl font-bold tabular-nums text-slate-900 sm:w-12 sm:text-4xl')}>
            {currentPointTeam2}
          </span>
          <button
            onClick={() => onUpdatePoints(2, 'inc')}
            disabled={isSubmitting}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-colors hover:bg-blue-700 disabled:opacity-50 sm:h-12 sm:w-12"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
