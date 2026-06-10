'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronDown, SlidersHorizontal, Bookmark, MapPin, Calendar, CircleDollarSign, ChevronLeft, ChevronRight, Trophy, Activity, Target } from 'lucide-react';
import Link from 'next/link';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';
import { categoriesApi, Category } from '@/features/categories/api';
import { regionsApi, Region } from '@/features/regions/api';
import { formatDate, formatCurrency } from '@/utils/format';

export default function TournamentsListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoriesApi.getCategories();
        if (res && res.data) {
          setCategories(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
    };
    
    const fetchRegions = async () => {
      try {
        const res = await regionsApi.getProvinces();
        if (res) {
          setRegions(res);
        }
      } catch (error) {
        console.error("Failed to fetch regions", error);
      }
    };

    fetchCategories();
    fetchRegions();
  }, []);

  useEffect(() => {
    const fetchTournaments = async () => {
      setIsLoading(true);
      try {
        const res = await tournamentsApi.getTournaments({ 
          page, 
          limit: 9, 
          search: searchTerm || undefined,
          categoryId: selectedCategoryId || undefined,
          status: selectedStatus || undefined,
          region: selectedRegion || undefined,
          tournamentType: 'PUBLIC'
        });
        setTournaments(res.data);
        setTotalPages(res.meta.totalPages);
      } catch (error) {
        console.error("Failed to fetch tournaments", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTournaments();
  }, [page, searchTerm, selectedCategoryId, selectedStatus, selectedRegion]);

  const handleSearch = () => {
    setPage(1); // Reset to page 1 on new search
  };

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
      
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Khám phá Giải đấu</h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Tìm kiếm và tham gia các giải đấu thể thao phù hợp với trình độ của bạn.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-8">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-grow min-w-[200px]">
            <label className="block text-sm font-medium text-slate-500 mb-1">Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-slate-50 text-slate-900"
                placeholder="Tên giải đấu, địa điểm..."
              />
            </div>
          </div>
          
          <div className="w-full md:w-auto min-w-[150px]">
            <label className="block text-sm font-medium text-slate-500 mb-1">Môn thể thao</label>
            <div className="relative">
              <select 
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-base appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-900 font-medium"
              >
                <option value="">Tất cả</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
            </div>
          </div>

          <div className="w-full md:w-auto min-w-[150px]">
            <label className="block text-sm font-medium text-slate-500 mb-1">Trạng thái</label>
            <div className="relative">
              <select 
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-base appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-900 font-medium"
              >
                <option value="">Tất cả</option>
                <option value="UPCOMING">Sắp diễn ra</option>
                <option value="ONGOING">Đang diễn ra</option>
                <option value="COMPLETED">Đã kết thúc</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
            </div>
          </div>

          <div className="w-full md:w-auto min-w-[150px]">
            <label className="block text-sm font-medium text-slate-500 mb-1">Khu vực</label>
            <div className="relative">
              <select 
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-base appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-900 font-medium"
              >
                <option value="">Tất cả</option>
                {regions.map(reg => (
                  <option key={reg.code} value={reg.name.replace(/^(Thành phố|Tỉnh)\s+/i, '')}>{reg.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
            </div>
          </div>

          <div className="w-full md:w-auto min-w-[150px]">
            <label className="block text-sm font-medium text-slate-500 mb-1">Sắp xếp</label>
            <div className="relative">
              <select className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-base appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 text-slate-900 font-medium">
                <option>Mới nhất</option>
                <option>Gần tôi</option>
                <option>Giải thưởng cao</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
            </div>
          </div>

          <button 
            onClick={handleSearch}
            className="w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-2 h-[42px]"
          >
            <SlidersHorizontal className="w-5 h-5" />
            Lọc thêm
          </button>
        </div>
      </div>

      {/* Grid Cards */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64 text-slate-500">Đang tải danh sách giải đấu...</div>
      ) : tournaments.length === 0 ? (
        <div className="flex justify-center items-center h-64 text-slate-500">Không tìm thấy giải đấu nào.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {tournaments.map(tournament => (
            <div key={tournament.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group">
              <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                {tournament.bannerUrl ? (
                  <img 
                    src={tournament.bannerUrl} 
                    alt={tournament.name} 
                    className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${tournament.status === 'COMPLETED' ? 'grayscale opacity-60' : ''}`}
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-700 opacity-90 group-hover:scale-105 transition-transform duration-500`}></div>
                )}
                <div className="absolute inset-0 bg-slate-950/15"></div>
                
                {(tournament.status === 'UPCOMING' || tournament.status === 'REGISTRATION_OPEN') && (
                  <div className="absolute top-3 left-3 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                    Mở đăng ký
                  </div>
                )}
                {tournament.status === 'REGISTRATION_CLOSED' && (
                  <div className="absolute top-3 left-3 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold shadow-sm border border-amber-200">
                    Đóng đăng ký
                  </div>
                )}
                {tournament.status === 'COMPLETED' && (
                  <div className="absolute top-3 left-3 bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold shadow-sm border border-slate-300">
                    Đã kết thúc
                  </div>
                )}
                {(tournament.status === 'ONGOING' || tournament.status === 'IN_PROGRESS') && (
                  <div className="absolute top-3 left-3 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold shadow-sm border border-blue-200 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                    Đang diễn ra
                  </div>
                )}

                <button className="absolute top-3 right-3 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-slate-500 hover:text-blue-600 transition-colors shadow-sm z-10">
                  <Bookmark className="w-5 h-5" />
                </button>

                <div className="absolute bottom-3 right-3 flex flex-wrap gap-1.5 z-10">
                  {tournament.genderRestriction && (
                    <span className="bg-slate-900/70 backdrop-blur-sm text-amber-300 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-amber-500/20 shadow-sm">
                      {tournament.genderRestriction === 'MALE' ? 'Chỉ Nam' :
                       tournament.genderRestriction === 'FEMALE' ? 'Chỉ Nữ' : 'Nam & Nữ'}
                    </span>
                  )}
                  <span className="bg-slate-900/70 backdrop-blur-sm text-blue-300 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-blue-500/20 shadow-sm">
                    {tournament.matchType === 'SINGLES' ? 'Đấu Đơn' :
                     tournament.matchType === 'DOUBLES' ? 'Đấu Đôi' : 'Đôi Nam-Nữ'}
                  </span>
                </div>
              </div>
              <div className={`p-6 flex flex-col flex-grow ${tournament.status === 'COMPLETED' ? 'opacity-80' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-bold text-slate-900 line-clamp-2 leading-tight">{tournament.name}</h3>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  {tournament.category && (
                    <span className="bg-slate-100 px-2 py-1 rounded-md text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" /> {tournament.category.name}
                    </span>
                  )}
                </div>
                <div className="space-y-2 mb-6 flex-grow">
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{tournament.locationAddress || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{tournament.startDate ? formatDate(tournament.startDate) : 'Đang cập nhật'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                    <CircleDollarSign className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-blue-600">
                      {tournament.entryFee ? formatCurrency(tournament.entryFee) : 'Miễn phí'}
                    </span>
                  </div>
                </div>
                <div className={`mb-6 ${tournament.status === 'COMPLETED' ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-slate-500">Số đội tham gia</span>
                    <span className="text-slate-900 font-bold">{tournament._count?.participants || 0}/{tournament.maxParticipants || '-'}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: tournament.maxParticipants ? `${Math.min(100, ((tournament._count?.participants || 0) / tournament.maxParticipants) * 100)}%` : '0%' }}></div>
                  </div>
                </div>
                <Link href={`/tournaments/${tournament.id}`}>
                  <button className="w-full bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-900 font-semibold text-sm py-2.5 rounded-lg transition-colors shadow-sm">
                    {tournament.status === 'COMPLETED' ? 'Xem kết quả' : 'Xem chi tiết'}
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {[...Array(totalPages)].map((_, i) => (
            <button 
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`w-10 h-10 border rounded-lg font-semibold text-sm transition-colors ${
                page === i + 1 
                  ? 'border-blue-600 bg-blue-600 text-white' 
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

    </div>
  );
}
