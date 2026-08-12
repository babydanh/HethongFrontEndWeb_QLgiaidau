'use client';

import { useRouter } from 'next/navigation';
import { Activity, Trophy, Medal, ChevronRight, Calendar, Users } from 'lucide-react';
import { EloTierBadge } from '@/components/ui/EloTierBadge';

// ============================================================
// MOCK DATA (P2A.2) — thay bằng getCommunityDashboard(id) khi
// API dashboard được nối ở phase sau. Giữ nguyên shape 3 khối.
// ============================================================

interface MockMatch {
  id: string;
  teamA: string;
  teamB: string;
  score: string;
  result: 'WIN' | 'LOSS';
  eloDelta: number;
}

interface MockTournament {
  id: string;
  name: string;
  status: 'ONGOING' | 'UPCOMING';
  participantCount: number;
}

interface MockPlayer {
  id: string;
  fullName: string;
  elo: number;
  tierName?: string;
  winStreak: number;
}

const mockMatches: MockMatch[] = [
  {
    id: 'm1',
    teamA: 'Nguyễn Anh Tuấn & Trần Minh Hiếu',
    teamB: 'Lê Quốc Bảo & Phạm Hoàng Nam',
    score: '3-1',
    result: 'WIN',
    eloDelta: 14,
  },
  {
    id: 'm2',
    teamA: 'Hoàng Văn Long',
    teamB: 'Đỗ Minh Quân',
    score: '1-3',
    result: 'LOSS',
    eloDelta: -8,
  },
  {
    id: 'm3',
    teamA: 'Vũ Thị Hồng & Ngô Thanh Tú',
    teamB: 'Đặng Gia Huy',
    score: '3-2',
    result: 'WIN',
    eloDelta: 6,
  },
];

const mockFeaturedTournament: MockTournament | null = {
  id: 'mock-tournament-1',
  name: 'Giải Cầu Lông CLB Sao Đỏ mở rộng 2026',
  status: 'ONGOING',
  participantCount: 32,
};

const mockTopPlayers: MockPlayer[] = [
  { id: 'p1', fullName: 'Nguyễn Anh Tuấn', elo: 1850, tierName: 'Tier S', winStreak: 3 },
  { id: 'p2', fullName: 'Trần Minh Hiếu', elo: 1720, tierName: 'High Tier A', winStreak: 2 },
  { id: 'p3', fullName: 'Lê Quốc Bảo', elo: 1640, tierName: 'Low Tier A', winStreak: 1 },
];

interface OverviewTabProps {
  onGoToTournaments?: () => void;
  onGoToRankings?: () => void;
}

const rankBadgeClasses = [
  'bg-amber-100 text-amber-700',
  'bg-slate-200 text-slate-700',
  'bg-orange-100 text-orange-700',
];

function SectionTitle({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {action}
    </div>
  );
}

function EmptyBlock({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
      <div className="text-slate-300 mx-auto mb-2 flex justify-center">{icon}</div>
      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{text}</p>
    </div>
  );
}

function ViewAllLink({ label, onClick }: { label: string; onClick?: () => void }) {
  if (!onClick) return null;
  return (
    <button
      onClick={onClick}
      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 shrink-0 transition-colors"
    >
      {label}
      <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
    </button>
  );
}

export default function OverviewTab({ onGoToTournaments, onGoToRankings }: OverviewTabProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Khối 1 — TRẬN MỚI NHẤT */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
        <SectionTitle
          icon={<Activity className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />}
          title="Trận mới nhất"
          action={<ViewAllLink label="Xem tất cả" onClick={onGoToTournaments} />}
        />

        {mockMatches.length === 0 ? (
          <EmptyBlock icon={<Activity className="w-10 h-10" />} text="Chưa có trận đấu nào" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {mockMatches.map((m) => (
              <li key={m.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-semibold text-slate-800">
                    {m.teamA}
                    <span className="text-slate-400 font-bold mx-1.5">{m.score}</span>
                    {m.teamB}
                  </p>
                  <span
                    className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      m.result === 'WIN'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {m.result === 'WIN' ? `THẮNG +${m.eloDelta}` : `THUA ${m.eloDelta}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Khối 3 — TOP 3 VĐV */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
        <SectionTitle
          icon={<Medal className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />}
          title="Top 3 VĐV"
          action={<ViewAllLink label="Xem BXH" onClick={onGoToRankings} />}
        />

        {mockTopPlayers.length === 0 ? (
          <EmptyBlock icon={<Medal className="w-10 h-10" />} text="Chưa có xếp hạng nào" />
        ) : (
          <ul className="space-y-3">
            {mockTopPlayers.map((p, idx) => (
              <li key={p.id} className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${rankBadgeClasses[idx] || 'bg-slate-100 text-slate-600'}`}
                >
                  {idx + 1}
                </span>
                <span className="flex-1 min-w-0 truncate text-sm font-semibold text-slate-800">
                  {p.fullName}
                </span>
                <EloTierBadge elo={p.elo} tierName={p.tierName} size="sm" />
                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  THẮNG x{p.winStreak}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Khối 2 — GIẢI NỔI BẬT (full width) */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 p-5">
        <SectionTitle
          icon={<Trophy className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />}
          title="Giải nổi bật"
        />

        {!mockFeaturedTournament ? (
          <EmptyBlock icon={<Trophy className="w-10 h-10" />} text="Chưa có giải đấu nổi bật" />
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{mockFeaturedTournament.name}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {mockFeaturedTournament.status === 'ONGOING' ? 'Đang diễn ra' : 'Sắp diễn ra'}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {mockFeaturedTournament.participantCount} VĐV
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  mockFeaturedTournament.status === 'ONGOING'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {mockFeaturedTournament.status === 'ONGOING' ? 'ĐANG DIỄN RA' : 'SẮP DIỄN RA'}
              </span>
              <button
                onClick={() => router.push(`/tournaments/${mockFeaturedTournament.id}`)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 transition-colors"
              >
                Xem giải
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
