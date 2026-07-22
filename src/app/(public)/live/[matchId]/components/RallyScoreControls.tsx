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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="flex flex-col items-center rounded-lg border border-slate-150 bg-slate-50 p-5">
        <span className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          Đội 1: {team1Name}
        </span>
        <div className="mt-1 flex items-center gap-6">
          <button
            onClick={() => onUpdatePoints(1, 'dec')}
            disabled={isSubmitting}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            <Minus className="h-5 w-5" />
          </button>
          <span className={cn('w-12 text-center text-4xl font-bold tabular-nums text-slate-900')}>
            {currentPointTeam1}
          </span>
          <button
            onClick={() => onUpdatePoints(1, 'inc')}
            disabled={isSubmitting}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center rounded-lg border border-slate-150 bg-slate-50 p-5">
        <span className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          Đội 2: {team2Name}
        </span>
        <div className="mt-1 flex items-center gap-6">
          <button
            onClick={() => onUpdatePoints(2, 'dec')}
            disabled={isSubmitting}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            <Minus className="h-5 w-5" />
          </button>
          <span className={cn('w-12 text-center text-4xl font-bold tabular-nums text-slate-900')}>
            {currentPointTeam2}
          </span>
          <button
            onClick={() => onUpdatePoints(2, 'inc')}
            disabled={isSubmitting}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
