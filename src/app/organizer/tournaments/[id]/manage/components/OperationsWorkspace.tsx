'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, FlaskConical, ListChecks, ShieldAlert, Users } from 'lucide-react';
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
import { cn } from '@/utils/cn';

interface OperationsWorkspaceProps {
  participants: TournamentParticipant[];
  matches: Match[];
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
  tournamentStatus,
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
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">Panel vận hành giải đấu</h2>
        <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
          Màn hình này dùng để theo dõi nhịp chạy thực tế của giải: trận nào sắp gọi vào sân, trận nào đang nghẽn, vấn đề nào chưa chốt và roster nào cần xử lý kỹ thuật.
        </p>
      </div>

      {isDraft ? (
        <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <FlaskConical className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-700" />
          <div>
            <p className="font-black">Chế độ thử nghiệm Draft</p>
            <p className="mt-1 font-medium text-sky-800">
              Bạn có thể thử bracket, lịch, tỷ số và nghiệp vụ với {mockParticipantCount} VĐV/đội ảo. Khi công bố giải, hệ thống xóa toàn bộ participant mock và bracket thử trước khi nhận dữ liệu thi đấu thật.
            </p>
          </div>
        </div>
      ) : mockParticipantCount > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
          <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
          Phát hiện {mockParticipantCount} participant mock ngoài trạng thái Draft. Cần dọn dữ liệu thử trước khi tiếp tục vận hành thật.
        </div>
      ) : null}

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
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-violet-700">Ngoại lệ & kỷ luật</p>
          <p className="mt-2 text-2xl font-black text-violet-950">{exceptionalMatchCount + penaltyCount}</p>
          <p className="mt-1 text-xs font-medium text-violet-800">
            {exceptionalMatchCount} trận có quyết định/ngoại lệ · {penaltyCount} thẻ hoặc hình phạt.
          </p>
        </div>
      </section>

      <div className="sticky top-20 z-20 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'MATCHES', label: 'Trận đấu', count: matches.length, icon: ListChecks },
            { id: 'PARTICIPANTS', label: 'Thành viên', count: participants.length, icon: Users },
            { id: 'ACTIVITY', label: 'Nhật ký', count: activityLog.length, icon: Activity },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-black transition-colors sm:text-sm',
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
