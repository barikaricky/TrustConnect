import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Secure Storage Utility
 * Uses Expo SecureStore for native, localStorage for web
 */

const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
};

const isWeb = Platform.OS === 'web';

export class SecureStorage {
  /**
   * Save auth token securely
   */
  static async saveToken(token: string): Promise<void> {
    try {
      if (isWeb) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      } else {
        await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
      }
    } catch (error) {
      console.error('Error saving token:', error);
      throw new Error('Failed to save authentication token');
    }
  }
  
  /**
   * Get auth token
   */
  static async getToken(): Promise<string | null> {
    try {
      if (isWeb) {
        return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      } else {
        return await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      }
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }
  
  /**
   * Delete auth token
   */
  static async deleteToken(): Promise<void> {
    try {
      if (isWeb) {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      } else {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      }
    } catch (error) {
      console.error('Error deleting token:', error);
    }
  }
  
  /**
   * Save user data securely
   */
  static async saveUserData(userData: any): Promise<void> {
    try {
      if (isWeb) {
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      } else {
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Error saving user data:', error);
      throw new Error('Failed to save user data');
    }
  }
  
  /**
   * Get user data
   */
  static async getUserData(): Promise<any | null> {
    try {
      if (isWeb) {
        const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        return data ? JSON.parse(data) : null;
      } else {
        const data = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
        return data ? JSON.parse(data) : null;
      }
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }
  
  /**
   * Delete user data
   */
  static async deleteUserData(): Promise<void> {
    try {
      if (isWeb) {
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      } else {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      }
    } catch (error) {
      console.error('Error deleting user data:', error);
    }
  }
  
  /**
   * Clear all stored data
   */
  static async clearAll(): Promise<void> {
    await this.deleteToken();
    await this.deleteUserData();
  }
}

/**
 * Generic storage helpers (web + native)
 */
export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};
