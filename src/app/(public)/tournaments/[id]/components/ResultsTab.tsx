import React, { useEffect, useState } from 'react';
import { Loader2, Share2, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { tournamentsApi, type TournamentResult, type TournamentResultAward } from '@/features/tournaments/api';
import ShareModal from '@/components/common/ShareModal';
import { getUniqueParticipantMembers } from '@/utils/participant-display';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';

interface ResultsTabProps {
  tournamentId: string;
  divisionId?: string;
  isCompleted?: boolean;
  tournamentName?: string;
}

type AwardParticipant = NonNullable<TournamentResultAward['participant']>;

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words.at(-1)?.[0] ?? ''}` : words[0]?.[0] ?? '?').toUpperCase();
}

function ParticipantAwardIdentity({
  participant,
  rank,
}: {
  participant: AwardParticipant;
  rank: number;
}) {
  const { openUserById } = useUserProfileModalStore();
  const members = getUniqueParticipantMembers(
    Array.isArray(participant.members) ? participant.members : [],
  ).slice(0, 2);
  const memberNames = members.map((member) => member.fullName?.trim()).filter(Boolean).join(' / ');

  const ringClasses =
    rank === 1
      ? 'ring-2 ring-amber-400 border border-white shadow-2xs'
      : rank === 2
        ? 'ring-2 ring-slate-400 border border-white shadow-2xs'
        : rank === 3
          ? 'ring-2 ring-orange-500 border border-white shadow-2xs'
          : 'ring-1 ring-slate-300 border border-white shadow-2xs';

  const fallbackBg =
    rank === 1
      ? 'bg-amber-100 text-amber-900'
      : rank === 2
        ? 'bg-slate-200 text-slate-800'
        : rank === 3
          ? 'bg-orange-100 text-orange-900'
          : 'bg-slate-100 text-slate-700';

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
      <div className="flex shrink-0 items-center -space-x-1.5" aria-label={participant.teamName}>
        {members.length > 0 ? (
          members.map((member, index) => {
            const fallback = getInitials(member.fullName || participant.teamName);
            const handleMemberClick = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (member.userId) {
                openUserById(
                  member.userId,
                  member.fullName || undefined,
                  member.avatarUrl || null,
                  e.currentTarget.getBoundingClientRect(),
                );
              }
            };

            return member.avatarUrl ? (
              <img
                key={member.userId || `${participant.participantId}-${index}`}
                src={member.avatarUrl}
                alt={member.fullName || participant.teamName}
                referrerPolicy="no-referrer"
                onClick={handleMemberClick}
                className={`h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-full object-cover cursor-pointer hover:scale-105 transition-transform ${ringClasses}`}
                title={member.fullName || participant.teamName}
              />
            ) : (
              <button
                key={member.userId || `${participant.participantId}-${index}`}
                type="button"
                onClick={handleMemberClick}
                className={`flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full text-[11px] font-black cursor-pointer hover:scale-105 transition-transform ${fallbackBg} ${ringClasses}`}
                title={member.fullName || participant.teamName}
              >
                {fallback}
              </button>
            );
          })
        ) : (
          <span
            className={`flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full text-[11px] font-black ${fallbackBg} ${ringClasses}`}
          >
            {getInitials(participant.teamName)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-xs sm:text-sm font-bold text-slate-900 leading-tight" title={participant.teamName}>
          {participant.teamName}
        </h4>
        {memberNames && (
          <p className="mt-0.5 truncate text-[10px] sm:text-[11px] font-medium text-slate-500 leading-none" title={memberNames}>
            {memberNames}
          </p>
        )}
      </div>
    </div>
  );
}

function ResultAwardCard({
  award,
  label,
  rank,
}: {
  award: TournamentResultAward;
  label: string;
  rank: number;
}) {
  if (!award.participant) return null;

  const isGold = rank === 1;
  const isSilver = rank === 2;
  const isBronze = rank === 3;

  const cardStyles = isGold
    ? 'border-amber-400 bg-amber-50/40 hover:bg-amber-50/70'
    : isSilver
      ? 'border-slate-300 bg-slate-50/60 hover:bg-slate-50/90'
      : isBronze
        ? 'border-orange-300 bg-orange-50/40 hover:bg-orange-50/70'
        : 'border-slate-200 bg-white hover:bg-slate-50';

  const badgeStyles = isGold
    ? 'bg-amber-500 text-white'
    : isSilver
      ? 'bg-slate-600 text-white'
      : isBronze
        ? 'bg-orange-600 text-white'
        : 'bg-slate-500 text-white';

  const rankNumberColor = isGold
    ? 'text-amber-600'
    : isSilver
      ? 'text-slate-500'
      : isBronze
        ? 'text-orange-600'
        : 'text-slate-400';

  const rankIcon = isGold ? '👑' : isSilver ? '🥈' : isBronze ? '🥉' : '🎖️';

  return (
    <article
      className={`rounded-lg border p-2.5 sm:px-3.5 sm:py-2.5 transition-colors shadow-2xs flex items-center justify-between gap-3 min-w-0 ${cardStyles}`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide shrink-0 shadow-2xs ${badgeStyles}`}>
          <span>{rankIcon}</span>
          <span>{label}</span>
        </span>
        <div className="min-w-0 flex-1">
          <ParticipantAwardIdentity participant={award.participant} rank={rank} />
        </div>
      </div>
      <span className={`shrink-0 text-lg sm:text-xl font-black ${rankNumberColor}`}>
        {rank}
      </span>
    </article>
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
        if (active && response.data) setResult(response.data);
      } catch {
        // Keep the last confirmed snapshot and let the next bounded refresh retry.
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

  const rawAwards = (result?.awards ?? [])
    .filter((award) => award.participant && typeof award.rank === 'number' && award.rank >= 1)
    .sort((a, b) => a.rank - b.rank);

  if (!result || rawAwards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
        <p className="text-sm font-bold text-slate-700">{translate('resultsTabPendingTitle')}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{translate('resultsTabPendingDescription')}</p>
      </div>
    );
  }

  const rank3Count = rawAwards.filter((a) => a.rank === 3).length;
  const isRank3Shared = rank3Count > 1;

  const statusTitle = result.finalized
    ? translate('resultsTabOfficialTitle')
    : translate('resultsTabCurrentTitle');

  const getRankLabel = (rank: number) => {
    if (rank === 1) return translate('champion') || 'Quán quân';
    if (rank === 2) return translate('runnerUp') || 'Á quân';
    if (rank === 3) return isRank3Shared ? 'Đồng hạng 3' : (translate('thirdPlace') || 'Hạng ba');
    return translate('rank', { rank }) || `Hạng ${rank}`;
  };

  const resultShareTitle = `${statusTitle}: ${tournamentName || translate('resultsTabLabel')}`;
  const resultShareText = `${resultShareTitle}\n` + rawAwards.map(a => `${getRankLabel(a.rank)}: ${a.participant?.teamName ?? ''}`).join('\n');
  const shareUrl = typeof window !== 'undefined'
    ? (() => {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'results');
      url.searchParams.set('share', 'results');
      if (divisionId) url.searchParams.set('divisionId', divisionId);
      return url.toString();
    })()
    : '';

  return (
    <>
      <section className="flex flex-col gap-3" aria-labelledby="tournament-results-title">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-2.5">
          <div className="flex min-w-0 items-start gap-2">
            <Trophy className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600" aria-hidden="true" />
            <div className="min-w-0">
              <h3 id="tournament-results-title" className="truncate text-sm sm:text-base font-extrabold text-slate-950">
                {statusTitle}
              </h3>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">
                {translate('resultsTabDescription')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{translate('shareResults')}</span>
          </button>
        </div>

        {/* Slim, elegant 2-column or 1-column standing list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5">
          {rawAwards.map((award, index) => (
            <ResultAwardCard
              key={award.participant?.participantId || `${award.rank}-${index}`}
              award={award}
              label={getRankLabel(award.rank)}
              rank={award.rank}
            />
          ))}
        </div>
      </section>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={shareUrl}
        title={resultShareTitle}
        shareText={resultShareText}
      />
    </>
  );
}
