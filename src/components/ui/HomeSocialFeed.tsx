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
  | 'PICKUP_NEED_PLAYER'   // Kèo giao lưu đang thiếu người
  | 'CLUB_RECRUITING'      // CLB tuyển thêm người sinh hoạt/giao lưu
  | 'TOURNAMENT_OPENED'    // Giải đấu mới mở đăng ký
  | 'TOURNAMENT_COMPLETED' // Giải đấu hoàn thành (vinh danh vô địch)
  | 'PLAYER_RANK_UP';      // Player thăng hạng thành tích

// Interface mở rộng cho banner ảnh và poster của giải đấu
export interface ActivityFeedItem {
  id: string;
  type: ActivityEventType;
  sport: string;
  sportTier?: string;
  playDate: string; // VD: "2026-09-16"
  timeSlot: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  startTime: string;
  endTime: string;
  location: string;
  title: string;
  description: string;
  bannerUrl?: string; // Banner giải đấu nếu có
  
  // Thông tin chủ thể (Host hoặc CLB hoặc Ban tổ chức)
  host: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    isClub?: boolean;
    clubBadge?: string;
  };

  // Dành riêng cho Kèo thiếu người / CLB tuyển
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
    statusBadge: string;
    championNames?: string;
    totalTeams?: string;
  };
}

const MOCK_ACTIVITIES: ActivityFeedItem[] = [
  {
    id: 'act-3',
    type: 'TOURNAMENT_COMPLETED',
    sport: 'Pickleball',
    playDate: '2026-09-16',
    timeSlot: 'AFTERNOON',
    startTime: '14:00',
    endTime: '17:30',
    location: 'Cụm Sân Hà Anh Pickleball Tuy Hòa',
    title: 'Chung kết Giải Pickleball Tranh Cúp Hà Anh Lần 1',
    description: 'Trận chung kết đôi nam đầy kịch tính đã tìm ra Nhà Vô Địch với màn lội ngược dòng 11-9 ở set 3 quyết định.',
    bannerUrl: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?w=900&auto=format&fit=crop&q=80',
    host: {
      id: 'org-1',
      name: 'Ban Tổ Chức Hà Anh Cup',
      isClub: true,
      clubBadge: 'Giải chính thức',
    },
    tournament: {
      id: 'tourn-1',
      prize: 'Tổng thưởng 30 Triệu',
      statusBadge: 'ĐÃ HOÀN THÀNH',
      championNames: 'Nguyễn Minh Danh & Lê Tuấn Hùng',
      totalTeams: '32 Đôi VĐV',
    },
  },
  {
    id: 'act-1',
    type: 'PICKUP_NEED_PLAYER',
    sport: 'Pickleball',
    sportTier: 'Trình độ 2.5 - 3.0',
    playDate: '2026-09-16',
    timeSlot: 'EVENING',
    startTime: '19:30',
    endTime: '21:30',
    location: 'Sân D-Sport Q7 (Sân 3)',
    title: 'Giao lưu Pickleball D-Sport Q7 • Đang thiếu 1 slot đánh đôi',
    description: 'Host Minh Danh đã thuê trọn sân 2 tiếng, hiện nhóm đã có 3 bạn. Cần tìm thêm 1 bạn đánh vui vẻ cọ xát nước non, chia tiền sân nhẹ nhàng.',
    host: {
      id: 'u-1',
      name: 'Nguyễn Minh Danh',
      avatarUrl: null,
      isClub: false,
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
    host: {
      id: 'c-1',
      name: 'CLB Lan Anh Tennis',
      avatarUrl: null,
      isClub: true,
      clubBadge: 'CLB Đã xác minh',
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
    host: {
      id: 'org-2',
      name: 'CLB Cầu Lông Kỳ Hòa',
      isClub: true,
      clubBadge: 'Mở đăng ký',
    },
    tournament: {
      id: 'tourn-2',
      prize: '20 Triệu + Cúp',
      statusBadge: 'CÒN 10 SUẤT',
      totalTeams: '32 Đôi Nam Nữ',
    },
  },
  {
    id: 'act-5',
    type: 'TOURNAMENT_OPENED',
    sport: 'Bóng đá',
    sportTier: 'Sân 7 phong trào',
    playDate: '2026-09-17',
    timeSlot: 'EVENING',
    startTime: '19:00',
    endTime: '21:30',
    location: 'Sân bóng Chảo Lửa, Tân Bình',
    title: 'Giải Bóng Đá Mini Cup Mùa Thu 2026 Khởi Tranh',
    description: 'Bảng A & B chính thức bắt đầu tranh tài các trận vòng bảng lượt đầu.',
    bannerUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop&q=80',
    host: {
      id: 'org-3',
      name: 'BTC Chảo Lửa League',
      isClub: true,
      clubBadge: 'Giải chính thức',
    },
    tournament: {
      id: 'tourn-3',
      prize: '15 Triệu Đồng',
      statusBadge: 'VÒNG BẢNG',
      totalTeams: '16 Đội bóng',
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
    // Khớp theo rawDate, nếu ngày chọn chưa có mock thì fallback hiển thị mock để user trải nghiệm
    const list = activities.filter((act) => act.playDate === activeTab.rawDate);
    return list.length > 0 ? list : activities;
  }, [activities, activeTab]);

  // Gom nhóm activities theo mốc giờ bắt đầu (Milestones)
  const milestoneGroups = useMemo(() => {
    const groups: { [time: string]: ActivityFeedItem[] } = {};
    filteredActivities.forEach((act) => {
      const key = act.startTime || 'Chưa định giờ';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(act);
    });

    // Sắp xếp các mốc giờ theo thứ tự tăng dần
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
      {/* 1. THANH BỘ LỌC NGÀY FULL WIDTH DÀN ĐỀU — Gạch chân tinh tế (Underline Tab), không tô màu chói cả ô */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
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
                    ? 'bg-blue-50/40 text-blue-650 font-bold'
                    : 'bg-white hover:bg-slate-50/70 text-slate-600 font-medium'
                }`}
              >
                <span className={`text-xs sm:text-sm tracking-tight transition-colors ${isSelected ? 'text-blue-700 font-extrabold' : 'group-hover:text-slate-900'}`}>
                  {tab.dayOfWeek}
                </span>
                <span className={`text-[11px] sm:text-xs mt-0.5 font-normal transition-colors ${isSelected ? 'text-blue-600 font-semibold' : 'text-slate-400 group-hover:text-slate-600'}`}>
                  {tab.dayMonth}
                </span>

                {/* Gạch chân Active tinh tế dưới tab */}
                {isSelected ? (
                  <span className="absolute bottom-0 inset-x-2 sm:inset-x-4 h-[2.5px] bg-blue-600 rounded-t-full shadow-xs" />
                ) : (
                  <span className="absolute bottom-0 inset-x-4 h-[2px] bg-transparent group-hover:bg-slate-200 rounded-t-full transition-colors" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MILESTONES TIMELINE: CÁC MỐC GIỜ VÀ DANH SÁCH GIẢI / KÈO GIAO LƯU */}
      <div className="space-y-6">
        {milestoneGroups.map((group) => (
          <div key={group.time} className="relative">
            {/* MILESTONE HEADER: Giờ bắt đầu trong ngày */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 bg-slate-100/90 border border-slate-200/90 px-3 py-1 rounded-full shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-wide">
                  {group.time}
                </span>
                <span className="text-[11px] text-slate-500 font-medium border-l border-slate-200 pl-2">
                  {group.items.length} sự kiện
                </span>
              </div>
              <div className="flex-1 h-px bg-slate-200/80" />
            </div>

            {/* DANH SÁCH CÁC GIẢI / KÈO ĐẤU DƯỚI MỐC GIỜ NÀY */}
            <div className="space-y-3.5 pl-2 sm:pl-3 border-l-2 border-slate-200/90 ml-3 sm:ml-4">
              {group.items.map((item) => {
                const sportLogo = getSportLogo(item.sport);
                const isTournament = item.type === 'TOURNAMENT_OPENED' || item.type === 'TOURNAMENT_COMPLETED';
                const isPickup = item.type === 'PICKUP_NEED_PLAYER' || item.type === 'CLUB_RECRUITING';
                const isFull = item.slots && item.slots.current >= item.slots.max;

                /* ==========================================================
                   DẠNG 1: THẺ BẢNG TIN GIẢI ĐẤU (Có Banner nhỏ, info nổi bật, nút Xem giải)
                   ========================================================== */
                if (isTournament) {
                  return (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all overflow-hidden relative group"
                    >
                      {/* BANNER NHỎ NẰM TRÊN TOP */}
                      <div className="relative h-28 sm:h-36 w-full bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 overflow-hidden">
                        {item.bannerUrl ? (
                          <img
                            src={item.bannerUrl}
                            alt={item.title}
                            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-blue-700 to-indigo-800 opacity-80" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                        {/* Badges trên Banner */}
                        <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {item.type === 'TOURNAMENT_OPENED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950 shadow-xs">
                                <Sparkles className="w-3 h-3 text-slate-950" />
                                <span>MỞ ĐĂNG KÝ</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400 text-slate-950 shadow-xs">
                                <Trophy className="w-3 h-3 text-slate-950" />
                                <span>KẾT QUẢ GIẢI</span>
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-black/40 backdrop-blur-md text-white border border-white/20">
                              {item.sport} {item.sportTier && `• ${item.sportTier}`}
                            </span>
                          </div>

                          {/* Host BTC */}
                          <span className="text-[11px] font-semibold text-slate-200 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 truncate max-w-[160px]">
                            {item.host.name}
                          </span>
                        </div>

                        {/* Tiêu đề giải nằm nổi trên banner */}
                        <div className="absolute bottom-2.5 left-3 right-3">
                          <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-1 drop-shadow-sm group-hover:text-blue-200 transition-colors">
                            {item.title}
                          </h3>
                        </div>
                      </div>

                      {/* THÔNG TIN CHI TIẾT DƯỚI BANNER */}
                      <div className="p-3.5 sm:p-4 space-y-3">
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>

                        {/* Dải thông số giải: Giải thưởng, Quy mô, Vô địch */}
                        {item.tournament && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium uppercase">
                                {item.tournament.championNames ? 'Vô địch' : 'Giải thưởng'}
                              </span>
                              <span className="font-bold text-slate-850 truncate block mt-0.5">
                                {item.tournament.championNames || item.tournament.prize}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium uppercase">Quy mô</span>
                              <span className="font-semibold text-slate-700 block mt-0.5">
                                {item.tournament.totalTeams || '32 VĐV / Cặp'}
                              </span>
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                              <span className="text-[10px] text-slate-400 block font-medium uppercase">Trạng thái</span>
                              <span className="font-bold text-blue-600 block mt-0.5">
                                {item.tournament.statusBadge}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Footer card giải đấu: Giờ thi đấu, Địa điểm & Nút Xem giải */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                            <div className="flex items-center gap-1 text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
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
                            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-all ml-auto"
                          >
                            <span>Xem giải đấu</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </motion.article>
                  );
                }

                /* ==========================================================
                   DẠNG 2: THẺ KÈO GIAO LƯU / MỜI GỌI (Pickup Need Player / Club Recruiting)
                   ========================================================== */
                return (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:border-blue-200 transition-all space-y-3 relative group"
                  >
                    {/* TOP HEADER: Badge loại kèo + Thể thao + Host */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.type === 'PICKUP_NEED_PLAYER' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200/90 shrink-0">
                            <Flame className="w-3 h-3 text-orange-500" />
                            <span>{item.slots?.missingText || 'THIẾU NGƯỜI'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/90 shrink-0">
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            <span>CLB TUYỂN GIAO LƯU</span>
                          </span>
                        )}

                        <span className="text-xs font-semibold text-slate-500 truncate">
                          {item.sport} {item.sportTier && `• ${item.sportTier}`}
                        </span>
                      </div>

                      {/* Host info */}
                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-slate-700 block">
                          {item.host.name}
                        </span>
                        {item.host.clubBadge && (
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {item.host.clubBadge}
                          </span>
                        )}
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

                    {/* BOX MỜI GỌI THÀNH VIÊN VÀO KÈO (Avatar stack + Số slot còn trống) */}
                    {item.slots && (
                      <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          {/* Avatars đã vào sân */}
                          <div className="flex -space-x-2 overflow-hidden">
                            {item.slots.joinedPlayers.map((p, idx) => (
                              <div
                                key={idx}
                                style={{ backgroundColor: p.initialsBg || '#2563eb' }}
                                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
                                title={p.name}
                              >
                                {p.name.charAt(0)}
                              </div>
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-slate-650">
                            Đã có {item.slots.current}/{item.slots.max} người
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-medium">Chi phí chia sân</span>
                          <span className="text-xs font-extrabold text-blue-600">{item.slots.feePerSlot}/slot</span>
                        </div>
                      </div>
                    )}

                    {/* FOOTER: MỐC GIỜ THI ĐẤU & NÚT VÀO SLOT */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3 text-xs text-slate-600 font-medium flex-wrap">
                        <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-lg font-bold">
                          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{item.startTime} – {item.endTime}</span>
                        </div>

                        <div className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{item.location}</span>
                        </div>
                      </div>

                      {/* Nút Tham Gia Slot */}
                      {item.slots && (
                        <div className="ml-auto">
                          {isFull ? (
                            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold block">
                              Đã đủ slot
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleJoinSlot(item)}
                              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
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
    </div>
  );
}

