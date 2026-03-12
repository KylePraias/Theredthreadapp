import axios from 'axios';
import { storage } from '../utils/storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Event emitter for account disabled
type DisabledCallback = (reason: string) => void;
let onAccountDisabled: DisabledCallback | null = null;

export const setOnAccountDisabled = (callback: DisabledCallback | null) => {
  onAccountDisabled = callback;
};

// Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Error getting token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors and disabled accounts
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const errorDetail = error.response?.data?.detail;

    // Handle disabled account (403 with ACCOUNT_DISABLED code)
    if (status === 403 && typeof errorDetail === 'object' && errorDetail.code === 'ACCOUNT_DISABLED') {
      // Clear the token since account is disabled
      await storage.deleteItem('auth_token');
      
      // Notify the app about account being disabled
      if (onAccountDisabled) {
        onAccountDisabled(errorDetail.reason || 'Your account has been disabled');
      }
    }
    
    // Handle 401 - unauthorized (token expired or invalid)
    if (status === 401) {
      await storage.deleteItem('auth_token');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
