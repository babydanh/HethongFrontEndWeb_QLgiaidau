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
        <div className="flex flex-col items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-6 shadow-xs min-h-[160px] sm:min-h-[200px]">
          <div className="mb-3 flex w-full items-center justify-between border-b border-slate-200/70 pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              {translate('teamLabel', { number: 1 })}
            </span>
            <span className="max-w-[200px] truncate text-sm sm:text-base font-bold text-slate-900" title={team1Name}>
              {team1Name}
            </span>
          </div>

          <div className="flex w-full items-center justify-center gap-4 sm:gap-8 py-2">
            <button
              type="button"
              onClick={() => onUpdatePoints(1, 'dec')}
              disabled={isDisabled}
              className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
              title={translate('undoPoint')}
              aria-label={translate('undoPoint')}
            >
              <Minus className="h-6 w-6 stroke-[2.5]" />
            </button>

            <div className="flex min-w-[100px] sm:min-w-[120px] flex-col items-center justify-center rounded-xl bg-white px-5 py-3 shadow-xs border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {translate('rallyLabel')}
              </span>
              <span className="mt-0.5 text-4xl sm:text-5xl font-black tabular-nums text-blue-700">
                {currentPointTeam1}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onUpdatePoints(1, 'inc')}
              disabled={isDisabled}
              className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
              title={translate('teamWinsPoint', { number: 1 })}
              aria-label={translate('teamWinsPoint', { number: 1 })}
            >
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Team 2 Score Box */}
        <div className="flex flex-col items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-6 shadow-xs min-h-[160px] sm:min-h-[200px]">
          <div className="mb-3 flex w-full items-center justify-between border-b border-slate-200/70 pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              {translate('teamLabel', { number: 2 })}
            </span>
            <span className="max-w-[200px] truncate text-sm sm:text-base font-bold text-slate-900" title={team2Name}>
              {team2Name}
            </span>
          </div>

          <div className="flex w-full items-center justify-center gap-4 sm:gap-8 py-2">
            <button
              type="button"
              onClick={() => onUpdatePoints(2, 'dec')}
              disabled={isDisabled}
              className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
              title={translate('undoPoint')}
              aria-label={translate('undoPoint')}
            >
              <Minus className="h-6 w-6 stroke-[2.5]" />
            </button>

            <div className="flex min-w-[100px] sm:min-w-[120px] flex-col items-center justify-center rounded-xl bg-white px-5 py-3 shadow-xs border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {translate('rallyLabel')}
              </span>
              <span className="mt-0.5 text-4xl sm:text-5xl font-black tabular-nums text-blue-700">
                {currentPointTeam2}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onUpdatePoints(2, 'inc')}
              disabled={isDisabled}
              className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
              title={translate('teamWinsPoint', { number: 2 })}
              aria-label={translate('teamWinsPoint', { number: 2 })}
            >
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
