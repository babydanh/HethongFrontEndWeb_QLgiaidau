'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Referee {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
}

interface RefereesTabProps {
  id: string;
  referees: Referee[];
  refereeEmail: string;
  setRefereeEmail: (email: string) => void;
  isAddingReferee: boolean;
  onAddReferee: (e: React.FormEvent) => void;
}

export function RefereesTab({
  referees,
  refereeEmail,
  setRefereeEmail,
  isAddingReferee,
  onAddReferee
}: RefereesTabProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
      <div className="border-b pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Ban Trọng Tài</h2>
          <p className="text-xs text-slate-455 mt-1 font-semibold">Thêm và quản lý danh sách trọng tài phụ trách điều khiển trận đấu.</p>
        </div>
      </div>

      {/* Add Referee Form */}
      <form
        onSubmit={onAddReferee}
        className="bg-slate-50 p-5 rounded-lg border border-slate-150 flex flex-col sm:flex-row items-end gap-4 max-w-xl"
      >
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Email trọng tài</label>
          <Input
            type="email"
            placeholder="trongtai@gmail.com"
            value={refereeEmail}
            onChange={(e) => setRefereeEmail(e.target.value)}
            className="bg-white text-sm h-10 w-full"
            required
          />
        </div>
        <Button
          type="submit"
          disabled={isAddingReferee}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-5 rounded-lg shrink-0"
        >
          {isAddingReferee ? 'Đang gửi mời...' : 'Gửi lời mời'}
        </Button>
      </form>

      {/* Referees List */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
          <Shield className="w-5 h-5 text-blue-600" /> Danh sách trọng tài
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {referees.map((ref) => (
            <div key={ref.id} className="flex items-center gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm relative group overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-slate-200 flex items-center justify-center font-bold text-xs text-indigo-650 shrink-0 uppercase overflow-hidden">
                {ref.avatarUrl ? (
                  <img src={ref.avatarUrl} alt="Ảnh đại diện trọng tài" className="w-full h-full object-cover" />
                ) : (
                  ref.fullName.charAt(0)
                )}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-xs truncate">{ref.fullName}</div>
                <div className="text-[10px] text-slate-455 font-semibold mt-0.5">Trạng thái: 
                  <span className="ml-1 text-emerald-650 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-bold">Hoạt động</span>
                </div>
              </div>
            </div>
          ))}
          {referees.length === 0 && (
            <div className="col-span-full text-center py-10 text-slate-455 italic text-xs border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
              Chưa có trọng tài nào trong ban trọng tài. Hãy mời trọng tài đầu tiên bằng Email ở trên.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
