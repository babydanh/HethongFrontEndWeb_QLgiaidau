'use client';

import React from 'react';
import type { BracketMatch } from '@/features/tournaments/api';
import { extractMatchScores } from '@/features/matches/score-display';
import { calculateStandings } from './helpers';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  matches: BracketMatch[];
  groupName?: string;
  activeLeg?: number;
  legCount?: number;
  onLegChange?: (leg: number) => void;
  roundNavigation?: React.ReactNode;
}

export function GroupCrossMatrixView({ 
  matches, 
  groupName = 'Group A',
  activeLeg = 1,
  legCount = 1,
  onLegChange,
  roundNavigation,
}: Props) {
  const { standings } = calculateStandings(matches, { tiebreakerMode: 'split' });

  // Map participant index (1-based)
  const participantMap = new Map(
    standings.map((team, idx) => [team.participantId, idx + 1])
  );

  // Quick lookup matrix: matchResult[p1Id][p2Id] = array of per-set score strings
  const scoreMatrix: Record<string, Record<string, string[]>> = {};

  matches.forEach((m) => {
    if (m.isBye || !m.participant1 || !m.participant2) return;
    const p1Id = m.participant1.id;
    const p2Id = m.participant2.id;

    if (!scoreMatrix[p1Id]) scoreMatrix[p1Id] = {};
    if (!scoreMatrix[p2Id]) scoreMatrix[p2Id] = {};

      const isCompleted = m.status === 'COMPLETED' || m.winnerId != null;
      const isOngoing = m.status === 'ONGOING' || m.status === 'IN_PROGRESS';

      if (isCompleted || isOngoing) {
        const football = m.scoreDetails?.football;
        const footballGoals = football && typeof football === 'object'
          ? [
              (football as Record<string, unknown>).team1Goals ?? (football as Record<string, unknown>).p1Goals,
              (football as Record<string, unknown>).team2Goals ?? (football as Record<string, unknown>).p2Goals,
            ].map((value) => Number(value))
          : [];
        if (footballGoals.length === 2 && footballGoals.every((value) => Number.isFinite(value) && value >= 0)) {
          scoreMatrix[p1Id][p2Id] = [`${footballGoals[0]}-${footballGoals[1]}`];
          scoreMatrix[p2Id][p1Id] = [`${footballGoals[1]}-${footballGoals[0]}`];
          return;
        }
        const p1Sets = m.p1SetsWon ?? 0;
      const p2Sets = m.p2SetsWon ?? 0;

      // Extract all individual set scores (Bo3/Bo5: [21-15, 18-21, 21-19])
      const setScores = extractMatchScores(
        m.scoreDetails as Record<string, unknown> | null | undefined
      );

      if (setScores.length > 0) {
        scoreMatrix[p1Id][p2Id] = setScores.map((s) => `${s.team1Score}-${s.team2Score}`);
        scoreMatrix[p2Id][p1Id] = setScores.map((s) => `${s.team2Score}-${s.team1Score}`);
      } else {
        // Fallback: only sets won count
        scoreMatrix[p1Id][p2Id] = [`${p1Sets}-${p2Sets}`];
        scoreMatrix[p2Id][p1Id] = [`${p2Sets}-${p1Sets}`];
      }
    }
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="font-bold text-sm text-slate-800">
          {groupName}
        </div>
        {legCount > 1 && onLegChange && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onLegChange(Math.max(activeLeg - 1, 1))}
              disabled={activeLeg <= 1}
              className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-600 min-w-10 text-center">
              {activeLeg} / {legCount}
            </span>
            <button
              type="button"
              onClick={() => onLegChange(Math.min(activeLeg + 1, legCount))}
              disabled={activeLeg >= legCount}
              className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        {roundNavigation}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-200 font-bold text-slate-600">
            <tr>
              <th className="px-3 py-2.5 text-center w-10">No.</th>
              <th className="px-4 py-2.5 text-left min-w-[180px]">Players</th>
              {standings.map((_, idx) => (
                <th key={idx} className="px-3 py-2.5 text-center w-14 border-l border-slate-100">
                  {idx + 1}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center w-16 border-l border-slate-200 bg-slate-100/60 font-bold text-slate-700">
                W / L
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {standings.map((row, idx) => {
              const currentNum = idx + 1;
              return (
                <tr key={row.participantId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-3 text-center text-slate-400 font-medium">
                    {currentNum}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {row.teamName}
                  </td>
                  {standings.map((otherRow) => {
                    const isSelf = row.participantId === otherRow.participantId;
                    const sets = scoreMatrix[row.participantId]?.[otherRow.participantId];

                    return (
                      <td
                        key={otherRow.participantId}
                        className={`px-2 py-3 text-center font-semibold border-l border-slate-100 ${
                          isSelf ? 'bg-slate-100/70' : ''
                        }`}
                      >
                        {isSelf ? (
                          ''
                        ) : sets ? (
                          <span className="flex flex-col items-center gap-0.5">
                            {sets.map((s, i) => (
                              <span key={i} className="text-slate-800 text-xs leading-tight whitespace-nowrap">
                                {s}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center font-bold border-l border-slate-200 bg-slate-50/40">
                    <span className="text-emerald-600">{row.won}</span>
                    <span className="text-slate-300 mx-1">/</span>
                    <span className="text-rose-500">{row.lost}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
