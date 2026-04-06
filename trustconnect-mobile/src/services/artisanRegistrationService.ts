import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { getPendingReferral, clearPendingReferral } from './referralService';

console.log('🚀 Artisan Registration Service - API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    // const token = await getStoredToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — passes the raw axios error through so callers
// can inspect error.response.status / error.response.data for smart retry logic.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const data   = error.response.data;
      console.error(`[API ${status}]`, JSON.stringify(data));
    } else if (error.request) {
      console.error('[API] Network error – no response received');
    } else {
      console.error('[API] Request setup error:', error.message);
    }
    // IMPORTANT: reject with the original error so .response is preserved
    return Promise.reject(error);
  }
);

export interface RegistrationPayload {
  phone: string;
  email?: string;
  password: string;
  agreedToTerms: boolean;
  idType: 'NIN' | 'BVN';
  idNumber: string;
  fullName: string;
  selfieUrl: string;
  idDocumentUrl: string;
  primaryTrade: string;
  yearsExperience: string;
  workshopAddress: string;
  workLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  portfolioPhotos: string[];
  bankName: string;
  accountNumber: string;
  accountName: string;
  trustAccepted: boolean;
}

export const ArtisanRegistrationService = {
  /**
   * Send OTP to phone number - calls real backend
   */
  async sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('📤 Sending OTP to:', phone);
      const response = await api.post('/auth/send-otp', { phone });
      return { 
        success: true, 
        message: response.data.data?.otpMock 
          ? `OTP sent! Use ${response.data.data.otpMock} for testing.`
          : response.data.message || 'OTP sent successfully' 
      };
    } catch (error: any) {
      console.error('❌ Send OTP error:', error);
      throw error;
    }
  },

  /**
   * Verify OTP code - calls real backend
   */
  async verifyOTP(phone: string, otp: string): Promise<{ success: boolean; token: string }> {
    try {
      console.log('🔐 Verifying OTP for:', phone);
      const response = await api.post('/auth/verify-otp', { phone, otp });
      return { 
        success: true, 
        token: response.data.data?.token || response.data.token || 'verified-' + Date.now()
      };
    } catch (error: any) {
      console.error('❌ Verify OTP error:', error);
      throw error;
    }
  },

  /**
   * Verify NIN or BVN - calls real backend
   * Returns legalName from real API, or manualEntry:true if API unavailable
   */
  async verifyID(
    idType: 'NIN' | 'BVN',
    idNumber: string
  ): Promise<{ success: boolean; legalName: string; manualEntry?: boolean; message?: string }> {
    try {
      console.log('🆔 Verifying', idType, ':', idNumber);
      const response = await api.post('/verification/verify-id', { idType, idNumber });
      return response.data;
    } catch (error: any) {
      console.error('❌ Verify ID error:', error);
      // If endpoint not reachable, allow manual entry
      if (idNumber && idNumber.length >= 10) {
        console.log('⚠️ ID verification endpoint not available, allowing manual entry');
        return {
          success: true,
          legalName: '',
          manualEntry: true,
          message: `Auto-verification unavailable. Please enter your full legal name as it appears on your ${idType}.`,
        };
      }
      throw error;
    }
  },

  /**
   * Upload selfie image - calls real backend or stores locally
   */
  async uploadSelfie(imageUri: string, idNumber: string): Promise<{ success: boolean; url: string }> {
    try {
      console.log('📸 Uploading selfie');
      const formData = new FormData();
      formData.append('selfie', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'selfie.jpg',
      } as any);
      formData.append('idNumber', idNumber);

      const response = await api.post('/verification/upload-selfie', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Upload selfie error:', error);
      // If upload endpoint not available, use local URI
      console.log('⚠️ Using local image URI as fallback');
      return { success: true, url: imageUri };
    }
  },

  /**
   * Upload portfolio photos - calls real backend or stores locally
   */
  async uploadPortfolioPhotos(photos: string[]): Promise<{ success: boolean; urls: string[] }> {
    try {
      console.log('📷 Uploading', photos.length, 'portfolio photos');
      const formData = new FormData();
      photos.forEach((photo, index) => {
        formData.append('photos', {
          uri: photo,
          type: 'image/jpeg',
          name: `portfolio_${index}.jpg`,
        } as any);
      });

      const response = await api.post('/artisan/upload-portfolio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Upload portfolio error:', error);
      // If upload endpoint not available, use local URIs
      console.log('⚠️ Using local image URIs as fallback');
      return { success: true, urls: photos };
    }
  },

  /**
   * Verify bank account - calls Flutterwave bank resolve via backend
   * Passes ninName so backend can compare NIN name vs bank account name
   */
  async verifyBankAccount(
    bankName: string,
    accountNumber: string,
    ninName?: string
  ): Promise<{
    success: boolean;
    accountName: string;
    manualEntry?: boolean;
    nameMatch?: boolean | null;
    message?: string;
  }> {
    try {
      console.log('🏦 Verifying bank account:', bankName, accountNumber);
      const response = await api.post('/payment/verify-account', {
        bankName,
        accountNumber,
        ninName,
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Verify bank account error:', error);
      // If payment endpoint not available, allow manual entry
      if (accountNumber && accountNumber.length === 10) {
        console.log('⚠️ Bank verification endpoint not available, allowing manual entry');
        return {
          success: true,
          accountName: '',
          manualEntry: true,
          nameMatch: null,
          message: 'Auto-verification unavailable. Please confirm your account name.',
        };
      }
      throw error;
    }
  },

  /**
   * Submit complete artisan registration - calls real backend
   * Handles 409 "already exists" by logging in instead, then completing the profile.
   */
  async submitRegistration(data: RegistrationPayload): Promise<{
    success: boolean;
    message: string;
    artisanId: string;
    token?: string;
    user?: any;
  }> {
    try {
      console.log('📝 Submitting artisan registration...');

      let token: string | undefined;
      let userId: string | undefined;
      let user: any;

      // Step 1: Try to register the user account
      const pendingReferralCode = await getPendingReferral();
      try {
        const registerResponse = await api.post('/auth/register', {
          phone: data.phone,
          password: data.password,
          name: data.fullName,
          role: 'artisan',
          ...(pendingReferralCode ? { referralCode: pendingReferralCode } : {}),
        });

        console.log('✅ User account created');
        const resData = registerResponse.data.data || registerResponse.data;
        token  = resData.token;
        userId = resData.user?.id || resData.userId;
        user   = resData.user;
        await clearPendingReferral(); // Applied — clear it
      } catch (regError: any) {
        const status = regError?.response?.status ?? regError?.status;
        const msg    = regError?.response?.data?.message || regError.message || '';

        // If user already exists, login with their credentials instead
        if (status === 409 || msg.includes('already exists')) {
          console.log('ℹ️ User already exists – logging in instead…');
          try {
            const loginResponse = await api.post('/auth/login', {
              phone: data.phone,
              password: data.password,
              role: 'artisan',
            });

            console.log('✅ Logged in existing user');
            const loginData = loginResponse.data.data || loginResponse.data;
            token  = loginData.token;
            userId = loginData.user?.id || loginData.userId;
            user   = loginData.user;
          } catch (loginError: any) {
            const loginMsg = loginError?.response?.data?.message || loginError.message || '';
            if (loginMsg.includes('Incorrect password') || loginMsg.includes('password')) {
              throw new Error(
                'Wrong password. An account already exists for this phone number but the password is incorrect.\n\n' +
                'Please go back to Step 1 and enter the correct password, or use the Login screen instead.'
              );
            }
            throw new Error(
              'This phone number is already registered. Please use the Login screen to sign in.'
            );
          }

          // Login succeeded — check if artisan profile is already complete
          if (token) {
            try {
              const profileCheck = await api.get('/artisan/profile', {
                headers: { Authorization: `Bearer ${token}` },
              });
              const existingProfile = profileCheck.data;
              if (existingProfile?.id || existingProfile?.userId) {
                console.log('✅ Artisan profile already exists, skipping re-registration');
                return {
                  success: true,
                  message:
                    existingProfile.verificationStatus === 'verified'
                      ? 'Welcome back! Your account is already verified.'
                      : 'Your registration is already submitted and under review.',
                  artisanId: String(existingProfile.id || userId || 'artisan-' + Date.now()),
                  token,
                  user,
                };
              }
            } catch (_profileErr) {
              // No profile yet — proceed to complete registration below
              console.log('ℹ️ No existing profile found, will complete registration');
            }
          }
        } else {
          // Some other registration error – re-throw
          throw regError;
        }
      }

      if (!token) {
        console.warn('⚠️ No token received from registration/login');
      }

      // Step 2: Complete the artisan profile (requires Bearer token)
      const response = await api.post('/artisan/registration/complete', {
        userId,
        idType: data.idType,
        idNumber: data.idNumber,
        selfieUrl: data.selfieUrl || 'placeholder-selfie',
        idDocumentUrl: data.idDocumentUrl || data.selfieUrl || 'placeholder-doc',
        fullName: data.fullName,
        primaryTrade: data.primaryTrade,
        yearsExperience: data.yearsExperience,
        workshopAddress: data.workLocation?.address || data.workshopAddress || '',
        portfolioPhotos: data.portfolioPhotos || [],
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        accountName: data.accountName,
        trustAccepted: data.trustAccepted,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      console.log('✅ Artisan profile completed');

      return {
        success: true,
        message: 'Registration completed successfully',
        artisanId: response.data.profile?.id || userId || 'artisan-' + Date.now(),
        token,
        user,
      };
    } catch (error: any) {
      console.error('❌ Submit registration error:', error?.response?.data || error.message);
      // Provide clearer, user-friendly error messages
      const raw = error?.response?.data?.message || error.message || '';

      if (raw.includes('already exists')) {
        throw new Error(
          'You already have an account with this phone number.\n\n' +
          'Please go back and login from the main screen instead.'
        );
      } else if (raw.includes('Network') || raw.includes('timeout') || raw.includes('ECONNREFUSED')) {
        throw new Error(
          'Unable to reach the server. Please check your internet connection and try again.'
        );
      } else if (raw.includes('Incorrect password') || raw.includes('password')) {
        throw new Error(
          'The password you entered does not match your existing account.\n\n' +
          'Please go back to Step 1 and correct it, or login from the main screen.'
        );
      }

      throw new Error(raw || 'Registration failed. Please try again.');
    }
  },
};

export default ArtisanRegistrationService;
