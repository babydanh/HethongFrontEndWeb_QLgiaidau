import type { ReportCategory, ReportSource, ReportStatus, ReportTargetType } from './types';

export const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
  USER: 'Thành viên',
  TOURNAMENT: 'Giải đấu',
  MATCH: 'Trận đấu',
  COMMUNITY: 'Câu lạc bộ',
};

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  CHEATING: 'Gian lận',
  RULE_VIOLATION: 'Vi phạm luật thi đấu',
  ABUSIVE_BEHAVIOR: 'Hành vi xúc phạm',
  FAKE_INFORMATION: 'Thông tin giả mạo',
  PAYMENT_FRAUD: 'Gian lận thanh toán',
  UNSAFE_ORGANIZATION: 'Tổ chức không an toàn',
  OTHER: 'Vi phạm khác',
};

export const REPORT_SOURCE_LABELS: Record<ReportSource, string> = {
  USER_REPORT: 'Báo cáo người dùng',
  LEGACY_DISPUTE: 'Báo cáo cũ',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  SUBMITTED: 'Mới tiếp nhận',
  TRIAGED: 'Đã phân loại',
  UNDER_REVIEW: 'Đang xác minh',
  ESCALATED: 'Đã chuyển admin',
  RESOLVED: 'Đã xác nhận vi phạm',
  REJECTED: 'Đã bác báo cáo',
};

