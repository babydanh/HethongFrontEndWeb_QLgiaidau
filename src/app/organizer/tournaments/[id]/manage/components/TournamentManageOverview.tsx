'use client';

import {
  Activity,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  MapPin,
  Trophy,
  Users,
} from 'lucide-react';
import type { Division } from '@/features/tournaments/api';
import type { Match } from '@/types/match';
import type { Tournament, TournamentParticipant } from '@/types/tournament';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';
import { useTranslations } from 'next-intl';

interface TournamentManageOverviewProps {
  tournament: Tournament;
  divisions: Division[];
  selectedDivisionId: string;
  participants: TournamentParticipant[];
  matches: Match[];
  courts: Array<{ id: string; courtName: string; status?: string }>;
  statusLabel: string;
  onOpenOperations: () => void;
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Trophy;
  tone: 'blue' | 'emerald' | 'amber' | 'violet';
}) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 truncate text-[11px] font-medium text-slate-500">{detail}</p>
        </div>
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1', toneClasses)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function getTeamName(match: Match, side: 1 | 2) {
  const participant = side === 1 ? match.participant1 : match.participant2;
  if (participant?.teamName) return participant.teamName;
  return side === 1 ? 'Đội A' : 'Đội B';
}

function getLatestSetScore(match: Match) {
  const sets = match.scoreDetails?.sets;
  if (!sets?.length) return null;
  const latest = sets[sets.length - 1];
  return `${latest.team1Score} – ${latest.team2Score}`;
}

export function TournamentManageOverview({
  tournament,
  divisions,
  selectedDivisionId,
  participants,
  matches,
  courts,
  statusLabel,
  onOpenOperations,
}: TournamentManageOverviewProps) {
  const t = useTranslations('OrganizerManage');
  const selectedDivision = divisions.find((division) => division.id === selectedDivisionId);
  const summary = tournament._summary;
  const totalMatches = summary?.matchesTotal ?? matches.length;
  const completedMatches = summary?.matchesCompleted ?? matches.filter((match) => match.status === 'COMPLETED').length;
  const liveMatches = matches.filter((match) => match.status === 'ONGOING');
  const liveCount = summary?.matchesLive ?? liveMatches.length;
  const progress = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">{t('overview.eyebrow')}</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{t('overview.title')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('overview.description')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden="true" />
            {statusLabel}
          </span>
          <Button type="button" variant="outline" onClick={onOpenOperations} className="h-9 text-xs font-bold">
            {t('overview.openOperations')} <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t('overview.divisionsLabel')} value={String(divisions.length)} detail={t('overview.divisionsDetail')} icon={Trophy} tone="blue" />
        <MetricCard label={t('overview.participantsLabel')} value={String(participants.length)} detail={selectedDivision?.name || t('overview.noDivision')} icon={Users} tone="emerald" />
        <MetricCard label={t('overview.matchProgressLabel')} value={`${completedMatches}/${totalMatches}`} detail={t('overview.matchProgressDetail', { progress, live: liveCount })} icon={Activity} tone="amber" />
        <MetricCard label={t('overview.courtsLabel')} value={String(courts.length)} detail={courts.length ? t('overview.courtsReady') : t('overview.courtsEmpty')} icon={MapPin} tone="violet" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.8fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5" aria-labelledby="manage-live-title">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', liveMatches.length ? 'animate-pulse bg-rose-500' : 'bg-slate-300')} aria-hidden="true" />
                <h3 id="manage-live-title" className="text-base font-bold text-slate-900">{t('overview.liveTitle')}</h3>
              </div>
              <p className="mt-1 text-xs text-slate-500">{t('overview.liveDescription')}</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{t('overview.liveCount', { count: liveCount })}</span>
          </div>

          {liveMatches.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {liveMatches.slice(0, 4).map((match) => {
                const setScore = getLatestSetScore(match);
                return (
                  <div key={match.id} className="rounded-xl border border-rose-100 bg-rose-50/50 p-3.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-rose-700">
                      <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true" /> {t('overview.liveBadge')}</span>
                      <span>{match.courtName || t('overview.courtNotSet')}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="min-w-0 space-y-1.5 text-sm font-bold text-slate-800">
                        <p className="truncate">{getTeamName(match, 1)}</p>
                        <p className="truncate">{getTeamName(match, 2)}</p>
                      </div>
                      <div className="text-right text-sm font-bold text-slate-900">
                        <p>{match.p1SetsWon}</p>
                        <p>{match.p2SetsWon}</p>
                      </div>
                    </div>
                    {setScore ? <p className="mt-3 inline-flex rounded-md bg-white px-2 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">{t('overview.currentSet', { score: setScore })}</p> : null}
                  </div>
                );
              })}
            </div>
          ) : liveCount > 0 ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-800">
              <CircleAlert className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
              {t('overview.livePartial')}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              <CircleAlert className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              {t('overview.noLive')}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5" aria-labelledby="manage-readiness-title">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            <h3 id="manage-readiness-title" className="text-base font-bold text-slate-900">{t('overview.readinessTitle')}</h3>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold text-slate-800">{t('overview.dateLabel')}</p>
                <p className="mt-0.5 text-xs text-slate-500">{tournament.startDate ? formatDate(tournament.startDate) : t('overview.notSet')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
              <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold text-slate-800">{t('overview.selectedDivisionLabel')}</p>
                <p className="mt-0.5 text-xs text-slate-500">{selectedDivision?.name || t('overview.noDivision')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold text-slate-800">{t('overview.courtsLabel')}</p>
                <p className="mt-0.5 text-xs text-slate-500">{courts.length ? t('overview.courtsConfigured', { count: courts.length }) : t('overview.courtsNeedSetup')}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
