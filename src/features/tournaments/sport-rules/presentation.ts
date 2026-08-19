import type { SportRuleKind } from '@/types/tournament';

export interface SportRulePresentation {
  kind: SportRuleKind;
  sportLabel: string;
  scoringLabel: string;
  setUnitLabel: string;
  winByTwoLabel: string;
  maxScoreLabel: string;
  presetSummary: string;
  roundConfigHint: string;
  setOptions: Array<{ value: number; label: string }>;
  maxScorePlaceholder: string;
  tiebreakLabel: string;
}

const SPORT_RULE_PRESENTATIONS: Record<SportRuleKind, SportRulePresentation> = {
  BADMINTON: {
    kind: 'BADMINTON',
    sportLabel: 'Badminton',
    scoringLabel: 'Rally point 21 points',
    setUnitLabel: 'Points per set',
    winByTwoLabel: 'Win by 2 points',
    maxScoreLabel: 'Set maximum when tied at 2 points',
    presetSummary: 'Default is usually best of 3 sets, 21 points per set, capped at 30.',
    roundConfigHint: 'Useful when reducing points in early rounds while keeping 21 points for semifinals and finals.',
    setOptions: [
      { value: 1, label: '1 set' },
      { value: 2, label: 'Win 2 sets' },
      { value: 3, label: 'Win 3 sets' },
    ],
    maxScorePlaceholder: 'Example: 30',
    tiebreakLabel: 'Super tie-break points / set-closing points',
  },
  TABLE_TENNIS: {
    kind: 'TABLE_TENNIS',
    sportLabel: 'Table tennis',
    scoringLabel: 'Rally point 11 points',
    setUnitLabel: 'Points per set',
    winByTwoLabel: 'Win by 2 points',
    maxScoreLabel: 'Score cap if the organizer wants to close the set',
    presetSummary: 'Default is usually best of 5 sets, 11 points per set, with table-tennis service rotation.',
    roundConfigHint: 'Useful when early rounds use best of 3 and later rounds move to best of 5.',
    setOptions: [
      { value: 1, label: '1 set' },
      { value: 2, label: 'Win 2 sets (BO3)' },
      { value: 3, label: 'Win 3 sets (BO5)' },
      { value: 4, label: 'Win 4 sets (BO7)' },
    ],
    maxScorePlaceholder: 'Example: 99 or leave rules open',
    tiebreakLabel: 'Special tie-break points',
  },
  PICKLEBALL_RALLY: {
    kind: 'PICKLEBALL_RALLY',
    sportLabel: 'Pickleball',
    scoringLabel: 'Rally point 11 points',
    setUnitLabel: 'Points per set',
    winByTwoLabel: 'Win by 2 points',
    maxScoreLabel: 'Set score cap at deuce',
    presetSummary: 'Rally mode: every rally scores. Default is usually best of 3 sets, 11 points per set, with a 15-point cap when needed.',
    roundConfigHint: 'You can raise the score cap or add a super tie-break for later rounds.',
    setOptions: [
      { value: 1, label: '1 set' },
      { value: 2, label: 'Win 2 sets' },
      { value: 3, label: 'Win 3 sets' },
    ],
    maxScorePlaceholder: 'Example: 15',
    tiebreakLabel: 'Super tie-break points',
  },
  PICKLEBALL_SIDE_OUT: {
    kind: 'PICKLEBALL_SIDE_OUT',
    sportLabel: 'Pickleball',
    scoringLabel: 'Side-out scoring',
    setUnitLabel: 'Target points per game',
    winByTwoLabel: 'Only the serving side scores and must still lead by 2',
    maxScoreLabel: 'Game target points',
    presetSummary: 'Side-out mode: only the serving team scores. This mode requires tracking service turns and the server.',
    roundConfigHint: 'Best for detailed live scoring; final-result entry requires a clear complete-game score convention.',
    setOptions: [
      { value: 1, label: '1 game' },
      { value: 2, label: 'Win 2 games' },
      { value: 3, label: 'Win 3 games' },
    ],
    maxScorePlaceholder: 'Example: 11',
    tiebreakLabel: 'Target game points',
  },
  TENNIS: {
    kind: 'TENNIS',
    sportLabel: 'Tennis',
    scoringLabel: 'Sets by games + tie-break',
    setUnitLabel: 'Games per set',
    winByTwoLabel: 'Set must lead by 2 games or reach a tie-break',
    maxScoreLabel: 'Maximum games in a set',
    presetSummary: 'Default is usually best of 3 sets, 6 games per set, with a 7-point tie-break at 6-6.',
    roundConfigHint: 'Useful when early rounds use a pro set and later rounds return to standard best of 3.',
    setOptions: [
      { value: 1, label: '1 set' },
      { value: 2, label: 'Win 2 sets (BO3)' },
      { value: 3, label: 'Win 3 sets (BO5)' },
    ],
    maxScorePlaceholder: 'Example: 7',
    tiebreakLabel: 'Tie-break points (usually 7)',
  },
  FOOTBALL: {
    kind: 'FOOTBALL',
    sportLabel: 'Football',
    scoringLabel: 'Goals scored',
    setUnitLabel: 'Goals',
    winByTwoLabel: 'Not required',
    maxScoreLabel: 'No limit',
    presetSummary: 'Default is usually two halves, with the result decided by total goals.',
    roundConfigHint: 'For 5-a-side, 7-a-side, and 11-a-side football.',
    setOptions: [
      { value: 1, label: '1 match' },
    ],
    maxScorePlaceholder: 'Leave blank',
    tiebreakLabel: 'Penalty shootout',
  },
};

type RuleTranslate = (key: string, values?: Record<string, string | number>) => string;

export function getSportRulePresentation(kind: SportRuleKind, translate?: RuleTranslate): SportRulePresentation {
  const base = SPORT_RULE_PRESENTATIONS[kind];
  if (!translate) return base;

  const key = (suffix: string) => `sportRules.${kind}.${suffix}`;
  return {
    ...base,
    sportLabel: translate(key('sportLabel')),
    scoringLabel: translate(key('scoringLabel')),
    setUnitLabel: translate(key('setUnitLabel')),
    winByTwoLabel: translate(key('winByTwoLabel')),
    maxScoreLabel: translate(key('maxScoreLabel')),
    presetSummary: translate(key('presetSummary')),
    roundConfigHint: translate(key('roundConfigHint')),
    setOptions: base.setOptions.map((option) => ({
      ...option,
      label: translate(key(`setOption${option.value}`)),
    })),
    maxScorePlaceholder: translate(key('maxScorePlaceholder')),
    tiebreakLabel: translate(key('tiebreakLabel')),
  };
}
