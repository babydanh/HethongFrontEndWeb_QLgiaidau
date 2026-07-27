'use client';

import { useEffect, useState } from 'react';
import { Award, Trophy, ChevronDown, Loader2, Medal, Crown } from 'lucide-react';
import { Category } from '@/types/category';
import { rankingsApi, PlayerRanking } from '@/features/rankings/api';
import { EloTierBadge } from '@/components/ui/EloTierBadge';
import { getEloMatchTypeLabel } from '@/features/rankings/elo-display';
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
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedCategoryId) return;

    const fetchRankings = async () => {
      try {
        setIsLoading(true);
        const res = await rankingsApi.getRankings({
          scope: 'COMMUNITY',
          communityId,
          categoryId: selectedCategoryId,
          matchType: selectedMatchType,
          limit: 10,
        });
        if (res.data) {
          setRankings(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch community rankings:', err);
        toast.error('Không thể tải bảng xếp hạng');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRankings();
  }, [communityId, selectedCategoryId, selectedMatchType]);

  const matchTypes: MatchType[] = ['SINGLES', 'DOUBLES', 'MIXED_DOUBLES'];

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

  const topThree = rankings.slice(0, 3);
  const restRankings = rankings.slice(3, 10);

  const podiumOrder: (PlayerRanking | null)[] = [null, null, null];
  if (topThree[1]) podiumOrder[0] = topThree[1]; // 2nd
  if (topThree[0]) podiumOrder[1] = topThree[0]; // 1st
  if (topThree[2]) podiumOrder[2] = topThree[2]; // 3rd

  const activeCategory = categories.find((c) => c.id === selectedCategoryId);

  const podiumTiers = [
    { color: 'text-amber-400', bg: 'bg-amber-50', border: 'border-amber-300', label: '🥇' },
    { color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-300', label: '🥈' },
    { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-300', label: '🥉' },
  ];

  const getWinRate = (p: PlayerRanking) =>
    p.matchesPlayed > 0 ? Math.round((p.matchesWon / p.matchesPlayed) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Xếp hạng ELO CLB
          </h3>
          <p className="text-xs text-slate-450 mt-0.5">
            Top 10 thành viên xuất sắc nhất •{' '}
            {activeCategory?.name || ''} {getEloMatchTypeLabel(selectedMatchType)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category switcher */}
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

          {/* Match type dropdown */}
          <div className="relative">
            <select
              value={selectedMatchType}
              onChange={(e) => setSelectedMatchType(e.target.value as MatchType)}
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

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center bg-white rounded-lg border border-slate-200/80 shadow-sm">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
          <p className="text-sm text-slate-450 font-bold animate-pulse">
            Đang tải dữ liệu xếp hạng...
          </p>
        </div>
      ) : rankings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-16 text-center">
            <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-800 font-bold text-lg">Chưa có dữ liệu xếp hạng</p>
            <p className="text-slate-450 mt-2 max-w-sm mx-auto text-xs leading-relaxed font-semibold">
              Hệ thống điểm ELO{' '}
              {activeCategory ? `môn ${activeCategory.name}` : ''} sẽ tự động kích hoạt
              khi các thành viên tham gia thi đấu.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ─── Compact Podium ─── */}
          {topThree.length > 0 && (
            <div className="flex items-end justify-center gap-3 sm:gap-4 px-2 pt-4">
              {/* Silver - 2nd (left) */}
              <div className="flex-1 max-w-[140px] flex flex-col items-center">
                {podiumOrder[0] ? (
                  <div className="w-full flex flex-col items-center">
                    <div className="flex flex-col items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-sm font-bold text-slate-600 mb-1.5">
                        <Medal className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-300 relative">
                        {podiumOrder[0].user?.avatarUrl ? (
                          <img
                            src={podiumOrder[0].user.avatarUrl}
                            alt={podiumOrder[0].user.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center font-bold text-slate-500 bg-slate-100 text-xs">
                            {podiumOrder[0].user?.fullName?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-bold text-slate-700 mt-1.5 truncate max-w-full text-center leading-tight">
                        {podiumOrder[0].user?.fullName || '---'}
                      </p>
                      <span className="text-xs font-bold text-slate-500">
                        {podiumOrder[0].eloPoints} ELO
                      </span>
                      <EloTierBadge
                        elo={podiumOrder[0].eloPoints}
                        tierName={podiumOrder[0].tier?.name}
                        size="sm"
                        className="mt-1 scale-[0.85] origin-center"
                      />
                    </div>
                    <div className="w-full h-24 bg-slate-100 rounded-t-lg border border-slate-200 flex items-center justify-center">
                      <span className="text-2xl font-black text-slate-400/60">II</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-32 border border-dashed rounded-lg bg-slate-50/50"></div>
                )}
              </div>

              {/* Gold - 1st (center) */}
              <div className="flex-[1.2] max-w-[170px] flex flex-col items-center -translate-y-3">
                {podiumOrder[1] ? (
                  <div className="w-full flex flex-col items-center">
                    <div className="flex flex-col items-center mb-2">
                      <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-xs -mb-2 z-10 shadow-md border-2 border-white">
                        <Crown className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-amber-50 border-[3px] border-amber-400 relative shadow-md">
                        {podiumOrder[1].user?.avatarUrl ? (
                          <img
                            src={podiumOrder[1].user.avatarUrl}
                            alt={podiumOrder[1].user.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center font-bold text-amber-600 bg-amber-50 text-sm">
                            {podiumOrder[1].user?.fullName?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-amber-700 mt-1.5 truncate max-w-full text-center leading-tight">
                        {podiumOrder[1].user?.fullName || '---'}
                      </p>
                      <span className="text-sm font-bold text-amber-600">
                        {podiumOrder[1].eloPoints} ELO
                      </span>
                      <EloTierBadge
                        elo={podiumOrder[1].eloPoints}
                        tierName={podiumOrder[1].tier?.name}
                        size="sm"
                        className="mt-1 scale-90 origin-center border-amber-200 bg-white"
                      />
                    </div>
                    <div className="w-full h-28 bg-gradient-to-t from-amber-50 to-amber-100/70 rounded-t-lg border-2 border-amber-300/80 flex items-center justify-center shadow-sm">
                      <span className="text-3xl font-black text-amber-400/70">I</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-36 border border-dashed rounded-lg bg-slate-50/50"></div>
                )}
              </div>

              {/* Bronze - 3rd (right) */}
              <div className="flex-1 max-w-[140px] flex flex-col items-center">
                {podiumOrder[2] ? (
                  <div className="w-full flex flex-col items-center">
                    <div className="flex flex-col items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-orange-50 border-2 border-orange-300 flex items-center justify-center text-sm font-bold text-orange-600 mb-1.5">
                        <Medal className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-orange-50 border-2 border-orange-300 relative">
                        {podiumOrder[2].user?.avatarUrl ? (
                          <img
                            src={podiumOrder[2].user.avatarUrl}
                            alt={podiumOrder[2].user.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center font-bold text-orange-500 bg-orange-50 text-xs">
                            {podiumOrder[2].user?.fullName?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-bold text-orange-700 mt-1.5 truncate max-w-full text-center leading-tight">
                        {podiumOrder[2].user?.fullName || '---'}
                      </p>
                      <span className="text-xs font-bold text-orange-600">
                        {podiumOrder[2].eloPoints} ELO
                      </span>
                      <EloTierBadge
                        elo={podiumOrder[2].eloPoints}
                        tierName={podiumOrder[2].tier?.name}
                        size="sm"
                        className="mt-1 scale-[0.85] origin-center"
                      />
                    </div>
                    <div className="w-full h-20 bg-orange-50 rounded-t-lg border border-orange-200 flex items-center justify-center">
                      <span className="text-2xl font-black text-orange-400/60">III</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-28 border border-dashed rounded-lg bg-slate-50/50"></div>
                )}
              </div>
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
                    {/* Rank number */}
                    <span className="w-6 text-center text-xs font-bold text-slate-400">
                      #{rank}
                    </span>

                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                      {player.user?.avatarUrl ? (
                        <img
                          src={player.user.avatarUrl}
                          alt={player.user.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center font-bold text-slate-400 bg-slate-100 text-[10px]">
                          {player.user?.fullName?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>

                    {/* Name + Tier badge */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 truncate">
                        {player.user?.fullName || 'VĐV'}
                      </span>
                      <EloTierBadge
                        elo={player.eloPoints}
                        tierName={player.tier?.name}
                        size="sm"
                        className="shrink-0 scale-[0.85] origin-left"
                      />
                    </div>

                    {/* Win rate */}
                    <span className="text-[10px] font-semibold text-slate-400 w-10 text-right shrink-0">
                      {winRate}%
                    </span>

                    {/* ELO */}
                    <span className="text-xs font-bold text-blue-600 w-16 text-right shrink-0">
                      {player.eloPoints}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
