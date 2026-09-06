'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Users, Home } from 'lucide-react';

interface ForbiddenClubTournamentViewProps {
  tournamentId?: string | null;
  communityId?: string | null;
  initialInviteCode?: string | null;
  customMessage?: string | null;
}

export default function ForbiddenClubTournamentView({
  tournamentId,
  communityId,
  initialInviteCode,
  customMessage,
}: ForbiddenClubTournamentViewProps) {
  const translate = useTranslations('TournamentDetail');
  const router = useRouter();
  const [inviteCodeInput, setInviteCodeInput] = React.useState(initialInviteCode || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleApplyInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inviteCodeInput.trim();
    if (!cleanCode) return;
    setIsSubmitting(true);
    if (tournamentId) {
      router.push(`/tournaments/${tournamentId}?invite=${encodeURIComponent(cleanCode)}`);
      router.refresh();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('invite', cleanCode);
      window.location.href = url.toString();
    }
  };

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
        <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto mb-6">
          {customMessage || translate('clubInternalRestrictedDescription')}
        </p>

        {/* Invite Code Input Section */}
        <div className="mb-6 bg-slate-50 rounded-2xl border border-slate-200/80 p-4 text-left">
          <label htmlFor="invite-code-input" className="block text-xs font-bold text-slate-700 mb-1.5">
            Bạn có mã mời tham gia giải?
          </label>
          <form onSubmit={handleApplyInvite} className="flex gap-2">
            <input
              id="invite-code-input"
              type="text"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value)}
              placeholder="Nhập mã mời (Invite Code)..."
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!inviteCodeInput.trim() || isSubmitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Đang mở...' : 'Áp dụng'}
            </button>
          </form>
        </div>

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
