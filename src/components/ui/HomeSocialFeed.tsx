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
  };
}

const MOCK_ACTIVITIES: ActivityFeedItem[] = [
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
        { name: 'Hải Nam', initialsBg: '#2563eb' },
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
    id: 'act-3',
    type: 'TOURNAMENT_COMPLETED',
    sport: 'Pickleball',
    playDate: '2026-09-16',
    timeSlot: 'AFTERNOON',
    startTime: '14:00',
    endTime: '17:30',
    location: 'Cụm Sân Hà Anh Pickleball Tuy Hòa',
    title: 'Chung kết Giải Pickleball Tranh Cúp Hà Anh Lần 1 đã khép lại!',
    description: 'Trận chung kết đôi nam đầy cảm xúc đã tìm ra Nhà Vô Địch với màn lội ngược dòng 11-9 ở set 3 quyết định.',
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
    },
  },
];

export default function HomeSocialFeed() {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'ALL' | 'MORNING' | 'AFTERNOON' | 'EVENING'>('ALL');
  const [activities, setActivities] = useState<ActivityFeedItem[]>(MOCK_ACTIVITIES);

  // Sinh 5 ngày để lọc
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
        label: i === 0 ? `Hôm nay (${dayMonth})` : `${dayOfWeek} (${dayMonth})`,
        rawDate: d.toISOString().split('T')[0],
      };
    });
  }, []);

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (selectedTimeFilter !== 'ALL' && act.timeSlot !== selectedTimeFilter) {
        return false;
      }
      return true;
    });
  }, [activities, selectedTimeFilter]);

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
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* 1. THANH BỘ LỌC NGÀY (Dải ngày trên đầu Bảng Tin) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-850 uppercase tracking-wider">
              Lọc hoạt động theo ngày
            </span>
          </div>
          <span className="text-xs font-semibold text-blue-650 bg-blue-50/80 px-2 py-0.5 rounded-full">
            {filteredActivities.length} sự kiện
          </span>
        </div>

        {/* Date Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {dateTabs.map((tab) => {
            const isSelected = selectedDayIndex === tab.index;
            return (
              <button
                key={tab.index}
                type="button"
                onClick={() => setSelectedDayIndex(tab.index)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-650'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Time Slot Quick Filter */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 text-xs flex-wrap">
          <span className="text-slate-400 font-medium text-[11px] mr-1">Khung giờ:</span>
          {[
            { id: 'ALL', label: 'Tất cả giờ' },
            { id: 'MORNING', label: 'Sáng (06h - 11h)' },
            { id: 'AFTERNOON', label: 'Chiều (13h - 17h)' },
            { id: 'EVENING', label: 'Tối vàng (17h - 22h)' },
          ].map((t) => {
            const isAct = selectedTimeFilter === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTimeFilter(t.id as unknown as typeof selectedTimeFilter)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isAct
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. DANH SÁCH THẺ TIN HOẠT ĐỘNG */}
      <div className="space-y-3">
        {filteredActivities.map((item) => {
          const sportLogo = getSportLogo(item.sport);
          const isPickup = item.type === 'PICKUP_NEED_PLAYER' || item.type === 'CLUB_RECRUITING';
          const isFull = item.slots && item.slots.current >= item.slots.max;

          return (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:border-blue-200 transition-all space-y-3 relative group"
            >
              {/* TOP HEADER: Badge loại sự kiện + Tên môn + Tên Host / CLB */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Badge sự kiện */}
                  {item.type === 'PICKUP_NEED_PLAYER' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200 shrink-0">
                      <Flame className="w-3 h-3 text-orange-500" />
                      <span>{item.slots?.missingText || 'THIẾU NGƯỜI'}</span>
                    </span>
                  )}
                  {item.type === 'CLUB_RECRUITING' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                      <ShieldCheck className="w-3 h-3 text-blue-600" />
                      <span>CLB TUYỂN GIAO LƯU</span>
                    </span>
                  )}
                  {item.type === 'TOURNAMENT_COMPLETED' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      <Trophy className="w-3 h-3 text-emerald-600" />
                      <span>KẾT QUẢ GIẢI ĐẤU</span>
                    </span>
                  )}
                  {item.type === 'TOURNAMENT_OPENED' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                      <Sparkles className="w-3 h-3 text-purple-600" />
                      <span>MỞ ĐĂNG KÝ GIẢI</span>
                    </span>
                  )}

                  {/* Sport Tag */}
                  <span className="text-xs font-semibold text-slate-500 truncate">
                    {item.sport} {item.sportTier && `• ${item.sportTier}`}
                  </span>
                </div>

                {/* Host / Club Name bên phải */}
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

              {/* TIÊU ĐỀ HOẠT ĐỘNG */}
              <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                {item.title}
              </h3>

              {/* NỘI DUNG MÔ TẢ CHI TIẾT */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {item.description}
              </p>

              {/* CARD ĐẶC THÙ CHO GIẢI ĐẤU (NẾU CÓ) */}
              {item.tournament && (
                <div className="rounded-xl p-3 bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {item.tournament.championNames ? `Vô địch: ${item.tournament.championNames}` : `Giải thưởng: ${item.tournament.prize}`}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {item.location}
                    </div>
                  </div>
                  <Link
                    href="/tournaments"
                    className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shrink-0 shadow-xs inline-flex items-center gap-1"
                  >
                    <span>Xem giải</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {/* 3. MỐC KHUNG GIỜ THI ĐẤU & ĐỊA ĐIỂM Ở DƯỚI BẢNG TIN */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                {/* Cụm thông tin Giờ + Sân */}
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium flex-wrap">
                  <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="font-bold">{item.startTime} – {item.endTime}</span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[220px]">{item.location}</span>
                  </div>
                </div>

                {/* Cụm Action Slot cho kèo thiếu người */}
                {isPickup && item.slots && (
                  <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                    <span className="text-xs font-bold text-slate-700">
                      {item.slots.feePerSlot}
                    </span>

                    <span className="text-xs font-semibold text-slate-500">
                      {item.slots.current}/{item.slots.max}
                    </span>

                    {isFull ? (
                      <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold">
                        Đã đủ slot
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleJoinSlot(item)}
                        className="px-3.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
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
  );
}
