import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, ScrollView, ActivityIndicator,
  Pressable, RefreshControl, Platform, Alert, Image, Switch, Dimensions,
  Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn, SlideInRight, ZoomIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '../config/theme';
import { ArtisanService, ArtisanProfile } from '../services/artisanService';
import { submitBookingQuote } from '../services/bookingService';
import { useAuth } from '../services/AuthContext';
import { API_BASE_URL } from '../config/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GOLD = '#FFC107';
const GOLD_DARK = '#FFA000';
const GOLD_LIGHT = '#FFD54F';
const NAVY = '#1a237e';
const NAVY_LIGHT = '#283593';
const NAVY_DARK = '#0d1642';
const SUCCESS = '#4CAF50';
const WARNING = '#FF9800';
const DANGER = '#F44336';
const INFO = '#2196F3';
const PURPLE = '#7C4DFF';

type BottomTab = 'dashboard' | 'jobs' | 'messages' | 'wallet' | 'profile';
type JobFilter = 'all' | 'pending' | 'active' | 'completed';

interface BookingItem {
  id: number;
  customerName: string;
  customerPhone?: string;
  service: string;
  serviceType?: string;
  description?: string;
  status: string;
  scheduledDate: string;
  scheduledTime?: string;
  amount: number;
  estimatedPrice?: number;
  location: string | { address?: string; latitude?: number; longitude?: number };
  distance?: number;
  createdAt?: string;
}

interface EarningsData {
  totalEarnings: number;
  thisMonth: number;
  pendingPayment: number;
  completedJobs: number;
}

const BG   = '#F0F2F8';

// ─── STATUS FLOW ────────────────────────────────────────────────────
// accepted/confirmed → artisan must submit a quote (handled by quote modal, NOT a direct status transition)
// funded            → artisan can now head to the job
const STATUS_ACTIONS: Record<string, { next: string; label: string; icon: string; color: string }> = {
  funded:       { next: 'on-the-way', label: 'On My Way',  icon: 'car-outline',           color: INFO    },
  'on-the-way': { next: 'in-progress', label: 'Start Job', icon: 'wrench-outline',          color: PURPLE  },
  'in_progress': { next: 'job-done',  label: 'Job Done',   icon: 'check-circle-outline',   color: SUCCESS },
  'in-progress': { next: 'job-done',  label: 'Job Done',   icon: 'check-circle-outline',   color: SUCCESS },
};

// ─── FLOATING ORB DECORATION ────────────────────────────────────────
const FloatingOrb = ({ size, color, style }: { size: number; color: string; style?: object }) => (
  <View
    pointerEvents="none"
    style={[
      { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      style,
    ]}
  />
);

export default function ArtisanHomeScreen() {
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState<ArtisanProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarnings: 0, thisMonth: 0, pendingPayment: 0, completedJobs: 0,
  });
  const [bottomTab, setBottomTab] = useState<BottomTab>('dashboard');
  const [jobFilter, setJobFilter] = useState<JobFilter>('all');
  const [rating, setRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isAvailable, setIsAvailable] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // ── Quote modal state ──
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [quoteBookingId, setQuoteBookingId] = useState<number | null>(null);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteWorkDetails, setQuoteWorkDetails] = useState('');
  const [quoteEstimatedDays, setQuoteEstimatedDays] = useState('');
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);

  // ── Work Proof modal state ──
  const [wpModalVisible, setWpModalVisible] = useState(false);
  const [wpBookingId, setWpBookingId] = useState<number | null>(null);
  const [wpPhotos, setWpPhotos] = useState<string[]>([]);
  const [wpSubmitting, setWpSubmitting] = useState(false);
  const [wpUploading, setWpUploading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Refresh bookings every time the user switches to the Jobs tab
  useEffect(() => {
    if (bottomTab === 'jobs') {
      loadDashboardData();
    }
  }, [bottomTab]);

  const loadDashboardData = async () => {
    try {
      const profileData = await ArtisanService.getProfile();
      setProfile(profileData);

      const token = await AsyncStorage.getItem('@trustconnect_token');
      const userData = await AsyncStorage.getItem('@trustconnect_user');
      const userId = userData ? JSON.parse(userData).id : null;

      if (userId && token) {
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch bookings
        try {
          const bookingsRes = await axios.get(
            `${API_BASE_URL}/booking/artisan/${userId}/bookings`,
            { headers, timeout: 8000 }
          );
          // Backend returns { bookings: [...] } (no success wrapper)
          const bdata = bookingsRes.data.bookings || bookingsRes.data.data || [];
          if (bdata.length >= 0) {
            setBookings(bdata);
            const completed = bdata.filter((b: any) => b.status === 'completed' || b.status === 'released');
            const total = completed.reduce((sum: number, b: any) => sum + (b.amount || b.estimatedPrice || 0), 0);
            const inProgress = bdata.filter((b: any) =>
              ['accepted', 'confirmed', 'on-the-way', 'in_progress', 'in-progress', 'job-done', 'funded'].includes(b.status)
            );
            setEarnings({
              totalEarnings: total,
              thisMonth: total * 0.4,
              pendingPayment: inProgress.reduce((sum: number, b: any) => sum + (b.amount || b.estimatedPrice || 0), 0),
              completedJobs: completed.length,
            });
          }
        } catch (e) {
          console.log('Bookings fetch skipped:', e);
        }

        // Fetch reviews/rating
        try {
          const reviewsRes = await axios.get(
            `${API_BASE_URL}/booking/artisan/${userId}/reviews`,
            { headers, timeout: 8000 }
          );
          if (reviewsRes.data.success && reviewsRes.data.data) {
            const reviews = reviewsRes.data.data;
            setReviewCount(reviews.length);
            if (reviews.length > 0) {
              const avg = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length;
              setRating(Math.round(avg * 10) / 10);
            }
          }
        } catch (e) {
          console.log('Reviews fetch skipped:', e);
        }

        // Fetch unread notification count
        try {
          const notifRes = await axios.get(
            `${API_BASE_URL}/notifications/unread-count/${userId}`,
            { headers, timeout: 5000 }
          );
          if (notifRes.data.success) {
            setUnreadCount(notifRes.data.unreadCount || notifRes.data.count || 0);
          }
        } catch (e) {
          console.log('Notifications count skipped:', e);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  // Refresh unread notification count whenever the screen comes into focus
  useFocusEffect(useCallback(() => {
    const refreshNotifCount = async () => {
      try {
        const userData = await AsyncStorage.getItem('@trustconnect_user');
        const token = await AsyncStorage.getItem('@trustconnect_token');
        const userId = userData ? JSON.parse(userData).id : null;
        if (userId && token) {
          const res = await axios.get(
            `${API_BASE_URL}/notifications/unread-count/${userId}`,
            { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
          );
          if (res.data.success) {
            setUnreadCount(res.data.unreadCount || res.data.count || 0);
          }
        }
      } catch { /* ignore */ }
    };
    refreshNotifCount();
  }, []));

  // ── Work Proof Photo Helpers ──────────────────────────────────────────────
  const openWorkProofModal = (bookingId: number) => {
    setWpBookingId(bookingId);
    setWpPhotos([]);
    setWpModalVisible(true);
  };

  const handleAddWorkPhoto = async () => {
    if (wpPhotos.length >= 5) {
      Alert.alert('Maximum Photos', 'You can add up to 5 proof photos.');
      return;
    }
    try {
      const permRes = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permRes.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to add proof photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images' as any],
        quality: 0.7,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const localUri = result.assets[0].uri;
      setWpUploading(true);
      try {
        const token = await AsyncStorage.getItem('@trustconnect_token');
        const formData = new FormData();
        formData.append('file', { uri: localUri, name: 'proof.jpg', type: 'image/jpeg' } as any);
        const uploadRes = await axios.post(`${API_BASE_URL}/upload/image`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
          timeout: 20000,
        });
        setWpPhotos(prev => [...prev, uploadRes.data.url || uploadRes.data.imageUrl || localUri]);
      } catch {
        // Fall back to local URI if server upload is unavailable
        setWpPhotos(prev => [...prev, localUri]);
      } finally {
        setWpUploading(false);
      }
    } catch {
      setWpUploading(false);
    }
  };

  const handleRemoveWorkPhoto = (index: number) => {
    setWpPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitWorkProof = async () => {
    if (!wpBookingId) return;
    if (wpPhotos.length < 3) {
      Alert.alert('More Photos Needed', 'You must upload at least 3 proof photos before submitting.');
      return;
    }
    setWpSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      const userData = await AsyncStorage.getItem('@trustconnect_user');
      const artisanUserId = userData ? JSON.parse(userData).id : null;
      await axios.post(
        `${API_BASE_URL}/booking/${wpBookingId}/submit-work-proof`,
        { artisanUserId, photos: wpPhotos },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
      );
      setWpModalVisible(false);
      setWpPhotos([]);
      setWpBookingId(null);
      Alert.alert(
        '✅ Work Proof Submitted!',
        'Your photos have been sent to the client. They will review and release payment once satisfied.'
      );
      loadDashboardData();
    } catch (e: any) {
      Alert.alert('Submission Failed', e?.response?.data?.error || 'Failed to submit work proof. Please try again.');
    } finally {
      setWpSubmitting(false);
    }
  };


  const handleBookingAction = async (bookingId: number, action: 'accept' | 'decline' | 'complete') => {
    try {
      setActionLoading(bookingId);
      const token = await AsyncStorage.getItem('@trustconnect_token');
      const statusMap: Record<string, string> = { accept: 'accepted', decline: 'rejected', complete: 'completed' };
      await axios.put(
        `${API_BASE_URL}/booking/${bookingId}/status`,
        { status: statusMap[action] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', `Job ${action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'completed'} successfully!`);
      loadDashboardData();
    } catch {
      Alert.alert('Error', `Failed to ${action} job. Please try again.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusUpdate = async (bookingId: number, newStatus: string) => {
    try {
      setActionLoading(bookingId);
      const token = await AsyncStorage.getItem('@trustconnect_token');
      await axios.put(
        `${API_BASE_URL}/booking/${bookingId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const labelMap: Record<string, string> = {
        'on-the-way': 'You\'re on your way!',
        'in-progress': 'Job started!',
        'in_progress': 'Job started!',
        'job-done': 'Job marked as done!',
        'completed': 'Job completed!',
      };
      Alert.alert('Updated', labelMap[newStatus] || 'Status updated successfully.');
      loadDashboardData();
    } catch {
      Alert.alert('Error', 'Failed to update status. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const openQuoteModal = (bookingId: number) => {
    setQuoteBookingId(bookingId);
    setQuoteAmount('');
    setQuoteWorkDetails('');
    setQuoteEstimatedDays('');
    setQuoteModalVisible(true);
  };

  const handleSubmitQuote = async () => {
    if (!quoteBookingId) return;
    const amt = parseFloat(quoteAmount.replace(/,/g, ''));
    if (!quoteAmount || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid quote amount.');
      return;
    }
    if (!quoteWorkDetails.trim()) {
      Alert.alert('Work Details Required', 'Please describe the work you plan to do.');
      return;
    }
    try {
      setQuoteSubmitting(true);
      const userData = await AsyncStorage.getItem('@trustconnect_user');
      const artisanUserId = userData ? JSON.parse(userData).id : null;
      await submitBookingQuote(
        quoteBookingId,
        artisanUserId,
        amt,
        quoteWorkDetails.trim(),
        quoteEstimatedDays.trim() || undefined
      );
      setQuoteModalVisible(false);
      Alert.alert('Quote Sent!', 'Your quotation has been sent to the customer for review.');
      await loadDashboardData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to submit quote. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            await AsyncStorage.multiRemove(['@trustconnect_token', '@trustconnect_user']);
            router.replace('/login');
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: 'NGN', minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return WARNING;
      case 'accepted': case 'confirmed': return GOLD_DARK;
      case 'quoted': return WARNING;
      case 'negotiating': return PURPLE;
      case 'on-the-way': return '#00BCD4';
      case 'in_progress': case 'in-progress': return PURPLE;
      case 'job-done': return '#8BC34A';
      case 'funded': return '#009688';
      case 'completed': case 'released': return SUCCESS;
      case 'cancelled': case 'rejected': return DANGER;
      case 'disputed': return '#FF5722';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'pending': return 'clock-outline';
      case 'accepted': case 'confirmed': return 'checkbox-marked-circle-outline';
      case 'quoted': return 'file-document-outline';
      case 'negotiating': return 'chat-processing-outline';
      case 'on-the-way': return 'car-outline';
      case 'in_progress': case 'in-progress': return 'wrench-outline';
      case 'job-done': return 'check-bold';
      case 'funded': return 'cash-lock';
      case 'completed': case 'released': return 'check-decagram';
      case 'cancelled': case 'rejected': return 'close-circle-outline';
      case 'disputed': return 'alert-octagon-outline';
      default: return 'help-circle-outline';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'Pending',
      'accepted': 'Accepted',
      'confirmed': 'Confirmed',
      'on-the-way': 'On The Way',
      'in_progress': 'In Progress',
      'in-progress': 'In Progress',
      'job-done': 'Job Done',
      'quoted': 'Quote Sent',
      'negotiating': 'Revision Requested',
      'funded': 'Escrow Funded',
      'completed': 'Completed',
      'released': 'Payment Released',
      'cancelled': 'Cancelled',
      'rejected': 'Declined',
      'disputed': 'Disputed',
    };
    return labels[status] || status.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getLocationString = (loc: string | { address?: string; latitude?: number; longitude?: number } | undefined): string => {
    if (!loc) return 'Location TBD';
    if (typeof loc === 'string') return loc || 'Location TBD';
    return loc.address || 'Location TBD';
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTimeAgo = (dateStr: string) => {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // Filter helpers
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const activeBookings = bookings.filter(b =>
    ['accepted', 'confirmed', 'quoted', 'negotiating', 'on-the-way', 'in_progress', 'in-progress', 'job-done', 'funded'].includes(b.status)
  );
  const completedBookings = bookings.filter(b =>
    ['completed', 'released'].includes(b.status)
  );

  const getFilteredBookings = (): BookingItem[] => {
    switch (jobFilter) {
      case 'pending': return pendingBookings;
      case 'active': return activeBookings;
      case 'completed': return completedBookings;
      default: return bookings;
    }
  };

  // ─── LOADING ────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} translucent />
        <LinearGradient colors={[NAVY, NAVY_LIGHT]} style={styles.loadingGradient}>
          <View style={styles.loadingPulse}>
            <MaterialCommunityIcons name="tools" size={40} color={GOLD} />
          </View>
          <Text style={styles.loadingTitle}>TrustConnect</Text>
          <Text style={styles.loadingSubtext}>Loading your dashboard...</Text>
          <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 20 }} />
        </LinearGradient>
      </View>
    );
  }

  // ─── VERIFICATION GATES ─────────────────────
  if (!profile || profile.verificationStatus === 'unsubmitted') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} translucent />
        <LinearGradient colors={[NAVY_DARK, NAVY, NAVY_LIGHT]} style={styles.gateGradient}>
          <ScrollView contentContainerStyle={styles.gateScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.gateContainer}>
              <View style={styles.gateIconOuter}>
                <View style={styles.gateIconCircle}>
                  <MaterialCommunityIcons name="shield-account-outline" size={48} color={GOLD} />
                </View>
              </View>
              <Text style={styles.gateTitle}>Welcome to TrustConnect!</Text>
              <Text style={styles.gateSubtitle}>Complete your profile to get started</Text>
              <View style={styles.gateStepsCard}>
                {[
                  { icon: 'card-account-details-outline', label: 'Identity Verification', desc: 'Upload your NIN or BVN for verification' },
                  { icon: 'camera-account', label: 'Profile Photo', desc: 'Take a selfie to verify your identity' },
                  { icon: 'briefcase-outline', label: 'Work Portfolio', desc: 'Showcase your best work to customers' },
                  { icon: 'bank-outline', label: 'Payment Setup', desc: 'Add your bank details for payouts' },
                ].map((step, i) => (
                  <View key={step.label} style={[styles.gateStep, i < 3 && styles.gateStepBorder]}>
                    <View style={[styles.gateStepNum, { backgroundColor: `rgba(255,193,7,${0.15 + i * 0.05})` }]}>
                      <MaterialCommunityIcons name={step.icon as any} size={22} color={GOLD} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gateStepLabel}>{step.label}</Text>
                      <Text style={styles.gateStepDesc}>{step.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <Pressable style={styles.gateCTA} onPress={() => router.push('/artisan-registration')}>
                <LinearGradient colors={[GOLD, GOLD_DARK]} style={styles.gateCTAGradient}>
                  <MaterialCommunityIcons name="rocket-launch-outline" size={22} color={NAVY} />
                  <Text style={styles.gateCTAText}>Start Verification</Text>
                  <MaterialCommunityIcons name="arrow-right" size={20} color={NAVY} />
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.gateLogout} onPress={handleLogout}>
                <MaterialCommunityIcons name="logout" size={18} color="rgba(255,255,255,0.5)" />
                <Text style={styles.gateLogoutText}>Sign Out</Text>
              </Pressable>
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  if (profile.verificationStatus === 'pending') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} translucent />
        <LinearGradient colors={[NAVY_DARK, NAVY, NAVY_LIGHT]} style={styles.gateGradient}>
          <View style={styles.gateContainer}>
            <View style={[styles.gateIconCircle, { backgroundColor: 'rgba(33,150,243,0.15)' }]}>
              <MaterialCommunityIcons name="clock-check-outline" size={48} color={INFO} />
            </View>
            <Text style={styles.gateTitle}>Verification in Progress</Text>
            <Text style={styles.gateSubtitle}>
              Our team is reviewing your profile. This usually takes 24-48 hours.
            </Text>
            <View style={styles.gateStepsCard}>
              {[
                { label: 'Documents submitted', status: 'done' },
                { label: 'Identity verification', status: 'active' },
                { label: 'Admin review', status: 'pending' },
                { label: 'Account activation', status: 'pending' },
              ].map((step, i) => (
                <View key={step.label} style={[styles.pendingStep, i < 3 && styles.gateStepBorder]}>
                  <View style={[styles.pendingStepIcon, {
                    backgroundColor: step.status === 'done' ? 'rgba(76,175,80,0.12)' :
                      step.status === 'active' ? 'rgba(255,152,0,0.12)' : 'rgba(189,189,189,0.12)'
                  }]}>
                    <MaterialCommunityIcons
                      name={step.status === 'done' ? 'check-circle' : step.status === 'active' ? 'progress-clock' : 'circle-outline'}
                      size={22}
                      color={step.status === 'done' ? SUCCESS : step.status === 'active' ? WARNING : '#BDBDBD'}
                    />
                  </View>
                  <Text style={[styles.pendingStepText, step.status === 'done' && { color: SUCCESS }]}>
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.tipCard}>
              <MaterialCommunityIcons name="lightbulb-outline" size={20} color={GOLD} />
              <Text style={styles.tipText}>
                You will receive a notification once your account is verified and ready to accept jobs.
              </Text>
            </View>
            <Pressable style={styles.gateLogout} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={18} color="rgba(255,255,255,0.5)" />
              <Text style={styles.gateLogoutText}>Sign Out</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (profile.verificationStatus === 'rejected') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} translucent />
        <LinearGradient colors={[NAVY_DARK, NAVY, NAVY_LIGHT]} style={styles.gateGradient}>
          <View style={styles.gateContainer}>
            <View style={[styles.gateIconCircle, { backgroundColor: 'rgba(244,67,54,0.15)' }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color={DANGER} />
            </View>
            <Text style={styles.gateTitle}>Verification Rejected</Text>
            <Text style={styles.gateSubtitle}>
              {profile.adminNotes || 'Your verification was not approved. Please review and resubmit your documents.'}
            </Text>
            <Pressable style={styles.gateCTA} onPress={() => router.push('/artisan-registration')}>
              <LinearGradient colors={[GOLD, GOLD_DARK]} style={styles.gateCTAGradient}>
                <MaterialCommunityIcons name="refresh" size={20} color={NAVY} />
                <Text style={styles.gateCTAText}>Resubmit Application</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (profile.verificationStatus === 'suspended') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} translucent />
        <LinearGradient colors={[NAVY_DARK, NAVY, NAVY_LIGHT]} style={styles.gateGradient}>
          <View style={styles.gateContainer}>
            <View style={[styles.gateIconCircle, { backgroundColor: 'rgba(244,67,54,0.15)' }]}>
              <MaterialCommunityIcons name="account-lock-outline" size={48} color={DANGER} />
            </View>
            <Text style={styles.gateTitle}>Account Suspended</Text>
            <Text style={styles.gateSubtitle}>
              {profile.adminNotes || 'Your account has been temporarily suspended. Please contact support.'}
            </Text>
            <Pressable style={[styles.gateCTA, { marginTop: 24 }]}>
              <LinearGradient colors={[GOLD, GOLD_DARK]} style={styles.gateCTAGradient}>
                <MaterialCommunityIcons name="headset" size={20} color={NAVY} />
                <Text style={styles.gateCTAText}>Contact Support</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // ─── MAIN DASHBOARD ─────────────────────────
  const displayName = user?.name || profile?.fullName || 'Artisan';
  const tradeName = profile?.primarySkill || profile?.skillCategory || 'Professional';
  const totalNotif = unreadCount + pendingBookings.length;

  // ─── RENDER: Job Request Card ───────────────
  const renderRequestCard = (booking: BookingItem, i: number) => (
    <Animated.View key={booking.id} entering={SlideInRight.delay(80 * i).springify()}>
      <View style={styles.requestCard}>
        <View style={styles.requestGlow} />
        <View style={styles.requestHeader}>
          <View style={styles.requestAvatar}>
            <Text style={styles.requestAvatarText}>
              {(booking.customerName || 'C')[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.requestName}>{booking.customerName || 'Customer'}</Text>
            <View style={styles.requestServiceRow}>
              <MaterialCommunityIcons name="wrench-outline" size={13} color="#757575" />
              <Text style={styles.requestService}>
                {booking.service || booking.serviceType || 'Service Request'}
              </Text>
            </View>
          </View>
          <View style={styles.requestAmountBox}>
            <Text style={styles.requestAmountLabel}>Budget</Text>
            <Text style={styles.requestAmount}>
              {formatCurrency(booking.amount || booking.estimatedPrice || 0)}
            </Text>
          </View>
        </View>

        {booking.description ? (
          <Text style={styles.requestDescription} numberOfLines={2}>
            {booking.description}
          </Text>
        ) : null}

        <View style={styles.requestDetailsDivider} />
        <View style={styles.requestDetails}>
          <View style={styles.detailChip}>
            <MaterialCommunityIcons name="map-marker-outline" size={14} color={NAVY} />
            <Text style={styles.detailChipText}>{getLocationString(booking.location)}</Text>
          </View>
          {booking.distance !== undefined && (
            <View style={[styles.detailChip, { backgroundColor: '#E3F2FD' }]}>
              <MaterialCommunityIcons name="map-marker-distance" size={14} color={INFO} />
              <Text style={[styles.detailChipText, { color: INFO }]}>
                {booking.distance < 1 ? `${Math.round(booking.distance * 1000)}m` : `${booking.distance.toFixed(1)}km`} away
              </Text>
            </View>
          )}
          <View style={styles.detailChip}>
            <MaterialCommunityIcons name="calendar-outline" size={14} color={NAVY} />
            <Text style={styles.detailChipText}>
              {booking.scheduledDate
                ? new Date(booking.scheduledDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
                : 'Flexible'}
            </Text>
          </View>
          {booking.scheduledTime ? (
            <View style={styles.detailChip}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={NAVY} />
              <Text style={styles.detailChipText}>{booking.scheduledTime}</Text>
            </View>
          ) : null}
          {booking.createdAt ? (
            <View style={styles.detailChip}>
              <MaterialCommunityIcons name="timer-outline" size={14} color="#9E9E9E" />
              <Text style={[styles.detailChipText, { color: '#9E9E9E' }]}>{getTimeAgo(booking.createdAt)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.requestActions}>
          <Pressable
            style={styles.declineBtn}
            onPress={() => handleBookingAction(booking.id, 'decline')}
            disabled={actionLoading === booking.id}
          >
            <MaterialCommunityIcons name="close" size={16} color="#757575" />
            <Text style={styles.declineBtnText}>Decline</Text>
          </Pressable>
          <Pressable
            style={styles.acceptBtn}
            onPress={() => handleBookingAction(booking.id, 'accept')}
            disabled={actionLoading === booking.id}
          >
            <LinearGradient colors={[GOLD, GOLD_DARK]} style={styles.acceptBtnGrad}>
              {actionLoading === booking.id ? (
                <ActivityIndicator size="small" color={NAVY} />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={16} color={NAVY} />
                  <Text style={styles.acceptBtnText}>Accept Job</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );

  // ─── RENDER: Active Job Card ────────────────
  const renderJobCard = (booking: BookingItem, showMeta = false) => {
    const statusAction = STATUS_ACTIONS[booking.status];
    return (
      <View key={booking.id} style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <View style={[styles.jobAvatarSmall, { backgroundColor: getStatusColor(booking.status) + '15' }]}>
            <MaterialCommunityIcons name={getStatusIcon(booking.status) as any} size={20} color={getStatusColor(booking.status)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.jobName}>{booking.customerName || 'Customer'}</Text>
            <Text style={styles.jobService}>{booking.service || booking.serviceType || 'Service'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '12' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(booking.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
              {getStatusLabel(booking.status)}
            </Text>
          </View>
        </View>

        {showMeta && (
          <View style={styles.jobMeta}>
            <View style={styles.detailChip}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color="#757575" />
              <Text style={styles.detailChipText}>{getLocationString(booking.location)}</Text>
            </View>
            {booking.scheduledDate && (
              <View style={styles.detailChip}>
                <MaterialCommunityIcons name="calendar-outline" size={14} color="#757575" />
                <Text style={styles.detailChipText}>
                  {new Date(booking.scheduledDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            )}
            {booking.distance !== undefined && (
              <View style={[styles.detailChip, { backgroundColor: '#E3F2FD' }]}>
                <MaterialCommunityIcons name="map-marker-distance" size={14} color={INFO} />
                <Text style={[styles.detailChipText, { color: INFO }]}>
                  {booking.distance < 1 ? `${Math.round(booking.distance * 1000)}m` : `${booking.distance.toFixed(1)}km`}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.jobFooter}>
          <Text style={styles.jobAmount}>
            {formatCurrency(booking.amount || booking.estimatedPrice || 0)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {/* Chat button */}
            {['accepted', 'confirmed', 'quoted', 'negotiating', 'on-the-way', 'in_progress', 'in-progress', 'funded'].includes(booking.status) && (
              <Pressable
                style={styles.chatJobBtn}
                onPress={() => router.push('/conversations')}
              >
                <MaterialCommunityIcons name="message-text-outline" size={16} color={NAVY} />
              </Pressable>
            )}

            {/* ── Quote-flow buttons ── */}
            {/* accepted / confirmed: artisan must submit a quote first */}
            {(booking.status === 'accepted' || booking.status === 'confirmed') && (
              <Pressable
                style={[styles.progressBtn, { backgroundColor: GOLD_DARK }]}
                onPress={() => openQuoteModal(booking.id)}
              >
                <MaterialCommunityIcons name="file-document-edit-outline" size={14} color="#FFF" />
                <Text style={styles.progressBtnText}>Submit Quote</Text>
              </Pressable>
            )}

            {/* quoted: awaiting customer review */}
            {booking.status === 'quoted' && (
              <View style={[styles.progressBtn, { backgroundColor: WARNING + 'CC' }]}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="#FFF" />
                <Text style={styles.progressBtnText}>Awaiting Review</Text>
              </View>
            )}

            {/* negotiating: customer asked for revision */}
            {booking.status === 'negotiating' && (
              <Pressable
                style={[styles.progressBtn, { backgroundColor: PURPLE }]}
                onPress={() => openQuoteModal(booking.id)}
              >
                <MaterialCommunityIcons name="refresh" size={14} color="#FFF" />
                <Text style={styles.progressBtnText}>Revise Quote</Text>
              </Pressable>
            )}

            {/* funded & beyond: normal status progression */}
            {statusAction && (
              <Pressable
                style={[styles.progressBtn, { backgroundColor: statusAction.color }]}
                onPress={() =>
                  statusAction.next === 'job-done'
                    ? openWorkProofModal(booking.id)
                    : handleStatusUpdate(booking.id, statusAction.next)
                }
                disabled={actionLoading === booking.id}
              >
                {actionLoading === booking.id ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name={statusAction.icon as any} size={14} color="#FFF" />
                    <Text style={styles.progressBtnText}>{statusAction.label}</Text>
                  </>
                )}
              </Pressable>
            )}

            {/* Pending actions */}
            {booking.status === 'pending' && (
              <>
                <Pressable style={styles.declineBtnSmall} onPress={() => handleBookingAction(booking.id, 'decline')}>
                  <Text style={styles.declineBtnText}>Decline</Text>
                </Pressable>
                <Pressable style={styles.completeBtn} onPress={() => handleBookingAction(booking.id, 'accept')}>
                  <Text style={styles.completeBtnText}>Accept</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ─── WORK PROOF MODAL ──────────────────────────────── */}
      <Modal
        visible={wpModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !wpSubmitting && setWpModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => !wpSubmitting && setWpModalVisible(false)}
          >
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <LinearGradient colors={[NAVY_DARK, NAVY]} style={styles.modalHeader}>
                <FloatingOrb size={80} color="rgba(255,193,7,0.08)" style={{ top: -20, right: 0 }} />
                <MaterialCommunityIcons name="camera-enhance" size={28} color={GOLD} />
                <Text style={styles.modalTitle}>Submit Work Proof</Text>
                <Text style={styles.modalSubtitle}>Upload at least 3 photos showing completed work</Text>
              </LinearGradient>

              <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                {/* Photo grid */}
                {wpPhotos.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {wpPhotos.map((uri, idx) => (
                      <View key={idx} style={{ position: 'relative' }}>
                        <Image
                          source={{ uri }}
                          style={{ width: 90, height: 90, borderRadius: 10, backgroundColor: '#E0E0E0' }}
                        />
                        <Pressable
                          onPress={() => handleRemoveWorkPhoto(idx)}
                          style={{
                            position: 'absolute', top: -6, right: -6,
                            backgroundColor: DANGER, borderRadius: 12, width: 22, height: 22,
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <MaterialCommunityIcons name="close" size={14} color="#FFF" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                {/* Add photo button */}
                {wpPhotos.length < 5 && (
                  <Pressable
                    style={[
                      styles.inputWrap,
                      {
                        justifyContent: 'center', alignItems: 'center',
                        paddingVertical: 16, borderStyle: 'dashed',
                        borderColor: wpPhotos.length >= 3 ? SUCCESS : GOLD_DARK,
                        opacity: wpUploading ? 0.6 : 1,
                      },
                    ]}
                    onPress={handleAddWorkPhoto}
                    disabled={wpUploading}
                  >
                    {wpUploading ? (
                      <ActivityIndicator size="small" color={GOLD_DARK} />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="camera-plus-outline" size={28} color={GOLD_DARK} />
                        <Text style={[styles.inputLabel, { marginTop: 4, textAlign: 'center' }]}>
                          Add Photo ({wpPhotos.length}/3 min, 5 max)
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}

                {/* Requirement hint */}
                <View style={styles.quoteNote}>
                  <MaterialCommunityIcons
                    name={wpPhotos.length >= 3 ? 'check-circle-outline' : 'alert-circle-outline'}
                    size={16}
                    color={wpPhotos.length >= 3 ? SUCCESS : WARNING}
                  />
                  <Text style={[styles.quoteNoteText, { color: wpPhotos.length >= 3 ? SUCCESS : '#555' }]}>
                    {wpPhotos.length >= 3
                      ? `✓ ${wpPhotos.length} photos added — ready to submit!`
                      : `${3 - wpPhotos.length} more photo${3 - wpPhotos.length !== 1 ? 's' : ''} required. Client will review before releasing payment.`}
                  </Text>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 12 }}>
                  <Pressable
                    style={[styles.modalCancelBtn, wpSubmitting && { opacity: 0.5 }]}
                    onPress={() => !wpSubmitting && setWpModalVisible(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalSubmitBtn, (wpSubmitting || wpPhotos.length < 3) && { opacity: 0.5 }]}
                    onPress={handleSubmitWorkProof}
                    disabled={wpSubmitting || wpPhotos.length < 3}
                  >
                    <LinearGradient colors={[SUCCESS, '#2E7D32']} style={styles.modalSubmitGrad}>
                      {wpSubmitting ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="send-check" size={16} color="#FFF" />
                          <Text style={[styles.modalSubmitText, { color: '#FFF' }]}>Submit Proof</Text>
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── QUOTE SUBMISSION MODAL ──────────────────────── */}
      <Modal
        visible={quoteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !quoteSubmitting && setQuoteModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => !quoteSubmitting && setQuoteModalVisible(false)}
          >
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              {/* Handle bar */}
              <View style={styles.modalHandle} />

              {/* Header */}
              <LinearGradient colors={[NAVY_DARK, NAVY]} style={styles.modalHeader}>
                <FloatingOrb size={80} color="rgba(255,193,7,0.08)" style={{ top: -20, right: 0 }} />
                <MaterialCommunityIcons name="file-document-edit-outline" size={28} color={GOLD} />
                <Text style={styles.modalTitle}>Submit Quotation</Text>
                <Text style={styles.modalSubtitle}>Provide your quote for this job</Text>
              </LinearGradient>

              <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                {/* Amount */}
                <Text style={styles.inputLabel}>Quoted Amount (₦) <Text style={{ color: DANGER }}>*</Text></Text>
                <View style={styles.inputWrap}>
                  <MaterialCommunityIcons name="cash-multiple" size={20} color={GOLD_DARK} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="e.g. 15000"
                    placeholderTextColor="#BDBDBD"
                    value={quoteAmount}
                    onChangeText={setQuoteAmount}
                    editable={!quoteSubmitting}
                  />
                </View>

                {/* Work Details */}
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Work Description <Text style={{ color: DANGER }}>*</Text></Text>
                <View style={[styles.inputWrap, styles.textAreaWrap]}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={4}
                    placeholder="Describe what you'll do, materials needed, scope of work..."
                    placeholderTextColor="#BDBDBD"
                    value={quoteWorkDetails}
                    onChangeText={setQuoteWorkDetails}
                    editable={!quoteSubmitting}
                    textAlignVertical="top"
                  />
                </View>

                {/* Estimated Days */}
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Estimated Duration (optional)</Text>
                <View style={styles.inputWrap}>
                  <MaterialCommunityIcons name="calendar-clock" size={20} color={NAVY_LIGHT} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2 days, 3 hours..."
                    placeholderTextColor="#BDBDBD"
                    value={quoteEstimatedDays}
                    onChangeText={setQuoteEstimatedDays}
                    editable={!quoteSubmitting}
                  />
                </View>

                {/* Info note */}
                <View style={styles.quoteNote}>
                  <MaterialCommunityIcons name="information-outline" size={16} color={INFO} />
                  <Text style={styles.quoteNoteText}>
                    The customer will review your quote and either accept, request a revision, or decline.
                    Payment is only locked when the customer accepts.
                  </Text>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 12 }}>
                  <Pressable
                    style={[styles.modalCancelBtn, quoteSubmitting && { opacity: 0.5 }]}
                    onPress={() => !quoteSubmitting && setQuoteModalVisible(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalSubmitBtn, quoteSubmitting && { opacity: 0.7 }]}
                    onPress={handleSubmitQuote}
                    disabled={quoteSubmitting}
                  >
                    <LinearGradient colors={[GOLD, GOLD_DARK]} style={styles.modalSubmitGrad}>
                      {quoteSubmitting ? (
                        <ActivityIndicator size="small" color={NAVY} />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="send" size={16} color={NAVY} />
                          <Text style={styles.modalSubmitText}>Send Quote</Text>
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
      <View style={styles.container}>
        {/* ─── HEADER ──────────────── */}
        <LinearGradient colors={[NAVY_DARK, NAVY, NAVY_LIGHT]} style={styles.header}>
          {/* Floating orb decorations */}
          <FloatingOrb size={180} color="rgba(255,193,7,0.07)" style={{ top: -60, right: -40 }} />
          <FloatingOrb size={100} color="rgba(255,255,255,0.05)" style={{ top: 0, right: 110 }} />
          <FloatingOrb size={70}  color="rgba(255,193,7,0.05)" style={{ bottom: -20, left: 20 }} />
          <FloatingOrb size={50}  color="rgba(255,255,255,0.04)" style={{ top: 30, left: 230 }} />

          <View style={styles.headerTop}>
            <View style={styles.headerProfile}>
              <View style={styles.avatarContainer}>
                {profile?.profilePhotoUrl ? (
                  <Image source={{ uri: profile.profilePhotoUrl }} style={styles.avatar} />
                ) : (
                  <LinearGradient colors={[GOLD, GOLD_DARK]} style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
                  </LinearGradient>
                )}
                <View style={[styles.onlineDot, !isAvailable && { backgroundColor: '#9E9E9E' }]} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.headerGreeting}>{getTimeOfDay()}</Text>
                <Text style={styles.headerName} numberOfLines={1}>{displayName}</Text>
                <View style={styles.tradeTag}>
                  <MaterialCommunityIcons name="wrench" size={11} color={GOLD_LIGHT} />
                  <Text style={styles.tradeTagText}>{tradeName}</Text>
                </View>
              </View>
            </View>
            <View style={styles.headerActions}>
              <Pressable style={styles.iconBtn} onPress={() => router.push('/notifications' as any)}>
                <MaterialCommunityIcons name="bell-outline" size={22} color="#FFFFFF" />
                {totalNotif > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{totalNotif > 9 ? '9+' : totalNotif}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* Verified + Rating Row */}
          <View style={styles.verifiedRow}>
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color={GOLD} />
              <Text style={styles.verifiedText}>Verified Professional</Text>
            </View>
            {rating > 0 && (
              <View style={styles.ratingBadge}>
                <MaterialCommunityIcons name="star" size={14} color={GOLD} />
                <Text style={styles.ratingText}>{rating}</Text>
                <Text style={styles.reviewCountText}>({reviewCount})</Text>
              </View>
            )}
            <View style={styles.availabilityBadge}>
              <View style={[styles.availDot, { backgroundColor: isAvailable ? SUCCESS : '#9E9E9E' }]} />
              <Text style={styles.availText}>{isAvailable ? 'Available' : 'Offline'}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ─── SCROLLABLE CONTENT ──────────────── */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[NAVY]} tintColor={NAVY} />}
        >
          {/* ═══════ DASHBOARD TAB ═══════ */}
          {bottomTab === 'dashboard' && (
            <>
              {/* Stats Grid — 4 compact cards in a horizontal row */}
              <View style={styles.statsGrid}>
                {[
                  { icon: 'briefcase-check-outline', value: earnings.completedJobs.toString(), label: 'Completed', grad: ['#1B5E20', '#388E3C'] as [string,string] },
                  { icon: 'clock-fast',              value: activeBookings.length.toString(),  label: 'Active',    grad: ['#0D47A1', '#1976D2'] as [string,string] },
                  { icon: 'cash-multiple',           value: earnings.totalEarnings > 999 ? `₦${Math.round(earnings.totalEarnings/1000)}k` : `₦${earnings.totalEarnings}`, label: 'Earned', grad: ['#BF360C', '#E64A19'] as [string,string] },
                  { icon: 'star',                   value: rating > 0 ? rating.toString() : '—', label: 'Rating',  grad: ['#4A148C', '#7B1FA2'] as [string,string] },
                ].map((stat, i) => (
                  <Animated.View key={stat.label} entering={ZoomIn ? (ZoomIn as any).delay(60 + i * 60).springify() : undefined} style={styles.statCardWrap}>
                    <LinearGradient colors={stat.grad} style={styles.statCard}>
                      <View style={styles.statIconWrap}>
                        <MaterialCommunityIcons name={stat.icon as any} size={20} color="rgba(255,255,255,0.9)" />
                      </View>
                      <Text style={styles.statValue}>{stat.value}</Text>
                      <Text style={styles.statLabel}>{stat.label}</Text>
                    </LinearGradient>
                  </Animated.View>
                ))}
              </View>

              {/* Earnings Banner */}
              <Animated.View entering={FadeInUp.delay(200).springify()}>
                <View style={styles.earningsBanner}>
                  <LinearGradient colors={[NAVY_DARK, NAVY_LIGHT]} style={styles.earningsBannerGrad}>
                    <FloatingOrb size={90} color="rgba(255,193,7,0.08)" style={{ top: -20, right: 10 }} />
                    <View style={styles.earningsBannerLeft}>
                      <Text style={styles.earningsBannerLabel}>Total Earnings</Text>
                      <Text style={styles.earningsBannerValue}>{formatCurrency(earnings.totalEarnings)}</Text>
                      <Text style={styles.earningsBannerSub}>{earnings.completedJobs} jobs completed</Text>
                    </View>
                    <View style={styles.earningsBannerRight}>
                      <View style={styles.earningsMiniStat}>
                        <MaterialCommunityIcons name="timer-sand" size={14} color={GOLD} />
                        <Text style={styles.earningsMiniVal}>{formatCurrency(earnings.pendingPayment)}</Text>
                        <Text style={styles.earningsMiniLabel}>In Escrow</Text>
                      </View>
                      <View style={styles.earningsMiniStat}>
                        <MaterialCommunityIcons name="trending-up" size={14} color={SUCCESS} />
                        <Text style={styles.earningsMiniVal}>{formatCurrency(earnings.thisMonth)}</Text>
                        <Text style={styles.earningsMiniLabel}>This Month</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              </Animated.View>

              {/* Pending Requests */}
              {pendingBookings.length > 0 && (
                <Animated.View entering={FadeInUp.delay(200).springify()}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                      <View style={[styles.sectionDot, { backgroundColor: WARNING }]} />
                      <Text style={styles.sectionTitle}>New Job Requests</Text>
                    </View>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{pendingBookings.length}</Text>
                    </View>
                  </View>
                  {pendingBookings.slice(0, 5).map((booking, i) => renderRequestCard(booking, i))}
                  {pendingBookings.length > 5 && (
                    <Pressable style={styles.viewAllBtn} onPress={() => { setBottomTab('jobs'); setJobFilter('pending'); }}>
                      <Text style={styles.viewAllText}>View all {pendingBookings.length} requests</Text>
                      <MaterialCommunityIcons name="arrow-right" size={16} color={NAVY} />
                    </Pressable>
                  )}
                </Animated.View>
              )}

              {/* Active Jobs */}
              <Animated.View entering={FadeInUp.delay(300).springify()}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={[styles.sectionDot, { backgroundColor: INFO }]} />
                    <Text style={styles.sectionTitle}>Active Jobs</Text>
                  </View>
                  {activeBookings.length > 0 && (
                    <Pressable onPress={() => { setBottomTab('jobs'); setJobFilter('active'); }}>
                      <Text style={styles.seeAllLink}>See All</Text>
                    </Pressable>
                  )}
                </View>
                {activeBookings.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconCircle}>
                      <MaterialCommunityIcons name="briefcase-clock-outline" size={36} color="#BDBDBD" />
                    </View>
                    <Text style={styles.emptyText}>No active jobs right now</Text>
                    <Text style={styles.emptySubtext}>New job requests will appear here when customers book you</Text>
                  </View>
                ) : (
                  activeBookings.slice(0, 3).map((booking) => renderJobCard(booking))
                )}
              </Animated.View>

              {/* Quick Actions */}
              <Animated.View entering={FadeInUp.delay(400).springify()}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={[styles.sectionDot, { backgroundColor: PURPLE }]} />
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                  </View>
                </View>
                <View style={styles.quickActionsGrid}>
                  {[
                    { icon: 'briefcase-search-outline', label: 'Job Feed',    color: PURPLE,   bg: '#EDE7F6', action: () => router.push('/job-feed' as any) },
                    { icon: 'wallet-outline',         label: 'Wallet',       color: SUCCESS,  bg: '#E8F5E9', action: () => router.push('/wallet') },
                    { icon: 'message-text-outline',   label: 'Messages',     color: INFO,     bg: '#E3F2FD', action: () => router.push('/conversations') },
                    { icon: 'play-circle-outline',    label: 'Reels',        color: '#E91E63', bg: '#FCE4EC', action: () => router.push('/reels' as any) },
                    { icon: 'alert-decagram-outline', label: 'Disputes',     color: DANGER,   bg: '#FFEBEE', action: () => router.push('/dispute') },
                  ].map((action) => (
                    <Pressable key={action.label} style={styles.quickActionCard} onPress={action.action}>
                      <View style={[styles.qaIcon, { backgroundColor: action.bg }]}>
                        <MaterialCommunityIcons name={action.icon as any} size={22} color={action.color} />
                      </View>
                      <Text style={styles.qaText}>{action.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </Animated.View>

              {/* Earnings Overview — removed (now shown in banner above) */}
            </>
          )}

          {/* ═══════ JOBS TAB ═══════ */}
          {bottomTab === 'jobs' && (
            <Animated.View entering={FadeIn.duration(300)}>
              {/* Filter Pills */}
              <View style={styles.filterRow}>
                {([
                  { key: 'all', label: 'All', count: bookings.length },
                  { key: 'pending', label: 'Pending', count: pendingBookings.length },
                  { key: 'active', label: 'Active', count: activeBookings.length },
                  { key: 'completed', label: 'Completed', count: completedBookings.length },
                ] as { key: JobFilter; label: string; count: number }[]).map((f) => (
                  <Pressable
                    key={f.key}
                    style={[styles.filterPill, jobFilter === f.key && styles.filterPillActive]}
                    onPress={() => setJobFilter(f.key)}
                  >
                    <Text style={[styles.filterPillText, jobFilter === f.key && styles.filterPillTextActive]}>
                      {f.label}
                    </Text>
                    {f.count > 0 && (
                      <View style={[styles.filterCount, jobFilter === f.key && styles.filterCountActive]}>
                        <Text style={[styles.filterCountText, jobFilter === f.key && styles.filterCountTextActive]}>
                          {f.count}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>

              {/* Filtered Bookings */}
              {getFilteredBookings().length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconCircle}>
                    <MaterialCommunityIcons
                      name={jobFilter === 'pending' ? 'inbox-outline' : jobFilter === 'active' ? 'briefcase-clock-outline' : 'calendar-blank-outline'}
                      size={40}
                      color="#BDBDBD"
                    />
                  </View>
                  <Text style={styles.emptyText}>
                    {jobFilter === 'pending' ? 'No pending requests' : jobFilter === 'active' ? 'No active jobs' : jobFilter === 'completed' ? 'No completed jobs yet' : 'No bookings yet'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {jobFilter === 'pending'
                      ? 'New job requests from customers will appear here'
                      : jobFilter === 'completed'
                      ? 'Completed jobs and payment history will show here'
                      : 'Once customers book your services, they will appear here'}
                  </Text>
                  {jobFilter === 'all' && (
                    <View style={styles.emptyTip}>
                      <MaterialCommunityIcons name="lightbulb-outline" size={16} color={GOLD_DARK} />
                      <Text style={styles.emptyTipText}>
                        Complete your profile and add portfolio photos to attract more customers
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                getFilteredBookings().map((booking, i) => (
                  <Animated.View key={booking.id} entering={FadeInDown.delay(50 * i)}>
                    {booking.status === 'pending'
                      ? renderRequestCard(booking, i)
                      : renderJobCard(booking, true)}
                  </Animated.View>
                ))
              )}
            </Animated.View>
          )}

          {/* ═══════ MESSAGES TAB (redirect) ═══════ */}
          {bottomTab === 'messages' && (
            <Animated.View entering={FadeIn.duration(300)}>
              <View style={styles.redirectCard}>
                <View style={styles.redirectIconCircle}>
                  <MaterialCommunityIcons name="message-text-outline" size={48} color={NAVY} />
                </View>
                <Text style={styles.redirectTitle}>Messages</Text>
                <Text style={styles.redirectSubtext}>Chat with your customers about job details</Text>
                <Pressable style={styles.redirectBtn} onPress={() => router.push('/conversations')}>
                  <LinearGradient colors={[NAVY, NAVY_LIGHT]} style={styles.redirectBtnGrad}>
                    <MaterialCommunityIcons name="message-arrow-right-outline" size={20} color="#FFF" />
                    <Text style={styles.redirectBtnText}>Open Messages</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* ═══════ WALLET TAB (redirect) ═══════ */}
          {bottomTab === 'wallet' && (
            <Animated.View entering={FadeIn.duration(300)}>
              {/* Earnings Summary */}
              <View style={styles.earningsCard}>
                <LinearGradient colors={[NAVY_DARK, NAVY, NAVY_LIGHT]} style={styles.earningsGradFull}>
                  <View style={styles.earningsIconRow}>
                    <View style={styles.earningsIconBg}>
                      <MaterialCommunityIcons name="wallet-outline" size={28} color={GOLD} />
                    </View>
                  </View>
                  <Text style={styles.earningsLabel}>Total Earnings</Text>
                  <Text style={styles.earningsVal}>{formatCurrency(earnings.totalEarnings)}</Text>
                  <View style={styles.earningsRow}>
                    <View style={styles.earningsItem}>
                      <MaterialCommunityIcons name="calendar-month-outline" size={16} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.earningsItemLabel}>This Month</Text>
                      <Text style={styles.earningsItemVal}>{formatCurrency(earnings.thisMonth)}</Text>
                    </View>
                    <View style={styles.earningsDivider} />
                    <View style={styles.earningsItem}>
                      <MaterialCommunityIcons name="timer-sand" size={16} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.earningsItemLabel}>In Escrow</Text>
                      <Text style={styles.earningsItemVal}>{formatCurrency(earnings.pendingPayment)}</Text>
                    </View>
                    <View style={styles.earningsDivider} />
                    <View style={styles.earningsItem}>
                      <MaterialCommunityIcons name="check-all" size={16} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.earningsItemLabel}>Jobs Done</Text>
                      <Text style={styles.earningsItemVal}>{earnings.completedJobs}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              <Pressable style={styles.redirectBtn} onPress={() => router.push('/wallet')}>
                <LinearGradient colors={[GOLD, GOLD_DARK]} style={styles.redirectBtnGrad}>
                  <MaterialCommunityIcons name="wallet-plus-outline" size={20} color={NAVY} />
                  <Text style={[styles.redirectBtnText, { color: NAVY }]}>Open Wallet</Text>
                </LinearGradient>
              </Pressable>

              {/* Payment History */}
              <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionDot, { backgroundColor: SUCCESS }]} />
                  <Text style={styles.sectionTitle}>Payment History</Text>
                </View>
              </View>
              {completedBookings.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconCircle}>
                    <MaterialCommunityIcons name="cash-check" size={40} color="#BDBDBD" />
                  </View>
                  <Text style={styles.emptyText}>No completed payments</Text>
                  <Text style={styles.emptySubtext}>Completed job payments will appear here</Text>
                </View>
              ) : (
                completedBookings.map((booking, i) => (
                  <Animated.View key={booking.id} entering={FadeInDown.delay(50 * i)}>
                    <View style={styles.paymentRow}>
                      <View style={styles.paymentIcon}>
                        <MaterialCommunityIcons name="check-circle" size={22} color={SUCCESS} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.paymentName}>{booking.customerName || 'Customer'}</Text>
                        <Text style={styles.paymentSvc}>{booking.service || booking.serviceType}</Text>
                      </View>
                      <View style={styles.paymentAmtWrap}>
                        <Text style={styles.paymentAmt}>+{formatCurrency(booking.amount || booking.estimatedPrice || 0)}</Text>
                        <Text style={styles.paymentDate}>
                          {booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) : ''}
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                ))
              )}
            </Animated.View>
          )}

          {/* ═══════ PROFILE TAB ═══════ */}
          {bottomTab === 'profile' && (
            <Animated.View entering={FadeIn.duration(300)}>
              {/* Profile Card */}
              <View style={styles.profileCard}>
                <View style={styles.profileCardTop}>
                  <View style={styles.profileAvatarLg}>
                    {profile?.profilePhotoUrl ? (
                      <Image source={{ uri: profile.profilePhotoUrl }} style={styles.profileAvatarImg} />
                    ) : (
                      <LinearGradient colors={[GOLD, GOLD_DARK]} style={styles.profileAvatarFallback}>
                        <Text style={styles.profileAvatarInitials}>{getInitials(displayName)}</Text>
                      </LinearGradient>
                    )}
                  </View>
                  <Text style={styles.profileName}>{displayName}</Text>
                  <Text style={styles.profileTrade}>{tradeName}</Text>
                  <View style={styles.profileBadgesRow}>
                    <View style={[styles.profileBadge, { backgroundColor: '#E8F5E9' }]}>
                      <MaterialCommunityIcons name="shield-check" size={14} color={SUCCESS} />
                      <Text style={[styles.profileBadgeText, { color: SUCCESS }]}>Verified</Text>
                    </View>
                    {rating > 0 && (
                      <View style={[styles.profileBadge, { backgroundColor: '#FFF8E1' }]}>
                        <MaterialCommunityIcons name="star" size={14} color={GOLD_DARK} />
                        <Text style={[styles.profileBadgeText, { color: GOLD_DARK }]}>{rating} ({reviewCount})</Text>
                      </View>
                    )}
                    <View style={[styles.profileBadge, { backgroundColor: '#E3F2FD' }]}>
                      <MaterialCommunityIcons name="briefcase-check" size={14} color={INFO} />
                      <Text style={[styles.profileBadgeText, { color: INFO }]}>{earnings.completedJobs} Jobs</Text>
                    </View>
                  </View>
                </View>

                {/* Availability Toggle */}
                <View style={styles.availabilityRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.availIconBg, { backgroundColor: isAvailable ? '#E8F5E9' : '#F5F5F5' }]}>
                      <MaterialCommunityIcons
                        name={isAvailable ? 'toggle-switch' : 'toggle-switch-off-outline'}
                        size={22}
                        color={isAvailable ? SUCCESS : '#9E9E9E'}
                      />
                    </View>
                    <View>
                      <Text style={styles.availLabel}>Availability</Text>
                      <Text style={styles.availStatus}>
                        {isAvailable ? 'Accepting new jobs' : 'Not accepting jobs'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isAvailable}
                    onValueChange={setIsAvailable}
                    trackColor={{ false: '#E0E0E0', true: SUCCESS + '40' }}
                    thumbColor={isAvailable ? SUCCESS : '#BDBDBD'}
                  />
                </View>
              </View>

              {/* Profile Menu */}
              <View style={styles.profileMenu}>
                {[
                  { icon: 'account-edit-outline', label: 'Edit Profile', desc: 'Update your personal information', color: NAVY, route: '/edit-profile' },
                  { icon: 'wallet-outline', label: 'Wallet & Payments', desc: 'View your earnings & withdrawals', color: SUCCESS, route: '/wallet' },
                  { icon: 'credit-card-outline', label: 'Payment Methods', desc: 'Manage bank accounts', color: '#00897B', route: '/payment-methods' },
                  { icon: 'lock-reset', label: 'Change Password', desc: 'Update your account password', color: '#5C6BC0', route: '/change-password' },
                  { icon: 'dialpad', label: 'Change Lock PIN', desc: 'Update your 6-digit lock code', color: '#FF6F00', route: '/change-pin' },
                  { icon: 'bell-outline', label: 'Notifications', desc: 'Manage notification preferences', color: '#FF9800', route: '/notification-settings' },
                  { icon: 'alert-decagram-outline', label: 'Disputes', desc: 'Manage job disputes', color: DANGER, route: '/dispute' },
                  { icon: 'help-circle-outline', label: 'Help Center', desc: 'FAQs and support', color: '#2196F3', route: '/help-center' },
                  { icon: 'headset', label: 'Live Support', desc: 'Chat with our team', color: '#E91E63', route: '/live-chat' },
                  { icon: 'information-outline', label: 'About TrustConnect', desc: 'App info, terms & privacy', color: '#78909C', route: '/about' },
                ].map((item, idx) => (
                  <Pressable
                    key={item.label}
                    style={[styles.profileMenuItem, idx === 5 && { borderBottomWidth: 0 }]}
                    onPress={() => router.push(item.route as any)}
                  >
                    <View style={[styles.profileMenuIcon, { backgroundColor: item.color + '12' }]}>
                      <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profileMenuLabel}>{item.label}</Text>
                      <Text style={styles.profileMenuDesc}>{item.desc}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#BDBDBD" />
                  </Pressable>
                ))}
              </View>

              {/* Logout */}
              <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <MaterialCommunityIcons name="logout-variant" size={20} color={DANGER} />
                <Text style={styles.logoutBtnText}>Sign Out</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Bottom spacer for nav */}
          <View style={{ height: 90 }} />
        </ScrollView>

        {/* ─── BOTTOM TAB NAVIGATION ──────────────── */}
        <View style={styles.bottomNav}>
          {([
            { key: 'dashboard', icon: 'view-dashboard', label: 'Dashboard' },
            { key: 'jobs', icon: 'briefcase', label: 'Jobs' },
            { key: 'messages', icon: 'message-text', label: 'Messages' },
            { key: 'wallet', icon: 'wallet', label: 'Wallet' },
            { key: 'profile', icon: 'account', label: 'Profile' },
          ] as { key: BottomTab; icon: string; label: string }[]).map((tab) => {
            const isActive = bottomTab === tab.key;
            const badgeCount = tab.key === 'jobs' ? pendingBookings.length : 0;
            return (
              <Pressable
                key={tab.key}
                style={styles.navItem}
                onPress={() => {
                  if (tab.key === 'messages') {
                    router.push('/conversations');
                  } else {
                    setBottomTab(tab.key);
                  }
                }}
              >
                <View style={styles.navIconWrap}>
                  <MaterialCommunityIcons
                    name={(isActive ? tab.icon : `${tab.icon}-outline`) as any}
                    size={24}
                    color={isActive ? NAVY : '#757575'}
                  />
                  {badgeCount > 0 && (
                    <View style={styles.navBadge}>
                      <Text style={styles.navBadgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab.label}</Text>
                {isActive && <View style={styles.navIndicator} />}
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centerContent: { justifyContent: 'center', alignItems: 'center' },

  // Loading
  loadingGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingPulse: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,193,7,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  loadingTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  loadingSubtext: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },

  // Header
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingHorizontal: spacing.lg, paddingBottom: 14, overflow: 'hidden' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerProfile: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: GOLD },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 18, fontWeight: '700', color: NAVY },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: SUCCESS, borderWidth: 2, borderColor: NAVY },
  headerInfo: { flex: 1 },
  headerGreeting: { fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.3 },
  headerName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginTop: 1 },
  tradeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  tradeTagText: { fontSize: 11, color: GOLD_LIGHT, fontWeight: '500' },
  headerActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: DANGER, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  notifBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },

  // Verified & Rating & Availability
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,193,7,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  verifiedText: { fontSize: 11, color: GOLD, fontWeight: '600' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 4 },
  ratingText: { fontSize: 12, color: GOLD, fontWeight: '700' },
  reviewCountText: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  availabilityBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  availDot: { width: 7, height: 7, borderRadius: 4 },
  availText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  // Content
  content: { flex: 1 },
  contentInner: { padding: spacing.lg, paddingBottom: spacing.xxl },

  // Section Headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 18 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionDot: { width: 7, height: 7, borderRadius: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  seeAllLink: { fontSize: 12, fontWeight: '600', color: NAVY },
  countBadge: { backgroundColor: NAVY + '12', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: NAVY },

  // Stats Grid
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  statCardWrap: { flex: 1 },
  statCard: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', height: 100 },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontWeight: '500', textAlign: 'center' },

  // Request Cards
  requestCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3, shadowColor: WARNING, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, overflow: 'hidden' },
  requestGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: GOLD },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
  requestAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: NAVY + '10', alignItems: 'center', justifyContent: 'center' },
  requestAvatarText: { fontSize: 16, fontWeight: '700', color: NAVY },
  requestName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  requestServiceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  requestService: { fontSize: 12, color: '#757575' },
  requestDescription: { fontSize: 13, color: '#616161', marginTop: 10, lineHeight: 18, backgroundColor: '#FAFAFA', padding: 10, borderRadius: 8 },
  requestAmountBox: { alignItems: 'flex-end' },
  requestAmountLabel: { fontSize: 10, color: '#9E9E9E', fontWeight: '500' },
  requestAmount: { fontSize: 17, fontWeight: '700', color: GOLD_DARK },
  requestDetailsDivider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 12 },
  requestDetails: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F5F6FA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  detailChipText: { fontSize: 12, color: '#424242', fontWeight: '500' },
  requestActions: { flexDirection: 'row', gap: 10 },
  declineBtn: { flex: 1, flexDirection: 'row', paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', gap: 4 },
  declineBtnSmall: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1.5, borderColor: '#E0E0E0', alignItems: 'center' },
  declineBtnText: { fontSize: 13, fontWeight: '600', color: '#757575' },
  acceptBtn: { flex: 2, borderRadius: 10, overflow: 'hidden' },
  acceptBtnGrad: { flexDirection: 'row', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10, gap: 6 },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: NAVY },

  // Job Cards
  jobCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8, elevation: 2, shadowColor: NAVY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  jobHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  jobAvatarSmall: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  jobName: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  jobService: { fontSize: 12, color: '#9E9E9E', marginTop: 1 },
  jobMeta: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, gap: 4 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  jobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  jobAmount: { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },

  // Action buttons
  chatJobBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: NAVY + '10', alignItems: 'center', justifyContent: 'center' },
  progressBtn: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, alignItems: 'center', gap: 4 },
  progressBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  completeBtn: { flexDirection: 'row', backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, alignItems: 'center', gap: 4 },
  completeBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 4 },
  viewAllText: { fontSize: 14, fontWeight: '600', color: NAVY },

  // Quick Actions Grid
  quickActionsGrid: { flexDirection: 'row', gap: 10 },
  quickActionCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  qaIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  qaText: { fontSize: 11, fontWeight: '600', color: '#424242', textAlign: 'center' },

  // Filter Pills
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6, elevation: 1, borderWidth: 1, borderColor: '#F0F0F0' },
  filterPillActive: { backgroundColor: NAVY, borderColor: NAVY },
  filterPillText: { fontSize: 13, fontWeight: '600', color: '#757575' },
  filterPillTextActive: { color: '#FFFFFF' },
  filterCount: { backgroundColor: '#F0F0F0', minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  filterCountText: { fontSize: 10, fontWeight: '700', color: '#757575' },
  filterCountTextActive: { color: '#FFFFFF' },

  // Redirect Cards
  redirectCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 32, alignItems: 'center', elevation: 2, marginTop: 8 },
  redirectIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: NAVY + '10', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  redirectTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  redirectSubtext: { fontSize: 14, color: '#9E9E9E', textAlign: 'center', marginBottom: 20 },
  redirectBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  redirectBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  redirectBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // Empty State
  emptyState: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1.5, borderColor: '#F0F0F0', borderStyle: 'dashed' },
  emptyIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#757575', marginTop: 8 },
  emptySubtext: { fontSize: 13, color: '#BDBDBD', marginTop: 4, textAlign: 'center', lineHeight: 18, maxWidth: 260 },
  emptyTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF8E1', padding: 12, borderRadius: 10, marginTop: 16 },
  emptyTipText: { flex: 1, fontSize: 12, color: '#795548', lineHeight: 16 },

  // Earnings Banner (replaces old earnings preview)
  earningsBanner: { borderRadius: 18, overflow: 'hidden', marginBottom: 2, elevation: 3, shadowColor: NAVY, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8 },
  earningsBannerGrad: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 18, gap: 12, overflow: 'hidden' },
  earningsBannerLeft: { flex: 1 },
  earningsBannerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '500', marginBottom: 2 },
  earningsBannerValue: { fontSize: 26, fontWeight: '800', color: GOLD, letterSpacing: -0.5 },
  earningsBannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 },
  earningsBannerRight: { gap: 10 },
  earningsMiniStat: { alignItems: 'flex-end', gap: 2 },
  earningsMiniVal: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  earningsMiniLabel: { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },

  // Earnings (legacy — kept for Jobs/wallet tabs)
  earningsCard: { borderRadius: 16, overflow: 'hidden', elevation: 2 },
  earningsGrad: { padding: 18 },
  earningsGradFull: { padding: 24, alignItems: 'center' },
  earningsIconRow: { marginBottom: 12, alignItems: 'center' },
  earningsIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,193,7,0.12)', alignItems: 'center', justifyContent: 'center' },
  earningsLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4, textAlign: 'center' },
  earningsVal: { fontSize: 30, fontWeight: '700', color: '#FFFFFF', marginBottom: 16, textAlign: 'center' },
  earningsRow: { flexDirection: 'row', width: '100%', alignItems: 'center' },
  earningsItem: { flex: 1, alignItems: 'center', gap: 3 },
  earningsItemLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  earningsItemVal: { fontSize: 14, fontWeight: '700', color: GOLD },
  earningsDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Payment History
  paymentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, elevation: 1 },
  paymentIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  paymentName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  paymentSvc: { fontSize: 12, color: '#757575', marginTop: 1 },
  paymentAmtWrap: { alignItems: 'flex-end' },
  paymentAmt: { fontSize: 15, fontWeight: '700', color: SUCCESS },
  paymentDate: { fontSize: 10, color: '#BDBDBD', marginTop: 2 },

  // Profile Tab
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden', elevation: 2, marginBottom: 16 },
  profileCardTop: { alignItems: 'center', padding: 24, paddingBottom: 16 },
  profileAvatarLg: { marginBottom: 12 },
  profileAvatarImg: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: GOLD },
  profileAvatarFallback: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  profileAvatarInitials: { fontSize: 28, fontWeight: '700', color: NAVY },
  profileName: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  profileTrade: { fontSize: 14, color: '#757575', marginBottom: 12 },
  profileBadgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  profileBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 4 },
  profileBadgeText: { fontSize: 11, fontWeight: '600' },
  availabilityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  availIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  availLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  availStatus: { fontSize: 12, color: '#9E9E9E', marginTop: 1 },

  // Profile Menu
  profileMenu: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', elevation: 1, marginBottom: 16 },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  profileMenuIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  profileMenuLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  profileMenuDesc: { fontSize: 12, color: '#9E9E9E', marginTop: 1 },

  // Logout
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: DANGER + '20' },
  logoutBtnText: { fontSize: 15, fontWeight: '600', color: DANGER },

  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    position: 'relative',
  },
  navIconWrap: { position: 'relative' },
  navBadge: { position: 'absolute', top: -4, right: -8, backgroundColor: DANGER, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 2, borderColor: '#FFFFFF' },
  navBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '700' },
  navLabel: { fontSize: 10, fontWeight: '500', color: '#757575', marginTop: 3 },
  navLabelActive: { color: NAVY, fontWeight: '700' },
  navIndicator: { position: 'absolute', top: -8, width: 20, height: 3, borderRadius: 2, backgroundColor: NAVY },

  // Gate Screens
  gateGradient: { flex: 1 },
  gateScroll: { flexGrow: 1 },
  gateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl * 1.5, paddingTop: 80, paddingBottom: 40 },
  gateIconOuter: { width: 104, height: 104, borderRadius: 52, borderWidth: 2, borderColor: 'rgba(255,193,7,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  gateIconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,193,7,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  gateTitle: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  gateSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20, marginBottom: 28, maxWidth: 280 },
  gateStepsCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 4, marginBottom: 28 },
  gateStep: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  gateStepBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  gateStepNum: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gateStepLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  gateStepDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  gateCTA: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  gateCTAGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  gateCTAText: { fontSize: 16, fontWeight: '700', color: NAVY },
  gateLogout: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24, paddingVertical: 8 },
  gateLogoutText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },

  // Pending Steps
  pendingStep: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  pendingStepIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pendingStepText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  // Tip Card
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(255,193,7,0.08)', padding: 14, borderRadius: 12, marginTop: 20, width: '100%' },
  tipText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },

  // Quote Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', overflow: 'hidden' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  modalHeader: { padding: 20, alignItems: 'center', gap: 4, overflow: 'hidden' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
  modalSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#424242', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E8E8E8', borderRadius: 12, backgroundColor: '#FAFAFA', paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#1A1A2E', paddingVertical: 12 },
  textAreaWrap: { alignItems: 'flex-start', paddingTop: 4 },
  textArea: { minHeight: 90, paddingTop: 10 },
  quoteNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#E3F2FD', padding: 12, borderRadius: 10, marginTop: 16 },
  quoteNoteText: { flex: 1, fontSize: 12, color: '#0D47A1', lineHeight: 17 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#757575' },
  modalSubmitBtn: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  modalSubmitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  modalSubmitText: { fontSize: 15, fontWeight: '700', color: NAVY },
});
