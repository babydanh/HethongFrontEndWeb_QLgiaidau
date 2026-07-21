import React from 'react';
import { SeriesStanding } from '@/types/series';
import { TicketStatusBadge } from './TicketStatusBadge';
import { cn } from '@/utils/cn';

interface StandingsTableProps {
  standings: SeriesStanding[];
  className?: string;
}

export const StandingsTable: React.FC<StandingsTableProps> = ({ standings, className }) => {
  
  const getRankMedal = (rank: number) => {
    if (rank === 1) return <span className="text-xl">🥇</span>;
    if (rank === 2) return <span className="text-xl">🥈</span>;
    if (rank === 3) return <span className="text-xl">🥉</span>;
    return <span className="text-slate-400 font-bold text-sm w-6 text-center inline-block">{rank}</span>;
  };

  const getTicketStatus = (standing: SeriesStanding): 'DIRECT_ENTRY' | 'WILDCARD' | 'IN_CONTENTION' | 'LOCKED_OUT' | 'NOT_QUALIFIED' => {
    if (standing.lockedOut) return 'LOCKED_OUT';
    if (standing.directEntry) return 'DIRECT_ENTRY';
    if (standing.wildcardEntry) return 'WILDCARD';
    if (standing.totalPsrPoints > 30) return 'IN_CONTENTION'; // Simple mock threshold
    return 'NOT_QUALIFIED';
  };

  return (
    <div className={cn('border border-slate-150 rounded-lg overflow-hidden shadow-sm bg-white', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-slate-700">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <th className="py-3.5 px-6 w-16 text-center">Hạng</th>
              <th className="py-3.5 px-6">VĐV / Đội chơi</th>
              <th className="py-3.5 px-6 text-center">Điểm PSR</th>
              <th className="py-3.5 px-6 text-center">Giải đã đấu</th>
              <th className="py-3.5 px-6 text-center">Hạng tốt nhất</th>
              <th className="py-3.5 px-6 text-right">Trạng thái vé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150">
            {standings.length > 0 ? (
              standings.map((standing, index) => {
                const rank = index + 1;
                const status = getTicketStatus(standing);

                return (
                  <tr
                    key={standing.id}
                    className={cn(
                      'hover:bg-slate-50/50 transition-colors',
                      standing.lockedOut && 'opacity-65 bg-slate-50/20'
                    )}
                  >
                    <td className="py-4 px-6 text-center font-bold">
                      {getRankMedal(rank)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-xs text-slate-500 font-bold shrink-0">
                          {standing.user?.avatarUrl ? (
                            <img src={standing.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            standing.user?.fullName?.charAt(0) || 'U'
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className={cn('font-bold text-slate-900 text-sm', standing.lockedOut && 'text-slate-500')}>
                            {standing.user?.fullName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">{standing.user?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-blue-600 text-sm">
                      {standing.totalPsrPoints} pts
                    </td>
                    <td className="py-4 px-6 text-center font-semibold text-slate-500 text-sm">
                      {standing.eventsPlayed}
                    </td>
                    <td className="py-4 px-6 text-center font-semibold text-slate-500 text-sm">
                      {standing.bestRank ? `Hạng ${standing.bestRank}` : '—'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <TicketStatusBadge status={status} />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                  Chưa có dữ liệu xếp hạng cho nội dung này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-slate-400 font-medium">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1">🟢 Top 2 = Vé Thẳng (Direct Entry)</span>
          <span className="flex items-center gap-1">🔵 Top 16 PSR = Vé Vớt (Wildcard)</span>
        </div>
        <div>
          <span>🔒 Đã khóa: VĐV đã đoạt vé thẳng (không được đấu giải tiếp trong chặng)</span>
        </div>
      </div>
    </div>
  );
};
