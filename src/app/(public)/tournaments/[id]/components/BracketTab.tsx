'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Tournament, BracketStage, BracketMatch } from '@/features/tournaments/api';
import { tournamentsApi } from '@/features/tournaments/api';
import { getSportRuleKind } from '@/features/tournaments/sport-rules/normalize';
import { Archive, LayoutGrid, Maximize2, Trophy, Loader2, Zap, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import type {
  BracketDragHandlers,
  OnScheduleMatch,
  OnSelectBracketMatch,
  BracketTabProps,
  BracketDragSource,
  BracketParticipant,
} from './bracket';
import { UPPER_SET, LOWER_SET } from './bracket';
import { SingleElimView, DoubleElimView, RoundRobinView } from './bracket';
import { PagedSingleElimView, PagedDoubleElimView, PagedRoundRobinView } from './bracket';
import { socketClient } from '@/lib/socket';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface Props extends BracketTabProps {
  tournament: Tournament;
  tiebreakerMode?: 'split' | 'playoff';
  knockoutOnly?: boolean;
}

type TranslationFn = (key: string, values?: Record<string, string | number>) => string;

function isKnockoutStage(stage: BracketStage): boolean {
  return stage.type === 'SINGLE_ELIMINATION' || stage.type === 'DOUBLE_ELIMINATION';
}

function slotOverrideKey(matchId: string, slot: 'participant1' | 'participant2'): string {
  return `${matchId}:${slot}`;
}

type GroupRankSlot = {
  participant1Placeholder?: string;
  participant2Placeholder?: string;
};

function buildGroupRankPlaceholders(
  stage: BracketStage | undefined,
  groupNames: string[],
): Map<string, GroupRankSlot> {
  const result = new Map<string, GroupRankSlot>();
  if (stage?.type !== 'SINGLE_ELIMINATION') return result;

  const mapping = stage.roundConfig?.advanceMapping;
  const numGroups = Number(mapping?.numGroups);
  const teamsAdvancing = Number(mapping?.teamsAdvancing);
  if (!Number.isInteger(numGroups) || numGroups < 2 || !Number.isInteger(teamsAdvancing) || teamsAdvancing < 1) {
    return result;
  }

  const matches = stage.groups.flatMap((group) => group.matches ?? []);
  const firstRound = Math.min(...matches.map((match) => match.roundNumber));
  const firstRoundMatches = matches
    .filter((match) => match.roundNumber === firstRound)
    .sort((a, b) => a.matchOrder - b.matchOrder);
  if (!firstRoundMatches.length) return result;

  const labelFor = (groupIndex: number, rank: number) => {
    const name = groupNames[groupIndex] || `Bảng ${String.fromCharCode(65 + groupIndex)}`;
    return `${rank === 1 ? 'Nhất' : rank === 2 ? 'Nhì' : `Hạng ${rank}`} ${name}`;
  };

  const slots: string[] = [];
  if (teamsAdvancing === 1 || teamsAdvancing === 2) {
    for (let groupIndex = 0; groupIndex < numGroups; groupIndex += 2) {
      const nextGroupIndex = groupIndex + 1;
      if (nextGroupIndex >= numGroups) {
        slots.push(...Array.from({ length: teamsAdvancing }, (_, rank) => labelFor(groupIndex, rank + 1)));
        continue;
      }
      if (teamsAdvancing === 1) {
        slots.push(labelFor(groupIndex, 1), labelFor(nextGroupIndex, 1));
      } else {
        slots.push(
          labelFor(groupIndex, 1),
          labelFor(nextGroupIndex, 2),
          labelFor(nextGroupIndex, 1),
          labelFor(groupIndex, 2),
        );
      }
    }
  } else {
    for (let groupIndex = 0; groupIndex < numGroups; groupIndex += 1) {
      for (let rank = 1; rank <= teamsAdvancing; rank += 1) {
        slots.push(labelFor(groupIndex, rank));
      }
    }
  }

  const wildcardCount = mapping?.allowWildcard ? Number(mapping.wildcardTeams ?? 0) : 0;
  if (Number.isInteger(wildcardCount) && wildcardCount > 0) {
    slots.push(...Array.from({ length: wildcardCount }, () => 'Đội wildcard'));
  }

  firstRoundMatches.forEach((match, index) => {
    const p1 = slots[index * 2];
    const p2 = slots[index * 2 + 1];
    if (!p1 && !p2) return;
    result.set(match.id, {
      ...(match.participant1 ? {} : p1 ? { participant1Placeholder: p1 } : {}),
      ...(match.participant2 ? {} : p2 ? { participant2Placeholder: p2 } : {}),
    });
  });

  return result;
}

function TrayParticipant({
  participant,
  translate,
  enabled,
}: {
  participant: BracketParticipant;
  translate: TranslationFn;
  enabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `bracket-tray:${participant.id}`,
    disabled: !enabled,
    data: {
      source: {
        type: 'tray',
        participant,
      } satisfies BracketDragSource,
    },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      disabled={!enabled}
      className={`touch-none rounded-lg border bg-white px-3 py-2 text-left shadow-sm transition ${
        isDragging ? 'opacity-40 ring-2 ring-blue-400' : 'hover:border-blue-300 hover:shadow'
      }`}
      aria-label={translate('bracketDragParticipant')}
    >
      <span className="block truncate text-xs font-bold text-slate-800">{participant.teamName}</span>
    </button>
  );
}

function OrganizerBracketTray({
  dragHandlers,
  translate,
}: {
  dragHandlers: NonNullable<BracketTabProps['dragHandlers']>;
  translate: TranslationFn;
}) {
  const participants = dragHandlers.trayParticipants ?? [];
  const { isOver, setNodeRef } = useDroppable({
    id: 'bracket-tray',
    disabled: !dragHandlers.enabled,
    data: { target: { type: 'tray' } },
  });

  return (
    <section
      ref={setNodeRef}
      data-bracket-tray={participants.length ? 'filled' : 'empty'}
      aria-label={translate('bracketTrayTitle')}
      className={`rounded-xl border border-dashed px-4 py-3 transition ${
        isOver ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-300 bg-slate-50/70'
      }`}
    >
      <div className="flex items-center gap-2 text-slate-600">
        <Archive className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <span className="text-xs font-bold">{translate('bracketTrayTitle')}</span>
      </div>
      {participants.length === 0 ? (
        <p className="mt-1 pl-6 text-[11px] font-medium text-slate-400">
          {translate('bracketTrayEmpty')}
        </p>
      ) : (
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {participants.map((participant) => (
            <TrayParticipant
              key={participant.id}
              participant={participant}
              translate={translate}
              enabled={Boolean(dragHandlers.enabled)}
            />
          ))}
        </div>
      )}
    </section>
  );
}


/**
 * Determine the type‑specific label for a stage.
 */
function stageTypeLabel(type: string, translate: TranslationFn): string {
  switch (type) {
    case 'SINGLE_ELIMINATION':
      return translate('stageSingleElimination');
    case 'DOUBLE_ELIMINATION':
      return translate('stageDoubleElimination');
    case 'ROUND_ROBIN':
    case 'GROUP':
      return translate('stageRoundRobin');
    case 'GROUP_STAGE':
      return translate('stageGroupStage');
    default:
      return type;
  }
}

function stageNameLabel(name: string, translate: TranslationFn): string {
  const normalizedName = (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const upperName = normalizedName;
  if (upperName.includes('DOUBLE ELIMINATION STAGE') || upperName.includes('DOUBLE ELIMINATION')) {
    return translate('stageDoubleEliminationLong');
  }
  if (upperName.includes('ELIMINATION STAGE') || upperName.includes('VONG LOAI TRUC TIEP')) {
    return translate('stageSingleEliminationLong');
  }
  if (
    upperName.includes('ROUND ROBIN STAGE') ||
    upperName.includes('ROUND ROBIN') ||
    upperName.includes('VONG TRON TINH DIEM')
  ) {
    return translate('stageRoundRobin');
  }
  if (upperName.includes('VONG BANG') || upperName.includes('GROUP STAGE')) {
    return translate('stageGroup');
  }
  if (upperName.includes('VONG PLAYOFFS') || upperName.includes('PLAYOFFS') || upperName.includes('PLAYOFF')) {
    return translate('stagePlayoffs');
  }
  if (upperName === 'WINNERS BRACKET' || upperName === 'NHANH THANG') return translate('winnersBracket');
  if (upperName === 'LOSERS BRACKET' || upperName === 'NHANH THUA') return translate('losersBracket');
  return name;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GROUP VIEW — dispatches to the correct bracket renderer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function GroupView({
  group,
  stageType,
  onScheduleMatch,
  onSelectMatch,
  onDoubleClickMatch,
  tiebreakerMode,
  tournamentId,
  stageId,
  selectedMatchId,
  fallbackSportRuleKind,
  roundConfig,
  viewMode = 'paged',
  showZoomControls = true,
  translate,
  dragHandlers,
  compact = false,
}: {
  group: { id: string; name: string; matches: BracketMatch[] };
  stageType: string;
  onScheduleMatch?: OnScheduleMatch;
  onSelectMatch?: OnSelectBracketMatch;
  onDoubleClickMatch?: OnSelectBracketMatch;
  tiebreakerMode?: 'split' | 'playoff';
  tournamentId?: string;
  stageId?: string;
  selectedMatchId?: string | null;
  fallbackSportRuleKind?: BracketTabProps['fallbackSportRuleKind'];
  roundConfig?: BracketStage['roundConfig'];
  viewMode?: 'paged' | 'full';
  showZoomControls?: boolean;
  translate: TranslationFn;
  dragHandlers?: BracketDragHandlers;
  compact?: boolean;
}) {
  const { matches: groupMatches } = group;
  const overrides = dragHandlers?.participantOverrides;
  const matches = groupMatches.map((match) => {
    if (!overrides) return match;
    const p1Key = slotOverrideKey(match.id, 'participant1');
    const p2Key = slotOverrideKey(match.id, 'participant2');
    const hasP1 = Object.prototype.hasOwnProperty.call(overrides, p1Key);
    const hasP2 = Object.prototype.hasOwnProperty.call(overrides, p2Key);
    if (!hasP1 && !hasP2) return match;
    return {
      ...match,
      ...(hasP1 ? { participant1: overrides[p1Key], participant1Id: overrides[p1Key]?.id ?? null } : {}),
      ...(hasP2 ? { participant2: overrides[p2Key], participant2Id: overrides[p2Key]?.id ?? null } : {}),
    };
  });

  if (!matches.length) {
    return (
      <div className="text-center py-10 text-slate-400 italic text-sm border border-dashed border-slate-200 rounded-lg">
        {translate('noMatchesInGroup', { group: group.name })}
      </div>
    );
  }

  if (stageType === 'ROUND_ROBIN' || stageType === 'GROUP_STAGE' || stageType === 'GROUP') {
    const formattedGroupName = group.name || translate('groupName', { letter: 'A' });
    return viewMode === 'paged' ? (
      <PagedRoundRobinView
        groupName={formattedGroupName}
        matches={matches}
        tiebreakerMode={tiebreakerMode}
        onScheduleMatch={onScheduleMatch}
        selectedMatchId={selectedMatchId}
        onSelectMatch={onSelectMatch}
        onDoubleClickMatch={onDoubleClickMatch}
        tournamentId={tournamentId}
        stageId={stageId}
        fallbackSportRuleKind={fallbackSportRuleKind}
        roundConfig={roundConfig}
      />
    ) : (
      <RoundRobinView
        groupName={formattedGroupName}
        matches={matches}
        tiebreakerMode={tiebreakerMode}
        onScheduleMatch={onScheduleMatch}
        selectedMatchId={selectedMatchId}
        onSelectMatch={onSelectMatch}
        onDoubleClickMatch={onDoubleClickMatch}
        tournamentId={tournamentId}
        stageId={stageId}
        fallbackSportRuleKind={fallbackSportRuleKind}
        roundConfig={roundConfig}
      />
    );
  }

  if (stageType === 'DOUBLE_ELIMINATION') {
    const upper = matches.filter((m) =>
      UPPER_SET.has((m.bracketBranch ?? '').toUpperCase()),
    );
    const lower = matches.filter((m) =>
      LOWER_SET.has((m.bracketBranch ?? '').toUpperCase()),
    );
    const gf = matches.filter(
      (m) => m.bracketBranch === 'GRAND_FINALS',
    );

    if (upper.length > 0 || lower.length > 0) {
      return viewMode === 'paged' ? (
        <PagedDoubleElimView
          upperMatches={upper}
          lowerMatches={lower}
          gfMatches={gf}
          onScheduleMatch={onScheduleMatch}
          selectedMatchId={selectedMatchId}
          onSelectMatch={onSelectMatch}
          onDoubleClickMatch={onDoubleClickMatch}
          fallbackSportRuleKind={fallbackSportRuleKind}
          dragHandlers={dragHandlers}
          compact={compact}
        />
      ) : (
        <DoubleElimView
          upperMatches={upper}
          lowerMatches={lower}
          gfMatches={gf}
          onScheduleMatch={onScheduleMatch}
          selectedMatchId={selectedMatchId}
          onSelectMatch={onSelectMatch}
          onDoubleClickMatch={onDoubleClickMatch}
          fallbackSportRuleKind={fallbackSportRuleKind}
          panEnabled={viewMode === 'full'}
          showZoomControls={showZoomControls}
          dragHandlers={dragHandlers}
          compact={compact}
        />
      );
    }
  }

  return viewMode === 'paged' ? (
      <PagedSingleElimView
        matches={matches}
        onScheduleMatch={onScheduleMatch}
        selectedMatchId={selectedMatchId}
        onSelectMatch={onSelectMatch}
        onDoubleClickMatch={onDoubleClickMatch}
        fallbackSportRuleKind={fallbackSportRuleKind}
        dragHandlers={dragHandlers}
        compact={compact}
      />
  ) : (
    <SingleElimView
      matches={matches}
      onScheduleMatch={onScheduleMatch}
      selectedMatchId={selectedMatchId}
      onSelectMatch={onSelectMatch}
      onDoubleClickMatch={onDoubleClickMatch}
      fallbackSportRuleKind={fallbackSportRuleKind}
      panEnabled={viewMode === 'full'}
      showZoomControls={showZoomControls}
      dragHandlers={dragHandlers}
      compact={compact}
    />
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN BRACKET TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function BracketTab({
  tournament,
  tournamentId,
  divisionId,
  onScheduleMatch,
  tiebreakerMode,
  selectedMatchId,
  onSelectMatch,
  onDoubleClickMatch,
  fallbackSportRuleKind,
  knockoutOnly = false,
  dragHandlers,
  bracketSnapshot,
  refreshKey,
  compact = false,
  viewModeOverride,
  hideViewModeToggle = false,
  hideZoomControls = false,
  showGroupRankPlaceholders = false,
  isOwner = false,
}: Props) {
  const translate = useTranslations('TournamentDetail');
  const effectiveTournamentId = tournamentId ?? tournament.id;
  const effectiveSportRuleKind =
    fallbackSportRuleKind ?? getSportRuleKind(tournament.sportRules);
  const hasOwnerSnapshot = bracketSnapshot !== undefined;
  const [stages, setStages] = useState<BracketStage[]>(() => {
    const rawStages = bracketSnapshot?.stages ?? [];
    return knockoutOnly ? rawStages.filter(isKnockoutStage) : rawStages;
  });
  const [activeStageId, setActiveStageId] = useState<string | null>(() => {
    const rawStages = bracketSnapshot?.stages ?? [];
    const filtered = knockoutOnly ? rawStages.filter(isKnockoutStage) : rawStages;
    return filtered[0]?.id ?? null;
  });
  const [isLoading, setIsLoading] = useState(!hasOwnerSnapshot);
  const [isGeneratingBracket, setIsGeneratingBracket] = useState(false);

  const [viewMode, setViewMode] = useState<'paged' | 'full'>('paged');
  const [matchUpdateVersion, setMatchUpdateVersion] = useState(0);
  const [appliedOwnerSnapshot, setAppliedOwnerSnapshot] = useState<typeof bracketSnapshot>(bracketSnapshot);
  const bracketLoadedRef = useRef(hasOwnerSnapshot);
  const lastRefreshKeyRef = useRef(refreshKey);
  const lastMatchUpdateVersionRef = useRef(0);

  useEffect(() => {
    const socket = socketClient.getMatchSocket();
    const joinTournament = () => socket.emit('joinTournament', effectiveTournamentId);
    const handleMatchUpdate = (rawMatch: unknown) => {
      let payload: { tournamentId?: string; divisionId?: string } | null = null;
      try {
        payload = typeof rawMatch === 'string'
          ? JSON.parse(rawMatch) as { tournamentId?: string; divisionId?: string }
          : rawMatch as { tournamentId?: string; divisionId?: string };
      } catch {
        return;
      }
      if (!payload || payload.tournamentId !== effectiveTournamentId) return;
      if (payload.divisionId && divisionId && payload.divisionId !== divisionId) return;
      setMatchUpdateVersion((version) => version + 1);
    };

    socket.on('connect', joinTournament);
    socket.on('match:update', handleMatchUpdate);
    if (socket.connected) joinTournament();

    return () => {
      socket.off('connect', joinTournament);
      socket.off('match:update', handleMatchUpdate);
    };
  }, [divisionId, effectiveTournamentId]);

  const applyStages = useCallback((fetchedStages: BracketStage[]) => {
    const nextStages = knockoutOnly
      ? fetchedStages.filter(isKnockoutStage)
      : fetchedStages;
    setStages(nextStages);
    setActiveStageId((currentStageId) =>
      nextStages.some((stage) => stage.id === currentStageId)
        ? currentStageId
        : nextStages[0]?.id ?? null,
    );
    bracketLoadedRef.current = true;
    setIsLoading(false);
  }, [knockoutOnly]);

  const fetchBracket = useCallback(async () => {
    if (!bracketLoadedRef.current) setIsLoading(true);
    try {
      const res = await tournamentsApi.getTournamentBracket(
        effectiveTournamentId,
        divisionId,
      );
      applyStages(res.data?.stages ?? []);
    } catch (err) {
      console.error(
        'Failed to fetch bracket:',
        { tournamentId: effectiveTournamentId, divisionId },
        err,
      );
    } finally {
      setIsLoading(false);
    }
  }, [applyStages, divisionId, effectiveTournamentId]);

  useEffect(() => {
    if (hasOwnerSnapshot && appliedOwnerSnapshot !== bracketSnapshot) {
      const snapshot = bracketSnapshot;
      let cancelled = false;
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setAppliedOwnerSnapshot(snapshot);
          applyStages(snapshot?.stages ?? []);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    if (!hasOwnerSnapshot) {
      void Promise.resolve().then(() => fetchBracket());
    }
  }, [appliedOwnerSnapshot, applyStages, bracketSnapshot, fetchBracket, hasOwnerSnapshot]);

  useEffect(() => {
    const refreshRequested = lastRefreshKeyRef.current !== refreshKey;
    const matchUpdateRequested = lastMatchUpdateVersionRef.current !== matchUpdateVersion;
    lastRefreshKeyRef.current = refreshKey;
    lastMatchUpdateVersionRef.current = matchUpdateVersion;

    if (!refreshRequested && !matchUpdateRequested) return;
    void Promise.resolve().then(() => fetchBracket());
  }, [fetchBracket, matchUpdateVersion, refreshKey]);

  const renderedStages = useMemo(
    () => hasOwnerSnapshot && appliedOwnerSnapshot !== bracketSnapshot
      ? (knockoutOnly ? (bracketSnapshot?.stages ?? []).filter(isKnockoutStage) : bracketSnapshot?.stages ?? [])
      : stages,
    [appliedOwnerSnapshot, bracketSnapshot, hasOwnerSnapshot, knockoutOnly, stages],
  );

  useEffect(() => {
    if (!selectedMatchId || !renderedStages.length) return;
    const stageWithMatch = renderedStages.find((stage) =>
      stage.groups?.some((group) => group.matches?.some((m) => m.id === selectedMatchId)),
    );
    if (stageWithMatch && stageWithMatch.id !== activeStageId) {
      const nextStageId = stageWithMatch.id;
      void Promise.resolve().then(() => setActiveStageId(nextStageId));
    }
  }, [activeStageId, renderedStages, selectedMatchId]);

  const activeStage = renderedStages.find((s) => s.id === activeStageId);
  const activeStageSupportsFullView = Boolean(activeStage && isKnockoutStage(activeStage) && !compact);
  const effectiveViewMode = compact
    ? 'paged'
    : (viewModeOverride ?? (activeStageSupportsFullView ? viewMode : 'paged'));
  const groupStageNames = useMemo(() => {
    const sourceStages = bracketSnapshot?.stages ?? renderedStages;
    const sourceGroupStage = sourceStages.find((stage) =>
      stage.type === 'ROUND_ROBIN' || stage.type === 'GROUP_STAGE' || stage.type === 'GROUP',
    );
    return sourceGroupStage?.groups.map((group, index) =>
      group.name || `Bảng ${String.fromCharCode(65 + index)}`,
    ) ?? [];
  }, [bracketSnapshot, renderedStages]);
  const groupRankPlaceholders = useMemo(
    () => showGroupRankPlaceholders
      ? buildGroupRankPlaceholders(activeStage, groupStageNames)
      : new Map<string, GroupRankSlot>(),
    [activeStage, groupStageNames, showGroupRankPlaceholders],
  );
  const shouldShowStageTabs =
    !knockoutOnly &&
    renderedStages.length > 1 &&
    renderedStages.some((s, _, arr) =>
      arr.some(
        (other) =>
          other.id !== s.id &&
          (other.type !== s.type ||
            stageNameLabel(other.name, translate) !== stageNameLabel(s.name, translate)),
      ),
    );

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300 mb-3" />
        <p className="text-sm text-slate-400 font-medium">
          {translate("bracketLoading")}
        </p>
      </div>
    );
  }

  // ── Empty ──
  if (!renderedStages.length) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-slate-200 rounded-2xl bg-white text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
            <Trophy className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-slate-800 mb-1">{translate("bracketEmptyTitle")}</h4>
          <p className="text-slate-400 text-xs sm:text-sm text-center max-w-sm mb-4">
            {translate("bracketEmptyDescription")}
          </p>

          {isOwner && (
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <Button
                type="button"
                disabled={isGeneratingBracket}
                onClick={async () => {
                  setIsGeneratingBracket(true);
                  try {
                    toast.loading('Đang khởi tạo sơ đồ thi đấu...', { id: 'inline-bracket-gen' });
                    await tournamentsApi.generateBracket(effectiveTournamentId, divisionId, 'SEEDED');
                    toast.success('Khởi tạo sơ đồ thành công!', { id: 'inline-bracket-gen' });
                    await fetchBracket();
                  } catch (err: unknown) {
                    const errorMsg =
                      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                      'Không thể khởi tạo sơ đồ. Vui lòng kiểm tra số lượng đội đăng ký.';
                    toast.error(errorMsg, { id: 'inline-bracket-gen' });
                  } finally {
                    setIsGeneratingBracket(false);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs flex items-center gap-1.5"
              >
                {isGeneratingBracket ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang khởi tạo...
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-blue-200" />
                    Khởi tạo sơ đồ
                  </>
                )}
              </Button>
              <a
                href={`/organizer/tournaments/${effectiveTournamentId}/manage#manage-bracket-workspace`}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-3.5 h-9 rounded-xl transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                Cài đặt nâng cao
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main ──
  return (
    <div className="flex flex-col gap-5">
      {(onScheduleMatch || dragHandlers?.enabled) && (dragHandlers?.enabled ? (
        <OrganizerBracketTray dragHandlers={dragHandlers} translate={translate} />
      ) : (
        <section
          data-bracket-tray="empty"
          aria-label={translate('bracketTrayTitle')}
          className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-3"
        >
          <div className="flex items-center gap-2 text-slate-600">
            <Archive className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <span className="text-xs font-bold">{translate('bracketTrayTitle')}</span>
          </div>
          <p className="mt-1 pl-6 text-[11px] font-medium text-slate-400">
            {translate('bracketTrayEmpty')}
          </p>
        </section>
      ))}

      {/* Stage tabs (only shown when there are genuinely distinct stages, e.g., Group Stage vs Knockout, or differently named brackets) */}
      {shouldShowStageTabs && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-200">
          {renderedStages.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveStageId(s.id)}
              className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-[2px] whitespace-nowrap cursor-pointer ${
                activeStageId === s.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {stageNameLabel(s.name, translate)}
            </button>
          ))}
        </div>
      )}

      {/* Active stage content */}
      {activeStage && (
        <div className="flex flex-col gap-6">
          {/* Stage header with inline View Mode Switcher */}
          {!compact && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {stageNameLabel(activeStage.name, translate)}
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  {translate("formatLabel")}: {stageTypeLabel(activeStage.type, translate)}
                </p>
              </div>

              {activeStageSupportsFullView && !hideViewModeToggle && !viewModeOverride && (
                <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100/90 p-1 self-start sm:self-auto">
                  <button
                    onClick={() => setViewMode('paged')}
                    className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer sm:text-xs ${
                      viewMode === 'paged'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{translate('pagedView')}</span>
                  </button>
                  <button
                    onClick={() => setViewMode('full')}
                    className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer sm:text-xs ${
                      viewMode === 'full'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <Maximize2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{translate('fullView')}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeStage.type === 'DOUBLE_ELIMINATION' ? (
            <div className="min-w-0 max-w-full overflow-hidden">
              {(() => {
                const overrides = dragHandlers?.participantOverrides;
                const rawMatches = activeStage.groups.flatMap((g) => g.matches);
                const allMatches = rawMatches.map((match) => {
                  if (!overrides) return match;
                  const p1Key = slotOverrideKey(match.id, 'participant1');
                  const p2Key = slotOverrideKey(match.id, 'participant2');
                  const hasP1 = Object.prototype.hasOwnProperty.call(overrides, p1Key);
                  const hasP2 = Object.prototype.hasOwnProperty.call(overrides, p2Key);
                  if (!hasP1 && !hasP2) return match;
                  return {
                    ...match,
                    ...(hasP1 ? { participant1: overrides[p1Key], participant1Id: overrides[p1Key]?.id ?? null } : {}),
                    ...(hasP2 ? { participant2: overrides[p2Key], participant2Id: overrides[p2Key]?.id ?? null } : {}),
                  };
                });
                const upper = allMatches.filter((m) =>
                  UPPER_SET.has((m.bracketBranch ?? '').toUpperCase()),
                );
                const lower = allMatches.filter((m) =>
                  LOWER_SET.has((m.bracketBranch ?? '').toUpperCase()),
                );
                const gf = allMatches.filter(
                  (m) => m.bracketBranch === 'GRAND_FINALS',
                );
                return effectiveViewMode === 'paged' ? (
                  <PagedDoubleElimView
                    upperMatches={upper}
                    lowerMatches={lower}
                    gfMatches={gf}
                    onScheduleMatch={onScheduleMatch}
                    selectedMatchId={selectedMatchId}
                    onSelectMatch={onSelectMatch}
                    onDoubleClickMatch={onDoubleClickMatch}
                    fallbackSportRuleKind={effectiveSportRuleKind}
                    dragHandlers={dragHandlers}
                    compact={compact}
                  />
                ) : (
                  <DoubleElimView
                    upperMatches={upper}
                    lowerMatches={lower}
                    gfMatches={gf}
                    onScheduleMatch={onScheduleMatch}
                    selectedMatchId={selectedMatchId}
                    onSelectMatch={onSelectMatch}
                    onDoubleClickMatch={onDoubleClickMatch}
                    fallbackSportRuleKind={effectiveSportRuleKind}
                    panEnabled={effectiveViewMode === 'full'}
                    showZoomControls={!hideZoomControls}
                    dragHandlers={dragHandlers}
                    compact={compact}
                  />
                );
              })()}
            </div>
          ) : (
            activeStage.groups.map((group, groupIndex) => {
              const displayGroup = {
                ...group,
                matches: group.matches.map((match) => ({
                  ...match,
                  ...(groupRankPlaceholders.get(match.id) ?? {}),
                })),
              };
              return (
              <div key={group.id}>
                {activeStage.groups.length > 1 && !['ROUND_ROBIN', 'GROUP_STAGE', 'GROUP'].includes(activeStage.type) && (
                  <h4 className="font-bold text-slate-700 text-sm border-l-4 border-blue-500 pl-3 mb-4">
                    {group.name || translate('groupName', { letter: String.fromCharCode(65 + groupIndex) })}
                  </h4>
                )}
                <GroupView
                  group={displayGroup}
                  stageType={activeStage.type}
                  onScheduleMatch={onScheduleMatch}
                  tiebreakerMode={tiebreakerMode}
                  tournamentId={effectiveTournamentId}
                  stageId={activeStage?.id}
                  selectedMatchId={selectedMatchId}
                  onSelectMatch={onSelectMatch}
                  onDoubleClickMatch={onDoubleClickMatch}
                  fallbackSportRuleKind={effectiveSportRuleKind}
                  roundConfig={activeStage?.roundConfig}
                  viewMode={effectiveViewMode}
                  showZoomControls={!hideZoomControls}
                  translate={translate}
                  dragHandlers={dragHandlers}
                  compact={compact}
                />
              </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
