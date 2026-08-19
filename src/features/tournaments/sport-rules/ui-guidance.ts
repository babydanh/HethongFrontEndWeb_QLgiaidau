import type { SportRuleKind } from '@/types/tournament';

export interface SportRulePreset {
  id: string;
  label: string;
  description: string;
  setsToWin: number;
  pointsPerSet: number;
  winByTwo: boolean;
  maxPoints: number;
  tiebreakPoints: number | null;
}

export interface ScoreEntryGuidance {
  targetSummary: string;
  examples: string[];
  operatorHint: string;
}

export interface QuickScoreTemplate {
  id: string;
  label: string;
  winnerScore: number;
  loserScore: number;
}

const SPORT_RULE_PRESETS: Record<SportRuleKind, SportRulePreset[]> = {
  BADMINTON: [
    {
      id: 'badminton-quick',
      label: 'Quick opening round',
      description: 'Play one 21-point set, suitable for qualifiers or large fields.',
      setsToWin: 1,
      pointsPerSet: 21,
      winByTwo: true,
      maxPoints: 30,
      tiebreakPoints: null,
    },
    {
      id: 'badminton-standard',
      label: 'Community standard',
      description: 'Win two 21-point sets; reaching 30 wins the set.',
      setsToWin: 2,
      pointsPerSet: 21,
      winByTwo: true,
      maxPoints: 30,
      tiebreakPoints: null,
    },
    {
      id: 'badminton-short',
      label: 'Time-saving',
      description: 'Win two 15-point sets when a shorter match is needed.',
      setsToWin: 2,
      pointsPerSet: 15,
      winByTwo: true,
      maxPoints: 21,
      tiebreakPoints: null,
    },
  ],
  TABLE_TENNIS: [
    {
      id: 'table-tennis-bo3',
      label: 'Fast standard BO3',
      description: 'Win two 11-point sets, suitable for group or opening rounds.',
      setsToWin: 2,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 99,
      tiebreakPoints: null,
    },
    {
      id: 'table-tennis-bo5',
      label: 'Knockout BO5',
      description: 'Win three 11-point sets, suitable for semifinals or finals.',
      setsToWin: 3,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 99,
      tiebreakPoints: null,
    },
    {
      id: 'table-tennis-single',
      label: 'Single-set decider',
      description: 'One 11-point set for very fast rotation.',
      setsToWin: 1,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 99,
      tiebreakPoints: null,
    },
  ],
  PICKLEBALL_RALLY: [
    {
      id: 'pickleball-rally-quick',
      label: '11-point game',
      description: 'One 11-point rally game for a concise opening round.',
      setsToWin: 1,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 15,
      tiebreakPoints: null,
    },
    {
      id: 'pickleball-rally-standard',
      label: 'Rally standard',
      description: 'Win two 11-point games for simple live scoring and coordination.',
      setsToWin: 2,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 15,
      tiebreakPoints: null,
    },
    {
      id: 'pickleball-rally-extended',
      label: '15-point game',
      description: 'Win two 15-point games for later rounds with less variance.',
      setsToWin: 2,
      pointsPerSet: 15,
      winByTwo: true,
      maxPoints: 21,
      tiebreakPoints: null,
    },
  ],
  PICKLEBALL_SIDE_OUT: [
    {
      id: 'pickleball-sideout-standard',
      label: 'Side-out standard',
      description: 'One 11-point game; only the serving side scores.',
      setsToWin: 1,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 15,
      tiebreakPoints: 11,
    },
    {
      id: 'pickleball-sideout-15',
      label: '15-point game',
      description: 'One 15-point game for longer matches while keeping side-out scoring.',
      setsToWin: 1,
      pointsPerSet: 15,
      winByTwo: true,
      maxPoints: 21,
      tiebreakPoints: 15,
    },
    {
      id: 'pickleball-sideout-finals',
      label: 'Best of 3',
      description: 'Win two 11-point games for semifinals or finals with a longer format.',
      setsToWin: 2,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 15,
      tiebreakPoints: 11,
    },
  ],
  TENNIS: [
    {
      id: 'tennis-pro-set',
      label: 'Pro set',
      description: 'One 8-game set, suitable for group rounds or tight schedules.',
      setsToWin: 1,
      pointsPerSet: 8,
      winByTwo: true,
      maxPoints: 9,
      tiebreakPoints: 7,
    },
    {
      id: 'tennis-standard',
      label: 'Standard BO3',
      description: 'Win two sets; each set has six games with a 7-point tiebreak at 6-6.',
      setsToWin: 2,
      pointsPerSet: 6,
      winByTwo: true,
      maxPoints: 7,
      tiebreakPoints: 7,
    },
    {
      id: 'tennis-short-set',
      label: 'Short set',
      description: 'One 4-game set, suitable for community events or consecutive matches.',
      setsToWin: 1,
      pointsPerSet: 4,
      winByTwo: true,
      maxPoints: 5,
      tiebreakPoints: 7,
    },
  ],
  FOOTBALL: [
    {
      id: 'football-standard',
      label: 'Standard',
      description: 'Two halves of 20 minutes each.',
      setsToWin: 1,
      pointsPerSet: 1,
      winByTwo: false,
      maxPoints: 99,
      tiebreakPoints: null,
    },
  ],
};

const SCORE_ENTRY_GUIDANCE: Record<SportRuleKind, ScoreEntryGuidance> = {
  BADMINTON: {
    targetSummary: 'The default target is 21; at 20-20, win by two, usually capped at 30.',
    examples: ['21-17', '22-20', '30-29'],
    operatorHint: 'Enter each completed set. If a set has not been played, leave both sides at 0.',
  },
  TABLE_TENNIS: {
    targetSummary: 'The default target is 11; at 10-10, win by two.',
    examples: ['11-7', '12-10', '15-13'],
    operatorHint: 'Table tennis commonly uses BO3 or BO5, so the entered set count must match the match configuration.',
  },
  PICKLEBALL_RALLY: {
    targetSummary: 'Rally point: the side that wins each rally receives a point.',
    examples: ['11-6', '15-13', '21-19'],
    operatorHint: 'Use this mode when organizers need fast score entry with less risk than side-out.',
  },
  PICKLEBALL_SIDE_OUT: {
    targetSummary: 'Side-out: only the serving side scores, usually to 11 or 15, still requiring a two-point lead when extended.',
    examples: ['11-8', '12-10', '15-13'],
    operatorHint: 'This panel records the game score only. The current service state remains in the live scoreboard.',
  },
  TENNIS: {
    targetSummary: 'For tennis, enter games within each set; do not enter 15/30/40 points here.',
    examples: ['6-4', '7-5', '7-6'],
    operatorHint: 'If a set reaches a tiebreak, enter the final set result such as 7-6 instead of separate tiebreak points.',
  },
  FOOTBALL: {
    targetSummary: 'Enter the goal score.',
    examples: ['2-1', '0-0', '3-2'],
    operatorHint: 'Update the score after each goal or when the match ends.',
  },
};

type RuleTranslate = (key: string, values?: Record<string, string | number>) => string;

export function getSportRulePresets(kind: SportRuleKind, translate?: RuleTranslate): SportRulePreset[] {
  const presets = SPORT_RULE_PRESETS[kind];
  if (!translate) return presets;
  return presets.map((preset) => ({
    ...preset,
    label: translate(`sportRules.presets.${preset.id}.label`),
    description: translate(`sportRules.presets.${preset.id}.description`),
  }));
}

export function getScoreEntryGuidance(kind: SportRuleKind, translate?: RuleTranslate): ScoreEntryGuidance {
  const guidance = SCORE_ENTRY_GUIDANCE[kind];
  if (!translate) return guidance;
  return {
    ...guidance,
    targetSummary: translate(`sportRules.guidance.${kind}.targetSummary`),
    operatorHint: translate(`sportRules.guidance.${kind}.operatorHint`),
  };
}

export function getQuickScoreTemplates(
  kind: SportRuleKind,
  pointsPerSet: number,
  maxPoints: number,
  translate?: RuleTranslate,
): QuickScoreTemplate[] {
  if (kind === 'TENNIS') {
    const label = (key: string, fallback: string) => translate?.(`sportRules.quickScore.${key}`) ?? fallback;
    return [
      {
        id: 'tennis-standard',
        label: label('standard', 'Standard'),
        winnerScore: pointsPerSet,
        loserScore: Math.max(pointsPerSet - 2, 0),
      },
      {
        id: 'tennis-close',
        label: label('close', 'Close game'),
        winnerScore: Math.min(pointsPerSet + 1, maxPoints),
        loserScore: Math.max(pointsPerSet - 1, 0),
      },
      {
        id: 'tennis-tiebreak',
        label: label('tiebreak', 'Tie-break'),
        winnerScore: maxPoints,
        loserScore: Math.max(maxPoints - 1, 0),
      },
    ];
  }

  const safeCap = Math.max(pointsPerSet, maxPoints);
  const label = (key: string, fallback: string) => translate?.(`sportRules.quickScore.${key}`) ?? fallback;
  return [
    {
      id: `${kind.toLowerCase()}-standard`,
      label: label('standard', 'Standard'),
      winnerScore: pointsPerSet,
      loserScore: Math.max(pointsPerSet - 4, 0),
    },
    {
      id: `${kind.toLowerCase()}-close`,
      label: label('close', 'Close game'),
      winnerScore: pointsPerSet,
      loserScore: Math.max(pointsPerSet - 2, 0),
    },
    {
      id: `${kind.toLowerCase()}-extended`,
      label: label('extended', 'Extended'),
      winnerScore: safeCap,
      loserScore: Math.max(safeCap - 1, 0),
    },
  ];
}

