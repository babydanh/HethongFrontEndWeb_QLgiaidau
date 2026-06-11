"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { communitiesApi, Community } from "@/features/communities/api";
import { JoinCommunityModal } from "@/components/shared/JoinCommunityModal";
import { useAuthStore } from "@/lib/zustand/authStore";
import toast from "react-hot-toast";

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
        const list = res.data || res || [];
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
        const query: Record<string, unknown> = { page, limit: 10 };
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
    
    // Add simple debounce for search
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Câu lạc bộ</h1>
          <p className="text-slate-500">Khám phá và tham gia các câu lạc bộ thể thao tại Việt Nam.</p>
        </div>
        <button
          onClick={() => window.location.href = '/communities/create'}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap"
        >
          + Tạo câu lạc bộ
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-900 outline-none transition-all" 
            placeholder="Tìm kiếm câu lạc bộ..." 
            type="text" 
          />
        </div>
        <div className="flex gap-4 md:w-auto w-full">
          <select 
            value={provinceCode}
            onChange={(e) => setProvinceCode(e.target.value)}
            className="w-full md:w-48 px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none"
          >
            <option value="">Tất cả tỉnh/thành</option>
            {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
          <select 
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full md:w-48 px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none"
          >
            <option value="">Tất cả môn thể thao</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Community List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Đang tải dữ liệu...</div>
        ) : communities.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Chưa có câu lạc bộ nào.</div>
        ) : (
          communities.map(community => (
            <div key={community.id} className="p-6 border-b border-slate-100 hover:bg-slate-50 transition-colors flex flex-col md:flex-row items-start md:items-center gap-4">
              <div 
                className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-slate-200 relative cursor-pointer"
                onClick={() => window.location.href = `/communities/${community.id}`}
              >
                <Image src={community.logoUrl || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop"} alt={community.name} fill className="object-cover" />
              </div>
              <div className="flex-grow">
                <div 
                  className="flex items-center gap-2 mb-1 cursor-pointer hover:underline"
                  onClick={() => window.location.href = `/communities/${community.id}`}
                >
                  <h3 className="text-xl font-bold text-slate-900">{community.name}</h3>
                  {community.status === 'APPROVED' && <span className="material-symbols-outlined text-emerald-500 text-sm" style={{ fontVariationSettings: "'FILL' 1", fontSize: "16px" }}>verified</span>}
                </div>
                <p className="text-sm text-slate-500 mb-2 line-clamp-1">{community.description || "Chưa có mô tả."}</p>
                <div className="flex flex-wrap items-center gap-3">
                  {community.categories?.map(cat => (
                    <span key={cat.id} className="inline-flex items-center px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                      {cat.name}
                    </span>
                  ))}
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>group</span> {community._count?.members || 0} thành viên
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>emoji_events</span> {community._count?.tournaments || 0} giải đấu
                  </span>
                </div>
              </div>
              <div className="mt-4 md:mt-0 md:ml-4 shrink-0 w-full md:w-auto">
                {user && (community.creatorId === user.id || community.ownerId === user.id) ? (
                  <button 
                    onClick={() => window.location.href = `/communities/${community.id}`}
                    className="w-full md:w-auto text-sm font-medium border border-slate-200 bg-slate-50 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    Quản lý
                  </button>
                ) : user && myCommunityIds.has(community.id) ? (
                  <button 
                    onClick={() => window.location.href = `/communities/${community.id}`}
                    className="w-full md:w-auto text-sm font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 px-6 py-2 rounded-lg hover:bg-emerald-100/50 transition-all flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px' }}>check</span> Đã tham gia
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      if (!user) {
                        toast.error('Vui lòng đăng nhập để tham gia câu lạc bộ.');
                        window.location.href = '/login';
                        return;
                      }
                      setSelectedCommunity(community);
                    }}
                    className="w-full md:w-auto text-sm font-medium border border-emerald-600 bg-emerald-50 text-emerald-700 px-6 py-2 rounded-lg hover:bg-emerald-100 transition-all"
                  >
                    {community.joinMode === 'APPROVAL' ? 'Xin tham gia' : 'Tham gia'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedCommunity && (
        <JoinCommunityModal 
          community={selectedCommunity} 
          isOpen={true} 
          onClose={() => setSelectedCommunity(null)} 
          onSuccess={() => {
            setSelectedCommunity(null);
            fetchMyCommunities();
            // Refresh list
            setPage(1);
          }} 
        />
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-center items-center mt-8 gap-2">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          
          <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-medium">
            {page}
          </button>

          <button 
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}
