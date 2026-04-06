import axios from 'axios';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { API_BASE_URL } from '../config/api';

export interface Artisan {
  id: string;
  name: string;
  trade: string;
  photo: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  badge?: 'gold' | 'silver' | 'bronze';
  startingPrice: number;
  distance?: number;
}

export interface ActiveJob {
  id: string;
  artisanName: string;
  trade: string;
  status: 'pending' | 'accepted' | 'on-the-way' | 'in-progress' | 'completed';
  artisanLocation?: { latitude: number; longitude: number };
  estimatedArrival?: string;
}

export interface CustomerProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatar?: string;
  isVerified: boolean;
  joinDate: string;
  trustScore: number;
  walletBalance: number;
  escrowAmount: number;
  location?: string;
}

export interface TransactionHistory {
  id: string;
  type: 'deposit' | 'payment' | 'refund' | 'escrow-hold' | 'escrow-release';
  amount: number;
  date: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  last4: string;
  brand?: string;
  bankName?: string;
  isDefault: boolean;
}

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface FavoriteArtisan {
  id: string;
  artisanId: string;
  name: string;
  trade: string;
  photo: string;
  rating: number;
  lastUsed: string;
}

// Get top-rated artisans near user
export const getTopRatedArtisans = async (
  latitude: number,
  longitude: number,
  limit: number = 10
): Promise<Artisan[]> => {
  try {
    console.log('🔍 Fetching top-rated artisans from API...');
    const response = await axios.get(`${API_BASE_URL}/artisan/top-rated`, {
      params: { latitude, longitude, limit },
      timeout: 10000,
    });
    console.log('✅ Got artisans from API:', response.data.artisans?.length || 0);
    return response.data.artisans || [];
  } catch (error: any) {
    console.error('Error fetching artisans:', error.message);
    return []; // Return empty instead of crashing
  }
};

// Search for artisans
export const searchArtisans = async (
  query: string,
  location?: { latitude: number; longitude: number }
): Promise<Artisan[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/artisan/search`, {
      params: { query, ...location },
      timeout: 10000,
    });
    return response.data.artisans || [];
  } catch (error: any) {
    console.error('Error searching artisans:', error.message);
    return [];
  }
};

// Get active jobs for customer
export const getActiveJobs = async (customerId: string): Promise<ActiveJob[]> => {
  try {
    console.log('📋 Fetching active jobs...');
    const response = await axios.get(`${API_BASE_URL}/customer/${customerId}/jobs/active`, { timeout: 10000 });
    return response.data.jobs || response.data || [];
  } catch (error: any) {
    console.error('Error fetching active jobs:', error.message);
    return [];
  }
};

// Get wallet balance
export const getWalletBalance = async (customerId: string): Promise<number> => {
  try {
    console.log('💰 Fetching wallet balance...');
    const response = await axios.get(`${API_BASE_URL}/customer/${customerId}/wallet/balance`, { timeout: 10000 });
    return response.data.balance || 0;
  } catch (error: any) {
    console.error('Error fetching wallet:', error.message);
    return 0;
  }
};

// Get customer profile
export const getCustomerProfile = async (customerId: string): Promise<CustomerProfile> => {
  try {
    console.log('👤 Fetching customer profile...');
    const response = await axios.get(`${API_BASE_URL}/customer/${customerId}/profile`, { timeout: 10000 });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching profile:', error.message);
    // Return minimal profile so app doesn't crash
    return {
      id: customerId,
      fullName: 'User',
      email: '',
      phone: '',
      isVerified: false,
      joinDate: new Date().toISOString(),
      trustScore: 0,
      walletBalance: 0,
      escrowAmount: 0,
      location: '',
    };
  }
};

// Get transaction history
export const getTransactionHistory = async (
  customerId: string,
  limit: number = 20
): Promise<TransactionHistory[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/customer/${customerId}/transactions`, {
      params: { limit },
      timeout: 10000,
    });
    return response.data || [];
  } catch (error: any) {
    console.error('Error fetching transactions:', error.message);
    return [];
  }
};

// Get payment methods
export const getPaymentMethods = async (customerId: string): Promise<PaymentMethod[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/customer/${customerId}/payment-methods`, { timeout: 10000 });
    return response.data || [];
  } catch (error: any) {
    console.error('Error fetching payment methods:', error.message);
    return [];
  }
};

// Get saved addresses
export const getSavedAddresses = async (customerId: string): Promise<SavedAddress[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/customer/${customerId}/addresses`, { timeout: 10000 });
    return response.data || [];
  } catch (error: any) {
    console.error('Error fetching addresses:', error.message);
    return [];
  }
};

// Get favorite artisans
export const getFavoriteArtisans = async (customerId: string): Promise<FavoriteArtisan[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/customer/${customerId}/favorites`, { timeout: 10000 });
    return response.data || [];
  } catch (error: any) {
    console.error('Error fetching favorites:', error.message);
    return [];
  }
};

// Upload profile picture
export const uploadProfilePicture = async (customerId: string, imageUri: string): Promise<void> => {
  try {
    // Convert local device URI to base64 data URI so the backend can store it properly
    let avatar = imageUri;
    if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64' as any,
      });
      avatar = `data:image/jpeg;base64,${base64}`;
    }
    await axios.post(
      `${API_BASE_URL}/customer/${customerId}/profile/picture`,
      { avatar },
      { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
    );
  } catch (error: any) {
    console.error('Error uploading picture:', error.message);
    throw error;
  }
};

export default {
  getTopRatedArtisans,
  searchArtisans,
  getActiveJobs,
  getWalletBalance,
  getCustomerProfile,
  getTransactionHistory,
  getPaymentMethods,
  getSavedAddresses,
  getFavoriteArtisans,
  uploadProfilePicture,
};
