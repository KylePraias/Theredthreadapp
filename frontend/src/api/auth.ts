import apiClient from './client';

export interface IndividualRegisterData {
  email: string;
  password: string;
  display_name: string;
  bio?: string;
  interests?: string[];
}

export interface OrganizationRegisterData {
  email: string;
  password: string;
  name: string;
  description: string;
  contact_email: string;
  website?: string;
  social_links?: Record<string, string>;
  areas_of_focus?: string[];
}

export interface LoginData {
  email: string;
  password: string;
}

export interface GoogleSignInData {
  firebase_uid: string;
  email: string;
  display_name: string;
  profile_image?: string;
}

export interface GoogleOrgSignInData {
  firebase_uid: string;
  email: string;
  name: string;
  description: string;
  contact_email: string;
  website?: string;
  social_links?: Record<string, string>;
  areas_of_focus?: string[];
}

export const authApi = {
  registerIndividual: async (data: IndividualRegisterData) => {
    const response = await apiClient.post('/auth/register/individual', data);
    return response.data;
  },

  registerOrganization: async (data: OrganizationRegisterData) => {
    const response = await apiClient.post('/auth/register/organization', data);
    return response.data;
  },

  verifyEmail: async (email: string, tokenOrCode: string, isOobCode: boolean = false) => {
    const payload = isOobCode 
      ? { email, oob_code: tokenOrCode }
      : { email, token: tokenOrCode };
    const response = await apiClient.post('/auth/verify-email', payload);
    return response.data;
  },

  resendVerification: async (email: string) => {
    const response = await apiClient.post('/auth/resend-verification', { email });
    return response.data;
  },

  checkVerificationStatus: async (email: string) => {
    const response = await apiClient.post('/auth/check-verification', { email });
    return response.data;
  },

  login: async (data: LoginData) => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  googleSignInIndividual: async (data: GoogleSignInData) => {
    const response = await apiClient.post('/auth/google/individual', data);
    return response.data;
  },

  googleSignInOrganization: async (data: GoogleOrgSignInData) => {
    const response = await apiClient.post('/auth/google/organization', data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  // Profile update methods
  updateIndividualProfile: async (data: { display_name?: string; bio?: string }) => {
    const response = await apiClient.patch('/users/me/individual', data);
    return response.data;
  },

  updateOrganizationProfile: async (data: {
    description?: string;
    areas_of_focus?: string[];
    website?: string;
    contact_email?: string;
  }) => {
    const response = await apiClient.patch('/users/me/organization', data);
    return response.data;
  },

  // Bug report
  submitBugReport: async (description: string) => {
    const response = await apiClient.post('/bug-report', { description });
    return response.data;
  },
};