'use client';

import React from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
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
  description,
  imageUrl,
  targetUrl,
  ctaText,
  customHtml,
}) => {
  const isSidebar = placementSlot === 'HOMEPAGE_SIDEBAR';
  const isHorizontal = placementSlot === 'TOURNAMENTS_BOTTOM' || placementSlot === 'MATCHES_BOTTOM';
  const isHeader = placementSlot === 'GLOBAL_HEADER';

  if (bannerType === 'CUSTOM_HTML' && customHtml) {
    return (
      <div className="w-full rounded-xl border border-slate-200 bg-white p-3 shadow-xs overflow-hidden">
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

  // IMAGE_LINK: Sidebar Format (Medium Rectangle / 300x250 ~ 300x360)
  if (isSidebar) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4 text-white shadow-md border border-slate-700/50 max-w-[320px] mx-auto group">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
            <Sparkles className="w-2.5 h-2.5" />
            Tài trợ
          </span>
          <span className="text-[9px] text-slate-400 font-mono">300x250</span>
        </div>

        {imageUrl ? (
          <div className="relative w-full h-32 rounded-xl overflow-hidden mb-3 bg-slate-950/60 border border-slate-700/60">
            <img
              src={imageUrl}
              alt={title || 'Banner quảng cáo'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        ) : (
          <div className="w-full h-24 rounded-xl bg-slate-800/80 border border-dashed border-slate-600 flex items-center justify-center text-xs text-slate-400 mb-3">
            [Chưa có ảnh banner]
          </div>
        )}

        <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-blue-300 transition-colors">
          {title || 'Tiêu đề quảng cáo'}
        </h4>

        {description && (
          <p className="text-xs text-slate-300 line-clamp-2 mt-1">
            {description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-700/60">
          <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
            {targetUrl ? targetUrl.replace(/^https?:\/\//, '') : 'sporto.asia'}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-xs group-hover:bg-blue-500 transition-colors">
            {ctaText || 'Xem ngay'}
            <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </div>
    );
  }

  // IMAGE_LINK: Horizontal Leaderboard / Billboard Format (728x90 / 970x250)
  if (isHorizontal || isHeader) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-slate-700/50 p-4 w-full group">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
            {imageUrl ? (
              <div className="relative w-20 h-14 sm:w-28 sm:h-16 rounded-xl overflow-hidden bg-slate-950/60 border border-slate-700/60 shrink-0">
                <img
                  src={imageUrl}
                  alt={title || 'Banner'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            ) : (
              <div className="w-20 h-14 rounded-xl bg-slate-800/80 border border-dashed border-slate-600 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                [Ảnh]
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  <Sparkles className="w-2.5 h-2.5" />
                  Đối tác tài trợ
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {isHorizontal ? 'Leaderboard 728x90 / 970x250' : 'Top Bar 970x90'}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                {title || 'Tiêu đề banner quảng cáo'}
              </h4>
              {description && (
                <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all group-hover:scale-105">
              {ctaText || 'Khám phá ngay'}
              <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
