import { useEffect, useState } from 'react';
import { socketClient } from '@/lib/socket';
import { matchesApi, Match, MatchScore } from '@/features/matches/api';
import { extractMatchScores } from '@/features/matches/score-display';

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
  return (
    left.id === right.id &&
    left.status === right.status &&
    left.winnerId === right.winnerId &&
    left.p1SetsWon === right.p1SetsWon &&
    left.p2SetsWon === right.p2SetsWon &&
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
  return incoming.revision <= previous.revision;
}

export function useLiveMatch(matchId: string) {
  const [match, setMatch] = useState<Match | null>(null);
  const [scores, setScores] = useState<MatchScore[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cheerCount, setCheerCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchMatch = async () => {
      try {
        const data = await matchesApi.getMatchById(matchId);
        if (isMounted) {
          setMatch(data);
          setScores(extractMatchScores(data.scoreDetails));
          setCheerCount(data.cheerCount ?? 0);
        }
      } catch (err: unknown) {
        console.error('Failed to fetch match details:', err);
        if (isMounted) {
          setError('Không thể tải thông tin trận đấu');
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
  }, [matchId]);

  useEffect(() => {
    let isMounted = true;
    const socket = socketClient.getMatchSocket();

    const refreshMatchSnapshot = async () => {
      try {
        const data = await matchesApi.getMatchById(matchId);
        if (!isMounted) {
          return;
        }

        setMatch((previous) => (
          isStaleRevision(previous, data)
            ? previous
            : (previous && hasSameLiveSnapshot(previous, data) ? previous : data)
        ));
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

    const handleReconnect = () => {
      void refreshMatchSnapshot();
    };

    if (!socket.connected) {
      socket.connect();
    }

    const joinRoom = () => {
      socket.emit('joinMatch', matchId);
      void refreshMatchSnapshot();
    };

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
      const payload = typeof rawPayload === 'string'
        ? JSON.parse(rawPayload) as { matchId: string; viewerCount: number }
        : rawPayload;
      if (payload.matchId === matchId) {
        setViewerCount(payload.viewerCount);
      }
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.on('connect', joinRoom);
    }

    const applyIncomingMatch = (updatedMatch: Match, includeScores: boolean) => {
      setMatch((previous) => {
        if (isStaleRevision(previous, updatedMatch)) {
          return previous; // drop stale out-of-order payload (NOTE-7)
        }
        if (previous && hasSameLiveSnapshot(previous, updatedMatch)) {
          return previous;
        }
        return updatedMatch;
      });

      if (includeScores) {
        const nextScores = extractMatchScores(updatedMatch.scoreDetails);
        setScores((previous) => (areScoresEqual(previous, nextScores) ? previous : nextScores));
      }
    };

    socket.on('score:update', handleScoreUpdate);
    socket.on('match:status', handleMatchStatus);
    socket.on('viewer:count', handleViewerCount);
    socket.on('connect', handleReconnect);

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

    return () => {
      isMounted = false;
      socket.emit('leaveMatch', matchId);
      socket.off('connect', joinRoom);
      socket.off('score:update', handleScoreUpdate);
      socket.off('match:status', handleMatchStatus);
      socket.off('viewer:count', handleViewerCount);
      socket.off('connect', handleReconnect);
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
