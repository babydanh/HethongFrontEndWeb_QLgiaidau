'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { extractMatchScores } from '@/features/matches/score-display';
import { BracketMatch } from '@/features/tournaments/api';
import { matchesApi } from '@/features/matches/api';
import { socketClient } from '@/lib/socket';
import Link from 'next/link';
import { isNetworkError } from '@/utils/error';
import { getMatchRoundLabel, type TournamentFormatForRoundLabel } from '@/utils/match-round-label';

interface Props {
  limit?: number;
  showAllLink?: boolean;
}

export default function LiveMatchesWidget({ limit = 5, showAllLink = true }: Props) {
  const translate = useTranslations('Common');
  const matchTranslate = useTranslations('Match');
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const socket = socketClient.getMatchSocket();
    let latestItems: BracketMatch[] = [];
    const joinVisibleMatches = (items: BracketMatch[]) => {
      items.forEach((item) => socket.emit('joinMatch', item.id));
    };

    const fetchLiveMatches = async () => {
      try {
        const res = await matchesApi.getMatches({ status: 'ONGOING', limit });
        if (res && res.data) {
          const responseData = res.data as unknown as { data: BracketMatch[] };
          const items = responseData.data || [];
          latestItems = items;
          setMatches(items);
          joinVisibleMatches(items);
        }
      } catch (error: unknown) {
        if (!isNetworkError(error)) {
          console.error('Failed to fetch ongoing matches', error);
        }
        // A failed reconciliation must not make live matches disappear.
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveMatches();
    if (!socket.connected) socket.connect();
    const handleConnect = () => joinVisibleMatches(latestItems);

    const handleMatchUpdate = (raw: BracketMatch | string) => {
      const updated = typeof raw === 'string' ? JSON.parse(raw) as BracketMatch : raw;
      if (!updated?.id) return;
      setMatches((current) => {
        if (updated.status && updated.status !== 'ONGOING') {
          return current.filter((item) => item.id !== updated.id);
        }
        const exists = current.some((item) => item.id === updated.id);
        return exists
          ? current.map((item) => item.id === updated.id ? { ...item, ...updated } : item)
          : [...current, updated];
      });
    };

    socket.on('score:update', handleMatchUpdate);
    socket.on('match:status', handleMatchUpdate);
    socket.on('connect', handleConnect);
    // Poll is only a reconciliation fallback; the socket is the fast path.
    const timer = setInterval(fetchLiveMatches, 30000);
    return () => {
      clearInterval(timer);
      socket.off('score:update', handleMatchUpdate);
      socket.off('match:status', handleMatchUpdate);
      socket.off('connect', handleConnect);
    };
  }, [limit]);

  if (isLoading) {
    return (
      <div className="w-full bg-slate-900/40 border border-slate-800 rounded-lg p-6 backdrop-blur-md animate-pulse">
        <div className="h-6 w-36 bg-slate-800 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-20 bg-slate-800/60 rounded-lg" />
          <div className="h-20 bg-slate-800/60 rounded-lg" />
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return null; // Hide the widget entirely if there are no live matches
  }

  const localizeMatchRoundLabel = (label: string) => label
    .replaceAll('Chung kết tổng', matchTranslate('roundGrandFinal'))
    .replaceAll('Chung kết', matchTranslate('roundFinal'))
    .replaceAll('Bán kết', matchTranslate('roundSemifinal'))
    .replaceAll('Tứ kết', matchTranslate('roundQuarterfinal'))
    .replaceAll('Vòng bảng', matchTranslate('roundGroupStage'))
    .replaceAll('Nhánh thắng', matchTranslate('winnersBracket'))
    .replaceAll('Nhánh thua', matchTranslate('losersBracket'))
    .replaceAll('Lượt', matchTranslate('leg'))
    .replace(/Vòng (\d+)/g, (_, round) => matchTranslate('roundOf', { round }));

  return (
    <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-lg p-5 md:p-6 backdrop-blur-md shadow-xl flex flex-col gap-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-rose-500 font-sans">
              {translate('liveNow')}
          </h3>
          <span className="text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-semibold">
              {translate('matchCount', { count: matches.length })}
          </span>
        </div>
        {showAllLink && (
          <Link
            href="/tournaments"
            className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
                {translate('viewAllMatches')}
          </Link>
        )}
      </div>

      {/* Matches List */}
      <div className="flex flex-col gap-3 relative z-10">
        {matches.map((match) => {
          const sets = extractMatchScores(match.scoreDetails);
          const tournamentInfo = match.tournament as {
            format?: TournamentFormatForRoundLabel;
            maxParticipants?: number | null;
          } | null | undefined;
          const roundLabel = localizeMatchRoundLabel(getMatchRoundLabel({
            match,
            matches,
            tournamentFormat: tournamentInfo?.format,
            bracketSize: tournamentInfo?.maxParticipants ?? null,
          }));
          return (
            <div
              key={match.id}
              className="group bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-lg p-4 transition-all duration-300 flex flex-col md:flex-row justify-between items-center gap-4"
            >
              {/* Match context */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left md:w-1/3">
                <span className="text-xs font-medium text-blue-400 font-sans line-clamp-1">
                  {roundLabel} {match.courtName ? `${translate('courtLabel')} ${match.courtName}` : ''}
                </span>
                <span className="text-xs text-slate-400 font-medium line-clamp-1">
                  {match.group?.stage?.name || match.group?.name || translate('matchLabel')}
                </span>
              </div>

              {/* Opponent 1 vs Opponent 2 & Scores */}
              <div className="flex flex-1 justify-center items-center gap-6 w-full md:w-auto">
                {/* Team 1 */}
                <div className="flex-1 text-right max-w-[180px]">
                  <span className="text-sm font-semibold text-white tracking-wide block truncate group-hover:text-blue-300 transition-colors">
                    {match.participant1?.teamName || translate('unknown')}
                  </span>
                  {match.participant1?.seed && (
                    <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1 py-0.2 rounded font-medium ml-1">
                      #{match.participant1.seed}
                    </span>
                  )}
                </div>

                {/* Score Sets display */}
                <div className="flex items-center gap-1.5 min-w-[100px] justify-center bg-slate-950/80 border border-slate-800/80 p-1.5 rounded-lg shadow-inner">
                  {sets.length > 0 ? (
                    sets.map((set, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-0.5 px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">
                        <span className={`text-xs font-bold ${set.team1Score > set.team2Score ? 'text-blue-400' : 'text-slate-500'}`}>
                          {set.team1Score}
                        </span>
                        <span className="w-4 border-t border-slate-800" />
                        <span className={`text-xs font-bold ${set.team2Score > set.team1Score ? 'text-blue-400' : 'text-slate-500'}`}>
                          {set.team2Score}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center py-1">
                      <span className="text-xs font-semibold text-blue-400 animate-pulse">
                        {match.p1SetsWon} : {match.p2SetsWon}
                      </span>
                    </div>
                  )}
                </div>

                {/* Team 2 */}
                <div className="flex-1 text-left max-w-[180px]">
                  <span className="text-sm font-semibold text-white tracking-wide block truncate group-hover:text-blue-300 transition-colors">
                    {match.participant2?.teamName || translate('unknown')}
                  </span>
                  {match.participant2?.seed && (
                    <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1 py-0.2 rounded font-medium ml-1">
                      #{match.participant2.seed}
                    </span>
                  )}
                </div>
              </div>

              {/* View Match Details Button */}
              <div className="md:w-1/3 flex justify-center md:justify-end w-full">
                <Link
                  href={`/live/${match.id}`}
                  className="w-full md:w-auto px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/50 hover:bg-blue-600 border border-slate-700/50 hover:border-blue-500 transition-all text-center cursor-pointer"
                >
                    {translate('viewMatch')}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

