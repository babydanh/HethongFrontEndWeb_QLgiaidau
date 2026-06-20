'use client';

import { useAuthStore } from '@/lib/zustand/authStore';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Trophy, Calendar, Users, Activity, Settings, MapPin, Edit3, ShieldCheck, Loader2, Phone, UploadCloud, X, Mail, Camera, AlertTriangle, ChevronRight, Zap, Award } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { usersApi, UserProfile } from '@/features/users/api';
import { communitiesApi, Community } from '@/features/communities/api';
import { formatDate } from '@/utils/format';
import Image from 'next/image';
import { api } from '@/lib/axios';
import { uploadApi } from '@/features/upload/api';
import { Input } from '@/components/ui/Input';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { ApiResponse } from '@/types/api';
import { rankingsApi, PlayerRanking, EloHistoryLog } from '@/features/rankings/api';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';
import { matchesApi, Match } from '@/features/matches/api';
import { EloTierBadge } from '@/components/ui/EloTierBadge';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';


interface VerificationTicket {
  id: string;
  userId: string;
  evidenceUrls: string[];
  contactPhone: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason?: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tournaments' | 'matches' | 'elo'>('overview');

  // Verification tickets states
  const [tickets, setTickets] = useState<VerificationTicket[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const handleCoverClick = () => {
    coverInputRef.current?.click();
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    try {
      setIsUploadingCover(true);
      const res = await usersApi.uploadCover(file);
      const url = res.coverUrl || undefined;

      const currentUser = useAuthStore.getState().user;
      if (currentUser && url) {
        useAuthStore.getState().setUser({ ...currentUser, coverUrl: url });
      }

      if (profileData && url) {
        setProfileData({ ...profileData, coverUrl: url });
      } else if (!profileData && url && user) {
        setProfileData({ ...user, coverUrl: url } as UserProfile);
      }

      toast.success('Đã cập nhật ảnh bìa');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi tải ảnh bìa lên');
    } finally {
      setIsUploadingCover(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const [data, communitiesRes] = await Promise.all([
          usersApi.getProfile(),
          communitiesApi.getMyCommunities()
        ]);
        if (isMounted) {
          setProfileData(data);
          setMyCommunities(communitiesRes.data || []);

          // Sync roles/details with useAuthStore so header displays updated roles immediately
          if (data) {
            useAuthStore.getState().setUser({
              ...data,
              roles: data.roles || [],
            });
          }

          const userRoles = data?.roles || [];
          if (!userRoles.includes('ORGANIZER') && !userRoles.includes('ADMIN')) {
            const res = await api.get<ApiResponse<VerificationTicket[]>>('/admin/verification-tickets/my');
            if (isMounted) {
              setTickets(res.data || []);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    try {
      setIsUploading(true);
      const res = await uploadApi.uploadImage(file);
      setEvidenceUrl(res.url);
      toast.success('Tải ảnh minh chứng lên thành công!');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi tải ảnh minh chứng lên');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitTicket = async () => {
    if (!phone.trim()) {
      toast.error('Vui lòng nhập số điện thoại liên hệ');
      return;
    }
    if (!evidenceUrl) {
      toast.error('Vui lòng tải lên ảnh minh chứng năng lực');
      return;
    }

    try {
      setIsSubmittingTicket(true);
      await api.post('/admin/verification-tickets', {
        evidenceUrls: [evidenceUrl],
        contactPhone: phone.trim()
      });
      toast.success('Gửi yêu cầu xác minh thành công! Đang chờ Admin duyệt.');
      setIsModalOpen(false);
      setPhone('');
      setEvidenceUrl('');
      
      const res = await api.get<ApiResponse<VerificationTicket[]>>('/admin/verification-tickets/my');
      setTickets(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi gửi yêu cầu');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const displayUser = profileData || user;

  const [userRankings, setUserRankings] = useState<{ publicRanks: PlayerRanking[]; communityRanks: PlayerRanking[] } | null>(null);
  const [eloHistory, setEloHistory] = useState<EloHistoryLog[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const [matchesPage, setMatchesPage] = useState(1);
  const [matchesTotalPages, setMatchesTotalPages] = useState(1);

  useEffect(() => {
    if (!displayUser?.id) return;

    let isMounted = true;
    const fetchTabData = async () => {
      try {
        setIsLoadingTab(true);
        const [ranksRes, historyRes, tournamentsRes, matchesRes] = await Promise.all([
          rankingsApi.getUserRankings(displayUser.id),
          rankingsApi.getUserEloHistory(displayUser.id),
          tournamentsApi.getMyTournaments(),
          matchesApi.getMatches({ userId: displayUser.id, page: matchesPage, limit: 10 })
        ]);

        if (isMounted) {
          setUserRankings(ranksRes);
          setEloHistory(historyRes?.data || []);
          setTournaments(tournamentsRes?.data || []);
          setMatches(matchesRes?.data || []);
          setMatchesTotalPages(matchesRes?.meta?.totalPages || 1);
        }
      } catch (err) {
        console.error('Failed to fetch profile tab data', err);
      } finally {
        if (isMounted) {
          setIsLoadingTab(false);
        }
      }
    };

    fetchTabData();

    return () => {
      isMounted = false;
    };
  }, [displayUser?.id, matchesPage]);


  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
      
      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Cover Photo */}
        <div className="h-48 bg-slate-900 relative group overflow-hidden">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={coverInputRef} 
            onChange={handleCoverChange} 
          />
          {displayUser?.coverUrl ? (
            <img 
              src={displayUser.coverUrl} 
              alt="Cover" 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-80"></div>
          )}
          
          <button 
            type="button" 
            onClick={handleCoverClick}
            disabled={isUploadingCover}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
          >
            {isUploadingCover ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            Chỉnh sửa ảnh bìa
          </button>
        </div>
        
        <div className="px-6 md:px-10 pb-8 relative">
          {/* Avatar & Actions */}
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 -mt-16 mb-4 relative z-10">
            <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
              {displayUser?.avatarUrl ? (
                <img src={displayUser.avatarUrl} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-slate-400 uppercase">{displayUser?.fullName?.charAt(0) || 'U'}</span>
              )}
            </div>
            <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
              <Link href="/profile/edit" className="w-full md:w-auto">
                <Button variant="outline" className="w-full md:w-auto border-slate-200 text-slate-600 hover:bg-slate-50">
                  <Edit3 className="w-4 h-4 mr-2" /> Chỉnh sửa hồ sơ
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Info */}
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
              {isLoading ? (
                <span className="w-48 h-8 bg-slate-200 animate-pulse rounded"></span>
              ) : (
                displayUser?.fullName || 'Người dùng ẩn danh'
              )}
              {((displayUser as unknown as Record<string, unknown>)?.roles as string[] | undefined)?.includes('ADMIN') && (
                <span title="Admin">
                  <ShieldCheck className="w-6 h-6 text-blue-500" />
                </span>
              )}
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              {isLoading ? (
                <span className="w-32 h-4 bg-slate-200 animate-pulse rounded inline-block mt-1"></span>
              ) : (
                displayUser?.email
              )}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {((user as unknown as Record<string, unknown>)?.roles as string[] | undefined)?.map((role: string) => (
                <span key={role} className="px-2 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  {role}
                </span>
              ))}
              {profileData?.createdAt && (
                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Tham gia từ {formatDate(profileData.createdAt, 'MM/yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warning banner for missing gender */}
      {!isLoading && displayUser && !displayUser.gender && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-bold text-amber-900 text-sm">Chưa cập nhật giới tính</h4>
              <p className="text-amber-700 text-xs mt-0.5">Vui lòng cập nhật giới tính trong hồ sơ để có thể đăng ký tham gia các giải đấu.</p>
            </div>
          </div>
          <Link href="/profile/edit">
            <Button size="sm" className="bg-amber-650 hover:bg-amber-700 text-white font-bold text-xs">
              Cập nhật ngay
            </Button>
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-1 no-scrollbar">
        {([
          { id: 'overview', label: 'Tổng quan' },
          { id: 'tournaments', label: 'Giải đấu' },
          { id: 'matches', label: 'Trận đấu' },
          { id: 'elo', label: 'Thống kê ELO' }
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-t-lg font-bold text-sm whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id 
                ? 'text-blue-600 border-blue-600 bg-blue-50/50' 
                : 'text-slate-500 border-transparent hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex flex-col gap-6">
              {/* Giới thiệu */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Giới thiệu</h3>
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 animate-pulse rounded w-full"></div>
                    <div className="h-4 bg-slate-200 animate-pulse rounded w-3/4"></div>
                  </div>
                ) : profileData?.bio ? (
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {profileData.bio}
                  </p>
                ) : (
                  <p className="text-slate-400 text-sm italic">
                    Chưa cập nhật phần giới thiệu bản thân.
                  </p>
                )}
              </div>

              {/* Thông tin chi tiết */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Thông tin chi tiết</h3>
                {isLoading ? (
                  <div className="space-y-4">
                    <div className="h-4 bg-slate-200 animate-pulse rounded w-full"></div>
                    <div className="h-4 bg-slate-200 animate-pulse rounded w-3/4"></div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 text-sm">
                    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                      <span className="text-slate-500 font-medium">Ngày sinh</span>
                      <span className="text-slate-900 font-semibold">
                        {profileData?.dateOfBirth 
                          ? `${new Date(profileData.dateOfBirth).getDate().toString().padStart(2, '0')}/${(new Date(profileData.dateOfBirth).getMonth() + 1).toString().padStart(2, '0')}/${new Date(profileData.dateOfBirth).getFullYear()}`
                          : 'Chưa cập nhật'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                      <span className="text-slate-500 font-medium">Giới tính</span>
                      <span className="text-slate-900 font-semibold">{profileData?.gender || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                      <span className="text-slate-500 font-medium">Địa chỉ</span>
                      <span className="text-slate-900 font-semibold">{profileData?.address || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500 font-medium">Email liên hệ</span>
                      <span className="text-slate-900 font-semibold">{profileData?.email || 'Chưa cập nhật'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Yêu cầu quyền Ban tổ chức (Organizer) */}
              {!isLoading && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Vai trò Ban tổ chức</h3>
                  {(profileData?.roles || user?.roles || []).includes('ORGANIZER') ||
                   (profileData?.roles || user?.roles || []).includes('ADMIN') ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs font-semibold text-emerald-800 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-950">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        Đã xác minh Ban tổ chức
                      </div>
                      <p className="text-emerald-700 leading-relaxed">
                        Chúc mừng! Tài khoản của bạn đã được phê duyệt quyền Ban tổ chức giải. Hiện tại bạn có quyền quản lý giải đấu và tạo chuỗi giải đấu chuyên nghiệp tính Rank ELO.
                      </p>
                    </div>
                  ) : tickets.length > 0 && tickets[0].status === 'PENDING' ? (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs font-semibold text-amber-800 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-amber-900">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                        Đang chờ duyệt...
                      </div>
                      <p className="text-amber-700 leading-relaxed">
                        Yêu cầu nâng cấp tài khoản của bạn đang được Ban quản trị hệ thống xử lý.
                      </p>
                      <div className="pt-2 border-t border-amber-100/50 text-[10px] text-amber-600">
                        SĐT liên hệ: {tickets[0].contactPhone}
                      </div>
                    </div>
                  ) : tickets.length > 0 && tickets[0].status === 'REJECTED' ? (
                    <div className="space-y-4">
                      <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs font-semibold text-rose-800 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-sm text-rose-900">
                          <X className="w-4 h-4 text-rose-600" />
                          Yêu cầu bị từ chối
                        </div>
                        <p className="text-rose-700 leading-relaxed">
                          Lý do: <span className="font-bold text-rose-900">{tickets[0].rejectReason || 'Không có lý do chi tiết'}</span>
                        </p>
                      </div>
                      <Button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      >
                        Gửi lại yêu cầu
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                        Bạn mặc định có thể tự do tạo giải đấu nội bộ miễn phí trong Câu lạc bộ của mình. Chỉ gửi yêu cầu nếu bạn muốn tạo giải đấu công khai tính ELO toàn hệ thống hoặc chuỗi giải đấu lớn.
                      </p>
                      <Button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        Yêu cầu quyền Ban tổ chức
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="md:col-span-2 space-y-6">
              {/* Câu lạc bộ của tôi */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Câu lạc bộ của tôi</h3>
                  <Link href="/communities/create">
                    <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Tạo câu lạc bộ
                    </Button>
                  </Link>
                </div>
                
                {isLoading ? (
                  <div className="animate-pulse flex gap-4">
                    <div className="w-16 h-16 bg-slate-200 rounded-full"></div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ) : myCommunities.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {myCommunities.map(community => (
                      <Link href={`/communities/${community.id}`} key={community.id}>
                        <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-emerald-500 hover:shadow-md transition-all group bg-slate-50 cursor-pointer">
                          <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-200 relative shrink-0">
                            <Image src={community.logoUrl || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop"} alt={community.name} fill className="object-cover" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1">{community.name}</h4>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                              Đang hoạt động
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">Bạn chưa tham gia câu lạc bộ nào</p>
                    <p className="text-slate-400 text-sm mt-1 mb-4">Tham gia các câu lạc bộ thể thao để giao lưu và thi đấu</p>
                    <Link href="/communities">
                      <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                        Khám phá câu lạc bộ
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center py-12 border-dashed">
                <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium text-lg">Chưa có dữ liệu hoạt động</p>
                <p className="text-slate-400 text-sm mt-1">Hãy tham gia giải đấu để bắt đầu ghi nhận thành tích!</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tournaments' && (
          <div className="space-y-6">
            {isLoadingTab ? (
              <div className="flex justify-center items-center py-12 bg-white rounded-2xl border border-slate-200">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : tournaments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {tournaments.map((t) => (
                  <div key={t.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all flex flex-col justify-between gap-4">
                    <div>
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        t.status === 'REGISTRATION_OPEN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        t.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        t.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {t.status === 'REGISTRATION_OPEN' ? 'Đăng ký' :
                         t.status === 'IN_PROGRESS' ? 'Đang đấu' :
                         t.status === 'COMPLETED' ? 'Đã xong' : t.status}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-2 line-clamp-1">{t.name}</h3>
                      <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {t.locationAddress || 'Chưa cập nhật'}
                      </p>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs text-slate-650 font-semibold">
                      <div>
                        <span className="text-slate-400">Thể thức:</span> <span>{t.matchType === 'SINGLES' ? 'Đánh đơn' : 'Đánh đôi'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Ngày:</span> <span>{formatDate(t.startDate, 'dd/MM/yyyy')}</span>
                      </div>
                    </div>
                    <Link href={`/tournaments/${t.id}`}>
                      <Button variant="outline" className="w-full text-xs font-bold border-slate-200 text-slate-650 hover:bg-slate-50 mt-1">
                        Chi tiết giải đấu
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
                <Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">Chưa tham gia giải đấu nào</h3>
                <p className="text-slate-500 max-w-sm mx-auto text-sm">
                  Hãy khám phá các giải đấu đang mở đăng ký ngoài trang chủ để giao lưu cọ xát.
                </p>
                <Link href="/tournaments" className="mt-4 inline-block">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold">Tìm kiếm giải đấu</Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-6">
            {isLoadingTab ? (
              <div className="flex justify-center items-center py-12 bg-white rounded-2xl border border-slate-200">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : matches.length > 0 ? (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {matches.map((match) => {
                  const isCompleted = match.status === 'COMPLETED';
                  const isP1 = match.participant1?.teamName?.toLowerCase() === displayUser?.fullName?.toLowerCase();
                  
                  const isWinner = isCompleted && match.winnerId && (
                    (match.winnerId === match.participant1Id && isP1) ||
                    (match.winnerId === match.participant2Id && !isP1)
                  );

                  const opponentName = isP1
                    ? match.participant2?.teamName || 'Chưa xác định'
                    : match.participant1?.teamName || 'Chưa xác định';

                  return (
                    <div
                      key={match.id}
                      className="bg-white border border-slate-200 hover:border-slate-350 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-450">
                          <span>{match.tournament?.name || 'Giải đấu'}</span>
                          <span>•</span>
                          <span>Vòng {match.roundNumber}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span className="text-slate-400">Đối thủ:</span>
                          <span className="text-blue-650 font-extrabold">{opponentName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-sm font-black text-slate-705 tabular-nums">
                          {match.p1SetsWon} - {match.p2SetsWon}
                        </div>

                        {isCompleted ? (
                          isWinner ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-250 uppercase tracking-wide">
                              Thắng
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-250 uppercase tracking-wide">
                              Thua
                            </span>
                          )
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-250 uppercase tracking-wide">
                            Đang đấu
                          </span>
                        )}

                        <Link
                          href={`/live/${match.id}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0"
                        >
                          Chi tiết <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
                
                {matchesTotalPages > 1 && (
                  <div className="flex justify-center items-center gap-3 mt-6 pt-4 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={matchesPage <= 1}
                      onClick={() => setMatchesPage(p => Math.max(1, p - 1))}
                      className="border-slate-200 text-slate-650 hover:bg-slate-50"
                    >
                      Trước
                    </Button>
                    <span className="text-xs font-bold text-slate-500">Trang {matchesPage} / {matchesTotalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={matchesPage >= matchesTotalPages}
                      onClick={() => setMatchesPage(p => Math.min(matchesTotalPages, p + 1))}
                      className="border-slate-200 text-slate-650 hover:bg-slate-50"
                    >
                      Sau
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
                <Activity className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">Chưa thi đấu trận nào</h3>
                <p className="text-slate-500 max-w-sm mx-auto text-sm">
                  Hãy tham gia giải đấu và cập nhật kết quả thi đấu để xem lịch sử trận đấu của bạn tại đây.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'elo' && (
          <div className="space-y-6">
            {isLoadingTab ? (
              <div className="flex justify-center items-center py-12 bg-white rounded-2xl border border-slate-200">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Hạng Trình Độ ELO</h3>
                  </div>

                  {userRankings?.publicRanks && userRankings.publicRanks.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {userRankings.publicRanks.map((rank) => (
                        <div key={rank.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                          <div className="space-y-1.5 flex-1">
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-550 border border-slate-200">
                              {rank.categoryName} • {rank.matchType === 'SINGLES' ? 'Đánh đơn' : 'Đánh đôi'}
                            </span>
                            <div className="flex items-center gap-2">
                              <Award className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                              <h4 className="font-extrabold text-slate-900 text-base">{rank.eloPoints} ELO</h4>
                            </div>
                            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                              <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">Số Trận</div>
                                <div className="font-extrabold text-slate-700 mt-0.5">{rank.matchesPlayed}</div>
                              </div>
                              <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">Thắng</div>
                                <div className="font-extrabold text-emerald-600 mt-0.5">{rank.matchesWon}</div>
                              </div>
                              <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">Chuỗi</div>
                                <div className="font-extrabold text-blue-600 mt-0.5 flex items-center justify-center gap-0.5">
                                  <Zap className="w-3 h-3 fill-blue-500 text-blue-600" /> {rank.winStreak}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
                      Bạn chưa tham gia thi đấu xếp hạng ELO chính thức.
                    </div>
                  )}
                </div>

                {eloHistory.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Biến động ELO theo thời gian</h3>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[...eloHistory].reverse().map((item, index) => ({
                            name: `Trận ${index + 1}`,
                            'ELO': item.newElo,
                            date: formatDate(item.createdAt, 'dd/MM/yyyy'),
                            reason: item.reason || (item.changedPoints > 0 ? 'Thắng' : 'Thua'),
                            tournament: item.match?.tournamentName || 'Giải đấu'
                          }))}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={['dataMin - 50', 'dataMax + 50']} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 text-xs shadow-md">
                                    <p className="font-bold">{data.date}</p>
                                    <p className="text-blue-400 mt-1 font-bold">ELO: {data.ELO}</p>
                                    <p className="text-slate-400 mt-0.5">{data.reason}</p>
                                    <p className="text-slate-505 text-[10px] mt-0.5">{data.tournament}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="ELO"
                            stroke="#2563eb"
                            strokeWidth={3}
                            dot={{ r: 4, stroke: '#2563eb', strokeWidth: 2, fill: '#fff' }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Lịch sử thay đổi ELO</h3>
                  {eloHistory.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {eloHistory.map((item) => {
                        const isGain = item.changedPoints >= 0;
                        return (
                          <div key={item.id} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-b-0">
                            <div>
                              <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.match?.tournamentName || 'Trận đấu xếp hạng'}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{formatDate(item.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                            </div>
                            <div className="flex items-center gap-3 text-right">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-bold">ELO mới</span>
                                <span className="text-sm font-extrabold text-slate-700">{item.newElo}</span>
                              </div>
                              <span className={`inline-block px-2 py-1 rounded text-xs font-bold min-w-[45px] text-center ${
                                isGain ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {isGain ? `+${item.changedPoints}` : item.changedPoints}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-sm">
                      Không có lịch sử biến động ELO.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal gửi yêu cầu xác minh */}
      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <ModalContent className="max-w-md p-6">
          <ModalHeader>
            <ModalTitle className="text-xl font-black text-slate-900">Đăng ký Ban tổ chức giải</ModalTitle>
            <p className="text-slate-500 text-xs mt-1 font-medium leading-relaxed">
              (Dùng để tạo chuỗi giải đấu hoặc giải đấu công khai tính Rank ELO. Nếu chỉ tổ chức giải nội bộ CLB thì bạn không cần đăng ký quyền này).
            </p>
          </ModalHeader>
          <div className="mt-4 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gmail liên hệ</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-500 font-semibold">
                <Mail className="w-4 h-4 text-slate-400" />
                {displayUser?.email}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Số điện thoại liên hệ <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Nhập số điện thoại liên lạc..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Ảnh minh chứng năng lực <span className="text-rose-500">*</span>
              </label>
              
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="file"
                  onChange={handleUploadEvidence}
                  accept="image/*"
                  className="hidden"
                  id="evidence-upload"
                />
                
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center py-4 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                    <span className="text-xs mt-2 font-medium">Đang tải ảnh lên...</span>
                  </div>
                ) : evidenceUrl ? (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden group">
                    <img src={evidenceUrl} alt="Evidence" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEvidenceUrl('')}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/85 text-white rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="evidence-upload"
                    className="flex flex-col items-center justify-center py-6 cursor-pointer text-slate-400 hover:text-emerald-500 text-center w-full"
                  >
                    <UploadCloud className="w-8 h-8 mb-1" />
                    <span className="text-xs font-bold">Chọn ảnh chứng chỉ, giấy phép...</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG (Tối đa 5MB)</span>
                  </label>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t justify-end">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmittingTicket}
              >
                Hủy bỏ
              </Button>
              <Button
                onClick={handleSubmitTicket}
                isLoading={isSubmittingTicket}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Gửi yêu cầu
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
