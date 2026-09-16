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

// 1. LEFT COLUMN: Athlete Profile Card (Clean White with Subtle Brand Accents)
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
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden text-center p-4">
      {/* Avatar with subtle brand tier tag */}
      <div className="relative inline-block mx-auto mb-2">
        <div className="w-14 h-14 rounded-full border-2 border-blue-100 overflow-hidden shadow-2xs bg-slate-50 mx-auto">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName || 'Athlete'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-base">
              {(user?.fullName?.trim().charAt(0) || 'U').toUpperCase()}
            </div>
          )}
        </div>
        <span className="absolute -bottom-0.5 right-0 w-4.5 h-4.5 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center border-2 border-white shadow-2xs">
          B
        </span>
      </div>

      <h3 className="text-slate-900 font-bold text-sm tracking-tight truncate">
        {user?.fullName || 'Nguyễn Minh Danh'}
      </h3>
      <div className="flex items-center justify-center gap-1.5 mt-0.5">
        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">
          ELO {elo || 1511}
        </span>
        <span className="text-slate-400 text-xs font-normal">TP.HCM</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-100 my-3">
        <div>
          <div className="text-sm font-bold text-slate-800 leading-none">
            {matchesPlayed || 46}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">
            {translate('matchLabel')}
          </div>
        </div>
        <div className="border-x border-slate-100">
          <div className="text-sm font-bold text-blue-600 leading-none">
            {winRate || 68}%
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">
            {translate('wins')}
          </div>
        </div>
        <div>
          <div className="text-sm font-bold text-emerald-600 leading-none">
            {credibility || 98}%
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">
            {translate('credibility')}
          </div>
        </div>
      </div>

      <Link
        href="/profile"
        onClick={onViewProfile}
        className="w-full py-1.5 px-3 rounded-lg border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 font-medium text-xs inline-flex items-center justify-center gap-1.5 hover:underline transition-all"
      >
        <span>{translate('viewProfile')}</span>
      </Link>
    </div>
  );
}

// 2. LEFT COLUMN: Match Filters (Bộ Lọc Kèo - Clean White with Blue Active Marker)
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
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          {translate('filterKicker')}
        </h4>
        <button
          onClick={() => onSelectFilter('all')}
          type="button"
          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <RotateCw className="w-3 h-3" />
          <span>{translate('refresh')}</span>
        </button>
      </div>

      <div className="space-y-0.5">
        {filters.map((f) => {
          const isSelected = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onSelectFilter(f.id)}
              type="button"
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-50/70 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-blue-600 font-medium hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                />
                <span className={isSelected ? '' : 'hover:underline'}>{f.label}</span>
              </div>
              <span className={isSelected ? 'text-blue-600 font-semibold text-[11px]' : 'text-slate-400 font-normal text-[11px]'}>
                {f.count}
              </span>
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
  clubId,
}: {
  clubName?: string;
  memberCount?: number;
  court?: string;
  clubId?: string;
}) {
  const translate = useTranslations('Home');

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          {translate('myClubs')}
        </h4>
        <Link
          href="/communities"
          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          {translate('viewAll')}
        </Link>
      </div>

      <Link
        href={clubId ? `/communities/${clubId}` : '/communities'}
        className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all block"
      >
        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
          {(clubName.trim().slice(0, 2) || 'CL').toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h5 className="text-xs font-semibold text-slate-800 truncate hover:text-blue-600 hover:underline">
            {clubName}
          </h5>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            {translate('membersCount', { count: memberCount })} • {court}
          </p>
        </div>
      </Link>
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
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
            {translate('communityKicker')}
          </span>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            {translate('featuredTournaments')}
          </h3>
        </div>
        <Link
          href="/tournaments"
          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
        >
          <span>{translate('viewAllWithCount', { count: Math.max(items.length, 6) })}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/tournaments/${item.id}`}
            className="relative h-36 rounded-xl overflow-hidden shadow-2xs border border-slate-200/70 block group"
          >
            {/* Background Image */}
            <img
              src={item.imageUrl}
              alt={item.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />

            {/* Top Badges */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                {item.sportBadge}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/60 text-white backdrop-blur-xs border border-white/20">
                {item.prize}
              </span>
            </div>

            {/* Bottom Content */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10">
              <h4 className="text-xs sm:text-sm font-bold text-white group-hover:underline line-clamp-1 mb-1">
                {item.name}
              </h4>
              <div className="flex items-center justify-between text-[11px] text-white/80 font-normal">
                <span>{item.date}</span>
                <span className="px-2 py-0.5 rounded bg-white/20 text-white font-medium backdrop-blur-xs text-[10px]">
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

// 5. CENTER COLUMN: Day Selector Tab Strip (Primary Blue Underline Style)
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
    <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200">
      {days.map((day) => {
        const isSelected = activeId === day.id;
        return (
          <button
            key={day.id}
            onClick={() => onSelect(day.id)}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer relative ${
              isSelected
                ? 'text-blue-600 font-bold'
                : 'text-slate-600 hover:text-blue-600'
            }`}
          >
            <span className={isSelected ? '' : 'hover:underline'}>{day.dayLabel}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-medium ${
                isSelected ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {day.matchCount}
            </span>
            {/* Primary blue underline indicator matching header active style */}
            {isSelected && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// 6. CENTER COLUMN: Pickup Match Item (Clean White Card, Primary Accent Text Action)
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
    <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col gap-2.5">
      {/* Badges & Slots status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
            {item.sport}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200/60">
            {item.sportTier}
          </span>
        </div>
        <span className="text-[11px] font-medium text-amber-700 bg-amber-50/70 border border-amber-200/60 px-2 py-0.5 rounded">
          {item.urgentText || `Còn ${remaining} slot`}
        </span>
      </div>

      {/* Time & Venue & Price */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-800 font-semibold truncate">
          <span>{item.timeRange}</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600 truncate font-normal">
            {item.courtLocation}
          </span>
        </div>
        <span className="font-bold text-blue-600 text-sm shrink-0">
          {item.feePerSlot}
        </span>
      </div>

      {/* Players avatars & Text-only Vào slot button in primary brand color */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex items-center -space-x-1.5">
            {item.players.map((p, idx) => (
              <div
                key={p.id || idx}
                className="w-6.5 h-6.5 rounded-full border-2 border-white bg-slate-100 overflow-hidden shrink-0 shadow-2xs flex items-center justify-center text-[9px] font-bold text-slate-700"
                style={{ backgroundColor: p.initialsBg || '#e2e8f0' }}
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
            {remaining > 0 && (
              <div className="w-6.5 h-6.5 rounded-full border border-dashed border-blue-300 bg-blue-50/50 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                +
              </div>
            )}
          </div>
          <span className="text-[11px] font-medium text-slate-500 tabular-nums">
            {item.currentSlots + (joined ? 1 : 0)}/{item.maxSlots}
          </span>
        </div>

        {joined ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <Check className="w-3.5 h-3.5" />
            <span>{translate('slotJoined')}</span>
          </span>
        ) : (
          <button
            onClick={() => {
              setJoined(true);
              onJoin?.(item);
            }}
            type="button"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer py-1 px-1.5"
          >
            {translate('joinSlot')}
          </button>
        )}
      </div>
    </div>
  );
}

// 7. RIGHT COLUMN: Your Schedule & Nearby Courts (Clean White Widgets with Primary Blue Actions)
export function SocialScheduleAndCourtsWidgets({
  upcomingItem,
}: {
  upcomingItem?: {
    time: string;
    title: string;
    location: string;
    slotsText: string;
  } | null;
}) {
  const translate = useTranslations('Home');

  return (
    <div className="flex flex-col gap-3">
      {/* Widget A: Lịch đấu của bạn */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-700 tracking-wider">
              {translate('myUpcomingMatches')}
            </h4>
          </div>
          <Link
            href="/matches"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            {translate('viewAll')}
          </Link>
        </div>

        {/* Schedule Item 1 */}
        <div className="rounded-lg p-2.5 border border-blue-100 mb-2 bg-blue-50/30">
          <div className="flex items-center justify-between mb-1">
            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-600 text-white">
              {upcomingItem?.time || `19:30 ${translate('tonight')}`}
            </span>
            <span className="text-[10px] font-medium text-blue-600 bg-white px-1.5 py-0.5 rounded border border-blue-100">
              {translate('createdTag')}
            </span>
          </div>

          <h5 className="text-xs font-semibold text-slate-800 line-clamp-1 mb-0.5">
            {upcomingItem?.title || 'Giao lưu Pickleball Hạng B'}
          </h5>
          <p className="text-[11px] text-slate-500 mb-2">
            {upcomingItem?.location || 'D-Sport Q7 • Sân 03'}
          </p>

          <div className="flex items-center justify-between pt-1.5 border-t border-blue-100/70">
            <span className="text-xs font-semibold text-slate-700">
              {upcomingItem?.slotsText || '3/4'} <span className="text-[10px] text-slate-400 font-normal">{translate('playerShort')}</span>
            </span>
            <button
              type="button"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              {translate('inviteButton')}
            </button>
          </div>
        </div>

        {/* Schedule Item 2 */}
        <div className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-medium text-slate-400 leading-none">20/9</span>
            <span className="text-xs font-bold text-slate-700 leading-none mt-0.5">18h</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-800 truncate hover:text-blue-600 hover:underline">
              {translate('semiFinalText')}
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {translate('courtClub')}
            </div>
          </div>
        </div>
      </div>

      {/* Widget B: Sân Trống Gần Bạn */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h4 className="text-xs font-bold text-slate-700 tracking-wider">
              {translate('nearbyCourts')}
            </h4>
          </div>
          <span className="text-[11px] font-normal text-slate-400">
            {translate('nearbyDistance')}
          </span>
        </div>

        <div className="space-y-2">
          {/* Court 1 */}
          <div className="p-2.5 rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-all">
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-semibold text-slate-800 text-xs">D-Sport Q7</span>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Còn 2 sân
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mb-1.5">
              20:00 - 22:00 • 1.2 km
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800">
                160k<span className="text-[10px] text-slate-400 font-normal">{translate('perHour')}</span>
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                {translate('bookCourt')}
              </button>
            </div>
          </div>

          {/* Court 2 */}
          <div className="p-2.5 rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-all">
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-semibold text-slate-800 text-xs">Khánh Hội Court</span>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Còn 1 sân
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mb-1.5">
              21:00 - 22:30 • 2.4 km
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800">
                140k<span className="text-[10px] text-slate-400 font-normal">{translate('perHour')}</span>
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
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


