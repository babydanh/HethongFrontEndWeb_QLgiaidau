import { useEffect, useState } from 'react';
import { socketClient } from '@/lib/socket';
import { matchesApi, Match, MatchScore } from '@/features/matches/api';
import { extractMatchScores } from '@/features/matches/score-display';

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

    if (socket.connected) {
      joinRoom();
    } else {
      socket.on('connect', joinRoom);
    }

    socket.on('score:update', (updatedMatch: Match) => {
      if (updatedMatch.id === matchId) {
        setMatch(updatedMatch);
        setScores(extractMatchScores(updatedMatch.scoreDetails));
      }
    });

    socket.on('match:status', (updatedMatch: Match) => {
      if (updatedMatch.id === matchId) {
        setMatch(updatedMatch);
      }
    });

    socket.on('viewer:count', (payload: { matchId: string; viewerCount: number }) => {
      if (payload.matchId === matchId) {
        setViewerCount(payload.viewerCount);
      }
    });

    return () => {
      socket.emit('leaveMatch', matchId);
      socket.off('connect', joinRoom);
      socket.off('score:update');
      socket.off('match:status');
      socket.off('viewer:count');
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
