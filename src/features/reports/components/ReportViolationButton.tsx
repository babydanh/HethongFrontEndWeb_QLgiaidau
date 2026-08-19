'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Flag, ShieldAlert, UploadCloud, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { useAuthStore } from '@/lib/zustand/authStore';
import { uploadApi } from '@/features/upload/api';
import { cn } from '@/utils/cn';
import { getErrorMessage } from '@/utils/error';
import { trimAndNormalizeSpaces, trimSpaces } from '@/utils/string';
import { reportsApi } from '../api';
import { REPORT_CATEGORIES, type ReportCategory, type ReportTargetType } from '../types';

const createReportSchema = (translate: any) => z.object({
  category: z.enum(REPORT_CATEGORIES),
  reason: z.string().min(20, translate('validationReasonMin')).max(2000, translate('validationReasonMax')),
  evidenceText: z.string().max(2500, translate('validationEvidenceMax')),
});

type ReportFormValues = z.infer<ReturnType<typeof createReportSchema>>;

interface ReportViolationButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  hidden?: boolean;
  className?: string;
  compact?: boolean;
}

function parseEvidenceUrls(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => trimSpaces(item))
    .filter(Boolean);
}

export function ReportViolationButton({
  targetType,
  targetId,
  targetLabel,
  hidden = false,
  className,
  compact = false,
}: ReportViolationButtonProps) {
  const translate = useTranslations('Reports');
  const reportSchema = useMemo(() => createReportSchema(translate), [translate]);
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
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { category: 'OTHER', reason: '', evidenceText: '' },
  });

  if (hidden) return null;

  const handleOpen = () => {
    if (!isAuthenticated) {
      toast.error(translate('submitAuthRequired'));
      return;
    }
    setOpen(true);
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    const evidenceUrls = parseEvidenceUrls(values.evidenceText);
    if (evidenceUrls.length > 5) {
      form.setError('evidenceText', { message: translate('evidenceMaxLinks') });
      return;
    }
    if (evidenceUrls.some((url) => !z.url().safeParse(url).success)) {
      form.setError('evidenceText', { message: translate('evidenceUrlInvalid') });
      return;
    }

    try {
      await reportsApi.create({
        targetType,
        targetId,
        category: values.category,
        reason: trimAndNormalizeSpaces(values.reason),
        evidenceUrls,
      });
      toast.success(translate('submitSuccess'));
      form.reset();
      setOpen(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || translate('submitError'));
    }
  });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={compact ? 'icon' : 'default'}
        onClick={handleOpen}
        className={cn('border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800', className)}
        aria-label={`${translate('reportButton')} ${targetLabel}`}
      >
        <Flag className="h-4 w-4" />
        {compact ? null : <span className="ml-2">{translate('reportButton')}</span>}
      </Button>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg border-slate-200 bg-white sm:max-w-xl">
          <ModalHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <ModalTitle className="text-xl font-bold text-slate-950">{translate('reportTitle')}</ModalTitle>
            <ModalDescription className="leading-6 text-slate-600">
              {targetLabels[targetType]}: <strong>{targetLabel}</strong>. {translate('reportDescription')}
            </ModalDescription>
          </ModalHeader>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">{translate('violationType')}</label>
              <select
                {...form.register('category')}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
{REPORT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{categoryLabels[category]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">{translate('incidentDescription')}</label>
              <Textarea
                {...form.register('reason')}
                rows={6}
                placeholder={translate('incidentPlaceholder')}
                className="min-h-32 rounded-lg border-slate-300 bg-white text-slate-800 focus-visible:ring-blue-600"
              />
              {form.formState.errors.reason ? (
                <p className="mt-1 text-xs font-semibold text-rose-600">{form.formState.errors.reason.message}</p>
              ) : null}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-800">{translate('evidenceLinks')}</label>
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors border border-blue-200/60">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{translate('uploading')}</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{translate('uploadFiles')}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*,.pdf"
                    disabled={isUploading}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 15 * 1024 * 1024) {
                        toast.error(translate('fileTooLarge'));
                        return;
                      }
                      try {
                        setIsUploading(true);
                        toast.loading(translate('uploadingEvidence'), { id: 'report-upload' });
                        const res = await uploadApi.uploadImage(file);
                        if (res?.url) {
                          const currentVal = form.getValues('evidenceText') || '';
                          const newVal = currentVal ? `${currentVal.trim()}\n${res.url}` : res.url;
                          form.setValue('evidenceText', newVal, { shouldValidate: true });
                          toast.success(translate('uploadSuccess'), { id: 'report-upload' });
                        }
                      } catch (err: unknown) {
                        toast.error(getErrorMessage(err) || translate('uploadError'), { id: 'report-upload' });
                      } finally {
                        setIsUploading(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
              <input type="hidden" {...form.register('evidenceText')} />
              {parseEvidenceUrls(form.watch('evidenceText')).length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {parseEvidenceUrls(form.watch('evidenceText')).map((url, index) => {
                    const isImage = /\.(png|jpe?g|webp)(\?|$)/i.test(url);
                    return (
                      <div key={`${url}-${index}`} className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {isImage ? <img src={url} alt={translate('evidenceAlt', { index: index + 1 })} className="h-24 w-full object-cover" /> : <div className="flex h-24 items-center justify-center text-xs font-semibold text-slate-500">{translate('evidenceFile')}</div>}
                        <button type="button" className="absolute right-1 top-1 rounded-full bg-slate-900/70 px-2 py-1 text-xs text-white" onClick={() => form.setValue('evidenceText', parseEvidenceUrls(form.getValues('evidenceText')).filter((_, i) => i !== index).join('\n'))}>{translate('remove')}</button>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">{translate('noEvidence')}</p>}
              {form.formState.errors.evidenceText ? (
                <p className="mt-1 text-xs font-semibold text-rose-600">{form.formState.errors.evidenceText.message}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">{translate('evidenceHint')}</p>
              )}
            </div>

            <ModalFooter className="gap-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{translate('cancel')}</Button>
              <Button type="submit" isLoading={form.formState.isSubmitting}>{translate('submit')}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}

