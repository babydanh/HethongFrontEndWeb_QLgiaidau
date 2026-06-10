'use client';

import { useState } from 'react';
import { Tournament } from '@/features/tournaments/api';
import { Button } from '@/components/ui/Button';
import { Calendar, MapPin, Users, Trophy, ChevronRight, Share2, AlertCircle, User } from 'lucide-react';
import Link from 'next/link';
import OverviewTab from './components/OverviewTab';
import TeamsTab from './components/TeamsTab';
import BracketTab from './components/BracketTab';
import MatchesTab from './components/MatchesTab';
import RegisterModal from './components/RegisterModal';
import { useAuthStore } from '@/lib/zustand/authStore';
import GalleryCarousel from '@/components/ui/GalleryCarousel';

interface Props {
  tournament: Tournament;
}

export default function TournamentDetailClient({ tournament }: Props) {
  const { user } = useAuthStore();
  const isOwner = user?.id === tournament.organizerId;
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'bracket' | 'matches'>('overview');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const tabs: { id: 'overview' | 'teams' | 'bracket' | 'matches'; label: string }[] = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'teams', label: 'Đội tham gia' },
    { id: 'bracket', label: 'Bảng đấu' },
    { id: 'matches', label: 'Lịch thi đấu' },
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {/* Banner Carousel Showcase */}
      <div className="relative w-full h-[250px] sm:h-[350px] md:h-[420px] bg-slate-950 overflow-hidden">
        <GalleryCarousel 
          images={tournament.galleryImages} 
          defaultBanner={tournament.bannerUrl || undefined}
          className="w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none"></div>
      </div>
      
      {/* Overlapping Info Card */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-16 relative z-10">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xl flex flex-col gap-6 text-slate-900">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <Link href="/tournaments" className="hover:text-blue-600 transition-colors">Giải đấu</Link>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="text-slate-800 font-semibold truncate">{tournament.name}</span>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex flex-col md:flex-row gap-5 items-start flex-1 w-full">
              {tournament.logoUrl && (
                <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl p-1.5 flex items-center justify-center border border-slate-200 shadow-md flex-shrink-0">
                  <img 
                    src={tournament.logoUrl} 
                    alt="Logo" 
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
              )}
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 ${
                    (tournament.status === 'UPCOMING' || tournament.status === 'REGISTRATION_OPEN') ? 'bg-blue-100 text-blue-800' :
                    (tournament.status === 'ONGOING' || tournament.status === 'IN_PROGRESS') ? 'bg-amber-100 text-amber-800 animate-pulse' :
                    tournament.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                    tournament.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      (tournament.status === 'UPCOMING' || tournament.status === 'REGISTRATION_OPEN') ? 'bg-blue-600' :
                      (tournament.status === 'ONGOING' || tournament.status === 'IN_PROGRESS') ? 'bg-amber-600' :
                      tournament.status === 'COMPLETED' ? 'bg-emerald-600' :
                      'bg-slate-600'
                    }`}></span>
                    {tournament.status === 'UPCOMING' ? 'SẮP DIỄN RA' : 
                     tournament.status === 'REGISTRATION_OPEN' ? 'MỞ ĐĂNG KÝ' :
                     tournament.status === 'REGISTRATION_CLOSED' ? 'ĐÓNG ĐĂNG KÝ' :
                     (tournament.status === 'ONGOING' || tournament.status === 'IN_PROGRESS') ? 'ĐANG DIỄN RA' : 
                     tournament.status === 'COMPLETED' ? 'ĐÃ KẾT THÚC' : 
                     tournament.status === 'CANCELLED' ? 'ĐÃ HỦY' : 
                     tournament.status === 'DRAFT' ? 'BẢN NHÁP' : tournament.status}
                  </span>
                  <span className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" /> 
                    {tournament.format === 'SINGLE_ELIMINATION' ? 'LOẠI TRỰC TIẾP' : 
                     tournament.format === 'DOUBLE_ELIMINATION' ? 'NHÁNH THẮNG/THUA' : 
                     tournament.format === 'ROUND_ROBIN' ? 'VÒNG TRÒN' : tournament.format}
                  </span>
                </div>
                <h1 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">
                  {tournament.name}
                </h1>
                
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-slate-700 text-xs font-bold shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString('vi-VN') : 'Chưa thiết lập ngày'}
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-slate-700 text-xs font-bold shadow-2xs">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    {tournament.locationAddress || 'Chưa cập nhật địa điểm'}
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-slate-700 text-xs font-bold shadow-2xs">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    {tournament._count?.participants || 0} / {tournament.maxParticipants || '∞'} Đội
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch lg:items-center">
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 flex-1 sm:flex-none font-bold">
                <Share2 className="w-4 h-4 mr-2" /> Chia sẻ
              </Button>
              {(tournament.status === 'UPCOMING' || tournament.status === 'REGISTRATION_OPEN') && !isOwner && (
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex-1 sm:flex-none"
                  onClick={() => setIsRegisterModalOpen(true)}
                >
                  Đăng ký ngay
                </Button>
              )}
              {isOwner && (tournament.status === 'UPCOMING' || tournament.status === 'REGISTRATION_OPEN') && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-center flex-1 sm:flex-none">
                  <p className="text-xs text-blue-800 font-bold whitespace-nowrap">
                    Bạn là chủ sở hữu giải đấu
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-px mb-8 no-scrollbar bg-white p-2 rounded-t-2xl shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-50 text-blue-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 min-h-[500px]">
          {activeTab === 'overview' && <OverviewTab tournament={tournament} />}
          {activeTab === 'teams' && <TeamsTab tournament={tournament} />}
          {activeTab === 'bracket' && <BracketTab tournament={tournament} />}
          {activeTab === 'matches' && <MatchesTab tournament={tournament} />}
        </div>
      </div>
      
      <RegisterModal 
        tournamentId={tournament.id} 
        tournamentName={tournament.name} 
        entryFee={Number(tournament.entryFee) || 0}
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)} 
      />
    </div>
  );
}
