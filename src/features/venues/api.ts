import { api } from '@/lib/axios';

export const venuesApi = {
  getVenues: () => api.get('/venues'),
  getVenueById: (id: string) => api.get(`/venues/${id}`),
  createVenue: <T>(data: T) => api.post('/venues', data),
  updateVenue: <T>(id: string, data: T) => api.patch(`/venues/${id}`, data),
  deleteVenue: (id: string) => api.delete(`/venues/${id}`),

  addCourt: <T>(id: string, data: T) => api.post(`/venues/${id}/courts`, data),
  deleteCourt: (id: string, courtId: string) => api.delete(`/venues/${id}/courts/${courtId}`),
};
