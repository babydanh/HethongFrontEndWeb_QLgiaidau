'use client';

import type { Match, MatchScore, TennisLivePointState } from '@/types/match';
import { useTranslations } from 'next-intl';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface TennisOfficialPanelProps {
  match: Match;
  team1Name: string;
  team2Name: string;
  currentSet: MatchScore;
  currentPointTeam1: string;
  currentPointTeam2: string;
  tennisPointState: TennisLivePointState | null;
  isSubmitting: boolean;
  onUpdatePoints: (team: 1 | 2, action: 'inc' | 'dec') => void;
}

export function TennisOfficialPanel({
  match,
  team1Name,
  team2Name,
  currentSet,
  currentPointTeam1,
  currentPointTeam2,
  tennisPointState,
  isSubmitting,
  onUpdatePoints,
}: TennisOfficialPanelProps) {
  const translate = useTranslations('LiveMatch');
  const pointHint =
    tennisPointState?.mode === 'tiebreak'
      ? translate('tennisTiebreakHint')
      : translate('tennisPointHint');

  const isDisabled = isSubmitting || !match.participant1Id || !match.participant2Id;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 sm:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{translate('tennisControl')}</p>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-700">{pointHint}</p>
          </div>
          <div className="shrink-0 self-start sm:self-auto rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-900 shadow-xs">
            {translate('currentGameScore', { score1: currentSet.team1Score, score2: currentSet.team2Score })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-2">
        {/* Team 1 Score Box */}
        <div className="flex flex-col items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 sm:p-7 md:p-9 shadow-xs min-h-[220px] sm:min-h-[260px] md:min-h-[300px]">
          <div className="mb-4 flex w-full items-center justify-between border-b border-slate-200/70 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              {translate('teamLabel', { number: 1 })}
            </span>
            <span className="max-w-[220px] truncate text-sm sm:text-base font-bold text-slate-900" title={team1Name}>
              {team1Name}
            </span>
          </div>

          <div className="flex w-full flex-1 items-center justify-center gap-4 sm:gap-8 md:gap-10 py-3">
            <button
              type="button"
              onClick={() => onUpdatePoints(1, 'dec')}
              disabled={isDisabled}
              className="flex h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
              title={translate('undoPoint')}
              aria-label={translate('undoPoint')}
            >
              <Minus className="h-7 w-7 sm:h-8 sm:w-8 stroke-[2.5]" />
            </button>

            <div className="flex min-w-[120px] sm:min-w-[140px] md:min-w-[160px] flex-col items-center justify-center rounded-2xl bg-white px-6 py-4 sm:py-5 shadow-xs border border-slate-200/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {translate('rallyLabel')}
              </span>
              <span className="mt-1 text-5xl sm:text-6xl md:text-7xl font-black tabular-nums text-blue-700 leading-none">
                {currentPointTeam1}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onUpdatePoints(1, 'inc')}
              disabled={isDisabled}
              className="flex h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
              title={translate('teamWinsPoint', { number: 1 })}
              aria-label={translate('teamWinsPoint', { number: 1 })}
            >
              <Plus className="h-7 w-7 sm:h-8 sm:w-8 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Team 2 Score Box */}
        <div className="flex flex-col items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 sm:p-7 md:p-9 shadow-xs min-h-[220px] sm:min-h-[260px] md:min-h-[300px]">
          <div className="mb-4 flex w-full items-center justify-between border-b border-slate-200/70 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              {translate('teamLabel', { number: 2 })}
            </span>
            <span className="max-w-[220px] truncate text-sm sm:text-base font-bold text-slate-900" title={team2Name}>
              {team2Name}
            </span>
          </div>

          <div className="flex w-full flex-1 items-center justify-center gap-4 sm:gap-8 md:gap-10 py-3">
            <button
              type="button"
              onClick={() => onUpdatePoints(2, 'dec')}
              disabled={isDisabled}
              className="flex h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
              title={translate('undoPoint')}
              aria-label={translate('undoPoint')}
            >
              <Minus className="h-7 w-7 sm:h-8 sm:w-8 stroke-[2.5]" />
            </button>

            <div className="flex min-w-[120px] sm:min-w-[140px] md:min-w-[160px] flex-col items-center justify-center rounded-2xl bg-white px-6 py-4 sm:py-5 shadow-xs border border-slate-200/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {translate('rallyLabel')}
              </span>
              <span className="mt-1 text-5xl sm:text-6xl md:text-7xl font-black tabular-nums text-blue-700 leading-none">
                {currentPointTeam2}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onUpdatePoints(2, 'inc')}
              disabled={isDisabled}
              className="flex h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
              title={translate('teamWinsPoint', { number: 2 })}
              aria-label={translate('teamWinsPoint', { number: 2 })}
            >
              <Plus className="h-7 w-7 sm:h-8 sm:w-8 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
