'use client';

import React, { useState } from 'react';
import { getSportLogo } from '@/constants/sports';
import { BRAND } from '@/constants/brand';

export interface TournamentBannerCoverProps {
  bannerUrl?: string | null;
  tournamentName: string;
  categoryName?: string | null;
  className?: string;
  isCompleted?: boolean;
  children?: React.ReactNode;
}

interface SportVisualTheme {
  gradient: string;
  glowColor: string;
  watermarkText: string;
  accentBorder: string;
}

function getSportTheme(categoryName?: string | null): SportVisualTheme {
  const term = (categoryName || '').toLowerCase();

  if (term.includes('pickleball')) {
    return {
      gradient: 'from-emerald-950 via-teal-900 to-slate-950',
      glowColor: 'bg-emerald-500/15',
      watermarkText: 'PICKLEBALL',
      accentBorder: 'border-emerald-500/20',
    };
  }

  if (term.includes('cầu lông') || term.includes('badminton') || term.includes('lông')) {
    return {
      gradient: 'from-blue-950 via-indigo-900 to-slate-950',
      glowColor: 'bg-blue-500/15',
      watermarkText: 'BADMINTON',
      accentBorder: 'border-blue-500/20',
    };
  }

  if (term.includes('tennis') || term.includes('quần vợt')) {
    return {
      gradient: 'from-amber-950 via-stone-900 to-slate-950',
      glowColor: 'bg-amber-500/15',
      watermarkText: 'TENNIS',
      accentBorder: 'border-amber-500/20',
    };
  }

  if (term.includes('bóng đá') || term.includes('football') || term.includes('soccer')) {
    return {
      gradient: 'from-emerald-950 via-slate-900 to-teal-950',
      glowColor: 'bg-teal-500/15',
      watermarkText: 'FOOTBALL',
      accentBorder: 'border-teal-500/20',
    };
  }

  if (term.includes('bóng bàn') || term.includes('ping') || term.includes('table tennis')) {
    return {
      gradient: 'from-rose-950 via-slate-900 to-indigo-950',
      glowColor: 'bg-rose-500/15',
      watermarkText: 'PING PONG',
      accentBorder: 'border-rose-500/20',
    };
  }

  return {
    gradient: 'from-slate-950 via-blue-950 to-slate-900',
    glowColor: 'bg-blue-500/15',
    watermarkText: 'TOURNAMENT',
    accentBorder: 'border-blue-500/20',
  };
}

export const TournamentBannerCover: React.FC<TournamentBannerCoverProps> = ({
  bannerUrl,
  tournamentName,
  categoryName,
  className = '',
  isCompleted = false,
  children,
}) => {
  const [imgError, setImgError] = useState(false);
  const hasCustomBanner = Boolean(bannerUrl?.trim()) && !imgError;
  const theme = getSportTheme(categoryName);
  const sportIcon = getSportLogo(categoryName);

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none ${className} ${
        isCompleted ? 'grayscale opacity-70' : ''
      }`}
    >
      {hasCustomBanner ? (
        <img
          src={bannerUrl!.split(',')[0]}
          alt={tournamentName}
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
        />
      ) : (
        /* Dynamic Athletic Sport Cover */
        <div
          className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} transition-transform duration-500 group-hover:scale-103`}
        >
          {/* Ambient Radial Glow */}
          <div
            className={`absolute -top-10 -right-10 w-64 h-64 rounded-full ${theme.glowColor} blur-3xl pointer-events-none`}
          />
          <div
            className={`absolute -bottom-10 -left-10 w-48 h-48 rounded-full ${theme.glowColor} blur-2xl pointer-events-none`}
          />

          {/* Geometric Sports Court / Arena Pattern */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            viewBox="0 0 400 200"
          >
            {/* Athletic Diagonal Sweep */}
            <line x1="-50" y1="250" x2="300" y2="-50" stroke="white" strokeOpacity="0.04" strokeWidth="40" />
            <line x1="0" y1="230" x2="350" y2="-50" stroke="white" strokeOpacity="0.03" strokeWidth="1.5" />
            
            {/* Court boundary line abstractions */}
            <circle cx="200" cy="100" r="60" stroke="white" strokeOpacity="0.04" strokeWidth="1.5" fill="none" />
            <line x1="200" y1="0" x2="200" y2="200" stroke="white" strokeOpacity="0.05" strokeWidth="1.5" strokeDasharray="6 4" />
            <rect x="25" y="20" width="350" height="160" rx="8" stroke="white" strokeOpacity="0.04" strokeWidth="1.5" fill="none" />
            
            {/* Dynamic Corner Accents */}
            <path d="M 25 45 L 25 20 L 50 20" stroke="white" strokeOpacity="0.12" strokeWidth="2" fill="none" />
            <path d="M 375 155 L 375 180 L 350 180" stroke="white" strokeOpacity="0.12" strokeWidth="2" fill="none" />
          </svg>

          {/* Large Athletic Sport Typography Watermark */}
          <div className="absolute inset-0 flex items-center justify-end pr-6 pointer-events-none overflow-hidden">
            <span className="text-4xl sm:text-5xl md:text-6xl font-black italic tracking-tighter text-white/[0.04] uppercase transform rotate-[-4deg] select-none whitespace-nowrap">
              {theme.watermarkText}
            </span>
          </div>

          {/* Sport Icon Watermark (Right aligned) */}
          {sportIcon && (
            <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-20 h-20 sm:w-28 sm:h-28 opacity-[0.09] filter brightness-0 invert pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
              <img
                src={sportIcon}
                alt=""
                className="w-full h-full object-contain"
                aria-hidden="true"
              />
            </div>
          )}

          {/* Center Brandmark (Transparent SportO Logo with clean white vector filter) */}
          <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
            <div className="flex flex-col items-center gap-1.5 opacity-35 group-hover:opacity-50 transition-opacity duration-300">
              <img
                src={BRAND.assets.logoFull}
                alt={`${BRAND.name} Cover`}
                className="w-32 sm:w-40 md:w-44 h-auto object-contain filter brightness-0 invert drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
              />
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-px bg-white/20" />
                <span className="text-[9px] font-bold tracking-[0.2em] text-white/50 uppercase">
                  {categoryName || BRAND.name}
                </span>
                <span className="w-6 h-px bg-white/20" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top & Bottom Vignette Overlays for Maximum Badge & Label Contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-slate-950/40 pointer-events-none" />

      {/* Children Slots (Status Badges, Location Chips, etc.) */}
      {children}
    </div>
  );
};

export default TournamentBannerCover;
