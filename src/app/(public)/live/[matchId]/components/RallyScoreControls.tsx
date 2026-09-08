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
      <div className="flex min-w-0 flex-1 flex-col items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-6 md:p-8 shadow-xs min-h-[160px] sm:min-h-[200px] md:min-h-[240px]">
        <div className="mb-3 flex w-full items-center justify-between border-b border-slate-200/70 pb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
            {translate('team1')}
          </span>
          <span className="max-w-[200px] truncate text-sm sm:text-base font-bold text-slate-900" title={team1Name}>
            {team1Name}
          </span>
        </div>
        <div className="flex w-full items-center justify-center gap-4 sm:gap-8 md:gap-10 py-2">
          <button
            type="button"
            onClick={() => onUpdatePoints(1, 'dec')}
            disabled={isSubmitting}
            className="flex h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm border border-slate-200 transition-all hover:bg-slate-100 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
            aria-label="Giảm điểm đội 1"
          >
            <Minus className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2.5]" />
          </button>
          <div className="flex min-w-[90px] sm:min-w-[110px] md:min-w-[130px] flex-col items-center justify-center rounded-xl bg-white px-5 py-3 shadow-xs border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Điểm
            </span>
            <span className={cn('text-5xl sm:text-6xl md:text-7xl font-black tabular-nums text-slate-900 tracking-tight')}>
              {currentPointTeam1}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onUpdatePoints(1, 'inc')}
            disabled={isSubmitting}
            className="flex h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
            aria-label="Tăng điểm đội 1"
          >
            <Plus className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Team 2 Score Box */}
      <div className="flex min-w-0 flex-1 flex-col items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-6 md:p-8 shadow-xs min-h-[160px] sm:min-h-[200px] md:min-h-[240px]">
        <div className="mb-3 flex w-full items-center justify-between border-b border-slate-200/70 pb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
            {translate('team2')}
          </span>
          <span className="max-w-[200px] truncate text-sm sm:text-base font-bold text-slate-900" title={team2Name}>
            {team2Name}
          </span>
        </div>
        <div className="flex w-full items-center justify-center gap-4 sm:gap-8 md:gap-10 py-2">
          <button
            type="button"
            onClick={() => onUpdatePoints(2, 'dec')}
            disabled={isSubmitting}
            className="flex h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm border border-slate-200 transition-all hover:bg-slate-100 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
            aria-label="Giảm điểm đội 2"
          >
            <Minus className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2.5]" />
          </button>
          <div className="flex min-w-[90px] sm:min-w-[110px] md:min-w-[130px] flex-col items-center justify-center rounded-xl bg-white px-5 py-3 shadow-xs border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Điểm
            </span>
            <span className={cn('text-5xl sm:text-6xl md:text-7xl font-black tabular-nums text-slate-900 tracking-tight')}>
              {currentPointTeam2}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onUpdatePoints(2, 'inc')}
            disabled={isSubmitting}
            className="flex h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
            aria-label="Tăng điểm đội 2"
          >
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
