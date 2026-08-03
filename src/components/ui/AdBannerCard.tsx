'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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

  /** URL ảnh banner tràn viền (Trường hợp truyền trực tiếp không qua slot) */
  imageUrl?: string;

  /** Đường dẫn khi click vào banner (Trường hợp truyền trực tiếp không qua slot) */
  href?: string;

  /** Tiêu đề / alt ảnh */
  title?: string;

  /** Tên nhà tài trợ (Tùy chọn) */
  sponsor?: string;

  /** Mô tả ngắn (Tùy chọn) */
  description?: string;

  /** Chữ trên nút CTA (Tùy chọn) */
  ctaText?: string;

  /** Nhãn phân loại (mặc định: "QC") */
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
  title = 'Quảng cáo',
  href: staticHref = '#',
  imageUrl: staticImageUrl,
  badgeLabel = 'QC',
  className = '',
  customHtml: staticCustomHtml,
  onClick,
}: AdBannerProps) {
  const [activeBanner, setActiveBanner] = useState<Advertisement | null>(null);
  const [hasLoaded, setHasLoaded] = useState<boolean>(!slot); // Nếu không có slot thì coi như đã load

  useEffect(() => {
    if (!slot) {
      setHasLoaded(true);
      return;
    }
    let isMounted = true;
    advertisementsApi
      .getActiveBySlot(slot)
      .then((banners) => {
        if (isMounted) {
          if (banners && banners.length > 0) {
            const topBanner = banners[0];
            setActiveBanner(topBanner);
            // Ghi nhận 1 lượt view
            advertisementsApi.recordView(topBanner.id);
          } else {
            setActiveBanner(null);
          }
          setHasLoaded(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setActiveBanner(null);
          setHasLoaded(true);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [slot]);

  // NGUYÊN TẮC: Có banner thì hiện, không có thì TẮT HOÀN TOÀN (return null)
  if (slot) {
    if (!hasLoaded || !activeBanner) {
      return null;
    }
  }

  const href = activeBanner ? (activeBanner.targetUrl || '#') : staticHref;
  const imageUrl = activeBanner ? (activeBanner.imageUrl || undefined) : staticImageUrl;
  const customHtml = activeBanner?.bannerType === 'CUSTOM_HTML' ? activeBanner.customHtml : staticCustomHtml;
  const isExternal = href.startsWith('http://') || href.startsWith('https://');

  const handleClick = () => {
    if (activeBanner) {
      advertisementsApi.recordClick(activeBanner.id);
    }
    onClick?.();
  };

  // 1. Mã nhúng HTML / Script Google AdSense
  if (customHtml) {
    return (
      <div
        className={`w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xs ${className}`}
        dangerouslySetInnerHTML={{ __html: customHtml }}
      />
    );
  }

  // 2. Banner Ảnh Tràn Viền (Full-Bleed Image Banner - Click chuyển route)
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
        {/* Nhãn QC nhỏ gọn ở góc */}
        <span className="absolute top-2.5 right-2.5 rounded bg-black/45 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90 select-none border border-white/10 shadow-xs">
          {badgeLabel}
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

  return null;
}

export default AdBannerCard;
