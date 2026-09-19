'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface ConfirmDeletePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isAuthor: boolean;
}

export default function ConfirmDeletePostModal({
  isOpen,
  onClose,
  onConfirm,
  isAuthor,
}: ConfirmDeletePostModalProps) {
  const translate = useTranslations('Common');
  const [selectedReason, setSelectedReason] = useState<string>('SPAM');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const reasonOptions = [
    { key: 'SPAM', label: translate('deleteReasonSpam') },
    { key: 'OFFENSIVE', label: translate('deleteReasonOffensive') },
    { key: 'GAMBLING', label: translate('deleteReasonGambling') },
    { key: 'OFF_TOPIC', label: translate('deleteReasonOffTopic') },
    { key: 'OTHER', label: translate('deleteReasonOther') },
  ];

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const finalReason = selectedReason === 'OTHER'
        ? (customReason.trim() || translate('deleteReasonOther'))
        : (reasonOptions.find(r => r.key === selectedReason)?.label || selectedReason);
      await onConfirm(finalReason);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="confirm-delete-title" className="text-sm font-bold text-slate-900">
                {translate('adminDeletePostModalTitle')}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label={translate('cancelingAction')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {isAuthor
              ? translate('deletePostConfirm')
              : translate('adminDeletePostDescription')}
          </p>

          {!isAuthor && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                {translate('deleteReasonLabel')}
              </label>
              <div className="space-y-1.5">
                {reasonOptions.map((opt) => (
                  <label
                    key={opt.key}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      selectedReason === opt.key
                        ? 'border-blue-500 bg-blue-50/40 text-blue-950 font-medium'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deleteReason"
                      value={opt.key}
                      checked={selectedReason === opt.key}
                      onChange={() => setSelectedReason(opt.key)}
                      className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              {selectedReason === 'OTHER' && (
                <div className="pt-1.5">
                  <textarea
                    rows={2}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder={translate('deleteReasonCustomPlaceholder')}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    maxLength={300}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            {translate('cancelingAction')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>{translate('confirmDeleteAction')}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
