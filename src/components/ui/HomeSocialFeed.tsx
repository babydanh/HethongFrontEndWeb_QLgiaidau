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
  | 'TOURNAMENT_OPENED'    // Giải đấu mới mở đăng ký
  | 'TOURNAMENT_ONGOING'   // Giải đấu đang diễn ra hôm nay
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
  host: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    roleInClub?: string; // "Chủ nhiệm", "Trưởng ban chuyên môn", "Thành viên"
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
    prize: string;
    statusBadge: 'MỞ ĐĂNG KÝ' | 'ĐANG DIỄN RA' | 'ĐÃ KẾT THÚC';
    championNames?: string;
    totalTeams?: string;
    liveCourt?: string; // Tên sân đang live (nếu đang diễn ra)
  };
}

const MOCK_ACTIVITIES: ActivityFeedItem[] = [
  // 1. Giải đấu ĐANG DIỄN RA
  {
    id: 'act-ongoing-1',
    type: 'TOURNAMENT_ONGOING',
    sport: 'Pickleball',
    sportTier: 'Vòng Bán Kết & Chung Kết',
    playDate: '2026-09-16',
    timeSlot: 'AFTERNOON',
    startTime: '14:00',
    endTime: '18:00',
    location: 'Cụm Sân Pickleball D-Sport Q7',
    title: 'Giải Vô Địch Pickleball Tranh Cúp D-Sport Mùa Thu',
    description: 'Các trận bán kết đôi nam nữ đang bước vào set đấu quyết định tranh vé vào chung kết.',
    bannerUrl: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?w=900&auto=format&fit=crop&q=80',
    club: {
      id: 'c-dsport',
      name: 'D-Sport Pickleball Club',
      initials: 'DSP',
      verified: true,
      memberCount: 180,
    },
    host: {
      id: 'org-1',
      name: 'Ban Trọng Tài D-Sport',
      roleInClub: 'Ban Tổ Chức',
    },
    tournament: {
      id: 'tourn-ongoing',
      prize: '45 Triệu + Cúp Vàng',
      statusBadge: 'ĐANG DIỄN RA',
      totalTeams: '32 Đôi VĐV',
      liveCourt: 'Sân Trung Tâm (Live Stream)',
    },
  },

  // 2. Kèo giao lưu thuộc CLB Hà Anh Pickleball (Có CLB đại diện)
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
    title: 'CLB Hà Anh mở kèo giao lưu nội bộ mở rộng • Thiếu 1 slot đánh đôi',
    description: 'Buổi sinh hoạt sân thứ 4 hàng tuần của CLB Hà Anh. Nhóm đã có 3 bạn, cần ghép thêm 1 bạn trình độ 2.5 - 3.0 đánh vui vẻ cọ xát nước non, chia tiền sân nhẹ nhàng.',
    club: {
      id: 'c-haanh',
      name: 'CLB Pickleball Hà Anh',
      initials: 'HA',
      verified: true,
      memberCount: 154,
    },
    host: {
      id: 'u-1',
      name: 'Nguyễn Minh Danh',
      roleInClub: 'Chủ nhiệm CLB',
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

  // 3. Kèo giao lưu sinh hoạt của CLB Quần Vợt Lan Anh
  {
    id: 'act-2',
    type: 'CLUB_RECRUITING',
    sport: 'Tennis',
    sportTier: 'NTRP 3.0 - 3.5',
    playDate: '2026-09-16',
    timeSlot: 'EVENING',
    startTime: '20:00',
    endTime: '22:00',
    location: 'CLB Quần Vợt Lan Anh, Q.10 (Sân mái che số 2)',
    title: 'CLB Lan Anh Tennis tuyển 2 khách giao lưu sinh hoạt tối nay',
    description: 'Buổi sinh hoạt tuần định kỳ của CLB. Hội viên chính thức đã có 6 bạn (cần 8 bạn đánh 2 sân). Mở rộng 2 slot cho anh em ngoài vào cọ xát thử chân.',
    club: {
      id: 'c-lananh',
      name: 'CLB Quần Vợt Lan Anh',
      initials: 'LA',
      verified: true,
      memberCount: 220,
    },
    host: {
      id: 'c-1',
      name: 'Hoàng Bách',
      roleInClub: 'Phó Ban Chuyên Môn',
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

  // 4. Giải đấu ĐÃ KẾT THÚC (Kết quả vinh danh — không cần mốc giờ đếm lộn xộn)
  {
    id: 'act-comp-1',
    type: 'TOURNAMENT_COMPLETED',
    sport: 'Pickleball',
    playDate: '2026-09-16',
    timeSlot: 'AFTERNOON',
    location: 'Cụm Sân Hà Anh Pickleball Tuy Hòa',
    title: 'Giải Pickleball Tranh Cúp Hà Anh Lần 1 đã khép lại thành công',
    description: 'Trận chung kết đôi nam đầy kịch tính đã tìm ra Nhà Vô Địch với màn lội ngược dòng 11-9 ở set 3 quyết định.',
    bannerUrl: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?w=900&auto=format&fit=crop&q=80',
    club: {
      id: 'c-haanh',
      name: 'CLB Pickleball Hà Anh',
      initials: 'HA',
      verified: true,
      memberCount: 154,
    },
    host: {
      id: 'org-haanh',
      name: 'Ban Tổ Chức Hà Anh Cup',
      roleInClub: 'BTC Giải',
    },
    tournament: {
      id: 'tourn-1',
      prize: 'Tổng thưởng 30 Triệu',
      statusBadge: 'ĐÃ KẾT THÚC',
      championNames: 'Nguyễn Minh Danh & Lê Tuấn Hùng',
      totalTeams: '32 Đôi VĐV',
    },
  },

  // 5. Giải đấu MỞ ĐĂNG KÝ
  {
    id: 'act-4',
    type: 'TOURNAMENT_OPENED',
    sport: 'Cầu lông',
    sportTier: 'Đôi Nam Nữ Mở Rộng',
    playDate: '2026-09-17',
    timeSlot: 'MORNING',
    startTime: '08:00',
    endTime: '11:30',
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
    host: {
      id: 'org-2',
      name: 'Văn Phòng CLB Kỳ Hòa',
      roleInClub: 'BQT CLB',
    },
    tournament: {
      id: 'tourn-2',
      prize: '20 Triệu + Cúp',
      statusBadge: 'MỞ ĐĂNG KÝ',
      totalTeams: '32 Đôi Nam Nữ',
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
            {/* MILESTONE HEADER: Mốc giờ bắt đầu rõ ràng */}
            <div className="flex items-center gap-3 mb-2.5">
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full text-xs">
                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-extrabold text-slate-800 tracking-wide">
                  {group.time}
                </span>
                <span className="text-[11px] text-slate-500 font-medium border-l border-slate-300 pl-2">
                  {group.items.length} hoạt động
                </span>
              </div>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* DANH SÁCH SỰ KIỆN TRONG KHUNG GIỜ NÀY */}
            <div className="space-y-3.5 pl-2 sm:pl-3 border-l-2 border-slate-200 ml-3 sm:ml-4">
              {group.items.map((item) => {
                const isTournament = item.type === 'TOURNAMENT_OPENED' || item.type === 'TOURNAMENT_ONGOING';
                const isPickup = item.type === 'PICKUP_NEED_PLAYER' || item.type === 'CLUB_RECRUITING';
                const isFull = item.slots && item.slots.current >= item.slots.max;

                /* ==========================================================
                   DẠNG A: GIẢI ĐẤU (ĐANG DIỄN RA HOẶC MỞ ĐĂNG KÝ)
                   ========================================================== */
                if (isTournament) {
                  const isOngoing = item.type === 'TOURNAMENT_ONGOING';

                  return (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all overflow-hidden relative group"
                    >
                      {/* BANNER GỌN NẰM TRÊN TOP */}
                      <div className="relative h-28 sm:h-32 w-full bg-slate-900 overflow-hidden">
                        {item.bannerUrl ? (
                          <img
                            src={item.bannerUrl}
                            alt={item.title}
                            className="w-full h-full object-cover opacity-60 group-hover:scale-102 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-blue-800 to-slate-900 opacity-90" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                        {/* Badges trạng thái nổi bật trên Banner */}
                        <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isOngoing ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-red-600 text-white shadow-xs">
                                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                <span>ĐANG DIỄN RA</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-400 text-slate-950 shadow-xs">
                                <Sparkles className="w-3 h-3 text-slate-950" />
                                <span>MỞ ĐĂNG KÝ</span>
                              </span>
                            )}

                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-black/50 text-white border border-white/20">
                              {item.sport} {item.sportTier && `• ${item.sportTier}`}
                            </span>
                          </div>

                          {/* CLB / Đơn vị tổ chức */}
                          <div className="flex items-center gap-1.5 bg-black/50 px-2 py-0.5 rounded-md border border-white/10 text-[11px] text-slate-200">
                            <span className="font-bold text-white">{item.club.name}</span>
                          </div>
                        </div>

                        {/* Tiêu đề giải đấu trên banner */}
                        <div className="absolute bottom-2.5 left-3 right-3">
                          <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-1 drop-shadow-sm group-hover:text-blue-200 transition-colors">
                            {item.title}
                          </h3>
                        </div>
                      </div>

                      {/* NỘI DUNG VÀ THÔNG TIN GIẢI */}
                      <div className="p-3.5 sm:p-4 space-y-3">
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>

                        {/* Bảng tóm tắt thông số giải */}
                        {item.tournament && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium uppercase">Giải thưởng</span>
                              <span className="font-bold text-slate-800 truncate block mt-0.5">
                                {item.tournament.prize}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium uppercase">Quy mô</span>
                              <span className="font-semibold text-slate-700 block mt-0.5">
                                {item.tournament.totalTeams || '32 VĐV / Cặp'}
                              </span>
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                              <span className="text-[10px] text-slate-400 block font-medium uppercase">
                                {isOngoing ? 'Sân phát trực tiếp' : 'Tình trạng'}
                              </span>
                              <span className={`font-bold block mt-0.5 ${isOngoing ? 'text-red-600' : 'text-blue-600'}`}>
                                {isOngoing ? (item.tournament.liveCourt || 'Sân chính') : item.tournament.statusBadge}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Footer card: Khung giờ, Địa điểm & Nút Xem */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                            <div className="flex items-center gap-1 text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded">
                              <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{item.startTime} – {item.endTime}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-500">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[200px]">{item.location}</span>
                            </div>
                          </div>

                          <Link
                            href="/tournaments"
                            className={`px-3.5 py-1.5 rounded-lg text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-all ml-auto ${
                              isOngoing ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            <span>{isOngoing ? 'Xem trực tiếp' : 'Xem giải đấu'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </motion.article>
                  );
                }

                /* ==========================================================
                   DẠNG B: THẺ KÈO GIAO LƯU TRỰC THUỘC CÂU LẠC BỘ
                   ========================================================== */
                return (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-slate-200 p-4 sm:p-4.5 shadow-xs hover:border-blue-200 transition-all space-y-3 relative group"
                  >
                    {/* TOP HEADER: Avatar CLB + Tên CLB + Badge loại kèo */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar Câu Lạc Bộ */}
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                          {item.club.initials}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-850 truncate hover:text-blue-600">
                              {item.club.name}
                            </span>
                            {item.club.verified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            Host: <span className="font-semibold text-slate-600">{item.host.name}</span> ({item.host.roleInClub})
                          </div>
                        </div>
                      </div>

                      {/* Badge phân loại kèo */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        {item.type === 'PICKUP_NEED_PLAYER' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                            <Flame className="w-3 h-3 text-orange-500" />
                            <span>{item.slots?.missingText || 'THIẾU NGƯỜI'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Users className="w-3 h-3 text-blue-600" />
                            <span>CLB SINH HOẠT</span>
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                          {item.sport}
                        </span>
                      </div>
                    </div>

                    {/* TIÊU ĐỀ KÈO GIAO LƯU */}
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h3>

                    {/* NỘI DUNG MÔ TẢ CHI TIẾT */}
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {item.description}
                    </p>

                    {/* BOX MỜI GỌI THÀNH VIÊN: AVATAR STACK + SLOT + CHI PHÍ */}
                    {item.slots && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          {/* Avatars các bạn đã giữ slot */}
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {item.slots.joinedPlayers.map((p, idx) => (
                              <div
                                key={idx}
                                style={{ backgroundColor: p.initialsBg || '#2563eb' }}
                                className="w-6 h-6 rounded-full border border-white flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
                                title={p.name}
                              >
                                {p.name.charAt(0)}
                              </div>
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-slate-700">
                            Đã tham gia {item.slots.current}/{item.slots.max}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-medium">Chi phí chia sân</span>
                          <span className="text-xs font-bold text-blue-600">{item.slots.feePerSlot}/slot</span>
                        </div>
                      </div>
                    )}

                    {/* FOOTER: KHUNG GIỜ, ĐỊA ĐIỂM SÂN & NÚT VÀO SLOT */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3 text-xs text-slate-600 font-medium flex-wrap">
                        <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold">
                          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{item.startTime} – {item.endTime}</span>
                        </div>

                        <div className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{item.location}</span>
                        </div>
                      </div>

                      {/* Nút hành động */}
                      {item.slots && (
                        <div className="ml-auto">
                          {isFull ? (
                            <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold block">
                              Đã đủ slot
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleJoinSlot(item)}
                              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Vào slot ngay</span>
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
