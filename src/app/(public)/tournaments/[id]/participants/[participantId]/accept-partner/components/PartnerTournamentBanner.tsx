'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { CalendarDays, Clock3, MapPin, Trophy } from 'lucide-react';

import type { Tournament } from '@/features/tournaments/api';
import { getSportLogo } from '@/constants/sports';
import { formatCurrency, formatDate } from '@/utils/format';
import { getTournamentLocationLabel } from '@/utils/tournament-location';

interface PartnerTournamentBannerProps {
  tournament: Tournament;
}

const FORMAT_TRANSLATION_KEYS: Record<Tournament['format'], string> = {
  SINGLE_ELIMINATION: 'formatSingleElimination',
  DOUBLE_ELIMINATION: 'formatDoubleElimination',
  ROUND_ROBIN: 'formatRoundRobin',
  GROUP_STAGE_KNOCKOUT: 'formatGroupStageKnockout',
};

const getDateRange = (tournament: Tournament, notScheduled: string): string => {
  if (!tournament.startDate) return notScheduled;
  const start = formatDate(tournament.startDate);
  if (!tournament.endDate) return start;
  return `${start} – ${formatDate(tournament.endDate)}`;
};

export default function PartnerTournamentBanner({ tournament }: PartnerTournamentBannerProps) {
  const translate = useTranslations('AcceptPartner');
  const locationLabel = getTournamentLocationLabel(tournament);
  const sportLogo = getSportLogo(tournament.category?.name);
  const formatLabel = translate(FORMAT_TRANSLATION_KEYS[tournament.format] ?? 'formatUnknown');
  const entryFee = Number(tournament.entryFee || 0);
  const registrationDeadline = tournament.registrationEndDate
    ? formatDate(tournament.registrationEndDate)
    : translate('notScheduled');

  return (
    <section
      aria-label={translate('tournamentOverview')}
      className="relative isolate min-h-[320px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl shadow-slate-900/10 md:min-h-[400px]"
    >
      <div className="absolute inset-0">
        {tournament.bannerUrl ? (
          <Image
            src={tournament.bannerUrl}
            alt={tournament.name}
            fill
            priority
            unoptimized
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950">
            {sportLogo ? (
              <Image
                src={sportLogo}
                alt={tournament.category?.name || translate('defaultSport')}
                width={220}
                height={220}
                unoptimized
                className="h-40 w-40 object-contain opacity-20 md:h-56 md:w-56"
              />
            ) : (
              <Trophy aria-hidden="true" className="h-40 w-40 text-white/10 md:h-56 md:w-56" />
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/70 to-slate-950/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/35 via-transparent to-slate-950/30" />
      </div>

      <div className="relative flex min-h-[320px] flex-col justify-between p-5 text-white sm:p-7 md:min-h-[400px] md:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100 backdrop-blur-sm">
            {sportLogo ? (
              <Image
                src={sportLogo}
                alt=""
                width={16}
                height={16}
                unoptimized
                className="h-4 w-4 object-contain"
              />
            ) : (
              <Trophy aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {tournament.category?.name || translate('defaultSport')}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            {tournament.status === 'REGISTRATION_OPEN'
              ? translate('statusRegistrationOpen')
              : translate('statusUpcoming')}
          </span>
        </div>

        <div className="mt-10 max-w-2xl">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/80">
            {translate('tournamentOverview')}
          </p>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
            {tournament.name}
          </h1>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-blue-100/75">
                <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-blue-200" />
                {translate('competitionDates')}
              </div>
              <p className="mt-1.5 text-xs font-bold leading-relaxed text-white">{getDateRange(tournament, translate('notScheduled'))}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-blue-100/75">
                <Clock3 aria-hidden="true" className="h-3.5 w-3.5 text-amber-200" />
                {translate('registrationDeadline')}
              </div>
              <p className="mt-1.5 text-xs font-bold leading-relaxed text-white">{registrationDeadline}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-blue-100/75">
                <Trophy aria-hidden="true" className="h-3.5 w-3.5 text-violet-200" />
                {translate('formatLabel')}
              </div>
              <p className="mt-1.5 text-xs font-bold leading-relaxed text-white">{formatLabel}</p>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-3 rounded-xl border border-blue-200/20 bg-blue-500/20 p-3.5 backdrop-blur-sm">
            <MapPin aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-rose-200" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-100/75">{translate('venueLabel')}</p>
              <p className="mt-1 break-words text-sm font-extrabold leading-relaxed text-white">
                {locationLabel || translate('venueNotUpdated')}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-200">
            <span>
              {translate('entryFeeTitle')}: {entryFee > 0 ? formatCurrency(entryFee) : translate('entryFeeFree')}
            </span>
            {tournament.maxParticipants ? (
              <span>
                {translate('capacityLabel')}: {tournament.maxParticipants}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
