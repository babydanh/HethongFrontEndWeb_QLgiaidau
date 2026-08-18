'use client';

import React from 'react';
import { Settings, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { QRCodeSVG } from 'qrcode.react';
import { Tournament, BracketStage } from '@/types/tournament';
import { getSportRuleKind, inferSportRuleKindFromCategory } from '@/features/tournaments/sport-rules/normalize';
import { normalizeSportRuleKindForCategory } from '@/features/tournaments/sport-rules/options';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { isTournamentRegistrationClosed, isTournamentRegistrationOpen } from '@/utils/tournament-status';

interface ConfigTabProps {
  tournament: Tournament;
  bracket: { stages: BracketStage[] } | null;
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
  isSavingConfig: boolean;
  handleSaveMatchConfig: () => void;
  handleUpdateStageRoundConfig: (stageId: string, config: Record<string, unknown>) => void;
  bracketTypeState: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT';
  setBracketTypeState: (val: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT') => void;
}

export function ConfigTab({
  tournament,
  bracket,
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
  isSavingConfig,
  handleSaveMatchConfig,
  handleUpdateStageRoundConfig,
  bracketTypeState,
  setBracketTypeState,
}: ConfigTabProps) {
  const isRegistrationOpen = isTournamentRegistrationOpen(tournament.status) || isTournamentRegistrationClosed(tournament.status);
  // Category is authoritative. Older tournaments can contain a stale
  // sportRules.kind from the previous preset, which must not relabel the UI.
  const sportRuleKind = normalizeSportRuleKindForCategory(
    getSportRuleKind(tournament.sportRules),
    tournament.category ?? null,
  );
  const presentation = getSportRulePresentation(sportRuleKind);
  const setUnitLabel = presentation.setUnitLabel;
  const winByTwoLabel = presentation.winByTwoLabel;
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b pb-2 mb-4">
        <h2 className="text-xl font-bold text-slate-900">Cấu hình luật chơi</h2>
      </div>

      {tournament.inviteCode && (
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-lg flex flex-col md:flex-row items-center gap-6">
          <div className="bg-white p-2 rounded-lg border shadow-sm shrink-0">
            <QRCodeSVG value={tournament.inviteCode} size={120} level="M" />
          </div>
          <div className="space-y-2 text-center md:text-left flex-1">
            <h3 className="text-lg font-bold text-blue-900">Mã mời giải đấu (QR Code)</h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              Hãy chia sẻ mã QR này hoặc mã <strong>{tournament.inviteCode}</strong> cho vận động viên để họ có quyền đăng ký tham gia giải đấu của bạn.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2 bg-slate-50 border p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">Giới hạn số đội đăng ký</label>
            <input
              type="checkbox"
              checked={isLimitEnabled}
              onChange={(e) => setIsLimitEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </div>
          {isLimitEnabled && (
            <Input
              label="Số lượng đội đăng ký tối đa"
              type="number"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number(e.target.value))}
              className="bg-white text-xs mt-1"
            />
          )}
          {!isLimitEnabled && (
            <p className="text-xs font-semibold text-slate-400 mt-2">Không giới hạn số lượng đăng ký tham gia giải đấu.</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 bg-slate-50 border p-4 rounded-lg">
          <label className="text-sm font-semibold text-slate-700">Nội dung / Thể loại thi đấu</label>
          <select
            value={matchType}
            onChange={(e) => setMatchType(e.target.value)}
            disabled={isRegistrationOpen}
            className={`border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-11 ${isRegistrationOpen ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <option value="MALE_SINGLES">Đơn Nam</option>
            <option value="FEMALE_SINGLES">Đơn Nữ</option>
            <option value="MALE_DOUBLES">Đôi Nam</option>
            <option value="FEMALE_DOUBLES">Đôi Nữ</option>
            <option value="MIXED_DOUBLES">Đôi Nam Nữ (Mixed Doubles)</option>
          </select>
          {isRegistrationOpen && (
            <p className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1">
              <span>⚠</span> Không thể thay đổi nội dung thi đấu khi đang mở đăng ký.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 bg-slate-50 border p-4 rounded-lg">
          <label className="text-sm font-semibold text-slate-700">Thể thức thi đấu (Sơ đồ giải)</label>
          <select
            value={bracketTypeState}
            onChange={(e) => setBracketTypeState(e.target.value as 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT')}
            disabled={isRegistrationOpen}
            className={`border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-11 ${isRegistrationOpen ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <option value="SINGLE_ELIMINATION">Loại Trực Tiếp (Single Elimination)</option>
            <option value="DOUBLE_ELIMINATION">Nhánh Thắng / Nhánh Thua (Double Elimination)</option>
            <option value="ROUND_ROBIN">Vòng Tròn Tính Điểm (Round Robin)</option>
            <option value="GROUP_STAGE_KNOCKOUT">Vòng Bảng + Loại Trực Tiếp (Group Stage + Playoff)</option>
          </select>
          {isRegistrationOpen && (
            <p className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1">
              <span>⚠</span> Không thể thay đổi thể thức thi đấu khi đang mở đăng ký.
            </p>
          )}
          {bracketTypeState === 'ROUND_ROBIN' && isLimitEnabled && maxParticipants > 8 && (
            <div className="mt-2 bg-amber-50 border border-amber-250/80 rounded-lg p-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed font-medium">
                <strong className="font-bold text-amber-950">⚠️ Cảnh báo số lượng đội:</strong> Thể thức Vòng Tròn khuyến nghị tối đa <strong>8 đội/bảng</strong> để tránh quá tải lịch thi đấu. Nếu giải có <strong>{maxParticipants} đội</strong>, nên dùng thể thức <strong>Vòng Bảng + Loại Trực Tiếp</strong>.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sport Rules Card */}
      <div className="bg-slate-50 rounded-lg border p-5 space-y-4">
        <h4 className="font-bold text-slate-800 border-b pb-2">Luật tính điểm mặc định</h4>
        <p className="text-xs font-semibold text-slate-500">
          {presentation.sportLabel}: {presentation.scoringLabel}. {presentation.presetSummary}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Số Set chạm thắng</label>
            <select
              value={setsToWin}
              onChange={(e) => setSetsToWin(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {presentation.setOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <Input
            label={setUnitLabel}
            type="number"
            value={pointsPerSet}
            onChange={(e) => setPointsPerSet(Number(e.target.value))}
            placeholder={presentation.maxScorePlaceholder}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="winByTwo_tab"
            checked={winByTwo}
            onChange={(e) => setWinByTwo(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <label htmlFor="winByTwo_tab" className="text-sm font-semibold text-slate-700 cursor-pointer">
            {winByTwoLabel}
          </label>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={handleSaveMatchConfig}
          disabled={isSavingConfig}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
        >
          {isSavingConfig ? 'Đang lưu...' : 'Lưu cấu hình mặc định'}
        </Button>
      </div>
    </div>
  );
}
