'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { RefreshCw, Plus, Trash2, Upload, Loader2, Info } from 'lucide-react';
import { Division } from '@/features/tournaments/api';
import { Tournament } from '@/types/tournament';
import { parseParticipantsExcel } from '@/utils/exportTournament';
import toast from 'react-hot-toast';

interface MockDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  divisions: Division[];
  selectedDivisionId: string;
  setSelectedDivisionId: (id: string) => void;
  mockNamesText: string;
  setMockNamesText: (val: string) => void;
  isSeedingMock: boolean;
  isClearingMock: boolean;
  handleSeedMockData: () => void;
  handleClearMockData: () => void;
}

export function MockDataModal({
  isOpen,
  onClose,
  tournament,
  divisions,
  selectedDivisionId,
  setSelectedDivisionId,
  mockNamesText,
  setMockNamesText,
  isSeedingMock,
  isClearingMock,
  handleSeedMockData,
  handleClearMockData,
}: MockDataModalProps) {
  const registrationTranslate = useTranslations('OrganizerRegistration');
  const commonTranslate = useTranslations('Common');

  const selectedMockDivision = divisions.find((division) => division.id === selectedDivisionId);
  const canSeedMock = divisions.length === 0 || Boolean(selectedMockDivision);

  return (
    <Modal open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <ModalContent className="max-w-lg bg-white p-0 overflow-hidden shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
          <div>
            <ModalHeader>
              <ModalTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-600 animate-none" />
                {registrationTranslate('mockDataTitle')}
              </ModalTitle>
            </ModalHeader>
            <p className="text-xs text-slate-500 mt-1">
              {registrationTranslate('mockDataDescription')}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Tính năng này <strong>chỉ phục vụ thử nghiệm</strong> tạo nhánh, xếp lịch và bốc thăm. VĐV ảo có thể được dọn dẹp bất kỳ lúc nào mà không ảnh hưởng tới người đăng ký thật.
            </p>
          </div>

          {/* Division Selector if tournament has multiple divisions */}
          {divisions.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {registrationTranslate('selectedDivisionLabel')}
              </label>
              <select
                value={selectedDivisionId}
                onChange={(e) => setSelectedDivisionId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {divisions.map((div) => (
                  <option key={div.id} value={div.id}>
                    {div.name} ({div.matchType === 'SINGLES' ? registrationTranslate('singlesMockBadge') : registrationTranslate('doublesMockBadge')})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Division format badge info */}
          <div
            className={`rounded-lg border px-3 py-2 text-xs ${
              canSeedMock
                ? 'border-blue-100 bg-blue-50/50 text-blue-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            <span className="font-semibold">{registrationTranslate('selectedDivisionLabel')}: </span>
            {selectedMockDivision ? (
              <>
                <strong>{selectedMockDivision.name}</strong>
                <span
                  className={`ml-1.5 font-bold px-1.5 py-0.5 rounded text-[10px] ${
                    selectedMockDivision.matchType === 'SINGLES'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedMockDivision.matchType === 'SINGLES'
                    ? registrationTranslate('singlesMockBadge')
                    : registrationTranslate('doublesMockBadge')}
                </span>
              </>
            ) : divisions.length > 0 ? (
              <span className="font-bold text-amber-700">{registrationTranslate('selectDivisionWarning')}</span>
            ) : (
              <span className="font-semibold">
                {registrationTranslate('generalFormat', {
                  format: tournament.matchType === 'SINGLES' ? registrationTranslate('singlesShort') : registrationTranslate('doublesShort'),
                })}
              </span>
            )}
          </div>

          {/* Virtual Athletes input textarea */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {registrationTranslate('virtualAthletesLabel')}
              </label>
              <label className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition-colors">
                <Upload className="w-3 h-3" />
                {registrationTranslate('loadFromExcel')}
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  disabled={!canSeedMock || isSeedingMock || isClearingMock}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const res = await parseParticipantsExcel(file);
                      const p1Col = res.detectedMapping.player1NameCol || res.headers[0];
                      const names = res.rows
                        .map((r) => {
                          const p1 = r[p1Col];
                          const p2 = res.detectedMapping.player2NameCol ? r[res.detectedMapping.player2NameCol] : '';
                          if (p1 && p2) return `${p1}\n${p2}`;
                          return p1 ? String(p1) : '';
                        })
                        .filter(Boolean)
                        .join('\n');
                      setMockNamesText(names);
                      toast.success(registrationTranslate('loadedAthletes', { count: res.rows.length }));
                    } catch {
                      toast.error(registrationTranslate('readFileError', { message: commonTranslate('tryAgainLater') }));
                    }
                  }}
                />
              </label>
            </div>
            <Textarea
              value={mockNamesText}
              onChange={(e) => setMockNamesText(e.target.value)}
              placeholder={registrationTranslate('bulkParticipantsPlaceholder')}
              className="h-32 text-xs resize-none font-semibold text-slate-700 leading-relaxed"
              disabled={!canSeedMock || isSeedingMock || isClearingMock}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
          <Button
            variant="outline"
            onClick={handleClearMockData}
            disabled={!canSeedMock || isSeedingMock || isClearingMock}
            className="border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs py-2 flex items-center gap-1.5"
          >
            {isClearingMock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {registrationTranslate('clearData')}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold"
            >
              {commonTranslate('cancel') || 'Đóng'}
            </Button>
            <Button
              onClick={async () => {
                await handleSeedMockData();
                onClose();
              }}
              disabled={!canSeedMock || isSeedingMock || isClearingMock || !mockNamesText.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm"
            >
              {isSeedingMock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {registrationTranslate('generateVirtualAthletes')}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
