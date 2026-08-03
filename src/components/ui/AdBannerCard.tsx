'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ExternalLink, Sparkles } from 'lucide-react';
import {
  advertisementsApi,
  type AdPlacementSlot,
  type Advertisement,
} from '@/features/advertisements/api';

export interface AdBannerProps {
  /**
   * Vị trí hiển thị (Nếu truyền vào, component sẽ tự động gọi API lấy banner từ backend)
   */
  slot?: AdPlacementSlot;

  /**
   * Kiểu hiển thị banner:
   * - 'sidebar': Card tỉ lệ 4:3 cho cột bên phải (Trang chủ, chi tiết trận đấu)
   * - 'horizontal': Banner ngang rộng đặt dưới phân trang, chân danh sách (Tournaments, Matches)
   * - 'inline': Card gọn nhẹ để chèn xen kẽ giữa các card trong danh sách
   */
  variant?: 'sidebar' | 'horizontal' | 'inline';

  /** Tên nhãn hàng / nhà tài trợ (VD: "CỬA HÀNG SPORTO", "SPORTO PARTNER") */
  sponsor?: string;

  /** Tiêu đề chính (Fallback khi chưa có banner động) */
  title: string;

  /** Mô tả ngắn / ưu đãi (Fallback khi chưa có banner động) */
  description?: string;

  /** Đường dẫn khi click vào banner (Fallback khi chưa có banner động) */
  href?: string;

  /** Chữ hiển thị trên nút kêu gọi hành động (CTA) */
  ctaText?: string;

  /** URL ảnh nền (nếu có) */
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
  sponsor = 'SPORTO PARTNER',
  title: fallbackTitle,
  description: fallbackDescription,
  href: fallbackHref = '#',
  ctaText: fallbackCtaText = 'Xem chi tiết',
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
        // Ghi nhận 1 lượt view
        advertisementsApi.recordView(topBanner.id);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [slot]);

  // Derived fields (Ưu tiên banner động từ Backend nếu có)
  const title = activeBanner ? activeBanner.title : fallbackTitle;
  const description = activeBanner ? (activeBanner.description || undefined) : fallbackDescription;
  const href = activeBanner ? (activeBanner.targetUrl || '#') : fallbackHref;
  const ctaText = activeBanner ? (activeBanner.ctaText || 'Xem chi tiết') : fallbackCtaText;
  const imageUrl = activeBanner ? (activeBanner.imageUrl || undefined) : fallbackImageUrl;
  const customHtml = activeBanner?.bannerType === 'CUSTOM_HTML' ? activeBanner.customHtml : fallbackCustomHtml;

  const handleClick = () => {
    if (activeBanner) {
      advertisementsApi.recordClick(activeBanner.id);
    }
    onClick?.();
  };

  // Nếu có customHtml từ mạng quảng cáo thứ 3 (như Google AdSense / Widget)
  if (customHtml) {
    return (
      <div
        className={`w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xs ${className}`}
        dangerouslySetInnerHTML={{ __html: customHtml }}
      />
    );
  }

  const isExternal = href.startsWith('http://') || href.startsWith('https://');

  // Variant 1: Horizontal Banner (Dành cho vị trí dưới phân trang trang Tournaments / Matches)
  if (variant === 'horizontal') {
    const content = (
      <div
        onClick={handleClick}
        className={`group relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-5 md:p-6 shadow-[0_4px_24px_rgba(15,23,42,0.12)] transition-all duration-300 hover:border-blue-500/50 hover:shadow-[0_8px_32px_rgba(37,99,235,0.18)] ${className}`}
      >
        {/* Glow & Abstract Background Accents */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-600/15 blur-3xl transition-all duration-500 group-hover:bg-blue-600/25" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl" />

        {/* Custom Image background if provided */}
        {imageUrl && (
          <div className="absolute inset-0 z-0 opacity-25 transition-opacity duration-300 group-hover:opacity-35">
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1200px"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
          </div>
        )}

        <div className="relative z-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          {/* Left info */}
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

          {/* Right CTA Button */}
          <div className="shrink-0 w-full md:w-auto">
            <div className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 px-5 py-2.5 text-xs md:text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-200 cursor-pointer">
              <span>{ctaText}</span>
              {isExternal ? (
                <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              ) : (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              )}
            </div>
          </div>
        </div>
      </div>
    );

    return isExternal ? (
      <a href={href} target="_blank" rel="noopener noreferrer sponsored" className="block w-full">
        {content}
      </a>
    ) : (
      <Link href={href} className="block w-full">
        {content}
      </Link>
    );
  }

  // Variant 2 & 3: Sidebar Card (4:3) & Inline
  const cardContent = (
    <div
      onClick={handleClick}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.06)] transition-all duration-300 hover:border-blue-400/60 hover:shadow-[0_8px_24px_rgba(37,99,235,0.12)] cursor-pointer flex flex-col ${className}`}
    >
      <div className="aspect-[4/3] bg-slate-900 relative p-5 flex flex-col justify-end overflow-hidden">
        {/* Background Image / Gradient Fallback */}
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            sizes="(max-width: 768px) 100vw, 400px"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950" />
        )}

        {/* Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10" />
        <div className="absolute inset-0 bg-blue-600 opacity-20 group-hover:opacity-35 transition-opacity duration-300 z-10" />

        {/* Top-Right Badge */}
        <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md text-white/90 text-[9px] px-2 py-0.5 rounded font-bold tracking-wider uppercase z-20 border border-white/20">
          {badgeLabel}
        </div>

        {/* Bottom Content */}
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
      {cardContent}
    </a>
  ) : (
    <Link href={href} className="block w-full">
      {cardContent}
    </Link>
  );
}

export default AdBannerCard;
