'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Award, Trophy, ChevronDown, Loader2, Medal, Crown, Search } from 'lucide-react';
import { Category } from '@/types/category';
import { rankingsApi, PlayerRanking } from '@/features/rankings/api';
import { EloTierBadge } from '@/components/ui/EloTierBadge';
import { getEloMatchTypeLabel } from '@/features/rankings/elo-display';
import MiniClubRanking from './MiniClubRanking';
import toast from 'react-hot-toast';

interface RankingsTabProps {
  communityId: string;
  categories: Category[];
}

type MatchType = 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';

export default function RankingsTab({ communityId, categories }: RankingsTabProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || ''
  );
  const [selectedMatchType, setSelectedMatchType] = useState<MatchType>('SINGLES');
  const [selectedGender, setSelectedGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRankings = useCallback(async () => {
    if (!selectedCategoryId) return;
    try {
      const res = await rankingsApi.getRankings({
        scope: 'COMMUNITY',
        communityId,
        categoryId: selectedCategoryId,
        matchType: selectedMatchType,
        genderRestriction: selectedGender,
        limit: 10,
      });
      if (res.data) {
        setRankings(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch community rankings:', err);
    }
  }, [communityId, selectedCategoryId, selectedMatchType, selectedGender]);

  useEffect(() => {
    fetchRankings();
    // Polling mỗi 30s
    pollingRef.current = setInterval(fetchRankings, 30000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchRankings]);

  // Loading chỉ hiện lần đầu
  useEffect(() => {
    if (!selectedCategoryId) return;
    const load = async () => {
      setIsLoading(true);
      await fetchRankings();
      setIsLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matchTypes: MatchType[] = ['SINGLES', 'DOUBLES', 'MIXED_DOUBLES'];

  const filtered = searchQuery.trim()
    ? rankings.filter(p =>
        p.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : rankings;

  const topThree = filtered.slice(0, 3);
  const restRankings = filtered.slice(3, 10);

  const podiumOrder: (PlayerRanking | null)[] = [null, null, null];
  if (topThree[1]) podiumOrder[0] = topThree[1];
  if (topThree[0]) podiumOrder[1] = topThree[0];
  if (topThree[2]) podiumOrder[2] = topThree[2];

  const activeCategory = categories.find((c) => c.id === selectedCategoryId);

  const podiumTiers = [
    { color: 'text-amber-400', bg: 'bg-amber-50', border: 'border-amber-300', label: '🥇' },
    { color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-300', label: '🥈' },
    { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-300', label: '🥉' },
  ];

  const getWinRate = (p: PlayerRanking) =>
    p.matchesPlayed > 0 ? Math.round((p.matchesWon / p.matchesPlayed) * 100) : 0;

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
        <Award className="w-16 h-16 text-slate-350 mx-auto mb-4" />
        <p className="text-slate-700 font-bold text-lg">Chưa thiết lập bộ môn</p>
        <p className="text-slate-500 mt-1 max-w-sm mx-auto text-xs leading-relaxed">
          Câu lạc bộ này hiện chưa đăng ký bất kỳ môn thể thao nào để tính điểm ELO.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mini Preview — top 3 nổi bật */}
      <MiniClubRanking
        communityId={communityId}
        categories={categories}
      />

      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Bảng xếp hạng ELO
          </h3>
          <p className="text-xs text-slate-450 mt-0.5">
            Top 10 thành viên xuất sắc nhất •{' '}
            {activeCategory?.name || ''} {getEloMatchTypeLabel(selectedMatchType)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {categories.length > 1 && (
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCategoryId === cat.id
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Gender toggle */}
          {selectedMatchType !== 'MIXED_DOUBLES' && (
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
              {(['MALE', 'FEMALE'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGender(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedGender === g
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {g === 'MALE' ? 'Nam' : 'Nữ'}
                </button>
              ))}
            </div>
          )}

          {/* Match type dropdown */}
          <div className="relative">
            <select
              value={selectedMatchType}
              onChange={(e) => {
                const mt = e.target.value as MatchType;
                setSelectedMatchType(mt);
                if (mt === 'MIXED_DOUBLES') setSelectedGender('MALE');
              }}
              className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {matchTypes.map((mt) => (
                <option key={mt} value={mt}>
                  {getEloMatchTypeLabel(mt)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Tìm thành viên..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center bg-white rounded-lg border border-slate-200/80 shadow-sm">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
          <p className="text-sm text-slate-450 font-bold animate-pulse">Đang tải dữ liệu xếp hạng...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-16 text-center">
            <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-800 font-bold text-lg">
              {searchQuery ? 'Không tìm thấy thành viên' : 'Chưa có dữ liệu xếp hạng'}
            </p>
            <p className="text-slate-450 mt-2 max-w-sm mx-auto text-xs leading-relaxed font-semibold">
              {searchQuery
                ? 'Thử tìm kiếm với tên khác.'
                : 'Hệ thống điểm ELO sẽ tự động kích hoạt khi các thành viên tham gia thi đấu.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ─── Compact Podium ─── */}
          {topThree.length > 0 && (
            <div className="flex items-end justify-center gap-3 sm:gap-4 px-2 pt-4">
              {[0, 1, 2].map((i) => {
                const p = podiumOrder[i];
                if (!p) return <div key={i} className="flex-1 max-w-[140px] h-32 border border-dashed rounded-lg bg-slate-50/50" />;

                const mc = podiumTiers[i];
                const rankLabel = ['II', 'I', 'III'][i];
                const isCenter = i === 1;

                return (
                  <div key={p.id} className={`flex-1 max-w-[140px] flex flex-col items-center ${isCenter ? '-translate-y-3 flex-[1.2] max-w-[170px]' : ''}`}>
                    <div className="flex flex-col items-center mb-2">
                      {isCenter && (
                        <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-xs -mb-2 z-10 shadow-md border-2 border-white">
                          <Crown className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className={`w-11 h-11 rounded-full overflow-hidden ${mc.bg} border-2 ${mc.border} relative ${isCenter ? 'w-14 h-14 border-[3px] shadow-md' : ''}`}>
                        {p.user?.avatarUrl ? (
                          <img src={p.user.avatarUrl} alt={p.user.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <span className={`w-full h-full flex items-center justify-center font-bold ${mc.color} ${isCenter ? 'text-sm' : 'text-xs'}`}>
                            {p.user?.fullName?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>
                      <p className={`${isCenter ? 'text-sm' : 'text-[11px]'} font-bold text-slate-700 mt-1.5 truncate max-w-full text-center leading-tight`}>
                        {p.user?.fullName || '---'}
                      </p>
                      <span className={`${isCenter ? 'text-sm' : 'text-xs'} font-bold ${mc.color}`}>
                        {p.eloPoints} ELO
                      </span>
                      <EloTierBadge elo={p.eloPoints} tierName={p.tier?.name} size="sm" className="mt-1 scale-[0.85] origin-center" />
                    </div>
                    <div className={`w-full ${mc.bg} rounded-t-lg border ${mc.border} flex items-center justify-center ${isCenter ? 'h-28 bg-gradient-to-t from-amber-50 to-amber-100/70 border-2 shadow-sm' : 'h-24'}`}>
                      <span className={`text-2xl font-black ${mc.color}/60 ${isCenter ? 'text-3xl text-amber-400/70' : ''}`}>{rankLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── Ranks 4-10 List ─── */}
          {restRankings.length > 0 && (
            <div className="space-y-1.5 mt-4">
              {restRankings.map((player, index) => {
                const rank = index + 4;
                const winRate = getWinRate(player);
                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 bg-white rounded-lg border border-slate-200/80 px-4 py-2.5 hover:bg-slate-50/50 transition-colors shadow-sm"
                  >
                    <span className="w-6 text-center text-xs font-bold text-slate-400">#{rank}</span>
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                      {player.user?.avatarUrl ? (
                        <img src={player.user.avatarUrl} alt={player.user.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center font-bold text-slate-400 bg-slate-100 text-[10px]">
                          {player.user?.fullName?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 truncate">{player.user?.fullName || 'VĐV'}</span>
                      <EloTierBadge elo={player.eloPoints} tierName={player.tier?.name} size="sm" className="shrink-0 scale-[0.85] origin-left" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 w-10 text-right shrink-0">{winRate}%</span>
                    <span className="text-xs font-bold text-blue-600 w-16 text-right shrink-0">{player.eloPoints}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Polling indicator */}
      <p className="text-[10px] text-slate-400 text-center italic">Tự động cập nhật mỗi 30 giây</p>
    </div>
  );
}
