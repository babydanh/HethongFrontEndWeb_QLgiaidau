import React, { useEffect, useState } from 'react';
import { Loader2, Share2, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { tournamentsApi, type TournamentResult, type TournamentResultAward } from '@/features/tournaments/api';
import ShareModal from '@/components/common/ShareModal';
import { getUniqueParticipantMembers } from '@/utils/participant-display';

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

function ParticipantAwardIdentity({ participant }: { participant: AwardParticipant }) {
  const members = getUniqueParticipantMembers(
    Array.isArray(participant.members) ? participant.members : [],
  ).slice(0, 2);
  const memberNames = members.map((member) => member.fullName?.trim()).filter(Boolean).join(' / ');

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex shrink-0 items-center -space-x-2" aria-label={participant.teamName}>
        {members.length > 0 ? members.map((member, index) => {
          const fallback = getInitials(member.fullName || participant.teamName);
          return member.avatarUrl ? (
            <img
              key={member.userId || `${participant.participantId}-${index}`}
              src={member.avatarUrl}
              alt={member.fullName || participant.teamName}
              referrerPolicy="no-referrer"
              className="h-11 w-11 rounded-full border-2 border-white bg-slate-100 object-cover shadow-sm"
            />
          ) : (
            <span
              key={member.userId || `${participant.participantId}-${index}`}
              className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-black text-slate-600 shadow-sm"
              title={member.fullName || participant.teamName}
            >
              {fallback}
            </span>
          );
        }) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-black text-slate-600 shadow-sm">
            {getInitials(participant.teamName)}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <h4 className="truncate text-base font-black text-slate-950 sm:text-lg" title={participant.teamName}>
          {participant.teamName}
        </h4>
        {memberNames && (
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500" title={memberNames}>
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
  rank: 1 | 2;
}) {
  if (!award.participant) return null;
  const isChampion = rank === 1;

  return (
    <article
      className={`rounded-2xl border p-4 sm:p-5 ${
        isChampion
          ? 'border-amber-300 bg-amber-50/70'
          : 'border-slate-200 bg-slate-50/70'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`text-[11px] font-black uppercase tracking-[0.16em] ${
            isChampion ? 'text-amber-800' : 'text-slate-600'
          }`}
        >
          {label}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <ParticipantAwardIdentity participant={award.participant} />
        <span className={`shrink-0 text-2xl font-black ${isChampion ? 'text-amber-700' : 'text-slate-500'}`}>
          {rank}
        </span>
      </div>
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

  const awards = (result?.awards ?? [])
    .filter((award) => award.participant && (award.rank === 1 || award.rank === 2))
    .sort((a, b) => a.rank - b.rank);
  const championAward = awards.find((award) => award.rank === 1);
  const runnerUpAward = awards.find((award) => award.rank === 2);
  if (!result || !championAward || !runnerUpAward) {
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
  const championName = championAward.participant?.teamName ?? '';
  const runnerUpName = runnerUpAward.participant?.teamName ?? '';
  const resultShareTitle = `${statusTitle}: ${tournamentName || translate('resultsTabLabel')}`;
  const resultShareText = `${resultShareTitle}\n${translate('rank', { rank: 1 })}: ${championName}\n${translate('rank', { rank: 2 })}: ${runnerUpName}`;
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
      <section className="flex flex-col gap-4" aria-labelledby="tournament-results-title">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div className="min-w-0">
              <h3 id="tournament-results-title" className="truncate text-base font-black text-slate-950 sm:text-lg">
                {statusTitle}
              </h3>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {translate('resultsTabDescription')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            <span>{translate('shareResults')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ResultAwardCard
            award={championAward}
            label={translate('champion')}
            rank={1}
          />
          <ResultAwardCard
            award={runnerUpAward}
            label={translate('runnerUp')}
            rank={2}
          />
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
