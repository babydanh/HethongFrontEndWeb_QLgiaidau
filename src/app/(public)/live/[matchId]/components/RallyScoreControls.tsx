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
    <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2 md:gap-5">
      {/* Team 1 Score Box */}
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 p-6 sm:p-8 md:p-10 shadow-xs border border-slate-100/80 min-h-[180px] sm:min-h-[220px] md:min-h-[260px]">
        <span className="mb-4 max-w-full truncate text-center text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-800">
          {translate('team1')}: <span className="text-blue-600">{team1Name}</span>
        </span>
        <div className="flex items-center justify-center gap-5 sm:gap-8 md:gap-10">
          <button
            type="button"
            onClick={() => onUpdatePoints(1, 'dec')}
            disabled={isSubmitting}
            className="flex h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-white text-slate-700 shadow-md border border-slate-200 transition-all hover:bg-slate-50 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
            aria-label="Giảm điểm đội 1"
          >
            <Minus className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2.5]" />
          </button>
          <span className={cn('min-w-[70px] sm:min-w-[90px] md:min-w-[110px] text-center text-5xl sm:text-6xl md:text-7xl font-black tabular-nums text-slate-900 tracking-tight')}>
            {currentPointTeam1}
          </span>
          <button
            type="button"
            onClick={() => onUpdatePoints(1, 'inc')}
            disabled={isSubmitting}
            className="flex h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
            aria-label="Tăng điểm đội 1"
          >
            <Plus className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Team 2 Score Box */}
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 p-6 sm:p-8 md:p-10 shadow-xs border border-slate-100/80 min-h-[180px] sm:min-h-[220px] md:min-h-[260px]">
        <span className="mb-4 max-w-full truncate text-center text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-800">
          {translate('team2')}: <span className="text-blue-600">{team2Name}</span>
        </span>
        <div className="flex items-center justify-center gap-5 sm:gap-8 md:gap-10">
          <button
            type="button"
            onClick={() => onUpdatePoints(2, 'dec')}
            disabled={isSubmitting}
            className="flex h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-white text-slate-700 shadow-md border border-slate-200 transition-all hover:bg-slate-50 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
            aria-label="Giảm điểm đội 2"
          >
            <Minus className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2.5]" />
          </button>
          <span className={cn('min-w-[70px] sm:min-w-[90px] md:min-w-[110px] text-center text-5xl sm:text-6xl md:text-7xl font-black tabular-nums text-slate-900 tracking-tight')}>
            {currentPointTeam2}
          </span>
          <button
            type="button"
            onClick={() => onUpdatePoints(2, 'inc')}
            disabled={isSubmitting}
            className="flex h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
            aria-label="Tăng điểm đội 2"
          >
            <Plus className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
