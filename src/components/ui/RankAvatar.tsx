import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/utils/cn';
import { getRankStyle } from '@/utils/rank-style';

type RankRingSize = 'sm' | 'md' | 'lg';

export function getRankRingClass(
  elo: number | null | undefined,
  tierName?: string | null,
  matchesPlayed = 0,
  categoryName?: string | null,
): string {
  if (matchesPlayed <= 0 || elo == null) return 'ring-slate-300';
  return getRankStyle(elo, tierName, categoryName).ringClass;
}

const RANK_BORDER_COLORS: Record<string, string> = {
  'ring-slate-300': '#cbd5e1',
  'ring-slate-400': '#94a3b8',
  'ring-slate-500': '#64748b',
  'ring-emerald-300': '#6ee7b7',
  'ring-emerald-500': '#10b981',
  'ring-blue-300': '#93c5fd',
  'ring-blue-500': '#3b82f6',
  'ring-rose-300': '#fda4af',
  'ring-rose-500': '#f43f5e',
  'ring-amber-400': '#fbbf24',
};

export function getRankBorderColor(
  elo: number | null | undefined,
  tierName?: string | null,
  matchesPlayed = 0,
  categoryName?: string | null,
): string {
  if (matchesPlayed <= 0 || elo == null) return RANK_BORDER_COLORS['ring-slate-300'];
  const ringClass = getRankStyle(elo, tierName, categoryName).ringClass;
  return RANK_BORDER_COLORS[ringClass] ?? RANK_BORDER_COLORS['ring-slate-300'];
}

export interface RankAvatarProps {
  src?: string | null;
  name?: string | null;
  elo?: number | null;
  tierName?: string | null;
  categoryName?: string | null;
  matchesPlayed?: number;
  size?: RankRingSize;
  className?: string;
  ringClassName?: string;
  title?: string;
}

export function RankAvatar({
  src,
  name,
  elo,
  tierName,
  categoryName,
  matchesPlayed = 0,
  size = 'md',
  className,
  ringClassName = 'ring-2',
  title,
}: RankAvatarProps) {
  const translate = useTranslations('EloDisplay');
  const sizeClass = size === 'lg' ? 'h-32 w-32' : size === 'sm' ? 'h-8 w-8' : 'h-12 w-12';
  const initial = name?.trim().charAt(0).toUpperCase() || 'U';
  const rankTitle = matchesPlayed > 0 && elo != null
    ? `${tierName || translate('ranked')} • ${elo} ELO`
    : translate('unranked');

  return (
    <div
      className={cn(
        sizeClass,
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-4 bg-slate-100 shadow-sm',
        ringClassName,
        getRankRingClass(elo, tierName, matchesPlayed, categoryName),
        className,

      )}
      title={title || rankTitle}
      style={{ borderColor: getRankBorderColor(elo, tierName, matchesPlayed, categoryName) }}
    >
      {src ? (
        <img src={src} alt={name || 'Avatar'} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
      ) : (
        <span className="font-bold uppercase text-slate-500">{initial}</span>
      )}
    </div>
  );
}

