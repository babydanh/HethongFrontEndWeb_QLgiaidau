/**
 * Bracket – shared constants, types & interfaces
 *
 * Extracted from the old BracketTab.tsx to avoid circular deps
 * and keep each view file small (<300 lines per skills.md).
 */

import type { BracketMatch } from '@/features/tournaments/api';
import { extractMatchScores } from '@/features/matches/score-display';
import type { SportRuleKind } from '@/types/tournament';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYOUT CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const CARD_W = 250;           // match card width (px)
export const CARD_H_PUBLIC = 114;    // public view height (super compact 114px)
export const CARD_H_ORGANIZER = 144; // organizer view height (with schedule button)
export const BASE_SLOT = 124;        // slot height for densest round
export const COL_GAP = 96;           // horizontal gap between round columns

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BRANCH SETS (for Double Elimination filtering)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const UPPER_SET = new Set(['WINNER', 'WINNERS', 'UPPER', 'W', 'MAIN']);
export const LOWER_SET = new Set(['LOSER', 'LOSERS', 'LOWER', 'L']);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export type OnScheduleMatch = (match: BracketMatch) => void;
export type OnSelectBracketMatch = (match: BracketMatch) => void;
export type BracketSlot = 'participant1' | 'participant2';
export type BracketParticipant = NonNullable<BracketMatch['participant1']>;

export interface BracketDragSource {
  type: 'slot' | 'tray';
  matchId?: string;
  slot?: BracketSlot;
  participant: BracketParticipant;
}

export interface BracketDragHandlers {
  enabled?: boolean;
  trayParticipants?: BracketParticipant[];
  participantOverrides?: Record<string, BracketParticipant | null>;
  onParticipantDrop?: (
    source: BracketDragSource,
    target: { type: 'slot'; matchId: string; slot: BracketSlot } | { type: 'tray' },
  ) => void | Promise<void>;
}

export interface BracketTabProps {
  tournament: { id: string; name: string; genderRestriction?: string | null };
  tournamentId?: string;
  divisionId?: string;
  onScheduleMatch?: OnScheduleMatch;
  selectedMatchId?: string | null;
  onSelectMatch?: OnSelectBracketMatch;
  fallbackSportRuleKind?: SportRuleKind;
  dragHandlers?: BracketDragHandlers;
}

export interface MatchPos {
  x: number;
  y: number;
}

export interface StandingRow {
  participantId: string;
  teamName: string;
  seed: number | null;
  played: number;
  won: number;
  lost: number;
  draws: number;
  setsWon: number;
  setsLost: number;
  pointsFor: number;     // total points scored across all sets (parsed from scoreDetails)
  pointsAgainst: number; // total points conceded across all sets
  points: number;        // match points (+3 / +1 / 0)
  /** If non-empty, this team is part of a tie that could not be resolved. */
  tiebreak?: 'tied' | 'playoff';
}

/**
 * Options for tiebreaker resolution in calculateStandings.
 */
export interface TiebreakerOptions {
  /** How to handle unresolvable ties: split (same rank) or playoff. */
  mode?: 'split' | 'playoff';
}

export interface ScoreDetailsSet {
  team1Score?: number | string | null;
  team2Score?: number | string | null;
}

export interface ScoreDetailsShape {
  sets?: ScoreDetailsSet[];
  [key: string]: unknown;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCORE PARSING  (defined here to avoid circular deps between helpers & tiebreaker)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ParsedScore {
  p1SetsWon: number;
  p2SetsWon: number;
  p1PointsFor: number;
  p2PointsFor: number;
}

/**
 * Parse `scoreDetails` JSON to extract per-set scores.
 * Handles two formats:
 *  - Format A: { sets: [{ team1Score, team2Score }, …] }
 *  - Format B: { set1: "21-19", set2: "15-21", … }
 */
export function parseScoreDetails(
  scoreDetails: Record<string, unknown> | undefined | null,
): ParsedScore {
  const result: ParsedScore = {
    p1SetsWon: 0,
    p2SetsWon: 0,
    p1PointsFor: 0,
    p2PointsFor: 0,
  };
  const sets = extractMatchScores(scoreDetails);
  for (const set of sets) {
    const t1 = set.team1Score;
    const t2 = set.team2Score;
    if (t1 > t2) result.p1SetsWon++;
    else if (t2 > t1) result.p2SetsWon++;
    result.p1PointsFor += t1;
    result.p2PointsFor += t2;
  }

  // Football stores regulation/extra-time goals directly instead of a
  // badminton-style `sets` array. Keep goal difference available to the same
  // standing tiebreaker pipeline without treating goals as extra sets.
  if (sets.length === 0 && scoreDetails) {
    const toNumber = (value: unknown) => {
      const parsed = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    };
    const team1Goals = toNumber(scoreDetails.team1Goals ?? scoreDetails.p1Goals);
    const team2Goals = toNumber(scoreDetails.team2Goals ?? scoreDetails.p2Goals);
    if (team1Goals != null && team2Goals != null) {
      result.p1PointsFor = team1Goals;
      result.p2PointsFor = team2Goals;
    }
  }

  return result;
}
