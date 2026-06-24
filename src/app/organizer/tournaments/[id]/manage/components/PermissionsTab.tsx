'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Shield, Users, UserCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { tournamentsApi, StaffMember } from '@/features/tournaments/api';
import { getErrorMessage } from '@/utils/error';
import toast from 'react-hot-toast';

interface PermissionsTabProps {
  id: string;
  tournament: {
    id: string;
    organizer?: {
      id: string;
      fullName: string;
      avatarUrl?: string | null;
    } | null;
    contactInfo?: {
      email?: string;
    } | null;
  } | null;
}

export function PermissionsTab({ id, tournament }: PermissionsTabProps) {
  const [subTab, setSubTab] = useState<'organizers' | 'referees' | 'viewers'>('organizers');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await tournamentsApi.getTournamentStaff(id);
      if (res.data) setStaff(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const roleMap: Record<string, string> = {
    organizers: 'CO_ORGANIZER',
    referees: 'REFEREE',
    viewers: 'SPECTATOR',
  };

  const currentRole = roleMap[subTab];
  const filteredStaff = staff.filter((s) => s.role === currentRole);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsAdding(true);
    try {
      await tournamentsApi.addTournamentStaff(id, { email: email.trim(), role: currentRole });
      toast.success('Thêm thành công!');
      setEmail('');
      fetchStaff();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await tournamentsApi.removeTournamentStaff(id, userId);
      toast.success('Đã xóa nhân sự!');
      fetchStaff();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
      <div className="border-b pb-2 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quản Lý Phân Quyền</h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Nhập email người dùng hệ thống để thêm vào giải đấu.
          </p>
        </div>
        <div className="flex border-b border-slate-200 gap-6 mt-2">
          {(['organizers', 'referees', 'viewers'] as const).map((tab) => (
            <button key={tab} onClick={() => setSubTab(tab)}
              className={'pb-3 font-bold text-sm transition-all border-b-2 -mb-[2px] ' + (subTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800')}
            >
              {tab === 'organizers' ? 'Ban Tổ Chức' : tab === 'referees' ? 'Trọng Tài' : 'Khách Xem'}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleAdd} className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex sm:flex-row items-end gap-4 max-w-xl">
        <div className="flex-1 w-full space-y-1">
          <label className="block text-xs font-bold text-slate-700">Email người dùng</label>
          <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white text-sm h-10 w-full" required />
        </div>
        <Button type="submit" disabled={isAdding || !email.trim()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-5 rounded-xl shrink-0">
          {isAdding ? 'Đang thêm...' : 'Thêm'}
        </Button>
      </form>

      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
          {subTab === 'organizers' ? <Users className="w-5 h-5 text-indigo-600" /> : subTab === 'referees' ? <Shield className="w-5 h-5 text-blue-600" /> : <UserCheck className="w-5 h-5 text-violet-600" />}
          Danh sách {subTab === 'organizers' ? 'Ban Tổ Chức' : subTab === 'referees' ? 'Trọng Tài' : 'Khách Xem'}
        </h3>

        {isLoading ? (
          <div className="text-center py-10 text-slate-400 italic text-xs">Đang tải...</div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-10 text-slate-400 italic text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            Chua co ai. Nhap email ben tren de them.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredStaff.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative group overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 shrink-0 uppercase overflow-hidden">
                  {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : m.fullName?.charAt(0) || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 text-xs truncate">{m.fullName}</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate">{m.email}</div>
                </div>
                <button onClick={() => handleRemove(m.userId)} className="text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity p-1" title="Xoa">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
