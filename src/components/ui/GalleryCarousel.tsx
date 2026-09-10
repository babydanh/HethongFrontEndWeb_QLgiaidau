'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { BRAND } from '@/constants/brand';
import { getSportLogo } from '@/constants/sports';
import { getSportTheme } from '@/components/ui/TournamentBannerCover';
import ImageLightboxModal from '@/components/common/ImageLightboxModal';

interface GalleryCarouselProps {
  images?: string[];
  defaultBanner?: string;
  categoryName?: string | null;
  tournamentName?: string;
  className?: string;
}

export default function GalleryCarousel({
  images = [],
  defaultBanner,
  categoryName,
  tournamentName,
  className = '',
}: GalleryCarouselProps) {
  const translate = useTranslations('Common');
  const allImages = [
    ...(defaultBanner ? [defaultBanner] : []),
    ...images.filter((img) => img !== defaultBanner)
  ];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const handleNext = useCallback(() => {
    if (allImages.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % allImages.length);
  }, [allImages.length]);

  const handlePrev = useCallback(() => {
    if (allImages.length <= 1) return;
    setActiveIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  // Autoplay functionality
  useEffect(() => {
    if (allImages.length <= 1 || isHovered || isLightboxOpen) return;
    const interval = setInterval(() => {
      handleNext();
    }, 4000);
    return () => clearInterval(interval);
  }, [allImages.length, isHovered, isLightboxOpen, handleNext]);

  if (allImages.length === 0) {
    const theme = getSportTheme(categoryName);
    const sportIcon = getSportLogo(categoryName);

    return (
      <div className={`relative w-full h-full overflow-hidden select-none ${className}`}>
        {/* Dynamic Athletic Sport Cover matching tournament cards */}
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient}`}>
          {/* Ambient Lighting & Glow */}
          <div
            className={`absolute -top-12 -right-12 w-72 h-72 rounded-full ${theme.glowColor} blur-3xl pointer-events-none`}
          />
          <div
            className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full bg-white/20 blur-3xl pointer-events-none"
          />
          <div
            className="absolute top-0 left-1/4 w-96 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"
          />

          {/* Geometric Sports Court / Arena Pattern */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            viewBox="0 0 400 200"
          >
            {/* Athletic Diagonal Sweep */}
            <line x1="-50" y1="250" x2="300" y2="-50" stroke="white" strokeOpacity="0.16" strokeWidth="40" />
            <line x1="0" y1="230" x2="350" y2="-50" stroke="white" strokeOpacity="0.12" strokeWidth="1.5" />
            
            {/* Court boundary line abstractions */}
            <circle cx="200" cy="100" r="60" stroke="white" strokeOpacity="0.14" strokeWidth="1.5" fill="none" />
            <line x1="200" y1="0" x2="200" y2="200" stroke="white" strokeOpacity="0.14" strokeWidth="1.5" strokeDasharray="6 4" />
            <rect x="25" y="20" width="350" height="160" rx="8" stroke="white" strokeOpacity="0.14" strokeWidth="1.5" fill="none" />
            
            {/* Dynamic Corner Accents */}
            <path d="M 25 45 L 25 20 L 50 20" stroke="white" strokeOpacity="0.25" strokeWidth="2" fill="none" />
            <path d="M 375 155 L 375 180 L 350 180" stroke="white" strokeOpacity="0.25" strokeWidth="2" fill="none" />
          </svg>

          {/* Large Athletic Sport Typography Watermark */}
          <div className="absolute inset-0 flex items-center justify-end pr-6 sm:pr-12 pointer-events-none overflow-hidden">
            <span className="text-5xl sm:text-7xl md:text-8xl font-black italic tracking-tighter text-white/[0.14] uppercase transform rotate-[-4deg] select-none whitespace-nowrap">
              {theme.watermarkText}
            </span>
          </div>

          {/* Sport Icon Watermark (Right aligned) */}
          {sportIcon && (
            <div className="absolute right-6 sm:right-16 top-1/2 -translate-y-1/2 w-28 h-28 sm:w-44 sm:h-44 opacity-[0.22] filter brightness-0 invert pointer-events-none transition-transform duration-700">
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
            <div className="flex flex-col items-center gap-2">
              <img
                src={BRAND.assets.logoFull}
                alt={`${BRAND.name} Cover`}
                className="w-40 sm:w-56 md:w-64 h-auto object-contain filter brightness-0 invert drop-shadow-[0_2px_14px_rgba(0,0,0,0.4)]"
              />
              <div className="flex items-center gap-2">
                <span className="w-8 h-px bg-white/50" />
                <span className="text-[10px] sm:text-xs font-bold tracking-[0.25em] text-white/90 uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
                  {categoryName || BRAND.name}
                </span>
                <span className="w-8 h-px bg-white/50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`relative overflow-hidden group select-none cursor-pointer ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsLightboxOpen(true)}
      >
        {/* Slides Container */}
        <div
          className="flex w-full h-full transition-transform duration-[800ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {allImages.map((src, idx) => (
            <div key={idx} className="w-full h-full flex-shrink-0 relative overflow-hidden flex items-center justify-center">
              {/* Sharp crisp full-size dynamic height image */}
              <img
                src={src}
                alt={translate('slideImageAlt', { index: idx + 1 })}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Zoom Hint Badge on Hover */}
        <div className="absolute top-4 right-4 z-10 hidden sm:flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-white/10 shadow-md">
          <ZoomIn className="w-3.5 h-3.5 text-white" />
          <span>{translate('galleryZoomHint')}</span>
        </div>

        {/* Navigation Arrows */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/75 border border-white/10 hover:border-white/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0 cursor-pointer backdrop-blur-sm shadow-lg z-20"
              aria-label={translate('previousImage')}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/75 border border-white/10 hover:border-white/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 cursor-pointer backdrop-blur-sm shadow-lg z-20"
              aria-label={translate('nextImage')}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Dot Indicators */}
        {allImages.length > 1 && (
          <div
            className="absolute bottom-6 left-1/2 -translate-y-0 -translate-x-1/2 flex gap-2.5 z-20 bg-black/25 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/5"
            onClick={(e) => e.stopPropagation()}
          >
            {allImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === activeIndex ? 'w-6 bg-blue-500' : 'w-2 bg-white/40 hover:bg-white/80'
                }`}
                aria-label={translate('goToSlide', { index: idx + 1 })}
              ></button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <ImageLightboxModal
          images={allImages}
          initialIndex={activeIndex}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </>
  );
}
