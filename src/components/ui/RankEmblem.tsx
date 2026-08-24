'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/utils/cn';
import { getShortTierCode } from '@/components/ui/PlayerSportTierBadgeBar';
import { getSportAccentColor, getSportLogo } from '@/constants/sports';

export type RankTierCode = 'TS' | 'HTA' | 'LTA' | 'HTB' | 'LTB' | 'HTC' | 'LTC' | 'HTD' | 'LTD' | 'PRO' | 'ADV' | 'INT' | 'BEG' | '--';

export interface TierThemeConfig {
  code: RankTierCode;
  name: string;
  // SVG Gradient & Stroke Colors
  ringOuter: string;
  ringInner: string;
  coreFillStart: string;
  coreFillEnd: string;
  glowColor: string;
  accentStroke: string;
  // Typography styling
  textGradient: string;
  text3DShadow: string;
  textColor: string;
  // Badge container
  badgeBg: string;
  badgeBorder: string;
}

export const TIER_THEMES: Record<string, TierThemeConfig> = {
  TS: {
    code: 'TS',
    name: 'Tier S',
    ringOuter: '#FFE259',
    ringInner: '#FFA751',
    coreFillStart: '#F59E0B',
    coreFillEnd: '#B45309',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    accentStroke: '#FFFBEB',
    textGradient: 'linear-gradient(180deg, #FFF59D 0%, #FFD54F 50%, #FF8F00 100%)',
    text3DShadow: '0 2px 0 #B45309, 0 3px 6px rgba(0,0,0,0.5)',
    textColor: '#F59E0B',
    badgeBg: 'bg-amber-950/20',
    badgeBorder: 'border-amber-500/30',
  },
  HTA: {
    code: 'HTA',
    name: 'High Tier A',
    ringOuter: '#FDA4AF',
    ringInner: '#E11D48',
    coreFillStart: '#E11D48',
    coreFillEnd: '#881337',
    glowColor: 'rgba(225, 29, 72, 0.4)',
    accentStroke: '#FFF1F2',
    textGradient: 'linear-gradient(180deg, #FECDD3 0%, #FB7185 50%, #E11D48 100%)',
    text3DShadow: '0 2px 0 #881337, 0 3px 6px rgba(0,0,0,0.5)',
    textColor: '#E11D48',
    badgeBg: 'bg-rose-950/20',
    badgeBorder: 'border-rose-500/30',
  },
  LTA: {
    code: 'LTA',
    name: 'Low Tier A',
    ringOuter: '#FECDD3',
    ringInner: '#F43F5E',
    coreFillStart: '#F43F5E',
    coreFillEnd: '#9F1239',
    glowColor: 'rgba(244, 63, 94, 0.35)',
    accentStroke: '#FFF1F2',
    textGradient: 'linear-gradient(180deg, #FFE4E6 0%, #FDA4AF 50%, #F43F5E 100%)',
    text3DShadow: '0 2px 0 #9F1239, 0 3px 6px rgba(0,0,0,0.5)',
    textColor: '#F43F5E',
    badgeBg: 'bg-rose-950/15',
    badgeBorder: 'border-rose-400/30',
  },
  HTB: {
    code: 'HTB',
    name: 'High Tier B',
    ringOuter: '#93C5FD',
    ringInner: '#2563EB',
    coreFillStart: '#2563EB',
    coreFillEnd: '#1E3A8A',
    glowColor: 'rgba(37, 99, 235, 0.4)',
    accentStroke: '#EFF6FF',
    textGradient: 'linear-gradient(180deg, #BFDBFE 0%, #60A5FA 50%, #2563EB 100%)',
    text3DShadow: '0 2px 0 #1E3A8A, 0 3px 6px rgba(0,0,0,0.5)',
    textColor: '#2563EB',
    badgeBg: 'bg-blue-950/20',
    badgeBorder: 'border-blue-500/30',
  },
  LTB: {
    code: 'LTB',
    name: 'Low Tier B',
    ringOuter: '#A5F3FC',
    ringInner: '#0284C7',
    coreFillStart: '#0284C7',
    coreFillEnd: '#075985',
    glowColor: 'rgba(2, 132, 199, 0.35)',
    accentStroke: '#ECFEFF',
    textGradient: 'linear-gradient(180deg, #CFFAFE 0%, #38BDF8 50%, #0284C7 100%)',
    text3DShadow: '0 2px 0 #075985, 0 3px 6px rgba(0,0,0,0.5)',
    textColor: '#0284C7',
    badgeBg: 'bg-cyan-950/20',
    badgeBorder: 'border-cyan-500/30',
  },
  HTC: {
    code: 'HTC',
    name: 'High Tier C',
    ringOuter: '#A7F3D0',
    ringInner: '#059669',
    coreFillStart: '#059669',
    coreFillEnd: '#064E3B',
    glowColor: 'rgba(5, 150, 105, 0.4)',
    accentStroke: '#ECFDF5',
    textGradient: 'linear-gradient(180deg, #D1FAE5 0%, #34D399 50%, #059669 100%)',
    text3DShadow: '0 2px 0 #064E3B, 0 3px 6px rgba(0,0,0,0.5)',
    textColor: '#059669',
    badgeBg: 'bg-emerald-950/20',
    badgeBorder: 'border-emerald-500/30',
  },
  LTC: {
    code: 'LTC',
    name: 'Low Tier C',
    ringOuter: '#C7D2FE',
    ringInner: '#10B981',
    coreFillStart: '#10B981',
    coreFillEnd: '#047857',
    glowColor: 'rgba(16, 185, 129, 0.35)',
    accentStroke: '#F0FDF4',
    textGradient: 'linear-gradient(180deg, #E0E7FF 0%, #6EE7B7 50%, #10B981 100%)',
    text3DShadow: '0 2px 0 #047857, 0 3px 6px rgba(0,0,0,0.5)',
    textColor: '#10B981',
    badgeBg: 'bg-emerald-950/15',
    badgeBorder: 'border-emerald-400/30',
  },
  HTD: {
    // High Tier D follows the ELO legend: slate/platinum, not the old purple/gold placeholder.
    code: 'HTD',
    name: 'High Tier D',
    ringOuter: '#CBD5E1',
    ringInner: '#64748B',
    coreFillStart: '#64748B',
    coreFillEnd: '#334155',
    glowColor: 'rgba(100, 116, 139, 0.3)',
    accentStroke: '#F8FAFC',
    textGradient: 'linear-gradient(180deg, #F8FAFC 0%, #CBD5E1 50%, #64748B 100%)',
    text3DShadow: '0 2px 0 #1E293B, 0 3px 5px rgba(0,0,0,0.4)',
    textColor: '#64748B',
    badgeBg: 'bg-slate-900/20',
    badgeBorder: 'border-slate-400/30',
  },
  LTD: {
    code: 'LTD',
    name: 'Low Tier D',
    ringOuter: '#E2E8F0',
    ringInner: '#64748B',
    coreFillStart: '#64748B',
    coreFillEnd: '#334155',
    glowColor: 'rgba(100, 116, 139, 0.3)',
    accentStroke: '#F8FAFC',
    textGradient: 'linear-gradient(180deg, #F1F5F9 0%, #CBD5E1 50%, #64748B 100%)',
    text3DShadow: '0 2px 0 #1E293B, 0 3px 5px rgba(0,0,0,0.4)',
    textColor: '#64748B',
    badgeBg: 'bg-slate-900/20',
    badgeBorder: 'border-slate-400/30',
  },
  PRO: {
    code: 'PRO',
    name: 'Pro',
    ringOuter: '#FFE259',
    ringInner: '#FFA751',
    coreFillStart: '#F59E0B',
    coreFillEnd: '#B45309',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    accentStroke: '#FFFBEB',
    textGradient: 'linear-gradient(180deg, #FFF59D 0%, #FFD54F 50%, #FF8F00 100%)',
    text3DShadow: '0 2px 0 #B45309, 0 3px 6px rgba(0,0,0,0.5)',
    textColor: '#F59E0B',
    badgeBg: 'bg-amber-950/20',
    badgeBorder: 'border-amber-500/30',
  },
  ADV: {
    code: 'ADV',
    name: 'Advanced',
    ringOuter: '#A7F3D0',
    ringInner: '#059669',
    coreFillStart: '#059669',
    coreFillEnd: '#064E3B',
    glowColor: 'rgba(5, 150, 105, 0.4)',
    accentStroke: '#ECFDF5',
    textGradient: 'linear-gradient(180deg, #D1FAE5 0%, #34D399 50%, #059669 100%)',
    text3DShadow: '0 2px 0 #064E3B, 0 3px 6px rgba(0,0,0,0.5)',
    textColor: '#059669',
    badgeBg: 'bg-emerald-950/20',
    badgeBorder: 'border-emerald-500/30',
  },
  INT: {
    code: 'INT',
    name: 'Intermediate',
    ringOuter: '#93C5FD',
    ringInner: '#2563EB',
    coreFillStart: '#2563EB',
    coreFillEnd: '#1E3A8A',
    glowColor: 'rgba(37, 99, 235, 0.4)',
    accentStroke: '#EFF6FF',
    textGradient: 'linear-gradient(180deg, #BFDBFE 0%, #60A5FA 50%, #2563EB 100%)',
    text3DShadow: '0 2px 0 #1E3A8A, 0 3px 6px rgba(0,0,0,0.5)',
    textColor: '#2563EB',
    badgeBg: 'bg-blue-950/20',
    badgeBorder: 'border-blue-500/30',
  },
  BEG: {
    code: 'BEG',
    name: 'Beginner',
    ringOuter: '#E2E8F0',
    ringInner: '#64748B',
    coreFillStart: '#64748B',
    coreFillEnd: '#334155',
    glowColor: 'rgba(100, 116, 139, 0.3)',
    accentStroke: '#F8FAFC',
    textGradient: 'linear-gradient(180deg, #F1F5F9 0%, #CBD5E1 50%, #64748B 100%)',
    text3DShadow: '0 2px 0 #1E293B, 0 3px 5px rgba(0,0,0,0.4)',
    textColor: '#64748B',
    badgeBg: 'bg-slate-900/20',
    badgeBorder: 'border-slate-400/30',
  },
};

export interface RankEmblemProps {
  elo?: number | null;
  tierName?: string | null;
  tierCode?: string | null;
  sportName?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  layout?: 'badge' | 'stacked' | 'icon-only';
  showElo?: boolean;
  className?: string;
}

export function getTierTheme(tierName?: string | null, elo?: number | null, explicitCode?: string | null): TierThemeConfig {
  const code = (explicitCode || getShortTierCode(tierName, elo) || 'LTD').toUpperCase();
  return TIER_THEMES[code] || TIER_THEMES['LTD'];
}

export function isHighTierCode(code?: string | null): boolean {
  const normalized = code?.toUpperCase() || '';
  return normalized === 'TS' || normalized.startsWith('HT') || ['PRO', 'ADV', 'INT'].includes(normalized);
}

export function getTierBadgeStyle(theme: TierThemeConfig, code: string) {
  const isHigh = isHighTierCode(code);
  return {
    isHigh,
    backgroundColor: `${theme.coreFillStart}${isHigh ? '22' : '10'}`,
    borderColor: `${theme.ringInner}${isHigh ? '99' : '55'}`,
    textColor: isHigh ? theme.coreFillEnd : theme.textColor,
  };
}

/**
 * Component SVG Polygon Shield Insignia mô phỏng chính xác mẫu Hình 2:
 * Vành đa giác kim loại vát góc + Lõi đá quý đa giác + Điểm nhấn phát sáng
 */
export function PolygonEmblemIcon({
  theme,
  sizePx = 36,
  sportLogo,
}: {
  theme: TierThemeConfig;
  sizePx?: number;
  sportLogo?: string | null;
}) {
  const uniqueId = React.useId().replace(/:/g, '');
  const gradId = `emblem-grad-${theme.code}-${uniqueId}`;
  const coreGradId = `core-grad-${theme.code}-${uniqueId}`;

  return (
    <div
      className="relative flex items-center justify-center shrink-0 rounded-full transition-transform group-hover:scale-105"
      style={{
        width: sizePx,
        height: sizePx,
        filter: `drop-shadow(0 0 6px ${theme.glowColor})`,
      }}
    >
      <svg
        viewBox="0 0 48 48"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.ringOuter} />
            <stop offset="100%" stopColor={theme.ringInner} />
          </linearGradient>
          <linearGradient id={coreGradId} x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor={theme.coreFillStart} />
            <stop offset="100%" stopColor={theme.coreFillEnd} />
          </linearGradient>
        </defs>

        {/* Dark circular base background */}
        <circle cx="24" cy="24" r="22" fill="#0B0F19" fillOpacity="0.85" stroke="#1E293B" strokeWidth="1" />

        {/* Outer Heptagon / Angled Metallic Ring */}
        <polygon
          points="24,5 40,11 44,28 33,42 15,42 4,28 8,11"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />

        {/* Inner Highlight Ring */}
        <polygon
          points="24,8 37,13 40,27 30,39 18,39 8,27 11,13"
          fill="none"
          stroke={theme.accentStroke}
          strokeWidth="0.75"
          strokeOpacity="0.8"
          strokeLinejoin="round"
        />

        {/* Central Gemstone Core */}
        <polygon
          points="24,13 34,18 36,29 28,37 20,37 12,29 14,18"
          fill={`url(#${coreGradId})`}
          stroke={theme.accentStroke}
          strokeWidth="0.8"
          strokeOpacity="0.6"
        />

        {/* Gem Facet Highlight Accents */}
        <line x1="24" y1="13" x2="24" y2="24" stroke="#FFFFFF" strokeWidth="0.7" strokeOpacity="0.4" />
        <line x1="14" y1="18" x2="24" y2="24" stroke="#FFFFFF" strokeWidth="0.7" strokeOpacity="0.4" />
        <line x1="34" y1="18" x2="24" y2="24" stroke="#FFFFFF" strokeWidth="0.7" strokeOpacity="0.4" />
      </svg>

      {/* Sport Logo in Core (Optional) */}
      {sportLogo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Image
            src={sportLogo}
            alt=""
            width={Math.round(sizePx * 0.42)}
            height={Math.round(sizePx * 0.42)}
            unoptimized
            className="object-contain drop-shadow-md brightness-110"
          />
        </div>
      )}
    </div>
  );
}

export function SportBadgeIcon({
  sportName,
  sizePx = 22,
}: {
  sportName?: string | null;
  sizePx?: number;
}) {
  const sportLogo = getSportLogo(sportName);
  const accentColor = getSportAccentColor(sportName);

  return (
    <span
      className="inline-flex items-center justify-center shrink-0 rounded-full border"
      style={{
        width: sizePx,
        height: sizePx,
        backgroundColor: `${accentColor}16`,
        borderColor: `${accentColor}55`,
      }}
      aria-hidden="true"
    >
      {sportLogo ? (
        <Image
          src={sportLogo}
          alt=""
          width={Math.round(sizePx * 0.58)}
          height={Math.round(sizePx * 0.58)}
          unoptimized
          className="object-contain"
        />
      ) : (
        <span className="text-[10px] font-black" style={{ color: accentColor }}>
          •
        </span>
      )}
    </span>
  );
}

export function RankEmblem({
  elo,
  tierName,
  tierCode,
  sportName,
  size = 'md',
  layout = 'badge',
  showElo = false,
  className,
}: RankEmblemProps) {
  const theme = getTierTheme(tierName, elo, tierCode);
  const tierStyle = getTierBadgeStyle(theme, theme.code);
  const sizeDimensions = {
    sm: { iconSize: 22, textSize: 'text-xs', eloSize: 'text-[10px]', gap: 'gap-1.5' },
    md: { iconSize: 32, textSize: 'text-sm font-black', eloSize: 'text-xs', gap: 'gap-2' },
    lg: { iconSize: 46, textSize: 'text-lg font-black tracking-tight', eloSize: 'text-xs font-bold', gap: 'gap-2.5' },
    xl: { iconSize: 64, textSize: 'text-2xl font-black tracking-tight', eloSize: 'text-sm font-extrabold', gap: 'gap-3' },
  };

  const dim = sizeDimensions[size];

  // Layout 1: Icon only
  if (layout === 'icon-only') {
    return (
      <div className={cn('inline-flex items-center justify-center', className)} title={`${theme.name} (${theme.code})`}>
        <SportBadgeIcon sportName={sportName} sizePx={dim.iconSize} />
      </div>
    );
  }

  // Layout 2: Stacked (Như Hình 2: Icon phía trên, Rank Code 3D phía dưới)
  if (layout === 'stacked') {
    return (
      <div className={cn('inline-flex flex-col items-center justify-center group select-none', dim.gap, className)}>
        <SportBadgeIcon sportName={sportName} sizePx={dim.iconSize} />
        <span
          className={cn('font-black uppercase tracking-wider text-center leading-none')}
          style={{
            color: tierStyle.textColor,
            fontSize: size === 'sm' ? '11px' : size === 'md' ? '14px' : size === 'lg' ? '18px' : '24px',
          }}
        >
          {theme.code}
        </span>
        {showElo && elo != null && (
          <span className="text-[10px] font-bold text-slate-400 -mt-1">
            {elo} ELO
          </span>
        )}
      </div>
    );
  }

  // Layout 3: Horizontal Badge (Thanh badge ngang cao cấp)
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 border shadow-xs transition-all hover:scale-[1.02] select-none',
        dim.gap,
        className,
      )}
      style={{ backgroundColor: tierStyle.backgroundColor, borderColor: tierStyle.borderColor }}
      title={`${sportName ? `${sportName}: ` : ''}${theme.name} (${theme.code})`}
    >
      <SportBadgeIcon sportName={sportName} sizePx={dim.iconSize} />
      <div className="flex flex-col leading-tight min-w-0 pr-1">
        <span
          className={cn('font-black uppercase tracking-wider')}
          style={{
            color: tierStyle.textColor,
            fontSize: size === 'sm' ? '11px' : size === 'md' ? '13px' : '15px',
          }}
        >
          {theme.code}
        </span>
        {showElo && elo != null && (
          <span className="text-[10px] font-semibold text-slate-400 truncate">
            {elo} <span className="text-[9px] opacity-75">ELO</span>
          </span>
        )}
      </div>
    </div>
  );
}

export default RankEmblem;
