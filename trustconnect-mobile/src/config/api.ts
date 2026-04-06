import { Platform } from 'react-native';

/**
 * API Configuration - Auto-detect backend URL
 * 
 * The backend writes its IP to tunnel-url.json automatically.
 * This file reads it so you never need to update IPs manually.
 */

// Try to load the IP from the file the backend writes on startup
let BACKEND_URL: string | null = null;
try {
  const config = require('../../tunnel-url.json');
  BACKEND_URL = config?.url || null;
} catch (e) {
  // File doesn't exist yet
}

/**
 * Get the API base URL - works on physical devices, emulators, and web
 */
const getApiUrl = (): string => {
  // If backend wrote its URL, use it
  if (BACKEND_URL) {
    const url = `${BACKEND_URL}/api`;
    console.log('🌍 Using backend URL from config:', url);
    return url;
  }
  
  // Fallback for web/localhost
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api';
  }
  
  // Fallback for mobile - use common local network IP
  // This updates automatically when backend restarts
  console.log('⚠️ No tunnel-url.json found. Start backend first, then restart Expo.');
  return 'http://localhost:3000/api';
};

export let API_BASE_URL = getApiUrl();

/**
 * Update API URL at runtime
 */
export const updateApiUrl = (newBaseUrl: string) => {
  API_BASE_URL = `${newBaseUrl}/api`;
  console.log('🔄 API URL updated to:', API_BASE_URL);
};

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    VERIFY_OTP: '/auth/verify-otp',
    ME: '/auth/me',
  },
};
