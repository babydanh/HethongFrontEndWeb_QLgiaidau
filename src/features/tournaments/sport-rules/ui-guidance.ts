import type { SportRuleKind } from '@/types/tournament';

export interface SportRulePreset {
  id: string;
  label: string;
  description: string;
  setsToWin: number;
  pointsPerSet: number;
  winByTwo: boolean;
  maxPoints: number;
  tiebreakPoints: number | null;
}

export interface ScoreEntryGuidance {
  targetSummary: string;
  examples: string[];
  operatorHint: string;
}

export interface QuickScoreTemplate {
  id: string;
  label: string;
  winnerScore: number;
  loserScore: number;
}

const SPORT_RULE_PRESETS: Record<SportRuleKind, SportRulePreset[]> = {
  BADMINTON: [
    {
      id: 'badminton-quick',
      label: 'Vòng đầu nhanh',
      description: 'Đánh 1 set 21, phù hợp vòng loại hoặc giải đông VĐV.',
      setsToWin: 1,
      pointsPerSet: 21,
      winByTwo: true,
      maxPoints: 30,
      tiebreakPoints: null,
    },
    {
      id: 'badminton-standard',
      label: 'Chuẩn phong trào',
      description: 'Thắng 2 set 21, chạm 30 thắng luôn.',
      setsToWin: 2,
      pointsPerSet: 21,
      winByTwo: true,
      maxPoints: 30,
      tiebreakPoints: null,
    },
    {
      id: 'badminton-short',
      label: 'Tiết kiệm thời gian',
      description: 'Thắng 2 set 15, dùng khi cần rút ngắn thời lượng.',
      setsToWin: 2,
      pointsPerSet: 15,
      winByTwo: true,
      maxPoints: 21,
      tiebreakPoints: null,
    },
  ],
  TABLE_TENNIS: [
    {
      id: 'table-tennis-bo3',
      label: 'BO3 chuẩn nhanh',
      description: 'Thắng 2 set 11 điểm, hợp vòng bảng hoặc vòng đầu.',
      setsToWin: 2,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 99,
      tiebreakPoints: null,
    },
    {
      id: 'table-tennis-bo5',
      label: 'BO5 loại trực tiếp',
      description: 'Thắng 3 set 11 điểm, hợp bán kết hoặc chung kết.',
      setsToWin: 3,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 99,
      tiebreakPoints: null,
    },
    {
      id: 'table-tennis-single',
      label: '1 set chốt nhanh',
      description: 'Một set 11 điểm để xoay vòng đấu thật nhanh.',
      setsToWin: 1,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 99,
      tiebreakPoints: null,
    },
  ],
  PICKLEBALL_RALLY: [
    {
      id: 'pickleball-rally-quick',
      label: '1 game 11',
      description: 'Một game 11 rally point, gọn cho vòng đầu.',
      setsToWin: 1,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 15,
      tiebreakPoints: null,
    },
    {
      id: 'pickleball-rally-standard',
      label: 'Chuẩn rally',
      description: 'Thắng 2 game 11, dễ live score và dễ điều phối.',
      setsToWin: 2,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 15,
      tiebreakPoints: null,
    },
    {
      id: 'pickleball-rally-extended',
      label: 'Game 15',
      description: 'Thắng 2 game 15 cho các trận sâu, ít biến động hơn.',
      setsToWin: 2,
      pointsPerSet: 15,
      winByTwo: true,
      maxPoints: 21,
      tiebreakPoints: null,
    },
  ],
  PICKLEBALL_SIDE_OUT: [
    {
      id: 'pickleball-sideout-standard',
      label: 'Chuẩn side-out',
      description: '1 game 11, chỉ bên giao bóng mới ghi điểm.',
      setsToWin: 1,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 15,
      tiebreakPoints: 11,
    },
    {
      id: 'pickleball-sideout-15',
      label: 'Game 15',
      description: '1 game 15, hợp trận kéo dài hơn nhưng vẫn giữ side-out.',
      setsToWin: 1,
      pointsPerSet: 15,
      winByTwo: true,
      maxPoints: 21,
      tiebreakPoints: 15,
    },
    {
      id: 'pickleball-sideout-finals',
      label: 'Best of 3',
      description: 'Thắng 2 game 11, hợp bán kết/chung kết có thời lượng tốt hơn.',
      setsToWin: 2,
      pointsPerSet: 11,
      winByTwo: true,
      maxPoints: 15,
      tiebreakPoints: 11,
    },
  ],
  TENNIS: [
    {
      id: 'tennis-pro-set',
      label: 'Pro set',
      description: '1 set 8 game, hợp vòng bảng hoặc vòng tính thời gian chặt.',
      setsToWin: 1,
      pointsPerSet: 8,
      winByTwo: true,
      maxPoints: 9,
      tiebreakPoints: 7,
    },
    {
      id: 'tennis-standard',
      label: 'BO3 chuẩn',
      description: 'Thắng 2 set, mỗi set 6 game, 6-6 tie-break 7.',
      setsToWin: 2,
      pointsPerSet: 6,
      winByTwo: true,
      maxPoints: 7,
      tiebreakPoints: 7,
    },
    {
      id: 'tennis-short-set',
      label: 'Short set',
      description: '1 set 4 game, hợp giải phong trào hoặc nhiều trận liên tiếp.',
      setsToWin: 1,
      pointsPerSet: 4,
      winByTwo: true,
      maxPoints: 5,
      tiebreakPoints: 7,
    },
  ],
  FOOTBALL: [
    {
      id: 'football-standard',
      label: 'Chuẩn',
      description: '2 hiệp, mỗi hiệp 20 phút',
      setsToWin: 1,
      pointsPerSet: 1,
      winByTwo: false,
      maxPoints: 99,
      tiebreakPoints: null,
    },
  ],
};

const SCORE_ENTRY_GUIDANCE: Record<SportRuleKind, ScoreEntryGuidance> = {
  BADMINTON: {
    targetSummary: 'Mặc định chạm 21, hòa 20-20 thì hơn 2, tối đa thường 30.',
    examples: ['21-17', '22-20', '30-29'],
    operatorHint: 'Nhập từng set đã chốt. Nếu chưa đánh tới set đó, để cả hai bên = 0.',
  },
  TABLE_TENNIS: {
    targetSummary: 'Mặc định chạm 11, hòa 10-10 thì hơn 2.',
    examples: ['11-7', '12-10', '15-13'],
    operatorHint: 'Bóng bàn thường dùng BO3 hoặc BO5, nên số set nhập phải khớp cấu hình trận.',
  },
  PICKLEBALL_RALLY: {
    targetSummary: 'Rally point: bên thắng pha bóng nào cũng có điểm.',
    examples: ['11-6', '15-13', '21-19'],
    operatorHint: 'Dùng mode này nếu BTC cần nhập tỷ số nhanh và ít rủi ro hơn side-out.',
  },
  PICKLEBALL_SIDE_OUT: {
    targetSummary: 'Side-out: chỉ bên giao bóng mới ghi điểm, thường chạm 11 hoặc 15 và vẫn cần hơn 2 nếu kéo dài.',
    examples: ['11-8', '12-10', '15-13'],
    operatorHint: 'Panel này chỉ chốt score game. Trạng thái quyền giao hiện tại được giữ từ bảng điểm trực tiếp.',
  },
  TENNIS: {
    targetSummary: 'Tennis nhập theo game trong từng set, không nhập điểm 15/30/40 ở đây.',
    examples: ['6-4', '7-5', '7-6'],
    operatorHint: 'Nếu set vào tie-break, dùng kết quả cuối set như 7-6 thay vì nhập điểm tie-break riêng.',
  },
  FOOTBALL: {
    targetSummary: 'Nhập tỷ số bàn thắng.',
    examples: ['2-1', '0-0', '3-2'],
    operatorHint: 'Cập nhật tỷ số sau mỗi bàn thắng hoặc khi hết trận.',
  },
};

type RuleTranslate = (key: string, values?: Record<string, string | number>) => string;

export function getSportRulePresets(kind: SportRuleKind, translate?: RuleTranslate): SportRulePreset[] {
  const presets = SPORT_RULE_PRESETS[kind];
  if (!translate) return presets;
  return presets.map((preset) => ({
    ...preset,
    label: translate(`sportRules.presets.${preset.id}.label`),
    description: translate(`sportRules.presets.${preset.id}.description`),
  }));
}

export function getScoreEntryGuidance(kind: SportRuleKind, translate?: RuleTranslate): ScoreEntryGuidance {
  const guidance = SCORE_ENTRY_GUIDANCE[kind];
  if (!translate) return guidance;
  return {
    ...guidance,
    targetSummary: translate(`sportRules.guidance.${kind}.targetSummary`),
    operatorHint: translate(`sportRules.guidance.${kind}.operatorHint`),
  };
}

export function getQuickScoreTemplates(
  kind: SportRuleKind,
  pointsPerSet: number,
  maxPoints: number,
  translate?: RuleTranslate,
): QuickScoreTemplate[] {
  if (kind === 'TENNIS') {
    const label = (key: string, fallback: string) => translate?.(`sportRules.quickScore.${key}`) ?? fallback;
    return [
      {
        id: 'tennis-standard',
        label: label('standard', 'Chuẩn'),
        winnerScore: pointsPerSet,
        loserScore: Math.max(pointsPerSet - 2, 0),
      },
      {
        id: 'tennis-close',
        label: label('close', 'Sát nút'),
        winnerScore: Math.min(pointsPerSet + 1, maxPoints),
        loserScore: Math.max(pointsPerSet - 1, 0),
      },
      {
        id: 'tennis-tiebreak',
        label: label('tiebreak', 'Tie-break'),
        winnerScore: maxPoints,
        loserScore: Math.max(maxPoints - 1, 0),
      },
    ];
  }

  const safeCap = Math.max(pointsPerSet, maxPoints);
  const label = (key: string, fallback: string) => translate?.(`sportRules.quickScore.${key}`) ?? fallback;
  return [
    {
      id: `${kind.toLowerCase()}-standard`,
      label: label('standard', 'Chuẩn'),
      winnerScore: pointsPerSet,
      loserScore: Math.max(pointsPerSet - 4, 0),
    },
    {
      id: `${kind.toLowerCase()}-close`,
      label: label('close', 'Sát nút'),
      winnerScore: pointsPerSet,
      loserScore: Math.max(pointsPerSet - 2, 0),
    },
    {
      id: `${kind.toLowerCase()}-extended`,
      label: label('extended', 'Kéo dài'),
      winnerScore: safeCap,
      loserScore: Math.max(safeCap - 1, 0),
    },
  ];
}

