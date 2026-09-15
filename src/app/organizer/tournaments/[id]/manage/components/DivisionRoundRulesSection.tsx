'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Settings } from 'lucide-react';

import type { BracketStage, SportRuleKind, StageRoundConfig, StageRoundRuleConfig } from '@/types/tournament';
import { resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { cn } from '@/utils/cn';

type RoundOption = {
  stage: BracketStage;
  roundNumber: number;
  name: string;
  kind: 'GROUP' | 'KNOCKOUT';
  override?: StageRoundRuleConfig | null;
};

type DivisionRoundRulesSectionProps = {
  bracketType: string;
  roundStages: BracketStage[];
  divisionRoundConfig: StageRoundConfig | null;
  maxParticipants: number;
  groupCount: number;
  groupRoundsToPlay: number;
  teamsAdvancing: number;
  sportRuleKind: SportRuleKind;
  isSaved: boolean;
  isCreating: boolean;
  onOpenRoundModal?: (stage: BracketStage, roundNumber: number) => void;
};

const getBracketSize = (teamCount: number) => {
  if (teamCount < 2) return 0;
  return Math.min(64, 2 ** Math.ceil(Math.log2(teamCount)));
};

export function DivisionRoundRulesSection({
  bracketType,
  roundStages,
  divisionRoundConfig,
  maxParticipants,
  groupCount,
  groupRoundsToPlay,
  teamsAdvancing,
  sportRuleKind,
  isSaved,
  isCreating,
  onOpenRoundModal,
}: DivisionRoundRulesSectionProps) {
  const translate = useTranslations('TournamentDetail');
  const groupsConfig = divisionRoundConfig?.groupsConfig;
  const persistedGroupRounds = groupsConfig && typeof groupsConfig === 'object'
    ? (groupsConfig as Record<string, unknown>).roundsToPlay
    : undefined;
  const overrideGroupRounds = Object.keys(divisionRoundConfig?.rounds ?? {}).reduce((max, key) => {
    const match = /^leg_(\d+)$/.exec(key);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 1);
  const configuredGroupRounds = Math.max(
    1,
    groupRoundsToPlay,
    overrideGroupRounds,
    typeof persistedGroupRounds === 'number' ? persistedGroupRounds : 1,
  );

  const getKnockoutRoundLabel = useCallback((index: number, totalRounds: number) => {
    const fromEnd = totalRounds - 1 - index;
    if (fromEnd === 0) return translate('stageFinal');
    if (fromEnd === 1) return translate('stageSemifinal');
    if (fromEnd === 2) return translate('stageQuarterfinal');
    if (fromEnd === 3) return translate('roundOf', { round: 16 });
    if (fromEnd === 4) return translate('roundOf', { round: 32 });
    if (fromEnd === 5) return translate('roundOf', { round: 64 });
    return translate('roundOf', { round: 2 ** fromEnd });
  }, [translate]);

  const rounds = useMemo<RoundOption[]>(() => {
    const groupStage = roundStages.find((stage) => stage.type === 'ROUND_ROBIN');
    const fallbackGroupStage: BracketStage = {
      id: '__draft_gsk_group__',
      name: translate('draftGroupStage'),
      type: 'ROUND_ROBIN',
      order: 1,
      groups: [],
      roundConfig: divisionRoundConfig,
    };
    const effectiveGroupStage = groupStage ?? fallbackGroupStage;
    const groupOptions: RoundOption[] = [
      {
        stage: effectiveGroupStage,
        roundNumber: 0,
        name: translate('sharedGroupStage'),
        kind: 'GROUP',
        override: effectiveGroupStage.roundConfig,
      },
      ...Array.from({ length: configuredGroupRounds }, (_, index) => {
        const legNumber = index + 1;
        return {
          stage: effectiveGroupStage,
          roundNumber: legNumber,
          name: translate('legLabel', { number: legNumber }),
          kind: 'GROUP' as const,
          override: effectiveGroupStage.roundConfig?.rounds?.[`leg_${legNumber}`],
        };
      }),
    ];

    const getStageRounds = (stage: BracketStage): RoundOption[] => {
      const roundsByNumber = new Map<number, { capacity: number; isGrandFinal: boolean }>();
      for (const group of stage.groups ?? []) {
        for (const roundNumber of new Set(group.matches.map((match) => match.roundNumber))) {
          const matchCount = group.matches.filter((match) => match.roundNumber === roundNumber).length;
          const isGrandFinal = /grand|chung/i.test(group.name);
          const previous = roundsByNumber.get(roundNumber);
          if (!previous || (!isGrandFinal && previous.isGrandFinal)) {
            roundsByNumber.set(roundNumber, {
              capacity: Math.max(2, matchCount * 2),
              isGrandFinal,
            });
          }
        }
      }

      const entries = [...roundsByNumber.entries()]
        .sort(([left], [right]) => left - right)
      return entries.map(([roundNumber, round], index) => {
          const totalRounds = Math.max(1, entries.length);
          return {
            stage,
            roundNumber,
            name: round.isGrandFinal ? translate('stageFinal') : getKnockoutRoundLabel(index, totalRounds),
            kind: 'KNOCKOUT' as const,
            override: stage.roundConfig?.rounds?.[roundNumber.toString()],
          };
        });
    };

    const knockoutStages = roundStages.filter(
      (stage) => stage.type === 'SINGLE_ELIMINATION' || stage.type === 'DOUBLE_ELIMINATION',
    );
    const actualKnockoutRounds = knockoutStages.flatMap(getStageRounds);
    if (actualKnockoutRounds.length > 0) {
      return bracketType === 'GROUP_STAGE_KNOCKOUT' ? [...groupOptions, ...actualKnockoutRounds] : actualKnockoutRounds;
    }

    if (bracketType === 'ROUND_ROBIN') return groupOptions;

    const teamCount = bracketType === 'GROUP_STAGE_KNOCKOUT'
      ? Math.max(0, groupCount) * Math.max(0, teamsAdvancing)
      : Math.max(0, maxParticipants);
    const bracketSize = getBracketSize(teamCount);
    const totalRounds = bracketSize > 0 ? Math.log2(bracketSize) : 0;
    const fallbackStage: BracketStage = {
      id: '__draft_gsk_knockout__',
      name: translate('draftKnockout'),
      type: 'SINGLE_ELIMINATION',
      order: 2,
      groups: [],
      roundConfig: divisionRoundConfig,
    };
    const plannedKnockoutRounds = Array.from({ length: totalRounds }, (_, index) => ({
      stage: fallbackStage,
      roundNumber: index + 1,
      name: getKnockoutRoundLabel(index, totalRounds),
      kind: 'KNOCKOUT' as const,
      override: divisionRoundConfig?.rounds?.[(index + 1).toString()],
    }));

    return bracketType === 'GROUP_STAGE_KNOCKOUT'
      ? [...groupOptions, ...plannedKnockoutRounds]
      : plannedKnockoutRounds;
  }, [
    bracketType,
    configuredGroupRounds,
    divisionRoundConfig,
    getKnockoutRoundLabel,
    groupCount,
    maxParticipants,
    roundStages,
    teamsAdvancing,
    translate,
  ]);

  if (rounds.length === 0) return null;

  const renderRound = (round: RoundOption) => {
    const resolved = round.override ? resolveSportRuleView(round.override, sportRuleKind) : null;
    const summary = resolved
      ? `${translate('firstToSets', { sets: resolved.setsToWin })}, ${resolved.pointsPerSet}p`
      : translate('inheritsDefaultRules');

    return (
      <div key={`${round.stage.id}-${round.roundNumber}`} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-b-0">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-800">{round.name}</p>
          <p className="truncate text-[10px] font-medium text-slate-500">{summary}</p>
        </div>
        <button
          type="button"
          disabled={!isSaved || isCreating || !onOpenRoundModal}
          onClick={() => onOpenRoundModal?.(round.stage, round.roundNumber)}
          className={cn(
            'shrink-0 rounded-lg border px-2.5 py-1 text-xs font-bold shadow-2xs transition-colors',
            isSaved && onOpenRoundModal
              ? 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
              : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400',
          )}
        >
          {translate('configureRound')}
        </button>
      </div>
    );
  };

  const groupRounds = rounds.filter((round) => round.kind === 'GROUP');
  const knockoutRounds = rounds.filter((round) => round.kind === 'KNOCKOUT');

  return (
    <section className="mt-3 rounded-xl border border-slate-200 bg-white p-3" aria-labelledby="division-round-rules-title">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-blue-600" aria-hidden="true" />
        <h4 id="division-round-rules-title" className="text-xs font-bold text-slate-800">
          {translate('detailedRoundRulesTitle')}
        </h4>
      </div>
      <p className="mt-1 text-[11px] font-medium text-slate-500">{translate('detailedRoundRulesDescription')}</p>

      {!isSaved && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-semibold text-amber-800">
          {translate('bracketNotInitialized')}. {translate('initializeBracketForRounds')}.
        </p>
      )}

      <div className="mt-2 grid gap-3 lg:grid-cols-2">
        {groupRounds.length > 0 && (
          <div className="rounded-lg border border-blue-100 bg-slate-50/70 px-3">
            <p className="border-b border-slate-100 py-2 text-[10px] font-bold uppercase tracking-wide text-blue-700">
              {translate('sharedGroupStage')}
            </p>
            {groupRounds.map(renderRound)}
          </div>
        )}
        {knockoutRounds.length > 0 && (
          <div className="rounded-lg border border-amber-100 bg-slate-50/70 px-3">
            <p className="border-b border-slate-100 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              {translate('eachKnockoutRound')}
            </p>
            {knockoutRounds.map(renderRound)}
          </div>
        )}
      </div>
    </section>
  );
}
