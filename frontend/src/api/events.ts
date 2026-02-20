import apiClient from './client';

export interface EventCreateData {
  name: string;
  description: string;
  contact_email?: string;
  date: string;
  location: string;
}

export interface EventUpdateData {
  name?: string;
  description?: string;
  contact_email?: string;
  date?: string;
  location?: string;
}

export const eventsApi = {
  getEvents: async (sortBy = 'date', sortOrder = 'asc', activeOnly = true) => {
    const response = await apiClient.get('/events', {
      params: { sort_by: sortBy, sort_order: sortOrder, active_only: activeOnly },
    });
    return response.data;
  },

  getEvent: async (eventId: string) => {
    const response = await apiClient.get(`/events/${eventId}`);
    return response.data;
  },

  createEvent: async (data: EventCreateData) => {
    const response = await apiClient.post('/events', data);
    return response.data;
  },

  updateEvent: async (eventId: string, data: EventUpdateData) => {
    const response = await apiClient.put(`/events/${eventId}`, data);
    return response.data;
  },

  deleteEvent: async (eventId: string) => {
    const response = await apiClient.delete(`/events/${eventId}`);
    return response.data;
  },

  getOrganizationEvents: async (orgId: string) => {
    const response = await apiClient.get(`/organizations/${orgId}/events`);
    return response.data;
  },

  rsvpToEvent: async (eventId: string) => {
    const response = await apiClient.post(`/events/${eventId}/rsvp`);
    return response.data;
  },

  cancelRsvp: async (eventId: string) => {
    const response = await apiClient.delete(`/events/${eventId}/rsvp`);
    return response.data;
  },

  getEventRsvps: async (eventId: string) => {
    const response = await apiClient.get(`/events/${eventId}/rsvps`);
    return response.data;
  },

  getMyRsvps: async () => {
    const response = await apiClient.get('/users/me/rsvps');
    return response.data;
  },
};