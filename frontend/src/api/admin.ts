import apiClient from './client';

export interface UserResponse {
  id: string;
  email: string;
  user_type: string;
  is_verified: boolean;
  is_active: boolean;
  approval_status: string;
  auth_provider: string;
  individual_profile?: {
    display_name: string;
    bio?: string;
    interests?: string[];
    profile_image?: string;
    country?: string;
    city?: string;
  };
  organization_profile?: {
    name: string;
    description: string;
    contact_email: string;
    website?: string;
    areas_of_focus?: string[];
    logo?: string;
    social_links?: Record<string, string>;
    country?: string;
    city?: string;
  };
  created_at: string;
  is_disabled: boolean;
  disable_reason?: string;
  disable_count: number;
}

export interface AppealResponse {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  appeal_message: string;
  disable_reason: string;
  disable_instance: number;
  status: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_response?: string;
}

export const adminApi = {
  // Organization management
  getPendingOrganizations: async (): Promise<UserResponse[]> => {
    const response = await apiClient.get('/admin/organizations/pending');
    return response.data;
  },

  getAllOrganizations: async (): Promise<UserResponse[]> => {
    const response = await apiClient.get('/admin/organizations/all');
    return response.data;
  },

  approveOrganization: async (orgId: string): Promise<UserResponse> => {
    const response = await apiClient.post(`/admin/organizations/${orgId}/approve`);
    return response.data;
  },

  rejectOrganization: async (orgId: string): Promise<UserResponse> => {
    const response = await apiClient.post(`/admin/organizations/${orgId}/reject`);
    return response.data;
  },

  // User management
  getAllUsers: async (): Promise<UserResponse[]> => {
    const response = await apiClient.get('/admin/users');
    return response.data;
  },

  disableUser: async (userId: string, reason: string): Promise<UserResponse> => {
    const response = await apiClient.post(`/admin/users/${userId}/disable`, { reason });
    return response.data;
  },

  // Appeals management
  getAllAppeals: async (status?: string): Promise<AppealResponse[]> => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/admin/appeals', { params });
    return response.data;
  },

  approveAppeal: async (appealId: string, adminResponse?: string): Promise<AppealResponse> => {
    const response = await apiClient.post(`/admin/appeals/${appealId}/approve`, { 
      admin_response: adminResponse 
    });
    return response.data;
  },

  denyAppeal: async (appealId: string, adminResponse?: string): Promise<AppealResponse> => {
    const response = await apiClient.post(`/admin/appeals/${appealId}/deny`, { 
      admin_response: adminResponse 
    });
    return response.data;
  },
};

// Non-authenticated appeal submission (for disabled users trying to login)
export const submitAppeal = async (email: string, appealMessage: string): Promise<AppealResponse> => {
  const response = await apiClient.post(`/appeals/submit?email=${encodeURIComponent(email)}`, {
    appeal_message: appealMessage
  });
  return response.data;
};
