/**
 * tiebreaker — full-chain tiebreaker logic for Round Robin standings.
 *
 * Implements a 7-step chain (minitable resolved within equal-point groups):
 *   1. Points (match)
 *   2. H2H — points in matches between tied teams
 *   3. H2H — set difference
 *   4. H2H — point difference (parsed from scoreDetails)
 *   5. Total set difference
 *   6. Total point difference
 *   7. mode: 'split' (rank together) or 'playoff' (mark for playoff)
 *
 * "Minitable" approach: for each group of teams with equal primary stats,
 * recalc standings using only matches *between* those teams. This correctly
 * handles 3+ team circles where pairwise H2H is inconclusive.
 */

import type { BracketMatch } from '@/features/tournaments/api';
import type { StandingRow } from './types';
import { parseScoreDetails } from './types';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MINITABLE — standings limited to a subset of participants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Compute mini-standings using only matches whose both participants are in `participantIds`. */
function miniStandings(
  participantIds: Set<string>,
  allMatches: BracketMatch[],
): Map<string, { points: number; setsDiff: number; pointsDiff: number }> {
  const map = new Map<string, { points: number; setsWon: number; setsLost: number; ptsFor: number; ptsAgainst: number }>();

  for (const id of participantIds) {
    map.set(id, { points: 0, setsWon: 0, setsLost: 0, ptsFor: 0, ptsAgainst: 0 });
  }

  for (const m of allMatches) {
    if (m.isBye || m.status !== 'COMPLETED' || !m.participant1 || !m.participant2) continue;
    if (!participantIds.has(m.participant1.id) || !participantIds.has(m.participant2.id)) continue;

    const r1 = map.get(m.participant1.id)!;
    const r2 = map.get(m.participant2.id)!;

    r1.setsWon += m.p1SetsWon;
    r1.setsLost += m.p2SetsWon;
    r2.setsWon += m.p2SetsWon;
    r2.setsLost += m.p1SetsWon;

    const parsed = parseScoreDetails(m.scoreDetails as Record<string, unknown> | undefined | null);
    r1.ptsFor += parsed.p1PointsFor;
    r1.ptsAgainst += parsed.p2PointsFor;
    r2.ptsFor += parsed.p2PointsFor;
    r2.ptsAgainst += parsed.p1PointsFor;

    if (m.winnerId === m.participant1.id) {
      r1.points += 3;
    } else if (m.winnerId === m.participant2.id) {
      r2.points += 3;
    } else {
      r1.points += 1;
      r2.points += 1;
    }
  }

  const result = new Map<string, { points: number; setsDiff: number; pointsDiff: number }>();
  for (const [id, s] of map) {
    result.set(id, {
      points: s.points,
      setsDiff: s.setsWon - s.setsLost,
      pointsDiff: s.ptsFor - s.ptsAgainst,
    });
  }
  return result;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORE SORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Sort `rows` in-place using the full tiebreaker chain.
 * Groups of teams with identical primary stats (points, sets diff, points diff)
 * are resolved via minitable (H2H) first; if the minitable is also tied,
 * the fallback is total-set-diff → total-point-diff, and finally
 * the configured `mode`.
 */
export function tiebreakerSort(
  rows: StandingRow[],
  allMatches: BracketMatch[],
  mode: 'split' | 'playoff' = 'split',
): StandingRow[] {
  // ── Step 1: primary sort by points ──
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    // Provisional set-diff sort so we can detect groups
    const diffA = a.setsWon - a.setsLost;
    const diffB = b.setsWon - b.setsLost;
    if (diffB !== diffA) return diffB - diffA;
    const pdA = a.pointsFor - a.pointsAgainst;
    const pdB = b.pointsFor - b.pointsAgainst;
    if (pdB !== pdA) return pdB - pdA;
    return 0;
  });

  // ── Step 2: split into groups of identical primary stats ──
  const groups: StandingRow[][] = [];
  let i = 0;
  while (i < rows.length) {
    const group = [rows[i]];
    let j = i + 1;
    while (
      j < rows.length &&
      rows[j].points === rows[i].points &&
      rows[j].setsWon - rows[j].setsLost === rows[i].setsWon - rows[i].setsLost &&
      rows[j].pointsFor - rows[j].pointsAgainst === rows[i].pointsFor - rows[i].pointsAgainst
    ) {
      group.push(rows[j]);
      j++;
    }
    groups.push(group);
    i = j;
  }

  // ── Step 3: resolve each group ──
  const resolved: StandingRow[] = [];

  for (const group of groups) {
    if (group.length <= 1) {
      // Single team — straightforward
      resolved.push(group[0]);
      continue;
    }

    // Multi-team tie — use minitable
    const tiedIds = new Set(group.map((r) => r.participantId));
    const mini = miniStandings(tiedIds, allMatches);

    // Sort the group using minitable first, then fallback
    group.sort((a, b) => {
      const ma = mini.get(a.participantId);
      const mb = mini.get(b.participantId);

      if (ma && mb) {
        // 2. H2H — mini points
        if (mb.points !== ma.points) return mb.points - ma.points;
        // 3. H2H — set diff
        if (mb.setsDiff !== ma.setsDiff) return mb.setsDiff - ma.setsDiff;
        // 4. H2H — point diff
        if (mb.pointsDiff !== ma.pointsDiff) return mb.pointsDiff - ma.pointsDiff;
      }

      // 5. Total set diff
      const setDiffA = a.setsWon - a.setsLost;
      const setDiffB = b.setsWon - b.setsLost;
      if (setDiffB !== setDiffA) return setDiffB - setDiffA;

      // 6. Total point diff
      const pdA = a.pointsFor - a.pointsAgainst;
      const pdB = b.pointsFor - b.pointsAgainst;
      if (pdB !== pdA) return pdB - pdA;

      // 7. Tiebreaker mode
      // 'split'  → remain equal (no further sort)
      // 'playoff' → mark but keep sorted by seed (lower=better)
      if (mode === 'split') return 0;

      // For playoff mode: lower seed number wins
      const seedA = a.seed ?? 999;
      const seedB = b.seed ?? 999;
      return seedA - seedB;
    });

    resolved.push(...group);
  }

  return resolved;
}
