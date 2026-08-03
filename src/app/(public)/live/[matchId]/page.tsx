'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useRef, useState, use } from 'react';
import { matchesApi, Match, MatchComment } from '@/features/matches/api';
import {
  buildAutoWinnerScore,
  extractMatchScores,
  getMatchScorePresentation,
  resolveMatchSportRules,
} from '@/features/matches/score-display';
import { getScoreRuleWarnings } from '@/features/matches/score-rule-warnings';
import { getScoreEntryGuidance } from '@/features/tournaments/sport-rules/ui-guidance';
import {
  computeNextSideOutState,
  readSideOutState,
  setServingTeamSideOutState,
} from '@/features/matches/side-out';
import {
  awardTennisPoint,
  createTennisLivePointState,
  formatTennisPointDisplay,
  isTennisPointStateEmpty,
  readPenaltyLog,
  readTennisLivePointState,
  stepBackTennisPoint,
} from '@/features/matches/live-score-state';
import { useLiveMatch } from '@/hooks/useLiveMatch';
import { useAuthStore } from '@/lib/zustand/authStore';
import { socketClient } from '@/lib/socket';
import type { MatchPenaltyRecord, PickleballSideOutState, TennisLivePointState } from '@/types/match';
import { getErrorMessage } from '@/utils/error';
import { cn } from '@/utils/cn';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { formatCompact } from '@/utils/format';
import { Trophy, Clock, MapPin, Activity, Play, AlertCircle, Camera, MessageSquare, Send, Eye, Shield, Users, Heart, Share2 } from 'lucide-react';
import { livestreamApi, tournamentsApi, type MatchPlaybackResponse } from '@/features/tournaments/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { OfficialScoreModal } from './components/OfficialScoreModal';
import type { TournamentParticipant } from '@/types/tournament';
import { ReportViolationButton } from '@/features/reports/components/ReportViolationButton';
import ShareModal from '@/components/common/ShareModal';

interface Props {
  params: Promise<{ matchId: string }>;
}

export default function LiveMatchPage({ params }: Props) {
  const router = useRouter();
  const resolvedParams = use(params);
  const matchId = resolvedParams.matchId;
  const { match, scores, viewerCount, cheerCount, setCheerCount, setMatch, setScores, isLoading, error } = useLiveMatch(matchId);
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [isOfficialScoreModalOpen, setIsOfficialScoreModalOpen] = useState(false);
  const [optimisticTennisPointState, setOptimisticTennisPointState] = useState<TennisLivePointState | null>(null);
  const lastSyncedTennisServerKeyRef = useRef<string>('init');

  const [comments, setComments] = useState<MatchComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [hearts, setHearts] = useState<{ id: string; x: number; size: number; delay: number }[]>([]);
  const [playback, setPlayback] = useState<MatchPlaybackResponse | null>(null);

  // Share state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Chat auto scroll ref
  const commentsEndRef = useRef<HTMLDivElement | null>(null);



  const getTeamEloDisplay = (part: typeof part1) => {
    if (!part) return null;
    
    // 1. Dùng eloPoints chung từ backend trả về nếu có
    if (typeof part.eloPoints === 'number') {
      return part.eloPoints;
    }
    
    // 2. Fallback nếu API cũ chưa update:
    if (!part.members || part.members.length === 0) return null;
    const validMembers = part.members.filter(m => !m.isMock);
    if (validMembers.length === 0) return 1000;
    
    const sum = validMembers.reduce((acc, m) => acc + (m.elo?.eloPoints || 1000), 0);
    return Math.round(sum / validMembers.length);
  };

  const handleSpawnHeart = async () => {
    const id = Math.random().toString(36).substring(2, 9);
    const newHeart = {
      id,
      x: Math.random() * 80 + 10,
      size: Math.random() * 12 + 16,
      delay: Math.random() * 0.1,
    };
    setHearts((prev) => [...prev, newHeart]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, 2000);

    try {
      const res = await matchesApi.cheerMatch(matchId);
      setCheerCount(res.cheerCount);
    } catch {
      // Silent
    }
  };

  const handleCheer = async () => {
    try {
      await matchesApi.cheerMatch(matchId);
    } catch {}
  };

  // Auto scroll chat to bottom when comments list changes
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  useEffect(() => {
    if (!match?.tournamentId) return;
    let isMounted = true;
    const fetchParticipants = async () => {
      try {
        const res = await tournamentsApi.getTournamentParticipants(match.tournamentId);
        if (isMounted && res.data) {
          setParticipants(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch participants:', err);
      }
    };
    void fetchParticipants();
    return () => {
      isMounted = false;
    };
  }, [match?.tournamentId]);

  useEffect(() => {
    let isMounted = true;

    const fetchPlayback = async () => {
      try {
        const response = await livestreamApi.getMatchPlayback(matchId);
        if (isMounted) {
          setPlayback(response.data ?? null);
        }
      } catch {
        if (isMounted) {
          setPlayback(null);
        }
      }
    };

    void fetchPlayback();

    return () => {
      isMounted = false;
    };
  }, [matchId]);

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

  const optimisticCurrentSetIdx = scores.findIndex((s) => !s.isFinished);
  const optimisticActiveSetIdx = optimisticCurrentSetIdx !== -1 ? optimisticCurrentSetIdx : scores.length - 1;
  const optimisticCurrentSet = scores[optimisticActiveSetIdx] || { team1Score: 0, team2Score: 0, isFinished: false };
  const optimisticResolvedRules = resolveMatchSportRules(match ?? {});
  const optimisticIsTennis = optimisticResolvedRules.kind === 'TENNIS';
  const resolvedTennisPointState = optimisticIsTennis && match
    ? readTennisLivePointState(match, optimisticCurrentSet)
    : null;
  const resolvedTennisPointStateKey = resolvedTennisPointState
    ? `${resolvedTennisPointState.mode}:${String(resolvedTennisPointState.team1Point)}:${String(resolvedTennisPointState.team2Point)}`
    : 'none';
  const optimisticTennisPointStateKey = optimisticTennisPointState
    ? `${optimisticTennisPointState.mode}:${String(optimisticTennisPointState.team1Point)}:${String(optimisticTennisPointState.team2Point)}`
    : 'none';
  const serverScoreDetailsKey =
    optimisticIsTennis && match?.scoreDetails
      ? JSON.stringify(match.scoreDetails)
      : 'none';

  useEffect(() => {
    let isCancelled = false;

    void Promise.resolve().then(() => {
      if (isCancelled) {
        return;
      }

      if (!optimisticIsTennis) {
        lastSyncedTennisServerKeyRef.current = serverScoreDetailsKey;
        if (optimisticTennisPointState !== null) {
          setOptimisticTennisPointState(null);
        }
        return;
      }

      if (lastSyncedTennisServerKeyRef.current === serverScoreDetailsKey) {
        return;
      }

      lastSyncedTennisServerKeyRef.current = serverScoreDetailsKey;

      if (optimisticTennisPointStateKey !== resolvedTennisPointStateKey) {
        setOptimisticTennisPointState(resolvedTennisPointState);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [
    optimisticIsTennis,
    optimisticTennisPointState,
    optimisticTennisPointStateKey,
    resolvedTennisPointState,
    resolvedTennisPointStateKey,
    serverScoreDetailsKey,
  ]);

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
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-slate-100 max-w-md">
          <img src="/vndcsport.svg" alt="VNDC Sport Logo" className="w-20 h-20 object-contain mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">{error || 'Không tìm thấy trận đấu'}</h2>
          <p className="text-slate-500 text-sm mb-6">Trận đấu này có thể không tồn tại hoặc đã bị hủy.</p>
          <Link href="/tournaments" className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-sm">
            Quay lại giải đấu
          </Link>
        </div>
      </div>
    );
  }

  const team1Name = match.participant1?.teamName || 'Chưa xác định';
  const team2Name = match.participant2?.teamName || 'Chưa xác định';
  const hasAdminRole = user?.roles?.includes('ADMIN') ?? false;
  const hasOrganizerRole = user?.roles?.includes('ORGANIZER') ?? false;

  const isUserReferee = user?.roles?.includes('REFEREE') ?? false;
  const isAssignedReferee = isUserReferee && (match.refereeId == null || match.refereeId === user?.id);
  const canControlLiveMatch = Boolean(
    hasAdminRole ||
      match.tournament?.createdBy === user?.id ||
      isAssignedReferee,
  );

  // Cho phép bình luận tự do thoải mái
  const isCommentDisabled = () => false;

  const currentSetIdx = scores.findIndex((s) => !s.isFinished);
  const activeSetIdx = currentSetIdx !== -1 ? currentSetIdx : scores.length - 1;
  const currentSet = scores[activeSetIdx] || { team1Score: 0, team2Score: 0, isFinished: false };
  const normalizedCommentText = trimAndNormalizeSpaces(commentText);
  const resolvedRules = resolveMatchSportRules(match);
  const scorePresentation = getMatchScorePresentation(resolvedRules.kind);
  const scoreGuidance = getScoreEntryGuidance(resolvedRules.kind);
  const sequenceLabelTitle = scorePresentation.sequenceLabel.charAt(0).toUpperCase() + scorePresentation.sequenceLabel.slice(1);
  const sideOutState = readSideOutState(match);
  const isPickleballSideOut = resolvedRules.kind === 'PICKLEBALL_SIDE_OUT';
  const isTennis = resolvedRules.kind === 'TENNIS';
  const tennisPointState = isTennis ? optimisticTennisPointState ?? resolvedTennisPointState : null;
  const penalties = readPenaltyLog(match);
  const scoreWarnings = getScoreRuleWarnings(scores, resolvedRules);
  const scoreOverride =
    match.scoreDetails &&
    typeof match.scoreDetails === 'object' &&
    'scoreOverride' in match.scoreDetails
      ? (match.scoreDetails.scoreOverride as {
          reason?: string;
          decidedAt?: string;
        } | undefined)
      : undefined;

  const ensureCanControlLiveMatch = () => {
    if (canControlLiveMatch) {
      return true;
    }

    toast.error('Chỉ Ban tổ chức hoặc Trọng tài được phân công mới có quyền điều khiển trận này.');
    return false;
  };

  const resolveOverrideReason = () => {
    if (!overrideEnabled) {
      return null;
    }

    const trimmedReason = trimAndNormalizeSpaces(overrideReason);
    if (!trimmedReason) {
      toast.error('Bật override thì bắt buộc phải nhập lý do để lưu audit.');
      return null;
    }

    return trimmedReason;
  };

  const validateSetCanFinish = (setItem: { team1Score: number; team2Score: number }, setIndex: number) => {
    const team1Score = Number(setItem.team1Score);
    const team2Score = Number(setItem.team2Score);
    const maxScore = Math.max(team1Score, team2Score);
    const minScore = Math.min(team1Score, team2Score);
    const diff = maxScore - minScore;
    const label = `${scorePresentation.sequenceLabel.charAt(0).toUpperCase() + scorePresentation.sequenceLabel.slice(1)} ${setIndex + 1}`;

    if (team1Score === 0 && team2Score === 0) {
      return { ok: false, message: `${label} đang là 0-0. Hãy nhập điểm thực tế trước khi chốt.` };
    }

    if (team1Score === team2Score) {
      return { ok: false, message: `${label} đang hòa ${team1Score}-${team2Score}. Hãy chỉnh lại tỉ số hoặc bật ngoại lệ.` };
    }

    if (resolvedRules.kind === 'TENNIS') {
      if (maxScore < resolvedRules.pointsPerSet) {
        return { ok: false, message: `${label} chưa đạt tối thiểu ${resolvedRules.pointsPerSet} game.` };
      }
      if (maxScore > resolvedRules.maxPoints) {
        return { ok: false, message: `${label} vượt quá ngưỡng tối đa ${resolvedRules.maxPoints} game.` };
      }
      if (maxScore === resolvedRules.pointsPerSet) {
        if (diff < 2 || minScore > resolvedRules.pointsPerSet - 2) {
          return { ok: false, message: `${label} chưa đủ cách biệt để chốt.` };
        }
      } else if (maxScore === resolvedRules.maxPoints) {
        if (minScore < resolvedRules.maxPoints - 1) {
          return { ok: false, message: `${label} chưa đủ điều kiện để chốt ở ngưỡng tối đa.` };
        }
      }

      return { ok: true };
    }

    if (!resolvedRules.winByTwo) {
      if (maxScore < resolvedRules.pointsPerSet) {
        return { ok: false, message: `${label} chưa đạt mốc ${resolvedRules.pointsPerSet} điểm.` };
      }
      return { ok: true };
    }

    if (maxScore < resolvedRules.pointsPerSet) {
      return { ok: false, message: `${label} chưa đạt tối thiểu ${resolvedRules.pointsPerSet} điểm.` };
    }

    if (maxScore < resolvedRules.maxPoints && diff < 2) {
      return { ok: false, message: `${label} chưa đủ cách biệt 2 điểm để chốt.` };
    }

    if (maxScore > resolvedRules.maxPoints) {
      return { ok: false, message: `${label} vượt quá ngưỡng tối đa ${resolvedRules.maxPoints} điểm.` };
    }

    return { ok: true };
  };

  const buildScoreDetailsPayload = (
    nextScores: typeof scores,
    nextSideOutState: PickleballSideOutState = sideOutState,
    nextTennisPointState: TennisLivePointState | null = tennisPointState,
    nextPenalties: MatchPenaltyRecord[] = penalties,
  ) => {
    const basePayload =
      match.scoreDetails && typeof match.scoreDetails === 'object'
        ? match.scoreDetails
        : {};

    const payload: Record<string, unknown> = {
      ...basePayload,
      sets: nextScores,
      penalties: nextPenalties,
    };

    if (isPickleballSideOut) {
      payload.sideOutState = nextSideOutState;
    }

    const liveState =
      basePayload.liveState && typeof basePayload.liveState === 'object'
        ? { ...(basePayload.liveState as Record<string, unknown>) }
        : {};

    if (isTennis && nextTennisPointState) {
      liveState.tennisPointState = nextTennisPointState;
      payload.liveState = liveState;
    } else if (Object.keys(liveState).length > 0) {
      payload.liveState = liveState;
    }

    return payload;
  };

  const deriveSetsWon = (nextScores: typeof scores) =>
    nextScores.reduce(
      (summary, setItem) => {
        if (!setItem.isFinished) {
          return summary;
        }

        if (setItem.team1Score > setItem.team2Score) {
          summary.p1SetsWon += 1;
        } else if (setItem.team2Score > setItem.team1Score) {
          summary.p2SetsWon += 1;
        }

        return summary;
      },
      { p1SetsWon: 0, p2SetsWon: 0 },
    );

  const mergeMatchUpdate = (nextMatch: Match): Match => ({
    ...match,
    ...nextMatch,
    participant1: nextMatch.participant1 ?? match.participant1,
    participant2: nextMatch.participant2 ?? match.participant2,
    tournament: nextMatch.tournament ?? match.tournament,
    stage: nextMatch.stage ?? match.stage,
  });

  const applyServerSnapshot = (nextMatch: Match) => {
    startTransition(() => {
      setMatch(mergeMatchUpdate(nextMatch));
      setScores(extractMatchScores(nextMatch.scoreDetails));
    });
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
    const appliedOverrideReason = resolveOverrideReason();
    if (overrideEnabled && !appliedOverrideReason) {
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
      let nextTennisPointState = tennisPointState;

      if (isTennis && tennisPointState) {
        if (action === 'inc') {
          const tennisResult = awardTennisPoint(setObj, tennisPointState, team, resolvedRules);
          newScores[activeIdx] = tennisResult.nextSet;
          nextTennisPointState = tennisResult.nextLiveState;
        } else if (isTennisPointStateEmpty(tennisPointState)) {
          newScores[activeIdx] =
            team === 1
              ? {
                  ...setObj,
                  team1Score: Math.max(0, setObj.team1Score - 1),
                }
              : {
                  ...setObj,
                  team2Score: Math.max(0, setObj.team2Score - 1),
                };
          nextTennisPointState = createTennisLivePointState(newScores[activeIdx]);
        } else {
          nextTennisPointState = stepBackTennisPoint(tennisPointState, team);
          newScores[activeIdx] = setObj;
        }
      } else {
        if (team === 1) {
          setObj.team1Score = Math.max(0, action === 'inc' ? setObj.team1Score + 1 : setObj.team1Score - 1);
        } else {
          setObj.team2Score = Math.max(0, action === 'inc' ? setObj.team2Score + 1 : setObj.team2Score - 1);
        }
        newScores[activeIdx] = setObj;
      }

      // KhÃ´ng cho nÃºt cÃ´ng vÆ°á»£t tráº§n preset. Ngoáº¡i lá»‡ pháº£i Ä‘Æ°á»£c báº­t vÃ  cÃ³ lÃ½ do trÆ°á»›c Ä‘Ã³.
      if (!overrideEnabled && Math.max(newScores[activeIdx].team1Score, newScores[activeIdx].team2Score) > resolvedRules.maxPoints) {
        toast.error(`Äiá»ƒm set khÃ´ng Ä‘Æ°á»£c vÆ°á»£t ${resolvedRules.maxPoints}. Báº­t ngoáº¡i lá»‡ náº¿u BTC/trá»ng tÃ i Ä‘Ã£ xÃ¡c nháº­n.`);
        return;
      }

      // Optimistic Update
      setScores(newScores);
      if (isTennis) {
        setOptimisticTennisPointState(nextTennisPointState);
      }
      const nextSetsWon = deriveSetsWon(newScores);

      const res = await matchesApi.updateScore(matchId, {
        p1SetsWon: nextSetsWon.p1SetsWon,
        p2SetsWon: nextSetsWon.p2SetsWon,
        scoreDetails: buildScoreDetailsPayload(newScores, sideOutState, nextTennisPointState),
        winnerId: match.winnerId,
        ...(appliedOverrideReason ? { overrideReason: appliedOverrideReason } : {}),
      });

      applyServerSnapshot(res);
      toast.success(
        isTennis
          ? `${team === 1 ? team1Name : team2Name} ${action === 'inc' ? 'thắng thêm 1 pha bóng' : 'được lùi lại 1 mức điểm'} trong game hiện tại.`
          : `${team === 1 ? team1Name : team2Name} ${action === 'inc' ? 'được cộng' : 'bị trừ'} 1 ${scorePresentation.scoreUnit} ở ${scorePresentation.sequenceLabel} ${activeIdx + 1}.`,
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
        const nextSetsWon = deriveSetsWon(initialScores);
        const nextTennisState = isTennis ? createTennisLivePointState(initialScores[0]) : null;
        scoreUpdatePayload = {
          p1SetsWon: nextSetsWon.p1SetsWon,
          p2SetsWon: nextSetsWon.p2SetsWon,
          scoreDetails: buildScoreDetailsPayload(
            initialScores,
            sideOutState,
            nextTennisState,
          ),
        };
        setScores(initialScores);
        if (isTennis) {
          setOptimisticTennisPointState(nextTennisState);
        }
      }

      if (scoreUpdatePayload) {
        await matchesApi.updateScore(matchId, scoreUpdatePayload);
      }

      const res = await matchesApi.updateStatus(matchId, { status: newStatus });
      startTransition(() => {
        setMatch(mergeMatchUpdate(res));
      });
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
    const appliedOverrideReason = resolveOverrideReason();
    if (overrideEnabled && !appliedOverrideReason) {
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
      if (!appliedOverrideReason) {
        const finishValidation = validateSetCanFinish(setObj, activeIdx);
        if (!finishValidation.ok) {
          toast.error(finishValidation.message ?? 'Không thể chốt set hiện tại.');
          setIsSubmitting(false);
          return;
        }
      } else {
        setObj.scoreOverride = { reason: appliedOverrideReason };
      }
      newScores[activeIdx] = setObj;

      const nextSetsWon = deriveSetsWon(newScores);

      if (nextSetsWon.p1SetsWon < resolvedRules.setsToWin && nextSetsWon.p2SetsWon < resolvedRules.setsToWin) {
        newScores.push({ team1Score: 0, team2Score: 0, isFinished: false });
      }

      const nextTennisPointState =
        isTennis &&
        nextSetsWon.p1SetsWon < resolvedRules.setsToWin &&
        nextSetsWon.p2SetsWon < resolvedRules.setsToWin
          ? createTennisLivePointState(newScores[newScores.length - 1])
          : null;

      setScores(newScores);
      if (isTennis) {
        setOptimisticTennisPointState(nextTennisPointState);
      }

      const res = await matchesApi.updateScore(matchId, {
        p1SetsWon: nextSetsWon.p1SetsWon,
        p2SetsWon: nextSetsWon.p2SetsWon,
        scoreDetails: buildScoreDetailsPayload(newScores, sideOutState, nextTennisPointState),
        winnerId: match.winnerId,
        ...(appliedOverrideReason ? { overrideReason: appliedOverrideReason } : {}),
      });

      applyServerSnapshot(res);
      if (appliedOverrideReason) {
        setOverrideEnabled(false);
        setOverrideReason('');
      }
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
    if (!overrideEnabled) {
      toast.error('Chốt một đội thắng thẳng là nghiệp vụ ngoại lệ. Hãy bật ngoại lệ và nhập lý do trước.');
      return;
    }
    const appliedOverrideReason = resolveOverrideReason();
    if (!appliedOverrideReason) {
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

      const activeIdx = scores.findIndex((s) => !s.isFinished);
      if (activeIdx !== -1) {
        const lastSet = buildAutoWinnerScore(scores[activeIdx], winnerTeam, match);
        newScores[activeIdx] = lastSet;
      }

      const nextSetsWon = deriveSetsWon(newScores);
      setScores(newScores);
      if (isTennis) {
        setOptimisticTennisPointState(null);
      }

      // Update score and winner
      const completedMatch = await matchesApi.updateScore(matchId, {
        p1SetsWon: nextSetsWon.p1SetsWon,
        p2SetsWon: nextSetsWon.p2SetsWon,
        scoreDetails: buildScoreDetailsPayload(newScores, sideOutState, null),
        winnerId,
        ...(appliedOverrideReason ? { overrideReason: appliedOverrideReason } : {}),
      });

      applyServerSnapshot(completedMatch);
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
    const appliedOverrideReason = resolveOverrideReason();
    if (overrideEnabled && !appliedOverrideReason) {
      return;
    }

    setIsSubmitting(true);
    try {
      const nextState: PickleballSideOutState = setServingTeamSideOutState(team);
      const nextSetsWon = deriveSetsWon(scores);
      const res = await matchesApi.updateScore(matchId, {
        p1SetsWon: nextSetsWon.p1SetsWon,
        p2SetsWon: nextSetsWon.p2SetsWon,
        scoreDetails: buildScoreDetailsPayload(scores, nextState),
        winnerId: match.winnerId,
        ...(appliedOverrideReason ? { overrideReason: appliedOverrideReason } : {}),
      });
      setMatch(mergeMatchUpdate(res));
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
    const appliedOverrideReason = resolveOverrideReason();
    if (overrideEnabled && !appliedOverrideReason) {
      return;
    }

    setIsSubmitting(true);
    try {
      const nextState: PickleballSideOutState = computeNextSideOutState(sideOutState);
      const nextSetsWon = deriveSetsWon(scores);

      const res = await matchesApi.updateScore(matchId, {
        p1SetsWon: nextSetsWon.p1SetsWon,
        p2SetsWon: nextSetsWon.p2SetsWon,
        scoreDetails: buildScoreDetailsPayload(scores, nextState),
        winnerId: match.winnerId,
        ...(appliedOverrideReason ? { overrideReason: appliedOverrideReason } : {}),
      });
      setMatch(mergeMatchUpdate(res));
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

  const handleAddPenalty = async (
    team: 1 | 2 | null,
    kind: string,
    label: string,
    note?: string,
  ) => {
    if (!ensureCanControlLiveMatch() || isSubmitting) {
      return;
    }

    const appliedOverrideReason = resolveOverrideReason();
    if (overrideEnabled && !appliedOverrideReason) {
      return;
    }

    setIsSubmitting(true);
    try {
      const nextPenalties: MatchPenaltyRecord[] = [
        {
          id: crypto.randomUUID(),
          team,
          kind,
          label,
          note,
          createdAt: new Date().toISOString(),
        },
        ...penalties,
      ];
      const nextSetsWon = deriveSetsWon(scores);

      const res = await matchesApi.updateScore(matchId, {
        p1SetsWon: nextSetsWon.p1SetsWon,
        p2SetsWon: nextSetsWon.p2SetsWon,
        scoreDetails: buildScoreDetailsPayload(scores, sideOutState, tennisPointState, nextPenalties),
        winnerId: match.winnerId,
        ...(appliedOverrideReason ? { overrideReason: appliedOverrideReason } : {}),
      });

      setMatch(mergeMatchUpdate(res));
      toast.success(`Đã ghi nhận hình phạt: ${label}.`);
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, 'Không thể lưu hình phạt cho trận này.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDisplayTeam1 = isTennis && tennisPointState
    ? formatTennisPointDisplay(tennisPointState.team1Point)
    : String(currentSet.team1Score);
  const currentDisplayTeam2 = isTennis && tennisPointState
    ? formatTennisPointDisplay(tennisPointState.team2Point)
    : String(currentSet.team2Score);
  const currentDetailScoreLabel = isTennis
    ? `Game của ${scorePresentation.sequenceLabel} ${activeSetIdx + 1}: ${currentSet.team1Score} - ${currentSet.team2Score}`
    : null;

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Bạn cần đăng nhập để gửi bình luận.');
      router.push('/login');
      return;
    }
    if (!normalizedCommentText) {
      toast.error('Bình luận đang trống. Vui lòng nhập nội dung trước khi gửi.');
      return;
    }
    if (isCommentSubmitting) return;

    setIsCommentSubmitting(true);

    try {
      const created = await matchesApi.createComment(matchId, { commentText: normalizedCommentText });
      setCommentText('');
      // Thêm comment ngay lập tức vào local state với thông tin user hiện tại
      if (created) {
        const enrichedComment = {
          ...created,
          user: created.user || (user ? { id: user.id, fullName: user.fullName, avatarUrl: user.avatarUrl } : null),
        };
        setComments(prev => [enrichedComment, ...prev]);
      }
      toast.success('Đã gửi bình luận vào phòng thảo luận trận đấu.', { id: `comment-${matchId}` });
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, 'Không thể gửi bình luận vào trận đấu này.'));
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const part1 = participants.find((p) => p.id === match.participant1Id || p.id === match.participant1?.id);
  const part2 = participants.find((p) => p.id === match.participant2Id || p.id === match.participant2?.id);

  return (
    <div className="min-h-screen bg-slate-50 pt-10 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Tournament Logo & Name */}
            <Link href={`/tournaments/${match.tournamentId}`} className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-300 px-3 py-1 rounded-full shadow-2xs transition-all group">
              {match.tournament?.logoUrl ? (
                <img src={match.tournament.logoUrl} alt={match.tournament.name} className="w-5 h-5 object-cover rounded-full" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                  <Trophy className="w-3 h-3 text-amber-300" />
                </div>
              )}
              <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors max-w-[180px] truncate">
                {match.tournament?.name || 'Giải đấu'}
              </span>
            </Link>

            {match.tournament?.categoryName && (
              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                {match.tournament.categoryName}
              </span>
            )}

            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              match.status === 'ONGOING' 
                ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                : match.status === 'COMPLETED' 
                ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                : 'bg-blue-50 text-blue-700 border border-blue-100'
            }`}>
              {match.status === 'ONGOING' && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
              {match.status === 'ONGOING' ? 'Trực tiếp' : match.status === 'COMPLETED' ? 'Kết thúc' : 'Sắp diễn ra'}
            </span>
            <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Vòng {match.roundNumber}</span>
            </span>

            <span className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
              <Eye className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              <span>{formatCompact(viewerCount)} đang xem</span>
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <span>Môn: {scorePresentation.sportLabel}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsShareModalOpen(true)}
              variant="outline"
              className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-bold shadow-xs h-9 text-xs px-3.5 flex items-center gap-1.5 rounded-lg transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Chia sẻ</span>
            </Button>
            <ReportViolationButton
              targetType="MATCH"
              targetId={match.id}
              targetLabel={`Trận vòng ${match.roundNumber}`}
              className="h-9 text-xs px-3.5 rounded-lg shadow-xs"
            />
            <Link 
              href={`/tournaments/${match.tournamentId}`} 
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 hover:border-blue-200 transition-all bg-white border border-slate-200 px-3.5 h-9 rounded-lg shadow-xs shrink-0"
            >
              <Trophy className="w-3.5 h-3.5 text-blue-500" />
              <span>{match.tournament?.name || 'Quay lại giải đấu'}</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns: Match Details, Score Card, Referee Control Panel */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* VNDC Sport Camera Live Stream / Replay Container */}
            <div className="bg-slate-950 rounded-2xl overflow-hidden shadow-2xl relative aspect-video flex flex-col items-center justify-center border border-slate-800 group">
              {/* Static scanner effect for premium vibe */}
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-slate-950/40 to-slate-950 pointer-events-none z-0"></div>
              
              {/* Floating hearts container inside video container */}
              <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
                {hearts.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      left: `${h.x}%`,
                      fontSize: `${h.size}px`,
                      animationDelay: `${h.delay}s`,
                    }}
                    className="absolute bottom-6 animate-float-up opacity-0 z-30 select-none text-rose-500"
                  >
                    ❤️
                  </div>
                ))}
              </div>

              <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-3.5 p-6 text-center">
                {playback?.playbackUrl ? (
                  <>
                    <video
                      className="absolute inset-0 h-full w-full object-cover"
                      controls
                      playsInline
                      src={playback.playbackUrl}
                    />
                    <div className="absolute left-4 top-4 rounded-full border border-rose-400/40 bg-rose-600/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      {playback.streamStatus === 'LIVE' ? 'LIVE' : playback.streamStatus}
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-left backdrop-blur">
                      <p className="text-sm font-bold text-white">{playback.cameraName || 'Camera trận đấu'}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-300">Người xem chỉ có quyền xem luồng phát và bảng điểm realtime.</p>
                    </div>
                  </>
                ) : match.status === 'ONGOING' ? (
                  <>
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 group-hover:scale-105 transition-transform duration-300">
                      <Camera className="w-7 h-7" />
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 border-2 border-slate-950 flex items-center justify-center text-[7px] font-bold text-white">LIVE</span>
                      </span>
                    </div>
                    <h4 className="text-white font-bold text-base tracking-tight">Camera Trực Tiếp Sân Đấu</h4>
                    <p className="text-xs text-slate-400 font-semibold leading-relaxed">Luồng truyền hình trực tiếp (Live Stream) từ camera thông minh của VNDC Sport đang hoạt động.</p>
                  </>
                ) : match.status === 'COMPLETED' ? (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <Play className="w-7 h-7 fill-current ml-0.5" />
                    </div>
                    <h4 className="text-white font-bold text-base tracking-tight">Video Phát Lại (Replay)</h4>
                    <p className="text-xs text-slate-455 font-medium leading-relaxed">Trận đấu đã kết thúc. Video ghi hình tự động và các set highlight sẽ khả dụng sau khi Ban tổ chức phê duyệt và tải lên.</p>
                  </>
                ) : match.status === 'CANCELLED' ? (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-500">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <h4 className="text-slate-400 font-bold text-base tracking-tight">Trận đấu bị Hủy</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Trận đấu này đã bị hủy bỏ bởi Ban tổ chức. Không có luồng trực tiếp hoặc phát lại.</p>
                  </>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                      <Camera className="w-7 h-7" />
                    </div>
                    <h4 className="text-slate-300 font-bold text-base tracking-tight">Trực Tiếp Sắp Khả Dụng</h4>
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
            <div className="bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden relative">
              <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
              
              <div className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4">
                  
                  {/* Team 1 */}
                  <div className="flex flex-col items-center flex-1 w-full">
                    {/* Large Premium Team Avatar */}
                    <div className="mb-4 flex items-center justify-center">
                      {(() => {
                        const members = part1?.members || [];
                        const names = team1Name.split('-').map(n => n.trim());
                        const isDoubles = names.length > 1 || members.length > 1;

                        if (!isDoubles) {
                          // ĐƠN - 1 VĐV
                          const m = members[0];
                          const name = m?.fullName || team1Name;
                          return (
                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-1 shadow-lg transform hover:scale-105 transition-transform">
                              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                {m?.avatarUrl ? (
                                  <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-3xl font-black text-blue-700 uppercase">{name.charAt(0)}</span>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // ĐÔI - 2 VĐV
                        const p1Name = members[0]?.fullName || names[0] || 'VĐV 1';
                        const p2Name = members[1]?.fullName || names[1] || 'VĐV 2';
                        return (
                          <div className="flex items-center -space-x-5 py-1">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 p-1 shadow-lg z-10">
                              <div className="w-full h-full rounded-full bg-slate-900 border-2 border-white flex items-center justify-center overflow-hidden">
                                {members[0]?.avatarUrl ? (
                                  <img src={members[0].avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-lg font-black text-blue-400 uppercase">{p1Name.charAt(0)}</span>
                                )}
                              </div>
                            </div>
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 p-1 shadow-md z-0">
                              <div className="w-full h-full rounded-full bg-slate-800 border-2 border-white flex items-center justify-center overflow-hidden">
                                {members[1]?.avatarUrl ? (
                                  <img src={members[1].avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-lg font-black text-purple-300 uppercase">{p2Name.charAt(0)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <h3 className="text-xl font-black text-slate-900 text-center leading-snug">{team1Name}</h3>
                    {(() => {
                      const elo = getTeamEloDisplay(part1);
                      if (elo === null) return null;
                      return (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50/70 border border-blue-100/60 px-2.5 py-0.5 rounded-full mt-1.5 shadow-3xs flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-blue-500" />
                          <span>ELO: {elo}</span>
                        </span>
                      );
                    })()}
                    <div className="text-slate-500 text-xs font-bold mt-1.5 uppercase tracking-wider">{scorePresentation.wonSummaryLabel}: {match.p1SetsWon}</div>
                  </div>

                  {/* Main Score Display */}
                  <div className="flex flex-col items-center justify-center mx-4 flex-shrink-0">
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-6xl md:text-8xl font-bold tabular-nums tracking-tighter text-slate-900">{currentDisplayTeam1}</div>
                      <div className="text-4xl font-bold text-slate-300">-</div>
                      <div className="text-6xl md:text-8xl font-bold tabular-nums tracking-tighter text-slate-900">{currentDisplayTeam2}</div>
                    </div>
                    <div className="mt-4 text-xs font-bold text-slate-400 tracking-widest uppercase flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 animate-pulse text-rose-500" /> {scorePresentation.currentScoreLabel}
                    </div>
                    {currentDetailScoreLabel ? (
                      <div className="mt-2 rounded-full bg-slate-100 px-4 py-1 text-xs font-bold text-slate-600">
                        {currentDetailScoreLabel}
                      </div>
                    ) : null}
                  </div>

                  {/* Team 2 */}
                  <div className="flex flex-col items-center flex-1 w-full">
                    {/* Large Premium Team Avatar */}
                    <div className="mb-4 flex items-center justify-center">
                      {(() => {
                        const members = part2?.members || [];
                        const names = team2Name.split('-').map(n => n.trim());
                        const isDoubles = names.length > 1 || members.length > 1;

                        if (!isDoubles) {
                          // ĐƠN - 1 VĐV
                          const m = members[0];
                          const name = m?.fullName || team2Name;
                          return (
                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500 p-1 shadow-lg transform hover:scale-105 transition-transform">
                              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                {m?.avatarUrl ? (
                                  <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-3xl font-black text-rose-600 uppercase">{name.charAt(0)}</span>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // ĐÔI - 2 VĐV
                        const p1Name = members[0]?.fullName || names[0] || 'VĐV 1';
                        const p2Name = members[1]?.fullName || names[1] || 'VĐV 2';
                        return (
                          <div className="flex items-center -space-x-5 py-1">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 p-0.5 shadow-lg z-10">
                              <div className="w-full h-full rounded-full bg-slate-900 border-2 border-white flex items-center justify-center overflow-hidden">
                                {members[0]?.avatarUrl ? (
                                  <img src={members[0].avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-lg font-black text-rose-400 uppercase">{p1Name.charAt(0)}</span>
                                )}
                              </div>
                            </div>
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 p-0.5 shadow-md z-0">
                              <div className="w-full h-full rounded-full bg-slate-800 border-2 border-white flex items-center justify-center overflow-hidden">
                                {members[1]?.avatarUrl ? (
                                  <img src={members[1].avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-lg font-black text-amber-400 uppercase">{p2Name.charAt(0)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <h3 className="text-xl font-black text-slate-900 text-center leading-snug">{team2Name}</h3>
                    {(() => {
                      const elo = getTeamEloDisplay(part2);
                      if (elo === null) return null;
                      return (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50/70 border border-blue-100/60 px-2.5 py-0.5 rounded-full mt-1.5 shadow-3xs flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-blue-500" />
                          <span>ELO: {elo}</span>
                        </span>
                      );
                    })()}
                    <div className="text-slate-500 text-xs font-bold mt-1.5 uppercase tracking-wider">{scorePresentation.wonSummaryLabel}: {match.p2SetsWon}</div>
                  </div>
                </div>

                {/* Set History */}
                {(() => {
                  const setsToWin = resolvedRules.setsToWin || 2;
                  const maxSets = setsToWin === 1 ? 1 : (setsToWin === 2 ? 3 : 5);
                  return (
                    <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col items-center">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{scorePresentation.summaryLabel}</h4>
                      <div className="flex flex-wrap justify-center gap-4">
                        {Array.from({ length: maxSets }).map((_, idx) => {
                          const set = scores[idx];
                          const isPlayed = idx < scores.length;
                          const isOngoing = isPlayed && !set.isFinished;
                          return (
                            <div key={idx} className={`px-5 py-2.5 rounded-lg border flex flex-col items-center shadow-sm min-w-[80px] ${
                              isOngoing 
                                ? 'bg-rose-50 border-rose-100 ring-2 ring-rose-100' 
                                : isPlayed
                                ? 'bg-slate-50 border-slate-200'
                                : 'bg-slate-50/50 border-slate-100 opacity-60'
                            }`}>
                              <span className="text-[10px] font-bold text-slate-500 mb-1 uppercase">{sequenceLabelTitle} {idx + 1}</span>
                              <span className={`text-xl font-bold ${isOngoing ? 'text-rose-600' : isPlayed ? 'text-slate-800' : 'text-slate-400'}`}>
                                {isPlayed ? `${set.team1Score} - ${set.team2Score}` : '-'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Footer Info */}
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" /> {match.courtName || 'Sân trung tâm'}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" /> {match.scheduledAt ? new Date(match.scheduledAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : 'Chưa xếp giờ'}
                </div>
                {match.refereeName && (
                  <div className="flex items-center gap-1 text-xs font-medium text-amber-700">
                    ⚖️ {match.refereeName}
                  </div>
                )}
              </div>
            </div>

            {canControlLiveMatch ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      Khu điều khiển trọng tài
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      Mở bảng chấm điểm chuyên dụng
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Trang live giữ giao diện xem trận gọn hơn. Toàn bộ thao tác chấm điểm, lỗi và ngoại lệ được đưa vào modal riêng.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => {
                      setIsOfficialScoreModalOpen(true);
                    }}
                    className="h-auto rounded-lg px-5 py-3 text-left text-sm font-bold shadow-md"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Tính điểm
                    </span>
                  </Button>
                </div>
              </div>
            ) : null}

            {scoreOverride?.reason ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
                Trận này đang dùng chế độ ngoại lệ của trọng tài/BTC: {scoreOverride.reason}
                {scoreOverride.decidedAt
                  ? ` • ${new Date(scoreOverride.decidedAt).toLocaleString('vi-VN')}`
                  : ''}
              </div>
            ) : null}
          </div>

          {/* Right Column: Comments & Chat */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[510px] sticky top-28 relative">
              <style>{`
                @keyframes floatUp {
                  0% {
                    transform: translateY(0) scale(0.6) rotate(0deg);
                    opacity: 0;
                  }
                  10% {
                    opacity: 0.9;
                  }
                  90% {
                    opacity: 0.9;
                  }
                  100% {
                    transform: translateY(-400px) scale(1.2) rotate(15deg);
                    opacity: 0;
                  }
                }
                .animate-float-up {
                  animation: floatUp 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                }
              `}</style>
              
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Thảo luận trận đấu</h3>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <button onClick={handleSpawnHeart} className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors px-2 py-1 rounded-lg">
                    <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                    <span>{formatCompact(cheerCount)}</span>
                  </button>
                  <span className="mx-1 text-slate-200">|</span>
                  <Eye className="w-3.5 h-3.5" /> {formatCompact(viewerCount)}
                </div>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {comments.map((comment) => {
                  const authorName = comment.user?.fullName || 'Người dùng';
                  const avatarUrl = comment.user?.avatarUrl || null;
                  return (
                    <div key={comment.id} className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border border-slate-200 flex items-center justify-center font-bold text-xs text-white shrink-0 uppercase overflow-hidden shadow-sm">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          authorName.charAt(0)
                        )}
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-xs font-bold text-slate-800 truncate">{authorName}</span>
                          <span className="text-[9px] text-slate-400 font-medium shrink-0">
                            {new Date(comment.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-650 mt-1 leading-relaxed break-words">{comment.commentText}</p>
                      </div>
                    </div>
                  );
                })}
                {comments.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm my-auto">
                    Chưa có thảo luận nào. Hãy gửi bình luận đầu tiên!
                  </div>
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Comment Form */}
              <form onSubmit={handlePostComment} className="p-4 border-t border-slate-100 bg-white flex gap-2 items-center">
                <div className="relative flex-grow">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={user ? `Bình luận dưới tên ${user.fullName || user.email}...` : 'Đăng nhập để gửi bình luận...'}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onFocus={() => {
                      if (!user) {
                        toast.error('Vui lòng đăng nhập để bình luận!');
                      }
                    }}
                    disabled={isCommentSubmitting || isCommentDisabled()}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCommentSubmitting || !normalizedCommentText || isCommentDisabled()}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2.5 flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>

        <OfficialScoreModal
          open={isOfficialScoreModalOpen}
          onOpenChange={setIsOfficialScoreModalOpen}
          canControlLiveMatch={canControlLiveMatch}
          isSubmitting={isSubmitting}
          match={match}
          team1Name={team1Name}
          team2Name={team2Name}
          currentSet={currentSet}
          scores={scores}
          activeSetIndex={activeSetIdx}
          scorePresentation={scorePresentation}
          scoreGuidance={scoreGuidance}
          sportKind={resolvedRules.kind}
          isPickleballSideOut={isPickleballSideOut}
          sideOutState={sideOutState}
          isTennis={isTennis}
          tennisPointState={tennisPointState}
          penalties={penalties}
          scoreWarnings={scoreWarnings}
          overrideEnabled={overrideEnabled}
          overrideReason={overrideReason}
          onOverrideEnabledChange={setOverrideEnabled}
          onOverrideReasonChange={setOverrideReason}
          onStartMatch={() => void handleUpdateStatus('ONGOING')}
          onUpdatePoints={(team, action) => void handleUpdatePoints(team, action)}
          onFinishSet={() => void handleFinishSet()}
          onCompleteMatch={(winnerTeam) => void handleCompleteMatch(winnerTeam)}
          onSetServingTeam={(team) => void handleSetServingTeam(team)}
          onSideOut={() => void handleSideOut()}
          onAddPenalty={(team, kind, label, note) => void handleAddPenalty(team, kind, label, note)}
        />

        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          shareUrl={typeof window !== 'undefined' ? window.location.href : ''}
          title={`Thảo luận & Theo dõi tỉ số trực tiếp: ${team1Name} vs ${team2Name}`}
        />

      </div>
    </div>
  );
}
