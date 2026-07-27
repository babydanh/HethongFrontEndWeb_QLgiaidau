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
export const CARD_W = 260;           // match card width (px) — wider for per-set columns
export const CARD_H_PUBLIC = 138;    // public view, compact & sleek for bracket view
export const CARD_H_ORGANIZER = 168; // organizer view, compact with schedule button
export const BASE_SLOT = 148;        // slot height for densest round
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

export interface BracketTabProps {
  tournament: { id: string; name: string; genderRestriction?: string | null };
  tournamentId?: string;
  divisionId?: string;
  onScheduleMatch?: OnScheduleMatch;
  selectedMatchId?: string | null;
  onSelectMatch?: OnSelectBracketMatch;
  fallbackSportRuleKind?: SportRuleKind;
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
  for (const set of extractMatchScores(scoreDetails)) {
    const t1 = set.team1Score;
    const t2 = set.team2Score;
    if (t1 > t2) result.p1SetsWon++;
    else if (t2 > t1) result.p2SetsWon++;
    result.p1PointsFor += t1;
    result.p2PointsFor += t2;
  }

  return result;
}
