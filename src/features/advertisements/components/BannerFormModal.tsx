'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import toast from 'react-hot-toast';

interface BannerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAdvertisementPayload | UpdateAdvertisementPayload) => Promise<void>;
  initialData?: Advertisement | null;
  isSubmitting?: boolean;
}

const PLACEMENT_OPTIONS: Array<{
  value: AdPlacementSlot;
  platform: 'WEB' | 'APP';
  label: string;
  desc: string;
  size: string;
}> = [
  // WEB PLACEMENTS
  {
    value: 'HOMEPAGE_SIDEBAR',
    platform: 'WEB',
    label: '🌐 [Web] Sidebar Cột Phải Trang Chủ',
    desc: 'Cố định bên phải bảng tin và danh sách trận đấu trang chủ web',
    size: '300 x 250 (Medium Rectangle) / 4:3',
  },
  {
    value: 'TOURNAMENTS_BOTTOM',
    platform: 'WEB',
    label: '🌐 [Web] Chân Trang Danh Sách Giải Đấu',
    desc: 'Ngang dưới danh sách giải đấu và bảng phân trang web',
    size: '728 x 90 (Leaderboard) / 970 x 250 (4:1 ~ 5:1)',
  },
  {
    value: 'MATCHES_BOTTOM',
    platform: 'WEB',
    label: '🌐 [Web] Chân Trang Danh Sách Trận Đấu',
    desc: 'Ngang dưới danh sách lịch thi đấu & kết quả trận đấu web',
    size: '728 x 90 (Leaderboard) / 970 x 250 (4:1 ~ 5:1)',
  },
  {
    value: 'GLOBAL_HEADER',
    platform: 'WEB',
    label: '🌐 [Web] Thanh Banner Header Toàn Trang',
    desc: 'Thanh thông báo nổi bật trên cùng cho sự kiện đặc biệt web',
    size: '970 x 90 (Top Bar 8:1)',
  },
  // MOBILE APP PLACEMENTS
  {
    value: 'APP_HOME_FEED',
    platform: 'APP',
    label: '📱 [App] Giữa Dòng Tin Trang Chủ App',
    desc: 'Xen kẽ giữa danh sách giải đấu nổi bật & CLB trên Mobile App',
    size: '16:9 hoặc 3:1 (Card Mobile)',
  },
  {
    value: 'APP_MATCHES_BOTTOM',
    platform: 'APP',
    label: '📱 [App] Chân Danh Sách Tab Trận Đấu',
    desc: 'Cố định chân danh sách trận đấu trên Mobile App',
    size: '320 x 50 / 320 x 100 (Mobile Banner)',
  },
  {
    value: 'APP_COMMUNITY_FEED',
    platform: 'APP',
    label: '📱 [App] Dòng Tin Hoạt Động Câu Lạc Bộ',
    desc: 'Trong dòng tin hoạt động CLB trên Mobile App',
    size: '16:9 (Card Mobile)',
  },
  {
    value: 'APP_TOURNAMENT_DETAIL',
    platform: 'APP',
    label: '📱 [App] Chi Tiết Giải Đấu App',
    desc: 'Dưới sơ đồ thi đấu / danh sách VĐV của giải đấu trên App',
    size: '3:1 (Full-width Mobile)',
  },
];

export const BannerFormModal: React.FC<BannerFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const isEditing = Boolean(initialData);

  const [platformTab, setPlatformTab] = useState<'ALL' | 'WEB' | 'APP'>('ALL');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerType, setBannerType] = useState<AdBannerType>('IMAGE_LINK');
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [ctaText, setCtaText] = useState('Xem ngay');
  const [customHtml, setCustomHtml] = useState('');
  const [placementSlot, setPlacementSlot] = useState<AdPlacementSlot>('HOMEPAGE_SIDEBAR');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formScrollRef = useRef<HTMLDivElement>(null);

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
      setDisplayOrder(0);
      setIsActive(true);
      setStartDate('');
      setEndDate('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

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
    setTitle('Giảm 25% Vợt Pickleball Hè 2026');
    setDescription('Ưu đãi độc quyền cho hội viên SportO trên toàn quốc');
    setImageUrl('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop');
    setTargetUrl('https://sporto.asia');
    setCtaText('Khám phá ngay');
    toast.success('Đã điền dữ liệu mẫu quảng cáo!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Vui lòng nhập tên/tiêu đề banner quảng cáo');
      formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (bannerType === 'IMAGE_LINK') {
      if (!imageUrl.trim()) {
        toast.error('Vui lòng nhập hoặc tải ảnh banner quảng cáo');
        formScrollRef.current?.scrollTo({ top: 300, behavior: 'smooth' });
        return;
      }
      if (!targetUrl.trim()) {
        toast.error('Vui lòng nhập liên kết đích khi click banner');
        formScrollRef.current?.scrollTo({ top: 400, behavior: 'smooth' });
        return;
      }
    } else {
      if (!customHtml.trim()) {
        toast.error('Vui lòng dán mã HTML/Script quảng cáo');
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
      displayOrder: Number(displayOrder) || 0,
      isActive,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    };

    await onSubmit(payload);
  };

  const filteredSlots = PLACEMENT_OPTIONS.filter((slot) => {
    if (platformTab === 'ALL') return true;
    return slot.platform === platformTab;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/65 p-2 backdrop-blur-xs animate-in fade-in duration-200 sm:p-4">
      <div className="flex h-[min(94dvh,900px)] max-h-[calc(100dvh-1rem)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? 'Chỉnh sửa banner quảng cáo' : 'Tạo mới banner quảng cáo'}
              </h3>
              <p className="text-xs text-slate-500">
                Cấu hình vị trí, kích thước chuẩn IAB và tích hợp liên kết ngoài
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={handleFillSample}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Điền mẫu nhanh
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] lg:overflow-hidden">
            {/* Left Scrollable Form Pane */}
            <div
              ref={formScrollRef}
              className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6"
            >
              <div className="mx-auto max-w-3xl space-y-6">
                {/* 1. Placement Slot Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      1. Vị trí hiển thị (Placement Slot) *
                    </label>
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setPlatformTab('ALL')}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          platformTab === 'ALL'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Tất cả ({PLACEMENT_OPTIONS.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlatformTab('WEB')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          platformTab === 'WEB'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Globe className="w-3 h-3" />
                        Web (4)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlatformTab('APP')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          platformTab === 'APP'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" />
                        App (4)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredSlots.map((slot) => {
                      const isSelected = placementSlot === slot.value;
                      return (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => setPlacementSlot(slot.value)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20'
                              : 'border-slate-200 hover:border-slate-350 bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`text-xs font-bold ${
                                  isSelected ? 'text-blue-700' : 'text-slate-900'
                                }`}
                              >
                                {slot.label}
                              </span>
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {slot.size.split(' ')[0]}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                              {slot.desc}
                            </p>
                          </div>
                          <span className="text-[10px] text-blue-600 font-mono font-medium mt-1.5">
                            📐 {slot.size}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Banner Type Tabs */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    2. Loại hình quảng cáo *
                  </label>
                  <div className="flex rounded-xl bg-slate-100 p-1 max-w-md">
                    <button
                      type="button"
                      onClick={() => setBannerType('IMAGE_LINK')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        bannerType === 'IMAGE_LINK'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Ảnh + Liên kết trực tiếp
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
                      <Code className="w-3.5 h-3.5" />
                      Google AdSense / Custom Script
                    </button>
                  </div>
                </div>

                {/* 3. Form Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên chiến dịch / Tiêu đề banner *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ví dụ: Giảm giá 20% phụ kiện Pickleball hè 2026"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>

                  {bannerType === 'IMAGE_LINK' ? (
                    <>
                      <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            Ảnh banner (Image) *
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
                              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Upload className="w-3 h-3" />
                              {isUploading ? 'Đang tải lên...' : 'Chọn tệp từ máy tính'}
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="Nhập link ảnh hoặc click 'Chọn tệp từ máy tính'..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all pr-10"
                          />
                          <ImageIcon className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Hỗ trợ ảnh WebP, PNG, JPG sắc nét theo đúng tỷ lệ IAB của vị trí đã chọn.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Liên kết đích khi click (Target URL) *
                        </label>
                        <div className="relative">
                          <input
                            type="url"
                            value={targetUrl}
                            onChange={(e) => setTargetUrl(e.target.value)}
                            placeholder="https://sporto.asia/shop/promo"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all pr-10"
                          />
                          <LinkIcon className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Chữ trên nút kêu gọi (CTA Text)
                        </label>
                        <input
                          type="text"
                          value={ctaText}
                          onChange={(e) => setCtaText(e.target.value)}
                          placeholder="Xem ngay / Đăng ký ngay / Mua ngay"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Nội dung mô tả / Thông điệp khuyến mãi (Tùy chọn)
                        </label>
                        <textarea
                          rows={2}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Mô tả quyền lợi hoặc mã giảm giá cho thành viên..."
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mã nhúng HTML / Google AdSense Script *
                      </label>
                      <textarea
                        rows={5}
                        value={customHtml}
                        onChange={(e) => setCustomHtml(e.target.value)}
                        placeholder={
                          '<!-- Google AdSense Unit -->\n<ins class="adsbygoogle"\n     style="display:block"\n     data-ad-client="ca-pub-xxxxxxxx"\n     data-ad-slot="xxxxxxxx"\n     data-ad-format="auto"></ins>'
                        }
                        className="w-full font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-900 text-emerald-400 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                      />
                    </div>
                  )}

                  {/* Scheduling & Priority */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày bắt đầu (Để trống = Chạy ngay)
                    </label>
                    <DateTimePicker
                      value={startDate}
                      onChange={(val) => setStartDate(val)}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày kết thúc (Để trống = Vô thời hạn)
                    </label>
                    <DateTimePicker
                      value={endDate}
                      onChange={(val) => setEndDate(val)}
                      className="h-10 text-xs rounded-xl"
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

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Kích hoạt hiển thị
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Bật/Tắt banner ngay lập tức
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Preview Pane */}
            <aside className="min-h-0 overflow-y-auto overscroll-contain border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5 lg:border-l lg:border-t-0">
              <div className="sticky top-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
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
            </aside>
          </div>

          {/* Footer Buttons */}
          <div className="relative z-10 flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white px-5 py-3.5 sm:px-7">
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
    </div>
  );
};
