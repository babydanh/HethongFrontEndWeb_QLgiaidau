'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Eye,
  EyeOff,
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
} from 'lucide-react';
import { categoriesApi, Category } from '@/features/categories/api';
import { buildDefaultSportRules } from '@/features/tournaments/sport-rules/defaults';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { SportRuleKind } from '@/types/tournament';
import toast from 'react-hot-toast';

// Fallback initial categories if DB is empty or API fails
const FALLBACK_CATEGORIES: Category[] = [
  { id: 'cat-pickleball', name: 'Pickleball', slug: 'pickleball', isActive: true, description: 'Môn thể thao vợt kết hợp giữa tennis, bóng bàn và cầu lông.' },
  { id: 'cat-tennis', name: 'Tennis', slug: 'tennis', isActive: true, description: 'Quần vợt truyền thống với quy chuẩn luật đếm game/set.' },
  { id: 'cat-badminton', name: 'Cầu lông', slug: 'badminton', isActive: true, description: 'Cầu lông theo thể thức Rally Point 21 điểm.' },
  { id: 'cat-table-tennis', name: 'Bóng bàn', slug: 'table-tennis', isActive: true, description: 'Bóng bàn thi đấu theo luật 11 điểm/set.' },
  { id: 'cat-football', name: 'Bóng đá', slug: 'football', isActive: true, description: 'Bóng đá sân 5/7/11 người theo thể thức hiệp đấu.' },
];

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
        if (res.data && res.data.length > 0) {
          setCategories(res.data);
        } else {
          setCategories(FALLBACK_CATEGORIES);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        toast.error('Không thể tải danh sách bộ môn từ server, sử dụng dữ liệu mặc định.');
        setCategories(FALLBACK_CATEGORIES);
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

    setUpdatingIds((prev) => ({ ...prev, [catId]: true }));

    // Optimistic UI update
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, isActive: newStatus } : c))
    );

    try {
      await categoriesApi.updateCategory(catId, { isActive: newStatus });
      toast.success(
        `Đã ${newStatus ? 'bật (hiển thị)' : 'ẩn (tắt)'} bộ môn "${category.name}"`
      );
    } catch (error) {
      console.error('Failed to update category status:', error);
      // Rollback optimistic update
      setCategories((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, isActive: !newStatus } : c))
      );
      toast.error('Cập nhật trạng thái thất bại. Vui lòng thử lại!');
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

  const selectedPresetRules = useMemo(() => {
    return buildDefaultSportRules(selectedKind);
  }, [selectedKind]);

  const selectedPresentation = useMemo(() => {
    return getSportRulePresentation(selectedKind);
  }, [selectedKind]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-1">
            <Shield className="w-4 h-4" />
            <span>Hệ Thống Quản Trị Admin</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Quản Lý Bộ Môn Thể Thao
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Quản lý trạng thái hiển thị (Bật/Ẩn) và xem chi tiết luật lệ preset của từng bộ môn.
          </p>
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-4 py-2.5 text-center min-w-[100px]">
            <span className="text-xs text-slate-400 block font-medium">Tổng số</span>
            <span className="text-xl font-extrabold text-white">{categories.length}</span>
          </div>
          <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-2xl px-4 py-2.5 text-center min-w-[100px]">
            <span className="text-xs text-emerald-400 block font-medium">Đang hiện</span>
            <span className="text-xl font-extrabold text-emerald-400">{activeCount}</span>
          </div>
          <div className="bg-rose-950/40 border border-rose-800/50 rounded-2xl px-4 py-2.5 text-center min-w-[100px]">
            <span className="text-xs text-rose-400 block font-medium">Đã ẩn</span>
            <span className="text-xl font-extrabold text-rose-400">{inactiveCount}</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Status Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Search Box */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên bộ môn, slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterStatus === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({categories.length})
          </button>
          <button
            onClick={() => setFilterStatus('ACTIVE')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterStatus === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Đang Bật ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('INACTIVE')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterStatus === 'INACTIVE'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            Đã Ẩn ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Main Content List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-slate-500 text-sm font-medium">Đang tải danh sách bộ môn thể thao...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
          <Trophy className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-700">Không tìm thấy bộ môn nào</h3>
          <p className="text-slate-400 text-sm mt-1">
            Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.
          </p>
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
                className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden relative group hover:shadow-lg ${
                  cat.isActive
                    ? 'border-slate-200 shadow-sm'
                    : 'border-slate-200 bg-slate-50/60 opacity-80'
                }`}
              >
                {/* Status Indicator Stripe */}
                <div
                  className={`h-1.5 w-full ${
                    cat.isActive ? 'bg-emerald-500' : 'bg-rose-400'
                  }`}
                />

                <div className="p-5 space-y-4">
                  {/* Category Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${
                        cat.isActive 
                          ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}>
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                          {cat.name}
                        </h3>
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          slug: {cat.slug}
                        </span>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(cat)}
                        disabled={isUpdating}
                        title={cat.isActive ? 'Bấm để Ẩn bộ môn' : 'Bấm để Bật bộ môn'}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 ${
                          cat.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                            cat.isActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
                          ) : cat.isActive ? (
                            <Eye className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-slate-400" />
                          )}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Summary & Preset Badge */}
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {cat.description || presentation.presetSummary}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        {presentation.sportLabel} ({presentation.scoringLabel})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Action */}
                <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {cat.isActive ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Hiển thị
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-500">
                        <XCircle className="w-3.5 h-3.5" /> Đã ẩn
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedCategory(cat)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Xem luật preset</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PRESET RULES DETAIL MODAL */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Luật Lệ Preset: {selectedCategory.name}
                  </h3>
                  <span className="text-xs text-indigo-300">
                    Cấu hình mặc định cho bộ môn {selectedPresentation.sportLabel}
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

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-slate-700 text-sm">
              {/* Summary Note */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-0.5">Tóm tắt thiết lập mặc định:</p>
                  <p className="leading-relaxed">{selectedPresentation.presetSummary}</p>
                </div>
              </div>

              {/* Preset Fields Breakdown */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-500" /> Thông Số Điểm Số Mặc Định
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                    <span className="text-xs text-slate-500 block">Mô hình tính điểm</span>
                    <span className="font-bold text-slate-900">{selectedPresetRules.scoringModel}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                    <span className="text-xs text-slate-500 block">Số set thắng (setsToWin)</span>
                    <span className="font-bold text-slate-900">{selectedPresetRules.setsToWin} set</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                    <span className="text-xs text-slate-500 block">Điểm/set (pointsPerSet)</span>
                    <span className="font-bold text-slate-900">{selectedPresetRules.pointsPerSet} điểm</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                    <span className="text-xs text-slate-500 block">Thắng cách 2 điểm</span>
                    <span className={`font-bold ${selectedPresetRules.winByTwo ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {selectedPresetRules.winByTwo ? 'Có (True)' : 'Không (False)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Advanced Config Details */}
              {selectedPresetRules.format && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" /> Cấu Hình Thể Thức Môn ({selectedKind})
                  </h4>

                  <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 font-mono text-xs overflow-x-auto space-y-1">
                    {Object.entries(selectedPresetRules.format).map(([key, value]) => (
                      <div key={key} className="flex justify-between border-b border-slate-800 pb-1 last:border-0 last:pb-0">
                        <span className="text-indigo-400">{key}:</span>
                        <span className="text-amber-300 font-bold">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hint Note */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 text-xs text-indigo-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{selectedPresentation.roundConfigHint}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedCategory(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
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
