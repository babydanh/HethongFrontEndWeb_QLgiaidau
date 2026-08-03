'use client';

import React from 'react';
import { ExternalLink, Sparkles, Image as ImageIcon } from 'lucide-react';
import type { AdBannerType, AdPlacementSlot } from '../api';

interface BannerPreviewCardProps {
  bannerType: AdBannerType;
  placementSlot: AdPlacementSlot;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  targetUrl?: string | null;
  ctaText?: string | null;
  customHtml?: string | null;
}

export const BannerPreviewCard: React.FC<BannerPreviewCardProps> = ({
  bannerType,
  placementSlot,
  title,
  imageUrl,
  targetUrl,
  customHtml,
}) => {
  const isSidebar = placementSlot === 'HOMEPAGE_SIDEBAR';
  const isHorizontal = placementSlot === 'TOURNAMENTS_BOTTOM' || placementSlot === 'MATCHES_BOTTOM';
  const isHeader = placementSlot === 'GLOBAL_HEADER';

  if (bannerType === 'CUSTOM_HTML' && customHtml) {
    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          <span>Quảng cáo (Google Ads / Custom Script)</span>
          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px]">IAB Compliant</span>
        </div>
        <div
          className="w-full min-h-[90px] flex items-center justify-center overflow-auto"
          dangerouslySetInnerHTML={{ __html: customHtml }}
        />
      </div>
    );
  }

  // Pure Edge-to-Edge (Tràn Viền) Preview
  const slotBadge = isSidebar
    ? 'Sidebar 4:3 (300x250 Medium Rectangle)'
    : isHeader
    ? 'Top Bar (970x90)'
    : 'Leaderboard 728x90 / 970x250';

  const aspectClass = isSidebar
    ? 'aspect-[4/3] max-w-[320px]'
    : isHeader
    ? 'aspect-[6/1] sm:aspect-[8/1]'
    : 'aspect-[3.5/1] sm:aspect-[5/1]';

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
        <span className="inline-flex items-center gap-1.5 text-blue-600 font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Mô phỏng hiển thị trên Website
        </span>
        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
          {slotBadge}
        </span>
      </div>

      <div className="flex justify-center w-full">
        {imageUrl ? (
          <div
            className={`relative w-full ${aspectClass} rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100 shadow-sm transition-all hover:shadow-md group`}
          >
            <img
              src={imageUrl}
              alt={title || 'Banner quảng cáo'}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
            />
            {/* Nhãn QC góc phải */}
            <span className="absolute top-2.5 right-2.5 rounded bg-black/45 backdrop-blur-xs px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/90 select-none border border-white/10 shadow-xs">
              QC
            </span>
          </div>
        ) : (
          <div
            className={`w-full ${aspectClass} rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-2`}
          >
            <ImageIcon className="w-8 h-8 text-slate-300" />
            <p className="text-xs font-semibold text-slate-500">
              Chưa có URL ảnh banner
            </p>
            <p className="text-[10px] text-slate-400 max-w-xs">
              Dán đường dẫn ảnh thiết kế vào ô trên để xem trước banner tràn viền thực tế.
            </p>
          </div>
        )}
      </div>

      {targetUrl && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
          <span className="text-[10px] text-slate-400">Đích đến khi click:</span>
          <span className="font-medium text-blue-600 truncate max-w-[280px] inline-flex items-center gap-1">
            {targetUrl}
            <ExternalLink className="w-3 h-3 shrink-0" />
          </span>
        </div>
      )}
    </div>
  );
};
