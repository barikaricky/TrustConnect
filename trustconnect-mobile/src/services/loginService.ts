import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

// API URL is now managed centrally in config/api.ts
// It auto-detects the correct URL based on device type and tunnel mode

export interface LoginCredentials {
  phone: string;
  password: string;
  userType: 'customer' | 'artisan' | 'company';
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      phone: string;
      fullName: string;
      email?: string;
      role: 'customer' | 'artisan';
      isVerified: boolean;
    };
  };
}

export interface RegisterCredentials {
  phone: string;
  password: string;
  fullName: string;
  email?: string;
  userType: 'customer' | 'artisan';
}

// Storage keys
const TOKEN_KEY = '@trustconnect_token';
const USER_KEY = '@trustconnect_user';

/**
 * Login with phone and password
 */
export const loginUser = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    console.log('Attempting login to:', `${API_BASE_URL}/auth/login`);
    console.log('Login credentials:', { 
      phone: credentials.phone, 
      userType: credentials.userType,
      passwordLength: credentials.password.length 
    });

    const response = await axios.post<LoginResponse>(
      `${API_BASE_URL}/auth/login`,
      {
        phone: credentials.phone,
        password: credentials.password,
        role: credentials.userType, // Backend expects 'role' field
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    console.log('Login response:', response.data);

    if (response.data.success && response.data.data.token) {
      // Store authentication data
      await AsyncStorage.setItem(TOKEN_KEY, response.data.data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.data.user));
      
      console.log('✅ Login successful, token stored');
      return response.data;
    } else {
      throw new Error(response.data.message || 'Login failed');
    }
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.response) {
      // Server responded with error
      console.error('Server error response:', error.response.data);
      throw new Error(error.response.data.message || 'Invalid credentials');
    } else if (error.request) {
      // Request made but no response
      console.error('No response from server');
      throw new Error('Cannot connect to server. Please check your internet connection.');
    } else {
      // Error in request setup
      throw new Error(error.message || 'Login failed');
    }
  }
};

/**
 * Register new user
 */
export const registerUser = async (credentials: RegisterCredentials): Promise<LoginResponse> => {
  try {
    console.log('Attempting registration to:', `${API_BASE_URL}/auth/register`);
    console.log('Registration data:', { 
      phone: credentials.phone,
      fullName: credentials.fullName,
      email: credentials.email,
      userType: credentials.userType,
    });

    const response = await axios.post<LoginResponse>(
      `${API_BASE_URL}/auth/register`,
      {
        phone: credentials.phone,
        password: credentials.password,
        fullName: credentials.fullName,
        email: credentials.email,
        role: credentials.userType,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('Registration response:', response.data);

    if (response.data.success && response.data.data.token) {
      // Store authentication data
      await AsyncStorage.setItem(TOKEN_KEY, response.data.data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.data.user));
      
      console.log('✅ Registration successful, token stored');
      return response.data;
    } else {
      throw new Error(response.data.message || 'Registration failed');
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.response) {
      console.error('Server error response:', error.response.data);
      throw new Error(error.response.data.message || 'Registration failed');
    } else if (error.request) {
      console.error('No response from server');
      throw new Error('Cannot connect to server. Please check your internet connection.');
    } else {
      throw new Error(error.message || 'Registration failed');
    }
  }
};

/**
 * Get stored authentication token
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Get stored user data
 */
export const getStoredUser = async (): Promise<any | null> => {
  try {
    const userJson = await AsyncStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

/**
 * Clear authentication data (logout)
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    console.log('🔓 Auth data cleared');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getAuthToken();
  return !!token;
};

export default {
  loginUser,
  registerUser,
  getAuthToken,
  getStoredUser,
  clearAuthData,
  isAuthenticated,
};
