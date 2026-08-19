'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Maximize2, ArrowUpRight, Loader2, Sparkles } from 'lucide-react';
import { tournamentsApi, type Tournament } from '@/features/tournaments/api';
import BracketTab from '@/app/(public)/tournaments/[id]/components/BracketTab';
import TournamentBracketModal from '@/components/tournaments/TournamentBracketModal';
import { cn } from '@/utils/cn';

interface CommunityTournamentBracketWidgetProps {
  tournamentId: string;
  initialTournamentName?: string;
  categoryName?: string | null;
  status?: string;
  isLite?: boolean;
}

export default function CommunityTournamentBracketWidget({
  tournamentId,
  initialTournamentName,
  categoryName,
  status,
  isLite = false,
}: CommunityTournamentBracketWidgetProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    tournamentsApi
      .getTournamentById(tournamentId)
      .then((res) => {
        if (!mounted) return;
        if (res.data) {
          setTournament(res.data);
        } else {
          setError('Không tìm thấy dữ liệu giải đấu');
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || 'Không thể tải sơ đồ giải đấu');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [tournamentId]);

  const currentStatus = tournament?.status || status || 'ONGOING';
  const isOngoing = currentStatus === 'ONGOING' || currentStatus === 'IN_PROGRESS';
  const isCompleted = currentStatus === 'COMPLETED' || currentStatus === 'FINISHED';

  if (loading) {
    return (
      <div className="mt-3.5 overflow-hidden rounded-2xl border border-blue-100 bg-slate-50/70 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-200 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3 w-24 bg-blue-200 animate-pulse rounded" />
              <div className="h-4 w-48 bg-slate-200 animate-pulse rounded" />
            </div>
          </div>
          <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-lg" />
        </div>
        <div className="h-48 bg-white/80 rounded-xl border border-slate-200/60 animate-pulse flex items-center justify-center text-xs text-slate-400 gap-2 font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span>Đang tải sơ đồ nhánh đấu...</span>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="mt-3.5 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                {initialTournamentName || 'Giải đấu CLB'}
              </h4>
              <p className="text-xs text-slate-500">
                {error || 'Sơ đồ thi đấu sẽ sẵn sàng khi giải đấu bắt đầu'}
              </p>
            </div>
          </div>
          <Link
            href={`/tournaments/${tournamentId}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <span>Xem chi tiết</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-3.5 overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/50 via-white to-white shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-md">
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-100 bg-white/80 backdrop-blur-xs">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
                    isOngoing
                      ? 'bg-rose-100 text-rose-700 border border-rose-200/80'
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/80'
                      : 'bg-blue-100 text-blue-700 border border-blue-200/80',
                  )}
                >
                  {isOngoing ? '⚡ ĐANG THI ĐẤU' : isCompleted ? '🏆 ĐÃ KẾT THÚC' : 'SƠ ĐỒ THI ĐẤU'}
                </span>
                {(tournament.category?.name || categoryName) && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {tournament.category?.name || categoryName}
                  </span>
                )}
                {isLite && (
                  <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                    LITE
                  </span>
                )}
              </div>
              <h4 className="mt-1 text-sm sm:text-base font-extrabold text-slate-900 truncate">
                {tournament.name}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-blue-600 transition-colors"
              title="Mở toàn màn hình"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Toàn màn hình</span>
            </button>
            <Link
              href={`/tournaments/${tournamentId}`}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
            >
              <span>Xem giải</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Embedded Interactive Bracket Tab */}
        <div className="p-2 sm:p-4 bg-slate-50/50">
          <BracketTab tournament={tournament} />
        </div>
      </div>

      {/* Fullscreen Interactive Bracket Modal */}
      <TournamentBracketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tournament={tournament}
      />
    </>
  );
}
