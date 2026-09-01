'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Trophy, Maximize2, ArrowUpRight, Loader2, Sparkles } from 'lucide-react';
import { tournamentsApi, type Tournament } from '@/features/tournaments/api';
import { communitiesApi } from '@/features/communities/api';
import BracketTab from '@/app/(public)/tournaments/[id]/components/BracketTab';
import TournamentBracketModal from '@/components/tournaments/TournamentBracketModal';
import { cn } from '@/utils/cn';

interface CommunityTournamentBracketWidgetProps {
  tournamentId: string;
  communityId?: string;
  communityLogoUrl?: string | null;
  initialTournamentName?: string;
  categoryName?: string | null;
  status?: string;
  isLite?: boolean;
}

export default function CommunityTournamentBracketWidget({
  tournamentId,
  communityId,
  communityLogoUrl,
  initialTournamentName,
  categoryName,
  status,
  isLite = false,
}: CommunityTournamentBracketWidgetProps) {
  const translate = useTranslations('Common');
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [communityLogo, setCommunityLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    tournamentsApi
      .getTournamentById(tournamentId)
      .then((res) => {
        if (!mounted) return;
        if (res.data) {
          setTournament(res.data);
          setError(null);
          const commId = res.data.communityId || communityId;
          if (commId && (!res.data.logoUrl || res.data.logoUrl === '')) {
            communitiesApi.getCommunityById(commId).then((cRes) => {
              if (mounted && cRes?.data?.logoUrl) {
                setCommunityLogo(cRes.data.logoUrl);
              } else if (mounted && cRes?.data?.bannerUrl) {
                setCommunityLogo(cRes.data.bannerUrl);
              }
            }).catch(() => {});
          }
        } else {
          setError(translate('communityBracketLoadMissing'));
        }
      })
      .catch(() => {
        if (!mounted) return;
        setError(translate('communityBracketLoadFailed'));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [tournamentId, communityId, translate]);

  const currentStatus = tournament?.status || status || 'ONGOING';
  const isOngoing = currentStatus === 'ONGOING' || currentStatus === 'IN_PROGRESS';
  const isCompleted = currentStatus === 'COMPLETED' || currentStatus === 'FINISHED';

  if (loading) {
    return (
      <div className="mt-3.5 overflow-hidden rounded-2xl border border-blue-100 bg-slate-50/70 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-200 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3 w-24 bg-blue-200 animate-pulse rounded" />
              <div className="h-4 w-48 bg-slate-200 animate-pulse rounded" />
            </div>
          </div>
          <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-lg" />
        </div>
        <div className="h-48 bg-white/80 rounded-xl border border-slate-200/60 animate-pulse flex items-center justify-center text-xs text-slate-400 gap-2 font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span>{translate('communityBracketLoading')}</span>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="mt-3.5 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white p-1 overflow-hidden shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sporto_v1_with_text.svg"
                alt="SportO"
                className="h-full w-full object-contain rounded-full"
              />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                {initialTournamentName || translate('communityTournamentFallback')}
              </h4>
              <p className="text-xs text-slate-500">
                {error || translate('communityBracketUnavailable')}
              </p>
            </div>
          </div>
          <Link
            href={`/tournaments/${tournamentId}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <span>{translate('communityViewDetails')}</span>
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
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-1 overflow-hidden shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  tournament.logoUrl ||
                  (tournament as any).community?.logoUrl ||
                  (tournament as any).community?.bannerUrl ||
                  communityLogo ||
                  communityLogoUrl ||
                  '/sporto_v1_with_text.svg'
                }
                alt={tournament.name}
                className="h-full w-full object-cover rounded-full"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/sporto_v1_with_text.svg';
                }}
              />
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
                  {isOngoing ? `⚡ ${translate('communityOngoingStatus')}` : isCompleted ? `🏆 ${translate('communityCompletedStatus')}` : translate('communityBracketStatus')}
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
              title={translate('communityFullscreen')}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{translate('communityFullscreenLabel')}</span>
            </button>
            <Link
              href={`/tournaments/${tournamentId}`}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
            >
              <span>{translate('communityViewTournament')}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Embedded Interactive Bracket Tab (Super Lite Preview) */}
        <div className="p-2 sm:p-4 bg-slate-50/50">
          <BracketTab tournament={tournament} compact={true} />
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
