'use client';

import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Code, Sparkles, Calendar, Layers, Link as LinkIcon, Eye } from 'lucide-react';
import { BannerPreviewCard } from './BannerPreviewCard';
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
  label: string;
  desc: string;
  size: string;
}> = [
  {
    value: 'HOMEPAGE_SIDEBAR',
    label: 'Sidebar Cột Phải Trang Chủ',
    desc: 'Cố định bên phải bảng tin và danh sách trận đấu trang chủ',
    size: '300 x 250 (Medium Rectangle)',
  },
  {
    value: 'TOURNAMENTS_BOTTOM',
    label: 'Banner Ngang Trang Giải Đấu',
    desc: 'Ngang dưới danh sách giải đấu và bảng phân trang',
    size: '728 x 90 (Leaderboard) / 970 x 250',
  },
  {
    value: 'MATCHES_BOTTOM',
    label: 'Banner Ngang Trang Trận Đấu',
    desc: 'Ngang dưới danh sách trận đấu trực tiếp',
    size: '728 x 90 (Leaderboard) / 970 x 250',
  },
  {
    value: 'GLOBAL_HEADER',
    label: 'Thanh Banner Header Toàn Trang',
    desc: 'Thanh thông báo nổi bật trên cùng cho sự kiện đặc biệt',
    size: '970 x 90 (Top Bar)',
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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerType, setBannerType] = useState<AdBannerType>('IMAGE_LINK');
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [customHtml, setCustomHtml] = useState('');
  const [placementSlot, setPlacementSlot] = useState<AdPlacementSlot>('HOMEPAGE_SIDEBAR');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setBannerType(initialData.bannerType || 'IMAGE_LINK');
      setImageUrl(initialData.imageUrl || '');
      setTargetUrl(initialData.targetUrl || '');
      setCtaText(initialData.ctaText || '');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Vui lòng nhập tên/tiêu đề banner quảng cáo');
      return;
    }

    if (bannerType === 'IMAGE_LINK') {
      if (!imageUrl.trim()) {
        toast.error('Vui lòng nhập đường dẫn ảnh banner');
        return;
      }
      if (!targetUrl.trim()) {
        toast.error('Vui lòng nhập liên kết chuyển hướng');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isEditing ? 'Chỉnh sửa banner quảng cáo' : 'Tạo mới banner quảng cáo'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cấu hình vị trí, kích thước chuẩn IAB và tích hợp liên kết ngoài
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Placement Slot Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Vị trí hiển thị (Placement Slot - Chuẩn IAB) *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLACEMENT_OPTIONS.map((slot) => {
                const isSelected = placementSlot === slot.value;
                return (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => setPlacementSlot(slot.value)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                        : 'border-slate-200 hover:border-slate-350 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>
                          {slot.label}
                        </span>
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {slot.size.split(' ')[0]}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{slot.desc}</p>
                    </div>
                    <span className="text-[10px] text-blue-600 font-mono font-medium mt-2">
                      📐 Kích thước đề xuất: {slot.size}
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
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
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
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
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
                required
              />
            </div>

            {bannerType === 'IMAGE_LINK' ? (
              <>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đường dẫn ảnh banner (Image URL) *
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://cdn.sporto.asia/banners/promo-summer.webp"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all pr-10"
                      required
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
                      required
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
                  placeholder={'<!-- Google AdSense Unit -->\n<ins class="adsbygoogle"\n     style="display:block"\n     data-ad-client="ca-pub-xxxxxxxx"\n     data-ad-slot="xxxxxxxx"\n     data-ad-format="auto"></ins>'}
                  className="w-full font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-900 text-emerald-400 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  required
                />
              </div>
            )}

            {/* Scheduling & Priority */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ngày bắt đầu (Để trống = Chạy ngay)
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ngày kết thúc (Để trống = Vô thời hạn)
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Thứ tự ưu tiên (Display Order - Số nhỏ ưu tiên trước)
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
                <span className="text-xs font-bold text-slate-900 block">Kích hoạt hiển thị</span>
                <span className="text-[11px] text-slate-500">Bật/Tắt banner ngay lập tức</span>
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

          {/* 4. Live Preview Section */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Xem trước thực tế (Live Preview)
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200/80">
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

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Đang lưu...' : isEditing ? 'Cập nhật banner' : 'Tạo mới banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
