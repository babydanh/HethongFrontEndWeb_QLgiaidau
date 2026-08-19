import type { ReportCategory, ReportSource, ReportStatus, ReportTargetType } from './types';

// Legacy English-safe fallbacks. Current UI components resolve these labels through the Reports namespace.
export const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
  USER: 'Member',
  TOURNAMENT: 'Tournament',
  MATCH: 'Match',
  COMMUNITY: 'Club',
};

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  CHEATING: 'Cheating',
  RULE_VIOLATION: 'Competition rule violation',
  ABUSIVE_BEHAVIOR: 'Abusive behavior',
  FAKE_INFORMATION: 'Fake information',
  PAYMENT_FRAUD: 'Payment fraud',
  UNSAFE_ORGANIZATION: 'Unsafe organization',
  OTHER: 'Other violation',
};

export const REPORT_SOURCE_LABELS: Record<ReportSource, string> = {
  USER_REPORT: 'User report',
  LEGACY_DISPUTE: 'Legacy report',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  SUBMITTED: 'New',
  TRIAGED: 'Triaged',
  UNDER_REVIEW: 'Under review',
  ESCALATED: 'Escalated to admin',
  RESOLVED: 'Violation confirmed',
  REJECTED: 'Report rejected',
};
