'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Flag, ShieldAlert, UploadCloud, Loader2 } from 'lucide-react';
import { useState } from 'react';
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
import { REPORT_CATEGORY_LABELS, REPORT_TARGET_LABELS } from '../constants';
import { REPORT_CATEGORIES, type ReportTargetType } from '../types';

const reportSchema = z.object({
  category: z.enum(REPORT_CATEGORIES),
  reason: z.string().min(20, 'Mô tả cần ít nhất 20 ký tự.').max(2000, 'Mô tả tối đa 2.000 ký tự.'),
  evidenceText: z.string().max(2500, 'Danh sách minh chứng quá dài.'),
});

type ReportFormValues = z.infer<typeof reportSchema>;

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
      toast.error('Vui lòng đăng nhập để gửi báo cáo.');
      return;
    }
    setOpen(true);
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    const evidenceUrls = parseEvidenceUrls(values.evidenceText);
    if (evidenceUrls.length > 5) {
      form.setError('evidenceText', { message: 'Chỉ được đính kèm tối đa 5 liên kết.' });
      return;
    }
    if (evidenceUrls.some((url) => !z.url().safeParse(url).success)) {
      form.setError('evidenceText', { message: 'Mỗi dòng phải là một liên kết http/https hợp lệ.' });
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
      toast.success('Đã gửi báo cáo. Bạn có thể theo dõi trong Báo cáo của tôi.');
      form.reset();
      setOpen(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || 'Không thể gửi báo cáo lúc này.');
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
        aria-label={`Báo cáo ${targetLabel}`}
      >
        <Flag className="h-4 w-4" />
        {compact ? null : <span className="ml-2">Báo cáo</span>}
      </Button>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg border-slate-200 bg-white sm:max-w-xl">
          <ModalHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <ModalTitle className="text-xl font-bold text-slate-950">Báo cáo vi phạm</ModalTitle>
            <ModalDescription className="leading-6 text-slate-600">
              {REPORT_TARGET_LABELS[targetType]}: <strong>{targetLabel}</strong>. Chỉ gửi thông tin bạn có thể mô tả hoặc chứng minh.
            </ModalDescription>
          </ModalHeader>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">Loại vi phạm</label>
              <select
                {...form.register('category')}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                {REPORT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{REPORT_CATEGORY_LABELS[category]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">Mô tả sự việc</label>
              <Textarea
                {...form.register('reason')}
                rows={6}
                placeholder="Nêu rõ sự việc, thời gian, người liên quan và ảnh hưởng..."
                className="min-h-32 rounded-lg border-slate-300 bg-white text-slate-800 focus-visible:ring-blue-600"
              />
              {form.formState.errors.reason ? (
                <p className="mt-1 text-xs font-semibold text-rose-600">{form.formState.errors.reason.message}</p>
              ) : null}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-800">Liên kết minh chứng</label>
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors border border-blue-200/60">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang tải lên...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Tải ảnh / file lên</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    disabled={isUploading}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 15 * 1024 * 1024) {
                        toast.error('Dung lượng tệp tối đa là 15MB');
                        return;
                      }
                      try {
                        setIsUploading(true);
                        toast.loading('Đang tải tệp minh chứng lên Cloudinary...', { id: 'report-upload' });
                        const res = await uploadApi.uploadImage(file);
                        if (res?.url) {
                          const currentVal = form.getValues('evidenceText') || '';
                          const newVal = currentVal ? `${currentVal.trim()}\n${res.url}` : res.url;
                          form.setValue('evidenceText', newVal, { shouldValidate: true });
                          toast.success('Đã tải minh chứng lên thành công!', { id: 'report-upload' });
                        }
                      } catch (err: unknown) {
                        toast.error(getErrorMessage(err) || 'Tải tệp thất bại, vui lòng dán URL.', { id: 'report-upload' });
                      } finally {
                        setIsUploading(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
              <Textarea
                {...form.register('evidenceText')}
                rows={3}
                placeholder={'Mỗi dòng một liên kết ảnh hoặc video (hoặc dùng nút Tải ảnh ở trên)\nTối đa 5 liên kết'}
                className="rounded-lg border-slate-300 bg-white text-slate-800 focus-visible:ring-blue-600 font-mono text-xs"
              />
              {form.formState.errors.evidenceText ? (
                <p className="mt-1 text-xs font-semibold text-rose-600">{form.formState.errors.evidenceText.message}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Bạn có thể dán link trực tiếp hoặc bấm &quot;Tải ảnh / file lên&quot; để chọn tệp từ máy.</p>
              )}
            </div>

            <ModalFooter className="gap-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
              <Button type="submit" isLoading={form.formState.isSubmitting}>Gửi báo cáo</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}
