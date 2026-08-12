import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
  CreateReportInput,
  ReportCategory,
  ReportFilters,
  ReportStatus,
  ViolationReport,
} from './types';

export const reportsApi = {
  create: (input: CreateReportInput) =>
    api.post<ApiResponse<ViolationReport>>('/users/reports', input),

  getMine: (params: { limit?: number; cursor?: string | null } = {}) =>
    api.get<ApiResponse<ViolationReport[]>>('/users/reports/me', { params }),

  list: (filters: ReportFilters) =>
    api.get<ApiResponse<ViolationReport[]>>('/admin/reports', {
      params: {
        ...filters,
        from: filters.dateFrom,
        to: filters.dateTo,
        dateFrom: undefined,
        dateTo: undefined,
      },
    }),

  triage: (
    reportId: string,
    input: { category: ReportCategory; note: string },
  ) => api.post<ApiResponse<ViolationReport>>(`/admin/reports/${reportId}/triage`, input),

  startReview: (reportId: string, note: string) =>
    api.post<ApiResponse<ViolationReport>>(`/admin/reports/${reportId}/start-review`, { note }),

  escalate: (reportId: string, note: string) =>
    api.post<ApiResponse<ViolationReport>>(`/admin/reports/${reportId}/escalate`, { note }),

  resolve: (reportId: string, status: Extract<ReportStatus, 'RESOLVED' | 'REJECTED'>, resolutionNote: string, category?: ReportCategory) =>
    api.post<ApiResponse<ViolationReport>>(`/admin/reports/${reportId}/resolve`, { status, resolutionNote, category }),
};
