'use client';

import { useEffect, useState } from 'react';
import { Tournament } from '@/features/tournaments/api';
import { api } from '@/lib/axios';

// Since we don't have participants in Tournament type by default, we'll fetch or assume empty
interface Participant {
  id: string;
  teamName: string;
  registeredBy: string;
  isPaid: boolean;
  registeredAt: string;
}

interface Props {
  tournament: Tournament;
}

export default function TeamsTab({ tournament }: Props) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real scenario with full API, we would fetch participants
    // For now, if the backend doesn't have this API yet, we catch the error and show empty list
    const fetchParticipants = async () => {
      try {
        // Attempting to fetch participants if the route exists
        const res = await api.get(`/tournaments/${tournament.id}/participants`);
        if (res.data && res.data.data) {
          setParticipants(res.data.data);
        }
      } catch (error) {
        console.warn('Could not fetch participants, maybe endpoint is not ready:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchParticipants();
  }, [tournament.id]);

  if (isLoading) {
    return <div className="animate-pulse bg-slate-100 h-64 rounded-xl w-full"></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">Danh sách đội tham gia ({participants.length}/{tournament.maxParticipants || '∞'})</h3>
      </div>
      
      {participants.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold">#</th>
                <th className="px-6 py-4 font-bold">Tên đội / Tuyển thủ</th>
                <th className="px-6 py-4 font-bold">Thanh toán</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((team, index) => (
                <tr key={team.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{index + 1}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{team.teamName}</td>
                  <td className="px-6 py-4">
                    {team.isPaid ? (
                      <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-bold">Đã đóng phí</span>
                    ) : (
                      <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-xs font-bold">Chờ thanh toán</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-500">
          Chưa có đội nào đăng ký tham gia.
        </div>
      )}
    </div>
  );
}
