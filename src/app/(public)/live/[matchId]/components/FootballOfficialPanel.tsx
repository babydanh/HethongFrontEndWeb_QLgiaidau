import { CircleAlert, CreditCard, Flag, Minus, Plus, Square, Timer, Trophy } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTranslations } from 'next-intl';
import type { FootballEventType, FootballMatchPhase, FootballScoreState } from '@/features/matches/football-score';
import { footballPhaseLabel } from '@/features/matches/football-score';

interface FootballOfficialPanelProps {
  team1Name: string;
  team2Name: string;
  score: FootballScoreState;
  isSubmitting: boolean;
  onGoal: (team: 1 | 2) => void;
  onUndoGoal: (team: 1 | 2) => void;
  onPhaseChange: (phase: FootballMatchPhase) => void;
  onEvent: (type: FootballEventType, team: 1 | 2) => void;
  onMinuteChange: (minute: number) => void;
  onAddedMinuteChange: (addedMinute: number) => void;
}

const phases: FootballMatchPhase[] = [
  'FIRST_HALF',
  'HALFTIME',
  'SECOND_HALF',
  'STOPPAGE_TIME',
  'FULL_TIME',
  'EXTRA_TIME_FIRST_HALF',
  'EXTRA_TIME_BREAK',
  'EXTRA_TIME_SECOND_HALF',
  'PENALTY_SHOOTOUT',
];

function TeamScore({
  name,
  goals,
  onGoal,
  onUndoGoal,
  disabled,
}: {
  name: string;
  goals: number;
  onGoal: () => void;
  onUndoGoal: () => void;
  disabled: boolean;
}) {
  const translate = useTranslations('LiveMatch');
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
      <p className="truncate text-sm font-bold text-slate-800" title={name}>{name}</p>
      <p className="mt-2 text-4xl font-black tabular-nums text-slate-950">{goals}</p>
      <div className="mt-3 flex justify-center gap-2">
        <button
          type="button"
          aria-label={translate("decreaseGoals", { name })}
          disabled={disabled || goals === 0}
          onClick={onUndoGoal}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={translate("increaseGoals", { name })}
          disabled={disabled}
          onClick={onGoal}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function FootballOfficialPanel({
  team1Name,
  team2Name,
  score,
  isSubmitting,
  onGoal,
  onUndoGoal,
  onPhaseChange,
  onEvent,
  onMinuteChange,
  onAddedMinuteChange,
}: FootballOfficialPanelProps) {
  const translate = useTranslations('LiveMatch');

  const localizedPhaseLabel = (phase: FootballMatchPhase) => {
    switch (phase) {
      case 'FIRST_HALF':
        return translate('footballFirstHalf');
      case 'HALFTIME':
        return translate('footballHalftime');
      case 'STOPPAGE_TIME':
        return translate('footballStoppageTime');
      case 'FULL_TIME':
        return translate('footballFullTime');
      case 'EXTRA_TIME_FIRST_HALF':
        return translate('footballExtraTimeFirstHalf');
      case 'EXTRA_TIME_BREAK':
        return translate('footballExtraTimeBreak');
      case 'EXTRA_TIME_SECOND_HALF':
        return translate('footballExtraTimeSecondHalf');
      case 'PENALTY_SHOOTOUT':
        return translate('footballPenaltyShootout');
      default:
        return footballPhaseLabel(phase);
    }
  };
  return (
    <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Bóng đá · Scoring live</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{localizedPhaseLabel(score.phase)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
          <Timer className="h-4 w-4 text-emerald-600" />
          <label className="inline-flex items-center gap-1.5">
            {translate('minuteLabel')}
            <input
              type="number"
              min={0}
              max={150}
              value={score.minute}
              onChange={(event) => onMinuteChange(Math.max(0, Number(event.target.value) || 0))}
              className="h-8 w-16 rounded-md border border-slate-200 bg-white px-2 text-center font-bold text-slate-900"
            />
          </label>
          <label className="inline-flex items-center gap-1.5">
            {translate('addedMinuteLabel')}
            <input
              type="number"
              min={0}
              max={30}
              value={score.addedMinute}
              onChange={(event) => onAddedMinuteChange(Math.max(0, Number(event.target.value) || 0))}
              className="h-8 w-16 rounded-md border border-slate-200 bg-white px-2 text-center font-bold text-slate-900"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamScore
          name={team1Name}
          goals={score.team1Goals}
          onGoal={() => onGoal(1)}
          onUndoGoal={() => onUndoGoal(1)}
          disabled={isSubmitting}
        />
        <span className="text-sm font-black text-slate-400">–</span>
        <TeamScore
          name={team2Name}
          goals={score.team2Goals}
          onGoal={() => onGoal(2)}
          onUndoGoal={() => onUndoGoal(2)}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {phases.map((phase) => (
          <button
            key={phase}
            type="button"
            disabled={isSubmitting}
            onClick={() => onPhaseChange(phase)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-40',
              score.phase === phase
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50',
            )}
          >
            {localizedPhaseLabel(phase)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([
          ['YELLOW_CARD', translate('footballYellowCard'), CreditCard],
          ['RED_CARD', translate('footballRedCard'), Square],
          ['FOUL', translate('footballFoul'), Flag],
          ['PENALTY_GOAL', translate('footballPenaltyGoal'), Trophy],
        ] as const).map(([type, label, Icon]) => (
          <div key={type} className="rounded-lg border border-slate-200 bg-white p-2">
            <p className="flex items-center gap-1 text-[11px] font-bold text-slate-600"><Icon className="h-3.5 w-3.5" />{label}</p>
            <div className="mt-2 flex gap-1">
              <button type="button" disabled={isSubmitting} onClick={() => onEvent(type, 1)} className="flex-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-bold hover:bg-slate-200 disabled:opacity-40">Đội 1</button>
              <button type="button" disabled={isSubmitting} onClick={() => onEvent(type, 2)} className="flex-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-bold hover:bg-slate-200 disabled:opacity-40">Đội 2</button>
            </div>
          </div>
        ))}
      </div>

      {score.events.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{translate('matchEvents')}</p>
          <div className="space-y-1.5">
            {score.events.slice(-8).reverse().map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-700">{event.minute}&apos; · {event.type.replaceAll('_', ' ')}</span>
                <span className="truncate text-slate-500">{event.team === 1 ? team1Name : team2Name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white p-3 text-xs font-semibold text-slate-500">
          <CircleAlert className="h-4 w-4" /> Chưa có sự kiện trong trận.
        </div>
      )}
    </div>
  );
}
