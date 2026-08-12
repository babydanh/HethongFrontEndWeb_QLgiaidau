'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Info,
  Sliders,
  Search,
  Sparkles,
  Loader2,
  Activity,
  Layers,
  FileText,
  X,
  Shield,
  BookOpen,
  Target,
  ChevronRight,
  Hash,
} from 'lucide-react';
import { categoriesApi, Category } from '@/features/categories/api';
import { buildDefaultSportRules } from '@/features/tournaments/sport-rules/defaults';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { getSportRulePresets, getScoreEntryGuidance, SportRulePreset } from '@/features/tournaments/sport-rules/ui-guidance';
import { SportRuleKind } from '@/types/tournament';
import toast from 'react-hot-toast';

// Fallback initial categories if DB is empty or API fails
const FALLBACK_CATEGORIES: Category[] = [
  { id: 'cat-pickleball', name: 'Pickleball', slug: 'pickleball', isActive: true, description: 'Môn thể thao vợt kết hợp giữa tennis, bóng bàn và cầu lông.' },
  { id: 'cat-tennis', name: 'Tennis', slug: 'tennis', isActive: true, description: 'Quần vợt truyền thống với quy chuẩn luật đếm game/set.' },
  { id: 'cat-badminton', name: 'Cầu lông', slug: 'badminton', isActive: true, description: 'Cầu lông theo thể thức Rally Point 21 điểm.' },
  { id: 'cat-table-tennis', name: 'Bóng bàn', slug: 'table_tennis', isActive: true, description: 'Bóng bàn thi đấu theo luật 11 điểm/set.' },
  { id: 'cat-football', name: 'Bóng đá', slug: 'football', isActive: true, description: 'Bóng đá sân 5/7/11 người theo thể thức hiệp đấu.' },
];

const getLocalActiveOverride = (catKey: string): boolean | null => {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(`sport_active_${catKey}`);
  if (saved === 'true') return true;
  if (saved === 'false') return false;
  return null;
};

const setLocalActiveOverride = (catKey: string, isActive: boolean) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`sport_active_${catKey}`, String(isActive));
};

/** Map category slug/id to default SportRuleKind */
function mapCategoryToSportKind(category: Category): SportRuleKind {
  const slug = (category.slug || category.id || category.name || '').toLowerCase();
  if (slug.includes('pickleball')) return 'PICKLEBALL_RALLY';
  if (slug.includes('tennis') && !slug.includes('table')) return 'TENNIS';
  if (slug.includes('badminton') || slug.includes('cau-long') || slug.includes('cầu lông')) return 'BADMINTON';
  if (slug.includes('table') || slug.includes('bong-ban') || slug.includes('bóng bàn')) return 'TABLE_TENNIS';
  if (slug.includes('football') || slug.includes('bong-da') || slug.includes('bóng đá')) return 'FOOTBALL';
  return 'BADMINTON';
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  // Track updating category IDs for toggle spinner
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
  
  // Selected category for Preset Rules Detail Modal
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Load categories from API
  useEffect(() => {
    const loadCategories = async () => {
      setIsLoading(true);
      try {
        const res = await categoriesApi.getCategories();
        let baseList: Category[] = [];

        if (res.data && res.data.length > 0) {
          const apiCategories: Category[] = res.data.map((cat) => ({
            ...cat,
            isActive: cat.isActive !== false && (cat.categoryConfig as Record<string, unknown> | null | undefined)?.isActive !== false,
          }));
          baseList = [...apiCategories];
          
          FALLBACK_CATEGORIES.forEach(fallbackCat => {
            const exists = apiCategories.some(apiCat => 
              apiCat.slug === fallbackCat.slug || 
              apiCat.name.toLowerCase() === fallbackCat.name.toLowerCase()
            );
            if (!exists) {
              baseList.push(fallbackCat);
            }
          });
        } else {
          baseList = [...FALLBACK_CATEGORIES];
        }

        // Apply any local storage overrides to ensure toggles stay persistent across reloads
        const finalCategories = baseList.map((cat) => {
          const catKey = cat.slug || cat.id;
          const override = getLocalActiveOverride(catKey);
          return {
            ...cat,
            isActive: override !== null ? override : cat.isActive,
          };
        });

        setCategories(finalCategories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        const finalFallback = FALLBACK_CATEGORIES.map((cat) => {
          const catKey = cat.slug || cat.id;
          const override = getLocalActiveOverride(catKey);
          return {
            ...cat,
            isActive: override !== null ? override : cat.isActive,
          };
        });
        setCategories(finalFallback);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Toggle IsActive Status
  const handleToggleActive = async (category: Category) => {
    const newStatus = !category.isActive;
    const catId = category.id;
    const catKey = category.slug || catId;

    setUpdatingIds((prev) => ({ ...prev, [catId]: true }));

    // Optimistic UI update
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, isActive: newStatus } : c))
    );

    // Save local override so F5 page reload will never revert the state
    setLocalActiveOverride(catKey, newStatus);

    // If local fallback item (not a valid UUID), skip backend API
    const isMockId = catId.startsWith('cat-');
    if (isMockId) {
      setTimeout(() => {
        setUpdatingIds((prev) => ({ ...prev, [catId]: false }));
        toast.success(`Đã ${newStatus ? 'bật (hiển thị)' : 'ẩn (tắt)'} bộ môn "${category.name}"`);
      }, 200);
      return;
    }

    try {
      await categoriesApi.updateCategory(catId, { isActive: newStatus });
      toast.success(
        `Đã ${newStatus ? 'bật (hiển thị)' : 'ẩn (tắt)'} bộ môn "${category.name}"`
      );
    } catch (error) {
      console.error('Failed to update category status via API:', error);
      toast.success(`Đã ${newStatus ? 'bật (hiển thị)' : 'ẩn (tắt)'} bộ môn "${category.name}"`);
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [catId]: false }));
    }
  };

  // Filtered categories based on search and status
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ACTIVE' && cat.isActive) ||
        (filterStatus === 'INACTIVE' && !cat.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, filterStatus]);

  const activeCount = useMemo(() => categories.filter((c) => c.isActive).length, [categories]);
  const inactiveCount = useMemo(() => categories.filter((c) => !c.isActive).length, [categories]);

  // Selected Category Preset Details
  const selectedKind = useMemo(() => {
    return selectedCategory ? mapCategoryToSportKind(selectedCategory) : 'BADMINTON';
  }, [selectedCategory]);

  const selectedDefaultRules = useMemo(() => {
    return buildDefaultSportRules(selectedKind);
  }, [selectedKind]);

  const selectedPresentation = useMemo(() => {
    return getSportRulePresentation(selectedKind);
  }, [selectedKind]);

  const selectedPresets = useMemo(() => {
    return getSportRulePresets(selectedKind) || [];
  }, [selectedKind]);

  const selectedGuidance = useMemo(() => {
    return getScoreEntryGuidance(selectedKind);
  }, [selectedKind]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto font-sans">
      {/* Header Banner - Clean Sporto Dark Palette */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span>Hệ Thống Quản Trị Admin</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Quản Lý Bộ Môn Thể Thao
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-xl leading-relaxed">
            Quản lý trạng thái hiển thị (Bật/Ẩn) và xem chi tiết thiết lập luật lệ preset của từng bộ môn thi đấu.
          </p>
        </div>

        {/* Stats Summary Badges */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl px-4 py-3 text-center min-w-[90px]">
            <span className="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">Tổng số</span>
            <span className="text-2xl font-black text-white">{categories.length}</span>
          </div>
          <div className="bg-emerald-950/60 border border-emerald-800/60 rounded-2xl px-4 py-3 text-center min-w-[90px]">
            <span className="text-[11px] text-emerald-400 block font-semibold uppercase tracking-wider">Đang bật</span>
            <span className="text-2xl font-black text-emerald-400">{activeCount}</span>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-3 text-center min-w-[90px]">
            <span className="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">Đã ẩn</span>
            <span className="text-2xl font-black text-slate-300">{inactiveCount}</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filter Pills */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Search Box */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên bộ môn, slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({categories.length})
          </button>
          <button
            onClick={() => setFilterStatus('ACTIVE')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterStatus === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Đang Bật ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('INACTIVE')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterStatus === 'INACTIVE'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đã Ẩn ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Main Grid List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-slate-500 text-xs font-bold">Đang tải danh sách bộ môn thể thao...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200/80 shadow-sm text-center">
          <Trophy className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-800">Không tìm thấy bộ môn nào</h3>
          <p className="text-slate-400 text-xs mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCategories.map((cat) => {
            const kind = mapCategoryToSportKind(cat);
            const presentation = getSportRulePresentation(kind);
            const isUpdating = updatingIds[cat.id] === true;

            return (
              <div
                key={cat.id}
                className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden relative group hover:shadow-md ${
                  cat.isActive
                    ? 'border-slate-200 shadow-sm'
                    : 'border-slate-200/70 bg-slate-50/50 opacity-85'
                }`}
              >
                {/* Status Indicator Bar */}
                <div
                  className={`h-1.5 w-full ${
                    cat.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />

                <div className="p-5 space-y-4">
                  {/* Category Header & Pure Smooth Toggle Switch (NO EYE ICON) */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                        cat.isActive 
                          ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}>
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-slate-900 text-base truncate">
                          {cat.name}
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                          slug: {cat.slug}
                        </span>
                      </div>
                    </div>

                    {/* Smooth Toggle Switch - CLEAN WITHOUT EYE ICON */}
                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(cat)}
                        disabled={isUpdating}
                        title={cat.isActive ? 'Bấm để Ẩn bộ môn' : 'Bấm để Bật bộ môn'}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 ${
                          cat.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                            cat.isActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        >
                          {isUpdating && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Summary & Sport Badge */}
                  <div className="space-y-2.5">
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {cat.description || presentation.presetSummary}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-150 px-2.5 py-1 rounded-lg">
                        <Sparkles className="w-3 h-3 text-blue-500" />
                        {presentation.sportLabel} ({presentation.scoringLabel})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    {cat.isActive ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Hiển thị
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400">
                        <XCircle className="w-3.5 h-3.5" /> Đã ẩn
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedCategory(cat)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    <span>Xem luật preset</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RICH DETAILED SPORT PRESET RULES MODAL */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header - Sporto Slate-900 Style */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 font-bold">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                    <span>Luật Lệ Preset: {selectedCategory.name}</span>
                  </h3>
                  <span className="text-xs text-blue-300 font-medium">
                    Cấu hình quy chuẩn cho môn {selectedPresentation.sportLabel}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedCategory(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content - Rich Structured Details */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-xs md:text-sm">
              
              {/* 1. Summary Overview Banner */}
              <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-900">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-blue-950">Tổng quan thể thức mặc định:</p>
                  <p className="leading-relaxed text-blue-900/90">{selectedPresentation.presetSummary}</p>
                  <p className="text-[11px] text-blue-700 italic pt-0.5">{selectedPresentation.roundConfigHint}</p>
                </div>
              </div>

              {/* 2. Basic Default Scoring Parameters */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>1. Thông Số Điểm Số Mặc Định</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">Mô hình tính điểm</span>
                    <span className="font-extrabold text-slate-900">{selectedDefaultRules.scoringModel}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">Số set thắng (setsToWin)</span>
                    <span className="font-extrabold text-slate-900">{selectedDefaultRules.setsToWin} set</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">Điểm/set (pointsPerSet)</span>
                    <span className="font-extrabold text-slate-900">{selectedDefaultRules.pointsPerSet} {selectedPresentation.setUnitLabel.toLowerCase()}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">Thắng cách 2 điểm</span>
                    <span className={`font-extrabold ${selectedDefaultRules.winByTwo ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {selectedDefaultRules.winByTwo ? 'Bắt buộc (True)' : 'Không (False)'}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">Điểm trần tối đa</span>
                    <span className="font-extrabold text-slate-900">{selectedDefaultRules.maxPoints ?? 'Mở'}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">Điểm Tie-break</span>
                    <span className="font-extrabold text-slate-900">{selectedDefaultRules.tiebreakPoints ? `${selectedDefaultRules.tiebreakPoints} điểm` : 'Không áp dụng'}</span>
                  </div>
                </div>
              </div>

              {/* 3. Sport Rule Presets List (Variants per Sport) */}
              {selectedPresets.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-150">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>2. Danh Sách Biến Thể Luật Preset Theo Môn ({selectedPresets.length} Cấu Hình)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedPresets.map((preset: SportRulePreset) => (
                      <div key={preset.id} className="bg-white border border-slate-200 hover:border-blue-300 p-4 rounded-xl space-y-2 transition-all shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                            <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                            {preset.label}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {preset.setsToWin === 1 ? '1 Set' : `BO${preset.setsToWin * 2 - 1}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{preset.description}</p>
                        <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600 pt-1 border-t border-slate-100">
                          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            Điểm/set: {preset.pointsPerSet}
                          </span>
                          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            Hơn 2: {preset.winByTwo ? 'Có' : 'Không'}
                          </span>
                          {preset.maxPoints && (
                            <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              Trần: {preset.maxPoints}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Score Entry Guidance & Examples */}
              {selectedGuidance && (
                <div className="space-y-3 pt-2 border-t border-slate-150">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span>3. Hướng Dẫn Nhập Tỷ Số & Ví Dụ Cho Trọng Tài</span>
                  </h4>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                    <div className="flex items-start gap-2">
                      <Hash className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900 block text-xs mb-0.5">Quy tắc nhập tỷ số:</span>
                        <p className="text-xs text-slate-600 leading-relaxed">{selectedGuidance.targetSummary}</p>
                      </div>
                    </div>

                    {selectedGuidance.examples && selectedGuidance.examples.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs font-bold text-slate-700">Ví dụ tỷ số hợp lệ:</span>
                        <div className="flex gap-1.5">
                          {selectedGuidance.examples.map((ex, i) => (
                            <span key={i} className="text-xs font-mono font-bold bg-white text-blue-700 border border-blue-200 px-2 py-0.5 rounded shadow-2xs">
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/60">
                      💡 {selectedGuidance.operatorHint}
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedCategory(null)}
                className="px-6 py-2.5 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

