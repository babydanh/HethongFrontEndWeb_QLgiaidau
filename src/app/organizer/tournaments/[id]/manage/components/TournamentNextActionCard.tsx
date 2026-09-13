'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Users,
  GitMerge,
  Radio,
  Copy,
  Check,
  UserPlus,
  ArrowRight,
  Sparkles,
  Trophy,
  Share2,
} from 'lucide-react';
import type { Tournament, TournamentParticipant } from '@/types/tournament';
import type { Division } from '@/features/tournaments/api';
import type { Match } from '@/types/match';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface TournamentNextActionCardProps {
  tournament: Tournament;
  participants: TournamentParticipant[];
  divisions: Division[];
  matches: Match[];
  onOpenRegistration: () => void;
  onOpenBracket: () => void;
  onOpenOperations: () => void;
}

export function TournamentNextActionCard({
  tournament,
  participants,
  divisions,
  matches,
  onOpenRegistration,
  onOpenBracket,
  onOpenOperations,
}: TournamentNextActionCardProps) {
  const t = useTranslations('OrganizerManage.nextAction');
  const [copied, setCopied] = useState(false);

  const participantCount =
    tournament._summary?.participantCount ?? participants.length;
  const matchCount = matches.length;
  const isLive = ['IN_PROGRESS', 'ONGOING', 'LIVE', 'ACTIVE'].includes(
    tournament.status,
  );
  const isFinished = tournament.status === 'COMPLETED';

  // Determine current primary stage
  // Stage 1: Needs players (0 or very few players)
  // Stage 2: Ready to generate bracket (has players, but 0 matches)
  // Stage 3: Live match scoring & tournament operations
  let currentStage: 1 | 2 | 3 = 1;
  if (isFinished || isLive || matchCount > 0) {
    currentStage = 3;
  } else if (participantCount >= 2) {
    currentStage = 2;
  } else {
    currentStage = 1;
  }

  const handleCopyRegistrationLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/tournaments/${tournament.id}?tab=register`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(t('copySuccess'));
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-200/90 bg-gradient-to-br from-blue-50/90 via-white to-sky-50/70 p-4 sm:p-5 shadow-xs transition-all">
      {/* Background soft glow decoration */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-blue-400/10 blur-2xl" />

      {/* Header Progress Roadmap: 3 Simple Steps */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100/80 pb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950">
              {t('flowTitle')}
            </h3>
            <p className="text-[11px] text-slate-500">{t('flowSubtitle')}</p>
          </div>
        </div>

        {/* 3 Steps Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white/80 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
          {/* Step 1 */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
              currentStage === 1
                ? 'bg-blue-600 text-white shadow-2xs'
                : participantCount > 0
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-slate-400'
            }`}
          >
            {participantCount > 0 && currentStage > 1 ? (
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
            ) : (
              <span>1</span>
            )}
            <span className="text-[11px] font-semibold">{t('step1Short')}</span>
          </div>

          <span className="text-slate-300 font-bold">›</span>

          {/* Step 2 */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
              currentStage === 2
                ? 'bg-blue-600 text-white shadow-2xs'
                : matchCount > 0
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-slate-400'
            }`}
          >
            {matchCount > 0 ? (
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
            ) : (
              <span>2</span>
            )}
            <span className="text-[11px] font-semibold">{t('step2Short')}</span>
          </div>

          <span className="text-slate-300 font-bold">›</span>

          {/* Step 3 */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
              currentStage === 3
                ? isFinished
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-400'
            }`}
          >
            {isFinished ? (
              <Trophy className="h-3.5 w-3.5" />
            ) : (
              <span>3</span>
            )}
            <span className="text-[11px] font-semibold">{t('step3Short')}</span>
          </div>
        </div>
      </div>

      {/* Main Focus Content depending on currentStage */}
      {currentStage === 1 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">
                {t('step1Badge')}
              </span>
              <h4 className="text-sm font-bold text-slate-900 sm:text-base">
                {t('step1Title')}
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {participantCount === 0 ? t('step1DescEmpty') : t('step1DescCount', { count: participantCount })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyRegistrationLink}
              className="h-9 border-blue-200 bg-white font-semibold text-xs text-blue-700 hover:bg-blue-50/80 shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  {t('copied')}
                </>
              ) : (
                <>
                  <Share2 className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                  {t('copyLink')}
                </>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onOpenRegistration}
              className="h-9 bg-blue-600 px-3.5 font-bold text-xs text-white hover:bg-blue-700 shadow-xs"
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              {t('addPlayerAction')}
            </Button>
          </div>
        </div>
      )}

      {currentStage === 2 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                {t('step2Badge')}
              </span>
              <h4 className="text-sm font-bold text-slate-900 sm:text-base">
                {t('step2Title')}
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('step2Desc', { count: participantCount, divisionCount: divisions.length })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenRegistration}
              className="h-9 border-slate-200 bg-white font-semibold text-xs text-slate-700 hover:bg-slate-50"
            >
              <Users className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              {t('viewPlayersAction')}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onOpenBracket}
              className="h-9 bg-blue-600 px-4 font-bold text-xs text-white hover:bg-blue-700 shadow-xs"
            >
              <GitMerge className="mr-1.5 h-3.5 w-3.5" />
              {t('generateBracketAction')}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {currentStage === 3 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  isFinished
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {isFinished ? t('step3FinishedBadge') : t('step3LiveBadge')}
              </span>
              <h4 className="text-sm font-bold text-slate-900 sm:text-base">
                {isFinished ? t('step3FinishedTitle') : t('step3LiveTitle')}
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isFinished
                ? t('step3FinishedDesc', { matchCount })
                : t('step3LiveDesc', { matchCount })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenBracket}
              className="h-9 border-slate-200 bg-white font-semibold text-xs text-slate-700 hover:bg-slate-50"
            >
              <GitMerge className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              {t('viewBracketAction')}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onOpenOperations}
              className="h-9 bg-blue-600 px-4 font-bold text-xs text-white hover:bg-blue-700 shadow-xs"
            >
              <Radio className="mr-1.5 h-3.5 w-3.5" />
              {t('enterScoresAction')}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
