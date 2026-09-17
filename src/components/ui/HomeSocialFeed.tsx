'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Flame,
  Info,
  MapPin,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { api } from '@/lib/axios';

export type ActivityEventType =
  | 'CLUB_RECRUITING'
  | 'TOURNAMENT_OPENED';

interface ClubIdentity {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string | null;
  verified: boolean;
}

interface JoinedPlayer {
  name: string;
  initialsBg: string;
  avatarUrl?: string | null;
}

export interface ActivityFeedItem {
  id: string;
  type: ActivityEventType;
  clubMatchSessionId?: string;
  tournamentId?: string;
  sport: string;
  sportTier: string;
  playDate: string;
  startTime: string;
  endTime?: string;
  location: string;
  title: string;
  description: string;
  bannerUrl?: string;
  club: ClubIdentity;
  courtDetails?: string;
  rules?: string[];
  slots?: {
    current: number;
    max: number;
    feePerSlot: string;
    joinedPlayers: JoinedPlayer[];
  };
  tournament?: {
    id: string;
    remainingSlots: number;
    totalSlots: number;
    prize?: string;
  };
}

interface DateTab {
  key: string;
  dayLabel: string;
  dateLabel: string;
  isToday: boolean;
}

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const AVATAR_COLORS = [
  '#2563eb',
  '#0f766e',
  '#c2410c',
  '#7c3aed',
  '#be123c',
  '#475569',
];

function startOfLocalDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getMissingLabel(current: number, max: number) {
  const missing = Math.max(max - current, 0);
  return missing === 0 ? 'Đã đủ người' : `Thiếu ${missing} người`;
}

type ApiActivityFeedItem = {
  id: string;
  type: 'CLUB_RECRUITING' | 'TOURNAMENT_OPENED';
  sport: string | null;
  sportTier: string | null;
  playDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  title: string;
  description: string | null;
  community: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  clubMatchSessionId: string | null;
  tournamentId: string | null;
  verified: boolean;
  slots: {
    current: number;
    max: number;
    feePerSlot: number | null;
    joinedPlayers: Array<{
      userId: string;
      name: string;
      avatarUrl: string | null;
    }>;
  } | null;
  tournament: {
    id: string;
    remainingSlots: number;
    totalSlots: number;
    bannerUrl: string | null;
  } | null;
};

type ActivityFeedApiResponse = {
  data: {
    items: ApiActivityFeedItem[];
  };
  meta?: {
    hasMore?: boolean;
    nextCursor?: string | null;
  };
};

function getVietnamDateParts(value: string | null) {
  if (!value) return { year: '', month: '', day: '' };
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])) as {
    year: string;
    month: string;
    day: string;
  };
}

function getVietnamDateKey(value: string | null) {
  const { year, month, day } = getVietnamDateParts(value);
  return year && month && day ? `${year}-${month}-${day}` : '';
}

function getVietnamTime(value: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function formatFee(value: number | null) {
  return value == null ? 'Theo thỏa thuận' : `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
}

function mapApiActivity(item: ApiActivityFeedItem): ActivityFeedItem {
  const initials = getInitials(item.community.name) || 'CLB';
  return {
    id: item.id,
    type: item.type,
    sport: item.sport ?? 'Thể thao',
    sportTier: item.sportTier ?? 'Chưa cập nhật trình độ',
    playDate: getVietnamDateKey(item.playDate),
    startTime: getVietnamTime(item.startTime),
    endTime: getVietnamTime(item.endTime) || undefined,
    location: item.location ?? 'Đang cập nhật địa điểm',
    title: item.title,
    description: item.description ?? '',
    bannerUrl: item.tournament?.bannerUrl ?? undefined,
    club: {
      id: item.community.id,
      name: item.community.name,
      initials,
      avatarUrl: item.community.logoUrl,
      verified: item.verified,
    },
    slots: item.slots
      ? {
          current: item.slots.current,
          max: item.slots.max,
          feePerSlot: formatFee(item.slots.feePerSlot),
          joinedPlayers: item.slots.joinedPlayers.map((player, index) => ({
            name: player.name,
            initialsBg: AVATAR_COLORS[index % AVATAR_COLORS.length],
            avatarUrl: player.avatarUrl,
          })),
        }
      : undefined,
    tournament: item.tournament
      ? {
          id: item.tournament.id,
          remainingSlots: item.tournament.remainingSlots,
          totalSlots: item.tournament.totalSlots,
        }
      : undefined,
    clubMatchSessionId: item.clubMatchSessionId ?? undefined,
    tournamentId: item.tournamentId ?? item.tournament?.id ?? undefined,
  };
}

function ClubAvatar({ club, size = 'default' }: { club: ClubIdentity; size?: 'default' | 'small' }) {
  const sizeClass = size === 'small' ? 'h-8 w-8 text-[10px]' : 'h-10 w-10 text-xs';

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-blue-100 bg-blue-50 font-bold text-blue-700 ${sizeClass}`}
      style={
        club.avatarUrl
          ? {
              backgroundImage: `url(${club.avatarUrl})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }
          : undefined
      }
      role="img"
      aria-label={`Logo ${club.name}`}
    >
      {!club.avatarUrl && club.initials}
    </div>
  );
}

function ClubIdentityRow({ item }: { item: ActivityFeedItem }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <ClubAvatar club={item.club} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-bold text-slate-900">{item.club.name}</span>
          {item.club.verified && (
            <ShieldCheck
              className="h-4 w-4 shrink-0 text-blue-600"
              aria-label="CLB đã xác minh"
            />
          )}
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500">
          <span>{item.sport}</span>
          <span aria-hidden="true">•</span>
          <span className="truncate font-medium text-slate-600">{item.sportTier}</span>
        </div>
      </div>
    </div>
  );
}

function PlayerAvatar({ player, index }: { player: JoinedPlayer; index: number }) {
  const backgroundColor = player.initialsBg || AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <span
      className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white text-[10px] font-bold text-white shadow-sm"
      style={{
        backgroundColor,
        ...(player.avatarUrl
          ? {
              backgroundImage: `url(${player.avatarUrl})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }
          : {}),
      }}
      title={player.name}
      aria-label={player.name}
    >
      {!player.avatarUrl && getInitials(player.name)}
    </span>
  );
}

function EventShell({
  children,
  reducedMotion,
}: {
  children: ReactNode;
  reducedMotion: boolean;
}) {
  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      whileHover={reducedMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-blue-200"
    >
      {children}
    </motion.article>
  );
}

function ShareButton({ onShare }: { onShare: () => void }) {
  return (
    <button
      type="button"
      onClick={onShare}
      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98]"
      aria-label="Chia sẻ hoạt động lên bảng tin"
      title="Chia sẻ lên bảng tin"
    >
      <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="hidden sm:inline">Chia sẻ</span>
    </button>
  );
}

// ── Session Detail Popup Modal ──────────────────────────────────────────────
function SessionDetailModal({
  item,
  isJoined,
  onClose,
  onJoin,
}: {
  item: ActivityFeedItem;
  isJoined: boolean;
  onClose: () => void;
  onJoin: () => Promise<boolean>;
}) {
  const slots = item.slots;
  const isFull = slots ? slots.current >= slots.max : false;
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSendRequest = async () => {
    if (!isFull && !isJoined) {
      const didJoin = await onJoin();
      if (!didJoin) return;
    }
    setSubmitted(true);
    toast.success('Đã gửi yêu cầu tham gia thành công!');
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-xs"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-modal="true"
      role="dialog"
      aria-label={item.title}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden">

        {/* ── Clean Header (No Dark Blue Banner) ── */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200"
              style={item.club.avatarUrl ? { backgroundImage: `url(${item.club.avatarUrl})`, backgroundSize: 'cover' } : {}}
            >
              {!item.club.avatarUrl && item.club.initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900 truncate">{item.club.name}</span>
                {item.club.verified && (
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" aria-label="Đã xác minh" />
                )}
              </div>
              <p className="text-xs text-slate-500">{item.sport} · {item.sportTier}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── 2-Column Body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] divide-y md:divide-y-0 md:divide-x divide-slate-100">

            {/* Left column: Session details + Overview metrics + Note */}
            <div className="p-6 space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  {slots && (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                      isFull
                        ? 'border-slate-200 bg-slate-100 text-slate-600'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}>
                      <Flame className="h-3 w-3" />
                      {getMissingLabel(slots.current, slots.max)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                    Có ELO
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    Buổi giao lưu
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-950 leading-tight">{item.title}</h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.description}</p>
              </div>

              {/* Info Rows */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center gap-2.5 text-xs text-slate-700">
                  <Clock3 className="h-4 w-4 shrink-0 text-blue-600" />
                  <span className="font-semibold">{item.startTime}{item.endTime ? ` – ${item.endTime}` : ''}</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-700">
                  <MapPin className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                  <span className="font-medium">{item.location}</span>
                </div>
                {slots && (
                  <div className="flex items-center gap-2.5 text-xs text-slate-700">
                    <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="font-bold text-emerald-700">{slots.feePerSlot}/người · Chia tiền sân</span>
                  </div>
                )}
                {item.courtDetails && (
                  <div className="flex items-start gap-2.5 text-xs text-slate-500">
                    <Info className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                    <span>{item.courtDetails}</span>
                  </div>
                )}
              </div>

              {/* Rules if available */}
              {item.rules && item.rules.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Quy định buổi chơi</h3>
                  <ul className="space-y-1.5">
                    {item.rules.map((rule, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-600 mt-0.5" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Note input */}
              {!submitted && !isJoined && !isFull && (
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    Ghi chú gửi kèm <span className="font-normal text-slate-400">(không bắt buộc)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ví dụ: Mình chơi trình 2.8, xin slot giao lưu vui vẻ nhé..."
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  />
                </div>
              )}

              {/* Success notice */}
              {(submitted || isJoined) && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2.5">
                  <UserCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                  <p className="text-xs font-bold text-emerald-800">Đã tham gia buổi giao lưu thành công!</p>
                </div>
              )}
            </div>

            {/* Right column: Exact SportO Slot Grid Widget (Image 3 style) */}
            {slots && (
              <div className="p-6 bg-slate-50/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">Xác nhận tham gia</h3>
                    <span className="text-xs font-bold text-slate-500">{slots.current}/{slots.max}</span>
                  </div>

                  {/* 4-column Slot Grid matching Image 3 */}
                  <div className="mt-5 grid grid-cols-4 gap-x-2 gap-y-4">
                    {/* Joined Players with SportO round avatars */}
                    {slots.joinedPlayers.map((p, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 min-w-0">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs"
                          style={{ backgroundColor: p.initialsBg || '#3b82f6' }}
                        >
                          {getInitials(p.name)}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 text-center truncate w-full">
                          {p.name.split(' ').pop()}
                        </span>
                      </div>
                    ))}

                    {/* Empty Dash-border Slots */}
                    {Array.from({ length: Math.max(slots.max - slots.current, 0) }).map((_, i) => {
                      const slotNumber = slots.current + i + 1;
                      return (
                        <div key={`empty-slot-${i}`} className="flex flex-col items-center gap-1.5 min-w-0">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-slate-200 bg-white text-lg font-light text-slate-400">
                            +
                          </div>
                          <span className="text-[10px] text-slate-400 text-center truncate w-full">
                            Slot #{slotNumber}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-400">
                    {isFull
                      ? 'Buổi giao lưu đã đủ người tham gia'
                      : `Còn trống ${Math.max(slots.max - slots.current, 0)} slot`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div className="border-t border-slate-100 bg-white px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Đóng
          </button>
          {!submitted && !isJoined && !isFull && (
            <button
              type="button"
              onClick={handleSendRequest}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors active:scale-[0.98]"
            >
              <Send className="h-4 w-4" />
              Gửi yêu cầu tham gia
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ClubSessionCard({
  item,
  reducedMotion,
  isJoined,
  onJoin,
  onShare,
}: {
  item: ActivityFeedItem;
  reducedMotion: boolean;
  isJoined: boolean;
  onJoin: () => Promise<boolean>;
  onShare: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  if (!item.slots) return null;

  const { current, max, feePerSlot, joinedPlayers } = item.slots;
  const isFull = current >= max;
  const statusLabel = getMissingLabel(current, max);
  const joinedLabel = isJoined ? 'Đã vào slot' : isFull ? 'Đã đủ' : 'Vào slot';

  return (
    <>
      {showModal && (
        <SessionDetailModal
          item={item}
          isJoined={isJoined}
          onClose={() => setShowModal(false)}
          onJoin={onJoin}
        />
      )}
      <EventShell reducedMotion={reducedMotion}>
        <div className="space-y-3 p-3.5 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <ClubIdentityRow item={item} />
            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                isFull
                  ? 'border-slate-200 bg-slate-100 text-slate-600'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              {statusLabel}
            </span>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-bold leading-snug text-slate-950 sm:text-base">{item.title}</h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                <Clock3 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                {item.startTime} - {item.endTime}
              </span>
              <span className="text-slate-300" aria-hidden="true">•</span>
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="truncate">{item.location}</span>
              </span>
              <span className="text-slate-300" aria-hidden="true">•</span>
              <span className="font-bold text-slate-800">{feePerSlot}/người</span>
            </div>
          </div>

          <p className="line-clamp-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{item.description}</p>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2.5" aria-label={`${current} trên ${max} người đã vào slot`}>
              <div className="flex -space-x-2">
                {joinedPlayers.slice(0, max).map((player, index) => (
                  <PlayerAvatar key={`${player.name}-${index}`} player={player} index={index} />
                ))}
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                <UsersRound className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                {current}/{max} đã vào
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ShareButton onShare={onShare} />
              <button
                type="button"
                onClick={() => setShowModal(true)}
                disabled={isFull && !isJoined}
                className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98] ${
                  isJoined
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isFull
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                    : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                }`}
              >
                {isJoined ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />}
                {joinedLabel}
              </button>
            </div>
          </div>
        </div>
      </EventShell>
    </>
  );
}

function TournamentCard({
  item,
  reducedMotion,
  onShare,
}: {
  item: ActivityFeedItem;
  reducedMotion: boolean;
  onShare: () => void;
}) {
  if (!item.tournament) return null;

  const { remainingSlots, totalSlots } = item.tournament;
  const bannerStyle = item.bannerUrl
    ? {
        backgroundImage: `url(${item.bannerUrl})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }
    : undefined;

  return (
    <EventShell reducedMotion={reducedMotion}>
      <div
        className="relative h-28 overflow-hidden bg-slate-900 sm:h-32"
        style={bannerStyle}
        role="img"
        aria-label={`Banner ${item.title}`}
      >
        {!item.bannerUrl && <div className="absolute inset-0 bg-blue-950" aria-hidden="true" />}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/10" aria-hidden="true" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2 sm:inset-x-4">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="rounded-md bg-amber-400 px-2 py-1 text-[10px] font-extrabold tracking-wide text-slate-950">
              MỞ ĐĂNG KÝ
            </span>
            <span className="truncate rounded-md border border-white/15 bg-slate-950/50 px-2 py-1 text-[10px] font-semibold text-white">
              {item.sport}
            </span>
          </div>
          <div className="flex max-w-[52%] min-w-0 items-center gap-1.5 rounded-md bg-slate-950/50 px-2 py-1 text-[10px] font-semibold text-white">
            <ClubAvatar club={item.club} size="small" />
            <span className="truncate">{item.club.name}</span>
            {item.club.verified && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-blue-300" aria-label="CLB đã xác minh" />}
          </div>
        </div>
        <div className="absolute inset-x-3 bottom-3 sm:inset-x-4">
          <h3 className="line-clamp-2 text-base font-bold leading-tight text-white drop-shadow-sm sm:text-lg">{item.title}</h3>
        </div>
      </div>

      <div className="space-y-3 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
            <Clock3 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            Mở cổng {item.startTime}
          </span>
          <span className="text-slate-300" aria-hidden="true">•</span>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="truncate">{item.location}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div>
            <p className="text-xs font-bold text-blue-700">Còn {remainingSlots}/{totalSlots} suất</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{item.tournament.prize}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ShareButton onShare={onShare} />
            <Link
              href="/tournaments"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              Xem giải
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </EventShell>
  );
}

export default function HomeSocialFeed() {
  const reducedMotion = Boolean(useReducedMotion());
  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(today));
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [joinedActivityIds, setJoinedActivityIds] = useState<Set<string>>(() => new Set());
  const dateStripRef = useRef<HTMLDivElement>(null);

  const dateTabs = useMemo<DateTab[]>(
    () =>
      Array.from({ length: 30 }, (_, index) => {
        const date = addDays(today, index);
        return {
          key: formatDateKey(date),
          dayLabel: index === 0 ? 'Hôm nay' : DAY_NAMES[date.getDay()],
          dateLabel: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`,
          isToday: index === 0,
        };
      }),
    [today],
  );

  const activeDate = dateTabs.find((tab) => tab.key === selectedDate) ?? dateTabs[0];

  useEffect(() => {
    let cancelled = false;

    api
      .get<ActivityFeedApiResponse>('/communities/activity-feed', {
        params: { date: selectedDate, limit: 50 },
      })
      .then((response) => {
        if (cancelled) return;
        setActivities((response?.data?.items ?? []).map(mapApiActivity));
      })
      .catch(() => {
        if (!cancelled) setHasLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const activeActivities = useMemo(
    () =>
      activities
        .filter((activity) => activity.playDate === activeDate.key)
        .sort((left, right) => left.startTime.localeCompare(right.startTime)),
    [activeDate.key, activities],
  );
  const timelineGroups = useMemo(() => {
    const groups = new Map<string, ActivityFeedItem[]>();
    activeActivities.forEach((activity) => {
      const group = groups.get(activity.startTime) ?? [];
      group.push(activity);
      groups.set(activity.startTime, group);
    });
    return Array.from(groups, ([time, items]) => ({ time, items }));
  }, [activeActivities]);

  const handleDateClick = useCallback((dateKey: string) => {
    setIsLoading(true);
    setHasLoadError(false);
    setActivities([]);
    setSelectedDate(dateKey);
  }, []);

  const handleJoinSlot = useCallback(async (item: ActivityFeedItem) => {
    if (!item.slots) return false;
    if (!item.clubMatchSessionId) {
      toast.error('Hoạt động này chưa sẵn sàng nhận đăng ký');
      return false;
    }
    if (item.slots.current >= item.slots.max) {
      toast.error('Kèo này đã đủ người');
      return false;
    }

    setActivities((currentActivities) =>
      currentActivities.map((activity) => {
        if (activity.id !== item.id || !activity.slots) return activity;
        const nextCurrent = Math.min(activity.slots.current + 1, activity.slots.max);
        return {
          ...activity,
          slots: {
            ...activity.slots,
            current: nextCurrent,
            joinedPlayers: [
              ...activity.slots.joinedPlayers,
              { name: 'Bạn', initialsBg: '#1d8ef8' },
            ].slice(0, activity.slots.max),
          },
        };
      }),
    );
    setJoinedActivityIds((currentIds) => new Set(currentIds).add(item.id));
    try {
      await api.post(`/club-match-sessions/${item.clubMatchSessionId}/participants/self`);
      toast.success(`Đã vào slot của ${item.club.name}`);
      return true;
    } catch {
      setActivities((currentActivities) =>
        currentActivities.map((activity) => {
          if (activity.id !== item.id || !activity.slots) return activity;
          return {
            ...activity,
            slots: {
              ...activity.slots,
              current: item.slots!.current,
              joinedPlayers: item.slots!.joinedPlayers,
            },
          };
        }),
      );
      setJoinedActivityIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(item.id);
        return nextIds;
      });
      toast.error('Không thể vào slot. Vui lòng thử lại.');
      return false;
    }
  }, []);

  const handleShare = useCallback(async (item: ActivityFeedItem) => {
    const target = item.clubMatchSessionId
      ? { clubMatchSessionId: item.clubMatchSessionId }
      : item.tournamentId
        ? { tournamentId: item.tournamentId }
        : null;
    if (!target) {
      toast.error('Hoạt động chưa có liên kết hợp lệ');
      return;
    }
    try {
      await api.post(`/communities/${item.club.id}/activity-share`, target, {
        headers: {
          'Idempotency-Key': `activity-share-${item.id}`,
        },
      });
      toast.success(`Đã chia sẻ hoạt động của ${item.club.name}`);
    } catch {
      toast.error('Không thể chia sẻ hoạt động. Vui lòng thử lại.');
    }
  }, []);

  return (
    <section className="space-y-4" aria-labelledby="social-feed-heading">
      <h2 id="social-feed-heading" className="sr-only">
        Hoạt động đang tìm người
      </h2>

      <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div
          ref={dateStripRef}
          className="no-scrollbar flex items-stretch gap-1 overflow-x-auto px-0.5 py-0.5 select-none"
          style={{ scrollBehavior: 'smooth', touchAction: 'pan-x' }}
          aria-label="Chọn ngày hoạt động"
        >
          {dateTabs.map((tab) => {
            const isSelected = tab.key === activeDate.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleDateClick(tab.key)}
                className={`relative flex min-w-[76px] shrink-0 flex-col items-center justify-center rounded-xl px-2.5 py-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
                aria-current={isSelected ? 'date' : undefined}
              >
                <span className={`whitespace-nowrap text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                  {tab.dayLabel}
                </span>
                <span className={`mt-0.5 text-[11px] ${isSelected ? 'font-bold text-blue-600' : 'text-slate-400'}`}>
                  {tab.dateLabel}
                </span>
                {isSelected && <span className="absolute inset-x-5 bottom-1 h-0.5 rounded-full bg-blue-600" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
          Đang tải hoạt động CLB...
        </div>
      ) : hasLoadError ? (
        <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 px-6 py-12 text-center">
          <h3 className="text-base font-bold text-rose-800">Không tải được bảng tin CLB</h3>
          <p className="mt-1 text-sm text-rose-700">Vui lòng thử lại sau.</p>
        </div>
      ) : timelineGroups.length > 0 ? (
        <div className="space-y-5">
          {timelineGroups.map((group) => (
            <div key={group.time} className="relative">
              <div className="mb-2 flex items-center gap-3 px-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Clock3 className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
                  <span className="font-bold text-slate-900">{group.time}</span>
                  <span>• {group.items.length} hoạt động</span>
                </div>
                <div className="h-px flex-1 bg-slate-200" aria-hidden="true" />
              </div>
              <div className="space-y-3 border-l-2 border-blue-100 pl-3 sm:pl-4">
                {group.items.map((item) => {
                  const isTournament = item.type === 'TOURNAMENT_OPENED';
                  return isTournament ? (
                    <TournamentCard
                      key={item.id}
                      item={item}
                      reducedMotion={reducedMotion}
                      onShare={() => handleShare(item)}
                    />
                  ) : (
                    <ClubSessionCard
                      key={item.id}
                      item={item}
                      reducedMotion={reducedMotion}
                      isJoined={joinedActivityIds.has(item.id)}
                      onJoin={() => handleJoinSlot(item)}
                      onShare={() => handleShare(item)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900">Chưa có hoạt động trong ngày này</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
            Thử kéo sang ngày khác để tìm kèo giao lưu hoặc giải đấu đang mở đăng ký.
          </p>
        </div>
      )}
    </section>
  );
}
