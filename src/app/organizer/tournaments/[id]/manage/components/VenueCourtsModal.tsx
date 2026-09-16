'use client';

import React, { useState } from 'react';
import { Layers, MapPin, Plus, Sparkles, Trash2, X, Pencil, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TournamentVenueWithCourts } from '@/features/tournaments/api';

interface VenueCourtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: TournamentVenueWithCourts | null;
  venues?: TournamentVenueWithCourts[];
  onSelectVenue?: (venue: TournamentVenueWithCourts) => void;
  onRequestCreateVenue?: () => void;
  onRequestEditVenue?: (venue: TournamentVenueWithCourts) => void;
  onAddCourt: (venueId: string, courtName: string) => Promise<void>;
  onBatchAddCourts: (venueId: string, count: number, prefix?: string) => Promise<void>;
  onRemoveCourt: (venueId: string, courtId: string) => Promise<void>;
  onSetDefaultVenue?: (venueId: string) => Promise<void>;
}

export function VenueCourtsModal({
  isOpen,
  onClose,
  venue,
  venues = [],
  onSelectVenue,
  onRequestCreateVenue,
  onRequestEditVenue,
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

  // Danh sách địa điểm hiển thị trên tabs
  const venueList = venues.length > 0 ? venues : [venue];
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Địa điểm &amp; Sân thi đấu ({venueList.length} cụm)
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Cụm Địa Điểm Selector Tabs */}
          <div className="flex items-center gap-2 px-5 py-2.5 overflow-x-auto no-scrollbar bg-slate-50/70 border-b border-slate-200">
            {venueList.map((v) => {
              const isSelected = v.id === venue.id;
              const courtNum = v.courts?.length || 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectVenue?.(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {v.isDefault && <span className="text-amber-300 text-[10px]">⭐</span>}
                  <span className="truncate max-w-[140px]">{v.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {courtNum}
                  </span>
                </button>
              );
            })}

            {/* Nút thêm cụm địa điểm mới */}
            {onRequestCreateVenue && (
              <button
                type="button"
                onClick={onRequestCreateVenue}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all bg-white hover:bg-blue-50 text-blue-600 border border-dashed border-blue-300 hover:border-blue-400"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm địa điểm</span>
              </button>
            )}
          </div>

          {/* Active Venue Details Banner */}
          <div className="px-5 py-3 flex items-start justify-between gap-3 bg-white">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900">{venue.name}</h4>
                {venue.isDefault ? (
                  <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    ⭐ Địa điểm chính (Mặc định)
                  </span>
                ) : onSetDefaultVenue ? (
                  <button
                    type="button"
                    onClick={() => onSetDefaultVenue(venue.id)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                  >
                    <Star className="h-3 w-3" />
                    <span>Đặt làm địa điểm chính</span>
                  </button>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 truncate" title={venue.locationAddress}>
                {venue.locationAddress || 'Chưa có địa chỉ chi tiết'}
              </p>
            </div>

            {onRequestEditVenue && (
              <button
                type="button"
                onClick={() => onRequestEditVenue(venue)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-600 py-1 px-2 rounded-md hover:bg-slate-100 transition-colors shrink-0"
                title="Chỉnh sửa tên & địa chỉ"
              >
                <Pencil className="h-3 w-3" />
                <span>Sửa</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Quick Batch Creator */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Tạo nhanh hàng loạt sân
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Hệ thống sẽ tự động sinh danh sách sân theo số lượng và tiền tố đặt trước.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="w-full sm:w-28">
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Số lượng sân</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className="h-9 text-xs rounded-lg border-slate-300 bg-white"
                />
              </div>
              <div className="w-full sm:flex-1">
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tiền tố tên sân</label>
                <Input
                  type="text"
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value)}
                  placeholder="VD: Sân, Court, Bàn..."
                  className="h-9 text-xs rounded-lg border-slate-300 bg-white"
                />
              </div>
              <div className="w-full sm:w-auto pt-4 sm:pt-0 sm:self-end">
                <Button
                  type="button"
                  onClick={handleBatchCreate}
                  disabled={isBatchAdding || batchCount < 1}
                  className="w-full sm:w-auto h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 rounded-lg shadow-xs"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {isBatchAdding ? 'Đang tạo...' : `Tạo nhanh ${batchCount} sân`}
                </Button>
              </div>
            </div>
          </div>

          {/* Add Single Custom Court */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2.5">
              <Plus className="h-3.5 w-3.5 text-slate-600" />
              Thêm sân lẻ tùy chỉnh
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={singleCourtName}
                onChange={(e) => setSingleCourtName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleSingleAdd();
                  }
                }}
                placeholder="VD: Sân VIP 1, Sân Trung Tâm..."
                className="h-9 text-xs rounded-lg border-slate-300 flex-1"
              />
              <Button
                type="button"
                onClick={handleSingleAdd}
                disabled={isAddingSingle || !singleCourtName.trim()}
                className="h-9 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 rounded-lg shadow-xs"
              >
                {isAddingSingle ? 'Đang thêm...' : 'Thêm sân'}
              </Button>
            </div>
          </div>

          {/* Court List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Danh sách sân hiện có ({courts.length})
                </h4>
              </div>
            </div>

            {courts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center bg-slate-50">
                <p className="text-xs font-semibold text-slate-600">Chưa có sân nào trong địa điểm này</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sử dụng công cụ tạo nhanh ở trên để thêm sân cho địa điểm.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {courts.map((court, index) => (
                  <div
                    key={court.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 truncate">{court.courtName}</p>
                      <p className="text-[10px] text-slate-400">#{(index + 1).toString().padStart(2, '0')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCourt(court.id)}
                      disabled={deletingCourtId === court.id}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Xóa sân này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 px-5 py-3.5 bg-slate-50">
          <Button
            type="button"
            onClick={onClose}
            className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 rounded-lg shadow-xs"
          >
            Hoàn tất
          </Button>
        </div>
      </div>
    </div>
  );
}
