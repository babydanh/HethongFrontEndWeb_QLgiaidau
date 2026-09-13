'use client';

import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  MapPin,
  Trophy,
  ChevronRight,
} from 'lucide-react';
import type { Division } from '@/features/tournaments/api';
import type { Match } from '@/types/match';
import type { Tournament, TournamentParticipant } from '@/types/tournament';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';
import { useTranslations } from 'next-intl';
import { TournamentQuickManagePanel } from './TournamentQuickManagePanel';
import { TournamentNextActionCard } from './TournamentNextActionCard';

interface TournamentManageOverviewProps {
  tournament: Tournament;
  divisions: Division[];
  selectedDivisionId: string;
  participants: TournamentParticipant[];
  matches: Match[];
  courts: Array<{ id: string; courtName: string; status?: string }>;
  statusLabel: string;
  onOpenOperations: () => void;
  onOpenRegistration: () => void;
  onOpenSchedule: () => void;
  onSelectDivision?: (divisionId: string) => void;
  onOpenBracket: () => void;
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
  onOpenRegistration,
  onOpenSchedule,
  onSelectDivision,
  onOpenBracket,
}: TournamentManageOverviewProps) {
  const t = useTranslations('OrganizerManage');
  const liveMatches = matches.filter((match) => match.status === 'ONGOING');
  const liveCount = matches.length > 0 ? liveMatches.length : tournament._summary?.matchesLive ?? 0;

  return (
    <div className="space-y-4">
      <TournamentNextActionCard
        tournament={tournament}
        participants={participants}
        divisions={divisions}
        matches={matches}
        onOpenRegistration={onOpenRegistration}
        onOpenBracket={onOpenBracket}
        onOpenOperations={onOpenOperations}
      />

      <TournamentQuickManagePanel
        tournament={tournament}
        participants={participants}
        divisions={divisions}
        matches={matches}
        statusLabel={statusLabel}
        onOpenRegistration={onOpenRegistration}
        onOpenSchedule={onOpenSchedule}
        onOpenBracket={onOpenBracket}
        onOpenOperations={onOpenOperations}
      />

      {/* 2-Column Section: Left (Results/Standings) + Right (Status & Readiness) */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
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
            <div className="mb-3">
              <h3 id="manage-results-title" className="text-sm font-bold text-slate-900">
                {t('overview.resultsTitle')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{t('overview.resultsSubtitle')}</p>
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

        {/* Right Column: Trạng thái & Sẵn sàng vận hành */}
        <div className="space-y-4">

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

