'use client';

import { useState, use } from 'react';
import { matchesApi, Match, MatchScore } from '@/features/matches/api';
import { useLiveMatch } from '@/hooks/useLiveMatch';
import { useAuthStore } from '@/lib/zustand/authStore';
import { Trophy, Clock, MapPin, Activity, Plus, Minus, Check, Play, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Props {
  params: Promise<{ matchId: string }>;
}

export default function LiveMatchPage({ params }: Props) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.matchId;
  const { match, scores, setMatch, setScores, isLoading, error } = useLiveMatch(matchId);
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Đang kết nối live scoreboard...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-md">
          <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">{error || 'Không tìm thấy trận đấu'}</h2>
          <p className="text-slate-500 text-sm mb-6">Trận đấu này có thể không tồn tại hoặc đã bị hủy.</p>
          <Link href="/tournaments" className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm">
            Quay lại giải đấu
          </Link>
        </div>
      </div>
    );
  }

  const team1Name = match.participant1?.teamName || 'Chưa xác định';
  const team2Name = match.participant2?.teamName || 'Chưa xác định';

  // Check referee permissions
  const isReferee =
    user?.roles.includes('ADMIN') ||
    user?.roles.includes('ORGANIZER') ||
    match.tournament?.createdBy === user?.id ||
    match.refereeId === user?.id;

  const currentSetIdx = scores.findIndex((s) => !s.isFinished);
  const activeSetIdx = currentSetIdx !== -1 ? currentSetIdx : scores.length - 1;
  const currentSet = scores[activeSetIdx] || { team1Score: 0, team2Score: 0, isFinished: false };

  // Handle Score Updates
  const handleUpdatePoints = async (team: 1 | 2, action: 'inc' | 'dec') => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const newScores = [...scores];
      if (newScores.length === 0) {
        newScores.push({ team1Score: 0, team2Score: 0, isFinished: false });
      }

      const activeIdx = newScores.findIndex((s) => !s.isFinished) !== -1 
        ? newScores.findIndex((s) => !s.isFinished) 
        : newScores.length - 1;

      const setObj = { ...newScores[activeIdx] };

      if (team === 1) {
        setObj.team1Score = Math.max(0, action === 'inc' ? setObj.team1Score + 1 : setObj.team1Score - 1);
      } else {
        setObj.team2Score = Math.max(0, action === 'inc' ? setObj.team2Score + 1 : setObj.team2Score - 1);
      }

      newScores[activeIdx] = setObj;

      // Optimistic Update
      setScores(newScores);

      const res = await matchesApi.updateScore(matchId, {
        p1SetsWon: match.p1SetsWon,
        p2SetsWon: match.p2SetsWon,
        scoreDetails: { sets: newScores },
        winnerId: match.winnerId,
      });

      setMatch(res);
      setScores(res.scoreDetails?.sets || []);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Lỗi khi cập nhật điểm số');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Match Status Update
  const handleUpdateStatus = async (newStatus: Match['status']) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // If moving to ONGOING and scores is empty, initialize the first set
      let scoreUpdatePayload = undefined;
      if (newStatus === 'ONGOING' && scores.length === 0) {
        const initialScores = [{ team1Score: 0, team2Score: 0, isFinished: false }];
        scoreUpdatePayload = {
          p1SetsWon: 0,
          p2SetsWon: 0,
          scoreDetails: { sets: initialScores },
        };
        setScores(initialScores);
      }

      if (scoreUpdatePayload) {
        await matchesApi.updateScore(matchId, scoreUpdatePayload);
      }

      const res = await matchesApi.updateStatus(matchId, { status: newStatus });
      setMatch(res);
      toast.success(newStatus === 'ONGOING' ? 'Đã bắt đầu trận đấu' : 'Trận đấu đã kết thúc');
    } catch (err: unknown) {
      console.error(err);
      toast.error('Lỗi khi cập nhật trạng thái trận đấu');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Finish Current Set
  const handleFinishSet = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const newScores = [...scores];
      const activeIdx = newScores.findIndex((s) => !s.isFinished);
      if (activeIdx === -1) {
        toast.error('Không tìm thấy set đấu đang diễn ra');
        setIsSubmitting(false);
        return;
      }

      const setObj = { ...newScores[activeIdx], isFinished: true };
      newScores[activeIdx] = setObj;

      // Calculate sets won
      let p1Sets = match.p1SetsWon;
      let p2Sets = match.p2SetsWon;

      if (setObj.team1Score > setObj.team2Score) {
        p1Sets += 1;
      } else if (setObj.team2Score > setObj.team1Score) {
        p2Sets += 1;
      }

      // Add a new set if not at max sets yet (e.g. Best of 3 means max 3 sets)
      const maxSetsNeeded = 2; // e.g. first to 2 sets
      if (p1Sets < maxSetsNeeded && p2Sets < maxSetsNeeded) {
        newScores.push({ team1Score: 0, team2Score: 0, isFinished: false });
      }

      const res = await matchesApi.updateScore(matchId, {
        p1SetsWon: p1Sets,
        p2SetsWon: p2Sets,
        scoreDetails: { sets: newScores },
        winnerId: match.winnerId,
      });

      setMatch(res);
      setScores(res.scoreDetails?.sets || []);
      toast.success(`Đã kết thúc Set ${activeIdx + 1}`);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Lỗi khi kết thúc set đấu');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle End Match with Winner Selection
  const handleCompleteMatch = async (winnerTeam: 1 | 2) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Mark current set as finished if it isn't
      const newScores = scores.map((s) => (!s.isFinished ? { ...s, isFinished: true } : s));

      const winnerId = winnerTeam === 1 ? match.participant1Id : match.participant2Id;
      if (!winnerId) {
        toast.error('Không tìm thấy ID người thắng cuộc');
        setIsSubmitting(false);
        return;
      }

      // Calculate final sets won
      let p1Sets = match.p1SetsWon;
      let p2Sets = match.p2SetsWon;

      const activeIdx = scores.findIndex((s) => !s.isFinished);
      if (activeIdx !== -1) {
        const lastSet = scores[activeIdx];
        if (winnerTeam === 1) {
          const t1Score = Math.max(lastSet.team1Score, lastSet.team2Score + 2);
          newScores[activeIdx] = { ...lastSet, team1Score: t1Score, isFinished: true };
          p1Sets += 1;
        } else {
          const t2Score = Math.max(lastSet.team2Score, lastSet.team1Score + 2);
          newScores[activeIdx] = { ...lastSet, team2Score: t2Score, isFinished: true };
          p2Sets += 1;
        }
      }

      // Update score and winner
      await matchesApi.updateScore(matchId, {
        p1SetsWon: p1Sets,
        p2SetsWon: p2Sets,
        scoreDetails: { sets: newScores },
        winnerId,
      });

      // Update status to COMPLETED
      const resStatus = await matchesApi.updateStatus(matchId, { status: 'COMPLETED' });

      setMatch(resStatus);
      setScores(resStatus.scoreDetails?.sets || []);
      toast.success('Trận đấu đã kết thúc thành công!');
    } catch (err: unknown) {
      console.error(err);
      toast.error('Lỗi khi hoàn thành trận đấu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-10 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              match.status === 'ONGOING' 
                ? 'bg-rose-100 text-rose-600' 
                : match.status === 'COMPLETED' 
                ? 'bg-slate-200 text-slate-700' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              {match.status === 'ONGOING' && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
              {match.status === 'ONGOING' ? 'Trực tiếp' : match.status === 'COMPLETED' ? 'Kết thúc' : 'Sắp diễn ra'}
            </span>
            <span className="text-sm font-semibold text-slate-500 bg-slate-200 px-3 py-1 rounded-full">Vòng {match.roundNumber}</span>
          </div>
          <Link href={`/tournaments/${match.tournamentId}`} className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
            {match.tournament?.name || 'Quay lại giải đấu'}
          </Link>
        </div>

        {/* Score Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative mb-8">
          <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          
          <div className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4">
              
              {/* Team 1 */}
              <div className="flex flex-col items-center flex-1 w-full">
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center mb-4 shadow-inner border transition-all ${
                  match.winnerId === match.participant1Id && match.status === 'COMPLETED'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 ring-4 ring-emerald-100'
                    : 'bg-blue-50 border-blue-100 text-blue-600'
                }`}>
                  {match.winnerId === match.participant1Id && match.status === 'COMPLETED' ? (
                    <Trophy className="w-12 h-12" />
                  ) : (
                    <span className="text-3xl font-black">{team1Name.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-slate-900 text-center">{team1Name}</h3>
                <div className="text-slate-500 font-medium mt-1">Set thắng: {match.p1SetsWon}</div>
              </div>

              {/* Main Score Display */}
              <div className="flex flex-col items-center justify-center mx-4 flex-shrink-0">
                <div className="flex items-center justify-center gap-6">
                  <div className="text-6xl md:text-8xl font-black tabular-nums tracking-tighter text-slate-900">{currentSet.team1Score}</div>
                  <div className="text-4xl font-black text-slate-300">-</div>
                  <div className="text-6xl md:text-8xl font-black tabular-nums tracking-tighter text-slate-900">{currentSet.team2Score}</div>
                </div>
                <div className="mt-4 text-xs font-bold text-slate-400 tracking-widest uppercase flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 animate-pulse text-rose-500" /> Điểm Set hiện tại
                </div>
              </div>

              {/* Team 2 */}
              <div className="flex flex-col items-center flex-1 w-full">
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center mb-4 shadow-inner border transition-all ${
                  match.winnerId === match.participant2Id && match.status === 'COMPLETED'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 ring-4 ring-emerald-100'
                    : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                }`}>
                  {match.winnerId === match.participant2Id && match.status === 'COMPLETED' ? (
                    <Trophy className="w-12 h-12" />
                  ) : (
                    <span className="text-3xl font-black">{team2Name.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-slate-900 text-center">{team2Name}</h3>
                <div className="text-slate-500 font-medium mt-1">Set thắng: {match.p2SetsWon}</div>
              </div>
            </div>

            {/* Set History */}
            {scores.length > 0 && (
              <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col items-center">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Chi tiết các Set</h4>
                <div className="flex flex-wrap justify-center gap-4">
                  {scores.map((set, idx) => (
                    <div key={idx} className={`px-5 py-2.5 rounded-2xl border flex flex-col items-center shadow-sm ${
                      !set.isFinished 
                        ? 'bg-rose-50 border-rose-100 ring-2 ring-rose-100' 
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[10px] font-bold text-slate-500 mb-1 uppercase">Set {idx + 1}</span>
                      <span className={`text-xl font-black ${!set.isFinished ? 'text-rose-600' : 'text-slate-800'}`}>
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
              <Clock className="w-4 h-4 text-slate-400" /> {match.scheduledAt ? new Date(match.scheduledAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : 'Chưa xếp giờ'}
            </div>
          </div>
        </div>

        {/* Referee Dashboard (Control Panel) */}
        {isReferee && (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 md:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Bảng điều khiển của Trọng tài</h3>
                <p className="text-xs text-slate-500">Cập nhật điểm số và trạng thái trận đấu theo thời gian thực</p>
              </div>
            </div>

            {match.status === 'SCHEDULED' && (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                <AlertCircle className="w-12 h-12 text-blue-500 mb-2" />
                <h4 className="font-bold text-slate-800 mb-1">Trận đấu chưa bắt đầu</h4>
                <p className="text-xs text-slate-500 mb-6 max-w-sm">Hãy kích hoạt trận đấu để bắt đầu ghi điểm set đấu.</p>
                <button
                  onClick={() => handleUpdateStatus('ONGOING')}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" /> Bắt đầu trận đấu
                </button>
              </div>
            )}

            {match.status === 'ONGOING' && (
              <div className="space-y-8">
                {/* Points Modifier */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Team 1 Score controls */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-150 flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Đội 1: {team1Name}</span>
                    <div className="flex items-center gap-6 mt-1">
                      <button
                        onClick={() => handleUpdatePoints(1, 'dec')}
                        disabled={isSubmitting || currentSet.team1Score <= 0}
                        className="w-12 h-12 rounded-full bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="text-4xl font-black text-slate-900 tabular-nums w-12 text-center">{currentSet.team1Score}</span>
                      <button
                        onClick={() => handleUpdatePoints(1, 'inc')}
                        disabled={isSubmitting}
                        className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white transition-colors shadow-md disabled:opacity-50"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Team 2 Score controls */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-150 flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Đội 2: {team2Name}</span>
                    <div className="flex items-center gap-6 mt-1">
                      <button
                        onClick={() => handleUpdatePoints(2, 'dec')}
                        disabled={isSubmitting || currentSet.team2Score <= 0}
                        className="w-12 h-12 rounded-full bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="text-4xl font-black text-slate-900 tabular-nums w-12 text-center">{currentSet.team2Score}</span>
                      <button
                        onClick={() => handleUpdatePoints(2, 'inc')}
                        disabled={isSubmitting}
                        className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white transition-colors shadow-md disabled:opacity-50"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Operations */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between border-t border-slate-100 pt-6">
                  <button
                    onClick={handleFinishSet}
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-emerald-500" /> Hoàn thành Set hiện tại
                  </button>

                  <div className="flex flex-1 gap-3">
                    <button
                      onClick={() => handleCompleteMatch(1)}
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 text-xs"
                    >
                      <Trophy className="w-4 h-4" /> Đội 1 Thắng
                    </button>
                    <button
                      onClick={() => handleCompleteMatch(2)}
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 text-xs"
                    >
                      <Trophy className="w-4 h-4" /> Đội 2 Thắng
                    </button>
                  </div>
                </div>
              </div>
            )}

            {match.status === 'COMPLETED' && (
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <Trophy className="w-12 h-12 text-emerald-500 mb-2" />
                <h4 className="font-bold text-slate-800 mb-1">Trận đấu đã hoàn thành</h4>
                <p className="text-xs text-slate-500">Người chiến thắng: <span className="font-bold text-emerald-600">{match.winnerId === match.participant1Id ? team1Name : team2Name}</span></p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
