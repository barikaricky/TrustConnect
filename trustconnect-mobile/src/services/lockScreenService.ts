/**
 * Lock Screen Service
 * Manages 6-digit PIN code storage and verification using expo-secure-store
 * PINs are stored encrypted on device — never sent to backend
 */
import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'trustconnect_lock_pin';
const PIN_SET_FLAG = 'trustconnect_pin_set';

/**
 * Store a 6-digit PIN securely on device
 */
export async function savePin(pin: string): Promise<void> {
  if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    throw new Error('PIN must be exactly 6 digits');
  }
  await SecureStore.setItemAsync(PIN_KEY, pin);
  await SecureStore.setItemAsync(PIN_SET_FLAG, 'true');
}

/**
 * Verify a PIN against the stored value
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const storedPin = await SecureStore.getItemAsync(PIN_KEY);
  if (!storedPin) return false;
  return storedPin === pin;
}

/**
 * Check if user has already set a PIN
 */
export async function hasPinSet(): Promise<boolean> {
  const flag = await SecureStore.getItemAsync(PIN_SET_FLAG);
  return flag === 'true';
}

/**
 * Change PIN (requires current PIN verification first)
 */
export async function changePin(currentPin: string, newPin: string): Promise<boolean> {
  const isValid = await verifyPin(currentPin);
  if (!isValid) return false;
  await savePin(newPin);
  return true;
}

/**
 * Clear PIN (used on logout)
 */
export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
  await SecureStore.deleteItemAsync(PIN_SET_FLAG);
}

export default {
  savePin,
  verifyPin,
  hasPinSet,
  changePin,
  clearPin,
};
