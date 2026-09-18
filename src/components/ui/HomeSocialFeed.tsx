'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  MapPin,
  MessageSquare,
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
import { DateTimePicker } from '@/components/ui/Input';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { regionsApi } from '@/features/regions/api';
import { removeVietnameseTones, useAutoAddressParser } from '@/utils/vietnamAddressParser';
import type { Region } from '@/types/region';
import { SearchableRegionSelect } from '@/components/shared/SearchableRegionSelect';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';

export type ActivityEventType =
  | 'CLUB_RECRUITING'
  | 'TOURNAMENT_OPENED'
  | 'PERSONAL_PICKUP';

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

interface PersonalHostIdentity {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string | null;
}

export interface HomeFeedCategory {
  id: string;
  name: string;
  slug?: string;
  isActive?: boolean;
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
  rawDescription?: string;
  bannerUrl?: string;
  club?: ClubIdentity;
  personalHost?: PersonalHostIdentity;
  isJoined?: boolean;
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

type PersonalPickupApiItem = {
  id: string;
  type: 'PERSONAL_PICKUP';
  title: string;
  description: string | null;
  playDate: string;
  startTime: string;
  endTime: string;
  location: string;
  sport: string;
  sportTier: string;
  feePerSlot: number;
  maxSlots: number;
  currentSlots: number;
  status: string;
  personalHost: { id: string; name: string; avatarUrl: string | null };
  isJoined: boolean;
  joinedPlayers: Array<{ userId: string; name: string; avatarUrl: string | null }>;
};

type PersonalPickupApiResponse = {
  data: PersonalPickupApiItem[] | { items: PersonalPickupApiItem[] };
  meta?: { hasMore?: boolean; nextCursor?: string | null };
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
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const { year, month, day } = getVietnamDateParts(value);
  return year && month && day ? `${year}-${month}-${day}` : '';
}

function getVietnamTime(value: string | null) {
  if (!value) return '';
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return value;
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

function getDescriptionPreview(value: string | null) {
  if (!value) return '';
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
    description: getDescriptionPreview(item.description),
    rawDescription: item.description || undefined,
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

function mapPersonalPickup(item: PersonalPickupApiItem): ActivityFeedItem {
  return {
    id: item.id,
    type: 'PERSONAL_PICKUP',
    sport: item.sport || 'Thể thao',
    sportTier: item.sportTier || 'Mọi trình độ',
    playDate: getVietnamDateKey(item.playDate),
    startTime: item.startTime,
    endTime: item.endTime,
    location: item.location,
    title: item.title,
    description: getDescriptionPreview(item.description),
    rawDescription: item.description || undefined,
    personalHost: {
      id: item.personalHost.id,
      name: item.personalHost.name,
      initials: getInitials(item.personalHost.name) || 'Bạn',
      avatarUrl: item.personalHost.avatarUrl,
    },
    isJoined: item.isJoined,
    slots: {
      current: item.currentSlots,
      max: item.maxSlots,
      feePerSlot: formatFee(item.feePerSlot),
      joinedPlayers: item.joinedPlayers.map((player, index) => ({
        name: player.name,
        initialsBg: AVATAR_COLORS[index % AVATAR_COLORS.length],
        avatarUrl: player.avatarUrl,
      })),
    },
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
  if (!item.club) return null;

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
  onLeave,
}: {
  item: ActivityFeedItem;
  isJoined: boolean;
  onClose: () => void;
  onJoin: () => Promise<boolean>;
  onLeave: () => Promise<boolean>;
}) {
  const slots = item.slots;
  const isFull = slots ? slots.current >= slots.max : false;
  const isPersonal = item.type === 'PERSONAL_PICKUP';
  const identity = item.club ?? item.personalHost;
  const [note, setNote] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Array<{ name: string; note?: string }>>([]);
  const [slotPage, setSlotPage] = useState(1);
  const SLOTS_PER_PAGE = 16;
  const openUserById = useUserProfileModalStore((state) => state.openUserById);

  const handleOpenHostProfile = (e: React.MouseEvent) => {
    if (!identity?.id) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    openUserById(identity.id, identity.name, identity.avatarUrl || null, rect);
  };

  const handleJoin = async () => {
    if (isFull || isJoined || isPending || isActionLoading) return;
    setIsActionLoading(true);

    const userNote = note.trim() || undefined;
    // Chế độ xét duyệt: Không add vào joinedPlayers ngay, chỉ đưa vào danh sách Chờ duyệt!
    setTimeout(() => {
      setIsActionLoading(false);
      setIsPending(true);
      setPendingRequests((prev) => [
        ...prev.filter((p) => p.name !== 'Bạn'),
        { name: 'Bạn', note: userNote },
      ]);
      toast.success('Đã gửi yêu cầu xin tham gia! Vui lòng chờ host duyệt.');
    }, 300);
  };

  const handleCancelRequest = () => {
    setIsPending(false);
    setPendingRequests((prev) => prev.filter((p) => p.name !== 'Bạn'));
    toast.success('Đã hủy yêu cầu xin tham gia');
  };

  const handleApproveRequest = async (req: { name: string; note?: string }) => {
    setPendingRequests((prev) => prev.filter((p) => p !== req));
    if (req.name === 'Bạn') {
      setIsPending(false);
      // Khi Host đồng ý chính thức add người vào buổi chơi
      await onJoin();
    } else {
      if (slots && slots.joinedPlayers) {
        slots.joinedPlayers.push({ name: req.name, initialsBg: '#10b981' });
        slots.current = Math.min(slots.current + 1, slots.max);
      }
    }
    toast.success(`Đã duyệt yêu cầu của ${req.name}!`);
  };

  const handleRejectRequest = (req: { name: string; note?: string }) => {
    setPendingRequests((prev) => prev.filter((p) => p !== req));
    if (req.name === 'Bạn') {
      setIsPending(false);
    }
    toast.success(`Đã từ chối yêu cầu của ${req.name}`);
  };

  const handleLeave = async () => {
    if (!isJoined || isActionLoading) return;
    setIsActionLoading(true);
    await onLeave();
    setIsActionLoading(false);
  };

  const hasHtmlDescription = Boolean(item.rawDescription && /<[a-z][\s\S]*>/i.test(item.rawDescription));

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-xs"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-modal="true"
      role="dialog"
      aria-label={item.title}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">

        {/* ── Clean Header: Clickable to view Host profile + Contact Button ── */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleOpenHostProfile}
              className="group flex items-center gap-3 min-w-0 text-left cursor-pointer focus-visible:outline-none"
              title="Xem trang cá nhân của host"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 group-hover:border-blue-300 transition-colors"
                style={identity?.avatarUrl ? { backgroundImage: `url(${identity.avatarUrl})`, backgroundSize: 'cover' } : {}}
              >
                {!identity?.avatarUrl && identity?.initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {identity?.name ?? 'Người chơi'}
                  </span>
                  {!isPersonal && item.club?.verified && (
                    <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" aria-label="Đã xác minh" />
                  )}
                </div>
                <p className="text-xs text-slate-500">{isPersonal ? 'Giao lưu cá nhân' : `${item.sport} · ${item.sportTier}`}</p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {identity?.id && (
              <button
                type="button"
                onClick={handleOpenHostProfile}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                Liên hệ host
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── 2-Column Body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr] divide-y md:divide-y-0 md:divide-x divide-slate-100 min-h-full">

            {/* Left column: Session details + Note */}
            <div className="p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3.5">
                {/* Title */}
                <h2 className="text-xl font-bold text-slate-900 leading-snug">{item.title}</h2>

                {/* Location & Schedule Info (Clean typography, no icons, no grey box) */}
                <div className="space-y-1.5 text-xs text-slate-600">
                  {item.location && (
                    <div className="font-medium text-slate-700 leading-relaxed">
                      {item.location}
                    </div>
                  )}

                  {/* Sport · Date · Time line */}
                  {(item.sport || item.playDate || item.startTime) && (
                    <div className="flex flex-wrap items-center gap-x-2 text-slate-500 text-xs">
                      {item.sport && <span>{item.sport}</span>}
                      {item.sport && (item.playDate || item.startTime) && <span>·</span>}
                      {item.playDate && (
                        <span>
                          {(() => {
                            const [y, m, d] = item.playDate.split('-');
                            return `${d}/${m}/${y}`;
                          })()}
                        </span>
                      )}
                      {item.playDate && item.startTime && <span>·</span>}
                      {item.startTime && (
                        <span>
                          {item.startTime}{item.endTime ? ` – ${item.endTime}` : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Description (Rich Text support) */}
                {item.rawDescription ? (
                  hasHtmlDescription ? (
                    <div
                      className="text-xs text-slate-600 leading-relaxed prose prose-sm max-w-none [&>p]:mb-1.5 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4"
                      dangerouslySetInnerHTML={{ __html: item.rawDescription }}
                    />
                  ) : (
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{item.rawDescription}</p>
                  )
                ) : item.description ? (
                  <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                ) : null}

                {/* Rules if available */}
                {item.rules && item.rules.length > 0 && (
                  <div className="pt-2">
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
              </div>

              {/* Note input when not yet joined - sạch sẽ, không đóng khung card viền thô */}
              {!isJoined && !isPending && !isFull && (
                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Ghi chú gửi kèm <span className="font-normal text-slate-400">(không bắt buộc)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ví dụ: Mình chơi trình 2.8, xin slot giao lưu vui vẻ nhé..."
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all resize-none"
                  />
                </div>
              )}
            </div>

            {/* Right column: Slot Grid */}
            {slots && (
              <div className="p-6 bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Danh sách tham gia</h3>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isFull
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {getMissingLabel(slots.current, slots.max)}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-500">{slots.current}/{slots.max}</span>
                  </div>

                  {/* 4-column Slot Grid: hiển thị đúng 16 slot/trang, có phân trang rõ ràng nếu > 16 slot */}
                  {(() => {
                    const totalPages = Math.ceil(slots.max / SLOTS_PER_PAGE);
                    const currentPage = Math.min(Math.max(slotPage, 1), totalPages);
                    const startIndex = (currentPage - 1) * SLOTS_PER_PAGE;
                    const endIndex = Math.min(startIndex + SLOTS_PER_PAGE, slots.max);
                    const slotsOnCurrentPage = Array.from({ length: endIndex - startIndex }, (_, idx) => startIndex + idx + 1);

                    return (
                      <div className="mt-3.5 space-y-3">
                        <div className="grid grid-cols-4 gap-x-2 gap-y-3.5">
                          {slotsOnCurrentPage.map((slotNum) => {
                            // 1. Kiểm tra người đã tham gia chính thức
                            const joinedPlayer = slots.joinedPlayers[slotNum - 1];
                            if (joinedPlayer) {
                              const isMe = joinedPlayer.name === 'Bạn';
                              return (
                                <div key={`slot-${slotNum}`} className="flex flex-col items-center gap-1 min-w-0">
                                  <div
                                    className={`relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white shadow-xs ${isMe && isJoined ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                                    style={{
                                      backgroundColor: joinedPlayer.initialsBg || '#3b82f6',
                                      ...(joinedPlayer.avatarUrl
                                        ? {
                                            backgroundImage: `url(${joinedPlayer.avatarUrl})`,
                                            backgroundPosition: 'center',
                                            backgroundSize: 'cover',
                                          }
                                        : {}),
                                    }}
                                    title={`Slot #${slotNum}: ${joinedPlayer.name}`}
                                  >
                                    {!joinedPlayer.avatarUrl && getInitials(joinedPlayer.name)}
                                    {isMe && isJoined && (
                                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-[8px] text-white">✓</span>
                                    )}
                                  </div>
                                  <span className="text-[11px] font-semibold text-slate-700 text-center truncate w-full">
                                    {isMe ? 'Bạn' : joinedPlayer.name.split(' ').pop()}
                                  </span>
                                </div>
                              );
                            }

                            // 2. Kiểm tra người đang chờ duyệt (nằm ở các slot kế tiếp)
                            const pendingIndex = slotNum - 1 - slots.joinedPlayers.length;
                            const pendingPlayer = pendingRequests[pendingIndex];
                            if (pendingPlayer) {
                              const isMyPending = pendingPlayer.name === 'Bạn';
                              return (
                                <div key={`slot-${slotNum}`} className="flex flex-col items-center gap-1 min-w-0">
                                  <div
                                    className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-amber-400 bg-amber-50 text-xs font-bold text-amber-700 shadow-xs"
                                    title={`Slot #${slotNum} - Chờ duyệt: ${pendingPlayer.name}${pendingPlayer.note ? ` (${pendingPlayer.note})` : ''}`}
                                  >
                                    {getInitials(pendingPlayer.name)}
                                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white">⏳</span>
                                  </div>
                                  <span className="text-[10px] font-medium text-amber-700 text-center truncate w-full">
                                    {isMyPending ? 'Bạn (Chờ)' : pendingPlayer.name.split(' ').pop()}
                                  </span>
                                </div>
                              );
                            }

                            // 3. Slot trống
                            const isNextOpenSlot = slotNum === slots.joinedPlayers.length + pendingRequests.length + 1;
                            const canJoin = isNextOpenSlot && !isJoined && !isPending && !isFull;

                            return (
                              <div key={`slot-${slotNum}`} className="flex flex-col items-center gap-1 min-w-0">
                                <button
                                  type="button"
                                  disabled={!canJoin || isActionLoading}
                                  onClick={canJoin ? handleJoin : undefined}
                                  title={canJoin ? 'Bấm để xin tham gia slot này' : `Slot #${slotNum} trống`}
                                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed text-base font-light transition-all ${
                                    canJoin
                                      ? 'border-blue-300 bg-blue-50 text-blue-500 hover:border-blue-500 hover:bg-blue-100 hover:text-blue-700 cursor-pointer'
                                      : 'border-slate-200 bg-white text-slate-300 cursor-default'
                                  }`}
                                >
                                  +
                                </button>
                                <span className="text-[10px] text-slate-400 text-center truncate w-full">
                                  Slot #{slotNum}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Pagination khi tổng số slot > 16 */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                            <span>Trang {currentPage} / {totalPages} (Slot {startIndex + 1}–{endIndex})</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={currentPage <= 1}
                                onClick={() => setSlotPage((p) => Math.max(p - 1, 1))}
                                className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
                                title="Trang trước"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={currentPage >= totalPages}
                                onClick={() => setSlotPage((p) => Math.min(p + 1, totalPages))}
                                className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
                                title="Trang sau"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Danh sách yêu cầu chờ duyệt dành cho Host */}
                  {pendingRequests.length > 0 && (
                    <div className="mt-4 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                        <span>Yêu cầu xin tham gia ({pendingRequests.length})</span>
                      </div>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {pendingRequests.map((req, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-md border border-amber-100 shadow-2xs text-xs">
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-slate-800">{req.name}</span>
                              {req.note && <p className="text-[11px] text-slate-500 truncate">{req.note}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleApproveRequest(req)}
                                className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] transition-colors"
                              >
                                Đồng ý
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectRequest(req)}
                                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] transition-colors"
                              >
                                Từ chối
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                  <p className="text-xs text-slate-400 text-center">
                    {isFull
                      ? 'Buổi giao lưu đã đủ người tham gia'
                      : `Còn trống ${Math.max(slots.max - slots.current - pendingRequests.length, 0)} slot`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer Actions: Fee displayed on the left, buttons on the right ── */}
        <div className="border-t border-slate-100 bg-white px-6 py-3.5 flex items-center justify-between gap-3">
          {slots ? (
            <div className="flex items-center gap-1 text-sm font-bold text-slate-800">
              <span>{slots.feePerSlot}/người</span>
            </div>
          ) : <div />}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Đóng
            </button>
            {isJoined && (
              <button
                type="button"
                onClick={handleLeave}
                disabled={isActionLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                {isActionLoading ? 'Đang xử lý...' : 'Rút khỏi'}
              </button>
            )}
            {isPending && (
              <button
                type="button"
                onClick={handleCancelRequest}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors"
                title="Bấm để hủy yêu cầu xin tham gia"
              >
                <span>⏳ Chờ duyệt (Hủy)</span>
              </button>
            )}
            {!isJoined && !isPending && !isFull && (
              <button
                type="button"
                onClick={handleJoin}
                disabled={isActionLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors active:scale-[0.98] disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                {isActionLoading ? 'Đang xử lý...' : 'Xin tham gia'}
              </button>
            )}
          </div>
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
  onLeave,
  onShare,
}: {
  item: ActivityFeedItem;
  reducedMotion: boolean;
  isJoined: boolean;
  onJoin: () => Promise<boolean>;
  onLeave: () => Promise<boolean>;
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
          onLeave={onLeave}
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

function PersonalPickupCard({ item, reducedMotion, isJoined, onJoin, onLeave }: { item: ActivityFeedItem; reducedMotion: boolean; isJoined: boolean; onJoin: () => Promise<boolean>; onLeave: () => Promise<boolean> }) {
  const [showModal, setShowModal] = useState(false);
  if (!item.slots || !item.personalHost) return null;
  const { current, max, feePerSlot, joinedPlayers } = item.slots;
  const isFull = current >= max;
  const identity = item.personalHost;

  return (
    <>
      {showModal && <SessionDetailModal item={item} isJoined={isJoined} onClose={() => setShowModal(false)} onJoin={onJoin} onLeave={onLeave} />}
      <EventShell reducedMotion={reducedMotion}>
        <div className="space-y-3 p-3.5 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-xs font-bold text-slate-600" style={identity.avatarUrl ? { backgroundImage: `url(${identity.avatarUrl})`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined} role="img" aria-label={`Ảnh đại diện ${identity.name}`}>{!identity.avatarUrl && identity.initials}</div>
              <div className="min-w-0"><div className="flex items-center gap-1.5"><span className="truncate text-sm font-bold text-slate-900">{identity.name}</span><span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Cá nhân</span></div><div className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500"><span>{item.sport}</span><span aria-hidden="true">•</span><span className="truncate font-medium text-slate-600">{item.sportTier}</span></div></div>
            </div>
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isFull ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{getMissingLabel(current, max)}</span>
          </div>
          <div className="space-y-1.5"><h3 className="text-sm font-bold leading-snug text-slate-950 sm:text-base">{item.title}</h3><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600"><span className="inline-flex items-center gap-1.5 font-semibold text-slate-800"><Clock3 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />{item.startTime} - {item.endTime}</span><span className="text-slate-300" aria-hidden="true">•</span><span className="inline-flex min-w-0 items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" /><span className="truncate">{item.location}</span></span><span className="text-slate-300" aria-hidden="true">•</span><span className="font-bold text-slate-800">{feePerSlot}/người</span></div></div>
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{item.description || 'Đang tìm người chơi phù hợp cho buổi giao lưu này.'}</p>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3"><div className="flex items-center gap-2.5" aria-label={`${current} trên ${max} người đã vào slot`}><div className="flex -space-x-2">{joinedPlayers.slice(0, max).map((player, index) => <PlayerAvatar key={`${player.name}-${index}`} player={player} index={index} />)}</div><span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><UsersRound className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />{current}/{max} đã vào</span></div><button type="button" onClick={() => setShowModal(true)} disabled={isFull && !isJoined} className={`ml-auto inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold ${isJoined ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : isFull ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'}`}>{isJoined ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />}{isJoined ? 'Đã vào slot' : isFull ? 'Đã đủ' : 'Vào slot'}</button></div>
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
  if (!item.tournament || !item.club) return null;

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

const PERSONAL_PICKUP_DURATION_PRESETS = [
  { value: 30, label: '30 phút' },
  { value: 60, label: '1 giờ' },
  { value: 90, label: '1 giờ 30' },
  { value: 120, label: '2 giờ' },
  { value: 180, label: '3 giờ' },
];

function getPickupEndTime(startTime: string, durationMinutes: number) {
  const match = startTime.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const totalMinutes = Number(match[1]) * 60 + Number(match[2]) + durationMinutes;
  if (totalMinutes > 23 * 60 + 59) return null;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

function splitPickupDateTime(value: string) {
  const [playDate = '', startTime = ''] = value.split('T');
  return { playDate, startTime };
}

function buildPickupLocation(location: string, province?: Region, ward?: Region) {
  const base = location.trim();
  const normalizedBase = removeVietnameseTones(base);
  const suffixes = [ward?.fullName || ward?.name, province?.fullName || province?.name]
    .filter((value): value is string => Boolean(value?.trim()))
    .filter((value) => !normalizedBase.includes(removeVietnameseTones(value)));
  return [base, ...suffixes].join(', ').slice(0, 255);
}

function CreatePersonalPickupModal({ categories, initialDate, onClose, onCreated }: { categories: HomeFeedCategory[]; initialDate: string; onClose: () => void; onCreated: () => void }) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDateTime, setStartDateTime] = useState(`${initialDate}T19:30`);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [customDuration, setCustomDuration] = useState('');
  const [location, setLocation] = useState('');
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]);
  const [provinceCode, setProvinceCode] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [feePerSlot, setFeePerSlot] = useState('');
  const [maxSlots, setMaxSlots] = useState('4');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { playDate, startTime } = splitPickupDateTime(startDateTime);
  const selectedDuration = Number.isInteger(durationMinutes) && durationMinutes > 0 ? durationMinutes : 0;
  const endTime = getPickupEndTime(startTime, selectedDuration);
  const autoDetectedAddress = useAutoAddressParser({
    addressValue: location,
    provinces,
    wards,
    onSelectProvince: (nextProvinceCode) => {
      setProvinceCode(nextProvinceCode);
      setWardCode('');
    },
    onSelectWard: (nextWardCode) => setWardCode(nextWardCode),
    onWardsLoaded: setWards,
    enabled: location.trim().length >= 3,
  });

  useEffect(() => {
    let mounted = true;
    regionsApi.getProvinces()
      .then((response) => {
        if (mounted) setProvinces(response ?? []);
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!provinceCode) return;
    let mounted = true;
    regionsApi.getWardsByProvince(provinceCode)
      .then((response) => {
        if (mounted) setWards(response ?? []);
      })
      .catch(() => {
        if (mounted) setWards([]);
      });
    return () => { mounted = false; };
  }, [provinceCode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !isSubmitting) onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleProvinceChange = (nextProvinceCode: string) => {
    setProvinceCode(nextProvinceCode);
    setWardCode('');
    setWards([]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!categoryId) return toast.error('Chưa có môn thể thao khả dụng');
    if (title.trim().length < 3) return toast.error('Vui lòng nhập tiêu đề trận giao lưu');
    if (!playDate || !startTime || !endTime) return toast.error('Vui lòng chọn ngày và giờ chơi');
    if (!location.trim()) return toast.error('Vui lòng chọn hoặc nhập địa điểm');
    if (selectedDuration < 10 || selectedDuration > 720 || !endTime) return toast.error('Thời lượng không hợp lệ hoặc vượt qua ngày mới');
    if (description.length > 2000) return toast.error('Mô tả không được vượt quá 2000 ký tự');

    const pickupLocation = buildPickupLocation(
      location,
      provinces.find((province) => province.code === provinceCode),
      wards.find((ward) => ward.code === wardCode),
    );

    const slots = Number(maxSlots);
    if (!Number.isInteger(slots) || slots < 2 || slots > 128) return toast.error('Tổng số người phải từ 2 đến 128');

    setIsSubmitting(true);
    try {
      const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? `pickup-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const fee = feePerSlot.trim() ? Math.max(0, Number(feePerSlot) || 0) : undefined;
      await api.post('/social/pickups', {
        categoryId,
        title: title.trim(),
        description: description.trim() || undefined,
        playDate,
        startTime,
        endTime,
        location: pickupLocation,
        ...(fee !== undefined ? { feePerSlot: fee } : {}),
        maxSlots: slots,
        levelRequirement: 'Mọi trình độ',
        genderRequirement: 'ANY',
      }, { headers: { 'Idempotency-Key': idempotencyKey } });
      toast.success('Đã tạo trận giao lưu phong trào và đăng lên bảng tin');
      onCreated();
    } catch (error) {
      const responseData = (error as { response?: { status?: number; data?: { message?: string | string[]; code?: string } } })?.response;
      const rawMessage = responseData?.data?.message;
      const responseMessage = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
      toast.error(responseMessage || (responseData?.status && responseData.status >= 500
        ? 'Máy chủ đang lỗi khi tạo trận. Vui lòng thử lại sau khi hệ thống được cập nhật.'
        : 'Không thể tạo trận giao lưu. Kiểm tra thời gian và địa điểm rồi thử lại.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 sm:p-4 backdrop-blur-[2px]" onClick={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }} role="dialog" aria-modal="true" aria-labelledby="create-personal-pickup-title">
      <form noValidate onSubmit={handleSubmit} className="w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header: Đã bỏ bớt chữ dài dòng */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3 sm:px-6">
          <h2 id="create-personal-pickup-title" className="text-base sm:text-lg font-bold text-slate-950">
            Tạo trận giao lưu phong trào
          </h2>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors" aria-label="Đóng"><X className="h-5 w-5" /></button>
        </div>

        {/* Content: 2 cột rộng rãi, không cần scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[calc(96vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3.5">
            {/* Cột trái: Môn thể thao, Tiêu đề, Thời gian, Thời lượng */}
            <div className="space-y-3.5">
              {/* Môn thể thao - style hover nhạt / active chuẩn như QuickTournamentCreate */}
              <div>
                <span className="mb-1.5 block text-xs font-bold text-slate-700">Môn thể thao</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" role="group" aria-label="Môn thể thao">
                  {categories.map((category) => {
                    const isSelected = categoryId === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setCategoryId(category.id)}
                        className={`flex items-center justify-center rounded-xl border px-3 py-2 text-center text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 text-blue-900 font-semibold'
                            : 'border-slate-200 bg-white text-slate-700 font-medium hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{category.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tiêu đề */}
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-700">Tiêu đề</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  minLength={3}
                  maxLength={255}
                  required
                  placeholder="Ví dụ: Giao lưu Pickleball buổi tối"
                  className={inputClass}
                />
              </label>

              {/* Ngày chơi và giờ bắt đầu */}
              <div>
                <DateTimePicker
                  name="playDateTime"
                  label="Ngày chơi và giờ bắt đầu"
                  value={startDateTime}
                  onChange={setStartDateTime}
                  placeholder="dd/mm/yyyy hh:mm"
                  className="h-10"
                />
              </div>

              {/* Thời lượng */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700">Thời lượng</span>
                  <span className="text-xs text-blue-700 font-semibold">Kết thúc dự kiến: <strong>{endTime || 'chưa xác định'}</strong></span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {PERSONAL_PICKUP_DURATION_PRESETS.map((preset) => {
                    const isSelected = durationMinutes === preset.value && !customDuration;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => { setDurationMinutes(preset.value); setCustomDuration(''); }}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 text-blue-900 font-semibold'
                            : 'border-slate-200 bg-white text-slate-700 font-medium hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                  <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    Khác:
                    <input
                      type="number"
                      min={10}
                      max={720}
                      step={5}
                      value={customDuration}
                      onChange={(event) => { setCustomDuration(event.target.value); setDurationMinutes(Number(event.target.value) || 0); }}
                      placeholder="phút"
                      className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                    />
                  </label>
                </div>
              </div>

              {/* Chi phí và số người */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-700">Phí mỗi người <span className="font-normal text-slate-400">(tùy chọn)</span></span>
                  <input
                    type="number"
                    min={0}
                    max={10000000}
                    step={1000}
                    value={feePerSlot}
                    onChange={(event) => setFeePerSlot(event.target.value)}
                    placeholder="Miễn phí"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-700">Tổng số người <span className="text-rose-500">*</span></span>
                  <input
                    type="number"
                    min={2}
                    max={128}
                    value={maxSlots}
                    onChange={(event) => setMaxSlots(event.target.value)}
                    required
                    className={inputClass}
                  />
                </label>
              </div>
            </div>

            {/* Cột phải: Địa điểm và Mô tả */}
            <div className="space-y-3.5">
              {/* Box Địa điểm */}
              <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-700">Địa điểm thi đấu / Giao lưu <span className="text-rose-500">*</span></span>
                  <input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    minLength={2}
                    maxLength={255}
                    required
                    placeholder="Ví dụ: Sân Pickleball D-Sport Quận 7, số 123 Nguyễn Thị Thập"
                    className={`${inputClass} bg-white`}
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <SearchableRegionSelect
                    value={provinceCode}
                    options={provinces}
                    inputName="pickup-province"
                    placeholder="Tỉnh/thành phố"
                    onChange={handleProvinceChange}
                  />
                  <SearchableRegionSelect
                    value={wardCode}
                    options={wards}
                    inputName="pickup-ward"
                    disabled={!provinceCode || wards.length === 0}
                    placeholder={!provinceCode ? 'Tỉnh/TP trước' : wards.length === 0 ? 'Đang tải...' : 'Phường/xã'}
                    onChange={setWardCode}
                  />
                </div>
                {autoDetectedAddress.isMatched && autoDetectedAddress.province && (
                  <div className="flex items-center gap-1 text-[11px] font-medium text-blue-600">
                    <Sparkles className="h-3 w-3 shrink-0 text-blue-500" aria-hidden="true" />
                    <span className="truncate">
                      Gợi ý: <strong>{autoDetectedAddress.province.fullName || autoDetectedAddress.province.name}</strong>
                      {autoDetectedAddress.ward ? ` > ${autoDetectedAddress.ward.fullName || autoDetectedAddress.ward.name}` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Mô tả */}
              <div>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  label="Mô tả (tùy chọn)"
                  placeholder="Nói thêm về trình độ, luật chơi hoặc cách chia sân..."
                  compact
                  maxLength={2000}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting || categories.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Đang tạo...' : 'Tạo trận giao lưu'}
            {!isSubmitting && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function HomeSocialFeed({ categories = [], selectedCategoryId = '', isAuthenticated = false }: { categories?: HomeFeedCategory[]; selectedCategoryId?: string; isAuthenticated?: boolean }) {
  const reducedMotion = Boolean(useReducedMotion());
  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(today));
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [joinedActivityIds, setJoinedActivityIds] = useState<Set<string>>(() => new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
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
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);

  const matchesSelectedSport = useCallback((activity: ActivityFeedItem) => {
    if (!selectedCategory) return true;
    const normalize = (value: string) => value.trim().toLocaleLowerCase('vi').replace(/[^\p{L}\p{N}]+/gu, '');
    const selectedValues = [selectedCategory.name, selectedCategory.slug].filter(Boolean).map((value) => normalize(value as string));
    const activitySport = normalize(activity.sport);
    return selectedValues.some((value) => value === activitySport || value.includes(activitySport) || activitySport.includes(value));
  }, [selectedCategory]);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      api.get<ActivityFeedApiResponse>('/communities/activity-feed', { params: { date: selectedDate, limit: 50 } }),
      api.get<PersonalPickupApiResponse>('/social/pickups', { params: { date: selectedDate, limit: 50 } }),
    ]).then(([clubResult, personalResult]) => {
      if (cancelled) return;
      const clubItems = clubResult.status === 'fulfilled' ? (clubResult.value?.data?.items ?? []).map(mapApiActivity) : [];
      const personalPayload = personalResult.status === 'fulfilled' ? personalResult.value : undefined;
      const personalItems = personalPayload && Array.isArray(personalPayload.data)
        ? personalPayload.data.map(mapPersonalPickup)
        : personalPayload && !Array.isArray(personalPayload.data) && Array.isArray(personalPayload.data.items)
          ? personalPayload.data.items.map(mapPersonalPickup)
          : [];
      if (clubResult.status === 'rejected' && personalResult.status === 'rejected') {
        setHasLoadError(true);
        setActivities([]);
        return;
      }
      const nextActivities = [...clubItems, ...personalItems].sort((left, right) => left.startTime.localeCompare(right.startTime) || left.title.localeCompare(right.title, 'vi'));
      setHasLoadError(false);
      setActivities(nextActivities);
      setJoinedActivityIds(new Set(nextActivities.filter((activity) => activity.isJoined).map((activity) => activity.id)));
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [refreshVersion, selectedDate]);

  const activeActivities = useMemo(
    () =>
      activities
        .filter((activity) => activity.playDate === activeDate.key)
        .filter(matchesSelectedSport)
        .sort((left, right) => left.startTime.localeCompare(right.startTime)),
    [activeDate.key, activities, matchesSelectedSport],
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
    const isPersonal = item.type === 'PERSONAL_PICKUP';
    if (!isPersonal && !item.clubMatchSessionId) {
      toast.error('Hoạt động này chưa sẵn sàng nhận đăng ký');
      return false;
    }
    if (item.slots.current >= item.slots.max) {
      toast.error('Buổi giao lưu này đã đủ người');
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
      if (isPersonal) {
        await api.post(`/social/pickups/${item.id}/participants/self`);
        toast.success(`Đã vào buổi giao lưu của ${item.personalHost?.name ?? 'người tạo'}`);
      } else {
        await api.post(`/club-match-sessions/${item.clubMatchSessionId}/participants/self`);
        toast.success(`Đã vào slot của ${item.club?.name ?? 'CLB'}`);
      }
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

  const handleLeaveSlot = useCallback(async (item: ActivityFeedItem): Promise<boolean> => {
    if (!item.slots) return false;
    const isPersonal = item.type === 'PERSONAL_PICKUP';

    // Optimistic update: remove "Bạn" from joinedPlayers and decrement count
    setActivities((currentActivities) =>
      currentActivities.map((activity) => {
        if (activity.id !== item.id || !activity.slots) return activity;
        const nextPlayers = activity.slots.joinedPlayers.filter((p) => p.name !== 'Bạn');
        return {
          ...activity,
          slots: {
            ...activity.slots,
            current: Math.max(activity.slots.current - 1, 0),
            joinedPlayers: nextPlayers,
          },
        };
      }),
    );
    setJoinedActivityIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(item.id);
      return nextIds;
    });

    try {
      if (isPersonal) {
        await api.delete(`/social/pickups/${item.id}/participants/self`);
        toast.success('Đã rút khỏi buổi giao lưu');
      } else {
        await api.post(`/club-match-sessions/${item.clubMatchSessionId}/participants/self/withdraw`);
        toast.success('Đã rút khỏi buổi tập CLB');
      }
      return true;
    } catch {
      // Rollback on failure
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
      setJoinedActivityIds((currentIds) => new Set(currentIds).add(item.id));
      toast.error('Không thể rút khỏi slot. Vui lòng thử lại.');
      return false;
    }
  }, []);

  const handleShare = useCallback(async (item: ActivityFeedItem) => {
    if (!item.club) {
      toast.error('Buổi giao lưu cá nhân đã hiển thị trên bảng tin, chưa hỗ trợ chia sẻ thêm');
      return;
    }
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
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-2.5 py-2">
          <div><p className="text-sm font-bold text-slate-900">Bảng tin hoạt động</p><p className="text-[11px] text-slate-500">Tìm người chơi cho buổi giao lưu sắp tới</p></div>
          {isAuthenticated ? (
            <button type="button" onClick={() => setIsCreateOpen(true)} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-blue-700"><UserPlus className="h-3.5 w-3.5" aria-hidden="true" />Tạo trận giao lưu phong trào</button>
          ) : (
            <Link href="/login?redirect=/" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100"><UserPlus className="h-3.5 w-3.5" aria-hidden="true" />Đăng nhập để tạo trận</Link>
          )}
        </div>
        <div
          ref={dateStripRef}
          className="no-scrollbar flex items-stretch gap-1 overflow-x-auto px-1 pt-1 pb-0 select-none border-b border-slate-100"
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
                className={`group relative flex min-w-[72px] shrink-0 flex-col items-center justify-center rounded-lg px-2.5 pt-2 pb-2.5 text-center transition-all cursor-pointer bg-transparent focus-visible:outline-none`}
                aria-current={isSelected ? 'date' : undefined}
              >
                <span className={`whitespace-nowrap text-xs transition-colors ${
                  isSelected ? 'font-black text-slate-950' : 'font-medium text-slate-500 group-hover:text-slate-800'
                }`}>
                  {tab.dayLabel}
                </span>
                <span className={`mt-0.5 text-[11px] transition-colors ${
                  isSelected ? 'font-bold text-slate-900' : 'text-slate-400 group-hover:text-slate-600'
                }`}>
                  {tab.dateLabel}
                </span>
                {/* Visible underline indicator */}
                {isSelected && (
                  <span className="absolute bottom-0 inset-x-2 h-0.5 rounded-full bg-slate-900" aria-hidden="true" />
                )}
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
                  const isPersonal = item.type === 'PERSONAL_PICKUP';
                  return isTournament ? (
                    <TournamentCard
                      key={item.id}
                      item={item}
                      reducedMotion={reducedMotion}
                      onShare={() => handleShare(item)}
                    />
                  ) : isPersonal ? (
                    <PersonalPickupCard
                      key={item.id}
                      item={item}
                      reducedMotion={reducedMotion}
                      isJoined={joinedActivityIds.has(item.id)}
                      onJoin={() => handleJoinSlot(item)}
                      onLeave={() => handleLeaveSlot(item)}
                    />
                  ) : (
                    <ClubSessionCard
                      key={item.id}
                      item={item}
                      reducedMotion={reducedMotion}
                      isJoined={joinedActivityIds.has(item.id)}
                      onJoin={() => handleJoinSlot(item)}
                      onLeave={() => handleLeaveSlot(item)}
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
            Thử kéo sang ngày khác để tìm buổi giao lưu hoặc giải đấu đang mở đăng ký.
          </p>
        </div>
      )}

      {isCreateOpen && (
        <CreatePersonalPickupModal
          categories={categories}
          initialDate={activeDate.key}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            setIsCreateOpen(false);
            setIsLoading(true);
            setHasLoadError(false);
            setActivities([]);
            setRefreshVersion((version) => version + 1);
          }}
        />
      )}
    </section>
  );
}
