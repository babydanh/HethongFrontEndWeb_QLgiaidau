'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Compass, Newspaper, Check, Trophy, ChevronRight, ChevronLeft, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSportLogo } from '@/constants/sports';
import { useAuthStore } from '@/lib/zustand/authStore';
import { categoriesApi } from '@/features/categories/api';
import type { Category } from '@/types/category';

export type MainViewMode = 'EXPLORE' | 'FEED';

interface LeftActionDockProps {
  categories?: Category[];
  selectedCategoryId?: string;
  onSelectCategory?: (id: string) => void;
  getCategoryLabel?: (cat: Category) => string;
  activeView?: MainViewMode;
  onSelectView?: (view: MainViewMode) => void;
}

const isHiddenPublicSport = (category: Category) => {
  const key = `${category.slug ?? ''} ${category.id ?? ''} ${category.name ?? ''}`.toLowerCase();
  return key.includes('table_tennis') || key.includes('table tennis') || key.includes('table-tennis') || key.includes('bóng bàn') || key.includes('bong ban');
};

export default function LeftActionDock({
  categories: propCategories,
  selectedCategoryId: propSelectedCategoryId,
  onSelectCategory,
  getCategoryLabel,
  activeView,
  onSelectView,
}: LeftActionDockProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();

  const [internalCategories, setInternalCategories] = useState<Category[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load categories if not provided through props
  useEffect(() => {
    if (propCategories && propCategories.length > 0) return;

    // Try reading cached categories first
    try {
      const cached = sessionStorage.getItem('homepage_categories_v6');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.data)) {
          setInternalCategories(parsed.data.filter((c: Category) => c.isActive !== false && !isHiddenPublicSport(c)));
          return;
        }
      }
    } catch {
      // ignore storage error
    }

    // Fetch from API
    categoriesApi.getCategories({ includeInactive: false })
      .then((res) => {
        const rawList: Category[] = Array.isArray(res) ? res : (res as unknown as { data?: Category[] })?.data ?? [];
        if (Array.isArray(rawList)) {
          const valid = rawList.filter((c: Category) => c.isActive !== false && !isHiddenPublicSport(c));
          setInternalCategories(valid);
        }
      })
      .catch(() => {
        // silent fallback
      });
  }, [propCategories]);

  const categories = (propCategories && propCategories.length > 0) ? propCategories : internalCategories;
  const urlSport = searchParams.get('sport') || '';
  const selectedCategoryId = propSelectedCategoryId !== undefined ? propSelectedCategoryId : urlSport;

  useEffect(() => {
    // Delay mount slightly so it smoothly animates in
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

  const isHomePage = pathname === '/';
  const isProfilePage = pathname.startsWith('/profile');

  // Route-aware click handlers
  const handleSelectCategory = (catId: string) => {
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
    if (!isHomePage) {
      router.push(catId ? `/?sport=${encodeURIComponent(catId)}` : '/');
    }
  };

  const handleSelectExplore = () => {
    if (onSelectView) {
      onSelectView('EXPLORE');
    }
    if (!isHomePage) {
      router.push('/');
    }
  };

  const handleSelectFeed = () => {
    if (onSelectView) {
      onSelectView('FEED');
    }
    if (!isHomePage) {
      router.push('/?view=feed');
    }
  };

  const handleSelectProfile = () => {
    if (isAuthenticated) {
      router.push('/profile');
    } else {
      router.push('/login?redirect=/profile');
    }
  };

  // Selected category info
  const activeCategory = categories.find((c) => c.id === selectedCategoryId);
  const activeSportLogo = activeCategory ? getSportLogo(activeCategory.name || activeCategory.slug) : null;
  const resolveCategoryLabel = (cat: Category) => {
    if (getCategoryLabel) return getCategoryLabel(cat);
    return cat.name;
  };

  const isExploreActive = isHomePage && (!activeView || activeView === 'EXPLORE');
  const isFeedActive = isHomePage && activeView === 'FEED';

  return (
    <AnimatePresence>
      {hasMounted && (
        <>
          {/* =========================================================
              1. MOBILE TRIGGER TAB (Nút bấm mũi tên sát mép trái trên điện thoại)
              ========================================================= */}
          <div className="fixed left-0 top-1/2 -translate-y-1/2 z-40 md:hidden">
            {!isMobileOpen && (
              <motion.button
                type="button"
                onClick={() => setIsMobileOpen(true)}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -10, opacity: 0 }}
                className="flex items-center justify-center w-6 h-12 rounded-r-xl bg-white border-y border-r border-slate-300 shadow-md text-slate-700 hover:text-blue-600 cursor-pointer active:scale-95 transition-all"
                title="Mở menu nhanh"
                aria-label="Mở menu điều hướng nhanh"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            )}
          </div>

          {/* Backdrop mờ nhẹ trên mobile khi mở dock */}
          {isMobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsMobileOpen(false);
                setIsHovered(false);
              }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-2xs z-40 md:hidden"
            />
          )}

          {/* =========================================================
              2. ACTION DOCK CONTAINER (Desktop: cố định; Mobile: trượt ra khi bấm mũi tên)
              ========================================================= */}
          <motion.aside
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{
              opacity: 1,
              x: 0,
              scale: 1,
            }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26, mass: 0.8 }}
            aria-label="Thanh điều hướng nhanh"
            className={`fixed left-3 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 p-1.5 rounded-2xl bg-white border border-slate-300/90 shadow-lg shadow-slate-900/10 ${
              isMobileOpen ? 'flex' : 'hidden md:flex'
            }`}
          >
            {/* Nút đóng dock trên Mobile */}
            <button
              type="button"
              onClick={() => {
                setIsMobileOpen(false);
                setIsHovered(false);
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center md:hidden text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer mb-1"
              title="Thu gọn"
              aria-label="Thu gọn"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* 1. ICON 1: MÔN THỂ THAO (Hiển thị khi có danh sách categories) */}
            {categories.length > 0 && (
              <div
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                    selectedCategoryId
                      ? 'bg-blue-50/50 text-blue-600 border border-blue-500 shadow-xs'
                      : 'bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-300 text-slate-600 hover:text-slate-900'
                  }`}
                  title={activeCategory ? resolveCategoryLabel(activeCategory) : 'Khám phá theo môn thể thao'}
                  aria-label="Khám phá theo môn thể thao"
                >
                  {activeSportLogo ? (
                    <span className="w-5 h-5 relative flex items-center justify-center">
                      <Image
                        src={activeSportLogo}
                        alt={activeCategory ? resolveCategoryLabel(activeCategory) : 'Môn thể thao'}
                        width={20}
                        height={20}
                        className={`w-5 h-5 object-contain transition-transform group-hover:scale-105 ${
                          selectedCategoryId ? '' : 'grayscale opacity-75 group-hover:grayscale-0 group-hover:opacity-100'
                        }`}
                      />
                    </span>
                  ) : (
                    <Trophy className={`w-4.5 h-4.5 transition-transform group-hover:scale-105 ${selectedCategoryId ? 'text-blue-600' : 'text-slate-600 group-hover:text-slate-900'}`} />
                  )}

                  {/* Active subtle dot indicator */}
                  {selectedCategoryId && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  )}
                </button>

                {/* Flyout Menu: Rõ nét, nền trắng sạch sẽ */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: -6, scale: 0.98 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -6, scale: 0.98 }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 w-48 bg-white rounded-xl border border-slate-300 shadow-xl shadow-slate-900/10 p-1.5 z-50"
                    >
                      <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Môn thể thao
                        </span>
                        {selectedCategoryId && (
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectCategory('');
                              setIsHovered(false);
                            }}
                            className="text-[10px] text-slate-500 hover:text-blue-600 font-medium cursor-pointer transition-colors"
                          >
                            Đặt lại
                          </button>
                        )}
                      </div>

                      {/* Danh sách môn */}
                      <div className="mt-1 space-y-0.5 max-h-60 overflow-y-auto no-scrollbar">
                        {/* Tất cả môn option */}
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectCategory('');
                            setIsHovered(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                            selectedCategoryId === ''
                              ? 'border-blue-500 text-blue-600 bg-blue-50/30 font-bold shadow-2xs'
                              : 'border-transparent text-slate-700 hover:text-slate-900 hover:border-slate-200 bg-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                              selectedCategoryId === '' ? 'border-blue-200 text-blue-600' : 'border-slate-200 text-slate-500 bg-slate-50'
                            }`}>
                              <Trophy className="w-3 h-3" />
                            </div>
                            <span>Tất cả môn</span>
                          </div>
                          {selectedCategoryId === '' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </button>

                        {categories.map((cat) => {
                          const isSelected = selectedCategoryId === cat.id;
                          const logo = getSportLogo(cat.name || cat.slug);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                handleSelectCategory(cat.id);
                                setIsHovered(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                                isSelected
                                  ? 'border-blue-500 text-blue-600 bg-blue-50/30 font-bold shadow-2xs'
                                  : 'border-transparent text-slate-700 hover:text-slate-900 hover:border-slate-200 bg-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                                  isSelected ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 bg-slate-50'
                                }`}>
                                  {logo ? (
                                    <Image
                                      src={logo}
                                      alt={cat.name}
                                      width={12}
                                      height={12}
                                      className="w-3.5 h-3.5 object-contain"
                                    />
                                  ) : (
                                    <Trophy className="w-3 h-3 text-slate-500" />
                                  )}
                                </div>
                                <span>{resolveCategoryLabel(cat)}</span>
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
            )}

            {/* 2. ICON 2: KHÁM PHÁ (Trang chủ Khám phá) */}
            <button
              type="button"
              onClick={handleSelectExplore}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group relative ${
                isExploreActive
                  ? 'bg-blue-50/50 text-blue-600 border border-blue-500 shadow-xs'
                  : 'bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-300 text-slate-600 hover:text-slate-900'
              }`}
              title="Khám phá giải đấu & trận đấu"
              aria-label="Khám phá"
            >
              <Compass className={`w-4.5 h-4.5 transition-transform group-hover:scale-105 ${isExploreActive ? 'text-blue-600' : 'text-slate-600 group-hover:text-slate-900'}`} />
              <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-50">
                Khám phá
              </span>
            </button>

            {/* 3. ICON 3: BẢNG TIN & HOẠT ĐỘNG PLAYER */}
            <button
              type="button"
              onClick={handleSelectFeed}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group relative ${
                isFeedActive
                  ? 'bg-blue-50/50 text-blue-600 border border-blue-500 shadow-xs'
                  : 'bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-300 text-slate-600 hover:text-slate-900'
              }`}
              title="Bảng tin & Hoạt động người chơi"
              aria-label="Bảng tin & Hoạt động"
            >
              <Newspaper className={`w-4.5 h-4.5 transition-transform group-hover:scale-105 ${isFeedActive ? 'text-blue-600' : 'text-slate-600 group-hover:text-slate-900'}`} />
              <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-50">
                Bảng tin & Hoạt động
              </span>
            </button>

            {/* Phân cách nhẹ nhàng */}
            <div className="w-6 h-[1px] bg-slate-200 my-0.5" />

            {/* 4. ICON 4: PROFILE CÁ NHÂN */}
            <button
              type="button"
              onClick={handleSelectProfile}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group relative ${
                isProfilePage
                  ? 'bg-blue-50/50 text-blue-600 border border-blue-500 shadow-xs'
                  : 'bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-300 text-slate-600 hover:text-slate-900'
              }`}
              title="Hồ sơ cá nhân"
              aria-label="Hồ sơ cá nhân"
            >
              <User className={`w-4.5 h-4.5 transition-transform group-hover:scale-105 ${isProfilePage ? 'text-blue-600' : 'text-slate-600 group-hover:text-slate-900'}`} />
              <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-50">
                Hồ sơ cá nhân
              </span>
            </button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

