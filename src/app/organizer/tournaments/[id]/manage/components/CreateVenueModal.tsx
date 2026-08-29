'use client';

import React, { useState } from 'react';
import { MapPin, Plus, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Region } from '@/features/regions/api';
import { useAutoAddressParser } from '@/utils/vietnamAddressParser';

interface CreateVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  provinces: Region[];
  wards: Region[];
  setWards?: (wards: Region[]) => void;
  onCreateVenue: (data: {
    name: string;
    locationAddress: string;
    isDefault?: boolean;
    initialCourtCount?: number;
    courtPrefix?: string;
  }) => Promise<void>;
}

export function CreateVenueModal({
  isOpen,
  onClose,
  provinces,
  wards,
  setWards,
  onCreateVenue,
}: CreateVenueModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [provinceCode, setProvinceCode] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [initialCourtCount, setInitialCourtCount] = useState(4);
  const [courtPrefix, setCourtPrefix] = useState('Sân');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const autoDetectedAddress = useAutoAddressParser({
    addressValue: address,
    provinces,
    wards,
    onSelectProvince: setProvinceCode,
    onSelectWard: setWardCode,
    onWardsLoaded: (loadedWards) => setWards?.(loadedWards),
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const pName = provinces.find((p) => p.code === provinceCode)?.name || '';
    const wName = wards.find((w) => w.code === wardCode)?.name || '';
    const fullAddress = [address.trim(), wName, pName].filter(Boolean).join(', ') || address.trim();

    setIsSubmitting(true);
    try {
      await onCreateVenue({
        name: name.trim(),
        locationAddress: fullAddress,
        isDefault,
        initialCourtCount: initialCourtCount > 0 ? initialCourtCount : undefined,
        courtPrefix: courtPrefix.trim() || 'Sân',
      });
      setName('');
      setAddress('');
      setProvinceCode('');
      setWardCode('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Thêm địa điểm thi đấu</h3>
              <p className="text-xs text-slate-500">Tạo thêm cụm sân hoặc địa điểm tổ chức thi đấu</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Venue Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tên địa điểm / Tên CLB <span className="text-rose-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: CLB Cầu Lông Kỳ Hòa, Sân Pickleball Hồ Bơi..."
              className="h-10 text-xs rounded-lg border-slate-300"
              required
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Địa chỉ chi tiết <span className="text-rose-500">*</span>
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="VD: 123 Lê Lợi, Phường Bến Nghé, Quận 1..."
              className="h-10 text-xs rounded-lg border-slate-300"
              required
            />
            {autoDetectedAddress && (
              <p className="mt-1 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                <Sparkles className="h-3 w-3" />
                Tự động nhận diện: {autoDetectedAddress}
              </p>
            )}
          </div>

          {/* Provinces / Wards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Tỉnh / Thành phố
              </label>
              <select
                value={provinceCode}
                onChange={(e) => {
                  setProvinceCode(e.target.value);
                  setWardCode('');
                }}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">-- Chọn Tỉnh / Thành phố --</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Phường / Xã
              </label>
              <select
                value={wardCode}
                onChange={(e) => setWardCode(e.target.value)}
                disabled={!provinceCode || wards.length === 0}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">-- Chọn Phường / Xã --</option>
                {wards.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Initial Courts Generator */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Khởi tạo danh sách sân ban đầu
              </span>
              <span className="text-[11px] text-slate-500">Tùy chọn</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Số lượng sân</label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={initialCourtCount}
                  onChange={(e) => setInitialCourtCount(Number(e.target.value))}
                  className="h-9 text-xs rounded-lg border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Tiền tố tên sân</label>
                <Input
                  type="text"
                  value={courtPrefix}
                  onChange={(e) => setCourtPrefix(e.target.value)}
                  placeholder="VD: Sân, Court..."
                  className="h-9 text-xs rounded-lg border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Default venue checkbox */}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Đặt làm địa điểm thi đấu chính (mặc định)</span>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 text-xs font-semibold text-slate-700 rounded-lg border-slate-300 hover:bg-slate-50"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="h-9 px-5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {isSubmitting ? 'Đang tạo...' : 'Tạo địa điểm'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
