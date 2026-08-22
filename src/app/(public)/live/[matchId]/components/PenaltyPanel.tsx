'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { MatchPenaltyRecord } from '@/types/match';
import { cn } from '@/utils/cn';
import { getPenaltySchema } from '@/features/matches/penalty-schema';
import type { ResolvedSportRuleView } from '@/features/tournaments/sport-rules/normalize';

interface PenaltyPanelProps {
  team1Name: string;
  team2Name: string;
  sportKind: ResolvedSportRuleView['kind'];
  penalties: MatchPenaltyRecord[];
  isSubmitting: boolean;
  onAddPenalty: (team: 1 | 2 | null, kind: string, label: string, note?: string) => void;
}

type PenaltyTeamSelection = 'team1' | 'team2' | 'neutral';

export function PenaltyPanel({
  team1Name,
  team2Name,
  sportKind,
  penalties,
  isSubmitting,
  onAddPenalty,
}: PenaltyPanelProps) {
  const translate = useTranslations('LivePenalty');
  const locale = useLocale();
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  const schema = useMemo(() => getPenaltySchema(sportKind), [sportKind]);
  const localizedSchema = useMemo(() => ({
    ...schema,
    title: translate(`schema.${schema.schemaKey}.title`),
    description: translate(`schema.${schema.schemaKey}.description`),
    groups: schema.groups.map((group) => ({
      ...group,
      label: translate(`schema.groups.${group.id}`),
      items: group.items.map((item) => ({
        ...item,
        label: translate(`schema.items.${item.kind}.label`),
        effectLabel: translate(`schema.items.${item.kind}.effectLabel`),
        description: translate(`schema.items.${item.kind}.description`),
        cardLabel: item.cardLabelKey
          ? translate(`schema.items.${item.kind}.${item.cardLabelKey}`)
          : undefined,
      })),
    })),
  }), [schema, translate]);
  const [selectedPenaltyTeam, setSelectedPenaltyTeam] = useState<PenaltyTeamSelection>('neutral');
  const [selectedPenaltyKind, setSelectedPenaltyKind] = useState<string>(schema.groups[0]?.items[0]?.kind ?? '');
  const [penaltyNote, setPenaltyNote] = useState('');

  const availablePenaltyKinds = useMemo(
    () => schema.groups.flatMap((group) => group.items),
    [schema],
  );
  const localizedPenaltyKinds = useMemo(
    () => localizedSchema.groups.flatMap((group) => group.items),
    [localizedSchema],
  );
  const effectivePenaltyKind = availablePenaltyKinds.some((item) => item.kind === selectedPenaltyKind)
    ? selectedPenaltyKind
    : availablePenaltyKinds[0]?.kind ?? '';

  const selectedPenalty = availablePenaltyKinds.find((item) => item.kind === effectivePenaltyKind);

  const resolvePenaltyTeam = (): 1 | 2 | null => {
    if (selectedPenaltyTeam === 'team1') {
      return 1;
    }

    if (selectedPenaltyTeam === 'team2') {
      return 2;
    }

    return null;
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{translate('title')}</p>
          <p className="mt-2 text-sm font-bold text-slate-900">{localizedSchema.title}</p>
          <p className="mt-1 hidden text-xs font-medium text-slate-500 sm:block">{localizedSchema.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]',
              schema.cardStyle === 'yellow-red'
                ? 'bg-amber-50 text-amber-800'
                : 'bg-slate-100 text-slate-600',
            )}
          >
            {schema.cardStyle === 'yellow-red' ? translate('hasCards') : translate('noCards')}
          </div>
          <div className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
            {translate('recorded', { count: penalties.length })}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {localizedSchema.groups.map((group) => (
          <div key={group.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{group.label}</p>
              <span className="text-[11px] font-semibold text-slate-500">{translate('groupChoices', { count: group.items.length })}</span>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => {
                const isSelected = effectivePenaltyKind === item.kind;
                return (
                  <button
                    key={item.kind}
                    type="button"
                    onClick={() => setSelectedPenaltyKind(item.kind)}
                    className={cn(
                      'rounded-lg border p-2.5 text-left transition-colors',
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.label}</p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-500">{item.effectLabel}</p>
                      </div>
                      {item.cardLabelKey ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                          {translate(`schema.items.${item.kind}.${item.cardLabelKey}`)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 hidden line-clamp-2 text-xs font-medium leading-relaxed text-slate-500 2xl:block">{item.description}</p>
                    <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                      {item.impact === 'point'
                        ? translate('impactPoint')
                        : item.impact === 'game'
                          ? translate('impactGame')
                          : item.impact === 'set'
                            ? translate('impactSet')
                            : translate('impactNone')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_auto]">
        <select
          value={selectedPenaltyTeam}
          onChange={(event) => setSelectedPenaltyTeam(event.target.value as PenaltyTeamSelection)}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-800"
        >
          <option value="neutral">{translate('allMatchScope')}</option>
          <option value="team1">{team1Name}</option>
          <option value="team2">{team2Name}</option>
        </select>
        <select
          value={effectivePenaltyKind}
          onChange={(event) => setSelectedPenaltyKind(event.target.value)}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-800"
        >
          {localizedPenaltyKinds.map((item) => (
            <option key={item.kind} value={item.kind}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={penaltyNote}
          onChange={(event) => setPenaltyNote(event.target.value)}
          placeholder={translate("notePlaceholder")}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-800"
        />
        <button
          type="button"
          disabled={isSubmitting || !selectedPenalty}
          onClick={() => {
            if (!selectedPenalty) {
              return;
            }

            const localizedSelectedPenalty = localizedPenaltyKinds.find((item) => item.kind === selectedPenalty.kind);
            onAddPenalty(
              resolvePenaltyTeam(),
              selectedPenalty.kind,
              localizedSelectedPenalty?.label ?? translate(`schema.items.${selectedPenalty.kind}.label`),
              penaltyNote.trim() || undefined,
            );
            setPenaltyNote('');
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {translate('apply')}
        </button>
      </div>

      {schema.cardStyle === 'yellow-red' ? (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          {translate('cardsNotice')}
        </div>
      ) : (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
          {translate('noCardsNotice')}
        </div>
      )}

      {penalties.length > 0 ? (
        <div className="mt-3 space-y-2">
          {penalties.slice(0, 6).map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div className="font-bold text-slate-900">
                  {localizedPenaltyKinds.find((penalty) => penalty.kind === item.kind)?.label ?? translate(`schema.items.${item.kind}.label`)}
                  {item.team === 1 ? ` • ${team1Name}` : item.team === 2 ? ` • ${team2Name}` : translate('allMatch')}
                </div>
                <div className="text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleString(dateLocale)}</div>
              </div>
              {item.note ? <p className="mt-1 text-xs text-slate-600">{item.note}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-500">
          {translate('empty')}
        </div>
      )}
    </div>
  );
}
