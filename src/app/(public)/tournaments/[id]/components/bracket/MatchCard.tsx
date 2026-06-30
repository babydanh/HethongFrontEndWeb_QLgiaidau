/**
 * MatchCard — reusable match card component
 *
 * Used by SingleElimView and DoubleElimView to render each match node.
 * Renders differently for public (compact) vs. organiser (taller + schedule button).
 *
 * Shows per-set score columns based on best-of (BO3 = 3 cols, BO5 = 5 cols).
 */

'use client';

import React from 'react';
import Link from 'next/link';
import {
  Trophy,
  Play,
  CheckCircle,
  Clock,
  Info,
} from 'lucide-react';
import type { BracketMatch } from '@/features/tournaments/api';
import { extractMatchScores } from '@/features/matches/score-display';
import type { SportRuleKind } from '@/types/tournament';
import { formatDateTime } from '@/utils/format';
import type {
  OnScheduleMatch,
  OnSelectBracketMatch,
  ScoreDetailsShape,
} from './types';
import {
  CARD_W,
  CARD_H_PUBLIC,
  CARD_H_ORGANIZER,
} from './types';
import { buildMatchRuleSummary } from './sportRuleDisplay';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Derive max columns from setsToWin. BO1 → 1, BO3 → 3, BO5 → 5 */
function getMaxColumns(match: BracketMatch): number {
  const stw = match.matchConfig?.setsToWin;
  if (stw === 1) return 1;
  if (stw === 2) return 3;
  if (stw === 3) return 5;
  return 3; // default fallback
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MatchCard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function MatchCard({
  match,
  onScheduleMatch,
  onSelectMatch,
  selected = false,
  isP1Bye = false,
  isP2Bye = false,
  fallbackSportRuleKind,
}: {
  match: BracketMatch;
  onScheduleMatch?: OnScheduleMatch;
  onSelectMatch?: OnSelectBracketMatch;
  selected?: boolean;
  isP1Bye?: boolean;
  isP2Bye?: boolean;
  fallbackSportRuleKind?: SportRuleKind;
}) {
  const done = match.status === 'COMPLETED';
  const live = match.status === 'ONGOING';
  const p1Won = done && match.winnerId != null && match.winnerId === match.participant1?.id;
  const p2Won = done && match.winnerId != null && match.winnerId === match.participant2?.id;
  const isOrganizer = !!onScheduleMatch;
  const cardH = isOrganizer ? CARD_H_ORGANIZER : CARD_H_PUBLIC;

  const setList = extractMatchScores(match.scoreDetails as Record<string, unknown> | undefined | null);
  const maxCols = getMaxColumns(match);
  const ruleSummary = buildMatchRuleSummary(match, fallbackSportRuleKind);

  const actualCardH = match.isBye ? 148 : cardH;
  const showByeLabel = (isP1Bye && match.participant2) || (isP2Bye && match.participant1);

  return (
    <div
      data-bracket-match-id={match.id}
      style={{ width: CARD_W, height: actualCardH }}
      className={
        'rounded-xl overflow-hidden border-2 flex flex-col shadow-sm transition-all duration-150 hover:shadow-md hover:-translate-y-px bg-white ' +
        (selected
          ? 'border-amber-500 ring-4 ring-amber-200 shadow-amber-100'
          : live
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-blue-100'
            : done
              ? 'border-slate-350 bg-slate-50/10'
              : 'border-slate-300')
      }
      onClick={() => onSelectMatch?.(match)}
    >
      {(match.participant1 || match.participant2) && !match.isBye ? (
        <Link href={'/live/' + match.id} className="flex flex-col flex-1 hover:no-underline group">
          <CardContent />
        </Link>
      ) : (
        <div className="flex flex-col flex-1">
          <CardContent />
        </div>
      )}

      {isOrganizer && !match.isBye && (
          <div className="px-2.5 pb-2.5 pt-2 bg-slate-50/60 flex-shrink-0 border-t border-slate-200">
            {showByeLabel ? (
            <div className="flex items-center justify-center py-0.5">
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Vô thẳng (BYE)
              </span>
            </div>
          ) : !done ? (
            match.participant1 && match.participant2 ? (
              <div className="flex justify-center">
                <button
                  onClick={() => onScheduleMatch!(match)}
                  className="min-w-[132px] text-center text-[9px] font-extrabold text-blue-600 border-2 border-blue-200 bg-white hover:bg-blue-50 rounded-lg px-3 py-1 transition-colors cursor-pointer"
                >
                  Xếp Sân & Giờ
                </button>
              </div>
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

  // ── Internal card content ──
  function CardContent() {
    return (
      <>
        {/* Header */}
        <div
          className={
            'flex items-center justify-between px-2.5 py-1.5 border-b-2 text-[10px] font-extrabold flex-shrink-0 ' +
            (live
              ? 'bg-blue-100 border-blue-200 text-blue-800'
              : 'bg-slate-100 border-slate-200 text-slate-700')
          }
        >
          <span className="text-slate-500 font-extrabold">#{match.matchOrder}</span>
          {live ? (
            <span className="flex items-center gap-0.5 text-blue-700 font-black animate-pulse">
              <Play className="w-2.5 h-2.5 fill-blue-700" /> Trực tiếp
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
            <span className="text-slate-500 font-extrabold uppercase tracking-wider text-[9px]">Miễn vòng</span>
          ) : (
            <span className="flex items-center gap-1 text-slate-500 font-extrabold">
              <Clock className="w-2.5 h-2.5" /> Chờ đấu
            </span>
          )}
        </div>

        {/* Set columns header */}
        {!match.isBye && (
          <div className="flex border-b border-slate-100 bg-slate-50/50">
            <div className="flex-1" />
            {Array.from({ length: maxCols }).map((_, ci) => (
              <div key={ci} className="w-7 text-center text-[7px] font-extrabold text-slate-400 py-0.5 border-l border-slate-100">
                S{ci + 1}
              </div>
            ))}
          </div>
        )}

        {/* Participant rows */}
        <div className="flex flex-col border-b border-slate-200">
          <RowSide
            p={match.participant1}
            won={p1Won}
            setsTotal={match.p1SetsWon}
            isByeSlot={isP1Bye || (match.isBye && !match.participant1)}
            done={done}
            live={live}
            setList={setList.map((set) => ({ p1: String(set.team1Score), p2: String(set.team2Score) }))}
            pickScore={(s) => s.p1}
            maxCols={maxCols}
          />
          <RowSide
            p={match.participant2}
            won={p2Won}
            setsTotal={match.p2SetsWon}
            isByeSlot={isP2Bye || (match.isBye && !match.participant2)}
            done={done}
            live={live}
            setList={setList.map((set) => ({ p1: String(set.team1Score), p2: String(set.team2Score) }))}
            pickScore={(s) => s.p2}
            maxCols={maxCols}
          />
        </div>

        {/* Schedule Info */}
        {!match.isBye && (
          <div className="flex flex-col gap-2 px-3 py-3 bg-slate-50/30 flex-1 justify-center min-h-[96px]">
            <div className="flex items-center gap-1 text-[9px] text-slate-600 font-extrabold">
              <Trophy className="w-2.5 h-2.5 flex-shrink-0 text-amber-500" />
              <span className="truncate" title={ruleSummary}>{ruleSummary}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold">
              <Clock className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{match.scheduledAt ? formatDateTime(match.scheduledAt) : 'Chưa xếp giờ'}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold">
              <Info className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate" title={match.courtAddress ? match.courtName + ' - ' + match.courtAddress : match.courtName || undefined}>
                {match.courtName ? match.courtName + (match.courtAddress ? ' (' + match.courtAddress + ')' : '') : 'Chưa xếp sân'}
              </span>
            </div>
          </div>
        )}
      </>
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RowSide — one participant row with per-set scores
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function RowSide({
  p,
  won,
  setsTotal,
  isByeSlot = false,
  done,
  live,
  setList,
  pickScore,
  maxCols,
}: {
  p: BracketMatch['participant1'];
  won: boolean;
  setsTotal: number;
  isByeSlot?: boolean;
  done: boolean;
  live: boolean;
  setList: { p1: string; p2: string }[];
  pickScore: (s: { p1: string; p2: string }) => string;
  maxCols: number;
}) {
  return (
    <div
      className={
        'flex items-center min-h-[48px] ' +
        (won ? 'bg-emerald-50/90 border-l-4 border-emerald-500' : 'bg-white')
      }
    >
      {/* Team info */}
      <div className="flex items-center gap-1.5 min-w-0 px-3 py-2.5 flex-1">
        {p?.seed != null && (
          <span className="text-[9px] bg-slate-200 text-slate-700 px-1 rounded font-extrabold flex-shrink-0 leading-4">
            {p.seed}
          </span>
        )}
        <span
          className={
            'text-[11px] truncate flex-1 leading-5 md:text-[12px] ' +
            (won
              ? 'font-black text-emerald-950'
              : !p || isByeSlot
                ? 'italic text-slate-400 font-semibold'
                : 'font-bold text-slate-800')
          }
        >
          {p?.teamName ?? (isByeSlot ? 'Miễn vòng' : 'Chờ xác định')}
        </span>
        {won && <Trophy className="w-3 h-3 text-amber-500 fill-amber-300 flex-shrink-0" />}
      </div>

      {/* Per-set columns */}
      {Array.from({ length: maxCols }).map((_, ci) => {
        const score = setList[ci];
        const val = score ? pickScore(score) : '';
        return (
          <div
            key={ci}
            className={
              'w-7 text-center text-[9px] font-black leading-4 py-1 border-l border-slate-100 ' +
              (won ? 'text-emerald-700' : val ? 'text-slate-700' : 'text-slate-300')
            }
          >
            {val || '-'}
          </div>
        );
      })}
    </div>
  );
}
