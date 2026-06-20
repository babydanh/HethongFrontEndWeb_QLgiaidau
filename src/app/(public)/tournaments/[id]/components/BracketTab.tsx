'use client';

import { useEffect, useState } from 'react';
import { Tournament, tournamentsApi, BracketStage, BracketMatch } from '@/features/tournaments/api';
import { Trophy, Play, CheckCircle, Info, Clock, Loader2 } from 'lucide-react';
import React from 'react';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYOUT CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CARD_W = 228;          // match card width (px)
const CARD_H_PUBLIC = 92;    // compact card (public view)
const CARD_H_ORGANIZER = 164; // taller card (organizer – shows schedule info + button)
const BASE_SLOT = 136;       // slot height for the densest round
const COL_GAP = 48;          // horizontal gap between round columns

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export type OnScheduleMatch = (match: BracketMatch) => void;
interface Props {
  tournament: Tournament;
  tournamentId?: string;
  divisionId?: string;
  onScheduleMatch?: OnScheduleMatch;
}
interface MatchPos { x: number; y: number; }
interface StandingRow {
  participantId: string; teamName: string;
  played: number; won: number; lost: number;
  setsWon: number; setsLost: number; points: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MATH HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Group matches by roundNumber, filter empty BYEs, sort by matchOrder */
function buildMatchesByRound(matches: BracketMatch[]): Record<number, BracketMatch[]> {
  const map: Record<number, BracketMatch[]> = {};
  matches.forEach((m) => {
    if (m.isBye && !m.participant1 && !m.participant2) return;
    if (!map[m.roundNumber]) map[m.roundNumber] = [];
    map[m.roundNumber].push(m);
  });
  Object.values(map).forEach((arr) => arr.sort((a, b) => a.matchOrder - b.matchOrder));
  return map;
}

/**
 * Build a posMap: matchId → {x, y} where y is the vertical CENTER of the card.
 *
 * Slot height scales so that all rounds occupy the same total height:
 *   slotH(ri) = BASE_SLOT * (firstRoundCount / roundCount)
 *
 * This correctly handles both standard brackets (slots double each round) and
 * lower brackets (two consecutive rounds with the same match count).
 */
function buildPosMap(
  byRound: Record<number, BracketMatch[]>,
  sortedRounds: number[],
  xOffset = 0,
  yOffset = 0,
  cardH = CARD_H_PUBLIC,
): Map<string, MatchPos> {
  const posMap = new Map<string, MatchPos>();
  if (!sortedRounds.length) return posMap;

  const ratio = cardH / CARD_H_PUBLIC;
  const firstCount = byRound[sortedRounds[0]]?.length || 1;
  sortedRounds.forEach((roundNum, ri) => {
    const roundCount = byRound[roundNum]?.length || 1;
    const slotH = BASE_SLOT * ratio * (firstCount / roundCount);
    const colX = xOffset + ri * (CARD_W + COL_GAP);
    byRound[roundNum]?.forEach((match, mi) => {
      posMap.set(match.id, {
        x: colX,
        y: yOffset + mi * slotH + slotH / 2,
      });
    });
  });
  return posMap;
}

/** Total vertical height of a bracket = firstRound matches × BASE_SLOT */
function bracketHeight(byRound: Record<number, BracketMatch[]>, sortedRounds: number[], cardH: number): number {
  if (!sortedRounds.length) return 0;
  const ratio = cardH / CARD_H_PUBLIC;
  return (byRound[sortedRounds[0]]?.length ?? 0) * BASE_SLOT * ratio;
}

/** Total horizontal width of N round columns */
function bracketWidth(numRounds: number): number {
  if (numRounds <= 0) return 0;
  return numRounds * CARD_W + (numRounds - 1) * COL_GAP;
}

/** Round label from right (0 = final, 1 = semi, …) */
function getRoundLabel(ri: number, total: number, prefix = ''): string {
  const fromEnd = total - 1 - ri;
  if (fromEnd === 0) return prefix ? `${prefix} Chung kết` : 'Chung kết';
  if (fromEnd === 1) return prefix ? `${prefix} Bán kết` : 'Bán kết';
  if (fromEnd === 2) return prefix ? `${prefix} Tứ kết` : 'Tứ kết';
  if (fromEnd === 3) return prefix ? `${prefix} Vòng 16` : 'Vòng 16';
  return `${prefix ? prefix + ' ' : ''}Vòng ${ri + 1}`;
}

function calculateStandings(matches: BracketMatch[]): StandingRow[] {
  const map = new Map<string, StandingRow>();
  const getRow = (id: string, name: string): StandingRow => {
    if (!map.has(id)) {
      map.set(id, { participantId: id, teamName: name, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, points: 0 });
    }
    return map.get(id)!;
  };
  matches.forEach((m) => {
    if (m.participant1) getRow(m.participant1.id, m.participant1.teamName);
    if (m.participant2) getRow(m.participant2.id, m.participant2.teamName);
  });
  matches.forEach((m) => {
    if (m.isBye || m.status !== 'COMPLETED' || !m.participant1 || !m.participant2) return;
    const r1 = getRow(m.participant1.id, m.participant1.teamName);
    const r2 = getRow(m.participant2.id, m.participant2.teamName);
    r1.played++; r2.played++;
    r1.setsWon += m.p1SetsWon; r1.setsLost += m.p2SetsWon;
    r2.setsWon += m.p2SetsWon; r2.setsLost += m.p1SetsWon;
    if (m.winnerId === m.participant1.id) { r1.won++; r1.points += 3; r2.lost++; }
    else if (m.winnerId === m.participant2.id) { r2.won++; r2.points += 3; r1.lost++; }
    else { r1.points++; r2.points++; }
  });
  return Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost);
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MATCH CARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function MatchCard({
  match,
  onScheduleMatch,
}: {
  match: BracketMatch;
  onScheduleMatch?: OnScheduleMatch;
}) {
  const done = match.status === 'COMPLETED';
  const live = match.status === 'ONGOING';
  const p1Won = done && match.winnerId != null && match.winnerId === match.participant1?.id;
  const p2Won = done && match.winnerId != null && match.winnerId === match.participant2?.id;
  const isOrganizer = !!onScheduleMatch;
  const cardH = isOrganizer ? CARD_H_ORGANIZER : CARD_H_PUBLIC;

  const Row = ({
    p, won, sets, isByeSlot,
  }: { p: BracketMatch['participant1']; won: boolean; sets: number; isByeSlot?: boolean }) => (
    <div className={`flex items-center justify-between px-3 py-2 flex-1 ${won ? 'bg-emerald-50/80' : 'bg-white'}`}>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {p?.seed != null && (
          <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded font-bold flex-shrink-0 leading-4">
            {p.seed}
          </span>
        )}
        <span className={`text-xs truncate ${
          won ? 'font-bold text-emerald-800' :
          (!p || isByeSlot) ? 'italic text-slate-300' :
          'font-medium text-slate-700'
        }`}>
          {p?.teamName ?? (isByeSlot ? 'BYE' : 'TBD')}
        </span>
      </div>
      <div className="flex items-center gap-1 ml-1 flex-shrink-0">
        {won && <Trophy className="w-3 h-3 text-amber-400" />}
        <span className={`text-sm font-black w-5 text-center ${won ? 'text-emerald-700' : 'text-slate-400'}`}>
          {(done || live) && p && !isByeSlot ? sets : '—'}
        </span>
      </div>
    </div>
  );

  return (
    <div
      style={{ width: CARD_W, height: cardH }}
      className={`rounded-xl overflow-hidden border flex flex-col shadow-sm transition-all duration-150 hover:shadow-md hover:-translate-y-px ${
        live ? 'border-blue-400 ring-2 ring-blue-400/25 shadow-blue-100' : 'border-slate-200'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-2.5 py-1 border-b text-[10px] font-bold flex-shrink-0 ${
        live ? 'bg-blue-50 border-blue-200' : 'bg-slate-50/80 border-slate-100'
      }`}>
        <span className="text-slate-400 font-semibold">#{match.matchOrder}</span>
        {live ? (
          <span className="flex items-center gap-0.5 text-blue-600 font-extrabold animate-pulse">
            <Play className="w-2.5 h-2.5 fill-blue-600" /> LIVE
          </span>
        ) : done ? (
          <span className="flex items-center gap-1 text-emerald-500 font-semibold">
            <CheckCircle className="w-3 h-3" /> Kết thúc
          </span>
        ) : (
          <span className="flex items-center gap-1 text-slate-300 font-semibold">
            <Clock className="w-2.5 h-2.5" /> Chờ đấu
          </span>
        )}
      </div>

      {/* Participants */}
      <div className="flex flex-col divide-y divide-slate-100" style={{ flex: '0 0 auto' }}>
        <Row p={match.participant1} won={p1Won} sets={match.p1SetsWon}
          isByeSlot={match.isBye && !match.participant1} />
        <Row p={match.participant2} won={p2Won} sets={match.p2SetsWon}
          isByeSlot={match.isBye && !match.participant2} />
      </div>

      {/* Organizer: schedule info + button */}
      {isOrganizer && !match.isBye && (
        <div className="flex flex-col flex-1 justify-between px-2.5 pb-2 pt-1.5 bg-slate-50/60 border-t border-slate-100">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[9px] text-slate-400 font-semibold">
              <Clock className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{match.scheduledAt ? new Date(match.scheduledAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Chưa xếp giờ'}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-400 font-semibold">
              <Info className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{match.courtName || 'Chưa xếp sân'}</span>
            </div>
          </div>
          {!done && (
            <button
              onClick={() => onScheduleMatch(match)}
              className="w-full text-[10px] font-bold text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 rounded-lg py-1 transition-colors cursor-pointer"
            >
              Xếp Sân & Giờ
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SVG CONNECTOR LINES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Draws bracket connector lines between matches using nextMatchId links.
 *
 * For each target match T, collects all feeders F1, F2 that have nextMatchId === T.id:
 *   - Horizontal line from each feeder's right edge → midX
 *   - Vertical line spanning min/max Y of all feeders
 *   - Horizontal line from midX (at T.y) → T's left edge
 *
 * midX = midpoint between the rightmost feeder's right edge and T's left edge.
 * This ensures the vertical bracket line is always positioned correctly even when
 * feeders come from different column positions (e.g. UB final → GF and LB final → GF).
 */
function Connectors({
  allMatches,
  posMap,
}: {
  allMatches: BracketMatch[];
  posMap: Map<string, MatchPos>;
}) {
  // Build: nextMatchId → [feeder matchIds]
  const groups = new Map<string, string[]>();
  allMatches.forEach((m) => {
    if (!m.nextMatchId) return;
    if (!groups.has(m.nextMatchId)) groups.set(m.nextMatchId, []);
    groups.get(m.nextMatchId)!.push(m.id);
  });

  return (
    <>
      {Array.from(groups.entries()).map(([nextId, feederIds]) => {
        const nextPos = posMap.get(nextId);
        if (!nextPos) return null;

        const feeders = feederIds
          .map((id) => posMap.get(id))
          .filter((p): p is MatchPos => !!p);
        if (!feeders.length) return null;

        // midX: between rightmost feeder's right edge and target's left edge
        const maxFeederRight = Math.max(...feeders.map((p) => p.x + CARD_W));
        const midX = (maxFeederRight + nextPos.x) / 2;

        const ys = feeders.map((p) => p.y);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const allDone = feederIds.every(
          (id) => allMatches.find((m) => m.id === id)?.status === 'COMPLETED',
        );

        const stroke = allDone ? '#10b981' : '#cbd5e1';
        const sw = allDone ? 2 : 1.5;
        const opacity = allDone ? 0.85 : 0.45;

        return (
          <g
            key={nextId}
            stroke={stroke}
            strokeWidth={sw}
            fill="none"
            opacity={opacity}
            strokeLinecap="round"
          >
            {/* Horizontal from each feeder's right edge to midX */}
            {feeders.map((pos, i) => (
              <line key={i} x1={pos.x + CARD_W} y1={pos.y} x2={midX} y2={pos.y} />
            ))}
            {/* Vertical spanning all feeders */}
            {feeders.length > 1 && (
              <line x1={midX} y1={minY} x2={midX} y2={maxY} />
            )}
            {/* Horizontal to target match's left edge */}
            <line x1={midX} y1={nextPos.y} x2={nextPos.x} y2={nextPos.y} />
          </g>
        );
      })}
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROUND HEADER ROW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function RoundHeaders({
  sortedRounds,
  byRound,
  total,
  badgeClass,
  prefix,
  extraColumn,
}: {
  sortedRounds: number[];
  byRound: Record<number, BracketMatch[]>;
  total: number;
  badgeClass: string;
  prefix?: string;
  extraColumn?: React.ReactNode;
}) {
  return (
    <div className="flex mb-4 flex-shrink-0" style={{ gap: COL_GAP }}>
      {sortedRounds.map((_, ri) => (
        <div key={ri} style={{ width: CARD_W, flexShrink: 0 }} className="text-center">
          <span className={`inline-block text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border ${badgeClass}`}>
            {getRoundLabel(ri, total, prefix)}
          </span>
          <div className="text-[9px] text-slate-400 mt-1 font-semibold">
            {byRound[sortedRounds[ri]]?.length ?? 0} trận
          </div>
        </div>
      ))}
      {extraColumn}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SINGLE ELIMINATION VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function SingleElimView({
  matches,
  onScheduleMatch,
}: {
  matches: BracketMatch[];
  onScheduleMatch?: OnScheduleMatch;
}) {
  const cardH = onScheduleMatch ? CARD_H_ORGANIZER : CARD_H_PUBLIC;
  const byRound = buildMatchesByRound(matches);
  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);
  if (!rounds.length) return null;

  const posMap = buildPosMap(byRound, rounds, 0, 0, cardH);
  const svgH = bracketHeight(byRound, rounds, cardH);
  const svgW = bracketWidth(rounds.length) + COL_GAP;
  const filtered = matches.filter((m) => !(m.isBye && !m.participant1 && !m.participant2));

  return (
    <div className="overflow-x-auto pb-4 -mx-1 px-1">
      <RoundHeaders
        sortedRounds={rounds}
        byRound={byRound}
        total={rounds.length}
        badgeClass="bg-slate-100 text-slate-600 border-slate-200"
      />
      <div className="relative select-none" style={{ width: svgW, height: svgH }}>
        <svg className="absolute inset-0 pointer-events-none" width={svgW} height={svgH}>
          <Connectors allMatches={filtered} posMap={posMap} />
        </svg>
        {filtered.map((match) => {
          const pos = posMap.get(match.id);
          if (!pos) return null;
          return (
            <div key={match.id} className="absolute" style={{ left: pos.x, top: pos.y - cardH / 2 }}>
              <MatchCard match={match} onScheduleMatch={onScheduleMatch} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOUBLE ELIMINATION VIEW
// Upper bracket (top) + Lower bracket (bottom) + Grand Final (right)
// Both UB final and LB final connect via nextMatchId into the Grand Final.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function DoubleElimView({
  upperMatches,
  lowerMatches,
  gfMatches,
  onScheduleMatch,
}: {
  upperMatches: BracketMatch[];
  lowerMatches: BracketMatch[];
  gfMatches: BracketMatch[];
  onScheduleMatch?: OnScheduleMatch;
}) {
  const cardH = onScheduleMatch ? CARD_H_ORGANIZER : CARD_H_PUBLIC;
  // ── Build round maps ──
  const ubByRound = buildMatchesByRound(upperMatches);
  const lbByRound = buildMatchesByRound(lowerMatches);
  const ubRounds = Object.keys(ubByRound).map(Number).sort((a, b) => a - b);
  const lbRounds = Object.keys(lbByRound).map(Number).sort((a, b) => a - b);

  const ubH = bracketHeight(ubByRound, ubRounds, cardH);
  const lbH = bracketHeight(lbByRound, lbRounds, cardH);

  // ── Canvas Y layout ──
  const LB_SECTION_TOP = ubH + 16;
  const LB_LABEL_TOP   = ubH + 24;
  const LB_HEADER_TOP  = ubH + 44;
  const LB_MATCHES_TOP = ubH + 76;

  // ── Position maps ──
  const ubPosMap = buildPosMap(ubByRound, ubRounds, 0, 0, cardH);
  const lbPosMap = buildPosMap(lbByRound, lbRounds, 0, LB_MATCHES_TOP, cardH);

  // ── Grand Final X: to the right of the wider bracket ──
  const ubW = bracketWidth(ubRounds.length);
  const lbW = bracketWidth(lbRounds.length);
  const GF_X = Math.max(ubW, lbW) + COL_GAP * 2;

  // ── GF vertical center: midpoint between UB final and LB final ──
  const ubFinal = ubRounds.length > 0
    ? ubByRound[ubRounds[ubRounds.length - 1]]?.[0]
    : null;
  const lbFinal = lbRounds.length > 0
    ? lbByRound[lbRounds[lbRounds.length - 1]]?.[0]
    : null;

  const ubFinalPos = ubFinal ? ubPosMap.get(ubFinal.id) : null;
  const lbFinalPos = lbFinal ? lbPosMap.get(lbFinal.id) : null;

  const gfCenterY = ((ubFinalPos?.y ?? ubH / 2) + (lbFinalPos?.y ?? LB_MATCHES_TOP + lbH / 2)) / 2;

  // ── GF position map ──
  const gfPosMap = new Map<string, MatchPos>();
  const gfSorted = [...gfMatches].sort((a, b) => a.matchOrder - b.matchOrder);
  gfSorted.forEach((m, i) => {
    const offset = (i - (gfSorted.length - 1) / 2) * (cardH + 16);
    gfPosMap.set(m.id, { x: GF_X, y: gfCenterY + offset });
  });

  // ── Merged posMap for connectors ──
  const allPosMap = new Map([...ubPosMap, ...lbPosMap, ...gfPosMap]);

  // ── SVG canvas dimensions ──
  const svgW = GF_X + CARD_W + COL_GAP;
  const svgH = LB_MATCHES_TOP + lbH + 16;

  const ubFiltered = upperMatches.filter((m) => !(m.isBye && !m.participant1 && !m.participant2));
  const lbFiltered = lowerMatches.filter((m) => !(m.isBye && !m.participant1 && !m.participant2));
  const allForConnectors = [...ubFiltered, ...lbFiltered, ...gfSorted];

  return (
    <div className="overflow-x-auto pb-4 -mx-1 px-1">
      {/* UB section label + round headers (above canvas) */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-3.5 bg-indigo-500 rounded-full" />
        <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest">
          Nhánh Thắng — Winners Bracket
        </span>
      </div>
      <RoundHeaders
        sortedRounds={ubRounds}
        byRound={ubByRound}
        total={ubRounds.length}
        badgeClass="bg-indigo-50 text-indigo-600 border-indigo-200"
      />

      {/* Main canvas */}
      <div className="relative select-none" style={{ width: svgW, height: svgH }}>

        {/* ── Separator line ── */}
        <div
          className="absolute flex items-center gap-3"
          style={{ top: LB_SECTION_TOP, left: 0, right: 0 }}
        >
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* ── LB section label ── */}
        <div
          className="absolute flex items-center gap-2"
          style={{ top: LB_LABEL_TOP, left: 0 }}
        >
          <div className="w-1 h-3.5 bg-rose-500 rounded-full" />
          <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest">
            Nhánh Thua — Losers Bracket
          </span>
        </div>

        {/* ── LB round headers ── */}
        <div
          className="absolute flex"
          style={{ top: LB_HEADER_TOP, left: 0, gap: COL_GAP }}
        >
          {lbRounds.map((_, ri) => (
            <div key={ri} style={{ width: CARD_W, flexShrink: 0 }} className="text-center">
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest bg-rose-50 text-rose-500 px-2.5 py-1 rounded-full border border-rose-200">
                {getRoundLabel(ri, lbRounds.length, 'LB')}
              </span>
            </div>
          ))}
        </div>

        {/* ── GF column label (inside canvas, right side) ── */}
        {gfSorted.length > 0 && (
          <div
            className="absolute text-center"
            style={{
              left: GF_X,
              width: CARD_W,
              top: Math.min(gfCenterY - cardH / 2 - 28, LB_HEADER_TOP),
            }}
          >
            <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-300">
              🏆 Grand Final
            </span>
          </div>
        )}

        {/* ── SVG connector overlay ── */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={svgW}
          height={svgH}
          style={{ overflow: 'visible' }}
        >
          <Connectors allMatches={allForConnectors} posMap={allPosMap} />
        </svg>

        {/* ── UB match cards ── */}
        {ubFiltered.map((match) => {
          const pos = allPosMap.get(match.id);
          if (!pos) return null;
          return (
            <div key={match.id} className="absolute" style={{ left: pos.x, top: pos.y - cardH / 2 }}>
              <MatchCard match={match} onScheduleMatch={onScheduleMatch} />
            </div>
          );
        })}

        {/* ── LB match cards ── */}
        {lbFiltered.map((match) => {
          const pos = allPosMap.get(match.id);
          if (!pos) return null;
          return (
            <div key={match.id} className="absolute" style={{ left: pos.x, top: pos.y - cardH / 2 }}>
              <MatchCard match={match} onScheduleMatch={onScheduleMatch} />
            </div>
          );
        })}

        {/* ── Grand Final match cards ── */}
        {gfSorted.map((match) => {
          const pos = allPosMap.get(match.id);
          if (!pos) return null;
          return (
            <div key={match.id} className="absolute" style={{ left: pos.x, top: pos.y - cardH / 2 }}>
              <MatchCard match={match} onScheduleMatch={onScheduleMatch} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROUND ROBIN VIEW  — standings table + match list
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function RoundRobinView({ matches }: { matches: BracketMatch[] }) {
  const standings = calculateStandings(matches);

  const byRound: Record<number, BracketMatch[]> = {};
  matches.forEach((m) => {
    if (!byRound[m.roundNumber]) byRound[m.roundNumber] = [];
    byRound[m.roundNumber].push(m);
  });
  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-8">
      {/* Standings table */}
      <div>
        <h5 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /> Bảng xếp hạng
        </h5>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
              <tr>
                <th className="px-4 py-3 text-center w-10">#</th>
                <th className="px-4 py-3 text-left">Đội</th>
                <th className="px-4 py-3 text-center">Trận</th>
                <th className="px-4 py-3 text-center text-emerald-600">Thắng</th>
                <th className="px-4 py-3 text-center text-rose-500">Thua</th>
                <th className="px-4 py-3 text-center">Set T/T</th>
                <th className="px-4 py-3 text-center text-blue-600 bg-blue-50/50">Điểm</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, idx) => (
                <tr key={row.participantId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 text-center">
                    {idx === 0 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-100 rounded-full">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      </span>
                    ) : (
                      <span className="text-slate-400 font-bold text-xs">{idx + 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.teamName}</td>
                  <td className="px-4 py-3 text-center text-slate-500 font-medium">{row.played}</td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-600">{row.won}</td>
                  <td className="px-4 py-3 text-center font-bold text-rose-400">{row.lost}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{row.setsWon}–{row.setsLost}</td>
                  <td className="px-4 py-3 text-center font-black text-blue-700 bg-blue-50/20">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Match schedule by round */}
      <div>
        <h5 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" /> Lịch trận đấu
        </h5>
        <div className="flex flex-col gap-5">
          {rounds.map((rn) => (
            <div key={rn}>
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <div className="h-px flex-1 bg-slate-100" />
                Vòng {rn}
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="flex flex-col gap-2">
                {byRound[rn].filter((m) => !m.isBye).map((m) => {
                  const done = m.status === 'COMPLETED';
                  const live = m.status === 'ONGOING';
                  return (
                    <div key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium ${
                      live ? 'border-blue-300 bg-blue-50' :
                      done ? 'border-emerald-200 bg-emerald-50/30' :
                      'border-slate-200 bg-white'
                    }`}>
                      {live && (
                        <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-extrabold text-blue-600 animate-pulse">
                          <Play className="w-2.5 h-2.5 fill-blue-600" /> LIVE
                        </span>
                      )}
                      <span className={`flex-1 truncate ${m.winnerId === m.participant1?.id ? 'font-bold text-emerald-800' : 'text-slate-700'}`}>
                        {m.participant1?.teamName ?? 'TBD'}
                      </span>
                      <span className="font-black text-slate-400 text-xs px-2 flex-shrink-0">
                        {done || live ? `${m.p1SetsWon} – ${m.p2SetsWon}` : 'vs'}
                      </span>
                      <span className={`flex-1 truncate text-right ${m.winnerId === m.participant2?.id ? 'font-bold text-emerald-800' : 'text-slate-700'}`}>
                        {m.participant2?.teamName ?? 'TBD'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GROUP VIEW — dispatches to the right bracket renderer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Recognized bracketBranch values for DE classification
const UPPER_SET = new Set(['WINNER', 'WINNERS', 'UPPER', 'W']);
const LOWER_SET = new Set(['LOSER', 'LOSERS', 'LOWER', 'L']);

function GroupView({
  group,
  stageType,
  onScheduleMatch,
}: {
  group: { id: string; name: string; matches: BracketMatch[] };
  stageType: string;
  onScheduleMatch?: OnScheduleMatch;
}) {
  const { matches } = group;

  if (!matches.length) {
    return (
      <div className="text-center py-10 text-slate-400 italic text-sm border border-dashed border-slate-200 rounded-xl">
        Chưa có trận đấu nào trong bảng {group.name}.
      </div>
    );
  }

  if (stageType === 'ROUND_ROBIN') {
    return <RoundRobinView matches={matches} />;
  }

  if (stageType === 'DOUBLE_ELIMINATION') {
    const upper = matches.filter((m) => UPPER_SET.has((m.bracketBranch ?? '').toUpperCase()));
    const lower = matches.filter((m) => LOWER_SET.has((m.bracketBranch ?? '').toUpperCase()));
    const gf = matches.filter((m) => !upper.includes(m) && !lower.includes(m));

    if (upper.length > 0 || lower.length > 0) {
      return <DoubleElimView upperMatches={upper} lowerMatches={lower} gfMatches={gf} onScheduleMatch={onScheduleMatch} />;
    }
  }

  // Default → Single Elimination (includes SINGLE_ELIMINATION fallback)
  return <SingleElimView matches={matches} onScheduleMatch={onScheduleMatch} />;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN BRACKET TAB COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function BracketTab({ tournament, tournamentId, divisionId, onScheduleMatch }: Props) {
  const effectiveTournamentId = tournamentId ?? tournament.id;
  const [stages, setStages] = useState<BracketStage[]>([]);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBracket = async () => {
      setIsLoading(true);
      try {
        const res = await tournamentsApi.getTournamentBracket(effectiveTournamentId, divisionId);
        if (res.data?.stages) {
          setStages(res.data.stages);
          setActiveStageId(res.data.stages[0]?.id ?? null);
        }
      } catch (err) {
        console.error('Failed to fetch bracket:', { tournamentId: effectiveTournamentId, divisionId }, err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBracket();
  }, [divisionId, effectiveTournamentId]);

  const activeStage = stages.find((s) => s.id === activeStageId);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300 mb-3" />
        <p className="text-sm text-slate-400 font-medium">Đang tải sơ đồ thi đấu...</p>
      </div>
    );
  }

  // ── Empty ──
  if (!stages.length) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
          <Info className="w-3.5 h-3.5" />
          <span>Phân hạng: <strong className="text-slate-600">{tournament.name}</strong></span>
          {tournament.genderRestriction && (
            <span className="text-slate-300">• {tournament.genderRestriction}</span>
          )}
        </div>
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-200 rounded-2xl">
          <Trophy className="w-12 h-12 text-slate-200 mb-3" />
          <h4 className="font-bold text-slate-600 mb-1">Chưa có nhánh đấu</h4>
          <p className="text-slate-400 text-sm text-center max-w-xs">
            Nhánh đấu sẽ xuất hiện sau khi Ban tổ chức hoàn tất danh sách đăng ký.
          </p>
        </div>
      </div>
    );
  }

  // ── Main ──
  return (
    <div className="flex flex-col gap-5">
      {/* Division info bar */}
      <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold pb-2 border-b border-slate-100">
        <Info className="w-3.5 h-3.5" />
        <span>Phân hạng: <strong className="text-slate-700">{tournament.name}</strong></span>
        {tournament.genderRestriction && (
          <span className="text-slate-300">• {tournament.genderRestriction}</span>
        )}
      </div>

      {/* Stage tabs */}
      {stages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {stages.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveStageId(s.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                activeStageId === s.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Active stage content */}
      {activeStage && (
        <div className="flex flex-col gap-8">
          {/* Stage header */}
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">{activeStage.name}</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Thể thức:{' '}
              {activeStage.type === 'SINGLE_ELIMINATION' ? 'Loại trực tiếp' :
               activeStage.type === 'DOUBLE_ELIMINATION' ? 'Loại kép (Double Elimination)' :
               activeStage.type === 'ROUND_ROBIN' ? 'Vòng tròn tính điểm' :
               activeStage.type}
            </p>
          </div>

          {/* Groups */}
          {activeStage.groups.map((group) => (
            <div key={group.id}>
              {activeStage.groups.length > 1 && (
                <h4 className="font-bold text-slate-700 text-sm border-l-4 border-blue-500 pl-3 mb-4">
                  {group.name}
                </h4>
              )}
              <GroupView group={group} stageType={activeStage.type} onScheduleMatch={onScheduleMatch} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
