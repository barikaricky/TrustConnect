import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

/**
 * API Client
 * Axios instance with interceptors for token management
 */

class APIClient {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors() {
    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      async (config) => {
        // Try the key used by loginService first, then the SecureStore key as fallback
        const token =
          (await AsyncStorage.getItem('@trustconnect_token')) ||
          (await AsyncStorage.getItem('auth_token'));
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    
    // Response interceptor - Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - clear all storage locations
          await AsyncStorage.multiRemove(['@trustconnect_token', '@trustconnect_user', 'auth_token', 'user_data']);
        }
        return Promise.reject(error);
      }
    );
  }
  
  public getInstance(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new APIClient().getInstance();

// Named alias so `import { api } from './api'` works alongside `apiClient`
export const api = apiClient;
