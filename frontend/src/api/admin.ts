import apiClient from './client';

export const adminApi = {
  getPendingOrganizations: async () => {
    const response = await apiClient.get('/admin/organizations/pending');
    return response.data;
  },

  getAllOrganizations: async () => {
    const response = await apiClient.get('/admin/organizations/all');
    return response.data;
  },

  approveOrganization: async (orgId: string) => {
    const response = await apiClient.post(`/admin/organizations/${orgId}/approve`);
    return response.data;
  },

  rejectOrganization: async (orgId: string) => {
    const response = await apiClient.post(`/admin/organizations/${orgId}/reject`);
    return response.data;
  },
};