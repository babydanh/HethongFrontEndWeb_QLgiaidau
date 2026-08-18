'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Shield, Trophy } from 'lucide-react';
import type { FootballTeam } from '@/features/tournaments/api';
import type { FootballTeamRanking } from '@/features/rankings/api';

interface Props {
  team: FootballTeam;
  ranking?: FootballTeamRanking | null;
  position?: number | null;
}

export default function FootballTeamEloCard({ team, ranking, position }: Props) {
  const translate = useTranslations('Common');
  const rank = ranking ?? team.rank;
  const matchesPlayed = rank?.matchesPlayed ?? 0;
  const eloPoints = rank?.eloPoints ?? 1000;
  const tierLabel = matchesPlayed > 0 ? rank?.tierName || translate('ranked') : translate('unranked');

  return (
    <section className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{translate('teamElo')}</span>
        <Link href="/football-teams" className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800">{translate('manageTeam')}</Link>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50 text-sm font-black text-emerald-700">
          {team.logoUrl ? <img src={team.logoUrl} alt={`Logo ${team.name}`} className="h-full w-full object-cover" /> : team.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-slate-900">{team.name}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">{team.membership?.role === 'CAPTAIN' ? translate('teamCaptain') : team.membership?.role === 'MANAGER' ? translate('teamManager') : translate('teamMember')}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
        <div><p className="text-[10px] text-slate-400">ELO</p><p className="text-lg font-black tabular-nums text-emerald-700">{eloPoints}</p></div>
        <div><p className="text-[10px] text-slate-400">{translate('rank')}</p><p className="text-sm font-black tabular-nums text-slate-900">{position ? `#${position}` : '—'}</p></div>
        <div><p className="text-[10px] text-slate-400">Trạng thái</p><p className="truncate text-xs font-bold text-slate-700">{tierLabel}</p></div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
        {matchesPlayed > 0 ? <Trophy className="h-3.5 w-3.5 text-amber-500" /> : <Shield className="h-3.5 w-3.5 text-slate-400" />}
        {matchesPlayed > 0 ? translate('matchesSummary', { played: matchesPlayed, won: rank?.matchesWon ?? 0 }) : translate('noRankedMatch')}
      </p>
    </section>
  );
}
