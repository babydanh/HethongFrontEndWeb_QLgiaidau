import * as React from 'react';
import { cn } from '@/utils/cn';
import { getRankStyle } from '@/utils/rank-style';

export interface EloTierBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  elo: number;
  tierName?: string;
  categoryName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function getEloTier(elo: number, tierName?: string, categoryName?: string) {
  const style = getRankStyle(elo, tierName, categoryName);
  return {
    name: style.name,
    color: style.badgeClass,
    icon: '',
  };
}

export function EloTierBadge({ elo, tierName, categoryName, size = 'md', className, ...props }: EloTierBadgeProps) {
  const tier = getEloTier(elo, tierName, categoryName);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2 font-semibold',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border font-medium transition-colors shadow-sm',
        tier.color,
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {tier.icon && <span aria-hidden="true">{tier.icon}</span>}
      <span>
        {tier.name} <span className="opacity-70">({elo})</span>
      </span>
    </div>
  );
}

