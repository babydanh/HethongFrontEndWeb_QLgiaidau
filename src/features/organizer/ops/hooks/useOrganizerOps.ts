'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { divisionsApi, Division, tournamentsApi } from '@/features/tournaments/api';
import { matchesApi } from '@/features/matches/api';
import type { Match } from '@/types/match';
import type { Tournament, TournamentParticipant } from '@/types/tournament';
import { getErrorMessage } from '@/utils/error';
import type {
  MatchOperationInput,
  MatchScheduleInput,
  MatchScoreInput,
  OpsActivityItem,
  OpsAuditLogResponse,
  OpsReferee,
} from '../types';

const buildOpsActivityStorageKey = (tournamentId: string) => `organizer_ops_activity_${tournamentId}`;

interface UseOrganizerOpsOptions {
  selectedDivisionId?: string;
  onSelectedDivisionIdChange?: (divisionId: string) => void;
}

interface UseOrganizerOpsResult {
  tournament: Tournament | null;
  divisions: Division[];
  referees: OpsReferee[];
  selectedDivisionId: string;
  setSelectedDivisionId: (divisionId: string) => void;
  participants: TournamentParticipant[];
  matches: Match[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  activeParticipantActionId: string | null;
  activeMatchActionId: string | null;
  kickParticipant: (participantId: string, reason: string) => Promise<void>;
  updateMatchStatus: (match: Match, status: Match['status']) => Promise<void>;
  updateMatchSchedule: (match: Match, payload: MatchScheduleInput) => Promise<void>;
  updateMatchScore: (match: Match, payload: MatchScoreInput) => Promise<void>;
  applyMatchOperation: (match: Match, payload: MatchOperationInput) => Promise<void>;
  activityLog: OpsActivityItem[];
  summary: {
    totalParticipants: number;
    kickedParticipants: number;
    unpaidParticipants: number;
    scheduledMatches: number;
    ongoingMatches: number;
    completedMatches: number;
  };
}

const mapAuditLogToActivity = (tournamentId: string, row: OpsAuditLogResponse): OpsActivityItem => {
  const entityType = row.tableName === 'matches' ? 'MATCH' : 'PARTICIPANT';
  const actor = row.user?.fullName || row.user?.email || 'Hệ thống/BTC';

  if (row.tableName === 'matches') {
    return {
      id: row.id,
      tournamentId,
      createdAt: row.createdAt,
      actor,
      entityType,
      entityId: row.recordId,
      action: row.action,
      title: row.action === 'UPDATE' ? 'Cập nhật trận đấu' : 'Thao tác trận đấu',
      detail: 'Dữ liệu trận đấu đã được BTC hoặc hệ thống điều chỉnh.',
    };
  }

  if (row.tableName === 'tournament_participants') {
    const oldStatus = String((row.oldValues?.teamStatus as string | undefined) || '');
    const newStatus = String((row.newValues?.teamStatus as string | undefined) || '');

    return {
      id: row.id,
      tournamentId,
      createdAt: row.createdAt,
      actor,
      entityType,
      entityId: row.recordId,
      action: row.action,
      title: oldStatus && newStatus ? `Đổi trạng thái hồ sơ ${oldStatus} -> ${newStatus}` : 'Cập nhật hồ sơ đăng ký',
      detail: 'Thông tin participant đã được điều chỉnh trong quá trình vận hành giải.',
    };
  }

  return {
    id: row.id,
    tournamentId,
    createdAt: row.createdAt,
    actor,
    entityType: 'PARTICIPANT',
    entityId: row.recordId,
    action: row.action,
    title: 'Cập nhật giải đấu',
    detail: 'Thông tin giải đấu đã được cập nhật.',
  };
};

export function useOrganizerOps(
  tournamentId: string,
  options?: UseOrganizerOpsOptions,
): UseOrganizerOpsResult {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [referees, setReferees] = useState<OpsReferee[]>([]);
  const [selectedDivisionIdState, setSelectedDivisionIdState] = useState('');
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeParticipantActionId, setActiveParticipantActionId] = useState<string | null>(null);
  const [activeMatchActionId, setActiveMatchActionId] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<OpsActivityItem[]>([]);
  const selectedDivisionId = options?.selectedDivisionId ?? selectedDivisionIdState;
  const setSelectedDivisionId = (divisionId: string) => {
    if (options?.onSelectedDivisionIdChange) {
      options.onSelectedDivisionIdChange(divisionId);
      return;
    }

    setSelectedDivisionIdState(divisionId);
  };

  const appendActivityLog = (
    entityType: OpsActivityItem['entityType'],
    entityId: string,
    action: OpsActivityItem['action'],
    title: string,
    detail: string,
  ) => {
    setActivityLog((current) => {
      const nextItem: OpsActivityItem = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        tournamentId,
        createdAt: new Date().toISOString(),
        actor: 'Organizer Panel',
        entityType,
        entityId,
        action,
        title,
        detail,
      };
      const nextLog = [nextItem, ...current].slice(0, 60);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(buildOpsActivityStorageKey(tournamentId), JSON.stringify(nextLog));
      }

      return nextLog;
    });
  };

  const loadOperationalData = useCallback(async (divisionId: string) => {
    const [participantsRes, matchesRes, auditRes] = await Promise.all([
      tournamentsApi.getOrganizerTournamentParticipants(tournamentId, divisionId),
      matchesApi.getMatches({
        tournamentId,
        ...(divisionId ? { divisionId } : {}),
        limit: 100,
      }),
      tournamentsApi.getOpsAuditLogs(tournamentId, divisionId || undefined),
    ]);

    setParticipants(participantsRes.data ?? []);
    
    if (matchesRes.data) {
      setMatches(matchesRes.data);
    } else {
      setMatches([]);
    }

    setActivityLog((current) => {
      const backendLog = (auditRes.data ?? []).map((row) => mapAuditLogToActivity(tournamentId, row));
      const localOnly = current.filter((item) => item.id.includes('_'));
      return [...backendLog, ...localOnly].slice(0, 60);
    });
  }, [tournamentId]);

  useEffect(() => {
    let active = true;

    const loadTournament = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [tournamentRes, divisionsRes, refereesRes] = await Promise.all([
          tournamentsApi.getTournamentById(tournamentId),
          divisionsApi.getDivisions(tournamentId),
          tournamentsApi.getTournamentReferees(tournamentId),
        ]);

        if (!active) {
          return;
        }

        const nextTournament = tournamentRes.data ?? null;
        const nextDivisions = divisionsRes.data ?? [];
        const nextReferees = refereesRes.data ?? [];

        setTournament(nextTournament);
        setDivisions(nextDivisions);
        setReferees(nextReferees);
        setSelectedDivisionIdState((current) => {
          if (current && nextDivisions.some((division: Division) => division.id === current)) {
            return current;
          }

          return nextDivisions[0]?.id ?? '';
        });
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadTournament();

    return () => {
      active = false;
    };
  }, [tournamentId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(buildOpsActivityStorageKey(tournamentId));
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as OpsActivityItem[];
      if (Array.isArray(parsed)) {
        void Promise.resolve().then(() => {
          setActivityLog(parsed);
        });
      }
    } catch {
      void Promise.resolve().then(() => {
        setActivityLog([]);
      });
    }
  }, [tournamentId]);

  useEffect(() => {
    let active = true;

    const fetchOperationalData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await loadOperationalData(selectedDivisionId);
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void fetchOperationalData();

    return () => {
      active = false;
    };
  }, [loadOperationalData, selectedDivisionId, tournamentId]);

  const refresh = async () => {
    const [tournamentRes, divisionsRes, refereesRes] = await Promise.all([
      tournamentsApi.getTournamentById(tournamentId),
      divisionsApi.getDivisions(tournamentId),
      tournamentsApi.getTournamentReferees(tournamentId),
    ]);

    setTournament(tournamentRes.data ?? null);
    setDivisions(divisionsRes.data ?? []);
    setReferees(refereesRes.data ?? []);
    await loadOperationalData(selectedDivisionId);
  };

  const handleParticipantAction = async (
    participantId: string,
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    try {
      setActiveParticipantActionId(participantId);
      await action();
      toast.success(successMessage);
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActiveParticipantActionId(null);
    }
  };

  const kickParticipant = async (participantId: string, reason: string) => {
    await handleParticipantAction(
      participantId,
      async () => {
        await tournamentsApi.kickParticipant(tournamentId, participantId, reason.trim() || 'Vi phạm điều lệ giải');
      },
      'Đã loại người chơi/đội khỏi giải.',
    );

    appendActivityLog('PARTICIPANT', participantId, 'KICK_PARTICIPANT', 'Loại khỏi giải', reason.trim() || 'Vi phạm điều lệ giải');
  };

  const updateMatchStatus = async (match: Match, status: Match['status']) => {
    try {
      setActiveMatchActionId(match.id);
      await matchesApi.updateStatus(match.id, { status });
      toast.success('Đã cập nhật trạng thái trận.');
      appendActivityLog(
        'MATCH',
        match.id,
        'UPDATE_MATCH_STATUS',
        `Đổi trạng thái sang ${status}`,
        `${match.participant1?.teamName || 'TBD'} vs ${match.participant2?.teamName || 'TBD'}`,
      );
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActiveMatchActionId(null);
    }
  };

  const updateMatchSchedule = async (match: Match, payload: MatchScheduleInput) => {
    try {
      setActiveMatchActionId(match.id);
      await tournamentsApi.updateMatchSchedule(match.id, {
        courtName: payload.courtName ?? null,
        courtAddress: payload.courtAddress ?? null,
        refereeId: payload.refereeId ?? null,
        scheduledAt: payload.scheduledAt ?? null,
      });
      toast.success('Đã cập nhật lịch thi đấu.');
      appendActivityLog(
        'MATCH',
        match.id,
        'UPDATE_MATCH_SCHEDULE',
        'Cập nhật lịch/sân/trọng tài',
        `Sân: ${payload.courtName || 'Chưa gán'} • Lịch: ${payload.scheduledAt || 'Chưa xếp lịch'}`,
      );
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActiveMatchActionId(null);
    }
  };

  const updateMatchScore = async (match: Match, payload: MatchScoreInput) => {
    try {
      setActiveMatchActionId(match.id);
      const winnerId =
        payload.p1SetsWon === payload.p2SetsWon
          ? null
          : payload.p1SetsWon > payload.p2SetsWon
            ? match.participant1Id || null
            : match.participant2Id || null;
      const latestMatch = matches.find((item) => item.id === match.id) ?? match;
      const currentScoreDetails =
        latestMatch.scoreDetails && typeof latestMatch.scoreDetails === 'object'
          ? latestMatch.scoreDetails
          : null;

      await matchesApi.updateScore(match.id, {
        p1SetsWon: payload.p1SetsWon,
        p2SetsWon: payload.p2SetsWon,
        winnerId,
        ...(payload.overrideReason ? { overrideReason: payload.overrideReason } : {}),
        scoreDetails: {
          ...(currentScoreDetails ?? {}),
          sets: payload.sets,
          ...(payload.sideOutState ? { sideOutState: payload.sideOutState } : {}),
        },
      });
      toast.success('Đã cập nhật tỷ số trận.');
      appendActivityLog(
        'MATCH',
        match.id,
        'UPDATE_MATCH_SCORE',
        'Cập nhật tỷ số',
        `${payload.p1SetsWon} - ${payload.p2SetsWon}`,
      );
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActiveMatchActionId(null);
    }
  };

  const applyMatchOperation = async (match: Match, payload: MatchOperationInput) => {
    try {
      setActiveMatchActionId(match.id);
      await matchesApi.applyOperation(match.id, {
        action: payload.action,
        reason: payload.reason.trim(),
        winnerId: payload.winnerId,
      });
      toast.success('Đã áp dụng quyết định nghiệp vụ cho trận.');
      appendActivityLog(
        'MATCH',
        match.id,
        payload.action,
        `Quyết định ${payload.action}`,
        payload.reason.trim(),
      );
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActiveMatchActionId(null);
    }
  };

  const summary = useMemo(() => {
    const kickedParticipants = participants.filter((participant) => participant.teamStatus === 'KICKED').length;
    const unpaidParticipants = participants.filter((participant) => !participant.isPaid).length;
    const scheduledMatches = matches.filter((match) => match.status === 'SCHEDULED').length;
    const ongoingMatches = matches.filter((match) => match.status === 'ONGOING').length;
    const completedMatches = matches.filter((match) => match.status === 'COMPLETED').length;

    return {
      totalParticipants: participants.length,
      kickedParticipants,
      unpaidParticipants,
      scheduledMatches,
      ongoingMatches,
      completedMatches,
    };
  }, [matches, participants]);

  return {
    tournament,
    divisions,
    referees,
    selectedDivisionId,
    setSelectedDivisionId,
    participants,
    matches,
    isLoading,
    error,
    refresh,
    activeParticipantActionId,
    activeMatchActionId,
    kickParticipant,
    updateMatchStatus,
    updateMatchSchedule,
    updateMatchScore,
    applyMatchOperation,
    activityLog,
    summary,
  };
}

