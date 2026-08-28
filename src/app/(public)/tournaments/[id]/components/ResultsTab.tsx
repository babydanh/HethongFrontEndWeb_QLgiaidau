import React, { useEffect, useState } from 'react';
import { Crown, Loader2, Share2 } from 'lucide-react';
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

function ParticipantAvatarOnly({
  participant,
  rank,
  size = 'md',
}: {
  participant: AwardParticipant;
  rank: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { openUserById } = useUserProfileModalStore();
  const members = extractParticipantMembers(participant);

  const sizeClasses =
    size === 'lg'
      ? 'h-9 w-9 sm:h-11 sm:w-11 text-[10px] sm:text-xs'
      : size === 'md'
        ? 'h-7 w-7 sm:h-8.5 sm:w-8.5 text-[9px] sm:text-[10.5px]'
        : 'h-6 w-6 sm:h-7 sm:w-7 text-[8px] sm:text-[9.5px]';

  const avatarBorder =
    rank === 1
      ? 'border-2 border-white ring-2 ring-amber-400'
      : rank === 2
        ? 'border-2 border-white ring-2 ring-slate-400'
        : rank === 3
          ? 'border-2 border-white ring-2 ring-orange-400'
          : 'border-2 border-white ring-1 ring-slate-300';

  const fallbackBg =
    rank === 1
      ? 'bg-amber-100 text-amber-900'
      : rank === 2
        ? 'bg-slate-200 text-slate-800'
        : rank === 3
          ? 'bg-orange-100 text-orange-900'
          : 'bg-slate-100 text-slate-700';

  return (
    <div className="flex shrink-0 items-center -space-x-1.5 sm:-space-x-2">
      {members.map((member, index) => {
        const handleMemberClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (member.userId) {
            openUserById(
              member.userId,
              member.fullName,
              member.avatarUrl || null,
              e.currentTarget.getBoundingClientRect(),
            );
          }
        };

        return member.avatarUrl ? (
          <img
            key={member.userId || `${participant.participantId}-${index}`}
            src={member.avatarUrl}
            alt={member.fullName}
            referrerPolicy="no-referrer"
            onClick={handleMemberClick}
            className={`${sizeClasses} rounded-full object-cover cursor-pointer hover:scale-105 transition-transform ${avatarBorder} shadow-2xs`}
            title={member.fullName}
          />
        ) : (
          <button
            key={member.userId || `${participant.participantId}-${index}`}
            type="button"
            onClick={handleMemberClick}
            className={`flex ${sizeClasses} items-center justify-center rounded-full font-black cursor-pointer hover:scale-105 transition-transform ${avatarBorder} shadow-2xs leading-none ${fallbackBg}`}
            title={member.fullName}
          >
            {member.initials}
          </button>
        );
      })}
    </div>
  );
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

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
      <div className="flex shrink-0 items-center -space-x-1.5" aria-label={participant.teamName}>
        {members.map((member, index) => {
          const handleMemberClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (member.userId) {
              openUserById(
                member.userId,
                member.fullName,
                member.avatarUrl || null,
                e.currentTarget.getBoundingClientRect(),
              );
            }
          };

          return member.avatarUrl ? (
            <img
              key={member.userId || `${participant.participantId}-${index}`}
              src={member.avatarUrl}
              alt={member.fullName}
              referrerPolicy="no-referrer"
              onClick={handleMemberClick}
              className={`h-7.5 w-7.5 sm:h-8.5 sm:w-8.5 rounded-full object-cover cursor-pointer hover:scale-105 transition-transform ${ringClasses} shadow-2xs`}
              title={member.fullName}
            />
          ) : (
            <button
              key={member.userId || `${participant.participantId}-${index}`}
              type="button"
              onClick={handleMemberClick}
              className={`flex h-7.5 w-7.5 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full text-[10px] sm:text-[11px] font-black cursor-pointer hover:scale-105 transition-transform leading-none ${fallbackBg} ${ringClasses} shadow-2xs`}
              title={member.fullName}
            >
              {member.initials}
            </button>
          );
        })}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-xs sm:text-sm font-bold text-slate-900 leading-tight" title={participant.teamName}>
          {participant.teamName}
        </h4>
        {isDoubles && (
          <p className="mt-0.5 truncate text-[10px] sm:text-[11px] font-medium text-slate-500 leading-none">
            {members.map((m) => m.fullName).join(' • ')}
          </p>
        )}
      </div>
    </div>
  );
}

function ResultMiniPodium({
  awards,
  getRankLabel,
}: {
  awards: TournamentResultAward[];
  getRankLabel: (rank: number) => string;
}) {
  const gold = awards.find((a) => a.rank === 1);
  const silver = awards.find((a) => a.rank === 2);
  const bronzes = awards.filter((a) => a.rank === 3);

  if (!gold) return null;

  return (
    <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 via-white to-slate-50/50 p-2 sm:p-5 shadow-2xs mb-1 overflow-hidden">
      <div className="flex items-end justify-center gap-1.5 sm:gap-4 max-w-md sm:max-w-lg mx-auto pt-1 sm:pt-2">
        {/* Rank 2 (Silver) - Left */}
        {silver?.participant ? (
          <div className="flex-1 min-w-0 max-w-[105px] sm:max-w-[145px] flex flex-col items-center">
            <div className="flex flex-col items-center mb-1.5 sm:mb-2 w-full px-0.5">
              <span className="mb-0.5 sm:mb-1 text-[9px] sm:text-[10px] font-black uppercase text-slate-500 tracking-wider">
                {getRankLabel(2)}
              </span>
              <div className="mb-1">
                <ParticipantAvatarOnly participant={silver.participant} rank={2} size="md" />
              </div>
              <p
                className="text-[10px] sm:text-xs font-bold text-slate-800 truncate w-full text-center leading-tight mt-0.5"
                title={silver.participant.teamName}
              >
                {silver.participant.teamName}
              </p>
            </div>
            {/* Podium Bar */}
            <div className="w-full h-15 sm:h-20 rounded-t-lg sm:rounded-t-xl bg-gradient-to-t from-slate-200 via-slate-100 to-slate-50 border border-slate-300 flex flex-col items-center justify-center shadow-2xs">
              <span className="text-lg sm:text-2xl font-black text-slate-500 leading-none">2</span>
              <span className="text-[7.5px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Á QUÂN</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0 max-w-[105px] sm:max-w-[145px] h-15 sm:h-20 border border-dashed border-slate-200 rounded-t-lg sm:rounded-t-xl bg-slate-50/40" />
        )}

        {/* Rank 1 (Gold) - Center */}
        {gold?.participant ? (
          <div className="flex-[1.15] min-w-0 max-w-[125px] sm:max-w-[165px] flex flex-col items-center -translate-y-1 sm:-translate-y-2">
            <div className="flex flex-col items-center mb-1.5 sm:mb-2 w-full px-0.5 relative">
              {/* Crown Floating Badge */}
              <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-white shadow-md border border-white sm:border-2 -mb-1.5 sm:-mb-2 z-10">
                <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white drop-shadow-xs" />
              </div>
              <div className="mb-1">
                <ParticipantAvatarOnly participant={gold.participant} rank={1} size="lg" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-600 tracking-wider">
                {getRankLabel(1)}
              </span>
              <p
                className="text-[11px] sm:text-sm font-extrabold text-amber-950 truncate w-full text-center leading-tight mt-0.5"
                title={gold.participant.teamName}
              >
                {gold.participant.teamName}
              </p>
            </div>
            {/* Podium Bar */}
            <div className="w-full h-22 sm:h-28 rounded-t-lg sm:rounded-t-xl bg-gradient-to-t from-amber-300/80 via-amber-200/60 to-amber-50 border-1.5 sm:border-2 border-amber-400 flex flex-col items-center justify-center shadow-sm">
              <span className="text-2xl sm:text-3xl font-black text-amber-700 leading-none">1</span>
              <span className="text-[8px] sm:text-[10px] font-black text-amber-600 uppercase tracking-wider mt-0.5">QUÁN QUÂN</span>
            </div>
          </div>
        ) : null}

        {/* Rank 3 (Bronze) - Right */}
        {bronzes.length > 0 ? (
          <div className="flex-1 min-w-0 max-w-[105px] sm:max-w-[145px] flex flex-col items-center">
            <div className="flex flex-col items-center mb-1.5 sm:mb-2 w-full px-0.5">
              <span className="mb-0.5 sm:mb-1 text-[9px] sm:text-[10px] font-black uppercase text-orange-600 tracking-wider">
                {getRankLabel(3)}
              </span>
              <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
                {bronzes.map((bronze, bIdx) =>
                  bronze.participant ? (
                    <ParticipantAvatarOnly
                      key={bronze.participant.participantId || bIdx}
                      participant={bronze.participant}
                      rank={3}
                      size="md"
                    />
                  ) : null,
                )}
              </div>
              <div className="w-full text-center mt-1">
                {bronzes.map((bronze, bIdx) =>
                  bronze.participant ? (
                    <p
                      key={bronze.participant.participantId || bIdx}
                      className="text-[9.5px] sm:text-[11px] font-bold text-slate-700 truncate w-full leading-tight"
                      title={bronze.participant.teamName}
                    >
                      {bronze.participant.teamName}
                    </p>
                  ) : null,
                )}
              </div>
            </div>
            {/* Podium Bar */}
            <div className="w-full h-12 sm:h-16 rounded-t-lg sm:rounded-t-xl bg-gradient-to-t from-orange-200 via-orange-100 to-orange-50 border border-orange-300 flex flex-col items-center justify-center shadow-2xs">
              <span className="text-base sm:text-xl font-black text-orange-600 leading-none">3</span>
              <span className="text-[7px] sm:text-[9px] font-bold text-orange-500 uppercase tracking-wider mt-0.5">
                {bronzes.length > 1 ? 'ĐỒNG HẠNG 3' : 'HẠNG 3'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0 max-w-[105px] sm:max-w-[145px] h-12 sm:h-16 border border-dashed border-slate-200 rounded-t-lg sm:rounded-t-xl bg-slate-50/40" />
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

        {/* Mini Podium Stage (Bục vinh danh mini: 2 - 1 - 3) */}
        <ResultMiniPodium awards={rawAwards} getRankLabel={getRankLabel} />

        {/* Detailed 2-column list of result cards */}
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
