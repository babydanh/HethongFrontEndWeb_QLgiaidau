'use client';

import { useState, useEffect, useRef } from 'react';
import { Tournament } from '@/features/tournaments/api';
import Link from 'next/link';
import { Calendar, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { getSportLogo } from '@/constants/sports';

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
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-semibold whitespace-nowrap">
      ⏳ {text}
    </span>
  );
}

export default function TournamentHeroBanner({ tournaments, heightClass = 'h-[250px] md:h-[350px]' }: Props) {
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
      <div className={`w-full ${heightClass} rounded-2xl bg-gradient-to-br from-blue-50/80 via-white to-sky-50/80 flex flex-col justify-center items-center text-center p-8 border border-blue-100/80 shadow-sm relative overflow-hidden group`}>
        {/* Background Sports Decorative Watermarks */}
        <div className="absolute -left-6 -bottom-6 w-36 h-36 opacity-[0.07] text-blue-600 pointer-events-none transform -rotate-12">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="9" r="6" />
            <path d="M12 15v7M10 22h4" />
            <line x1="9" y1="9" x2="15" y2="9" />
            <line x1="12" y1="6" x2="12" y2="12" />
          </svg>
        </div>
        <div className="absolute -right-6 -top-6 w-44 h-44 opacity-[0.06] text-indigo-600 pointer-events-none transform rotate-45">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6L14 22h-4l-1.7-7A7.002 7.002 0 0 1 12 2z" />
            <line x1="8" y1="7" x2="16" y2="7" />
            <line x1="9" y1="10" x2="15" y2="10" />
          </svg>
        </div>

        {/* Center Icon Badge: Racket with Flying Shuttlecock / Ball */}
        <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 mb-4 group-hover:scale-110 transition-transform duration-300">
          <svg className="w-9 h-9" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* Racket Head */}
            <ellipse cx="12" cy="12" rx="7" ry="8" transform="rotate(-30 12 12)" />
            {/* Racket Strings */}
            <line x1="9" y1="8" x2="15" y2="16" opacity="0.6" strokeWidth="1" />
            <line x1="15" y1="8" x2="9" y2="16" opacity="0.6" strokeWidth="1" />
            {/* Racket Handle */}
            <line x1="16" y1="18" x2="25" y2="28" strokeWidth="2.5" />
            {/* Flying Shuttlecock / Ball */}
            <circle cx="23" cy="7" r="2.5" fill="currentColor" stroke="none" />
            {/* Flying Motion Lines */}
            <path d="M26 4 L28 2" strokeWidth="1.5" opacity="0.8" />
            <path d="M21 4 L22 2" strokeWidth="1.5" opacity="0.8" />
            <path d="M26 9 L28 10" strokeWidth="1.5" opacity="0.8" />
          </svg>
        </div>

        {/* Text Contents */}
        <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2 relative z-10 font-sans tracking-wide">
          Chưa Có Giải Đấu Nào Sắp Diễn Ra
        </h3>
        <p className="text-sm text-slate-500 max-w-md relative z-10 leading-relaxed font-medium">
          Hãy theo dõi trang để cập nhật thông tin về các giải đấu tennis, pickleball và cầu lông mới nhất sắp sửa diễn ra.
        </p>
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
                        src="/vndcsport.svg"
                        alt="VNDC Sport Logo"
                        className="w-48 h-auto object-contain relative z-10 opacity-75"
                        draggable="false"
                      />
                    </div>
                  )}
                  {/* Dark gradient overlay to guarantee text contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                </div>

                {/* Clickable Overlay for the whole card */}
                <Link 
                  href={`/tournaments/${tournament.id}`} 
                  onClick={handleLinkClick}
                  className="absolute inset-0 z-10" 
                />

                {/* Hero content */}
                <div className="absolute bottom-6 left-6 right-6 z-20 pointer-events-none max-w-xl flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {tournament.category?.name && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-300 font-sans [text-shadow:_0_1px_2px_rgba(0,0,0,0.8)]">
                        {(() => {
                          const logo = getSportLogo(tournament.category?.name);
                          return logo ? (
                            <img src={logo} alt={tournament.category?.name || ''} className="w-3.5 h-3.5 object-contain brightness-150" />
                          ) : null;
                        })()}
                        {tournament.category.name}
                      </span>
                    )}
                    {getStatusBadge(tournament.status)}
                  </div>

                  <h2 className="text-lg md:text-2xl font-bold text-white tracking-tight leading-tight line-clamp-2 [text-shadow:_0_2px_4px_rgba(0,0,0,0.8)]">
                    {tournament.name}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] md:text-xs text-slate-200 font-normal [text-shadow:_0_1px_2px_rgba(0,0,0,0.8)]">
                    {tournament.startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 inline-block" /> {new Date(tournament.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        {tournament.endDate && ` - ${new Date(tournament.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`}
                      </span>
                    )}
                    {tournament.status === 'UPCOMING' && tournament.registrationStartDate && (
                      <CountdownTimer targetDate={tournament.registrationStartDate} />
                    )}
                    {tournament.locationAddress && (
                      <span className="flex items-center gap-1 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 inline-block" /> {tournament.locationAddress.split(',').slice(-3).join(',').trim()}
                      </span>
                    )}
                  </div>
                </div>
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
