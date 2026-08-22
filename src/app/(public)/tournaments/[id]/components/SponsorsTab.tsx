'use client';

import { ExternalLink, Handshake } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { TournamentSponsor } from '@/features/tournaments/api';

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
        {grouped.map((group) => (
          <section key={group.tier} aria-labelledby={`sponsor-tier-${group.tier}`}>
            <h3
              id={`sponsor-tier-${group.tier}`}
              className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400"
            >
              <span className="h-px flex-1 bg-slate-200" />
              <span>{translate(`sponsors.tiers.${group.tier}`)}</span>
              <span className="h-px flex-1 bg-slate-200" />
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {group.sponsors.map((sponsor) => {
                const card = (
                  <div className="flex h-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-amber-300">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-2">
                      <img
                        src={sponsor.logoUrl}
                        alt={sponsor.displayName}
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-900">{sponsor.displayName}</p>
                      {sponsor.shortDescription && (
                        <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-slate-500">
                          {sponsor.shortDescription}
                        </p>
                      )}
                      {sponsor.websiteUrl && (
                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                          {translate('sponsors.visitWebsite')}
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      )}
                    </div>
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
        ))}
      </div>
    </section>
  );
}
