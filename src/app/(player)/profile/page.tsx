'use client';

import { useAuthStore } from '@/lib/zustand/authStore';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Trophy, Calendar, Users, Activity, Settings, MapPin, Edit3, ShieldCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usersApi, UserProfile } from '@/features/users/api';
import { communitiesApi, Community } from '@/features/communities/api';
import { formatDate } from '@/utils/format';
import Image from 'next/image';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tournaments' | 'matches' | 'elo'>('overview');

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

  const displayUser = profileData || user;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
      
      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Cover Photo */}
        <div className="h-48 bg-slate-900 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-80"></div>
          {/* Tương lai có thể thêm ảnh cover thật */}
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

        {(activeTab === 'tournaments' || activeTab === 'matches' || activeTab === 'elo') && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
             <Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4" />
             <h3 className="text-xl font-bold text-slate-700 mb-2">Tính năng đang phát triển</h3>
             <p className="text-slate-500 max-w-md mx-auto">
               Hệ thống đang được nâng cấp để kết nối với cơ sở dữ liệu. Dữ liệu {activeTab === 'elo' ? 'ELO' : activeTab === 'matches' ? 'Trận đấu' : 'Giải đấu'} cá nhân sẽ sớm ra mắt!
             </p>
          </div>
        )}

      </div>
    </div>
  );
}
