'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { startTransition, useEffect, useRef, useState, use } from 'react';
import { BRAND } from '@/constants/brand';
import { matchesApi, Match, MatchComment } from '@/features/matches/api';
import {
  buildAutoWinnerScore,
  extractMatchScores,
  getMatchScorePresentation,
  resolveMatchSportRules,
} from '@/features/matches/score-display';
import { getScoreRuleWarnings } from '@/features/matches/score-rule-warnings';
import { getPenaltySchema } from '@/features/matches/penalty-schema';
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
import type { MatchPenaltyRecord, MatchScore, PickleballSideOutState, TennisLivePointState } from '@/types/match';
import { getErrorMessage, getRetryAfterSeconds } from '@/utils/error';
import { cn } from '@/utils/cn';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { formatCompact } from '@/utils/format';
import { Trophy, Clock, MapPin, Activity, Play, AlertCircle, Camera, MessageSquare, Send, Eye, Shield, Users, Heart, Share2, User } from 'lucide-react';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';
import { livestreamApi, tournamentsApi, type MatchPlaybackResponse } from '@/features/tournaments/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { OfficialScoreModal } from './components/OfficialScoreModal';
import { FootballOfficialPanel } from './components/FootballOfficialPanel';
import {
  DEFAULT_FOOTBALL_SCORE,
  readFootballScore,
  writeFootballScore,
  type FootballEventType,
  type FootballMatchPhase,
  type FootballScoreState,
} from '@/features/matches/football-score';

import type { TournamentParticipant } from '@/types/tournament';
import { ReportViolationButton } from '@/features/reports/components/ReportViolationButton';
import ShareModal from '@/components/common/ShareModal';
import Hls from 'hls.js';

function HlsVideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      });
    }
  }, [src]);

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 h-full w-full object-cover"
      controls
      playsInline
      autoPlay
      muted
    />
  );
}

type ScoreUpdatePayload = Parameters<typeof matchesApi.updateScore>[1];

/**
 * Wrapper for PATCH /matches/:id/score that:
 * - injects expectedRevision (optimistic lock, NOTE-7/D3) from the current
 *   match snapshot so a stale device write cannot overwrite a newer one;
 * - surfaces 409 (score changed from another device) with a refresh hint
 *   instead of silently retrying.
 */
function isConflict409(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 409;
}

interface Props {
  params: Promise<{ matchId: string }>;
}

export default function LiveMatchPage({ params }: Props) {
  const locale = useLocale();
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  const translate = useTranslations('Common');
  const matchTranslate = useTranslations('Match');
  const livePenaltyTranslate = useTranslations('LivePenalty');
  const tournamentDetailTranslate = useTranslations('TournamentDetail');
  const rateLimitMessage = `${translate('rateLimitTitle')} ${translate('rateLimitHint')}`;
  const formatRateLimitMessage = (error: unknown) => {
    const seconds = getRetryAfterSeconds(error);
    return seconds
      ? translate('rateLimitRetryAfter', { seconds })
      : rateLimitMessage;
  };
  const router = useRouter();
  const resolvedParams = use(params);
  const matchId = resolvedParams.matchId;
  const { match, scores, viewerCount, cheerCount, setCheerCount, setMatch, setScores, isLoading, error } = useLiveMatch(matchId);
  const { user } = useAuthStore();
  const { openUserProfile, openUserById } = useUserProfileModalStore();

  /**
   * Single choke point for PATCH /matches/:id/score (NOTE-7/D3): injects the
   * current snapshot revision as expectedRevision so a stale device write is
   * rejected server-side with 409 instead of silently overwriting newer data.
   */
  const updateScoreWithRevision = async (payload: ScoreUpdatePayload) => {
    const revision = match?.revision;
    return matchesApi.updateScore(matchId, {
      ...payload,
      ...(revision !== undefined ? { expectedRevision: revision } : {}),
    });
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const activeTournamentMode = match?.tournament?.tournamentConfig?.mode ?? null;

  // Bóng đá: kết quả luân lưu khi trận hòa ở knockout
  const [shootoutGoals, setShootoutGoals] = useState<{ p1Goals: number; p2Goals: number }>({ p1Goals: 0, p2Goals: 0 });
  const [footballScore, setFootballScore] = useState<FootballScoreState>(DEFAULT_FOOTBALL_SCORE);
  const [isOfficialScoreModalOpen, setIsOfficialScoreModalOpen] = useState(false);
  const [optimisticTennisPointState, setOptimisticTennisPointState] = useState<TennisLivePointState | null>(null);
  const lastSyncedTennisServerKeyRef = useRef<string>('init');
  const optimisticScoresRef = useRef<MatchScore[]>(scores);
  const scoreSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScorePayloadRef = useRef<ScoreUpdatePayload | null>(null);
  const scoreSyncInFlightRef = useRef(false);
  const liveMutationInFlightRef = useRef(false);

  useEffect(() => {
    optimisticScoresRef.current = scores;
  }, [scores]);

  useEffect(() => {
    return () => {
      if (scoreSyncTimerRef.current) {
        clearTimeout(scoreSyncTimerRef.current);
      }
    };
  }, []);

  const [comments, setComments] = useState<MatchComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [hearts, setHearts] = useState<{ id: string; x: number; size: number; delay: number }[]>([]);
  const [playback, setPlayback] = useState<MatchPlaybackResponse | null>(null);

  // Auto fetch participants for full member/avatar details
  useEffect(() => {
    if (!match?.tournamentId) return;
    tournamentsApi
      .getTournamentParticipants(match.tournamentId)
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as unknown as { data: TournamentParticipant[] })?.data;
        if (Array.isArray(list) && list.length > 0) {
          setParticipants(list);
        }
      })
      .catch(() => {});
  }, [match?.tournamentId]);

  const handlePlayerClick = (
    e: React.MouseEvent,
    player: { userId?: string; fullName: string; avatarUrl?: string | null },
  ) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    if (player.userId) {
      openUserById(
        player.userId,
        player.fullName,
        player.avatarUrl,
        rect,
        match?.tournament?.communityId || undefined,
      );
    } else {
      openUserProfile(
        {
          id: player.userId || '',
          fullName: player.fullName,
          avatarUrl: player.avatarUrl,
        },
        rect,
        match?.tournament?.communityId || undefined,
      );
    }
  };

  // Share state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Chat auto scroll ref
  const commentsEndRef = useRef<HTMLDivElement | null>(null);
  // Ref tới khung chat (overflow-y-auto) — chỉ cuộn khung này, KHÔNG cuộn cả trang.
  const commentsBoxRef = useRef<HTMLDivElement | null>(null);

  const mergeMatchUpdate = (nextMatch: Match): Match => ({
    ...(match ?? ({} as Match)),
    ...nextMatch,
    participant1: nextMatch.participant1 ?? match?.participant1,
    participant2: nextMatch.participant2 ?? match?.participant2,
    tournament: nextMatch.tournament ?? match?.tournament,
    stage: nextMatch.stage ?? match?.stage,
  });

  const applyServerSnapshot = (nextMatch: Match) => {
    startTransition(() => {
      setMatch(mergeMatchUpdate(nextMatch));
      setScores(extractMatchScores(nextMatch.scoreDetails));
    });
  };



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

  // Auto scroll chat to bottom when comments list changes.
  // Chỉ cuộn KHUNG chat (commentsBoxRef), KHÔNG dùng scrollIntoView vì nó cuộn
  // cả các scrollable ancestor (toàn trang) → làm trang nhảy xuống khi mở.
  useEffect(() => {
    const box = commentsBoxRef.current;
    if (box) {
      box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    }
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
    ? readTennisLivePointState(match, optimisticCurrentSet, {
        enableTiebreak: optimisticResolvedRules.mode !== 'LITE',
      })
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

  useEffect(() => {
    let isCancelled = false;
    void Promise.resolve().then(() => {
      if (isCancelled) return;
      const rules = resolveMatchSportRules(match ?? {});
      if (rules.kind !== 'FOOTBALL' || !match) return;
      const nextFootball = readFootballScore(match.scoreDetails);
      setFootballScore(nextFootball);
      setShootoutGoals({
        p1Goals: nextFootball.shootout?.team1Goals ?? 0,
        p2Goals: nextFootball.shootout?.team2Goals ?? 0,
      });
    });
    return () => {
      isCancelled = true;
    };
  }, [match?.id, match?.scoreDetails]);

  useEffect(() => {
    if (!match) return;
    const socket = socketClient.getMatchSocket();
    const join = () => socket.emit('joinMatch', matchId);
    const handleScoreUpdate = (raw: string | Match) => {
      let payload: Match;
      try {
        payload = typeof raw === 'string' ? JSON.parse(raw) as Match : raw;
      } catch {
        return;
      }
      if (!payload || payload.id !== matchId) return;
      const currentRevision = match.revision ?? 0;
      if ((payload.revision ?? 0) < currentRevision) return;
      applyServerSnapshot(payload);
      const rules = resolveMatchSportRules(payload);
      if (rules.kind === 'FOOTBALL') {
        const nextFootball = readFootballScore(payload.scoreDetails);
        setFootballScore(nextFootball);
        setShootoutGoals({
          p1Goals: nextFootball.shootout?.team1Goals ?? 0,
          p2Goals: nextFootball.shootout?.team2Goals ?? 0,
        });
      }
    };
    socket.on('connect', join);
    socket.on('score:update', handleScoreUpdate);
    socket.on('match:status', handleScoreUpdate);
    if (socket.connected) join(); else socket.connect();
    return () => {
      socket.emit('leaveMatch', matchId);
      socket.off('connect', join);
      socket.off('score:update', handleScoreUpdate);
      socket.off('match:status', handleScoreUpdate);
    };
  }, [matchId, match?.revision]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">{translate("liveScoreboardConnecting")}</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-slate-100 max-w-md">
          <img src={BRAND.assets.logoIcon} alt={`${BRAND.name} Logo`} className="w-20 h-20 object-contain mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">{error || translate('liveMatchNotFound')}</h2>
          <p className="text-slate-500 text-sm mb-6">{matchTranslate('liveMatchMissing')}</p>
          <Link href="/tournaments" className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-sm">
            {matchTranslate('backToTournament')}
          </Link>
        </div>
      </div>
    );
  }

  const team1Name = match.participant1?.teamName || matchTranslate('unknownTeam');
  const team2Name = match.participant2?.teamName || matchTranslate('unknownTeam');
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
  // Use the normalized rule view as the single UI mode source. This keeps the
  // warning banner and quick-finalization behavior aligned even for legacy
  // match payloads where tournamentConfig.mode is omitted.
  const isLiteMatch = resolvedRules.mode === 'LITE';
  const scorePresentation = getMatchScorePresentation(resolvedRules.kind, tournamentDetailTranslate);
  const scoreGuidance = isLiteMatch
    ? {
        targetSummary: matchTranslate('liteScoringSummary'),
        examples: [],
        operatorHint: matchTranslate('operatorHint'),
      }
    : getScoreEntryGuidance(resolvedRules.kind, tournamentDetailTranslate);
  const sequenceLabelTitle = scorePresentation.sequenceLabel.charAt(0).toUpperCase() + scorePresentation.sequenceLabel.slice(1);
  const sideOutState = readSideOutState(match);
  // Lite bypasses finish constraints, but Tennis Lite still uses the Tennis point counter;
  // side-out/server rules belong to advanced presets.
  const isPickleballSideOut = !isLiteMatch && resolvedRules.kind === 'PICKLEBALL_SIDE_OUT';
  const isTennis = resolvedRules.kind === 'TENNIS';
  const tennisPointState = isTennis ? optimisticTennisPointState ?? resolvedTennisPointState : null;
  const penalties = readPenaltyLog(match);
  const penaltySchema = getPenaltySchema(resolvedRules.kind);
  const scoreWarnings = getScoreRuleWarnings(scores, resolvedRules, tournamentDetailTranslate);
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

    toast.error(matchTranslate('permissionDenied'));
    return false;
  };

  const resolveOverrideReason = () => {
    if (isLiteMatch || !overrideEnabled) {
      return null;
    }

    const trimmedReason = trimAndNormalizeSpaces(overrideReason);
    if (!trimmedReason) {
      toast.error(matchTranslate('overrideReasonRequired'));
      return null;
    }

    return trimmedReason;
  };

  const validateSetCanFinish = (setItem: { team1Score: number; team2Score: number }, setIndex: number) => {
    if (isLiteMatch) {
      return { ok: true as const };
    }
    const team1Score = Number(setItem.team1Score);
    const team2Score = Number(setItem.team2Score);
    const maxScore = Math.max(team1Score, team2Score);
    const minScore = Math.min(team1Score, team2Score);
    const diff = maxScore - minScore;
    const label = `${scorePresentation.sequenceLabel.charAt(0).toUpperCase() + scorePresentation.sequenceLabel.slice(1)} ${setIndex + 1}`;

    if (team1Score === 0 && team2Score === 0) {
      return { ok: false, message: matchTranslate('scoreZeroWarning', { label }) };
    }

    if (team1Score === team2Score) {
      return { ok: false, message: matchTranslate('scoreTiedWarning', { label, score: team1Score }) };
    }

    if (resolvedRules.kind === 'TENNIS') {
      if (maxScore < resolvedRules.pointsPerSet) {
        return { ok: false, message: matchTranslate('tennisMinimumGames', { label, points: resolvedRules.pointsPerSet }) };
      }
      if (maxScore > resolvedRules.maxPoints) {
        return { ok: false, message: matchTranslate('tennisMaxGames', { label, points: resolvedRules.maxPoints }) };
      }
      if (maxScore === resolvedRules.pointsPerSet) {
        if (diff < 2 || minScore > resolvedRules.pointsPerSet - 2) {
          return { ok: false, message: matchTranslate('notEnoughDifferenceToFinish', { label }) };
        }
      } else if (maxScore === resolvedRules.maxPoints) {
        if (minScore < resolvedRules.maxPoints - 1) {
          return { ok: false, message: matchTranslate('tennisMaxThresholdNotEnough', { label }) };
        }
      }

      return { ok: true };
    }

    if (!resolvedRules.winByTwo) {
      if (maxScore < resolvedRules.pointsPerSet) {
        return { ok: false, message: matchTranslate('minimumScoreToFinish', { label, points: resolvedRules.pointsPerSet }) };
      }
      return { ok: true };
    }

    if (maxScore < resolvedRules.pointsPerSet) {
      return { ok: false, message: matchTranslate('minimumPointsToFinish', { label, points: resolvedRules.pointsPerSet }) };
    }

    if (maxScore < resolvedRules.maxPoints && diff < 2) {
      return { ok: false, message: matchTranslate('deuceDifferenceRequired', { label }) };
    }

    if (maxScore > resolvedRules.maxPoints) {
      return { ok: false, message: matchTranslate('maximumScoreExceeded', { label, points: resolvedRules.maxPoints }) };
    }

    return { ok: true };
  };

  const buildScoreDetailsPayload = (
    nextScores: typeof scores,
    nextSideOutState: PickleballSideOutState = sideOutState,
    nextTennisPointState: TennisLivePointState | null = tennisPointState,
    nextPenalties: MatchPenaltyRecord[] = penalties,
    nextShootout?: { team1Goals: number; team2Goals: number; winnerId: string | null },
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

    // Bóng đá: ghi luân lưu (shootout) khi trận hòa phân định ở knockout.
    if (nextShootout) {
      payload.shootout = nextShootout;
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


  const flushScoreSync = async () => {
    if (scoreSyncInFlightRef.current || !pendingScorePayloadRef.current) return;

    const payload = pendingScorePayloadRef.current;
    pendingScorePayloadRef.current = null;
    scoreSyncInFlightRef.current = true;
    setIsSubmitting(true);

    try {
          const response = await updateScoreWithRevision(payload);
          // Do not overwrite a newer local tap with an older server response.
          if (!pendingScorePayloadRef.current) {
            applyServerSnapshot(response);
          }
          toast.success(matchTranslate('liveScoreSynced'), { id: `score-sync-${matchId}` });
        } catch (err: unknown) {
          console.error(err);
          // 409 (NOTE-7/D3): another device changed the score first — do not blind
          // retry; ask the user to refresh, then let the snapshot reconcile.
          if (isConflict409(err)) {
            // 409 (NOTE-7/D3): another device changed the score first — do not
            // blind retry; refetch the server snapshot and let the user continue
            // from the freshest state.
            const fresh = await matchesApi.getMatchById(matchId);
            applyServerSnapshot(fresh);
            toast(matchTranslate('scoreChangedOnOtherDevice'), {
              icon: '⚠️',
              id: `score-sync-${matchId}`,
            });
          } else {
            toast.error(getErrorMessage(err, matchTranslate('liveScoreSyncFailed'), formatRateLimitMessage(err)), { id: `score-sync-${matchId}` });
          }
        } finally {
      scoreSyncInFlightRef.current = false;
      if (!liveMutationInFlightRef.current) setIsSubmitting(false);
      if (pendingScorePayloadRef.current) {
        void flushScoreSync();
      }
    }
  };

  const flushPendingScoreSync = async () => {
    if (scoreSyncTimerRef.current) {
      clearTimeout(scoreSyncTimerRef.current);
      scoreSyncTimerRef.current = null;
    }
    if (pendingScorePayloadRef.current && !scoreSyncInFlightRef.current) {
      await flushScoreSync();
    }
    while (scoreSyncInFlightRef.current || pendingScorePayloadRef.current) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 20));
    }
  };

  const beginLiveMutation = () => {
    if (liveMutationInFlightRef.current) return false;
    liveMutationInFlightRef.current = true;
    setIsSubmitting(true);
    return true;
  };

  const enqueueScoreSync = (payload: ScoreUpdatePayload) => {
    pendingScorePayloadRef.current = payload;
    if (scoreSyncTimerRef.current) {
      clearTimeout(scoreSyncTimerRef.current);
    }
    scoreSyncTimerRef.current = setTimeout(() => {
      scoreSyncTimerRef.current = null;
      void flushScoreSync();
    }, 60);
  };



  const syncFootballScore = (nextScore: FootballScoreState) => {
    setFootballScore(nextScore);
    const nextScores: MatchScore[] = [{
      team1Score: nextScore.team1Goals,
      team2Score: nextScore.team2Goals,
      isFinished: nextScore.phase === 'FULL_TIME' || nextScore.phase === 'COMPLETED',
    }];
    setScores(nextScores);
    const isDecisivePhase = nextScore.phase === 'FULL_TIME' || nextScore.phase === 'COMPLETED' || nextScore.phase === 'PENALTY_SHOOTOUT';
    const currentWinner = !isDecisivePhase || nextScore.team1Goals === nextScore.team2Goals
      ? null
      : nextScore.team1Goals > nextScore.team2Goals
        ? match.participant1Id
        : match.participant2Id;
    enqueueScoreSync({
      p1SetsWon: 0,
      p2SetsWon: 0,
      scoreDetails: {
        ...buildScoreDetailsPayload(nextScores),
        football: writeFootballScore(nextScore),
      },
      winnerId: currentWinner,
    });
  };

  const handleFootballGoal = (team: 1 | 2) => {
    if (!ensureCanControlLiveMatch()) return;
    const nextScore: FootballScoreState = {
      ...footballScore,
      team1Goals: footballScore.team1Goals + (team === 1 ? 1 : 0),
      team2Goals: footballScore.team2Goals + (team === 2 ? 1 : 0),
      events: [
        ...footballScore.events,
        {
          id: crypto.randomUUID(),
          type: 'GOAL',
          team,
          minute: footballScore.minute,
          addedMinute: footballScore.addedMinute,
        },
      ],
    };
    syncFootballScore(nextScore);
  };

  const handleFootballUndoGoal = (team: 1 | 2) => {
    if (!ensureCanControlLiveMatch()) return;
    const eventIndex = [...footballScore.events].reverse().findIndex((event) => event.team === team && event.type === 'GOAL');
    const resolvedIndex = eventIndex === -1 ? -1 : footballScore.events.length - 1 - eventIndex;
    const events = resolvedIndex === -1
      ? footballScore.events
      : footballScore.events.filter((_, index) => index !== resolvedIndex);
    syncFootballScore({
      ...footballScore,
      team1Goals: Math.max(0, footballScore.team1Goals - (team === 1 ? 1 : 0)),
      team2Goals: Math.max(0, footballScore.team2Goals - (team === 2 ? 1 : 0)),
      events,
    });
  };

  const handleFootballEvent = (type: FootballEventType, team: 1 | 2) => {
    if (!ensureCanControlLiveMatch()) return;
    syncFootballScore({
      ...footballScore,
      events: [
        ...footballScore.events,
        {
          id: crypto.randomUUID(),
          type,
          team,
          minute: footballScore.minute,
          addedMinute: footballScore.addedMinute,
        },
      ],
    });
  };

  const handleFootballPhaseChange = (phase: FootballMatchPhase) => {
    if (!ensureCanControlLiveMatch()) return;
    syncFootballScore({ ...footballScore, phase });
  };

  // Handle Score Updates
  const handleUpdatePoints = async (team: 1 | 2, action: 'inc' | 'dec') => {
    if (!ensureCanControlLiveMatch()) {
      return;
    }
    if (isPickleballSideOut && action === 'inc' && sideOutState.servingTeam !== team) {
      toast.error(matchTranslate('sideOutPermissionDenied'));
      return;
    }
    const appliedOverrideReason = resolveOverrideReason();
    if (!isLiteMatch && overrideEnabled && !appliedOverrideReason) {
      return;
    }
    const newScores = [...optimisticScoresRef.current];
    try {
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
          const tennisResult = awardTennisPoint(setObj, tennisPointState, team, resolvedRules, {
            enableTiebreak: !isLiteMatch,
          });
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
          nextTennisPointState = createTennisLivePointState(newScores[activeIdx], {
            enableTiebreak: !isLiteMatch,
          });
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

      // Không cho nút công vượt trần preset. Ngoại lệ phải được bật và có lý do trước đó.
      if (!isLiteMatch && !overrideEnabled && Math.max(newScores[activeIdx].team1Score, newScores[activeIdx].team2Score) > resolvedRules.maxPoints) {
        toast.error(matchTranslate('scoreMaximumError', { points: resolvedRules.maxPoints }));
        return;
      }

      // Optimistic Update
      optimisticScoresRef.current = newScores;
      setScores(newScores);
      if (isTennis) {
        setOptimisticTennisPointState(nextTennisPointState);
      }
      const nextSetsWon = deriveSetsWon(newScores);

      enqueueScoreSync({
        p1SetsWon: nextSetsWon.p1SetsWon,
        p2SetsWon: nextSetsWon.p2SetsWon,
        scoreDetails: buildScoreDetailsPayload(newScores, sideOutState, nextTennisPointState),
        winnerId: match.winnerId,
        ...(appliedOverrideReason ? { overrideReason: appliedOverrideReason } : {}),
      });
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, matchTranslate('scoreUpdateFallback'), formatRateLimitMessage(err)));
    }
  };

  // Handle Match Status Update
  const handleUpdateStatus = async (newStatus: Match['status']) => {
    if (!ensureCanControlLiveMatch()) {
      return;
    }
    if (!beginLiveMutation()) return;

    try {
      await flushPendingScoreSync();

      // A scheduled match must be activated before the first score mutation.
      // The previous order sent a zero-score PATCH while the match was still
      // SCHEDULED; the 400 left a local first-set seed behind, so the second
      // click followed a different branch and appeared to work.
      const res = await matchesApi.updateStatus(matchId, { status: newStatus });
      const nextMatch = mergeMatchUpdate(res);
      const serverScores = extractMatchScores(res.scoreDetails);
      const nextScores = serverScores.length > 0
        ? serverScores
        : optimisticScoresRef.current.length > 0
          ? optimisticScoresRef.current
          : newStatus === 'ONGOING'
            ? [{ team1Score: 0, team2Score: 0, isFinished: false }]
            : [];

      // Keep the display-only first set local until the operator records a
      // real point/set. The status response remains the canonical match.
      optimisticScoresRef.current = nextScores;
      startTransition(() => {
        setMatch(nextMatch);
        setScores(nextScores);
      });
      toast.success(
        newStatus === 'ONGOING'
          ? matchTranslate('statusUpdateOngoing', { team1: team1Name, team2: team2Name })
          : matchTranslate('statusUpdateCompleted', { team1: team1Name, team2: team2Name }),
      );
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, matchTranslate('statusUpdateFallback'), formatRateLimitMessage(err)));
    } finally {
      liveMutationInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Handle Finish Current Set
  const handleFinishSet = async () => {
    if (!ensureCanControlLiveMatch()) {
      return;
    }
    const appliedOverrideReason = resolveOverrideReason();
    if (!isLiteMatch && overrideEnabled && !appliedOverrideReason) {
      return;
    }
    if (!beginLiveMutation()) return;

    try {
      await flushPendingScoreSync();
      const newScores = [...scores];
      const activeIdx = newScores.findIndex((s) => !s.isFinished);
      if (activeIdx === -1) {
        toast.error(matchTranslate('setNotFound'));
        return;
      }

      const setObj = { ...newScores[activeIdx], isFinished: true };
      if (!appliedOverrideReason) {
        const finishValidation = validateSetCanFinish(setObj, activeIdx);
        if (!finishValidation.ok) {
          toast.error(finishValidation.message ?? matchTranslate('setFinishFallback'));
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
          ? createTennisLivePointState(newScores[newScores.length - 1], {
              enableTiebreak: !isLiteMatch,
            })
          : null;

      setScores(newScores);
      if (isTennis) {
        setOptimisticTennisPointState(nextTennisPointState);
      }

      const res = await updateScoreWithRevision({
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
            : matchTranslate('noWinner');
      const setWinnerSuffix = setWinnerName !== matchTranslate('noWinner')
        ? matchTranslate('setWinnerSuffix', { winner: setWinnerName, sequence: scorePresentation.sequenceLabel })
        : '';
      toast.success(
        matchTranslate('setCompletedSummary', {
          sequence: scorePresentation.sequenceLabel,
          set: activeIdx + 1,
          team1: team1Name,
          score1: setObj.team1Score,
          score2: setObj.team2Score,
          team2: team2Name,
          suffix: setWinnerSuffix,
        }),
      );
    } catch (err: unknown) {
      console.error(err);
      if (isConflict409(err)) {
        const fresh = await matchesApi.getMatchById(matchId);
        applyServerSnapshot(fresh);
        toast(matchTranslate('setChangedOtherDevice'));
      } else {
        toast.error(getErrorMessage(err, matchTranslate('setFinishErrorFallback'), formatRateLimitMessage(err)));
      }
    } finally {
      liveMutationInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Handle End Match with Winner Selection
  const handleCompleteMatch = async (winnerTeam: 1 | 2) => {
    if (!ensureCanControlLiveMatch()) {
      return;
    }
    const isFootball = resolvedRules.kind === 'FOOTBALL';
    if (!isLiteMatch && !isFootball && !overrideEnabled) {
      toast.error(matchTranslate('exceptionWinnerRequired'));
      return;
    }
    const appliedOverrideReason = isLiteMatch || isFootball ? null : resolveOverrideReason();
    if (!isLiteMatch && !isFootball && !appliedOverrideReason) {
      return;
    }
    if (!beginLiveMutation()) return;

    try {
      await flushPendingScoreSync();
      // Mark current set as finished if it isn't
      const newScores = scores.map((s) => (!s.isFinished ? { ...s, isFinished: true } : s));

      const winnerId = winnerTeam === 1 ? match.participant1Id : match.participant2Id;
      if (!winnerId) {
        toast.error(matchTranslate('winnerNotFound'));
        return;
      }

      if (isFootball) {
        const isRegulationDraw = footballScore.team1Goals === footballScore.team2Goals;
        const shootoutIsValid = Number.isInteger(shootoutGoals.p1Goals)
          && Number.isInteger(shootoutGoals.p2Goals)
          && shootoutGoals.p1Goals >= 0
          && shootoutGoals.p2Goals >= 0
          && shootoutGoals.p1Goals !== shootoutGoals.p2Goals;
        if (isRegulationDraw && !shootoutIsValid) {
          toast.error(matchTranslate('shootoutMustDiffer'));
          return;
        }
        if (isRegulationDraw) {
          const shootoutWinner = shootoutGoals.p1Goals > shootoutGoals.p2Goals ? match.participant1Id : match.participant2Id;
          if (shootoutWinner !== winnerId) {
            toast.error(matchTranslate('shootoutWinnerMismatch'));

            return;
          }
        } else {
          const scoreWinner = footballScore.team1Goals > footballScore.team2Goals ? match.participant1Id : match.participant2Id;
          if (scoreWinner !== winnerId) {
            toast.error(matchTranslate('footballWinnerMismatch'));

            return;
          }
        }
        const completedFootball: FootballScoreState = {
          ...footballScore,
          phase: isRegulationDraw ? 'PENALTY_SHOOTOUT' : 'COMPLETED',
          shootout: isRegulationDraw
            ? { team1Goals: shootoutGoals.p1Goals, team2Goals: shootoutGoals.p2Goals, winnerId }
            : footballScore.shootout,
        };
        const completedMatch = await updateScoreWithRevision({
          p1SetsWon: 0,
          p2SetsWon: 0,
          scoreDetails: {
            ...buildScoreDetailsPayload([], sideOutState, null, penalties),
            football: writeFootballScore(completedFootball),
          },
          winnerId,
        });
        setFootballScore(completedFootball);
        applyServerSnapshot(completedMatch);
        toast.success(matchTranslate('matchCompletedWinner', { winner: winnerTeam === 1 ? team1Name : team2Name }));

        return;
      }

      const activeIdx = scores.findIndex((s) => !s.isFinished);
      if (activeIdx !== -1) {
        const lastSet = buildAutoWinnerScore(scores[activeIdx], winnerTeam, match);
        newScores[activeIdx] = lastSet;
      }

      const nextSetsWon = deriveSetsWon(newScores);
      optimisticScoresRef.current = newScores;
      setScores(newScores);
      if (isTennis) {
        setOptimisticTennisPointState(null);
      }

      // Bóng đá knockout hòa → ghi luân lưu (shootout) để phân định winner.
      const isFootballDraw = resolvedRules.kind === 'FOOTBALL' && winnerId
        ? nextSetsWon.p1SetsWon === nextSetsWon.p2SetsWon
        : false;
      const shootoutPayload = isFootballDraw
        ? {
            team1Goals: shootoutGoals.p1Goals,
            team2Goals: shootoutGoals.p2Goals,
            winnerId,
          }
        : undefined;
      if (isFootballDraw && (!Number.isInteger(shootoutGoals.p1Goals) || !Number.isInteger(shootoutGoals.p2Goals) || shootoutGoals.p1Goals < 0 || shootoutGoals.p2Goals < 0 || shootoutGoals.p1Goals === shootoutGoals.p2Goals)) {
        toast.error(matchTranslate('shootoutScoreInvalid'));

        return;
      }
      if (isFootballDraw) {
        const shootoutWinner = shootoutGoals.p1Goals > shootoutGoals.p2Goals ? match.participant1Id : match.participant2Id;
        if (shootoutWinner !== winnerId) {
          toast.error(matchTranslate('shootoutWinnerMismatch'));
  
          return;
        }
      }

      // Update score and winner
      const completedMatch = await updateScoreWithRevision({
        p1SetsWon: nextSetsWon.p1SetsWon,
        p2SetsWon: nextSetsWon.p2SetsWon,
        scoreDetails: buildScoreDetailsPayload(newScores, sideOutState, null, penalties, shootoutPayload),
        winnerId,
        ...(appliedOverrideReason ? { overrideReason: appliedOverrideReason } : {}),
      });

      applyServerSnapshot(completedMatch);
      toast.success(
        matchTranslate('matchCompletedWinner', { winner: winnerTeam === 1 ? team1Name : team2Name }),
      );
    } catch (err: unknown) {
      console.error(err);
      if (isConflict409(err)) {
        const fresh = await matchesApi.getMatchById(matchId);
        applyServerSnapshot(fresh);
        toast(matchTranslate('matchChangedOtherDevice'));
      } else {
        toast.error(getErrorMessage(err, matchTranslate('matchCompleteErrorFallback'), formatRateLimitMessage(err)));
      }
        } finally {
      liveMutationInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSetServingTeam = async (team: 1 | 2) => {
    if (!ensureCanControlLiveMatch() || !isPickleballSideOut || isSubmitting) {
      return;
    }
    const appliedOverrideReason = resolveOverrideReason();
    if (!isLiteMatch && overrideEnabled && !appliedOverrideReason) {
      return;
    }

    setIsSubmitting(true);
    try {
      const nextState: PickleballSideOutState = setServingTeamSideOutState(team);
      const nextSetsWon = deriveSetsWon(scores);
      const res = await updateScoreWithRevision({
        p1SetsWon: nextSetsWon.p1SetsWon,
        p2SetsWon: nextSetsWon.p2SetsWon,
        scoreDetails: buildScoreDetailsPayload(scores, nextState),
        winnerId: match.winnerId,
        ...(appliedOverrideReason ? { overrideReason: appliedOverrideReason } : {}),
      });
      setMatch(mergeMatchUpdate(res));
      toast.success(matchTranslate('servingTeamChanged', { team: team === 1 ? team1Name : team2Name }));
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, matchTranslate('servingTeamUpdateFailed'), formatRateLimitMessage(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSideOut = async () => {
    if (!ensureCanControlLiveMatch() || !isPickleballSideOut || isSubmitting) {
      return;
    }

    if (sideOutState.servingTeam == null) {
      toast.error(matchTranslate('selectServingTeamFirst'));
      return;
    }
    const appliedOverrideReason = resolveOverrideReason();
    if (!isLiteMatch && overrideEnabled && !appliedOverrideReason) {
      return;
    }

    setIsSubmitting(true);
    try {
      const nextState: PickleballSideOutState = computeNextSideOutState(sideOutState);
      const nextSetsWon = deriveSetsWon(scores);

      const res = await updateScoreWithRevision({
        p1SetsWon: nextSetsWon.p1SetsWon,
        p2SetsWon: nextSetsWon.p2SetsWon,
        scoreDetails: buildScoreDetailsPayload(scores, nextState),
        winnerId: match.winnerId,
        ...(appliedOverrideReason ? { overrideReason: appliedOverrideReason } : {}),
      });
      setMatch(mergeMatchUpdate(res));
      toast.success(
        nextState.serverNumber === 2 && nextState.servingTeam === sideOutState.servingTeam
          ? matchTranslate('secondServeTurn', { team: sideOutState.servingTeam === 1 ? team1Name : team2Name })
          : matchTranslate('sideOutServingChanged', { team: nextState.servingTeam === 1 ? team1Name : team2Name }),
      );
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, matchTranslate('sideOutUpdateFailed'), formatRateLimitMessage(err)));
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
    if (!isLiteMatch && overrideEnabled && !appliedOverrideReason) {
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

      const res = await updateScoreWithRevision({
        p1SetsWon: nextSetsWon.p1SetsWon,
        p2SetsWon: nextSetsWon.p2SetsWon,
        scoreDetails: buildScoreDetailsPayload(scores, sideOutState, tennisPointState, nextPenalties),
        winnerId: match.winnerId,
        ...(appliedOverrideReason ? { overrideReason: appliedOverrideReason } : {}),
      });

      setMatch(mergeMatchUpdate(res));
      toast.success(`${matchTranslate('penaltyRecorded', { label })}`);
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, matchTranslate('penaltySaveFailed'), formatRateLimitMessage(err)));
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
    ? matchTranslate('currentGameScore', {
        sequence: scorePresentation.sequenceLabel,
        set: activeSetIdx + 1,
        score1: currentSet.team1Score,
        score2: currentSet.team2Score,
      })
    : null;

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error(translate('loginToComment'));
      router.push('/login');
      return;
    }
    if (!normalizedCommentText) {
      toast.error(translate('emptyComment'));
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
      toast.success(translate('postPublished'), { id: `comment-${matchId}` });
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, translate('commentPostFailed'), formatRateLimitMessage(err)));
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
                {match.tournament?.name || matchTranslate('tournamentFallback')}
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
              {match.status === 'ONGOING' ? matchTranslate('statusLive') : match.status === 'COMPLETED' ? matchTranslate('statusFinished') : matchTranslate('statusUpcoming')}
            </span>
            <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>{matchTranslate('roundLabel', { round: match.roundNumber })}</span>
            </span>

            <span className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
              <Eye className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              <span>{formatCompact(viewerCount)} {matchTranslate('watchingLabel')}</span>
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <span>{matchTranslate('sportPrefix', { sport: scorePresentation.sportLabel })}</span>
            </span>
            {(match.courtName || match.tournament?.venueName) && (
              <span className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full flex items-center gap-1 max-w-[320px] truncate" title={
                match.courtAddress
                  ? `${match.courtName || match.tournament?.venueName} - ${match.courtAddress}`
                  : (match.tournament?.venueAddress ? `${match.courtName || match.tournament?.venueName} - ${match.tournament.venueAddress}` : (match.courtName || match.tournament?.venueName || ''))
              }>
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="truncate">
                  {match.courtName ? `${matchTranslate('courtLabel')} ${match.courtName}` : `${matchTranslate('courtLabel')} ${match.tournament?.venueName}`}
                  {(match.courtAddress || match.tournament?.venueAddress) ? ` (${match.courtAddress || match.tournament?.venueAddress})` : ''}
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsShareModalOpen(true)}
              variant="outline"
              className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-bold shadow-xs h-9 text-xs px-3.5 flex items-center gap-1.5 rounded-lg transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{matchTranslate('share')}</span>
            </Button>
            <ReportViolationButton
              targetType="MATCH"
              targetId={match.id}
              targetLabel={translate('roundMatchShareLabel', { round: match.roundNumber })}
              className="h-9 text-xs px-3.5 rounded-lg shadow-xs"
            />
            <Link
              href={`/tournaments/${match.tournamentId}`}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 hover:border-blue-200 transition-all bg-white border border-slate-200 px-3.5 h-9 rounded-lg shadow-xs shrink-0"
            >
              <Trophy className="w-3.5 h-3.5 text-blue-500" />
              <span>{match.tournament?.name || matchTranslate('backToTournament')}</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns: Match Details, Score Card, Referee Control Panel */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Sporto Camera Live Stream / Replay Container */}
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
                    <HlsVideoPlayer src={playback.playbackUrl} />
                    <div className="absolute left-4 top-4 rounded-full border border-rose-400/40 bg-rose-600/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white z-20">
                      {playback.streamStatus === 'LIVE' ? 'LIVE' : playback.streamStatus}
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-left backdrop-blur z-20">
                      <p className="text-sm font-bold text-white">{playback.cameraName || matchTranslate('cameraFallback')}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-300">{matchTranslate('cameraViewerNotice')}</p>
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
                    <h4 className="text-white font-bold text-base tracking-tight">{matchTranslate('liveCameraTitle')}</h4>
                    <p className="text-xs text-slate-400 font-semibold leading-relaxed">{matchTranslate('liveCameraDescription')}</p>
                  </>
                ) : match.status === 'COMPLETED' ? (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <Play className="w-7 h-7 fill-current ml-0.5" />
                    </div>
                    <h4 className="text-white font-bold text-base tracking-tight">{matchTranslate('replayTitle')}</h4>
                    <p className="text-xs text-slate-455 font-medium leading-relaxed">{matchTranslate('replayDescription')}</p>
                  </>
                ) : match.status === 'CANCELLED' ? (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-500">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <h4 className="text-slate-400 font-bold text-base tracking-tight">{matchTranslate('cancelledMatchTitle')}</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{matchTranslate('cancelledByOrganizerDescription')}</p>
                  </>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                      <Camera className="w-7 h-7" />
                    </div>
                    <h4 className="text-slate-300 font-bold text-base tracking-tight">{matchTranslate('upcomingStreamTitle')}</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{matchTranslate('upcomingStreamDescription')}</p>
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
            <div className="bg-white rounded-xl shadow-lg border border-slate-200/80 overflow-hidden relative">
              <div className="h-1 bg-slate-900"></div>

              <div className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4">

                  {/* Team 1 */}
                  <div className="flex flex-col items-center flex-1 w-full">
                    {/* Large Clean Team Avatar */}
                    <div className="mb-4 flex items-center justify-center">
                      {(() => {
                        const members = part1?.members || match.participant1?.members || [];
                        const rawNames = team1Name.split(/[-&/+]|\s+và\s+/i).map(n => n.trim()).filter(Boolean);
                        const isDoublesCategory = match.tournament?.categoryName?.toLowerCase().includes('đôi') || match.matchConfig?.format === 'DOUBLES';
                        const isDoubles = isDoublesCategory || members.length > 1 || rawNames.length > 1;

                        if (!isDoubles) {
                          // ĐƠN - 1 VĐV
                          const member = members[0];
                          const registeredBy = part1?.registeredBy;
                          const p1 = {
                            userId: member?.userId || registeredBy?.id || '',
                            fullName: member?.fullName || registeredBy?.fullName || team1Name,
                            avatarUrl: member?.avatarUrl || registeredBy?.avatarUrl || null,
                            initial: ((member?.fullName || registeredBy?.fullName || team1Name).charAt(0) || '1').toUpperCase(),
                          };

                          return (
                            <button
                              type="button"
                              onClick={(e) => handlePlayerClick(e, p1)}
                              className="group relative w-20 h-20 rounded-full border-2 border-blue-600 bg-blue-50 p-0.5 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-100"
                              title={matchTranslate('viewUserTitle', { name: p1.fullName })}
                            >
                              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                {p1.avatarUrl ? (
                                  <img src={p1.avatarUrl} alt={p1.fullName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-2xl font-black text-blue-600 uppercase">{p1.initial}</span>
                                )}
                              </div>
                              <div className="absolute inset-0 rounded-full bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <User className="w-5 h-5 text-slate-700 drop-shadow-xs" />
                              </div>
                            </button>
                          );
                        }

                        // ĐÔI - 2 VĐV
                        const p1 = {
                          userId: members[0]?.userId || (part1?.registeredBy?.fullName === rawNames[0] ? part1.registeredBy.id : '') || '',
                          fullName: members[0]?.fullName || rawNames[0] || matchTranslate('unknownTeam'),
                          avatarUrl: members[0]?.avatarUrl || null,
                          initial: ((members[0]?.fullName || rawNames[0] || '1').charAt(0) || '1').toUpperCase(),
                        };

                        const p2 = {
                          userId: members[1]?.userId || (part1?.registeredBy?.fullName === rawNames[1] ? part1.registeredBy.id : '') || '',
                          fullName: members[1]?.fullName || rawNames[1] || matchTranslate('unknownTeam'),
                          avatarUrl: members[1]?.avatarUrl || null,
                          initial: ((members[1]?.fullName || rawNames[1] || '2').charAt(0) || '2').toUpperCase(),
                        };

                        return (
                          <div className="flex items-center justify-center gap-2.5 py-1">
                            <button
                              type="button"
                              onClick={(e) => handlePlayerClick(e, p1)}
                              className="group relative w-16 h-16 rounded-full border-2 border-blue-600 bg-blue-50 p-0.5 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-100"
                              title={matchTranslate('viewUserTitle', { name: p1.fullName })}
                            >
                              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                {p1.avatarUrl ? (
                                  <img src={p1.avatarUrl} alt={p1.fullName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-lg font-black text-blue-600 uppercase">{p1.initial}</span>
                                )}
                              </div>
                              <div className="absolute inset-0 rounded-full bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-700 drop-shadow-xs" />
                              </div>
                            </button>

                            <span className="text-slate-300 font-bold text-xs">&</span>

                            <button
                              type="button"
                              onClick={(e) => handlePlayerClick(e, p2)}
                              className="group relative w-16 h-16 rounded-full border-2 border-blue-500 bg-blue-50 p-0.5 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-100"
                              title={matchTranslate('viewUserTitle', { name: p2.fullName })}
                            >
                              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                {p2.avatarUrl ? (
                                  <img src={p2.avatarUrl} alt={p2.fullName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-lg font-black text-blue-500 uppercase">{p2.initial}</span>
                                )}
                              </div>
                              <div className="absolute inset-0 rounded-full bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-700 drop-shadow-xs" />
                              </div>
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Team 1 Names */}
                    {(() => {
                      const members = part1?.members || match.participant1?.members || [];
                      const rawNames = team1Name.split(/[-&/+]|\s+và\s+/i).map(n => n.trim()).filter(Boolean);
                      const isDoublesCategory = match.tournament?.categoryName?.toLowerCase().includes('đôi') || match.matchConfig?.format === 'DOUBLES';
                      const isDoubles = isDoublesCategory || members.length > 1 || rawNames.length > 1;

                      if (!isDoubles) {
                        const member = members[0];
                        const registeredBy = part1?.registeredBy;
                        const p1 = {
                          userId: member?.userId || registeredBy?.id || '',
                          fullName: member?.fullName || registeredBy?.fullName || team1Name,
                          avatarUrl: member?.avatarUrl || registeredBy?.avatarUrl || null,
                        };
                        return (
                          <button
                            type="button"
                            onClick={(e) => handlePlayerClick(e, p1)}
                            className="text-xl font-black text-slate-900 text-center leading-snug hover:text-blue-600 hover:underline transition-colors cursor-pointer"
                            title={matchTranslate('viewUserTitle', { name: p1.fullName })}
                          >
                            {p1.fullName}
                          </button>
                        );
                      }

                      const p1 = {
                        userId: members[0]?.userId || (part1?.registeredBy?.fullName === rawNames[0] ? part1.registeredBy.id : '') || '',
                        fullName: members[0]?.fullName || rawNames[0] || matchTranslate('unknownTeam'),
                        avatarUrl: members[0]?.avatarUrl || null,
                      };
                      const p2 = {
                        userId: members[1]?.userId || (part1?.registeredBy?.fullName === rawNames[1] ? part1.registeredBy.id : '') || '',
                        fullName: members[1]?.fullName || rawNames[1] || matchTranslate('unknownTeam'),
                        avatarUrl: members[1]?.avatarUrl || null,
                      };

                      return (
                        <div className="flex flex-wrap items-center justify-center gap-1.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => handlePlayerClick(e, p1)}
                            className="text-lg font-black text-slate-900 hover:text-blue-600 hover:underline transition-colors cursor-pointer"
                            title={matchTranslate('viewUserTitle', { name: p1.fullName })}
                          >
                            {p1.fullName}
                          </button>
                          <span className="text-slate-400 font-bold text-sm">-</span>
                          <button
                            type="button"
                            onClick={(e) => handlePlayerClick(e, p2)}
                            className="text-lg font-black text-slate-900 hover:text-blue-600 hover:underline transition-colors cursor-pointer"
                            title={matchTranslate('viewUserTitle', { name: p2.fullName })}
                          >
                            {p2.fullName}
                          </button>
                        </div>
                      );
                    })()}

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
                    {/* Large Clean Team Avatar */}
                    <div className="mb-4 flex items-center justify-center">
                      {(() => {
                        const members = part2?.members || match.participant2?.members || [];
                        const rawNames = team2Name.split(/[-&/+]|\s+và\s+/i).map(n => n.trim()).filter(Boolean);
                        const isDoublesCategory = match.tournament?.categoryName?.toLowerCase().includes('đôi') || match.matchConfig?.format === 'DOUBLES';
                        const isDoubles = isDoublesCategory || members.length > 1 || rawNames.length > 1;

                        if (!isDoubles) {
                          // ĐƠN - 1 VĐV
                          const member = members[0];
                          const registeredBy = part2?.registeredBy;
                          const p2 = {
                            userId: member?.userId || registeredBy?.id || '',
                            fullName: member?.fullName || registeredBy?.fullName || team2Name,
                            avatarUrl: member?.avatarUrl || registeredBy?.avatarUrl || null,
                            initial: ((member?.fullName || registeredBy?.fullName || team2Name).charAt(0) || '2').toUpperCase(),
                          };

                          return (
                            <button
                              type="button"
                              onClick={(e) => handlePlayerClick(e, p2)}
                              className="group relative w-20 h-20 rounded-full border-2 border-rose-600 bg-rose-50 p-0.5 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-rose-100"
                              title={matchTranslate('viewUserTitle', { name: p2.fullName })}
                            >
                              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                {p2.avatarUrl ? (
                                  <img src={p2.avatarUrl} alt={p2.fullName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-2xl font-black text-rose-600 uppercase">{p2.initial}</span>
                                )}
                              </div>
                              <div className="absolute inset-0 rounded-full bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <User className="w-5 h-5 text-slate-700 drop-shadow-xs" />
                              </div>
                            </button>
                          );
                        }

                        // ĐÔI - 2 VĐV
                        const p1 = {
                          userId: members[0]?.userId || (part2?.registeredBy?.fullName === rawNames[0] ? part2.registeredBy.id : '') || '',
                          fullName: members[0]?.fullName || rawNames[0] || matchTranslate('unknownTeam'),
                          avatarUrl: members[0]?.avatarUrl || null,
                          initial: ((members[0]?.fullName || rawNames[0] || '1').charAt(0) || '1').toUpperCase(),
                        };

                        const p2 = {
                          userId: members[1]?.userId || (part2?.registeredBy?.fullName === rawNames[1] ? part2.registeredBy.id : '') || '',
                          fullName: members[1]?.fullName || rawNames[1] || matchTranslate('unknownTeam'),
                          avatarUrl: members[1]?.avatarUrl || null,
                          initial: ((members[1]?.fullName || rawNames[1] || '2').charAt(0) || '2').toUpperCase(),
                        };

                        return (
                          <div className="flex items-center justify-center gap-2.5 py-1">
                            <button
                              type="button"
                              onClick={(e) => handlePlayerClick(e, p1)}
                              className="group relative w-16 h-16 rounded-full border-2 border-rose-600 bg-rose-50 p-0.5 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-rose-100"
                              title={matchTranslate('viewUserTitle', { name: p1.fullName })}
                            >
                              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                {p1.avatarUrl ? (
                                  <img src={p1.avatarUrl} alt={p1.fullName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-lg font-black text-rose-600 uppercase">{p1.initial}</span>
                                )}
                              </div>
                              <div className="absolute inset-0 rounded-full bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-700 drop-shadow-xs" />
                              </div>
                            </button>

                            <span className="text-slate-300 font-bold text-xs">&</span>

                            <button
                              type="button"
                              onClick={(e) => handlePlayerClick(e, p2)}
                              className="group relative w-16 h-16 rounded-full border-2 border-rose-500 bg-rose-50 p-0.5 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-rose-100"
                              title={matchTranslate('viewUserTitle', { name: p2.fullName })}
                            >
                              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                {p2.avatarUrl ? (
                                  <img src={p2.avatarUrl} alt={p2.fullName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-lg font-black text-rose-500 uppercase">{p2.initial}</span>
                                )}
                              </div>
                              <div className="absolute inset-0 rounded-full bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-700 drop-shadow-xs" />
                              </div>
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Team 2 Names */}
                    {(() => {
                      const members = part2?.members || match.participant2?.members || [];
                      const rawNames = team2Name.split(/[-&/+]|\s+và\s+/i).map(n => n.trim()).filter(Boolean);
                      const isDoublesCategory = match.tournament?.categoryName?.toLowerCase().includes('đôi') || match.matchConfig?.format === 'DOUBLES';
                      const isDoubles = isDoublesCategory || members.length > 1 || rawNames.length > 1;

                      if (!isDoubles) {
                        const member = members[0];
                        const registeredBy = part2?.registeredBy;
                        const p2 = {
                          userId: member?.userId || registeredBy?.id || '',
                          fullName: member?.fullName || registeredBy?.fullName || team2Name,
                          avatarUrl: member?.avatarUrl || registeredBy?.avatarUrl || null,
                        };
                        return (
                          <button
                            type="button"
                            onClick={(e) => handlePlayerClick(e, p2)}
                            className="text-xl font-black text-slate-900 text-center leading-snug hover:text-blue-600 hover:underline transition-colors cursor-pointer"
                            title={matchTranslate('viewUserTitle', { name: p2.fullName })}
                          >
                            {p2.fullName}
                          </button>
                        );
                      }

                      const p1 = {
                        userId: members[0]?.userId || (part2?.registeredBy?.fullName === rawNames[0] ? part2.registeredBy.id : '') || '',
                        fullName: members[0]?.fullName || rawNames[0] || matchTranslate('unknownTeam'),
                        avatarUrl: members[0]?.avatarUrl || null,
                      };
                      const p2 = {
                        userId: members[1]?.userId || (part2?.registeredBy?.fullName === rawNames[1] ? part2.registeredBy.id : '') || '',
                        fullName: members[1]?.fullName || rawNames[1] || matchTranslate('unknownTeam'),
                        avatarUrl: members[1]?.avatarUrl || null,
                      };

                      return (
                        <div className="flex flex-wrap items-center justify-center gap-1.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => handlePlayerClick(e, p1)}
                            className="text-lg font-black text-slate-900 hover:text-blue-600 hover:underline transition-colors cursor-pointer"
                            title={matchTranslate('viewUserTitle', { name: p1.fullName })}
                          >
                            {p1.fullName}
                          </button>
                          <span className="text-slate-400 font-bold text-sm">-</span>
                          <button
                            type="button"
                            onClick={(e) => handlePlayerClick(e, p2)}
                            className="text-lg font-black text-slate-900 hover:text-blue-600 hover:underline transition-colors cursor-pointer"
                            title={matchTranslate('viewUserTitle', { name: p2.fullName })}
                          >
                            {p2.fullName}
                          </button>
                        </div>
                      );
                    })()}

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

                {penalties.length > 0 ? (
                  <section className="mt-8 border-t border-slate-100 pt-6" aria-label={matchTranslate('penaltiesAriaLabel')}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">
                          {matchTranslate('penaltiesAndCards')}
                        </h4>
                        <p className="mt-1 text-xs font-medium text-slate-400">
                          {matchTranslate('penaltiesDescription')}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                        {matchTranslate('penaltyCount', { count: penalties.length })}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {penalties.slice(-6).reverse().map((penalty) => {
                        const action = penaltySchema.groups
                          .flatMap((group) => group.items)
                          .find((item) => item.kind === penalty.kind);
                        const normalizedKind = penalty.kind.toUpperCase();
                        const isRed = normalizedKind.includes('RED') || normalizedKind.includes('EJECT');
                        const isYellow = normalizedKind.includes('YELLOW') || normalizedKind.includes('WARNING');
                        const tone = isRed
                          ? {
                              box: 'border-red-200 bg-red-50',
                              mark: 'bg-red-500',
                              label: 'text-red-800',
                              badge: 'bg-red-100 text-red-700',
                            }
                          : isYellow
                            ? {
                                box: 'border-amber-200 bg-amber-50',
                                mark: 'bg-amber-400',
                                label: 'text-amber-900',
                                badge: 'bg-amber-100 text-amber-800',
                              }
                            : {
                                box: 'border-slate-200 bg-slate-50',
                                mark: 'bg-blue-500',
                                label: 'text-slate-800',
                                badge: 'bg-blue-50 text-blue-700',
                              };
                        const teamLabel = penalty.team === 1
                          ? team1Name
                          : penalty.team === 2
                            ? team2Name
                            : matchTranslate('matchLabel');
                        const localizedPenaltyLabel = action
                          ? livePenaltyTranslate(`schema.items.${action.kind}.label`)
                          : penalty.label;
                        const localizedCardLabel = action?.cardLabelKey
                          ? livePenaltyTranslate(`schema.items.${action.kind}.${action.cardLabelKey}`)
                          : undefined;

                        return (
                          <div key={penalty.id} className={`flex min-w-0 items-start gap-3 rounded-xl border px-3 py-3 ${tone.box}`}>
                            <span className={`mt-1 h-3 w-3 shrink-0 rounded-sm ${tone.mark}`} aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className={`truncate text-sm font-bold ${tone.label}`}>{localizedPenaltyLabel}</p>
                                {localizedCardLabel ? (
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone.badge}`}>
                                    {localizedCardLabel}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 truncate text-xs font-semibold text-slate-500">{teamLabel}</p>
                              {penalty.note ? (
                                <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500">{penalty.note}</p>
                              ) : null}
                              <p className="mt-1 text-[11px] font-medium text-slate-400">
                                {new Date(penalty.createdAt).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {penalties.length > 6 ? (
                      <p className="mt-3 text-center text-xs font-semibold text-slate-400">
                        {matchTranslate('penaltiesVisibleSummary', { count: penalties.length })}
                      </p>
                    ) : null}
                  </section>
                ) : null}
              </div>

              {/* Footer Info */}
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-2 max-w-[50%] truncate" title={
                  match.courtAddress
                    ? `${match.courtName || match.tournament?.venueName} - ${match.courtAddress}`
                    : (match.tournament?.venueAddress ? `${match.courtName || match.tournament?.venueName} - ${match.tournament.venueAddress}` : (match.courtName || match.tournament?.venueName || ''))
                }>
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {match.courtName
                      ? `${matchTranslate('courtLabel')} ${match.courtName}`
                      : (match.tournament?.venueName ? `${matchTranslate('courtLabel')} ${match.tournament.venueName}` : translate('defaultCourt'))}
                    {(match.courtAddress || match.tournament?.venueAddress) ? ` (${match.courtAddress || match.tournament?.venueAddress})` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" /> {match.scheduledAt ? new Date(match.scheduledAt).toLocaleTimeString(dateLocale, {hour: '2-digit', minute:'2-digit'}) : matchTranslate('noScheduledTime')}
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
                      {matchTranslate('refereeControlTitle')}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      {matchTranslate('openScoringPanelTitle')}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {matchTranslate('scoringPanelDescription')}
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
                      {matchTranslate('startScoring')}
                    </span>
                  </Button>
                </div>
              </div>
            ) : null}

            {scoreOverride?.reason ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
                {matchTranslate('scoreOverrideNotice', { reason: scoreOverride.reason })}
                {scoreOverride.decidedAt
                  ? ` • ${new Date(scoreOverride.decidedAt).toLocaleString(dateLocale)}`
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
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{matchTranslate('discussionTitle')}</h3>
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
              <div ref={commentsBoxRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {comments.map((comment) => {
                  const authorName = comment.user?.fullName || matchTranslate('userLabel');
                  const avatarUrl = comment.user?.avatarUrl || null;
                  return (
                    <div key={comment.id} className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <button
                        type="button"
                        onClick={(e) => {
                          if (comment.user?.id) {
                            openUserById(comment.user.id, authorName, avatarUrl, e.currentTarget.getBoundingClientRect(), match.tournament?.communityId || undefined);
                          }
                        }}
                        className={`w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0 uppercase overflow-hidden shadow-xs transition-transform ${comment.user?.id ? 'cursor-pointer hover:scale-105 hover:ring-2 hover:ring-blue-300' : ''}`}
                        title={comment.user?.id ? matchTranslate('viewUserTitle', { name: authorName }) : authorName}
                      >
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          authorName.charAt(0)
                        )}
                      </button>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              if (comment.user?.id) {
                                openUserById(comment.user.id, authorName, avatarUrl, e.currentTarget.getBoundingClientRect(), match.tournament?.communityId || undefined);
                              }
                            }}
                            className={`text-xs font-bold text-slate-800 truncate text-left ${comment.user?.id ? 'hover:text-blue-600 hover:underline cursor-pointer' : ''}`}
                            title={comment.user?.id ? matchTranslate('viewUserTitle', { name: authorName }) : authorName}
                          >
                            {authorName}
                          </button>
                          <span className="text-[9px] text-slate-400 font-medium shrink-0">
                            {new Date(comment.createdAt).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-650 mt-1 leading-relaxed break-words">{comment.commentText}</p>
                      </div>
                    </div>
                  );
                })}
                {comments.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm my-auto">
                    {translate('communityNoPosts')}
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
                    placeholder={user ? translate('commentAsUser', { name: user.fullName || user.email }) : translate('loginToComment')}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onFocus={() => {
                      if (!user) {
                        toast.error(translate('loginToComment'));
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
          key={`official-score-${matchId}-${activeTournamentMode ?? 'default'}`}
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
          isLiteMatch={isLiteMatch}
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
          isFootball={resolvedRules.kind === 'FOOTBALL'}
          shootoutGoals={shootoutGoals}
          onShootoutGoalsChange={setShootoutGoals}
          footballScore={footballScore}
          onFootballGoal={handleFootballGoal}
          onFootballUndoGoal={handleFootballUndoGoal}
          onFootballPhaseChange={handleFootballPhaseChange}
          onFootballEvent={handleFootballEvent}
          onFootballMinuteChange={(minute) => syncFootballScore({ ...footballScore, minute })}
        />

        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          shareUrl={typeof window !== 'undefined' ? window.location.href : ''}
          title={translate("liveDiscussionTitle", { team1: team1Name, team2: team2Name })}
        />

      </div>
    </div>
  );
}
