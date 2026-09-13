'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { divisionsApi, type Division } from '@/features/tournaments/api';
import type { Category } from '@/types/category';
import type { Tournament } from '@/types/tournament';
import { MatchTypeDB, GenderRestriction } from '@/types/tournament';
import {
  getAllowedMatchFormatOptions,
  normalizeMatchFormatForCategory,
  type MatchFormatOptionValue,
} from '@/features/tournaments/match-format-options';
import { inferSportRuleKindFromCategory } from '@/features/tournaments/sport-rules/normalize';
import { buildDefaultSportRules } from '@/features/tournaments/sport-rules/defaults';
import { normalizeSportRuleKindForCategory } from '@/features/tournaments/sport-rules/options';
import { buildStageRoundConfigPayload } from '@/features/tournaments/sport-rules/payload';
import { isLiteTournament } from '@/features/tournaments/lite-qr';
import { getErrorMessage } from '@/utils/error';
import { Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateDivisionInlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  onDivisionCreated?: (newDivision: Division) => void;
}

const MATCH_FORMAT_LABELS: Record<MatchFormatOptionValue, string> = {
  MALE_SINGLES: 'Đơn Nam',
  FEMALE_SINGLES: 'Đơn Nữ',
  MALE_DOUBLES: 'Đôi Nam',
  FEMALE_DOUBLES: 'Đôi Nữ',
  MIXED_DOUBLES: 'Đôi Nam Nữ',
};

export function CreateDivisionInlineModal({
  isOpen,
  onClose,
  tournament,
  onDivisionCreated,
}: CreateDivisionInlineModalProps) {
  const category: Category | null | undefined = tournament.category;
  const availableMatchFormatOptions = getAllowedMatchFormatOptions(category);

  const [matchFormat, setMatchFormat] = useState<MatchFormatOptionValue>(() =>
    normalizeMatchFormatForCategory('MALE_DOUBLES', category),
  );
  const [name, setName] = useState<string>('');
  const [bracketType, setBracketType] = useState<
    'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT'
  >('SINGLE_ELIMINATION');

  const [limitEnabled, setLimitEnabled] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState('16');

  const [eloEnabled, setEloEnabled] = useState(false);
  const [minElo, setMinElo] = useState<number | null>(null);
  const [maxElo, setMaxElo] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync default format & name when modal opens or category changes
  useEffect(() => {
    if (isOpen) {
      const defaultFormat = normalizeMatchFormatForCategory('MALE_DOUBLES', category);
      setMatchFormat(defaultFormat);
      setName(MATCH_FORMAT_LABELS[defaultFormat] || '');
      setBracketType('SINGLE_ELIMINATION');
      setLimitEnabled(true);
      setMaxParticipants('16');
      setEloEnabled(false);
      setMinElo(null);
      setMaxElo(null);
    }
  }, [isOpen, category]);

  const handleFormatChange = (newFormat: MatchFormatOptionValue) => {
    setMatchFormat(newFormat);
    setName(MATCH_FORMAT_LABELS[newFormat] || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament.id) return;

    setIsSubmitting(true);
    try {
      const pm: Record<string, { mt: MatchTypeDB; gr: GenderRestriction | null }> = {
        MALE_SINGLES: { mt: MatchTypeDB.SINGLES, gr: GenderRestriction.MALE },
        FEMALE_SINGLES: { mt: MatchTypeDB.SINGLES, gr: GenderRestriction.FEMALE },
        MALE_DOUBLES: { mt: MatchTypeDB.DOUBLES, gr: GenderRestriction.MALE },
        FEMALE_DOUBLES: { mt: MatchTypeDB.DOUBLES, gr: GenderRestriction.FEMALE },
        MIXED_DOUBLES: { mt: MatchTypeDB.MIXED_DOUBLES, gr: GenderRestriction.MIXED },
      };

      const normalizedMatchType = normalizeMatchFormatForCategory(matchFormat, category);
      const mapped = pm[normalizedMatchType] || { mt: MatchTypeDB.DOUBLES, gr: null };
      const divisionName = name.trim() || MATCH_FORMAT_LABELS[normalizedMatchType] || 'Nội dung mới';

      const normalizedKind = normalizeSportRuleKindForCategory(
        inferSportRuleKindFromCategory(category),
        category,
      );
      const defaultRules = buildDefaultSportRules(normalizedKind);
      const scoringMode = (isLiteTournament(tournament) ? 'LITE' : 'STRICT') as 'LITE' | 'STRICT';

      const defaultRoundConfig = buildStageRoundConfigPayload({
        kind: normalizedKind,
        setsToWin: defaultRules.setsToWin,
        pointsPerSet: defaultRules.pointsPerSet,
        winByTwo: defaultRules.winByTwo,
        maxPoints: defaultRules.maxPoints,
        tiebreakPoints: defaultRules.tiebreakPoints,
        roundsToPlay: 1,
        mode: scoringMode,
      });

      const parsedMax = Number(maxParticipants);
      const normalizedMax =
        Number.isFinite(parsedMax) && parsedMax > 0
          ? Math.min(128, Math.max(2, parsedMax))
          : 2;

      const payload = {
        name: divisionName,
        matchType: mapped.mt,
        genderRestriction: mapped.gr,
        bracketType: bracketType as Division['bracketType'],
        startDate: tournament.startDate ?? null,
        endDate: tournament.endDate ?? null,
        isConfigOverride: true,
        roundConfig: defaultRoundConfig,
        minElo: eloEnabled ? minElo : null,
        maxElo: eloEnabled ? maxElo : null,
        maxParticipants: limitEnabled ? normalizedMax : null,
      };

      const res = await divisionsApi.createDivision(tournament.id, payload);
      toast.success(`Đã thêm "${divisionName}" thành công!`);
      if (res.data && onDivisionCreated) {
        onDivisionCreated(res.data);
      }
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-md bg-white rounded-xl p-5 shadow-xl border border-slate-200">
        <ModalHeader className="pb-3 border-b border-slate-100">
          <ModalTitle className="text-base font-bold text-slate-900">
            Thêm nội dung thi đấu
          </ModalTitle>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-3 text-left">
          {/* 1. Loại thể thức */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              Loại thể thức
            </label>
            <select
              value={matchFormat}
              onChange={(e) => handleFormatChange(e.target.value as MatchFormatOptionValue)}
              className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              {availableMatchFormatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {MATCH_FORMAT_LABELS[option.value] || option.value}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Tên nội dung riêng */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              Tên nội dung
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Đôi Nam ELO thấp"
              maxLength={255}
              className="w-full border border-slate-200 rounded-lg p-2 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Để trống sẽ dùng tên mặc định theo loại thể thức.
            </p>
          </div>

          {/* 3. Sơ đồ thi đấu */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              Sơ đồ thi đấu
            </label>
            <select
              value={bracketType}
              onChange={(e) =>
                setBracketType(
                  e.target.value as
                    | 'SINGLE_ELIMINATION'
                    | 'DOUBLE_ELIMINATION'
                    | 'ROUND_ROBIN'
                    | 'GROUP_STAGE_KNOCKOUT',
                )
              }
              className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="SINGLE_ELIMINATION">Loại trực tiếp</option>
              <option value="DOUBLE_ELIMINATION">Nhánh thắng/thua</option>
              <option value="ROUND_ROBIN">Vòng tròn</option>
              <option value="GROUP_STAGE_KNOCKOUT">Vòng bảng + Loại trực tiếp</option>
            </select>
          </div>

          {/* 4. Giới hạn số đội đăng ký */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={limitEnabled}
                onChange={(e) => setLimitEnabled(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              Giới hạn số đội đăng ký
            </label>
            {limitEnabled && (
              <div className="pt-1">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Số lượng tối đa
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={maxParticipants}
                  onChange={(e) =>
                    setMaxParticipants(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))
                  }
                  onBlur={() => {
                    const parsed = Number(maxParticipants);
                    const normalized =
                      Number.isFinite(parsed) && parsed > 0
                        ? Math.min(128, Math.max(2, parsed))
                        : 2;
                    setMaxParticipants(String(normalized));
                  }}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="16"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Giới hạn áp dụng riêng cho nội dung này (2 – 128).
                </p>
              </div>
            )}
          </div>

          {/* 5. Giới hạn ELO */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={eloEnabled}
                onChange={(e) => setEloEnabled(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              Giới hạn ELO riêng cho nội dung này
            </label>
            {eloEnabled && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    ELO tối thiểu
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={3000}
                    value={minElo ?? ''}
                    onChange={(e) =>
                      setMinElo(e.target.value === '' ? null : Number(e.target.value))
                    }
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="Không giới hạn"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    ELO tối đa
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={3000}
                    value={maxElo ?? ''}
                    onChange={(e) =>
                      setMaxElo(e.target.value === '' ? null : Number(e.target.value))
                    }
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="Không giới hạn"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs font-semibold h-8 px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-xs font-bold h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang thêm...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Thêm nội dung
                </>
              )}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
