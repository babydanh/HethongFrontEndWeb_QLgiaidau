import { api } from '@/lib/axios';
import { Category } from '@/features/categories/api';

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  bannerUrl?: string;
  startDate?: string;
  endDate?: string;
  locationAddress?: string;
  status: 'DRAFT' | 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  format: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN';
  maxParticipants?: number;
  entryFee?: number;
  currency: string;
  categoryId: string;
  category?: Category;
  organizerId: string;
  organizer?: {
    id: string;
    fullName: string;
  };
  _count?: {
    participants: number;
    matches: number;
  };
}

export interface PaginatedTournaments {
  data: Tournament[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const tournamentsApi = {
  getTournaments: (params?: Record<string, unknown>) => api.get<PaginatedTournaments>('/tournaments', { params }).then(res => res.data),
  getTournamentById: (id: string) => api.get<Tournament>(`/tournaments/${id}`).then(res => res.data),
  createTournament: <T>(data: T) => api.post('/tournaments', data).then(res => res.data),
  updateTournament: <T>(id: string, data: T) => api.patch(`/tournaments/${id}`, data).then(res => res.data),
  deleteTournament: (id: string) => api.delete(`/tournaments/${id}`).then(res => res.data),
};
