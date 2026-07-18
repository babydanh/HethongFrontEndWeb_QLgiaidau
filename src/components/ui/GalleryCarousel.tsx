'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface GalleryCarouselProps {
  images?: string[];
  defaultBanner?: string;
  className?: string;
}

export default function GalleryCarousel({ images = [], defaultBanner, className = '' }: GalleryCarouselProps) {
  const allImages = [
    ...(defaultBanner ? [defaultBanner] : []),
    ...images.filter((img) => img !== defaultBanner)
  ];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

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
    if (allImages.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      handleNext();
    }, 4000);
    return () => clearInterval(interval);
  }, [allImages.length, isHovered, handleNext]);

  if (allImages.length === 0) {
    return (
      <div className={`w-full bg-gradient-to-br from-blue-650 via-indigo-700 to-slate-900 flex flex-col items-center justify-center text-white gap-3 relative overflow-hidden ${className}`}>
        {/* Decorative background branding circles */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center gap-1">
          <div className="bg-white/10 p-4 rounded-full border border-white/10 backdrop-blur-md shadow-lg mb-1 animate-pulse">
            <ImageIcon className="w-8 h-8 text-blue-200" />
          </div>
          <span className="text-lg font-black tracking-widest text-white/90 uppercase">VNDC SPORT</span>
          <span className="text-[10px] tracking-wide text-blue-200/70 font-semibold">HỆ THỐNG QUẢN LÝ GIẢI ĐẤU CHUYÊN NGHIỆP</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden group select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
              alt={`Slide ${idx + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {allImages.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/75 border border-white/10 hover:border-white/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0 cursor-pointer backdrop-blur-sm shadow-lg"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/75 border border-white/10 hover:border-white/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 cursor-pointer backdrop-blur-sm shadow-lg"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {allImages.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-y-0 -translate-x-1/2 flex gap-2.5 z-10 bg-black/25 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/5">
          {allImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === activeIndex ? 'w-6 bg-blue-500' : 'w-2 bg-white/40 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            ></button>
          ))}
        </div>
      )}
    </div>
  );
}
