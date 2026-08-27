'use client';

import { useTranslations } from 'next-intl';
import { CalendarClock } from 'lucide-react';
import type { CourtSetupItem } from './CourtSetup';

interface ScheduleBoardMatch {
  id: string;
  roundNumber?: number | null;
  matchOrder?: number | null;
  scheduledAt?: string | null;
  courtId?: string | null;
  participant1?: { teamName?: string | null } | null;
  participant2?: { teamName?: string | null } | null;
}

interface CourtScheduleBoardProps {
  courts: CourtSetupItem[];
  matches: ScheduleBoardMatch[];
  onOpenMatch: (matchId: string) => void;
}

function formatMatchTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function matchLabel(match: ScheduleBoardMatch) {
  return `${match.participant1?.teamName || 'TBD'} vs ${match.participant2?.teamName || 'TBD'}`;
}

export function CourtScheduleBoard({
  courts,
  matches,
  onOpenMatch,
}: CourtScheduleBoardProps) {
  const t = useTranslations('OrganizerManage');
  const scheduledMatches = matches.filter(
    (match) => Boolean(match.scheduledAt && match.courtId),
  );
  const unscheduledMatches = matches.filter(
    (match) => !match.scheduledAt || !match.courtId,
  );

  return (
    <section className="border border-slate-200 rounded-lg bg-white p-5 md:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
        <div>
          <h3 className="text-lg font-bold text-slate-900">{t('tabs.schedule')}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{t('matchSchedule.inherited')}</p>
        </div>
      </div>

      {courts.length === 0 ? (
        <div className="border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          {t('status.notSet')}
        </div>
      ) : (
        <div className="overflow-x-auto" role="region" aria-label={t('matchSchedule.court')} tabIndex={0}>
          <div
            className="grid min-w-[640px] gap-3"
            style={{ gridTemplateColumns: `repeat(${Math.max(courts.length, 1)}, minmax(180px, 1fr))` }}
          >
            {courts.map((court) => {
              const courtMatches = scheduledMatches
                .filter((match) => match.courtId === court.id)
                .sort(
                  (a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime(),
                );

              return (
                <div key={court.id} className="min-h-40 border border-slate-200 bg-slate-50/60">
                  <div className="border-b border-slate-200 bg-white px-3 py-3">
                    <p className="text-sm font-bold text-slate-900">{court.courtName}</p>
                    <p className="mt-1 text-xs text-slate-500">{courtMatches.length} · {t('matchSchedule.court')}</p>
                  </div>
                  <div className="space-y-2 p-2">
                    {courtMatches.length === 0 ? (
                      <p className="px-2 py-4 text-center text-xs text-slate-400">{t('status.notSet')}</p>
                    ) : (
                      courtMatches.map((match) => (
                        <button
                          key={match.id}
                          type="button"
                          onClick={() => onOpenMatch(match.id)}
                          className="w-full border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <p className="text-xs font-bold text-blue-700">{formatMatchTime(match.scheduledAt)}</p>
                          <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-800">{matchLabel(match)}</p>
                          <p className="mt-1 text-[11px] text-slate-500">R{match.roundNumber} · #{match.matchOrder}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {unscheduledMatches.length > 0 && (
        <div className="border-t border-slate-200 pt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-900">{t('roundModal.courtPlaceholder')}</p>
            <span className="text-xs font-semibold text-slate-500">{unscheduledMatches.length}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unscheduledMatches.map((match) => (
              <button
                key={`unscheduled-${match.id}`}
                type="button"
                onClick={() => onOpenMatch(match.id)}
                className="border border-dashed border-slate-300 bg-white px-3 py-3 text-left transition-colors hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <p className="text-sm font-semibold text-slate-800">{matchLabel(match)}</p>
                <p className="mt-1 text-xs text-slate-500">R{match.roundNumber ?? '—'} · #{match.matchOrder ?? '—'}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
