import * as React from 'react';
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
  const sizeClass = size === 'lg' ? 'h-32 w-32' : size === 'sm' ? 'h-8 w-8' : 'h-12 w-12';
  const initial = name?.trim().charAt(0).toUpperCase() || 'U';
  const rankTitle = matchesPlayed > 0 && elo != null
    ? `${tierName || 'Đã xếp hạng'} • ${elo} ELO`
    : 'Chưa xếp hạng';

  return (
    <div
      className={cn(
        sizeClass,
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm',
        ringClassName,
        getRankRingClass(elo, tierName, matchesPlayed, categoryName),
        className,
      )}
      title={title || rankTitle}
    >
      {src ? (
        <img src={src} alt={name || 'Avatar'} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
      ) : (
        <span className="font-bold uppercase text-slate-500">{initial}</span>
      )}
    </div>
  );
}

