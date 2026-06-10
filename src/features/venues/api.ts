import { api } from '@/lib/axios';

export const venuesApi = {
  getVenues: () => api.get('/venues').then(res => res.data),
  getVenueById: (id: string) => api.get(`/venues/${id}`).then(res => res.data),
  createVenue: <T>(data: T) => api.post('/venues', data).then(res => res.data),
  updateVenue: <T>(id: string, data: T) => api.patch(`/venues/${id}`, data).then(res => res.data),
  deleteVenue: (id: string) => api.delete(`/venues/${id}`).then(res => res.data),

  addCourt: <T>(id: string, data: T) => api.post(`/venues/${id}/courts`, data).then(res => res.data),
  deleteCourt: (id: string, courtId: string) => api.delete(`/venues/${id}/courts/${courtId}`).then(res => res.data),
};
