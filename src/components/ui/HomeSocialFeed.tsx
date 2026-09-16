'use client';

import React, { useState, useMemo } from 'react';
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
  | 'TOURNAMENT_COMPLETED' // Giải đấu đã kết thúc (vinh danh kết quả)
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
    statusBadge: 'MỞ ĐĂNG KÝ' | 'ĐÃ KẾT THÚC';
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

  // 4. Giải đấu ĐÃ KẾT THÚC (Vinh danh kết quả ở khu vực riêng dưới cùng)
  {
    id: 'act-comp-1',
    type: 'TOURNAMENT_COMPLETED',
    sport: 'Pickleball',
    playDate: '2026-09-16',
    timeSlot: 'AFTERNOON',
    location: 'Cụm Sân Hà Anh Pickleball Tuy Hòa',
    title: 'Giải Pickleball Tranh Cúp Hà Anh Lần 1 đã khép lại thành công',
    description: 'Trận chung kết đôi nam kịch tính đã tìm ra Nhà Vô Địch với màn lội ngược dòng 11-9 ở set 3 quyết định.',
    bannerUrl: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?w=900&auto=format&fit=crop&q=80',
    club: {
      id: 'c-haanh',
      name: 'CLB Pickleball Hà Anh',
      initials: 'HA',
      verified: true,
      memberCount: 154,
    },
    tournament: {
      id: 'tourn-1',
      prize: 'Tổng thưởng 30 Triệu',
      statusBadge: 'ĐÃ KẾT THÚC',
      championNames: 'Nguyễn Minh Danh & Lê Tuấn Hùng',
      totalTeams: '32 Đôi VĐV',
    },
  },

  // 5. Giải đấu ngày hôm sau mở cổng lúc 08:00
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

  // Sinh 5 ngày để lọc: Format "T2 16/09", "T3 17/09",...
  const dateTabs = useMemo(() => {
    const today = new Date();
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayOfWeek = dayNames[d.getDay()];
      const dayMonth = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        index: i,
        dayOfWeek,
        dayMonth,
        label: `${dayOfWeek}, ${dayMonth}`,
        rawDate: d.toISOString().split('T')[0],
      };
    });
  }, []);

  // Lọc hoạt động theo ngày chọn
  const activeTab = dateTabs[selectedDayIndex] || dateTabs[0];

  const filteredActivities = useMemo(() => {
    const list = activities.filter((act) => act.playDate === activeTab.rawDate);
    return list.length > 0 ? list : activities;
  }, [activities, activeTab]);

  // Phân chia: Giải đấu đã kết thúc (không phụ thuộc mốc giờ) vs Các sự kiện diễn ra theo mốc giờ hôm nay
  const completedTournaments = useMemo(() => {
    return filteredActivities.filter((act) => act.type === 'TOURNAMENT_COMPLETED');
  }, [filteredActivities]);

  // Gom nhóm các sự kiện có khung giờ (Ongoing, Opened, Pickup) theo mốc giờ bắt đầu
  const milestoneGroups = useMemo(() => {
    const activeTimelineItems = filteredActivities.filter((act) => act.type !== 'TOURNAMENT_COMPLETED');
    const groups: { [time: string]: ActivityFeedItem[] } = {};
    activeTimelineItems.forEach((act) => {
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
      {/* 1. THANH BỘ LỌC NGÀY FULL WIDTH — Thiết kế sạch, viền nhẹ, gạch chân tinh tế */}
      <div className="w-full bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="grid grid-cols-5 w-full divide-x divide-slate-100">
          {dateTabs.map((tab) => {
            const isSelected = selectedDayIndex === tab.index;
            return (
              <button
                key={tab.index}
                type="button"
                onClick={() => setSelectedDayIndex(tab.index)}
                className={`group relative py-2.5 px-1 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-blue-50/50 text-blue-700 font-bold'
                    : 'bg-white hover:bg-slate-50 text-slate-600 font-medium'
                }`}
              >
                <span className={`text-xs sm:text-sm tracking-tight transition-colors ${isSelected ? 'text-blue-700 font-extrabold' : 'group-hover:text-slate-900'}`}>
                  {tab.dayOfWeek}
                </span>
                <span className={`text-[11px] sm:text-xs mt-0.5 font-normal transition-colors ${isSelected ? 'text-blue-600 font-semibold' : 'text-slate-400 group-hover:text-slate-600'}`}>
                  {tab.dayMonth}
                </span>

                {isSelected && (
                  <span className="absolute bottom-0 inset-x-3 sm:inset-x-6 h-[2.5px] bg-blue-600 rounded-t-full shadow-xs" />
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
                   DẠNG B: THẺ KÈO GIAO LƯU CLB - GỌN GÀNG, BỎ DÒNG HOST
                   ========================================================== */
                return (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-xs hover:border-slate-300 transition-all space-y-2.5 relative group"
                  >
                    {/* TOP: Tên CLB + Badge loại kèo */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                          {item.club.initials}
                        </div>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {item.club.name}
                        </span>
                        {item.club.verified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        )}
                        <span className="text-slate-300 text-xs">•</span>
                        <span className="text-[11px] text-slate-500 truncate">{item.sport}</span>
                      </div>

                      <div className="shrink-0">
                        {item.type === 'PICKUP_NEED_PLAYER' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200/80">
                            <Flame className="w-3 h-3 text-orange-500" />
                            <span>{item.slots?.missingText || 'Thiếu người'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <Users className="w-3 h-3 text-slate-600" />
                            <span>Sinh hoạt CLB</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* TIÊU ĐỀ KÈO GIAO LƯU */}
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h3>

                    {/* MÔ TẢ NGẮN GỌN */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    {/* DẢI SLOT VÀ CHI PHÍ GỌN */}
                    {item.slots && (
                      <div className="bg-slate-50 rounded-lg p-2 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {item.slots.joinedPlayers.map((p, idx) => (
                              <div
                                key={idx}
                                style={{ backgroundColor: p.initialsBg || '#475569' }}
                                className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-[9px] font-bold text-white shadow-2xs"
                                title={p.name}
                              >
                                {p.name.charAt(0)}
                              </div>
                            ))}
                          </div>
                          <span className="text-slate-600 text-[11px]">
                            {item.slots.current}/{item.slots.max} người
                          </span>
                        </div>

                        <div className="text-slate-700 font-semibold text-xs">
                          {item.slots.feePerSlot}
                        </div>
                      </div>
                    )}

                    {/* FOOTER: GIỜ ĐƠN GIẢN, KHÔNG TÔ MÀU NỔI VÀ NÚT VÀO SLOT */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="font-semibold text-slate-800">{item.startTime} – {item.endTime}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 truncate max-w-[190px]">{item.location}</span>
                      </div>

                      {item.slots && (
                        <div className="ml-auto">
                          {isFull ? (
                            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-400 text-xs font-medium">
                              Đã đủ
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleJoinSlot(item)}
                              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
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

      {/* 3. KHU VỰC KẾT QUẢ GIẢI ĐẤU ĐÃ KẾT THÚC (Vinh danh vô địch — không nhồi vào mốc giờ đếm) */}
      {completedTournaments.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Kết quả giải đấu đã khép lại
            </h4>
          </div>

          <div className="space-y-3">
            {completedTournaments.map((item) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-emerald-200 transition-all space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Trophy className="w-3 h-3 text-emerald-600" />
                      <span>ĐÃ KẾT THÚC</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {item.sport} • {item.club.name}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Địa điểm: {item.location}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {item.description}
                </p>

                {/* Box vinh danh vô địch */}
                {item.tournament?.championNames && (
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 block font-bold uppercase">Nhà Vô Địch</span>
                        <span className="text-xs sm:text-sm font-extrabold text-emerald-950">
                          {item.tournament.championNames}
                        </span>
                      </div>
                    </div>

                    <Link
                      href="/tournaments"
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1"
                    >
                      <span>Xem bảng đấu</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </motion.article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
