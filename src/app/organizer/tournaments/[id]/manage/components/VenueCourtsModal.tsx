'use client';

import React, { useState } from 'react';
import { Layers, MapPin, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TournamentVenueWithCourts } from '@/features/tournaments/api';

interface VenueCourtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: TournamentVenueWithCourts | null;
  onAddCourt: (venueId: string, courtName: string) => Promise<void>;
  onBatchAddCourts: (venueId: string, count: number, prefix?: string) => Promise<void>;
  onRemoveCourt: (venueId: string, courtId: string) => Promise<void>;
  onSetDefaultVenue?: (venueId: string) => Promise<void>;
}

export function VenueCourtsModal({
  isOpen,
  onClose,
  venue,
  onAddCourt,
  onBatchAddCourts,
  onRemoveCourt,
  onSetDefaultVenue,
}: VenueCourtsModalProps) {
  const [batchCount, setBatchCount] = useState<number>(4);
  const [batchPrefix, setBatchPrefix] = useState<string>('Sân');
  const [isBatchAdding, setIsBatchAdding] = useState(false);
  const [singleCourtName, setSingleCourtName] = useState('');
  const [isAddingSingle, setIsAddingSingle] = useState(false);
  const [deletingCourtId, setDeletingCourtId] = useState<string | null>(null);

  if (!isOpen || !venue) return null;

  const courts = venue.courts || [];

  const handleBatchCreate = async () => {
    if (batchCount < 1) return;
    setIsBatchAdding(true);
    try {
      await onBatchAddCourts(venue.id, batchCount, batchPrefix.trim() || 'Sân');
    } finally {
      setIsBatchAdding(false);
    }
  };

  const handleSingleAdd = async () => {
    const name = singleCourtName.trim();
    if (!name) return;
    setIsAddingSingle(true);
    try {
      await onAddCourt(venue.id, name);
      setSingleCourtName('');
    } finally {
      setIsAddingSingle(false);
    }
  };

  const handleDeleteCourt = async (courtId: string) => {
    setDeletingCourtId(courtId);
    try {
      await onRemoveCourt(venue.id, courtId);
    } finally {
      setDeletingCourtId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 p-5 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{venue.name}</h3>
                {venue.isDefault ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    ⭐ Mặc định
                  </span>
                ) : onSetDefaultVenue ? (
                  <button
                    type="button"
                    onClick={() => onSetDefaultVenue(venue.id)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    ⭐ Đặt làm mặc định
                  </button>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{venue.locationAddress}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Quick Batch Setup */}
          <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-sky-50/40 to-white p-4">
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
                  disabled={isBatchAdding || isAddingSingle}
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
                  disabled={isBatchAdding || isAddingSingle}
                />
              </div>

              <Button
                type="button"
                onClick={handleBatchCreate}
                disabled={isBatchAdding || isAddingSingle}
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Input
                label="Hoặc thêm từng sân tùy chỉnh"
                value={singleCourtName}
                maxLength={100}
                onChange={(event) => setSingleCourtName(event.target.value)}
                placeholder="Ví dụ: Sân VIP 1, Sân Trung Tâm..."
                disabled={isBatchAdding || isAddingSingle}
              />
            </div>
            <Button
              type="button"
              onClick={handleSingleAdd}
              disabled={isBatchAdding || isAddingSingle || !singleCourtName.trim()}
              className="h-10 shrink-0 bg-slate-800 text-white hover:bg-slate-900 font-bold text-xs px-4 rounded-lg"
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {isAddingSingle ? 'Đang thêm...' : 'Thêm sân'}
            </Button>
          </div>

          {/* Courts List Header */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-800">
                Danh sách sân của địa điểm ({courts.length} sân)
              </h4>
            </div>

            {courts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 bg-slate-50/50">
                Chưa có sân nào trong địa điểm này. Bạn có thể nhập số lượng ở trên và bấm <strong>"Tạo nhanh sân"</strong>.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {courts.map((court, idx) => (
                  <div
                    key={court.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-900">
                          {court.courtName}
                        </span>
                        <span className="block text-[10px] font-semibold text-emerald-600 uppercase">
                          Sẵn sàng
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteCourt(court.id)}
                      disabled={deletingCourtId === court.id}
                      className="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                      title="Xóa sân này"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 p-4 bg-slate-50">
          <Button
            type="button"
            onClick={onClose}
            className="h-10 bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs px-6 rounded-lg"
          >
            Hoàn tất
          </Button>
        </div>
      </div>
    </div>
  );
}
