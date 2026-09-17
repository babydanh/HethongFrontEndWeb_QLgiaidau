import React, { useEffect, useState } from 'react';
import { Loader2, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { tournamentsApi, type TournamentResult, type TournamentResultAward } from '@/features/tournaments/api';
import { hasPublishedTournamentResults } from '@/features/tournaments/result-availability';
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

interface ParsedMember {
  fullName: string;
  avatarUrl?: string | null;
  userId?: string | null;
  initials: string;
}

function getPersonInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function extractParticipantMembers(participant: AwardParticipant): ParsedMember[] {
  const rawMembers = getUniqueParticipantMembers(
    Array.isArray(participant.members) ? participant.members : [],
  ).slice(0, 2);

  if (rawMembers.length > 0) {
    return rawMembers.map((m) => {
      const name = m.fullName?.trim() || participant.teamName;
      return {
        fullName: name,
        avatarUrl: m.avatarUrl,
        userId: m.userId,
        initials: getPersonInitials(name),
      };
    });
  }

  // If members array is empty, check if teamName contains doubles separator " - " or " / "
  const rawName = participant.teamName?.trim() || '';
  if (rawName.includes(' - ') || rawName.includes(' / ')) {
    const parts = rawName.split(/\s*[-/]\s*/).filter(Boolean);
    if (parts.length >= 2) {
      return parts.slice(0, 2).map((part) => ({
        fullName: part.trim(),
        avatarUrl: null,
        userId: null,
        initials: getPersonInitials(part.trim()),
      }));
    }
  }

  return [
    {
      fullName: rawName || '?',
      avatarUrl: null,
      userId: null,
      initials: getPersonInitials(rawName),
    },
  ];
}

function ParticipantAwardIdentity({
  participant,
  rank,
}: {
  participant: AwardParticipant;
  rank: number;
}) {
  const { openUserById } = useUserProfileModalStore();
  const members = extractParticipantMembers(participant);
  const isDoubles = members.length > 1;

  const ringClasses =
    rank === 1
      ? 'border-2 border-white ring-2 ring-amber-400'
      : rank === 2
        ? 'border-2 border-white ring-2 ring-slate-400'
        : rank === 3
          ? 'border-2 border-white ring-2 ring-orange-500'
          : 'border-2 border-white ring-1 ring-slate-300';

  const fallbackBg =
    rank === 1
      ? 'bg-amber-100 text-amber-900'
      : rank === 2
        ? 'bg-slate-200 text-slate-800'
        : rank === 3
          ? 'bg-orange-100 text-orange-900'
          : 'bg-slate-100 text-slate-700';

  const handleMemberClick = (member: ParsedMember, event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (member.userId) {
      openUserById(
        member.userId,
        member.fullName,
        member.avatarUrl || null,
        event.currentTarget.getBoundingClientRect(),
      );
    }
  };

  const renderMemberAvatar = (member: ParsedMember, index: number) => {
    const key = member.userId || `${participant.participantId}-${index}`;
    const avatar = member.avatarUrl ? (
      <img
        src={member.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        className="h-7.5 w-7.5 sm:h-8.5 sm:w-8.5 rounded-full object-cover"
      />
    ) : (
      <span
        aria-hidden="true"
        className={`flex h-7.5 w-7.5 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full text-[10px] sm:text-[11px] font-black leading-none ${fallbackBg}`}
      >
        {member.initials}
      </span>
    );

    if (!member.userId) {
      return (
        <span key={key} className={`flex rounded-full ${ringClasses} shadow-2xs`} title={member.fullName}>
          {avatar}
        </span>
      );
    }

    return (
      <button
        key={key}
        type="button"
        onClick={(event) => handleMemberClick(member, event)}
        aria-label={`Xem hồ sơ ${member.fullName}`}
        title={member.fullName}
        className={`flex cursor-pointer rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${ringClasses} shadow-2xs`}
      >
        {avatar}
      </button>
    );
  };

  const renderMemberName = (member: ParsedMember, index: number) => {
    if (!member.userId) {
      return <span key={`${participant.participantId}-name-${index}`}>{member.fullName}</span>;
    }

    return (
      <button
        key={`${participant.participantId}-name-${index}`}
        type="button"
        onClick={(event) => handleMemberClick(member, event)}
        className="cursor-pointer text-left underline decoration-transparent underline-offset-2 transition-colors hover:text-blue-600 hover:decoration-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {member.fullName}
      </button>
    );
  };

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
      <div className="flex shrink-0 items-center -space-x-1.5" aria-label={participant.teamName}>
        {members.map(renderMemberAvatar)}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-xs sm:text-sm font-bold text-slate-900 leading-tight" title={participant.teamName}>
          {participant.teamName}
        </h4>
        {isDoubles && (
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1 text-[10px] sm:text-[11px] font-medium text-slate-500 leading-none">
            {members.map((member, index) => (
              <React.Fragment key={`${participant.participantId}-name-fragment-${index}`}>
                {index > 0 && <span aria-hidden="true">•</span>}
                {renderMemberName(member, index)}
              </React.Fragment>
            ))}
          </div>
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

  return (
    <article
      className={`rounded-lg border p-2.5 sm:px-3.5 sm:py-2.5 transition-colors shadow-2xs flex items-center justify-between gap-3 min-w-0 ${cardStyles}`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide shrink-0 shadow-2xs ${badgeStyles}`}>
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

function selectTopFourAwards(awards: TournamentResultAward[]): TournamentResultAward[] {
  const seenParticipantIds = new Set<string>();

  const validAwards = awards
    .filter((award) => award.participant && typeof award.rank === 'number' && award.rank >= 1)
    .sort((a, b) => a.rank - b.rank)
    .filter((award) => {
      const participantId = award.participant?.participantId;
      if (!participantId || seenParticipantIds.has(participantId)) return false;
      seenParticipantIds.add(participantId);
      return true;
    })
    .slice(0, 4);

  // If there are awards at index 2 & 3 (3rd & 4th teams):
  // In single elimination / knockout without 3rd place playoff, or where backend marked them shared / rank 3,
  // both are tied 3rd (Đồng Hạng Ba) with rank = 3.
  const hasExplicitRankFour = validAwards.some((a) => a.rank === 4 && !a.shared);

  return validAwards.map((award, index) => {
    if (index === 0) {
      return { ...award, rank: 1, shared: false };
    }
    if (index === 1) {
      return { ...award, rank: 2, shared: false };
    }
    // For index 2 and index 3:
    // If backend marked award as rank 3 or if there's no explicit 3rd-place decider separating them,
    // they are both Tied 3rd Place (Đồng hạng 3).
    if (index === 2 || index === 3) {
      const isTiedThird = !hasExplicitRankFour || award.rank === 3 || award.shared;
      return {
        ...award,
        rank: isTiedThird ? 3 : award.rank,
        shared: isTiedThird ? true : award.shared,
      };
    }
    return award;
  });
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
    tournamentsApi.getTournamentResults(tournamentId, divisionId)
      .then((response) => {
        if (active && response.data) setResult(response.data);
      })
      .catch(() => {
        // Keep the empty state when the one-time snapshot is unavailable.
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
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

  const topFourAwards = selectTopFourAwards(result?.awards ?? []);

  if (!result || !hasPublishedTournamentResults(result) || topFourAwards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
        <p className="text-sm font-bold text-slate-700">{translate('resultsTabPendingTitle')}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{translate('resultsTabPendingDescription')}</p>
      </div>
    );
  }

  const statusTitle = result.finalized
    ? translate('resultsTabOfficialTitle')
    : translate('resultsTabCurrentTitle');

  const getRankLabel = (award: TournamentResultAward) => {
    if (award.rank === 1) return translate('champion') || 'Quán quân';
    if (award.rank === 2) return translate('runnerUp') || 'Á quân';
    if (award.rank === 3) {
      if (award.shared) {
        return translate('sharedRank', { rank: 3 }) || 'Đồng hạng 3';
      }
      return translate('thirdPlace') || 'Hạng ba';
    }
    return translate('rank', { rank: award.rank }) || `Hạng ${award.rank}`;
  };

  const resultShareTitle = `${statusTitle}: ${tournamentName || translate('resultsTabLabel')}`;
  const resultShareText = `${resultShareTitle}\n` + topFourAwards.map(a => `${getRankLabel(a)}: ${a.participant?.teamName ?? ''}`).join('\n');
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
          <div className="min-w-0">
            <h3 id="tournament-results-title" className="truncate text-sm sm:text-base font-extrabold text-slate-950">
              {statusTitle}
            </h3>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500">
              {translate('resultsTabDescription')}
            </p>
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

        <div className="flex flex-col gap-2 sm:gap-2.5">
          {topFourAwards.map((award, index) => (
            <ResultAwardCard
              key={award.participant?.participantId || `${award.rank}-${index}`}
              award={award}
              label={getRankLabel(award)}
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
