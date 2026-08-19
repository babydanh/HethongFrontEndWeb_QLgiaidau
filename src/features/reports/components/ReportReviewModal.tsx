'use client';

import { ExternalLink, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/utils/error';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { reportsApi } from '../api';
import { REPORT_CATEGORIES, type ReportCategory, type ReportTargetType, type ReportSource, type ViolationReport } from '../types';
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
  const translate = useTranslations('Reports');
  const categoryLabels: Record<ReportCategory, string> = {
    CHEATING: translate('categoryCheating'),
    RULE_VIOLATION: translate('categoryRuleViolation'),
    ABUSIVE_BEHAVIOR: translate('categoryAbusiveBehavior'),
    FAKE_INFORMATION: translate('categoryFakeInformation'),
    PAYMENT_FRAUD: translate('categoryPaymentFraud'),
    UNSAFE_ORGANIZATION: translate('categoryUnsafeOrganization'),
    OTHER: translate('categoryOther'),
  };
  const targetLabels: Record<ReportTargetType, string> = {
    USER: translate('targetUser'),
    TOURNAMENT: translate('targetTournament'),
    MATCH: translate('targetMatch'),
    COMMUNITY: translate('targetCommunity'),
  };
  const sourceLabels: Record<ReportSource, string> = {
    USER_REPORT: translate('sourceUserReport'),
    LEGACY_DISPUTE: translate('sourceLegacyDispute'),
  };
  const [category, setCategory] = useState<ReportCategory>('OTHER');
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState<ReviewAction | null>(null);

  const [prevReportId, setPrevReportId] = useState<string | undefined>(report?.id);

  if (report?.id !== prevReportId) {
    setPrevReportId(report?.id);
    if (report) {
      setCategory(report.category);
      setNote(report.resolutionNote ?? '');
    }
  }

  if (!report) return null;
  const terminal = report.status === 'RESOLVED' || report.status === 'REJECTED';
  const canEscalate = report.status === 'TRIAGED' || report.status === 'UNDER_REVIEW';

  const execute = async (action: ReviewAction) => {
    const normalizedNote = trimAndNormalizeSpaces(note);
    if (normalizedNote.length < 10) {
      toast.error(translate('noteMin'));
      return;
    }
    setProcessing(action);
    try {
      if (action === 'TRIAGE') await reportsApi.triage(report.id, { category, note: normalizedNote });
      if (action === 'START_REVIEW') await reportsApi.startReview(report.id, normalizedNote);
      if (action === 'ESCALATE') await reportsApi.escalate(report.id, normalizedNote);
      if (action === 'RESOLVE') await reportsApi.resolve(report.id, 'RESOLVED', normalizedNote, category);
      if (action === 'REJECT') await reportsApi.resolve(report.id, 'REJECTED', normalizedNote, category);
      toast.success(action === 'ESCALATE' ? translate('escalateSuccess') : translate('updateSuccess'));
      onOpenChange(false);
      onCompleted();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || translate('updateError'));
    } finally {
      setProcessing(null);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[92vh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg bg-white sm:max-w-2xl">
        <ModalHeader>
          <div className="flex flex-wrap items-center gap-2"><ReportStatusBadge status={report.status} /><span className="text-xs font-semibold text-slate-500">{translate('caseId', { id: report.id?.slice(0, 8) ?? 'N/A' })}</span></div>
          <ModalTitle className="pt-2 text-xl font-black text-slate-950">{translate('reviewTitle', { targetType: targetLabels[report.targetType].toLowerCase() })}</ModalTitle>
          <ModalDescription className="text-slate-600">
            {translate('reporter')}: {report.reporter?.fullName ?? report.reporter?.email ?? 'Unknown'}
            {report.source ? ` · ${translate('source')}: ${sourceLabels[report.source]}` : null}
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{translate('target')}</p>
            <p className="mt-1 font-bold text-slate-900">{report.target?.name ?? report.targetUser?.fullName ?? report.targetTournament?.name ?? report.targetId}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.reason}</p>
          </div>

          {report.evidenceUrls.length ? (
            <div>
              <p className="mb-2 text-sm font-bold text-slate-800">{translate('evidence', { count: report.evidenceUrls.length })}</p>
              <div className="flex flex-wrap gap-2">
                {report.evidenceUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                    {translate('openEvidence')} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {!terminal ? (
            <label className="block text-sm font-semibold text-slate-800">
                            {translate('violationType')}

              <select value={category} onChange={(event) => setCategory(event.target.value as ReportCategory)} className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal">
                {REPORT_CATEGORIES.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}
              </select>
            </label>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-800">{terminal ? translate('conclusion') : translate('reviewNote')}</label>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={terminal} rows={5} className="rounded-lg border-slate-300 bg-white" placeholder={translate('notePlaceholder')} />
          </div>
        </div>

        <ModalFooter className="mt-2 flex-wrap gap-2 border-t border-slate-100 pt-4 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{translate('close')}</Button>
          {!terminal ? (
            <div className="flex flex-wrap justify-end gap-2">
              {report.status === 'SUBMITTED' ? <Button onClick={() => void execute('TRIAGE')} isLoading={processing === 'TRIAGE'}><ShieldCheck className="mr-2 h-4 w-4" />{translate('triage')}</Button> : null}
              {report.status === 'TRIAGED' ? <Button variant="outline" onClick={() => void execute('START_REVIEW')} isLoading={processing === 'START_REVIEW'}>{translate('startReview')}</Button> : null}
              {canEscalate ? <Button variant="destructive" onClick={() => void execute('ESCALATE')} isLoading={processing === 'ESCALATE'}>{translate('escalate')}</Button> : null}
              {!isModeratorOnly ? <Button onClick={() => void execute('RESOLVE')} isLoading={processing === 'RESOLVE'}>{translate('resolve')}</Button> : null}
              {!isModeratorOnly ? <Button variant="outline" onClick={() => void execute('REJECT')} isLoading={processing === 'REJECT'}>{translate('reject')}</Button> : null}
            </div>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

