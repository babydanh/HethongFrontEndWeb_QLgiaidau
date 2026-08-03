import type { SponsorTier } from './api';

export interface SponsorTierStyle {
  accentClassName: string;
  accentBorderClassName: string;
  badgeClassName: string;
  surfaceClassName: string;
  logoFrameClassName: string;
}

export const SPONSOR_TIER_STYLES: Record<SponsorTier, SponsorTierStyle> = {
  TITLE: {
    accentClassName: 'text-violet-700',
    accentBorderClassName: 'border-violet-500',
    badgeClassName: 'border-violet-200 bg-violet-100 text-violet-800',
    surfaceClassName: 'border-violet-200 bg-violet-50/60',
    logoFrameClassName: 'border-violet-200 bg-violet-50',
  },
  DIAMOND: {
    accentClassName: 'text-cyan-700',
    accentBorderClassName: 'border-cyan-500',
    badgeClassName: 'border-cyan-200 bg-cyan-100 text-cyan-800',
    surfaceClassName: 'border-cyan-200 bg-cyan-50/60',
    logoFrameClassName: 'border-cyan-200 bg-cyan-50',
  },
  GOLD: {
    accentClassName: 'text-amber-700',
    accentBorderClassName: 'border-amber-500',
    badgeClassName: 'border-amber-200 bg-amber-100 text-amber-800',
    surfaceClassName: 'border-amber-200 bg-amber-50/60',
    logoFrameClassName: 'border-amber-200 bg-amber-50',
  },
  SILVER: {
    accentClassName: 'text-slate-600',
    accentBorderClassName: 'border-slate-400',
    badgeClassName: 'border-slate-300 bg-slate-100 text-slate-700',
    surfaceClassName: 'border-slate-300 bg-slate-50',
    logoFrameClassName: 'border-slate-300 bg-white',
  },
  BRONZE: {
    accentClassName: 'text-orange-700',
    accentBorderClassName: 'border-orange-500',
    badgeClassName: 'border-orange-200 bg-orange-100 text-orange-800',
    surfaceClassName: 'border-orange-200 bg-orange-50/60',
    logoFrameClassName: 'border-orange-200 bg-orange-50',
  },
  IN_KIND: {
    accentClassName: 'text-emerald-700',
    accentBorderClassName: 'border-emerald-500',
    badgeClassName: 'border-emerald-200 bg-emerald-100 text-emerald-800',
    surfaceClassName: 'border-emerald-200 bg-emerald-50/60',
    logoFrameClassName: 'border-emerald-200 bg-emerald-50',
  },
};

export const getSponsorTierStyle = (tier: SponsorTier): SponsorTierStyle =>
  SPONSOR_TIER_STYLES[tier] ?? SPONSOR_TIER_STYLES.IN_KIND;
