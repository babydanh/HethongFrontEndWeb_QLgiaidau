'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Compass, Newspaper, Check, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSportLogo } from '@/constants/sports';
import type { Category } from '@/types/category';

export type MainViewMode = 'EXPLORE' | 'FEED';

interface LeftActionDockProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  getCategoryLabel: (cat: Category) => string;
  activeView: MainViewMode;
  onSelectView: (view: MainViewMode) => void;
}

export default function LeftActionDock({
  categories,
  selectedCategoryId,
  onSelectCategory,
  getCategoryLabel,
  activeView,
  onSelectView,
}: LeftActionDockProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Delay mount slightly so it smoothly animates in after the initial bone/skeleton load
    const timer = setTimeout(() => {
      setHasMounted(true);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 180);
  };

  // Selected category info
  const activeCategory = categories.find((c) => c.id === selectedCategoryId);
  const activeSportLogo = activeCategory ? getSportLogo(activeCategory.name || activeCategory.slug) : null;

  return (
    <AnimatePresence>
      {hasMounted && (
        <motion.aside
          initial={{ opacity: 0, x: -24, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -24, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 350, damping: 26, mass: 0.8 }}
          aria-label="Thanh điều hướng nhanh"
          className="fixed left-3.5 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-3 p-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl shadow-slate-900/8"
        >
          {/* 1. ICON 1: MÔN THỂ THAO (Hover đụng vào là mở flyout môn) */}
          <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer relative group ${
                selectedCategoryId
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-100/90 hover:bg-blue-50 text-slate-700 hover:text-blue-600'
              }`}
              title={activeCategory ? getCategoryLabel(activeCategory) : 'Khám phá theo môn thể thao'}
              aria-label="Khám phá theo môn thể thao"
            >
              {activeSportLogo ? (
                <span className="w-5 h-5 relative flex items-center justify-center">
                  <Image
                    src={activeSportLogo}
                    alt={activeCategory ? getCategoryLabel(activeCategory) : 'Môn thể thao'}
                    width={20}
                    height={20}
                    className="w-5 h-5 object-contain brightness-0 invert"
                  />
                </span>
              ) : (
                <Trophy className={`w-5 h-5 ${selectedCategoryId ? 'text-white' : 'text-slate-700 group-hover:text-blue-600'}`} />
              )}

              {/* Active dot badge if filtered */}
              {selectedCategoryId && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
              )}
            </button>

            {/* Flyout Menu: Hiện ra mượt mà khi hover đụng vào */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: -8, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute left-full ml-3 top-1/2 -translate-y-1/2 w-52 bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-2 z-50"
                >
                  <div className="px-3 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Môn thể thao
                    </span>
                    {selectedCategoryId && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCategory('');
                          setIsHovered(false);
                        }}
                        className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        Tất cả
                      </button>
                    )}
                  </div>

                  {/* Tất cả môn option */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory('');
                      setIsHovered(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      selectedCategoryId === ''
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                        <Trophy className="w-3.5 h-3.5" />
                      </div>
                      <span>Tất cả môn</span>
                    </div>
                    {selectedCategoryId === '' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>

                  {/* Sport Items */}
                  <div className="mt-1 space-y-0.5 max-h-60 overflow-y-auto no-scrollbar">
                    {categories.map((cat) => {
                      const isSelected = selectedCategoryId === cat.id;
                      const logo = getSportLogo(cat.name || cat.slug);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            onSelectCategory(cat.id);
                            setIsHovered(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 text-blue-700 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                              {logo ? (
                                <Image
                                  src={logo}
                                  alt={cat.name}
                                  width={14}
                                  height={14}
                                  className="w-3.5 h-3.5 object-contain"
                                />
                              ) : (
                                <Trophy className="w-3.5 h-3.5 text-slate-500" />
                              )}
                            </div>
                            <span>{getCategoryLabel(cat)}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 2. ICON 2: KHÁM PHÁ (Trang chủ Khám phá) */}
          <button
            type="button"
            onClick={() => onSelectView('EXPLORE')}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeView === 'EXPLORE'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-100/90 hover:bg-blue-50 hover:text-blue-600 text-slate-700'
            }`}
            title="Khám phá giải đấu & trận đấu"
            aria-label="Khám phá"
          >
            <Compass className={`w-5 h-5 group-hover:scale-110 transition-transform ${activeView === 'EXPLORE' ? 'text-white' : 'text-slate-700 group-hover:text-blue-600'}`} />
            <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-50">
              Khám phá
            </span>
          </button>

          {/* 3. ICON 3: BẢNG TIN & HOẠT ĐỘNG PLAYER (Social Feed) */}
          <button
            type="button"
            onClick={() => onSelectView('FEED')}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeView === 'FEED'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-100/90 hover:bg-blue-50 hover:text-blue-600 text-slate-700'
            }`}
            title="Bảng tin & Hoạt động người chơi"
            aria-label="Bảng tin & Hoạt động"
          >
            <Newspaper className={`w-5 h-5 group-hover:scale-110 transition-transform ${activeView === 'FEED' ? 'text-white' : 'text-slate-700 group-hover:text-blue-600'}`} />
            <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-50">
              Bảng tin & Hoạt động
            </span>
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
