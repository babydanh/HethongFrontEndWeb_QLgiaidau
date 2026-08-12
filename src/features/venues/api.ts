import { api } from '@/lib/axios';
import { ApiResponse } from '@/types/api';

export interface Court {
  id: string;
  venueId: string;
  name: string;
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

export const venuesApi = {
  getVenues: () => api.get<ApiResponse<Venue[]>>('/venues'),
  getVenueById: (id: string) => api.get<ApiResponse<Venue>>(`/venues/${id}`),
  createVenue: <T>(data: T) => api.post<ApiResponse<Venue>>('/venues', data),
  updateVenue: <T>(id: string, data: T) => api.patch<ApiResponse<Venue>>(`/venues/${id}`, data),
  deleteVenue: (id: string) => api.delete<ApiResponse<void>>(`/venues/${id}`),

  addCourt: <T>(id: string, data: T) => api.post<ApiResponse<Court>>(`/venues/${id}/courts`, data),
  deleteCourt: (id: string, courtId: string) => api.delete<ApiResponse<void>>(`/venues/${id}/courts/${courtId}`),
};

