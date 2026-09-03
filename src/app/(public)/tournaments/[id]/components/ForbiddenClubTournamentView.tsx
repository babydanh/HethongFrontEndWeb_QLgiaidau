'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Users, Home } from 'lucide-react';

interface ForbiddenClubTournamentViewProps {
  communityId?: string | null;
  customMessage?: string | null;
}

export default function ForbiddenClubTournamentView({
  communityId,
  customMessage,
}: ForbiddenClubTournamentViewProps) {
  const translate = useTranslations('TournamentDetail');
  const router = useRouter();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        {/* Icon Container */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 shadow-sm shadow-amber-500/5">
          <ShieldAlert className="h-10 w-10" />
        </div>

        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200/60 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {translate('clubInternalRestrictedTitle')}
        </span>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-2.5">
          {translate('clubInternalRestrictedTitle')}
        </h1>

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto mb-8">
          {customMessage || translate('clubInternalRestrictedDescription')}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {communityId ? (
            <Link
              href={`/communities/${communityId}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 transition-colors"
            >
              <Users className="h-4 w-4" />
              <span>{translate('goToClub')}</span>
            </Link>
          ) : (
            <Link
              href="/communities"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 transition-colors"
            >
              <Users className="h-4 w-4" />
              <span>{translate('exploreClubs')}</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{translate('goBack')}</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>{translate('backHome')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
