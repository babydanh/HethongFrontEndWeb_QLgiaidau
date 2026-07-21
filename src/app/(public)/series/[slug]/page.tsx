'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { seriesApi } from '@/features/series/api';
import { TournamentSeries, SeriesLeg, SeriesStatus } from '@/types/series';
import { SeriesOverviewTab } from '@/features/series/components/SeriesOverviewTab';
import { SeriesStandingsTab } from '@/features/series/components/SeriesStandingsTab';
import { SeriesScheduleTab } from '@/features/series/components/SeriesScheduleTab';
import { SeriesRulesTab } from '@/features/series/components/SeriesRulesTab';
import { Calendar, Trophy, ArrowLeft, Layers, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import Link from 'next/link';

export default function SeriesDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [activeTab, setActiveTab] = useState<'overview' | 'standings' | 'schedule' | 'rules'>('overview');
  
  const [series, setSeries] = useState<TournamentSeries | null>(null);
  const [legs, setLegs] = useState<SeriesLeg[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let active = true;

    const fetchDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await seriesApi.getSeriesDetail(slug);
        if (active) {
          setSeries(res.series);
          setLegs(res.legs || []);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Không thể tải chi tiết chuỗi giải đấu.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchDetail();
    
    return () => {
      active = false;
    };
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-20 px-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-sm text-slate-500 font-medium">Đang tải thông tin chuỗi giải...</p>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-20 px-4">
        <div className="text-center max-w-md bg-white p-8 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center">
          <Trophy className="w-16 h-16 text-slate-300 mb-4" />
          <h1 className="text-xl font-bold text-slate-805 mb-2">Chuỗi giải đấu không tồn tại</h1>
          <p className="text-sm text-slate-500 mb-6">
            Rất tiếc, chuỗi giải đấu mà bạn đang tìm kiếm không tồn tại hoặc đã bị gỡ khỏi hệ thống.
          </p>
          <Link
            href="/series"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  // Calculate completion percentage of events
  const totalEvents = legs.flatMap(l => l.events || []);
  const completedEvents = totalEvents.filter(e => e.tournament?.status === 'COMPLETED').length;
  const completionPercentage = totalEvents.length > 0 ? Math.round((completedEvents / totalEvents.length) * 100) : 0;

  const statusConfigs: Record<SeriesStatus, { text: string; classes: string }> = {
    DRAFT: { text: '📝 BẢN NHÁP', classes: 'bg-slate-500/10 text-slate-400 border border-slate-500/20' },
    ACTIVE: { text: '🟢 ĐANG DIỄN RA', classes: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
    COMPLETED: { text: '✅ ĐÃ KẾT THÚC', classes: 'bg-slate-500/10 text-slate-400 border border-slate-500/20' },
    CANCELLED: { text: '❌ ĐÃ HỦY', classes: 'bg-red-500/10 text-red-400 border border-red-500/20' }
  };
  const status = statusConfigs[series.status];

  const formattedPrize = series.totalPrize
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(series.totalPrize)
    : 'Thỏa thuận';

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Back to List Button (Floating or Top bar) */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6">
        <Link 
          href="/series"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Quay lại danh sách chuỗi giải
        </Link>
      </div>

      {/* Hero Banner Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div className="relative rounded-2xl overflow-hidden aspect-[21/9] md:aspect-[3/1] bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-end p-6 md:p-10 min-h-[280px]">
          {series.bannerUrl && (
            <img
              src={series.bannerUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-35"
            />
          )}
          {/* Shadow Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>

          {/* Banner details */}
          <div className="relative z-10 flex flex-col gap-3 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wider', status.classes)}>
                {status.text}
              </span>
              <span className="bg-white/10 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/10">
                🏆 TOURNAMENT SERIES
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
              {series.name}
            </h1>

            {/* Sub details */}
            <div className="flex items-center gap-4 text-xs text-slate-300 font-semibold flex-wrap mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-slate-400" />
                {series.startDate && series.endDate
                  ? `${new Date(series.startDate).toLocaleDateString('vi-VN')} — ${new Date(series.endDate).toLocaleDateString('vi-VN')}`
                  : 'Chưa xác định thời gian'}
              </span>
              <span className="text-slate-600 font-normal">|</span>
              <span className="text-amber-400 font-bold">
                Giải thưởng: {formattedPrize}
              </span>
            </div>

            {/* Progress Bar */}
            {totalEvents.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-4 max-w-md bg-white/5 backdrop-blur-md p-3.5 rounded-lg border border-white/5">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
                  <span>TIẾN ĐỘ CHUỖI GIẢI</span>
                  <span>{completedEvents}/{totalEvents.length} GIẢI ĐÃ ĐẤU ({completionPercentage}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-6">
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto scrollbar-none pb-0.5">
          {[
            { id: 'overview', label: 'Tổng Quan', icon: FileText },
            { id: 'schedule', label: 'Chặng Đấu & Lịch Trình', icon: Calendar },
            { id: 'standings', label: 'Bảng Xếp Hạng PSR', icon: Trophy },
            { id: 'rules', label: 'Điều Lệ & Quy Tắc', icon: Layers }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  'flex items-center gap-2 px-5 py-4 border-b-2 font-bold text-xs md:text-sm whitespace-nowrap transition-all outline-none',
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-blue-600' : 'text-slate-400')} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pb-16">
        {activeTab === 'overview' && (
          <SeriesOverviewTab series={series} legs={legs} />
        )}
        {activeTab === 'schedule' && (
          <SeriesScheduleTab legs={legs} />
        )}
        {activeTab === 'standings' && (
          <SeriesStandingsTab seriesId={series.id} legs={legs} />
        )}
        {activeTab === 'rules' && (
          <SeriesRulesTab series={series} />
        )}
      </main>
    </div>
  );
}
