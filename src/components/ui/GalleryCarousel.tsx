'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface GalleryCarouselProps {
  images?: string[];
  defaultBanner?: string;
  className?: string;
}

export default function GalleryCarousel({ images = [], defaultBanner, className = '' }: GalleryCarouselProps) {
  const allImages = images.length > 0 ? images : (defaultBanner ? [defaultBanner] : []);
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
      <div className={`w-full bg-slate-900 flex flex-col items-center justify-center text-slate-500 gap-2 ${className}`}>
        <ImageIcon className="w-12 h-12 text-slate-700" />
        <span className="text-xs font-semibold">Không có hình ảnh nào</span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden group select-none bg-slate-950 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides Container */}
      <div 
        className="flex h-full w-full transition-transform duration-[800ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {allImages.map((src, idx) => (
          <div key={idx} className="w-full h-full flex-shrink-0 relative flex items-center justify-center overflow-hidden bg-slate-950">
            {/* Blurred background backdrop to fill empty aspect ratio spaces */}
            <div 
              className="absolute inset-0 w-full h-full bg-cover bg-center blur-2xl opacity-35 scale-110 pointer-events-none"
              style={{ backgroundImage: `url(${src})` }}
            />
            
            {/* Sharp crisp centered image with drop shadow and border */}
            <img
              src={src}
              alt={`Slide ${idx + 1}`}
              className="relative z-10 max-w-[92%] max-h-[88%] object-contain rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-white/15 transition-transform duration-[4000ms] ease-out group-hover:scale-[1.01]"
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/30 pointer-events-none"></div>
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
