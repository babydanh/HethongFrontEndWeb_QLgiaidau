'use client';

import { useState, useEffect } from 'react';
import { Tournament } from '@/features/tournaments/api';
import Link from 'next/link';

interface Props {
  tournaments: Tournament[];
  heightClass?: string;
}

export default function TournamentHeroBanner({ tournaments, heightClass = 'h-[250px] md:h-[350px]' }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (tournaments.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tournaments.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [tournaments.length]);

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

  const current = tournaments[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + tournaments.length) % tournaments.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % tournaments.length);
  };

  // Generate a premium dynamic background gradient based on Category ID or Name if bannerUrl is missing
  const getGradientBg = (name?: string) => {
    const term = (name || '').toLowerCase();
    if (term.includes('tennis')) {
      return 'from-emerald-900 via-slate-900 to-indigo-950';
    }
    if (term.includes('pickleball')) {
      return 'from-amber-900 via-slate-900 to-rose-950';
    }
    if (term.includes('badminton') || term.includes('lông')) {
      return 'from-blue-900 via-slate-900 to-violet-950';
    }
    return 'from-indigo-950 via-slate-900 to-slate-950';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTRATION_OPEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Mở Đăng Ký
          </span>
        );
      case 'REGISTRATION_CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Đóng Đăng Ký
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Sắp Diễn Ra
          </span>
        );
    }
  };

  return (
    <div className={`w-full ${heightClass} rounded-2xl relative overflow-hidden group border border-slate-800 shadow-2xl`}>
      {/* Background Image / Gradient */}
      <div className="absolute inset-0 transition-all duration-1000 ease-out transform scale-100 group-hover:scale-105">
        {current.bannerUrl ? (
          <img
            src={current.bannerUrl}
            alt={current.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-tr ${getGradientBg(current.category?.name)}`} />
        )}
      </div>

      {/* Clickable Overlay for the whole card */}
      <Link href={`/tournaments/${current.id}`} className="absolute inset-0 z-10" />

      {/* Hero content positioned directly on image */}
      <div className="absolute bottom-6 left-6 right-6 z-20 pointer-events-none max-w-xl flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {current.category?.name && (
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-200 font-sans [text-shadow:_0_1px_3px_rgba(0,0,0,1),_0_2px_8px_rgba(0,0,0,1)]">
              {current.category.name}
            </span>
          )}
          {getStatusBadge(current.status)}
        </div>

        <h2 className="text-xl md:text-3xl font-black text-white tracking-tight leading-tight line-clamp-2 [text-shadow:_0_2px_4px_rgba(0,0,0,1),_0_4px_16px_rgba(0,0,0,1)]">
          {current.name}
        </h2>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white font-extrabold [text-shadow:_0_1px_3px_rgba(0,0,0,1),_0_2px_8px_rgba(0,0,0,1)]">
          {current.startDate && (
            <span className="flex items-center gap-1">
              📅 {new Date(current.startDate).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}
              {current.endDate && ` - ${new Date(current.endDate).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            </span>
          )}
          {current.locationAddress && (
            <span className="flex items-center gap-1 line-clamp-1">
              📍 {current.locationAddress.split(',').slice(-3).join(',').trim()}
            </span>
          )}
          {current.entryFee !== undefined && (
            <span className="flex items-center gap-1 text-emerald-300 font-black">
              💰 {current.entryFee === 0 ? 'Miễn phí' : `${Number(current.entryFee).toLocaleString('vi-VN')} VNĐ`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1.5 pointer-events-auto relative z-20">
          {current.status === 'REGISTRATION_OPEN' && (
            <Link
              href={`/tournaments/${current.id}/register`}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-700 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              Đăng Ký Ngay
            </Link>
          )}
        </div>
      </div>

      {/* Slide Navigation Controls */}
      {tournaments.length > 1 && (
        <>
          {/* Arrow Left */}
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center bg-slate-950/40 hover:bg-slate-950/70 border border-slate-800 text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-20"
          >
            ←
          </button>
          {/* Arrow Right */}
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center bg-slate-950/40 hover:bg-slate-950/70 border border-slate-800 text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-20"
          >
            →
          </button>

          {/* Dots Indicators */}
          <div className="absolute bottom-4 right-6 flex items-center gap-1.5 z-20">
            {tournaments.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentIndex ? 'w-5 bg-indigo-500' : 'w-1.5 bg-slate-600 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
