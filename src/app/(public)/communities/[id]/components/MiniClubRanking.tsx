'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Trophy, Loader2, ChevronRight } from 'lucide-react';
import { Category } from '@/types/category';
import { rankingsApi, PlayerRanking } from '@/features/rankings/api';
import { cn } from '@/utils/cn';
import { EloTierBadge } from '@/components/ui/EloTierBadge';

interface MiniClubRankingProps {
  communityId: string;
  categories: Category[];
  className?: string;
  maxItems?: number;
}

export default function MiniClubRanking({
  communityId,
  categories,
  className,
  maxItems = 3,
}: MiniClubRankingProps) {
  const translate = useTranslations('Common');
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const firstCategoryId = categories[0]?.id;
    if (!firstCategoryId) return;

    const fetch = async () => {
      try {
        setIsLoading(true);
        const res = await rankingsApi.getRankings({
          scope: 'COMMUNITY',
          communityId,
          categoryId: firstCategoryId,
          matchType: 'SINGLES',
          genderRestriction: 'MALE',
          limit: maxItems,
        });
        if (res.data) {
          setRankings(res.data);
        }
      } catch {
        // silently fail — mini widget should not disrupt the page
      } finally {
        setIsLoading(false);
      }
    };

    fetch();
  }, [communityId, categories, maxItems]);

  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-lg border border-slate-200 shadow-sm p-4', className)}>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className={cn('bg-white rounded-lg border border-slate-200 shadow-sm p-4', className)}>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-slate-300" />
          <span className="text-sm font-bold text-slate-500">{translate('clubRankingTitle')}</span>
        </div>
        <div className="flex items-center justify-center gap-6 py-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div className={`w-10 h-10 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center ${i === 2 ? 'w-12 h-12' : ''}`}>
                <span className="text-slate-300 text-xs font-bold">#{i}</span>
              </div>
              <div className="h-3 w-14 bg-slate-100 rounded" />
              <div className="h-3 w-10 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-slate-400 mt-2">{translate('noClubRankingData')}</p>
      </div>
    );
  }

  const topThree = rankings.slice(0, 3);

  return (
    <div className={cn('bg-white rounded-lg border border-slate-200 shadow-sm p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-slate-800">{translate('clubRankingTitle')}</span>
        </div>
        <Link
          href={`/communities/${communityId}`}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
        >
          {translate('viewMore')}
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Top 3 compact row */}
      <div className="flex items-center justify-around gap-2">
        {topThree.map((player, i) => {
          const rank = i + 1;
          const medalColors = [
            { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-600', icon: '🥇' },
            { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-500', icon: '🥈' },
            { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-600', icon: '🥉' },
          ];
          const mc = medalColors[i];

          return (
            <div
              key={player.id}
              className="flex flex-col items-center gap-1 flex-1 min-w-0"
            >
              {/* Avatar */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full border-2 flex items-center justify-center overflow-hidden',
                  mc.bg,
                  mc.border,
                )}
              >
                {player.user?.avatarUrl ? (
                  <img
                    src={player.user.avatarUrl}
                    alt={player.user.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className={cn('text-xs font-bold', mc.text)}>
                    {player.user?.fullName?.charAt(0) || '?'}
                  </span>
                )}
              </div>

              {/* Name */}
              <span className="text-[11px] font-bold text-slate-700 truncate max-w-full text-center leading-tight">
                {player.user?.fullName || '---'}
              </span>

              {/* ELO */}
              <div className="flex items-center gap-1">
                <span className={cn('text-xs font-bold', mc.text)}>
                  {player.eloPoints}
                </span>
                {player.tier?.name && (
                  <EloTierBadge
                    elo={player.eloPoints}
                    tierName={player.tier.name}
                    size="sm"
                    className="scale-[0.7] origin-left"
                  />
                )}
              </div>

              {/* Rank badge */}
              <span className="text-[10px] font-bold text-slate-400">
                #{rank}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
