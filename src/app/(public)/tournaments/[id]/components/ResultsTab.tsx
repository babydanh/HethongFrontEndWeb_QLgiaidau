'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Share2, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { tournamentsApi, type TournamentResult } from '@/features/tournaments/api';
import ShareModal from '@/components/common/ShareModal';
import { getUniqueParticipantMembers } from '@/utils/participant-display';

interface ResultsTabProps {
  tournamentId: string;
  divisionId?: string;
  isCompleted?: boolean;
  tournamentName?: string;
}

function ParticipantMembersAvatars({
  participant,
}: {
  participant: NonNullable<TournamentResult['awards']>[number]['participant'];
}) {
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
      <span className="text-xs font-semibold text-slate-600 truncate">
        {members.map((m) => m.fullName).filter(Boolean).join(' • ')}
      </span>
    </div>
  );
}

export default function ResultsTab({
  tournamentId,
  divisionId,
  tournamentName,
}: ResultsTabProps) {
  const translate = useTranslations('TournamentDetail');
  const [result, setResult] = useState<TournamentResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const loadResults = async () => {
      try {
        const response = await tournamentsApi.getTournamentResults(tournamentId, divisionId);
        if (active && response.data) {
          setResult(response.data);
        }
      } catch {
        // results error handled silently
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

  const hasConfirmedResult = Boolean(championAward && runnerUpAward);

  if (!hasConfirmedResult) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
        <p className="text-sm font-bold text-slate-700">{translate('resultsTabPendingTitle')}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          {translate('resultsTabPendingDescription')}
        </p>
      </div>
    );
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = tournamentName
    ? `${tournamentName} - ${translate('resultsTabLabel')}`
    : translate('resultsTabLabel');

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Top Header Bar with Clean Share Action */}
        <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" />
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              {translate('resultsTabLabel')}
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{translate('shareResults')}</span>
          </button>
        </div>

        {/* Podium Cards */}
        <div className="flex flex-col gap-3.5">
          {/* TOP 1 - QUÁN QUÂN */}
          {championAward && (
            <div className="rounded-xl border-2 border-amber-400 bg-amber-50/50 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center bg-amber-400 text-amber-950 text-[10.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-2xs">
                  🏆 {translate('champion')}
                </span>
                <span className="text-xs font-bold text-amber-800">
                  {translate('rank', { rank: 1 })}
                </span>
              </div>
              <h4 className="text-base sm:text-xl font-black text-slate-900 truncate">
                {championAward.participant?.teamName}
              </h4>
              <ParticipantMembersAvatars participant={championAward.participant} />
            </div>
          )}

          {/* TOP 2 - Á QUÂN */}
          {runnerUpAward && (
            <div className="rounded-xl border border-slate-250 bg-slate-50/80 p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center bg-slate-200 text-slate-800 text-[10.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                  🥈 {translate('runnerUp')}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {translate('rank', { rank: 2 })}
                </span>
              </div>
              <h5 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                {runnerUpAward.participant?.teamName}
              </h5>
              <ParticipantMembersAvatars participant={runnerUpAward.participant} />
            </div>
          )}

          {/* OTHER AWARDS */}
          {otherAwards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              {otherAwards.map((award) => (
                <div
                  key={`${award.rank}-${award.participant?.participantId}`}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                      🥉 {translate('rank', { rank: award.rank })}
                    </span>
                  </div>
                  <h5 className="text-sm font-bold text-slate-900 truncate">
                    {award.participant?.teamName}
                  </h5>
                  <ParticipantMembersAvatars participant={award.participant} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={shareUrl}
        title={shareTitle}
      />
    </>
  );
}
