'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
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
  roleLabels?: Record<string, string>;
  partners?: Record<string, string>; // tournamentId → partner name
  matchTypeMap?: Record<string, string>; // tournamentId → 'DOUBLES' | 'SINGLES'
}

export function AvatarCircle({ src, name, size = 32 }: { src?: string | null; name: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const logoSrc = (!imgError && src) ? src : '/sporto_v1.svg';

  return (
    <div 
      className="rounded-full bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 p-0.5"
      style={{ width: size, height: size }}
    >
      <img
        src={logoSrc}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className="w-full h-full object-contain rounded-full"
      />
    </div>
  );
}

export default function TournamentListSection({
  id, title, actionHref, actionLabel, tournaments, emptyLabel,
  emptyActionHref, emptyActionLabel, icon, count, partners, matchTypeMap, roleLabels,
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
                <TournamentRow
                  key={t.id}
                  tournament={t}
                  partnerName={partners?.[t.id]}
                  matchType={matchTypeMap?.[t.id]}
                  roleLabel={roleLabels?.[t.id]}
                />
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

function TournamentRow({ tournament, partnerName, matchType, roleLabel }: { tournament: Tournament; partnerName?: string; matchType?: string; roleLabel?: string }) {
  const isDoubles = matchType === 'DOUBLES' || matchType === 'MIXED_DOUBLES';
  const sport = tournament.category?.name;
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <AvatarCircle src={tournament.logoUrl || tournament.bannerUrl} name={tournament.name} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/tournaments/${tournament.id}`}
                className="text-sm font-semibold text-slate-900 hover:text-blue-600 line-clamp-1 transition-colors"
              >
                {tournament.name}
              </Link>
              {roleLabel ? (
                <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-700">
                  {roleLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">
              {sport}
              {tournament.locationAddress && ` · ${tournament.locationAddress}`}
              {tournament.startDate && ` · ${new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(tournament.startDate))}`}
            </p>
            {(isDoubles && partnerName) && (
              <p className="mt-0.5 text-[11px] text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Đồng đội: <span className="font-semibold text-slate-700">{partnerName}</span>
              </p>
            )}
          </div>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${getTournamentStatusClassName(tournament.status)}`}>
          {getTournamentStatusLabel(tournament.status)}
        </span>
      </div>
    </div>
  );
}

