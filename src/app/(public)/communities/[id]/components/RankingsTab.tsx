'use client';

import { useEffect, useState } from 'react';
import { Award, Filter, Flame, Trophy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Category } from '@/types/category';
import { rankingsApi, PlayerRanking } from '@/features/rankings/api';
import toast from 'react-hot-toast';

interface RankingsTabProps {
  communityId: string;
  categories: Category[];
}

export default function RankingsTab({ communityId, categories }: RankingsTabProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || ''
  );
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
          limit: 50,
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
  }, [communityId, selectedCategoryId]);

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

  // Get top 3 and rest
  const topThree = rankings.slice(0, 3);
  const restRankings = rankings.slice(3);

  // Rearrange top 3 to: [2nd, 1st, 3rd] for podium layout
  const podiumOrder = (() => {
    const result: (PlayerRanking | null)[] = [null, null, null];
    if (topThree[1]) result[0] = topThree[1]; // 2nd place on left
    if (topThree[0]) result[1] = topThree[0]; // 1st place in middle
    if (topThree[2]) result[2] = topThree[2]; // 3rd place on right
    return result;
  })();

  const activeCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-blue-500" /> Bảng xếp hạng ELO nội bộ
          </h3>
          <p className="text-xs text-slate-450 mt-0.5">
            Xếp hạng được tính dựa trên kết quả thi đấu các giải đấu của CLB.
          </p>
        </div>

        {/* Category switcher */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-lg">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
              Hệ thống điểm ELO {activeCategory ? `môn ${activeCategory.name}` : ''} sẽ tự động kích hoạt và cập nhật khi các thành viên tham gia thi đấu các giải đấu của câu lạc bộ.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top 3 Podium layout */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-3xl mx-auto pt-4 px-2">
              {/* Podium Column 2: 2nd place (renders left on md) */}
              <div className="order-2 md:order-1 flex flex-col items-center">
                {podiumOrder[0] ? (
                  <div className="w-full bg-white border border-slate-200/80 rounded-lg p-5 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center relative md:h-52 justify-center">
                    <div className="absolute -top-5 w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-350 text-slate-700 font-bold text-sm flex items-center justify-center shadow-sm">
                      2
                    </div>
                    <div className="w-14 h-14 rounded-full border-2 border-slate-300 overflow-hidden bg-slate-100 mb-3 relative">
                      {podiumOrder[0].user?.avatarUrl ? (
                        <img
                          src={podiumOrder[0].user.avatarUrl}
                          alt={podiumOrder[0].user.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center font-bold text-slate-400 bg-slate-100 text-lg">
                          {podiumOrder[0].user?.fullName?.charAt(0) || 'U'}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-800 text-sm truncate max-w-full">
                      {podiumOrder[0].user?.fullName}
                    </p>
                    <p className="text-lg font-bold text-slate-650 mt-1">
                      {podiumOrder[0].eloPoints} <span className="text-[10px] text-slate-400 font-bold">ELO</span>
                    </p>
                    <div className="mt-2.5 flex items-center gap-3 text-[10px] text-slate-400 font-bold border-t w-full pt-2 justify-center">
                      <span>Win: {podiumOrder[0].matchesWon}</span>
                      <span>Streak: {podiumOrder[0].winStreak}🔥</span>
                    </div>
                  </div>
                ) : (
                  <div className="hidden md:block w-full h-52 border border-dashed rounded-lg bg-slate-50/50"></div>
                )}
              </div>

              {/* Podium Column 1: 1st place (renders middle) */}
              <div className="order-1 md:order-2 flex flex-col items-center">
                {podiumOrder[1] ? (
                  <div className="w-full bg-gradient-to-b from-amber-50/50 to-white border-2 border-amber-400/80 rounded-lg p-6 shadow-md hover:shadow-lg transition-all text-center flex flex-col items-center relative md:h-60 justify-center">
                    <div className="absolute -top-7 w-12 h-12 rounded-full bg-amber-400 text-white font-bold text-base flex items-center justify-center shadow-md border-2 border-white animate-bounce">
                      👑
                    </div>
                    <div className="w-16 h-16 rounded-full border-2 border-amber-400 overflow-hidden bg-slate-100 mb-3 relative shadow-md">
                      {podiumOrder[1].user?.avatarUrl ? (
                        <img
                          src={podiumOrder[1].user.avatarUrl}
                          alt={podiumOrder[1].user.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center font-bold text-amber-600 bg-amber-50 text-xl">
                          {podiumOrder[1].user?.fullName?.charAt(0) || 'U'}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 text-base truncate max-w-full">
                      {podiumOrder[1].user?.fullName}
                    </p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {podiumOrder[1].eloPoints} <span className="text-xs text-blue-500 font-bold">ELO</span>
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 font-bold border-t border-amber-100 w-full pt-2.5 justify-center">
                      <span>Thắng: {podiumOrder[1].matchesWon}</span>
                      <span className="text-blue-600 flex items-center gap-0.5">
                        <Flame className="w-3.5 h-3.5 fill-amber-500 text-blue-500 shrink-0" />
                        {podiumOrder[1].winStreak}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-60 border border-dashed rounded-lg bg-slate-50/50"></div>
                )}
              </div>

              {/* Podium Column 3: 3rd place (renders right on md) */}
              <div className="order-3 md:order-3 flex flex-col items-center">
                {podiumOrder[2] ? (
                  <div className="w-full bg-white border border-slate-200/80 rounded-lg p-5 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center relative md:h-48 justify-center">
                    <div className="absolute -top-5 w-10 h-10 rounded-full bg-slate-100/50 border-2 border-amber-700/30 text-amber-800 font-bold text-sm flex items-center justify-center shadow-sm">
                      3
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-amber-600/30 overflow-hidden bg-slate-100 mb-3 relative">
                      {podiumOrder[2].user?.avatarUrl ? (
                        <img
                          src={podiumOrder[2].user.avatarUrl}
                          alt={podiumOrder[2].user.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center font-bold text-slate-400 bg-slate-100 text-base">
                          {podiumOrder[2].user?.fullName?.charAt(0) || 'U'}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-800 text-sm truncate max-w-full">
                      {podiumOrder[2].user?.fullName}
                    </p>
                    <p className="text-lg font-bold text-slate-650 mt-1">
                      {podiumOrder[2].eloPoints} <span className="text-[10px] text-slate-400 font-bold">ELO</span>
                    </p>
                    <div className="mt-2.5 flex items-center gap-3 text-[10px] text-slate-400 font-bold border-t w-full pt-2 justify-center">
                      <span>Win: {podiumOrder[2].matchesWon}</span>
                      <span>Streak: {podiumOrder[2].winStreak}🔥</span>
                    </div>
                  </div>
                ) : (
                  <div className="hidden md:block w-full h-48 border border-dashed rounded-lg bg-slate-50/50"></div>
                )}
              </div>
            </div>
          )}

          {/* Ranks 4+ Table */}
          {restRankings.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200/80 shadow-sm overflow-hidden mt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="py-4 px-6 text-center w-20">Thứ hạng</th>
                      <th className="py-4 px-6">Vận động viên</th>
                      <th className="py-4 px-6 text-center">Điểm ELO</th>
                      <th className="py-4 px-6 text-center">Số trận</th>
                      <th className="py-4 px-6 text-center">Tỉ lệ thắng</th>
                      <th className="py-4 px-6 text-center">Chuỗi thắng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {restRankings.map((row, index) => {
                      const rank = index + 4;
                      const winRate =
                        row.matchesPlayed > 0
                          ? Math.round((row.matchesWon / row.matchesPlayed) * 100)
                          : 0;

                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-4 px-6 text-center font-bold text-slate-500">
                            {rank}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 shrink-0 border relative">
                                {row.user?.avatarUrl ? (
                                  <img
                                    src={row.user.avatarUrl}
                                    alt={row.user.fullName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="w-full h-full flex items-center justify-center font-bold text-slate-400 bg-slate-100">
                                    {row.user?.fullName?.charAt(0) || 'U'}
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-slate-900">
                                {row.user?.fullName || 'VĐV Ẩn Danh'}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center font-bold text-slate-950">
                            {row.eloPoints}
                          </td>
                          <td className="py-4 px-6 text-center font-medium text-slate-500">
                            {row.matchesPlayed}
                          </td>
                          <td className="py-4 px-6 text-center font-bold text-blue-600">
                            {winRate}%
                          </td>
                          <td className="py-4 px-6 text-center">
                            {row.winStreak > 0 ? (
                              <span className="inline-flex items-center gap-0.5 text-xs font-bold text-blue-600 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200">
                                <Flame className="w-3.5 h-3.5 fill-amber-500 text-blue-500 shrink-0" />
                                {row.winStreak}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
