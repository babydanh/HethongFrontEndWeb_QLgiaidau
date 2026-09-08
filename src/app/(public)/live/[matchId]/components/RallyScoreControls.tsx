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
      <div className="flex min-w-0 flex-1 flex-col items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 sm:p-7 md:p-9 shadow-xs min-h-[220px] sm:min-h-[260px] md:min-h-[300px]">
        <div className="mb-4 flex w-full items-center justify-between border-b border-slate-200/70 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
            {translate('team1')}
          </span>
          <span className="max-w-[220px] truncate text-sm sm:text-base font-bold text-slate-900" title={team1Name}>
            {team1Name}
          </span>
        </div>
        <div className="flex w-full flex-1 items-center justify-center gap-4 sm:gap-8 md:gap-10 py-3">
          <button
            type="button"
            onClick={() => onUpdatePoints(1, 'dec')}
            disabled={isSubmitting}
            className="flex h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm border border-slate-200 transition-all hover:bg-slate-100 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
            aria-label="Giảm điểm đội 1"
          >
            <Minus className="h-7 w-7 sm:h-8 sm:w-8 stroke-[2.5]" />
          </button>
          <div className="flex min-w-[120px] sm:min-w-[140px] md:min-w-[160px] flex-col items-center justify-center rounded-2xl bg-white px-6 py-4 sm:py-5 shadow-xs border border-slate-200/70">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Điểm
            </span>
            <span className={cn('text-5xl sm:text-6xl md:text-7xl font-black tabular-nums text-slate-900 tracking-tight leading-none')}>
              {currentPointTeam1}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onUpdatePoints(1, 'inc')}
            disabled={isSubmitting}
            className="flex h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
            aria-label="Tăng điểm đội 1"
          >
            <Plus className="h-7 w-7 sm:h-8 sm:w-8 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Team 2 Score Box */}
      <div className="flex min-w-0 flex-1 flex-col items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 sm:p-7 md:p-9 shadow-xs min-h-[220px] sm:min-h-[260px] md:min-h-[300px]">
        <div className="mb-4 flex w-full items-center justify-between border-b border-slate-200/70 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
            {translate('team2')}
          </span>
          <span className="max-w-[220px] truncate text-sm sm:text-base font-bold text-slate-900" title={team2Name}>
            {team2Name}
          </span>
        </div>
        <div className="flex w-full flex-1 items-center justify-center gap-4 sm:gap-8 md:gap-10 py-3">
          <button
            type="button"
            onClick={() => onUpdatePoints(2, 'dec')}
            disabled={isSubmitting}
            className="flex h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm border border-slate-200 transition-all hover:bg-slate-100 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
            aria-label="Giảm điểm đội 2"
          >
            <Minus className="h-7 w-7 sm:h-8 sm:w-8 stroke-[2.5]" />
          </button>
          <div className="flex min-w-[120px] sm:min-w-[140px] md:min-w-[160px] flex-col items-center justify-center rounded-2xl bg-white px-6 py-4 sm:py-5 shadow-xs border border-slate-200/70">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Điểm
            </span>
            <span className={cn('text-5xl sm:text-6xl md:text-7xl font-black tabular-nums text-slate-900 tracking-tight leading-none')}>
              {currentPointTeam2}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onUpdatePoints(2, 'inc')}
            disabled={isSubmitting}
            className="flex h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
            aria-label="Tăng điểm đội 2"
          >
            <Plus className="h-7 w-7 sm:h-8 sm:w-8 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
