'use client';

import {
  Activity,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Download,
  ExternalLink,
  FileSpreadsheet,
  MapPin,
  Trophy,
  Users,
  ChevronRight,
} from 'lucide-react';
import type { Division } from '@/features/tournaments/api';
import type { Match } from '@/types/match';
import type { Tournament, TournamentParticipant } from '@/types/tournament';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';
import { exportTournamentResultsExcel } from '@/utils/exportTournament';
import { useLocale, useTranslations } from 'next-intl';

interface TournamentManageOverviewProps {
  tournament: Tournament;
  divisions: Division[];
  selectedDivisionId: string;
  participants: TournamentParticipant[];
  matches: Match[];
  courts: Array<{ id: string; courtName: string; status?: string }>;
  statusLabel: string;
  onOpenOperations: () => void;
  onSelectDivision?: (divisionId: string) => void;
  onOpenBracket?: () => void;
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
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
  onSelectDivision,
  onOpenBracket,
}: TournamentManageOverviewProps) {
  const t = useTranslations('OrganizerManage');
  const locale = useLocale();
  const summary = tournament._summary;
  const totalMatches = summary?.matchesTotal ?? matches.length;
  const completedMatches = summary?.matchesCompleted ?? matches.filter((match) => match.status === 'COMPLETED').length;
  const liveMatches = matches.filter((match) => match.status === 'ONGOING');
  const liveCount = summary?.matchesLive ?? liveMatches.length;
  const progress = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 4 KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('overview.participantsLabel')}
          value={String(summary?.participantCount ?? participants.length)}
          detail={divisions.length ? `${divisions.length} nội dung` : t('overview.noDivision')}
          icon={Users}
          tone="blue"
        />
        <MetricCard
          label={t('overview.matchProgressLabel')}
          value={`${completedMatches}/${totalMatches}`}
          detail={t('overview.matchProgressDetail', { progress, live: liveCount })}
          icon={Activity}
          tone="amber"
        />
        <MetricCard
          label={t('overview.divisionsLabel')}
          value={String(divisions.length)}
          detail={t('overview.divisionsDetail')}
          icon={Trophy}
          tone="emerald"
        />
        <MetricCard
          label={t('overview.courtsLabel')}
          value={String(courts.length)}
          detail={courts.length ? t('overview.courtsReady') : t('overview.courtsEmpty')}
          icon={MapPin}
          tone="violet"
        />
      </div>

      {/* 2-Column Section: Left (Results/Standings) + Right (Quick Actions & Status) */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        {/* Left Column: Kết quả giải đấu / Trận đấu */}
        <div className="space-y-4">
          {/* Live matches if any */}
          {liveMatches.length > 0 && (
            <section className="rounded-xl border border-rose-200 bg-white p-4 shadow-xs" aria-labelledby="manage-live-title">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full animate-pulse bg-rose-500" aria-hidden="true" />
                  <h3 id="manage-live-title" className="text-sm font-bold text-slate-900">{t('overview.liveTitle')}</h3>
                </div>
                <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  {t('overview.liveCount', { count: liveCount })}
                </span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {liveMatches.slice(0, 4).map((match) => {
                  const setScore = getLatestSetScore(match);
                  return (
                    <div key={match.id} className="rounded-lg border border-rose-100 bg-rose-50/40 p-3">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-rose-700">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true" /> {t('overview.liveBadge')}
                        </span>
                        <span className="text-slate-500">{match.courtName || t('overview.courtNotSet')}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs font-bold text-slate-800">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate">{getTeamName(match, 1)}</p>
                          <p className="truncate">{getTeamName(match, 2)}</p>
                        </div>
                        <div className="text-right text-xs font-extrabold text-slate-900">
                          <p>{match.p1SetsWon}</p>
                          <p>{match.p2SetsWon}</p>
                        </div>
                      </div>
                      {setScore ? (
                        <p className="mt-2 inline-flex rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-blue-700 ring-1 ring-blue-100">
                          {t('overview.currentSet', { score: setScore })}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Results Summary by Division */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs" aria-labelledby="manage-results-title">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 id="manage-results-title" className="text-sm font-bold text-slate-900">
                  {t('overview.resultsTitle')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{t('overview.resultsSubtitle')}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => exportTournamentResultsExcel(tournament.name, matches, locale)}
                disabled={matches.length === 0}
                className="h-7 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Download className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                {t('sidebar.exportResults')}
              </Button>
            </div>

            {divisions.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {divisions.map((div) => {
                  const divMatches = matches.filter((m) => m.divisionId === div.id);
                  const divCompleted = divMatches.filter((m) => m.status === 'COMPLETED').length;
                  const divTotal = divMatches.length;
                  const divPct = divTotal > 0 ? Math.round((divCompleted / divTotal) * 100) : 0;
                  const isSelected = div.id === selectedDivisionId;

                  return (
                    <div
                      key={div.id}
                      onClick={() => onSelectDivision?.(div.id)}
                      className={cn(
                        'flex items-center justify-between py-2.5 px-2 rounded-lg transition-colors cursor-pointer',
                        isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50',
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700 text-xs font-bold">
                          <Trophy className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className={cn('truncate text-xs font-bold', isSelected ? 'text-blue-900' : 'text-slate-800')}>
                            {div.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {div.maxParticipants ? `${div.maxParticipants} VĐV / đội` : 'Không giới hạn quy mô'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-700">
                            {divTotal > 0 ? `${divCompleted}/${divTotal} trận` : 'Chưa có trận'}
                          </p>
                          {divTotal > 0 && (
                            <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-600 transition-all"
                                style={{ width: `${divPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                <Trophy className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">{t('overview.noDivision')}</p>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Tác vụ nhanh & Trạng thái */}
        <div className="space-y-4">
          {/* Quick Actions Card */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs" aria-labelledby="manage-quick-tasks-title">
            <h3 id="manage-quick-tasks-title" className="text-sm font-bold text-slate-900 mb-0.5">
              {t('overview.quickTasksTitle')}
            </h3>
            <p className="text-xs text-slate-500 mb-3">{t('overview.quickTasksSubtitle')}</p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => exportTournamentResultsExcel(tournament.name, matches, locale)}
                disabled={matches.length === 0}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-2.5 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>{t('sidebar.exportResults')}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={onOpenBracket}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-2.5 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-600" />
                  <span>{t('overview.viewStandings')}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => window.open(`/tournaments/${tournament.id}`, '_blank')}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-2.5 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-blue-600" />
                  <span>{t('overview.openPublic')}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
          </section>

          {/* Empty / Live state reminder if no live matches */}
          {liveMatches.length === 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-slate-500 shadow-xs">
              <CircleAlert className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <div className="text-xs">
                <p className="font-bold text-slate-700">{t('overview.noLiveMatchesYet')}</p>
                <p className="text-slate-400 mt-0.5">{t('overview.noLiveSubtitle')}</p>
              </div>
            </div>
          )}

          {/* Readiness Details */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs" aria-labelledby="manage-readiness-title">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <h3 id="manage-readiness-title" className="text-sm font-bold text-slate-900">
                {t('overview.readinessTitle')}
              </h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-2.5">
                <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
                <div>
                  <p className="font-bold text-slate-800">{t('overview.dateLabel')}</p>
                  <p className="text-slate-500 mt-0.5">
                    {tournament.startDate ? formatDate(tournament.startDate) : t('overview.notSet')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-2.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" aria-hidden="true" />
                <div>
                  <p className="font-bold text-slate-800">{t('overview.courtsLabel')}</p>
                  <p className="text-slate-500 mt-0.5">
                    {courts.length ? t('overview.courtsConfigured', { count: courts.length }) : t('overview.courtsNeedSetup')}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

