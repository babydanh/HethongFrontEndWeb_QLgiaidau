'use client';

import React, { useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Clock,
  MapPin,
  Users,
  Trophy,
  Flame,
  Award,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getSportLogo } from '@/constants/sports';

export type ActivityEventType =
  | 'PICKUP_NEED_PLAYER'   // Kèo giao lưu CLB đang thiếu người
  | 'CLUB_RECRUITING'      // CLB tuyển thêm người sinh hoạt/giao lưu
  | 'TOURNAMENT_OPENED'    // Giải đấu mới mở đăng ký (chỉ hiện 1 mốc giờ mở cổng)
  | 'PLAYER_RANK_UP';

export interface ActivityFeedItem {
  id: string;
  type: ActivityEventType;
  sport: string;
  sportTier?: string;
  playDate: string; // "2026-09-16"
  timeSlot: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  startTime?: string;
  endTime?: string;
  location: string;
  title: string;
  description: string;
  bannerUrl?: string;
  
  // Mọi kèo và hoạt động giao lưu bắt buộc trực thuộc 1 CLB
  club: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    initials: string;
    verified?: boolean;
    memberCount?: number;
  };

  // Thông tin người host/đại diện CLB
  host?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    roleInClub?: string;
  };

  // Dành riêng cho Kèo giao lưu CLB
  slots?: {
    current: number;
    max: number;
    feePerSlot: string;
    missingText: string;
    joinedPlayers: Array<{ name: string; avatarUrl?: string | null; initialsBg?: string }>;
  };

  // Dành cho giải đấu
  tournament?: {
    id: string;
    prize?: string;
    statusBadge: 'MỞ ĐĂNG KÝ';
    championNames?: string;
    totalTeams?: string;
  };
}

const MOCK_ACTIVITIES: ActivityFeedItem[] = [
  // 1. Mốc 09:00 — GIẢI ĐẤU MỞ ĐĂNG KÝ (Chỉ hiện đúng mốc giờ mở cổng đăng ký, không lặp lại)
  {
    id: 'act-tourn-opened-1',
    type: 'TOURNAMENT_OPENED',
    sport: 'Pickleball',
    sportTier: 'Đôi Nam Nữ Phong Trào',
    playDate: '2026-09-16',
    timeSlot: 'MORNING',
    startTime: '09:00',
    location: 'Cụm Sân Pickleball D-Sport Q7',
    title: 'Mở cổng đăng ký: Giải Pickleball D-Sport Autumn Cup 2026',
    description: 'Chính thức mở cổng đăng ký cho 32 cặp VĐV phong trào. Cổng sẽ tự động đóng khi đủ số lượng.',
    bannerUrl: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?w=900&auto=format&fit=crop&q=80',
    club: {
      id: 'c-dsport',
      name: 'D-Sport Pickleball Club',
      initials: 'DSP',
      verified: true,
      memberCount: 180,
    },
    tournament: {
      id: 'tourn-opened-dsport',
      prize: 'Tổng thưởng 30 Triệu',
      statusBadge: 'MỞ ĐĂNG KÝ',
      totalTeams: 'Còn 12/32 suất',
    },
  },

  // 2. Mốc 19:30 — Kèo giao lưu CLB Hà Anh
  {
    id: 'act-1',
    type: 'PICKUP_NEED_PLAYER',
    sport: 'Pickleball',
    sportTier: 'Trình 2.5 - 3.0',
    playDate: '2026-09-16',
    timeSlot: 'EVENING',
    startTime: '19:30',
    endTime: '21:30',
    location: 'Sân D-Sport Q7 (Sân 3)',
    title: 'CLB Hà Anh giao lưu nội bộ mở rộng • Thiếu 1 slot đánh đôi',
    description: 'Sinh hoạt định kỳ thứ 4. Đã có 3 người, cần thêm 1 bạn đánh vui vẻ cọ xát nước non, chia tiền sân nhẹ nhàng.',
    club: {
      id: 'c-haanh',
      name: 'CLB Pickleball Hà Anh',
      initials: 'HA',
      verified: true,
      memberCount: 154,
    },
    slots: {
      current: 3,
      max: 4,
      feePerSlot: '55.000đ',
      missingText: 'Thiếu 1 người',
      joinedPlayers: [
        { name: 'Minh Danh', initialsBg: '#2563eb' },
        { name: 'Tuấn Hùng', initialsBg: '#4f46e5' },
        { name: 'Hải Nam', initialsBg: '#059669' },
      ],
    },
  },

  // 3. Mốc 20:00 — Kèo sinh hoạt của CLB Lan Anh Tennis
  {
    id: 'act-2',
    type: 'CLUB_RECRUITING',
    sport: 'Tennis',
    sportTier: 'NTRP 3.0 - 3.5',
    playDate: '2026-09-16',
    timeSlot: 'EVENING',
    startTime: '20:00',
    endTime: '22:00',
    location: 'CLB Quần Vợt Lan Anh, Q.10 (Sân số 2)',
    title: 'CLB Lan Anh Tennis tuyển 2 khách giao lưu sinh hoạt tối nay',
    description: 'Sinh hoạt định kỳ của CLB. Hội viên chính thức đã có 6 bạn. Mở 2 slot cho anh em ngoài vào cọ xát thử chân.',
    club: {
      id: 'c-lananh',
      name: 'CLB Quần Vợt Lan Anh',
      initials: 'LA',
      verified: true,
      memberCount: 220,
    },
    slots: {
      current: 6,
      max: 8,
      feePerSlot: '80.000đ',
      missingText: 'Thiếu 2 người',
      joinedPlayers: [
        { name: 'Hoàng Bách', initialsBg: '#d97706' },
        { name: 'Thành Trung', initialsBg: '#7c3aed' },
        { name: 'Đình Trọng', initialsBg: '#0284c7' },
      ],
    },
  },

  // 4. Giải đấu ngày hôm sau mở cổng lúc 08:00
  {
    id: 'act-4',
    type: 'TOURNAMENT_OPENED',
    sport: 'Cầu lông',
    sportTier: 'Đôi Nam Nữ Mở Rộng',
    playDate: '2026-09-17',
    timeSlot: 'MORNING',
    startTime: '08:00',
    location: 'Sân Cầu Lông Kỳ Hòa Q10',
    title: 'Giải Cầu Lông Mở Rộng Kỳ Hòa Autumn Cup chính thức mở đăng ký!',
    description: 'Quy tụ 32 đôi phong trào tranh tài. Đã có 22/32 đôi đăng ký giữ chỗ. Cổng đăng ký sẽ đóng khi đủ 32 đôi.',
    bannerUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=900&auto=format&fit=crop&q=80',
    club: {
      id: 'c-kyhoa',
      name: 'CLB Cầu Lông Kỳ Hòa',
      initials: 'KH',
      verified: true,
      memberCount: 95,
    },
    tournament: {
      id: 'tourn-2',
      prize: '20 Triệu + Cúp',
      statusBadge: 'MỞ ĐĂNG KÝ',
      totalTeams: 'Còn 10/32 suất',
    },
  },
];

export default function HomeSocialFeed() {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [activities, setActivities] = useState<ActivityFeedItem[]>(MOCK_ACTIVITIES);

  // Sinh 30 ngày (1 tháng) để lọc: Format "T2 16/09", "T3 17/09",...
  const dateTabs = useMemo(() => {
    const today = new Date();
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayOfWeek = dayNames[d.getDay()];
      const dayMonth = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        index: i,
        dayOfWeek: i === 0 ? 'Hôm nay' : dayOfWeek,
        dayMonth,
        label: `${dayOfWeek}, ${dayMonth}`,
        rawDate: d.toISOString().split('T')[0],
      };
    });
  }, []);

  // Kéo chuột vuốt ngang danh sách ngày (Mouse drag-to-scroll)
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Tốc độ trượt
    if (Math.abs(walk) > 4) {
      setHasMoved(true);
    }
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Lọc hoạt động theo ngày chọn
  const activeTab = dateTabs[selectedDayIndex] || dateTabs[0];

  const filteredActivities = useMemo(() => {
    const list = activities.filter((act) => act.playDate === activeTab.rawDate);
    return list.length > 0 ? list : activities;
  }, [activities, activeTab]);

  // Gom nhóm các sự kiện có khung giờ theo mốc giờ bắt đầu
  const milestoneGroups = useMemo(() => {
    const groups: { [time: string]: ActivityFeedItem[] } = {};
    filteredActivities.forEach((act) => {
      const key = act.startTime || 'Lịch trong ngày';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(act);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    return sortedKeys.map((time) => ({
      time,
      items: groups[time],
    }));
  }, [filteredActivities]);

  const handleJoinSlot = (item: ActivityFeedItem) => {
    if (!item.slots) return;
    if (item.slots.current >= item.slots.max) {
      toast.error('Kèo này đã đủ người!');
      return;
    }
    setActivities((prev) =>
      prev.map((act) => {
        if (act.id === item.id && act.slots) {
          return {
            ...act,
            slots: {
              ...act.slots,
              current: act.slots.current + 1,
              missingText: act.slots.max - (act.slots.current + 1) === 0 ? 'ĐÃ ĐỦ NGƯỜI' : `Thiếu ${act.slots.max - (act.slots.current + 1)} người`,
            },
          };
        }
        return act;
      })
    );
    toast.success(`Đã vào slot kèo: ${item.title}`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. THANH BỘ LỌC CẢ 1 THÁNG (30 NGÀY) — KÉO CHUỘT TRƯỢT MƯỢT, ẨN HOÀN TOÀN THANH CUỘN */}
      <div className="w-full bg-white rounded-xl border border-slate-200 shadow-xs p-1">
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1 select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
        >
          {dateTabs.map((tab) => {
            const isSelected = selectedDayIndex === tab.index;
            return (
              <button
                key={tab.index}
                type="button"
                onClick={() => {
                  if (!hasMoved) {
                    setSelectedDayIndex(tab.index);
                  }
                }}
                className={`group relative shrink-0 min-w-[76px] py-2 px-2.5 rounded-lg text-center transition-all flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border border-transparent'
                }`}
              >
                <span className={`text-xs tracking-tight transition-colors whitespace-nowrap ${isSelected ? 'text-blue-700 font-extrabold' : 'group-hover:text-slate-900 font-semibold'}`}>
                  {tab.dayOfWeek}
                </span>
                <span className={`text-[11px] mt-0.5 transition-colors ${isSelected ? 'text-blue-600 font-bold' : 'text-slate-400 group-hover:text-slate-600'}`}>
                  {tab.dayMonth}
                </span>

                {isSelected && (
                  <span className="absolute bottom-0.5 inset-x-3 h-[2px] bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. TIMELINE THEO MỐC GIỜ: CÁC TRẬN ĐANG DIỄN RA & KÈO GIAO LƯU CLB TRONG NGÀY */}
      <div className="space-y-5">
        {milestoneGroups.map((group) => (
          <div key={group.time} className="relative">
            {/* MILESTONE HEADER: Giờ tinh giản, không màu mè */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-bold text-slate-800 text-sm">{group.time}</span>
                <span className="text-slate-400 font-normal">({group.items.length})</span>
              </div>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* DANH SÁCH SỰ KIỆN TRONG KHUNG GIỜ NÀY */}
            <div className="space-y-3 pl-2 sm:pl-3 border-l border-slate-200 ml-2 sm:ml-2.5">
              {group.items.map((item) => {
                const isTournament = item.type === 'TOURNAMENT_OPENED';
                const isPickup = item.type === 'PICKUP_NEED_PLAYER' || item.type === 'CLUB_RECRUITING';
                const isFull = item.slots && item.slots.current >= item.slots.max;

                /* ==========================================================
                   DẠNG A: GIẢI ĐẤU MỞ ĐĂNG KÝ - HIỆN MỐC GIỜ MỞ CỔNG 1 LẦN DUY NHẤT
                   ========================================================== */
                if (isTournament) {
                  return (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all overflow-hidden relative group"
                    >
                      {/* BANNER GỌN NẰM TRÊN TOP */}
                      <div className="relative h-24 sm:h-28 w-full bg-slate-900 overflow-hidden">
                        {item.bannerUrl ? (
                          <img
                            src={item.bannerUrl}
                            alt={item.title}
                            className="w-full h-full object-cover opacity-60 group-hover:scale-102 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-blue-900 to-slate-900 opacity-90" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                        {/* Badges trạng thái tinh gọn trên Banner */}
                        <div className="absolute top-2 left-3 right-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-400 text-slate-950">
                              <span>MỞ ĐĂNG KÝ</span>
                            </span>

                            <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-black/50 text-slate-200 border border-white/10">
                              {item.sport}
                            </span>
                          </div>

                          <span className="text-[11px] font-medium text-slate-200 bg-black/40 px-2 py-0.5 rounded border border-white/10 truncate max-w-[180px]">
                            {item.club.name}
                          </span>
                        </div>

                        {/* Tiêu đề giải đấu trên banner */}
                        <div className="absolute bottom-2 left-3 right-3">
                          <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-1 drop-shadow-sm">
                            {item.title}
                          </h3>
                        </div>
                      </div>

                      {/* NỘI DUNG VÀ FOOTER TINH GỌN */}
                      <div className="p-3 sm:p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">Mở cổng: {item.startTime}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 truncate max-w-[220px]">{item.location}</span>
                          </div>

                          {item.tournament?.totalTeams && (
                            <span className="text-[11px] font-semibold text-blue-600">
                              {item.tournament.totalTeams}
                            </span>
                          )}
                        </div>

                        {/* Hàng hành động */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                          <p className="text-xs text-slate-500 line-clamp-1 truncate">
                            {item.description}
                          </p>

                          <Link
                            href="/tournaments"
                            className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shrink-0 inline-flex items-center gap-1 transition-all ml-auto"
                          >
                            <span>Xem giải</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </motion.article>
                  );
                }

                /* ==========================================================
                   DẠNG B: KÈO GIAO LƯU CLB CẦN THÊM NGƯỜI
                   ========================================================== */
                return (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all p-3 sm:p-3.5 space-y-3"
                  >
                    {/* Header: CLB TỔ CHỨC LÀ TRỌNG TÂM */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                          {item.club.initials}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer truncate">
                              {item.club.name}
                            </span>
                            {item.club.verified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span>{item.sport}</span>
                            {item.sportTier && (
                              <>
                                <span>•</span>
                                <span className="font-medium text-slate-600">{item.sportTier}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Tag trạng thái slot */}
                      {item.slots && (
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded shrink-0 ${
                            isFull
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {item.slots.missingText}
                        </span>
                      )}
                    </div>

                    {/* Tiêu đề & Thông tin sân */}
                    <div className="space-y-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                        <span className="font-semibold text-slate-700">
                          {item.startTime} - {item.endTime}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 truncate">{item.location}</span>
                        {item.slots?.feePerSlot && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-bold text-slate-800">{item.slots.feePerSlot}/người</span>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>

                    {/* Danh sách người đã tham gia & Nút Join slot */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                      {item.slots && (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {item.slots.joinedPlayers.map((p, idx) => (
                              <div
                                key={idx}
                                style={{ backgroundColor: p.initialsBg || '#3b82f6' }}
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold ring-2 ring-white"
                                title={p.name}
                              >
                                {p.name.charAt(0)}
                              </div>
                            ))}
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {item.slots.current}/{item.slots.max} đã vào
                          </span>
                        </div>
                      )}

                      {/* Nút hành động gọn gàng */}
                      {isPickup && (
                        <div className="ml-auto">
                          {isFull ? (
                            <button
                              type="button"
                              disabled
                              className="px-3 py-1 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed"
                            >
                              Đã đủ
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleJoinSlot(item)}
                              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>Vào slot</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
