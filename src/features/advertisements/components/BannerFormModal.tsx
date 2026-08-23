'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  X,
  Image as ImageIcon,
  Code,
  Link as LinkIcon,
  Upload,
  Sparkles,
  Check,
  Globe,
  Smartphone,
  Info,
  Calendar,
  Layers,
  ChevronDown,
  Search,
  ExternalLink,
} from 'lucide-react';
import { BannerPreviewCard } from './BannerPreviewCard';
import { DateTimePicker } from '@/components/ui/Input';
import { uploadApi } from '@/features/upload/api';
import type {
  Advertisement,
  AdPlacementSlot,
  AdBannerType,
  CreateAdvertisementPayload,
  UpdateAdvertisementPayload,
} from '../api';
import type { Category } from '@/types/category';
import toast from 'react-hot-toast';

interface BannerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAdvertisementPayload | UpdateAdvertisementPayload) => Promise<void>;
  initialData?: Advertisement | null;
  isSubmitting?: boolean;
  categories?: Category[];
}

const PLACEMENT_OPTIONS: Array<{
  value: AdPlacementSlot;
  platform: 'WEB' | 'APP';
  label: string;
  desc: string;
  size: string;
  ratio: string;
}> = [
  {
    value: 'HOMEPAGE_SIDEBAR',
    platform: 'WEB',
    label: '🌐 [Web] Sidebar Cột Phải Trang Chủ',
    desc: 'Cố định bên phải bảng tin & danh sách trận đấu',
    size: '300 × 250 px',
    ratio: '4:3 (Medium Rectangle)',
  },
  {
    value: 'TOURNAMENTS_BOTTOM',
    platform: 'WEB',
    label: '🌐 [Web] Chân Trang Danh Sách Giải Đấu',
    desc: 'Ngang dưới danh sách giải đấu & phân trang',
    size: '728 × 90 px / 970 × 250 px',
    ratio: 'Leaderboard (4:1 ~ 8:1)',
  },
  {
    value: 'MATCHES_BOTTOM',
    platform: 'WEB',
    label: '🌐 [Web] Chân Trang Danh Sách Trận Đấu',
    desc: 'Ngang dưới lịch thi đấu & kết quả trận',
    size: '728 × 90 px / 970 × 250 px',
    ratio: 'Leaderboard (4:1 ~ 8:1)',
  },
  {
    value: 'GLOBAL_HEADER',
    platform: 'WEB',
    label: '🌐 [Web] Thanh Banner Header Toàn Trang',
    desc: 'Thông báo sự kiện nổi bật trên cùng web',
    size: '970 × 90 px',
    ratio: 'Top Bar (8:1)',
  },
  {
    value: 'APP_HOME_FEED',
    platform: 'APP',
    label: '📱 [App] Giữa Dòng Tin Trang Chủ App',
    desc: 'Xen kẽ giữa giải đấu nổi bật & CLB trên App',
    size: '600 × 338 px',
    ratio: '16:9 (Card Mobile)',
  },
  {
    value: 'APP_MATCHES_BOTTOM',
    platform: 'APP',
    label: '📱 [App] Chân Danh Sách Tab Trận Đấu',
    desc: 'Cố định chân danh sách trận đấu trên App',
    size: '320 × 50 / 320 × 100 px',
    ratio: 'Mobile Banner',
  },
  {
    value: 'APP_COMMUNITY_FEED',
    platform: 'APP',
    label: '📱 [App] Dòng Tin Hoạt Động Câu Lạc Bộ',
    desc: 'Trong dòng tin hoạt động CLB trên App',
    size: '600 × 338 px',
    ratio: '16:9 (Card Mobile)',
  },
  {
    value: 'APP_TOURNAMENT_DETAIL',
    platform: 'APP',
    label: '📱 [App] Chi Tiết Giải Đấu App',
    desc: 'Dưới sơ đồ thi đấu / danh sách VĐV trên App',
    size: '600 × 200 px',
    ratio: '3:1 (Full-width Mobile)',
  },
];

export const BannerFormModal: React.FC<BannerFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting = false,
  categories = [],
}) => {
  const translate = useTranslations('AdminBanners');
  const isEditing = Boolean(initialData);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerType, setBannerType] = useState<AdBannerType>('IMAGE_LINK');
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [ctaText, setCtaText] = useState('Xem ngay');
  const [customHtml, setCustomHtml] = useState('');
  const [placementSlot, setPlacementSlot] = useState<AdPlacementSlot>('HOMEPAGE_SIDEBAR');
  const [categoryId, setCategoryId] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- synchronize controlled form state from the edit record */
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setBannerType(initialData.bannerType || 'IMAGE_LINK');
      setImageUrl(initialData.imageUrl || '');
      setTargetUrl(initialData.targetUrl || '');
      setCtaText(initialData.ctaText || 'Xem ngay');
      setCustomHtml(initialData.customHtml || '');
      setPlacementSlot(initialData.placementSlot || 'HOMEPAGE_SIDEBAR');
      setCategoryId(initialData.categoryId || '');
      setCategorySearch('');
      setDisplayOrder(initialData.displayOrder ?? 0);
      setIsActive(initialData.isActive ?? true);
      setStartDate(initialData.startDate ? initialData.startDate.slice(0, 16) : '');
      setEndDate(initialData.endDate ? initialData.endDate.slice(0, 16) : '');
    } else {
      setTitle('');
      setDescription('');
      setBannerType('IMAGE_LINK');
      setImageUrl('');
      setTargetUrl('');
      setCtaText('Xem ngay');
      setCustomHtml('');
      setPlacementSlot('HOMEPAGE_SIDEBAR');
      setCategoryId('');
      setCategorySearch('');
      setDisplayOrder(0);
      setIsActive(true);
      setStartDate('');
      setEndDate('');
    }
  }, [initialData, isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isOpen || !mounted) return null;

  const currentSlotMeta = PLACEMENT_OPTIONS.find((s) => s.value === placementSlot) || PLACEMENT_OPTIONS[0];
  const uniqueCategories = Array.from(
    new Map(
      categories
        .filter((category) => category.isActive !== false)
        .map((category) => [
          (category.name || category.slug).trim().toLocaleLowerCase(),
          category,
        ]),
    ).values(),
  );
  const normalizedCategorySearch = categorySearch.trim().toLocaleLowerCase();
  const filteredCategories = uniqueCategories
    .filter((category) => {
      if (!normalizedCategorySearch) return true;
      return `${category.name} ${category.slug} ${category.description || ''}`
        .toLocaleLowerCase()
        .includes(normalizedCategorySearch);
    })
    .slice(0, 8);
  const selectedCategory = uniqueCategories.find((category) => category.id === categoryId) || null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh (PNG, JPG, WebP, GIF)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa 10MB');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('Đang tải ảnh lên server...');
    try {
      const res = await uploadApi.uploadImage(file);
      const url = res.url;
      if (url) {
        setImageUrl(url);
        toast.success('Tải ảnh thành công!', { id: toastId });
      } else {
        toast.error('Không nhận được đường dẫn ảnh sau khi tải', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi tải ảnh lên', { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFillSample = () => {
    setTitle('Giảm 25% Vợt Pickleball & Cầu Lông Hè 2026');
    setDescription('Ưu đãi độc quyền cho vận động viên và hội viên SportO');
    setImageUrl('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop');
    setTargetUrl('https://sporto.asia');
    setCtaText('Khám phá ngay');
    toast.success('Đã điền dữ liệu mẫu quảng cáo!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Vui lòng nhập tên chiến dịch / tiêu đề banner');
      return;
    }

    if (bannerType === 'IMAGE_LINK') {
      if (!imageUrl.trim()) {
        toast.error('Vui lòng nhập hoặc tải lên ảnh banner');
        return;
      }
      if (!targetUrl.trim()) {
        toast.error('Vui lòng nhập liên kết đích khi click');
        return;
      }
    } else {
      if (!customHtml.trim()) {
        toast.error('Vui lòng dán mã HTML / Google AdSense');
        return;
      }
    }

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      toast.error('Ngày bắt đầu phải trước ngày kết thúc');
      return;
    }

    const payload: CreateAdvertisementPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      bannerType,
      imageUrl: bannerType === 'IMAGE_LINK' ? imageUrl.trim() : undefined,
      targetUrl: bannerType === 'IMAGE_LINK' ? targetUrl.trim() : undefined,
      ctaText: bannerType === 'IMAGE_LINK' ? ctaText.trim() || undefined : undefined,
      customHtml: bannerType === 'CUSTOM_HTML' ? customHtml.trim() : undefined,
      placementSlot,
      categoryId: categoryId || null,
      displayOrder: Number(displayOrder) || 0,
      isActive,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    };

    await onSubmit(payload);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-black/65 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/30">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? 'Chỉnh sửa banner quảng cáo' : 'Tạo mới banner quảng cáo'}
              </h3>
              <p className="text-xs text-slate-500">
                Cấu hình vị trí, kích thước IAB và liên kết chuyển hướng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={handleFillSample}
                className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Điền mẫu nhanh
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left Form Column */}
            <div className="min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* 1. Tên chiến dịch & Vị trí hiển thị */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên chiến dịch / Tiêu đề banner *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Giảm giá 25% phụ kiện thể thao hè 2026"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                  />
                </div>

                {/* Vị trí hiển thị (Compact Dropdown Selector) */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Vị trí hiển thị (Placement Slot) *
                    </label>
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      📐 {currentSlotMeta.size} • {currentSlotMeta.ratio}
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      value={placementSlot}
                      onChange={(e) => setPlacementSlot(e.target.value as AdPlacementSlot)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                    >
                      <optgroup label="🌐 NỀN TẢNG WEB (DESKTOP / MOBILE WEB)">
                        {PLACEMENT_OPTIONS.filter((s) => s.platform === 'WEB').map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label} — [{s.size}]
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="📱 NỀN TẢNG MOBILE APP (ANDROID / IOS)">
                        {PLACEMENT_OPTIONS.filter((s) => s.platform === 'APP').map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label} — [{s.size}]
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {currentSlotMeta.desc}
                  </p>
                </div>
              </div>

              {/* 2. Nhắm theo môn thể thao */}
              <section className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      {translate('targetSportLabel')}
                    </label>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {translate('targetSportHelp')}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md border border-blue-100 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    {categoryId ? translate('targetSportSpecific') : translate('targetAllSports')}
                  </span>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    value={categorySearch}
                    onChange={(event) => setCategorySearch(event.target.value)}
                    placeholder={translate('targetSportSearchPlaceholder')}
                    aria-label={translate('targetSportSearchLabel')}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3.5 text-sm font-medium text-slate-800 transition-all focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {selectedCategory ? (
                  <div className="mt-2 rounded-xl border border-blue-200 bg-white p-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{selectedCategory.name}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">/{selectedCategory.slug}</p>
                        <a
                          href={`/tournaments/sport/${encodeURIComponent(selectedCategory.slug)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {translate('targetSportOpenPage')}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryId('');
                          setCategorySearch('');
                        }}
                        className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                      >
                        {translate('targetSportClear')}
                      </button>
                    </div>
                    {selectedCategory.description && (
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">{selectedCategory.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                      <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold">ID: {selectedCategory.id}</span>
                      {selectedCategory.categoryConfig?.supportedMatchTypes?.length ? (
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold">
                          {translate('targetSportMatchTypes')}: {selectedCategory.categoryConfig.supportedMatchTypes.join(', ')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1">
                    {categories.length === 0 ? (
                      <p className="px-3 py-3 text-center text-xs text-slate-500">{translate('targetSportLoading')}</p>
                    ) : filteredCategories.length > 0 ? (
                      filteredCategories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => {
                            setCategoryId(category.id);
                            setCategorySearch(category.name);
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-blue-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-bold text-slate-800">{category.name}</span>
                            <span className="block truncate text-[10px] text-slate-500">/{category.slug}</span>
                          </span>
                          <span className="ml-3 shrink-0 text-[10px] font-semibold text-blue-600">
                            {translate('targetSportViewDetails')}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-3 text-center text-xs text-slate-500">{translate('targetSportNoResults')}</p>
                    )}
                  </div>
                )}
              </section>

              {/* 3. Loại hình quảng cáo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Loại hình quảng cáo *
                </label>
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setBannerType('IMAGE_LINK')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      bannerType === 'IMAGE_LINK'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Ảnh banner + Link chuyển hướng
                  </button>
                  <button
                    type="button"
                    onClick={() => setBannerType('CUSTOM_HTML')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      bannerType === 'CUSTOM_HTML'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Code className="h-3.5 w-3.5" />
                    Google AdSense / Custom Script
                  </button>
                </div>
              </div>

              {/* 3. Chi tiết ảnh & link / HTML */}
              {bannerType === 'IMAGE_LINK' ? (
                <div className="space-y-3.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  {/* File Upload / Image Link */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Hình ảnh banner *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Upload className="h-3 w-3" />
                          {isUploading ? 'Đang tải lên...' : 'Tải ảnh từ máy'}
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Nhập đường dẫn ảnh URL hoặc bấm 'Tải ảnh từ máy'..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition-all pr-10"
                      />
                      <ImageIcon className="absolute right-3.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Target URL & CTA */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Liên kết đích khi click (Target URL) *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={targetUrl}
                          onChange={(e) => setTargetUrl(e.target.value)}
                          placeholder="https://sporto.asia/shop/promo"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition-all pr-10"
                        />
                        <LinkIcon className="absolute right-3.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nút kêu gọi (CTA)
                      </label>
                      <input
                        type="text"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        placeholder="Xem ngay / Mua ngay"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mô tả / Thông điệp phụ (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Nhập mô tả ngắn hiển thị kèm quảng cáo..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mã nhúng HTML / Google AdSense Script *
                  </label>
                  <textarea
                    rows={4}
                    value={customHtml}
                    onChange={(e) => setCustomHtml(e.target.value)}
                    placeholder={'<!-- Google AdSense Unit -->\n<ins class="adsbygoogle"\n     style="display:block"\n     data-ad-client="ca-pub-xxxxxxxx"\n     data-ad-slot="xxxxxxxx"\n     data-ad-format="auto"></ins>'}
                    className="w-full font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-900 text-emerald-400 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  />
                </div>
              )}

              {/* 4. Scheduling & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày bắt đầu (Để trống = Ngay lập tức)
                  </label>
                  <DateTimePicker
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                    className="h-9.5 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày kết thúc (Để trống = Vô thời hạn)
                  </label>
                  <DateTimePicker
                    value={endDate}
                    onChange={(val) => setEndDate(val)}
                    className="h-9.5 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thứ tự ưu tiên (Display Order)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="9999"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Kích hoạt banner</span>
                    <span className="text-[10px] text-slate-500">Hiển thị ngay cho người dùng</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Preview Column */}
            <div className="min-h-0 overflow-y-auto border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5 lg:border-l lg:border-t-0">
              <div className="sticky top-0 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    👁️ Xem trước giao diện thực tế
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    {currentSlotMeta.size}
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                  <BannerPreviewCard
                    bannerType={bannerType}
                    placementSlot={placementSlot}
                    title={title}
                    description={description}
                    imageUrl={imageUrl}
                    targetUrl={targetUrl}
                    ctaText={ctaText}
                    customHtml={customHtml}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-3.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? 'Đang lưu...' : isEditing ? 'Cập nhật banner' : 'Tạo mới banner'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
