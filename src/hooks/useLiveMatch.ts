import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { socketClient } from '@/lib/socket';
import { matchesApi, Match, MatchScore } from '@/features/matches/api';
import { extractMatchScores } from '@/features/matches/score-display';

function normalizeViewerCount(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}



function areScoresEqual(left: MatchScore[], right: MatchScore[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((score, index) => {
    const other = right[index];
    return (
      other &&
      score.team1Score === other.team1Score &&
      score.team2Score === other.team2Score &&
      score.isFinished === other.isFinished
    );
  });
}

function hasSameLiveSnapshot(left: Match, right: Match) {
  const leftMode = left.tournament?.tournamentConfig?.mode ?? null;
  const rightMode = right.tournament?.tournamentConfig?.mode ?? null;

  return (
    left.id === right.id &&
    left.status === right.status &&
    left.winnerId === right.winnerId &&
    left.p1SetsWon === right.p1SetsWon &&
    left.p2SetsWon === right.p2SetsWon &&
    leftMode === rightMode &&
    JSON.stringify(left.scoreDetails ?? null) === JSON.stringify(right.scoreDetails ?? null)
  );
}

/**
 * Monotonic merge guard (NOTE-7): only apply an incoming match payload when its
 * revision is NEWER than the current one. Payloads without revision (legacy
 * server/client) keep the old behavior for backward compatibility.
 */
function isStaleRevision(previous: Match | null, incoming: Match): boolean {
  if (!previous) return false;
  if (previous.revision === undefined || incoming.revision === undefined) {
    return false; // no revision info → keep legacy behavior
  }
  if (incoming.revision < previous.revision) {
    return true;
  }

  if (incoming.revision === previous.revision) {
    const previousMode = previous.tournament?.tournamentConfig?.mode ?? null;
    const incomingMode = incoming.tournament?.tournamentConfig?.mode ?? null;
    return previousMode === incomingMode;
  }

  return false;
}

/**
 * Live socket events can be partial match projections. Preserve the rich
 * context loaded by the initial GET so an optimistic/status event cannot
 * briefly replace participant, stage, group, or tournament labels with
 * unknown placeholders.
 */
function mergeMatchContext(previous: Match | null, incoming: Match): Match {
  if (!previous) return incoming;

  return {
    ...previous,
    ...incoming,
    participant1: incoming.participant1 ?? previous.participant1,
    participant2: incoming.participant2 ?? previous.participant2,
    tournament: incoming.tournament ?? previous.tournament,
    group: incoming.group ?? previous.group,
    stage: incoming.stage ?? previous.stage,
  };
}

export function useLiveMatch(matchId: string) {
  const translate = useTranslations('LiveMatch');
  const [match, setMatch] = useState<Match | null>(null);
  const [scores, setScores] = useState<MatchScore[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cheerCount, setCheerCount] = useState(0);
  const matchRef = useRef<Match | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMatch = async () => {
      try {
        const data = await matchesApi.getMatchById(matchId);
        if (isMounted) {
          matchRef.current = data;
          setMatch(data);
          setScores(extractMatchScores(data.scoreDetails));
          setCheerCount(data.cheerCount ?? 0);
        }
      } catch (err: unknown) {
        console.error('Failed to fetch match details:', err);
        if (isMounted) {
          setError(translate('loadFailed'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMatch();

    // Fetch cheer count
    const fetchCheerCount = async () => {
      try {
        const cheerRes = await matchesApi.getCheerCount(matchId);
        if (isMounted) {
          setCheerCount(cheerRes.cheerCount);
        }
      } catch {
        // silent
      }
    };
    fetchCheerCount();

    return () => {
      isMounted = false;
    };
  }, [matchId, translate]);

  useEffect(() => {
    let isMounted = true;
    const socket = socketClient.getMatchSocket();

    const refreshMatchSnapshot = async () => {
      try {
        const data = await matchesApi.getMatchById(matchId);
        if (!isMounted) {
          return;
        }

        // NOTE-1: Check revision synchronously via ref BEFORE any state update.
        // If incoming snapshot is stale, skip ALL updates to prevent an old
        // HTTP response from overwriting a newer socket snapshot.
        if (isStaleRevision(matchRef.current, data)) {
          return;
        }

                setMatch((previous) => {
          const merged = mergeMatchContext(previous, data);
          const next = previous && hasSameLiveSnapshot(previous, merged) ? previous : merged;
          matchRef.current = next;
          return next;
        });
        const nextScores = extractMatchScores(data.scoreDetails);

        setScores((previous) => (
          areScoresEqual(previous, nextScores) ? previous : nextScores
        ));
        setCheerCount(data.cheerCount ?? 0);
      } catch (err: unknown) {
        // A reconnect can race with the server becoming ready; keep the last snapshot.
        console.warn('Failed to refresh live match snapshot after socket connection:', err);
      }
    };

    // Socket.IO is the fast path. Reconcile every 12 seconds as a safety net
    // for dropped events and reverse proxies that temporarily lose upgrades.
    const reconciliationTimer = window.setInterval(() => {
      void refreshMatchSnapshot();
    }, 12000);

        const emitPresenceJoin = () => {
      if (document.visibilityState === 'visible') {
        socket.emit('joinMatch', matchId);
      }
    };

    const emitPresenceLeave = () => {
      socket.emit('leaveMatch', matchId);
    };

    const handleConnect = () => {
      emitPresenceJoin();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        emitPresenceJoin();
      } else {
        emitPresenceLeave();
      }
    };

    socket.on('connect', handleConnect);

    if (!socket.connected) {
      socket.connect();
    }

    const handleScoreUpdate = (rawMatch: Match | string) => {
      const updatedMatch = typeof rawMatch === 'string' ? JSON.parse(rawMatch) as Match : rawMatch;
      if (updatedMatch.id === matchId) {
        applyIncomingMatch(updatedMatch, true);
      }
    };

    const handleMatchStatus = (rawMatch: Match | string) => {
      const updatedMatch = typeof rawMatch === 'string' ? JSON.parse(rawMatch) as Match : rawMatch;
      if (updatedMatch.id === matchId) {
        applyIncomingMatch(updatedMatch, false);
      }
    };

    const handleViewerCount = (rawPayload: { matchId: string; viewerCount: number } | string) => {
      let payload: { matchId?: unknown; viewerCount?: unknown };
      try {
        payload = typeof rawPayload === 'string'
          ? JSON.parse(rawPayload) as { matchId?: unknown; viewerCount?: unknown }
          : rawPayload;
      } catch {
        return;
      }

      if (payload.matchId === matchId) {
        setViewerCount(normalizeViewerCount(payload.viewerCount));
      }
    };

    if (socket.connected) {
      emitPresenceJoin();
    }

    const applyIncomingMatch = (updatedMatch: Match, includeScores: boolean) => {
      // NOTE-1: Check revision synchronously via ref — if stale, skip ALL updates.
      if (isStaleRevision(matchRef.current, updatedMatch)) {
        return;
      }

            setMatch((previous) => {
        const merged = mergeMatchContext(previous, updatedMatch);
        if (previous && hasSameLiveSnapshot(previous, merged)) {
          return previous;
        }
        matchRef.current = merged;
        return merged;
      });

      if (includeScores) {

        const nextScores = extractMatchScores(updatedMatch.scoreDetails);
        setScores((previous) => (areScoresEqual(previous, nextScores) ? previous : nextScores));
      }
    };

    socket.on('score:update', handleScoreUpdate);
    socket.on('match:status', handleMatchStatus);
    socket.on('viewer:count', handleViewerCount);

    // Lắng nghe sự kiện cổ vũ real-time
    const handleCheerUpdate = (rawPayload: { matchId: string; cheerCount: number } | string) => {
      const payload = typeof rawPayload === 'string'
        ? JSON.parse(rawPayload) as { matchId: string; cheerCount: number }
        : rawPayload;
      if (payload.matchId === matchId) {
        setCheerCount(payload.cheerCount);
      }
    };
    socket.on('cheer:update', handleCheerUpdate);

    const handleBeforeUnload = () => {
      emitPresenceLeave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      emitPresenceLeave();
      socket.off('connect', handleConnect);

      socket.off('score:update', handleScoreUpdate);
      socket.off('match:status', handleMatchStatus);
      socket.off('viewer:count', handleViewerCount);

      socket.off('cheer:update', handleCheerUpdate);
      window.clearInterval(reconciliationTimer);
    };
  }, [matchId]);

  return {
    match,
    scores,
    viewerCount,
    cheerCount,
    setMatch,
    setScores,
    setCheerCount,
    isLoading,
    error,
  };
}

