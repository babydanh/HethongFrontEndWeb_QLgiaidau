'use client';

import { Handshake } from 'lucide-react';
import { useTranslations } from 'next-intl';
import SponsorLogo from '@/components/tournaments/SponsorLogo';
import { cn } from '@/utils/cn';
import type { TournamentSponsor } from '@/features/tournaments/api';
import { getSponsorTierStyle } from '@/features/tournaments/sponsor-tier-style';

interface SponsorsTabProps {
  sponsors: TournamentSponsor[];
}

const TIER_ORDER: TournamentSponsor['tier'][] = [
  'TITLE',
  'DIAMOND',
  'GOLD',
  'SILVER',
  'BRONZE',
  'IN_KIND',
];

export default function SponsorsTab({ sponsors }: SponsorsTabProps) {
  const translate = useTranslations('TournamentDetail');
  const grouped = TIER_ORDER.map((tier) => ({
    tier,
    sponsors: sponsors.filter((sponsor) => sponsor.tier === tier),
  })).filter((group) => group.sponsors.length > 0);

  return (
    <section aria-labelledby="sponsors-heading" className="space-y-7">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
          <Handshake className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <h2 id="sponsors-heading" className="text-xl font-black text-slate-900">
            {translate('sponsors.title')}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {translate('sponsors.description')}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {grouped.map((group) => {
          const groupTierStyle = getSponsorTierStyle(group.tier);
          const isFeaturedTier = group.tier === 'TITLE' || group.tier === 'DIAMOND';

          return (
            <section key={group.tier} aria-labelledby={`sponsor-tier-${group.tier}`}>
              <div className="mb-3 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <h3
                  id={`sponsor-tier-${group.tier}`}
                  className={cn('text-[10px] font-black uppercase tracking-[0.14em]', groupTierStyle.accentClassName)}
                >
                  {translate(`sponsors.tiers.${group.tier}`)}
                </h3>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <div
                className={cn(
                  'grid justify-items-center gap-3',
                  isFeaturedTier
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
                )}
              >
                {group.sponsors.map((sponsor) => {
                  const tierStyle = getSponsorTierStyle(sponsor.tier);
                  const initials = sponsor.displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SP';
                  const card = (
                    <div
                      title={sponsor.displayName}
                      className={cn(
                        'group relative flex w-full items-center justify-center rounded-xl border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                        isFeaturedTier ? 'aspect-square max-w-[190px] p-4' : 'h-24 max-w-[210px]',
                        tierStyle.accentBorderClassName,
                      )}
                    >
                      <SponsorLogo
                        logoUrl={sponsor.logoUrl}
                        alt={sponsor.displayName}
                        initials={initials}
                        className={cn('h-full w-full border-0 bg-transparent p-0', tierStyle.logoFrameClassName)}
                        imageClassName="max-h-full max-w-full"
                      />
                      <span className="pointer-events-none absolute inset-x-2 bottom-2 truncate rounded-md bg-white/95 px-1.5 py-1 text-center text-[9px] font-bold text-slate-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        {sponsor.displayName}
                      </span>
                    </div>
                  );

                  return sponsor.websiteUrl ? (
                    <a
                      key={sponsor.id}
                      href={sponsor.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={translate('sponsors.openWebsite', { name: sponsor.displayName })}
                      className="flex w-full justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                    >
                      {card}
                    </a>
                  ) : (
                    <div key={sponsor.id} className="flex w-full justify-center">
                      {card}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
