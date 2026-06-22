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
  registrationStartDate: string;
  setRegistrationStartDate: (val: string) => void;
  registrationEndDate: string;
  setRegistrationEndDate: (val: string) => void;
  isSavingConfig: boolean;
  handleSaveScheduleDetails: () => void;
  handleOpenStageModal: (stage: BracketStage) => void;
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
  registrationStartDate,
  setRegistrationStartDate,
  registrationEndDate,
  setRegistrationEndDate,
  isSavingConfig,
  handleSaveScheduleDetails,
  handleOpenStageModal,
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
            className="bg-white"
          />
          
          <Input
            label="Địa chỉ chi tiết (Số nhà, Tên đường)"
            placeholder="Ví dụ: 123 Đường Nguyễn Văn Linh"
            value={customVenueAddress}
            onChange={(e) => setCustomVenueAddress(e.target.value)}
            className="bg-white"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Tỉnh / Thành phố *</label>
            <select
              value={provinceCode}
              onChange={(e) => {
                setProvinceCode(e.target.value);
                setDistrictCode('');
                setWardCode('');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-11"
            >
              <option value="">-- Tỉnh/Thành phố --</option>
              {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Quận / Huyện</label>
              <select
                value={districtCode}
                onChange={(e) => {
                  setDistrictCode(e.target.value);
                  setWardCode('');
                }}
                disabled={!provinceCode}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 h-11"
              >
                <option value="">-- Quận/Huyện --</option>
                {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Phường / Xã</label>
              <select
                value={wardCode}
                onChange={(e) => setWardCode(e.target.value)}
                disabled={!districtCode}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 h-11"
              >
                <option value="">-- Phường/Xã --</option>
                {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <DateTimePicker
            label="Ngày khai mạc giải đấu"
            value={startDate}
            onChange={setStartDate}
          />
          <DateTimePicker
            label="Ngày bế mạc / kết thúc giải đấu"
            value={endDate}
            onChange={setEndDate}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t pt-4">
        <DateTimePicker
          label="Ngày mở đăng ký"
          value={registrationStartDate}
          onChange={setRegistrationStartDate}
        />
        <DateTimePicker
          label="Hạn chót đăng ký"
          value={registrationEndDate}
          onChange={setRegistrationEndDate}
        />
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

      {/* Stage-specific schedule editor */}
      {bracket && bracket.stages && bracket.stages.length > 0 ? (
        <div className="mt-8 border-t pt-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">Chi tiết lịch & địa điểm từng vòng đấu</h3>
            <p className="text-xs text-slate-400 font-semibold">Tùy biến lịch đấu và địa điểm riêng cho các vòng đặc biệt (như Bán kết/Chung kết).</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-650 font-bold border-b">
                <tr>
                  <th className="p-3.5">Vòng đấu</th>
                  <th className="p-3.5">Ngày dự kiến</th>
                  <th className="p-3.5">Địa điểm riêng</th>
                  <th className="p-3.5">Thông báo riêng</th>
                  <th className="p-3.5 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {bracket.stages.map((stage) => (
                  <tr key={stage.id} className="hover:bg-slate-50/40">
                    <td className="p-3.5 font-bold">{stage.name}</td>
                    <td className="p-3.5 text-xs font-semibold">
                      {stage.scheduledDate ? new Date(stage.scheduledDate).toLocaleDateString('vi-VN') : 'Kế thừa giải đấu'}
                    </td>
                    <td className="p-3.5 text-xs font-semibold">
                      {venues.find(v => v.id === stage.venueId)?.name || 'Kế thừa giải đấu'}
                    </td>
                    <td className="p-3.5 text-xs text-slate-500 italic truncate max-w-[150px]">
                      {stage.notificationNote || 'Không có'}
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenStageModal(stage)}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 font-bold text-xs"
                      >
                        Sửa đổi
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-8 border-t pt-6 text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed flex flex-col items-center">
          <Calendar className="w-8 h-8 text-slate-300 mb-2" />
          <p className="font-semibold text-xs leading-relaxed max-w-sm">
            Hãy chốt danh sách VĐV ở tab <strong>Đăng ký & Chốt DS</strong> để sinh các Stage vòng đấu, sau đó bạn có thể cấu hình chi tiết lịch trình cho từng vòng đấu.
          </p>
        </div>
      )}
    </div>
  );
}
