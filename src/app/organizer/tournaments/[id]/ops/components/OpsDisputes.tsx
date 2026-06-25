'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import type { OpsDisputeItem } from '@/features/organizer/ops/types';
import { formatDateTime } from '@/utils/format';

interface OpsDisputesProps {
  disputes: OpsDisputeItem[];
  activeActionId: string | null;
  onResolveDispute: (
    disputeId: string,
    resolutionNote: string,
    matchStatus?: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'DISPUTED',
  ) => Promise<void>;
}

export function OpsDisputes({ disputes, activeActionId, onResolveDispute }: OpsDisputesProps) {
  const [selectedDispute, setSelectedDispute] = useState<OpsDisputeItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [matchStatus, setMatchStatus] = useState<'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'DISPUTED'>('COMPLETED');

  const openDisputes = useMemo(
    () => disputes.filter((dispute) => dispute.status === 'OPEN'),
    [disputes],
  );

  const handleSubmit = async () => {
    if (!selectedDispute) {
      return;
    }

    await onResolveDispute(selectedDispute.id, resolutionNote, matchStatus);
    setSelectedDispute(null);
    setResolutionNote('');
    setMatchStatus('COMPLETED');
  };

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Sự cố và tranh chấp</h2>
            <p className="text-sm font-medium text-slate-500">
              BTC theo dõi các trận bị treo, ghi rõ lý do và chốt hướng xử lý ngay trong panel giải.
            </p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-right">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-rose-500">Đang mở</p>
            <p className="mt-1 text-2xl font-black text-rose-700">{openDisputes.length}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {disputes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-bold text-slate-700">Chưa có sự cố hoặc tranh chấp nào</p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Khi BTC mở sự cố từ một trận đấu, lịch sử xử lý sẽ hiện tại đây.
              </p>
            </div>
          ) : (
            disputes.map((dispute) => (
              <div key={dispute.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-rose-700">
                        {dispute.status}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        Trận {dispute.match.roundNumber}-{dispute.match.matchOrder}
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-900">{dispute.reason}</p>
                    <p className="text-xs font-semibold text-slate-500">
                      Người mở: {dispute.filedBy.fullName || dispute.filedBy.email || 'BTC'} • {formatDateTime(dispute.createdAt)}
                    </p>
                    {dispute.resolutionNote ? (
                      <p className="text-xs font-medium text-emerald-700">Kết luận: {dispute.resolutionNote}</p>
                    ) : null}
                  </div>

                  {dispute.status === 'OPEN' ? (
                    <Button
                      variant="outline"
                      className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                      onClick={() => setSelectedDispute(dispute)}
                      disabled={activeActionId === dispute.id}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Xử lý
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <Modal open={Boolean(selectedDispute)} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        <ModalContent className="sm:max-w-xl">
          <ModalHeader>
            <ModalTitle>Xử lý sự cố/tranh chấp</ModalTitle>
            <ModalDescription>Ghi kết luận và đưa trận về trạng thái phù hợp sau khi BTC đã xử lý.</ModalDescription>
          </ModalHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Kết luận xử lý</label>
              <textarea
                value={resolutionNote}
                onChange={(event) => setResolutionNote(event.target.value)}
                className="min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Ví dụ: BTC xác nhận đội A thắng kỹ thuật do đối thủ bỏ cuộc vì chấn thương."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Trạng thái trận sau xử lý</label>
              <select
                value={matchStatus}
                onChange={(event) => setMatchStatus(event.target.value as 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'DISPUTED')}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="SCHEDULED">Sắp đấu</option>
                <option value="ONGOING">Đang đấu</option>
                <option value="COMPLETED">Hoàn tất</option>
                <option value="DISPUTED">Tiếp tục treo</option>
              </select>
            </div>
          </div>

          <ModalFooter>
            <Button variant="outline" className="border-slate-200" onClick={() => setSelectedDispute(null)}>
              Hủy
            </Button>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => void handleSubmit()}
              disabled={!resolutionNote.trim() || activeActionId === selectedDispute?.id}
            >
              Chốt xử lý
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
