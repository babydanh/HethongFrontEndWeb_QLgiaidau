'use client';

import { useState, useEffect, useRef } from 'react';
import { Tournament } from '@/features/tournaments/api';
import Link from 'next/link';
import { Calendar, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { getSportLogo } from '@/constants/sports';
import { shouldHideFeaturedCardText } from '@/features/tournaments/featured-banner';

interface Props {
  tournaments: Tournament[];
  heightClass?: string;
}

/** Countdown — chỉ hiện ngày (dùng cho banner trang chủ) */
function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [text, setText] = useState('');
  useEffect(() => {
    const update = () => {
      const days = Math.floor((new Date(targetDate).getTime() - Date.now()) / 86400000);
      if (days <= 0) { setText('Đang mở đăng ký'); return; }
      setText(`Còn ${days} ngày`);
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [targetDate]);
  if (!text) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-semibold whitespace-nowrap">
      ⏳ {text}
    </span>
  );
}

export default function TournamentHeroBanner({ tournaments, heightClass = 'h-[280px] md:h-[420px] lg:h-[460px]' }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideWidth, setSlideWidth] = useState(95);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const isDraggingRef = useRef(false);
  const startX = useRef(0);
  const dragDistance = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      setSlideWidth(window.innerWidth >= 768 ? 96.5 : 92);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto slide interval
  useEffect(() => {
    if (tournaments.length <= 1 || isDragging) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tournaments.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [tournaments.length, isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    startX.current = e.pageX;
    dragDistance.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const deltaX = e.pageX - startX.current;
    setDragOffset(deltaX);
    dragDistance.current = Math.abs(deltaX);
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    const deltaX = dragOffset;
    setDragOffset(0);

    // Swipe logic threshold: if dragged more than 50px, switch banner
    let nextIndex = currentIndex;
    if (deltaX < -50 && currentIndex < tournaments.length - 1) {
      nextIndex = currentIndex + 1;
    } else if (deltaX > 50 && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    }
    setCurrentIndex(nextIndex);
  };

  const handleMouseLeave = () => {
    if (isDraggingRef.current) {
      handleMouseUp();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      isDraggingRef.current = true;
      setIsDragging(true);
      startX.current = e.touches[0].pageX;
      dragDistance.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length === 0) return;
    const deltaX = e.touches[0].pageX - startX.current;
    setDragOffset(deltaX);
    dragDistance.current = Math.abs(deltaX);
  };

  const handleTouchEnd = () => {
    if (isDraggingRef.current) {
      handleMouseUp();
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    // If the user dragged more than 10px, prevent click navigation
    if (dragDistance.current > 10) {
      e.preventDefault();
    }
  };

  if (!tournaments || tournaments.length === 0) {
    return (
      <div className={`w-full ${heightClass} rounded-[20px] bg-[#a9c9fb] flex flex-col justify-center items-center text-center p-8 md:p-14 shadow-lg shadow-blue-500/15 relative overflow-hidden min-h-[300px] md:min-h-[400px]`}>
        {/* Faint racket + shuttlecock background icon watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] md:w-[600px] h-[350px] md:h-[600px] opacity-[0.16] pointer-events-none z-0">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Racket */}
            <g transform="translate(30,20) rotate(-18 80 80)">
              <ellipse cx="80" cy="60" rx="46" ry="56" fill="none" stroke="white" strokeWidth="6"/>
              {/* Strings */}
              <g stroke="white" strokeWidth="1.4" opacity="0.9">
                <line x1="80" y1="8" x2="80" y2="112"/>
                <line x1="60" y1="10" x2="60" y2="108"/>
                <line x1="100" y1="10" x2="100" y2="108"/>
                <line x1="42" y1="20" x2="42" y2="96"/>
                <line x1="118" y1="20" x2="118" y2="96"/>
                <line x1="36" y1="60" x2="124" y2="60"/>
                <line x1="38" y1="40" x2="122" y2="40"/>
                <line x1="38" y1="80" x2="122" y2="80"/>
                <line x1="46" y1="24" x2="114" y2="24"/>
                <line x1="46" y1="96" x2="114" y2="96"/>
              </g>
              {/* Shaft */}
              <rect x="74" y="112" width="12" height="70" rx="5" fill="white"/>
              {/* Handle */}
              <rect x="70" y="176" width="20" height="34" rx="7" fill="white"/>
            </g>
            {/* Shuttlecock */}
            <g transform="translate(128,118) rotate(20)">
              <circle cx="0" cy="0" r="9" fill="white"/>
              <path d="M -7 -4 L -26 -34 L -20 -36 L -2 -8 Z" fill="white" opacity="0.95"/>
              <path d="M 0 -8 L 0 -40 L 6 -40 L 6 -8 Z" fill="white" opacity="0.95"/>
              <path d="M 7 -4 L 26 -34 L 20 -36 L 2 -8 Z" fill="white" opacity="0.95"/>
              <path d="M -5 -6 L -14 -30 L -10 -31 L -2 -8 Z" fill="white" opacity="0.7"/>
              <path d="M 5 -6 L 14 -30 L 10 -31 L 2 -8 Z" fill="white" opacity="0.7"/>
            </g>
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-[520px] flex flex-col items-center">
          <span className="inline-block text-[12px] font-bold tracking-[0.14em] uppercase text-[#1d5fe0] bg-white/70 border border-[#1d5fe0]/20 px-3.5 py-1.5 rounded-full mb-5 shadow-sm">
            Cầu lông
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f1b33] mb-4 tracking-tight leading-snug">
            Chưa Có Giải Đấu Nào Sắp Diễn Ra
          </h1>
          <p className="text-sm md:text-base leading-relaxed text-[#5b6b85] font-normal">
            Hãy theo dõi trang để cập nhật thông tin về các giải đấu tennis, pickleball và cầu lông mới nhất sắp sửa diễn ra.
          </p>
        </div>
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + tournaments.length) % tournaments.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % tournaments.length);
  };

  const getGradientBg = (name?: string) => {
    const term = (name || '').toLowerCase();
    if (term.includes('tennis')) {
      return 'from-emerald-955 via-slate-955 to-indigo-950';
    }
    if (term.includes('pickleball')) {
      return 'from-amber-955 via-slate-955 to-rose-950';
    }
    if (term.includes('badminton') || term.includes('lông')) {
      return 'from-blue-955 via-slate-955 to-violet-950';
    }
    return 'from-indigo-955 via-slate-955 to-slate-955';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTRATION_OPEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] uppercase font-bold bg-emerald-500 text-white shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            Mở Đăng Ký
          </span>
        );
      case 'REGISTRATION_CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] uppercase font-bold bg-amber-600 text-white shadow-sm">
            Đóng Đăng Ký
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] uppercase font-bold bg-blue-600 text-white shadow-sm">
            Sắp Diễn Ra
          </span>
        );
    }
  };

  return (
    <div className="relative w-full select-none group overflow-hidden rounded-lg">
      {/* Slider Wrapper */}
      <div 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDragStart={(e) => e.preventDefault()}
        className="flex py-1 cursor-grab active:cursor-grabbing touch-pan-y"
        style={{
          transform: `translateX(calc(-${currentIndex * slideWidth}% + ${dragOffset}px))`,
          transition: isDragging ? 'none' : 'transform 750ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {tournaments.map((tournament, idx) => {
          const isActive = idx === currentIndex;
          const hideFeaturedCardText = shouldHideFeaturedCardText(tournament);
          return (
            <div 
              key={tournament.id} 
              className="shrink-0 pr-3"
              style={{
                width: `${slideWidth}%`,
              }}
            >
              <div className={`w-full ${heightClass} rounded-lg relative overflow-hidden border border-slate-205 dark:border-slate-800 shadow-md bg-slate-950 transition-all duration-500 ${isActive ? 'scale-[1] opacity-100' : 'scale-[0.985] opacity-90'}`}>
                {/* Background Image / Gradient */}
                <div className="absolute inset-0 transition-transform duration-1000 ease-out transform scale-100 group-hover:scale-105">
                  {tournament.bannerUrl ? (
                    <img
                      src={tournament.bannerUrl}
                      alt={tournament.name}
                      className="w-full h-full object-cover"
                      draggable="false"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-950 flex items-center justify-center relative overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-tr ${getGradientBg(tournament.category?.name)} opacity-30`} />
                      <img
                        src="/sporto_v1\.svg"
                        alt="Sporto Logo"
                        className="w-48 h-auto object-contain relative z-10 opacity-75"
                        draggable="false"
                      />
                    </div>
                  )}
                  {!hideFeaturedCardText && (
                    <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/65 via-black/30 to-transparent" />
                  )}
                </div>

                {/* Clickable Overlay for the whole card */}
                <Link 
                  href={`/tournaments/${tournament.id}`} 
                  onClick={handleLinkClick}
                  className="absolute inset-0 z-10" 
                />

                {!hideFeaturedCardText && (
                <div className="absolute bottom-4 left-5 right-5 z-20 pointer-events-none max-w-xl flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    {tournament.category?.name && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-300 font-sans [text-shadow:_0_1px_2px_rgba(0,0,0,0.8)]">
                        {(() => {
                          const logo = getSportLogo(tournament.category?.name);
                          return logo ? (
                            <img src={logo} alt={tournament.category?.name || ''} className="w-3.5 h-3.5 object-contain brightness-150 drop-shadow" />
                          ) : null;
                        })()}
                        {tournament.category.name}
                      </span>
                    )}
                    {getStatusBadge(tournament.status)}
                  </div>

                  <h2 className="text-base md:text-xl font-bold text-white tracking-tight leading-tight line-clamp-1 [text-shadow:_0_1.5px_4px_rgba(0,0,0,0.85)]">
                    {tournament.name}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-100 font-medium [text-shadow:_0_1px_3px_rgba(0,0,0,0.85)]">
                    {tournament.startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 inline-block drop-shadow" /> {new Date(tournament.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        {tournament.endDate && ` - ${new Date(tournament.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`}
                      </span>
                    )}
                    {tournament.status === 'UPCOMING' && tournament.registrationStartDate && (
                      <CountdownTimer targetDate={tournament.registrationStartDate} />
                    )}
                    {tournament.locationAddress && (
                      <span className="flex items-center gap-1 line-clamp-1">
                        <MapPin className="w-3 h-3 inline-block drop-shadow" /> {tournament.locationAddress.split(',').slice(-2).join(',').trim()}
                      </span>
                    )}
                  </div>
                </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide Navigation Controls */}
      {tournaments.length > 1 && (
        <>
          {/* Arrow Left */}
          <button
            onClick={handlePrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-white/80 hover:bg-white border border-slate-200 text-slate-800 shadow-md cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-20"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {/* Arrow Right */}
          <button
            onClick={handleNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-white/80 hover:bg-white border border-slate-200 text-slate-800 shadow-md cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-20"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Dots Indicators */}
          <div className="absolute bottom-6 right-10 flex items-center gap-1.5 z-20">
            {tournaments.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentIndex ? 'w-5 bg-blue-600' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

