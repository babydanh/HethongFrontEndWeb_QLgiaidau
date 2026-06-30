'use client';

import { useState, use, useEffect } from 'react';
import { matchesApi, Match, MatchComment } from '@/features/matches/api';
import {
  buildAutoWinnerScore,
  extractMatchScores,
  getMatchScorePresentation,
  resolveMatchSportRules,
} from '@/features/matches/score-display';
import { useLiveMatch } from '@/hooks/useLiveMatch';
import { useAuthStore } from '@/lib/zustand/authStore';
import { socketClient } from '@/lib/socket';
import type { PickleballSideOutState } from '@/types/match';
import { getErrorMessage } from '@/utils/error';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { Trophy, Clock, MapPin, Activity, Plus, Minus, Check, Play, AlertCircle, Camera, MessageSquare, Send, Eye } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Props {
  params: Promise<{ matchId: string }>;
}

function readSideOutState(match: Match): PickleballSideOutState {
  const rawState = match.scoreDetails?.sideOutState;
  if (!rawState) {
    return {
      servingTeam: null,
      serverNumber: 1,
      openingSequenceDone: false,
    };
  }

  const servingTeam = rawState.servingTeam === 1 || rawState.servingTeam === 2
    ? rawState.servingTeam
    : null;
  const serverNumber = rawState.serverNumber === 2 ? 2 : 1;

  return {
    servingTeam,
    serverNumber,
    openingSequenceDone: rawState.openingSequenceDone === true,
  };
}

export default function LiveMatchPage({ params }: Props) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.matchId;
  const { match, scores, viewerCount, setMatch, setScores, isLoading, error } = useLiveMatch(matchId);
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);

  const [comments, setComments] = useState<MatchComment[]>([]);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchComments = async () => {
      try {
        const data = await matchesApi.getComments(matchId);
        if (isMounted) {
          setComments(data);
        }
      } catch (err) {
        console.error('Failed to fetch match comments:', err);
      }
    };

    void fetchComments();

    return () => {
      isMounted = false;
    };
  }, [matchId]);

  useEffect(() => {
    const socket = socketClient.getMatchSocket();

    const handleIncomingComment = (comment: MatchComment) => {
      if (comment.matchId !== matchId) {
        return;
      }

      setComments((prev) => {
        if (prev.some((item) => item.id === comment.id)) {
          return prev;
        }
        return [comment, ...prev];
      });
    };

    socket.on('comment:new', handleIncomingComment);

    return () => {
      socket.off('comment:new', handleIncomingComment);
    };
  }, [matchId]);

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
  const hasAdminRole = user?.roles?.includes('ADMIN');
  const hasOrganizerRole = user?.roles?.includes('ORGANIZER');

  const isAssignedReferee = !!match.refereeId && match.refereeId === user?.id;
  const canControlLiveMatch =
    hasAdminRole ||
    hasOrganizerRole ||
    match.tournament?.createdBy === user?.id ||
    isAssignedReferee;

  const currentSetIdx = scores.findIndex((s) => !s.isFinished);
  const activeSetIdx = currentSetIdx !== -1 ? currentSetIdx : scores.length - 1;
  const currentSet = scores[activeSetIdx] || { team1Score: 0, team2Score: 0, isFinished: false };
  const normalizedCommentText = trimAndNormalizeSpaces(commentText);
  const resolvedRules = resolveMatchSportRules(match);
  const scorePresentation = getMatchScorePresentation(resolvedRules.kind);
  const sequenceLabelTitle = scorePresentation.sequenceLabel.charAt(0).toUpperCase() + scorePresentation.sequenceLabel.slice(1);
  const sideOutState = readSideOutState(match);
  const isPickleballSideOut = resolvedRules.kind === 'PICKLEBALL_SIDE_OUT';
  const servingTeamName = sideOutState.servingTeam === 1
    ? team1Name
    : sideOutState.servingTeam === 2
      ? team2Name
      : 'Chưa xác định đội giao';

  const ensureCanControlLiveMatch = () => {
    if (canControlLiveMatch) {
      return true;
    }

    toast.error('Chỉ Ban tổ chức hoặc Trọng tài được phân công mới có quyền điều khiển trận này.');
    return false;
  };

  const buildScoreDetailsPayload = (
    nextScores: typeof scores,
    nextSideOutState: PickleballSideOutState = sideOutState,
  ) => {
    const payload: Record<string, unknown> = {
      sets: nextScores,
    };

    if (isPickleballSideOut) {
      payload.sideOutState = nextSideOutState;
    }

    return payload;
  };

  // Handle Score Updates
  const handleUpdatePoints = async (team: 1 | 2, action: 'inc' | 'dec') => {
    if (!ensureCanControlLiveMatch()) {
      return;
    }
    if (isPickleballSideOut && action === 'inc' && sideOutState.servingTeam !== team) {
      toast.error('Trong mode side-out, chỉ đội đang giao bóng mới được cộng điểm.');
      return;
    }
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
        scoreDetails: buildScoreDetailsPayload(newScores),
        winnerId: match.winnerId,
      });

      setMatch(res);
      setScores(extractMatchScores(res.scoreDetails));
      toast.success(
        `${team === 1 ? team1Name : team2Name} ${action === 'inc' ? 'được cộng' : 'bị trừ'} 1 ${scorePresentation.scoreUnit} ở ${scorePresentation.sequenceLabel} ${activeIdx + 1}.`,
        { id: `score-${matchId}` },
      );
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, 'Không thể cập nhật điểm số của set đang diễn ra.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Match Status Update
  const handleUpdateStatus = async (newStatus: Match['status']) => {
    if (!ensureCanControlLiveMatch()) {
      return;
    }
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
          scoreDetails: buildScoreDetailsPayload(initialScores),
        };
        setScores(initialScores);
      }

      if (scoreUpdatePayload) {
        await matchesApi.updateScore(matchId, scoreUpdatePayload);
      }

      const res = await matchesApi.updateStatus(matchId, { status: newStatus });
      setMatch(res);
      toast.success(
        newStatus === 'ONGOING'
          ? `Đã bắt đầu trận ${team1Name} vs ${team2Name}. Bảng điểm live đang hoạt động.`
          : `Đã chuyển trạng thái trận ${team1Name} vs ${team2Name} sang kết thúc.`,
      );
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, 'Không thể cập nhật trạng thái trận đấu.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Finish Current Set
  const handleFinishSet = async () => {
    if (!ensureCanControlLiveMatch()) {
      return;
    }
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

      if (p1Sets < resolvedRules.setsToWin && p2Sets < resolvedRules.setsToWin) {
        newScores.push({ team1Score: 0, team2Score: 0, isFinished: false });
      }

      const res = await matchesApi.updateScore(matchId, {
        p1SetsWon: p1Sets,
        p2SetsWon: p2Sets,
        scoreDetails: buildScoreDetailsPayload(newScores),
        winnerId: match.winnerId,
      });

      setMatch(res);
      setScores(extractMatchScores(res.scoreDetails));
      const setWinnerName =
        setObj.team1Score > setObj.team2Score
          ? team1Name
          : setObj.team2Score > setObj.team1Score
            ? team2Name
            : 'Không có đội';
      toast.success(
        `Đã chốt ${scorePresentation.sequenceLabel} ${activeIdx + 1}: ${team1Name} ${setObj.team1Score} - ${setObj.team2Score} ${team2Name}. ${setWinnerName !== 'Không có đội' ? `${setWinnerName} thắng ${scorePresentation.sequenceLabel} này.` : ''}`,
      );
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, 'Không thể chốt set hiện tại.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle End Match with Winner Selection
  const handleCompleteMatch = async (winnerTeam: 1 | 2) => {
    if (!ensureCanControlLiveMatch()) {
      return;
    }
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
        const lastSet = buildAutoWinnerScore(scores[activeIdx], winnerTeam, match);
        newScores[activeIdx] = lastSet;
        if (winnerTeam === 1) {
          p1Sets += 1;
        } else {
          p2Sets += 1;
        }
      }

      // Update score and winner
      await matchesApi.updateScore(matchId, {
        p1SetsWon: p1Sets,
        p2SetsWon: p2Sets,
        scoreDetails: buildScoreDetailsPayload(newScores),
        winnerId,
      });

      // Update status to COMPLETED
      const resStatus = await matchesApi.updateStatus(matchId, { status: 'COMPLETED' });

      setMatch(resStatus);
      setScores(extractMatchScores(resStatus.scoreDetails));
      toast.success(
        `Đã hoàn tất trận đấu. Đội thắng: ${winnerTeam === 1 ? team1Name : team2Name}.`,
      );
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, 'Không thể hoàn tất trận đấu.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetServingTeam = async (team: 1 | 2) => {
    if (!ensureCanControlLiveMatch() || !isPickleballSideOut || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const nextState: PickleballSideOutState = {
        servingTeam: team,
        serverNumber: 1,
        openingSequenceDone: true,
      };
      const res = await matchesApi.updateScore(matchId, {
        p1SetsWon: match.p1SetsWon,
        p2SetsWon: match.p2SetsWon,
        scoreDetails: buildScoreDetailsPayload(scores, nextState),
        winnerId: match.winnerId,
      });
      setMatch(res);
      toast.success(`Đã chuyển quyền giao bóng cho ${team === 1 ? team1Name : team2Name}.`);
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, 'Không thể cập nhật đội giao bóng.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSideOut = async () => {
    if (!ensureCanControlLiveMatch() || !isPickleballSideOut || isSubmitting) {
      return;
    }

    if (sideOutState.servingTeam == null) {
      toast.error('Hãy chọn đội giao bóng trước khi thao tác side-out.');
      return;
    }

    setIsSubmitting(true);
    try {
      let nextState: PickleballSideOutState;
      if (sideOutState.serverNumber === 1) {
        nextState = {
          servingTeam: sideOutState.servingTeam,
          serverNumber: 2,
          openingSequenceDone: sideOutState.openingSequenceDone,
        };
      } else {
        nextState = {
          servingTeam: sideOutState.servingTeam === 1 ? 2 : 1,
          serverNumber: 1,
          openingSequenceDone: true,
        };
      }

      const res = await matchesApi.updateScore(matchId, {
        p1SetsWon: match.p1SetsWon,
        p2SetsWon: match.p2SetsWon,
        scoreDetails: buildScoreDetailsPayload(scores, nextState),
        winnerId: match.winnerId,
      });
      setMatch(res);
      toast.success(
        nextState.serverNumber === 2 && nextState.servingTeam === sideOutState.servingTeam
          ? `Đội ${sideOutState.servingTeam === 1 ? team1Name : team2Name} chuyển sang lượt giao thứ 2.`
          : `Side-out: quyền giao bóng chuyển sang ${nextState.servingTeam === 1 ? team1Name : team2Name}.`,
      );
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, 'Không thể cập nhật trạng thái giao bóng side-out.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizedCommentText) {
      toast.error('Bình luận đang trống. Vui lòng nhập nội dung trước khi gửi.');
      return;
    }
    if (!user) {
      toast.error('Bạn cần đăng nhập tài khoản Baseline để gửi bình luận trong trận live.');
      return;
    }
    if (isCommentSubmitting) return;

    setIsCommentSubmitting(true);

    try {
      await matchesApi.createComment(matchId, { commentText: normalizedCommentText });
      setCommentText('');
      toast.success('Đã gửi bình luận vào phòng thảo luận trận đấu.', { id: `comment-${matchId}` });
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, 'Không thể gửi bình luận vào trận đấu này.'));
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-10 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex flex-wrap items-center gap-3">
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
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full">
              <Eye className="w-4 h-4 text-blue-600" /> {viewerCount} đang xem
            </span>
            {!canControlLiveMatch && (
              <span className="text-sm font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
                Chế độ chỉ xem
              </span>
            )}
          </div>
          <Link href={`/tournaments/${match.tournamentId}`} className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
            {match.tournament?.name || 'Quay lại giải đấu'}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns: Match Details, Score Card, Referee Control Panel */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Baseline Camera Live Stream / Replay Container */}
            <div className="bg-slate-950 rounded-3xl overflow-hidden shadow-2xl relative aspect-video flex flex-col items-center justify-center border border-slate-800 group">
              {/* Static scanner effect for premium vibe */}
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-slate-950/40 to-slate-950 pointer-events-none z-0"></div>
              
              <div className="relative z-10 flex flex-col items-center gap-3.5 p-6 text-center max-w-md">
                {match.status === 'ONGOING' ? (
                  <>
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 group-hover:scale-105 transition-transform duration-300">
                      <Camera className="w-7 h-7" />
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 border-2 border-slate-950 flex items-center justify-center text-[7px] font-black text-white">LIVE</span>
                      </span>
                    </div>
                    <h4 className="text-white font-extrabold text-base tracking-tight">Camera Trực Tiếp Sân Đấu</h4>
                    <p className="text-xs text-slate-400 font-semibold leading-relaxed">Luồng truyền hình trực tiếp (Live Stream) từ camera thông minh của Baseline đang hoạt động.</p>
                  </>
                ) : match.status === 'COMPLETED' ? (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <Play className="w-7 h-7 fill-current ml-0.5" />
                    </div>
                    <h4 className="text-white font-extrabold text-base tracking-tight">Video Phát Lại (Replay)</h4>
                    <p className="text-xs text-slate-455 font-medium leading-relaxed">Trận đấu đã kết thúc. Video ghi hình tự động và các set highlight sẽ khả dụng sau khi Ban tổ chức phê duyệt và tải lên.</p>
                  </>
                ) : match.status === 'CANCELLED' ? (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-500">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <h4 className="text-slate-400 font-extrabold text-base tracking-tight">Trận đấu bị Hủy</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Trận đấu này đã bị hủy bỏ bởi Ban tổ chức. Không có luồng trực tiếp hoặc phát lại.</p>
                  </>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                      <Camera className="w-7 h-7" />
                    </div>
                    <h4 className="text-slate-300 font-extrabold text-base tracking-tight">Trực Tiếp Sắp Khả Dụng</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Luồng phát sóng trực tiếp sẽ tự động bắt đầu khi trận đấu được trọng tài kích hoạt khởi tranh.</p>
                  </>
                )}
              </div>
              
              {/* Subtle decoration lines */}
              <div className="absolute top-4 left-4 border-t border-l border-slate-700 w-4 h-4 rounded-tl"></div>
              <div className="absolute top-4 right-4 border-t border-r border-slate-700 w-4 h-4 rounded-tr"></div>
              <div className="absolute bottom-4 left-4 border-b border-l border-slate-700 w-4 h-4 rounded-bl"></div>
              <div className="absolute bottom-4 right-4 border-b border-r border-slate-700 w-4 h-4 rounded-br"></div>
            </div>

            {/* Score Card */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
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
                    <div className="text-slate-500 font-medium mt-1">{scorePresentation.wonSummaryLabel}: {match.p1SetsWon}</div>
                  </div>

                  {/* Main Score Display */}
                  <div className="flex flex-col items-center justify-center mx-4 flex-shrink-0">
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-6xl md:text-8xl font-black tabular-nums tracking-tighter text-slate-900">{currentSet.team1Score}</div>
                      <div className="text-4xl font-black text-slate-300">-</div>
                      <div className="text-6xl md:text-8xl font-black tabular-nums tracking-tighter text-slate-900">{currentSet.team2Score}</div>
                    </div>
                    <div className="mt-4 text-xs font-bold text-slate-400 tracking-widest uppercase flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 animate-pulse text-rose-500" /> {scorePresentation.currentScoreLabel}
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
                    <div className="text-slate-500 font-medium mt-1">{scorePresentation.wonSummaryLabel}: {match.p2SetsWon}</div>
                  </div>
                </div>

                {/* Set History */}
                {scores.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col items-center">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{scorePresentation.summaryLabel}</h4>
                    <div className="flex flex-wrap justify-center gap-4">
                      {scores.map((set, idx) => (
                        <div key={idx} className={`px-5 py-2.5 rounded-2xl border flex flex-col items-center shadow-sm ${
                          !set.isFinished 
                            ? 'bg-rose-50 border-rose-100 ring-2 ring-rose-100' 
                            : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-[10px] font-bold text-slate-500 mb-1 uppercase">{sequenceLabelTitle} {idx + 1}</span>
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

            {resolvedRules.kind === 'PICKLEBALL_SIDE_OUT' && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-900 font-medium">
                  Chế độ pickleball side-out đang bám theo đội giao bóng hiện tại. Chỉ đội giao bóng mới được cộng điểm.
                </div>
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1.2fr_1fr]">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Trạng thái giao bóng</p>
                    <p className="mt-2 text-sm font-black text-slate-900">
                      {sideOutState.servingTeam == null
                        ? 'Chưa chọn đội giao'
                        : `${servingTeamName} đang giao • lượt ${sideOutState.serverNumber}`}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Dùng `Mất giao / Side-out` để chuyển từ người giao 1 sang người giao 2, rồi mới sang đội còn lại.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSetServingTeam(1)}
                        disabled={isSubmitting}
                        className={`rounded-xl border px-3 py-2 text-xs font-black transition-colors ${
                          sideOutState.servingTeam === 1
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                        }`}
                      >
                        {team1Name} giao
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSetServingTeam(2)}
                        disabled={isSubmitting}
                        className={`rounded-xl border px-3 py-2 text-xs font-black transition-colors ${
                          sideOutState.servingTeam === 2
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
                        }`}
                      >
                        {team2Name} giao
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSideOut()}
                      disabled={isSubmitting || sideOutState.servingTeam == null}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    >
                      Mất giao / Side-out
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Live Match Control Panel */}
            {canControlLiveMatch && (
              <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 md:p-8">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Bảng điều khiển trận đấu</h3>
                    <p className="text-xs text-slate-500">Cập nhật điểm số và trạng thái trận đấu theo thời gian thực</p>
                  </div>
                </div>

                {match.status === 'SCHEDULED' && (
                  <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                    <AlertCircle className="w-12 h-12 text-blue-500 mb-2" />
                    <h4 className="font-bold text-slate-800 mb-1">Trận đấu chưa bắt đầu</h4>
                    {(!match.participant1Id || !match.participant2Id) ? (
                      <>
                        <p className="text-xs text-amber-600 font-bold bg-amber-50 border border-amber-100 p-2.5 rounded-lg mb-6 max-w-sm">
                          ⚠️ Chưa xác định đầy đủ hai đối thủ tham gia thi đấu. Vui lòng chờ các trận đấu ở vòng trước hoàn thành.
                        </p>
                        <button
                          disabled={true}
                          className="flex items-center gap-2 px-6 py-3 bg-slate-200 text-slate-400 font-bold rounded-xl transition-all cursor-not-allowed"
                        >
                          <Play className="w-4 h-4 fill-current" /> Bắt đầu trận đấu
                        </button>
                      </>
                    ) : (
                      <>
                    <p className="text-xs text-slate-500 mb-6 max-w-sm">Hãy kích hoạt trận đấu để bắt đầu ghi điểm {scorePresentation.sequenceLabel} đấu.</p>
                        <button
                          onClick={() => handleUpdateStatus('ONGOING')}
                          disabled={isSubmitting}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                        >
                          <Play className="w-4 h-4 fill-current" /> Bắt đầu trận đấu
                        </button>
                      </>
                    )}
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
                            disabled={isSubmitting || currentSet.team1Score <= 0 || !match.participant1Id || !match.participant2Id}
                            className="w-12 h-12 rounded-full bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors shadow-sm disabled:opacity-50"
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <span className="text-4xl font-black text-slate-900 tabular-nums w-12 text-center">{currentSet.team1Score}</span>
                          <button
                            onClick={() => handleUpdatePoints(1, 'inc')}
                            disabled={isSubmitting || !match.participant1Id || !match.participant2Id || (isPickleballSideOut && sideOutState.servingTeam !== 1)}
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
                            disabled={isSubmitting || currentSet.team2Score <= 0 || !match.participant1Id || !match.participant2Id}
                            className="w-12 h-12 rounded-full bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors shadow-sm disabled:opacity-50"
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <span className="text-4xl font-black text-slate-900 tabular-nums w-12 text-center">{currentSet.team2Score}</span>
                          <button
                            onClick={() => handleUpdatePoints(2, 'inc')}
                            disabled={isSubmitting || !match.participant1Id || !match.participant2Id || (isPickleballSideOut && sideOutState.servingTeam !== 2)}
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
                        disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
                      >
                        <Check className="w-4 h-4 text-emerald-500" /> {scorePresentation.completeActionLabel}
                      </button>

                      <div className="flex flex-1 gap-3">
                        <button
                          onClick={() => handleCompleteMatch(1)}
                          disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 text-xs"
                        >
                          <Trophy className="w-4 h-4" /> Đội 1 Thắng
                        </button>
                        <button
                          onClick={() => handleCompleteMatch(2)}
                          disabled={isSubmitting || !match.participant1Id || !match.participant2Id}
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

          {/* Right Column: Comments & Chat */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[550px] sticky top-6">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-650" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Thảo luận trận đấu</h3>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <Eye className="w-3.5 h-3.5" /> {viewerCount}
                </div>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-slate-200 flex items-center justify-center font-bold text-xs text-blue-600 shrink-0 uppercase overflow-hidden">
                      {comment.user?.avatarUrl ? (
                        <img src={comment.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        (comment.user?.fullName || 'N').charAt(0)
                      )}
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-xs font-bold text-slate-800 truncate">{comment.user?.fullName || 'Người dùng'}</span>
                        <span className="text-[9px] text-slate-400 font-medium shrink-0">
                          {new Date(comment.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-650 mt-1 leading-relaxed break-words">{comment.commentText}</p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm my-auto">
                    Chưa có thảo luận nào. Hãy gửi bình luận đầu tiên!
                  </div>
                )}
              </div>

              {/* Comment Form */}
              <form onSubmit={handlePostComment} className="p-4 border-t border-slate-100 bg-white flex gap-2">
                <input
                  type="text"
                  placeholder={user ? 'Nhập bình luận của bạn...' : 'Đăng nhập để bình luận'}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={!user || isCommentSubmitting}
                  className="flex-grow px-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  disabled={!user || isCommentSubmitting || !normalizedCommentText}
                  className="bg-blue-650 hover:bg-blue-700 text-white rounded-xl p-2.5 flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
