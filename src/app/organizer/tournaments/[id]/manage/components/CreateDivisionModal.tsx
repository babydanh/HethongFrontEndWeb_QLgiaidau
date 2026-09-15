'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Plus, Save, Settings, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import type { MatchFormatOption } from '@/features/tournaments/match-format-options';
import type { Division } from '@/features/tournaments/api';
import type { BracketStage, SportRuleKind, StageRoundConfig } from '@/types/tournament';
import { cn } from '@/utils/cn';
import { getBracketQuickSuggestion } from './bracket-setup-view-model';
import { DivisionConstraintsSection } from './DivisionConstraintsSection';
import { DivisionGroupStageSettings } from './DivisionGroupStageSettings';
import { DivisionIdentitySection } from './DivisionIdentitySection';
import { DivisionRoundRulesSection } from './DivisionRoundRulesSection';
import { DivisionStrictRulesSection } from './DivisionStrictRulesSection';

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
  groupRoundsToPlay: number;
  setGroupRoundsToPlay: Setter<number>;
  newDivisionTeamsAdvancing: number;
  setNewDivisionTeamsAdvancing: Setter<number>;
  newDivisionPlayoffType: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION';
  setNewDivisionPlayoffType: Setter<'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION'>;
  newDivisionSeedingType: 'SEEDED' | 'RANDOM';
  setNewDivisionSeedingType: Setter<'SEEDED' | 'RANDOM'>;
  roundStages: BracketStage[];
  divisionRoundConfig: StageRoundConfig | null;
  onOpenRoundModal?: (stage: BracketStage, roundNumber: number) => void;
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
  groupRoundsToPlay,
  setGroupRoundsToPlay,
  newDivisionTeamsAdvancing,
  setNewDivisionTeamsAdvancing,
  newDivisionPlayoffType,
  setNewDivisionPlayoffType,
  newDivisionSeedingType,
  setNewDivisionSeedingType,
  roundStages,
  divisionRoundConfig,
  onOpenRoundModal,
  participantCount = 0,
  isCreatingDivision,
  onCancel,
  onSubmit,
}: CreateDivisionModalProps) {
  const translate = useTranslations('OrganizerManage');
  const ruleTranslate = useTranslations('TournamentDetail');
  const isGroupStageKnockout = newDivisionBracketType === 'GROUP_STAGE_KNOCKOUT';
  const parsedMax = Number(newDivisionMaxParticipants);
  const effectiveCount = participantCount > 0
    ? participantCount
    : (newDivisionLimitEnabled && Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 16);
  const quickSuggestion = isGroupStageKnockout
    ? getBracketQuickSuggestion('GROUP_STAGE_KNOCKOUT', effectiveCount)
    : null;
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[92vh] max-w-5xl overflow-y-auto rounded-2xl bg-white p-5 sm:p-6">
        <ModalHeader>
          <ModalTitle className="text-lg font-bold">
            {editingDivision ? translate('createDivision.editTitle') : translate('createDivision.addTitle')}
          </ModalTitle>
        </ModalHeader>

        <div className="mt-1 space-y-4">
          <DivisionIdentitySection
            availableMatchFormatOptions={availableMatchFormatOptions}
            matchType={newDivisionMatchType}
            setMatchType={setNewDivisionMatchType}
            name={newDivisionName}
            setName={setNewDivisionName}
            bracketType={newDivisionBracketType}
            setBracketType={setNewDivisionBracketType}
            isCreating={isCreatingDivision}
          />

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

            {!newDivisionIsLiteMode && editingDivision && (
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
              <DivisionGroupStageSettings
                numGroups={newDivisionNumGroups}
                setNumGroups={setNewDivisionNumGroups}
                teamsPerGroup={newDivisionTeamsPerGroup}
                setTeamsPerGroup={setNewDivisionTeamsPerGroup}
                groupRoundsToPlay={groupRoundsToPlay}
                setGroupRoundsToPlay={setGroupRoundsToPlay}
                teamsAdvancing={newDivisionTeamsAdvancing}
                setTeamsAdvancing={setNewDivisionTeamsAdvancing}
                playoffType={newDivisionPlayoffType}
                setPlayoffType={setNewDivisionPlayoffType}
                seedingType={newDivisionSeedingType}
                setSeedingType={setNewDivisionSeedingType}
                quickSuggestion={quickSuggestion}
                isCreating={isCreatingDivision}
              />
            )}

            {!newDivisionIsLiteMode && (
              <DivisionRoundRulesSection
                bracketType={newDivisionBracketType}
                roundStages={roundStages}
                divisionRoundConfig={divisionRoundConfig}
                maxParticipants={Number(newDivisionMaxParticipants) || 0}
                groupCount={newDivisionNumGroups}
                groupRoundsToPlay={groupRoundsToPlay}
                teamsAdvancing={newDivisionTeamsAdvancing}
                sportRuleKind={newDivisionSportRuleKind}
                isSaved={Boolean(editingDivision)}
                isCreating={isCreatingDivision}
                onOpenRoundModal={onOpenRoundModal}
              />
            )}
          </section>

          <DivisionConstraintsSection
            maxParticipants={newDivisionMaxParticipants}
            setMaxParticipants={setNewDivisionMaxParticipants}
            limitEnabled={newDivisionLimitEnabled}
            setLimitEnabled={setNewDivisionLimitEnabled}
            eloEnabled={newDivisionEloEnabled}
            setEloEnabled={setNewDivisionEloEnabled}
            minElo={newDivisionMinElo}
            setMinElo={setNewDivisionMinElo}
            maxElo={newDivisionMaxElo}
            setMaxElo={setNewDivisionMaxElo}
            entryFeeOverrideEnabled={newDivisionEntryFeeOverrideEnabled}
            setEntryFeeOverrideEnabled={setNewDivisionEntryFeeOverrideEnabled}
            entryFee={newDivisionEntryFee}
            setEntryFee={setNewDivisionEntryFee}
            isCreating={isCreatingDivision}
          />

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
