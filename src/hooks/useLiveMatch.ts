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

export function useLiveMatch(matchId: string) {
  const [match, setMatch] = useState<Match | null>(null);
  const [scores, setScores] = useState<MatchScore[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMatch = async () => {
      try {
        const data = await matchesApi.getMatchById(matchId);
        if (isMounted) {
          setMatch(data);
          setScores(extractMatchScores(data.scoreDetails));
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

    return () => {
      isMounted = false;
    };
  }, [matchId]);

  useEffect(() => {
    const socket = socketClient.getMatchSocket();
    
    if (!socket.connected) {
      socket.connect();
    }

    const joinRoom = () => {
      socket.emit('joinMatch', matchId);
    };

    const handleScoreUpdate = (updatedMatch: Match) => {
      if (updatedMatch.id === matchId) {
        applyIncomingMatch(updatedMatch, true);
      }
    };

    const handleMatchStatus = (updatedMatch: Match) => {
      if (updatedMatch.id === matchId) {
        applyIncomingMatch(updatedMatch, false);
      }
    };

    const handleViewerCount = (payload: { matchId: string; viewerCount: number }) => {
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

    return () => {
      socket.emit('leaveMatch', matchId);
      socket.off('connect', joinRoom);
      socket.off('score:update', handleScoreUpdate);
      socket.off('match:status', handleMatchStatus);
      socket.off('viewer:count', handleViewerCount);
    };
  }, [matchId]);

  return {
    match,
    scores,
    viewerCount,
    setMatch,
    setScores,
    isLoading,
    error,
  };
}
