'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import { GitBranch, GitFork, GitMerge, Loader2, Plus, RotateCw, Save, User, Users, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import type { MatchFormatOption } from '@/features/tournaments/match-format-options';
import type { Division } from '@/features/tournaments/api';
import { cn } from '@/utils/cn';

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
  isCreatingDivision,
  onCancel,
  onSubmit,
}: CreateDivisionModalProps) {
  const translate = useTranslations('OrganizerManage');

  const handleFormatSelect = (value: string) => {
    const option = availableMatchFormatOptions.find((item) => item.value === value);
    setNewDivisionMatchType(value);
    setNewDivisionName(option ? translate(`createDivision.matchFormat.${option.value}`) : '');
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-[640px] rounded-xl bg-white p-5 sm:p-6">
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

          <div className="grid gap-2 sm:grid-cols-2">
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
