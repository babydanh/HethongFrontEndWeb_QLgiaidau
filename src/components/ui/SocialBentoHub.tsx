'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, MapPin, UserPlus, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface SocialPickupItem {
  id: string;
  sport: string;
  sportTier: string;
  title: string;
  courtName: string;
  address: string;
  timeRange: string;
  feePerSlot: string;
  maxSlots: number;
  currentSlots: number;
  players: Array<{
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  }>;
  isHost?: boolean;
  communityName?: string;
  isUrgent?: boolean;
}

export interface DayPill {
  id: string;
  dayLabel: string;
  dateStr: string;
  matchCount: number;
  isToday?: boolean;
}

// 1. Day Selector Pill Strip
export function SocialDayFilterStrip({
  days,
  activeId,
  onSelect,
}: {
  days: DayPill[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
      {days.map((day) => {
        const isSelected = activeId === day.id;
        return (
          <button
            key={day.id}
            onClick={() => onSelect(day.id)}
            type="button"
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
              isSelected
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/25 scale-[1.02]'
                : 'bg-white text-slate-700 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
            }`}
          >
            <span>{day.dayLabel}</span>
            <span className="text-[11px] opacity-80">{day.dateStr}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {day.matchCount}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// 2. Pickup Match Bento Card
export function SocialPickupCard({
  item,
  onJoin,
}: {
  item: SocialPickupItem;
  onJoin?: (item: SocialPickupItem) => void;
}) {
  const translate = useTranslations('Home');
  const [joined, setJoined] = useState(false);
  const remaining = Math.max(0, item.maxSlots - (item.currentSlots + (joined ? 1 : 0)));

  const handleJoin = () => {
    if (!joined && remaining > 0) {
      setJoined(true);
      onJoin?.(item);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-200 transition-all p-4.5 flex flex-col justify-between group relative overflow-hidden">
      {/* Top row: Badges & Price */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-100">
              {item.sport}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700">
              {item.sportTier}
            </span>
            {item.isUrgent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 animate-pulse">
                🔥 {translate('urgentSlot')}
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="text-sm font-extrabold text-blue-600">{item.feePerSlot}</span>
            <span className="text-[10px] text-slate-500 font-medium block">/{translate('slotUnit')}</span>
          </div>
        </div>

        {/* Title & Club */}
        <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1">
          {item.title}
        </h4>
        {item.communityName && (
          <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-semibold text-slate-700">{item.communityName}</span>
          </p>
        )}

        {/* Time & Venue */}
        <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 font-medium">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-800">{item.timeRange}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate font-semibold text-slate-700">{item.courtName}</span>
            <span className="text-slate-500 truncate hidden sm:inline">• {item.address}</span>
          </div>
        </div>
      </div>

      {/* Bottom row: Players avatar slots & CTA */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
        {/* Avatars + Open Slots indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center -space-x-2">
            {item.players.slice(0, 3).map((p, idx) => (
              <div
                key={p.id || idx}
                className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden shrink-0 shadow-2xs"
                title={p.fullName}
              >
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt={p.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-slate-600 text-xs bg-blue-100 text-blue-700">
                    {(p.fullName.trim().charAt(0) || 'P').toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {/* Dashed slot placeholder */}
            {remaining > 0 && (
              <div
                className="w-8 h-8 rounded-full border-2 border-dashed border-blue-400 bg-blue-50/70 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0"
                title={translate('availableSlot')}
              >
                +
              </div>
            )}
          </div>
          <span className="text-xs font-bold text-slate-600 tabular-nums">
            {item.currentSlots + (joined ? 1 : 0)}/{item.maxSlots}
          </span>
        </div>

        {/* Action Button */}
        {remaining === 0 ? (
          <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-500">
            {translate('slotsFull')}
          </span>
        ) : joined ? (
          <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3.5 h-3.5" />
            {translate('slotJoined')}
          </span>
        ) : (
          <button
            onClick={handleJoin}
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{translate('joinSlot')}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// 3. Right Sidebar Schedule & Courts Widget
export function SocialRightSidebarWidgets() {
  const translate = useTranslations('Home');

  return (
    <div className="flex flex-col gap-5">
      {/* Widget A: Lịch đấu của bạn */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.02)] p-4.5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">{translate('myUpcomingMatches')}</h3>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
            1 {translate('slotUnit')}
          </span>
        </div>

        <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100/80 mb-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-extrabold text-blue-900">Pickleball Đôi Nam Nữ</span>
            <span className="text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md shadow-2xs">
              19:30 Tối nay
            </span>
          </div>
          <p className="text-xs text-slate-600 truncate flex items-center gap-1">
            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
            <span>Sân D-Sport Q7 • Sân số 2</span>
          </p>
        </div>

        <Link
          href="/matches"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 pt-1"
        >
          <span>{translate('viewAll')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Widget B: Sân trống gần bạn */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.02)] p-4.5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">{translate('nearbyCourts')}</h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            {translate('availableNow')}
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
            <div className="min-w-0 pr-2">
              <div className="font-bold text-slate-800 truncate">CLB Cầu Lông Kỳ Hòa</div>
              <div className="text-[11px] text-slate-500">Quận 10 • Cách 1.2km</div>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 shrink-0 bg-emerald-50 px-2 py-1 rounded-lg">
              Còn 2 sân
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
            <div className="min-w-0 pr-2">
              <div className="font-bold text-slate-800 truncate">Pickleball Thảo Điền Pro</div>
              <div className="text-[11px] text-slate-500">Thủ Đức • Cách 3.5km</div>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 shrink-0 bg-emerald-50 px-2 py-1 rounded-lg">
              Còn 1 sân
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
