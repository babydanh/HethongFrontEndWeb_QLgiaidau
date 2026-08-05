'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Award, Trophy, ChevronDown, Loader2, Medal, Crown, Search, SlidersHorizontal, X } from 'lucide-react';
import { Category } from '@/types/category';
import { rankingsApi, PlayerRanking } from '@/features/rankings/api';
import { communitiesApi } from '@/features/communities/api';
import { EloTierBadge } from '@/components/ui/EloTierBadge';
import { getRankRingClass } from '@/components/ui/RankAvatar';
import { getEloMatchTypeLabel } from '@/features/rankings/elo-display';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/zustand/authStore';

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
  const [myRanking, setMyRanking] = useState<PlayerRanking | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { user } = useAuthStore();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = user?.id;

  const fetchRankings = useCallback(async () => {
    if (!selectedCategoryId) return;
    try {
      const res = await rankingsApi.getRankings({
        scope: 'COMMUNITY',
        communityId,
        categoryId: selectedCategoryId,
        matchType: selectedMatchType,
        genderRestriction: selectedGender,
        limit: 20,
      });
      let nextRankings = res.data || [];
      if (nextRankings.length === 0 && selectedMatchType === 'SINGLES') {
        const membersResponse = await communitiesApi.getMembers(communityId);
        const members = membersResponse.data || [];
        nextRankings = members
          .filter((member) => member.member.status === 'JOINED')
          .map((member, index): PlayerRanking => ({
            id: `community-member-${member.member.id}`,
            userId: member.user.id,
            categoryId: selectedCategoryId,
            categoryName: undefined,
            matchType: selectedMatchType,
            genderRestriction: selectedGender,
            eloPoints: 1000,
            matchesPlayed: 0,
            matchesWon: 0,
            winStreak: 0,
            updatedAt: member.member.joinedAt,
            tierName: 'Chưa xếp hạng',
            communityId,
            user: {
              id: member.user.id,
              fullName: member.user.fullName,
              avatarUrl: member.user.avatarUrl,
            },
          }));
      }
      setRankings(nextRankings);
      if (userId) {
        const userRes = await rankingsApi.getUserRankings(userId);
        const own = userRes.communityRanks?.find((rank) =>
          rank.communityId === communityId &&
          rank.categoryId === selectedCategoryId &&
          rank.matchType === selectedMatchType &&
          (selectedMatchType === 'MIXED_DOUBLES' || rank.genderRestriction === selectedGender),
        );
        setMyRanking(own || null);
      } else {
        setMyRanking(null);
      }
    } catch (err) {
      console.error('Failed to fetch community rankings:', err);
    }
  }, [communityId, selectedCategoryId, selectedMatchType, selectedGender, userId]);

  useEffect(() => {
    let isMounted = true;
    if (!selectedCategoryId) return;

    const loadData = async () => {
      setIsLoading(true);
      await fetchRankings();
      if (isMounted) {
        setIsLoading(false);
      }
    };

    loadData();

    pollingRef.current = setInterval(() => {
      if (isMounted) {
        fetchRankings();
      }
    }, 30000);

    return () => {
      isMounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedCategoryId, fetchRankings]);

  const matchTypes: MatchType[] = ['SINGLES', 'DOUBLES', 'MIXED_DOUBLES'];

  const filtered = searchQuery.trim()
    ? rankings.filter(p => {
        const query = searchQuery.toLowerCase();
        return p.user?.fullName?.toLowerCase().includes(query) ||
          p.user1?.fullName?.toLowerCase().includes(query) ||
          p.user2?.fullName?.toLowerCase().includes(query);
      })
    : rankings;

  const isSearching = searchQuery.trim().length > 0;
  const topThree = isSearching ? [] : filtered.slice(0, 3);
  const restRankings = isSearching ? filtered : filtered.slice(3, 20);

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

  const rankingName = (p: PlayerRanking) =>
    p.user1 && p.user2
      ? `${p.user1.fullName} / ${p.user2.fullName}`
      : p.user?.fullName || '---';

  const rankingAvatars = (p: PlayerRanking, sizeClass: string) => {
    const members = p.user1 && p.user2 ? [p.user1, p.user2] : p.user ? [p.user] : [];
    const ringClass = getRankRingClass(p.eloPoints, p.tier?.name || p.tierName, p.matchesPlayed);
    return (
      <div className={`flex items-center shrink-0 rounded-full ring-2 ${ringClass}`}>
        {members.map((member, index) => (
          <div
            key={member.id}
            className={`${sizeClass} rounded-full overflow-hidden bg-slate-100 border-2 border-white relative flex items-center justify-center ${index > 0 ? '-ml-2' : ''}`}
          >
            {member.avatarUrl ? (
              <img src={member.avatarUrl} alt={member.fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-slate-500">
                {member.fullName?.charAt(0) || '?'}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Bảng xếp hạng ELO
          </h3>
          <p className="text-xs text-slate-450 mt-0.5">
            Top 20 thành viên xuất sắc nhất •{' '}
            {activeCategory?.name || ''} {getEloMatchTypeLabel(selectedMatchType)}
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex w-full items-center gap-2.5">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm thành viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => setIsFilterOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700 hover:bg-slate-50 transition-all cursor-pointer shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4 text-blue-600" />
          <span>Bộ lọc</span>
        </button>
      </div>

      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 p-0 sm:items-center sm:p-4" onMouseDown={() => setIsFilterOpen(false)}>
          <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between"><div><h4 className="text-base font-black text-slate-900">Bộ lọc xếp hạng</h4><p className="mt-0.5 text-xs text-slate-500">Chọn môn, giới tính và thể thức</p></div><button type="button" onClick={() => setIsFilterOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Đóng bộ lọc"><X className="h-4 w-4" /></button></div>
            <div className="space-y-4">
              {categories.length > 1 && <div><p className="mb-2 text-xs font-bold text-slate-500">Môn thể thao</p><div className="flex flex-wrap gap-2">{categories.map((cat) => <button key={cat.id} type="button" onClick={() => setSelectedCategoryId(cat.id)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${selectedCategoryId === cat.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-700'}`}>{cat.name}</button>)}</div></div>}
              <div><p className="mb-2 text-xs font-bold text-slate-500">Thể thức</p><div className="flex flex-wrap gap-2">{matchTypes.map((mt) => <button key={mt} type="button" onClick={() => { setSelectedMatchType(mt); if (mt === 'MIXED_DOUBLES') setSelectedGender('MALE'); }} className={`rounded-lg border px-3 py-2 text-xs font-bold ${selectedMatchType === mt ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-700'}`}>{getEloMatchTypeLabel(mt)}</button>)}</div></div>
              {selectedMatchType !== 'MIXED_DOUBLES' && <div><p className="mb-2 text-xs font-bold text-slate-500">Giới tính</p><div className="flex gap-2">{(['MALE', 'FEMALE'] as const).map((gender) => <button key={gender} type="button" onClick={() => setSelectedGender(gender)} className={`rounded-lg border px-4 py-2 text-xs font-bold ${selectedGender === gender ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-700'}`}>{gender === 'MALE' ? 'Nam' : 'Nữ'}</button>)}</div></div>}
            </div>
            <button type="button" onClick={() => setIsFilterOpen(false)} className="mt-6 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-black text-white hover:bg-blue-700">Áp dụng bộ lọc</button>
          </div>
        </div>
      )}

      {myRanking && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs">
            {rankings.findIndex((rank) => rank.id === myRanking.id) >= 0
              ? `#${rankings.findIndex((rank) => rank.id === myRanking.id) + 1}`
              : 'Ngoài top 20'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-blue-900">Xếp hạng của bạn</p>
            <p className="text-sm font-bold text-slate-800 truncate">{myRanking.user?.fullName || 'Bạn'}</p>
          </div>
          <span className="text-sm font-black text-blue-700">{myRanking.eloPoints} ELO</span>
        </div>
      )}

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
                      <div className={`rounded-full ${mc.bg} border-2 ${mc.border} relative ${isCenter ? 'w-14 h-14 border-[3px] shadow-md' : 'w-11 h-11'}`}>
                        {rankingAvatars(p, isCenter ? 'w-14 h-14' : 'w-11 h-11')}
                      </div>
                      <p className={`${isCenter ? 'text-sm' : 'text-[11px]'} font-bold text-slate-700 mt-1.5 truncate max-w-full text-center leading-tight`}>
                        {rankingName(p)}
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

          {/* ─── Ranks 4-20 List ─── */}
          {restRankings.length > 0 && (
            <div className="space-y-1.5 mt-4">
              {restRankings.map((player, index) => {
                const rank = rankings.findIndex((item) => item.id === player.id) + 1;
                const winRate = getWinRate(player);
                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 bg-white rounded-lg border border-slate-200/80 px-4 py-2.5 hover:bg-slate-50/50 transition-colors shadow-sm"
                  >
                    <span className="w-6 text-center text-xs font-bold text-slate-400">#{rank}</span>
                    {rankingAvatars(player, 'w-8 h-8')}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 truncate">{rankingName(player)}</span>
                      <EloTierBadge elo={player.eloPoints} tierName={player.tier?.name} size="sm" className="shrink-0 scale-[0.85] origin-left" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 w-10 text-right shrink-0">{winRate}%</span>
                    <span className="text-[10px] font-bold text-slate-600 w-12 text-right shrink-0">
                      {player.matchesWon}-{player.matchesPlayed - player.matchesWon}
                    </span>
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
