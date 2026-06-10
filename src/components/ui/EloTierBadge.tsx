import * as React from 'react';
import { cn } from '@/utils/cn';

export interface EloTierBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  elo: number;
  size?: 'sm' | 'md' | 'lg';
}

export function getEloTier(elo: number) {
  if (elo >= 2200) {
    return {
      name: 'Grand Master',
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      icon: '🏆',
      bgGradient: 'from-amber-400 to-amber-600',
    };
  }
  if (elo >= 2000) {
    return {
      name: 'Master',
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      icon: '👑',
      bgGradient: 'from-purple-500 to-indigo-600',
    };
  }
  if (elo >= 1800) {
    return {
      name: 'Diamond',
      color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      icon: '💠',
      bgGradient: 'from-cyan-400 to-blue-500',
    };
  }
  if (elo >= 1600) {
    return {
      name: 'Platinum',
      color: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      icon: '💎',
      bgGradient: 'from-sky-400 to-cyan-500',
    };
  }
  if (elo >= 1400) {
    return {
      name: 'Gold',
      color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      icon: '🥇',
      bgGradient: 'from-yellow-400 to-amber-500',
    };
  }
  if (elo >= 1200) {
    return {
      name: 'Silver',
      color: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
      icon: '🥈',
      bgGradient: 'from-gray-300 to-gray-500',
    };
  }
  return {
    name: 'Bronze',
    color: 'bg-orange-700/10 text-orange-600 border-orange-700/20',
    icon: '🥉',
    bgGradient: 'from-orange-600 to-amber-800',
  };
}

export function EloTierBadge({ elo, size = 'md', className, ...props }: EloTierBadgeProps) {
  const tier = getEloTier(elo);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2 font-bold',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border font-semibold transition-colors shadow-sm',
        tier.color,
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <span>{tier.icon}</span>
      <span>
        {tier.name} <span className="opacity-70">({elo})</span>
      </span>
    </div>
  );
}
