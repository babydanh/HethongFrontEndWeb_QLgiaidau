'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import { Shuffle, Users } from 'lucide-react';

import { cn } from '@/utils/cn';
import type { BracketQuickSuggestion } from './bracket-setup-view-model';

type Setter<T> = Dispatch<SetStateAction<T>>;

type DivisionGroupStageSettingsProps = {
  numGroups: number;
  setNumGroups: Setter<number>;
  teamsPerGroup: number;
  setTeamsPerGroup: Setter<number>;
  groupRoundsToPlay: number;
  setGroupRoundsToPlay: Setter<number>;
  teamsAdvancing: number;
  setTeamsAdvancing: Setter<number>;
  playoffType: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION';
  setPlayoffType: Setter<'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION'>;
  seedingType: 'SEEDED' | 'RANDOM';
  setSeedingType: Setter<'SEEDED' | 'RANDOM'>;
  quickSuggestion: BracketQuickSuggestion | null;
  isCreating: boolean;
};

const updateNumber = (value: string, setter: Setter<number>, min: number, max: number) => {
  const parsed = Number(value);
  setter(Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min);
};

export function DivisionGroupStageSettings({
  numGroups,
  setNumGroups,
  teamsPerGroup,
  setTeamsPerGroup,
  groupRoundsToPlay,
  setGroupRoundsToPlay,
  teamsAdvancing,
  setTeamsAdvancing,
  playoffType,
  setPlayoffType,
  seedingType,
  setSeedingType,
  quickSuggestion,
  isCreating,
}: DivisionGroupStageSettingsProps) {
  const translate = useTranslations('OrganizerManage');
  const ruleTranslate = useTranslations('TournamentDetail');
  const advancingTotal = numGroups * teamsAdvancing;

  return (
    <div className="mt-3 grid items-stretch gap-3 lg:grid-cols-2">
      <div className="flex h-full flex-col rounded-xl border border-blue-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">{translate('createDivision.stage1Short')}</h4>
          <span className="text-[11px] font-semibold text-slate-500">{translate('createDivision.configuredTeams', { count: numGroups * teamsPerGroup })}</span>
        </div>
        <div className="grid flex-1 grid-cols-2 items-stretch gap-2 sm:grid-cols-4">
          <label className="flex min-h-[68px] flex-col rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-600">
            {ruleTranslate('numberOfGroups')}
            <input type="number" min={2} max={32} value={numGroups} onChange={(event) => updateNumber(event.target.value, setNumGroups, 2, 32)} disabled={isCreating} className="mt-auto w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="flex min-h-[68px] flex-col rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-600">
            {ruleTranslate('groupStageRounds')}
            <input
              type="number"
              min={1}
              max={20}
              value={groupRoundsToPlay}
              onChange={(event) => {
                const next = Math.min(20, Math.max(1, Number(event.target.value) || 1));
                setGroupRoundsToPlay(next);
              }}
              disabled={isCreating}
              className="mt-auto w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="flex min-h-[68px] flex-col rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-600">
            {ruleTranslate('teamsPerGroup')}
            <input
              type="number"
              min={2}
              max={128}
              value={teamsPerGroup}
              onChange={(event) => {
                const next = Math.min(128, Math.max(2, Number(event.target.value) || 2));
                setTeamsPerGroup(next);
                setTeamsAdvancing((current) => Math.min(current, Math.max(1, next - 1)));
              }}
              disabled={isCreating}
              className="mt-auto w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="flex min-h-[68px] flex-col rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-600">
            {ruleTranslate('teamsAdvancing')}
            <input type="number" min={1} max={Math.max(1, teamsPerGroup - 1)} value={teamsAdvancing} onChange={(event) => updateNumber(event.target.value, setTeamsAdvancing, 1, Math.max(1, teamsPerGroup - 1))} disabled={isCreating} className="mt-auto w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
        </div>
        <p className="mt-2 text-xs font-semibold text-blue-700">{translate('createDivision.advanceSummary', { groups: numGroups, advancing: teamsAdvancing, total: advancingTotal })}</p>
        {quickSuggestion && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-50 px-2.5 py-2">
            <span className="text-[11px] font-semibold text-blue-800">{translate('createDivision.quickSuggestion', { groups: quickSuggestion.groups ?? 0, teams: quickSuggestion.teamsPerGroup ?? 0, advancing: quickSuggestion.teamsAdvancing ?? 0 })}</span>
            <button type="button" onClick={() => { if (quickSuggestion.groups) setNumGroups(quickSuggestion.groups); if (quickSuggestion.teamsPerGroup) setTeamsPerGroup(quickSuggestion.teamsPerGroup); if (quickSuggestion.teamsAdvancing) setTeamsAdvancing(quickSuggestion.teamsAdvancing); }} disabled={isCreating} className="rounded-md bg-blue-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              {translate('createDivision.applySuggestion')}
            </button>
          </div>
        )}
      </div>

      <div className="flex h-full flex-col rounded-xl border border-amber-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">{translate('createDivision.stage2Short')}</h4>
          <span className="text-[11px] font-semibold text-slate-500">{translate('createDivision.configuredTeams', { count: advancingTotal })}</span>
        </div>
        <div className="flex flex-1 flex-col justify-between gap-2">
          <div>
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">{ruleTranslate('playoffFormat')}</span>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['SINGLE_ELIMINATION', ruleTranslate('singleElimination')],
                ['DOUBLE_ELIMINATION', ruleTranslate('doubleElimination')],
              ] as const).map(([value, label]) => (
                <button key={value} type="button" aria-pressed={playoffType === value} onClick={() => setPlayoffType(value)} disabled={isCreating} className={cn('rounded-lg border px-2.5 py-2 text-left text-xs font-bold transition-colors', playoffType === value ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600 hover:border-amber-300')}>
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
                <button key={value} type="button" aria-pressed={seedingType === value} onClick={() => setSeedingType(value)} disabled={isCreating} className={cn('flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs font-bold transition-colors', seedingType === value ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600 hover:border-amber-300')}>
                  {value === 'RANDOM' ? <Shuffle className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
