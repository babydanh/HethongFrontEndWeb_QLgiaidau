'use client';

import { ExternalLink, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/utils/error';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { reportsApi } from '../api';
import { REPORT_CATEGORY_LABELS, REPORT_SOURCE_LABELS, REPORT_TARGET_LABELS } from '../constants';
import { REPORT_CATEGORIES, type ReportCategory, type ViolationReport } from '../types';
import { ReportStatusBadge } from './ReportStatusBadge';

type ReviewAction = 'TRIAGE' | 'START_REVIEW' | 'ESCALATE' | 'RESOLVE' | 'REJECT';

interface ReportReviewModalProps {
  report: ViolationReport | null;
  open: boolean;
  isModeratorOnly: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export function ReportReviewModal({ report, open, isModeratorOnly, onOpenChange, onCompleted }: ReportReviewModalProps) {
  const [category, setCategory] = useState<ReportCategory>('OTHER');
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState<ReviewAction | null>(null);

  useEffect(() => {
    if (!report) return;
    setCategory(report.category);
    setNote(report.resolutionNote ?? '');
  }, [report]);

  if (!report) return null;
  const terminal = report.status === 'RESOLVED' || report.status === 'REJECTED';
  const canEscalate = report.status === 'TRIAGED' || report.status === 'UNDER_REVIEW';

  const execute = async (action: ReviewAction) => {
    const normalizedNote = trimAndNormalizeSpaces(note);
    if (normalizedNote.length < 10) {
      toast.error('Biên bản xử lý cần ít nhất 10 ký tự.');
      return;
    }
    setProcessing(action);
    try {
      if (action === 'TRIAGE') await reportsApi.triage(report.id, { category, note: normalizedNote });
      if (action === 'START_REVIEW') await reportsApi.startReview(report.id, normalizedNote);
      if (action === 'ESCALATE') await reportsApi.escalate(report.id, normalizedNote);
      if (action === 'RESOLVE') await reportsApi.resolve(report.id, 'RESOLVED', normalizedNote);
      if (action === 'REJECT') await reportsApi.resolve(report.id, 'REJECTED', normalizedNote);
      toast.success(action === 'ESCALATE' ? 'Đã chuyển hồ sơ cho admin.' : 'Đã cập nhật hồ sơ báo cáo.');
      onOpenChange(false);
      onCompleted();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || 'Không thể cập nhật báo cáo.');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[92vh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg bg-white sm:max-w-2xl">
        <ModalHeader>
          <div className="flex flex-wrap items-center gap-2"><ReportStatusBadge status={report.status} /><span className="text-xs font-semibold text-slate-500">Mã {report.id?.slice(0, 8) ?? 'N/A'}</span></div>
          <ModalTitle className="pt-2 text-xl font-black text-slate-950">Hồ sơ báo cáo {REPORT_TARGET_LABELS[report.targetType].toLowerCase()}</ModalTitle>
          <ModalDescription className="text-slate-600">
            Người gửi: {report.reporter?.fullName ?? report.reporter?.email ?? 'Không xác định'}
            {report.source ? ` · Nguồn: ${REPORT_SOURCE_LABELS[report.source]}` : null}
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Đối tượng</p>
            <p className="mt-1 font-bold text-slate-900">{report.target?.name ?? report.targetUser?.fullName ?? report.targetTournament?.name ?? report.targetId}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.reason}</p>
          </div>

          {report.evidenceUrls.length ? (
            <div>
              <p className="mb-2 text-sm font-bold text-slate-800">Minh chứng ({report.evidenceUrls.length})</p>
              <div className="flex flex-wrap gap-2">
                {report.evidenceUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                    Mở minh chứng <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {!terminal ? (
            <label className="block text-sm font-semibold text-slate-800">
              Loại vi phạm
              <select value={category} onChange={(event) => setCategory(event.target.value as ReportCategory)} className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal">
                {REPORT_CATEGORIES.map((value) => <option key={value} value={value}>{REPORT_CATEGORY_LABELS[value]}</option>)}
              </select>
            </label>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-800">{terminal ? 'Kết luận' : 'Biên bản xác minh / hướng xử lý'}</label>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={terminal} rows={5} className="rounded-lg border-slate-300 bg-white" placeholder="Ghi dữ kiện đã kiểm tra, kết luận ban đầu và đề xuất xử lý..." />
          </div>
        </div>

        <ModalFooter className="mt-2 flex-wrap gap-2 border-t border-slate-100 pt-4 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
          {!terminal ? (
            <div className="flex flex-wrap justify-end gap-2">
              {report.status === 'SUBMITTED' ? <Button onClick={() => void execute('TRIAGE')} isLoading={processing === 'TRIAGE'}><ShieldCheck className="mr-2 h-4 w-4" />Phân loại</Button> : null}
              {report.status === 'TRIAGED' ? <Button variant="outline" onClick={() => void execute('START_REVIEW')} isLoading={processing === 'START_REVIEW'}>Bắt đầu xác minh</Button> : null}
              {canEscalate ? <Button variant="destructive" onClick={() => void execute('ESCALATE')} isLoading={processing === 'ESCALATE'}>Chuyển admin</Button> : null}
              {!isModeratorOnly ? <Button onClick={() => void execute('RESOLVE')} isLoading={processing === 'RESOLVE'}>Xác nhận vi phạm</Button> : null}
              {!isModeratorOnly ? <Button variant="outline" onClick={() => void execute('REJECT')} isLoading={processing === 'REJECT'}>Bác báo cáo</Button> : null}
            </div>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
