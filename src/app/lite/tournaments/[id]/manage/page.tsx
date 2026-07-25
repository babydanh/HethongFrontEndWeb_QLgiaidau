'use client';

import { use, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { tournamentsApi, type Tournament } from '@/features/tournaments/api';
import { getSportLogo } from '@/constants/sports';
import {
  Trophy, Users, Swords, Calendar,
  Link as LinkIcon, ExternalLink, Copy, ChevronLeft,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

type LiteTab = 'overview' | 'participants' | 'bracket' | 'matches';

const TAB_CONFIG: { key: LiteTab; label: string; icon: typeof Trophy }[] = [
  { key: 'overview', label: 'Tổng quan', icon: Trophy },
  { key: 'participants', label: 'Người tham gia', icon: Users },
  { key: 'bracket', label: 'Bracket', icon: Swords },
  { key: 'matches', label: 'Trận đấu', icon: Calendar },
];

function StatusBadge({ status }: { status: Tournament['status'] }) {
  const map: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Nháp', className: 'bg-slate-100 text-slate-700' },
    REGISTRATION_OPEN: { label: 'Mở đăng ký', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    REGISTRATION_CLOSED: { label: 'Đóng đăng ký', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    UPCOMING: { label: 'Sắp khởi tranh', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    IN_PROGRESS: { label: 'Đang đấu', className: 'bg-rose-50 text-rose-700 border-slate-200' },
    ONGOING: { label: 'Đang đấu', className: 'bg-rose-50 text-rose-700 border-slate-200' },
    COMPLETED: { label: 'Đã kết thúc', className: 'bg-purple-50 text-purple-700 border-purple-200' },
    CANCELLED: { label: 'Đã hủy', className: 'bg-rose-50 text-rose-700 border-slate-200' },
  };
  const cfg = map[status] ?? { label: status, className: 'bg-slate-100 text-slate-700' };
  return (
    <Badge className={`${cfg.className} text-xs font-semibold px-2.5 py-0.5 rounded-full`}>
      {cfg.label}
    </Badge>
  );
}

function SportLabel({ name }: { name?: string | null }) {
  const logo = name ? getSportLogo(name) : null;
  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
      {logo && <img src={logo} alt="" className="w-3.5 h-3.5 object-contain" />}
      {name || 'Chưa xác định'}
    </span>
  );
}

export default function LiteTournamentManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LiteTab>('overview');

  useEffect(() => {
    const fetch = async () => {
      try {
        setIsLoading(true);
        const res = await tournamentsApi.getTournamentById(id);
        setTournament(res.data ?? null);
      } catch {
        setTournament(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleCopyInvite = async () => {
    if (!tournament?.inviteCode) return;
    const joinUrl = `${window.location.origin}/lite/tournaments/join/${tournament.inviteCode}`;
    try {
      await navigator.clipboard.writeText(joinUrl);
      toast.success('Đã sao chép link mời!');
    } catch {
      toast.error('Không thể sao chép. Vui lòng thử lại.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">Đang tải thông tin giải đấu...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="max-w-md bg-white p-8 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Không tìm thấy giải đấu</h2>
          <p className="text-slate-500 mt-2">
            Giải đấu không tồn tại hoặc bạn không có quyền truy cập.
          </p>
        </div>
      </div>
    );
  }

  const inviteUrl = tournament.inviteCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/lite/tournaments/join/${tournament.inviteCode}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <Link
          href="/organizer/tournaments"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> Giải đấu của tôi
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate">
                  {tournament.name}
                </h1>
                <StatusBadge status={tournament.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <SportLabel name={tournament.category?.name} />
                <span className="text-slate-300">|</span>
                <span>{tournament.matchType === 'SINGLES' ? 'Đơn' : tournament.matchType === 'DOUBLES' ? 'Đôi' : tournament.matchType === 'MIXED_DOUBLES' ? 'Đôi nam nữ' : tournament.matchType}</span>
                {tournament.maxParticipants && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span>Tối đa {tournament.maxParticipants} đội</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href={`/tournaments/${tournament.id}`} target="_blank">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                  <ExternalLink className="w-3.5 h-3.5" /> Xem trang giải
                </Button>
              </Link>
              {inviteUrl && (
                <Button size="sm" className="gap-1.5 text-xs font-semibold" onClick={handleCopyInvite}>
                  <Copy className="w-3.5 h-3.5" /> Sao chép link mời
                </Button>
              )}
            </div>
          </div>

          {/* Invite code row */}
          {tournament.inviteCode && (
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 text-sm">
              <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-500 font-medium">Link mời:</span>
              <code className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs font-mono break-all flex-1 min-w-0">
                {inviteUrl}
              </code>
              <Button variant="ghost" size="sm" className="shrink-0" onClick={handleCopyInvite}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-white rounded-lg border border-slate-200 shadow-sm p-1 overflow-x-auto">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-slate-900">Tổng quan giải đấu</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoCard label="Môn thể thao" value={tournament.category?.name || 'Chưa xác định'} />
                <InfoCard label="Hình thức" value={
                  tournament.matchType === 'SINGLES' ? 'Đơn'
                  : tournament.matchType === 'DOUBLES' ? 'Đôi'
                  : tournament.matchType === 'MIXED_DOUBLES' ? 'Đôi nam nữ'
                  : tournament.matchType || 'Chưa xác định'
                } />
                <InfoCard label="Thể thức" value={
                  tournament.format === 'SINGLE_ELIMINATION' ? 'Loại trực tiếp'
                  : tournament.format === 'DOUBLE_ELIMINATION' ? 'Nhánh thắng/thua'
                  : tournament.format === 'ROUND_ROBIN' ? 'Vòng tròn'
                  : tournament.format === 'GROUP_STAGE_KNOCKOUT' ? 'Vòng bảng + loại'
                  : tournament.format || 'Chưa xác định'
                } />
                <InfoCard label="Số đội tối đa" value={tournament.maxParticipants?.toString() || '—'} />
                <InfoCard label="Người tham gia" value={tournament._count?.participants?.toString() || '0'} />
                <InfoCard label="Trận đấu" value={tournament._count?.matches?.toString() || '0'} />
                {tournament.startDate && (
                  <InfoCard label="Ngày bắt đầu" value={new Date(tournament.startDate).toLocaleDateString('vi-VN')} />
                )}
                {tournament.locationAddress && (
                  <InfoCard label="Địa điểm" value={tournament.locationAddress} />
                )}
              </div>
            </div>
          )}

          {activeTab === 'participants' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Người tham gia</h3>
              <p className="text-sm text-slate-500">
                Danh sách người tham gia sẽ được hiển thị sau khi có dữ liệu từ hệ thống.
              </p>
              <div className="bg-slate-50 rounded-lg p-6 text-center text-sm text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Chức năng đang được phát triển</p>
              </div>
            </div>
          )}

          {activeTab === 'bracket' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Bracket</h3>
              <p className="text-sm text-slate-500">
                Sơ đồ thi đấu sẽ được hiển thị sau khi tạo bracket.
              </p>
              <div className="bg-slate-50 rounded-lg p-6 text-center text-sm text-slate-400">
                <Swords className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Chức năng đang được phát triển</p>
              </div>
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Trận đấu</h3>
              <p className="text-sm text-slate-500">
                Danh sách các trận đấu sẽ xuất hiện sau khi bracket được tạo.
              </p>
              <div className="bg-slate-50 rounded-lg p-6 text-center text-sm text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Chức năng đang được phát triển</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-3 space-y-0.5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
