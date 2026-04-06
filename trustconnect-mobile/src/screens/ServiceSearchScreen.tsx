import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import * as Location from 'expo-location';
import { API_BASE_URL } from '../config/api';
import axios from 'axios';
import { getMyReferralCode, shareReferralLink } from '../services/referralService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NAVY = '#1a237e';
const GOLD = '#FFC107';
const GOLD_DARK = '#FFA000';

interface ArtisanResult {
  id: string;
  profileId?: number;
  name: string;
  trade: string;
  category?: string;
  photo: string | null;
  rating: number;
  reviewCount: number;
  completedJobs?: number;
  verified: boolean;
  badge?: 'gold' | 'silver' | 'bronze';
  startingPrice: number;
  distance: number;
  yearsExperience?: number;
  workshopAddress?: string;
}

// ─── Skeleton Loader ──────────────────────────────────────────────
const SkeletonCard = () => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <View style={styles.skeletonCard}>
      <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
      <View style={styles.skeletonContent}>
        <Animated.View style={[styles.skeletonLine, { width: '60%', opacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: '40%', marginTop: 8, opacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: '80%', marginTop: 8, opacity }]} />
      </View>
    </View>
  );
};

// ─── Filter Chip ──────────────────────────────────────────────────
const FilterChip = ({ label, active, onPress }: {
  label: string; active: boolean; onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.filterChip, active && styles.filterChipActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────
export default function ServiceSearchScreen() {
  const params = useLocalSearchParams<{ serviceType?: string; serviceIcon?: string; query?: string }>();
  const [artisans, setArtisans] = useState<ArtisanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(params.query || '');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedRadius, setSelectedRadius] = useState(10);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(params.serviceType || params.query || '');
  const [referralCode, setReferralCode] = useState<string>('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categories = [
    'All', 'Plumber', 'Electrician', 'Carpenter', 'Painter',
    'Mechanic', 'Tailor', 'Welder', 'Mason', 'Tiler',
  ];

  const radiusOptions = [5, 10, 15, 25, 50];

  // Get user location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch (e) {
        console.log('Location permission denied');
      }
    })();
  }, []);

  // Load referral code on mount (for invite button)
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('@trustconnect_token');
        if (token) {
          const result = await getMyReferralCode(token);
          if (result?.code) {
            setReferralCode(result.code);
          }
        }
      } catch (e) {
        console.log('Could not load referral code:', e);
      }
    })();
  }, []);

  const handleInvite = async () => {
    try {
      const code = referralCode || 'TRUSTCONNECT';
      await shareReferralLink(code, selectedCategory);
    } catch (e) {
      // Share cancelled or failed — ignore
    }
  };

  // Load artisans when filters change
  useEffect(() => {
    loadArtisans();
  }, [userLocation, selectedRadius, verifiedOnly, selectedCategory]);

  const loadArtisans = async () => {
    try {
      setLoading(true);
      const categoryParam = selectedCategory && selectedCategory !== 'All' ? selectedCategory : (params.serviceType || '');
      const response = await axios.get(`${API_BASE_URL}/artisan/search`, {
        params: {
          category: categoryParam || undefined,
          query: searchQuery || undefined,
          latitude: userLocation?.latitude,
          longitude: userLocation?.longitude,
          radius: selectedRadius,
          verified_only: verifiedOnly,
        },
        timeout: 10000,
      });
      setArtisans(response.data.artisans || []);
    } catch (error) {
      console.error('Failed to load artisans:', error);
      setArtisans([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search - waits 300ms after user stops typing
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      if (!text.trim()) {
        loadArtisans();
        return;
      }
      try {
        setLoading(true);
        const categoryParam = selectedCategory && selectedCategory !== 'All' ? selectedCategory : undefined;
        const response = await axios.get(`${API_BASE_URL}/artisan/search`, {
          params: {
            query: text.trim(),
            category: categoryParam,
            latitude: userLocation?.latitude,
            longitude: userLocation?.longitude,
            radius: selectedRadius,
            verified_only: verifiedOnly,
          },
          timeout: 10000,
        });
        setArtisans(response.data.artisans || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [userLocation, selectedRadius, verifiedOnly, selectedCategory]);

  const handleArtisanPress = (artisan: ArtisanResult) => {
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

  // ─── Artisan Card ────────────────────────────────────────────
  const renderArtisan = ({ item }: { item: ArtisanResult }) => (
    <TouchableOpacity
      style={styles.artisanCard}
      onPress={() => handleArtisanPress(item)}
      activeOpacity={0.7}
    >
      {/* Gold accent bar */}
      <View style={styles.cardAccent} />

      <View style={styles.cardContent}>
        <View style={styles.artisanRow}>
          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            {item.photo ? (
              <Image source={{ uri: item.photo }} style={styles.artisanPhoto} />
            ) : (
              <LinearGradient colors={[NAVY, '#303F9F']} style={styles.artisanPhoto}>
                <Text style={styles.avatarInitial}>
                  {item.name?.charAt(0)?.toUpperCase() || 'A'}
                </Text>
              </LinearGradient>
            )}
            {item.verified && (
              <View style={styles.verifiedDot}>
                <Ionicons name="checkmark" size={10} color="#fff" />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.artisanInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.artisanName} numberOfLines={1}>{item.name}</Text>
              {item.badge && (
                <View style={[styles.badge, {
                  backgroundColor: item.badge === 'gold' ? GOLD : item.badge === 'silver' ? '#B0BEC5' : '#A1887F',
                }]}>
                  <MaterialCommunityIcons name="shield-star" size={10} color="#fff" />
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </View>
            <Text style={styles.artisanTrade}>{item.trade}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="star" size={13} color={GOLD} />
                <Text style={styles.metaText}>
                  {item.rating > 0 ? item.rating.toFixed(1) : 'New'} ({item.reviewCount})
                </Text>
              </View>
              {item.distance > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons name="location" size={13} color="#78909C" />
                  <Text style={styles.metaText}>{item.distance} km</Text>
                </View>
              )}
              {(item.completedJobs ?? 0) > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons name="briefcase" size={13} color="#78909C" />
                  <Text style={styles.metaText}>{item.completedJobs} jobs</Text>
                </View>
              )}
            </View>
          </View>

          {/* Price & Hire */}
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>From</Text>
            <Text style={styles.priceValue}>₦{(item.startingPrice || 3000).toLocaleString()}</Text>
            <TouchableOpacity
              style={styles.hireBtn}
              onPress={() => {
                router.push({
                  pathname: '/booking',
                  params: {
                    artisanId: item.id,
                    artisanName: item.name,
                    artisanTrade: item.trade,
                    artisanPhoto: item.photo || '',
                    artisanRating: String(item.rating),
                    startingPrice: String(item.startingPrice),
                  },
                });
              }}
            >
              <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.hireBtnGradient}>
                <Text style={styles.hireBtnText}>Hire</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ─── Zero Results CTA ────────────────────────────────────────
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <MaterialCommunityIcons name="map-search-outline" size={48} color={NAVY} />
      </View>
      <Text style={styles.emptyTitle}>No artisans found nearby</Text>
      <Text style={styles.emptySubtitle}>
        No {selectedCategory && selectedCategory !== 'All' ? selectedCategory.toLowerCase() + ' ' : ''}
        artisans within {selectedRadius}km of your location.
      </Text>

      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => setSelectedRadius(prev => Math.min(prev * 2, 100))}
      >
        <LinearGradient colors={[GOLD_DARK, GOLD]} style={styles.ctaGradient}>
          <MaterialCommunityIcons name="map-marker-radius" size={20} color={NAVY} />
          <Text style={styles.ctaText}>Expand Search Radius</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.inviteButton} onPress={handleInvite} activeOpacity={0.75}>
        <Text style={styles.inviteText}>
          Know a {selectedCategory && selectedCategory !== 'All' ? selectedCategory.toLowerCase() : 'skilled artisan'}? Invite them and get a discount!
        </Text>
        <Ionicons name="share-outline" size={18} color={NAVY} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={[NAVY, '#283593']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {params.serviceType || 'Find Artisan'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search bar with debouncing */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#78909C" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${params.serviceType || 'artisans'}...`}
            placeholderTextColor="#90A4AE"
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); loadArtisans(); }}>
              <Ionicons name="close-circle" size={20} color="#90A4AE" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Filter chips */}
      <View style={styles.filterSection}>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <FilterChip
              label={item}
              active={selectedCategory === item || (item === 'All' && !selectedCategory)}
              onPress={() => setSelectedCategory(item === 'All' ? '' : item)}
            />
          )}
        />

        <View style={styles.subFilterRow}>
          <View style={styles.radiusSelector}>
            <MaterialCommunityIcons name="map-marker-radius" size={16} color={NAVY} />
            <Text style={styles.radiusLabel}>Radius:</Text>
            {radiusOptions.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusPill, selectedRadius === r && styles.radiusPillActive]}
                onPress={() => setSelectedRadius(r)}
              >
                <Text style={[styles.radiusPillText, selectedRadius === r && styles.radiusPillTextActive]}>
                  {r}km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.verifiedToggle, verifiedOnly && styles.verifiedToggleActive]}
            onPress={() => setVerifiedOnly(!verifiedOnly)}
          >
            <Ionicons name="shield-checkmark" size={14} color={verifiedOnly ? '#fff' : '#4CAF50'} />
            <Text style={[styles.verifiedToggleText, verifiedOnly && { color: '#fff' }]}>Verified</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <FlatList
          data={[1, 2, 3, 4]}
          renderItem={() => <SkeletonCard />}
          keyExtractor={(item) => String(item)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : artisans.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={artisans}
          renderItem={renderArtisan}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {artisans.length} artisan{artisans.length !== 1 ? 's' : ''} found
              </Text>
              {userLocation && (
                <View style={styles.locationIndicator}>
                  <Ionicons name="navigate" size={12} color="#4CAF50" />
                  <Text style={styles.locationText}>Within {selectedRadius}km</Text>
                </View>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  header: { paddingTop: Platform.OS === 'ios' ? 56 : 42, paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, paddingHorizontal: 14, height: 46, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#263238' },

  filterSection: { backgroundColor: '#fff', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ECEFF1' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#E8EAF6', borderWidth: 1, borderColor: '#C5CAE9',
  },
  filterChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  filterChipText: { fontSize: 13, fontWeight: '600', color: NAVY },
  filterChipTextActive: { color: '#fff' },

  subFilterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginTop: 4,
  },
  radiusSelector: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radiusLabel: { fontSize: 12, color: '#546E7A', marginRight: 2 },
  radiusPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: '#ECEFF1',
  },
  radiusPillActive: { backgroundColor: NAVY },
  radiusPillText: { fontSize: 11, fontWeight: '600', color: '#546E7A' },
  radiusPillTextActive: { color: '#fff' },

  verifiedToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
    borderWidth: 1, borderColor: '#4CAF50',
  },
  verifiedToggleActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  verifiedToggleText: { fontSize: 12, fontWeight: '600', color: '#4CAF50' },

  skeletonCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginBottom: 12, gap: 14,
  },
  skeletonAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E0E0E0' },
  skeletonContent: { flex: 1 },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: '#E0E0E0' },

  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  resultsCount: { fontSize: 13, color: '#78909C', fontWeight: '500' },
  locationIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: '#4CAF50', fontWeight: '500' },

  artisanCard: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, overflow: 'hidden',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  cardAccent: { height: 3, backgroundColor: GOLD },
  cardContent: { padding: 14 },
  artisanRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: { position: 'relative' },
  artisanPhoto: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: '#fff' },
  verifiedDot: {
    position: 'absolute', bottom: -1, right: -1, width: 18, height: 18,
    borderRadius: 9, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  artisanInfo: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  artisanName: { fontSize: 16, fontWeight: '700', color: '#1B2631', maxWidth: 130 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  artisanTrade: { fontSize: 13, color: '#546E7A', marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: '#78909C' },

  priceCol: { alignItems: 'center', marginLeft: 8 },
  priceLabel: { fontSize: 10, color: '#90A4AE' },
  priceValue: { fontSize: 15, fontWeight: '700', color: NAVY, marginTop: 1 },
  hireBtn: { marginTop: 6, borderRadius: 8, overflow: 'hidden' },
  hireBtnGradient: { paddingHorizontal: 16, paddingVertical: 7 },
  hireBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIconCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#E8EAF6',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1B2631', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#78909C', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  ctaButton: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  ctaGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  ctaText: { fontSize: 15, fontWeight: '700', color: NAVY },
  inviteButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#E8EAF6',
  },
  inviteText: { fontSize: 13, color: NAVY, flex: 1, lineHeight: 18 },
});
