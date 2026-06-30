/**
 * RoundRobinView — standings table + per-round match columns
 *
 * Shows a compact ranked table with all key stats, a tooltip explaining
 * the full tiebreaker chain, and a horizontal scroll of round-by-round
 * matches with schedule / venue details.
 */

'use client';

import React, { useState } from 'react';
import {
  Trophy,
  Play,
  Clock,
  Info,
  AlertTriangle,
  HelpCircle,
  X,
} from 'lucide-react';
import type { BracketMatch } from '@/features/tournaments/api';
import type { SportRuleKind } from '@/types/tournament';
import { tournamentsApi } from '@/features/tournaments/api';
import { formatDateTime } from '@/utils/format';
import { getErrorMessage } from '@/utils/error';
import { calculateStandings } from './helpers';
import type { OnScheduleMatch, OnSelectBracketMatch } from './types';
import { getBracketStatLabels, resolveBracketMatchRules } from './sportRuleDisplay';
import toast from 'react-hot-toast';

interface Props {
  matches: BracketMatch[];
  tiebreakerMode?: 'split' | 'playoff';
  onScheduleMatch?: OnScheduleMatch;
  selectedMatchId?: string | null;
  onSelectMatch?: OnSelectBracketMatch;
  tournamentId?: string;
  stageId?: string;
  fallbackSportRuleKind?: SportRuleKind;
}

export function RoundRobinView({
  matches,
  tiebreakerMode = 'split',
  onScheduleMatch,
  selectedMatchId,
  onSelectMatch,
  tournamentId,
  stageId,
  fallbackSportRuleKind,
}: Props) {
  const sampleMatch = matches.find((match) => !match.isBye) ?? matches[0];
  const effectiveRuleKind = sampleMatch
    ? resolveBracketMatchRules(sampleMatch, fallbackSportRuleKind).kind
    : (fallbackSportRuleKind ?? 'BADMINTON');
  const statLabels = getBracketStatLabels(effectiveRuleKind);
  const { standings, ties } = calculateStandings(matches, {
    tiebreakerMode,
  });
  const tieSet = new Set(ties.flatMap((g) => g.map((r) => r.participantId)));
  const allDone = matches.length > 0 && matches.filter((m) => !m.isBye).every((m) => m.status === 'COMPLETED');
  const hasTies = ties.length > 0;
  const hasDraws = standings.some((row) => row.draws > 0);
  const [showInfo, setShowInfo] = useState(false);

  const byRound: Record<number, BracketMatch[]> = {};
  matches.forEach((m) => {
    if (!byRound[m.roundNumber]) byRound[m.roundNumber] = [];
    byRound[m.roundNumber].push(m);
  });
  const rounds = Object.keys(byRound)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-8">
      {/* standings table */}
      <div>
        <h5 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /> Bảng xếp hạng
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 hover:bg-slate-400 text-white transition-colors cursor-pointer flex-shrink-0"
            title="Chi tiết cách xếp hạng"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </h5>

        {showInfo && (
          <div className="relative mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 pr-8 text-xs text-blue-900 leading-relaxed">
            <button
              onClick={() => setShowInfo(false)}
              className="absolute top-2 right-2 text-blue-400 hover:text-blue-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <p className="font-bold mb-1.5">Cách tính xếp hạng:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 font-medium">
              <li><b>Điểm xếp hạng (Đ)</b> - Mặc định hệ thống tính Thắng <b>+3</b>, Hòa <b>+1</b>, Thua <b>0</b>{hasDraws ? '' : '; giải hiện tại không phát sinh trận hòa.'}</li>
              <li><b>Đối đầu (H2H)</b> - Xét điểm trong các trận giữa các đội đang bằng điểm</li>
              <li><b>H2H Hiệu số set</b> - (Set thắng - Set thua) chỉ tính các trận đối đầu</li>
              <li><b>H2H {statLabels.aggregateDiffLabel}</b> - ({statLabels.aggregateLabel} ghi - {statLabels.aggregateLabel.toLowerCase()} mất) chỉ tính các trận đối đầu. <span className="text-blue-600">{statLabels.aggregateExample}</span></li>
              <li><b>Hiệu số set tổng</b> - (Tổng set thắng - Tổng set thua) tất cả trận</li>
              <li><b>{statLabels.aggregateDiffLabel} tổng</b> - (Tổng {statLabels.aggregateLabel.toLowerCase()} ghi - tổng {statLabels.aggregateLabel.toLowerCase()} mất) của mọi set đã nhập.</li>
              <li>
                {tiebreakerMode === 'playoff' ? (
                  <><b>Play-off</b> - Nếu vẫn hòa sau 6 bước, đánh trận phụ giữa các đội</>
                ) : (
                  <><b>Đồng hạng</b> - Nếu vẫn hòa sau 6 bước, các đội bằng chỉ số được xếp cùng hạng</>
                )}
              </li>
            </ol>
            <p className="mt-2 pt-2 border-t border-blue-200 text-blue-700">
              <b>Set T/B</b> = Set thắng - Set thua. <b>Set +/-</b> = (Thắng - Thua).<br />
              <b>{statLabels.aggregateLabel} T/B</b> = {statLabels.aggregateLabel} ghi - {statLabels.aggregateLabel.toLowerCase()} mất. <b>{statLabels.aggregateLabel} +/-</b> = (Ghi - Mất).<br />
              <span className="text-blue-600">{statLabels.aggregateExample}</span>
            </p>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
              <tr>
                <th className="px-4 py-3 text-center w-10" rowSpan={2}>#</th>
                <th className="px-4 py-3 text-left min-w-[130px]" rowSpan={2}>Đội</th>
                <th className="px-4 py-3 text-center w-12" rowSpan={2}>Trận</th>
                <th className="px-4 py-3 text-center text-emerald-600 w-9" rowSpan={2}>T</th>
                <th className="px-4 py-3 text-center text-amber-500 w-9" rowSpan={2}>H</th>
                <th className="px-4 py-3 text-center text-rose-500 w-9" rowSpan={2}>B</th>
                <th className="px-4 py-3 text-center border-l border-slate-100" colSpan={2}>Set</th>
                <th className="px-4 py-3 text-center border-l border-slate-100" colSpan={2}>{statLabels.aggregateLabel}</th>
                <th className="px-4 py-3 text-center text-blue-600 bg-blue-50/50 w-12" rowSpan={2}>Đ</th>
                <th className="px-4 py-3 text-center w-10" rowSpan={2} />
              </tr>
              <tr className="text-[9px] text-slate-400 font-semibold">
                <th className="px-3 py-1.5 text-center w-20 border-t border-slate-150 border-l border-slate-100">T/B</th>
                <th className="px-3 py-1.5 text-center w-16 border-t border-slate-150">+/-</th>
                <th className="px-3 py-1.5 text-center w-20 border-t border-slate-150 border-l border-slate-100">T/B</th>
                <th className="px-3 py-1.5 text-center w-16 border-t border-slate-150">+/-</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, idx) => {
                const isTied = tieSet.has(row.participantId);
                return (
                  <tr
                    key={row.participantId}
                    className={
                      'border-b border-slate-100 last:border-0 transition-colors ' +
                      (isTied
                        ? 'bg-amber-50/60 hover:bg-amber-50'
                        : idx === 0 && allDone && !hasTies
                          ? 'bg-amber-50/80 hover:bg-amber-100'
                          : 'hover:bg-slate-50/60')
                    }
                  >
                    <td className="px-3 py-3 text-center">
                      {isTied ? (
                        <span className="text-amber-500 font-black text-xs">?</span>
                      ) : idx === 0 && allDone && !hasTies ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-amber-400 rounded-full ring-2 ring-amber-300 shadow-lg shadow-amber-200">
                          <Trophy className="w-4 h-4 text-white fill-white" />
                        </span>
                      ) : idx === 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-100 rounded-full">
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold text-xs">
                          {idx + 1}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        {row.seed != null && (
                          <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded font-extrabold leading-4">
                            #{row.seed}
                          </span>
                        )}
                        {row.teamName}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-500 font-medium">
                      {row.played}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-600">
                      {row.won}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-amber-500">
                      {row.draws}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-rose-400">
                      {row.lost}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-600 font-semibold">
                      {row.setsWon}-{row.setsLost}
                    </td>
                    <td className={'px-3 py-3 text-center font-semibold ' + (row.setsWon - row.setsLost > 0 ? 'text-emerald-600' : row.setsWon - row.setsLost < 0 ? 'text-rose-500' : 'text-slate-500')}>
                      {row.setsWon - row.setsLost >= 0 ? '+' : ''}
                      {row.setsWon - row.setsLost}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-600 font-semibold">
                      {row.pointsFor}-{row.pointsAgainst}
                    </td>
                    <td className={'px-3 py-3 text-center font-semibold ' + (row.pointsFor - row.pointsAgainst > 0 ? 'text-emerald-600' : row.pointsFor - row.pointsAgainst < 0 ? 'text-rose-500' : 'text-slate-500')}>
                      {row.pointsFor - row.pointsAgainst >= 0 ? '+' : ''}
                      {row.pointsFor - row.pointsAgainst}
                    </td>
                    <td className="px-3 py-3 text-center font-black text-blue-700 bg-blue-50/20">
                      {row.points}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {isTied &&
                        (tiebreakerMode === 'playoff' ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Trận phụ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            Đồng hạng
                          </span>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {ties.length > 0 && tiebreakerMode === 'playoff' && tournamentId && stageId && (
          <div className="mt-2 text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">Hòa:</span>
            {ties.map((group, gi) => (
              <div key={gi} className="inline-flex items-center gap-1.5">
                {group.map((row) => (
                  <span key={row.participantId} className="font-medium text-slate-600">{row.teamName}</span>
                ))}
                {group.length === 2 && (
                  <>
                    <button onClick={async () => {
                      const t = toast.loading('Đang tạo Play-off...');
                      try {
                        await tournamentsApi.createPlayoffMatch(tournamentId!, {
                          stageId: stageId!,
                          participant1Id: group[0].participantId,
                          participant2Id: group[1].participantId,
                        });
                        toast.success('Đã tạo trận Play-off!', { id: t });
                        setTimeout(() => window.location.reload(), 1500);
                      } catch (err) { toast.error(getErrorMessage(err), { id: t }); }
                    }} className="text-blue-500 hover:text-blue-700 hover:underline cursor-pointer">+ Play-off</button>
                    <button onClick={async () => {
                      if (!confirm('Kết thúc sớm? Các trận chưa đấu sẽ bị hủy.')) return;
                      const t = toast.loading('Đang kết thúc...');
                      try {
                        await tournamentsApi.finalizeStage(tournamentId!, stageId!);
                        toast.success('Đã kết thúc stage!', { id: t });
                        setTimeout(() => window.location.reload(), 1500);
                      } catch (err) { toast.error(getErrorMessage(err), { id: t }); }
                    }} className="text-slate-300 hover:text-slate-500 cursor-pointer">(chot)</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Luon hien nut ket thuc som */}
        {tournamentId && stageId && (
          <div className="mt-2 flex justify-end">
            <button onClick={async () => {
              if (!confirm('Kết thúc sớm stage nay? Các trận chưa đấu sẽ bị hủy.')) return;
              const t = toast.loading('Đang kết thúc...');
              try {
                await tournamentsApi.finalizeStage(tournamentId!, stageId!);
                toast.success('Đã kết thúc stage!', { id: t });
                setTimeout(() => window.location.reload(), 1500);
              } catch (err) { toast.error(getErrorMessage(err), { id: t }); }
            }} className="text-[10px] text-slate-400 hover:text-slate-600 underline underline-offset-2 cursor-pointer">
              Kết thúc stage (hủy các trận còn lại)
            </button>
          </div>
        )}
      </div>

      {/* match schedule — flat list (khong chia vong) */}
      <div>
        <h5 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" /> Lịch trận đấu
          <span className="text-[10px] text-slate-400 font-semibold normal-case">
            ({matches.filter((m) => !m.isBye).length} trận)
          </span>
        </h5>

        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 -mx-1 px-1 no-scrollbar">
          {matches.filter((m) => !m.isBye).length === 0 ? (
            <div className="w-full text-center py-10 text-slate-400 italic text-sm border border-dashed border-slate-200 rounded-xl">
              Chưa có trận đấu nào.
            </div>
          ) : (
            <div className="w-full bg-slate-50/60 rounded-xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {matches
                .filter((m) => !m.isBye)
                .sort((a, b) => a.matchOrder - b.matchOrder)
                .map((m) => {
                  const done = m.status === 'COMPLETED';
                  const live = m.status === 'ONGOING';
                  return (
                    <div
                      key={m.id}
                      data-bracket-match-id={m.id}
                      onClick={() => onSelectMatch?.(m)}
                      className={
                        'flex min-h-[148px] cursor-pointer flex-col rounded-xl border p-3.5 text-xs font-semibold shadow-sm transition-all ' +
                        (selectedMatchId === m.id
                          ? 'border-amber-400 ring-4 ring-amber-100 bg-amber-50/60'
                          : live
                            ? 'border-blue-300 bg-blue-50/50'
                            : done
                              ? 'border-emerald-100 bg-emerald-50/20'
                              : 'border-slate-200/80 bg-white')
                      }
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span className="text-[8px] text-slate-400">#{m.matchOrder}</span>
                          <span className="text-[8px] font-extrabold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">Vòng {m.roundNumber}</span>
                        </span>
                        {live && <span className="flex items-center gap-0.5 text-[8px] font-extrabold text-blue-600 animate-pulse"><Play className="w-2 h-2 fill-blue-600" /> LIVE</span>}
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex min-h-[28px] items-center justify-between">
                          <span className={'truncate flex-1 pr-2 ' + (m.winnerId === m.participant1?.id ? 'font-bold text-emerald-800' : 'text-slate-600')}>{m.participant1?.teamName ?? 'Chờ xác định'}</span>
                          <span className={'font-black text-xs ' + (m.winnerId === m.participant1?.id ? 'text-emerald-700' : 'text-slate-400')}>{done || live ? m.p1SetsWon : '-'}</span>
                        </div>
                        <div className="flex min-h-[28px] items-center justify-between">
                          <span className={'truncate flex-1 pr-2 ' + (m.winnerId === m.participant2?.id ? 'font-bold text-emerald-800' : 'text-slate-600')}>{m.participant2?.teamName ?? 'Chờ xác định'}</span>
                          <span className={'font-black text-xs ' + (m.winnerId === m.participant2?.id ? 'text-emerald-700' : 'text-slate-400')}>{done || live ? m.p2SetsWon : '-'}</span>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2.5 border-t border-slate-150 flex flex-1 flex-col justify-end gap-1.5">
                        <div className="flex items-center gap-1 text-[8px] text-slate-400 font-bold">
                          <Clock className="w-2 h-2 flex-shrink-0" />
                          <span className="truncate">{m.scheduledAt ? formatDateTime(m.scheduledAt) : 'Chưa xếp giờ'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[8px] text-slate-400 font-bold">
                          <Info className="w-2 h-2 flex-shrink-0" />
                          <span className="truncate">{m.courtName ? m.courtName + (m.courtAddress ? ' (' + m.courtAddress + ')' : '') : 'Chưa xếp sân'}</span>
                        </div>
                        {onScheduleMatch && !done && m.participant1 && m.participant2 && (
                          <button onClick={() => onScheduleMatch(m)} className="mt-1 w-full text-[8px] font-extrabold text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 rounded-lg py-1 transition-colors cursor-pointer">Xếp Sân & Giờ</button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
