'use client';

import { useState, useEffect, useRef } from 'react';
import { Tournament } from '@/features/tournaments/api';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { formatDate } from '@/utils/format';
import { getSportLogo } from '@/constants/sports';

interface Props {
  tournaments: Tournament[];
  heightClass?: string;
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

  const handleLinkClick = (e: React.MouseEvent) => {
    // If the user dragged more than 10px, prevent click navigation
    if (dragDistance.current > 10) {
      e.preventDefault();
    }
  };

  if (!tournaments || tournaments.length === 0) {
    return (
      <div className={`w-full ${heightClass} rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center text-center p-6 border border-slate-800 shadow-xl relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)]" />
        <h3 className="text-xl md:text-2xl font-bold text-white mb-2 relative z-10 font-sans tracking-wide">
          Chưa Có Giải Đấu Nào Sắp Diễn Ra
        </h3>
        <p className="text-sm text-slate-400 max-w-md relative z-10">
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
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] uppercase font-black bg-emerald-500 text-white shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            Mở Đăng Ký
          </span>
        );
      case 'REGISTRATION_CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] uppercase font-black bg-amber-600 text-white shadow-sm">
            Đóng Đăng Ký
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] uppercase font-black bg-blue-600 text-white shadow-sm">
            Sắp Diễn Ra
          </span>
        );
    }
  };

  return (
    <div className="relative w-full select-none group overflow-hidden rounded-2xl">
      {/* Slider Wrapper */}
      <div 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDragStart={(e) => e.preventDefault()}
        className="flex py-1 cursor-grab active:cursor-grabbing"
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
              <div className={`w-full ${heightClass} rounded-2xl relative overflow-hidden border border-slate-205 dark:border-slate-800 shadow-md bg-slate-950 transition-all duration-500 ${isActive ? 'scale-[1] opacity-100' : 'scale-[0.985] opacity-90'}`}>
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
                        src="/images/vndc_sport.png"
                        alt="VNDC Sport Logo"
                        className="w-48 h-auto object-contain relative z-10 opacity-75"
                        draggable="false"
                      />
                    </div>
                  )}
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
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-300 font-sans [text-shadow:_0_1px_2px_rgba(0,0,0,0.8)]">
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

                  <h2 className="text-lg md:text-2xl font-black text-white tracking-tight leading-tight line-clamp-2 [text-shadow:_0_2px_4px_rgba(0,0,0,0.8)]">
                    {tournament.name}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] md:text-xs text-slate-200 font-semibold [text-shadow:_0_1px_2px_rgba(0,0,0,0.8)]">
                    {tournament.startDate && (
                      <span className="flex items-center gap-1">
                        📅 {formatDate(tournament.startDate)}
                        {tournament.endDate && ` - ${formatDate(tournament.endDate)}`}
                      </span>
                    )}
                    {tournament.locationAddress && (
                      <span className="flex items-center gap-1 line-clamp-1">
                        📍 {tournament.locationAddress.split(',').slice(-3).join(',').trim()}
                      </span>
                    )}
                    {tournament.entryFee !== undefined && (
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        💰 {tournament.entryFee === 0 ? 'Miễn phí' : `${Number(tournament.entryFee).toLocaleString('vi-VN')} VNĐ`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 pointer-events-auto relative z-20 flex-wrap">
                    {tournament._count?.participants !== undefined && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-white text-[10px] font-bold">
                        <Users className="w-3 h-3" />
                        <span>{tournament._count.participants} VĐV</span>
                      </div>
                    )}
                    {tournament.status === 'REGISTRATION_OPEN' && (
                      <Link
                        href={`/tournaments/${tournament.id}/register`}
                        className="px-4 py-1.5 rounded-lg text-[11px] font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md active:scale-95 transition-all cursor-pointer"
                      >
                        Đăng Ký Ngay
                      </Link>
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
            ←
          </button>
          {/* Arrow Right */}
          <button
            onClick={handleNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-white/80 hover:bg-white border border-slate-200 text-slate-800 shadow-md cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-20"
          >
            →
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
