'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { tournamentsApi, type Tournament } from '@/features/tournaments/api';
import { getSportLogo } from '@/constants/sports';
import {
  Trophy, Users, Swords, Calendar,
  Link as LinkIcon, ExternalLink, Copy, ChevronLeft,
  AlertTriangle, CheckCircle, RefreshCw, UserPlus, Shuffle,
  Unlink, Loader2, User, FlaskConical,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import type { LiteParticipant } from '@/types/tournament';
import { LiteInviteQr } from '@/components/tournaments/LiteInviteQr';
import { buildLiteJoinUrl } from '@/features/tournaments/lite-qr';

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
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LiteTab>('overview');
  const [rulesEditing, setRulesEditing] = useState(false);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [ruleSetsToWin, setRuleSetsToWin] = useState(2);
  const [rulePointsPerSet, setRulePointsPerSet] = useState(21);
  const [ruleMaxPoints, setRuleMaxPoints] = useState(30);
  const [ruleWinByTwo, setRuleWinByTwo] = useState(true);
  const [ruleHalves, setRuleHalves] = useState(2);
  const [ruleHalfDuration, setRuleHalfDuration] = useState(45);
  const [ruleAllowDraw, setRuleAllowDraw] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        setIsLoading(true);
        const res = await tournamentsApi.getTournamentById(id);
        const loaded = res.data ?? null;
        setTournament(loaded);
        if (loaded?.sportRules?.kind === 'FOOTBALL') {
          setRuleHalves(Number(loaded.sportRules.halvesCount ?? 2));
          setRuleHalfDuration(Number(loaded.sportRules.halfDuration ?? 45));
          setRuleAllowDraw(loaded.sportRules.allowDraw !== false);
        } else if (loaded?.sportRules) {
          setRuleSetsToWin(Number(loaded.sportRules.setsToWin ?? 2));
          setRulePointsPerSet(Number(loaded.sportRules.pointsPerSet ?? 21));
          setRuleMaxPoints(Number(loaded.sportRules.maxPoints ?? 30));
          setRuleWinByTwo(loaded.sportRules.winByTwo !== false);
        }
        const bracket = await tournamentsApi.getTournamentBracket(id);
        setHasBracket(Boolean(bracket.data?.stages?.length));
      } catch {
        setTournament(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleSaveRules = async () => {
    if (!tournament || ['IN_PROGRESS', 'ONGOING', 'COMPLETED'].includes(tournament.status)) {
      toast.error('Không thể đổi luật sau khi giải đã bắt đầu.');
      return;
    }
    const existing = tournament.sportRules ?? {};
    const sportRules = existing.kind === 'FOOTBALL'
      ? { ...existing, halvesCount: ruleHalves, halfDuration: ruleHalfDuration, allowDraw: ruleAllowDraw }
      : { ...existing, setsToWin: ruleSetsToWin, pointsPerSet: rulePointsPerSet, maxPoints: ruleMaxPoints, winByTwo: ruleWinByTwo };
    setRulesSaving(true);
    try {
      const response = await tournamentsApi.updateTournament(id, { sportRules });
      setTournament(response.data ?? { ...tournament, sportRules });
      setRulesEditing(false);
      toast.success('Đã lưu luật thi đấu.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRulesSaving(false);
    }
  };

  // --- Participants / pairing state ---
  const [participants, setParticipants] = useState<LiteParticipant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [generatingStrategy, setGeneratingStrategy] = useState<'RANDOM' | 'ELO_BALANCED' | null>(null);
  const [unpairingId, setUnpairingId] = useState<string | null>(null);
  const [bracketLoading, setBracketLoading] = useState(false);
  const [hasBracket, setHasBracket] = useState(false);
  const [mockLoading, setMockLoading] = useState(false);
  const [rosterConfirming, setRosterConfirming] = useState(false);

  useEffect(() => {
    router.replace(`/organizer/tournaments/${id}/manage`);
  }, [id, router]);

  const fetchParticipants = useCallback(async () => {
    if (!id) return;
    setParticipantsLoading(true);
    setParticipantsError(null);
    try {
      const res = await tournamentsApi.getLiteParticipants(id);
      setParticipants(res.data ?? []);
    } catch (err) {
      setParticipantsError(getErrorMessage(err));
    } finally {
      setParticipantsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab !== 'participants') return;
    const load = async () => {
      setParticipantsLoading(true);
      setParticipantsError(null);
      try {
        const res = await tournamentsApi.getLiteParticipants(id);
        setParticipants(res.data ?? []);
      } catch (err) {
        setParticipantsError(getErrorMessage(err));
      } finally {
        setParticipantsLoading(false);
      }
    };
    load();
  }, [activeTab, id]);

  const pendingParticipants = participants.filter(
    (p) => p.teamStatus === 'PENDING_PARTNER'
  );
  const pairedParticipants = participants.filter(
    (p) => p.teamStatus === 'COMPLETE' || p.teamStatus === 'PENDING_APPROVAL'
  );

  const toggleSelection = (pid: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(pid)) return prev.filter((x) => x !== pid);
      if (prev.length >= 2) {
        toast('Đã chọn 2 người. Bỏ chọn một người để chọn người khác.', { duration: 2000 });
        return prev;
      }
      return [...prev, pid];
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const handleManualPair = async () => {
    if (selectedIds.length !== 2) return;
    setPairingLoading(true);
    try {
      await tournamentsApi.pairLiteParticipants(id, {
        participant1Id: selectedIds[0],
        participant2Id: selectedIds[1],
      });
      toast.success('Ghép cặp thành công!');
      clearSelection();
      await fetchParticipants();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPairingLoading(false);
    }
  };

  const handleGeneratePairs = async (strategy: 'RANDOM' | 'ELO_BALANCED') => {
    const label = strategy === 'RANDOM' ? 'ngẫu nhiên' : 'ELO cân bằng';
    if (!confirm(`Xác nhận ghép cặp ${label}? Hành động này sẽ ghép tất cả người chơi đang chờ.`)) return;
    setGeneratingStrategy(strategy);
    try {
      const res = await tournamentsApi.generateLitePairs(id, { strategy });
      const unpairedIds = res.data?.unpairedParticipantIds ?? [];
      if (unpairedIds.length > 0) {
        toast.success(
          `Đã ghép cặp ${label}. ${unpairedIds.length} người chơi lẻ giữ lại chờ ghép sau.`
        );
      } else {
        toast.success(`Ghép cặp ${label} thành công!`);
      }
      clearSelection();
      await fetchParticipants();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGeneratingStrategy(null);
    }
  };

  const handleUnpair = async (participantId: string) => {
    if (!confirm('Hủy ghép cặp này? Cả hai người chơi sẽ trở lại trạng thái chờ ghép.')) return;
    setUnpairingId(participantId);
    try {
      await tournamentsApi.unpairLiteParticipant(id, participantId);
      toast.success('Đã hủy ghép cặp');
      await fetchParticipants();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUnpairingId(null);
    }
  };

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

  const handleGenerateBracket = async () => {
    if (!confirm('Sau khi tạo bracket, không thể ghép thêm cặp mới. Tiếp tục?')) return;
    setBracketLoading(true);
    try {
      await tournamentsApi.generateLiteBracket(id);
      const bracket = await tournamentsApi.getTournamentBracket(id);
      setHasBracket(Boolean(bracket.data?.stages?.length));
      toast.success('Đã tạo bracket thành công!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBracketLoading(false);
    }
  };

  const handleConfirmRoster = async () => {
    if (tournament?.isRegistrationLocked) return;
    if (!confirm('Chốt danh sách người tham gia hiện tại? Người mới sẽ không thể đăng ký; thao tác này không tự tạo bracket.')) return;
    setRosterConfirming(true);
    try {
      const response = await tournamentsApi.confirmLiteRoster(id);
      setTournament(response.data ?? (tournament ? { ...tournament, isRegistrationLocked: true, status: 'REGISTRATION_CLOSED' } : tournament));
      toast.success('Đã chốt danh sách người tham gia.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRosterConfirming(false);
    }
  };

  const handleResetBracket = async () => {
    if (!confirm('Reset sẽ tạo lại toàn bộ nhánh và lịch trận. Chỉ dùng trước khi bất kỳ trận nào bắt đầu. Tiếp tục?')) return;
    setBracketLoading(true);
    try {
      await tournamentsApi.resetLiteBracket(id);
      const bracket = await tournamentsApi.getTournamentBracket(id);
      setHasBracket(Boolean(bracket.data?.stages?.length));
      toast.success('Đã reset và lưu lại bracket mới.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBracketLoading(false);
    }
  };

  const handleSeedMock = async () => {
    const count = prompt('Số lượng VĐV ảo muốn tạo?', '8');
    const num = parseInt(count || '0', 10);
    if (num < 1 || num > 50) return toast.error('Số lượng từ 1 đến 50');
    setMockLoading(true);
    try {
      const names = Array.from({ length: num }, (_, i) => `VĐV ảo ${i + 1}`);
      await tournamentsApi.seedMockParticipants(id, names);
      toast.success(`Đã tạo ${num} VĐV ảo!`);
      await fetchParticipants();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMockLoading(false);
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

  const inviteUrl = tournament.inviteCode && typeof window !== 'undefined'
    ? buildLiteJoinUrl(tournament.inviteCode, window.location.origin)
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

          {inviteUrl && (
            <LiteInviteQr
              inviteUrl={inviteUrl}
              tournamentName={tournament.name}
              compact
            />
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
                {(tournament.locationAddress || tournament.tournamentConfig?.location?.display) && (
                  <InfoCard label="Địa điểm" value={tournament.locationAddress || tournament.tournamentConfig?.location?.display || '—'} />
                )}
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Luật & ghi điểm</h4>
                    <p className="mt-1 text-xs text-slate-600">Đây là preset gợi ý có thể chỉnh; chế độ Lite vẫn cho phép nhập điểm tự do khi cập nhật trận.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-white text-emerald-700 border-emerald-200">Tự do (Lite)</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRulesEditing((value) => !value)}
                      disabled={['IN_PROGRESS', 'ONGOING', 'COMPLETED'].includes(tournament.status)}
                    >
                      {rulesEditing ? 'Đóng' : 'Chỉnh luật'}
                    </Button>
                  </div>
                </div>
                {rulesEditing ? (
                  <div className="mt-4 space-y-3 rounded-lg border border-emerald-200 bg-white p-3">
                    {tournament.sportRules?.kind === 'FOOTBALL' ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Input label="Số hiệp" type="number" min={1} max={4} value={ruleHalves} onChange={(event) => setRuleHalves(Number(event.target.value) || 1)} />
                        <Input label="Phút mỗi hiệp" type="number" min={1} max={120} value={ruleHalfDuration} onChange={(event) => setRuleHalfDuration(Number(event.target.value) || 1)} />
                        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={ruleAllowDraw} onChange={(event) => setRuleAllowDraw(event.target.checked)} className="h-4 w-4 accent-emerald-600" /> Cho phép hòa</label>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <Input label="Set thắng" type="number" min={1} max={5} value={ruleSetsToWin} onChange={(event) => setRuleSetsToWin(Number(event.target.value) || 1)} />
                        <Input label="Điểm mỗi set" type="number" min={1} max={99} value={rulePointsPerSet} onChange={(event) => setRulePointsPerSet(Number(event.target.value) || 1)} />
                        <Input label="Điểm tối đa" type="number" min={1} max={199} value={ruleMaxPoints} onChange={(event) => setRuleMaxPoints(Number(event.target.value) || 1)} />
                        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={ruleWinByTwo} onChange={(event) => setRuleWinByTwo(event.target.checked)} className="h-4 w-4 accent-emerald-600" /> Chạm 2</label>
                      </div>
                    )}
                    <div className="flex justify-end"><Button size="sm" onClick={handleSaveRules} disabled={rulesSaving}>{rulesSaving ? 'Đang lưu...' : 'Lưu luật'}</Button></div>
                  </div>
                ) : tournament.sportRules?.kind === 'FOOTBALL' ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <InfoCard label="Số hiệp" value={String(tournament.sportRules.halvesCount ?? 2)} />
                    <InfoCard label="Phút/hiệp" value={String(tournament.sportRules.halfDuration ?? 45)} />
                    <InfoCard label="Hòa" value={tournament.sportRules.allowDraw === false ? 'Không' : 'Có'} />
                    <InfoCard label="Đội hình" value={String(tournament.tournamentConfig?.teamSize ?? '—')} />
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <InfoCard label="Set thắng" value={String(tournament.sportRules?.setsToWin ?? '—')} />
                    <InfoCard label="Điểm/set" value={String(tournament.sportRules?.pointsPerSet ?? '—')} />
                    <InfoCard label="Điểm tối đa" value={String(tournament.sportRules?.maxPoints ?? '—')} />
                    <InfoCard label="Chạm 2" value={tournament.sportRules?.winByTwo === false ? 'Không' : 'Có'} />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'participants' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">
                  Người tham gia
                  {!participantsLoading && (
                    <span className="ml-2 text-sm font-medium text-slate-400">
                      ({participants.length} hồ sơ)
                    </span>
                  )}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchParticipants}
                  disabled={participantsLoading}
                  className="gap-1 text-xs font-semibold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${participantsLoading ? 'animate-spin' : ''}`} />
                  Làm mới
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedMock}
                  disabled={mockLoading}
                  className="gap-1 text-xs font-semibold text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <FlaskConical className={`w-3.5 h-3.5 ${mockLoading ? 'animate-pulse' : ''}`} />
                  {mockLoading ? 'Đang tạo...' : 'Tạo VĐV ảo'}
                </Button>
              </div>

              {participantsLoading && participants.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : participantsError ? (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-rose-800">{participantsError}</p>
                  <Button variant="outline" size="sm" onClick={fetchParticipants} className="mt-3 text-xs">
                    Thử lại
                  </Button>
                </div>
              ) : participants.length === 0 ? (
                <div className="bg-slate-50 rounded-lg p-8 text-center">
                  <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-500 font-medium">Chưa có người tham gia</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Chia sẻ link mời để người chơi đăng ký
                  </p>
                </div>
              ) : (
                <>
                  {/* Doubles: pending pool + pairing */}
                  {tournament?.matchType === 'DOUBLES' ? (
                    <>
                      {/* Pending pool */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-amber-500" />
                          Chờ ghép cặp ({pendingParticipants.length})
                        </h4>
                        {pendingParticipants.length === 0 ? (
                          <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg text-center">
                            Không có người chơi nào đang chờ ghép
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {pendingParticipants.map((p) => {
                              const isSelected = selectedIds.includes(p.id);
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => toggleSelection(p.id)}
                                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400'
                                      : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? 'border-blue-600 bg-blue-600'
                                        : 'border-slate-300'
                                    }`}
                                  >
                                    {isSelected && (
                                      <CheckCircle className="w-4 h-4 text-white" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-semibold text-slate-900 truncate block">
                                      {p.teamName}
                                    </span>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                      {p.rosters?.map((m) => (
                                        <span key={m.userId} className="flex items-center gap-1">
                                          <User className="w-3 h-3" />
                                          {m.profile?.fullName || '—'}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold">
                                    Chờ ghép
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Pairing actions */}
                      {pendingParticipants.length >= 2 && (
                        <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <Button
                            onClick={handleManualPair}
                            disabled={selectedIds.length !== 2 || pairingLoading}
                            className="gap-1.5 text-xs font-semibold"
                            size="sm"
                          >
                            {pairingLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5" />
                            )}
                            Ghép thủ công ({selectedIds.length}/2)
                          </Button>
                          <div className="flex-1" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGeneratePairs('RANDOM')}
                            disabled={generatingStrategy !== null}
                            className="gap-1.5 text-xs font-semibold"
                          >
                            {generatingStrategy === 'RANDOM' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Shuffle className="w-3.5 h-3.5" />
                            )}
                            Ghép ngẫu nhiên
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGeneratePairs('ELO_BALANCED')}
                            disabled={generatingStrategy !== null}
                            className="gap-1.5 text-xs font-semibold"
                          >
                            {generatingStrategy === 'ELO_BALANCED' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Shuffle className="w-3.5 h-3.5" />
                            )}
                            Ghép ELO cân bằng
                          </Button>
                        </div>
                      )}

                      {/* Paired teams */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          Đã ghép cặp ({pairedParticipants.length})
                        </h4>
                        {pairedParticipants.length === 0 ? (
                          <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg text-center">
                            Chưa có cặp nào được ghép
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {pairedParticipants.map((p) => (
                              <div
                                key={p.id}
                                className="bg-white rounded-lg border border-slate-200 p-4 flex items-start justify-between gap-4"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-2">
                                    <span className="text-sm font-semibold text-slate-900">
                                      {p.teamName}
                                    </span>
                                    {p.teamStatus === 'PENDING_APPROVAL' && (
                                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                        Chờ duyệt
                                      </Badge>
                                    )}
                                    {p.teamStatus === 'COMPLETE' && (
                                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                        Sẵn sàng
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    {p.rosters?.map((m) => (
                                      <div key={m.userId} className="flex items-center gap-2 text-xs text-slate-600">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                          {m.profile?.avatarUrl ? (
                                            <img src={m.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <User className="w-3.5 h-3.5 text-slate-400" />
                                          )}
                                        </div>
                                        <span className="font-medium">{m.profile?.fullName || '—'}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {/* Only show unpair for actual Doubles pairs (has 2 rosters) */}
                                {(p.rosters?.length ?? 0) === 2 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUnpair(p.id)}
                                    disabled={unpairingId === p.id}
                                    className="shrink-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 gap-1"
                                  >
                                    {unpairingId === p.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Unlink className="w-3.5 h-3.5" />
                                    )}
                                    <span className="text-xs">Hủy ghép</span>
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Singles: compact participant list, no pairing */
                    <div className="space-y-2">
                      {participants.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white"
                        >
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                            {p.rosters?.[0]?.profile?.avatarUrl ? (
                              <img src={p.rosters[0].profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-slate-900 truncate block">
                              {p.teamName}
                            </span>
                            {p.rosters?.[0]?.profile?.fullName && (
                              <span className="text-xs text-slate-500">{p.rosters[0].profile.fullName}</span>
                            )}
                          </div>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                            Đã tham gia
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tạo bracket */}
                  {(tournament?.matchType === 'DOUBLES' ? pairedParticipants.length > 0 : participants.length > 0) && (
                    <div className="pt-4 border-t border-slate-100">
                      <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-amber-900">Danh sách tham gia</p>
                          <p className="text-xs text-amber-700">Chốt tùy chọn trước khi tạo bracket. Không bắt buộc.</p>
                        </div>
                        {tournament?.isRegistrationLocked ? (
                          <Badge className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700">Đã chốt</Badge>
                        ) : (
                          <Button variant="outline" onClick={handleConfirmRoster} disabled={rosterConfirming} className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100">
                            {rosterConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Chốt danh sách
                          </Button>
                        )}
                      </div>
                      {!hasBracket && <Button
                        onClick={handleGenerateBracket}
                        disabled={bracketLoading}
                        className="w-full gap-2"
                      >
                        {bracketLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Swords className="w-4 h-4" />
                        )}
                        {bracketLoading ? 'Đang tạo...' : 'Tạo bracket'}
                      </Button>}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'bracket' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Bracket</h3>
              <p className="text-sm text-slate-500">
                {hasBracket ? 'Bracket đã được lưu trên hệ thống và sẽ được dùng để tạo các trận đấu.' : 'Chưa có bracket được lưu.'}
              </p>
              {hasBracket && (
                <div className="flex flex-wrap gap-2">
                  <Link href={`/tournaments/${id}?tab=bracket`} target="_blank">
                    <Button variant="outline" className="gap-2"><ExternalLink className="w-4 h-4" /> Xem sơ đồ</Button>
                  </Link>
                  <Button variant="outline" onClick={handleResetBracket} disabled={bracketLoading} className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50">
                    <RefreshCw className="w-4 h-4" /> Reset bracket
                  </Button>
                </div>
              )}
              {(participants.length > 0 || (!tournament?.matchType || tournament.matchType !== 'DOUBLES')) && (
                <div className="bg-slate-50 rounded-lg p-6 text-center">
                  <Swords className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-500 mb-4">
                    {tournament?.matchType === 'DOUBLES'
                      ? 'Đã ghép cặp xong? Hãy tạo bracket để bắt đầu giải đấu.'
                      : 'Đã có người tham gia? Hãy tạo bracket để bắt đầu giải đấu.'}
                  </p>
                  {!hasBracket && <Button
                    onClick={handleGenerateBracket}
                    disabled={bracketLoading}
                    className="gap-2"
                  >
                    {bracketLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Swords className="w-4 h-4" />
                    )}
                    {bracketLoading ? 'Đang tạo...' : 'Tạo bracket'}
                  </Button>}
                </div>
              )}
              {participants.length === 0 && (
                <div className="bg-slate-50 rounded-lg p-6 text-center">
                  <Swords className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-400">Chưa có người tham gia. Hãy chia sẻ link mời.</p>
                </div>
              )}
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
