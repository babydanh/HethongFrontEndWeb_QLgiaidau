'use client';

import React, { useState } from 'react';
import { Calendar, MapPin, Plus, Settings, Star, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { DateTimePicker } from '@/components/ui/Input';
import { Tournament, BracketStage } from '@/types/tournament';
import { Region } from '@/features/regions/api';
import { TournamentVenueWithCourts } from '@/features/tournaments/api';
import { VenueCourtsModal } from './VenueCourtsModal';
import { CreateVenueModal } from './CreateVenueModal';

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
  tournamentVenues?: TournamentVenueWithCourts[];
  handleCreateTournamentVenue?: (data: {
    name: string;
    locationAddress: string;
    isDefault?: boolean;
    initialCourtCount?: number;
    courtPrefix?: string;
  }) => Promise<void>;
  handleSetDefaultTournamentVenue?: (venueId: string) => Promise<void>;
  handleDeleteTournamentVenue?: (venueId: string) => Promise<void>;
  handleAddVenueCourtDirect?: (venueId: string, courtName: string) => Promise<void>;
  handleAddVenueCourtsBatchDirect?: (venueId: string, count: number, prefix?: string) => Promise<void>;
  handleRemoveVenueCourtDirect?: (venueId: string, courtId: string) => Promise<void>;
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
  tournament: _tournament,
  bracket: _bracket,
  venues: _venues,
  tournamentVenues = [],
  handleCreateTournamentVenue,
  handleSetDefaultTournamentVenue,
  handleDeleteTournamentVenue,
  handleAddVenueCourtDirect,
  handleAddVenueCourtsBatchDirect,
  handleRemoveVenueCourtDirect,
  customVenueName,
  customVenueAddress,
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
  const t = useTranslations('OrganizerManage');
  void _tournament;
  void _bracket;
  void _venues;

  // Modals state
  const [selectedVenueForCourts, setSelectedVenueForCourts] = useState<TournamentVenueWithCourts | null>(null);
  const [isCreateVenueOpen, setIsCreateVenueOpen] = useState(false);

  // Derive fallback venue if tournamentVenues is empty but customVenueName is available
  const displayVenues: TournamentVenueWithCourts[] =
    tournamentVenues.length > 0
      ? tournamentVenues
      : customVenueName
      ? [
          {
            id: _tournament?.venueId || 'default-venue',
            name: customVenueName,
            locationAddress: customVenueAddress || 'Chưa có địa chỉ chi tiết',
            isDefault: true,
            courts: [],
          },
        ]
      : [];

  // Update selected venue reference when tournamentVenues change
  const activeModalVenue = selectedVenueForCourts
    ? displayVenues.find((v) => v.id === selectedVenueForCourts.id) || selectedVenueForCourts
    : null;

  return (
    <div className="space-y-6">
      {/* 1. Schedule Timing Section */}
      <section
        className="border border-slate-200 bg-white p-5 md:p-6 rounded-2xl shadow-xs"
        aria-labelledby="schedule-timing-title"
      >
        <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 id="schedule-timing-title" className="text-lg font-bold text-slate-900">
              Thời gian tổ chức giải
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Thiết lập ngày khai mạc và bế mạc của toàn bộ giải đấu
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <DateTimePicker label={t('openingDate')} value={startDate} onChange={setStartDate} />
          <DateTimePicker label={t('closingDate')} value={endDate} onChange={setEndDate} />
        </div>
        {validationField === 'dates' && (
          <p className="mt-2 text-xs font-semibold text-rose-600">{t('datesInvalid')}</p>
        )}
      </section>

      {/* 2. Venues & Courts Management Section */}
      <section
        className="border border-slate-200 bg-white p-5 md:p-6 rounded-2xl shadow-xs"
        aria-labelledby="venues-title"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="venues-title" className="text-lg font-bold text-slate-900">
                  Địa điểm & Cụm sân thi đấu
                </h2>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-extrabold text-blue-700">
                  {displayVenues.length} địa điểm
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Một giải đấu có thể có nhiều địa điểm thi đấu. Bấm vào địa điểm để cài đặt số lượng sân.
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => setIsCreateVenueOpen(true)}
            className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 rounded-xl shadow-xs shrink-0"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Thêm địa điểm mới
          </Button>
        </div>

        {/* Venues Grid Cards */}
        <div className="mt-5">
          {displayVenues.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
              <MapPin className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-700">Chưa có địa điểm thi đấu nào</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Hãy bấm &quot;Thêm địa điểm mới&quot; để thiết lập địa điểm và danh sách sân cho giải.
              </p>
              <Button
                type="button"
                onClick={() => setIsCreateVenueOpen(true)}
                className="mt-4 h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 rounded-lg"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Thêm địa điểm ngay
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {displayVenues.map((venue) => {
                const courtCount = venue.courts?.length ?? 0;
                return (
                  <div
                    key={venue.id}
                    className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all shadow-xs hover:shadow-md ${
                      venue.isDefault
                        ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/40 via-white to-white ring-1 ring-emerald-400/30'
                        : 'border-slate-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-extrabold text-slate-900 text-base truncate">
                              {venue.name}
                            </h3>
                            {venue.isDefault && (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 shrink-0">
                                ⭐ Mặc định
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {venue.locationAddress || 'Chưa có địa chỉ chi tiết'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-100">
                          {courtCount > 0 ? `${courtCount} sân thi đấu` : 'Chưa có sân'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
                      {!venue.isDefault && handleSetDefaultTournamentVenue && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultTournamentVenue(venue.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
                          title="Đặt địa điểm này làm địa điểm mặc định của giải"
                        >
                          <Star className="h-3.5 w-3.5 text-amber-500" />
                          Đặt mặc định
                        </button>
                      )}

                      {venue.isDefault && (
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                          ⭐ Sân chính của giải
                        </span>
                      )}

                      <div className="flex items-center gap-1.5 ml-auto">
                        <Button
                          type="button"
                          onClick={() => setSelectedVenueForCourts(venue)}
                          className="h-8 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 rounded-lg flex items-center gap-1.5"
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Cài đặt sân ({courtCount})
                        </Button>

                        {displayVenues.length > 1 && handleDeleteTournamentVenue && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa địa điểm "${venue.name}" khỏi giải?`)) {
                                void handleDeleteTournamentVenue(venue.id);
                              }
                            }}
                            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                            title="Xóa địa điểm này"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end border-t border-slate-200 pt-4">
        <Button
          onClick={handleSaveScheduleDetails}
          disabled={isSavingConfig}
          className="min-h-11 bg-blue-600 px-6 font-bold text-white hover:bg-blue-700 rounded-xl"
        >
          {isSavingConfig ? t('savingSchedule') : t('saveSchedule')}
        </Button>
      </div>

      {/* Modal Cài đặt Sân của Địa điểm */}
      <VenueCourtsModal
        isOpen={Boolean(activeModalVenue)}
        onClose={() => setSelectedVenueForCourts(null)}
        venue={activeModalVenue}
        onAddCourt={async (venueId, name) => {
          if (handleAddVenueCourtDirect) {
            await handleAddVenueCourtDirect(venueId, name);
          }
        }}
        onBatchAddCourts={async (venueId, count, prefix) => {
          if (handleAddVenueCourtsBatchDirect) {
            await handleAddVenueCourtsBatchDirect(venueId, count, prefix);
          }
        }}
        onRemoveCourt={async (venueId, courtId) => {
          if (handleRemoveVenueCourtDirect) {
            await handleRemoveVenueCourtDirect(venueId, courtId);
          }
        }}
        onSetDefaultVenue={async (venueId) => {
          if (handleSetDefaultTournamentVenue) {
            await handleSetDefaultTournamentVenue(venueId);
          }
        }}
      />

      {/* Modal Thêm Địa Điểm Mới */}
      <CreateVenueModal
        isOpen={isCreateVenueOpen}
        onClose={() => setIsCreateVenueOpen(false)}
        provinces={provinces}
        wards={wards}
        setWards={setWards}
        onCreateVenue={async (data) => {
          if (handleCreateTournamentVenue) {
            await handleCreateTournamentVenue(data);
          }
        }}
      />
    </div>
  );
}
