'use client';

import { useEffect, useState, use } from 'react';
import { matchesApi, Match, MatchScore } from '@/features/matches/api';
import { socketClient } from '@/lib/socket';
import { Trophy, Clock, MapPin, Activity } from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: Promise<{ matchId: string }>;
}

export default function LiveMatchPage({ params }: Props) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.matchId;
  const [match, setMatch] = useState<Match | null>(null);
  const [scores, setScores] = useState<MatchScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Fetch
  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const data = await matchesApi.getMatchById(matchId);
        setMatch(data);
        setScores(data.scores || []);
      } catch (error) {
        console.error('Failed to fetch match:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMatch();
  }, [matchId]);

  // Socket setup
  useEffect(() => {
    const socket = socketClient.getMatchSocket();
    socket.connect();

    // Join the specific match room
    socket.emit('joinMatch', matchId);

    // Listen for score updates
    socket.on('scoreUpdated', (data: { matchId: string; scores: MatchScore[] }) => {
      if (data.matchId === matchId) {
        setScores(data.scores);
      }
    });

    // Listen for match status updates
    socket.on('matchStatusChanged', (data: { matchId: string; status: Match['status'] }) => {
      if (data.matchId === matchId) {
        setMatch(prev => prev ? { ...prev, status: data.status } : null);
      }
    });

    return () => {
      socket.emit('leaveMatch', matchId);
      socket.off('scoreUpdated');
      socket.off('matchStatusChanged');
      // socket.disconnect(); // Do not completely disconnect if other components use it
    };
  }, [matchId]);

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center animate-pulse"><div className="w-64 h-64 bg-slate-200 rounded-full"></div></div>;
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Không tìm thấy trận đấu</h2>
          <Link href="/tournaments" className="text-blue-600 hover:underline">Quay lại danh sách giải đấu</Link>
        </div>
      </div>
    );
  }

  const team1Name = match.participant1?.teamName || 'TBD';
  const team2Name = match.participant2?.teamName || 'TBD';

  // Calculate current sets won
  const team1SetsWon = scores.filter(s => s.isFinished && s.team1Score > s.team2Score).length;
  const team2SetsWon = scores.filter(s => s.isFinished && s.team2Score > s.team1Score).length;

  const currentSet = scores.find(s => !s.isFinished) || scores[scores.length - 1] || { team1Score: 0, team2Score: 0 };

  return (
    <div className="min-h-screen bg-slate-50 pt-10 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-xs font-bold uppercase tracking-wider">
              {match.status === 'ONGOING' && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span>}
              {match.status === 'ONGOING' ? 'Trực tiếp' : match.status === 'COMPLETED' ? 'Kết thúc' : 'Sắp diễn ra'}
            </span>
            <span className="text-sm font-semibold text-slate-500 bg-slate-200 px-3 py-1 rounded-full">Vòng {match.roundNumber}</span>
          </div>
          <Link href={`/tournaments/${match.tournamentId}`} className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
            {match.tournament?.name || 'Giải đấu'}
          </Link>
        </div>

        {/* Score Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
          {/* Top Banner decoration */}
          <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          
          <div className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4">
              
              {/* Team 1 */}
              <div className="flex flex-col items-center flex-1 w-full">
                <div className="w-24 h-24 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 shadow-inner border border-blue-100">
                  <span className="text-3xl font-black text-blue-600">{team1Name.substring(0, 2).toUpperCase()}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 text-center">{team1Name}</h3>
                <div className="text-slate-500 font-medium mt-1">Set thắng: {team1SetsWon}</div>
              </div>

              {/* Main Score Display */}
              <div className="flex flex-col items-center justify-center mx-4 flex-shrink-0">
                <div className="flex items-center justify-center gap-6">
                  <div className="text-6xl md:text-8xl font-black tabular-nums tracking-tighter text-slate-900">{currentSet.team1Score}</div>
                  <div className="text-4xl font-black text-slate-300">-</div>
                  <div className="text-6xl md:text-8xl font-black tabular-nums tracking-tighter text-slate-900">{currentSet.team2Score}</div>
                </div>
                <div className="mt-4 text-sm font-bold text-slate-400 tracking-widest uppercase flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Điểm Set hiện tại
                </div>
              </div>

              {/* Team 2 */}
              <div className="flex flex-col items-center flex-1 w-full">
                <div className="w-24 h-24 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 shadow-inner border border-indigo-100">
                  <span className="text-3xl font-black text-indigo-600">{team2Name.substring(0, 2).toUpperCase()}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 text-center">{team2Name}</h3>
                <div className="text-slate-500 font-medium mt-1">Set thắng: {team2SetsWon}</div>
              </div>
            </div>

            {/* Set History */}
            {scores.length > 0 && (
              <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col items-center">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Chi tiết các Set</h4>
                <div className="flex gap-4">
                  {scores.map((set, idx) => (
                    <div key={idx} className={`px-4 py-2 rounded-lg border ${!set.isFinished ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'} flex flex-col items-center`}>
                      <span className="text-[10px] font-bold text-slate-500 mb-1 uppercase">Set {idx + 1}</span>
                      <span className={`text-lg font-black ${!set.isFinished ? 'text-rose-600' : 'text-slate-800'}`}>
                        {set.team1Score} - {set.team2Score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" /> {match.courtName || 'Sân trung tâm'}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" /> {match.scheduledTime ? new Date(match.scheduledTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '--:--'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
