/**
 * Bracket – pure helper functions (no JSX, no React hooks)
 *
 * Extracted from the old BracketTab.tsx to keep each view file lean.
 */

import type { BracketMatch } from '@/features/tournaments/api';
import type { StandingRow } from './types';
import { parseScoreDetails } from './types';
import { tiebreakerSort } from './tiebreaker';

export type FootballFormResult = 'W' | 'D' | 'L';

/** Return the latest completed football results for one participant. */
export function getFootballForm(
  matches: BracketMatch[],
  participantId: string,
  limit = 5,
): FootballFormResult[] {
  return matches
    .filter(
      (match) =>
        !match.isBye &&
        match.status === 'COMPLETED' &&
        (match.participant1?.id === participantId || match.participant2?.id === participantId),
    )
    .sort((a, b) => {
      const aTime = Date.parse(a.completedAt ?? a.scheduledAt ?? '') || 0;
      const bTime = Date.parse(b.completedAt ?? b.scheduledAt ?? '') || 0;
      return aTime - bTime || a.roundNumber - b.roundNumber || a.matchOrder - b.matchOrder;
    })
    .slice(-limit)
    .map((match) => {
      if (!match.winnerId) return 'D';
      return match.winnerId === participantId ? 'W' : 'L';
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MATCH GROUPING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Group matches by roundNumber, filter empty BYEs, sort by matchOrder */
export function buildMatchesByRound(
  matches: BracketMatch[],
): Record<number, BracketMatch[]> {
  const map: Record<number, BracketMatch[]> = {};
  matches.forEach((m) => {
    if (m.isBye && !m.participant1 && !m.participant2) return;
    if (!map[m.roundNumber]) map[m.roundNumber] = [];
    map[m.roundNumber].push(m);
  });
  Object.values(map).forEach((arr) =>
    arr.sort((a, b) => a.matchOrder - b.matchOrder),
  );
  return map;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROUND LABELLING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Round label from right (0 = final, 1 = semi, …) */
export function getRoundLabel(
  ri: number,
  total: number,
  prefix = '',
): string {
  const fromEnd = total - 1 - ri;
  if (fromEnd === 0) return prefix ? `${prefix} Chung kết` : 'Chung kết';
  if (fromEnd === 1) return prefix ? `${prefix} Bán kết` : 'Bán kết';
  if (fromEnd === 2) return prefix ? `${prefix} Tứ kết` : 'Tứ kết';
  if (fromEnd === 3) return prefix ? `${prefix} Vòng 16` : 'Vòng 16';
  if (fromEnd === 4) return prefix ? `${prefix} Vòng 32` : 'Vòng 32';
  if (fromEnd === 5) return prefix ? `${prefix} Vòng 64` : 'Vòng 64';
  if (fromEnd === 6) return prefix ? `${prefix} Vòng 128` : 'Vòng 128';
  return `${prefix ? prefix + ' ' : ''}Vòng ${ri + 1}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POINT DETAILS PARSING (from JSON scoreDetails)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STANDINGS CALCULATION (Round Robin)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Build a sorted standing table from completed matches.
 * Uses full tiebreaker chain: points → H2H points → H2H sets → H2H points
 * → total sets → total points → tiebreakerMode.
 *
 * Returns both rankings and any unresolvable tie groups.
 */
export function calculateStandings(
  matches: BracketMatch[],
  options?: {
    tiebreakerMode?: 'split' | 'playoff';
    football?: boolean;
    throughRound?: number;
  },
): { standings: StandingRow[]; ties: StandingRow[][] } {
  const map = new Map<string, StandingRow>();
  const getRow = (id: string, name: string, seed: number | null): StandingRow => {
    if (!map.has(id)) {
      map.set(id, {
        participantId: id,
        teamName: name,
        seed,
        played: 0,
        won: 0,
        lost: 0,
        draws: 0,
        setsWon: 0,
        setsLost: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        points: 0,
      });
    }
    return map.get(id)!;
  };

  // Register all participants (capture seed from first match)
  matches.forEach((m) => {
    if (m.participant1) getRow(m.participant1.id, m.participant1.teamName, m.participant1.seed);
    if (m.participant2) getRow(m.participant2.id, m.participant2.teamName, m.participant2.seed);
  });

  // Accumulate stats from completed matches
  matches.forEach((m) => {
    if (m.isBye || m.status !== 'COMPLETED' || !m.participant1 || !m.participant2) return;
    if (options?.throughRound != null && m.roundNumber > options.throughRound) return;

    const r1 = getRow(m.participant1.id, m.participant1.teamName, m.participant1.seed);
    const r2 = getRow(m.participant2.id, m.participant2.teamName, m.participant2.seed);
    r1.played++;
    r2.played++;
    r1.setsWon += m.p1SetsWon;
    r1.setsLost += m.p2SetsWon;
    r2.setsWon += m.p2SetsWon;
    r2.setsLost += m.p1SetsWon;

    // Point-level data from scoreDetails
    const parsed = parseScoreDetails(m.scoreDetails as Record<string, unknown> | undefined | null);
    r1.pointsFor += parsed.p1PointsFor;
    r1.pointsAgainst += parsed.p2PointsFor;
    r2.pointsFor += parsed.p2PointsFor;
    r2.pointsAgainst += parsed.p1PointsFor;

    if (m.winnerId === m.participant1.id) {
      r1.won++;
      r1.points += 3;
      r2.lost++;
    } else if (m.winnerId === m.participant2.id) {
      r2.won++;
      r2.points += 3;
      r1.lost++;
    } else {
      r1.draws++;
      r2.draws++;
      r1.points++;
      r2.points++;
    }
  });

  let rows = Array.from(map.values());

  // ── Sort with full tiebreaker ──
  rows = tiebreakerSort(rows, matches, options?.tiebreakerMode ?? 'split', options?.football ?? false);

  // ── Detect unresolvable ties ──
  const ties: StandingRow[][] = [];
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    const group = [rows[i]];
    while (j < rows.length && rows[j].points === rows[i].points &&
      (options?.football
        ? rows[j].pointsFor - rows[j].pointsAgainst === rows[i].pointsFor - rows[i].pointsAgainst &&
          rows[j].pointsFor === rows[i].pointsFor
        : rows[j].setsWon - rows[j].setsLost === rows[i].setsWon - rows[i].setsLost &&
          rows[j].pointsFor - rows[j].pointsAgainst === rows[i].pointsFor - rows[i].pointsAgainst)) {
      group.push(rows[j]);
      j++;
    }
    if (group.length > 1) {
      for (const row of group) {
        row.tiebreak = options?.tiebreakerMode === 'playoff' ? 'playoff' : 'tied';
      }
      ties.push(group);
    }
    i = j;
  }

  return { standings: rows, ties };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BYE-SLOT DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * ─────────────────────────────────────────────────────────────
 *  Common helper — check whether a source match produced
 *  no winner (auto-BYE / walkover) for the given slot.
 * ─────────────────────────────────────────────────────────────
 */
function isSrcWinnerless(
  src: BracketMatch,
  targetMatchId: string,
): boolean {
  if (src.status !== 'COMPLETED') return false;

  const isLoserFeed = src.loserNextMatchId === targetMatchId;
  if (isLoserFeed) {
    // Loser feed: slot takes the loser — BYE if loser is absent
    const loserId =
      src.winnerId === src.participant1Id
        ? src.participant2Id
        : src.participant1Id;
    return loserId === null;
  }

  // Winner feed: slot takes the winner — BYE if winner is absent
  return src.winnerId === null;
}

/** Find a match in a given branch + round by its 0-based index in sorted order. */
function getMatchByIndex(
  branch: string,
  roundNumber: number,
  index: number,
  allMatches: BracketMatch[],
): BracketMatch | undefined {
  const pool = allMatches
    .filter(
      (m) =>
        m.bracketBranch === branch && m.roundNumber === roundNumber,
    )
    .sort((a, b) => a.matchOrder - b.matchOrder);
  return pool[index];
}

/**
 * ─────────────────────────────────────────────────────────────
 *  Slot-BYE logic for MAIN (single-elimination) branch
 * ─────────────────────────────────────────────────────────────
 *
 *  - Round 1 → always BYE (return undefined → caller returns true)
 *  - Otherwise → return the source match to check winnerless
 */
function isSlotByeMain(
  match: BracketMatch,
  slotIndex: 1 | 2,
  allMatches: BracketMatch[],
): { src: BracketMatch | undefined; immediateBye: boolean } {
  // Round 1 has no prior match → always BYE
  if (match.roundNumber === 1) return { src: undefined, immediateBye: true };

  const srcIndex = (match.matchOrder - 1) * 2 + (slotIndex - 1);
  return { src: getMatchByIndex('MAIN', match.roundNumber - 1, srcIndex, allMatches), immediateBye: false };
}

/**
 * ─────────────────────────────────────────────────────────────
 *  Slot-BYE logic for LOSERS (double-elimination) branch
 * ─────────────────────────────────────────────────────────────
 */
function isSlotByeLosers(
  match: BracketMatch,
  slotIndex: 1 | 2,
  allMatches: BracketMatch[],
): { src: BracketMatch | undefined; immediateBye: boolean } {
  // Round 1 losers get fed from MAIN round 1
  if (match.roundNumber === 1) {
    const srcIndex = (match.matchOrder - 1) * 2 + (slotIndex - 1);
    const winSrc = getMatchByIndex('MAIN', 1, srcIndex, allMatches);
    if (winSrc && winSrc.status === 'COMPLETED' && winSrc.isBye) {
      return { src: undefined, immediateBye: true };
    }
    return { src: undefined, immediateBye: false };
  }

  // Even round: slot-1 ← previous LOSERS round, slot-2 ← corresponding MAIN round
  if (match.roundNumber % 2 === 0) {
    const src = slotIndex === 1
      ? allMatches.find(
          (m) =>
            m.bracketBranch === 'LOSERS' &&
            m.roundNumber === match.roundNumber - 1 &&
            m.matchOrder === match.matchOrder,
        )
      : allMatches.find(
          (m) =>
            m.bracketBranch === 'MAIN' &&
            m.roundNumber === match.roundNumber / 2 + 1 &&
            m.matchOrder === match.matchOrder,
        );
    return { src, immediateBye: false };
  }

  // Odd round (≥3): same indexing as MAIN — get from previous LOSERS round
  const srcIndex = (match.matchOrder - 1) * 2 + (slotIndex - 1);
  return { src: getMatchByIndex('LOSERS', match.roundNumber - 1, srcIndex, allMatches), immediateBye: false };
}

/**
 * ─────────────────────────────────────────────────────────────
 *  Slot-BYE logic for GRAND_FINALS branch
 *
 *  Slot-1 receives the WINNER of the last MAIN round.
 *  Slot-2 receives the WINNER of the last LOSERS round.
 * ─────────────────────────────────────────────────────────────
 */
function isSlotByeGrandFinals(
  match: BracketMatch,
  slotIndex: 1 | 2,
  allMatches: BracketMatch[],
): { src: BracketMatch | undefined; immediateBye: boolean } {
  if (slotIndex === 1) {
    const mainMatches = allMatches.filter((m) => m.bracketBranch === 'MAIN');
    if (mainMatches.length === 0) return { src: undefined, immediateBye: false };
    const maxUbRound = Math.max(...mainMatches.map((m) => m.roundNumber));
    return { src: allMatches.find(
      (m) => m.bracketBranch === 'MAIN' && m.roundNumber === maxUbRound,
    ), immediateBye: false };
  }

  const losersMatches = allMatches.filter((m) => m.bracketBranch === 'LOSERS');
  if (losersMatches.length === 0) return { src: undefined, immediateBye: false };
  const maxLbRound = Math.max(...losersMatches.map((m) => m.roundNumber));
  return { src: allMatches.find(
    (m) => m.bracketBranch === 'LOSERS' && m.roundNumber === maxLbRound,
  ), immediateBye: false };
}

/**
 * Determine whether a given slot (participant-1 or -2) of a match
 * is currently empty because the previous-round source match ended
 * with no winner (auto-BYE or walkover).
 *
 * Supports MAIN (single-elim), LOSERS + GRAND_FINALS (double-elim).
 */
export function isSlotBye(
  match: BracketMatch,
  slotIndex: 1 | 2,
  allMatches: BracketMatch[],
): boolean {
  // Slot already filled → definitely not a BYE
  if (slotIndex === 1 && match.participant1) return false;
  if (slotIndex === 2 && match.participant2) return false;

  let result: { src: BracketMatch | undefined; immediateBye: boolean };

  switch (match.bracketBranch) {
    case 'MAIN':
      result = isSlotByeMain(match, slotIndex, allMatches);
      break;

    case 'LOSERS':
      result = isSlotByeLosers(match, slotIndex, allMatches);
      break;

    case 'GRAND_FINALS':
      result = isSlotByeGrandFinals(match, slotIndex, allMatches);
      break;

    default:
      // Unknown branch — conservative, treat as not BYE
      return false;
  }

  // Immediate BYE (round-1 MAIN, or LOSERS round-1 from a BYE feeder)
  if (result.immediateBye) return true;

  // No source match found → cannot determine, assume not BYE
  if (!result.src) return false;

  // Source exists — check if it finished without a winner
  return isSrcWinnerless(result.src, match.id);
}
