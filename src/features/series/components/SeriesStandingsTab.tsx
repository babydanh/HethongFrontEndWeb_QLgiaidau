import React, { useState, useEffect } from 'react';
import { SeriesLeg, SeriesStanding } from '@/types/series';
import { Category } from '@/types/category';
import { UserProfile } from '@/types/user';
import { seriesApi } from '../api';
import { categoriesApi } from '../../categories/api';
import { StandingsTable } from './StandingsTable';
import { Trophy, Loader2 } from 'lucide-react';

interface SeriesStandingsTabProps {
  seriesId: string;
  legs: SeriesLeg[];
}

export const SeriesStandingsTab: React.FC<SeriesStandingsTabProps> = ({ seriesId, legs }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [standings, setStandings] = useState<SeriesStanding[]>([]);
  
  const [selectedLegId, setSelectedLegId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingStandings, setIsLoadingStandings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync selectedLegId when legs load
  useEffect(() => {
    if (legs.length > 0 && !selectedLegId) {
      Promise.resolve().then(() => {
        setSelectedLegId(legs[0].id);
      });
    }
  }, [legs, selectedLegId]);

  // Load categories
  useEffect(() => {
    let active = true;
    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const res = await categoriesApi.getCategories();
        if (active) {
          const allCats = res.data || [];
          // Filter categories to only those present in the series leg tournaments
          const activeCategoryIds = new Set(
            legs
              .flatMap(l => l.events || [])
              .map(e => e.tournament?.categoryId)
              .filter(Boolean)
          );
          
          const filteredCats = allCats.filter(cat => activeCategoryIds.has(cat.id));
          const finalCats = filteredCats.length > 0 ? filteredCats : allCats;

          setCategories(finalCats);
          if (finalCats.length > 0) {
            setSelectedCategoryId(finalCats[0].id);
          }
        }
      } catch (err: unknown) {
        console.error('Failed to load categories', err);
      } finally {
        if (active) {
          setIsLoadingCategories(false);
        }
      }
    };
    loadCategories();
    return () => {
      active = false;
    };
  }, [legs]);

  // Load standings
  useEffect(() => {
    if (!seriesId || !selectedLegId || !selectedCategoryId) return;
    
    let active = true;
    const loadStandings = async () => {
      try {
        setIsLoadingStandings(true);
        setError(null);
        const res = await seriesApi.getSeriesStandings(seriesId, {
          legId: selectedLegId,
          categoryId: selectedCategoryId,
          limit: 100
        });
        if (active) {
          // Map backend standing list which contains { standing: SeriesStanding, user: UserProfile, category: Category }
          // to direct array of standing with user/category attached
          const mappedStandings = (res.data as unknown as Array<{
            standing: SeriesStanding;
            user: UserProfile;
            category: Category;
          }> || []).map((item) => ({
            ...item.standing,
            user: item.user,
            category: item.category
          }));
          setStandings(mappedStandings);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Lỗi tải bảng xếp hạng.');
        }
      } finally {
        if (active) {
          setIsLoadingStandings(false);
        }
      }
    };

    loadStandings();
    
    return () => {
      active = false;
    };
  }, [seriesId, selectedLegId, selectedCategoryId]);

  const selectedCategoryName = categories.find(c => c.id === selectedCategoryId)?.name || 'Nội dung';
  const selectedLegName = legs.find(l => l.id === selectedLegId)?.name || 'Chặng';

  return (
    <div className="flex flex-col gap-6">
      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {/* Active Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Bảng Xếp Hạng PSR Tích Lũy</h3>
            <p className="text-xs text-slate-400 mt-0.5 animate-fade-in">
              Đang xem: <strong className="text-slate-600 font-semibold">{selectedLegName}</strong> — <strong className="text-slate-600 font-semibold">{selectedCategoryName}</strong>
            </p>
          </div>
        </div>

        {/* Dropdown Selectors */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Leg Select */}
          <div className="flex flex-col gap-1 w-full sm:w-56">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1">Chọn chặng</span>
            <select
              value={selectedLegId}
              onChange={(e) => setSelectedLegId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-600 outline-none transition-all cursor-pointer"
            >
              {legs.length === 0 ? (
                <option value="">Chưa có chặng đấu</option>
              ) : (
                legs.map((leg) => (
                  <option key={leg.id} value={leg.id}>
                    {leg.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Category Select */}
          <div className="flex flex-col gap-1 w-full sm:w-56">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1">Nội dung thi đấu</span>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-600 outline-none transition-all cursor-pointer"
              disabled={isLoadingCategories}
            >
              {isLoadingCategories ? (
                <option>Đang tải nội dung...</option>
              ) : categories.length === 0 ? (
                <option value="">Chưa có nội dung</option>
              ) : (
                categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Standings Table Grid */}
      {isLoadingStandings ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 flex flex-col items-center justify-center min-h-[300px] shadow-sm">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm text-slate-500 font-medium">Đang tải bảng xếp hạng PSR...</p>
        </div>
      ) : error ? (
        <div className="bg-white border border-rose-100 rounded-lg p-12 text-center text-rose-500 shadow-sm">
          <h4 className="font-bold mb-1">Đã xảy ra lỗi</h4>
          <p className="text-sm max-w-xs mx-auto leading-relaxed">{error}</p>
        </div>
      ) : (
        <StandingsTable standings={standings} />
      )}
    </div>
  );
};
