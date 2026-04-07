import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput,
  Pressable,
  Image,
  FlatList,
  Dimensions,
  RefreshControl,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeInUp, ZoomIn, BounceIn, SlideInRight } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { spacing } from '../config/theme';
import { getTopRatedArtisans, getActiveJobs, getWalletBalance, getCustomerProfile, Artisan, ActiveJob } from '../services/customerService';
import { getStoredUser } from '../services/loginService';
import { getCustomerBookings, releaseFund, BookingResponse, getBookingQuote, acceptBookingQuote, rejectBookingQuote, negotiateBookingQuote, QuoteResponse } from '../services/bookingService';
import { getConversations, Conversation } from '../services/chatService';
import { getTransactionHistory, Transaction } from '../services/escrowService';

const { width } = Dimensions.get('window');

// ─── PALETTE (matches CompanyDashboard) ────────────────────────────
const GOLD       = '#FFC107';
const GOLD_DARK  = '#FFA000';
const GOLD_LIGHT = '#FFF8E1';
const NAVY       = '#1a237e';
const NAVY_LIGHT = '#283593';
const NAVY_MID   = '#303F9F';
const NAVY_DARK  = '#0d1642';
const SUCCESS    = '#4CAF50';
const DANGER     = '#F44336';
const INFO       = '#2196F3';
const PURPLE     = '#7C4DFF';
const TEAL       = '#009688';
const BG         = '#F0F2F8';

// ─── FLOATING ORB DECORATION ──────────────────────────────────────
const FloatingOrb = ({ size, color, style }: { size: number; color: string; style?: object }) => (
  <View
    pointerEvents="none"
    style={[
      { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      style,
    ]}
  />
);

// ─── TIME GREETING ────────────────────────────────────────────────
const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

type BottomTab = 'home' | 'history' | 'messages' | 'profile';

const SERVICES = [
  { id: 'plumbing', name: 'Plumbing', icon: 'pipe-wrench', color: '#2196F3' },
  { id: 'electrical', name: 'Electrician', icon: 'flash', color: '#FFC107' },
  { id: 'ac-repair', name: 'AC Repair', icon: 'air-conditioner', color: '#00BCD4' },
  { id: 'cleaning', name: 'Cleaning', icon: 'broom', color: '#4CAF50' },
  { id: 'mechanic', name: 'Mechanic', icon: 'car-wrench', color: '#F44336' },
  { id: 'carpentry', name: 'Carpentry', icon: 'hammer', color: '#795548' },
  { id: 'painting', name: 'Painting', icon: 'format-paint', color: '#9C27B0' },
  { id: 'all', name: 'More', icon: 'dots-grid', color: '#607D8B' },
];

export default function CustomerHomeScreen() {
  const [userName, setUserName] = useState('Customer');
  const [location, setLocation] = useState('Loading...');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const [topArtisans, setTopArtisans] = useState<Artisan[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [escrowAmount, setEscrowAmount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BottomTab>('home');
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [releasingId, setReleasingId] = useState<number | null>(null);
  const [bookingQuotes, setBookingQuotes] = useState<Record<number, QuoteResponse>>({});
  const [respondingQuoteId, setRespondingQuoteId] = useState<number | null>(null);

  useEffect(() => {
    initializeUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeUser = async () => {
    try {
      // Get GPS location first, then pass coords directly to avoid stale closure
      const coords = await getUserLocation();
      const storedUser = await getStoredUser();
      if (storedUser) {
        setCustomerId(storedUser.id);
        setUserName(storedUser.fullName || storedUser.name || 'Customer');
        console.log('👤 Logged in user:', storedUser.fullName, 'ID:', storedUser.id);
        loadData(storedUser.id, coords);
      } else {
        console.warn('⚠️ No user data found, redirecting to login');
        router.replace('/');
      }
    } catch (error) {
      console.error('Error initializing user:', error);
      router.replace('/');
    }
  };

  const getUserLocation = async (): Promise<{ latitude: number; longitude: number }> => {
    const fallback = { latitude: 6.5244, longitude: 3.3792 }; // Lagos fallback
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserCoords(coords);
        // Reverse geocode for display
        try {
          const [geo] = await Location.reverseGeocodeAsync(coords);
          if (geo) {
            const parts = [geo.district, geo.city].filter(Boolean);
            if (parts.length > 0) setLocation(parts.join(', '));
          }
        } catch {
          // Reverse geocode failed, keep default label
        }
        return coords;
      }
    } catch {
      // Location permission denied or error
    }
    setUserCoords(fallback);
    return fallback;
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      searchInputRef.current?.focus();
      return;
    }
    setShowSuggestions(false);
    router.push({
      pathname: '/service-search',
      params: { query: searchQuery.trim() },
    });
  };

  const handleVoiceSearch = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsListening(true);
    // Focus search input for manual typing with visual feedback
    searchInputRef.current?.focus();
    Alert.alert(
      '🎤 Voice Search',
      'Type your search in the box — voice recognition requires the microphone permission and an active connection.',
      [{ text: 'OK', onPress: () => setIsListening(false) }]
    );
  };

  const loadData = async (userId: string, freshCoords?: { latitude: number; longitude: number }) => {
    try {
      setLoading(true);
      // Use freshly fetched coords (avoiding stale closure), fall back to state, then Lagos
      const coords = freshCoords || userCoords || { latitude: 6.5244, longitude: 3.3792 };

      const [artisans, jobs, balance, profile] = await Promise.all([
        getTopRatedArtisans(coords.latitude, coords.longitude),
        getActiveJobs(userId),
        getWalletBalance(userId),
        getCustomerProfile(userId),
      ]);

      setTopArtisans(artisans);
      setActiveJobs(jobs);
      setWalletBalance(balance);
      setEscrowAmount(profile.escrowAmount || 0);

      // Set real location from profile
      if (profile.location && profile.location.trim() !== '') {
        setLocation(profile.location);
      } else {
        setLocation('Set your location');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    if (customerId) {
      setRefreshing(true);
      loadData(customerId);
      if (activeTab === 'history') loadHistory();
      if (activeTab === 'messages') loadMessages();
    }
  };

  // Load bookings + transactions for History tab
  const loadHistory = useCallback(async () => {
    if (!customerId) return;
    try {
      setHistoryLoading(true);
      const [bks, txRes] = await Promise.all([
        getCustomerBookings(customerId),
        getTransactionHistory(parseInt(customerId), undefined, 1, 50).catch(() => ({ transactions: [] })),
      ]);
      setBookings(bks);
      setTransactions(txRes.transactions || []);

      // Fetch active quotes for bookings that are in 'quoted' or 'negotiating' status
      const quotedBookings = bks.filter(b => b.status === 'quoted' || b.status === 'negotiating');
      if (quotedBookings.length > 0) {
        const quoteEntries = await Promise.all(
          quotedBookings.map(async b => {
            const q = await getBookingQuote(b.id);
            return q ? ([b.id, q] as [number, QuoteResponse]) : null;
          })
        );
        const quoteMap: Record<number, QuoteResponse> = {};
        quoteEntries.forEach(e => { if (e) quoteMap[e[0]] = e[1]; });
        setBookingQuotes(quoteMap);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [customerId]);

  // Load conversations for Messages tab
  const loadMessages = useCallback(async () => {
    if (!customerId) return;
    try {
      setMsgsLoading(true);
      const convs = await getConversations(parseInt(customerId), 'customer');
      setConversations(convs);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setMsgsLoading(false);
    }
  }, [customerId]);

  // Reload data when switching tabs
  useEffect(() => {
    if (activeTab === 'history' && customerId) loadHistory();
    if (activeTab === 'messages' && customerId) loadMessages();
  }, [activeTab, customerId, loadHistory, loadMessages]);

  // Handle release fund
  const handleReleaseFund = async (bookingId: number) => {
    if (!customerId) return;
    Alert.alert(
      'Release Payment',
      'Are you satisfied with the work? Releasing payment will transfer the escrowed funds to the artisan.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release Fund',
          onPress: async () => {
            try {
              setReleasingId(bookingId);
              const payout = await releaseFund(bookingId, parseInt(customerId));
              Alert.alert('Payment Released!', `₦${payout.artisanPayout.toLocaleString()} sent to artisan.`);
              loadHistory();
              loadData(customerId);
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.error || 'Failed to release funds');
            } finally {
              setReleasingId(null);
            }
          },
        },
      ]
    );
  };

  // Handle dispute
  const handleDispute = (bookingId: number) => {
    Alert.alert(
      '⚠️ Raise Dispute',
      'Are you not satisfied with the work? A support agent will review the uploaded proof and mediate.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Raise Dispute',
          style: 'destructive',
          onPress: () => router.push('/dispute' as any),
        },
      ]
    );
  };

  // ─── Quote action handlers ───────────────────
  const handleAcceptQuote = async (bookingId: number, quoteId: number, grandTotal: number) => {
    if (!customerId) return;
    if (walletBalance < grandTotal) {
      Alert.alert(
        'Insufficient Balance',
        `You need ₦${grandTotal.toLocaleString()} to accept this quote but your wallet has ₦${walletBalance.toLocaleString()}.\nPlease fund your wallet first.`,
        [{ text: 'OK' }]
      );
      return;
    }
    Alert.alert(
      'Accept Quote',
      `₦${grandTotal.toLocaleString()} will be locked in escrow. The artisan can only start work after this.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept & Lock Funds',
          onPress: async () => {
            try {
              setRespondingQuoteId(quoteId);
              await acceptBookingQuote(quoteId, customerId);
              Alert.alert('Quote Accepted!', 'Funds are locked in escrow. The artisan will now head to your location.');
              await loadHistory();
              await loadData(customerId);
            } catch (err: any) {
              const code = err?.response?.data?.code;
              if (code === 'INSUFFICIENT_BALANCE') {
                const { required, available } = err.response.data;
                Alert.alert('Insufficient Balance', `Required: ₦${required?.toLocaleString()}\nAvailable: ₦${available?.toLocaleString()}\n\nPlease top up your wallet.`);
              } else {
                Alert.alert('Error', err?.response?.data?.message || 'Failed to accept quote.');
              }
            } finally {
              setRespondingQuoteId(null);
            }
          },
        },
      ]
    );
  };

  const handleRejectQuote = async (bookingId: number, quoteId: number) => {
    Alert.alert(
      'Reject Quote',
      'Rejecting this quote will cancel the booking. Are you sure?',
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Reject & Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setRespondingQuoteId(quoteId);
              await rejectBookingQuote(quoteId, customerId!, 'Not interested');
              Alert.alert('Quote Rejected', 'The booking has been cancelled.');
              await loadHistory();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to reject quote.');
            } finally {
              setRespondingQuoteId(null);
            }
          },
        },
      ]
    );
  };

  const handleNegotiateQuote = async (bookingId: number, quoteId: number) => {
    Alert.prompt(
      'Request Revision',
      'Tell the artisan what you\'d like to change (optional):',
      async (reason?: string) => {
        try {
          setRespondingQuoteId(quoteId);
          await negotiateBookingQuote(quoteId, customerId!, reason || undefined);
          Alert.alert('Revision Requested', 'The artisan will submit a revised quote shortly.');
          await loadHistory();
        } catch (err: any) {
          Alert.alert('Error', err?.response?.data?.message || 'Failed to request revision.');
        } finally {
          setRespondingQuoteId(null);
        }
      },
      'plain-text'
    );
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'accepted': case 'confirmed': return '#2196F3';
      case 'quoted': return '#FF9800';
      case 'negotiating': return '#7C4DFF';
      case 'funded': return '#009688';
      case 'on-the-way': return '#FFC107';
      case 'in-progress': return '#9C27B0';
      case 'job-done': return '#8BC34A';
      case 'released': case 'completed': return '#4CAF50';
      case 'cancelled': case 'rejected': return '#F44336';
      default: return '#757575';
    }
  };

  const getBookingStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'quoted': return 'Quote Received';
      case 'negotiating': return 'Revision Requested';
      case 'funded': return 'Funded — In Progress';
      case 'on-the-way': return 'On The Way';
      case 'in-progress': return 'In Progress';
      case 'job-done': return 'Job Done — Review';
      case 'released': return 'Completed';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const handleServicePress = (serviceId: string) => {
    console.log('Service pressed:', serviceId);
    const service = SERVICES.find(s => s.id === serviceId);
    router.push({
      pathname: '/service-search',
      params: { serviceType: service?.name || serviceId },
    });
  };

  const handleArtisanPress = (artisan: Artisan) => {
    console.log('Artisan pressed:', artisan.name);
    router.push({
      pathname: '/artisan-profile',
      params: {
        id: artisan.id,
        name: artisan.name,
        trade: artisan.trade,
        photo: artisan.photo || '',
        rating: String(artisan.rating),
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-the-way': return '#FFC107';
      case 'in-progress': return '#2196F3';
      case 'completed': return '#4CAF50';
      default: return '#757575';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Waiting for artisan';
      case 'accepted': return 'Request accepted';
      case 'on-the-way': return 'On the way';
      case 'in-progress': return 'Work in progress';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const activeJob = activeJobs.length > 0 ? activeJobs[0] : null;

  // ─── RENDER: History Tab ──────────────────────
  const renderHistoryTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a237e']} />}
    >
      <Text style={styles.tabTitle}>Booking History</Text>

      {historyLoading ? (
        <ActivityIndicator size="large" color="#1a237e" style={{ marginTop: 40 }} />
      ) : bookings.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="clipboard-text-clock-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptySubtext}>Your booking history will appear here</Text>
        </View>
      ) : (
        bookings.map((booking, i) => (
          <Animated.View key={booking.id} entering={FadeInDown.delay(50 * i)}>
            <View style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookingArtisan}>{booking.artisanName}</Text>
                  <Text style={styles.bookingService}>{booking.artisanTrade || booking.serviceType}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getBookingStatusColor(booking.status) }]}>
                  <Text style={styles.statusBadgeText}>{getBookingStatusLabel(booking.status)}</Text>
                </View>
              </View>

              <View style={styles.bookingDetails}>
                <View style={styles.bookingDetailRow}>
                  <MaterialCommunityIcons name="calendar" size={16} color="#757575" />
                  <Text style={styles.bookingDetailText}>{booking.scheduledDate} at {booking.scheduledTime}</Text>
                </View>
                <View style={styles.bookingDetailRow}>
                  <MaterialCommunityIcons name="map-marker" size={16} color="#757575" />
                  <Text style={styles.bookingDetailText} numberOfLines={1}>
                    {typeof booking.location === 'string' ? booking.location : booking.location?.address || 'N/A'}
                  </Text>
                </View>
                {(booking as any).artisanLocation ? (
                  <View style={styles.bookingDetailRow}>
                    <MaterialCommunityIcons name="store" size={16} color="#2196F3" />
                    <Text style={[styles.bookingDetailText, { color: '#2196F3' }]}>Artisan: {(booking as any).artisanLocation}</Text>
                  </View>
                ) : null}
                <View style={styles.bookingDetailRow}>
                  <MaterialCommunityIcons name="cash" size={16} color="#1a237e" />
                  <Text style={[styles.bookingDetailText, { fontWeight: '700', color: '#1a237e' }]}>
                    ₦{(booking.estimatedPrice || 0).toLocaleString()} in escrow
                  </Text>
                </View>
              </View>

              {/* Quote Review Card — shown when artisan has submitted a quote */}
              {booking.status === 'quoted' && bookingQuotes[booking.id] && (() => {
                const quote = bookingQuotes[booking.id];
                const isResponding = respondingQuoteId === quote.id;
                return (
                  <View style={styles.quoteCard}>
                    <View style={styles.quoteCardHeader}>
                      <MaterialCommunityIcons name="file-document-outline" size={20} color="#FF9800" />
                      <Text style={styles.quoteCardTitle}>Quote Received</Text>
                    </View>
                    <View style={styles.quoteAmountRow}>
                      <Text style={styles.quoteAmountLabel}>Quoted Amount</Text>
                      <Text style={styles.quoteAmountValue}>₦{quote.grandTotal.toLocaleString()}</Text>
                    </View>
                    {quote.workDescription ? (
                      <View style={styles.quoteDescBox}>
                        <Text style={styles.quoteDescText}>{quote.workDescription}</Text>
                      </View>
                    ) : null}
                    {quote.duration ? (
                      <View style={styles.quoteDurationRow}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color="#757575" />
                        <Text style={styles.quoteDurationText}>Est. {quote.duration}</Text>
                      </View>
                    ) : null}
                    {isResponding ? (
                      <ActivityIndicator size="small" color="#1a237e" style={{ marginTop: 12 }} />
                    ) : (
                      <View style={styles.quoteActions}>
                        <TouchableOpacity
                          style={[styles.quoteActionBtn, styles.rejectBtn]}
                          onPress={() => handleRejectQuote(booking.id, quote.id)}
                        >
                          <MaterialCommunityIcons name="close" size={14} color="#F44336" />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.quoteActionBtn, styles.negotiateBtn]}
                          onPress={() => handleNegotiateQuote(booking.id, quote.id)}
                        >
                          <MaterialCommunityIcons name="chat-processing-outline" size={14} color="#7C4DFF" />
                          <Text style={styles.negotiateBtnText}>Negotiate</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.quoteActionBtn, styles.acceptBtn]}
                          onPress={() => handleAcceptQuote(booking.id, quote.id, quote.grandTotal)}
                        >
                          <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.acceptBtnGrad}>
                            <MaterialCommunityIcons name="check" size={14} color="#fff" />
                            <Text style={styles.acceptBtnText}>Accept</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* Negotiating badge */}
              {booking.status === 'negotiating' && (
                <View style={styles.negotiatingBadge}>
                  <MaterialCommunityIcons name="refresh" size={14} color="#7C4DFF" />
                  <Text style={styles.negotiatingText}>Revision requested &mdash; waiting for artisan&apos;s new quote</Text>
                </View>
              )}

              {/* Release Fund + Dispute buttons for job-done bookings */}
              {booking.status === 'job-done' && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TouchableOpacity
                    style={[styles.releaseFundBtn, { flex: 1 }]}
                    onPress={() => handleReleaseFund(booking.id)}
                    disabled={releasingId === booking.id}
                  >
                    <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.releaseFundGrad}>
                      {releasingId === booking.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="lock-open-variant" size={18} color="#fff" />
                          <Text style={styles.releaseFundText}>Release Fund</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.releaseFundBtn, { flex: 1 }]}
                    onPress={() => handleDispute(booking.id)}
                  >
                    <LinearGradient colors={['#E53935', '#B71C1C']} style={styles.releaseFundGrad}>
                      <MaterialCommunityIcons name="shield-alert" size={18} color="#fff" />
                      <Text style={styles.releaseFundText}>Dispute</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {/* Chat button for active bookings */}
              {['accepted', 'on-the-way', 'in-progress', 'funded', 'job-done'].includes(booking.status) && (
                <TouchableOpacity
                  style={styles.chatBookingBtn}
                  onPress={() => router.push({
                    pathname: '/chat',
                    params: {
                      artisanUserId: String(booking.artisanUserId),
                      artisanName: booking.artisanName,
                      artisanPhoto: booking.artisanPhoto || '',
                      artisanTrade: booking.artisanTrade,
                      bookingId: String(booking.id),
                    },
                  })}
                >
                  <MaterialCommunityIcons name="message-text-outline" size={18} color="#1a237e" />
                  <Text style={styles.chatBookingBtnText}>Message Artisan</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        ))
      )}

      {/* Transaction History Section */}
      {transactions.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.tabSubTitle}>Transaction History</Text>
          {transactions.map((tx, i) => (
            <Animated.View key={tx.id} entering={FadeInDown.delay(50 * i)}>
              <View style={styles.txRow}>
                <View style={[styles.txIcon, { backgroundColor: tx.direction === 'credit' ? '#E8F5E9' : '#FFEBEE' }]}>
                  <MaterialCommunityIcons
                    name={tx.direction === 'credit' ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={22}
                    color={tx.direction === 'credit' ? '#4CAF50' : '#F44336'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txType}>{tx.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
                  <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.direction === 'credit' ? '#4CAF50' : '#F44336' }]}>
                  {tx.displayAmount || `₦${tx.amount.toLocaleString()}`}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  // ─── RENDER: Messages Tab ─────────────────────
  const renderMessagesTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a237e']} />}
    >
      <Text style={styles.tabTitle}>Messages</Text>

      {msgsLoading ? (
        <ActivityIndicator size="large" color="#1a237e" style={{ marginTop: 40 }} />
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="message-text-clock-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Start by hiring an artisan to message them</Text>
        </View>
      ) : (
        conversations.map((conv, i) => {
          const unread = conv.unreadCount || 0;
          return (
            <Animated.View key={conv.id} entering={FadeInDown.delay(50 * i)}>
              <TouchableOpacity
                style={styles.convCard}
                onPress={() => router.push({
                  pathname: '/chat',
                  params: {
                    conversationId: String(conv.id),
                    artisanUserId: String(conv.artisanUserId),
                    artisanName: conv.artisanName,
                    artisanPhoto: conv.artisanAvatar || '',
                    artisanTrade: conv.artisanTrade || '',
                  },
                })}
                activeOpacity={0.7}
              >
                {conv.artisanAvatar ? (
                  <Image source={{ uri: conv.artisanAvatar }} style={styles.convAvatar} />
                ) : (
                  <LinearGradient colors={['#1a237e', '#303F9F']} style={styles.convAvatar}>
                    <Text style={styles.convAvatarText}>{conv.artisanName?.charAt(0)?.toUpperCase() || '?'}</Text>
                  </LinearGradient>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[styles.convName, unread > 0 && { fontWeight: '800' }]} numberOfLines={1}>{conv.artisanName}</Text>
                    <Text style={styles.convTime}>
                      {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.convPreview} numberOfLines={1}>{conv.lastMessage || conv.artisanTrade || 'Start chatting...'}</Text>
                    {unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  // ─── MAIN RETURN ──────────────────────────────
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={[styles.container, { backgroundColor: BG }]}>
        {/* ─── GRADIENT HERO HEADER ──────────────── */}
        <LinearGradient
          colors={[NAVY_DARK, NAVY, NAVY_MID]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroHeader}
        >
          {/* Floating orb decorations */}
          <FloatingOrb size={160} color="rgba(255,193,7,0.07)" style={{ top: -50, right: -40 }} />
          <FloatingOrb size={100} color="rgba(255,255,255,0.05)" style={{ top: 10, right: 100 }} />
          <FloatingOrb size={70}  color="rgba(255,193,7,0.05)" style={{ bottom: -20, left: 30 }} />
          <FloatingOrb size={50}  color="rgba(255,255,255,0.04)" style={{ top: 20, left: 200 }} />

          <Animated.View entering={FadeInDown.delay(80)} style={styles.heroRow}>
            {/* Left: greeting + name + location */}
            <View style={styles.heroLeft}>
              <Text style={styles.heroGreeting}>{getTimeOfDay()} 👋</Text>
              <Text style={styles.heroName} numberOfLines={1}>{userName}</Text>
              <View style={styles.heroLocationRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={13} color={GOLD} />
                <Text style={styles.heroLocationText} numberOfLines={1}>{location}</Text>
              </View>
            </View>
            {/* Right: notification bell */}
            <Pressable style={styles.heroBell} onPress={() => router.push('/notifications' as any)}>
              <MaterialCommunityIcons name="bell-outline" size={24} color="#FFFFFF" />
              <View style={styles.heroBellDot} />
            </Pressable>
          </Animated.View>
        </LinearGradient>

        {/* TAB CONTENT */}
        {activeTab === 'home' && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a237e']} />
          }
        >
          {/* Financial Control Center - Wallet Card */}
          <Animated.View entering={ZoomIn.delay(150)}>
            <LinearGradient
              colors={[NAVY_DARK, NAVY, NAVY_LIGHT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.walletCard}
            >
              {/* Orb decorations inside card */}
              <FloatingOrb size={120} color="rgba(255,193,7,0.08)" style={{ top: -20, right: -20 }} />
              <FloatingOrb size={70}  color="rgba(255,255,255,0.05)" style={{ bottom: 10, right: 80 }} />

              <View style={styles.walletHeader}>
                <View>
                  <Text style={styles.walletLabel}>Available Balance</Text>
                  <Text style={styles.walletBalance}>₦{walletBalance.toLocaleString()}.00</Text>
                </View>
                <View style={styles.walletIconBg}>
                  <MaterialCommunityIcons name="wallet-outline" size={28} color={GOLD} />
                </View>
              </View>

              <View style={styles.escrowRow}>
                <MaterialCommunityIcons name="lock" size={14} color={GOLD} />
                <Text style={styles.escrowText}>In Escrow: ₦{escrowAmount.toLocaleString()}</Text>
              </View>

              <Pressable style={styles.topUpButton} onPress={() => router.push('/wallet')}>
                <MaterialCommunityIcons name="plus-circle" size={20} color={NAVY} />
                <Text style={styles.topUpText}>Top Up Wallet</Text>
              </Pressable>
            </LinearGradient>
          </Animated.View>

          {/* ─── NEW: Video Job + Job Feed Action Cards ──────── */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.actionCardsRow}>
            <Pressable
              style={[styles.actionCard, { backgroundColor: '#E8EAF6' }]}
              onPress={() => router.push('/post-job' as any)}
            >
              <LinearGradient
                colors={[NAVY, NAVY_LIGHT]}
                style={styles.actionCardIcon}
              >
                <MaterialCommunityIcons name="video-plus" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionCardTitle}>Post a Job</Text>
              <Text style={styles.actionCardSub}>Video description</Text>
            </Pressable>

            <Pressable
              style={[styles.actionCard, { backgroundColor: '#FFF8E1' }]}
              onPress={() => router.push('/job-feed' as any)}
            >
              <LinearGradient
                colors={[GOLD_DARK, GOLD]}
                style={styles.actionCardIcon}
              >
                <MaterialCommunityIcons name="briefcase-search" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionCardTitle}>Browse Jobs</Text>
              <Text style={styles.actionCardSub}>Find services</Text>
            </Pressable>

            <Pressable
              style={[styles.actionCard, { backgroundColor: '#E3F2FD' }]}
              onPress={() => router.push('/conversations' as any)}
            >
              <LinearGradient
                colors={[INFO, '#1976D2']}
                style={styles.actionCardIcon}
              >
                <MaterialCommunityIcons name="message-text" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionCardTitle}>Messages</Text>
              <Text style={styles.actionCardSub}>Chat & invoices</Text>
            </Pressable>

            <Pressable
              style={[styles.actionCard, { backgroundColor: '#FCE4EC' }]}
              onPress={() => router.push('/reels' as any)}
            >
              <LinearGradient
                colors={['#E91E63', '#C2185B']}
                style={styles.actionCardIcon}
              >
                <MaterialCommunityIcons name="play-circle" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionCardTitle}>Reels</Text>
              <Text style={styles.actionCardSub}>Work videos</Text>
            </Pressable>
          </Animated.View>

          {/* Urgent Help Search Bar */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons name="magnify" size={24} color="#757575" style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search by name or service..."
                placeholderTextColor="#9E9E9E"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <Pressable style={[styles.voiceButton, isListening && { backgroundColor: '#ffebee' }]} onPress={handleVoiceSearch}>
                <MaterialCommunityIcons
                  name={isListening ? 'microphone-off' : 'microphone'}
                  size={24}
                  color={isListening ? '#f44336' : '#1a237e'}
                />
              </Pressable>
            </View>
          </Animated.View>

          {/* Active Job Sticky Card */}
          {activeJob && (
            <Animated.View entering={FadeInUp.delay(400)} style={styles.activeJobCard}>
              <View style={styles.activeJobHeader}>
                <View style={styles.activeJobInfo}>
                  <Image 
                    source={{ uri: 'https://randomuser.me/api/portraits/men/1.jpg' }}
                    style={styles.artisanAvatar}
                  />
                  <View style={styles.activeJobDetails}>
                    <Text style={styles.activeJobName}>{activeJob.artisanName}</Text>
                    <Text style={styles.activeJobTrade}>{activeJob.trade}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activeJob.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(activeJob.status)}</Text>
                </View>
              </View>

              {activeJob.estimatedArrival && (
                <View style={styles.etaContainer}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color="#FFC107" />
                  <Text style={styles.etaText}>Arriving in {activeJob.estimatedArrival}</Text>
                </View>
              )}

              <View style={styles.activeJobActions}>
                <Pressable style={[styles.actionButton, styles.callButton]}>
                  <MaterialCommunityIcons name="phone" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Call</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.chatButton]}
                  onPress={() => router.push({
                    pathname: '/chat',
                    params: {
                      bookingId: String(activeJob.id),
                      artisanName: activeJob.artisanName,
                      artisanTrade: activeJob.trade,
                    },
                  })}
                >
                  <MaterialCommunityIcons name="message-text" size={20} color="#1a237e" />
                  <Text style={[styles.actionButtonText, { color: '#1a237e' }]}>Chat</Text>
                </Pressable>
              </View>

              <Pressable style={styles.sosButton} onPress={() => router.push('/dispute' as any)}>
                <MaterialCommunityIcons name="alert-circle" size={16} color="#F44336" />
                <Text style={styles.sosText}>Report Issue</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* 1-Tap Service Grid */}
          <Animated.View entering={FadeInDown.delay(500)} style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Services</Text>
            <View style={styles.servicesGrid}>
              {SERVICES.map((service, index) => (
                <Animated.View
                  key={service.id}
                  entering={ZoomIn.delay(550 + index * 60).springify()}
                >
                  <Pressable
                    style={styles.serviceCard}
                    onPress={() => handleServicePress(service.id)}
                    android_ripple={{ color: 'rgba(26,35,126,0.1)' }}
                  >
                    <LinearGradient
                      colors={[service.color + '20', service.color + '08']}
                      style={styles.serviceIconContainer}
                    >
                      <MaterialCommunityIcons name={service.icon as any} size={30} color={service.color} />
                    </LinearGradient>
                    <Text style={styles.serviceName}>{service.name}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* Verified Pros Near You */}
          <Animated.View entering={FadeInDown.delay(800)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Verified Pros Near You</Text>
              <Pressable>
                <Text style={styles.seeAllText}>See All</Text>
              </Pressable>
            </View>

            <FlatList
              horizontal
              data={topArtisans}
              keyExtractor={(item, index) => `artisan-${item.id}-${index}`}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <Animated.View entering={SlideInRight.delay(850 + index * 80)}>
                  <Pressable
                    style={styles.artisanCard}
                    onPress={() => handleArtisanPress(item)}
                  >
                    {/* Photo with gradient overlay */}
                    <View style={{ position: 'relative' }}>
                      <Image source={{ uri: item.photo }} style={styles.artisanPhoto} />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.55)']}
                        style={styles.artisanPhotoOverlay}
                      />
                      {/* Star rating on photo */}
                      <View style={styles.artisanRatingPill}>
                        <MaterialCommunityIcons name="star" size={11} color={GOLD} />
                        <Text style={styles.artisanRatingPillText}>{item.rating}</Text>
                      </View>
                      {/* Badge icon */}
                      {item.badge && (
                        <View style={[styles.badgeContainer, { backgroundColor: item.badge === 'gold' ? GOLD : '#B0BEC5' }]}>
                          <MaterialCommunityIcons name="check-decagram" size={15} color="#FFFFFF" />
                        </View>
                      )}
                    </View>

                    <View style={styles.artisanInfo}>
                      <Text style={styles.artisanName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.artisanTrade}>{item.trade}</Text>

                      <View style={styles.artisanFooter}>
                        <View style={styles.distanceContainer}>
                          <MaterialCommunityIcons name="map-marker" size={11} color="#9E9E9E" />
                          <Text style={styles.distanceText}>{item.distance}km</Text>
                        </View>
                        <Text style={styles.priceText}>₦{item.startingPrice}+</Text>
                      </View>

                      <View style={styles.responseTime}>
                        <MaterialCommunityIcons name="clock-fast" size={11} color={SUCCESS} />
                        <Text style={styles.responseText}>Fast response</Text>
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              )}
              contentContainerStyle={styles.artisansList}
            />
          </Animated.View>

          {/* "How We Protect You" Footer */}
          <Animated.View entering={FadeInUp.delay(1000)} style={styles.protectionFooter}>
            <LinearGradient
              colors={['#E8EAF6', '#FFFFFF']}
              style={styles.protectionCard}
            >
              <View style={styles.protectionIcon}>
                <MaterialCommunityIcons name="shield-check" size={32} color="#1a237e" />
              </View>
              <View style={styles.protectionContent}>
                <Text style={styles.protectionTitle}>Your payment is 100% protected</Text>
                <Text style={styles.protectionText}>
                  TrustConnect Escrow holds your payment securely. We don&apos;t pay the artisan until you confirm the job is perfect.
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
        )}

        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'messages' && renderMessagesTab()}

        {/* Bottom Thumb Zone Navigation */}
        <View style={styles.bottomNav}>
          {([
            { key: 'home',     icon: 'home',              label: 'Home',     action: () => setActiveTab('home') },
            { key: 'history',  icon: 'clipboard-text',    label: 'History',  action: () => setActiveTab('history') },
            { key: 'messages', icon: 'message-text',      label: 'Messages', action: () => setActiveTab('messages') },
            { key: 'profile',  icon: 'account',           label: 'Profile',  action: () => router.push('/customer-profile') },
          ] as { key: BottomTab; icon: string; label: string; action: () => void }[]).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable key={tab.key} style={styles.navItem} onPress={tab.action}>
                <View style={styles.navIconWrap}>
                  <MaterialCommunityIcons
                    name={(isActive ? tab.icon : `${tab.icon}-outline`) as any}
                    size={24}
                    color={isActive ? NAVY : '#757575'}
                  />
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
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  // ─── Action Cards Row ─────────────────────────────────────────
  actionCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: 10,
    marginBottom: 8,
    marginTop: 4,
  },
  actionCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  actionCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B2631',
    textAlign: 'center',
  },
  actionCardSub: {
    fontSize: 10,
    color: '#78909C',
    textAlign: 'center',
    marginTop: 2,
  },
  // ─── Hero Header ──────────────────────────────────────────────
  heroHeader: {
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight || 0) + 14,
    paddingHorizontal: spacing.lg,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLeft: {
    flex: 1,
  },
  heroGreeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
    marginBottom: 4,
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroLocationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    flex: 1,
  },
  heroBell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroBellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DANGER,
    borderWidth: 1.5,
    borderColor: NAVY,
  },

  // ─── (Legacy) identityBar kept so no reference errors ─────────
  identityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NAVY,
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  identityText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  notificationButton: {
    position: 'relative',
    padding: spacing.xs,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DANGER,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  walletCard: {
    margin: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.xl,
    borderRadius: 20,
    elevation: 8,
    shadowColor: NAVY_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  walletIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,193,7,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  walletBalance: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  escrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  escrowText: {
    color: '#FFC107',
    fontSize: 13,
    fontWeight: '600',
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  topUpText: {
    color: '#1a237e',
    fontSize: 15,
    fontWeight: 'bold',
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: '#212121',
  },
  voiceButton: {
    padding: spacing.sm,
  },
  activeJobCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: spacing.lg,
    elevation: 5,
    shadowColor: GOLD_DARK,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
  },
  activeJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  activeJobInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  artisanAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  activeJobDetails: {
    flex: 1,
  },
  activeJobName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 2,
  },
  activeJobTrade: {
    fontSize: 13,
    color: '#757575',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
  },
  etaText: {
    color: '#F57C00',
    fontSize: 13,
    fontWeight: '600',
  },
  activeJobActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: 8,
    gap: spacing.xs,
  },
  callButton: {
    backgroundColor: '#4CAF50',
  },
  chatButton: {
    backgroundColor: '#E3F2FD',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  sosText: {
    color: '#F44336',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  seeAllText: {
    color: NAVY,
    fontSize: 14,
    fontWeight: '700',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: (width - spacing.lg * 2 - spacing.md) / 2,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: spacing.lg + 4,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    minHeight: 120,
    justifyContent: 'center',
  },
  serviceIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  artisansList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  artisanCard: {
    width: 162,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: NAVY_DARK,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  artisanPhoto: {
    width: '100%',
    height: 130,
    backgroundColor: '#E0E0E0',
  },
  artisanPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  artisanRatingPill: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  artisanRatingPillText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  badgeContainer: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  artisanInfo: {
    padding: spacing.md,
  },
  artisanName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 2,
  },
  artisanTrade: {
    fontSize: 12,
    color: '#757575',
    marginBottom: spacing.xs,
  },
  artisanMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#212121',
  },
  reviewCount: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  artisanFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  distanceText: {
    fontSize: 11,
    color: '#757575',
  },
  priceText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  responseTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  responseText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
  },
  protectionFooter: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  protectionCard: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: 16,
    elevation: 2,
  },
  protectionIcon: {
    marginRight: spacing.md,
  },
  protectionContent: {
    flex: 1,
  },
  protectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: spacing.xs,
  },
  protectionText: {
    fontSize: 12,
    color: '#546E7A',
    lineHeight: 18,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 14,
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
  navIconWrap: {
    position: 'relative',
  },
  navIndicator: {
    position: 'absolute',
    top: -8,
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: NAVY,
  },
  navLabel: {
    fontSize: 10,
    color: '#757575',
    marginTop: 3,
    fontWeight: '500',
  },
  navLabelActive: {
    color: NAVY,
    fontWeight: '700',
  },

  /* ───── History & Messages Tab Styles ───── */
  tabTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  tabSubTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  /* Empty state */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#424242',
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  /* Booking card */
  bookingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 16,
    padding: spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: NAVY,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bookingArtisan: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  bookingService: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  /* Booking details rows */
  bookingDetails: {
    marginTop: spacing.xs,
    gap: 6,
  },
  bookingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bookingDetailText: {
    fontSize: 13,
    color: '#616161',
    flex: 1,
  },

  /* Quote Review Card */
  quoteCard: {
    marginTop: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  quoteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  quoteCardTitle: { fontSize: 14, fontWeight: '700', color: '#E65100' },
  quoteAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quoteAmountLabel: { fontSize: 13, color: '#757575' },
  quoteAmountValue: { fontSize: 20, fontWeight: '700', color: '#1a237e' },
  quoteDescBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  quoteDescText: { fontSize: 13, color: '#424242', lineHeight: 18 },
  quoteDurationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  quoteDurationText: { fontSize: 12, color: '#757575' },
  quoteActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  quoteActionBtn: { flex: 1, borderRadius: 8, overflow: 'hidden' },
  rejectBtn: { borderWidth: 1.5, borderColor: '#F44336', alignItems: 'center', paddingVertical: 9, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  rejectBtnText: { fontSize: 13, fontWeight: '600', color: '#F44336' },
  negotiateBtn: { borderWidth: 1.5, borderColor: '#7C4DFF', alignItems: 'center', paddingVertical: 9, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  negotiateBtnText: { fontSize: 13, fontWeight: '600', color: '#7C4DFF' },
  acceptBtn: { borderRadius: 8, overflow: 'hidden' },
  acceptBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4 },
  acceptBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  negotiatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#EDE7F6',
    padding: 10,
    borderRadius: 8,
  },
  negotiatingText: { fontSize: 12, color: '#7C4DFF', flex: 1 },

  /* Release fund button */
  releaseFundBtn: {
    marginTop: spacing.md,
    borderRadius: 10,
    overflow: 'hidden',
  },
  releaseFundGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: spacing.xs,
  },
  releaseFundText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Chat booking button */
  chatBookingBtn: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 10,
    borderRadius: 10,
    gap: spacing.xs,
  },
  chatBookingBtnText: {
    color: '#1a237e',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Transaction rows */
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginBottom: 6,
    borderRadius: 10,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  txType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  txDate: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 'auto',
  },

  /* Conversation cards */
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: 14,
    padding: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  convAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  convAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  convName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
  },
  convTime: {
    fontSize: 11,
    color: '#9E9E9E',
    marginLeft: 'auto',
  },
  convPreview: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
  },
  unreadBadge: {
    backgroundColor: '#1a237e',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 'auto',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
