'use client';

import { AlertTriangle } from 'lucide-react';
import type { Match } from '@/types/match';
import type { TournamentParticipant } from '@/types/tournament';
import type { SportRulesEnvelope } from '@/types/tournament';
import type {
  MatchOperationInput,
  MatchScheduleInput,
  MatchScoreInput,
  OpsActivityItem,
  OpsReferee,
} from '@/features/organizer/ops/types';
import { OpsActivity } from '../../ops/components/OpsActivity';
import { OpsMatches } from '../../ops/components/OpsMatches';
import { OpsOverview } from '../../ops/components/OpsOverview';
import { OpsParticipants } from '../../ops/components/OpsParticipants';

interface OperationsWorkspaceProps {
  participants: TournamentParticipant[];
  matches: Match[];
  referees: OpsReferee[];
  activeParticipantActionId: string | null;
  activeMatchActionId: string | null;
  focusedMatchId?: string | null;
  onFocusMatch?: (matchId: string) => void;
  tournamentSportRules?: SportRulesEnvelope | null;
  matchInsights?: Record<string, {
    hasCustomConfig: boolean;
    customConfigSummary: string[];
    dependencyBlocked: boolean;
    dependencySummary: string[];
  }>;
  activityLog: OpsActivityItem[];
  error: string | null;
  summary: {
    totalParticipants: number;
    kickedParticipants: number;
    unpaidParticipants: number;
    scheduledMatches: number;
    ongoingMatches: number;
    completedMatches: number;
  };
  onKickParticipant: (participantId: string, reason: string) => Promise<void>;
  onUpdateMatchStatus: (match: Match, status: Match['status']) => Promise<void>;
  onUpdateMatchSchedule: (
    match: Match,
    payload: MatchScheduleInput,
  ) => Promise<void>;
  onUpdateMatchScore: (match: Match, payload: MatchScoreInput) => Promise<void>;
  onApplyMatchOperation: (match: Match, payload: MatchOperationInput) => Promise<void>;
}

export function OperationsWorkspace({
  participants,
  matches,
  referees,
  activeParticipantActionId,
  activeMatchActionId,
  focusedMatchId,
  onFocusMatch,
  tournamentSportRules,
  matchInsights,
  activityLog,
  error,
  summary,
  onKickParticipant,
  onUpdateMatchStatus,
  onUpdateMatchSchedule,
  onUpdateMatchScore,
  onApplyMatchOperation,
}: OperationsWorkspaceProps) {
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

    return new Date(match.scheduledAt).getTime() < Date.now();
  }).length;

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">Panel vận hành giải đấu</h2>
        <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
          Màn hình này dùng để theo dõi nhịp chạy thực tế của giải: trận nào sắp gọi vào sân, trận nào đang nghẽn, vấn đề nào chưa chốt và roster nào cần xử lý kỹ thuật.
        </p>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <OpsOverview summary={summary} />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-600">Sẵn sàng gọi vào sân</p>
          <p className="mt-2 text-2xl font-black text-amber-900">{readyToCall}</p>
          <p className="mt-1 text-xs font-medium text-amber-800">Trận đã có sân và trọng tài, có thể chuyển sang trạng thái thi đấu ngay.</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-blue-600">Thiếu điều phối</p>
          <p className="mt-2 text-2xl font-black text-blue-900">{pendingAssignments}</p>
          <p className="mt-1 text-xs font-medium text-blue-800">Trận chưa gán đủ sân hoặc trọng tài.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Quá giờ chưa start</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{overdueStarts}</p>
          <p className="mt-1 text-xs font-medium text-slate-600">Trận đã qua giờ dự kiến nhưng vẫn chưa bắt đầu.</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6">
        <OpsMatches
          matches={matches}
          referees={referees}
          activeMatchActionId={activeMatchActionId}
          focusedMatchId={focusedMatchId}
          onFocusMatch={onFocusMatch}
          tournamentSportRules={tournamentSportRules}
          matchInsights={matchInsights}
          onUpdateMatchStatus={onUpdateMatchStatus}
          onUpdateMatchSchedule={onUpdateMatchSchedule}
          onUpdateMatchScore={onUpdateMatchScore}
          onApplyMatchOperation={onApplyMatchOperation}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <OpsParticipants
          participants={participants}
          activeParticipantActionId={activeParticipantActionId}
          onKickParticipant={onKickParticipant}
        />
      </div>

      <OpsActivity activityLog={activityLog} />
    </section>
  );
}
