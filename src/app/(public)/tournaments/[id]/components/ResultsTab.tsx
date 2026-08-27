'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, Trophy, Crown, Medal, Share2, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { tournamentsApi, type TournamentResult } from '@/features/tournaments/api';
import { triggerShare } from '@/utils/share.util';
import { getUniqueParticipantMembers } from '@/utils/participant-display';

interface ResultsTabProps {
  tournamentId: string;
  divisionId?: string;
  isCompleted?: boolean;
  tournamentName?: string;
}

function ParticipantMembersAvatars({ participant }: { participant: NonNullable<TournamentResult['awards']>[number]['participant'] }) {
  if (!participant) return null;
  const members = getUniqueParticipantMembers(
    participant.members && Array.isArray(participant.members) ? participant.members : [],
  );

  if (members.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex items-center -space-x-2 shrink-0">
        {members.slice(0, 4).map((m, idx) => {
          const fallback = encodeURIComponent(m.fullName || `P${idx + 1}`);
          return (
            <img
              key={m.userId || idx}
              src={m.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${fallback}`}
              alt={m.fullName || participant.teamName}
              className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-xs bg-slate-100"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${fallback}`;
              }}
            />
          );
        })}
      </div>
      {members.length > 0 && (
        <span className="text-xs font-semibold text-slate-600 truncate">
          {members.map((m) => m.fullName).filter(Boolean).join(' • ')}
        </span>
      )}
    </div>
  );
}

export default function ResultsTab({
  tournamentId,
  divisionId,
  isCompleted = false,
  tournamentName,
}: ResultsTabProps) {
  const translate = useTranslations('TournamentDetail');
  const [result, setResult] = useState<TournamentResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const loadResults = async () => {
      try {
        const response = await tournamentsApi.getTournamentResults(tournamentId, divisionId);
        if (active && response.data) {
          setResult(response.data);
          setHasError(false);
        }
      } catch {
        if (active) setHasError(true);
      } finally {
        if (active) {
          setIsLoading(false);
          timer = setTimeout(loadResults, 15000);
        }
      }
    };

    void loadResults();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [divisionId, tournamentId]);

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = {
      title: tournamentName ? `${tournamentName} - ${translate('resultsTabLabel')}` : translate('resultsTabLabel'),
      text: translate('resultsTabOfficialTitle'),
      url,
    };

    const sharedNative = await triggerShare(shareData);
    if (!sharedNative && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success(translate('resultsCopied'));
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard write fallback
      }
    }
  }, [tournamentName, translate]);

  if (isLoading && !result) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-slate-300" />
        <p className="text-sm font-medium text-slate-400">{translate('bracketLoading')}</p>
      </div>
    );
  }

  const awards = (result?.awards ?? [])
    .filter((award) => award.participant)
    .sort((a, b) => a.rank - b.rank);

  const championAward = awards.find((a) => a.rank === 1);
  const runnerUpAward = awards.find((a) => a.rank === 2);
  const otherAwards = awards.filter((a) => a.rank > 2);

  const hasConfirmedResult = awards.length > 0;
  const isFinalized = Boolean(result?.finalized || isCompleted);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Card with Clean Status and Share Action */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950 shadow-sm">
              <Trophy className="h-6 w-6 fill-amber-950 text-amber-950" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {isFinalized ? translate('resultsTabOfficialTitle') : translate('resultsTabCurrentTitle')}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-extrabold uppercase tracking-wider border ${
                    isFinalized
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {isFinalized ? translate('finalizedBadge') : translate('provisionalBadge')}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                {isFinalized ? translate('congratulationsChampion') : translate('resultsTabDescription')}
              </p>
            </div>
          </div>

          {/* Action Bar (Share & Sync) */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {hasError && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 mr-2">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {translate('resultsTabSyncing')}
              </span>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? translate('resultsCopied') : translate('shareResults')}</span>
            </button>
          </div>
        </div>

        {/* Podium Results Cards */}
        {hasConfirmedResult ? (
          <div className="mt-6 flex flex-col gap-4">
            {/* TOP 1 - CHAMPION PODIUM (Solid Gold Accents, Anti-Slop, No Cheesy Gradients) */}
            {championAward && (
              <div className="rounded-xl border-2 border-amber-400 bg-amber-50/40 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 shadow-sm ring-4 ring-amber-100">
                    <Crown className="h-6 w-6 fill-amber-950 text-amber-950" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-950 text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs">
                        🏆 {translate('champion')}
                      </span>
                      <span className="text-xs font-bold text-amber-800">
                        {translate('rank', { rank: 1 })}
                      </span>
                    </div>
                    <h4 className="mt-1 text-base sm:text-xl font-black text-slate-900 truncate">
                      {championAward.participant?.teamName}
                    </h4>
                    <ParticipantMembersAvatars participant={championAward.participant} />
                  </div>
                </div>
              </div>
            )}

            {/* TOP 2 & OTHER AWARDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* RUNNER-UP */}
              {runnerUpAward && (
                <div className="rounded-xl border border-slate-250 bg-slate-50/70 p-4 shadow-xs flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 font-bold shadow-xs">
                    <Medal className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center bg-slate-200 text-slate-800 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                        🥈 {translate('runnerUp')}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {translate('rank', { rank: 2 })}
                      </span>
                    </div>
                    <h5 className="mt-1 text-sm sm:text-base font-extrabold text-slate-900 truncate">
                      {runnerUpAward.participant?.teamName}
                    </h5>
                    <ParticipantMembersAvatars participant={runnerUpAward.participant} />
                  </div>
                </div>
              )}

              {/* OTHER RANKS (Rank 3, 4...) */}
              {otherAwards.map((award) => (
                <div
                  key={`${award.rank}-${award.participant?.participantId}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex items-start gap-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100/60 text-amber-800 font-bold shadow-xs">
                    <span className="text-xs font-black">#{award.rank}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                        🥉 {translate('rank', { rank: award.rank })}
                      </span>
                    </div>
                    <h5 className="mt-1 text-sm sm:text-base font-extrabold text-slate-900 truncate">
                      {award.participant?.teamName}
                    </h5>
                    <ParticipantMembersAvatars participant={award.participant} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-bold text-slate-700">{translate('resultsTabPendingTitle')}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {translate('resultsTabPendingDescription')}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
