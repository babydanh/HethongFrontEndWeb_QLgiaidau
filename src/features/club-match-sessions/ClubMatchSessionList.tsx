'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ChevronRight, Plus, UsersRound } from 'lucide-react';
import type { ClubMatchSession } from '@/types/club-match-session';

function SessionStatus({ status, label }: { status: ClubMatchSession['status']; label: string }) {
  const classes = {
    OPEN: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    LIVE: 'border-rose-200 bg-rose-50 text-rose-700',
    CLOSED: 'border-slate-200 bg-slate-100 text-slate-600',
    ENDED: 'border-slate-200 bg-slate-100 text-slate-600',
    CANCELLED: 'border-rose-200 bg-rose-50 text-rose-700',
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${classes}`}>
      {(status === 'OPEN' || status === 'LIVE') && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {label}
    </span>
  );
}

export function ClubMatchSessionCard({
  session,
  communityId,
}: {
  session: ClubMatchSession;
  communityId: string;
}) {
  const t = useTranslations('ClubMatchSession');
  const href = session.pairingMode === 'BRACKET' && session.bracketTournamentId
    ? session.capabilities?.canManage
      ? `/organizer/tournaments/${session.bracketTournamentId}/manage?tab=bracket`
      : `/tournaments/${session.bracketTournamentId}?tab=bracket`
    : `/communities/${communityId}/match-sessions/${session.id}`;
  const isBracket = session.pairingMode === 'BRACKET';

  return (
    <Link
      href={href}
      className="group flex min-h-[132px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isBracket ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
            <UsersRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-900 group-hover:text-blue-700">{session.resolvedName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isBracket ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                {isBracket ? t('bracketMode') : t('freeMode')}
              </span>
              {session.isRanked && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{t('rankedShort')}</span>}
            </div>
          </div>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" aria-hidden="true" />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{session.participantCount ?? 0}{session.maxParticipants ? `/${session.maxParticipants}` : ''}</span>
          <span>{t('participants')}</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span>{session.matchCount ?? 0} {t('matches')}</span>
        </div>
        <SessionStatus status={session.status} label={t(`status.${session.status}`)} />
      </div>
    </Link>
  );
}

export function ClubMatchSessionCardSkeleton() {
  return (
    <div className="min-h-[132px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-hidden="true">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
      <div className="mt-6 h-3 w-full animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export function ClubMatchSessionListHeader({ communityId }: { communityId: string }) {
  const t = useTranslations('ClubMatchSession');
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <UsersRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="club-match-sessions-title" className="text-lg font-bold tracking-tight text-slate-900">{t('listTitle')}</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-500">{t('listDescription')}</p>
        </div>
      </div>
      <Link
        href={`/communities/${communityId}/match-sessions/create`}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {t('create')}
      </Link>
    </div>
  );
}
