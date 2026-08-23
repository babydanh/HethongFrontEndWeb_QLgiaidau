'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Eye,
  MousePointerClick,
  Percent,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  ExternalLink,
  Layers,
  Sparkles,
  Code,
  Image as ImageIcon,
} from 'lucide-react';
import {
  advertisementsApi,
  type Advertisement,
  type AdPlacementSlot,
  type CreateAdvertisementPayload,
  type UpdateAdvertisementPayload,
} from '@/features/advertisements/api';
import { categoriesApi, type Category } from '@/features/categories/api';
import { BannerFormModal } from '@/features/advertisements/components/BannerFormModal';
import toast from 'react-hot-toast';

export default function AdminBannersPage() {
  const translate = useTranslations('AdminBanners');
  const [banners, setBanners] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [slotFilter, setSlotFilter] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [categories, setCategories] = useState<Category[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Advertisement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBanners = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: Parameters<typeof advertisementsApi.listForAdmin>[0] = {
        limit: 100,
      };
      if (slotFilter !== 'ALL') {
        params.placementSlot = slotFilter as AdPlacementSlot;
      }
      if (activeFilter !== 'ALL') {
        params.isActive = activeFilter === 'ACTIVE';
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (categoryFilter !== 'ALL') {
        params.categoryId = categoryFilter;
      }

      const res = await advertisementsApi.listForAdmin(params);
      setBanners(Array.isArray(res?.items) ? res.items : []);
    } catch (error) {
      console.error('Failed to load banners:', error);
      toast.error('Không thể tải danh sách banner quảng cáo');
    } finally {
      setIsLoading(false);
    }
  }, [slotFilter, activeFilter, searchQuery, categoryFilter]);

    useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch callback owns loading/list state synchronization
    fetchBanners();
  }, [fetchBanners]);

  useEffect(() => {
    let active = true;
    categoriesApi
      .getCategories()
      .then((response) => {
        if (!active) return;
        const unique = new Map<string, Category>();
        (response.data || []).forEach((category) => {
          if (category.isActive === false) return;
          const key = (category.name || category.slug).trim().toLocaleLowerCase();
          if (!unique.has(key)) unique.set(key, category);
        });
        setCategories(Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch((error) => {
        console.error('Failed to load sports:', error);
      });
    return () => {
      active = false;
    };
  }, []);

  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const handleToggle = async (banner: Advertisement) => {
    try {
      const updated = await advertisementsApi.toggleActive(banner.id);
      setBanners((prev) =>
        prev.map((item) => (item.id === banner.id ? { ...item, isActive: updated.isActive } : item)),
      );
      toast.success(
        updated.isActive
          ? `Đã kích hoạt banner "${banner.title}"`
          : `Đã tạm dừng banner "${banner.title}"`,
      );
    } catch {
      toast.error('Không thể thay đổi trạng thái banner');
    }
  };

  const handleDelete = async (banner: Advertisement) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa banner "${banner.title}" không?`)) {
      return;
    }
    try {
      await advertisementsApi.delete(banner.id);
      setBanners((prev) => prev.filter((item) => item.id !== banner.id));
      toast.success('Đã xóa banner thành công');
    } catch {
      toast.error('Không thể xóa banner');
    }
  };

  const handleSave = async (payload: CreateAdvertisementPayload | UpdateAdvertisementPayload) => {
    try {
      setIsSubmitting(true);
      if (editingBanner) {
        await advertisementsApi.update(editingBanner.id, payload);
        toast.success('Đã cập nhật banner thành công');
      } else {
        await advertisementsApi.create(payload as CreateAdvertisementPayload);
        toast.success('Đã tạo mới banner quảng cáo thành công');
      }
      setIsModalOpen(false);
      setEditingBanner(null);
      await fetchBanners();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Không thể lưu thông tin banner');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats calculation
  const totalBanners = banners.length;
  const activeBanners = banners.filter((b) => b.isActive).length;
  const totalViews = banners.reduce((acc, b) => acc + (b.viewsCount || 0), 0);
  const totalClicks = banners.reduce((acc, b) => acc + (b.clicksCount || 0), 0);
  const averageCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';

  const getSlotBadge = (slot: string) => {
    switch (slot) {
      // WEB
      case 'HOMEPAGE_SIDEBAR':
        return {
          platform: 'WEB',
          label: '🌐 [Web] Sidebar Trang Chủ (300x250 / 4:3)',
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'TOURNAMENTS_BOTTOM':
        return {
          platform: 'WEB',
          label: '🌐 [Web] Chân Trang Giải Đấu (728x90)',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'MATCHES_BOTTOM':
        return {
          platform: 'WEB',
          label: '🌐 [Web] Chân Trang Trận Đấu (728x90)',
          color: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'GLOBAL_HEADER':
        return {
          platform: 'WEB',
          label: '🌐 [Web] Header Toàn Trang (970x90)',
          color: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      // APP
      case 'APP_HOME_FEED':
        return {
          platform: 'APP',
          label: '📱 [App] Dòng Tin Trang Chủ App (16:9)',
          color: 'bg-sky-50 text-sky-700 border-sky-200',
        };
      case 'APP_MATCHES_BOTTOM':
        return {
          platform: 'APP',
          label: '📱 [App] Chân Tab Trận Đấu (320x50)',
          color: 'bg-teal-50 text-teal-700 border-teal-200',
        };
      case 'APP_COMMUNITY_FEED':
        return {
          platform: 'APP',
          label: '📱 [App] Hoạt Động Câu Lạc Bộ (16:9)',
          color: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'APP_TOURNAMENT_DETAIL':
        return {
          platform: 'APP',
          label: '📱 [App] Chi Tiết Giải Đấu App (3:1)',
          color: 'bg-orange-50 text-orange-700 border-orange-200',
        };
      default:
        return {
          platform: 'OTHER',
          label: slot,
          color: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 text-blue-600 shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Quản lý quảng cáo & Banner</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Cấu hình các vị trí quảng cáo cho Website & Mobile App, Google AdSense và theo dõi hiệu suất nhấp chuột (CTR)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingBanner(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tạo banner quảng cáo
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tổng số banner</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{totalBanners}</h3>
            <span className="text-[10px] text-emerald-600 font-medium">{activeBanners} đang phát sóng</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Lượt xem (Views)</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{totalViews.toLocaleString('vi-VN')}</h3>
            <span className="text-[10px] text-slate-500">Impressions toàn hệ thống</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Lượt nhấp (Clicks)</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{totalClicks.toLocaleString('vi-VN')}</h3>
            <span className="text-[10px] text-slate-500">Lưu lượng chuyển đổi</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <MousePointerClick className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tỷ lệ CTR trung bình</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{averageCtr}%</h3>
            <span className="text-[10px] text-blue-600 font-medium">Click-Through Rate</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Percent className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên chiến dịch / mô tả..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-hidden focus:border-blue-600"
          >
            <option value="ALL">Tất cả vị trí (Web & App)</option>
            <optgroup label="🌐 Vị trí trên Website">
              <option value="HOMEPAGE_SIDEBAR">[Web] Sidebar Trang Chủ (300x250)</option>
              <option value="TOURNAMENTS_BOTTOM">[Web] Chân Trang Giải Đấu (728x90)</option>
              <option value="MATCHES_BOTTOM">[Web] Chân Trang Trận Đấu (728x90)</option>
              <option value="GLOBAL_HEADER">[Web] Header Toàn Trang (970x90)</option>
            </optgroup>
            <optgroup label="📱 Vị trí trên Mobile App">
              <option value="APP_HOME_FEED">[App] Dòng Tin Trang Chủ App (16:9)</option>
              <option value="APP_MATCHES_BOTTOM">[App] Chân Tab Trận Đấu (320x50)</option>
              <option value="APP_COMMUNITY_FEED">[App] Hoạt Động CLB (16:9)</option>
              <option value="APP_TOURNAMENT_DETAIL">[App] Chi Tiết Giải Đấu (3:1)</option>
            </optgroup>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-hidden focus:border-blue-600"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang bật (Active)</option>
            <option value="INACTIVE">Đã tắt (Inactive)</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-hidden focus:border-blue-600"
            aria-label={translate('targetSportFilter')}
          >
            <option value="ALL">{translate('targetAllSports')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Banners List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Đang tải danh sách banner quảng cáo...</p>
          </div>
        ) : banners.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Megaphone className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Chưa có banner quảng cáo nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              Hãy tạo banner mới để hiển thị các ưu đãi, tài trợ hoặc nhúng Google AdSense vào hệ thống SportO.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingBanner(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tạo banner đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {banners.map((banner) => {
              const badge = getSlotBadge(banner.placementSlot);
              const ctr =
                banner.viewsCount > 0
                  ? ((banner.clicksCount / banner.viewsCount) * 100).toFixed(1)
                  : '0.0';

              return (
                <div
                  key={banner.id}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    banner.isActive
                      ? 'border-slate-200 shadow-2xs hover:border-slate-350'
                      : 'border-slate-200/60 bg-slate-50/50 opacity-75'
                  }`}
                >
                  {/* Left info */}
                  <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                    {/* Thumbnail preview */}
                    <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 flex items-center justify-center relative shadow-2xs">
                      {banner.bannerType === 'CUSTOM_HTML' ? (
                        <div className="flex flex-col items-center justify-center text-emerald-400">
                          <Code className="w-6 h-6" />
                          <span className="text-[9px] font-mono mt-0.5">SCRIPT</span>
                        </div>
                      ) : banner.imageUrl ? (
                        <img
                          src={banner.imageUrl}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {banner.bannerType === 'CUSTOM_HTML' ? 'Google Ads / Script' : 'Ảnh & Link'}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                          {banner.categoryId ? categoryById.get(banner.categoryId)?.name || translate('targetSportSaved') : translate('targetAllSports')}
                        </span>
                        {banner.isActive ? (
                          <span className="text-[10px] font-bold text-emerald-600 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Đang chạy
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Đã tạm dừng</span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 truncate">{banner.title}</h3>

                      {banner.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{banner.description}</p>
                      )}

                      {banner.targetUrl && (
                        <a
                          href={banner.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 mt-1 truncate max-w-md"
                        >
                          {banner.targetUrl}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Right metrics and actions */}
                  <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                    {/* Performance metrics */}
                    <div className="flex items-center gap-4 text-center">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">Lượt xem</span>
                        <span className="text-xs font-bold text-slate-800">
                          {banner.viewsCount.toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <div className="w-px h-6 bg-slate-200"></div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">Lượt click</span>
                        <span className="text-xs font-bold text-slate-800">
                          {banner.clicksCount.toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <div className="w-px h-6 bg-slate-200"></div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">CTR</span>
                        <span className="text-xs font-bold text-blue-600">{ctr}%</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                      {/* Toggle Switch */}
                      <label className="relative inline-flex items-center cursor-pointer mr-1" title={banner.isActive ? 'Nhấn để tạm dừng' : 'Nhấn để kích hoạt'}>
                        <input
                          type="checkbox"
                          checked={banner.isActive}
                          onChange={() => handleToggle(banner)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBanner(banner);
                          setIsModalOpen(true);
                        }}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
                        title="Chỉnh sửa banner"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(banner)}
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                        title="Xóa banner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <BannerFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBanner(null);
        }}
        onSubmit={handleSave}
        initialData={editingBanner}
        isSubmitting={isSubmitting}
        categories={categories}
      />
    </div>
  );
}
