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
    <section aria-labelledby="sponsors-heading" className="space-y-6">
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

      <div className="space-y-6">
        {grouped.map((group) => {
          const groupTierStyle = getSponsorTierStyle(group.tier);
          return (
            <section key={group.tier} aria-labelledby={`sponsor-tier-${group.tier}`}>
              <h3
                id={`sponsor-tier-${group.tier}`}
                className={cn('mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em]', groupTierStyle.accentClassName)}
              >
                <span className="h-px flex-1 bg-slate-200" />
                <span>{translate(`sponsors.tiers.${group.tier}`)}</span>
                <span className="h-px flex-1 bg-slate-200" />
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
              {group.sponsors.map((sponsor) => {
                const tierStyle = getSponsorTierStyle(sponsor.tier);
                const initials = sponsor.displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SP';
                const card = (
                  <div className={cn('flex h-full flex-col rounded-2xl border border-t-2 bg-white p-3 shadow-sm transition-shadow hover:shadow-md', tierStyle.surfaceClassName, tierStyle.accentBorderClassName)}>
                    <div className="flex flex-col items-center text-center">
                      <SponsorLogo
                        logoUrl={sponsor.logoUrl}
                        alt={sponsor.displayName}
                        initials={initials}
                        className={cn('h-20 w-full max-w-[220px] rounded-xl border p-2', tierStyle.logoFrameClassName)}
                        imageClassName="h-full w-full"
                      />
                      <p className="mt-2 w-full truncate text-sm font-black text-slate-900">{sponsor.displayName}</p>
                      <span className={cn('mt-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide', tierStyle.badgeClassName)}>
                        {translate(`sponsors.tiers.${sponsor.tier}`)}
                      </span>
                    </div>
                    {sponsor.shortDescription && (
                      <p className="mt-2 line-clamp-2 text-center text-xs font-medium leading-4 text-slate-500">
                        {sponsor.shortDescription}
                      </p>
                    )}

                  </div>
                );

                return sponsor.websiteUrl ? (
                  <a
                    key={sponsor.id}
                    href={sponsor.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={translate('sponsors.openWebsite', { name: sponsor.displayName })}
                  >
                    {card}
                  </a>
                ) : (
                  <div key={sponsor.id}>{card}</div>
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
