'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Settings } from 'lucide-react';
import { Tournament, BracketStage, BracketMatch } from '@/types/tournament';
import PublicBracketTab from '@/app/(public)/tournaments/[id]/components/BracketTab';

interface BracketTabProps {
  tournament: Tournament;
  bracket: { stages: BracketStage[] } | null;
  selectedDivisionId: string;
  participants: unknown[];
  isGeneratingBracket: boolean;
  handleGenerateBracket: () => void;
  handleOpenScheduling: (match: BracketMatch) => void;
  handleOpenRoundModal?: (stage: BracketStage, roundNumber: number) => void;

  // Cấu hình mặc định props
  isLimitEnabled: boolean;
  setIsLimitEnabled: (val: boolean) => void;
  maxParticipants: number;
  setMaxParticipants: (val: number) => void;
  matchType: string;
  setMatchType: (val: string) => void;
  setsToWin: number;
  setSetsToWin: (val: number) => void;
  pointsPerSet: number;
  setPointsPerSet: (val: number) => void;
  winByTwo: boolean;
  setWinByTwo: (val: boolean) => void;
  maxDeucePoints: number;
  setMaxDeucePoints: (val: number) => void;
  superTiebreakEnabled: boolean;
  setSuperTiebreakEnabled: (val: boolean) => void;
  superTiebreakSetIndex: number;
  setSuperTiebreakSetIndex: (val: number) => void;
  superTiebreakPoints: number;
  setSuperTiebreakPoints: (val: number) => void;
  isSavingConfig: boolean;
  handleSaveMatchConfig: () => void;
}

export function BracketTab({
  tournament,
  bracket,
  selectedDivisionId,
  participants,
  isGeneratingBracket,
  handleGenerateBracket,
  handleOpenScheduling,
  handleOpenRoundModal,

  isLimitEnabled,
  setIsLimitEnabled,
  maxParticipants,
  setMaxParticipants,
  matchType,
  setMatchType,
  setsToWin,
  setSetsToWin,
  pointsPerSet,
  setPointsPerSet,
  winByTwo,
  setWinByTwo,
  maxDeucePoints,
  setMaxDeucePoints,
  superTiebreakEnabled,
  setSuperTiebreakEnabled,
  superTiebreakSetIndex,
  setSuperTiebreakSetIndex,
  superTiebreakPoints,
  setSuperTiebreakPoints,
  isSavingConfig,
  handleSaveMatchConfig,
}: BracketTabProps) {
  // Helper to extract bracket rounds from matches inside stage groups
  const getRoundsList = () => {
    if (!bracket || !bracket.stages) return [];
    
    return bracket.stages.flatMap(stage => {
      // Find all unique roundNumbers from all matches in all groups
      const matches = stage.groups?.flatMap(g => g.matches) || [];
      const matchRoundNumbers = matches.map(m => m.roundNumber);
      const maxRound = matchRoundNumbers.length > 0 ? Math.max(...matchRoundNumbers) : 0;
      
      return Array.from({ length: maxRound }, (_, idx) => {
        const roundNum = idx + 1;
        
        // Dynamic Round labels matching getRoundLabel in PublicBracketTab
        const getRoundLabelText = (ri: number, total: number) => {
          const fromEnd = total - 1 - ri;
          if (fromEnd === 0) return 'Chung kết';
          if (fromEnd === 1) return 'Bán kết';
          if (fromEnd === 2) return 'Tứ kết';
          if (fromEnd === 3) return 'Vòng 16';
          return `Vòng ${ri + 1}`;
        };
        
        const name = getRoundLabelText(idx, maxRound);
        // Find existing override settings in stage.roundConfig.rounds[roundNum]
        const roundOverride = stage.roundConfig?.rounds?.[roundNum.toString()];
        
        return {
          stage,
          roundNumber: roundNum,
          name,
          override: roundOverride
        };
      });
    });
  };

  const rounds = getRoundsList();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 2 Cấp độ Cấu hình bên trong tab Bracket */}
      {selectedDivisionId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cấp độ 1: Cấu hình mặc định của hình thức */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Cấu hình mặc định hình thức thi đấu
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-semibold">Cài đặt luật chơi mặc định và giới hạn cho tất cả các trận đấu thuộc hình thức này.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Thể loại thi đấu</label>
                <select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 font-bold"
                >
                  <option value="MALE_SINGLES">Đơn Nam</option>
                  <option value="FEMALE_SINGLES">Đơn Nữ</option>
                  <option value="MALE_DOUBLES">Đôi Nam</option>
                  <option value="FEMALE_DOUBLES">Đôi Nữ</option>
                  <option value="MIXED_DOUBLES">Đôi Nam Nữ</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Số Set chạm thắng</label>
                <select
                  value={setsToWin}
                  onChange={(e) => setSetsToWin(Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10 font-bold"
                >
                  <option value={1}>1 set</option>
                  <option value={2}>Thắng 2 set</option>
                  <option value={3}>Thắng 3 set</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
              <Input
                label="Điểm mỗi set"
                type="number"
                value={pointsPerSet}
                onChange={(e) => setPointsPerSet(Number(e.target.value))}
                className="h-10 text-sm font-bold"
              />
              
              <div className="flex items-center gap-2 h-10 pb-2">
                <input
                  type="checkbox"
                  id="winByTwo_bracket"
                  checked={winByTwo}
                  onChange={(e) => setWinByTwo(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
                />
                <label htmlFor="winByTwo_bracket" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                  Thắng cách biệt 2 điểm
                </label>
              </div>
            </div>

            {winByTwo && (
              <Input
                label="Điểm tối đa của set khi hòa 2 điểm"
                type="number"
                value={maxDeucePoints}
                onChange={(e) => setMaxDeucePoints(Number(e.target.value))}
                placeholder="Ví dụ: 30 (Chạm 30 thắng luôn không cần cách biệt 2)"
                className="h-10 text-sm font-bold"
              />
            )}

            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={superTiebreakEnabled}
                  onChange={(e) => setSuperTiebreakEnabled(e.target.checked)}
                  className="rounded text-blue-650 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-700">Set quyết định dùng siêu tie-break</span>
              </label>

              {superTiebreakEnabled && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <Input
                    label="Áp dụng ở set thứ"
                    type="number"
                    value={superTiebreakSetIndex}
                    onChange={(e) => setSuperTiebreakSetIndex(Number(e.target.value))}
                    className="bg-white h-9 text-xs"
                  />
                  <Input
                    label="Số điểm thắng siêu tie-break"
                    type="number"
                    value={superTiebreakPoints}
                    onChange={(e) => setSuperTiebreakPoints(Number(e.target.value))}
                    placeholder="Thường là 10 điểm"
                    className="bg-white h-9 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-650 uppercase tracking-wider">Giới hạn số đội đăng ký</label>
                <input
                  type="checkbox"
                  checked={isLimitEnabled}
                  onChange={(e) => setIsLimitEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </div>
              {isLimitEnabled ? (
                <Input
                  label="Số lượng đội tối đa"
                  type="number"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Number(e.target.value))}
                  className="bg-white text-sm h-9 font-bold"
                />
              ) : (
                <p className="text-xs font-semibold text-slate-400">Không giới hạn số lượng đăng ký tham gia.</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveMatchConfig}
                disabled={isSavingConfig}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 h-9 rounded-lg shadow-md shadow-blue-500/10"
              >
                {isSavingConfig ? 'Đang lưu...' : 'Lưu cấu hình mặc định'}
              </Button>
            </div>
          </div>

          {/* Cấp độ 2: Cài đặt chi tiết theo vòng đấu */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  Cấu hình theo vòng đấu
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-semibold">Cài đặt luật chơi ghi đè cho riêng từng vòng đấu (ví dụ: vòng ngoài đánh chạm 11, bán kết/chung kết đánh chạm 21).</p>
              </div>

              {rounds.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto pr-1 space-y-2.5">
                  {rounds.map(({ stage, roundNumber, name, override }) => {
                    return (
                      <div key={`${stage.id}-${roundNumber}`} className="pt-2.5 flex items-center justify-between gap-4 first:pt-0">
                        <div className="space-y-0.5">
                          <p className="text-sm font-extrabold text-slate-800">{name}</p>
                          <p className="text-[11px] text-slate-500 font-semibold">
                            {override ? (
                              `${override.sets_to_win === 1 ? 'Thắng 1 set' : override.sets_to_win === 2 ? 'Thắng 2 set' : 'Thắng 3 set'}, ${override.points_per_set || 21} điểm/set, ${override.deuce_enabled ? 'có cách biệt 2 điểm' : 'không áp dụng cách biệt 2 điểm'}`
                            ) : (
                              'Kế thừa luật mặc định của hình thức'
                            )}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenRoundModal?.(stage, roundNumber)}
                          className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold h-8"
                        >
                          Cấu hình vòng
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-xl border border-dashed text-center">
                  <p className="text-xs font-semibold text-slate-455">Sơ đồ thi đấu chưa được khởi tạo.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Khởi tạo sơ đồ ở bên dưới để thiết lập luật thi đấu chi tiết cho từng vòng.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nút khởi tạo bracket nếu chưa có */}
      {(!bracket || !bracket.stages || bracket.stages.length === 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col items-center gap-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Sơ đồ thi đấu</h2>
            <p className="text-sm text-slate-500">Chưa có sơ đồ. Hãy khởi tạo để bắt đầu phân lịch và sơ đồ.</p>
          </div>
          <Button
            onClick={handleGenerateBracket}
            disabled={isGeneratingBracket || !selectedDivisionId || participants.length < 2}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2.5 rounded-xl shadow-lg shadow-blue-500/20"
          >
            {isGeneratingBracket ? 'Đang khởi tạo...' : 'Khởi tạo sơ đồ thi đấu'}
          </Button>
          {!selectedDivisionId && (
            <p className="text-xs text-amber-600 font-semibold">⚠ Vui lòng chọn hình thức thi đấu trước</p>
          )}
          {participants.length < 2 && selectedDivisionId && (
            <p className="text-xs text-amber-600 font-semibold">⚠ Cần ít nhất 2 đội/VĐV để tạo sơ đồ</p>
          )}
        </div>
      )}
      
      {/* Visual bracket tree — dùng lại BracketTab đã có, truyền onScheduleMatch cho organizer */}
      {bracket && bracket.stages && bracket.stages.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-900 text-base mb-4">Sơ đồ thi đấu</h3>
          <PublicBracketTab
            tournament={tournament}
            divisionId={selectedDivisionId || undefined}
            onScheduleMatch={handleOpenScheduling}
          />
        </div>
      )}
    </div>
  );
}
