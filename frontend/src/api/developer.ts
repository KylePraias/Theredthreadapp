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
  };
  organization_profile?: {
    name: string;
    description: string;
    contact_email: string;
    website?: string;
    areas_of_focus?: string[];
  };
  created_at: string;
}

export interface SearchUsersResponse {
  users: UserResponse[];
  total: number;
}

export const developerApi = {
  searchUsers: async (query: string): Promise<SearchUsersResponse> => {
    const response = await apiClient.get('/developer/users/search', {
      params: { query },
    });
    return response.data;
  },

  getAllUsers: async (): Promise<UserResponse[]> => {
    const response = await apiClient.get('/developer/users/all');
    return response.data;
  },

  assignUserRole: async (userId: string, role: 'admin' | 'individual'): Promise<UserResponse> => {
    const response = await apiClient.post(`/developer/users/${userId}/assign-role`, {
      user_id: userId,
      role,
    });
    return response.data;
  },
};
