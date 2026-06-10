'use client';

import { useEffect, useState } from 'react';
import { Tournament } from '@/features/tournaments/api';
import { api } from '@/lib/axios';

interface Match {
  id: string;
  status: string;
  roundNumber: number;
  participant1?: { teamName: string };
  participant2?: { teamName: string };
}

interface Props {
  tournament: Tournament;
}

export default function MatchesTab({ tournament }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await api.get(`/matches`, { params: { tournament_id: tournament.id, limit: 100 } });
        if (res.data && res.data.data) {
          setMatches(res.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch matches', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMatches();
  }, [tournament.id]);

  if (isLoading) {
    return <div className="animate-pulse bg-slate-100 h-64 rounded-xl w-full"></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-lg font-bold text-slate-900">Lịch thi đấu</h3>
      
      {matches.length > 0 ? (
        <div className="flex flex-col gap-4">
          {matches.map(match => (
            <div key={match.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
              <div className="flex flex-col items-center gap-2 w-1/3">
                <span className="font-bold text-slate-900">{match.participant1?.teamName || 'TBD'}</span>
              </div>
              <div className="flex flex-col items-center justify-center w-1/3">
                <span className="text-xs font-bold text-slate-400 mb-1">Vòng {match.roundNumber}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  match.status === 'COMPLETED' ? 'bg-slate-100 text-slate-600' :
                  match.status === 'ONGOING' ? 'bg-rose-100 text-rose-600 animate-pulse' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {match.status}
                </span>
              </div>
              <div className="flex flex-col items-center gap-2 w-1/3">
                <span className="font-bold text-slate-900">{match.participant2?.teamName || 'TBD'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-500">
          Chưa có lịch thi đấu.
        </div>
      )}
    </div>
  );
}
