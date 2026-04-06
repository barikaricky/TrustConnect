import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const PENDING_REFERRAL_KEY = 'trustconnect_pending_referral';

/**
 * Fetch (or generate) the current user's referral code from the backend.
 * @param token  JWT auth token
 */
export async function getMyReferralCode(token: string): Promise<{ code: string; link: string } | null> {
  try {
    const response = await axios.get(`${API_BASE_URL}/referral/my-code`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    if (response.data.success) {
      return { code: response.data.code, link: response.data.link };
    }
    return null;
  } catch (error) {
    console.error('getMyReferralCode error:', error);
    return null;
  }
}

/**
 * Validate a referral code entered by a new user before registration.
 * Returns the referrer's name if valid.
 */
export async function validateReferralCode(code: string): Promise<{ valid: boolean; referrerName?: string; message?: string }> {
  try {
    const response = await axios.get(`${API_BASE_URL}/referral/validate/${code.toUpperCase()}`, {
      timeout: 8000,
    });
    if (response.data.success) {
      return { valid: true, referrerName: response.data.referrerName, message: response.data.message };
    }
    return { valid: false };
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return { valid: false, message: 'Invalid referral code' };
    }
    console.error('validateReferralCode error:', error);
    return { valid: false, message: 'Could not validate code' };
  }
}

/**
 * Build the shareable invite link string.
 */
export function buildReferralLink(code: string): string {
  return `https://trustconnect.ng/invite/${code}`;
}

/**
 * Open the native Share sheet with the referral invite message.
 * @param code          The user's referral code
 * @param category      Optional artisan category context for the invite text
 */
export async function shareReferralLink(code: string, category?: string): Promise<void> {
  const link = buildReferralLink(code);
  const artisanType = category && category !== 'All' ? category.toLowerCase() : 'skilled artisan';
  const message =
    `Need a reliable ${artisanType}? I found a great one on TrustConnect! ` +
    `Use my invite link to sign up and we both get 10% off our first job. 🎉\n\n${link}`;

  await Share.share(
    { message, url: link, title: 'Invite to TrustConnect' },
    { dialogTitle: 'Invite a friend to TrustConnect' }
  );
}

/**
 * Store a pending referral code (before the new user has registered).
 * Called when someone taps a referral link.
 */
export async function storePendingReferral(code: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_REFERRAL_KEY, code.toUpperCase());
}

/**
 * Retrieve the pending referral code (used during registration).
 */
export async function getPendingReferral(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_REFERRAL_KEY);
}

/**
 * Clear the pending referral after successful registration.
 */
export async function clearPendingReferral(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
}
