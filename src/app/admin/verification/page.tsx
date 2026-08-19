'use client';

import { useEffect, useState, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/lib/zustand/authStore';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import type { ApiResponse } from '@/types/api';
import { Check, X, ShieldAlert, Eye, Calendar, Phone, Mail, User, Search, RotateCcw } from 'lucide-react';

interface VerificationTicket {
  id: string;
  userId: string;
  evidenceUrls: string[];
  contactPhone: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason?: string;
  createdAt: string;
}

interface TicketData {
  ticket: VerificationTicket;
  user: {
    email: string;
    fullName: string;
    avatarUrl?: string;
  };
}

export default function VerificationPage() {
  const translate = useTranslations('AdminVerification');
  const locale = useLocale();
  const { user } = useAuthStore();
  const isModeratorOnly =
    Boolean(user?.roles?.includes('MODERATOR')) && !user?.roles?.includes('ADMIN');
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await api.get<ApiResponse<TicketData[]>>(`/admin/verification-tickets?status=${statusFilter}`);
      setTickets(response.data || []);
    } catch (error: unknown) {
      console.error(error);
      toast.error(translate('loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    if (processing) return;
    setProcessing(true);
    try {
      await api.patch(`/admin/verification-tickets/${id}/approve`);
      toast.success(translate('approveSuccess'));
      fetchTickets();
    } catch (error: unknown) {
      console.error(error);
      toast.error(translate('approveError'));
    } finally {
      setProcessing(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm(translate('revokeConfirm'))) return;
    setProcessing(true);
    try {
      await api.patch(`/admin/verification-tickets/${id}/reject`, {
        rejectReason: 'Thu hồi bởi Admin',
      });
      toast.success(translate('revokeSuccess'));
      fetchTickets();
    } catch (error: unknown) {
      console.error(error);
      toast.error(translate('revokeError'));
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedTicket || !rejectReason.trim()) {
      toast.error(translate('rejectReasonRequired'));
      return;
    }
    setProcessing(true);
    try {
      await api.patch(`/admin/verification-tickets/${selectedTicket.ticket.id}/reject`, {
        rejectReason: rejectReason.trim(),
      });
      toast.success(translate('rejectSuccess'));
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedTicket(null);
      fetchTickets();
    } catch (error: unknown) {
      console.error(error);
      toast.error(translate('rejectError'));
    } finally {
      setProcessing(false);
    }
  };

  const parseDate = (str: string): Date | null => {
    const p = str.split('/');
    if (p.length !== 3) return null;
    const d = parseInt(p[0], 10), m = parseInt(p[1], 10) - 1, y = parseInt(p[2], 10);
    return isNaN(d) || isNaN(m) || isNaN(y) ? null : new Date(y, m, d);
  };

  const filteredTickets = useMemo(() => {
    const fromDate = dateFrom ? parseDate(dateFrom) : null;
    const toDate = dateTo ? parseDate(dateTo) : null;
    if (!fromDate && !toDate) return tickets;
    return tickets.filter(item => {
      const itemDate = new Date(item.ticket.createdAt);
      if (fromDate && itemDate < fromDate) return false;
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }
      return true;
    });
  }, [tickets, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{translate('title')}</h2>
          <p className="text-slate-500 text-sm">
            {isModeratorOnly ? translate('moderatorDescription') : translate('adminDescription')}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 min-w-[140px]">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text" placeholder={translate('fromDate')} value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-blue-500 placeholder-gray-400"
          />
        </div>
        <div className="flex items-center gap-2 min-w-[140px]">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text" placeholder={translate('toDate')} value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-blue-500 placeholder-gray-400"
          />
        </div>
        <div className="flex items-center gap-2 min-w-[180px]">
          <span className="text-xs text-gray-400 font-semibold">{translate('statusLabel')}</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="PENDING">{translate('statusPending')}</option>
            <option value="APPROVED">{translate('statusApproved')}</option>
            <option value="REJECTED">{translate('statusRejected')}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-500 space-y-2">
          <ShieldAlert className="w-12 h-12 mx-auto text-slate-400" />
          <p className="text-base font-medium text-slate-800">{translate('emptyTitle')}</p>
          <p className="text-xs text-slate-500">{translate('emptyHint')}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 pl-6">{translate('sender')}</th>
                  <th className="p-4">{translate('phone')}</th>
                  <th className="p-4">{translate('submittedDate')}</th>
                  <th className="p-4">{translate('status')}</th>
                  <th className="p-4">{translate('documents')}</th>
                  <th className="p-4 pr-6 text-right">{translate('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 text-sm">
                {filteredTickets.map((item) => (
                  <tr key={item.ticket.id} className="hover:bg-slate-50 transition-all duration-150">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase overflow-hidden">
                          {item.user.avatarUrl ? (
                            <img src={item.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{item.user.fullName}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {item.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 text-xs font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {item.ticket.contactPhone}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(item.ticket.createdAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.ticket.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : item.ticket.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {item.ticket.status === 'APPROVED' ? translate('statusShortApproved') : item.ticket.status === 'PENDING' ? translate('statusShortPending') : translate('statusShortRejected')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {item.ticket.evidenceUrls.map((url, index) => (
                          <a key={index} href={url} target="_blank" rel="noopener noreferrer"
                            className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 p-1.5 rounded-lg flex items-center gap-1 text-xs transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>#{index + 1}</span>
                          </a>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.ticket.status === 'PENDING' && (
                          <>
                            <Button onClick={() => handleApprove(item.ticket.id)} disabled={processing}
                              variant="success" size="sm"
                            ><Check className="w-3.5 h-3.5" /> {translate('approve')}</Button>
                            <Button onClick={() => { setSelectedTicket(item); setShowRejectModal(true); }} disabled={processing}
                              variant="destructive" size="sm"
                            ><X className="w-3.5 h-3.5" /> {translate('reject')}</Button>
                          </>
                        )}
                        {item.ticket.status === 'APPROVED' && (
                          <Button onClick={() => handleRevoke(item.ticket.id)} disabled={processing}
                            variant="warning" size="sm"
                          ><RotateCcw className="w-3.5 h-3.5" /> {translate('revoke')}</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{translate('rejectModalTitle')}</h3>
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">{translate('senderLabel')}</p>
                <p className="text-sm font-semibold text-slate-800">{selectedTicket.user.fullName}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">{translate('rejectReasonLabel')}</label>
                <textarea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={translate('rejectReasonPlaceholder')}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none resize-none" />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                className="text-xs">{translate('cancel')}</Button>
              <Button onClick={handleRejectSubmit} disabled={processing || !rejectReason.trim()}
                variant="destructive" className="text-xs">{translate('submitRejection')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

