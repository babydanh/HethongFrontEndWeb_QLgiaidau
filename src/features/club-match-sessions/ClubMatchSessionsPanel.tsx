'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { clubMatchSessionsApi } from './api';
import {
  ClubMatchSessionCard,
  ClubMatchSessionCardSkeleton,
  ClubMatchSessionListHeader,
} from './ClubMatchSessionList';
import type { ClubMatchSession } from '@/types/club-match-session';

export function ClubMatchSessionsPanel({ communityId }: { communityId: string }) {
  const t = useTranslations('ClubMatchSession');
  const [items, setItems] = useState<ClubMatchSession[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError(false);
    try {
      const response = await clubMatchSessionsApi.list(communityId, { cursor });
      setItems((current) => cursor
        ? [...current, ...response.data.filter((item) => !current.some((existing) => existing.id === item.id))]
        : response.data);
      setNextCursor(response.meta.nextCursor);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    let active = true;
    clubMatchSessionsApi.list(communityId)
      .then((response) => {
        if (!active) return;
        setItems(response.data);
        setNextCursor(response.meta.nextCursor);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [communityId]);

  return (
    <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="club-match-sessions-title">
      <ClubMatchSessionListHeader communityId={communityId} />
      {loading && items.length === 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2" role="status" aria-label={t('loading')}>
          <ClubMatchSessionCardSkeleton />
          <ClubMatchSessionCardSkeleton />
        </div>
      )}
      {error && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3" role="alert">
          <p className="text-sm font-semibold text-rose-700">{t('loadFailed')}</p>
          <button type="button" className="text-sm font-bold text-rose-800 underline underline-offset-2" onClick={() => void load()}>
            {t('retry')}
          </button>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-slate-700">{t('empty')}</p>
          <Link href={`/communities/${communityId}/match-sessions/create`} className="mt-3 inline-flex text-sm font-bold text-blue-700 underline underline-offset-2">
            {t('create')}
          </Link>
        </div>
      )}
      {items.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map((session) => <ClubMatchSessionCard key={session.id} session={session} communityId={communityId} />)}
        </div>
      )}
      {nextCursor && !error && (
        <button type="button" disabled={loading} className="mt-5 inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void load(nextCursor)}>
          {t('loadMore')}
        </button>
      )}
    </section>
  );
}
