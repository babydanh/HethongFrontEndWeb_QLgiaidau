export const REPORT_TARGET_TYPES = ['USER', 'TOURNAMENT', 'MATCH', 'COMMUNITY'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_CATEGORIES = [
  'CHEATING',
  'RULE_VIOLATION',
  'ABUSIVE_BEHAVIOR',
  'FAKE_INFORMATION',
  'PAYMENT_FRAUD',
  'UNSAFE_ORGANIZATION',
  'OTHER',
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_SOURCES = ['USER_REPORT', 'LEGACY_DISPUTE'] as const;
export type ReportSource = (typeof REPORT_SOURCES)[number];

export const REPORT_STATUSES = [
  'SUBMITTED',
  'TRIAGED',
  'UNDER_REVIEW',
  'ESCALATED',
  'RESOLVED',
  'REJECTED',
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface ReportActor {
  id: string;
  fullName: string | null;
  email: string | null;
}

export interface ReportTargetSummary {
  id: string;
  name: string;
  status?: string | null;
}

export interface ViolationReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  source?: ReportSource;
  sourceReferenceId?: string | null;
  category: ReportCategory;
  reason: string;
  evidenceUrls: string[];
  status: ReportStatus;
  resolutionNote?: string | null;
  createdAt: string;
  updatedAt?: string;
  triagedAt?: string | null;
  resolvedAt?: string | null;
  reporter?: ReportActor | null;
  assignee?: ReportActor | null;
  target?: ReportTargetSummary | null;
  targetUser?: ReportActor | null;
  targetTournament?: ReportTargetSummary | null;
  targetMatch?: ReportTargetSummary | null;
  targetCommunity?: ReportTargetSummary | null;
}

export interface CreateReportInput {
  targetType: ReportTargetType;
  targetId: string;
  category: ReportCategory;
  reason: string;
  evidenceUrls?: string[];
}

export interface ReportFilters {
  page: number;
  limit: number;
  search?: string;
  status?: ReportStatus;
  targetType?: ReportTargetType;
  category?: ReportCategory;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
}

