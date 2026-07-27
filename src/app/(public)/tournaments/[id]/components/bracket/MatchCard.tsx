/**
 * MatchCard — Sofascore / World Cup Style Compact Bracket Match Node
 *
 * Height: 88px (Public) / 118px (Organizer)
 * Clean, table-aligned 2-row layout with winner indicators and exact right-aligned scores.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';
import type { BracketMatch } from '@/features/tournaments/api';
import { extractMatchScores } from '@/features/matches/score-display';
import type { SportRuleKind } from '@/types/tournament';
import { formatDateTime } from '@/utils/format';
import type { OnScheduleMatch, OnSelectBracketMatch } from './types';
import { CARD_W, CARD_H_PUBLIC, CARD_H_ORGANIZER } from './types';

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
  const actualCardH = match.isBye ? 80 : cardH;

  // Format compact schedule date/time e.g., "14:30 28/07"
  const rawMatch = match as unknown as Record<string, unknown>;
  const dateFormatted = match.scheduledAt
    ? formatDateTime(match.scheduledAt)
    : rawMatch.scheduledDate
      ? String(rawMatch.scheduledDate)
      : null;

  return (
    <div
      data-bracket-match-id={match.id}
      style={{ width: CARD_W, height: actualCardH }}
      className={
        'rounded-lg overflow-hidden border flex flex-col shadow-sm transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 bg-white select-none ' +
        (selected
          ? 'border-amber-500 ring-2 ring-amber-300 shadow-amber-100'
          : live
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-blue-100'
            : done
              ? 'border-slate-300 bg-slate-50/10'
              : 'border-slate-200')
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
        <div className="px-2 py-1 bg-slate-50 flex-shrink-0 border-t border-slate-200/80">
          {!done ? (
            match.participant1 && match.participant2 ? (
              <div className="flex justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onScheduleMatch!(match);
                  }}
                  className="w-full text-center text-[10px] font-bold text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 rounded py-0.5 transition-colors cursor-pointer"
                >
                  Xếp Sân & Giờ
                </button>
              </div>
            ) : (
              <div className="w-full text-center text-[9px] font-bold text-slate-400 bg-slate-100/50 rounded py-0.5 select-none">
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
        {/* World Cup Header Bar */}
        <div
          className={
            'flex items-center justify-between px-2.5 py-0.5 border-b text-[9px] font-bold flex-shrink-0 ' +
            (live
              ? 'bg-blue-100/80 border-blue-200 text-blue-800'
              : 'bg-slate-100/80 border-slate-200/80 text-slate-500')
          }
        >
          <span className="truncate">
            {dateFormatted || `Trận #${match.matchOrder}`}
          </span>

          {live ? (
            <span className="flex items-center gap-0.5 text-blue-600 font-extrabold animate-pulse uppercase tracking-wider">
              <Play className="w-2 h-2 fill-blue-600" /> Live
            </span>
          ) : done ? (
            <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[8px]">
              {match.isBye ? 'Vô thẳng' : 'KT'}
            </span>
          ) : (
            <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[8px]">
              {match.isBye ? 'Miễn' : 'VS'}
            </span>
          )}
        </div>

        {/* 2-Row World Cup Team Table */}
        <div className="flex flex-col flex-1 justify-center divide-y divide-slate-100">
          <TeamRow
            p={match.participant1}
            won={p1Won}
            setsWon={match.p1SetsWon}
            isByeSlot={isP1Bye || (match.isBye && !match.participant1)}
            setList={setList.map((set) => ({ p1: String(set.team1Score), p2: String(set.team2Score) }))}
            pickScore={(s) => s.p1}
            done={done}
          />
          <TeamRow
            p={match.participant2}
            won={p2Won}
            setsWon={match.p2SetsWon}
            isByeSlot={isP2Bye || (match.isBye && !match.participant2)}
            setList={setList.map((set) => ({ p1: String(set.team1Score), p2: String(set.team2Score) }))}
            pickScore={(s) => s.p2}
            done={done}
          />
        </div>
      </div>
    );
  }
}

function TeamRow({
  p,
  won,
  setsWon,
  isByeSlot = false,
  setList,
  pickScore,
  done,
}: {
  p: BracketMatch['participant1'];
  won: boolean;
  setsWon?: number;
  isByeSlot?: boolean;
  setList: { p1: string; p2: string }[];
  pickScore: (s: { p1: string; p2: string }) => string;
  done: boolean;
}) {
  return (
    <div
      className={
        'flex items-center justify-between px-2.5 py-1 transition-colors ' +
        (won ? 'bg-blue-50/40 font-bold text-slate-900' : 'bg-white text-slate-700')
      }
    >
      {/* Team Info */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
        {p?.seed != null && (
          <span className="text-[8px] bg-slate-100 text-slate-500 px-1 rounded font-bold shrink-0">
            {p.seed}
          </span>
        )}
        <span
          className={
            'text-[11px] truncate leading-tight ' +
            (won
              ? 'font-extrabold text-slate-900'
              : !p || isByeSlot
                ? 'italic text-slate-400 font-normal'
                : 'font-semibold text-slate-600')
          }
          title={p?.teamName ?? undefined}
        >
          {p?.teamName ?? (isByeSlot ? 'Miễn vòng' : 'Chờ xác định')}
        </span>
      </div>

      {/* Score / Sets Display — World Cup Style */}
      <div className="flex items-center gap-1 shrink-0 ml-1">
        {setList.length > 1 ? (
          // Display per-set scores if multiple sets
          <div className="flex items-center gap-0.5">
            {setList.map((s, idx) => {
              const val = pickScore(s);
              return (
                <span
                  key={idx}
                  className={`inline-block text-[10px] w-4 text-center font-bold ${
                    val ? (won ? 'text-blue-700 font-extrabold' : 'text-slate-500') : 'text-slate-300'
                  }`}
                >
                  {val || '-'}
                </span>
              );
            })}
          </div>
        ) : setList.length === 1 ? (
          // Single set score
          <span className={`text-[11px] font-extrabold ${won ? 'text-blue-700' : 'text-slate-600'}`}>
            {pickScore(setList[0]) || '-'}
          </span>
        ) : setsWon != null && setsWon > 0 ? (
          <span className={`text-[11px] font-extrabold ${won ? 'text-blue-700' : 'text-slate-600'}`}>
            {setsWon}
          </span>
        ) : null}

        {/* Winner pointer arrow ◄ like Google World Cup */}
        {done && won && (
          <span className="text-[10px] text-blue-600 font-extrabold ml-0.5">◄</span>
        )}
      </div>
    </div>
  );
}
