/**
 * MatchCard — Sleek, modern bracket match node component
 *
 * Pixel-perfect aligned set columns (S1, S2, S3...) according to match settings.
 * Displays formatted Date & Time without text clipping.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Play, CheckCircle, Clock } from 'lucide-react';
import type { BracketMatch } from '@/features/tournaments/api';
import { extractMatchScores } from '@/features/matches/score-display';
import type { SportRuleKind } from '@/types/tournament';
import { formatDateTime } from '@/utils/format';
import type { OnScheduleMatch, OnSelectBracketMatch } from './types';
import { CARD_W, CARD_H_PUBLIC, CARD_H_ORGANIZER } from './types';

/** Derive max columns dynamically from match configuration or scores */
function getMaxColumns(match: BracketMatch): number {
  const setList = extractMatchScores(match.scoreDetails as Record<string, unknown> | undefined | null);
  const rawMatch = match as unknown as Record<string, unknown>;
  const cfgStw = match.matchConfig?.setsToWin ?? rawMatch.setsToWin;
  const cfgBo = match.matchConfig?.bestOf ?? rawMatch.bestOf;

  if (cfgStw === 1 || cfgBo === 1) return 1;
  if (cfgStw === 2 || cfgBo === 3) return 3;
  if (cfgStw === 3 || cfgBo === 5) return 5;

  if (setList.length > 0) {
    return Math.max(setList.length, 1);
  }

  return 3;
}

export function MatchCard({
  match,
  onScheduleMatch,
  onSelectMatch,
  selected = false,
  isP1Bye = false,
  isP2Bye = false,
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
  const live = match.status === 'ONGOING' || match.status === 'IN_PROGRESS';
  const p1Won = done && match.winnerId != null && match.winnerId === match.participant1?.id;
  const p2Won = done && match.winnerId != null && match.winnerId === match.participant2?.id;
  const isOrganizer = !!onScheduleMatch;
  const showByeLabel = (isP1Bye && match.participant2) || (isP2Bye && match.participant1);
  const cardH = isOrganizer && !showByeLabel ? CARD_H_ORGANIZER : CARD_H_PUBLIC;

  const setList = extractMatchScores(match.scoreDetails as Record<string, unknown> | undefined | null);
  const maxCols = getMaxColumns(match);

  const actualCardH = match.isBye ? 140 : cardH;

  const rawMatch = match as unknown as Record<string, unknown>;
  const dateStr = match.scheduledAt
    ? formatDateTime(match.scheduledAt)
    : rawMatch.scheduledDate
      ? String(rawMatch.scheduledDate)
      : 'Chưa xếp giờ';

  return (
    <div
      data-bracket-match-id={match.id}
      style={{ width: CARD_W, height: actualCardH }}
      className={
        'rounded-xl overflow-hidden border flex flex-col shadow-sm transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 bg-white ' +
        (selected
          ? 'border-amber-500 ring-4 ring-amber-200 shadow-amber-100'
          : live
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-blue-100'
            : done
              ? 'border-slate-300 bg-slate-50/20'
              : 'border-slate-200/90')
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

      {isOrganizer && !match.isBye && !showByeLabel && (
        <div className="px-2.5 py-1.5 bg-slate-50 flex-shrink-0 border-t border-slate-200/80">
          {!done ? (
            match.participant1 && match.participant2 ? (
              <div className="flex justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onScheduleMatch!(match);
                  }}
                  className="w-full text-center text-[10px] font-bold text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 rounded-md py-1 transition-colors cursor-pointer"
                >
                  Xếp Sân & Giờ
                </button>
              </div>
            ) : (
              <div className="w-full text-center text-[10px] font-bold text-slate-400 bg-slate-100/50 rounded-md py-1 select-none">
                Chờ đối thủ
              </div>
            )
          ) : null}
        </div>
      )}
    </div>
  );

  function CardContent() {
    return (
      <div className="flex flex-col flex-1 h-full justify-between">
        {/* Header Bar */}
        <div
          className={
            'flex items-center justify-between px-3 py-1.5 border-b text-[10px] font-bold flex-shrink-0 ' +
            (live
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-slate-100/70 border-slate-200/80 text-slate-700')
          }
        >
          <span className="text-slate-500 font-bold">Trận #{match.matchOrder}</span>
          {live ? (
            <span className="flex items-center gap-1 text-blue-600 font-bold animate-pulse">
              <Play className="w-2.5 h-2.5 fill-blue-600" /> Trực tiếp
            </span>
          ) : done ? (
            match.isBye ? (
              <span className="text-blue-600 font-bold uppercase tracking-wider text-[9px]">Vô thẳng</span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <CheckCircle className="w-3 h-3" /> Đã kết thúc
              </span>
            )
          ) : match.isBye ? (
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Miễn vòng</span>
          ) : (
            <span className="flex items-center gap-1 text-slate-500 font-bold">
              <Clock className="w-2.5 h-2.5" /> Sắp diễn ra
            </span>
          )}
        </div>

        {/* Set Header Row — Perfectly Aligned with Scores Below */}
        {!match.isBye && (
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 flex-shrink-0 border-l-4 border-transparent pl-2 pr-3 py-0.5">
            <div className="flex-1" />
            <div className="flex items-center shrink-0">
              {Array.from({ length: maxCols }).map((_, ci) => (
                <div
                  key={ci}
                  className="w-7 text-center text-[9px] font-bold text-slate-400"
                >
                  S{ci + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participant Rows */}
        <div className="flex flex-col flex-1 justify-center divide-y divide-slate-100">
          <RowSide
            p={match.participant1}
            won={p1Won}
            isByeSlot={isP1Bye || (match.isBye && !match.participant1)}
            setList={setList.map((set) => ({ p1: String(set.team1Score), p2: String(set.team2Score) }))}
            pickScore={(s) => s.p1}
            maxCols={maxCols}
          />
          <RowSide
            p={match.participant2}
            won={p2Won}
            isByeSlot={isP2Bye || (match.isBye && !match.participant2)}
            setList={setList.map((set) => ({ p1: String(set.team1Score), p2: String(set.team2Score) }))}
            pickScore={(s) => s.p2}
            maxCols={maxCols}
          />
        </div>

        {/* 1-Line Scheduled Date & Time Footer */}
        {!match.isBye && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/80 text-[10px] font-medium text-slate-500 border-t border-slate-100 flex-shrink-0">
            <span className="flex items-center gap-1.5 min-w-0">
              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate font-semibold text-slate-600">
                {dateStr}
              </span>
            </span>
          </div>
        )}
      </div>
    );
  }
}

function RowSide({
  p,
  won,
  isByeSlot = false,
  setList,
  pickScore,
  maxCols,
}: {
  p: BracketMatch['participant1'];
  won: boolean;
  isByeSlot?: boolean;
  setList: { p1: string; p2: string }[];
  pickScore: (s: { p1: string; p2: string }) => string;
  maxCols: number;
}) {
  return (
    <div
      className={
        'flex items-center justify-between py-1.5 transition-colors border-l-4 pl-2 pr-3 ' +
        (won ? 'bg-emerald-50/80 border-emerald-500' : 'bg-white border-transparent')
      }
    >
      {/* Team Info */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
        {p?.seed != null && (
          <span className="text-[9px] bg-slate-200 text-slate-700 px-1 rounded font-bold shrink-0">
            {p.seed}
          </span>
        )}
        <span
          className={
            'text-[11px] truncate leading-tight ' +
            (won
              ? 'font-bold text-emerald-950'
              : !p || isByeSlot
                ? 'italic text-slate-400 font-normal'
                : 'font-semibold text-slate-800')
          }
          title={p?.teamName ?? undefined}
        >
          {p?.teamName ?? (isByeSlot ? 'Miễn vòng' : 'Chờ xác định')}
        </span>
      </div>

      {/* Per-set scores */}
      <div className="flex items-center shrink-0">
        {Array.from({ length: maxCols }).map((_, ci) => {
          const score = setList[ci];
          const val = score ? pickScore(score) : '';
          return (
            <div key={ci} className="w-7 text-center">
              <span
                className={
                  'inline-block text-[11px] font-bold w-5 h-5 leading-5 rounded text-center ' +
                  (val
                    ? won
                      ? 'bg-emerald-100 text-emerald-800 font-extrabold'
                      : 'bg-slate-100 text-slate-700 font-bold'
                    : 'text-slate-300 font-normal')
                }
              >
                {val || '-'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
