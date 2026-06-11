import { api } from '@/lib/axios';
import { PaginatedResponse } from '@/types/api';
import {
  TournamentSeries,
  SeriesLeg,
  SeriesEvent,
  SeriesStanding,
  CreateSeriesDto,
  UpdateSeriesDto,
  CreateLegDto,
  LinkEventDto,
  QuerySeriesDto,
  QueryStandingsDto,
} from '@/types/series';

export const seriesApi = {
  // Public
  getSeriesList: (params?: QuerySeriesDto) =>
    api.get<PaginatedResponse<TournamentSeries>>('/series', { params }),

  getSeriesDetail: (slug: string) =>
    api.get<{ series: TournamentSeries; legs: SeriesLeg[] }>(`/series/${slug}`),

  getSeriesLegs: (seriesId: string) =>
    api.get<SeriesLeg[]>(`/series/${seriesId}/legs`),

  getSeriesEvents: (seriesId: string, legId: string) =>
    api.get<SeriesEvent[]>(`/series/${seriesId}/legs/${legId}/events`),

  getSeriesStandings: (seriesId: string, params: QueryStandingsDto) =>
    api.get<PaginatedResponse<SeriesStanding>>(`/series/${seriesId}/standings`, { params }),

  // Organizer
  createSeries: (data: CreateSeriesDto) =>
    api.post<TournamentSeries>('/organizer/series', data),

  updateSeries: (id: string, data: UpdateSeriesDto) =>
    api.patch<TournamentSeries>(`/organizer/series/${id}`, data),

  deleteSeries: (id: string) =>
    api.delete<TournamentSeries>(`/organizer/series/${id}`),

  createLeg: (seriesId: string, data: CreateLegDto) =>
    api.post<SeriesLeg>(`/organizer/series/${seriesId}/legs`, data),

  updateLeg: (seriesId: string, legId: string, data: Partial<CreateLegDto> & { status?: 'UPCOMING' | 'ONGOING' | 'COMPLETED' }) =>
    api.patch<SeriesLeg>(`/organizer/series/${seriesId}/legs/${legId}`, data),

  deleteLeg: (seriesId: string, legId: string) =>
    api.delete<SeriesLeg>(`/organizer/series/${seriesId}/legs/${legId}`),

  linkEvent: (seriesId: string, legId: string, data: LinkEventDto) =>
    api.post<SeriesEvent>(`/organizer/series/${seriesId}/legs/${legId}/events`, data),

  unlinkEvent: (seriesId: string, legId: string, eventId: string) =>
    api.delete<SeriesEvent>(`/organizer/series/${seriesId}/legs/${legId}/events/${eventId}`),
};
