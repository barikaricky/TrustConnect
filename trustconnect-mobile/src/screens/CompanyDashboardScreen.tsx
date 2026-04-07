/**
 * CompanyDashboardScreen — Fully enhanced version
 * Features: Release Funds buttons, Workers History tab, Confetti celebration,
 *           Quote Negotiation Panel, Job Posting, Company Logo Upload,
 *           rich graphics, animations, and professional UI design.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, ScrollView, ActivityIndicator,
  Pressable, RefreshControl, Platform, Alert, Dimensions,
  Modal, Animated as RNAnimated, TextInput, Image,
} from 'react-native';
import Animated, {
  FadeInDown, FadeInUp, SlideInRight, ZoomIn, BounceIn,
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withDelay, withSequence,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
// theme spacing available if needed
import { useAuth } from '../services/AuthContext';
import { API_BASE_URL } from '../config/api';
import { confirmAndRelease } from '../services/escrowService';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const GOLD = '#FFC107';
const GOLD_DARK = '#FFA000';
const GOLD_LIGHT = '#FFF8E1';
const NAVY = '#1a237e';
const NAVY_LIGHT = '#283593';
const NAVY_MID = '#303F9F';
const SUCCESS = '#4CAF50';
const SUCCESS_LIGHT = '#E8F5E9';
const WARNING = '#FF9800';
const DANGER = '#F44336';
const INFO = '#2196F3';
const PURPLE = '#7C4DFF';
const TEAL = '#009688';
const BG = '#F0F2F8';

// ─── Job Categories ───────────────────────────────────────────────────
const JOB_CATEGORIES = [
  { label: 'Plumbing', icon: '🔧' },
  { label: 'Electrical', icon: '⚡' },
  { label: 'Carpentry', icon: '🪚' },
  { label: 'Painting', icon: '🎨' },
  { label: 'Tiling', icon: '🪟' },
  { label: 'Welding', icon: '🔩' },
  { label: 'HVAC / AC Repair', icon: '❄️' },
  { label: 'Roofing', icon: '🏚️' },
  { label: 'Masonry', icon: '🧱' },
  { label: 'Cleaning', icon: '🧹' },
  { label: 'Security', icon: '🔐' },
  { label: 'IT / Tech', icon: '💻' },
  { label: 'Landscaping', icon: '🌿' },
  { label: 'Interior Design', icon: '🛋️' },
  { label: 'Fumigation', icon: '🪲' },
  { label: 'Generator Repair', icon: '⚙️' },
  { label: 'Other', icon: '🔨' },
];

// ─── Nigerian States + LGA Map ────────────────────────────────────────
const NIGERIAN_STATES: Record<string, string[]> = {
  'Abia': ['Aba North', 'Aba South', 'Arochukwu', 'Bende', 'Umuahia North', 'Umuahia South'],
  'Abuja (FCT)': ['Abuja Municipal', 'Bwari', 'Gwagwalada', 'Kuje', 'Kwali', 'Lugbe'],
  'Akwa Ibom': ['Uyo', 'Eket', 'Ikot Ekpene', 'Oron', 'Abak'],
  'Anambra': ['Awka', 'Onitsha', 'Nnewi', 'Ekwulobia', 'Aguata'],
  'Bauchi': ['Bauchi', 'Azare', 'Misau', 'Jamaare'],
  'Bayelsa': ['Yenagoa', 'Brass', 'Ogbia', 'Nembe', 'Sagbama'],
  'Benue': ['Makurdi', 'Gboko', 'Otukpo', 'Katsina-Ala'],
  'Borno': ['Maiduguri', 'Biu', 'Dikwa', 'Gwoza'],
  'Cross River': ['Calabar', 'Ikom', 'Ogoja', 'Obudu'],
  'Delta': ['Asaba', 'Warri', 'Agbor', 'Sapele', 'Ughelli'],
  'Ebonyi': ['Abakaliki', 'Afikpo', 'Onueke', 'Ezza'],
  'Edo': ['Benin City', 'Auchi', 'Ekpoma', 'Uromi', 'Igarra'],
  'Ekiti': ['Ado Ekiti', 'Ikere Ekiti', 'Oye Ekiti', 'Efon Alaaye'],
  'Enugu': ['Enugu', 'Nsukka', 'Agbani', 'Udi', 'Oji River'],
  'Gombe': ['Gombe', 'Dukku', 'Kaltungo', 'Billiri'],
  'Imo': ['Owerri', 'Orlu', 'Okigwe', 'Mbaise'],
  'Jigawa': ['Dutse', 'Hadejia', 'Birnin Kudu', 'Kazaure'],
  'Kaduna': ['Kaduna', 'Zaria', 'Kafanchan', 'Kagoro'],
  'Kano': ['Kano Municipal', 'Fagge', 'Nasarawa', 'Tarauni', 'Gwale'],
  'Katsina': ['Katsina', 'Daura', 'Funtua', 'Mashi'],
  'Kebbi': ['Birnin Kebbi', 'Argungu', 'Yauri', 'Zuru'],
  'Kogi': ['Lokoja', 'Okene', 'Kabba', 'Idah'],
  'Kwara': ['Ilorin', 'Offa', 'Omu Aran', 'Kaiama'],
  'Lagos': ['Alimosho', 'Ajegunle', 'Ikeja', 'Ikorodu', 'Lekki', 'Victoria Island', 'Surulere', 'Yaba', 'Epe', 'Badagry', 'Eti-Osa'],
  'Nasarawa': ['Lafia', 'Keffi', 'Akwanga', 'Nasarawa'],
  'Niger': ['Minna', 'Bida', 'Suleja', 'Kontagora'],
  'Ogun': ['Abeokuta', 'Ijebu Ode', 'Sagamu', 'Ota', 'Ilaro'],
  'Ondo': ['Akure', 'Ondo City', 'Owo', 'Ikare'],
  'Osun': ['Osogbo', 'Ile Ife', 'Ilesa', 'Ede'],
  'Oyo': ['Ibadan', 'Ogbomosho', 'Oyo', 'Iseyin', 'Saki'],
  'Plateau': ['Jos', 'Bukuru', 'Pankshin', 'Shendam'],
  'Rivers': ['Port Harcourt', 'Obio Akpor', 'Eleme', 'Bonny', 'Degema'],
  'Sokoto': ['Sokoto', 'Wurno', 'Wamako', 'Gwadabawa'],
  'Taraba': ['Jalingo', 'Bemenda', 'Wukari', 'Takum'],
  'Yobe': ['Damaturu', 'Potiskum', 'Gashua', 'Nguru'],
  'Zamfara': ['Gusau', 'Kaura Namoda', 'Talata Mafara'],
};

// 7-day date picker for job scheduling
const getNext7Days = () => {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return {
      label: d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }),
      value: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('en-NG', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('en-NG', { month: 'short' }),
    };
  });
};

type BottomTab = 'dashboard' | 'workers' | 'jobs' | 'finances' | 'profile';

interface CompanyStats {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
}

interface CompanyProfileData {
  id?: number;
  companyName: string;
  rcNumber: string;
  companyType: string;
  industry: string;
  description?: string;
  verificationStatus: string;
  adminNotes?: string;
  state: string;
  lga: string;
  numberOfEmployees?: string;
  logoUrl?: string;
}

interface BookingItem {
  id: number;
  customerName: string;
  service: string;
  status: string;
  scheduledDate: string;
  amount: number;
  location: string | { address?: string };
  artisanId?: number;
  artisanName?: string;
}

interface WorkerItem {
  id: string;
  name: string;
  trade: string;
  jobsCount: number;
  totalEarned: number;
  lastJobDate: string;
  artisanUserId?: number;
  artisanId?: number;
  photoUrl?: string | null;
  isVerified?: boolean;
}

interface PendingQuote {
  bookingId: number;
  service: string;
  artisanName: string;
  artisanPhoto?: string | null;
  artisanTrade: string;
  bookingStatus: string;
  scheduledDate: string;
  quote: {
    id: number;
    workDescription: string;
    laborCost: number;
    materialsCost: number;
    totalCost: number;
    serviceFee: number;
    grandTotal: number;
    duration: string;
    status: string;
    version: number;
  } | null;
}

interface JobPost {
  id: number;
  title: string;
  description: string;
  category: string;
  budget?: number | null;
  location: string;
  scheduledDate?: string | null;
  urgency: string;
  status: string;
  applications: any[];
  createdAt: string;
}

// ─── Confetti Piece ───
const CONFETTI_COLORS = [GOLD, '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', SUCCESS];

function ConfettiPiece({ delay, x, color }: { delay: number; x: number; color: string }) {
  const translateY = useRef(new RNAnimated.Value(0)).current;
  const translateX = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(1)).current;
  const rotate = useRef(new RNAnimated.Value(0)).current;
  const scale = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.sequence([
      RNAnimated.delay(delay),
      RNAnimated.parallel([
        RNAnimated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }),
        RNAnimated.timing(translateY, { toValue: SCREEN_HEIGHT * 0.7, duration: 2000, useNativeDriver: true }),
        RNAnimated.timing(translateX, { toValue: x, duration: 2000, useNativeDriver: true }),
        RNAnimated.timing(rotate, { toValue: 720, duration: 2000, useNativeDriver: true }),
        RNAnimated.sequence([
          RNAnimated.delay(1000),
          RNAnimated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 720], outputRange: ['0deg', '720deg'] });
  const isCircle = delay % 2 === 0;

  return (
    <RNAnimated.View
      style={{
        position: 'absolute',
        top: SCREEN_HEIGHT * 0.35,
        left: SCREEN_WIDTH / 2,
        width: isCircle ? 10 : 8,
        height: isCircle ? 10 : 14,
        borderRadius: isCircle ? 5 : 2,
        backgroundColor: color,
        transform: [{ translateX }, { translateY }, { rotate: spin }, { scale }],
        opacity,
      }}
    />
  );
}

// ─── Celebration Overlay ───
function CelebrationOverlay({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    delay: i * 60,
    x: (i % 2 === 0 ? 1 : -1) * ((i + 1) * (SCREEN_WIDTH / 30)),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));

  const scale = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      scale.value = withSequence(withSpring(1.1), withSpring(1));
      textOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
      const t = setTimeout(onDone, 3200);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: textOpacity.value }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}
        onPress={onDone}
      >
        {pieces.map((p, i) => (
          <ConfettiPiece key={i} delay={p.delay} x={p.x} color={p.color} />
        ))}
        <Animated.View style={[styles.celebCard, cardStyle]}>
          <Text style={styles.celebEmoji}>🎉</Text>
          <Text style={styles.celebTitle}>Funds Released!</Text>
          <Text style={styles.celebSub}>{"Payment has been sent to the worker's wallet successfully."}</Text>
          <View style={styles.celebBadge}>
            <MaterialCommunityIcons name="check-circle" size={18} color={SUCCESS} />
            <Text style={styles.celebBadgeText}>Transaction Complete</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── Floating Orb (decorative background element) ───
function FloatingOrb({ x, y, size, color, delay }: { x: number; y: number; size: number; color: string; delay: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.12);

  useEffect(() => {
    translateY.value = withDelay(delay, withSequence(
      withTiming(-8, { duration: 1800 }),
      withTiming(8, { duration: 1800 }),
      withTiming(-4, { duration: 1800 }),
    ));
    opacity.value = withDelay(delay, withSequence(
      withTiming(0.22, { duration: 1200 }),
      withTiming(0.08, { duration: 1200 }),
      withTiming(0.18, { duration: 1200 }),
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[style, {
        position: 'absolute', left: x, top: y,
        width: size, height: size, borderRadius: size / 2, backgroundColor: color,
      }]}
    />
  );
}

// ════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════
export default function CompanyDashboardScreen() {
  const { logout } = useAuth();

  const [profile, setProfile] = useState<CompanyProfileData | null>(null);
  const [stats, setStats] = useState<CompanyStats>({
    totalBookings: 0, activeBookings: 0, completedBookings: 0,
    totalEarnings: 0, averageRating: 0, totalReviews: 0,
  });
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [hiredWorkers, setHiredWorkers] = useState<WorkerItem[]>([]);
  const [pendingQuotes, setPendingQuotes] = useState<PendingQuote[]>([]);
  const [postedJobs, setPostedJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('dashboard');
  const [userName, setUserName] = useState('Company');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [releasing, setReleasing] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Quote negotiation state
  const [actingOnQuote, setActingOnQuote] = useState<number | null>(null);
  const [negotiateReason, setNegotiateReason] = useState('');
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [activeNegotiateQuoteId, setActiveNegotiateQuoteId] = useState<number | null>(null);

  // Job posting state
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [postingJob, setPostingJob] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobCategory, setJobCategory] = useState('');
  const [jobBudget, setJobBudget] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobLocationLGA, setJobLocationLGA] = useState('');
  const [jobDate, setJobDate] = useState('');
  const [jobUrgency, setJobUrgency] = useState<'normal' | 'urgent' | 'asap'>('normal');
  const [jobType, setJobType] = useState<'one-time' | 'ongoing'>('one-time');

  // Notification bell state
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      const userData = await AsyncStorage.getItem('@trustconnect_user');
      const parsed = userData ? JSON.parse(userData) : null;
      if (parsed) {
        setUserName(parsed.name || parsed.fullName || 'Company');
        setCurrentUserId(parsed.id || parsed.userId || null);
      }

      if (!token) { router.replace('/'); return; }
      const headers = { Authorization: `Bearer ${token}` };
      const userId = parsed?.id || parsed?.userId;

      // Fetch company dashboard overview
      try {
        const res = await axios.get(`${API_BASE_URL}/company/dashboard`, { headers, timeout: 8000 });
        if (res.data.success) {
          setProfile(res.data.data.profile);
          setStats(res.data.data.stats);
        }
      } catch (e: any) { console.warn('Dashboard fetch warning:', e.message); }

      // Fetch hired workers from dedicated endpoint
      try {
        const wRes = await axios.get(`${API_BASE_URL}/company/hired-workers`, { headers, timeout: 8000 });
        if (wRes.data.success && wRes.data.workers.length > 0) {
          setHiredWorkers(wRes.data.workers);
        }
      } catch (e: any) { console.warn('Hired workers fetch warning:', e.message); }

      // Fetch pending quotes (artisan quotes awaiting company action)
      try {
        const qRes = await axios.get(`${API_BASE_URL}/company/pending-quotes`, { headers, timeout: 8000 });
        if (qRes.data.success) setPendingQuotes(qRes.data.pendingQuotes || []);
      } catch (e: any) { console.warn('Pending quotes fetch warning:', e.message); }

      // Fetch posted jobs
      try {
        const jRes = await axios.get(`${API_BASE_URL}/company/jobs`, { headers, timeout: 8000 });
        if (jRes.data.success) setPostedJobs(jRes.data.jobs || []);
      } catch (e: any) { console.warn('Jobs fetch warning:', e.message); }

      if (userId) {
        // Fetch customer-side bookings (artisans hired BY the company) for release tracking
        try {
          const cRes = await axios.get(`${API_BASE_URL}/booking/customer/${userId}`, { headers, timeout: 8000 });
          const cdata: BookingItem[] = (cRes.data.bookings || cRes.data.data || []).map((b: any) => ({
            id: b.id,
            customerName: b.artisanName || b.customerName || '—',
            service: b.serviceType || b.service || 'Service',
            status: b.status,
            scheduledDate: b.scheduledDate,
            amount: b.escrowAmount || b.finalPrice || b.estimatedPrice || 0,
            location: b.location,
            artisanId: b.artisanId,
            artisanName: b.artisanName,
          }));
          if (cdata.length > 0) setBookings(cdata);
        } catch (e: any) { console.warn('Bookings fetch warning:', e.message); }
      }
      // Fetch unread notification count for bell badge
      if (userId) {
        try {
          const nRes = await axios.get(`${API_BASE_URL}/notifications/unread-count/${userId}`, { headers, timeout: 5000 });
          setUnreadNotifCount(nRes.data.unreadCount || 0);
        } catch { /* non-critical */ }
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); loadDashboardData(); }, []);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } },
    ]);
  };

  const formatCurrency = (amount: number) =>
    `₦${(amount || 0).toLocaleString('en-NG')}`;

  const getStatusColor = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'completed': case 'released': return SUCCESS;
      case 'in-progress': case 'on-the-way': case 'funded': return INFO;
      case 'pending': case 'accepted': return WARNING;
      case 'cancelled': case 'disputed': return DANGER;
      case 'job-done': return TEAL;
      default: return '#78909C';
    }
  };

  // Release/Dispute buttons show ONLY after artisan uploads work proof (job-done status)
  const canReleaseFunds = (status: string) =>
    (status || '').toLowerCase() === 'job-done';

  const handleReleaseFunds = (booking: BookingItem) => {
    if (!currentUserId) { Alert.alert('Error', 'Unable to identify your account.'); return; }
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
    Alert.alert(
      '💰 Release Funds',
      `Release ${formatCurrency(booking.amount)} to the worker for "${booking.service}"?\n\nThis confirms the job is complete and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Release',
          onPress: async () => {
            setReleasing(booking.id);
            try {
              await confirmAndRelease(booking.id, currentUserId);
              setShowCelebration(true);
              await loadDashboardData();
            } catch (e: any) {
              Alert.alert('Release Failed', e?.response?.data?.message || e?.message || 'Could not release funds. Please try again.');
            } finally {
              setReleasing(null);
            }
          },
        },
      ]
    );
  };

  const handleDisputeBooking = (booking: BookingItem) => {
    if (!currentUserId) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    Alert.alert(
      '⚠️ Raise Dispute',
      `Are you sure you want to raise a dispute for "${booking.service}"?\n\nA support agent will review the work proof and mediate.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Dispute',
          style: 'destructive',
          onPress: () => router.push('/dispute'),
        },
      ]
    );
  };

  // ─── Quote Actions ──────────────────────────────────────────
  const handleAcceptQuote = async (pq: PendingQuote) => {
    if (!pq.quote || !currentUserId) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}

    const token = await AsyncStorage.getItem('@trustconnect_token');
    const headers = { Authorization: `Bearer ${token}` };

    // Check wallet balance first
    try {
      const wRes = await axios.get(`${API_BASE_URL}/wallet/balance/${currentUserId}`, { headers, timeout: 8000 });
      const balance: number = wRes.data.wallet?.balance ?? wRes.data.balance ?? 0;
      if (balance < pq.quote.grandTotal) {
        const shortfall = pq.quote.grandTotal - balance;
        Alert.alert(
          '💳 Insufficient Balance',
          `You need ${formatCurrency(pq.quote.grandTotal)} to accept this quote.\n\nYour balance: ${formatCurrency(balance)}\nShortfall: ${formatCurrency(shortfall)}\n\nPlease top up your wallet to proceed.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Top Up Wallet', onPress: () => router.push('/wallet') },
          ]
        );
        return;
      }
    } catch { /* If balance check fails, let the server handle it */ }

    Alert.alert(
      '✅ Accept Quote',
      `Accept this quote for ${formatCurrency(pq.quote.grandTotal)} from ${pq.artisanName}?\n\nThis amount will be locked in escrow until the job is done.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept & Lock Funds',
          onPress: async () => {
            setActingOnQuote(pq.quote!.id);
            try {
              await axios.post(`${API_BASE_URL}/quote/${pq.quote!.id}/accept`, { customerId: currentUserId }, { headers, timeout: 12000 });
              Alert.alert('✅ Quote Accepted!', `${formatCurrency(pq.quote!.grandTotal)} is now locked in escrow. The worker can begin work.`);
              await loadDashboardData();
            } catch (e: any) {
              const msg = e?.response?.data?.message || 'Failed to accept quote';
              if (e?.response?.data?.code === 'INSUFFICIENT_BALANCE') {
                Alert.alert('💳 Insufficient Balance', msg, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Top Up Wallet', onPress: () => router.push('/wallet') },
                ]);
              } else {
                Alert.alert('Error', msg);
              }
            } finally {
              setActingOnQuote(null);
            }
          },
        },
      ]
    );
  };

  const handleRejectQuote = async (pq: PendingQuote) => {
    if (!pq.quote || !currentUserId) return;
    Alert.alert(
      '❌ Reject Quote',
      `Reject this quote from ${pq.artisanName}? The booking will be cancelled.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActingOnQuote(pq.quote!.id);
            try {
              const token = await AsyncStorage.getItem('@trustconnect_token');
              await axios.post(`${API_BASE_URL}/quote/${pq.quote!.id}/reject`, { customerId: currentUserId }, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
              Alert.alert('Quote Rejected', 'The booking has been cancelled.');
              await loadDashboardData();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message || 'Failed to reject quote');
            } finally {
              setActingOnQuote(null);
            }
          },
        },
      ]
    );
  };

  const handleNegotiateQuote = (pq: PendingQuote) => {
    if (!pq.quote) return;
    setActiveNegotiateQuoteId(pq.quote.id);
    setNegotiateReason('');
    setShowNegotiateModal(true);
  };

  const submitNegotiation = async () => {
    if (!activeNegotiateQuoteId || !currentUserId) return;
    if (!negotiateReason.trim()) {
      Alert.alert('Reason Required', 'Please explain what adjustment you need.');
      return;
    }
    setActingOnQuote(activeNegotiateQuoteId);
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      await axios.post(
        `${API_BASE_URL}/quote/${activeNegotiateQuoteId}/negotiate`,
        { customerId: currentUserId, reason: negotiateReason.trim() },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );
      setShowNegotiateModal(false);
      Alert.alert('Negotiation Sent', 'The artisan has been asked to revise their quote.');
      await loadDashboardData();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to send negotiation');
    } finally {
      setActingOnQuote(null);
    }
  };

  // ─── Logo Upload ─────────────────────────────────────────────
  const handleUploadLogo = async () => {
    try {
      const permRes = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permRes.granted) { Alert.alert('Permission Denied', 'Please allow access to your photo library.'); return; }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images' as any],
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (result.canceled || !result.assets[0]) return;

      setUploadingLogo(true);
      const token = await AsyncStorage.getItem('@trustconnect_token');

      // Upload image to server as base64 / form-data
      const uri = result.assets[0].uri;
      const formData = new FormData();
      formData.append('file', { uri, name: 'logo.jpg', type: 'image/jpeg' } as any);

      let logoUrl: string;
      try {
        // Try multipart upload (if server supports it)
        const uploadRes = await axios.post(`${API_BASE_URL}/upload/image`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
          timeout: 20000,
        });
        logoUrl = uploadRes.data.url || uploadRes.data.imageUrl;
      } catch {
        // Fall back to storing local URI as-is for demo
        logoUrl = uri;
      }

      await axios.post(`${API_BASE_URL}/company/logo`, { logoUrl }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      setProfile(prev => prev ? { ...prev, logoUrl } : prev);
      Alert.alert('✅ Logo Updated', 'Your company logo has been updated successfully.');
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.response?.data?.message || 'Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  // ─── Job Posting ──────────────────────────────────────────────
  const handlePostJob = async () => {
    if (!jobTitle.trim() || !jobDesc.trim() || !jobCategory.trim()) {
      Alert.alert('Missing Fields', 'Please fill in title, description and category.');
      return;
    }
    setPostingJob(true);
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      await axios.post(`${API_BASE_URL}/company/jobs`, {
        title: jobTitle.trim(),
        description: jobDesc.trim(),
        category: jobCategory.trim(),
        budget: jobBudget ? Number(jobBudget) : null,
        location: jobLocation.trim() + (jobLocationLGA ? `, ${jobLocationLGA.trim()}` : ''),
        scheduledDate: jobDate.trim() || null,
        urgency: jobUrgency,
        jobType: jobType,
      }, { headers: { Authorization: `Bearer ${token}` }, timeout: 12000 });

      setShowPostJobModal(false);
      setJobTitle(''); setJobDesc(''); setJobCategory(''); setJobBudget('');
      setJobLocation(''); setJobLocationLGA(''); setJobDate('');
      setJobUrgency('normal'); setJobType('one-time');
      Alert.alert('🎉 Job Posted!', 'Your job is now visible to artisans who can apply.');
      await loadDashboardData();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to post job');
    } finally {
      setPostingJob(false);
    }
  };

  const handleJobApplicationAction = async (jobId: number, artisanUserId: number, action: 'accept' | 'reject') => {
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      await axios.put(`${API_BASE_URL}/company/jobs/${jobId}/application/${artisanUserId}`, { action }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      Alert.alert(action === 'accept' ? '✅ Accepted' : '❌ Rejected', `Application ${action}ed successfully.`);
      await loadDashboardData();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || `Failed to ${action} application`);
    }
  };

  const getVerificationBadge = () => {
    const s = profile?.verificationStatus || 'pending';
    if (s === 'verified') return { color: SUCCESS, icon: 'check-decagram' as const, text: 'Verified' };
    if (s === 'rejected') return { color: DANGER, icon: 'close-circle' as const, text: 'Rejected' };
    return { color: WARNING, icon: 'clock-outline' as const, text: 'Pending Verification' };
  };

  // ─────────────────────────────────────────────────────────
  //  DASHBOARD TAB
  // ─────────────────────────────────────────────────────────
  const renderDashboardTab = () => {
    const badge = getVerificationBadge();
    const jobDoneCount = bookings.filter(b => b.status === 'job-done').length;
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Company Card */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <LinearGradient
            colors={[NAVY, NAVY_MID, '#1565C0']}
            style={styles.heroCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <FloatingOrb x={-20} y={10} size={80} color={GOLD} delay={0} />
            <FloatingOrb x={SCREEN_WIDTH - 130} y={-10} size={100} color="#FFFFFF" delay={300} />

            {/* Top row: badge + dots */}
            <View style={styles.heroBadgeRow}>
              <View style={[styles.heroBadge, { backgroundColor: badge.color + '25', borderColor: badge.color + '50', borderWidth: 1 }]}>
                <MaterialCommunityIcons name={badge.icon} size={13} color={badge.color} />
                <Text style={[styles.heroBadgeText, { color: badge.color }]}>{badge.text}</Text>
              </View>
              <View style={styles.heroDots}>
                <View style={[styles.heroDot, { backgroundColor: GOLD }]} />
                <View style={[styles.heroDot, { backgroundColor: '#FFFFFF60' }]} />
                <View style={[styles.heroDot, { backgroundColor: '#FFFFFF40' }]} />
              </View>
            </View>

            {/* Avatar + info */}
            <View style={styles.heroBody}>
              {profile?.logoUrl ? (
                <Image source={{ uri: profile.logoUrl }} style={styles.heroLogoImg} />
              ) : (
                <LinearGradient colors={[GOLD + '30', GOLD + '15']} style={styles.heroAvatar}>
                  <MaterialCommunityIcons name="office-building" size={36} color={GOLD} />
                </LinearGradient>
              )}
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.heroName} numberOfLines={1}>{profile?.companyName || userName}</Text>
                <Text style={styles.heroIndustry}>{profile?.industry || 'Business'}</Text>
                <View style={styles.heroMetaRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={12} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.heroMeta}>{profile?.state || 'Nigeria'}{profile?.lga ? `, ${profile.lga}` : ''}</Text>
                  <View style={styles.heroDivider} />
                  <MaterialCommunityIcons name="file-document-outline" size={12} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.heroMeta}>{profile?.rcNumber || 'RC Pending'}</Text>
                </View>
              </View>
            </View>

            {/* Stats strip */}
            <View style={styles.heroStatsStrip}>
              {[
                { label: 'Jobs', value: stats.totalBookings },
                { label: 'Active', value: stats.activeBookings },
                { label: 'Done', value: stats.completedBookings },
              ].map((s, i) => (
                <View key={i} style={[styles.heroStatItem, i < 2 && styles.heroStatBorder]}>
                  <Text style={styles.heroStatVal}>{s.value}</Text>
                  <Text style={styles.heroStatLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Job Done Alert — worker marked job complete, funds waiting */}
        {jobDoneCount > 0 && (
          <Animated.View entering={BounceIn.delay(150)}>
            <LinearGradient colors={[TEAL, '#00796B']} style={styles.urgentBanner}>
              <MaterialCommunityIcons name="check-circle-outline" size={22} color="#FFFFFF" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.urgentTitle, { color: '#FFFFFF' }]}>
                  {jobDoneCount} Job{jobDoneCount > 1 ? 's' : ''} Completed — Release Funds
                </Text>
                <Text style={[styles.urgentSub, { color: 'rgba(255,255,255,0.8)' }]}>Worker has finished. Scroll down to release payment.</Text>
              </View>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>
        )}

        {/* Pending Quotes Banner */}
        {pendingQuotes.length > 0 && (
          <Animated.View entering={BounceIn.delay(200)}>
            <LinearGradient colors={[GOLD, GOLD_DARK]} style={styles.urgentBanner}>
              <MaterialCommunityIcons name="file-document-edit-outline" size={22} color={NAVY} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.urgentTitle}>
                  {pendingQuotes.length} Quote{pendingQuotes.length > 1 ? 's' : ''} Awaiting Your Response
                </Text>
                <Text style={styles.urgentSub}>Review and accept, reject, or negotiate</Text>
              </View>
              <Pressable onPress={() => setBottomTab('jobs')}>
                <Text style={[styles.urgentTitle, { fontSize: 12, textDecorationLine: 'underline' }]}>View</Text>
              </Pressable>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Earnings Spotlight */}
        <Animated.View entering={ZoomIn.delay(250).springify()} style={styles.earningsSpotlight}>
          <LinearGradient colors={[SUCCESS, '#2E7D32']} style={styles.earningsGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View>
              <Text style={styles.earningsLabel}>Total Earnings</Text>
              <Text style={styles.earningsAmount}>{formatCurrency(stats.totalEarnings)}</Text>
            </View>
            <MaterialCommunityIcons name="trending-up" size={40} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
          <Pressable style={styles.walletShortcut} onPress={() => router.push('/wallet')}>
            <MaterialCommunityIcons name="wallet-outline" size={18} color={NAVY} />
            <Text style={styles.walletShortcutText}>Open Wallet</Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color={NAVY} />
          </Pressable>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.qaGrid}>
            {([
              { icon: 'magnify', label: 'Find Pros', color: INFO, bg: '#E3F2FD', route: '/service-search' },
              { icon: 'wallet-outline', label: 'Wallet', color: SUCCESS, bg: SUCCESS_LIGHT, route: '/wallet' },
              { icon: 'account-group-outline', label: 'Workers', color: PURPLE, bg: '#EDE7F6', action: () => setBottomTab('workers') },
              { icon: 'video-plus-outline', label: 'Post Job', color: TEAL, bg: '#E0F2F1', route: '/post-job' },
            ] as any[]).map((a, i) => (
              <Animated.View key={i} entering={ZoomIn.delay(320 + i * 60).springify()}>
                <Pressable
                  style={[styles.qaCard, { backgroundColor: a.bg }]}
                  onPress={() => a.action ? a.action() : router.push(a.route)}
                >
                  <View style={[styles.qaIconRing, { borderColor: a.color + '40' }]}>
                    <MaterialCommunityIcons name={a.icon} size={26} color={a.color} />
                  </View>
                  <Text style={[styles.qaLabel, { color: a.color }]}>{a.label}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Rating */}
        {stats.totalReviews > 0 && (
          <Animated.View entering={SlideInRight.delay(400)} style={styles.ratingCard}>
            <View style={styles.ratingMain}>
              <Text style={styles.ratingBig}>{stats.averageRating.toFixed(1)}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <MaterialCommunityIcons key={s} name={s <= Math.round(stats.averageRating) ? 'star' : 'star-outline'} size={15} color={GOLD} />
                ))}
              </View>
              <Text style={styles.reviewCount}>{stats.totalReviews} reviews</Text>
            </View>
            <View style={styles.ratingDivider} />
            <View style={styles.ratingRight}>
              <Text style={styles.ratingRightTitle}>Satisfaction</Text>
              <View style={styles.ratingBarBg}>
                <View style={[styles.ratingBarFill, { width: `${(stats.averageRating / 5) * 100}%` }]} />
              </View>
              <Text style={styles.ratingPct}>{((stats.averageRating / 5) * 100).toFixed(0)}%</Text>
            </View>
          </Animated.View>
        )}

        {/* Recent Jobs */}
        <Animated.View entering={FadeInUp.delay(500).springify()}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Jobs</Text>
          </View>

          {bookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="briefcase-off-outline" size={52} color="#CFD8DC" />
              <Text style={styles.emptyTitle}>No jobs yet</Text>
              <Text style={styles.emptySubtext}>Jobs you book with artisans will appear here</Text>
              <Pressable style={styles.emptyAction} onPress={() => router.push('/service-search')}>
                <MaterialCommunityIcons name="magnify" size={16} color={NAVY} />
                <Text style={styles.emptyActionText}>Find Professionals</Text>
              </Pressable>
            </View>
          ) : (
            bookings.slice(0, 6).map((b, idx) => (
              <Animated.View key={b.id} entering={SlideInRight.delay(520 + idx * 70).springify()}>
                <View style={styles.jobCard}>
                  <View style={[styles.jobAccent, { backgroundColor: getStatusColor(b.status) }]} />
                  <View style={styles.jobCardInner}>
                    <View style={styles.jobTop}>
                      <View style={styles.jobServiceTag}>
                        <MaterialCommunityIcons name="briefcase-outline" size={13} color={NAVY} />
                        <Text style={styles.jobServiceText}>{b.service}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: getStatusColor(b.status) + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(b.status) }]} />
                        <Text style={[styles.statusPillText, { color: getStatusColor(b.status) }]}>
                          {(b.status || '').replace(/-/g, ' ')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.jobMid}>
                      <Text style={styles.jobWorkerName}>{b.artisanName || b.customerName || '—'}</Text>
                      {b.amount > 0 ? (
                        <Text style={styles.jobAmount}>{formatCurrency(b.amount)}</Text>
                      ) : (
                        <View style={styles.awaitingQuoteBadge}>
                          <MaterialCommunityIcons name="clock-outline" size={11} color={WARNING} />
                          <Text style={styles.awaitingQuoteText}>Awaiting Quote</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.jobFooter}>
                      <View style={styles.jobDateRow}>
                        <MaterialCommunityIcons name="calendar-outline" size={12} color="#90A4AE" />
                        <Text style={styles.jobDate}>
                          {new Date(b.scheduledDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </Text>
                      </View>
                      {b.status === 'job-done' && (
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <Pressable
                            style={[styles.releaseBtn, { backgroundColor: TEAL, opacity: releasing === b.id ? 0.65 : 1 }]}
                            onPress={() => handleReleaseFunds(b)}
                            disabled={releasing === b.id}
                          >
                            {releasing === b.id ? (
                              <ActivityIndicator size={12} color="#FFFFFF" />
                            ) : (
                              <>
                                <MaterialCommunityIcons name="cash-check" size={13} color="#FFFFFF" />
                                <Text style={styles.releaseBtnText}>Release</Text>
                              </>
                            )}
                          </Pressable>
                          <Pressable
                            style={[styles.releaseBtn, { backgroundColor: '#E53935' }]}
                            onPress={() => handleDisputeBooking(b)}
                          >
                            <MaterialCommunityIcons name="shield-alert" size={13} color="#FFFFFF" />
                            <Text style={styles.releaseBtnText}>Dispute</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </Animated.View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    );
  };

  // ─────────────────────────────────────────────────────────
  //  WORKERS TAB
  // ─────────────────────────────────────────────────────────
  const renderWorkersTab = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
    >
      <Animated.View entering={FadeInDown.delay(80).springify()}>
        <LinearGradient colors={[PURPLE, '#5E35B1']} style={styles.sectionHero}>
          <FloatingOrb x={-10} y={0} size={70} color="#FFFFFF" delay={0} />
          <FloatingOrb x={SCREEN_WIDTH - 90} y={10} size={55} color={GOLD} delay={400} />
          <View style={styles.sectionHeroContent}>
            <MaterialCommunityIcons name="account-group" size={36} color="#FFFFFF" />
            <Text style={styles.sectionHeroTitle}>Your Workers</Text>
            <Text style={styles.sectionHeroSub}>
              {hiredWorkers.length > 0
                ? `${hiredWorkers.length} professional${hiredWorkers.length !== 1 ? 's' : ''} have worked with you`
                : 'Professionals you hire will appear here'}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {hiredWorkers.length === 0 ? (
        <Animated.View entering={ZoomIn.delay(200)} style={styles.emptyCard}>
          <MaterialCommunityIcons name="account-search-outline" size={56} color="#CFD8DC" />
          <Text style={styles.emptyTitle}>No Workers Yet</Text>
          <Text style={styles.emptySubtext}>Professionals you hire will show up here for easy rehiring</Text>
          <Pressable style={styles.emptyAction} onPress={() => router.push('/service-search')}>
            <MaterialCommunityIcons name="magnify" size={16} color={NAVY} />
            <Text style={styles.emptyActionText}>Find & Hire Professionals</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Previously Worked With</Text>
          {hiredWorkers.map((w, idx) => (
            <Animated.View key={w.id} entering={SlideInRight.delay(150 + idx * 80).springify()}>
              <View style={styles.workerCard}>
                {/* Photo or initials avatar */}
                {w.photoUrl ? (
                  <View style={styles.workerPhotoWrap}>
                    <Image source={{ uri: w.photoUrl }} style={styles.workerPhoto} />
                    {w.isVerified && (
                      <View style={styles.workerVerifiedBadge}>
                        <MaterialCommunityIcons name="check-decagram" size={13} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.workerPhotoWrap}>
                    <LinearGradient colors={[NAVY, NAVY_LIGHT]} style={styles.workerAvatar}>
                      <Text style={styles.workerAvatarText}>
                        {w.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                      </Text>
                    </LinearGradient>
                    {w.isVerified && (
                      <View style={styles.workerVerifiedBadge}>
                        <MaterialCommunityIcons name="check-decagram" size={13} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                )}
                <View style={styles.workerInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.workerName} numberOfLines={1}>{w.name}</Text>
                    {w.isVerified && (
                      <MaterialCommunityIcons name="check-decagram" size={14} color={INFO} />
                    )}
                  </View>
                  <View style={styles.workerTradeRow}>
                    <MaterialCommunityIcons name="tools" size={12} color={PURPLE} />
                    <Text style={styles.workerTrade}>{w.trade}</Text>
                  </View>
                  <View style={styles.workerStats}>
                    <View style={styles.workerStatChip}>
                      <MaterialCommunityIcons name="briefcase-check-outline" size={12} color={SUCCESS} />
                      <Text style={styles.workerStatText}>{w.jobsCount} job{w.jobsCount !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={[styles.workerStatChip, { marginLeft: 6 }]}>
                      <MaterialCommunityIcons name="cash" size={12} color={GOLD_DARK} />
                      <Text style={styles.workerStatText}>{formatCurrency(w.totalEarned)}</Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  style={styles.rehireBtn}
                  onPress={() => router.push({
                    pathname: '/service-search',
                    params: w.artisanUserId
                      ? { artisanId: String(w.artisanUserId) }
                      : w.artisanId
                        ? { artisanId: String(w.artisanId) }
                        : { query: w.name },
                  } as any)}
                >
                  <MaterialCommunityIcons name="repeat" size={14} color="#FFFFFF" />
                  <Text style={styles.rehireBtnText}>Rehire</Text>
                </Pressable>
              </View>
            </Animated.View>
          ))}

          <Animated.View entering={FadeInUp.delay(400).springify()}>
            <Pressable onPress={() => router.push('/service-search')}>
              <View style={styles.hireNewBanner}>
                <MaterialCommunityIcons name="account-plus-outline" size={24} color={INFO} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.hireNewTitle}>Find New Professionals</Text>
                  <Text style={styles.hireNewSub}>Browse thousands of verified artisans near you</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={INFO} />
              </View>
            </Pressable>
          </Animated.View>
        </>
      )}
    </ScrollView>
  );

  // ─────────────────────────────────────────────────────────
  //  JOBS TAB  (formerly Services Tab)
  // ─────────────────────────────────────────────────────────
  const renderJobsTab = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
    >
      {/* Hero */}
      <Animated.View entering={FadeInDown.delay(80).springify()}>
        <LinearGradient colors={[TEAL, '#00796B']} style={styles.sectionHero}>
          <FloatingOrb x={SCREEN_WIDTH - 80} y={-5} size={70} color={GOLD} delay={200} />
          <View style={styles.sectionHeroContent}>
            <MaterialCommunityIcons name="briefcase-plus-outline" size={36} color="#FFFFFF" />
            <Text style={styles.sectionHeroTitle}>Job Board</Text>
            <Text style={styles.sectionHeroSub}>Post jobs and manage applications from professionals</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Post Job CTA */}
      <Animated.View entering={FadeInUp.delay(180).springify()}>
        <Pressable onPress={() => setShowPostJobModal(true)}>
          <LinearGradient colors={[NAVY, NAVY_MID]} style={styles.postJobCta}>
            <MaterialCommunityIcons name="plus-circle-outline" size={28} color={GOLD} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.postJobCtaTitle}>Post a New Job</Text>
              <Text style={styles.postJobCtaSub}>Let professionals come to you — free & instant</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={GOLD} />
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Pending Quotes Section */}
      {pendingQuotes.length > 0 && (
        <Animated.View entering={FadeInUp.delay(240).springify()}>
          <Text style={styles.sectionTitle}>Quotes Awaiting Response</Text>
          {pendingQuotes.map((pq, idx) => (
            <Animated.View key={pq.bookingId} entering={SlideInRight.delay(260 + idx * 80).springify()}>
              <View style={[styles.quoteCard, actingOnQuote === pq.quote?.id && { opacity: 0.7 }]}>
                {/* Header row */}
                <View style={styles.quoteHeader}>
                  {pq.artisanPhoto ? (
                    <Image source={{ uri: pq.artisanPhoto }} style={styles.quoteArtisanPhoto} />
                  ) : (
                    <LinearGradient colors={[NAVY, NAVY_LIGHT]} style={styles.quoteArtisanAvatar}>
                      <Text style={styles.quoteArtisanInitials}>
                        {pq.artisanName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                      </Text>
                    </LinearGradient>
                  )}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.quoteArtisanName}>{pq.artisanName}</Text>
                    <Text style={styles.quoteTrade}>{pq.artisanTrade} · {pq.service}</Text>
                    {pq.scheduledDate && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
                        <MaterialCommunityIcons name="calendar-outline" size={11} color="#90A4AE" />
                        <Text style={{ fontSize: 11, color: '#90A4AE' }}>
                          {new Date(pq.scheduledDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.quoteBadge, { backgroundColor: pq.quote?.status === 'negotiating' ? WARNING + '20' : GOLD + '20' }]}>
                    <Text style={[styles.quoteBadgeText, { color: pq.quote?.status === 'negotiating' ? WARNING : GOLD_DARK }]}>
                      {pq.quote?.status === 'negotiating' ? 'Negotiating' : 'New Quote'}
                    </Text>
                  </View>
                </View>

                {/* Work Description */}
                {pq.quote?.workDescription ? (
                  <View style={styles.quoteWorkDescBox}>
                    <View style={styles.quoteWorkDescHeader}>
                      <MaterialCommunityIcons name="file-document-outline" size={14} color={NAVY} />
                      <Text style={styles.quoteWorkDescTitle}>Work Description</Text>
                    </View>
                    <Text style={styles.quoteWorkDescText}>{pq.quote.workDescription}</Text>
                  </View>
                ) : null}

                {/* Cost Breakdown */}
                <View style={styles.quoteBreakdownBox}>
                  <Text style={styles.quoteBreakdownTitle}>Cost Breakdown</Text>
                  <View style={styles.quoteCostRow}>
                    <Text style={styles.quoteCostLabel}>Labour Cost</Text>
                    <Text style={styles.quoteCostVal}>{formatCurrency(pq.quote?.laborCost ?? 0)}</Text>
                  </View>
                  {(pq.quote?.materialsCost ?? 0) > 0 && (
                    <View style={styles.quoteCostRow}>
                      <Text style={styles.quoteCostLabel}>Materials Cost</Text>
                      <Text style={styles.quoteCostVal}>{formatCurrency(pq.quote?.materialsCost ?? 0)}</Text>
                    </View>
                  )}
                  <View style={styles.quoteCostRow}>
                    <Text style={styles.quoteCostLabel}>Sub-total</Text>
                    <Text style={styles.quoteCostVal}>{formatCurrency(pq.quote?.totalCost ?? 0)}</Text>
                  </View>
                  {(pq.quote?.serviceFee ?? 0) > 0 && (
                    <View style={styles.quoteCostRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Text style={styles.quoteCostLabel}>Service Fee</Text>
                        <View style={{ backgroundColor: INFO + '20', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 }}>
                          <Text style={{ fontSize: 9, color: INFO, fontWeight: '700' }}>5%</Text>
                        </View>
                      </View>
                      <Text style={styles.quoteCostVal}>{formatCurrency(pq.quote?.serviceFee ?? 0)}</Text>
                    </View>
                  )}
                  <View style={[styles.quoteCostRow, styles.quoteTotalRow]}>
                    <Text style={styles.quoteTotalLabel}>Grand Total</Text>
                    <Text style={styles.quoteTotalVal}>{formatCurrency(pq.quote?.grandTotal ?? 0)}</Text>
                  </View>
                  {pq.quote?.duration ? (
                    <View style={styles.quoteDurationRow}>
                      <MaterialCommunityIcons name="clock-outline" size={13} color="#78909C" />
                      <Text style={styles.quoteDurationText}>Estimated duration: {pq.quote.duration}</Text>
                    </View>
                  ) : null}
                </View>
                {/* Actions */}
                {actingOnQuote === pq.quote?.id ? (
                  <ActivityIndicator size="small" color={NAVY} style={{ marginTop: 10 }} />
                ) : (
                  <View style={styles.quoteActions}>
                    <Pressable style={styles.quoteAcceptBtn} onPress={() => handleAcceptQuote(pq)}>
                      <MaterialCommunityIcons name="check-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.quoteAcceptBtnText}>Accept</Text>
                    </Pressable>
                    <Pressable style={styles.quoteNegotiateBtn} onPress={() => handleNegotiateQuote(pq)}>
                      <MaterialCommunityIcons name="chat-outline" size={16} color={NAVY} />
                      <Text style={styles.quoteNegotiateBtnText}>Negotiate</Text>
                    </Pressable>
                    <Pressable style={styles.quoteRejectBtn} onPress={() => handleRejectQuote(pq)}>
                      <MaterialCommunityIcons name="close-circle-outline" size={16} color={DANGER} />
                      <Text style={styles.quoteRejectBtnText}>Reject</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </Animated.View>
          ))}
        </Animated.View>
      )}

      {/* Posted Jobs */}
      <Animated.View entering={FadeInUp.delay(300).springify()}>
        <Text style={styles.sectionTitle}>Your Posted Jobs</Text>
        {postedJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="briefcase-off-outline" size={52} color="#CFD8DC" />
            <Text style={styles.emptyTitle}>No Jobs Posted</Text>
            <Text style={styles.emptySubtext}>Post a job and receive applications from verified professionals</Text>
          </View>
        ) : (
          postedJobs.map((job, idx) => (
            <Animated.View key={job.id} entering={SlideInRight.delay(320 + idx * 80).springify()}>
              <View style={styles.postedJobCard}>
                <View style={styles.postedJobHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.postedJobTitle}>{job.title}</Text>
                    <Text style={styles.postedJobCategory}>{job.category}</Text>
                  </View>
                  <View style={[styles.postedJobStatus, {
                    backgroundColor: job.status === 'open' ? SUCCESS + '20' : job.status === 'filled' ? INFO + '20' : '#ECEFF1',
                  }]}>
                    <Text style={[styles.postedJobStatusText, {
                      color: job.status === 'open' ? SUCCESS : job.status === 'filled' ? INFO : '#607D8B',
                    }]}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.postedJobMeta}>
                  {job.budget != null && job.budget > 0 && (
                    <View style={styles.postedJobMetaChip}>
                      <MaterialCommunityIcons name="cash" size={13} color={GOLD_DARK} />
                      <Text style={styles.postedJobMetaText}>{formatCurrency(job.budget)}</Text>
                    </View>
                  )}
                  {job.location && (
                    <View style={styles.postedJobMetaChip}>
                      <MaterialCommunityIcons name="map-marker-outline" size={13} color="#90A4AE" />
                      <Text style={styles.postedJobMetaText}>{job.location}</Text>
                    </View>
                  )}
                  <View style={styles.postedJobMetaChip}>
                    <MaterialCommunityIcons name="account-multiple-outline" size={13} color={INFO} />
                    <Text style={styles.postedJobMetaText}>{(job.applications || []).length} applicant{(job.applications || []).length !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
                {/* Applicants */}
                {(job.applications || []).length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={[styles.quoteCostLabel, { marginBottom: 6, fontWeight: '600' }]}>Applications</Text>
                    {(job.applications || []).map((app: any, ai: number) => (
                      <View key={ai} style={styles.applicantRow}>
                        <LinearGradient colors={[NAVY, NAVY_LIGHT]} style={styles.applicantAvatar}>
                          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                            {(app.artisanName || 'A').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </Text>
                        </LinearGradient>
                        <Text style={styles.applicantName} numberOfLines={1}>{app.artisanName || 'Professional'}</Text>
                        {app.status === 'pending' && (
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <Pressable
                              style={styles.applicantAcceptBtn}
                              onPress={() => handleJobApplicationAction(job.id, app.artisanUserId, 'accept')}
                            >
                              <Text style={styles.applicantAcceptBtnText}>Accept</Text>
                            </Pressable>
                            <Pressable
                              style={styles.applicantRejectBtn}
                              onPress={() => handleJobApplicationAction(job.id, app.artisanUserId, 'reject')}
                            >
                              <Text style={styles.applicantRejectBtnText}>Reject</Text>
                            </Pressable>
                          </View>
                        )}
                        {app.status !== 'pending' && (
                          <View style={[styles.postedJobStatus, {
                            backgroundColor: app.status === 'accepted' ? SUCCESS + '20' : '#FFEBEE',
                          }]}>
                            <Text style={{ fontSize: 11, color: app.status === 'accepted' ? SUCCESS : DANGER, fontWeight: '600' }}>
                              {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </Animated.View>
          ))
        )}
      </Animated.View>
    </ScrollView>
  );

  // ─────────────────────────────────────────────────────────
  //  FINANCES TAB
  // ─────────────────────────────────────────────────────────
  const renderFinancesTab = () => {
    const releasableJobs = bookings.filter(b => canReleaseFunds(b.status));
    const totalReleased = bookings
      .filter(b => ['completed', 'released'].includes(b.status))
      .reduce((s, b) => s + b.amount, 0);
    const inEscrow = bookings
      .filter(b => ['funded', 'in-progress', 'job-done', 'on-the-way'].includes(b.status))
      .reduce((s, b) => s + b.amount, 0);
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Balance Hero */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <LinearGradient colors={[NAVY, NAVY_MID, '#0D47A1']} style={styles.financeHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <FloatingOrb x={-15} y={0} size={90} color={GOLD} delay={0} />
            <FloatingOrb x={SCREEN_WIDTH - 110} y={10} size={70} color="#FFFFFF" delay={600} />
            <Text style={styles.financeLabel}>Total Earnings</Text>
            <Text style={styles.financeAmount}>{formatCurrency(stats.totalEarnings)}</Text>
            <View style={styles.financeRow}>
              {[
                { label: 'Completed', value: stats.completedBookings, icon: 'check-circle-outline', color: SUCCESS },
                { label: 'Active', value: stats.activeBookings, icon: 'progress-wrench', color: WARNING },
                { label: 'Total Jobs', value: stats.totalBookings, icon: 'briefcase-outline', color: INFO },
              ].map((item, i) => (
                <View key={i} style={[styles.financeStat, i > 0 && { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.15)' }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
                  <Text style={styles.financeStatVal}>{item.value}</Text>
                  <Text style={styles.financeStatLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Open Wallet */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <Pressable style={styles.walletBtn} onPress={() => router.push('/wallet')}>
            <LinearGradient colors={[GOLD, GOLD_DARK]} style={styles.walletBtnGrad}>
              <MaterialCommunityIcons name="wallet" size={22} color={NAVY} />
              <Text style={styles.walletBtnText}>Open Full Wallet</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color={NAVY} />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Pending Fund Releases */}
        <Animated.View entering={FadeInUp.delay(280).springify()}>
          <Text style={styles.sectionTitle}>Pending Fund Releases</Text>
          {releasableJobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="cash-check" size={48} color="#A5D6A7" />
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptySubtext}>No pending fund releases right now</Text>
            </View>
          ) : (
            releasableJobs.map((b, idx) => (
              <Animated.View key={b.id} entering={SlideInRight.delay(300 + idx * 80)}>
                <View style={styles.releaseCard}>
                  <View style={styles.releaseCardLeft}>
                    <LinearGradient colors={[SUCCESS + '30', SUCCESS + '10']} style={styles.releaseIconWrap}>
                      <MaterialCommunityIcons name="cash-lock-open" size={22} color={SUCCESS} />
                    </LinearGradient>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.releaseJobName}>{b.service}</Text>
                      <Text style={styles.releaseWorkerName}>{b.customerName || b.artisanName || '—'}</Text>
                      <Text style={styles.releaseDate}>
                        {new Date(b.scheduledDate).toLocaleDateString('en-NG')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.releaseCardRight}>
                    <Text style={styles.releaseAmount}>{formatCurrency(b.amount)}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                      <Pressable
                        style={[styles.releaseBigBtn, { opacity: releasing === b.id ? 0.65 : 1 }]}
                        onPress={() => handleReleaseFunds(b)}
                        disabled={releasing === b.id}
                      >
                        {releasing === b.id ? (
                          <ActivityIndicator size={14} color="#FFFFFF" />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="send" size={14} color="#FFFFFF" />
                            <Text style={styles.releaseBigBtnText}>Release</Text>
                          </>
                        )}
                      </Pressable>
                      <Pressable
                        style={[styles.releaseBigBtn, { backgroundColor: '#E53935' }]}
                        onPress={() => handleDisputeBooking(b)}
                      >
                        <MaterialCommunityIcons name="shield-alert" size={14} color="#FFFFFF" />
                        <Text style={styles.releaseBigBtnText}>Dispute</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Animated.View>
            ))
          )}
        </Animated.View>

        {/* Transaction Summary */}
        <Animated.View entering={FadeInUp.delay(380).springify()}>
          <Text style={styles.sectionTitle}>Transaction Summary</Text>
          <View style={styles.txnGrid}>
            {[
              { label: 'Total Spent', value: formatCurrency(totalReleased + inEscrow), icon: 'cash-lock', color: INFO, bg: '#E3F2FD' },
              { label: 'Released', value: formatCurrency(totalReleased), icon: 'cash-check', color: SUCCESS, bg: SUCCESS_LIGHT },
              { label: 'In Escrow', value: formatCurrency(inEscrow), icon: 'clock-outline', color: WARNING, bg: '#FFF3E0' },
            ].map((item, idx) => (
              <View key={idx} style={[styles.txnCard, { backgroundColor: item.bg }]}>
                <MaterialCommunityIcons name={item.icon as any} size={26} color={item.color} />
                <Text style={[styles.txnValue, { color: item.color, fontSize: 13 }]} numberOfLines={1} adjustsFontSizeToFit>{item.value}</Text>
                <Text style={styles.txnLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    );
  };

  // ─────────────────────────────────────────────────────────
  //  PROFILE TAB
  // ─────────────────────────────────────────────────────────
  const renderProfileTab = () => {
    const badge = getVerificationBadge();
    const menuGroups = [
      {
        title: 'Account',
        items: [
          { icon: 'account-edit-outline', label: 'Edit Profile', route: '/edit-profile' },
          { icon: 'lock-reset', label: 'Change Lock PIN', route: '/change-pin' },
          { icon: 'key-variant', label: 'Change Password', route: '/change-password' },
        ],
      },
      {
        title: 'Finance',
        items: [
          { icon: 'wallet-outline', label: 'Wallet & Payments', route: '/wallet' },
          { icon: 'credit-card-outline', label: 'Payment Methods', route: '/payment-methods' },
        ],
      },
      {
        title: 'Support',
        items: [
          { icon: 'bell-outline', label: 'Notifications', route: '/notification-settings' },
          { icon: 'shield-alert-outline', label: 'Disputes', route: '/dispute' },
          { icon: 'chat-outline', label: 'Messages', route: '/conversations' },
          { icon: 'help-circle-outline', label: 'Help Center', route: '/help-center' },
          { icon: 'headset', label: 'Live Support', route: '/live-chat' },
          { icon: 'information-outline', label: 'About TrustConnect', route: '/about' },
        ],
      },
    ];

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <LinearGradient colors={[NAVY, NAVY_MID, '#1565C0']} style={styles.profileHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <FloatingOrb x={-10} y={5} size={80} color={GOLD} delay={0} />
            <FloatingOrb x={SCREEN_WIDTH - 100} y={0} size={65} color="#FFFFFF" delay={500} />
            {/* Logo upload area */}
            <Pressable style={styles.logoUploadWrap} onPress={handleUploadLogo} disabled={uploadingLogo}>
              {profile?.logoUrl ? (
                <Image source={{ uri: profile.logoUrl }} style={styles.logoImage} />
              ) : (
                <LinearGradient colors={[GOLD + '40', GOLD + '15']} style={styles.profileAvatarLg}>
                  <MaterialCommunityIcons name="office-building" size={44} color={GOLD} />
                </LinearGradient>
              )}
              <View style={styles.logoUploadOverlay}>
                {uploadingLogo ? (
                  <ActivityIndicator size={14} color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons name="camera" size={16} color="#FFFFFF" />
                )}
              </View>
            </Pressable>
            <Text style={styles.profileName}>{profile?.companyName || userName}</Text>
            <Text style={styles.profileRole}>{profile?.industry || 'Company'}</Text>
            <View style={[styles.profileBadge, { backgroundColor: badge.color + '25', borderColor: badge.color + '50', borderWidth: 1 }]}>
              <MaterialCommunityIcons name={badge.icon} size={14} color={badge.color} />
              <Text style={[styles.profileBadgeText, { color: badge.color }]}>{badge.text}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Business Details</Text>
          {[
            { label: 'RC Number', value: profile?.rcNumber || '—', icon: 'file-document-outline' },
            { label: 'Type', value: (profile?.companyType || '—').replace(/_/g, ' '), icon: 'domain' },
            { label: 'Employees', value: profile?.numberOfEmployees || '—', icon: 'account-group-outline' },
            { label: 'Location', value: [profile?.lga, profile?.state].filter(Boolean).join(', ') || '—', icon: 'map-marker-outline' },
          ].map((d, i) => (
            <View key={i} style={styles.detailRow}>
              <View style={styles.detailLabelRow}>
                <MaterialCommunityIcons name={d.icon as any} size={15} color="#90A4AE" />
                <Text style={styles.detailLabel}>{d.label}</Text>
              </View>
              <Text style={styles.detailValue}>{d.value}</Text>
            </View>
          ))}
        </Animated.View>

        {menuGroups.map((group, gi) => (
          <Animated.View key={gi} entering={FadeInUp.delay(260 + gi * 80).springify()}>
            <Text style={styles.menuGroupTitle}>{group.title}</Text>
            <View style={styles.menuGroup}>
              {group.items.map((item, idx) => (
                <Pressable
                  key={idx}
                  style={[styles.menuItem, idx < group.items.length - 1 && styles.menuItemBorder]}
                  onPress={() => router.push(item.route as any)}
                >
                  <View style={styles.menuLeft}>
                    <View style={styles.menuIconWrap}>
                      <MaterialCommunityIcons name={item.icon as any} size={20} color={NAVY} />
                    </View>
                    <Text style={styles.menuItemText}>{item.label}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#CFD8DC" />
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ))}

        <Animated.View entering={FadeInUp.delay(560).springify()}>
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={20} color={DANGER} />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    );
  };

  // ─────────────────────────────────────────────────────────
  //  LOADING STATE
  // ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <LinearGradient colors={[NAVY, NAVY_MID]} style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />
        <Animated.View entering={ZoomIn.springify()}>
          <MaterialCommunityIcons name="office-building" size={56} color={GOLD} />
        </Animated.View>
        <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 24 }} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </LinearGradient>
    );
  }

  // ─────────────────────────────────────────────────────────
  //  ACCESS GUARD — block unapproved companies
  // ─────────────────────────────────────────────────────────
  if (profile && profile.verificationStatus !== 'verified') {
    const isPending = profile.verificationStatus === 'pending' || profile.verificationStatus === 'unsubmitted';
    const isRejected = profile.verificationStatus === 'rejected';

    return (
      <LinearGradient colors={[NAVY, NAVY_MID]} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />
        <MaterialCommunityIcons
          name={isPending ? 'clock-check-outline' : isRejected ? 'close-circle-outline' : 'lock-outline'}
          size={72}
          color={isPending ? GOLD : '#EF5350'}
          style={{ marginBottom: 24 }}
        />
        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
          {isPending ? 'Awaiting Approval' : isRejected ? 'Application Rejected' : 'Account Suspended'}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          {isPending
            ? 'Your company registration is under review. Our admin team will verify your details and approve access shortly.'
            : isRejected
            ? `Your application was not approved.${profile.adminNotes ? `\n\nReason: ${profile.adminNotes}` : ' Please contact support for more information.'}`
            : `Your account has been suspended.${profile.adminNotes ? `\n\nReason: ${profile.adminNotes}` : ' Please contact support.'}`}
        </Text>
        <Pressable
          style={{ backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 }}
          onPress={async () => { await logout(); router.replace('/'); }}
        >
          <Text style={{ color: NAVY, fontWeight: '700', fontSize: 16 }}>Log Out</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  const TABS: { key: BottomTab; icon: string; activeIcon: string; label: string }[] = [
    { key: 'dashboard', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard', label: 'Home' },
    { key: 'workers', icon: 'account-group-outline', activeIcon: 'account-group', label: 'Workers' },
    { key: 'jobs', icon: 'briefcase-plus-outline', activeIcon: 'briefcase-plus', label: 'Post Jobs' },
    { key: 'finances', icon: 'wallet-outline', activeIcon: 'wallet', label: 'Finances' },
    { key: 'profile', icon: 'account-circle-outline', activeIcon: 'account-circle', label: 'Profile' },
  ];

  // ─────────────────────────────────────────────────────────
  //  MAIN RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <View style={styles.container}>
        {/* Top Bar */}
        <LinearGradient colors={[NAVY, NAVY_LIGHT]} style={styles.topBar}>
          <MaterialCommunityIcons name="office-building" size={22} color={GOLD} />
          <Text style={styles.topBarText} numberOfLines={1}>{profile?.companyName || userName}</Text>
          <Pressable style={styles.topBarIconBtn} onPress={() => router.push('/conversations')}>
            <MaterialCommunityIcons name="message-outline" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable style={styles.topBarIconBtn} onPress={() => router.push('/notifications' as any)}>
            <View>
              <MaterialCommunityIcons name="bell-outline" size={22} color="#FFFFFF" />
              {unreadNotifCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</Text>
                </View>
              )}
            </View>
          </Pressable>
        </LinearGradient>

        {/* Tab content */}
        {bottomTab === 'dashboard' && renderDashboardTab()}
        {bottomTab === 'workers' && renderWorkersTab()}
        {bottomTab === 'jobs' && renderJobsTab()}
        {bottomTab === 'finances' && renderFinancesTab()}
        {bottomTab === 'profile' && renderProfileTab()}

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          {TABS.map((tab) => {
            const isActive = bottomTab === tab.key;
            return (
              <Pressable key={tab.key} style={styles.navItem} onPress={() => setBottomTab(tab.key)}>
                {isActive && <View style={styles.navActiveIndicator} />}
                <MaterialCommunityIcons
                  name={(isActive ? tab.activeIcon : tab.icon) as any}
                  size={25}
                  color={isActive ? NAVY : '#9E9E9E'}
                />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Celebration Overlay */}
      <CelebrationOverlay visible={showCelebration} onDone={() => setShowCelebration(false)} />

      {/* ── Negotiate Quote Modal ── */}
      <Modal transparent visible={showNegotiateModal} animationType="fade" onRequestClose={() => setShowNegotiateModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowNegotiateModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Negotiate Price</Text>
            <Text style={[styles.quoteCostLabel, { marginBottom: 8 }]}>Explain your counteroffer or concerns</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Can you lower the material cost? I have a budget of ₦50,000"
              placeholderTextColor="#90A4AE"
              multiline
              numberOfLines={4}
              value={negotiateReason}
              onChangeText={setNegotiateReason}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>  
              <Pressable style={[styles.modalSubmitBtn, { backgroundColor: '#ECEFF1', flex: 1 }]} onPress={() => setShowNegotiateModal(false)}>
                <Text style={[styles.modalSubmitBtnText, { color: '#607D8B' }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSubmitBtn, { flex: 1, opacity: actingOnQuote ? 0.65 : 1 }]}
                onPress={submitNegotiation}
                disabled={!!actingOnQuote}
              >
                {actingOnQuote ? (
                  <ActivityIndicator size={16} color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Send Offer</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Post Job Modal ── */}
      <Modal transparent visible={showPostJobModal} animationType="slide" onRequestClose={() => setShowPostJobModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowPostJobModal(false)}>
          <Pressable style={[styles.modalCard, { maxHeight: '92%', padding: 0 }]} onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <LinearGradient colors={[NAVY, NAVY_MID]} style={styles.postJobModalHeader}>
              <MaterialCommunityIcons name="briefcase-plus-outline" size={22} color={GOLD} />
              <Text style={styles.postJobModalTitle}>Post a Job</Text>
              <Pressable onPress={() => setShowPostJobModal(false)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={22} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
              {/* Job Title */}
              <Text style={styles.postJobFieldLabel}>Job Title *</Text>
              <TextInput
                style={styles.postJobInput}
                placeholder="e.g. Fix bathroom pipes urgently"
                placeholderTextColor="#90A4AE"
                value={jobTitle}
                onChangeText={setJobTitle}
              />

              {/* Description */}
              <Text style={styles.postJobFieldLabel}>Description *</Text>
              <TextInput
                style={[styles.postJobInput, { height: 88, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="Describe what needs to be done, materials available, access info..."
                placeholderTextColor="#90A4AE"
                value={jobDesc}
                onChangeText={setJobDesc}
                multiline
              />

              {/* Category chips */}
              <Text style={styles.postJobFieldLabel}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                  {JOB_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat.label}
                      style={[
                        styles.catChip,
                        jobCategory === cat.label && styles.catChipActive,
                      ]}
                      onPress={() => { setJobCategory(cat.label); try { Haptics.selectionAsync(); } catch {} }}
                    >
                      <Text style={styles.catChipEmoji}>{cat.icon}</Text>
                      <Text style={[styles.catChipText, jobCategory === cat.label && styles.catChipTextActive]}>
                        {cat.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {/* Budget */}
              <Text style={styles.postJobFieldLabel}>Budget (₦)</Text>
              <TextInput
                style={styles.postJobInput}
                placeholder="Leave empty = Open to negotiation"
                placeholderTextColor="#90A4AE"
                value={jobBudget}
                onChangeText={setJobBudget}
                keyboardType="numeric"
              />

              {/* Location — State selector */}
              <Text style={styles.postJobFieldLabel}>State *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                  {Object.keys(NIGERIAN_STATES).map((state) => (
                    <Pressable
                      key={state}
                      style={[styles.locationChip, jobLocation === state && styles.locationChipActive]}
                      onPress={() => { setJobLocation(state); setJobLocationLGA(''); try { Haptics.selectionAsync(); } catch {} }}
                    >
                      <Text style={[styles.locationChipText, jobLocation === state && styles.locationChipTextActive]}>
                        {state}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {/* LGA sub-selector */}
              {jobLocation !== '' && (
                <>
                  <Text style={styles.postJobFieldLabel}>Area / LGA</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                      {(NIGERIAN_STATES[jobLocation] || []).map((lga) => (
                        <Pressable
                          key={lga}
                          style={[styles.locationChip, jobLocationLGA === lga && styles.locationChipActive]}
                          onPress={() => { setJobLocationLGA(lga); try { Haptics.selectionAsync(); } catch {} }}
                        >
                          <Text style={[styles.locationChipText, jobLocationLGA === lga && styles.locationChipTextActive]}>
                            {lga}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {/* Date picker — horizontal 14-day strip */}
              <Text style={styles.postJobFieldLabel}>Preferred Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                  {getNext7Days().map((d) => (
                    <Pressable
                      key={d.value}
                      style={[styles.dateChip, jobDate === d.value && styles.dateChipActive]}
                      onPress={() => { setJobDate(d.value); try { Haptics.selectionAsync(); } catch {} }}
                    >
                      <Text style={[styles.dateChipDay, jobDate === d.value && styles.dateChipTextActive]}>{d.day}</Text>
                      <Text style={[styles.dateChipDate, jobDate === d.value && styles.dateChipTextActive]}>{d.date}</Text>
                      <Text style={[styles.dateChipMonth, jobDate === d.value && styles.dateChipTextActive]}>{d.month}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {/* Urgency selector */}
              <Text style={styles.postJobFieldLabel}>Urgency</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {([
                  { key: 'normal', label: 'Normal', icon: 'clock-outline', color: '#78909C' },
                  { key: 'urgent', label: 'Urgent', icon: 'alert-circle-outline', color: WARNING },
                  { key: 'asap', label: 'ASAP', icon: 'lightning-bolt', color: DANGER },
                ] as const).map((u) => (
                  <Pressable
                    key={u.key}
                    style={[styles.urgencyChip, jobUrgency === u.key && { borderColor: u.color, backgroundColor: u.color + '18' }]}
                    onPress={() => { setJobUrgency(u.key); try { Haptics.selectionAsync(); } catch {} }}
                  >
                    <MaterialCommunityIcons name={u.icon} size={16} color={jobUrgency === u.key ? u.color : '#90A4AE'} />
                    <Text style={[styles.urgencyChipText, jobUrgency === u.key && { color: u.color, fontWeight: '700' }]}>{u.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Job Type */}
              <Text style={styles.postJobFieldLabel}>Job Type</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                {([
                  { key: 'one-time', label: 'One-Time', icon: 'briefcase-outline' },
                  { key: 'ongoing', label: 'Ongoing / Contract', icon: 'briefcase-clock-outline' },
                ] as const).map((t) => (
                  <Pressable
                    key={t.key}
                    style={[styles.jobTypeChip, jobType === t.key && styles.jobTypeChipActive]}
                    onPress={() => { setJobType(t.key); try { Haptics.selectionAsync(); } catch {} }}
                  >
                    <MaterialCommunityIcons name={t.icon} size={16} color={jobType === t.key ? NAVY : '#90A4AE'} />
                    <Text style={[styles.jobTypeChipText, jobType === t.key && { color: NAVY, fontWeight: '700' }]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable style={[styles.modalSubmitBtn, { backgroundColor: '#ECEFF1', flex: 1 }]} onPress={() => setShowPostJobModal(false)}>
                  <Text style={[styles.modalSubmitBtnText, { color: '#607D8B' }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSubmitBtn, { flex: 2, opacity: postingJob ? 0.65 : 1 }]}
                  onPress={handlePostJob}
                  disabled={postingJob}
                >
                  {postingJob ? (
                    <ActivityIndicator size={16} color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="briefcase-check-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.modalSubmitBtnText}>Post Job</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.8)', marginTop: 14, fontSize: 15 },

  // Top Bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 52,
    paddingBottom: 12,
  },
  topBarText: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  topBarIconBtn: { padding: 6 },

  // Tab content wrapper
  tabContent: { padding: 16, paddingBottom: 110 },

  // Hero Card
  heroCard: {
    borderRadius: 20, padding: 18, marginBottom: 16, overflow: 'hidden',
    elevation: 6, shadowColor: NAVY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12,
  },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  heroBadgeText: { fontSize: 11, fontWeight: '700' },
  heroDots: { flexDirection: 'row', gap: 5 },
  heroDot: { width: 6, height: 6, borderRadius: 3 },
  heroBody: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  heroAvatar: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
  heroIndustry: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  heroMeta: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  heroDivider: { width: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  heroStatsStrip: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 12, overflow: 'hidden' },
  heroStatItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  heroStatBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.12)' },
  heroStatVal: { fontSize: 22, fontWeight: '800', color: GOLD },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 1 },

  // Urgent Banner
  urgentBanner: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14,
    marginBottom: 14, elevation: 3,
  },
  urgentTitle: { fontSize: 13, fontWeight: '700', color: NAVY },
  urgentSub: { fontSize: 11, color: NAVY + 'AA', marginTop: 2 },

  // Earnings Spotlight
  earningsSpotlight: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 16,
    elevation: 3, shadowColor: SUCCESS, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8,
  },
  earningsGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  earningsLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  earningsAmount: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  walletShortcut: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GOLD_LIGHT, paddingVertical: 11,
  },
  walletShortcutText: { fontSize: 14, fontWeight: '700', color: NAVY },

  // Quick Actions
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  qaCard: {
    width: (SCREEN_WIDTH - 32 - 10) / 2,
    borderRadius: 16, padding: 16, alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  qaIconRing: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  qaLabel: { fontSize: 13, fontWeight: '700' },

  // Rating
  ratingCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 16,
    elevation: 2, shadowColor: GOLD, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6,
  },
  ratingMain: { alignItems: 'center', paddingRight: 16 },
  ratingBig: { fontSize: 34, fontWeight: '800', color: '#1f2128' },
  starsRow: { flexDirection: 'row', gap: 2, marginVertical: 4 },
  reviewCount: { fontSize: 11, color: '#90A4AE' },
  ratingDivider: { width: 1, height: 60, backgroundColor: '#E0E0E0', marginRight: 16 },
  ratingRight: { flex: 1 },
  ratingRightTitle: { fontSize: 12, color: '#78909C', marginBottom: 8 },
  ratingBarBg: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  ratingBarFill: { height: '100%', backgroundColor: GOLD, borderRadius: 4 },
  ratingPct: { fontSize: 18, fontWeight: '700', color: GOLD_DARK },

  // Section helpers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1f2128', marginBottom: 12 },

  // Job Card
  jobCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 10, flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 5,
  },
  jobAccent: { width: 4 },
  jobCardInner: { flex: 1, padding: 12 },
  jobTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  jobServiceTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  jobServiceText: { fontSize: 12, fontWeight: '600', color: NAVY },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  jobMid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  jobWorkerName: { fontSize: 14, fontWeight: '600', color: '#37474F', flex: 1 },
  jobAmount: { fontSize: 15, fontWeight: '800', color: NAVY },
  jobFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  jobDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jobDate: { fontSize: 11, color: '#90A4AE' },
  releaseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: SUCCESS, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  releaseBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  // Empty state
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 28,
    alignItems: 'center', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#546E7A', marginTop: 14 },
  emptySubtext: { fontSize: 13, color: '#90A4AE', marginTop: 5, textAlign: 'center' },
  emptyAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EEF2FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginTop: 16,
  },
  emptyActionText: { fontSize: 13, fontWeight: '700', color: NAVY },

  // Section Hero (Workers / Services tabs top banner)
  sectionHero: {
    borderRadius: 20, padding: 24, marginBottom: 16, overflow: 'hidden',
    elevation: 5, shadowColor: NAVY, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 10,
  },
  sectionHeroContent: { alignItems: 'center' },
  sectionHeroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 10 },
  sectionHeroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 6 },

  // Worker Card
  workerCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 5,
  },
  workerAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  workerAvatarText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  workerInfo: { flex: 1, marginLeft: 12 },
  workerName: { fontSize: 15, fontWeight: '700', color: '#1f2128' },
  workerTradeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  workerTrade: { fontSize: 12, color: PURPLE, fontWeight: '600' },
  workerStats: { flexDirection: 'row', marginTop: 6 },
  workerStatChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F5F5F5', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  workerStatText: { fontSize: 11, color: '#546E7A', fontWeight: '600' },
  rehireBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: NAVY, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  rehireBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  hireNewBanner: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16,
    marginTop: 10, backgroundColor: '#E3F2FD',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  hireNewTitle: { fontSize: 14, fontWeight: '700', color: INFO },
  hireNewSub: { fontSize: 12, color: '#78909C', marginTop: 2 },

  // Services grid
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  svcCard: {
    borderRadius: 16, padding: 16, alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  svcEmoji: { fontSize: 30, marginBottom: 8 },
  svcName: { fontSize: 13, fontWeight: '700', textAlign: 'center' },

  // Finances
  financeHero: {
    borderRadius: 20, padding: 22, marginBottom: 14, overflow: 'hidden', alignItems: 'center',
    elevation: 6, shadowColor: NAVY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12,
  },
  financeLabel: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 6 },
  financeAmount: { fontSize: 34, fontWeight: '800', color: GOLD, marginBottom: 16 },
  financeRow: { flexDirection: 'row', width: '100%', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 12, overflow: 'hidden' },
  financeStat: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4 },
  financeStatVal: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  financeStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)' },
  walletBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 18 },
  walletBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, gap: 10 },
  walletBtnText: { fontSize: 16, fontWeight: '800', color: NAVY },
  releaseCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 2, shadowColor: SUCCESS, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
    borderLeftWidth: 4, borderLeftColor: SUCCESS,
  },
  releaseCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  releaseIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  releaseJobName: { fontSize: 14, fontWeight: '700', color: '#1f2128' },
  releaseWorkerName: { fontSize: 12, color: '#78909C', marginTop: 1 },
  releaseDate: { fontSize: 11, color: '#B0BEC5', marginTop: 2 },
  releaseCardRight: { alignItems: 'flex-end', gap: 8 },
  releaseAmount: { fontSize: 16, fontWeight: '800', color: SUCCESS },
  releaseBigBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: SUCCESS, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  releaseBigBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  txnGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  txnCard: {
    flex: 1, borderRadius: 14, padding: 14, alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  txnValue: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  txnLabel: { fontSize: 10, color: '#78909C', marginTop: 3, textAlign: 'center', fontWeight: '600' },

  // Profile
  profileHero: {
    borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 16, overflow: 'hidden',
    elevation: 6, shadowColor: NAVY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12,
  },
  profileAvatarLg: { width: 80, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  profileName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  profileRole: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  profileBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  profileBadgeText: { fontSize: 13, fontWeight: '700' },
  detailsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 1 },
  detailsTitle: { fontSize: 15, fontWeight: '800', color: '#1f2128', marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#ECEFF1' },
  detailLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { fontSize: 13, color: '#78909C' },
  detailValue: { fontSize: 13, fontWeight: '700', color: '#37474F', textTransform: 'capitalize' },
  menuGroupTitle: { fontSize: 12, fontWeight: '800', color: '#90A4AE', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  menuGroup: { backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 16, overflow: 'hidden', elevation: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  menuItemBorder: { borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  menuItemText: { fontSize: 14, fontWeight: '500', color: '#37474F' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#FFCDD2',
    backgroundColor: '#FFF5F5', marginTop: 4, marginBottom: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: DANGER },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    paddingBottom: Platform.OS === 'ios' ? 26 : 10, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: '#E8EAF6',
    elevation: 12, shadowColor: NAVY, shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 10,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 4, gap: 2 },
  navActiveIndicator: { width: 28, height: 3, backgroundColor: NAVY, borderRadius: 3, position: 'absolute', top: 0 },
  navLabel: { fontSize: 10, color: '#9E9E9E', fontWeight: '500' },
  navLabelActive: { color: NAVY, fontWeight: '800' },

  // Celebration Modal
  celebCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, alignItems: 'center',
    width: SCREEN_WIDTH * 0.82,
    elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20,
  },
  celebEmoji: { fontSize: 60, marginBottom: 12 },
  celebTitle: { fontSize: 24, fontWeight: '800', color: '#1f2128', marginBottom: 8 },
  celebSub: { fontSize: 14, color: '#78909C', textAlign: 'center', lineHeight: 21, marginBottom: 16 },
  celebBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SUCCESS_LIGHT, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  celebBadgeText: { fontSize: 13, fontWeight: '700', color: SUCCESS },

  // ── Quote cards ──────────────────────────────────────────
  quoteCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    elevation: 3, shadowColor: GOLD, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8,
    borderLeftWidth: 4, borderLeftColor: GOLD,
  },
  quoteHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  quoteArtisanName: { fontSize: 15, fontWeight: '700', color: '#1f2128' },
  quoteTrade: { fontSize: 12, color: '#78909C', marginTop: 2 },
  quoteBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  quoteBadgeText: { fontSize: 11, fontWeight: '700' },
  quoteCostRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  quoteCostLabel: { fontSize: 13, color: '#78909C' },
  quoteCostVal: { fontSize: 13, color: '#37474F', fontWeight: '500' },
  quoteActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quoteAcceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: SUCCESS, paddingVertical: 9, borderRadius: 10,
  },
  quoteAcceptBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  quoteNegotiateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: GOLD + '20', paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: GOLD_DARK + '50',
  },
  quoteNegotiateBtnText: { fontSize: 13, fontWeight: '700', color: NAVY },
  quoteRejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#FFEBEE', paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: DANGER + '30',
  },
  quoteRejectBtnText: { fontSize: 13, fontWeight: '700', color: DANGER },

  // ── Job board ─────────────────────────────────────────────
  postJobCta: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 16,
    elevation: 4, shadowColor: NAVY, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8,
  },
  postJobCtaTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  postJobCtaSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  postedJobCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    elevation: 2, shadowColor: TEAL, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
    borderLeftWidth: 4, borderLeftColor: TEAL,
  },
  postedJobHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  postedJobTitle: { fontSize: 15, fontWeight: '700', color: '#1f2128' },
  postedJobCategory: { fontSize: 12, color: '#78909C', marginTop: 2 },
  postedJobStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  postedJobStatusText: { fontSize: 11, fontWeight: '700' },
  postedJobMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  postedJobMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F5F5F5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  postedJobMetaText: { fontSize: 11, color: '#546E7A', fontWeight: '500' },
  applicantRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7,
    borderTopWidth: 0.5, borderTopColor: '#ECEFF1',
  },
  applicantAvatar: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  applicantName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#37474F' },
  applicantAcceptBtn: {
    backgroundColor: SUCCESS, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  applicantAcceptBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  applicantRejectBtn: {
    backgroundColor: '#FFEBEE', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: DANGER + '30',
  },
  applicantRejectBtnText: { fontSize: 11, fontWeight: '700', color: DANGER },

  // ── Worker photo & verified badge ────────────────────────
  workerPhotoWrap: { position: 'relative', width: 50, height: 50, marginRight: 2 },
  workerPhoto: { width: 50, height: 50, borderRadius: 14, borderWidth: 2, borderColor: '#E8EAF6' },
  workerVerifiedBadge: {
    position: 'absolute', bottom: -3, right: -3, width: 20, height: 20,
    borderRadius: 10, backgroundColor: INFO, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },

  // ── Logo upload ──────────────────────────────────────────
  heroLogoImg: { width: 60, height: 60, borderRadius: 16, borderWidth: 2, borderColor: GOLD + '50' },
  logoUploadWrap: { position: 'relative', marginBottom: 14 },
  logoImage: { width: 80, height: 80, borderRadius: 22, borderWidth: 2, borderColor: GOLD + '60' },
  logoUploadOverlay: {
    position: 'absolute', bottom: 0, right: 0, width: 28, height: 28,
    borderRadius: 14, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },

  // ── Notification bell badge ──────────────────────────────
  notifBadge: {
    position: 'absolute', top: -5, right: -6,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: DANGER, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: NAVY,
  },
  notifBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },

  // ── Awaiting quote badge ──────────────────────────────────
  awaitingQuoteBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: WARNING + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    borderWidth: 1, borderColor: WARNING + '40',
  },
  awaitingQuoteText: { fontSize: 11, fontWeight: '700', color: WARNING },

  // ── Quote card enhancements ───────────────────────────────
  quoteArtisanPhoto: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: GOLD + '50' },
  quoteArtisanAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quoteArtisanInitials: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  quoteWorkDescBox: {
    backgroundColor: '#F8F9FF', borderRadius: 10, padding: 12,
    marginBottom: 10, borderLeftWidth: 3, borderLeftColor: NAVY,
  },
  quoteWorkDescHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  quoteWorkDescTitle: { fontSize: 12, fontWeight: '700', color: NAVY, textTransform: 'uppercase', letterSpacing: 0.4 },
  quoteWorkDescText: { fontSize: 13, color: '#546E7A', lineHeight: 19 },
  quoteBreakdownBox: {
    backgroundColor: '#FAFAFA', borderRadius: 10, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#ECEFF1',
  },
  quoteBreakdownTitle: { fontSize: 11, fontWeight: '800', color: '#90A4AE', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  quoteTotalRow: { borderTopWidth: 1.5, borderTopColor: '#ECEFF1', marginTop: 6, paddingTop: 8 },
  quoteTotalLabel: { fontSize: 14, fontWeight: '800', color: NAVY },
  quoteTotalVal: { fontSize: 16, fontWeight: '800', color: NAVY },
  quoteDurationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: '#ECEFF1' },
  quoteDurationText: { fontSize: 12, color: '#78909C', fontStyle: 'italic' },

  // ── Post Job Modal enhancements ───────────────────────────
  postJobModalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingVertical: 16,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  postJobModalTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  postJobFieldLabel: { fontSize: 12, fontWeight: '700', color: '#546E7A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  postJobInput: {
    borderWidth: 1.5, borderColor: '#CFD8DC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#37474F',
    backgroundColor: '#FAFAFA', marginBottom: 14,
  },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E0E0E0',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  catChipActive: { borderColor: NAVY, backgroundColor: NAVY + '12' },
  catChipEmoji: { fontSize: 14 },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#546E7A' },
  catChipTextActive: { color: NAVY, fontWeight: '700' },
  locationChip: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E0E0E0',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  locationChipActive: { borderColor: INFO, backgroundColor: INFO + '12' },
  locationChipText: { fontSize: 13, fontWeight: '600', color: '#546E7A' },
  locationChipTextActive: { color: INFO, fontWeight: '700' },
  dateChip: {
    alignItems: 'center', backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#E0E0E0',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, minWidth: 52,
  },
  dateChipActive: { borderColor: NAVY, backgroundColor: NAVY },
  dateChipDay: { fontSize: 10, fontWeight: '600', color: '#90A4AE' },
  dateChipDate: { fontSize: 18, fontWeight: '800', color: '#37474F' },
  dateChipMonth: { fontSize: 10, color: '#90A4AE' },
  dateChipTextActive: { color: '#FFFFFF' },
  urgencyChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10,
    paddingVertical: 9, backgroundColor: '#FAFAFA',
  },
  urgencyChipText: { fontSize: 12, fontWeight: '600', color: '#90A4AE' },
  jobTypeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10,
    paddingVertical: 10, backgroundColor: '#FAFAFA',
  },
  jobTypeChipActive: { borderColor: NAVY, backgroundColor: NAVY + '10' },
  jobTypeChipText: { fontSize: 12, fontWeight: '600', color: '#90A4AE' },

  // ── Modals ───────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22, width: '100%',
    elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1f2128', marginBottom: 14 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#CFD8DC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#37474F',
    backgroundColor: '#FAFAFA',
  },
  modalSubmitBtn: {
    backgroundColor: NAVY, paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  modalSubmitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
