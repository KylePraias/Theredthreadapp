import { create } from 'zustand';
import { storage } from '../utils/storage';
import { authApi } from '../api/auth';
import { setOnAccountDisabled } from '../api/client';

export interface IndividualProfile {
  display_name: string;
  bio?: string;
  interests?: string[];
  profile_image?: string;
  country?: string;
  city?: string;
}

export interface OrganizationProfile {
  name: string;
  description: string;
  contact_email: string;
  website?: string;
  social_links?: Record<string, string>;
  areas_of_focus?: string[];
  logo?: string;
  country?: string;
  city?: string;
}

export interface User {
  id: string;
  email: string;
  user_type: 'individual' | 'organization' | 'admin' | 'developer';
  is_verified: boolean;
  is_active: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  auth_provider: 'email' | 'google';
  individual_profile?: IndividualProfile;
  organization_profile?: OrganizationProfile;
  created_at: string;
  is_disabled?: boolean;
  disable_reason?: string;
  disable_count?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  isLoggingOut: boolean;
  disabledReason: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshUser: () => Promise<void>;
  handleAccountDisabled: (reason: string) => void;
  clearDisabledReason: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isInitialized: false,
  isLoggingOut: false,
  disabledReason: null,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),

  login: async (token, user) => {
    await storage.setItem('auth_token', token);
    set({ token, user, isLoading: false, isLoggingOut: false, disabledReason: null });
  },

  logout: async () => {
    set({ isLoggingOut: true });
    await storage.deleteItem('auth_token');
    set({ token: null, user: null, isLoggingOut: false });
  },

  handleAccountDisabled: (reason: string) => {
    // This is called when the API returns ACCOUNT_DISABLED
    // It will log out the user and store the reason
    set({ 
      token: null, 
      user: null, 
      disabledReason: reason,
      isLoggingOut: false 
    });
  },

  clearDisabledReason: () => {
    set({ disabledReason: null });
  },

  initialize: async () => {
    const { handleAccountDisabled } = get();
    
    // Set up the callback for when account is disabled
    setOnAccountDisabled((reason) => {
      handleAccountDisabled(reason);
    });

    set({ isLoggingOut: false });
    try {
      const token = await storage.getItem('auth_token');
      if (token) {
        const user = await authApi.getCurrentUser();
        set({ token, user, isLoading: false, isInitialized: true });
      } else {
        set({ isLoading: false, isInitialized: true });
      }
    } catch (error: any) {
      console.log('Failed to initialize auth:', error);
      
      // Check if the error is due to disabled account
      const errorDetail = error.response?.data?.detail;
      if (typeof errorDetail === 'object' && errorDetail.code === 'ACCOUNT_DISABLED') {
        handleAccountDisabled(errorDetail.reason || 'Your account has been disabled');
      }
      
      await storage.deleteItem('auth_token');
      set({ token: null, user: null, isLoading: false, isInitialized: true });
    }
  },

  refreshUser: async () => {
    try {
      const user = await authApi.getCurrentUser();
      set({ user });
    } catch (error: any) {
      console.log('Failed to refresh user:', error);
      
      // Check if the error is due to disabled account
      const errorDetail = error.response?.data?.detail;
      if (typeof errorDetail === 'object' && errorDetail.code === 'ACCOUNT_DISABLED') {
        get().handleAccountDisabled(errorDetail.reason || 'Your account has been disabled');
      }
    }
  },
}));
