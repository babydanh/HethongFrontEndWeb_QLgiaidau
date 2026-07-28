'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Tournament } from '@/features/tournaments/api';
import { getTournamentStatusClassName, getTournamentStatusLabel } from '@/utils/tournament-status';

interface Props {
  id?: string;
  title: string;
  actionHref: string;
  actionLabel: string;
  tournaments: Tournament[];
  emptyLabel: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
  icon: ReactNode;
  count?: number;
}

export default function TournamentListSection({
  id, title, actionHref, actionLabel, tournaments, emptyLabel,
  emptyActionHref, emptyActionLabel, icon, count,
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const initialShow = 5;
  const visible = showAll ? tournaments : tournaments.slice(0, initialShow);
  const hasMore = tournaments.length > initialShow;
  const displayCount = count ?? tournaments.length;

  return (
    <section id={id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          {icon}{title}
          <span className="text-xs font-normal text-slate-400">({displayCount})</span>
        </h2>
        <Link href={actionHref} className="text-xs font-semibold text-blue-600 hover:underline shrink-0">
          {actionLabel}
        </Link>
      </div>
      <div className="px-5 py-4">
        {tournaments.length > 0 ? (
          <>
            <div className="flex flex-col divide-y divide-slate-100">
              {visible.map(t => (
                <TournamentRow key={t.id} tournament={t} />
              ))}
            </div>
            {hasMore && (
              <button
                onClick={() => setShowAll(v => !v)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {showAll ? (
                  <><ChevronUp className="w-3.5 h-3.5" /> Thu gọn</>
                ) : (
                  <><ChevronDown className="w-3.5 h-3.5" /> Xem thêm {tournaments.length - initialShow} giải</>
                )}
              </button>
            )}
          </>
        ) : (
          <div className="py-5 text-center text-sm text-slate-400">
            {emptyLabel}
            {emptyActionHref && (
              <> <Link href={emptyActionHref} className="text-blue-600 font-medium underline">{emptyActionLabel}</Link></>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function TournamentRow({ tournament }: { tournament: Tournament }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/tournaments/${tournament.id}`}
            className="text-sm font-semibold text-slate-900 hover:text-blue-600 line-clamp-1 transition-colors"
          >
            {tournament.name}
          </Link>
          <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">
            {[tournament.category?.name, tournament.locationAddress].filter(Boolean).join(' · ')}
            {tournament.startDate && ` · ${new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(tournament.startDate))}`}
          </p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${getTournamentStatusClassName(tournament.status)}`}>
          {getTournamentStatusLabel(tournament.status)}
        </span>
      </div>
    </div>
  );
}
