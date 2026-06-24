/**
 * Bracket – shared constants, types & interfaces
 *
 * Extracted from the old BracketTab.tsx to avoid circular deps
 * and keep each view file small (<300 lines per skills.md).
 */

import type { BracketMatch } from '@/features/tournaments/api';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYOUT CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const CARD_W = 260;           // match card width (px) — wider for per-set columns
export const CARD_H_PUBLIC = 132;    // compact card (public view)
export const CARD_H_ORGANIZER = 172; // taller card (organizer)
export const BASE_SLOT = 136;        // slot height for the densest round
export const COL_GAP = 48;           // horizontal gap between round columns

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BRANCH SETS (for Double Elimination filtering)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const UPPER_SET = new Set(['WINNER', 'WINNERS', 'UPPER', 'W', 'MAIN']);
export const LOWER_SET = new Set(['LOSER', 'LOSERS', 'LOWER', 'L']);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export type OnScheduleMatch = (match: BracketMatch) => void;

export interface BracketTabProps {
  tournament: { id: string; name: string; genderRestriction?: string | null };
  tournamentId?: string;
  divisionId?: string;
  onScheduleMatch?: OnScheduleMatch;
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
  if (!scoreDetails || typeof scoreDetails !== 'object') return result;

  // Format A: { sets: [{ team1Score, team2Score }, …] }
  const sets = (scoreDetails as { sets?: unknown[] }).sets;
  if (Array.isArray(sets)) {
    for (const set of sets) {
      if (!set || typeof set !== 'object') continue;
      const s = set as Record<string, unknown>;
      const t1 = Number(s.team1Score ?? 0);
      const t2 = Number(s.team2Score ?? 0);
      if (t1 > t2) result.p1SetsWon++;
      else if (t2 > t1) result.p2SetsWon++;
      result.p1PointsFor += t1;
      result.p2PointsFor += t2;
    }
    return result;
  }

  // Format B: { set1: "21-19", set2: "15-21", … }
  const keys = Object.keys(scoreDetails).sort();
  for (const key of keys) {
    const val = scoreDetails[key];
    if (typeof val !== 'string' || !val.includes('-')) continue;
    const [s1, s2] = val.split('-');
    const t1 = Number(s1.trim());
    const t2 = Number(s2.trim());
    if (isNaN(t1) || isNaN(t2)) continue;
    if (t1 > t2) result.p1SetsWon++;
    else if (t2 > t1) result.p2SetsWon++;
    result.p1PointsFor += t1;
    result.p2PointsFor += t2;
  }

  return result;
}
