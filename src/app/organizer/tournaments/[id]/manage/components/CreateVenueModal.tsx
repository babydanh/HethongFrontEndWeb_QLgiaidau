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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-5 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Thêm địa điểm thi đấu mới</h3>
              <p className="text-xs text-slate-500">Tạo thêm cụm sân hoặc địa điểm tổ chức thi đấu</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Input
            label="Tên địa điểm / Cụm sân"
            placeholder="Ví dụ: CLB Pickleball Rạch Miễu, Sân Kỳ Hòa..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Địa chỉ chi tiết (Số nhà, tên đường)"
            placeholder="Ví dụ: 1 Hoa Phượng, Phường 2..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          {autoDetectedAddress.isMatched && autoDetectedAddress.province && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {autoDetectedAddress.province.fullName || autoDetectedAddress.province.name}
                {autoDetectedAddress.ward ? ` · ${autoDetectedAddress.ward.fullName || autoDetectedAddress.ward.name}` : ''}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tỉnh / Thành phố</label>
              <select
                value={provinceCode}
                onChange={(e) => setProvinceCode(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Chọn Tỉnh / TP</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phường / Xã</label>
              <select
                value={wardCode}
                onChange={(e) => setWardCode(e.target.value)}
                disabled={!provinceCode}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Chọn Phường / Xã</option>
                {wards.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick courts count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Khởi tạo nhanh số sân</label>
              <input
                type="number"
                min={0}
                max={50}
                value={initialCourtCount}
                onChange={(e) => setInitialCourtCount(Math.max(0, Number(e.target.value) || 0))}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tiền tố tên sân</label>
              <input
                type="text"
                value={courtPrefix}
                onChange={(e) => setCourtPrefix(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-bold text-slate-800">
              Đặt làm địa điểm chính mặc định (⭐ Default Venue)
            </span>
          </label>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 text-xs font-bold px-4"
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5"
            >
              <Plus className="mr-1 h-4 w-4" />
              {isSubmitting ? 'Đang tạo...' : 'Tạo địa điểm'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
