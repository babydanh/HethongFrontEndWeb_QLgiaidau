'use client';

import { AlertTriangle } from 'lucide-react';
import type { Match } from '@/types/match';
import type { TournamentParticipant } from '@/types/tournament';
import type { MatchOperationInput, MatchScheduleInput, OpsActivityItem, OpsDisputeItem, OpsReferee } from '@/features/organizer/ops/types';
import { OpsActivity } from '../../ops/components/OpsActivity';
import { OpsDisputes } from '../../ops/components/OpsDisputes';
import { OpsMatches } from '../../ops/components/OpsMatches';
import { OpsOverview } from '../../ops/components/OpsOverview';
import { OpsParticipants } from '../../ops/components/OpsParticipants';

interface OperationsWorkspaceProps {
  participants: TournamentParticipant[];
  matches: Match[];
  disputes: OpsDisputeItem[];
  referees: OpsReferee[];
  activeParticipantActionId: string | null;
  activeMatchActionId: string | null;
  canModerateRegistration: boolean;
  activityLog: OpsActivityItem[];
  error: string | null;
  summary: {
    totalParticipants: number;
    approvedParticipants: number;
    pendingParticipants: number;
    kickedParticipants: number;
    unpaidParticipants: number;
    scheduledMatches: number;
    ongoingMatches: number;
    completedMatches: number;
    openDisputes: number;
  };
  onApproveParticipant: (participantId: string) => Promise<void>;
  onRejectParticipant: (participantId: string) => Promise<void>;
  onKickParticipant: (participantId: string, reason: string) => Promise<void>;
  onUpdateMatchStatus: (match: Match, status: Match['status']) => Promise<void>;
  onUpdateMatchSchedule: (
    match: Match,
    payload: MatchScheduleInput,
  ) => Promise<void>;
  onUpdateMatchScore: (match: Match, payload: { p1SetsWon: number; p2SetsWon: number }) => Promise<void>;
  onApplyMatchOperation: (match: Match, payload: MatchOperationInput) => Promise<void>;
  onCreateDispute: (match: Match, reason: string) => Promise<void>;
  onResolveDispute: (
    disputeId: string,
    resolutionNote: string,
    matchStatus?: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'DISPUTED',
  ) => Promise<void>;
}

export function OperationsWorkspace({
  participants,
  matches,
  disputes,
  referees,
  activeParticipantActionId,
  activeMatchActionId,
  canModerateRegistration,
  activityLog,
  error,
  summary,
  onApproveParticipant,
  onRejectParticipant,
  onKickParticipant,
  onUpdateMatchStatus,
  onUpdateMatchSchedule,
  onUpdateMatchScore,
  onApplyMatchOperation,
  onCreateDispute,
  onResolveDispute,
}: OperationsWorkspaceProps) {
  const pendingAssignments = matches.filter((match) => match.status === 'SCHEDULED' && (!match.courtName || !match.refereeId)).length;
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
          Quản lý participant, điều phối trận, cập nhật tỉ số và theo dõi lưu vết vận hành ngay trong cùng màn hình quản trị của giải.
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
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-600">Cần duyệt ngay</p>
          <p className="mt-2 text-2xl font-black text-amber-900">{summary.pendingParticipants}</p>
          <p className="mt-1 text-xs font-medium text-amber-800">Hồ sơ đăng ký đang chờ quyết định của BTC.</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-rose-600">Tranh chấp mở</p>
          <p className="mt-2 text-2xl font-black text-rose-900">{summary.openDisputes}</p>
          <p className="mt-1 text-xs font-medium text-rose-800">Những trận cần kết luận trước khi luồng giải đi tiếp.</p>
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr]">
        <OpsParticipants
          participants={participants}
          activeParticipantActionId={activeParticipantActionId}
          canModerateRegistration={canModerateRegistration}
          onApproveParticipant={onApproveParticipant}
          onRejectParticipant={onRejectParticipant}
          onKickParticipant={onKickParticipant}
        />
        <OpsMatches
          matches={matches}
          referees={referees}
          activeMatchActionId={activeMatchActionId}
          onUpdateMatchStatus={onUpdateMatchStatus}
          onUpdateMatchSchedule={onUpdateMatchSchedule}
          onUpdateMatchScore={onUpdateMatchScore}
          onApplyMatchOperation={onApplyMatchOperation}
          onCreateDispute={onCreateDispute}
        />
      </div>

      <OpsDisputes
        disputes={disputes}
        activeActionId={activeMatchActionId}
        onResolveDispute={onResolveDispute}
      />

      <OpsActivity activityLog={activityLog} />
    </section>
  );
}
