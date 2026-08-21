'use client';

import { useEffect, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Tournament, Division, BracketStage, BracketMatch, TournamentResult } from '@/features/tournaments/api';
import { divisionsApi, tournamentsApi } from '@/features/tournaments/api';
import { getSportRuleKind } from '@/features/tournaments/sport-rules/normalize';
import { Archive, LayoutGrid, Maximize2, Trophy, Info, Loader2 } from 'lucide-react';
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
import { getDivisionMatchLabel } from '@/utils/tournament-display';

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
  const upperName = (name ?? '').toUpperCase();
  if (upperName.includes('DOUBLE ELIMINATION STAGE') || upperName.includes('DOUBLE_ELIMINATION')) {
    return translate('stageDoubleEliminationLong');
  }
  if (upperName.includes('ELIMINATION STAGE') || upperName.includes('VONG LOAI TRUC TIEP')) {
    return translate('stageSingleEliminationLong');
  }
  if (
    upperName.includes('ROUND ROBIN STAGE') ||
    upperName.includes('ROUND_ROBIN') ||
    upperName.includes('VONG TRON TINH DIEM')
  ) {
    return translate('stageRoundRobin');
  }
  if (upperName.includes('VONG BANG') || upperName.includes('GROUP_STAGE') || upperName.includes('GROUP STAGE')) {
    return translate('stageGroup');
  }
  if (upperName.includes('VONG PLAYOFFS') || upperName.includes('PLAYOFFS') || upperName.includes('PLAYOFF')) {
    return translate('stagePlayoffs');
  }
  if (name === 'Winners Bracket' || upperName === 'NHANH THANG') return translate('winnersBracket');
  if (name === 'Losers Bracket' || upperName === 'NHANH THUA') return translate('losersBracket');
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
  tiebreakerMode,
  tournamentId,
  stageId,
  selectedMatchId,
  fallbackSportRuleKind,
  roundConfig,
  viewMode = 'paged',
  translate,
  dragHandlers,
}: {

  group: { id: string; name: string; matches: BracketMatch[] };
  stageType: string;
  onScheduleMatch?: OnScheduleMatch;
  onSelectMatch?: OnSelectBracketMatch;
  tiebreakerMode?: 'split' | 'playoff';
  tournamentId?: string;
  stageId?: string;
  selectedMatchId?: string | null;
  fallbackSportRuleKind?: BracketTabProps['fallbackSportRuleKind'];
  roundConfig?: BracketStage['roundConfig'];
  viewMode?: 'paged' | 'full';
  translate: TranslationFn;
  dragHandlers?: BracketDragHandlers;
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
    return viewMode === 'paged' ? (
      <PagedRoundRobinView
        matches={matches}
        tiebreakerMode={tiebreakerMode}
        onScheduleMatch={onScheduleMatch}
        selectedMatchId={selectedMatchId}
        onSelectMatch={onSelectMatch}
        tournamentId={tournamentId}
        stageId={stageId}
        fallbackSportRuleKind={fallbackSportRuleKind}
        roundConfig={roundConfig}
      />
    ) : (
      <RoundRobinView
        matches={matches}
        tiebreakerMode={tiebreakerMode}
        onScheduleMatch={onScheduleMatch}
        selectedMatchId={selectedMatchId}
        onSelectMatch={onSelectMatch}
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
          fallbackSportRuleKind={fallbackSportRuleKind}
          dragHandlers={dragHandlers}
        />
      ) : (
        <DoubleElimView
          upperMatches={upper}
          lowerMatches={lower}
          gfMatches={gf}
          onScheduleMatch={onScheduleMatch}
          selectedMatchId={selectedMatchId}
          onSelectMatch={onSelectMatch}
          fallbackSportRuleKind={fallbackSportRuleKind}
          panEnabled={viewMode === 'full'}
          dragHandlers={dragHandlers}
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
        fallbackSportRuleKind={fallbackSportRuleKind}
        dragHandlers={dragHandlers}
      />
  ) : (
    <SingleElimView
      matches={matches}
      onScheduleMatch={onScheduleMatch}
      selectedMatchId={selectedMatchId}
      onSelectMatch={onSelectMatch}
      fallbackSportRuleKind={fallbackSportRuleKind}
      panEnabled={viewMode === 'full'}
      dragHandlers={dragHandlers}
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
  fallbackSportRuleKind,
  knockoutOnly = false,
  dragHandlers,
  refreshKey,
}: Props) {
  const translate = useTranslations('TournamentDetail');
  const displayTranslate = useTranslations('TournamentDisplay');
  const effectiveTournamentId = tournamentId ?? tournament.id;
  const effectiveSportRuleKind =
    fallbackSportRuleKind ?? getSportRuleKind(tournament.sportRules);
  const [stages, setStages] = useState<BracketStage[]>([]);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'paged' | 'full'>('paged');
  const [result, setResult] = useState<TournamentResult | null>(null);
  const [resultError, setResultError] = useState(false);
  const [displayDivision, setDisplayDivision] = useState<Division | null>(null);
  const bracketLoadedRef = useRef(false);

  // Organizer bracket pages pass the parent tournament together with a
  // divisionId. Never render the parent's genderRestriction in that case:
  // another division (for example Đơn nữ) can otherwise leak into Đơn nam.
  useEffect(() => {
    let cancelled = false;
    if (!divisionId) {
      void Promise.resolve().then(() => {
        if (!cancelled) setDisplayDivision(null);
      });
      return () => { cancelled = true; };
    }

    void divisionsApi.getDivisions(effectiveTournamentId)
      .then((response) => {
        if (cancelled) return;
        setDisplayDivision(response.data?.find((division) => division.id === divisionId) ?? null);
      })
      .catch(() => {
        if (!cancelled) setDisplayDivision(null);
      });

    return () => { cancelled = true; };
  }, [divisionId, effectiveTournamentId]);

  const displayMatchLabel = getDivisionMatchLabel(
    divisionId ? displayDivision?.matchType : tournament.matchType,
    divisionId ? displayDivision?.genderRestriction : tournament.genderRestriction,
    {
      maleGender: displayTranslate('maleGender'),
      femaleGender: displayTranslate('femaleGender'),
      mixedGender: displayTranslate('mixedGender'),
      singlesFormat: displayTranslate('singlesFormat'),
      doublesFormat: displayTranslate('doublesFormat'),
      mixedDoublesFormat: displayTranslate('mixedDoublesFormat'),
    },
  );

  useEffect(() => {
    const fetchBracket = async () => {
      if (!bracketLoadedRef.current) setIsLoading(true);
      try {
        const res = await tournamentsApi.getTournamentBracket(
          effectiveTournamentId,
          divisionId,
        );
        const fetchedStages = res.data?.stages ?? [];
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
      } catch (err) {
        console.error(
          'Failed to fetch bracket:',
          { tournamentId: effectiveTournamentId, divisionId },
          err,
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchBracket();
  }, [divisionId, effectiveTournamentId, knockoutOnly, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refreshResult = async () => {
      try {
        const response = await tournamentsApi.getTournamentResults(
          effectiveTournamentId,
          divisionId,
        );
        if (!cancelled && response.data) {
          setResult(response.data);
          setResultError(false);
        }
      } catch {
        // Keep the last valid snapshot visible during transient 429/5xx errors.
        if (!cancelled) setResultError(true);
      } finally {
        if (!cancelled) timer = setTimeout(refreshResult, 15000);
      }
    };

    void refreshResult();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [divisionId, effectiveTournamentId]);

  const activeStage = stages.find((s) => s.id === activeStageId);
  const activeStageSupportsFullView = Boolean(activeStage && isKnockoutStage(activeStage));
  const effectiveViewMode = activeStageSupportsFullView ? viewMode : 'paged';

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
  if (!stages.length) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
          <Info className="w-3.5 h-3.5" />
          <span>
            {translate("rankingLabel")}:{' '}
            <strong className="text-slate-600">{tournament.name}</strong>
          </span>
          {displayMatchLabel !== displayTranslate('unknownFormat') && (
            <span className="text-slate-300">• {displayMatchLabel}</span>
          )}
        </div>
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-200 rounded-lg">
          <Trophy className="w-12 h-12 text-slate-200 mb-3" />
          <h4 className="font-bold text-slate-600 mb-1">{translate("bracketEmptyTitle")}</h4>
          <p className="text-slate-400 text-sm text-center max-w-xs">
            {translate("bracketEmptyDescription")}
          </p>
        </div>
      </div>
    );
  }

  // ── Main ──
  return (
    <div className="flex flex-col gap-5">
      {result?.finalized && result.awards.length > 0 && (
        <section className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600">{translate('honors')}</p>
              <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">{translate('officialResults')}</h3>
            </div>
            {resultError && <span className="text-[11px] font-medium text-slate-400">{translate('syncingAgain')}</span>}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {result.awards.map((award) => (
              <div key={`${award.rank}-${award.participant?.participantId ?? 'pending'}`} className="rounded-xl border border-white bg-white/80 px-3 py-3 shadow-sm">
                <p className="text-xs font-bold text-slate-400">{award.shared ? translate('sharedRank', { rank: award.rank }) : translate('rank', { rank: award.rank })}</p>
                <p className="mt-1 truncate text-sm font-bold text-slate-800">{award.participant?.teamName ?? translate('unknownParticipant')}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      {resultError && !result && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {translate('resultsLoadError')}
        </div>
      )}
      {/* Division info bar & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
          <Info className="w-3.5 h-3.5" />
          <span>
            {translate("rankingLabel")}:{' '}
            <strong className="text-slate-700">{tournament.name}</strong>
          </span>
          {displayMatchLabel !== displayTranslate('unknownFormat') && (
            <span className="text-slate-300">• {displayMatchLabel}</span>
          )}
        </div>

        {/* Full sơ đồ chỉ áp dụng cho vòng loại trực tiếp. */}
        {activeStageSupportsFullView && <div className="grid w-full grid-cols-2 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100 p-1 shadow-inner sm:w-auto">
          <button
            onClick={() => setViewMode('paged')}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold transition-all cursor-pointer sm:px-3 sm:py-1.5 sm:text-xs ${
              viewMode === 'paged'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{translate('pagedView')}</span>
          </button>
          <button
            onClick={() => setViewMode('full')}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold transition-all cursor-pointer sm:px-3 sm:py-1.5 sm:text-xs ${
              viewMode === 'full'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Maximize2 className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{translate('fullView')}</span>
          </button>
        </div>}
      </div>

      {onScheduleMatch && (dragHandlers?.enabled ? (
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

      {/* Stage tabs */}
      {stages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {stages.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveStageId(s.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                activeStageId === s.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {stageNameLabel(s.name, translate)}
            </button>
          ))}
        </div>
      )}

      {/* Active stage content */}
      {activeStage && (
        <div className="flex flex-col gap-8">
          {/* Stage header */}
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {stageNameLabel(activeStage.name, translate)}
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {translate("formatLabel")}: {stageTypeLabel(activeStage.type, translate)}
            </p>
          </div>

          {/* Groups */}
          {activeStage.type === 'DOUBLE_ELIMINATION' ? (
            <div className="min-w-0 max-w-full overflow-hidden">
              {(() => {
                const allMatches = activeStage.groups.flatMap((g) => g.matches);
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
                    fallbackSportRuleKind={effectiveSportRuleKind}
                    dragHandlers={dragHandlers}
                  />
                ) : (
                  <DoubleElimView
                    upperMatches={upper}
                    lowerMatches={lower}
                    gfMatches={gf}
                    onScheduleMatch={onScheduleMatch}
                    selectedMatchId={selectedMatchId}
                    onSelectMatch={onSelectMatch}
                    fallbackSportRuleKind={effectiveSportRuleKind}
                    panEnabled={effectiveViewMode === 'full'}
                    dragHandlers={dragHandlers}
                  />
                );
              })()}
            </div>
          ) : (
            activeStage.groups.map((group, groupIndex) => (
              <div key={group.id}>
                {activeStage.groups.length > 1 && (
                  <h4 className="font-bold text-slate-700 text-sm border-l-4 border-blue-500 pl-3 mb-4">
                    {group.name || translate('groupName', { letter: String.fromCharCode(65 + groupIndex) })}
                  </h4>
                )}
                <GroupView
                  group={group}
                  stageType={activeStage.type}
                  onScheduleMatch={onScheduleMatch}
                  tiebreakerMode={tiebreakerMode}
                  tournamentId={effectiveTournamentId}
                  stageId={activeStage?.id}
                  selectedMatchId={selectedMatchId}
                  onSelectMatch={onSelectMatch}
                  fallbackSportRuleKind={effectiveSportRuleKind}
                  roundConfig={activeStage?.roundConfig}
                  viewMode={effectiveViewMode}
                  translate={translate}
                  dragHandlers={dragHandlers}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
