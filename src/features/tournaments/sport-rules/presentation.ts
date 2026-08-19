import type { SportRuleKind } from '@/types/tournament';

export interface SportRulePresentation {
  kind: SportRuleKind;
  sportLabel: string;
  scoringLabel: string;
  setUnitLabel: string;
  winByTwoLabel: string;
  maxScoreLabel: string;
  presetSummary: string;
  roundConfigHint: string;
  setOptions: Array<{ value: number; label: string }>;
  maxScorePlaceholder: string;
  tiebreakLabel: string;
}

const SPORT_RULE_PRESENTATIONS: Record<SportRuleKind, SportRulePresentation> = {
  BADMINTON: {
    kind: 'BADMINTON',
    sportLabel: 'Cầu lông',
    scoringLabel: 'Rally point 21 điểm',
    setUnitLabel: 'Điểm mỗi set',
    winByTwoLabel: 'Thắng cách biệt 2 điểm',
    maxScoreLabel: 'Điểm tối đa của set khi hòa 2 điểm',
    presetSummary: 'Mặc định thường là thắng 2 set, 21 điểm/set, chạm 30 thắng luôn.',
    roundConfigHint: 'Phù hợp khi cần giảm điểm ở vòng ngoài, giữ 21 điểm cho bán kết và chung kết.',
    setOptions: [
      { value: 1, label: '1 set' },
      { value: 2, label: 'Thắng 2 set' },
      { value: 3, label: 'Thắng 3 set' },
    ],
    maxScorePlaceholder: 'Ví dụ: 30',
    tiebreakLabel: 'Điểm super tie-break / điểm chốt set',
  },
  TABLE_TENNIS: {
    kind: 'TABLE_TENNIS',
    sportLabel: 'Bóng bàn',
    scoringLabel: 'Rally point 11 điểm',
    setUnitLabel: 'Điểm mỗi set',
    winByTwoLabel: 'Thắng cách biệt 2 điểm',
    maxScoreLabel: 'Điểm trần nếu BTC muốn chốt set',
    presetSummary: 'Mặc định thường là thắng 3 set, 11 điểm/set, giao bóng đổi nhịp theo luật bóng bàn.',
    roundConfigHint: 'Hữu ích khi vòng đầu đánh BO3 còn các vòng sâu nâng lên BO5.',
    setOptions: [
      { value: 1, label: '1 set' },
      { value: 2, label: 'Thắng 2 set (BO3)' },
      { value: 3, label: 'Thắng 3 set (BO5)' },
      { value: 4, label: 'Thắng 4 set (BO7)' },
    ],
    maxScorePlaceholder: 'Ví dụ: 99 hoặc để luật mở',
    tiebreakLabel: 'Điểm tie-break đặc biệt',
  },
  PICKLEBALL_RALLY: {
    kind: 'PICKLEBALL_RALLY',
    sportLabel: 'Pickleball',
    scoringLabel: 'Rally point 11 điểm',
    setUnitLabel: 'Điểm mỗi set',
    winByTwoLabel: 'Thắng cách biệt 2 điểm',
    maxScoreLabel: 'Điểm trần của set khi deuce',
    presetSummary: 'Mode rally: mỗi pha bóng đều có điểm. Mặc định thường là thắng 2 set, 11 điểm/set, chạm 15 để chốt set nếu cần.',
    roundConfigHint: 'Có thể tăng điểm trần hoặc thêm super tie-break cho các vòng cuối.',
    setOptions: [
      { value: 1, label: '1 set' },
      { value: 2, label: 'Thắng 2 set' },
      { value: 3, label: 'Thắng 3 set' },
    ],
    maxScorePlaceholder: 'Ví dụ: 15',
    tiebreakLabel: 'Điểm super tie-break',
  },
  PICKLEBALL_SIDE_OUT: {
    kind: 'PICKLEBALL_SIDE_OUT',
    sportLabel: 'Pickleball',
    scoringLabel: 'Side-out scoring',
    setUnitLabel: 'Điểm mục tiêu mỗi game',
    winByTwoLabel: 'Chỉ bên giao mới ghi điểm, vẫn phải hơn 2',
    maxScoreLabel: 'Điểm đích của game',
    presetSummary: 'Mode side-out: chỉ đội giao bóng mới lên điểm. Đây là mode nghiệp vụ sâu hơn, cần quản lý lượt giao và server.',
    roundConfigHint: 'Ưu tiên dùng cho live score chi tiết; nếu chỉ nhập kết quả cuối trận thì cần quy ước rõ score game hoàn chỉnh.',
    setOptions: [
      { value: 1, label: '1 game' },
      { value: 2, label: 'Thắng 2 game' },
      { value: 3, label: 'Thắng 3 game' },
    ],
    maxScorePlaceholder: 'Ví dụ: 11',
    tiebreakLabel: 'Điểm game đích',
  },
  TENNIS: {
    kind: 'TENNIS',
    sportLabel: 'Tennis',
    scoringLabel: 'Set theo game + tie-break',
    setUnitLabel: 'Game mỗi set',
    winByTwoLabel: 'Set phải hơn 2 game hoặc vào tie-break',
    maxScoreLabel: 'Game tối đa của set',
    presetSummary: 'Mặc định thường là thắng 2 set, 6 game/set, 6-6 vào tie-break 7 điểm.',
    roundConfigHint: 'Dùng tốt khi vòng đầu đánh pro-set, các vòng sâu mới quay về best-of-3 chuẩn.',
    setOptions: [
      { value: 1, label: '1 set' },
      { value: 2, label: 'Thắng 2 set (BO3)' },
      { value: 3, label: 'Thắng 3 set (BO5)' },
    ],
    maxScorePlaceholder: 'Ví dụ: 7',
    tiebreakLabel: 'Điểm tie-break (thường là 7)',
  },
  FOOTBALL: {
    kind: 'FOOTBALL',
    sportLabel: 'Bóng đá',
    scoringLabel: 'Tính bàn thắng',
    setUnitLabel: 'Bàn thắng',
    winByTwoLabel: 'Không bắt buộc',
    maxScoreLabel: 'Không giới hạn',
    presetSummary: 'Mặc định thường là 2 hiệp, phân định thắng thua qua tổng bàn thắng.',
    roundConfigHint: 'Sử dụng cho bóng đá sân 5, 7, 11 người.',
    setOptions: [
      { value: 1, label: '1 trận' },
    ],
    maxScorePlaceholder: 'Để trống',
    tiebreakLabel: 'Luân lưu',
  },
};

type RuleTranslate = (key: string, values?: Record<string, string | number>) => string;

export function getSportRulePresentation(kind: SportRuleKind, translate?: RuleTranslate): SportRulePresentation {
  const base = SPORT_RULE_PRESENTATIONS[kind];
  if (!translate) return base;

  const key = (suffix: string) => `sportRules.${kind}.${suffix}`;
  return {
    ...base,
    sportLabel: translate(key('sportLabel')),
    scoringLabel: translate(key('scoringLabel')),
    setUnitLabel: translate(key('setUnitLabel')),
    winByTwoLabel: translate(key('winByTwoLabel')),
    maxScoreLabel: translate(key('maxScoreLabel')),
    presetSummary: translate(key('presetSummary')),
    roundConfigHint: translate(key('roundConfigHint')),
    setOptions: base.setOptions.map((option) => ({
      ...option,
      label: translate(key(`setOption${option.value}`)),
    })),
    maxScorePlaceholder: translate(key('maxScorePlaceholder')),
    tiebreakLabel: translate(key('tiebreakLabel')),
  };
}

