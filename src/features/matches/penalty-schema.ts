import type { ResolvedSportRuleView } from '@/features/tournaments/sport-rules/normalize';

export type PenaltyCardStyle = 'none' | 'yellow-red';

export type PenaltyImpact = 'none' | 'point' | 'game' | 'set' | 'disciplinary';

export interface PenaltyActionSchema {
  kind: string;
  impact: PenaltyImpact;
  cardLabelKey?: string;
}

export interface PenaltyGroupSchema {
  id: string;
  items: PenaltyActionSchema[];
}

export interface PenaltySchema {
  sportKind: ResolvedSportRuleView['kind'];
  schemaKey: 'TENNIS' | 'PICKLEBALL_SIDE_OUT' | 'BADMINTON' | 'TABLE_TENNIS' | 'DEFAULT';
  cardStyle: PenaltyCardStyle;
  groups: PenaltyGroupSchema[];
}

const TENNIS_SCHEMA: PenaltySchema = {
  sportKind: 'TENNIS',
  schemaKey: 'TENNIS',
  cardStyle: 'none',
  groups: [
    {
      id: 'discipline',
      items: [
        { kind: 'WARNING', impact: 'disciplinary' },
        { kind: 'CODE_VIOLATION', impact: 'disciplinary' },
      ],
    },
    {
      id: 'penalty',
      items: [
        { kind: 'POINT_PENALTY', impact: 'point' },
        { kind: 'GAME_PENALTY', impact: 'game' },
      ],
    },
  ],
};

const PICKLEBALL_SCHEMA: PenaltySchema = {
  sportKind: 'PICKLEBALL_SIDE_OUT',
  schemaKey: 'PICKLEBALL_SIDE_OUT',
  cardStyle: 'none',
  groups: [
    {
      id: 'fault',
      items: [
        { kind: 'WARNING', impact: 'disciplinary' },
        { kind: 'SERVICE_FAULT', impact: 'disciplinary' },
        { kind: 'TECHNICAL_FAULT', impact: 'disciplinary' },
      ],
    },
    {
      id: 'conduct',
      items: [{ kind: 'UNSPORTSMANLIKE', impact: 'disciplinary' }],
    },
  ],
};

const BADMINTON_SCHEMA: PenaltySchema = {
  sportKind: 'BADMINTON',
  schemaKey: 'BADMINTON',
  cardStyle: 'yellow-red',
  groups: [
    {
      id: 'warning',
      items: [{ kind: 'WARNING', impact: 'disciplinary' }],
    },
    {
      id: 'fault',
      items: [
        { kind: 'SERVICE_FAULT', impact: 'disciplinary' },
        { kind: 'MISCONDUCT', impact: 'disciplinary' },
      ],
    },
    {
      id: 'cards',
      items: [
        { kind: 'YELLOW_CARD', impact: 'disciplinary', cardLabelKey: 'cardLabel' },
        { kind: 'RED_CARD', impact: 'disciplinary', cardLabelKey: 'cardLabel' },
      ],
    },
  ],
};

const TABLE_TENNIS_SCHEMA: PenaltySchema = {
  sportKind: 'TABLE_TENNIS',
  schemaKey: 'TABLE_TENNIS',
  cardStyle: 'yellow-red',
  groups: [
    {
      id: 'warning',
      items: [{ kind: 'WARNING', impact: 'disciplinary' }],
    },
    {
      id: 'fault',
      items: [
        { kind: 'SERVICE_FAULT', impact: 'disciplinary' },
        { kind: 'MISCONDUCT', impact: 'disciplinary' },
      ],
    },
    {
      id: 'cards',
      items: [
        { kind: 'YELLOW_CARD', impact: 'disciplinary', cardLabelKey: 'cardLabel' },
        { kind: 'RED_CARD', impact: 'disciplinary', cardLabelKey: 'cardLabel' },
      ],
    },
  ],
};

const DEFAULT_SCHEMA: PenaltySchema = {
  sportKind: 'BADMINTON',
  schemaKey: 'DEFAULT',
  cardStyle: 'none',
  groups: [
    {
      id: 'warning',
      items: [{ kind: 'WARNING', impact: 'disciplinary' }],
    },
  ],
};

export function getPenaltySchema(sportKind: ResolvedSportRuleView['kind']): PenaltySchema {
  if (sportKind === 'TENNIS') {
    return TENNIS_SCHEMA;
  }

  if (sportKind === 'PICKLEBALL_RALLY' || sportKind === 'PICKLEBALL_SIDE_OUT') {
    return PICKLEBALL_SCHEMA;
  }

  if (sportKind === 'TABLE_TENNIS') {
    return TABLE_TENNIS_SCHEMA;
  }

  if (sportKind === 'BADMINTON') {
    return BADMINTON_SCHEMA;
  }

  return DEFAULT_SCHEMA;
}
