'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import { GitBranch, GitFork, GitMerge, RotateCw, User, Users, type LucideIcon } from 'lucide-react';

import type { MatchFormatOption } from '@/features/tournaments/match-format-options';
import type { Division } from '@/features/tournaments/api';
import { cn } from '@/utils/cn';

type Setter<T> = Dispatch<SetStateAction<T>>;
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

type DivisionIdentitySectionProps = {
  availableMatchFormatOptions: MatchFormatOption[];
  matchType: string;
  setMatchType: Setter<string>;
  name: string;
  setName: Setter<string>;
  bracketType: string;
  setBracketType: Setter<string>;
  isCreating: boolean;
};

export function DivisionIdentitySection({
  availableMatchFormatOptions,
  matchType,
  setMatchType,
  name,
  setName,
  bracketType,
  setBracketType,
  isCreating,
}: DivisionIdentitySectionProps) {
  const translate = useTranslations('OrganizerManage');
  const getEventIcon = (value: string) => value.includes('SINGLES') ? User : Users;

  const handleFormatSelect = (value: string) => {
    const option = availableMatchFormatOptions.find((item) => item.value === value);
    setMatchType(value);
    setName(option ? translate(`createDivision.matchFormat.${option.value}`) : '');
  };

  return (
    <>
      <section aria-labelledby="division-type-label">
        <h3 id="division-type-label" className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{translate('createDivision.typeLabel')}</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label={translate('createDivision.typeLabel')}>
          {availableMatchFormatOptions.map((option) => {
            const Icon = getEventIcon(option.value);
            const selected = matchType === option.value;
            return (
              <button key={option.value} type="button" aria-pressed={selected} disabled={isCreating} onClick={() => handleFormatSelect(option.value)} className={cn('flex min-h-12 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1', selected ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50')}>
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', selected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500')}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                <span className="leading-tight">{translate(`createDivision.matchFormat.${option.value}`)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div>
        <label htmlFor="division-custom-name" className="mb-1.5 block text-xs font-bold text-slate-500">{translate('createDivision.nameShort')}</label>
        <input id="division-custom-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={translate('createDivision.namePlaceholder')} maxLength={255} disabled={isCreating} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
      </div>

      <section aria-labelledby="division-bracket-label">
        <h3 id="division-bracket-label" className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{translate('createDivision.bracketLabel')}</h3>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label={translate('createDivision.bracketLabel')}>
          {BRACKET_OPTIONS.map(({ value, labelKey, Icon }) => {
            const selected = bracketType === value;
            return (
              <button key={value} type="button" aria-pressed={selected} disabled={isCreating} onClick={() => setBracketType(value)} className={cn('flex min-h-12 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1', selected ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50')}>
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', selected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500')}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                <span className="leading-tight">{translate(`createDivision.${labelKey}`)}</span>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
