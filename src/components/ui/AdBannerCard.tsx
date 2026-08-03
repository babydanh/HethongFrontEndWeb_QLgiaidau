'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ExternalLink, Sparkles } from 'lucide-react';
import {
  advertisementsApi,
  type AdPlacementSlot,
  type Advertisement,
} from '@/features/advertisements/api';

export interface AdBannerProps {
  /**
   * Vị trí hiển thị (Component tự động gọi API lấy banner đang active từ Backend)
   */
  slot?: AdPlacementSlot;

  /**
   * Kiểu hiển thị banner:
   * - 'sidebar': Cột bên phải (Trang chủ, chi tiết trận đấu) - Tỷ lệ 4:3 / 300x250
   * - 'horizontal': Ngang rộng đặt dưới phân trang (Tournaments, Matches) - Tỷ lệ Leaderboard 728x90 ~ 970x250
   * - 'inline': Chèn xen kẽ giữa các card trong danh sách
   */
  variant?: 'sidebar' | 'horizontal' | 'inline';

  /** Tên nhãn hàng / nhà tài trợ (Fallback) */
  sponsor?: string;

  /** Tiêu đề chính (Fallback khi chưa có ảnh banner) */
  title?: string;

  /** Mô tả ngắn / ưu đãi (Fallback khi chưa có ảnh banner) */
  description?: string;

  /** Đường dẫn khi click vào banner (Fallback) */
  href?: string;

  /** Chữ trên nút CTA (Fallback khi chưa có ảnh banner) */
  ctaText?: string;

  /** URL ảnh banner tràn viền (Fallback) */
  imageUrl?: string;

  /** Nhãn phân loại (mặc định: "Quảng cáo") */
  badgeLabel?: string;

  /** Class CSS tùy biến thêm */
  className?: string;

  /** Mã nhúng HTML / Script quảng cáo bên thứ 3 (Google AdSense, Ad Network) */
  customHtml?: string;

  /** Callback khi người dùng click (để đo lường analytics) */
  onClick?: () => void;
}

export function AdBannerCard({
  slot,
  variant = 'sidebar',
  sponsor = 'SPORTO STORE & ĐỐI TÁC',
  title = 'Trang thiết bị & Dụng cụ Thể thao chính hãng',
  description = 'Ưu đãi độc quyền cho vận động viên và các câu lạc bộ trên SportO.',
  href: fallbackHref = '/tournaments',
  ctaText = 'Khám phá ngay',
  imageUrl: fallbackImageUrl,
  badgeLabel = 'Quảng cáo',
  className = '',
  customHtml: fallbackCustomHtml,
  onClick,
}: AdBannerProps) {
  const [activeBanner, setActiveBanner] = useState<Advertisement | null>(null);

  useEffect(() => {
    if (!slot) return;
    let isMounted = true;
    advertisementsApi.getActiveBySlot(slot).then((banners) => {
      if (isMounted && banners && banners.length > 0) {
        const topBanner = banners[0];
        setActiveBanner(topBanner);
        // Ghi nhận lượt hiển thị
        advertisementsApi.recordView(topBanner.id);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [slot]);

  // Ưu tiên banner động từ Backend
  const href = activeBanner ? (activeBanner.targetUrl || '#') : fallbackHref;
  const imageUrl = activeBanner ? (activeBanner.imageUrl || undefined) : fallbackImageUrl;
  const customHtml = activeBanner?.bannerType === 'CUSTOM_HTML' ? activeBanner.customHtml : fallbackCustomHtml;
  const isExternal = href.startsWith('http://') || href.startsWith('https://');

  const handleClick = () => {
    if (activeBanner) {
      advertisementsApi.recordClick(activeBanner.id);
    }
    onClick?.();
  };

  // 1. Nếu có mã HTML / Script bên thứ 3 (Google AdSense / Widget)
  if (customHtml) {
    return (
      <div
        className={`w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xs ${className}`}
        dangerouslySetInnerHTML={{ __html: customHtml }}
      />
    );
  }

  // 2. Banner Ảnh Tràn Viền (Full-Bleed Image Banner - Không chữ đè lên ảnh, click chuyển link)
  if (imageUrl) {
    const isHorizontal = variant === 'horizontal';
    const aspectRatioClass = isHorizontal
      ? 'aspect-[3.5/1] sm:aspect-[4.5/1] md:aspect-[5.5/1]'
      : 'aspect-[4/3]';

    const fullBleedContent = (
      <div
        onClick={handleClick}
        className={`group relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-300 cursor-pointer ${aspectRatioClass} ${className}`}
      >
        <img
          src={imageUrl}
          alt={activeBanner?.title || title || 'Quảng cáo'}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
        />
        {/* Nhãn QC mờ góc phải tinh tế */}
        <span className="absolute top-2.5 right-2.5 rounded bg-black/45 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90 select-none border border-white/10 shadow-xs">
          {badgeLabel || 'QC'}
        </span>
      </div>
    );

    return isExternal ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block w-full focus:outline-hidden"
      >
        {fullBleedContent}
      </a>
    ) : (
      <Link href={href} className="block w-full focus:outline-hidden">
        {fullBleedContent}
      </Link>
    );
  }

  // 3. Fallback Card khi chưa có ảnh banner (Dùng giao diện card mặc định)
  if (variant === 'horizontal') {
    const fallbackHorizontal = (
      <div
        onClick={handleClick}
        className={`group relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-5 md:p-6 shadow-sm transition-all duration-300 hover:border-blue-500/50 cursor-pointer ${className}`}
      >
        <div className="relative z-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-blue-300 uppercase border border-blue-400/30">
                <Sparkles className="h-3 w-3 text-blue-400" />
                {sponsor}
              </span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-slate-400 uppercase">
                {badgeLabel}
              </span>
            </div>
            <h4 className="text-base md:text-lg font-bold text-white tracking-tight group-hover:text-blue-200 transition-colors">
              {title}
            </h4>
            {description && (
              <p className="mt-1 text-xs md:text-sm text-slate-300/90 line-clamp-2 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <div className="shrink-0 w-full md:w-auto">
            <div className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 px-5 py-2.5 text-xs md:text-sm font-semibold text-white shadow-md transition-all duration-200">
              <span>{ctaText}</span>
              {isExternal ? (
                <ExternalLink className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </div>
          </div>
        </div>
      </div>
    );

    return isExternal ? (
      <a href={href} target="_blank" rel="noopener noreferrer sponsored" className="block w-full">
        {fallbackHorizontal}
      </a>
    ) : (
      <Link href={href} className="block w-full">
        {fallbackHorizontal}
      </Link>
    );
  }

  // Fallback Card Sidebar 4:3
  const fallbackSidebar = (
    <div
      onClick={handleClick}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:border-blue-400/60 hover:shadow-md cursor-pointer flex flex-col ${className}`}
    >
      <div className="aspect-[4/3] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 relative p-5 flex flex-col justify-end overflow-hidden">
        <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md text-white/90 text-[9px] px-2 py-0.5 rounded font-bold tracking-wider uppercase z-20 border border-white/20">
          {badgeLabel}
        </div>
        <div className="relative z-20 mt-auto">
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
            {sponsor}
          </span>
          <h4 className="text-sm font-bold text-white mb-1 group-hover:text-blue-200 transition-colors line-clamp-2">
            {title}
          </h4>
          {description && (
            <p className="text-[11px] text-white/80 font-medium line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return isExternal ? (
    <a href={href} target="_blank" rel="noopener noreferrer sponsored" className="block w-full">
      {fallbackSidebar}
    </a>
  ) : (
    <Link href={href} className="block w-full">
      {fallbackSidebar}
    </Link>
  );
}

export default AdBannerCard;
