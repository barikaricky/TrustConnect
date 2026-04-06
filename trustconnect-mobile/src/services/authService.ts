import { apiClient } from './api';
import { API_ENDPOINTS } from '../config/api';

export interface RegisterData {
  phone: string;
  name: string;
  role: 'customer' | 'artisan';
}

export interface LoginData {
  phone: string;
}

export interface VerifyOTPData {
  phone: string;
  otp: string;
}

export interface User {
  id: number;
  phone: string;
  name: string;
  role: 'customer' | 'artisan';
  verified: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token?: string;
    user?: User;
    userId?: number;
    phone?: string;
    otpMock?: string;
  };
}

/**
 * Authentication Service
 * Handles all auth-related API calls
 */

export class AuthService {
  /**
   * Register new user
   */
  static async register(data: RegisterData): Promise<AuthResponse> {
    try {
      console.log('Registration request:', data);
      const response = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.REGISTER,
        data
      );
      console.log('Registration response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(
        error.response?.data?.message || error.message || 'Registration failed'
      );
    }
  }
  
  /**
   * Login existing user
   */
  static async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        data
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Login failed'
      );
    }
  }
  
  /**
   * Verify OTP and get token
   */
  static async verifyOTP(data: VerifyOTPData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.VERIFY_OTP,
        data
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'OTP verification failed'
      );
    }
  }
  
  /**
   * Get current user info
   */
  static async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<AuthResponse>(
        API_ENDPOINTS.AUTH.ME
      );
      if (!response.data.data.user) {
        throw new Error('User data not found');
      }
      return response.data.data.user;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch user data'
      );
    }
  }
}
