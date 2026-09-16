'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trophy, Flame, Compass, Check } from 'lucide-react';
import { getSportLogo } from '@/constants/sports';
import type { Category } from '@/types/category';

interface LeftActionDockProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  getCategoryLabel: (cat: Category) => string;
  onScrollToPickups?: () => void;
}

export default function LeftActionDock({
  categories,
  selectedCategoryId,
  onSelectCategory,
  getCategoryLabel,
  onScrollToPickups,
}: LeftActionDockProps) {
  const [isSportsFlyoutOpen, setIsSportsFlyoutOpen] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);

  // Close flyout on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (flyoutRef.current && !flyoutRef.current.contains(event.target as Node)) {
        setIsSportsFlyoutOpen(false);
      }
    }
    if (isSportsFlyoutOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSportsFlyoutOpen]);

  // Selected category info
  const activeCategory = categories.find((c) => c.id === selectedCategoryId);
  const activeSportLogo = activeCategory ? getSportLogo(activeCategory.name || activeCategory.slug) : null;

  return (
    <aside
      aria-label="Thanh điều hướng nhanh"
      className="fixed left-3 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-3 p-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-lg shadow-slate-900/5 transition-all"
    >
      {/* 1. ICON 1: MÔN THỂ THAO (Sports Switcher) */}
      <div className="relative" ref={flyoutRef}>
        <button
          type="button"
          onClick={() => setIsSportsFlyoutOpen((prev) => !prev)}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer relative group ${
            selectedCategoryId
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400/30'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
          title={activeCategory ? getCategoryLabel(activeCategory) : 'Chọn môn thể thao'}
          aria-label="Chọn môn thể thao"
          aria-expanded={isSportsFlyoutOpen}
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
            <Trophy className={`w-5 h-5 ${selectedCategoryId ? 'text-white' : 'text-slate-700'}`} />
          )}

          {/* Active dot badge if filtered */}
          {selectedCategoryId && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
          )}

          {/* Tooltip on hover when flyout is closed */}
          {!isSportsFlyoutOpen && (
            <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-50">
              {activeCategory ? getCategoryLabel(activeCategory) : 'Môn thể thao'}
            </span>
          )}
        </button>

        {/* Flyout Menu (Pop ra bên phải) */}
        {isSportsFlyoutOpen && (
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 w-52 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Môn thể thao
              </span>
              {selectedCategoryId && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectCategory('');
                    setIsSportsFlyoutOpen(false);
                  }}
                  className="text-[11px] text-blue-600 hover:underline font-semibold"
                >
                  Xoá lọc
                </button>
              )}
            </div>

            {/* All Sports option */}
            <button
              type="button"
              onClick={() => {
                onSelectCategory('');
                setIsSportsFlyoutOpen(false);
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
            <div className="mt-1 space-y-0.5">
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                const logo = getSportLogo(cat.name || cat.slug);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.id);
                      setIsSportsFlyoutOpen(false);
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
          </div>
        )}
      </div>

      {/* 2. ICON 2: HOẠT ĐỘNG & KÈO GIAO LƯU (Activity / Pickup Sessions) */}
      <button
        type="button"
        onClick={onScrollToPickups}
        className="w-11 h-11 rounded-full flex items-center justify-center bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 transition-all cursor-pointer group relative"
        title="Kèo giao lưu thể thao"
        aria-label="Kèo giao lưu thể thao"
      >
        <Flame className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
        <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-50">
          Kèo giao lưu
        </span>
      </button>

      {/* 3. ICON 3: BẢNG TIN CỘNG ĐỒNG (Community Feed) */}
      <Link
        href="/communities"
        className="w-11 h-11 rounded-full flex items-center justify-center bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-700 transition-all cursor-pointer group relative"
        title="Bảng tin cộng đồng"
        aria-label="Bảng tin cộng đồng"
      >
        <Compass className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
        <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-50">
          Bảng tin cộng đồng
        </span>
      </Link>
    </aside>
  );
}
