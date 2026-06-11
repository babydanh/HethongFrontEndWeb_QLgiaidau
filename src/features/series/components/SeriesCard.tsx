import React from 'react';
import Link from 'next/link';
import { TournamentSeries, SeriesStatus } from '@/types/series';
import { Trophy, Layers, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SeriesCardProps {
  series: TournamentSeries;
  className?: string;
}

export const SeriesCard: React.FC<SeriesCardProps> = ({ series, className }) => {
  const statusConfigs: Record<SeriesStatus, { text: string; classes: string }> = {
    DRAFT: {
      text: '📝 Bản nháp',
      classes: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
    },
    ACTIVE: {
      text: '🟢 Đang diễn ra',
      classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
    },
    COMPLETED: {
      text: '✅ Đã kết thúc',
      classes: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
    },
    CANCELLED: {
      text: '❌ Đã hủy',
      classes: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
    }
  };

  const status = statusConfigs[series.status];
  const formattedPrize = series.totalPrize
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(series.totalPrize)
    : 'Thỏa thuận';

  return (
    <div
      className={cn(
        'group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-blue-500/40 hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5',
        className
      )}
    >
      {/* Banner section */}
      <div className="relative aspect-[16/9] w-full bg-slate-900 overflow-hidden">
        {series.bannerUrl ? (
          <img
            src={series.bannerUrl}
            alt={series.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
            <Trophy className="w-12 h-12 text-slate-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>

        {/* Status Badge */}
        <div className="absolute top-4 left-4">
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md bg-white/90 border border-white/20 shadow-sm', status.classes)}>
            {status.text}
          </span>
        </div>

        {/* Total Prize Tag */}
        {series.totalPrize && (
          <div className="absolute bottom-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-md">
            🏆 {formattedPrize}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Organizer */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
            {series.organizer?.avatarUrl ? (
              <img src={series.organizer.avatarUrl} alt={series.organizer.fullName} className="w-full h-full object-cover" />
            ) : (
              series.organizer?.fullName?.charAt(0) || 'O'
            )}
          </div>
          <span className="text-xs font-semibold text-slate-500 line-clamp-1 flex items-center gap-0.5">
            {series.organizer?.fullName}
            {series.organizer?.role === 'ORGANIZER' && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 inline" />}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-2">
          {series.name}
        </h3>

        {/* Date / Description */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {series.startDate && series.endDate
              ? `${new Date(series.startDate).toLocaleDateString('vi-VN')} — ${new Date(series.endDate).toLocaleDateString('vi-VN')}`
              : 'Chưa xác định thời gian'}
          </span>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 py-3 px-4 bg-slate-50 rounded-xl border border-slate-100 mt-auto">
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Số chặng</span>
            <div className="flex items-center gap-1.5 mt-0.5 text-slate-700 font-bold text-sm">
              <Layers className="w-4 h-4 text-blue-500 shrink-0" />
              <span>{series._count?.legs || 0} chặng</span>
            </div>
          </div>
          <div className="flex flex-col items-start border-l border-slate-200 pl-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Số giải đấu</span>
            <div className="flex items-center gap-1.5 mt-0.5 text-slate-700 font-bold text-sm">
              <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{series._count?.events || 0} giải</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Link
          href={`/series/${series.slug}`}
          className="mt-4 inline-flex items-center justify-center gap-1.5 w-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group/btn"
        >
          Chi tiết chuỗi giải
          <ArrowRight className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
};
