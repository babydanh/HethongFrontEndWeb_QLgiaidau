'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { communitiesApi, Community } from '@/features/communities/api';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, MapPin, Users, Trophy, Share2, MoreHorizontal, ShieldCheck, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { formatDate } from '@/utils/format';
import { useAuthStore } from '@/lib/zustand/authStore';
import { JoinCommunityModal } from '@/components/shared/JoinCommunityModal';
import toast from 'react-hot-toast';

interface CommunityMemberRecord {
  member?: { id?: string; userId?: string; role?: string; status?: string };
  user?: { id?: string; email?: string };
}

// Tabs
import AboutTab from './components/AboutTab';
import TournamentsTab from './components/TournamentsTab';
import MembersTab from './components/MembersTab';
import GalleryTab from './components/GalleryTab';
import RankingsTab from './components/RankingsTab';
import SettingsTab from './components/SettingsTab';

export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuthStore();

  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'tournaments' | 'members' | 'gallery' | 'rankings' | 'settings'>('about');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Real membership state
  const [membership, setMembership] = useState<{ role: string; status: string; memberId: string } | null>(null);
  const [isJoinLoading, setIsJoinLoading] = useState(false);

  const fetchMembership = async () => {
    if (!user || !id) {
      setMembership(null);
      return;
    }
    try {
      const res = await communitiesApi.getMembers(id);
      const memberList = res.data || res || [];
      const current = memberList.find((m: CommunityMemberRecord) => m.member?.userId === user.id || m.user?.id === user.id);
      if (current) {
        setMembership({
          role: current.member?.role || 'MEMBER',
          status: current.member?.status || 'JOINED',
          memberId: current.member?.id || '',
        });
      } else {
        setMembership(null);
      }
    } catch (error) {
      console.error('Failed to fetch membership status', error);
    }
  };

  const fetchCommunity = async () => {
    try {
      setIsLoading(true);
      const res = await communitiesApi.getCommunityById(id);
      const data = (res as { data?: Community })?.data ?? (res as unknown as Community);
      setCommunity(data);
    } catch (error) {
      console.error('Failed to fetch community details', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCommunity();
    }
  }, [id]);

  useEffect(() => {
    if (id && user) {
      fetchMembership();
    } else {
      setMembership(null);
    }
  }, [id, user]);

  const handleJoinAction = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để tham gia câu lạc bộ.');
      router.push('/login');
      return;
    }

    if (isOwner) {
      setActiveTab('settings');
      return;
    }

    if (membership?.status === 'JOINED') {
      if (!confirm('Bạn có chắc chắn muốn rời khỏi câu lạc bộ này?')) return;
      try {
        setIsJoinLoading(true);
        await communitiesApi.removeMember(id, user.id);
        toast.success('Đã rời khỏi câu lạc bộ.');
        setMembership(null);
        fetchCommunity();
      } catch (error) {
        console.error('Failed to leave community', error);
        toast.error('Lỗi khi thực hiện rời câu lạc bộ.');
      } finally {
        setIsJoinLoading(false);
      }
      return;
    }

    if (membership?.status === 'PENDING') {
      toast.error('Đơn xin tham gia của bạn đang chờ phê duyệt.');
      return;
    }

    if (membership?.status === 'INVITED') {
      try {
        setIsJoinLoading(true);
        await communitiesApi.respondToInvite(id, 'accept');
        toast.success('Đã tham gia câu lạc bộ thành công!');
        fetchMembership();
        fetchCommunity();
      } catch (error) {
        console.error('Failed to accept invitation', error);
        toast.error('Lỗi khi chấp nhận lời mời.');
      } finally {
        setIsJoinLoading(false);
      }
      return;
    }

    if (community?.joinMode === 'APPROVAL') {
      setIsJoinModalOpen(true);
    } else {
      try {
        setIsJoinLoading(true);
        await communitiesApi.joinCommunity(id);
        toast.success('Đã tham gia câu lạc bộ thành công!');
        fetchMembership();
        fetchCommunity();
      } catch (error) {
        console.error('Failed to join community', error);
        toast.error('Lỗi khi tham gia câu lạc bộ.');
      } finally {
        setIsJoinLoading(false);
      }
    }
  };

  const getJoinButtonLabel = () => {
    if (isJoinLoading) return 'Đang xử lý...';
    if (isOwner) return 'Chủ sở hữu';
    if (membership?.status === 'JOINED') return 'Đã tham gia';
    if (membership?.status === 'PENDING') return 'Đang chờ duyệt';
    if (membership?.status === 'INVITED') return 'Chấp nhận lời mời';
    return community?.joinMode === 'APPROVAL' ? 'Xin tham gia' : 'Tham gia';
  };

  const getJoinButtonStyles = () => {
    if (isOwner) return 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200';
    if (membership?.status === 'JOINED') return 'bg-emerald-50 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-emerald-700 border border-emerald-200';
    if (membership?.status === 'PENDING') return 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200';
    if (membership?.status === 'INVITED') return 'bg-indigo-600 hover:bg-indigo-700 text-white animate-pulse';
    return 'bg-emerald-600 hover:bg-emerald-700 text-white';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 animate-pulse">
        <div className="h-64 md:h-80 bg-slate-200 w-full"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20">
          <div className="w-32 h-32 bg-slate-300 rounded-full border-4 border-white mb-4"></div>
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Users className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Không tìm thấy câu lạc bộ</h2>
        <p className="text-slate-500 mb-6">Câu lạc bộ này có thể đã bị xóa hoặc không tồn tại.</p>
        <Button onClick={() => router.push('/communities')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  const isOwner = user?.id === community.creatorId || user?.id === community.ownerId;
  const isOwnerOrMod = isOwner || (membership?.role === 'OWNER' || membership?.role === 'MODERATOR');

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Banner / Cover */}
      <div className="relative h-64 md:h-80 w-full bg-slate-200 shadow-inner">
        {community.bannerUrl ? (
          <Image src={community.bannerUrl} alt="Cover" fill className="object-cover" priority />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-950"></div>
        )}
        
        {/* Back button */}
        <button 
          onClick={() => router.back()}
          className="absolute top-6 left-4 sm:left-6 lg:left-8 bg-black/45 hover:bg-black/60 backdrop-blur-md p-2 rounded-full text-white transition-all shadow-md active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 pb-6 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-white overflow-hidden bg-white shadow-md relative shrink-0">
              <Image 
                src={community.logoUrl || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop"} 
                alt={community.name} 
                fill 
                className="object-cover"
              />
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{community.name}</h1>
                {community.status === 'APPROVED' && (
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full flex items-center gap-1 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Đã kiểm duyệt
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {community.locationAddress || 'Chưa cập nhật địa chỉ'}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {community._count?.members || 1} thành viên
                </span>
                <span className="flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-slate-400" />
                  {community._count?.tournaments || 0} giải đấu
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 pb-1 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
            <Button 
              onClick={handleJoinAction}
              disabled={isJoinLoading || membership?.status === 'PENDING'}
              className={`flex-1 sm:flex-none px-6 font-bold text-xs shadow-sm transition-all h-9 rounded-lg ${getJoinButtonStyles()}`}
            >
              {isJoinLoading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {getJoinButtonLabel()}
            </Button>
            
            <Button variant="outline" className="h-9 px-3 border-slate-200 hover:border-slate-350 text-slate-650 hover:bg-slate-50 active:scale-98 rounded-lg shadow-sm">
              <Share2 className="w-4 h-4" />
            </Button>
            
            {isOwner && (
              <Button 
                variant="outline" 
                onClick={() => setActiveTab('settings')}
                className={`h-9 px-3 border-slate-200 rounded-lg shadow-sm active:scale-98 transition-colors ${
                  activeTab === 'settings' 
                    ? 'bg-slate-100 text-slate-900 border-slate-300 font-semibold' 
                    : 'text-slate-650 hover:bg-slate-50 hover:border-slate-350'
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
              </Button>
            )}
            
            <Button variant="outline" className="h-9 px-3 border-slate-200 hover:border-slate-350 text-slate-650 hover:bg-slate-50 active:scale-98 rounded-lg shadow-sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 mb-6 hide-scrollbar">
          {[
            { id: 'about', label: 'Giới thiệu' },
            { id: 'tournaments', label: 'Giải đấu' },
            { id: 'members', label: 'Thành viên' },
            { id: 'gallery', label: 'Ảnh' },
            { id: 'rankings', label: 'Bảng xếp hạng' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`whitespace-nowrap py-3 px-5 font-bold text-xs border-b-2 -mb-[2px] transition-all ${
                activeTab === tab.id 
                  ? 'border-emerald-600 text-emerald-700 font-extrabold' 
                  : 'border-transparent text-slate-550 hover:text-slate-850 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {isOwner && activeTab === 'settings' && (
             <button 
               className="whitespace-nowrap py-3 px-5 font-extrabold text-xs border-b-2 border-emerald-600 text-emerald-700 -mb-[2px]"
             >
               Cài đặt
             </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 gap-8">
          <div>
            {activeTab === 'about' && <AboutTab community={community} />}
            {activeTab === 'tournaments' && <TournamentsTab communityId={id} isOwnerOrMod={isOwnerOrMod} />}
            {activeTab === 'members' && (
              <MembersTab 
                communityId={id} 
                isOwnerOrMod={isOwnerOrMod} 
                isOwner={isOwner} 
                userId={user?.id} 
                onMembershipChange={() => {
                  fetchMembership();
                  fetchCommunity();
                }} 
              />
            )}
            {activeTab === 'gallery' && <GalleryTab communityId={id} isOwnerOrMod={isOwnerOrMod} />}
            {activeTab === 'rankings' && <RankingsTab communityId={id} />}
            {activeTab === 'settings' && isOwner && <SettingsTab community={community} />}
          </div>
        </div>
      </div>

      {isJoinModalOpen && (
        <JoinCommunityModal
          community={community}
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          onSuccess={() => {
            setIsJoinModalOpen(false);
            fetchMembership();
            fetchCommunity();
          }}
        />
      )}
    </div>
  );
}
