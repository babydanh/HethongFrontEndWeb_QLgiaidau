'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  Check,
  RotateCw,
  Plus,
  Trophy,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface SocialPickupItem {
  id: string;
  sport: string;
  sportColorBg: string;
  sportColorText: string;
  sportTier: string;
  courtLocation: string;
  timeRange: string;
  feePerSlot: string;
  maxSlots: number;
  currentSlots: number;
  urgentText?: string;
  players: Array<{
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    initialsBg?: string;
  }>;
}

export interface DayPill {
  id: string;
  dayLabel: string;
  dateStr: string;
  matchCount: number;
  isToday?: boolean;
}

// 1. LEFT COLUMN: Athlete Profile Card (Card Blue Gradient)
export function AthleteProfileCard({
  user,
  elo,
  matchesPlayed,
  winRate,
  credibility,
  onViewProfile,
}: {
  user?: { fullName?: string | null; avatarUrl?: string | null } | null;
  elo: number;
  matchesPlayed: number;
  winRate: number;
  credibility?: number;
  onViewProfile?: () => void;
}) {
  const translate = useTranslations('Home');

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden text-center">
      {/* Blue Top Background */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 pt-7 pb-10 px-5 relative">
        <span className="absolute top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white backdrop-blur-xs tracking-wider">
          {translate('proBadge')}
        </span>

        {/* Avatar with B badge */}
        <div className="relative inline-block mx-auto mb-2">
          <div className="w-18 h-18 rounded-full border-3 border-white overflow-hidden shadow-md bg-white">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || 'Athlete'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-extrabold text-xl">
                {(user?.fullName?.trim().charAt(0) || 'U').toUpperCase()}
              </div>
            )}
          </div>
          <span className="absolute -bottom-1 right-0 w-6 h-6 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center border-2 border-white shadow-2xs">
            B
          </span>
        </div>

        <h3 className="text-white font-extrabold text-base tracking-tight truncate">
          {user?.fullName || 'Nguyễn Minh Danh'}
        </h3>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-bold">
            ELO {elo || 1511}
          </span>
          <span className="text-white/80 text-[11px] font-medium">TP.HCM</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-4 py-4 -mt-3 bg-white rounded-t-2xl relative z-10">
        <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-100 mb-3.5">
          <div>
            <div className="text-base font-black text-slate-900 leading-none">
              {matchesPlayed || 46}
            </div>
            <div className="text-[11px] text-slate-600 font-bold mt-1 uppercase">
              {translate('matchLabel')}
            </div>
          </div>
          <div className="border-x border-slate-100">
            <div className="text-base font-black text-blue-600 leading-none">
              {winRate || 68}%
            </div>
            <div className="text-[11px] text-slate-600 font-bold mt-1 uppercase">
              {translate('wins')}
            </div>
          </div>
          <div>
            <div className="text-base font-black text-emerald-600 leading-none">
              {credibility || 98}%
            </div>
            <div className="text-[11px] text-slate-600 font-bold mt-1 uppercase">
              {translate('credibility')}
            </div>
          </div>
        </div>

        <Link
          href="/profile"
          onClick={onViewProfile}
          className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>{translate('viewProfile')}</span>
        </Link>
      </div>
    </div>
  );
}

// 2. LEFT COLUMN: Match Filters (Bộ Lọc Kèo)
export function SocialMatchFilters({
  activeFilter,
  onSelectFilter,
}: {
  activeFilter: string;
  onSelectFilter: (id: string) => void;
}) {
  const translate = useTranslations('Home');

  const filters = [
    { id: 'all', label: translate('allPill'), count: 14 },
    { id: 'tonight', label: translate('tonightPill'), count: 6 },
    { id: 'tier_b', label: translate('tierFilterPill'), count: 5 },
    { id: 'doubles', label: translate('doublesPill'), count: 8 },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-4.5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-black text-slate-650 uppercase tracking-wider">
          {translate('filterKicker')}
        </h4>
        <button
          onClick={() => onSelectFilter('all')}
          type="button"
          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <RotateCw className="w-3 h-3" />
          <span>{translate('refresh')}</span>
        </button>
      </div>

      <div className="space-y-1.5">
        {filters.map((f) => {
          const isSelected = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onSelectFilter(f.id)}
              type="button"
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-blue-50 text-blue-700 font-extrabold'
                  : 'text-slate-650 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSelected ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                />
                <span>{f.label}</span>
              </div>
              <span className="text-slate-600 text-[11px]">{f.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 3. LEFT COLUMN: My Clubs (CLB Của Bạn)
export function SocialMyClubsCard({
  clubName = 'Hà Anh Pickleball Club',
  memberCount = 151,
  court = 'Sân D-Sport Q7',
}: {
  clubName?: string;
  memberCount?: number;
  court?: string;
}) {
  const translate = useTranslations('Home');

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-4.5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-black text-slate-650 uppercase tracking-wider">
          {translate('myClubs')}
        </h4>
        <Link
          href="/communities"
          className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
        >
          {translate('viewAll')}
        </Link>
      </div>

      <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
          HA
        </div>
        <div className="min-w-0 flex-1">
          <h5 className="text-xs font-bold text-slate-900 truncate">
            {clubName}
          </h5>
          <p className="text-[11px] text-slate-600 truncate mt-0.5">
            {translate('membersCount', { count: memberCount })} • {court}
          </p>
        </div>
      </div>
    </div>
  );
}

// 4. CENTER COLUMN: Featured Tournaments Strip
export function SocialFeaturedTournaments({
  tournaments = [],
}: {
  tournaments?: Array<{
    id: string;
    name: string;
    sportBadge: string;
    prize: string;
    date: string;
    teamSlots: string;
    imageUrl?: string;
  }>;
}) {
  const translate = useTranslations('Home');

  const defaultList = [
    {
      id: 'ft-1',
      name: 'Hà Anh Open Cup 2026',
      sportBadge: 'PICKLEBALL',
      prize: '30 Triệu',
      date: '18 - 20 THG 9',
      teamSlots: '24/32 đôi',
      imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop',
    },
    {
      id: 'ft-2',
      name: 'Saigon Sunday League',
      sportBadge: 'BÓNG ĐÁ',
      prize: '20 Triệu',
      date: '26 THG 9',
      teamSlots: 'Còn 4 suất',
      imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600&auto=format&fit=crop',
    },
  ];

  const items = tournaments.length > 0 ? tournaments : defaultList;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider block">
            {translate('communityKicker')}
          </span>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            {translate('featuredTournaments')}
          </h3>
        </div>
        <Link
          href="/tournaments"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <span>{translate('viewAllWithCount', { count: 6 })}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/tournaments/${item.id}`}
            className="group relative h-40 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all block"
          >
            {/* Background Image */}
            <img
              src={item.imageUrl}
              alt={item.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20" />

            {/* Top Badges */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                {item.sportBadge}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-rose-600/90 text-white backdrop-blur-xs shadow-xs">
                {item.prize}
              </span>
            </div>

            {/* Bottom Content */}
            <div className="absolute bottom-3 left-3 right-3 z-10">
              <h4 className="text-sm font-extrabold text-white group-hover:text-blue-200 transition-colors line-clamp-1 mb-1">
                {item.name}
              </h4>
              <div className="flex items-center justify-between text-[11px] text-white/80 font-medium">
                <span>{item.date}</span>
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-white font-bold backdrop-blur-xs text-[10px]">
                  {item.teamSlots}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// 5. CENTER COLUMN: Day Selector Pill Strip
export function SocialDaySelectorStrip({
  days,
  activeId,
  onSelect,
}: {
  days: DayPill[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
      {days.map((day) => {
        const isSelected = activeId === day.id;
        return (
          <button
            key={day.id}
            onClick={() => onSelect(day.id)}
            type="button"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              isSelected
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <span>{day.dayLabel}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-650'
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

// 6. CENTER COLUMN: Pickup Match Item (Row in exact screenshot style)
export function SocialPickupRow({
  item,
  onJoin,
}: {
  item: SocialPickupItem;
  onJoin?: (item: SocialPickupItem) => void;
}) {
  const translate = useTranslations('Home');
  const [joined, setJoined] = useState(false);
  const remaining = Math.max(0, item.maxSlots - (item.currentSlots + (joined ? 1 : 0)));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col gap-3">
      {/* Badges & Slots status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${item.sportColorBg} ${item.sportColorText}`}
          >
            {item.sport}
          </span>
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
            {item.sportTier}
          </span>
        </div>
        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-md">
          {item.urgentText || `Còn ${remaining} slot`}
        </span>
      </div>

      {/* Time & Venue & Price */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-bold truncate">
          <span>{item.timeRange}</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-600 truncate font-semibold">
            {item.courtLocation}
          </span>
        </div>
        <span className="font-extrabold text-blue-600 text-sm shrink-0">
          {item.feePerSlot}
        </span>
      </div>

      {/* Players avatars & Vào slot button */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex items-center -space-x-2">
            {item.players.map((p, idx) => (
              <div
                key={p.id || idx}
                className="w-7 h-7 rounded-full border-2 border-white bg-slate-200 overflow-hidden shrink-0 shadow-2xs flex items-center justify-center text-[10px] font-black text-white"
                style={{ backgroundColor: p.initialsBg || '#3b82f6' }}
              >
                {p.avatarUrl ? (
                  <img
                    src={p.avatarUrl}
                    alt={p.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (p.fullName.trim().charAt(0) || 'P').toUpperCase()
                )}
              </div>
            ))}
            {/* Dashed slot */}
            {remaining > 0 && (
              <div className="w-7 h-7 rounded-full border-2 border-dashed border-blue-400 bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                +
              </div>
            )}
          </div>
          <span className="text-xs font-bold text-slate-600 tabular-nums">
            {item.currentSlots + (joined ? 1 : 0)}/{item.maxSlots}
          </span>
        </div>

        {joined ? (
          <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3.5 h-3.5" />
            {translate('slotJoined')}
          </span>
        ) : (
          <button
            onClick={() => {
              setJoined(true);
              onJoin?.(item);
            }}
            type="button"
            className="px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            {translate('joinSlot')}
          </button>
        )}
      </div>
    </div>
  );
}

// 7. RIGHT COLUMN: Your Schedule & Nearby Courts
export function SocialScheduleAndCourtsWidgets() {
  const translate = useTranslations('Home');

  return (
    <div className="flex flex-col gap-5">
      {/* Widget A: Lịch đấu của bạn */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-4.5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-black text-slate-800 tracking-wider">
              {translate('myUpcomingMatches')}
            </h4>
          </div>
          <Link
            href="/matches"
            className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
          >
            {translate('viewAll')}
          </Link>
        </div>

        {/* Schedule Item 1 (Active card with Invite Button) */}
        <div className="bg-blue-50/60 rounded-2xl p-3.5 border border-blue-100/90 mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white">
              19:30 {translate('tonight')}
            </span>
            <span className="text-[10px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-md border border-blue-100">
              {translate('createdTag')}
            </span>
          </div>

          <h5 className="text-xs font-extrabold text-slate-900 line-clamp-1 mb-1">
            Giao lưu Pickleball Hạng B
          </h5>
          <p className="text-[11px] text-slate-600 mb-3">
            D-Sport Q7 • Sân 03
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-blue-100">
            <span className="text-xs font-black text-slate-700">
              3/4 <span className="text-[10px] text-slate-650 font-semibold">{translate('playerShort')}</span>
            </span>
            <button
              type="button"
              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-2xs transition-colors"
            >
              {translate('inviteButton')}
            </button>
          </div>
        </div>

        {/* Schedule Item 2 (Calendar date block) */}
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-slate-500 leading-none">20/9</span>
            <span className="text-xs font-black text-slate-800 leading-none mt-0.5">18h</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 truncate">
              {translate('semiFinalText')}
            </div>
            <div className="text-[11px] text-slate-600 truncate mt-0.5">
              {translate('courtClub')}
            </div>
          </div>
        </div>
      </div>

      {/* Widget B: Sân Trống Gần Bạn */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-4.5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h4 className="text-xs font-black text-slate-800 tracking-wider">
              {translate('nearbyCourts')}
            </h4>
          </div>
          <span className="text-[11px] font-bold text-slate-600">
            {translate('nearbyDistance')}
          </span>
        </div>

        <div className="space-y-3">
          {/* Court 1 */}
          <div className="p-3 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900 text-xs">D-Sport Q7</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Còn 2 sân
              </span>
            </div>
            <div className="text-[11px] text-slate-600 mb-2">
              20:00 - 22:00 • 1.2 km
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs font-extrabold text-slate-900">
                160k<span className="text-[10px] text-slate-600 font-normal">{translate('perHour')}</span>
              </span>
              <button
                type="button"
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-colors"
              >
                {translate('bookCourt')}
              </button>
            </div>
          </div>

          {/* Court 2 */}
          <div className="p-3 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900 text-xs">Khánh Hội Court</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Còn 1 sân
              </span>
            </div>
            <div className="text-[11px] text-slate-600 mb-2">
              21:00 - 22:30 • 2.4 km
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs font-extrabold text-slate-900">
                140k<span className="text-[10px] text-slate-600 font-normal">{translate('perHour')}</span>
              </span>
              <button
                type="button"
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-colors"
              >
                {translate('bookCourt')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
