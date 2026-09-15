'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useTranslations } from 'next-intl';

import type { SportRuleKind } from '@/types/tournament';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { getSportRulePresets } from '@/features/tournaments/sport-rules/ui-guidance';
import { buildDefaultSportRules } from '@/features/tournaments/sport-rules/defaults';
import { resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { cn } from '@/utils/cn';
import { getQuickPresets } from './bracket-setup-view-model';

type Setter<T> = Dispatch<SetStateAction<T>>;

type DivisionStrictRulesSectionProps = {
  sportRuleKind: SportRuleKind;
  setSportRuleKind: Setter<SportRuleKind>;
  setsToWin: number;
  setSetsToWin: Setter<number>;
  pointsPerSet: number;
  setPointsPerSet: Setter<number>;
  winByTwo: boolean;
  setWinByTwo: Setter<boolean>;
  maxDeucePoints: number;
  setMaxDeucePoints: Setter<number>;
  superTiebreakEnabled: boolean;
  setSuperTiebreakEnabled: Setter<boolean>;
  superTiebreakSetIndex: number;
  setSuperTiebreakSetIndex: Setter<number>;
  superTiebreakPoints: number;
  setSuperTiebreakPoints: Setter<number>;
  isCreating: boolean;
};

export function DivisionStrictRulesSection({
  sportRuleKind,
  setSportRuleKind,
  setsToWin,
  setSetsToWin,
  pointsPerSet,
  setPointsPerSet,
  winByTwo,
  setWinByTwo,
  maxDeucePoints,
  setMaxDeucePoints,
  superTiebreakEnabled,
  setSuperTiebreakEnabled,
  superTiebreakSetIndex,
  setSuperTiebreakSetIndex,
  superTiebreakPoints,
  setSuperTiebreakPoints,
  isCreating,
}: DivisionStrictRulesSectionProps) {
  const translate = useTranslations('TournamentDetail');
  const presentation = getSportRulePresentation(sportRuleKind, translate);
  const presets = getQuickPresets(getSportRulePresets(sportRuleKind, translate), 2);
  const isPickleball = sportRuleKind === 'PICKLEBALL_RALLY' || sportRuleKind === 'PICKLEBALL_SIDE_OUT';
  const supportsTiebreak = sportRuleKind === 'TENNIS' || sportRuleKind === 'PICKLEBALL_SIDE_OUT';

  const applySportRuleKind = (kind: SportRuleKind) => {
    const resolved = resolveSportRuleView(buildDefaultSportRules(kind), kind);
    setSportRuleKind(kind);
    setSetsToWin(resolved.setsToWin);
    setPointsPerSet(resolved.pointsPerSet);
    setWinByTwo(resolved.winByTwo);
    setMaxDeucePoints(resolved.maxPoints);
    setSuperTiebreakEnabled(resolved.hasCustomTiebreakTarget);
    setSuperTiebreakSetIndex(resolved.bestOf);
    setSuperTiebreakPoints(resolved.tiebreakPoints);
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-slate-800">{presentation.sportLabel}</p>
          <p className="text-[11px] text-slate-500">{presentation.scoringLabel}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">Strict</span>
      </div>

      {isPickleball && (
        <div className="grid grid-cols-2 gap-2" role="group" aria-label={translate('pickleballMode')}>
          {([
            ['PICKLEBALL_RALLY', translate('rallyScoring')],
            ['PICKLEBALL_SIDE_OUT', translate('sideOutScoring')],
          ] as const).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              aria-pressed={sportRuleKind === kind}
              disabled={isCreating}
              onClick={() => applySportRuleKind(kind)}
              className={cn(
                'rounded-lg border px-2.5 py-2 text-left text-xs font-bold transition-colors',
                sportRuleKind === kind
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 text-slate-600 hover:border-emerald-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{translate('sportPresets')}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {presets.map((preset) => {
            const selected = setsToWin === preset.setsToWin
              && pointsPerSet === preset.pointsPerSet
              && winByTwo === preset.winByTwo;
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.description}
                aria-pressed={selected}
                disabled={isCreating}
                onClick={() => {
                  setSetsToWin(preset.setsToWin);
                  setPointsPerSet(preset.pointsPerSet);
                  setWinByTwo(preset.winByTwo);
                  setMaxDeucePoints(preset.maxPoints);
                  setSuperTiebreakEnabled(preset.tiebreakPoints !== null);
                  setSuperTiebreakSetIndex(preset.setsToWin * 2 - 1);
                  setSuperTiebreakPoints(preset.tiebreakPoints ?? preset.pointsPerSet);
                }}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-bold transition-colors',
                  selected
                    ? 'border-blue-500 bg-blue-50 text-blue-800 ring-1 ring-blue-200'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-white',
                )}
              >
                <span className="truncate">{preset.label}</span>
                <span className="shrink-0 text-[10px] font-semibold text-slate-500">
                  {preset.setsToWin}×{preset.pointsPerSet}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-semibold text-slate-600">
          {translate('setsToWin')}
          <select
            value={setsToWin}
            onChange={(event) => setSetsToWin(Number(event.target.value))}
            disabled={isCreating}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {presentation.setOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-semibold text-slate-600">
          {presentation.setUnitLabel}
          <input
            type="number"
            min={1}
            value={pointsPerSet}
            onChange={(event) => setPointsPerSet(Math.max(1, Number(event.target.value) || 1))}
            disabled={isCreating}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={winByTwo}
            onChange={(event) => setWinByTwo(event.target.checked)}
            disabled={isCreating}
            className="h-4 w-4 accent-blue-600"
          />
          {translate('winByTwo')}
        </label>
        {winByTwo ? (
          <label className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-semibold text-slate-600">
            {translate('maxDeucePoints')}
            <input
              type="number"
              min={pointsPerSet}
              value={maxDeucePoints}
              onChange={(event) => setMaxDeucePoints(Math.max(pointsPerSet, Number(event.target.value) || pointsPerSet))}
              disabled={isCreating}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        ) : (
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-500">
            {translate('noDeuceLimit')}
          </div>
        )}
      </div>

      {supportsTiebreak && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={superTiebreakEnabled}
              onChange={(event) => setSuperTiebreakEnabled(event.target.checked)}
              disabled={isCreating}
              className="h-4 w-4 accent-blue-600"
            />
            {translate('superTiebreak')}
          </label>
          {superTiebreakEnabled && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-[11px] font-semibold text-slate-600">
                {translate('tiebreakSet')}
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, setsToWin * 2 - 1)}
                  value={superTiebreakSetIndex}
                  onChange={(event) => setSuperTiebreakSetIndex(Math.max(1, Number(event.target.value) || 1))}
                  disabled={isCreating}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="text-[11px] font-semibold text-slate-600">
                {translate('tiebreakPoints')}
                <input
                  type="number"
                  min={1}
                  value={superTiebreakPoints}
                  onChange={(event) => setSuperTiebreakPoints(Math.max(1, Number(event.target.value) || 1))}
                  disabled={isCreating}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
