"use client";

// Reading this as: Sport clubs and communities discovery grid, with a premium card design system.
import Image from "next/image";
import { useEffect, useState } from "react";
import { communitiesApi, Community } from "@/features/communities/api";
import { JoinCommunityModal } from "@/components/shared/JoinCommunityModal";
import { useAuthStore } from "@/lib/zustand/authStore";
import { Shield, Users, Trophy, MapPin, Search, Star, Loader2, ArrowRight } from "lucide-react";
import { getSportLogo } from "@/constants/sports";
import toast from "react-hot-toast";

// Sports-specific tinted styling helper
const getCategoryStyles = (name: string) => {
  const normalized = name.toLowerCase();
  if (normalized.includes("pickleball")) {
    return {
      bg: "bg-emerald-50/80 text-emerald-700 border-emerald-200/30",
      dot: "bg-emerald-500"
    };
  }
  if (normalized.includes("tennis")) {
    return {
      bg: "bg-amber-50/80 text-amber-700 border-amber-200/30",
      dot: "bg-amber-500"
    };
  }
  if (normalized.includes("badminton") || normalized.includes("cầu lông")) {
    return {
      bg: "bg-sky-50/80 text-sky-700 border-sky-200/30",
      dot: "bg-sky-500"
    };
  }
  if (normalized.includes("table tennis") || normalized.includes("bóng bàn")) {
    return {
      bg: "bg-rose-50/80 text-rose-700 border-rose-200/30",
      dot: "bg-rose-500"
    };
  }
  return {
    bg: "bg-slate-50/80 text-slate-700 border-slate-200/40",
    dot: "bg-slate-500"
  };
};

export default function CommunitiesPage() {
  const { user } = useAuthStore();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [provinces, setProvinces] = useState<{ code: string, name: string }[]>([]);

  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [myCommunityIds, setMyCommunityIds] = useState<Set<string>>(new Set());

  const fetchMyCommunities = async () => {
    if (user) {
      try {
        const res = await communitiesApi.getMyCommunities();
        const list = res.data || [];
        setMyCommunityIds(new Set(list.map((c: Community) => c.id)));
      } catch (err) {
        console.error("Failed to load my communities", err);
      }
    } else {
      setMyCommunityIds(new Set());
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchMyCommunities();
    });
  }, [user]);

  // Filters
  const [search, setSearch] = useState('');
  const [provinceCode, setProvinceCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const fetchCommunities = async () => {
      setIsLoading(true);
      try {
        const query: Record<string, unknown> = { page, limit: 9 };
        if (search) query.search = search;
        if (provinceCode) query.provinceCode = provinceCode;
        if (categoryId) query.categoryId = categoryId;
        
        const res = await communitiesApi.getCommunities(query);
        setCommunities(res.data || []);
        setTotalPages(res.meta?.totalPages || 1);
      } catch (error) {
        console.error("Failed to fetch communities", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    const timer = setTimeout(() => {
      fetchCommunities();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [page, search, provinceCode, categoryId, sortBy]);

  useEffect(() => {
    import('@/features/categories/api').then(m => m.categoriesApi.getCategories().then(res => setCategories(res.data)));
    import('@/features/regions/api').then(m => m.regionsApi.getProvinces().then(setProvinces));
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-in fade-in duration-200">
      
      {/* Header Section (Removed Create Button per request) */}
      <div className="mb-10 space-y-2">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Cộng Đồng Câu Lạc Bộ</h1>
        <p className="text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">
          Tìm kiếm và tham gia giao lưu tại các câu lạc bộ thể thao hàng đầu tại Việt Nam.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs font-semibold text-slate-800 outline-none transition-all h-11" 
            placeholder="Tìm kiếm câu lạc bộ theo tên..." 
            type="text" 
          />
        </div>
        
        <div>
          <select 
            value={provinceCode}
            onChange={(e) => setProvinceCode(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none h-11 cursor-pointer"
          >
            <option value="">Tất cả tỉnh/thành</option>
            {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <select 
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none h-11 cursor-pointer"
          >
            <option value="">Tất cả môn thể thao</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Grid of Community Cards */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-3" />
          <p className="text-xs text-slate-450 font-bold animate-pulse uppercase tracking-wider">Đang tải danh sách câu lạc bộ...</p>
        </div>
      ) : communities.length === 0 ? (
        <div className="bg-white border rounded-2xl p-16 text-center shadow-sm">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-extrabold text-slate-900">Không tìm thấy câu lạc bộ</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Thử thay đổi từ khóa tìm kiếm hoặc lọc theo các tỉnh thành, bộ môn khác.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {communities.map(community => {
            const isOwner = user && (community.creatorId === user.id || community.ownerId === user.id);
            const isJoined = user && myCommunityIds.has(community.id);
            const provinceName = provinces.find(p => p.code === community.provinceCode)?.name || "Việt Nam";
            
            return (
              <div 
                key={community.id} 
                onClick={() => window.location.href = `/communities/${community.id}`}
                className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)] hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between group cursor-pointer"
              >
                {/* Header Banner */}
                <div className="h-40 bg-slate-50 relative overflow-hidden shrink-0">
                  {community.bannerUrl ? (
                    <Image 
                      src={community.bannerUrl.split(',')[0]} 
                      alt="Banner" 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 opacity-90" />
                  )}
                  
                  {/* Join Mode Badge */}
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-0.5 bg-white/95 backdrop-blur-md rounded-full shadow-sm text-slate-800 border border-white/20">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      community.joinMode === 'INVITE_ONLY' ? 'bg-rose-500 animate-pulse' : community.joinMode === 'APPROVAL' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <span className="text-[8px] font-extrabold tracking-wider uppercase text-slate-700">
                      {community.joinMode === 'INVITE_ONLY' ? 'Chỉ mời' : community.joinMode === 'APPROVAL' ? 'Xét duyệt' : 'Tự do'}
                    </span>
                  </div>

                  {/* Floating Location Badge */}
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2.5 py-0.5 bg-white/95 backdrop-blur-md rounded-full shadow-sm text-slate-800 border border-white/20">
                    <MapPin className="w-2.5 h-2.5 text-emerald-500 fill-emerald-500/20" />
                    <span className="text-[8px] font-extrabold tracking-wider uppercase">{provinceName}</span>
                  </div>
                </div>

                {/* Card Info (White Area) */}
                <div className="p-4 pt-3 flex flex-col justify-between flex-grow bg-white">
                  <div className="flex items-start gap-3 relative">
                    {/* Circular Logo - Half overlap */}
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white bg-white shadow-md -mt-8 z-10 shrink-0 relative">
                      <Image 
                        src={community.logoUrl || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop"} 
                        alt={community.name} 
                        fill 
                        className="object-cover" 
                      />
                    </div>

                    {/* Text info next to logo */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1 leading-snug">
                          {community.name}
                        </h4>
                        {community.status === 'APPROVED' && (
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                        )}
                      </div>

                      {/* Stats row directly below title */}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-semibold flex-wrap">
                        <span className="flex items-center gap-0.5">
                          <Users className="w-3 h-3 text-slate-400" />
                          {community._count?.members || 0} thành viên
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Trophy className="w-3 h-3 text-slate-400" />
                          {community._count?.tournaments || 0} giải đấu
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Categories Row */}
                  <div className="flex flex-wrap gap-1 mt-3.5 mb-2 min-h-[18px]">
                    {community.categories && community.categories.length > 0 ? (
                      community.categories.slice(0, 2).map(cat => {
                        const styles = getCategoryStyles(cat.name);
                        return (
                          <span key={cat.id} className={`inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full border text-[8px] font-extrabold uppercase tracking-wider ${styles.bg}`}>
                            {(() => {
                              const logo = getSportLogo(cat.name);
                              return logo ? (
                                <img src={logo} alt={cat.name} className="w-2.5 h-2.5 object-contain" />
                              ) : (
                                <span className={`w-1 h-1 rounded-full ${styles.dot}`} />
                              );
                            })()}
                            {cat.name}
                          </span>
                        );
                      })
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full border border-slate-100 bg-slate-50 text-slate-500 text-[8px] font-extrabold uppercase tracking-wider">
                        <span className="w-1 h-1 rounded-full bg-slate-400" />
                        Giao hữu
                      </span>
                    )}
                  </div>

                  {/* Card Button */}
                  <div className="pt-2.5 border-t border-slate-100 mt-2">
                    {isOwner ? (
                      <div 
                        className="w-full text-[10px] font-black bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl transition-all flex items-center justify-center gap-1 h-8 shadow-sm"
                      >
                        Quản lý CLB <ArrowRight className="w-3 h-3" />
                      </div>
                    ) : isJoined ? (
                      <div 
                        className="w-full text-[10px] font-black border border-emerald-600/20 bg-emerald-50 text-emerald-700 py-2 rounded-xl transition-all flex items-center justify-center h-8"
                      >
                        Đã tham gia
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!user) {
                            toast.error('Vui lòng đăng nhập để tham gia câu lạc bộ.');
                            window.location.href = '/login';
                            return;
                          }
                          setSelectedCommunity(community);
                        }}
                        className="w-full text-[10px] font-black bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl transition-all h-8 flex items-center justify-center gap-1 shadow-sm active:scale-[0.98]"
                      >
                        {community.joinMode === 'APPROVAL' ? 'Xin gia nhập' : 'Tham gia ngay'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedCommunity && (
        <JoinCommunityModal 
          community={selectedCommunity} 
          isOpen={true} 
          onClose={() => setSelectedCommunity(null)} 
          onSuccess={() => {
            setSelectedCommunity(null);
            fetchMyCommunities();
            setPage(1);
          }} 
        />
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-center items-center mt-12 gap-2">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          
          <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-600 text-white text-xs font-black">
            {page}
          </button>

          <button 
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}
