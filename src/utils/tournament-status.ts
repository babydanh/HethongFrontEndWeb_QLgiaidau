import type { Tournament } from '@/features/tournaments/api';

export type TournamentStatus = Tournament['status'];

const normalizeRawStatus = (status?: string | null) => (status ?? '').trim().toUpperCase();

export const normalizeTournamentStatus = (status?: string | null): TournamentStatus => {
  const normalized = normalizeRawStatus(status);

  switch (normalized) {
    case 'DRAFT':
    case 'PENDING_APPROVAL':
    case 'PENDING_DELETE':
    case 'UPCOMING':
    case 'REGISTRATION_OPEN':
    case 'REGISTRATION_CLOSED':
    case 'IN_PROGRESS':
    case 'ONGOING':
    case 'COMPLETED':
    case 'CANCELLED':
      return normalized as TournamentStatus;
    case 'FINISHED':
      return 'COMPLETED';
    case 'ACTIVE':
    case 'LIVE':
      return 'IN_PROGRESS';
    case 'PUBLISHED':
    case 'REGISTRATION':
      return 'REGISTRATION_OPEN';
    default:
      return 'DRAFT';
  }
};

export const getTournamentStatusLabel = (status?: string | null, labels?: Partial<Record<string, string>>) => {
  switch (normalizeTournamentStatus(status)) {
    case 'DRAFT':
      return labels?.DRAFT ?? 'Nháp';
    case 'PENDING_APPROVAL':
      return labels?.PENDING_APPROVAL ?? 'Chờ duyệt công bố';
    case 'PENDING_DELETE':
      return labels?.PENDING_DELETE ?? 'Đang chờ xóa';
    case 'UPCOMING':
      return labels?.UPCOMING ?? 'Sắp diễn ra';
    case 'REGISTRATION_OPEN':
      return labels?.REGISTRATION_OPEN ?? 'Mở đăng ký';
    case 'REGISTRATION_CLOSED':
      return labels?.REGISTRATION_CLOSED ?? 'Đã khóa đăng ký';
    case 'IN_PROGRESS':
    case 'ONGOING':
      return labels?.IN_PROGRESS ?? 'Đang thi đấu';
    case 'COMPLETED':
      return labels?.COMPLETED ?? 'Đã kết thúc';
    case 'CANCELLED':
      return labels?.CANCELLED ?? 'Đã hủy';
    default:
      return normalizeRawStatus(status) || 'Nháp';
  }
};

export const getTournamentStatusClassName = (status?: string | null) => {
  switch (normalizeTournamentStatus(status)) {
    case 'DRAFT':
      return 'bg-slate-700 text-white border-slate-600 shadow-2xs';
    case 'PENDING_APPROVAL':
      return 'bg-amber-600 text-white border-amber-500 shadow-2xs';
    case 'PENDING_DELETE':
      return 'bg-rose-600 text-white border-rose-500 shadow-2xs';
    case 'UPCOMING':
      return 'bg-blue-600 text-white border-blue-500 shadow-2xs';
    case 'REGISTRATION_OPEN':
      return 'bg-emerald-600 text-white border-emerald-500 shadow-2xs';
    case 'REGISTRATION_CLOSED':
      return 'bg-slate-700 text-white border-slate-600 shadow-2xs';
    case 'IN_PROGRESS':
    case 'ONGOING':
      return 'bg-rose-600 text-white border-rose-700 shadow-2xs';
    case 'COMPLETED':
      return 'bg-slate-800 text-white border-slate-700 shadow-2xs';
    case 'CANCELLED':
      return 'bg-rose-700 text-white border-rose-600 shadow-2xs';
    default:
      return 'bg-slate-700 text-white border-slate-600 shadow-2xs';
  }
};

export const isTournamentDraft = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'DRAFT';

export const isTournamentPendingApproval = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'PENDING_APPROVAL';

export const isTournamentPendingDelete = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'PENDING_DELETE';

export const isTournamentUpcoming = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'UPCOMING';

export const isTournamentRegistrationClosed = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'REGISTRATION_CLOSED';

export const isTournamentRegistrationOpen = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'REGISTRATION_OPEN';

export const isTournamentInProgress = (status?: string | null) => {
  const normalized = normalizeTournamentStatus(status);
  return normalized === 'IN_PROGRESS' || normalized === 'ONGOING';
};

export const isTournamentCompleted = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'COMPLETED';

export const isTournamentCancelled = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'CANCELLED';

export const isTournamentOpenForRegistration = (status?: string | null) =>
  normalizeTournamentStatus(status) === 'REGISTRATION_OPEN';

export const isTournamentInRegistrationWindow = (tournament?: { status?: string | null; registrationStartDate?: string | null; registrationEndDate?: string | null }) => {
  if (!tournament) return false;
  const status = normalizeTournamentStatus(tournament.status);
  if (status === 'REGISTRATION_CLOSED' || status === 'IN_PROGRESS' || status === 'ONGOING' || status === 'COMPLETED' || status === 'CANCELLED' || status === 'DRAFT') {
    return false;
  }
  if (status === 'REGISTRATION_OPEN') return true;
  if (status === 'UPCOMING') {
    const now = Date.now();
    const start = tournament.registrationStartDate ? new Date(tournament.registrationStartDate).getTime() : 0;
    const end = tournament.registrationEndDate ? new Date(tournament.registrationEndDate).getTime() : Infinity;
    if (start > 0 && now >= start && now <= end) {
      return true;
    }
  }
  return false;
};

