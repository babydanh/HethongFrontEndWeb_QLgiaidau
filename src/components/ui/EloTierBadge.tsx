import * as React from 'react';
import { cn } from '@/utils/cn';
import { getRankStyle } from '@/utils/rank-style';
import { getShortTierCode } from '@/components/ui/PlayerSportTierBadgeBar';
import { PolygonEmblemIcon, getTierTheme } from '@/components/ui/RankEmblem';

export interface EloTierBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  elo: number;
  tierName?: string;
  categoryName?: string;
  size?: 'sm' | 'md' | 'lg';
  showFullName?: boolean;
}

export function getEloTier(elo: number, tierName?: string, categoryName?: string) {
  const style = getRankStyle(elo, tierName, categoryName);
  const shortCode = getShortTierCode(style.name, elo);
  const theme = getTierTheme(style.name, elo, shortCode);
  return {
    name: style.name,
    shortCode,
    theme,
    color: style.badgeClass,
    icon: '',
  };
}

export function EloTierBadge({
  elo,
  tierName,
  categoryName,
  size = 'md',
  showFullName = false,
  className,
  ...props
}: EloTierBadgeProps) {
  const tier = getEloTier(elo, tierName, categoryName);

  const iconSizes = {
    sm: 18,
    md: 22,
    lg: 28,
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-xl px-2 py-0.5 border shadow-xs transition-all select-none',
        'bg-slate-900/90 text-white border-slate-700/80',
        size === 'sm' ? 'gap-1 text-[11px]' : size === 'md' ? 'gap-1.5 text-xs' : 'gap-2 text-sm',
        className,
      )}
      title={`${tier.name} (${tier.shortCode}) • ${elo} ELO`}
      {...props}
    >
      <PolygonEmblemIcon theme={tier.theme} sizePx={iconSizes[size]} />
      <span
        className="font-black uppercase tracking-tight leading-none"
        style={{
          background: tier.theme.textGradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
        }}
      >
        {showFullName ? tier.name : tier.shortCode}
      </span>
      <span className="text-[10px] font-semibold text-slate-400">
        ({elo})
      </span>
    </div>
  );
}
