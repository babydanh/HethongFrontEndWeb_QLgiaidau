'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import type {
  AdminUser,
  BanType,
  BanUserPayload,
} from '@/features/users/adminModerationApi';
import { trimAndNormalizeSpaces } from '@/utils/string';

type BanFormValues = {
  banType: BanType;
  reason: string;
  durationDays: '7' | '15' | '30';
};

interface AdminBanModalProps {
  user: AdminUser;
  processing: boolean;
  onClose: () => void;
  onSubmit: (payload: BanUserPayload) => Promise<void>;
}

export function AdminBanModal({
  user,
  processing,
  onClose,
  onSubmit,
}: AdminBanModalProps) {
  const translate = useTranslations('AdminModeration');
  const banSchema = z.object({
    banType: z.enum(['WARN', 'SOFT_BAN', 'HARD_BAN']),
    reason: z.string().trim().min(1, translate('reasonRequired')),
    durationDays: z.enum(['7', '15', '30']),
  });
  const form = useForm<BanFormValues>({
    resolver: zodResolver(banSchema),
    defaultValues: {
      banType: 'SOFT_BAN',
      reason: '',
      durationDays: '7',
    },
  });
  const banType = useWatch({ control: form.control, name: 'banType' }) as BanType;

  const submit = form.handleSubmit(async (values) => {
    let expiresAt: string | undefined;
    if (values.banType === 'SOFT_BAN') {
      const date = new Date();
      date.setDate(date.getDate() + Number(values.durationDays));
      expiresAt = date.toISOString();
    }

    await onSubmit({
      banType: values.banType,
      reason: trimAndNormalizeSpaces(values.reason),
      expiresAt,
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ban-user-title"
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <h3 id="ban-user-title" className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            {translate('banTitle')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={translate('close')}
            className="text-slate-400 transition-colors hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <p className="mb-1 text-xs text-slate-500">{translate('user')}</p>
            <p className="text-sm font-semibold text-slate-800">
              {user.profile?.fullName || translate('defaultUser')}
            </p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-slate-500">{translate('banType')}</span>
            <select
              {...form.register('banType')}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500"
            >
              <option value="WARN">{translate('warnOption')}</option>
              <option value="SOFT_BAN">{translate('softBanOption')}</option>
              <option value="HARD_BAN">{translate('hardBanOption')}</option>
            </select>
          </label>

          {banType === 'SOFT_BAN' && (
            <label className="block space-y-1.5">
              <span className="text-xs text-slate-500">{translate('duration')}</span>
              <select
                {...form.register('durationDays')}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500"
              >
                <option value="7">{translate('days', { count: 7 })}</option>
                <option value="15">{translate('days', { count: 15 })}</option>
                <option value="30">{translate('days', { count: 30 })}</option>
              </select>
            </label>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs text-slate-500">{translate('violationReason')}</span>
            <textarea
              rows={4}
              {...form.register('reason')}
              placeholder={translate('reasonPlaceholder')}
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500"
            />
            {form.formState.errors.reason?.message && (
              <span className="text-xs font-semibold text-rose-600">
                {form.formState.errors.reason.message}
              </span>
            )}
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={processing || form.formState.isSubmitting}
          >
                {translate('cancel')}
          </Button>
          <Button
            type="submit"
            variant="destructive"
            disabled={processing || form.formState.isSubmitting}
          >
            {processing && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {translate('confirmBan')}
          </Button>
        </div>
      </form>
    </div>
  );
}
