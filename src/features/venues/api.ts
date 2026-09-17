import { api } from '@/lib/axios';
import { ApiResponse } from '@/types/api';

export interface Court {
  id: string;
  venueId: string;
  courtName: string;
  /** Legacy API alias; new code must prefer courtName. */
  name?: string;
  status: string;
  description?: string;
}

export interface Venue {
  id: string;
  name: string;
  locationAddress: string;
  description?: string;
  city?: string;
  district?: string;
  ward?: string;
  images?: string[];
  lat?: number;
  lng?: number;
  courts?: Court[];
}

export type VenueOption = Pick<Venue, 'id' | 'name' | 'locationAddress'>;
export type VenueCourtOption = Court;

export const venuesApi = {
  // Existing organizer/manage consumers use the Axios response shape.
  getVenues: () => api.get<ApiResponse<Venue[]>>('/venues'),
  getVenueById: (id: string) => api.get<ApiResponse<Venue>>(`/venues/${id}`),
  createVenue: <T>(data: T) => api.post<ApiResponse<Venue>>('/venues', data),
  updateVenue: <T>(id: string, data: T) => api.patch<ApiResponse<Venue>>(`/venues/${id}`, data),
  deleteVenue: (id: string) => api.delete<ApiResponse<void>>(`/venues/${id}`),

  addCourt: <T>(id: string, data: T) => api.post<ApiResponse<Court>>(`/venues/${id}/courts`, data),
  deleteCourt: (id: string, courtId: string) => api.delete<ApiResponse<void>>(`/venues/${id}/courts/${courtId}`),

  // Lightweight helpers for the public personal-match form.
  list: (params?: { search?: string; limit?: number }) =>
    api
      .get<ApiResponse<VenueOption[]>>('/venues', { params })
      .then((response) => response.data),
  get: (id: string) =>
    api
      .get<ApiResponse<Venue>>(`/venues/${id}`)
      .then((response) => response.data),
};
