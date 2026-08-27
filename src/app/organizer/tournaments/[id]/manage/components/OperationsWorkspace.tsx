'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Activity, AlertTriangle, FlaskConical, ListChecks, ShieldAlert, Users } from 'lucide-react';
import type { Match } from '@/types/match';
import type { TournamentParticipant } from '@/types/tournament';
import type { SportRulesEnvelope } from '@/types/tournament';
import type {
  MatchOperationInput,
  MatchScheduleInput,
  OpsActivityItem,
  OpsReferee,
} from '@/features/organizer/ops/types';
import { OpsActivity } from '../../ops/components/OpsActivity';
import { OpsMatches } from '../../ops/components/OpsMatches';
import { OpsParticipants } from '../../ops/components/OpsParticipants';
import { cn } from '@/utils/cn';

interface OperationsWorkspaceProps {
  participants: TournamentParticipant[];
  matches: Match[];
  isOperationalDataLoading: boolean;
  referees: OpsReferee[];
  activeParticipantActionId: string | null;
  activeMatchActionId: string | null;
  focusedMatchId?: string | null;
  onFocusMatch?: (matchId: string) => void;
  tournamentSportRules?: SportRulesEnvelope | null;
  tournamentStatus?: string;
  matchInsights?: Record<string, {
    hasCustomConfig: boolean;
    customConfigSummary: string[];
    dependencyBlocked: boolean;
    dependencySummary: string[];
  }>;
  activityLog: OpsActivityItem[];
  error: string | null;
  onKickParticipant: (participantId: string, reason: string) => Promise<void>;
  onUpdateMatchSchedule: (
    match: Match,
    payload: MatchScheduleInput,
  ) => Promise<void>;
  onApplyMatchOperation: (match: Match, payload: MatchOperationInput) => Promise<void>;
}

export function OperationsWorkspace({
  participants,
  matches,
  isOperationalDataLoading,
  referees,
  activeParticipantActionId,
  activeMatchActionId,
  focusedMatchId,
  onFocusMatch,
  tournamentSportRules,
  tournamentStatus,
  matchInsights,
  activityLog,
  error,
  onKickParticipant,
  onUpdateMatchSchedule,
  onApplyMatchOperation,
}: OperationsWorkspaceProps) {
  const translate = useTranslations('OrganizerOps');
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'PARTICIPANTS' | 'ACTIVITY'>('MATCHES');
  const [currentTimestamp, setCurrentTimestamp] = useState<number | null>(null);

  useEffect(() => {
    const updateTimestamp = () => setCurrentTimestamp(Date.now());
    const initialFrame = window.requestAnimationFrame(updateTimestamp);
    const intervalId = window.setInterval(updateTimestamp, 60_000);

    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.clearInterval(intervalId);
    };
  }, []);

  const pendingAssignments = matches.filter((match) => {
    const matchInsight = matchInsights?.[match.id];
    const isDirectAdvance = match.isBye || (!!match.winnerId && (!match.participant1Id || !match.participant2Id));

    if (match.status !== 'SCHEDULED' || isDirectAdvance || matchInsight?.dependencyBlocked) {
      return false;
    }

    return !!match.participant1Id && !!match.participant2Id && (!match.courtName || !match.refereeId);
  }).length;

  const readyToCall = matches.filter((match) => {
    const matchInsight = matchInsights?.[match.id];
    const isDirectAdvance = match.isBye || (!!match.winnerId && (!match.participant1Id || !match.participant2Id));

    if (match.status !== 'SCHEDULED' || isDirectAdvance || matchInsight?.dependencyBlocked) {
      return false;
    }

    return !!match.participant1Id && !!match.participant2Id && !!match.courtName && !!match.refereeId;
  }).length;
  const overdueStarts = matches.filter((match) => {
    if (!match.scheduledAt || match.status !== 'SCHEDULED') {
      return false;
    }

    return currentTimestamp !== null && new Date(match.scheduledAt).getTime() < currentTimestamp;
  }).length;
  const mockParticipantCount = participants.filter((participant) =>
    participant.members.some((member) => member.isMock),
  ).length;
  const exceptionalMatchCount = matches.filter((match) => {
    const sets = match.scoreDetails?.sets ?? [];
    return Boolean(
      match.scoreDetails?.scoreOverride?.reason ||
      match.scoreDetails?.specialResult?.action ||
      sets.some((set) => set.scoreOverride?.reason),
    );
  }).length;
  const penaltyCount = matches.reduce(
    (total, match) => total + (match.scoreDetails?.penalties?.length ?? 0),
    0,
  );
  const isDraft = tournamentStatus === 'DRAFT';

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">{translate('operationsPanelTitle')}</h2>
        <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">{translate('operationsPanelDescription')}</p>
      </div>

      {isDraft ? (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <FlaskConical className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-700" />
          <div>
            <p className="font-bold">{translate('draftModeTitle')}</p>
            <p className="mt-1 font-medium text-blue-800">{translate('draftModeDescription', { count: mockParticipantCount })}</p>
          </div>
        </div>
      ) : mockParticipantCount > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
          <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
          {translate('mockOutsideDraft', { count: mockParticipantCount })}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">{translate('readyToCall')}</p>
          <p className="mt-2 text-2xl font-bold text-amber-900">{readyToCall}</p>
          <p className="mt-1 text-xs font-medium text-amber-800">{translate('readyToCallDescription')}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">{translate('missingCoordination')}</p>
          <p className="mt-2 text-2xl font-bold text-blue-900">{pendingAssignments}</p>
          <p className="mt-1 text-xs font-medium text-blue-800">{translate('missingCoordinationDescription')}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-100 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{translate('overdueStart')}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{overdueStarts}</p>
          <p className="mt-1 text-xs font-medium text-slate-600">{translate('overdueStartDescription')}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700">{translate('exceptionsDiscipline')}</p>
          <p className="mt-2 text-2xl font-bold text-blue-950">{exceptionalMatchCount + penaltyCount}</p>
          <p className="mt-1 text-xs font-medium text-blue-800">{translate('exceptionsDisciplineDescription', { matches: exceptionalMatchCount, penalties: penaltyCount })}</p>
        </div>
      </section>

      <div className="sticky top-[calc(var(--app-header-height)+1rem)] z-20 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'MATCHES', label: translate('matchesTab'), count: matches.length, icon: ListChecks },
            { id: 'PARTICIPANTS', label: translate('participantsTab'), count: participants.length, icon: Users },
            { id: 'ACTIVITY', label: translate('activityTab'), count: activityLog.length, icon: Activity },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-3 text-xs font-bold transition-colors sm:text-sm',
                  isActive
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{tab.label}</span>
                <span className={isActive ? 'text-slate-300' : 'text-slate-400'}>{tab.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'MATCHES' ? (
        <OpsMatches
          matches={matches}
          isOperationalDataLoading={isOperationalDataLoading}
          error={error}
          referees={referees}
          activeMatchActionId={activeMatchActionId}
          focusedMatchId={focusedMatchId}
          onFocusMatch={onFocusMatch}
          tournamentSportRules={tournamentSportRules}
          matchInsights={matchInsights}
          onUpdateMatchSchedule={onUpdateMatchSchedule}
          onApplyMatchOperation={onApplyMatchOperation}
        />
      ) : null}

      {activeTab === 'PARTICIPANTS' ? (
        <OpsParticipants
          participants={participants}
          activeParticipantActionId={activeParticipantActionId}
          onKickParticipant={onKickParticipant}
        />
      ) : null}

      {activeTab === 'ACTIVITY' ? <OpsActivity activityLog={activityLog} /> : null}
    </section>
  );
}
