'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Users, UserCheck, Trash2, Mail, PlusCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

export interface Referee {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
}

interface Organizer {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: 'OWNER' | 'CO_ORGANIZER';
}

interface Spectator {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
}

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
  referees: Referee[];
  refereeEmail: string;
  setRefereeEmail: (email: string) => void;
  isAddingReferee: boolean;
  onAddReferee: (e: React.FormEvent) => void;
}

export function PermissionsTab({
  id,
  tournament,
  referees,
  refereeEmail,
  setRefereeEmail,
  isAddingReferee,
  onAddReferee
}: PermissionsTabProps) {
  const [subTab, setSubTab] = useState<'organizers' | 'referees' | 'viewers'>('organizers');

  // Co-organizers state
  const [coOrganizers, setCoOrganizers] = useState<Organizer[]>(() => {
    if (typeof window !== 'undefined') {
      const storedCo = localStorage.getItem(`tournament_${id}_coorganizers`);
      if (storedCo) {
        try {
          return JSON.parse(storedCo);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });
  const [coOrganizerEmail, setCoOrganizerEmail] = useState('');
  const [coOrganizerName, setCoOrganizerName] = useState('');
  const [isAddingCoOrganizer, setIsAddingCoOrganizer] = useState(false);

  // Spectators state
  const [spectators, setSpectators] = useState<Spectator[]>(() => {
    if (typeof window !== 'undefined') {
      const storedSpectators = localStorage.getItem(`tournament_${id}_spectators`);
      if (storedSpectators) {
        try {
          return JSON.parse(storedSpectators);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });
  const [spectatorEmail, setSpectatorEmail] = useState('');
  const [spectatorName, setSpectatorName] = useState('');
  const [isAddingSpectator, setIsAddingSpectator] = useState(false);

  const handleAddCoOrganizer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coOrganizerEmail.trim() || !coOrganizerName.trim()) return;
    setIsAddingCoOrganizer(true);
    setTimeout(() => {
      const newCo: Organizer = {
        id: 'co_' + Math.random().toString(36).substr(2, 9),
        fullName: coOrganizerName.trim(),
        email: coOrganizerEmail.trim(),
        role: 'CO_ORGANIZER'
      };
      const updated = [...coOrganizers, newCo];
      setCoOrganizers(updated);
      localStorage.setItem(`tournament_${id}_coorganizers`, JSON.stringify(updated));
      setCoOrganizerEmail('');
      setCoOrganizerName('');
      setIsAddingCoOrganizer(false);
      toast.success('Đã mời Đồng ban tổ chức thành công!');
    }, 400);
  };

  const handleDeleteCoOrganizer = (coId: string) => {
    const updated = coOrganizers.filter(item => item.id !== coId);
    setCoOrganizers(updated);
    localStorage.setItem(`tournament_${id}_coorganizers`, JSON.stringify(updated));
    toast.success('Đã gỡ quyền Đồng ban tổ chức!');
  };

  const handleAddSpectator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spectatorEmail.trim() || !spectatorName.trim()) return;
    setIsAddingSpectator(true);
    setTimeout(() => {
      const newViewer: Spectator = {
        id: 'viewer_' + Math.random().toString(36).substr(2, 9),
        fullName: spectatorName.trim(),
        email: spectatorEmail.trim()
      };
      const updated = [...spectators, newViewer];
      setSpectators(updated);
      localStorage.setItem(`tournament_${id}_spectators`, JSON.stringify(updated));
      setSpectatorEmail('');
      setSpectatorName('');
      setIsAddingSpectator(false);
      toast.success('Đã mời Khách xem thành công!');
    }, 400);
  };

  const handleDeleteSpectator = (viewerId: string) => {
    const updated = spectators.filter(item => item.id !== viewerId);
    setSpectators(updated);
    localStorage.setItem(`tournament_${id}_spectators`, JSON.stringify(updated));
    toast.success('Đã gỡ quyền Khách xem!');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
      <div className="border-b pb-2 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quản Lý Phân Quyền</h2>
          <p className="text-xs text-slate-455 mt-1 font-semibold">
            Thiết lập vai trò tổ chức, phân công trọng tài điều khiển và chia sẻ quyền xem riêng tư của giải đấu.
          </p>
        </div>

        {/* Sub-tabs navigation */}
        <div className="flex border-b border-slate-200 gap-6 mt-2">
          <button
            onClick={() => setSubTab('organizers')}
            className={`pb-3 font-bold text-sm transition-all border-b-2 -mb-[2px] ${
              subTab === 'organizers'
                ? 'border-indigo-650 text-indigo-650'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Ban Tổ Chức
          </button>
          <button
            onClick={() => setSubTab('referees')}
            className={`pb-3 font-bold text-sm transition-all border-b-2 -mb-[2px] ${
              subTab === 'referees'
                ? 'border-blue-650 text-blue-650'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Trọng Tài
          </button>
          <button
            onClick={() => setSubTab('viewers')}
            className={`pb-3 font-bold text-sm transition-all border-b-2 -mb-[2px] ${
              subTab === 'viewers'
                ? 'border-violet-650 text-violet-650'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Khách Xem (Spectators)
          </button>
        </div>
      </div>

      {/* Subtab 1: Organizers */}
      {subTab === 'organizers' && (
        <div className="space-y-6">
          <form
            onSubmit={handleAddCoOrganizer}
            className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col sm:flex-row items-end gap-4 max-w-2xl"
          >
            <div className="flex-1 w-full space-y-1">
              <label className="block text-xs font-bold text-slate-700">Tên đồng tổ chức</label>
              <Input
                type="text"
                placeholder="Nguyễn Văn A"
                value={coOrganizerName}
                onChange={(e) => setCoOrganizerName(e.target.value)}
                className="bg-white text-sm h-10 w-full"
                required
              />
            </div>
            <div className="flex-1 w-full space-y-1">
              <label className="block text-xs font-bold text-slate-700">Email đồng tổ chức</label>
              <Input
                type="email"
                placeholder="dongtochuc@gmail.com"
                value={coOrganizerEmail}
                onChange={(e) => setCoOrganizerEmail(e.target.value)}
                className="bg-white text-sm h-10 w-full"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isAddingCoOrganizer}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-5 rounded-xl shrink-0"
            >
              {isAddingCoOrganizer ? 'Đang thêm...' : 'Mời BTC'}
            </Button>
          </form>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
              <Users className="w-5 h-5 text-indigo-650" /> Danh sách Ban Tổ Chức
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Primary Owner / Main Organizer */}
              <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border-2 border-indigo-100 shadow-sm relative group overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-xs text-indigo-650 shrink-0 uppercase overflow-hidden">
                  {tournament?.organizer?.avatarUrl ? (
                    <img src={tournament.organizer.avatarUrl} alt="Owner Avatar" className="w-full h-full object-cover" />
                  ) : (
                    tournament?.organizer?.fullName?.charAt(0) || 'O'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 text-xs truncate">
                    {tournament?.organizer?.fullName || 'Người tổ chức giải đấu'}
                  </div>
                  <div className="text-[10px] text-slate-455 font-semibold mt-0.5 truncate">
                    {tournament?.contactInfo?.email || 'Chủ sở hữu'}
                  </div>
                  <div className="mt-1">
                    <span className="text-[9px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-150 font-bold uppercase tracking-wider">
                      Trưởng BTC / Chủ giải
                    </span>
                  </div>
                </div>
              </div>

              {/* Co-organizers */}
              {coOrganizers.map((co) => (
                <div key={co.id} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative group overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 shrink-0 uppercase overflow-hidden">
                    {co.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-xs truncate">{co.fullName}</div>
                    <div className="text-[10px] text-slate-455 font-semibold mt-0.5 truncate">{co.email}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[9px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150 font-semibold">
                        Đồng Tổ Chức
                      </span>
                      <button
                        onClick={() => handleDeleteCoOrganizer(co.id)}
                        className="text-rose-500 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        title="Xóa quyền đồng tổ chức"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Referees */}
      {subTab === 'referees' && (
        <div className="space-y-6">
          <form
            onSubmit={onAddReferee}
            className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col sm:flex-row items-end gap-4 max-w-xl"
          >
            <div className="flex-1 w-full space-y-1">
              <label className="block text-xs font-bold text-slate-700">Email trọng tài</label>
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-5 rounded-xl shrink-0"
            >
              {isAddingReferee ? 'Đang thêm...' : 'Thêm trọng tài'}
            </Button>
          </form>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
              <Shield className="w-5 h-5 text-blue-600" /> Danh sách trọng tài điều hành
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {referees.map((ref) => (
                <div key={ref.id} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative group overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 border border-slate-200 flex items-center justify-center font-bold text-xs text-indigo-650 shrink-0 uppercase overflow-hidden">
                    {ref.avatarUrl ? (
                      <img src={ref.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
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
                <div className="col-span-full text-center py-10 text-slate-455 italic text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  Chưa có trọng tài nào được thêm. Hãy nhập Email ở trên để phân quyền trọng tài.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subtab 3: Viewers (Spectators) */}
      {subTab === 'viewers' && (
        <div className="space-y-6">
          <form
            onSubmit={handleAddSpectator}
            className="bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col sm:flex-row items-end gap-4 max-w-2xl"
          >
            <div className="flex-1 w-full space-y-1">
              <label className="block text-xs font-bold text-slate-700">Tên khách xem</label>
              <Input
                type="text"
                placeholder="Trần Thị B"
                value={spectatorName}
                onChange={(e) => setSpectatorName(e.target.value)}
                className="bg-white text-sm h-10 w-full"
                required
              />
            </div>
            <div className="flex-1 w-full space-y-1">
              <label className="block text-xs font-bold text-slate-700">Email khách xem</label>
              <Input
                type="email"
                placeholder="spectator@gmail.com"
                value={spectatorEmail}
                onChange={(e) => setSpectatorEmail(e.target.value)}
                className="bg-white text-sm h-10 w-full"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isAddingSpectator}
              className="bg-violet-600 hover:bg-violet-700 text-white font-bold h-10 px-5 rounded-xl shrink-0"
            >
              {isAddingSpectator ? 'Đang thêm...' : 'Thêm khách'}
            </Button>
          </form>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
              <UserCheck className="w-5 h-5 text-violet-650" /> Danh sách khách mời xem giải
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {spectators.map((spec) => (
                <div key={spec.id} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative group overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-violet-50 border border-violet-200 flex items-center justify-center font-bold text-xs text-violet-650 shrink-0 uppercase overflow-hidden">
                    {spec.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-xs truncate">{spec.fullName}</div>
                    <div className="text-[10px] text-slate-455 font-semibold mt-0.5 truncate">{spec.email}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[9px] text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-150 font-semibold">
                        Khách xem đặc biệt
                      </span>
                      <button
                        onClick={() => handleDeleteSpectator(spec.id)}
                        className="text-rose-500 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        title="Gỡ quyền khách xem"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {spectators.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-455 italic text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  Chưa có khách xem nào được phân quyền. Mời khách xem bằng email phía trên.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
