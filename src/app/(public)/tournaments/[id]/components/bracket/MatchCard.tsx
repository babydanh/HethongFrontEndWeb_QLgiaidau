/**
 * MatchCard — High-Performance React.memo Bracket Node Component
 *
 * Direct JSX rendering (no inline nested component functions to prevent DOM remounting).
 * Optimized for GPU hardware acceleration and silky-smooth 60fps rendering.
 */

'use client';

import React, { memo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

import Link from 'next/link';
import Image from 'next/image';
import { Play, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { BracketMatch } from '@/features/tournaments/api';
import { extractMatchScores } from '@/features/matches/score-display';
import type { SportRuleKind } from '@/types/tournament';
import { formatDateTime } from '@/utils/format';
import type {
  BracketDragHandlers,
  BracketSlot,
  OnScheduleMatch,
  OnSelectBracketMatch,
} from './types';
import { CARD_W, CARD_H_PUBLIC, CARD_H_ORGANIZER } from './types';
import { isBracketMatchDragLocked } from './match-status';

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

export const MatchCard = memo(function MatchCard({
  match,
  onScheduleMatch,
  onSelectMatch,
  selected = false,
  isP1Bye = false,
  isP2Bye = false,
  dragHandlers,
  cardWidth,
}: {
  match: BracketMatch;
  onScheduleMatch?: OnScheduleMatch;
  onSelectMatch?: OnSelectBracketMatch;
  selected?: boolean;
  isP1Bye?: boolean;
  isP2Bye?: boolean;
  fallbackSportRuleKind?: SportRuleKind;
  dragHandlers?: BracketDragHandlers;
  cardWidth?: number;
}) {

  const translate = useTranslations('TournamentDetail');
  const matchTranslate = useTranslations('Match');
  const done = match.status === 'COMPLETED';
  const live = isBracketMatchDragLocked(match);
  const p1Won = done && match.winnerId != null && match.winnerId === match.participant1?.id;
  const p2Won = done && match.winnerId != null && match.winnerId === match.participant2?.id;
  const isOrganizer = !!onScheduleMatch;
  const showByeLabel = (isP1Bye && match.participant2) || (isP2Bye && match.participant1);
  const cardH = isOrganizer && !showByeLabel ? CARD_H_ORGANIZER : CARD_H_PUBLIC;

  const setList = extractMatchScores(match.scoreDetails as Record<string, unknown> | undefined | null);
  const maxCols = getMaxColumns(match);
  const actualCardH = match.isBye ? 92 : cardH;

  const rawMatch = match as unknown as Record<string, unknown>;
  const dateStr = match.scheduledAt
    ? formatDateTime(match.scheduledAt)
    : rawMatch.scheduledDate
      ? String(rawMatch.scheduledDate)
      : done
        ? matchTranslate('statusFinished')
        : translate('schedulePending');

  const cardInner = (
    <div className="flex flex-col flex-1 h-full justify-between">
      {/* Crisp Header Bar */}
      <div
        className={
          'flex items-center justify-between border-b text-[9.5px] font-bold flex-shrink-0 border-l-[4px] border-transparent pl-2 pr-2.5 py-1 ' +
          (live
            ? 'bg-blue-100/90 border-blue-200 text-blue-900'
            : 'bg-slate-100/90 border-slate-200 text-slate-800')
        }
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span className="text-slate-600 font-bold">{translate("matchNumber", { number: match.matchOrder })}</span>
          {live && (
            <span className="flex items-center gap-0.5 text-blue-700 font-extrabold animate-pulse text-[9px]">
              <Play className="w-2.5 h-2.5 fill-blue-700" /> {translate("liveLabel")}
            </span>
          )}
          {match.isBye && (
            <span className="text-blue-700 font-bold uppercase tracking-wider text-[8.5px]">{translate("bye")}</span>
          )}
        </div>

        {/* S1 S2 S3 Headers aligned directly above score boxes */}
        {!match.isBye && (
          <div className="flex items-center shrink-0">
            {Array.from({ length: maxCols }).map((_, ci) => (
              <div
                key={ci}
                className="w-6.5 text-center text-[8.5px] font-bold text-slate-500"
              >
                S{ci + 1}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Participant Rows */}
      <div className="flex flex-col flex-1 justify-center divide-y divide-slate-100">
        <RowSide
          p={match.participant1}
          won={p1Won}
          isByeSlot={isP1Bye || (match.isBye && !match.participant1)}
          setList={setList.map((set) => ({ p1: String(set.team1Score), p2: String(set.team2Score) }))}
                    pickScore={(s) => s.p1}
          maxCols={maxCols}
          matchId={match.id}
          slot="participant1"
          dragHandlers={dragHandlers}
          locked={live}
        />

        <RowSide
          p={match.participant2}
          won={p2Won}
          isByeSlot={isP2Bye || (match.isBye && !match.participant2)}
          setList={setList.map((set) => ({ p1: String(set.team1Score), p2: String(set.team2Score) }))}
                    pickScore={(s) => s.p2}
          maxCols={maxCols}
          matchId={match.id}
          slot="participant2"
          dragHandlers={dragHandlers}
          locked={live}
        />

      </div>

      {/* Compact 1-Line Scheduled Date & Time Footer */}
      {!match.isBye && (
        <div className="flex items-center justify-between px-2.5 py-0.5 bg-slate-50 text-[9px] font-medium text-slate-600 border-t border-slate-200 flex-shrink-0">
          <span className="flex items-center gap-1.5 min-w-0">
            <Clock className="w-2.5 h-2.5 text-slate-500 shrink-0" />
            <span className="truncate font-semibold text-slate-700">
              {dateStr}
            </span>
          </span>
        </div>
      )}
      {match.refereeName && (
        <div className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold text-amber-700 bg-amber-50 border-t border-amber-100">
          ⚖️ {match.refereeName}
        </div>
      )}
    </div>
  );

  return (
    <div
      data-bracket-match-id={match.id}
      data-bracket-match-live={live ? 'true' : 'false'}
      data-no-pan="true"
      aria-disabled={live}
      style={{ width: cardWidth ?? CARD_W, height: actualCardH }}
      className={
        'relative rounded-md overflow-visible border flex flex-col shadow-sm transition-all duration-300 hover:shadow bg-white select-none ' +
        (selected
          ? 'border-amber-500 ring-4 ring-amber-400 ring-offset-2 shadow-2xl scale-[1.04] z-30 animate-pulse bg-amber-50/10'
          : live
            ? 'border-blue-600 ring-2 ring-blue-500/30 shadow-md'
            : done
              ? 'border-slate-350 shadow-sm'
              : 'border-slate-300')
      }
      onClick={() => onSelectMatch?.(match)}
    >
      {selected && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-lg z-40 border border-white animate-bounce pointer-events-none">
          🎯 Trận đang xem
        </div>
      )}
      {(match.participant1 || match.participant2) && !match.isBye && !isOrganizer ? (
        <Link href={'/live/' + match.id} className="flex flex-col flex-1 hover:no-underline group" draggable={false}>
          {cardInner}
        </Link>
      ) : (
        <div className="flex flex-col flex-1">
          {cardInner}
        </div>
      )}

      {isOrganizer && !match.isBye && !showByeLabel && (
        <div className="px-2 py-1 bg-slate-50 flex-shrink-0 border-t border-slate-200">
          {!done ? (
            match.participant1 && match.participant2 ? (
              <div className="flex justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onScheduleMatch!(match);
                  }}
                  className="w-full text-center text-[9.5px] font-bold text-blue-600 border border-blue-300 bg-white hover:bg-blue-50 rounded py-0.5 transition-colors cursor-pointer"
                >
                  {translate('scheduleVenueTime')}
                </button>
              </div>
            ) : (
              <div className="w-full text-center text-[9px] font-bold text-slate-400 bg-slate-100/60 rounded py-0.5 select-none">
                {matchTranslate('unknownTeam')}
              </div>
            )
          ) : null}
        </div>
      )}
    </div>
  );
});

const RowSide = memo(function RowSide({
  p,
  won,
  isByeSlot = false,
  setList,
    pickScore,
  maxCols,
  matchId,
  slot,
  dragHandlers,
  locked,
}: {
  p: BracketMatch['participant1'];

  won: boolean;
  isByeSlot?: boolean;
  setList: { p1: string; p2: string }[];
    pickScore: (s: { p1: string; p2: string }) => string;
  maxCols: number;
  matchId: string;
  slot: BracketSlot;
  dragHandlers?: BracketDragHandlers;
  locked: boolean;
}) {
  const translate = useTranslations('TournamentDetail');
  const dragEnabled = Boolean(dragHandlers?.enabled && p && !locked);
  const { isOver, setNodeRef: setDropNodeRef } = useDroppable({
    id: `bracket-slot:${matchId}:${slot}`,
    disabled: !dragHandlers?.enabled || locked,
    data: { target: { type: 'slot', matchId, slot } },
  });
    const { attributes, listeners, setNodeRef: setDragNodeRef, isDragging } = useDraggable({

    id: `bracket-participant:${matchId}:${slot}`,
    disabled: !dragEnabled,
    data: p ? { source: { type: 'slot', matchId, slot, participant: p } } : undefined,
  });
  return (

        <div
      ref={setDropNodeRef}
      className={
        'flex items-center justify-between py-1 transition-colors border-l-[4px] pl-2 pr-2.5 ' +
        (won ? 'bg-blue-50/90 border-blue-600' : 'bg-white border-transparent') +
        (isOver ? ' bg-blue-50 ring-2 ring-inset ring-blue-400' : '') +
        (locked ? ' cursor-not-allowed opacity-100' : '')
      }
    >
      {/* Team Info */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
        {dragEnabled && (
          <button
            ref={setDragNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            aria-label={translate('bracketDragParticipant')}
            title={translate('bracketDragParticipant')}
                        className={`cursor-grab touch-none rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 active:cursor-grabbing transition-opacity duration-100 ${isDragging ? 'opacity-0' : 'opacity-100'}`}

            onClick={(event) => event.stopPropagation()}
          >
            ⋮⋮
          </button>
        )}

        {p?.logoUrl ? (
          <Image
            src={p.logoUrl}
            alt=""
            width={18}
            height={18}
            className="h-[18px] w-[18px] rounded-full object-cover shrink-0"
          />
        ) : null}
        <span
          className={
            'text-[10.5px] truncate leading-tight ' +
            (won
              ? 'font-extrabold text-blue-950'
              : !p || isByeSlot
                ? 'italic text-slate-400 font-normal'
                : 'font-semibold text-slate-800')
          }
          title={p?.teamName ?? undefined}
        >
          {p?.teamName ?? (isByeSlot ? translate('bye') : translate('pendingParticipant'))}
        </span>
      </div>

      {/* Per-set scores — Vibrant Blue Badges for Winner */}
      <div className="flex items-center shrink-0">
        {Array.from({ length: maxCols }).map((_, ci) => {
          const score = setList[ci];
          const val = score ? pickScore(score) : '';
          return (
            <div key={ci} className="w-6.5 text-center">
              <span
                className={
                  'inline-block text-[10.5px] font-extrabold w-4.5 h-4.5 leading-4.5 rounded text-center ' +
                  (val
                    ? won
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-800 border border-slate-200/80'
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
});
