'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronDown, SlidersHorizontal, Bookmark, MapPin, Calendar, CircleDollarSign, ChevronLeft, ChevronRight, Trophy, Activity, Target } from 'lucide-react';
import Link from 'next/link';
import { tournamentsApi, Tournament } from '@/features/tournaments/api';
import { categoriesApi, Category } from '@/features/categories/api';
import { regionsApi, Region } from '@/features/regions/api';
import { formatDate, formatCurrency } from '@/utils/format';
import { getSportLogo } from '@/constants/sports';
import TournamentHeroBanner from '@/components/ui/TournamentHeroBanner';
import LiveMatchesWidget from '@/components/ui/LiveMatchesWidget';

export default function TournamentsListPage() {
  const getFormatLabel = (matchType?: string, genderRestriction?: string | null) => {
    const mt = matchType || '';
    const gr = genderRestriction || '';
    if (mt === 'SINGLES') {
      return gr === 'FEMALE' ? 'Đơn Nữ' : 'Đơn Nam';
    }
    if (mt === 'DOUBLES') {
      return gr === 'FEMALE' ? 'Đôi Nữ' : 'Đôi Nam';
    }
    if (mt === 'MIXED_DOUBLES' || mt === 'MIXED' || gr === 'MIXED') {
      return 'Đôi Nam Nữ';
    }
    return mt === 'DOUBLES' ? 'Đôi' : mt === 'SINGLES' ? 'Đơn' : 'Đôi Nam Nữ';
  };

  const getParsedDates = (startStr?: string, endStr?: string) => {
    if (!startStr) return { startDay: '--', endDay: '--', startMonth: '--', endMonth: '--' };
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : start;
    
    const startDay = start.getDate().toString().padStart(2, '0');
    const endDay = end.getDate().toString().padStart(2, '0');
    const startMonth = (start.getMonth() + 1).toString().padStart(2, '0');
    const endMonth = (end.getMonth() + 1).toString().padStart(2, '0');
    
    return { startDay, endDay, startMonth, endMonth };
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [featuredTournaments, setFeaturedTournaments] = useState<Tournament[]>([]);
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

    const fetchFeatured = async () => {
      try {
        const res = await tournamentsApi.getTournaments({
          page: 1,
          limit: 5,
          status: 'REGISTRATION_OPEN',
          tournamentType: 'PUBLIC'
        });
        if (res && res.data) {
          setFeaturedTournaments(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch featured tournaments", error);
      }
    };

    fetchCategories();
    fetchRegions();
    fetchFeatured();
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
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1 leading-tight tracking-tight">Khám phá Giải đấu</h1>
        <p className="text-sm text-slate-500 max-w-2xl font-medium">
          Tìm kiếm và tham gia các giải đấu thể thao chuyên nghiệp và phong trào phù hợp với trình độ của bạn.
        </p>
      </div>

      {/* Featured Hero Banner Carousel */}
      <TournamentHeroBanner tournaments={featuredTournaments} />



      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-grow min-w-[200px]">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900 font-semibold"
                placeholder="Tên giải đấu, địa điểm..."
              />
            </div>
          </div>
          
          <div className="w-full md:w-auto min-w-[150px]">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Môn thể thao</label>
            <div className="relative">
              <select 
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900 font-bold"
              >
                <option value="">Tất cả</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 w-4.5 h-4.5 pointer-events-none" />
            </div>
          </div>

          <div className="w-full md:w-auto min-w-[150px]">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trạng thái</label>
            <div className="relative">
              <select 
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900 font-bold"
              >
                <option value="">Tất cả</option>
                <option value="UPCOMING">Sắp diễn ra</option>
                <option value="ONGOING">Đang diễn ra</option>
                <option value="COMPLETED">Đã kết thúc</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 w-4.5 h-4.5 pointer-events-none" />
            </div>
          </div>

          <div className="w-full md:w-auto min-w-[150px]">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Khu vực</label>
            <div className="relative">
              <select 
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900 font-bold"
              >
                <option value="">Tất cả</option>
                {regions.map(reg => (
                  <option key={reg.code} value={reg.name.replace(/^(Thành phố|Tỉnh)\s+/i, '')}>{reg.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 w-4.5 h-4.5 pointer-events-none" />
            </div>
          </div>

          <button 
            onClick={handleSearch}
            className="w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2.5 rounded-xl text-xs font-extrabold border border-slate-200 transition-colors flex items-center justify-center gap-2 h-[42px] cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Lọc thêm
          </button>
        </div>
      </div>

      {/* Grid Cards */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64 text-slate-500 font-medium">Đang tải danh sách giải đấu...</div>
      ) : tournaments.length === 0 ? (
        <div className="flex justify-center items-center h-64 text-slate-500 font-medium">Không tìm thấy giải đấu nào.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {tournaments.map(tournament => {
            const { startDay, endDay, startMonth, endMonth } = getParsedDates(tournament.startDate, tournament.endDate);
            const city = tournament.locationAddress ? tournament.locationAddress.split(',').slice(-1)[0]?.trim() || 'Việt Nam' : 'Chưa cập nhật';
            
            return (
              <Link 
                key={tournament.id} 
                href={`/tournaments/${tournament.id}`}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer"
              >
                {/* Top: Large Image Banner */}
                <div className="relative aspect-[2.1/1] w-full bg-slate-100 overflow-hidden">
                  {tournament.bannerUrl ? (
                    <img 
                      src={tournament.bannerUrl} 
                      alt={tournament.name} 
                      className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-103 ${tournament.status === 'COMPLETED' ? 'grayscale opacity-60' : ''}`}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-650 to-blue-800 opacity-90 group-hover:scale-103 transition-transform duration-500 flex items-center justify-center">
                      <img 
                        src="/images/vndc_sport.png" 
                        alt="VNDC Sport Logo" 
                        className="w-24 h-auto object-contain opacity-75"
                      />
                    </div>
                  )}
                  
                  {/* Status Overlay (Top-Left) */}
                  <div className="absolute top-3 left-3 z-10">
                    {tournament.status === 'REGISTRATION_OPEN' && (
                      <span className="bg-black/75 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Mở đăng ký
                      </span>
                    )}
                    {tournament.status === 'REGISTRATION_CLOSED' && (
                      <span className="bg-black/75 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        Đóng đăng ký
                      </span>
                    )}
                    {tournament.status === 'COMPLETED' && (
                      <span className="bg-black/75 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                        Đã kết thúc
                      </span>
                    )}
                    {(tournament.status === 'ONGOING' || tournament.status === 'IN_PROGRESS') && (
                      <span className="bg-black/75 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        Đang thi đấu
                      </span>
                    )}
                  </div>

                  {/* Bookmark Button (Top-Right) */}
                  <button className="absolute top-3 right-3 p-1.5 bg-white/90 rounded-full text-slate-650 hover:text-indigo-650 transition-colors shadow-sm z-10 cursor-pointer">
                    <Bookmark className="w-4 h-4" />
                  </button>

                  {/* Location Overlay (Bottom-Left) */}
                  <div className="absolute bottom-3 left-3 z-10">
                    <span className="bg-white/95 text-slate-800 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border border-slate-200 flex items-center gap-1">
                      📍 {city}
                    </span>
                  </div>
                </div>

                {/* Bottom: Details Section */}
                <div className="p-5 flex gap-5 flex-grow">
                  {/* Left Column: Date Block */}
                  <div className="flex flex-col items-center shrink-0 border-r border-slate-100 pr-5">
                    <div className="flex items-baseline gap-1 text-2xl font-black text-slate-900 leading-none">
                      <span>{startDay}</span>
                      <span className="text-slate-300 font-normal text-lg">-</span>
                      <span>{endDay}</span>
                    </div>
                    <div className="flex gap-4 mt-1 text-[10px] font-black text-slate-400">
                      <span>{startMonth}</span>
                      <span>{endMonth}</span>
                    </div>
                  </div>

                  {/* Right Column: Name & Category Block */}
                  <div className="flex flex-col justify-between flex-grow min-w-0">
                    <div>
                      {/* Organizer / Category Header */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
                        {(() => {
                          const logo = getSportLogo(tournament.category?.name);
                          return logo ? (
                            <img src={logo} alt={tournament.category?.name || ''} className="w-4 h-4 object-contain" />
                          ) : (
                            <span className="w-4.5 h-4.5 bg-rose-600 rounded-full flex items-center justify-center text-[9px] text-white font-black">★</span>
                          );
                        })()}
                        <span className="text-slate-500">{tournament.category?.name || 'MULTISPORT'}</span>
                        
                        <span className="text-slate-350 text-slate-300">•</span>
                        
                        {/* Ranked or Unranked Badge */}
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                          tournament.isRanked
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}>
                          {tournament.isRanked ? 'Xếp hạng ELO' : 'Phong trào'}
                        </span>

                        {/* Series / Parent Badge */}
                        {tournament.parentId && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[8px] font-extrabold border border-blue-200">
                              Chuỗi giải đấu
                            </span>
                          </>
                        )}
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-sm md:text-base font-black text-slate-900 uppercase leading-snug line-clamp-2">
                        {tournament.name}
                      </h3>
                    </div>

                    {/* Metadata summary */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[10px] text-slate-500 font-bold mt-2.5 uppercase tracking-wider">
                      <span className="text-emerald-600 font-extrabold">
                        {tournament.entryFee ? formatCurrency(tournament.entryFee) : 'Miễn phí'}
                      </span>
                      {tournament.divisions && tournament.divisions.length > 0 ? (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-400 font-medium">Hình thức:</span>
                          <div className="flex flex-wrap gap-1">
                            {tournament.divisions.map((div) => {
                              const label = getFormatLabel(div.matchType, div.genderRestriction);
                              return (
                                <span key={div.id} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-650 text-[9px] border border-slate-200 font-bold">
                                  {label} ({div._count?.participants || 0}/{div.maxParticipants || '-'})
                                </span>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-300">•</span>
                          <span>
                            Đã ĐK: {tournament._count?.participants || 0}/{tournament.maxParticipants || '-'} Đội
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-650 text-[9px] border border-slate-200 font-bold">
                            {getFormatLabel(tournament.matchType, tournament.genderRestriction)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {[...Array(totalPages)].map((_, i) => (
            <button 
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`w-10 h-10 border rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                page === i + 1 
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/15' 
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

    </div>
  );
}
