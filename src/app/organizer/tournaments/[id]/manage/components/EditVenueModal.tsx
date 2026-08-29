'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Region, regionsApi } from '@/features/regions/api';
import { TournamentVenueWithCourts } from '@/features/tournaments/api';

interface EditVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: TournamentVenueWithCourts | null;
  provinces?: Region[];
  wards?: Region[];
  setWards?: (wards: Region[]) => void;
  onUpdateVenue: (venueId: string, data: { name?: string; locationAddress?: string }) => Promise<void>;
}

export function EditVenueModal({
  isOpen,
  onClose,
  venue,
  provinces = [],
  wards = [],
  setWards,
  onUpdateVenue,
}: EditVenueModalProps) {
  const [name, setName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const [selectedWardCode, setSelectedWardCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (venue) {
      setName(venue.name || '');
      setStreetAddress(venue.locationAddress || '');
      setErrorMessage('');
    }
  }, [venue]);

  const handleProvinceChange = async (provCode: string) => {
    setSelectedProvinceCode(provCode);
    setSelectedWardCode('');
    if (!provCode) {
      if (setWards) setWards([]);
      return;
    }
    try {
      const res = await regionsApi.getWardsByProvince(provCode);
      if (Array.isArray(res) && setWards) {
        setWards(res);
      }
    } catch {
      // Keep empty wards
    }
  };

  if (!isOpen || !venue) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên địa điểm thi đấu');
      return;
    }
    if (!streetAddress.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ chi tiết');
      return;
    }

    let finalAddress = streetAddress.trim();
    const provinceObj = provinces.find((p) => p.code === selectedProvinceCode);
    const wardObj = wards.find((w) => w.code === selectedWardCode);

    if (wardObj && provinceObj && !finalAddress.includes(provinceObj.name)) {
      finalAddress = `${finalAddress}, ${wardObj.name}, ${provinceObj.name}`;
    } else if (provinceObj && !finalAddress.includes(provinceObj.name)) {
      finalAddress = `${finalAddress}, ${provinceObj.name}`;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onUpdateVenue(venue.id, {
        name: name.trim(),
        locationAddress: finalAddress,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật địa điểm';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Chỉnh sửa địa điểm</h3>
              <p className="text-xs text-slate-500">Cập nhật tên và địa chỉ của địa điểm thi đấu</p>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tên địa điểm thi đấu <span className="text-rose-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Sân Cầu Lông Kỳ Hòa, Cụm Sân Pickleball..."
              className="h-10 text-xs rounded-lg border-slate-300"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Địa chỉ chi tiết <span className="text-rose-500">*</span>
            </label>
            <Input
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder="VD: Số 123 Đường Sư Vạn Hạnh, Phường 12..."
              className="h-10 text-xs rounded-lg border-slate-300"
              required
            />
          </div>

          {provinces.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tỉnh / Thành phố
                </label>
                <select
                  value={selectedProvinceCode}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">-- Chọn Tỉnh / Thành phố --</option>
                  {provinces.map((prov) => (
                    <option key={prov.code} value={prov.code}>
                      {prov.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Phường / Xã
                </label>
                <select
                  value={selectedWardCode}
                  onChange={(e) => setSelectedWardCode(e.target.value)}
                  disabled={!selectedProvinceCode || wards.length === 0}
                  className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">-- Chọn Phường / Xã --</option>
                  {wards.map((ward) => (
                    <option key={ward.code} value={ward.code}>
                      {ward.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
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
              disabled={isSubmitting}
              className="h-9 px-5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
