'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, DateTimePicker } from '@/components/ui/Input';
import { Tournament, BracketStage } from '@/types/tournament';
import { Region } from '@/features/regions/api';

interface Venue {
  id: string;
  name: string;
  locationAddress: string;
}

interface ScheduleTabProps {
  tournament: Tournament;
  bracket: { stages: BracketStage[] } | null;
  venues: Venue[];
  customVenueName: string;
  setCustomVenueName: (val: string) => void;
  customVenueAddress: string;
  setCustomVenueAddress: (val: string) => void;
  provinceCode: string;
  setProvinceCode: (val: string) => void;
  districtCode: string;
  setDistrictCode: (val: string) => void;
  wardCode: string;
  setWardCode: (val: string) => void;
  provinces: Region[];
  districts: Region[];
  wards: Region[];
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  isSavingConfig: boolean;
  handleSaveScheduleDetails: () => void;
}

export function ScheduleTab({
  tournament,
  bracket,
  venues,
  customVenueName,
  setCustomVenueName,
  customVenueAddress,
  setCustomVenueAddress,
  provinceCode,
  setProvinceCode,
  districtCode,
  setDistrictCode,
  wardCode,
  setWardCode,
  provinces,
  districts,
  wards,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  isSavingConfig,
  handleSaveScheduleDetails,
}: ScheduleTabProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
      <h2 className="text-xl font-bold text-slate-900 border-b pb-2 mb-4">Lịch thi đấu & Địa điểm</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-3.5 bg-slate-50 border p-5 rounded-2xl">
          <h4 className="font-bold text-slate-800 text-sm border-b pb-2 mb-1">Địa điểm thi đấu</h4>
          
          <Input
            label="Tên sân / Địa điểm thi đấu"
            placeholder="Ví dụ: Sân Cầu Lông Sunrise"
            value={customVenueName}
            onChange={(e) => setCustomVenueName(e.target.value)}
          />

          <Input
            label="Địa chỉ chi tiết"
            placeholder="Số 12, Đường hoa mai..."
            value={customVenueAddress}
            onChange={(e) => setCustomVenueAddress(e.target.value)}
          />

          <div className="grid grid-cols-3 gap-2">
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
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quận / Huyện</label>
              <select
                value={districtCode}
                onChange={(e) => setDistrictCode(e.target.value)}
                disabled={!provinceCode}
                className="border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs h-9 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Chọn Quận/Huyện</option>
                {districts.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phường / Xã</label>
              <select
                value={wardCode}
                onChange={(e) => setWardCode(e.target.value)}
                disabled={!districtCode}
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

        <div className="flex flex-col gap-3.5 bg-slate-50 border p-5 rounded-2xl">
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
