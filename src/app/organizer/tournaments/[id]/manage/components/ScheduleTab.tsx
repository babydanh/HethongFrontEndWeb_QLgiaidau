'use client';

import React from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, DateTimePicker } from '@/components/ui/Input';
import { Tournament, BracketStage } from '@/types/tournament';
import { Region } from '@/features/regions/api';
import { useAutoAddressParser } from '@/utils/vietnamAddressParser';

interface Venue {
  id: string;
  name: string;
  locationAddress: string;
}

interface ScheduleTabProps {
  validationField?: string | null;
  tournament: Tournament;
  bracket: { stages: BracketStage[] } | null;
  venues: Venue[];
  customVenueName: string;
  setCustomVenueName: (val: string) => void;
  customVenueAddress: string;
  setCustomVenueAddress: (val: string) => void;
  provinceCode: string;
  setProvinceCode: (val: string) => void;
  wardCode: string;
  setWardCode: (val: string) => void;
  provinces: Region[];
  wards: Region[];
  setWards?: (wards: Region[]) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  isSavingConfig: boolean;
  handleSaveScheduleDetails: () => void;
}

export function ScheduleTab({
  validationField,
  tournament,
  bracket,
  venues,
  customVenueName,
  setCustomVenueName,
  customVenueAddress,
  setCustomVenueAddress,
  provinceCode,
  setProvinceCode,
  wardCode,
  setWardCode,
  provinces,
  wards,
  setWards,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  isSavingConfig,
  handleSaveScheduleDetails,
}: ScheduleTabProps) {
  const autoDetectedAddress = useAutoAddressParser({
    addressValue: customVenueAddress,
    provinces,
    wards,
    onSelectProvince: (pCode) => setProvinceCode(pCode),
    onSelectWard: (wCode) => setWardCode(wCode),
    onWardsLoaded: (loadedWards) => {
      if (setWards) setWards(loadedWards);
    },
  });

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
      <h2 className="text-xl font-bold text-slate-900 border-b pb-2 mb-4">Lịch thi đấu & Địa điểm</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-3.5 bg-slate-50 border p-5 rounded-lg">
          <h4 className="font-bold text-slate-800 text-sm border-b pb-2 mb-1">Địa điểm thi đấu</h4>
          
          <Input
            label="Tên sân / Địa điểm thi đấu"
            placeholder="Ví dụ: Sân Cầu Lông Sunrise"
            value={customVenueName}
            onChange={(e) => setCustomVenueName(e.target.value)}
          />
          {validationField === 'venue' && <p className="text-xs font-semibold text-rose-600">Vui lòng nhập tên sân và địa chỉ đầy đủ.</p>}

          <div>
            <Input
              label="Địa chỉ chi tiết"
              placeholder="Số 12, Đường hoa mai..."
              value={customVenueAddress}
              onChange={(e) => setCustomVenueAddress(e.target.value)}
            />
            {autoDetectedAddress.isMatched && autoDetectedAddress.province && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-blue-600 font-medium animate-fadeIn">
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                <span>
                  Đã tự nhận diện: <strong>{autoDetectedAddress.province.fullName || autoDetectedAddress.province.name}</strong>
                  {autoDetectedAddress.ward ? ` > ${autoDetectedAddress.ward.fullName || autoDetectedAddress.ward.name}` : ''}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tỉnh / Thành</label>
              <select
                value={provinceCode}
                onChange={(e) => setProvinceCode(e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs h-9"
              >
                <option value="">Chọn Tỉnh/Thành</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phường / Xã</label>
              <select
                value={wardCode}
                onChange={(e) => setWardCode(e.target.value)}
                disabled={!provinceCode}
                className="border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs h-9 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Chọn Phường/Xã</option>
                {wards.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 bg-slate-50 border p-5 rounded-lg">
          <h4 className="font-bold text-slate-800 text-sm border-b pb-2 mb-1">Thời gian thi đấu</h4>
          
          <DateTimePicker
            label="Khai mạc (Ngày bắt đầu)"
            value={startDate}
            onChange={setStartDate}
          />

          <DateTimePicker
            label="Bế mạc (Ngày kết thúc)"
            value={endDate}
            onChange={setEndDate}
          />
          {validationField === 'dates' && <p className="text-xs font-semibold text-rose-600">Vui lòng kiểm tra ngày giờ đăng ký và thi đấu.</p>}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={handleSaveScheduleDetails}
          disabled={isSavingConfig}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
        >
          {isSavingConfig ? 'Đang lưu...' : 'Lưu lịch trình'}
        </Button>
      </div>
    </div>
  );
}
