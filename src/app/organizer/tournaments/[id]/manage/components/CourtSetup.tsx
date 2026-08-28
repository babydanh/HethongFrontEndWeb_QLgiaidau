'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, Plus, ShieldAlert, Trash2, Layers, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export interface CourtSetupItem {
  id: string;
  courtName: string;
  status?: string;
  venueId?: string;
}

interface CourtSetupProps {
  venue: {
    name: string;
    locationAddress: string;
  } | null;
  courts: CourtSetupItem[];
  newCourtName: string;
  setNewCourtName: (value: string) => void;
  isSaving: boolean;
  onAdd: () => void;
  onBatchAdd?: (count: number, prefix?: string) => Promise<void>;
  onRemoveCourt?: (courtId: string) => Promise<void>;
  operatingStart?: string;
  setOperatingStart?: (value: string) => void;
  operatingEnd?: string;
  setOperatingEnd?: (value: string) => void;
  onCourtClick: (courtId: string) => void;
}

export function CourtSetup({
  venue,
  courts,
  newCourtName,
  setNewCourtName,
  isSaving,
  onAdd,
  onBatchAdd,
  onRemoveCourt,
  onCourtClick,
}: CourtSetupProps) {
  const t = useTranslations('OrganizerManage');
  const [batchCount, setBatchCount] = useState<number>(4);
  const [batchPrefix, setBatchPrefix] = useState<string>('Sân');
  const [isBatchAdding, setIsBatchAdding] = useState(false);
  const [deletingCourtId, setDeletingCourtId] = useState<string | null>(null);

  const handleBatchCreate = async () => {
    if (!onBatchAdd || batchCount < 1) return;
    setIsBatchAdding(true);
    try {
      await onBatchAdd(batchCount, batchPrefix.trim() || 'Sân');
    } finally {
      setIsBatchAdding(false);
    }
  };

  const handleDeleteCourt = async (courtId: string) => {
    if (!onRemoveCourt) return;
    setDeletingCourtId(courtId);
    try {
      await onRemoveCourt(courtId);
    } finally {
      setDeletingCourtId(null);
    }
  };

  return (
    <section className="border border-slate-200 bg-white p-5 md:p-6 rounded-xl shadow-xs" aria-labelledby="court-setup-title">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 id="court-setup-title" className="text-lg font-bold text-slate-900">{t('courtSetupTitle')}</h3>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-extrabold text-blue-700">
              {courts.length} sân
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{t('courtSetupHint')}</p>
        </div>
        <MapPin className="hidden h-5 w-5 shrink-0 text-blue-600 sm:block" aria-hidden="true" />
      </div>

      {!venue ? (
        <div className="mt-5 flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 rounded-lg">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{t('createVenueFirst')}</p>
        </div>
      ) : (
        <>
          <div className="mt-5 border-l-3 border-blue-600 pl-3 text-sm bg-blue-50/40 p-3 rounded-r-lg">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900">{venue.name}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                ⭐ Sân chính mặc định
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{venue.locationAddress}</p>
          </div>

          {/* Quick Batch Setup Section */}
          <div className="mt-5 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-sky-50/40 to-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-extrabold uppercase tracking-wider text-blue-900">
                Tạo nhanh danh sách sân tự động
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_auto] gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số lượng sân</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={batchCount}
                  onChange={(e) => setBatchCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSaving || isBatchAdding}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tiền tố tên sân</label>
                <input
                  type="text"
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value)}
                  placeholder="Ví dụ: Sân, Court, Bàn..."
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSaving || isBatchAdding}
                />
              </div>

              <Button
                type="button"
                onClick={handleBatchCreate}
                disabled={isSaving || isBatchAdding}
                className="h-10 bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs px-4 rounded-lg shadow-xs"
              >
                <Layers className="mr-1.5 h-4 w-4" />
                {isBatchAdding ? 'Đang tạo...' : `Tạo nhanh ${batchCount} sân`}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              * Hệ thống sẽ tự sinh các sân: {batchPrefix} 1, {batchPrefix} 2, {batchPrefix} 3...
            </p>
          </div>

          {/* Add Single Custom Court */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                label="Hoặc thêm từng sân tùy chỉnh"
                value={newCourtName}
                maxLength={100}
                onChange={(event) => setNewCourtName(event.target.value)}
                placeholder="Ví dụ: Sân VIP 1, Sân Trung Tâm..."
                disabled={isSaving || isBatchAdding}
              />
            </div>
            <Button
              type="button"
              onClick={onAdd}
              disabled={isSaving || isBatchAdding || !newCourtName.trim()}
              className="h-10 shrink-0 bg-slate-800 text-white hover:bg-slate-900 font-bold text-xs px-4 rounded-lg"
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {isSaving ? t('matchSchedule.saving') : 'Thêm sân'}
            </Button>
          </div>

          {/* Courts List Cards */}
          {courts.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 bg-slate-50/50">
              Chưa có sân nào trong địa điểm này. Nhập số lượng sân ở trên và bấm <strong>"Tạo nhanh sân"</strong> để bắt đầu.
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label={t('matchSchedule.court')}>
              {courts.map((court, idx) => (
                <div
                  key={court.id}
                  className="group relative flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition-all hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => onCourtClick(court.id)}
                    className="flex items-center gap-2.5 min-w-0 text-left flex-1"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900 group-hover:text-blue-700">
                        {court.courtName}
                      </span>
                      <span className="block text-[10px] font-semibold text-emerald-600 uppercase">
                        Sẵn sàng thi đấu
                      </span>
                    </div>
                  </button>

                  {onRemoveCourt && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCourt(court.id)}
                      disabled={deletingCourtId === court.id}
                      className="ml-2 rounded-lg p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 transition-all"
                      title="Xóa sân này"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
