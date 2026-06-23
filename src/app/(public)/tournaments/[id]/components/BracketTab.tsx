'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Tournament, tournamentsApi, BracketStage, BracketMatch } from '@/features/tournaments/api';
import { Trophy, Play, CheckCircle, Info, Clock, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import React from 'react';
import { createRoot } from 'react-dom/client';
// @ts-ignore
import { createBracket } from 'bracketry';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYOUT CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CARD_W = 228;          // match card width (px)
const CARD_H_PUBLIC = 132;   // compact card (public view – shows schedule/venue info + set scores)
const CARD_H_ORGANIZER = 172; // taller card (organizer – shows schedule info + set scores + button)
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
interface ScoreDetailsSet {
  team1Score?: number | string | null;
  team2Score?: number | string | null;
}

interface ScoreDetailsShape {
  sets?: ScoreDetailsSet[];
  [key: string]: unknown;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MATH & LAYOUT HELPERS
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

function MatchCardRow({
  p, won, sets, isByeSlot, done, live, setScores = []
}: {
  p: BracketMatch['participant1'];
  won: boolean;
  sets: number;
  isByeSlot?: boolean;
  done: boolean;
  live: boolean;
  setScores?: string[];
}) {
  return (
    <div className={`flex items-center justify-between px-3 py-1.5 flex-1 ${won ? 'bg-emerald-50/90 border-l-4 border-emerald-500' : 'bg-white'}`}>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {p?.seed != null && (
          <span className="text-[9px] bg-slate-200 text-slate-700 px-1 rounded font-extrabold flex-shrink-0 leading-4">
            {p.seed}
          </span>
        )}
        <div className="flex flex-col min-w-0">
          <span className={`text-xs truncate ${
            won ? 'font-black text-emerald-950' :
            (!p || isByeSlot) ? 'italic text-slate-400 font-semibold' :
            'font-bold text-slate-800'
          }`}>
            {p?.teamName ?? (isByeSlot ? 'BYE' : 'TBD')}
          </span>
          {setScores.length > 0 && (
            <div className="flex items-center gap-0.5 mt-0.5">
              {setScores.map((score, idx) => (
                <span key={idx} className="text-[8px] text-slate-650 bg-slate-200 px-1 rounded font-black">
                  {score}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 ml-1 flex-shrink-0">
        {won && <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-300" />}
        <span className={`text-sm font-black w-5 text-center ${won ? 'text-emerald-800' : 'text-slate-500'}`}>
          {(done || live) && p && !isByeSlot ? sets : '—'}
        </span>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MATCH CARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function MatchCard({
  match,
  onScheduleMatch,
  isP1Bye = false,
  isP2Bye = false,
}: {
  match: BracketMatch;
  onScheduleMatch?: OnScheduleMatch;
  isP1Bye?: boolean;
  isP2Bye?: boolean;
}) {
  const done = match.status === 'COMPLETED';
  const live = match.status === 'ONGOING';
  const p1Won = done && match.winnerId != null && match.winnerId === match.participant1?.id;
  const p2Won = done && match.winnerId != null && match.winnerId === match.participant2?.id;
  const isOrganizer = !!onScheduleMatch;
  const cardH = isOrganizer ? CARD_H_ORGANIZER : CARD_H_PUBLIC;

  // Parse set scores
  const parseSetScores = (scoreDetails: unknown) => {
    if (!scoreDetails || typeof scoreDetails !== 'object') return { p1: [], p2: [] };
    const p1Scores: string[] = [];
    const p2Scores: string[] = [];
    const details = scoreDetails as ScoreDetailsShape;

    // Format 1: { sets: [{ team1Score, team2Score, isFinished }, ...] }
    if (Array.isArray(details.sets)) {
      details.sets.forEach((set) => {
        if (set && typeof set === 'object') {
          p1Scores.push(String(set.team1Score ?? 0));
          p2Scores.push(String(set.team2Score ?? 0));
        }
      });
      return { p1: p1Scores, p2: p2Scores };
    }

    // Format 2: { set1: "21-19", set2: "15-21" }
    const sortedKeys = Object.keys(details).sort();
    for (const key of sortedKeys) {
      const scoreStr = details[key];
      if (typeof scoreStr === 'string' && scoreStr.includes('-')) {
        const [s1, s2] = scoreStr.split('-');
        p1Scores.push(s1.trim());
        p2Scores.push(s2.trim());
      }
    }
    return { p1: p1Scores, p2: p2Scores };
  };

  const { p1: p1SetScores, p2: p2SetScores } = parseSetScores(match.scoreDetails);
  const actualCardH = match.isBye ? 100 : cardH;

  const cardContent = (
    <>
      {/* Header */}
      <div className={`flex items-center justify-between px-2.5 py-1.5 border-b-2 text-[10px] font-extrabold flex-shrink-0 ${
        live ? 'bg-blue-100 border-blue-200 text-blue-800' : 'bg-slate-100 border-slate-200 text-slate-700'
      }`}>
        <span className="text-slate-500 font-extrabold">#{match.matchOrder}</span>
        {live ? (
          <span className="flex items-center gap-0.5 text-blue-700 font-black animate-pulse">
            <Play className="w-2.5 h-2.5 fill-blue-700" /> LIVE
          </span>
        ) : done ? (
          match.isBye ? (
            <span className="text-emerald-600 font-extrabold uppercase tracking-wider text-[9px]">Vô thẳng</span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-600 font-extrabold">
              <CheckCircle className="w-3 h-3" /> Kết thúc
            </span>
          )
        ) : match.isBye ? (
          <span className="text-slate-500 font-extrabold uppercase tracking-wider text-[9px]">BYE</span>
        ) : (
          <span className="flex items-center gap-1 text-slate-500 font-extrabold">
            <Clock className="w-2.5 h-2.5" /> Chờ đấu
          </span>
        )}
      </div>

      {/* Participants */}
      <div className="flex flex-col divide-y divide-slate-150 border-b border-slate-200" style={{ flex: '0 0 auto' }}>
        <MatchCardRow p={match.participant1} won={p1Won} sets={match.p1SetsWon}
          isByeSlot={isP1Bye || (match.isBye && !match.participant1)} done={done} live={live} setScores={p1SetScores} />
        <MatchCardRow p={match.participant2} won={p2Won} sets={match.p2SetsWon}
          isByeSlot={isP2Bye || (match.isBye && !match.participant2)} done={done} live={live} setScores={p2SetScores} />
      </div>

      {/* Schedule Info (Public & Organizer) */}
      {!match.isBye && (
        <div className="flex flex-col gap-0.5 px-2.5 py-1.5 bg-slate-50/30 flex-1 justify-center min-h-[36px]">
          <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold">
            <Clock className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">
              {match.scheduledAt 
                ? new Date(match.scheduledAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) 
                : 'Chưa xếp giờ'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold">
            <Info className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate" title={match.courtAddress ? `${match.courtName} - ${match.courtAddress}` : match.courtName || undefined}>
              {match.courtName 
                ? `${match.courtName}${match.courtAddress ? ` (${match.courtAddress})` : ''}` 
                : 'Chưa xếp sân'}
            </span>
          </div>
        </div>
      )}
    </>
  );

  const showByeLabel = (isP1Bye && match.participant2) || (isP2Bye && match.participant1);

  return (
    <div
      style={{ width: CARD_W, height: actualCardH }}
      className={`rounded-xl overflow-hidden border-2 flex flex-col shadow-sm transition-all duration-150 hover:shadow-md hover:-translate-y-px bg-white ${
        live 
          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-blue-100' 
          : done 
            ? 'border-slate-350 bg-slate-50/10' 
            : 'border-slate-300'
      }`}
    >
      {(match.participant1 || match.participant2) && !match.isBye ? (
        <Link href={`/live/${match.id}`} className="flex flex-col flex-1 hover:no-underline group">
          {cardContent}
        </Link>
      ) : (
        <div className="flex flex-col flex-1">
          {cardContent}
        </div>
      )}

      {/* Organizer button */}
      {isOrganizer && !match.isBye && (
        <div className="px-2 pb-1.5 pt-1 bg-slate-50/60 flex-shrink-0 border-t border-slate-200">
          {showByeLabel ? (
            <div className="flex items-center justify-center py-0.5">
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Vô thẳng (BYE)
              </span>
            </div>
          ) : !done ? (
            (match.participant1 && match.participant2) ? (
              <button
                onClick={() => onScheduleMatch(match)}
                className="w-full text-[9px] font-extrabold text-blue-600 border-2 border-blue-200 bg-white hover:bg-blue-50 rounded-lg py-0.5 transition-colors cursor-pointer"
              >
                Xếp Sân & Giờ
              </button>
            ) : (
              <div className="w-full text-center text-[9px] font-extrabold text-slate-500 bg-slate-100/50 rounded-lg py-1 border border-slate-250/60 select-none">
                Chờ đối thủ
              </div>
            )
          ) : null}
        </div>
      )}
    </div>
  );
}

function isSlotBye(match: BracketMatch, slotIndex: 1 | 2, allMatches: BracketMatch[]): boolean {
  if (slotIndex === 1 && match.participant1) return false;
  if (slotIndex === 2 && match.participant2) return false;

  let src: BracketMatch | undefined;

  if (match.bracketBranch === 'MAIN') {
    if (match.roundNumber === 1) {
      return true;
    }
    const prevRoundMatches = allMatches.filter(
      (m) => m.bracketBranch === 'MAIN' && m.roundNumber === match.roundNumber - 1
    );
    prevRoundMatches.sort((a, b) => a.matchOrder - b.matchOrder);
    const srcIndex = (match.matchOrder - 1) * 2 + (slotIndex - 1);
    src = prevRoundMatches[srcIndex];
  } else if (match.bracketBranch === 'LOSERS') {
    if (match.roundNumber === 1) {
      const winnersR1 = allMatches.filter(
        (m) => m.bracketBranch === 'MAIN' && m.roundNumber === 1
      );
      winnersR1.sort((a, b) => a.matchOrder - b.matchOrder);
      const srcIndex = (match.matchOrder - 1) * 2 + (slotIndex - 1);
      const winSrc = winnersR1[srcIndex];
      if (winSrc) {
        if (winSrc.status === 'COMPLETED' && winSrc.isBye) {
          return true;
        }
      }
      return false;
    }

    if (match.roundNumber % 2 === 0) {
      if (slotIndex === 1) {
        src = allMatches.find(
          (m) => m.bracketBranch === 'LOSERS' && m.roundNumber === match.roundNumber - 1 && m.matchOrder === match.matchOrder
        );
      } else {
        const winRound = match.roundNumber / 2 + 1;
        src = allMatches.find(
          (m) => m.bracketBranch === 'MAIN' && m.roundNumber === winRound && m.matchOrder === match.matchOrder
        );
      }
    } else {
      const prevRoundMatches = allMatches.filter(
        (m) => m.bracketBranch === 'LOSERS' && m.roundNumber === match.roundNumber - 1
      );
      prevRoundMatches.sort((a, b) => a.matchOrder - b.matchOrder);
      const srcIndex = (match.matchOrder - 1) * 2 + (slotIndex - 1);
      src = prevRoundMatches[srcIndex];
    }
  } else if (match.bracketBranch === 'GRAND_FINALS') {
    if (slotIndex === 1) {
      const mainMatches = allMatches.filter(m => m.bracketBranch === 'MAIN');
      if (mainMatches.length > 0) {
        const maxUbRound = Math.max(...mainMatches.map(m => m.roundNumber));
        src = allMatches.find(
          (m) => m.bracketBranch === 'MAIN' && m.roundNumber === maxUbRound
        );
      }
    } else {
      const losersMatches = allMatches.filter(m => m.bracketBranch === 'LOSERS');
      if (losersMatches.length > 0) {
        const maxLbRound = Math.max(...losersMatches.map(m => m.roundNumber));
        src = allMatches.find(
          (m) => m.bracketBranch === 'LOSERS' && m.roundNumber === maxLbRound
        );
      }
    }
  }

  if (src) {
    if (src.status === 'COMPLETED') {
      const isLoserFeed = (src.loserNextMatchId === match.id);
      if (isLoserFeed) {
        const loserId = src.winnerId === src.participant1Id ? src.participant2Id : src.participant1Id;
        return loserId === null;
      } else {
        return src.winnerId === null;
      }
    }
  }

  return false;
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
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const byRound = buildMatchesByRound(matches);
  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);
  if (!rounds.length) return null;

  const maxRound = Math.max(...rounds);
  let firstRoundCount = 1;
  rounds.forEach((r) => {
    const count = byRound[r]?.length || 0;
    const estimate = count * Math.pow(2, r - 1);
    if (estimate > firstRoundCount) firstRoundCount = estimate;
  });

  const SLOT_H_1 = cardH + 16;
  const totalHeight = firstRoundCount * SLOT_H_1 + 48;
  const posMap = new Map<string, MatchPos>();

  rounds.forEach((r) => {
    const colX = (r - 1) * (CARD_W + COL_GAP);
    const slotH = Math.pow(2, r - 1) * SLOT_H_1;
    
    byRound[r]?.forEach((match) => {
      posMap.set(match.id, {
        x: colX,
        y: 24 + (match.matchOrder - 1) * slotH + slotH / 2,
      });
    });
  });

  const svgW = maxRound * CARD_W + (maxRound - 1) * COL_GAP + COL_GAP;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-50 p-6 overflow-hidden flex flex-col'
          : 'relative border border-slate-200/80 bg-slate-50/20 rounded-2xl p-4 shadow-sm'
      }
    >
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm rounded-xl p-1 text-xs font-bold text-slate-600">
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100"
          title="Zoom Out"
        >
          -
        </button>
        <span className="w-12 text-center select-none">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.1, 1.5))}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setZoom(1)}
          className="px-2.5 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100"
          title="Reset Zoom"
        >
          Reset
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100 text-slate-500 hover:text-slate-800"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <div className={`overflow-x-auto overflow-y-auto pb-4 max-h-[80vh] no-scrollbar ${isFullscreen ? 'flex-1 max-h-none' : ''}`}>
        <div
          style={{
            width: svgW * zoom,
            height: totalHeight * zoom,
            transition: 'width 0.15s ease-out, height 0.15s ease-out',
          }}
          className="relative"
        >
          {/* Round titles */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: svgW,
              transition: 'transform 0.15s ease-out',
            }}
            className="flex mb-6 flex-shrink-0"
          >
            <div className="flex" style={{ gap: COL_GAP }}>
              {Array.from({ length: maxRound }).map((_, ri) => (
                <div key={ri} style={{ width: CARD_W, flexShrink: 0 }} className="text-center">
                  <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                    {getRoundLabel(ri, maxRound)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive tree canvas */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: svgW,
              height: totalHeight,
              transition: 'transform 0.15s ease-out',
              marginTop: '44px',
            }}
            className="absolute"
          >
            {/* SVG connectors */}
            <svg className="absolute inset-0 pointer-events-none" width={svgW} height={totalHeight}>
              {matches.map((m) => {
                const startPos = posMap.get(m.id);
                if (!startPos || !m.nextMatchId) return null;
                const endPos = posMap.get(m.nextMatchId);
                if (!endPos) return null;

                const midX = (startPos.x + CARD_W + endPos.x) / 2;
                const stroke = m.status === 'COMPLETED' ? '#10b981' : '#cbd5e1';
                return (
                  <path
                    key={m.id}
                    d={`M ${startPos.x + CARD_W} ${startPos.y} L ${midX} ${startPos.y} L ${midX} ${endPos.y} L ${endPos.x} ${endPos.y}`}
                    stroke={stroke}
                    strokeWidth={1.5}
                    fill="none"
                    opacity={0.65}
                  />
                );
              })}
            </svg>

            {/* Match cards */}
            {matches.map((match) => {
              const pos = posMap.get(match.id);
              if (!pos) return null;
              const isP1Bye = isSlotBye(match, 1, matches);
              const isP2Bye = isSlotBye(match, 2, matches);
              const actualCardH = match.isBye ? 100 : cardH;
              return (
                <div key={match.id} className="absolute" style={{ left: pos.x, top: pos.y - actualCardH / 2 }}>
                  <MatchCard match={match} onScheduleMatch={onScheduleMatch} isP1Bye={isP1Bye} isP2Bye={isP2Bye} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOUBLE ELIMINATION VIEW
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
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const ubByRound = buildMatchesByRound(upperMatches);
  const lbByRound = buildMatchesByRound(lowerMatches);

  const ubRounds = Object.keys(ubByRound).map(Number).sort((a, b) => a - b);
  const lbRounds = Object.keys(lbByRound).map(Number).sort((a, b) => a - b);

  const maxUbRound = ubRounds.length > 0 ? Math.max(...ubRounds) : 1;
  const maxLbRound = lbRounds.length > 0 ? Math.max(...lbRounds) : 1;

  // Estimate theoretical first round count of Winners Bracket
  let firstRoundCount = 1;
  ubRounds.forEach((r) => {
    const count = ubByRound[r]?.length || 0;
    const estimate = count * Math.pow(2, r - 1);
    if (estimate > firstRoundCount) firstRoundCount = estimate;
  });

  const SLOT_H_1 = cardH + 16;
  const UB_TOP = 48; // padding for round headers
  const UB_HEIGHT = firstRoundCount * SLOT_H_1;
  const LB_TOP = UB_TOP + UB_HEIGHT + 48;
  const LB_HEIGHT = UB_HEIGHT; // keep same height space

  const posMap = new Map<string, MatchPos>();

  // Winners Bracket Positioning
  ubRounds.forEach((r) => {
    const colX = (r - 1) * 2 * (CARD_W + COL_GAP);
    const slotH = Math.pow(2, r - 1) * SLOT_H_1;
    ubByRound[r]?.forEach((match) => {
      posMap.set(match.id, {
        x: colX,
        y: UB_TOP + (match.matchOrder - 1) * slotH + slotH / 2,
      });
    });
  });

  // Losers Bracket Positioning
  lbRounds.forEach((r) => {
    let colIndex = r - 1;
    if (r === maxLbRound) {
      colIndex = (maxUbRound - 1) * 2;
    }
    const colX = colIndex * (CARD_W + COL_GAP);
    const totalLbMatches = Math.pow(2, Math.floor((maxLbRound - r) / 2));
    const lbSlotH = LB_HEIGHT / totalLbMatches;
    lbByRound[r]?.forEach((match) => {
      posMap.set(match.id, {
        x: colX,
        y: LB_TOP + (match.matchOrder - 1) * lbSlotH + lbSlotH / 2,
      });
    });
  });

  // Grand Finals Positioning
  const columnsCount = Math.max(maxUbRound * 2 - 1, maxLbRound);
  const GF_X = columnsCount * (CARD_W + COL_GAP);

  const ubFinal = ubRounds.length > 0 ? ubByRound[maxUbRound]?.[0] : null;
  const lbFinal = lbRounds.length > 0 ? lbByRound[maxLbRound]?.[0] : null;
  const ubFinalPos = ubFinal ? posMap.get(ubFinal.id) : null;
  const lbFinalPos = lbFinal ? posMap.get(lbFinal.id) : null;

  const gfCenterY = ((ubFinalPos?.y ?? UB_TOP + UB_HEIGHT / 2) + (lbFinalPos?.y ?? LB_TOP + LB_HEIGHT / 2)) / 2;

  const gfSorted = [...gfMatches].sort((a, b) => a.matchOrder - b.matchOrder);
  gfSorted.forEach((m, i) => {
    posMap.set(m.id, {
      x: GF_X + i * (CARD_W + COL_GAP),
      y: gfCenterY,
    });
  });

  const totalWidth = GF_X + (gfSorted.length || 1) * (CARD_W + COL_GAP) + 48;
  const totalHeight = LB_TOP + LB_HEIGHT + 48;

  // Let's get all matches to render
  const allMatches = [...upperMatches, ...lowerMatches, ...gfSorted];

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-50 p-6 overflow-hidden flex flex-col'
          : 'relative border border-slate-200/80 bg-slate-50/20 rounded-2xl p-4 shadow-sm'
      }
    >
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm rounded-xl p-1 text-xs font-bold text-slate-600">
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100"
          title="Zoom Out"
        >
          -
        </button>
        <span className="w-12 text-center select-none">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.1, 1.5))}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setZoom(1)}
          className="px-2.5 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100"
          title="Reset Zoom"
        >
          Reset
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100 text-slate-500 hover:text-slate-800"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <div className={`overflow-x-auto overflow-y-auto pb-6 max-h-[80vh] no-scrollbar ${isFullscreen ? 'flex-1 max-h-none' : ''}`}>
        <div
          style={{
            width: totalWidth * zoom,
            height: totalHeight * zoom,
            transition: 'width 0.15s ease-out, height 0.15s ease-out',
          }}
          className="relative"
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: totalWidth,
              height: totalHeight,
              transition: 'transform 0.15s ease-out',
            }}
            className="absolute inset-0"
          >
            {/* Render SVG Connectors */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={totalWidth}
              height={totalHeight}
              style={{ overflow: 'visible' }}
            >
              {allMatches.map((m) => {
                const startPos = posMap.get(m.id);
                if (!startPos) return null;

                const elements: React.ReactNode[] = [];



                // Winner next path
                if (m.nextMatchId) {
                  const endPos = posMap.get(m.nextMatchId);
                  if (endPos) {
                    const midX = (startPos.x + CARD_W + endPos.x) / 2;
                    const stroke = m.status === 'COMPLETED' ? '#10b981' : '#cbd5e1';
                    elements.push(
                      <g key={`win-${m.id}`} stroke={stroke} strokeWidth={1.5} fill="none" opacity={0.65}>
                        <path d={`M ${startPos.x + CARD_W} ${startPos.y} L ${midX} ${startPos.y} L ${midX} ${endPos.y} L ${endPos.x} ${endPos.y}`} />
                      </g>
                    );
                  }
                }

                // Loser drop down path (removed to avoid visual cluttering/web crossing winners bracket)
                /*
                if (m.loserNextMatchId) {
                  const endPos = posMap.get(m.loserNextMatchId);
                  if (endPos) {
                    const stroke = '#f43f5e'; // rose-500 for losers path
                    elements.push(
                      <g key={`lose-${m.id}`} stroke={stroke} strokeWidth={1.5} fill="none" opacity={0.45} strokeDasharray="4 4">
                        <path d={`M ${startPos.x + CARD_W / 2} ${startPos.y + cardH / 2} L ${startPos.x + CARD_W / 2} ${(startPos.y + endPos.y) / 2} L ${endPos.x} ${endPos.y}`} />
                      </g>
                    );
                  }
                }
                */

                return elements;
              })}
            </svg>

            {/* WB Section Label */}
            <div className="absolute flex items-center gap-2" style={{ top: UB_TOP - 32, left: 0 }}>
              <div className="w-1 h-3.5 bg-indigo-500 rounded-full" />
              <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest">
                Nhánh Thắng — Winners Bracket
              </span>
            </div>

            {/* LB Section Label */}
            <div className="absolute flex items-center gap-2" style={{ top: LB_TOP - 32, left: 0 }}>
              <div className="w-1 h-3.5 bg-rose-500 rounded-full" />
              <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest">
                Nhánh Thua — Losers Bracket
              </span>
            </div>

            {/* Grand Final Section Label */}
            {gfSorted.length > 0 && (
              <div className="absolute flex items-center gap-2" style={{ top: gfCenterY - cardH / 2 - 28, left: GF_X }}>
                <div className="w-1 h-3.5 bg-amber-500 rounded-full" />
                <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest">
                  🏆 Chung Kết Tổng — Grand Final
                </span>
              </div>
            )}

            {/* Render Match Cards */}
            {allMatches.map((match) => {
              const pos = posMap.get(match.id);
              if (!pos) return null;
              const isP1Bye = isSlotBye(match, 1, allMatches);
              const isP2Bye = isSlotBye(match, 2, allMatches);
              const actualCardH = match.isBye ? 100 : cardH;
              return (
                <div
                  key={match.id}
                  className="absolute"
                  style={{ left: pos.x, top: pos.y - actualCardH / 2 }}
                >
                  <MatchCard match={match} onScheduleMatch={onScheduleMatch} isP1Bye={isP1Bye} isP2Bye={isP2Bye} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROUND ROBIN VIEW  — standings table + match columns
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
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
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

      {/* Match schedule by round - Columns */}
      <div>
        <h5 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" /> Lịch trận đấu
        </h5>
        
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 -mx-1 px-1 no-scrollbar">
          {rounds.map((rn) => (
            <div key={rn} className="flex-shrink-0 w-[280px] bg-slate-50/60 rounded-xl border border-slate-200 p-3 flex flex-col gap-2.5">
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest text-center border-b pb-1.5 border-slate-200">
                Vòng {rn}
              </div>
              <div className="flex flex-col gap-2">
                {byRound[rn].filter((m) => !m.isBye).map((m) => {
                  const done = m.status === 'COMPLETED';
                  const live = m.status === 'ONGOING';
                  return (
                    <div key={m.id} className={`flex flex-col p-2.5 rounded-lg border text-xs font-semibold shadow-sm transition-all ${
                      live ? 'border-blue-300 bg-blue-50/50' :
                      done ? 'border-emerald-100 bg-emerald-50/20' :
                      'border-slate-200/80 bg-white'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] text-slate-400">#{m.matchOrder}</span>
                        {live && (
                          <span className="flex items-center gap-0.5 text-[8px] font-extrabold text-blue-600 animate-pulse">
                            <Play className="w-2 h-2 fill-blue-600" /> LIVE
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className={`truncate flex-1 pr-2 ${m.winnerId === m.participant1?.id ? 'font-bold text-emerald-800' : 'text-slate-600'}`}>
                            {m.participant1?.teamName ?? 'TBD'}
                          </span>
                          <span className={`font-black text-xs ${m.winnerId === m.participant1?.id ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {done || live ? m.p1SetsWon : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`truncate flex-1 pr-2 ${m.winnerId === m.participant2?.id ? 'font-bold text-emerald-800' : 'text-slate-600'}`}>
                            {m.participant2?.teamName ?? 'TBD'}
                          </span>
                          <span className={`font-black text-xs ${m.winnerId === m.participant2?.id ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {done || live ? m.p2SetsWon : '—'}
                          </span>
                        </div>
                      </div>
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

const UPPER_SET = new Set(['WINNER', 'WINNERS', 'UPPER', 'W', 'MAIN']);
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
          {activeStage.type === 'DOUBLE_ELIMINATION' ? (
            <div>
              {(() => {
                const allMatches = activeStage.groups.flatMap((g) => g.matches);
                const upper = allMatches.filter((m) => UPPER_SET.has((m.bracketBranch ?? '').toUpperCase()));
                const lower = allMatches.filter((m) => LOWER_SET.has((m.bracketBranch ?? '').toUpperCase()));
                const gf = allMatches.filter((m) => !upper.includes(m) && !lower.includes(m));
                return (
                  <DoubleElimView
                    upperMatches={upper}
                    lowerMatches={lower}
                    gfMatches={gf}
                    onScheduleMatch={onScheduleMatch}
                  />
                );
              })()}
            </div>
          ) : (
            activeStage.groups.map((group) => (
              <div key={group.id}>
                {activeStage.groups.length > 1 && (
                  <h4 className="font-bold text-slate-700 text-sm border-l-4 border-blue-500 pl-3 mb-4">
                    {group.name}
                  </h4>
                )}
                <GroupView group={group} stageType={activeStage.type} onScheduleMatch={onScheduleMatch} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
