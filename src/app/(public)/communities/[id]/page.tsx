'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { communitiesApi, Community } from '@/features/communities/api';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, MapPin, Users, Trophy, Share2, MoreHorizontal, ShieldAlert, Settings as SettingsIcon, Loader2, Bookmark, Star } from 'lucide-react';
import { formatDate } from '@/utils/format';
import { useAuthStore } from '@/lib/zustand/authStore';
import { JoinCommunityModal } from '@/components/shared/JoinCommunityModal';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import { ReportViolationButton } from '@/features/reports/components/ReportViolationButton';
import ShareModal from '@/components/common/ShareModal';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface CommunityMemberRecord {
  member?: { id?: string; userId?: string; role?: string; status?: string };
  user?: { id?: string; email?: string };
}

// Tabs
import OverviewTab from './components/OverviewTab';
import TournamentsTab from './components/TournamentsTab';
import MembersTab from './components/MembersTab';
import GalleryTab from './components/GalleryTab';
import RankingsTab from './components/RankingsTab';
import SettingsTab from './components/SettingsTab';
import ModerationTab from './components/ModerationTab';

export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuthStore();

  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tournaments' | 'members' | 'gallery' | 'rankings' | 'moderation' | 'settings'>('overview');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Real membership state
  const [membership, setMembership] = useState<{ role: string; status: string; memberId: string } | null>(null);
  const [isJoinLoading, setIsJoinLoading] = useState(false);
  const [galleryImages, setGalleryImages] = useState<{ id: string; imageUrl: string }[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  // Legacy favorite state is retained only for backwards-compatible API data;
  // the community header no longer exposes a redundant favorite action.
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const fetchGallery = async () => {
    try {
      const res = await communitiesApi.getGallery(id);
      const responseData: unknown = res.data;
      const images = Array.isArray(responseData)
        ? responseData
        : responseData && typeof responseData === 'object' && 'data' in responseData && Array.isArray(responseData.data)
          ? responseData.data
          : [];
      setGalleryImages(
        images.filter(
          (image): image is { id: string; imageUrl: string } =>
            Boolean(image) &&
            typeof image === 'object' &&
            typeof image.id === 'string' &&
            typeof image.imageUrl === 'string' &&
            image.imageUrl.length > 0,
        ),
      );
    } catch (err) {
      console.error('Failed to fetch gallery', err);
    }
  };

  const fetchMembership = async () => {
    if (!user || !id) {
      if (membership !== null) {
        setMembership(null);
      }
      return;
    }
    try {
      const res = await communitiesApi.getMembers(id);
      const memberList = res.data || res || [];
      const current = memberList.find((m: CommunityMemberRecord) => m.member?.userId === user.id || m.user?.id === user.id);
      if (current) {
        const nextMembership = {
          role: current.member?.role || 'MEMBER',
          status: current.member?.status || 'JOINED',
          memberId: current.member?.id || '',
        };
        setMembership(nextMembership);
      } else {
        if (membership !== null) {
          setMembership(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch membership status', error);
    }
  };

  const fetchFollowState = async () => {
    if (!user || !id) return;
    try {
      const res = await communitiesApi.getFavorites();
      const favoritesData: unknown = res.data || res || [];
      const favorites = Array.isArray(favoritesData) ? favoritesData : [];
      setIsFavorite(favorites.some((f: { community?: { id?: string } }) => f.community?.id === id));
    } catch (error) {
      console.error('Failed to fetch favorite state', error);
    }
  };

  const handleToggleFollow = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để theo dõi câu lạc bộ.');
      router.push('/login');
      return;
    }
    try {
      setIsFollowLoading(true);
      if (isFollowing) {
        await communitiesApi.unfollowCommunity(id);
        setIsFollowing(false);
        toast.success('Đã bỏ theo dõi câu lạc bộ.');
      } else {
        await communitiesApi.followCommunity(id);
        setIsFollowing(true);
        toast.success('Đã theo dõi câu lạc bộ.');
      }
    } catch (error) {
      console.error('Failed to toggle follow', error);
      toast.error(getErrorMessage(error, 'Không thể cập nhật trạng thái theo dõi.'));
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để lưu câu lạc bộ yêu thích.');
      router.push('/login');
      return;
    }
    try {
      setIsFollowLoading(true);
      if (isFavorite) {
        await communitiesApi.unfavoriteCommunity(id);
        setIsFavorite(false);
        toast.success('Đã bỏ yêu thích câu lạc bộ.');
      } else {
        await communitiesApi.favoriteCommunity(id);
        setIsFavorite(true);
        toast.success('Đã thêm vào danh sách yêu thích.');
      }
    } catch (error) {
      console.error('Failed to toggle favorite', error);
      toast.error(getErrorMessage(error, 'Không thể cập nhật trạng thái yêu thích.'));
    } finally {
      setIsFollowLoading(false);
    }
  };

  const fetchCommunity = async () => {
    try {
      if (!isLoading) {
        setIsLoading(true);
      }
      setFetchError(null);
      const res = await communitiesApi.getCommunityById(id);
      const data = (res as { data?: Community })?.data ?? (res as unknown as Community);
      setCommunity(data);
    } catch (e) {
      const error = e as any;
      console.error('Failed to fetch community details', error);
      if (error?.response?.status === 403) {
        setFetchError('Cộng đồng này đã bị vô hiệu hoá bởi quản trị viên.');
      } else {
        setFetchError('Không thể tải thông tin câu lạc bộ.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      Promise.resolve().then(() => {
        fetchCommunity();
        fetchGallery();
      });
    }
  }, [id]);

  useEffect(() => {
    if (id && user) {
      Promise.resolve().then(() => {
        fetchMembership();
        fetchFollowState();
      });
    } else {
      if (membership !== null) {
        Promise.resolve().then(() => {
          setMembership(null);
        });
      }
    }
  }, [id, user]);

  const handleLeaveCommunity = async () => {
    const currentUserId = user?.id;
    if (!currentUserId) return;
    try {
      setIsJoinLoading(true);
      await communitiesApi.removeMember(id, currentUserId);
      toast.success('Đã rời khỏi câu lạc bộ.');
      setMembership(null);
      setIsLeaveConfirmOpen(false);
      fetchCommunity();
    } catch (error) {
      console.error('Failed to leave community', error);
      toast.error(getErrorMessage(error, 'Lỗi khi thực hiện rời câu lạc bộ.'));
    } finally {
      setIsJoinLoading(false);
    }
  };

  const handleJoinAction = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để tham gia câu lạc bộ.');
      router.push('/login');
      return;
    }

    if (isOwner) {
      setActiveTab('moderation');
      return;
    }

    if (membership?.status === 'JOINED') {
      setIsLeaveConfirmOpen(true);
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
        toast.error(getErrorMessage(error, 'Lỗi khi chấp nhận lời mời.'));
      } finally {
        setIsJoinLoading(false);
      }
      return;
    }

    if (community?.joinMode === 'INVITE_ONLY' && membership?.status !== 'INVITED') {
      toast.error('Câu lạc bộ này ở chế độ Chỉ Mời. Bạn cần được quản trị viên mời để tham gia.');
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
      } catch (e) {
        const error = e as any;
        console.error('Failed to join community', error);
        if (error?.response?.status === 403) {
          toast.error('Câu lạc bộ này ở chế độ Chỉ Mời. Bạn không thể tự tham gia.');
        } else {
          toast.error(getErrorMessage(error, 'Lỗi khi tham gia câu lạc bộ.'));
        }
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
    if (community?.joinMode === 'INVITE_ONLY') return 'Chỉ nhận lời mời';
    return community?.joinMode === 'APPROVAL' ? 'Xin tham gia' : 'Tham gia';
  };

  const getJoinButtonStyles = () => {
    if (isOwner) return 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200';
    if (membership?.status === 'JOINED') return 'bg-blue-50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-blue-700 border border-blue-200';
    if (membership?.status === 'PENDING') return 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200';
    if (membership?.status === 'INVITED') return 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse';
    if (community?.joinMode === 'INVITE_ONLY') return 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200';
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

  const slides = community ? [
    ...(community.bannerUrl ? [community.bannerUrl] : []),
    ...galleryImages.map(img => img.imageUrl)
  ] : [];

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Banner / Cover */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 pt-4 md:pt-6">
        <div className="relative h-[280px] md:h-[400px] w-full bg-slate-200 shadow-xl rounded-lg md:rounded-2xl overflow-hidden group/banner">
          {slides.length > 0 ? (
            <Image 
              src={slides[currentSlide]} 
              alt="Cover" 
              fill 
              className="object-cover transition-all duration-700 ease-in-out" 
              priority 
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-950"></div>
          )}
          
          {/* Back button */}
          <button 
            onClick={() => router.back()}
            className="absolute top-4 left-4 sm:top-6 sm:left-6 lg:left-8 bg-black/45 hover:bg-black/60 backdrop-blur-md p-2 rounded-full text-white transition-all shadow-md active:scale-95 z-20"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Carousel Controls */}
          {slides.length > 1 && (
            <>
              <button 
                onClick={() => setCurrentSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover/banner:opacity-100 transition-opacity z-20 flex items-center justify-center w-9 h-9"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover/banner:opacity-100 transition-opacity z-20 flex items-center justify-center w-9 h-9"
              >
                {/* Reusing Lucide icons correctly to prevent dynamic text issues */}
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </button>
              {/* Dots indicator */}
              <div className="absolute bottom-4 right-6 flex gap-1.5 z-20">
                {slides.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${idx === currentSlide ? 'bg-white w-4' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Only name inside banner, at bottom-left */}
          <div className="absolute bottom-4 left-6 md:bottom-6 md:left-8 z-10">
            <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wide uppercase">
              {community.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Info Panel below banner */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 mt-6">
        <div className="bg-white border border-slate-200/80 rounded-lg p-5 md:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full md:w-auto">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border border-slate-200 overflow-hidden bg-white shadow-md relative shrink-0 p-1.5">
              <Image 
                src={community.logoUrl || "/sporto_v1_with_text.svg"}
                alt={community.name} 
                fill 
                className="object-contain rounded-full p-2"
              />
            </div>
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                  {community.locationAddress || 'Chưa cập nhật địa điểm'}
                </span>
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Users className="w-4 h-4 text-slate-500 shrink-0" />
                  {community._count?.members || 1} thành viên
                </span>
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Trophy className="w-4 h-4 text-slate-500 shrink-0" />
                  {community._count?.tournaments || 0} giải đấu
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 flex-wrap justify-start md:justify-end">
            <Button 
              onClick={handleJoinAction}
              disabled={isJoinLoading || membership?.status === 'PENDING'}
              className={`flex-1 md:flex-none px-6 font-bold text-xs shadow-sm transition-all h-10 rounded-lg ${
                isOwner ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200' :
                membership?.status === 'JOINED' ? 'bg-blue-50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-blue-700 border border-blue-200' :
                'bg-emerald-600 hover:bg-emerald-700 text-white border-none'
              }`}
            >
              {isJoinLoading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {getJoinButtonLabel()}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleToggleFollow}
              disabled={isFollowLoading}
              className={`h-10 px-3 rounded-lg shadow-sm border transition-colors ${
                isFollowing
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
              aria-label={isFollowing ? 'Bỏ theo dõi câu lạc bộ' : 'Theo dõi câu lạc bộ'}
              title={isFollowing ? 'Bỏ theo dõi' : 'Theo dõi'}
            >
              <Bookmark strokeWidth={1.5} className={`w-4 h-4 ${isFollowing ? 'fill-emerald-600 text-emerald-600' : ''}`} />
            </Button>

            <Button
              variant="outline"
              onClick={handleToggleFavorite}
              disabled={isFollowLoading}
              className={`hidden h-10 px-3 rounded-lg shadow-sm border transition-colors ${
                isFavorite
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
              aria-label={isFavorite ? 'Bỏ yêu thích câu lạc bộ' : 'Yêu thích câu lạc bộ'}
              title={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
            >
              <Star strokeWidth={1.5} className={`w-4 h-4 ${isFavorite ? 'fill-emerald-600 text-emerald-600' : ''}`} />
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsShareModalOpen(true)}
              className="h-10 px-3 bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 rounded-lg shadow-sm"
              aria-label={`Chia sẻ câu lạc bộ ${community.name}`}
            >
              <Share2 className="w-4 h-4" />
            </Button>
            
            {isOwner && (
              <Button 
                variant="outline" 
                onClick={() => setActiveTab('settings')}
                className={`h-10 px-3 rounded-lg shadow-sm border-slate-200 transition-colors ${
                  activeTab === 'settings' 
                    ? 'bg-slate-200 text-slate-800 font-semibold' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
              </Button>
            )}
            
            <ReportViolationButton
              targetType="COMMUNITY"
              targetId={community.id}
              targetLabel={community.name}
              hidden={isOwner}
              compact
              className="h-10 rounded-lg shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 mt-6">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-6 mt-4 hide-scrollbar">
          {[
            { id: 'overview', label: 'Tổng quan' },
            { id: 'tournaments', label: 'Giải đấu' },
            { id: 'members', label: 'Thành viên' },
            { id: 'gallery', label: 'Ảnh' },
            { id: 'rankings', label: 'Bảng xếp hạng' },
            ...(isOwnerOrMod ? [{ id: 'moderation', label: 'Điều phối' }] : []),
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-[#0d8fd4] text-white shadow-sm' 
                  : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300 hover:text-slate-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {isOwner && (
             <button 
               onClick={() => setActiveTab('settings')}
               className={`px-5 py-2.5 rounded-lg font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'settings' 
                  ? 'bg-[#0d8fd4] text-white shadow-sm' 
                  : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300 hover:text-slate-950'
              }`}
             >
               Cài đặt
             </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 gap-8">
          <div>
            {activeTab === 'overview' && (
              <OverviewTab
                communityId={id}
                description={community.description}
                rules={community.rules}
                canManageTags={isOwnerOrMod || Boolean(user?.roles?.includes('ADMIN'))}
                onGoToTournaments={() => setActiveTab('tournaments')}
                onGoToRankings={() => setActiveTab('rankings')}
                onGoToGallery={() => setActiveTab('gallery')}
              />
            )}
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
            {activeTab === 'gallery' && <GalleryTab communityId={id} community={community} isOwnerOrMod={isOwnerOrMod} />}
            {activeTab === 'rankings' && <RankingsTab communityId={id} categories={community?.categories || []} onGoToTournaments={() => setActiveTab('tournaments')} />}
            {activeTab === 'moderation' && isOwnerOrMod && (
              <ModerationTab communityId={id} isOwner={isOwner} />
            )}
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

      <ConfirmModal
        open={isLeaveConfirmOpen}
        onOpenChange={setIsLeaveConfirmOpen}
        title="Rời khỏi câu lạc bộ"
        description="Bạn có chắc chắn muốn rời khỏi câu lạc bộ này?"
        confirmLabel="Rời khỏi"
        variant="danger"
        isLoading={isJoinLoading}
        onConfirm={handleLeaveCommunity}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={typeof window !== 'undefined' ? window.location.href : `/communities/${community.id}`}
        title={community.name}
      />
    </div>
  );
}
