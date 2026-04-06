import { Alert, Platform } from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

/**
 * Advanced Notification Service
 * - In-app alerts
 * - Expo push notification registration
 * - Backend notification API integration (bell icon, unread count)
 */

export interface AppNotification {
  id: number;
  userId: number;
  title: string;
  body: string;
  type: 'booking' | 'escrow' | 'chat' | 'dispute' | 'system' | 'promotion' | 'review' | 'verification';
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export interface NotificationOptions {
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

/**
 * Show a login notification
 */
export const showLoginNotification = (userName: string) => {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  const dateString = now.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric' 
  });

  // Show alert notification
  Alert.alert(
    '✅ Login Successful',
    `Welcome back, ${userName}!\n\nLogged in at ${timeString}\n${dateString}`,
    [
      {
        text: 'OK',
        style: 'default',
      },
    ],
    { cancelable: true }
  );

  console.log('🔔 Login notification sent:', {
    user: userName,
    time: timeString,
    date: dateString,
  });
};

/**
 * Show a general notification
 */
export const showNotification = ({ title, message, type = 'info' }: NotificationOptions) => {
  const icon = {
    success: '✅',
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
  }[type];

  Alert.alert(
    `${icon} ${title}`,
    message,
    [{ text: 'OK', style: 'default' }],
    { cancelable: true }
  );

  console.log('🔔 Notification:', { title, message, type });
};

/**
 * Show a registration notification
 */
export const showRegistrationNotification = (userName: string) => {
  Alert.alert(
    '🎉 Welcome to TrustConnect!',
    `Hi ${userName}!\n\nYour account has been created successfully. You can now find and hire trusted artisans in your area.`,
    [
      {
        text: 'Get Started',
        style: 'default',
      },
    ],
    { cancelable: true }
  );

  console.log('🔔 Registration notification sent:', userName);
};

/**
 * Show a logout notification
 */
export const showLogoutNotification = () => {
  Alert.alert(
    '👋 Logged Out',
    'You have been logged out successfully. See you soon!',
    [{ text: 'OK', style: 'default' }],
    { cancelable: true }
  );

  console.log('🔔 Logout notification sent');
};

/* ──────── Backend API Integration ────────────────────────────── */

/**
 * Get paginated notifications from backend
 */
export const getNotifications = async (
  userId: number,
  page = 1,
  limit = 30
): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
  total: number;
  page: number;
  totalPages: number;
}> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/notifications/${userId}`, {
      params: { page, limit },
      timeout: 10000,
    });
    return res.data;
  } catch {
    return { notifications: [], unreadCount: 0, total: 0, page: 1, totalPages: 0 };
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (userId: number): Promise<number> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/notifications/unread-count/${userId}`, { timeout: 5000 });
    return res.data.unreadCount || 0;
  } catch {
    return 0;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllRead = async (userId: number): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/notifications/mark-read`, { userId }, { timeout: 5000 });
  } catch (e) {
    console.error('Mark all read error:', e);
  }
};

/**
 * Mark a single notification as read
 */
export const markOneRead = async (notificationId: number): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/notifications/mark-read`, { notificationId }, { timeout: 5000 });
  } catch (e) {
    console.error('Mark read error:', e);
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: number): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/notifications/${notificationId}`, { timeout: 5000 });
  } catch (e) {
    console.error('Delete notification error:', e);
  }
};

/**
 * Register Expo push token with backend
 */
export const registerPushToken = async (userId: number, pushToken: string): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/notifications/register-push`, {
      userId,
      pushToken,
      platform: Platform.OS,
    }, { timeout: 5000 });
    console.log('🔔 Push token registered with backend');
  } catch (e) {
    console.error('Register push token error:', e);
  }
};

/**
 * Initialize Expo push notifications (call once on app startup)
 */
export const initPushNotifications = async (userId: number): Promise<string | null> => {
  try {
    // Dynamic require to avoid crash if expo-notifications is not installed
    let Notifications: any;
    try {
      Notifications = require('expo-notifications');
    } catch {
      console.log('ℹ️ expo-notifications not installed, skipping push setup');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ Push notification permission not granted');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // Register with backend
    await registerPushToken(userId, token);

    // Configure notification channel (Android)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'TrustConnect',
        importance: Notifications.AndroidImportance?.MAX || 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1a237e',
      });
    }

    return token;
  } catch (err) {
    console.error('Init push notifications error:', err);
    return null;
  }
};

export default {
  showLoginNotification,
  showNotification,
  showRegistrationNotification,
  showLogoutNotification,
  getNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
  deleteNotification,
  registerPushToken,
  initPushNotifications,
};
