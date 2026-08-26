'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/lib/zustand/authStore';
import { toast } from 'react-hot-toast';
import type { ApiResponse } from '@/types/api';
import { getSportLogo } from '@/constants/sports';
import {
  Trophy,
  Search,
  Lock,
  Unlock,
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  DollarSign,
  User,
  Users,
  Check,
  X,
  Eye,
  MapPin
} from 'lucide-react';
import { isTournamentUpcoming } from '@/utils/tournament-status';
import { getTournamentLocationLabel } from '@/utils/tournament-location';

interface CreatorInfo {
  id: string;
  email: string;
  fullName: string;
}

interface TournamentItem {
  id: string;
  name: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'SUSPENDED' | 'DRAFT' | 'PENDING_APPROVAL' | 'PENDING_DELETE';
  entryFee: string;
  matchType: string;
  tournamentType: string;
  visibility: string;
  createdAt: string;
  creator?: CreatorInfo;
  tournamentConfig?: {
    registrationMode: string;
  };
}

interface TournamentDetail extends TournamentItem {
  bannerUrl?: string | null;
  description?: string | null;
  isRanked?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  maxParticipants?: number | null;
  category?: {
    name?: string | null;
  } | null;
  venue?: {
    name?: string | null;
    locationAddress?: string | null;
  } | null;
}

/** Countdown đầy đủ giờ:phút:giây cho admin */
function FullCountdownAdmin({ targetDate }: { targetDate: string }) {
  const translate = useTranslations('AdminTournaments');
  const [text, setText] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setText(translate('countdownOpen')); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const formattedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      if (d > 0) setText(translate('countdownDays', { days: d, time: formattedTime }));
      else setText(translate('countdownTime', { time: formattedTime }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [targetDate, translate]);
  if (!text) return null;
  return (
    <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
      <span className="text-xs font-bold text-amber-700">⏳ {text}</span>
    </div>
  );
}

export default function AdminTournamentsPage() {
  const locale = useLocale();
  const translate = useTranslations('AdminTournaments');
  const numberLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  const { user } = useAuthStore();
  const isModeratorOnly =
    Boolean(user?.roles?.includes('MODERATOR')) && !user?.roles?.includes('ADMIN');
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const cursorByPageRef = useRef<Record<number, string | null>>({ 1: null });
  const [processing, setProcessing] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [detailTournament, setDetailTournament] = useState<TournamentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionModal, setActionModal] = useState<{
    tournamentId: string;
    action: 'suspend' | 'unsuspend' | 'ban' | 'approve' | 'reject' | 'approve-delete' | 'reject-delete';
    tournamentName: string;
  } | null>(null);
  const [actionNote, setActionNote] = useState('');

  const handleOpenDetail = async (id: string) => {
    setSelectedTournamentId(id);
    setLoadingDetail(true);
    setDetailTournament(null);
    try {
      const response = await api.get<ApiResponse<TournamentDetail>>(`/tournaments/${id}`);
      setDetailTournament(response.data);
    } catch (error) {
      console.error(error);
      toast.error(translate('detailLoadFailed'));
      setSelectedTournamentId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const fetchTournaments = async (searchTerm = '', showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams({ limit: '10', search: searchTerm });
      if (selectedStatus) params.set('status', selectedStatus);
      const cursor = cursorByPageRef.current[page];
      if (cursor) params.set('cursor', cursor);
      const response = await api.get<ApiResponse<TournamentItem[]>>(`/admin/tournaments?${params.toString()}`);
      setTournaments(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      cursorByPageRef.current[page + 1] = response.meta?.nextCursor ?? null;
    } catch (error) {
      console.error(error);
      toast.error(translate('listLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cursorByPageRef.current = { 1: null };
    // Reset pagination when the status filter changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [selectedStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTournaments(search, page === 1 ? false : true);
    }, 0);
    return () => clearTimeout(timer);
  }, [page, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    cursorByPageRef.current = { 1: null };
    setPage(1);
    fetchTournaments(search);
  };

  const parseDate = (str: string): Date | null => {
    const p = str.split('/');
    if (p.length !== 3) return null;
    const d = parseInt(p[0], 10), m = parseInt(p[1], 10) - 1, y = parseInt(p[2], 10);
    return isNaN(d) || isNaN(m) || isNaN(y) ? null : new Date(y, m, d);
  };

  const filteredTournaments = tournaments.filter(t => {
    const fromDate = dateFrom ? parseDate(dateFrom) : null;
    const toDate = dateTo ? parseDate(dateTo) : null;
    if (!fromDate && !toDate) return true;
    const d = new Date(t.createdAt);
    if (fromDate && d < fromDate) return false;
    if (toDate) { const end = new Date(toDate); end.setHours(23, 59, 59, 999); if (d > end) return false; }
    return true;
  });

  const handleTournamentAction = async (
    id: string,
    action: 'suspend' | 'unsuspend' | 'ban' | 'approve' | 'reject' | 'approve-delete' | 'reject-delete',
    note?: string,
  ) => {
    if (processing) return;

    const confirmMsg =
      action === 'suspend' ? translate('confirmSuspend') :
      action === 'unsuspend' ? translate('confirmUnsuspend') :
      action === 'approve' ? translate('confirmApprove') :
      action === 'reject' ? translate('confirmReject') :
      action === 'approve-delete' ? translate('confirmApproveDelete') :
      action === 'reject-delete' ? translate('confirmRejectDelete') :
      translate('confirmBan');
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/admin/tournaments/${id}/${action}`, note ? { note } : undefined);
      toast.success(
        action === 'suspend' ? translate('actionSuspended') :
        action === 'unsuspend' ? translate('actionUnsuspended') :
        action === 'approve' ? translate('actionApproved') :
        action === 'reject' ? translate('actionRejected') :
        action === 'approve-delete' ? translate('actionApprovedDelete') :
        action === 'reject-delete' ? translate('actionRejectedDelete') :
        translate('actionBanned')
      );
      fetchTournaments(search);
    } catch (error) {
      console.error(error);
      toast.error(translate('actionFailed'));
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenActionModal = (
    tournamentId: string,
    tournamentName: string,
    action: 'suspend' | 'unsuspend' | 'ban' | 'approve' | 'reject' | 'approve-delete' | 'reject-delete',
  ) => {
    setActionModal({ tournamentId, action, tournamentName });
    setActionNote('');
  };

  const handleSubmitActionModal = async () => {
    if (!actionModal) {
      return;
    }

    const requiresNote =
      actionModal.action === 'reject' ||
      actionModal.action === 'reject-delete' ||
      actionModal.action === 'suspend' ||
      actionModal.action === 'ban';

    if (requiresNote && !actionNote.trim()) {
      toast.error(translate('noteRequired'));
      return;
    }

    await handleTournamentAction(actionModal.tournamentId, actionModal.action, actionNote.trim() || undefined);
    setActionModal(null);
    setActionNote('');
  };

  const actionModalTitle = actionModal
    ? actionModal.action === 'reject'
      ? translate('rejectApproval')
      : actionModal.action === 'reject-delete'
      ? translate('adminActionRejectDelete')
      : actionModal.action === 'suspend'
      ? translate('adminActionSuspend')
      : actionModal.action === 'ban'
      ? translate('adminActionBan')
      : actionModal.action === 'approve-delete'
      ? translate('approvePermanentDelete')
      : actionModal.action === 'approve'
      ? translate('approveElo')
      : translate('restoreTournament')
    : '';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <span className="bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-amber-200">{translate('adminStatusPendingApproval')}</span>;
      case 'PENDING_DELETE':
        return <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-200">{translate('adminStatusPendingDelete')}</span>;
      case 'SUSPENDED':
        return <span className="bg-rose-50 text-rose-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-200">{translate('adminStatusSuspended')}</span>;
      case 'CANCELLED':
        return <span className="bg-rose-50 text-rose-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-200">{translate('adminStatusCancelled')}</span>;
      case 'REGISTRATION_OPEN':
        return <span className="bg-emerald-50 text-emerald-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-200">{translate('statusRegistrationOpen')}</span>;
      case 'REGISTRATION_CLOSED':
        return <span className="bg-zinc-100 text-zinc-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-zinc-300">{translate('statusRegistrationClosed')}</span>;
      case 'IN_PROGRESS':
      case 'ONGOING':
        return (
          <span className="bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-blue-200 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
            {translate('statusInProgress')}
          </span>
        );
      case 'UPCOMING':
        return <span className="bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-blue-200">{translate('adminStatusUpcoming')}</span>;
      case 'COMPLETED':
        return <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-200">{translate('statusCompleted')}</span>;
      case 'DRAFT':
        return <span className="bg-slate-50 text-slate-500 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-200">{translate('statusDraft')}</span>;
      default:
        return <span className="bg-slate-50 text-slate-500 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-200">{status}</span>;
    }
  };

  const formatMoney = (amount: string) => {
    const value = parseFloat(amount);
    if (isNaN(value) || value === 0) return translate('free');
    return translate('feeValue', { amount: value.toLocaleString(numberLocale) });
  };

  const getVisibilityLabel = (visibility: string) => {
    if (visibility === 'PRIVATE' || visibility === 'UNLISTED') return translate('adminPrivateTournament');
    if (visibility === 'PUBLIC') return translate('adminPublicTournament');
    return translate('unknownValue');
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          {isModeratorOnly ? translate('moderatorTitle') : translate('adminTitle')}
        </h2>
        <p className="text-slate-500 text-sm">
          {isModeratorOnly
                        ? translate('moderatorDescription')
            : translate('adminDescription')}
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-3 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={translate('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg pl-11 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors active:scale-95 whitespace-nowrap"
          >
                        {translate('searchAction')}

          </button>
        </form>

        {/* Date Filter */}
        <div className="flex items-center gap-2 min-w-[130px]">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder={translate('dateFromPlaceholder')} value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:outline-none focus:border-blue-500 placeholder-gray-400" />
        </div>
        <div className="flex items-center gap-2 min-w-[130px]">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder={translate('dateToPlaceholder')} value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:outline-none focus:border-blue-500 placeholder-gray-400" />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 max-w-2xl">
          {[
            { label: translate('statusAll'), value: '' },
            { label: translate('statusDraftFilter'), value: 'DRAFT' },
            { label: translate('statusPendingApprovalFilter'), value: 'PENDING_APPROVAL' },
            { label: translate('statusRegistrationOpenFilter'), value: 'REGISTRATION_OPEN' },
            { label: translate('statusRegistrationClosedFilter'), value: 'REGISTRATION_CLOSED' },
            { label: translate('adminStatusUpcoming'), value: 'UPCOMING' },
            { label: translate('statusInProgressFilter'), value: 'IN_PROGRESS' },
            { label: translate('statusCompletedFilter'), value: 'COMPLETED' },
            { label: translate('statusSuspendedFilter'), value: 'SUSPENDED' },
            { label: translate('statusCancelledFilter'), value: 'CANCELLED' },
            { label: translate('statusPendingDeleteFilter'), value: 'PENDING_DELETE' },
          ].map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setSelectedStatus(tab.value);
                setPage(1);
              }}
              className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all ${
                selectedStatus === tab.value
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg shadow-sm">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">{translate('loadingList')}</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-16 text-center text-slate-500 space-y-2 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Trophy className="w-6 h-6" />
          </div>
          <p className="text-base font-semibold text-slate-800">{translate('noResults')}</p>
          <p className="text-xs text-slate-500">{translate('noResultsHint')}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 pl-6">{translate('tournamentInfo')}</th>
                  <th className="p-4">{translate('organizer')}</th>
                  <th className="p-4">{translate("adminFeeFormat")}</th>
                  <th className="p-4">{translate("status")}</th>
                  <th className="p-4 pr-6 text-right">{translate("adminActionColumn")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 text-sm">
                {filteredTournaments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div>
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">
                            {item.tournamentType === 'CLUB' ? translate('adminInternalTournament') : translate('adminOpenTournament')}
                          </span>
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">
                            {getVisibilityLabel(item.visibility)}
                          </span>
                          <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold px-2 py-0.5 rounded">
                            {item.tournamentConfig?.registrationMode === 'APPROVAL' ? translate('adminApprovalRegistration') : item.tournamentConfig?.registrationMode === 'INVITE_ONLY' ? translate('inviteOnlyRegistration') : translate('openRegistration')}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {translate('createdAt', { date: new Date(item.createdAt).toLocaleDateString(numberLocale) })}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-slate-800">{item.creator?.fullName || translate('unknownValue')}</p>
                        <p className="text-xs text-slate-500">{item.creator?.email || translate('unknownValue')}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-slate-800 flex items-center gap-0.5">
                          <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                          {formatMoney(item.entryFee)}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.matchType === 'DOUBLES' ? translate('doublesFormat') : translate('singlesFormat')}</p>
                      </div>
                    </td>
                    <td className="p-4">{getStatusBadge(item.status)}</td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDetail(item.id)}
                          className="bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-transparent px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                                                    {translate('details')}

                        </button>
                        {!isModeratorOnly && item.status === 'PENDING_DELETE' && (
                          <>
                            <button
                              onClick={() => handleTournamentAction(item.id, 'approve-delete')}
                              disabled={processing}
                              className="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-slate-200 hover:border-transparent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              {translate('approveDelete')}
                            </button>
                            <button
                              onClick={() => handleOpenActionModal(item.id, item.name, 'reject-delete')}
                              disabled={processing}
                              className="bg-slate-50 hover:bg-slate-600 text-slate-600 hover:text-white border border-slate-200 hover:border-transparent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              {translate('reject')}
                            </button>
                          </>
                        )}
                        {item.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              onClick={() => handleTournamentAction(item.id, 'approve')}
                              disabled={processing}
                              className="bg-slate-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-slate-200 hover:border-transparent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              {translate('approve')}
                            </button>
                            <button
                              onClick={() => handleOpenActionModal(item.id, item.name, 'reject')}
                              disabled={processing}
                              className="bg-slate-50 hover:bg-amber-600 text-amber-600 hover:text-white border border-slate-200 hover:border-transparent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              {translate('reject')}
                            </button>
                          </>
                        )}
                        {!isModeratorOnly && item.status !== 'SUSPENDED' && item.status !== 'CANCELLED' && item.status !== 'PENDING_APPROVAL' && item.status !== 'PENDING_DELETE' && (
                          <button
                            onClick={() => handleOpenActionModal(item.id, item.name, 'suspend')}
                            disabled={processing}
                            className="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-slate-200 hover:border-transparent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <Lock className="w-3.5 h-3.5" />
                                                        {translate('suspend')}

                          </button>
                        )}
                        {!isModeratorOnly && item.status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleTournamentAction(item.id, 'unsuspend')}
                            disabled={processing}
                            className="bg-slate-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-slate-200 hover:border-transparent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            {translate('restore')}
                          </button>
                        )}
                        {!isModeratorOnly && item.status !== 'CANCELLED' && item.status !== 'PENDING_DELETE' && (
                          <button
                            onClick={() => handleOpenActionModal(item.id, item.name, 'ban')}
                            disabled={processing}
                            className="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-slate-200 hover:border-transparent px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            {translate('ban')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                                {translate('previous')}

              </button>
              <span className="text-xs text-slate-500 font-medium">{translate('pageOf', { page, totalPages })}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                                {translate('next')}

              </button>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {selectedTournamentId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-lg">{translate('detailTitle')}</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedTournamentId(null);
                  setDetailTournament(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-600">
              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                  <p className="text-xs text-slate-500 font-medium">{translate("adminLoadingDetails")}</p>
                </div>
              ) : detailTournament ? (
                <div className="space-y-6">
                  {/* Banner & Basic Info */}
                  <div className="relative rounded-lg overflow-hidden aspect-[21/9] bg-slate-100 border border-slate-200">
                    {detailTournament.bannerUrl ? (
                      <img
                        src={detailTournament.bannerUrl}
                        alt={detailTournament.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Trophy className="w-12 h-12 stroke-[1.5]" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      {getStatusBadge(detailTournament.status)}
                      <span className="bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {getVisibilityLabel(detailTournament.visibility)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xl font-bold text-slate-900 leading-snug">{detailTournament.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">{translate('idLabel')}: {detailTournament.id}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Left Column */}
                    <div className="space-y-3.5">
                      <div>
                        <span className="text-xs text-slate-400 block font-medium">{translate('sportAndCategory')}</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-lg font-semibold border border-blue-100">
                            {(() => {
                              const logo = getSportLogo(detailTournament.category?.name);
                              return logo ? <img src={logo} alt="" className="w-3 h-3 object-contain" /> : null;
                            })()}
                            {detailTournament.category?.name || translate('unknownValue')}
                          </span>
                          <span className="bg-slate-50 text-slate-600 text-xs px-2.5 py-1 rounded-lg font-semibold border border-slate-200">
                            {detailTournament.tournamentType === 'CLUB' ? translate('internalClub') : translate('publicTournament')}
                          </span>
                          <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold border ${
                            detailTournament.isRanked
                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {detailTournament.isRanked ? translate('rankedElo') : translate('recreationalTournament')}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block font-medium">{translate('competitionFormat')}</span>
                        <p className="font-semibold text-slate-800 mt-1">
                          {detailTournament.matchType === 'DOUBLES' ? translate('doublesFormat') : translate('singlesFormat')}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block font-medium">{translate('entryFee')}</span>
                        <p className="font-bold text-blue-600 text-base mt-0.5 flex items-center gap-0.5">
                          <DollarSign className="w-4 h-4" />
                          {formatMoney(detailTournament.entryFee)}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block font-medium">{translate('eventSchedule')}</span>
                        <p className="text-slate-800 font-semibold mt-1 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {detailTournament.startDate ? new Date(detailTournament.startDate).toLocaleDateString(numberLocale) : translate('notScheduled')}
                          {detailTournament.endDate && ` - ${new Date(detailTournament.endDate).toLocaleDateString(numberLocale)}`}
                        </p>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3.5">
                      <div>
                        <span className="text-xs text-slate-400 block font-medium">{translate('creator')}</span>
                        <p className="font-semibold text-slate-800 mt-1">{detailTournament.creator?.fullName || translate('unknownValue')}</p>
                        <p className="text-xs text-slate-500">{detailTournament.creator?.email || translate('unknownValue')}</p>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block font-medium">{translate('venue')}</span>
                        <p className="font-semibold text-slate-800 mt-1 flex items-start gap-1">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <span>
                            {detailTournament.venue?.name || translate('unknownValue')}
                            {detailTournament.venue?.locationAddress && (
                              <span className="block text-xs text-slate-400 font-normal mt-0.5">
                                {getTournamentLocationLabel({ locationAddress: detailTournament.venue.locationAddress })}
                              </span>
                            )}
                          </span>

                        </p>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block font-medium">{translate('participantLimit')}</span>
                        <p className="font-semibold text-slate-800 mt-1">
                          {detailTournament.maxParticipants
                            ? translate('maxParticipantsValue', { count: detailTournament.maxParticipants })
                            : translate('unlimited')}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block font-medium">{translate('registrationPeriod')}</span>
                        <p className="text-xs text-slate-600 mt-1">
                          {detailTournament.registrationStartDate ? new Date(detailTournament.registrationStartDate).toLocaleDateString(numberLocale) : translate('unknownValue')}
                          {detailTournament.registrationEndDate && ` - ${new Date(detailTournament.registrationEndDate).toLocaleDateString(numberLocale)}`}
                        </p>
                        {isTournamentUpcoming(detailTournament.status) && detailTournament.registrationStartDate && (
                          <FullCountdownAdmin targetDate={detailTournament.registrationStartDate} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {detailTournament.description && (
                    <div className="border-t border-slate-100 pt-4">
                      <span className="text-xs text-slate-400 block font-medium mb-1">{translate('adminDescriptionLabel')}</span>
                      <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-600 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                        {detailTournament.description}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-10">{translate('detailNotFound')}</p>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2 justify-end">
              {detailTournament && (
                <>
                  {!isModeratorOnly && detailTournament.status === 'PENDING_DELETE' && (
                    <>
                      <button
                        onClick={() => {
                          handleTournamentAction(detailTournament.id, 'approve-delete');
                          setSelectedTournamentId(null);
                        }}
                        disabled={processing}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                                                {translate('approvePermanentDelete')}

                      </button>
                      <button
                        onClick={() => {
                          handleTournamentAction(detailTournament.id, 'reject-delete');
                          setSelectedTournamentId(null);
                        }}
                        disabled={processing}
                        className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                                                {translate('rejectDeleteRequest')}

                      </button>
                    </>
                  )}
                  {detailTournament.status === 'PENDING_APPROVAL' && (
                    <>
                      <button
                        onClick={() => {
                          handleTournamentAction(detailTournament.id, 'approve');
                          setSelectedTournamentId(null);
                        }}
                        disabled={processing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                                                {translate('approveElo')}

                      </button>
                      <button
                        onClick={() => {
                          handleTournamentAction(detailTournament.id, 'reject');
                          setSelectedTournamentId(null);
                        }}
                        disabled={processing}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                                                {translate('rejectApproval')}

                      </button>
                    </>
                  )}
                  {!isModeratorOnly && detailTournament.status !== 'SUSPENDED' && detailTournament.status !== 'CANCELLED' && detailTournament.status !== 'PENDING_APPROVAL' && detailTournament.status !== 'PENDING_DELETE' && (
                    <button
                      onClick={() => {
                        handleTournamentAction(detailTournament.id, 'suspend');
                        setSelectedTournamentId(null);
                      }}
                      disabled={processing}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Lock className="w-4 h-4" />
                                            {translate('temporarySuspend')}

                    </button>
                  )}
                  {!isModeratorOnly && detailTournament.status === 'SUSPENDED' && (
                    <button
                      onClick={() => {
                        handleTournamentAction(detailTournament.id, 'unsuspend');
                        setSelectedTournamentId(null);
                      }}
                      disabled={processing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Unlock className="w-4 h-4" />
                                            {translate('restoreTournament')}

                    </button>
                  )}
                  {!isModeratorOnly && detailTournament.status !== 'CANCELLED' && detailTournament.status !== 'PENDING_DELETE' && (
                    <button
                      onClick={() => {
                        handleTournamentAction(detailTournament.id, 'ban');
                        setSelectedTournamentId(null);
                      }}
                      disabled={processing}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                                            {translate('permanentBan')}

                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => {
                  setSelectedTournamentId(null);
                  setDetailTournament(null);
                }}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95"
              >
                                {translate('close')}

              </button>
            </div>
          </div>
        </div>
      )}

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900">{actionModalTitle}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {translate('tournamentLabel')} <span className="font-semibold text-slate-700">{actionModal.tournamentName}</span>
              </p>
            </div>

            <div className="space-y-3 p-6">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {translate('processingNoteLabel')}

              </label>
              <textarea
                rows={4}
                value={actionNote}
                onChange={(event) => setActionNote(event.target.value)}
                placeholder={translate('actionNotePlaceholder')}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500"
              />
              <p className="text-xs text-slate-500">
                {translate('adminActionNoteHelp')}
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-6">
              <button
                onClick={() => {
                  setActionModal(null);
                  setActionNote('');
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                                {translate('cancel')}

              </button>
              <button
                onClick={() => void handleSubmitActionModal()}
                disabled={processing}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {processing ? translate('adminProcessing') : translate('adminConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

