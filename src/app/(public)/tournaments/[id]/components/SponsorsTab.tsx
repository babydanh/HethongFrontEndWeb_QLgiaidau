'use client';

import { ExternalLink, Handshake } from 'lucide-react';
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
    <section aria-labelledby="sponsors-heading" className="space-y-8">
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
          return (
            <section key={group.tier} aria-labelledby={`sponsor-tier-${group.tier}`}>
              <h3
                id={`sponsor-tier-${group.tier}`}
                className={cn('mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em]', groupTierStyle.accentClassName)}
              >
                <span className="h-px flex-1 bg-slate-200" />
                <span>{translate(`sponsors.tiers.${group.tier}`)}</span>
                <span className="h-px flex-1 bg-slate-200" />
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
              {group.sponsors.map((sponsor) => {
                const tierStyle = getSponsorTierStyle(sponsor.tier);
                const initials = sponsor.displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SP';
                const card = (
                  <div className={cn('flex h-full flex-col border border-t-4 bg-white p-4 shadow-sm transition-shadow hover:shadow-md', tierStyle.surfaceClassName, tierStyle.accentBorderClassName)}>
                    <div className="flex flex-col items-center text-center">
                      <SponsorLogo
                        logoUrl={sponsor.logoUrl}
                        alt={sponsor.displayName}
                        initials={initials}
                        className={cn('h-28 w-full max-w-[280px] border-b p-3', tierStyle.logoFrameClassName)}
                        imageClassName="h-full w-full"
                      />
                      <p className="mt-3 w-full truncate font-black text-slate-900">{sponsor.displayName}</p>
                      <span className={cn('mt-1 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide', tierStyle.badgeClassName)}>
                        {translate(`sponsors.tiers.${sponsor.tier}`)}
                      </span>
                    </div>
                    {sponsor.shortDescription && (
                      <p className="mt-4 line-clamp-2 text-center text-sm font-medium leading-5 text-slate-500">
                        {sponsor.shortDescription}
                      </p>
                    )}
                    {sponsor.websiteUrl && (
                      <span className="mt-4 inline-flex items-center justify-center gap-1 text-xs font-bold text-blue-600">
                        {translate('sponsors.visitWebsite')}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
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
