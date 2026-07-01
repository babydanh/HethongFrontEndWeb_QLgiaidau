import type { ResolvedSportRuleView } from '@/features/tournaments/sport-rules/normalize';

export type PenaltyCardStyle = 'none' | 'yellow-red';

export type PenaltyImpact = 'none' | 'point' | 'game' | 'set' | 'disciplinary';

export interface PenaltyActionSchema {
  kind: string;
  label: string;
  effectLabel: string;
  description: string;
  impact: PenaltyImpact;
  cardLabel?: string;
}

export interface PenaltyGroupSchema {
  id: string;
  label: string;
  items: PenaltyActionSchema[];
}

export interface PenaltySchema {
  sportKind: ResolvedSportRuleView['kind'];
  title: string;
  description: string;
  cardStyle: PenaltyCardStyle;
  groups: PenaltyGroupSchema[];
}

const TENNIS_SCHEMA: PenaltySchema = {
  sportKind: 'TENNIS',
  title: 'Bộ xử phạt tennis',
  description: 'Tennis không dùng thẻ màu như môn đối kháng khác. Hình phạt chủ yếu là cảnh cáo, trừ điểm, trừ game và vi phạm tác phong.',
  cardStyle: 'none',
  groups: [
    {
      id: 'discipline',
      label: 'Kỷ luật',
      items: [
        {
          kind: 'WARNING',
          label: 'Nhắc nhở',
          effectLabel: 'Ghi nhận cảnh báo',
          description: 'Nhắc nhở vận động viên / đội về hành vi hoặc nhịp thi đấu.',
          impact: 'disciplinary',
        },
        {
          kind: 'CODE_VIOLATION',
          label: 'Vi phạm tác phong',
          effectLabel: 'Ghi vi phạm luật thi đấu',
          description: 'Áp dụng khi có hành vi vi phạm quy định thi đấu hoặc thái độ không phù hợp.',
          impact: 'disciplinary',
        },
      ],
    },
    {
      id: 'penalty',
      label: 'Xử phạt trực tiếp',
      items: [
        {
          kind: 'POINT_PENALTY',
          label: 'Phạt 1 điểm',
          effectLabel: 'Trừ điểm trực tiếp',
          description: 'Trừ 1 điểm trong game hiện tại nếu luật hoặc trọng tài áp dụng.',
          impact: 'point',
        },
        {
          kind: 'GAME_PENALTY',
          label: 'Phạt 1 game',
          effectLabel: 'Trao game cho đối thủ',
          description: 'Dùng khi vi phạm nặng hơn mức cảnh cáo / phạt điểm.',
          impact: 'game',
        },
      ],
    },
  ],
};

const PICKLEBALL_SCHEMA: PenaltySchema = {
  sportKind: 'PICKLEBALL_SIDE_OUT',
  title: 'Bộ xử phạt pickleball',
  description: 'Side-out tập trung vào trạng thái giao bóng. Panel chỉ hiện các lỗi phù hợp với quyền giao và tính điểm rally.',
  cardStyle: 'none',
  groups: [
    {
      id: 'fault',
      label: 'Lỗi kỹ thuật',
      items: [
        {
          kind: 'WARNING',
          label: 'Cảnh cáo',
          effectLabel: 'Ghi cảnh báo',
          description: 'Nhắc nhở trước khi áp dụng xử phạt trực tiếp.',
          impact: 'disciplinary',
        },
        {
          kind: 'SERVICE_FAULT',
          label: 'Lỗi giao bóng',
          effectLabel: 'Ghi lỗi giao bóng',
          description: 'Ghi nhận lỗi giao bóng hoặc lỗi giao không hợp lệ.',
          impact: 'disciplinary',
        },
        {
          kind: 'TECHNICAL_FAULT',
          label: 'Lỗi kỹ thuật',
          effectLabel: 'Ghi lỗi kỹ thuật',
          description: 'Dùng cho lỗi kỹ thuật trong quá trình thi đấu.',
          impact: 'disciplinary',
        },
      ],
    },
    {
      id: 'conduct',
      label: 'Hành vi',
      items: [
        {
          kind: 'UNSPORTSMANLIKE',
          label: 'Thi đấu thiếu fair-play',
          effectLabel: 'Ghi vi phạm hành vi',
          description: 'Ghi nhận hành vi thiếu fair-play hoặc gây ảnh hưởng đến trận đấu.',
          impact: 'disciplinary',
        },
      ],
    },
  ],
};

const BADMINTON_SCHEMA: PenaltySchema = {
  sportKind: 'BADMINTON',
  title: 'Bộ xử phạt cầu lông',
  description: 'Có thể dùng cảnh cáo và thẻ theo cấu hình trọng tài/BTC. UI sẽ cho thấy rõ phần nào là cảnh báo, phần nào là thẻ.',
  cardStyle: 'yellow-red',
  groups: [
    {
      id: 'warning',
      label: 'Cảnh báo',
      items: [
        {
          kind: 'WARNING',
          label: 'Nhắc nhở',
          effectLabel: 'Ghi cảnh báo',
          description: 'Nhắc nhở trước khi leo lên mức xử phạt nặng hơn.',
          impact: 'disciplinary',
        },
      ],
    },
    {
      id: 'fault',
      label: 'Lỗi kỹ thuật',
      items: [
        {
          kind: 'SERVICE_FAULT',
          label: 'Lỗi giao cầu',
          effectLabel: 'Ghi lỗi giao cầu',
          description: 'Lỗi khi giao cầu không hợp lệ.',
          impact: 'disciplinary',
        },
        {
          kind: 'MISCONDUCT',
          label: 'Hành vi không đúng mực',
          effectLabel: 'Ghi vi phạm hành vi',
          description: 'Dùng cho hành vi phi thể thao hoặc vi phạm nội quy trận.',
          impact: 'disciplinary',
        },
      ],
    },
    {
      id: 'cards',
      label: 'Thẻ',
      items: [
        {
          kind: 'YELLOW_CARD',
          label: 'Thẻ vàng',
          effectLabel: 'Cảnh cáo chính thức',
          description: 'Hiển thị riêng khi BTC muốn ghi nhận mức cảnh cáo theo sơ đồ thẻ.',
          impact: 'disciplinary',
          cardLabel: 'Thẻ vàng',
        },
        {
          kind: 'RED_CARD',
          label: 'Thẻ đỏ',
          effectLabel: 'Truất quyền / mức phạt nặng',
          description: 'Dùng khi cần hiển thị mức xử phạt nặng hoặc truất quyền theo biên bản.',
          impact: 'disciplinary',
          cardLabel: 'Thẻ đỏ',
        },
      ],
    },
  ],
};

const TABLE_TENNIS_SCHEMA: PenaltySchema = {
  sportKind: 'TABLE_TENNIS',
  title: 'Bộ xử phạt bóng bàn',
  description: 'Hiện cảnh báo, lỗi kỹ thuật và thẻ theo preset của môn. Thẻ chỉ là lớp hiển thị, còn quyết định vẫn do trọng tài.',
  cardStyle: 'yellow-red',
  groups: [
    {
      id: 'warning',
      label: 'Cảnh báo',
      items: [
        {
          kind: 'WARNING',
          label: 'Nhắc nhở',
          effectLabel: 'Ghi cảnh báo',
          description: 'Nhắc nhở trước khi chuyển sang xử phạt nặng hơn.',
          impact: 'disciplinary',
        },
      ],
    },
    {
      id: 'fault',
      label: 'Lỗi kỹ thuật',
      items: [
        {
          kind: 'SERVICE_FAULT',
          label: 'Lỗi giao bóng',
          effectLabel: 'Ghi lỗi giao bóng',
          description: 'Dùng cho lỗi giao bóng hoặc lỗi kỹ thuật liên quan đến phát bóng.',
          impact: 'disciplinary',
        },
        {
          kind: 'MISCONDUCT',
          label: 'Hành vi không đúng mực',
          effectLabel: 'Ghi vi phạm hành vi',
          description: 'Dùng cho hành vi phi thể thao hoặc vi phạm kỷ luật trận.',
          impact: 'disciplinary',
        },
      ],
    },
    {
      id: 'cards',
      label: 'Thẻ',
      items: [
        {
          kind: 'YELLOW_CARD',
          label: 'Thẻ vàng',
          effectLabel: 'Cảnh cáo chính thức',
          description: 'Hiển thị riêng khi trọng tài/BTC áp dụng thẻ vàng.',
          impact: 'disciplinary',
          cardLabel: 'Thẻ vàng',
        },
        {
          kind: 'RED_CARD',
          label: 'Thẻ đỏ',
          effectLabel: 'Truất quyền / mức phạt nặng',
          description: 'Hiển thị riêng cho mức xử phạt nghiêm trọng.',
          impact: 'disciplinary',
          cardLabel: 'Thẻ đỏ',
        },
      ],
    },
  ],
};

const DEFAULT_SCHEMA: PenaltySchema = {
  sportKind: 'BADMINTON',
  title: 'Bộ xử phạt mặc định',
  description: 'Schema mặc định cho các môn có rally point nhưng chưa gắn cấu hình riêng.',
  cardStyle: 'none',
  groups: [
    {
      id: 'warning',
      label: 'Cảnh báo',
      items: [
        {
          kind: 'WARNING',
          label: 'Nhắc nhở',
          effectLabel: 'Ghi cảnh báo',
          description: 'Nhắc nhở theo quyết định trọng tài.',
          impact: 'disciplinary',
        },
      ],
    },
  ],
};

export function getPenaltySchema(sportKind: ResolvedSportRuleView['kind']): PenaltySchema {
  if (sportKind === 'TENNIS') {
    return TENNIS_SCHEMA;
  }

  if (sportKind === 'PICKLEBALL_RALLY' || sportKind === 'PICKLEBALL_SIDE_OUT') {
    return PICKLEBALL_SCHEMA;
  }

  if (sportKind === 'TABLE_TENNIS') {
    return TABLE_TENNIS_SCHEMA;
  }

  if (sportKind === 'BADMINTON') {
    return BADMINTON_SCHEMA;
  }

  return DEFAULT_SCHEMA;
}
