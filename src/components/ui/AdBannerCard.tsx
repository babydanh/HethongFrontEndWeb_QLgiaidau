'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import {
  advertisementsApi,
  type AdPlacementSlot,
  type Advertisement,
} from '@/features/advertisements/api';

export interface AdBannerProps {
  slot?: AdPlacementSlot;
  /** Category context for sport-targeted banners; omitted means global-only. */
  categoryId?: string;
  variant?: 'sidebar' | 'horizontal' | 'inline';
  imageUrl?: string;
  href?: string;
  title?: string;
  sponsor?: string;
  description?: string;
  ctaText?: string;
  badgeLabel?: string;
  className?: string;
  customHtml?: string;
  onClick?: () => void;
}

const ROTATION_INTERVAL_MS = 6000;
const ACTIVE_BANNERS_REFRESH_INTERVAL_MS = 60000;

export function AdBannerCard({
  slot,
  categoryId,
  variant = 'sidebar',
  title,
  href: staticHref,
  imageUrl: staticImageUrl,
  badgeLabel,
  className = '',
  customHtml: staticCustomHtml,
  onClick,
}: AdBannerProps) {
  const translate = useTranslations('Advertisements');
  const resolvedTitle = title || translate('defaultTitle');
  const resolvedBadgeLabel = badgeLabel || translate('badge');
  const [banners, setBanners] = useState<Advertisement[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasLoaded, setHasLoaded] = useState<boolean>(!slot);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const viewedBannerIds = useRef(new Set<string>());
  const activeBannerId = useRef<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- synchronize remote banner data with display state */
  useEffect(() => {
    if (!slot) {
      setHasLoaded(true);
      return;
    }

    let isMounted = true;
    let refreshTimer: number | undefined;
    viewedBannerIds.current.clear();
    activeBannerId.current = null;
    setHasLoaded(false);
    setBanners([]);
    setActiveIndex(0);

    const loadBanners = async (isInitialLoad: boolean) => {
      try {
        const items = await advertisementsApi.getActiveBySlot(slot, categoryId);
        if (!isMounted) return;
        const nextBanners = Array.isArray(items) ? items : [];
        setBanners(nextBanners);
        setActiveIndex((currentIndex) => {
          if (isInitialLoad || nextBanners.length === 0) return 0;
          const preservedIndex = activeBannerId.current
            ? nextBanners.findIndex((banner) => banner.id === activeBannerId.current)
            : -1;
          return preservedIndex >= 0
            ? preservedIndex
            : Math.min(currentIndex, nextBanners.length - 1);
        });
        if (isInitialLoad) setHasLoaded(true);
      } catch {
        if (!isMounted || !isInitialLoad) return;
        setBanners([]);
        setActiveIndex(0);
        setHasLoaded(true);
      }
    };

    const scheduleRefresh = () => {
      if (!isMounted) return;
      refreshTimer = window.setTimeout(async () => {
        if (!document.hidden) await loadBanners(false);
        scheduleRefresh();
      }, ACTIVE_BANNERS_REFRESH_INTERVAL_MS);
    };

    void loadBanners(true).finally(scheduleRefresh);

    return () => {
      isMounted = false;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
    };
  }, [slot, categoryId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const activeBanner = slot ? banners[activeIndex] || null : null;
  useEffect(() => {
    activeBannerId.current = activeBanner?.id || null;
  }, [activeBanner]);

  const hasCarousel = Boolean(slot && activeBanner && banners.length > 1);
  const isRotationPaused = isPaused || (isHovering && hoverPaused) || focusPaused;
  const isHorizontal = variant === 'horizontal';
  const aspectRatioClass = isHorizontal
    ? 'aspect-[3.5/1] sm:aspect-[4.5/1] md:aspect-[5.5/1]'
    : 'aspect-[4/3]';

  useEffect(() => {
    if (!hasCarousel || isRotationPaused) return;
    const timer = window.setInterval(() => {
      if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      setActiveIndex((current) => (current + 1) % banners.length);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [banners.length, hasCarousel, isRotationPaused]);

  useEffect(() => {
    if (!activeBanner || viewedBannerIds.current.has(activeBanner.id)) return;
    viewedBannerIds.current.add(activeBanner.id);
    void advertisementsApi.recordView(activeBanner.id);
  }, [activeBanner]);

  if (slot && (!hasLoaded || !activeBanner)) {
    return null;
  }

  const handleClick = (banner?: Advertisement) => {
    if (banner) void advertisementsApi.recordClick(banner.id);
    onClick?.();
  };

  const renderBannerContent = (
    banner: Advertisement | null,
    options?: { isStatic?: boolean; fillTrack?: boolean },
  ) => {
    const isStatic = options?.isStatic ?? false;
    const fillTrack = options?.fillTrack ?? false;
    const contentClassName = fillTrack ? '' : className;
    const currentImageUrl = banner ? banner.imageUrl || undefined : staticImageUrl;
    const currentCustomHtml = banner?.bannerType === 'CUSTOM_HTML'
      ? banner.customHtml
      : isStatic
        ? staticCustomHtml
        : undefined;
    const currentHref = banner ? banner.targetUrl?.trim() || undefined : staticHref?.trim() || undefined;
    const isExternal = Boolean(currentHref && (currentHref.startsWith('http://') || currentHref.startsWith('https://')));

    if (currentCustomHtml) {
      return (
        <div
          onClick={() => handleClick(banner || undefined)}
          className={`w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xs ${fillTrack ? 'h-full' : ''} ${contentClassName}`}
          dangerouslySetInnerHTML={{ __html: currentCustomHtml }}
        />
      );
    }

    if (!currentImageUrl) return null;

    const content = (
      <div
        onClick={currentHref ? () => handleClick(banner || undefined) : undefined}
        className={`group relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-xs transition-all duration-300 hover:border-slate-300 hover:shadow-md ${fillTrack ? 'h-full' : aspectRatioClass} ${contentClassName}`}
      >
        <img
          src={currentImageUrl}
          alt={banner?.title || resolvedTitle}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102 motion-reduce:transform-none"
        />
        <span className="absolute right-2.5 top-2.5 select-none rounded border border-white/10 bg-black/45 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90 shadow-xs backdrop-blur-xs">
          {resolvedBadgeLabel}
        </span>
      </div>
    );

    if (!currentHref) return content;

    return isExternal ? (
      <a href={currentHref} target="_blank" rel="noopener noreferrer sponsored" className="block h-full w-full focus:outline-hidden">
        {content}
      </a>
    ) : (
      <Link href={currentHref} className="block h-full w-full focus:outline-hidden">
        {content}
      </Link>
    );
  };

  const move = (direction: 'previous' | 'next') => {
    setActiveIndex((current) => {
      if (direction === 'previous') return (current - 1 + banners.length) % banners.length;
      return (current + 1) % banners.length;
    });
  };

  if (!slot) {
    return renderBannerContent(null, { isStatic: true });
  }

  return (
    <div
      role={hasCarousel ? 'region' : undefined}
      aria-roledescription={hasCarousel ? 'carousel' : undefined}
      aria-label={hasCarousel ? translate('carouselLabel') : undefined}
      onMouseEnter={() => {
        setIsHovering(true);
        setHoverPaused(true);
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        setHoverPaused(false);
      }}
      onFocus={() => {
        if (hasCarousel) setFocusPaused(true);
      }}
      onKeyDown={(event) => {
        if (!hasCarousel) return;
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          move('previous');
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          move('next');
        }
      }}
      className={`relative w-full rounded-2xl focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${className}`}
    >
      {hasCarousel && (
        <button
          type="button"
          aria-label={isRotationPaused ? translate('play') : translate('pause')}
          onClick={() => {
            if (isRotationPaused) {
              setIsPaused(false);
              setHoverPaused(false);
              setFocusPaused(false);
            } else {
              setIsPaused(true);
            }
          }}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-slate-900/55 text-white shadow-md backdrop-blur-sm transition hover:bg-slate-900/80 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
        >
          {isRotationPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
        </button>
      )}
      <div className={`w-full overflow-hidden rounded-2xl ${aspectRatioClass}`}>
        <div
          className="flex h-full w-full transition-transform duration-300 ease-[cubic-bezier(0.77,0,0.175,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              role={hasCarousel ? 'group' : undefined}
              aria-roledescription={hasCarousel ? translate('slideRole') : undefined}
              aria-label={hasCarousel ? translate('slide', { current: index + 1, total: banners.length }) : undefined}
              aria-hidden={index !== activeIndex}
              inert={index !== activeIndex ? true : undefined}
              className="h-full min-w-full flex-none"
            >
              {renderBannerContent(banner, { fillTrack: true })}
            </div>
          ))}
        </div>
      </div>

      {hasCarousel && (
        <>
          <span className="sr-only" aria-live={isRotationPaused ? 'polite' : 'off'}>
            {translate('slide', { current: activeIndex + 1, total: banners.length })}
          </span>
          <div className="pointer-events-none absolute inset-x-2 top-1/2 flex -translate-y-1/2 justify-between">
            <button
              type="button"
              aria-label={translate('previous')}
              onClick={() => move('previous')}
              className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-slate-900/55 text-white shadow-md backdrop-blur-sm transition hover:bg-slate-900/80 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={translate('next')}
              onClick={() => move('next')}
              className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-slate-900/55 text-white shadow-md backdrop-blur-sm transition hover:bg-slate-900/80 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div
            role="group"
            aria-label={translate('chooseSlide')}
            className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/45 px-2 py-1 backdrop-blur-sm"
          >
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                aria-label={translate('slide', { current: index + 1, total: banners.length })}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => setActiveIndex(index)}
                className="group flex h-6 w-6 items-center justify-center rounded-full focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
              >
                <span
                  aria-hidden="true"
                  className={`block rounded-full transition-all motion-reduce:transition-none ${index === activeIndex ? 'h-1.5 w-5 bg-white' : 'h-1.5 w-1.5 bg-white/60 group-hover:bg-white'}`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default AdBannerCard;
