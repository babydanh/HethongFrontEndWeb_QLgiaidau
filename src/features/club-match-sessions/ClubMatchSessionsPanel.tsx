'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { clubMatchSessionsApi } from './api';
import type { ClubMatchSession } from '@/types/club-match-session';

export function ClubMatchSessionsPanel({ communityId }: { communityId: string }) {
  const t = useTranslations('ClubMatchSession');
  const [items, setItems] = useState<ClubMatchSession[]>([]);

  useEffect(() => {
    void clubMatchSessionsApi
      .list(communityId)
      .then((response) => setItems(response.data ?? []))
      .catch(() => setItems([]));
  }, [communityId]);

  return (
    <section className="mb-8 rounded-xl border border-violet-200 bg-violet-50/50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-bold text-slate-950">{t('listTitle')}</h2><p className="mt-1 text-xs text-slate-600">{t('listDescription')}</p></div>
        <Link className="text-sm font-bold text-violet-700 hover:underline" href={`/communities/${communityId}/match-sessions/create`}>{t('create')}</Link>
      </div>
      {items.length === 0 ? <p className="mt-4 text-sm text-slate-500">{t('empty')}</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{items.map((session) => <Link key={session.id} href={`/communities/${communityId}/match-sessions/${session.id}`} className="rounded-lg border border-violet-200 bg-white p-4 hover:border-violet-400"><div className="font-semibold text-slate-900">{session.resolvedName}</div><div className="mt-1 text-xs text-slate-500">{t(`status.${session.status}`)} · {t('counts', { participants: session.participantCount ?? 0, matches: session.matchCount ?? 0 })}</div></Link>)}</div>}
    </section>
  );
}
