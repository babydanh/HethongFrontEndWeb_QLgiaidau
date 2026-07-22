'use client';

import { cn } from '@/utils/cn';

interface PickleballOfficialPanelProps {
  team1Name: string;
  team2Name: string;
  servingTeamName: string;
  serverNumber: 1 | 2;
  isSubmitting: boolean;
  servingTeam: 1 | 2 | null;
  onSetServingTeam: (team: 1 | 2) => void;
  onSideOut: () => void;
}

export function PickleballOfficialPanel({
  team1Name,
  team2Name,
  servingTeamName,
  serverNumber,
  isSubmitting,
  servingTeam,
  onSetServingTeam,
  onSideOut,
}: PickleballOfficialPanelProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
        Chế độ pickleball side-out đang bám theo đội giao bóng hiện tại. Chỉ đội giao bóng mới được cộng điểm.
      </div>
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Trạng thái giao bóng</p>
          <p className="mt-2 text-sm font-bold text-slate-900">
            {servingTeam == null ? 'Chưa chọn đội giao' : `${servingTeamName} đang giao • lượt ${serverNumber}`}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Dùng `Mất quyền giao` để chuyển từ lượt giao 1 sang lượt giao 2, rồi mới sang đội còn lại.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSetServingTeam(1)}
              disabled={isSubmitting}
              className={cn(
                'rounded-lg border px-3 py-2 text-xs font-bold transition-colors',
                servingTeam === 1
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300',
              )}
            >
              {team1Name} giao
            </button>
            <button
              type="button"
              onClick={() => onSetServingTeam(2)}
              disabled={isSubmitting}
              className={cn(
                'rounded-lg border px-3 py-2 text-xs font-bold transition-colors',
                servingTeam === 2
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300',
              )}
            >
              {team2Name} giao
            </button>
          </div>
          <button
            type="button"
            onClick={onSideOut}
            disabled={isSubmitting || servingTeam == null}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-100 disabled:opacity-50"
          >
            Mất quyền giao
          </button>
        </div>
      </div>
    </div>
  );
}
