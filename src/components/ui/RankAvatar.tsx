import * as React from 'react';
import { cn } from '@/utils/cn';

type RankRingSize = 'sm' | 'md' | 'lg';

const ringByTier: Record<string, string> = {
  'Tier S': 'ring-amber-400',
  'High Tier A': 'ring-rose-500',
  'Low Tier A': 'ring-rose-300',
  'High Tier B': 'ring-blue-500',
  'Low Tier B': 'ring-blue-300',
  'High Tier C': 'ring-emerald-500',
  'Low Tier C': 'ring-emerald-300',
  'High Tier D': 'ring-slate-500',
  'Low Tier D': 'ring-slate-300',
};

export function getRankRingClass(
  elo: number | null | undefined,
  tierName?: string | null,
  matchesPlayed = 0,
): string {
  if (matchesPlayed <= 0 || elo == null) return 'ring-slate-300';
  const normalized = tierName?.trim().toLowerCase() || '';
  const tier = normalized.includes('tier s') ? 'Tier S'
    : normalized.includes('high tier a') ? 'High Tier A'
    : normalized.includes('low tier a') ? 'Low Tier A'
    : normalized.includes('high tier b') ? 'High Tier B'
    : normalized.includes('low tier b') ? 'Low Tier B'
    : normalized.includes('high tier c') ? 'High Tier C'
    : normalized.includes('low tier c') ? 'Low Tier C'
    : normalized.includes('high tier d') ? 'High Tier D'
    : elo >= 1800 ? 'Tier S'
    : elo >= 1700 ? 'High Tier A'
    : elo >= 1600 ? 'Low Tier A'
    : elo >= 1500 ? 'High Tier B'
    : elo >= 1400 ? 'Low Tier B'
    : elo >= 1300 ? 'High Tier C'
    : elo >= 1200 ? 'Low Tier C'
    : elo >= 1100 ? 'High Tier D'
    : 'Low Tier D';
  return ringByTier[tier];
}

export interface RankAvatarProps {
  src?: string | null;
  name?: string | null;
  elo?: number | null;
  tierName?: string | null;
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
        getRankRingClass(elo, tierName, matchesPlayed),
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
