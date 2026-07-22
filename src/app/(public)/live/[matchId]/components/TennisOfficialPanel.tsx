'use client';

import type { Match, MatchScore, TennisLivePointState } from '@/types/match';
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
  const pointHint =
    tennisPointState?.mode === 'tiebreak'
      ? 'Loạt phụ đang hoạt động. Mỗi pha bóng sẽ cộng 1 điểm tiebreak.'
      : 'Bấm đội thắng pha bóng để hệ thống tự chạy 0 - 15 - 30 - 40 - A và tự chốt game khi đủ điều kiện.';

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Điều khiển tennis</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">{pointHint}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm">
            Game hiện tại của set: {currentSet.team1Score} - {currentSet.team2Score}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Đội 1</p>
              <h4 className="mt-2 text-xl font-bold text-slate-900">{team1Name}</h4>
            </div>
            <div className="min-w-[92px] rounded-lg bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Pha bóng</p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-blue-700">{currentPointTeam1}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => onUpdatePoints(1, 'inc')}
              disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
              className="rounded-lg bg-blue-600 px-4 py-4 text-left text-white shadow-md transition-all hover:bg-blue-700 disabled:opacity-50"
            >
              <span className="block text-sm font-bold">Đội 1 thắng pha bóng</span>
              <span className="mt-1 block text-xs font-semibold text-blue-100">
                Tự tăng theo mốc tennis và tự chốt game khi đủ luật.
              </span>
            </button>
            <button
              onClick={() => onUpdatePoints(1, 'dec')}
              disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
              className="rounded-lg border border-slate-200 bg-white px-4 py-4 text-left text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              <span className="block text-sm font-bold">Lùi 1 mức điểm</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">
                Dùng khi nhập nhầm pha bóng hoặc cần tua lùi quyết định vừa chốt.
              </span>
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Đội 2</p>
              <h4 className="mt-2 text-xl font-bold text-slate-900">{team2Name}</h4>
            </div>
            <div className="min-w-[92px] rounded-lg bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Pha bóng</p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-blue-700">{currentPointTeam2}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => onUpdatePoints(2, 'inc')}
              disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
              className="rounded-lg bg-blue-600 px-4 py-4 text-left text-white shadow-md transition-all hover:bg-blue-700 disabled:opacity-50"
            >
              <span className="block text-sm font-bold">Đội 2 thắng pha bóng</span>
              <span className="mt-1 block text-xs font-semibold text-blue-100">
                Tự tăng theo mốc tennis và tự chốt game khi đủ luật.
              </span>
            </button>
            <button
              onClick={() => onUpdatePoints(2, 'dec')}
              disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
              className={cn(
                'rounded-lg border border-slate-200 bg-white px-4 py-4 text-left text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50',
              )}
            >
              <span className="block text-sm font-bold">Lùi 1 mức điểm</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">
                Dùng khi nhập nhầm pha bóng hoặc cần tua lùi quyết định vừa chốt.
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
