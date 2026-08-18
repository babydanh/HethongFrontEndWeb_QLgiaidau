'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Modal,
  ModalContent,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/Modal';
import { cn } from '@/utils/cn';

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  isLoading?: boolean;
  confirmDisabled?: boolean;
  /** Nội dung phụ (ví dụ input xác nhận tên CLB khi xoá) */
  children?: React.ReactNode;
}

/**
 * Modal xác nhận thống nhất thay cho confirm()/prompt() native.
 * - variant 'danger': icon TriangleAlert + nút xác nhận đỏ (hành động nguy hiểm)
 * - variant 'default': icon AlertTriangle + nút xác nhận brand blue
 * - Enter submit, Escape đóng (Radix Dialog mặc định)
 */
export default function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  onConfirm,
  isLoading = false,
  confirmDisabled = false,
  children,
}: ConfirmModalProps) {
  const translate = useTranslations('Common');
  const resolvedCancelLabel = cancelLabel ?? translate('confirmCancel');
  const isDanger = variant === 'danger';
  const Icon = isDanger ? TriangleAlert : AlertTriangle;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || confirmDisabled) return;
    onConfirm();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-sm gap-0 overflow-hidden p-0">
        <form onSubmit={handleSubmit}>
          <div className="flex items-start gap-4 p-6">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border',
                isDanger
                  ? 'bg-rose-50 text-rose-600 border-rose-100'
                  : 'bg-blue-50 text-blue-600 border-blue-100'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
              <ModalTitle className="text-base font-bold leading-tight text-slate-900">
                {title}
              </ModalTitle>
              {description ? (
                <ModalDescription className="text-sm leading-relaxed text-slate-500">
                  {description}
                </ModalDescription>
              ) : null}
            </div>
          </div>

          {children ? <div className="px-6 pb-5">{children}</div> : null}

          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 text-xs font-semibold"
            >
              {resolvedCancelLabel}
            </Button>
            <Button
              type="submit"
              variant={isDanger ? 'destructive' : 'default'}
              isLoading={isLoading}
              disabled={isLoading || confirmDisabled}
              className="h-9 px-4 text-xs font-semibold"
            >
              {isLoading ? translate('confirmProcessing') : confirmLabel}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
