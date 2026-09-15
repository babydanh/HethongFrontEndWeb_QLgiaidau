'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import { GitBranch, GitFork, GitMerge, Loader2, Plus, RotateCw, Save, Settings, Shuffle, User, Users, Zap, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import type { MatchFormatOption } from '@/features/tournaments/match-format-options';
import type { Division } from '@/features/tournaments/api';
import type { SportRuleKind } from '@/types/tournament';
import { cn } from '@/utils/cn';
import { getBracketQuickSuggestion } from './bracket-setup-view-model';
import { DivisionStrictRulesSection } from './DivisionStrictRulesSection';

type BracketValue = Exclude<Division['bracketType'], null | undefined>;

type BracketOption = {
  value: BracketValue;
  labelKey: 'singleElimination' | 'doubleElimination' | 'roundRobin' | 'groupStageKnockout';
  Icon: LucideIcon;
};

const BRACKET_OPTIONS: BracketOption[] = [
  { value: 'SINGLE_ELIMINATION', labelKey: 'singleElimination', Icon: GitBranch },
  { value: 'ROUND_ROBIN', labelKey: 'roundRobin', Icon: RotateCw },
  { value: 'GROUP_STAGE_KNOCKOUT', labelKey: 'groupStageKnockout', Icon: GitFork },
  { value: 'DOUBLE_ELIMINATION', labelKey: 'doubleElimination', Icon: GitMerge },
];

const getEventIcon = (value: string) => value.includes('SINGLES') ? User : Users;

type Setter<T> = Dispatch<SetStateAction<T>>;

export type CreateDivisionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDivision: Division | null;
  availableMatchFormatOptions: MatchFormatOption[];
  newDivisionMatchType: string;
  setNewDivisionMatchType: Setter<string>;
  newDivisionName: string;
  setNewDivisionName: Setter<string>;
  newDivisionBracketType: string;
  setNewDivisionBracketType: Setter<string>;
  newDivisionEloEnabled: boolean;
  setNewDivisionEloEnabled: Setter<boolean>;
  newDivisionMinElo: number | null;
  setNewDivisionMinElo: Setter<number | null>;
  newDivisionMaxElo: number | null;
  setNewDivisionMaxElo: Setter<number | null>;
  newDivisionMaxParticipants: string;
  setNewDivisionMaxParticipants: Setter<string>;
  newDivisionLimitEnabled: boolean;
  setNewDivisionLimitEnabled: Setter<boolean>;
  newDivisionEntryFeeOverrideEnabled: boolean;
  setNewDivisionEntryFeeOverrideEnabled: Setter<boolean>;
  newDivisionEntryFee: string;
  setNewDivisionEntryFee: Setter<string>;
  newDivisionIsLiteMode: boolean;
  setNewDivisionIsLiteMode: Setter<boolean>;
  newDivisionSportRuleKind: SportRuleKind;
  setNewDivisionSportRuleKind: Setter<SportRuleKind>;
  newDivisionSetsToWin: number;
  setNewDivisionSetsToWin: Setter<number>;
  newDivisionPointsPerSet: number;
  setNewDivisionPointsPerSet: Setter<number>;
  newDivisionWinByTwo: boolean;
  setNewDivisionWinByTwo: Setter<boolean>;
  newDivisionMaxDeucePoints: number;
  setNewDivisionMaxDeucePoints: Setter<number>;
  newDivisionSuperTiebreakEnabled: boolean;
  setNewDivisionSuperTiebreakEnabled: Setter<boolean>;
  newDivisionSuperTiebreakSetIndex: number;
  setNewDivisionSuperTiebreakSetIndex: Setter<number>;
  newDivisionSuperTiebreakPoints: number;
  setNewDivisionSuperTiebreakPoints: Setter<number>;
  newDivisionNumGroups: number;
  setNewDivisionNumGroups: Setter<number>;
  newDivisionTeamsPerGroup: number;
  setNewDivisionTeamsPerGroup: Setter<number>;
  newDivisionTeamsAdvancing: number;
  setNewDivisionTeamsAdvancing: Setter<number>;
  newDivisionPlayoffType: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION';
  setNewDivisionPlayoffType: Setter<'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION'>;
  newDivisionSeedingType: 'SEEDED' | 'RANDOM';
  setNewDivisionSeedingType: Setter<'SEEDED' | 'RANDOM'>;
  participantCount?: number;
  isCreatingDivision: boolean;
  onCancel: () => void;
  onSubmit: () => void;
};

export function CreateDivisionModal({
  open,
  onOpenChange,
  editingDivision,
  availableMatchFormatOptions,
  newDivisionMatchType,
  setNewDivisionMatchType,
  newDivisionName,
  setNewDivisionName,
  newDivisionBracketType,
  setNewDivisionBracketType,
  newDivisionEloEnabled,
  setNewDivisionEloEnabled,
  newDivisionMinElo,
  setNewDivisionMinElo,
  newDivisionMaxElo,
  setNewDivisionMaxElo,
  newDivisionMaxParticipants,
  setNewDivisionMaxParticipants,
  newDivisionLimitEnabled,
  setNewDivisionLimitEnabled,
  newDivisionEntryFeeOverrideEnabled,
  setNewDivisionEntryFeeOverrideEnabled,
  newDivisionEntryFee,
  setNewDivisionEntryFee,
  newDivisionIsLiteMode,
  setNewDivisionIsLiteMode,
  newDivisionSportRuleKind,
  setNewDivisionSportRuleKind,
  newDivisionSetsToWin,
  setNewDivisionSetsToWin,
  newDivisionPointsPerSet,
  setNewDivisionPointsPerSet,
  newDivisionWinByTwo,
  setNewDivisionWinByTwo,
  newDivisionMaxDeucePoints,
  setNewDivisionMaxDeucePoints,
  newDivisionSuperTiebreakEnabled,
  setNewDivisionSuperTiebreakEnabled,
  newDivisionSuperTiebreakSetIndex,
  setNewDivisionSuperTiebreakSetIndex,
  newDivisionSuperTiebreakPoints,
  setNewDivisionSuperTiebreakPoints,
  newDivisionNumGroups,
  setNewDivisionNumGroups,
  newDivisionTeamsPerGroup,
  setNewDivisionTeamsPerGroup,
  newDivisionTeamsAdvancing,
  setNewDivisionTeamsAdvancing,
  newDivisionPlayoffType,
  setNewDivisionPlayoffType,
  newDivisionSeedingType,
  setNewDivisionSeedingType,
  participantCount = 0,
  isCreatingDivision,
  onCancel,
  onSubmit,
}: CreateDivisionModalProps) {
  const translate = useTranslations('OrganizerManage');
  const ruleTranslate = useTranslations('TournamentDetail');
  const isGroupStageKnockout = newDivisionBracketType === 'GROUP_STAGE_KNOCKOUT';
  const quickSuggestion = isGroupStageKnockout
    ? getBracketQuickSuggestion('GROUP_STAGE_KNOCKOUT', participantCount)
    : null;
  const advancingTotal = newDivisionNumGroups * newDivisionTeamsAdvancing;

  const updateNumber = (
    value: string,
    setter: Setter<number>,
    min: number,
    max: number,
  ) => {
    const parsed = Number(value);
    setter(Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min);
  };

  const handleFormatSelect = (value: string) => {
    const option = availableMatchFormatOptions.find((item) => item.value === value);
    setNewDivisionMatchType(value);
    setNewDivisionName(option ? translate(`createDivision.matchFormat.${option.value}`) : '');
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[92vh] max-w-5xl overflow-y-auto rounded-2xl bg-white p-5 sm:p-6">
        <ModalHeader>
          <ModalTitle className="text-lg font-bold">
            {editingDivision ? translate('createDivision.editTitle') : translate('createDivision.addTitle')}
          </ModalTitle>
        </ModalHeader>

        <div className="mt-1 space-y-4">
          <section aria-labelledby="division-type-label">
            <h3 id="division-type-label" className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              {translate('createDivision.typeLabel')}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label={translate('createDivision.typeLabel')}>
              {availableMatchFormatOptions.map((option) => {
                const Icon = getEventIcon(option.value);
                const selected = newDivisionMatchType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    disabled={isCreatingDivision}
                    onClick={() => handleFormatSelect(option.value)}
                    className={cn(
                      'flex min-h-12 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50',
                    )}
                  >
                    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', selected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500')}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="leading-tight">{translate(`createDivision.matchFormat.${option.value}`)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div>
            <label htmlFor="division-custom-name" className="mb-1.5 block text-xs font-bold text-slate-500">
              {translate('createDivision.nameShort')}
            </label>
            <input
              id="division-custom-name"
              value={newDivisionName}
              onChange={(event) => setNewDivisionName(event.target.value)}
              placeholder={translate('createDivision.namePlaceholder')}
              maxLength={255}
              disabled={isCreatingDivision}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <section aria-labelledby="division-bracket-label">
            <h3 id="division-bracket-label" className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              {translate('createDivision.bracketLabel')}
            </h3>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label={translate('createDivision.bracketLabel')}>
              {BRACKET_OPTIONS.map(({ value, labelKey, Icon }) => {
                const selected = newDivisionBracketType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    disabled={isCreatingDivision}
                    onClick={() => setNewDivisionBracketType(value)}
                    className={cn(
                      'flex min-h-12 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50',
                    )}
                  >
                    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', selected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500')}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="leading-tight">{translate(`createDivision.${labelKey}`)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3 sm:p-4" aria-labelledby="division-rules-label">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <h3 id="division-rules-label" className="text-sm font-bold text-slate-900">{translate('createDivision.rulesSummary')}</h3>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-blue-700 shadow-sm">
                {newDivisionIsLiteMode ? translate('createDivision.liteLabel') : translate('createDivision.standardLabel')}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-md">
              <button
                type="button"
                aria-pressed={newDivisionIsLiteMode}
                disabled={isCreatingDivision}
                onClick={() => setNewDivisionIsLiteMode(true)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors',
                  newDivisionIsLiteMode
                    ? 'border-blue-600 bg-white text-blue-800 shadow-sm ring-1 ring-blue-300'
                    : 'border-blue-200 bg-white/70 text-slate-600 hover:border-blue-400',
                )}
              >
                <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" />{translate('createDivision.liteLabel')}</span>
                <span className="mt-1 block text-[11px] font-normal text-slate-500">{ruleTranslate('liteShortDesc')}</span>
              </button>
              <button
                type="button"
                aria-pressed={!newDivisionIsLiteMode}
                disabled={isCreatingDivision}
                onClick={() => setNewDivisionIsLiteMode(false)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors',
                  !newDivisionIsLiteMode
                    ? 'border-blue-600 bg-white text-blue-800 shadow-sm ring-1 ring-blue-300'
                    : 'border-blue-200 bg-white/70 text-slate-600 hover:border-blue-400',
                )}
              >
                <span className="flex items-center gap-1.5"><Settings className="h-3.5 w-3.5 text-slate-500" />{translate('createDivision.standardLabel')}</span>
                <span className="mt-1 block text-[11px] font-normal text-slate-500">{ruleTranslate('strictShortDesc')}</span>
              </button>
            </div>

            {!newDivisionIsLiteMode && (
              <DivisionStrictRulesSection
                sportRuleKind={newDivisionSportRuleKind}
                setSportRuleKind={setNewDivisionSportRuleKind}
                setsToWin={newDivisionSetsToWin}
                setSetsToWin={setNewDivisionSetsToWin}
                pointsPerSet={newDivisionPointsPerSet}
                setPointsPerSet={setNewDivisionPointsPerSet}
                winByTwo={newDivisionWinByTwo}
                setWinByTwo={setNewDivisionWinByTwo}
                maxDeucePoints={newDivisionMaxDeucePoints}
                setMaxDeucePoints={setNewDivisionMaxDeucePoints}
                superTiebreakEnabled={newDivisionSuperTiebreakEnabled}
                setSuperTiebreakEnabled={setNewDivisionSuperTiebreakEnabled}
                superTiebreakSetIndex={newDivisionSuperTiebreakSetIndex}
                setSuperTiebreakSetIndex={setNewDivisionSuperTiebreakSetIndex}
                superTiebreakPoints={newDivisionSuperTiebreakPoints}
                setSuperTiebreakPoints={setNewDivisionSuperTiebreakPoints}
                isCreating={isCreatingDivision}
              />
            )}

            {isGroupStageKnockout && (
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-blue-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">{translate('createDivision.stage1Short')}</h4>
                    <span className="text-[11px] font-semibold text-slate-500">{translate('createDivision.configuredTeams', { count: newDivisionNumGroups * newDivisionTeamsPerGroup })}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-600">
                      {ruleTranslate('numberOfGroups')}
                      <input
                        type="number"
                        min={2}
                        max={32}
                        value={newDivisionNumGroups}
                        onChange={(event) => updateNumber(event.target.value, setNewDivisionNumGroups, 2, 32)}
                        disabled={isCreatingDivision}
                        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <label className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-600">
                      {ruleTranslate('teamsPerGroup')}
                      <input
                        type="number"
                        min={2}
                        max={128}
                        value={newDivisionTeamsPerGroup}
                        onChange={(event) => {
                          const nextTeamsPerGroup = Math.min(128, Math.max(2, Number(event.target.value) || 2));
                          setNewDivisionTeamsPerGroup(nextTeamsPerGroup);
                          setNewDivisionTeamsAdvancing((current) => Math.min(current, Math.max(1, nextTeamsPerGroup - 1)));
                        }}
                        disabled={isCreatingDivision}
                        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <label className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-600">
                      {ruleTranslate('teamsAdvancing')}
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, newDivisionTeamsPerGroup - 1)}
                        value={newDivisionTeamsAdvancing}
                        onChange={(event) => updateNumber(event.target.value, setNewDivisionTeamsAdvancing, 1, Math.max(1, newDivisionTeamsPerGroup - 1))}
                        disabled={isCreatingDivision}
                        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-blue-700">
                    {translate('createDivision.advanceSummary', { groups: newDivisionNumGroups, advancing: newDivisionTeamsAdvancing, total: advancingTotal })}
                  </p>
                  {quickSuggestion && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-50 px-2.5 py-2">
                      <span className="text-[11px] font-semibold text-blue-800">
                        {translate('createDivision.quickSuggestion', { groups: quickSuggestion.groups ?? 0, teams: quickSuggestion.teamsPerGroup ?? 0, advancing: quickSuggestion.teamsAdvancing ?? 0 })}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (quickSuggestion.groups) setNewDivisionNumGroups(quickSuggestion.groups);
                          if (quickSuggestion.teamsPerGroup) setNewDivisionTeamsPerGroup(quickSuggestion.teamsPerGroup);
                          if (quickSuggestion.teamsAdvancing) setNewDivisionTeamsAdvancing(quickSuggestion.teamsAdvancing);
                        }}
                        disabled={isCreatingDivision}
                        className="rounded-md bg-blue-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {translate('createDivision.applySuggestion')}
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-amber-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">{translate('createDivision.stage2Short')}</h4>
                    <span className="text-[11px] font-semibold text-slate-500">{translate('createDivision.configuredTeams', { count: advancingTotal })}</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="mb-1 block text-[11px] font-semibold text-slate-500">{ruleTranslate('playoffFormat')}</span>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          ['SINGLE_ELIMINATION', ruleTranslate('singleElimination')],
                          ['DOUBLE_ELIMINATION', ruleTranslate('doubleElimination')],
                        ] as const).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={newDivisionPlayoffType === value}
                            onClick={() => setNewDivisionPlayoffType(value)}
                            disabled={isCreatingDivision}
                            className={cn(
                              'rounded-lg border px-2.5 py-2 text-left text-xs font-bold transition-colors',
                              newDivisionPlayoffType === value
                                ? 'border-amber-500 bg-amber-50 text-amber-800'
                                : 'border-slate-200 text-slate-600 hover:border-amber-300',
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="mb-1 block text-[11px] font-semibold text-slate-500">{ruleTranslate('seedingType')}</span>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          ['SEEDED', ruleTranslate('seededByElo')],
                          ['RANDOM', ruleTranslate('randomSeeding')],
                        ] as const).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={newDivisionSeedingType === value}
                            onClick={() => setNewDivisionSeedingType(value)}
                            disabled={isCreatingDivision}
                            className={cn(
                              'flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs font-bold transition-colors',
                              newDivisionSeedingType === value
                                ? 'border-amber-500 bg-amber-50 text-amber-800'
                                : 'border-slate-200 text-slate-600 hover:border-amber-300',
                            )}
                          >
                            {value === 'RANDOM' ? <Shuffle className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <label htmlFor="division-limit" className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  id="division-limit"
                  type="checkbox"
                  checked={newDivisionLimitEnabled}
                  onChange={(event) => setNewDivisionLimitEnabled(event.target.checked)}
                  disabled={isCreatingDivision}
                  className="h-4 w-4 accent-blue-600"
                />
                {translate('createDivision.participantLimitShort')}
              </label>
              {newDivisionLimitEnabled && (
                <input
                  aria-label={translate('createDivision.maxCount')}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newDivisionMaxParticipants}
                  onChange={(event) => setNewDivisionMaxParticipants(event.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                  onBlur={() => {
                    const parsed = Number(newDivisionMaxParticipants);
                    const normalized = Number.isFinite(parsed) && parsed > 0 ? Math.min(128, Math.max(2, parsed)) : 2;
                    setNewDivisionMaxParticipants(String(normalized));
                  }}
                  disabled={isCreatingDivision}
                  className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <label htmlFor="division-elo" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  id="division-elo"
                  type="checkbox"
                  checked={newDivisionEloEnabled}
                  onChange={(event) => setNewDivisionEloEnabled(event.target.checked)}
                  disabled={isCreatingDivision}
                  className="h-4 w-4 accent-blue-600"
                />
                {translate('createDivision.eloLimitShort')}
              </label>
              {newDivisionEloEnabled && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    aria-label={translate('createDivision.minElo')}
                    type="number"
                    min={0}
                    max={3000}
                    value={newDivisionMinElo ?? ''}
                    onChange={(event) => setNewDivisionMinElo(event.target.value === '' ? null : Number(event.target.value))}
                    disabled={isCreatingDivision}
                    placeholder={translate('createDivision.noLimit')}
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <input
                    aria-label={translate('createDivision.maxElo')}
                    type="number"
                    min={0}
                    max={3000}
                    value={newDivisionMaxElo ?? ''}
                    onChange={(event) => setNewDivisionMaxElo(event.target.value === '' ? null : Number(event.target.value))}
                    disabled={isCreatingDivision}
                    placeholder={translate('createDivision.noLimit')}
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <label htmlFor="division-entry-fee-override" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  id="division-entry-fee-override"
                  type="checkbox"
                  checked={newDivisionEntryFeeOverrideEnabled}
                  onChange={(event) => setNewDivisionEntryFeeOverrideEnabled(event.target.checked)}
                  disabled={isCreatingDivision}
                  className="h-4 w-4 accent-blue-600"
                />
                {translate('createDivision.entryFeeOverrideShort')}
              </label>
              {newDivisionEntryFeeOverrideEnabled ? (
                <input
                  aria-label={translate('createDivision.entryFeeOverrideShort')}
                  type="text"
                  inputMode="numeric"
                  value={newDivisionEntryFee}
                  onChange={(event) => setNewDivisionEntryFee(event.target.value.replace(/[^0-9]/g, '').slice(0, 12))}
                  disabled={isCreatingDivision}
                  placeholder={translate('createDivision.entryFeeOverridePlaceholder')}
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              ) : (
                <p className="mt-2 text-[11px] leading-tight text-slate-500">
                  {translate('createDivision.entryFeeOverrideHint')}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={onCancel} disabled={isCreatingDivision}>
              {translate('createDivision.cancel')}
            </Button>
            <Button onClick={onSubmit} disabled={isCreatingDivision} className="bg-blue-600 px-4 text-white hover:bg-blue-700">
              {isCreatingDivision ? <Loader2 className="h-4 w-4 animate-spin" /> : editingDivision ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingDivision ? translate('createDivision.saveChanges') : translate('createDivision.add')}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
