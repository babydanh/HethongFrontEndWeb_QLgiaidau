'use client';

import { use, useEffect, useState, useCallback, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  tournamentsApi,
  type BracketMatch,
  type BracketStage,
  type BracketSlotMutation,
  type Tournament,
  GenderRestriction,
  MatchTypeDB,
} from '@/features/tournaments/api';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import PublicBracketTab from '@/app/(public)/tournaments/[id]/components/BracketTab';
import type {
  BracketDragHandlers,
  BracketDragSource,
  BracketParticipant,
  BracketSlot,
} from '@/app/(public)/tournaments/[id]/components/bracket/types';
import { getSportLogo } from '@/constants/sports';
import {
  Trophy, Users, Swords, Calendar,
    ExternalLink, Copy, ChevronLeft,

  AlertTriangle, CheckCircle, RefreshCw, UserPlus, Shuffle,
  Unlink, Loader2, User, FlaskConical,
} from 'lucide-react';
import Link from 'next/link';

import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import type { LiteParticipant } from '@/types/tournament';
import { LiteInviteQr } from '@/components/tournaments/LiteInviteQr';
import { buildLiteJoinUrl } from '@/features/tournaments/lite-qr';

type LiteTab = 'overview' | 'participants' | 'bracket' | 'matches';

const TAB_CONFIG: { key: LiteTab; label: string; icon: typeof Trophy }[] = [
  { key: 'overview', label: 'overviewTab', icon: Trophy },
  { key: 'participants', label: 'participantsTab', icon: Users },
  { key: 'bracket', label: 'bracketTab', icon: Swords },
  { key: 'matches', label: 'matchesTab', icon: Calendar },
];

function StatusBadge({ status }: { status: Tournament['status'] }) {
  const translate = useTranslations('LiteManage');
  const map: Record<string, { label: string; className: string }> = {
    DRAFT: { label: translate('statusDraft'), className: 'bg-slate-100 text-slate-700' },
    REGISTRATION_OPEN: { label: translate('statusRegistrationOpen'), className: 'bg-blue-50 text-blue-700 border-blue-200' },
    REGISTRATION_CLOSED: { label: translate('statusRegistrationClosed'), className: 'bg-amber-50 text-amber-700 border-amber-200' },
    UPCOMING: { label: translate('statusUpcoming'), className: 'bg-blue-50 text-blue-700 border-blue-200' },
    IN_PROGRESS: { label: translate('statusInProgress'), className: 'bg-rose-50 text-rose-700 border-slate-200' },
    ONGOING: { label: translate('statusInProgress'), className: 'bg-rose-50 text-rose-700 border-slate-200' },
    COMPLETED: { label: translate('statusFinished'), className: 'bg-purple-50 text-purple-700 border-purple-200' },
    CANCELLED: { label: translate('statusCancelled'), className: 'bg-rose-50 text-rose-700 border-slate-200' },
  };
  const cfg = map[status] ?? { label: status, className: 'bg-slate-100 text-slate-700' };
  return (
    <Badge className={`${cfg.className} text-xs font-semibold px-2.5 py-0.5 rounded-full`}>
      {cfg.label}
    </Badge>
  );
}

function SportLabel({ name }: { name?: string | null }) {
  const translate = useTranslations('LiteManage');
  const logo = name ? getSportLogo(name) : null;
  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
      {logo && <img src={logo} alt="" className="w-3.5 h-3.5 object-contain" />}
      {name || translate('unknownValue')}
    </span>
  );
}

export default function LiteTournamentManagePage({ params }: { params: Promise<{ id: string }> }) {
  const translate = useTranslations('LiteManage');
  const bracketTranslate = useTranslations('TournamentDetail');
  const locale = useLocale();
  const { id } = use(params);
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LiteTab>('overview');
  const [rulesEditing, setRulesEditing] = useState(false);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [ruleSetsToWin, setRuleSetsToWin] = useState(2);
  const [rulePointsPerSet, setRulePointsPerSet] = useState(21);
  const [ruleMaxPoints, setRuleMaxPoints] = useState(30);
  const [ruleWinByTwo, setRuleWinByTwo] = useState(true);
  const [ruleHalves, setRuleHalves] = useState(2);
  const [ruleHalfDuration, setRuleHalfDuration] = useState(45);
  const [ruleAllowDraw, setRuleAllowDraw] = useState(true);
  const [hasBracket, setHasBracket] = useState(false);
  const [selectedMatchType, setSelectedMatchType] = useState<MatchTypeDB>(MatchTypeDB.SINGLES);
  const [matchTypeSaving, setMatchTypeSaving] = useState(false);
  const [bracket, setBracket] = useState<{ stages: BracketStage[] } | null>(null);
  const [bracketRefreshKey, setBracketRefreshKey] = useState(0);
  const [participantOverrides, setParticipantOverrides] = useState<Record<string, BracketParticipant | null>>({});
  const [activeDragSource, setActiveDragSource] = useState<BracketDragSource | null>(null);
  const [isSavingBracketSlots, setIsSavingBracketSlots] = useState(false);
  const bracketScrollYRef = useRef<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const liteDivisionId = tournament?.divisions?.[0]?.id;

  const fetchBracket = useCallback(async (divisionId = liteDivisionId) => {
    const response = await tournamentsApi.getTournamentBracket(id, divisionId);
    const loadedBracket = response.data ?? null;
    setBracket(loadedBracket);
    setHasBracket(Boolean(loadedBracket?.stages?.length));
    return loadedBracket;
  }, [id, liteDivisionId]);

  useEffect(() => {
    const fetch = async () => {
      try {
        setIsLoading(true);
        const res = await tournamentsApi.getTournamentById(id);
        const loaded = res.data ?? null;
        setTournament(loaded);
        const loadedDivision = loaded?.divisions?.[0];
        const loadedMatchType = loadedDivision?.matchType ?? loaded?.matchType;
        const normalizedLoadedMatchType = loadedMatchType?.toUpperCase();
        const effectiveLoadedMatchType = normalizedLoadedMatchType === MatchTypeDB.DOUBLES &&
            loadedDivision?.genderRestriction?.toUpperCase() === GenderRestriction.MIXED
          ? MatchTypeDB.MIXED_DOUBLES
          : normalizedLoadedMatchType;
        if (Object.values(MatchTypeDB).includes(effectiveLoadedMatchType as MatchTypeDB)) {
          setSelectedMatchType(effectiveLoadedMatchType as MatchTypeDB);
        }
        if (loaded?.sportRules?.kind === 'FOOTBALL') {
          setRuleHalves(Number(loaded.sportRules.halvesCount ?? 2));
          setRuleHalfDuration(Number(loaded.sportRules.halfDuration ?? 45));
          setRuleAllowDraw(loaded.sportRules.allowDraw !== false);
        } else if (loaded?.sportRules) {
          setRuleSetsToWin(Number(loaded.sportRules.setsToWin ?? 2));
          setRulePointsPerSet(Number(loaded.sportRules.pointsPerSet ?? 21));
          setRuleMaxPoints(Number(loaded.sportRules.maxPoints ?? 30));
          setRuleWinByTwo(loaded.sportRules.winByTwo !== false);
        }
        await fetchBracket(loaded?.divisions?.[0]?.id);
      } catch {
        setTournament(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [id, fetchBracket]);

  const handleSaveRules = async () => {
    if (!tournament || ['IN_PROGRESS', 'ONGOING', 'COMPLETED'].includes(tournament.status)) {
      toast.error(translate('rulesSaveBlocked'));
      return;
    }
    const existing = tournament.sportRules ?? {};
    const sportRules = existing.kind === 'FOOTBALL'
      ? { ...existing, halvesCount: ruleHalves, halfDuration: ruleHalfDuration, allowDraw: ruleAllowDraw }
      : { ...existing, setsToWin: ruleSetsToWin, pointsPerSet: rulePointsPerSet, maxPoints: ruleMaxPoints, winByTwo: ruleWinByTwo };
    setRulesSaving(true);
    try {
      const response = await tournamentsApi.updateTournament(id, { sportRules });
      setTournament(response.data ?? { ...tournament, sportRules });
      setRulesEditing(false);
      toast.success(translate('saveRulesSuccess'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRulesSaving(false);
    }
  };

  const handleSaveMatchType = async () => {
    const division = tournament?.divisions?.[0];
    const divisionId = division?.id;
    const rawCurrentMatchType = division?.matchType ?? tournament?.matchType;
    const currentMatchType = rawCurrentMatchType?.toUpperCase() === MatchTypeDB.DOUBLES &&
        division?.genderRestriction?.toUpperCase() === GenderRestriction.MIXED
      ? MatchTypeDB.MIXED_DOUBLES
      : rawCurrentMatchType?.toUpperCase();
    const isFootball = tournament?.sportRules?.kind === 'FOOTBALL';
    const lifecycleLocked = Boolean(
      !tournament ||
      !divisionId ||
      hasBracket ||
      tournament.isRegistrationLocked ||
      ['IN_PROGRESS', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(tournament.status),
    );

    if (lifecycleLocked || (isFootball && selectedMatchType !== MatchTypeDB.DOUBLES)) {
      toast.error(translate('matchTypeSaveBlocked'));
      return;
    }
    if (!divisionId) return;
    if (selectedMatchType === currentMatchType) return;
    if (!window.confirm(translate('matchTypeSaveConfirm'))) return;

    setMatchTypeSaving(true);
    try {
      const participantsResponse = await tournamentsApi.getLiteParticipants(id);
      if ((participantsResponse.data ?? []).length > 0) {
        toast.error(translate('matchTypeSaveBlocked'));
        return;
      }
      await tournamentsApi.updateDivisionConfig(id, divisionId, {
        matchType: selectedMatchType,
        genderRestriction: selectedMatchType === MatchTypeDB.MIXED_DOUBLES
          ? GenderRestriction.MIXED
          : null,
      });
      setTournament((current) => current ? {
        ...current,
        matchType: selectedMatchType,
        genderRestriction: selectedMatchType === MatchTypeDB.MIXED_DOUBLES ? 'MIXED' : null,
        divisions: current.divisions?.map((candidate) => candidate.id === divisionId
          ? { ...candidate, matchType: selectedMatchType, genderRestriction: selectedMatchType === MatchTypeDB.MIXED_DOUBLES ? 'MIXED' : null }
          : candidate),
      } : current);
      toast.success(translate('matchTypeSaveSuccess'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setMatchTypeSaving(false);
    }
  };

  // --- Participants / pairing state ---
  const [participants, setParticipants] = useState<LiteParticipant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [generatingStrategy, setGeneratingStrategy] = useState<'RANDOM' | 'ELO_BALANCED' | null>(null);
  const [unpairingId, setUnpairingId] = useState<string | null>(null);
  const [bracketLoading, setBracketLoading] = useState(false);
  const [mockLoading, setMockLoading] = useState(false);
  const [rosterConfirming, setRosterConfirming] = useState(false);

  

  const fetchParticipants = useCallback(async () => {
    if (!id) return;
    setParticipantsLoading(true);
    setParticipantsError(null);
    try {
      const res = await tournamentsApi.getLiteParticipants(id);
      setParticipants(res.data ?? []);
    } catch (err) {
      setParticipantsError(getErrorMessage(err));
    } finally {
      setParticipantsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab !== 'participants') return;
    const load = async () => {
      setParticipantsLoading(true);
      setParticipantsError(null);
      try {
        const res = await tournamentsApi.getLiteParticipants(id);
        setParticipants(res.data ?? []);
      } catch (err) {
        setParticipantsError(getErrorMessage(err));
      } finally {
        setParticipantsLoading(false);
      }
    };
    load();
  }, [activeTab, id]);

  const pendingParticipants = participants.filter(
    (p) => p.teamStatus === 'PENDING_PARTNER'
  );
  const pairedParticipants = participants.filter(
    (p) => p.teamStatus === 'COMPLETE' || p.teamStatus === 'PENDING_APPROVAL'
  );
  const canonicalMatchType = (
    tournament?.divisions?.[0]?.matchType ?? tournament?.matchType ?? ''
  ).toUpperCase();
  const isPairFormat = ['DOUBLES', 'MIXED_DOUBLES'].includes(canonicalMatchType);
  const isSingleEliminationBracket = Boolean(
    bracket?.stages?.length === 1 && bracket.stages[0]?.type === 'SINGLE_ELIMINATION',
  );
  const tournamentDragLocked = ['IN_PROGRESS', 'ONGOING', 'COMPLETED'].includes(tournament?.status ?? '');
  const bracketDragEnabled = Boolean(
    hasBracket &&
    liteDivisionId &&
    isSingleEliminationBracket &&
    !tournamentDragLocked &&
    !isSavingBracketSlots,
  );

  type LiteBracketDropTarget = Parameters<NonNullable<BracketDragHandlers['onParticipantDrop']>>[1];

  const findBracketMatch = (matchId: string): BracketMatch | null => {
    for (const stage of bracket?.stages ?? []) {
      for (const group of stage.groups ?? []) {
        const match = group.matches.find((candidate) => candidate.id === matchId);
        if (match) return match;
      }
    }
    return null;
  };

  const getCurrentSlotParticipant = (matchId: string, slot: BracketSlot): BracketParticipant | null => {
    const key = `${matchId}:${slot}`;
    if (Object.prototype.hasOwnProperty.call(participantOverrides, key)) {
      return participantOverrides[key] ?? null;
    }
    return findBracketMatch(matchId)?.[slot] ?? null;
  };

  const isMatchDragLocked = (match: BracketMatch | null): boolean => {
    const status = match?.status?.toUpperCase();
    return tournamentDragLocked || status === 'LIVE' || status === 'ONGOING' || status === 'IN_PROGRESS' || status === 'COMPLETED';
  };

  const handleBracketParticipantDrop = async (
    source: BracketDragSource,
    target: LiteBracketDropTarget,
  ): Promise<void> => {
    if (!bracketDragEnabled || source.type !== 'slot' || !source.matchId || !source.slot || target.type !== 'slot') return;

    const sourceMatch = findBracketMatch(source.matchId);
    const targetMatch = findBracketMatch(target.matchId);
    if (isMatchDragLocked(sourceMatch) || isMatchDragLocked(targetMatch)) return;

    const sourceKey = `${source.matchId}:${source.slot}`;
    const targetKey = `${target.matchId}:${target.slot}`;
    if (sourceKey === targetKey) return;

    const currentOccupant = getCurrentSlotParticipant(target.matchId, target.slot);
    const previousOverrides = participantOverrides;
    const nextOverrides = { ...previousOverrides };
    nextOverrides[targetKey] = source.participant;
    nextOverrides[sourceKey] = currentOccupant;

    const operation: BracketSlotMutation = currentOccupant
      ? {
          operation: 'SWAP',
          fromMatchId: source.matchId,
          fromSlot: source.slot,
          toMatchId: target.matchId,
          toSlot: target.slot,
        }
      : {
          operation: 'MOVE',
          fromMatchId: source.matchId,
          fromSlot: source.slot,
          toMatchId: target.matchId,
          toSlot: target.slot,
        };

    bracketScrollYRef.current = typeof window === 'undefined' ? null : window.scrollY;
    setParticipantOverrides(nextOverrides);
    setIsSavingBracketSlots(true);
    try {
      await tournamentsApi.updateBracketSlots(id, liteDivisionId!, [operation]);
      await fetchBracket(liteDivisionId);
      setParticipantOverrides({});
      setBracketRefreshKey((current) => current + 1);
      toast.success(bracketTranslate('bracketSlotsSaved'));
    } catch (error) {
      setParticipantOverrides(previousOverrides);
      toast.error(getErrorMessage(error) || bracketTranslate('bracketSlotsSaveFailed'));
    } finally {
      setIsSavingBracketSlots(false);
      const savedScrollY = bracketScrollYRef.current;
      bracketScrollYRef.current = null;
      if (savedScrollY !== null && typeof window !== 'undefined') {
        requestAnimationFrame(() => window.scrollTo(0, savedScrollY));
      }
    }
  };

  const handleBracketDragStart = (event: DragStartEvent) => {
    const source = (event.active.data.current as { source?: BracketDragSource } | undefined)?.source;
    setActiveDragSource(source ?? null);
  };

  const handleBracketDragEnd = (event: DragEndEvent) => {
    setActiveDragSource(null);
    const source = (event.active.data.current as { source?: BracketDragSource } | undefined)?.source;
    const target = (event.over?.data.current as { target?: unknown } | undefined)?.target;
    if (!source || !target || typeof target !== 'object') return;
    const targetRecord = target as Record<string, unknown>;
    if (targetRecord.type !== 'slot' || typeof targetRecord.matchId !== 'string' || (targetRecord.slot !== 'participant1' && targetRecord.slot !== 'participant2')) return;
    void handleBracketParticipantDrop(source, targetRecord as LiteBracketDropTarget);
  };

  const bracketDragHandlers: BracketDragHandlers = {
    enabled: bracketDragEnabled,
    participantOverrides,
    onParticipantDrop: handleBracketParticipantDrop,
  };

  const toggleSelection = (pid: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(pid)) return prev.filter((x) => x !== pid);
      if (prev.length >= 2) {
        toast(translate('selectedTwoParticipants'), { duration: 2000 });
        return prev;
      }
      return [...prev, pid];
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const handleManualPair = async () => {
    if (selectedIds.length !== 2) return;
    setPairingLoading(true);
    try {
      await tournamentsApi.pairLiteParticipants(id, {
        participant1Id: selectedIds[0],
        participant2Id: selectedIds[1],
      });
      toast.success(translate('pairSuccess'));
      clearSelection();
      await fetchParticipants();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPairingLoading(false);
    }
  };

  const handleGeneratePairs = async (strategy: 'RANDOM' | 'ELO_BALANCED') => {
    const label = strategy === 'RANDOM' ? translate('randomPair') : translate('balancedEloPair');
    if (!confirm(translate('pairAllConfirm', { label }))) return;
    setGeneratingStrategy(strategy);
    try {
      const res = await tournamentsApi.generateLitePairs(id, { strategy });
      const unpairedIds = res.data?.unpairedParticipantIds ?? [];
      if (unpairedIds.length > 0) {
        toast.success(
          translate('pairAllPartial', { label, count: unpairedIds.length })
        );
      } else {
      toast.success(translate('pairAllSuccess'));
      }
      clearSelection();
      await fetchParticipants();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGeneratingStrategy(null);
    }
  };

  const handleUnpair = async (participantId: string) => {
    if (!confirm(translate('unpairConfirm'))) return;
    setUnpairingId(participantId);
    try {
      await tournamentsApi.unpairLiteParticipant(id, participantId);
      toast.success(translate('unpairSuccess'));
      await fetchParticipants();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUnpairingId(null);
    }
  };

  const handleCopyInvite = async () => {
    if (!tournament?.inviteCode) return;
    const joinUrl = tournament.communityId
      ? `${window.location.origin}/lite/tournaments/join/${tournament.inviteCode}`
      : `${window.location.origin}/tournaments/${tournament.id}/register?invite=${encodeURIComponent(tournament.inviteCode)}`;
    try {
      await navigator.clipboard.writeText(joinUrl);
      toast.success(translate('copyInviteSuccess'));
    } catch {
      toast.error(translate('copyFailed'));
    }
  };

  const handleGenerateBracket = async () => {
    if (!confirm(translate('createBracketConfirm'))) return;
    setBracketLoading(true);
    try {
      await tournamentsApi.generateLiteBracket(id);
      await fetchBracket(liteDivisionId);
      setParticipantOverrides({});
      setBracketRefreshKey((current) => current + 1);
      toast.success(translate('bracketCreatedSuccess'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBracketLoading(false);
    }
  };

  const handleConfirmRoster = async () => {
    if (tournament?.isRegistrationLocked) return;
    if (!confirm(translate('rosterLockedConfirm'))) return;
    setRosterConfirming(true);
    try {
      const response = await tournamentsApi.confirmLiteRoster(id);
      setTournament(response.data ?? (tournament ? { ...tournament, isRegistrationLocked: true, status: 'REGISTRATION_CLOSED' } : tournament));
      toast.success(translate('rosterLockedSuccess'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRosterConfirming(false);
    }
  };

  const handleResetBracket = async () => {
    if (!confirm(translate('resetBracketConfirm'))) return;
    setBracketLoading(true);
    try {
      await tournamentsApi.resetLiteBracket(id);
      await fetchBracket(liteDivisionId);
      setParticipantOverrides({});
      setBracketRefreshKey((current) => current + 1);
      toast.success(translate('resetBracketSuccess'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBracketLoading(false);
    }
  };

  const handleSeedMock = async () => {
    const count = prompt(translate('mockParticipantPrompt'), '8');
    const num = parseInt(count || '0', 10);
    if (num < 1 || num > 50) return toast.error(translate('mockParticipantCountError'));
    setMockLoading(true);
    try {
      const names = Array.from({ length: num }, (_, i) => translate('mockParticipantName', { count: i + 1 }));
      await tournamentsApi.seedMockParticipants(id, names);
      toast.success(translate('mockParticipantCreated', { count: num }));
      await fetchParticipants();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMockLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">{translate('loadingTournamentInfo')}</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="max-w-md bg-white p-8 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-900">{translate('tournamentNotFound')}</h2>
          <p className="text-slate-500 mt-2">
            {translate('accessUnavailable')}
          </p>
        </div>
      </div>
    );
  }

  const inviteUrl = tournament.inviteCode && typeof window !== 'undefined'
    ? tournament.communityId
      ? buildLiteJoinUrl(tournament.inviteCode, window.location.origin)
      : `${window.location.origin}/tournaments/${tournament.id}/register?invite=${encodeURIComponent(tournament.inviteCode)}`
    : null;
  const currentMatchType = tournament.divisions?.[0]?.matchType ?? tournament.matchType;
  const formatSettingLocked = Boolean(
    hasBracket ||
    tournament.isRegistrationLocked ||
    (tournament.divisions?.[0]?._count?.participants ?? 0) > 0 ||
    ['IN_PROGRESS', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(tournament.status),
  );
  const isFootballTournament = tournament.sportRules?.kind === 'FOOTBALL';

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <Link
          href="/organizer/tournaments"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> {translate('myTournaments')}
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate">
                  {tournament.name}
                </h1>
                <StatusBadge status={tournament.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <SportLabel name={tournament.category?.name} />
                <span className="text-slate-300">|</span>
                <span>{currentMatchType === 'SINGLES' ? translate('matchTypeSingles') : currentMatchType === 'DOUBLES' ? translate('matchTypeDoubles') : currentMatchType === 'MIXED_DOUBLES' ? translate('matchTypeMixedDoubles') : currentMatchType}</span>
                {tournament.maxParticipants && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span>{translate('maxTeams', { count: tournament.maxParticipants })}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href={`/tournaments/${tournament.id}`} target="_blank">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                  <ExternalLink className="w-3.5 h-3.5" /> {translate('viewTournament')}
                </Button>
              </Link>
              {inviteUrl && (
                <Button size="sm" className="gap-1.5 text-xs font-semibold" onClick={handleCopyInvite}>
                  <Copy className="w-3.5 h-3.5" /> {translate('copyInvite')}
                </Button>
              )}
            </div>
          </div>

          {inviteUrl && (
            <LiteInviteQr
              inviteUrl={inviteUrl}
              tournamentName={tournament.name}
              compact
            />
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-white rounded-lg border border-slate-200 shadow-sm p-1 overflow-x-auto">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {translate(tab.label)}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-slate-900">{translate('overviewTitle')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoCard label={translate('sportLabel')} value={tournament.category?.name || translate('unknownValue')} />
                <InfoCard label={translate('matchTypeLabel')} value={
                  currentMatchType === 'SINGLES' ? translate('matchTypeSingles')
                  : currentMatchType === 'DOUBLES' ? translate('matchTypeDoubles')
                  : currentMatchType === 'MIXED_DOUBLES' ? translate('matchTypeMixedDoubles')
                  : currentMatchType || translate('unknownValue')
                } />
                <InfoCard label={translate('formatLabel')} value={
                                    tournament.format === 'SINGLE_ELIMINATION' ? translate('formatSingleElimination')
                  : tournament.format === 'DOUBLE_ELIMINATION' ? translate('formatDoubleElimination')
                  : tournament.format === 'ROUND_ROBIN' ? translate('formatRoundRobin')
                  : tournament.format === 'GROUP_STAGE_KNOCKOUT' ? translate('formatGroupStageKnockout')

                  : tournament.format || translate('unknownValue')
                } />
                <InfoCard label={translate('maxParticipants')} value={tournament.maxParticipants?.toString() || '—'} />
                <InfoCard label={translate('participantLabel')} value={tournament._count?.participants?.toString() || '0'} />
                <InfoCard label={translate('matchesTitle')} value={tournament._count?.matches?.toString() || '0'} />
                {tournament.startDate && (
                  <InfoCard label={translate('startDate')} value={new Date(tournament.startDate).toLocaleDateString(locale)} />
                )}
                {(tournament.locationAddress || tournament.tournamentConfig?.location?.display) && (
                  <InfoCard label={translate('locationLabel')} value={tournament.locationAddress || tournament.tournamentConfig?.location?.display || '—'} />
                )}
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{translate('matchTypeSettingTitle')}</h4>
                    <p className="mt-1 text-xs text-slate-600">{translate('matchTypeSettingDescription')}</p>
                  </div>
                  <div className="flex flex-col items-stretch gap-2 sm:min-w-56">
                    <select
                      value={isFootballTournament ? MatchTypeDB.DOUBLES : selectedMatchType}
                      onChange={(event) => setSelectedMatchType(event.target.value as MatchTypeDB)}
                      disabled={formatSettingLocked || isFootballTournament || matchTypeSaving}
                      className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                      aria-label={translate('matchTypeSettingTitle')}
                    >
                      {!isFootballTournament && <option value={MatchTypeDB.SINGLES}>{translate('matchTypeSingles')}</option>}
                      <option value={MatchTypeDB.DOUBLES}>{translate('matchTypeDoubles')}</option>
                      {!isFootballTournament && <option value={MatchTypeDB.MIXED_DOUBLES}>{translate('matchTypeMixedDoubles')}</option>}
                    </select>
                    <Button size="sm" onClick={handleSaveMatchType} disabled={formatSettingLocked || isFootballTournament || matchTypeSaving || selectedMatchType === currentMatchType}>
                      {matchTypeSaving ? translate('saving') : translate('saveMatchType')}
                    </Button>
                  </div>
                </div>
                {formatSettingLocked && <p className="mt-3 text-xs font-semibold text-amber-700">{translate('matchTypeSettingLocked')}</p>}
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{translate('rulesTitle')}</h4>
                    <p className="mt-1 text-xs text-slate-600">{translate('rulesPresetDescription')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-white text-emerald-700 border-emerald-200">{translate('liteFreeBadge')}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRulesEditing((value) => !value)}
                      disabled={['IN_PROGRESS', 'ONGOING', 'COMPLETED'].includes(tournament.status)}
                    >
                      {rulesEditing ? translate('closeRules') : translate('editRules')}
                    </Button>
                  </div>
                </div>
                {rulesEditing ? (
                  <div className="mt-4 space-y-3 rounded-lg border border-emerald-200 bg-white p-3">
                    {tournament.sportRules?.kind === 'FOOTBALL' ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Input label={translate('halves')} type="number" min={1} max={4} value={ruleHalves} onChange={(event) => setRuleHalves(Number(event.target.value) || 1)} />
                        <Input label={translate('minutesPerHalf')} type="number" min={1} max={120} value={ruleHalfDuration} onChange={(event) => setRuleHalfDuration(Number(event.target.value) || 1)} />
                        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={ruleAllowDraw} onChange={(event) => setRuleAllowDraw(event.target.checked)} className="h-4 w-4 accent-emerald-600" /> {translate('allowDraw')}</label>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <Input label={translate('setsToWin')} type="number" min={1} max={5} value={ruleSetsToWin} onChange={(event) => setRuleSetsToWin(Number(event.target.value) || 1)} />
                        <Input label={translate('pointsPerSet')} type="number" min={1} max={99} value={rulePointsPerSet} onChange={(event) => setRulePointsPerSet(Number(event.target.value) || 1)} />
                        <Input label={translate('maxPoints')} type="number" min={1} max={199} value={ruleMaxPoints} onChange={(event) => setRuleMaxPoints(Number(event.target.value) || 1)} />
                        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={ruleWinByTwo} onChange={(event) => setRuleWinByTwo(event.target.checked)} className="h-4 w-4 accent-emerald-600" /> {translate('winByTwoShort')}</label>
                      </div>
                    )}
                    <div className="flex justify-end"><Button size="sm" onClick={handleSaveRules} disabled={rulesSaving}>{rulesSaving ? translate('saving') : translate('saveRules')}</Button></div>
                  </div>
                ) : tournament.sportRules?.kind === 'FOOTBALL' ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <InfoCard label={translate('halves')} value={String(tournament.sportRules.halvesCount ?? 2)} />
                    <InfoCard label={translate('minutesPerHalf')} value={String(tournament.sportRules.halfDuration ?? 45)} />
                    <InfoCard label={translate('allowDraw')} value={tournament.sportRules.allowDraw === false ? translate('no') : translate('yes')} />
                    <InfoCard label={translate('teamSize')} value={String(tournament.tournamentConfig?.teamSize ?? '—')} />
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <InfoCard label={translate('setsToWin')} value={String(tournament.sportRules?.setsToWin ?? '—')} />
                    <InfoCard label={translate('pointsPerSet')} value={String(tournament.sportRules?.pointsPerSet ?? '—')} />
                    <InfoCard label={translate('maxPoints')} value={String(tournament.sportRules?.maxPoints ?? '—')} />
                    <InfoCard label={translate('winByTwoShort')} value={tournament.sportRules?.winByTwo === false ? translate('no') : translate('yes')} />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'participants' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">
                                    {translate('participantLabel')}

                  {!participantsLoading && (
                    <span className="ml-2 text-sm font-medium text-slate-400">
                      ({translate('participantProfiles', { count: participants.length })})
                    </span>
                  )}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchParticipants}
                  disabled={participantsLoading}
                  className="gap-1 text-xs font-semibold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${participantsLoading ? 'animate-spin' : ''}`} />
                  {translate('refresh')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedMock}
                  disabled={mockLoading}
                  className="gap-1 text-xs font-semibold text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <FlaskConical className={`w-3.5 h-3.5 ${mockLoading ? 'animate-pulse' : ''}`} />
                  {mockLoading ? translate('creating') : translate('createMockParticipant')}
                </Button>
              </div>

              {participantsLoading && participants.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : participantsError ? (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-rose-800">{participantsError}</p>
                  <Button variant="outline" size="sm" onClick={fetchParticipants} className="mt-3 text-xs">
                    {translate('retry')}
                  </Button>
                </div>
              ) : participants.length === 0 ? (
                <div className="bg-slate-50 rounded-lg p-8 text-center">
                  <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-500 font-medium">{translate('noParticipants')}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {translate('shareInviteToRegister')}
                  </p>
                </div>
              ) : (
                <>
                  {/* Pair formats: pending pool + pairing */}
                  {isPairFormat ? (
                    <>
                      {/* Pending pool */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-amber-500" />
                          {translate('pendingPairingsCount', { count: pendingParticipants.length })}
                        </h4>
                        {pendingParticipants.length === 0 ? (
                          <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg text-center">
                            {translate('noPendingPairingsShort')}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {pendingParticipants.map((p) => {
                              const isSelected = selectedIds.includes(p.id);
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => toggleSelection(p.id)}
                                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400'
                                      : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? 'border-blue-600 bg-blue-600'
                                        : 'border-slate-300'
                                    }`}
                                  >
                                    {isSelected && (
                                      <CheckCircle className="w-4 h-4 text-white" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-semibold text-slate-900 truncate block">
                                      {p.teamName}
                                    </span>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                      {p.rosters?.map((m) => (
                                        <span key={m.userId} className="flex items-center gap-1">
                                          <User className="w-3 h-3" />
                                          {m.profile?.fullName || '—'}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold">
                                                                        {translate('pendingPairingBadge')}

                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Pairing actions */}
                      {pendingParticipants.length >= 2 && (
                        <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <Button
                            onClick={handleManualPair}
                            disabled={selectedIds.length !== 2 || pairingLoading}
                            className="gap-1.5 text-xs font-semibold"
                            size="sm"
                          >
                            {pairingLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5" />
                            )}
                            {translate('manualPair', { count: selectedIds.length })}
                          </Button>
                          <div className="flex-1" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGeneratePairs('RANDOM')}
                            disabled={generatingStrategy !== null}
                            className="gap-1.5 text-xs font-semibold"
                          >
                            {generatingStrategy === 'RANDOM' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Shuffle className="w-3.5 h-3.5" />
                            )}
                            {translate('randomPair')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGeneratePairs('ELO_BALANCED')}
                            disabled={generatingStrategy !== null}
                            className="gap-1.5 text-xs font-semibold"
                          >
                            {generatingStrategy === 'ELO_BALANCED' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Shuffle className="w-3.5 h-3.5" />
                            )}
                            {translate('balancedEloPair')}
                          </Button>
                        </div>
                      )}

                      {/* Paired teams */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          {translate('pairedCount', { count: pairedParticipants.length })}
                        </h4>
                        {pairedParticipants.length === 0 ? (
                          <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg text-center">
                            {translate('noPairsCreated')}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {pairedParticipants.map((p) => (
                              <div
                                key={p.id}
                                className="bg-white rounded-lg border border-slate-200 p-4 flex items-start justify-between gap-4"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-2">
                                    <span className="text-sm font-semibold text-slate-900">
                                      {p.teamName}
                                    </span>
                                    {p.teamStatus === 'PENDING_APPROVAL' && (
                                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                                                                {translate('pendingApproval')}

                                      </Badge>
                                    )}
                                    {p.teamStatus === 'COMPLETE' && (
                                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                                                                {translate('ready')}

                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    {p.rosters?.map((m) => (
                                      <div key={m.userId} className="flex items-center gap-2 text-xs text-slate-600">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                          {m.profile?.avatarUrl ? (
                                            <img src={m.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <User className="w-3.5 h-3.5 text-slate-400" />
                                          )}
                                        </div>
                                        <span className="font-medium">{m.profile?.fullName || '—'}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {/* Only show unpair for actual Doubles pairs (has 2 rosters) */}
                                {(p.rosters?.length ?? 0) === 2 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUnpair(p.id)}
                                    disabled={unpairingId === p.id}
                                    className="shrink-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 gap-1"
                                  >
                                    {unpairingId === p.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Unlink className="w-3.5 h-3.5" />
                                    )}
                                    <span className="text-xs">{translate('cancelPairing')}</span>
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Singles: compact participant list, no pairing */
                    <div className="space-y-2">
                      {participants.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white"
                        >
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                            {p.rosters?.[0]?.profile?.avatarUrl ? (
                              <img src={p.rosters[0].profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-slate-900 truncate block">
                              {p.teamName}
                            </span>
                            {p.rosters?.[0]?.profile?.fullName && (
                              <span className="text-xs text-slate-500">{p.rosters[0].profile.fullName}</span>
                            )}
                          </div>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                                                        {translate('joined')}

                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Create bracket */}
                  {(isPairFormat ? pairedParticipants.length > 0 : participants.length > 0) && (
                    <div className="pt-4 border-t border-slate-100">
                      <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-amber-900">{translate('participantListTitle')}</p>
                          <p className="text-xs text-amber-700">{translate('participantListDescription')}</p>
                        </div>
                        {tournament?.isRegistrationLocked ? (
                          <Badge className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700">{translate('rosterLockedBadgeShort')}</Badge>
                        ) : (
                          <Button variant="outline" onClick={handleConfirmRoster} disabled={rosterConfirming} className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100">
                            {rosterConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                                        {translate('lockRoster')}

                          </Button>
                        )}
                      </div>
                      {!hasBracket && <Button
                        onClick={handleGenerateBracket}
                        disabled={bracketLoading}
                        className="w-full gap-2"
                      >
                        {bracketLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Swords className="w-4 h-4" />
                        )}
                        {bracketLoading ? translate('creatingBracket') : translate('createBracketAction')}
                      </Button>}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'bracket' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">{translate('bracketTitle')}</h3>
              <p className="text-sm text-slate-500">
                {hasBracket ? translate('bracketSavedDescriptionShort') : translate('noBracketSavedShort')}
              </p>
              {hasBracket && (
                <div className="flex flex-wrap gap-2">
                  <Link href={`/tournaments/${id}?tab=bracket`} target="_blank">
                    <Button variant="outline" className="gap-2"><ExternalLink className="w-4 h-4" /> {translate('viewBracket')}</Button>
                  </Link>
                  <Button variant="outline" onClick={handleResetBracket} disabled={bracketLoading || tournamentDragLocked} className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50">
                    <RefreshCw className="w-4 h-4" /> {translate('resetBracketAction')}
                  </Button>
                </div>
              )}
              {(isPairFormat ? pairedParticipants.length > 0 : participants.length > 0) && (
                <div className="bg-slate-50 rounded-lg p-6 text-center">
                  {!hasBracket && <>
                    <Swords className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm text-slate-500 mb-4">
                      {isPairFormat ? translate('pairingCompletePrompt') : translate('createBracketPrompt')}
                    </p>
                    <Button onClick={handleGenerateBracket} disabled={bracketLoading} className="gap-2">
                      {bracketLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                      {bracketLoading ? translate('creatingBracket') : translate('createBracketAction')}
                    </Button>
                  </>}
                </div>
              )}
              {participants.length === 0 && (
                <div className="bg-slate-50 rounded-lg p-6 text-center">
                  <Swords className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-400">{translate('noParticipantsInvite')}</p>
                </div>
              )}
              {hasBracket && (
                bracketDragEnabled ? (
                  <DndContext sensors={sensors} onDragStart={handleBracketDragStart} onDragEnd={handleBracketDragEnd}>
                    <PublicBracketTab
                      tournament={tournament}
                      tournamentId={id}
                      divisionId={liteDivisionId}
                      dragHandlers={bracketDragHandlers}
                      refreshKey={bracketRefreshKey}
                    />
                    <DragOverlay>
                      {activeDragSource ? (
                        <div className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-lg">
                          {activeDragSource.participant.teamName}
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                ) : (
                  <PublicBracketTab
                    tournament={tournament}
                    tournamentId={id}
                    divisionId={liteDivisionId}
                    refreshKey={bracketRefreshKey}
                  />
                )
              )}
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">{translate('matchesTitle')}</h3>
              <p className="text-sm text-slate-500">
                {translate('matchesAfterBracket')}
              </p>
              <div className="bg-slate-50 rounded-lg p-6 text-center text-sm text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>{translate('featureInDevelopment')}</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-3 space-y-0.5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
