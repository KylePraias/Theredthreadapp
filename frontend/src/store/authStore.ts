import { create } from 'zustand';
import { storage } from '../utils/storage';
import { authApi } from '../api/auth';

export interface IndividualProfile {
  display_name: string;
  bio?: string;
  interests?: string[];
  profile_image?: string;
}

export interface OrganizationProfile {
  name: string;
  description: string;
  contact_email: string;
  website?: string;
  social_links?: Record<string, string>;
  areas_of_focus?: string[];
  logo?: string;
}

export interface User {
  id: string;
  email: string;
  user_type: 'individual' | 'organization' | 'admin';
  is_verified: boolean;
  is_active: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  auth_provider: 'email' | 'google';
  individual_profile?: IndividualProfile;
  organization_profile?: OrganizationProfile;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),

  login: async (token, user) => {
    await storage.setItem('auth_token', token);
    set({ token, user, isLoading: false });
  },

  logout: async () => {
    await storage.deleteItem('auth_token');
    set({ token: null, user: null });
  },

  initialize: async () => {
    try {
      const token = await storage.getItem('auth_token');
      if (token) {
        const user = await authApi.getCurrentUser();
        set({ token, user, isLoading: false, isInitialized: true });
      } else {
        set({ isLoading: false, isInitialized: true });
      }
    } catch (error) {
      console.log('Failed to initialize auth:', error);
      await storage.deleteItem('auth_token');
      set({ token: null, user: null, isLoading: false, isInitialized: true });
    }
  },

  refreshUser: async () => {
    try {
      const user = await authApi.getCurrentUser();
      set({ user });
    } catch (error) {
      console.log('Failed to refresh user:', error);
    }
  },
}));