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
import { getRankBorderColor } from '@/components/ui/RankAvatar';
import { getRankProgressInfo } from '@/utils/rank-style';
import { getSportLogo } from '@/constants/sports';

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
  title?: string;
  hostName?: string;
  hostAvatar?: string | null;
  matchType?: string; // 'Đôi Nam Nữ' | 'Đôi Nam' | 'Đơn'
  description?: string;
  isClubHosted?: boolean;
  clubName?: string;
  clubLogoUrl?: string | null;
  isRanked?: boolean;
  distance?: string;
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
  tierName,
  categoryName,
  onViewProfile,
}: {
  user?: { fullName?: string | null; avatarUrl?: string | null } | null;
  elo: number;
  matchesPlayed: number;
  winRate: number;
  credibility?: number;
  tierName?: string | null;
  categoryName?: string | null;
  onViewProfile?: (e?: React.MouseEvent | React.KeyboardEvent) => void;
}) {
  const translate = useTranslations('Home');

  const rankColor = getRankBorderColor(elo, tierName, matchesPlayed, categoryName);
  const progress = getRankProgressInfo(elo, categoryName);
  const displayTier = tierName || progress.current.name;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden text-center p-4 transition-all">
      {/* Clickable Profile Header: Avatar, Name & ELO */}
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => onViewProfile?.(e)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onViewProfile?.(e);
          }
        }}
        className="cursor-pointer group flex flex-col items-center focus:outline-hidden"
        title={translate('viewProfile')}
      >
        {/* Avatar with rank colored border */}
        <div className="relative inline-block mx-auto mb-2">
          <div
            className="w-14 h-14 rounded-full border-2 overflow-hidden shadow-2xs bg-slate-50 mx-auto transition-transform group-hover:scale-105"
            style={{
              borderColor: rankColor,
              boxShadow: `0 0 10px -2px ${rankColor}40`,
            }}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || 'Athlete'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center font-bold text-base bg-slate-50"
                style={{ color: rankColor }}
              >
                {(user?.fullName?.trim().charAt(0) || 'U').toUpperCase()}
              </div>
            )}
          </div>
          <span
            className="absolute -bottom-0.5 right-0 w-4.5 h-4.5 rounded-full text-white font-bold text-[9px] flex items-center justify-center border-2 border-white shadow-2xs"
            style={{ backgroundColor: rankColor }}
          >
            {displayTier.charAt(0).toUpperCase()}
          </span>
        </div>

        <h3 className="text-slate-900 font-bold text-sm tracking-tight truncate max-w-full group-hover:text-blue-600 transition-colors">
          {user?.fullName || 'Nguyễn Minh Danh'}
        </h3>

        {/* ELO & Rank text colored without badge background */}
        <div className="flex items-center justify-center gap-1.5 mt-1 flex-wrap">
          <span className="text-xs font-bold" style={{ color: rankColor }}>
            ELO {elo || 1511}
          </span>
          <span className="text-slate-300 text-xs">•</span>
          <span className="text-xs font-semibold" style={{ color: rankColor }}>
            {displayTier}
          </span>
          <span className="text-slate-400 text-xs font-normal">TP.HCM</span>
        </div>
      </div>

      {/* Rank Progress Bar */}
      <div className="mt-2.5 mb-1 px-1">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mb-1">
          <span>{Math.round(progress.percent)}%</span>
          <span>{progress.next ? progress.next.name : 'Max Rank'}</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress.percent}%`,
              backgroundColor: rankColor,
            }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 py-2.5 border-t border-slate-100 mt-3">
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
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-none cursor-pointer ${
                isSelected
                  ? 'bg-blue-50/70 text-blue-700 font-bold'
                  : 'text-slate-600 font-medium'
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

export interface MyClubItem {
  id: string;
  name: string;
  role?: 'OWNER' | 'MODERATOR' | 'MEMBER' | string;
  memberCount?: number;
  court?: string;
  logoUrl?: string | null;
}

// 3. LEFT COLUMN: My Clubs (CLB Của Bạn)
export function SocialMyClubsCard({
  clubs = [],
  isAuthenticated = false,
  // Backward compatibility fallback props
  clubName = 'Hà Anh Pickleball Club',
  memberCount = 151,
  court = 'Sân D-Sport Q7',
  clubId,
}: {
  clubs?: MyClubItem[];
  isAuthenticated?: boolean;
  clubName?: string;
  memberCount?: number;
  court?: string;
  clubId?: string;
}) {
  const translate = useTranslations('Home');

  // If clubs array is provided, use it; otherwise fallback to single club if provided
  const displayClubs: MyClubItem[] = clubs.length > 0
    ? clubs
    : (isAuthenticated ? [] : [{
        id: clubId || '',
        name: clubName,
        memberCount: memberCount,
        court: court,
        role: 'MEMBER',
      }]);

  const getRoleBadge = (role?: string) => {
    const r = (role || 'MEMBER').toUpperCase();
    if (r === 'OWNER') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
          Chủ CLB
        </span>
      );
    }
    if (r === 'MODERATOR' || r === 'ADMIN') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60 shrink-0">
          Quản trị
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60 shrink-0">
        Thành viên
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            {translate('myClubs')}
          </h4>
          {displayClubs.length > 0 && (
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-full">
              {displayClubs.length}
            </span>
          )}
        </div>
        <Link
          href="/communities"
          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          {translate('viewAll')}
        </Link>
      </div>

      {displayClubs.length === 0 ? (
        <div className="p-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-center flex flex-col items-center justify-center gap-1.5">
          <p className="text-xs text-slate-500">
            {isAuthenticated ? 'Bạn chưa tham gia CLB nào' : 'Đăng nhập để xem CLB của bạn'}
          </p>
          <Link
            href="/communities"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline mt-0.5"
          >
            Khám phá CLB ngay <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {displayClubs.slice(0, 4).map((club) => {
            const initials = (club.name.trim().slice(0, 2) || 'CL').toUpperCase();
            // Ẩn fallback logo SportO mặc định trong CLB (chỉ hiển thị logo thật của CLB)
            const hasCustomLogo = Boolean(
              club.logoUrl?.trim() &&
              !club.logoUrl.includes('sporto_v1') &&
              !club.logoUrl.includes('defaultFallback')
            );

            return (
              <Link
                key={club.id || club.name}
                href={club.id ? `/communities/${club.id}` : '/communities'}
                className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs overflow-hidden relative border border-slate-200/60 bg-slate-50">
                  {hasCustomLogo ? (
                    <img
                      src={club.logoUrl!}
                      alt={club.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-blue-700 font-bold text-xs">{initials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <h5 className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600">
                      {club.name}
                    </h5>
                    {getRoleBadge(club.role)}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {club.memberCount !== undefined && translate('membersCount', { count: club.memberCount })}
                    {club.court && ` • ${club.court}`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
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

// 6. CENTER COLUMN: Pickup Match Item (Clean White Card, Rich Social Information)
export function SocialPickupRow({
  item,
  onJoin,
}: {
  item: SocialPickupItem;
  onJoin?: (item: SocialPickupItem) => void;
}) {
  const [joined, setJoined] = useState(false);
  const remaining = Math.max(0, item.maxSlots - (item.currentSlots + (joined ? 1 : 0)));

  // Display Name: Club Name if Club Hosted, else Host Name
  const entityName = item.isClubHosted
    ? (item.clubName || 'Hà Anh Club')
    : (item.hostName || 'Chủ kèo');
  const entityAvatar = item.isClubHosted ? item.clubLogoUrl : item.hostAvatar;
  const entityInitial = (entityName.trim().slice(0, 2) || 'CL').toUpperCase();

  const sportIcon = getSportLogo(item.sport);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:border-blue-200 hover:shadow-xs transition-all flex flex-col gap-2.5 group">
      {/* 1. TOP ROW: Small Avatar + Gray Club Name (Left) & Standalone Sport Icon + Distance (Right) */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Small Round Avatar (w-6 h-6) + Subdued Gray Club Name */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
            {entityAvatar ? (
              <img src={entityAvatar} alt={entityName} className="w-full h-full object-cover" />
            ) : (
              <span>{entityInitial}</span>
            )}
          </div>
          <span className="font-medium text-xs text-slate-500 truncate">
            {entityName}
          </span>
        </div>

        {/* Right: Standalone Sport Logo/Icon & Distance (No card/button wrapper) */}
        <div className="flex flex-col items-end shrink-0">
          {sportIcon ? (
            <img src={sportIcon} alt={item.sport} className="w-4 h-4 object-contain opacity-85" />
          ) : (
            <Trophy className="w-4 h-4 text-blue-600 opacity-85" />
          )}
          <span className="text-[11px] font-normal text-slate-400 mt-0.5 leading-none">
            {item.distance || '1.2 km'}
          </span>
        </div>
      </div>

      {/* 2. MIDDLE ROW: Title & Match Metadata (Clock & Venue & Match Type / Giao hữu) */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
            {item.matchType ? `Giao hữu • ${item.matchType}` : 'Giao hữu'}
          </span>
          <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
            {item.title || 'Giao lưu Pickleball D-Sport Q7'}
          </h4>
        </div>
        <div className="flex items-center gap-3.5 text-xs text-slate-500 font-medium flex-wrap mt-0.5">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>{item.timeRange}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{item.courtLocation}</span>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM ROW: Members Stack + Slot Text (Left) & Price + Action Icon Button (Right) */}
      <div className="flex items-center justify-between pt-1 gap-3">
        {/* Left: Avatar group + X/Y người */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center -space-x-1.5 shrink-0">
            {item.players.map((p, idx) => (
              <div
                key={p.id || idx}
                className="w-7 h-7 rounded-full border-2 border-white bg-blue-600 text-white overflow-hidden shrink-0 shadow-2xs flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: p.initialsBg || (idx % 2 === 0 ? '#2563eb' : '#4f46e5') }}
                title={p.fullName}
              >
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt={p.fullName} className="w-full h-full object-cover" />
                ) : (
                  (p.fullName.trim().slice(0, 2) || 'MD').toUpperCase()
                )}
              </div>
            ))}
            {remaining > 0 && (
              <div className="w-7 h-7 rounded-full border border-dashed border-blue-400 bg-blue-50/70 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                +
              </div>
            )}
          </div>
          <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
            {item.currentSlots + (joined ? 1 : 0)}/{item.maxSlots} người
          </span>
        </div>

        {/* Right: Big Price & Blue Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-base sm:text-lg font-bold text-blue-600 tracking-tight">
            {item.feePerSlot.endsWith('đ') ? item.feePerSlot : `${item.feePerSlot.replace(/k$/i, '.000')}đ`}
          </span>

          {joined ? (
            <span className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </span>
          ) : (
            <button
              onClick={() => {
                setJoined(true);
                onJoin?.(item);
              }}
              type="button"
              className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center shadow-xs hover:shadow transition-all cursor-pointer shrink-0"
              title="Vào slot"
              aria-label="Vào slot"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}
        </div>
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


