'use client';

import React, { useState, useEffect } from 'react';
import { seriesApi } from '@/features/series/api';
import { SeriesCard } from '@/features/series/components/SeriesCard';
import { TournamentSeries } from '@/types/series';
import { Search, Trophy, Calendar, Filter, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useDebounce } from '@/hooks/useDebounce';

export default function SeriesListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  
  const [seriesList, setSeriesList] = useState<TournamentSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    let active = true;
    
    const fetchSeries = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const params = {
          search: debouncedSearch || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          visibility: 'PUBLIC' as const,
          limit: 50,
        };
        
        const response = await seriesApi.getSeriesList(params);
        if (active) {
          setSeriesList(response.data || []);
        }
      } catch (err: unknown) {
        if (active) {
          const errorMessage = err instanceof Error ? err.message : 'Không thể tải danh sách chuỗi giải đấu.';
          setError(errorMessage);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchSeries();
    
    return () => {
      active = false;
    };
  }, [debouncedSearch, statusFilter]);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Hero Header Banner */}
      <div className="relative bg-slate-900 overflow-hidden py-16 md:py-24 border-b border-slate-800">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0e1e1a_1px,transparent_1px),linear-gradient(to_bottom,#0e1e1a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-35"></div>
        {/* Colorful gradient glow */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px]"></div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 text-center flex flex-col items-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-emerald-400 border border-emerald-500/25 mb-4 animate-fade-in">
            <Trophy className="w-3.5 h-3.5" /> HỆ THỐNG LEAGUE & TOUR
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4 max-w-3xl leading-tight font-sans">
            Chuỗi Giải Đấu Vòng Loại Tích Điểm
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-2xl leading-relaxed">
            Khám phá các chuỗi giải đấu phong trào Pickleball và Tennis trên toàn quốc. Đấu chặng tích lũy điểm PSR, tranh vé thẳng và giành tấm vé vàng tham gia Vòng Chung Kết Cup danh giá.
          </p>
        </div>
      </div>

      {/* Main Listing Section */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm chuỗi giải..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-2 hidden lg:inline flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Lọc chặng:
            </span>
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'ACTIVE', label: 'Đang diễn ra' },
              { id: 'COMPLETED', label: 'Đã kết thúc' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap border shrink-0',
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white border-transparent shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col h-[400px] animate-pulse">
                <div className="bg-slate-200 aspect-[16/9] w-full" />
                <div className="p-5 flex flex-col flex-grow gap-4">
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-12 bg-slate-100 rounded-lg mt-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-white rounded-lg border border-slate-200 max-w-xl mx-auto p-8 text-rose-500">
            <h3 className="text-base font-bold mb-1">Đã xảy ra lỗi</h3>
            <p className="text-sm max-w-xs mx-auto leading-relaxed">{error}</p>
          </div>
        ) : seriesList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {seriesList.map((series) => (
              <SeriesCard key={series.id} series={series} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-lg border border-slate-200 border-dashed max-w-xl mx-auto flex flex-col items-center justify-center p-8">
            <Trophy className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-base font-bold text-slate-800 mb-1">Không tìm thấy chuỗi giải nào</h3>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              Thử tìm kiếm với từ khóa khác hoặc chuyển bộ lọc chặng để khám phá thêm.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

