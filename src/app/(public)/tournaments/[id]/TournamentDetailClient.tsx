'use client';

import { useState } from 'react';
import { Tournament } from '@/features/tournaments/api';
import { Button } from '@/components/ui/Button';
import { Calendar, MapPin, Users, Trophy, ChevronRight, Share2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import OverviewTab from './components/OverviewTab';
import TeamsTab from './components/TeamsTab';
import BracketTab from './components/BracketTab';
import MatchesTab from './components/MatchesTab';
import RegisterModal from './components/RegisterModal';
import { useAuthStore } from '@/lib/zustand/authStore';

interface Props {
  tournament: Tournament;
}

export default function TournamentDetailClient({ tournament }: Props) {
  const { user } = useAuthStore();
  const isOwner = user?.id === tournament.organizerId;
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'bracket' | 'matches'>('overview');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'teams', label: 'Đội tham gia' },
    { id: 'bracket', label: 'Bảng đấu' },
    { id: 'matches', label: 'Lịch thi đấu' },
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {/* Banner & Header */}
      <div className="bg-slate-900 text-white pt-16 pb-12 px-4 md:px-8 relative overflow-hidden">
        {tournament.bannerUrl && (
          <img 
            src={tournament.bannerUrl} 
            alt="Banner" 
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col gap-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
            <Link href="/tournaments" className="hover:text-white transition-colors">Giải đấu</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white truncate">{tournament.name}</span>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 ${
                  tournament.status === 'UPCOMING' ? 'bg-blue-500 text-white' :
                  tournament.status === 'ONGOING' ? 'bg-amber-500 text-white' :
                  tournament.status === 'COMPLETED' ? 'bg-emerald-600 text-white' :
                  tournament.status === 'CANCELLED' ? 'bg-rose-600 text-white' :
                  'bg-slate-700 text-slate-300'
                }`}>
                  <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse"></div>
                  {tournament.status === 'UPCOMING' ? 'SẮP DIỄN RA' : 
                   tournament.status === 'ONGOING' ? 'ĐANG DIỄN RA' : 
                   tournament.status === 'COMPLETED' ? 'ĐÃ KẾT THÚC' : 
                   tournament.status === 'CANCELLED' ? 'ĐÃ HỦY' : 
                   tournament.status === 'DRAFT' ? 'BẢN NHÁP' : tournament.status}
                </span>
                <span className="px-4 py-2 text-sm font-bold rounded-lg bg-slate-800/80 text-slate-200 border border-slate-700/50 flex items-center gap-2 backdrop-blur-sm">
                  <Trophy className="w-4 h-4 text-amber-400" /> 
                  {tournament.format === 'SINGLE_ELIMINATION' ? 'LOẠI TRỰC TIẾP' : 
                   tournament.format === 'DOUBLE_ELIMINATION' ? 'NHÁNH THẮNG/THUA' : 
                   tournament.format === 'ROUND_ROBIN' ? 'VÒNG TRÒN' : tournament.format}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black leading-tight text-white mb-4">
                {tournament.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-slate-300 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString('vi-VN') : 'Chưa có ngày'}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-400" />
                  {tournament.locationAddress || 'Chưa cập nhật địa điểm'}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  {tournament._count?.participants || 0} / {tournament.maxParticipants || '∞'} Đội
                </div>
              </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 flex-1 md:flex-none">
                <Share2 className="w-4 h-4 mr-2" /> Chia sẻ
              </Button>
              {tournament.status === 'UPCOMING' && !isOwner && (
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2"
                  onClick={() => setIsRegisterModalOpen(true)}
                >
                  Đăng ký ngay
                </Button>
              )}
              {isOwner && tournament.status === 'UPCOMING' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-2 w-full">
                  <p className="text-sm text-blue-800 font-medium text-center">
                    Bạn là chủ sở hữu giải đấu này
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
              onClick={() => setActiveTab(tab.id as any)}
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
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)} 
      />
    </div>
  );
}

// Temporary fallback for User icon since it's used above but not imported at top
function User(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
