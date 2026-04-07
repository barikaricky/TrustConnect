import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, StatusBar, FlatList, Pressable,
  ActivityIndicator, Dimensions, Platform, RefreshControl, Image,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { getAvailableJobs, AvailableJob } from '../services/bookingService';
import { API_BASE_URL } from '../config/api';
import { colors } from '../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NAVY = '#1a237e';
const NAVY_LIGHT = '#283593';
const GOLD = '#FFC107';
const BG = '#F0F2F8';

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Highest Budget', value: 'highest_budget' },
  { label: 'Nearest', value: 'nearest' },
];

const TRADE_FILTERS = [
  'All', 'Plumbing', 'Electrician', 'Carpentry', 'Painting', 'Tiling',
  'Welding', 'AC Repair', 'Cleaning', 'Roofing', 'Other',
];

export default function JobFeedScreen() {
  const [jobs, setJobs] = useState<AvailableJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState('All');
  const [selectedSort, setSelectedSort] = useState('newest');

  const fetchJobs = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      const params: any = { page: pageNum, limit: 10, sort: selectedSort };
      if (selectedTrade !== 'All') params.trade = selectedTrade;

      const response = await getAvailableJobs(params);
      const newJobs = response.jobs;

      if (refresh || pageNum === 1) {
        setJobs(newJobs);
      } else {
        setJobs((prev) => [...prev, ...newJobs]);
      }
      setHasMore(newJobs.length === 10);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [selectedTrade, selectedSort]);

  useEffect(() => {
    setLoading(true);
    fetchJobs(1, true);
  }, [fetchJobs]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobs(1, true);
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchJobs(page + 1);
  };

  const getVideoThumbnail = (videoUrl: string) => {
    // Use the first frame or a placeholder
    return `${API_BASE_URL}/uploads/videos/jobs/${videoUrl.split('/').pop()}`;
  };

  const formatBudget = (price?: number) => {
    if (!price) return 'Open Budget';
    return `₦${price.toLocaleString()}`;
  };

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const renderJobCard = ({ item, index }: { item: AvailableJob; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <Pressable
        style={styles.jobCard}
        onPress={() => router.push({ pathname: '/job-detail', params: { bookingId: String(item.id) } })}
      >
        {/* Video Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {item.jobVideoUrl ? (
            <Image
              source={{ uri: getVideoThumbnail(item.jobVideoUrl) }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnail, styles.noVideo]}>
              <MaterialCommunityIcons name="video-off" size={32} color="#999" />
            </View>
          )}
          <View style={styles.videoBadge}>
            <MaterialCommunityIcons name="play-circle" size={18} color="#fff" />
            <Text style={styles.videoBadgeText}>Video</Text>
          </View>
          <View style={styles.timeBadge}>
            <Text style={styles.timeBadgeText}>{getTimeAgo(item.createdAt)}</Text>
          </View>
        </View>

        {/* Job Info */}
        <View style={styles.jobInfo}>
          <View style={styles.jobHeader}>
            <View style={styles.tradeBadge}>
              <Text style={styles.tradeBadgeText}>{item.serviceType}</Text>
            </View>
            <Text style={styles.budget}>{formatBudget(item.estimatedPrice)}</Text>
          </View>

          <Text style={styles.jobTitle} numberOfLines={2}>
            {item.description.split('\n')[0]}
          </Text>

          <View style={styles.jobMeta}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="map-marker" size={14} color={colors.text.tertiary} />
              <Text style={styles.metaText} numberOfLines={1}>{item.location?.address || 'Location TBD'}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.customerInfo}>
              <MaterialCommunityIcons name="account" size={16} color={NAVY} />
              <Text style={styles.customerName}>{item.customerName || 'Customer'}</Text>
            </View>
            <View style={styles.viewBtn}>
              <Text style={styles.viewBtnText}>View Details</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={NAVY} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={NAVY} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <LinearGradient colors={[NAVY, NAVY_LIGHT]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Available Jobs</Text>
        <Pressable style={styles.backBtn}>
          <MaterialCommunityIcons name="bell-outline" size={24} color="#fff" />
        </Pressable>
      </LinearGradient>

      {/* Sort Bar */}
      <Animated.View entering={FadeInDown.delay(50)} style={styles.sortBar}>
        {SORT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.sortChip, selectedSort === opt.value && styles.sortChipActive]}
            onPress={() => setSelectedSort(opt.value)}
          >
            <Text style={[styles.sortChipText, selectedSort === opt.value && styles.sortChipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </Animated.View>

      {/* Trade Filter */}
      <Animated.View entering={FadeInDown.delay(100)}>
        <FlatList
          data={TRADE_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tradeFilterContainer}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.tradeChip, selectedTrade === item && styles.tradeChipActive]}
              onPress={() => setSelectedTrade(item)}
            >
              <Text style={[styles.tradeChipText, selectedTrade === item && styles.tradeChipTextActive]}>
                {item}
              </Text>
            </Pressable>
          )}
        />
      </Animated.View>

      {/* Job List */}
      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Finding jobs near you...</Text>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="briefcase-search" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Jobs Available</Text>
          <Text style={styles.emptySubtitle}>
            {selectedTrade !== 'All'
              ? `No ${selectedTrade} jobs right now. Try a different category.`
              : 'Check back later for new job postings.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={NAVY} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  // Sort
  sortBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.lightGray,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background.secondary,
  },
  sortChipActive: { backgroundColor: NAVY },
  sortChipText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  sortChipTextActive: { color: '#fff' },
  // Trade filter
  tradeFilterContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  tradeChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
    marginRight: 8,
  },
  tradeChipActive: { backgroundColor: GOLD, borderColor: GOLD },
  tradeChipText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },
  tradeChipTextActive: { color: NAVY, fontWeight: '700' },
  // List
  listContent: { padding: 16 },
  // Job Card
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  thumbnailContainer: {
    height: 180,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  thumbnail: { width: '100%', height: '100%' },
  noVideo: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#e0e0e0',
  },
  videoBadge: {
    position: 'absolute', bottom: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  videoBadgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  timeBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  timeBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  jobInfo: { padding: 14 },
  jobHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  tradeBadge: {
    backgroundColor: `${NAVY}15`,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  tradeBadgeText: { fontSize: 12, fontWeight: '700', color: NAVY },
  budget: { fontSize: 16, fontWeight: '800', color: GOLD },
  jobTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 8 },
  jobMeta: { marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: colors.text.tertiary, flex: 1 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.neutral.lightGray,
  },
  customerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customerName: { fontSize: 13, fontWeight: '600', color: NAVY },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewBtnText: { fontSize: 13, fontWeight: '700', color: NAVY },
  // Loading / Empty
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15, color: colors.text.secondary },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: colors.text.tertiary, textAlign: 'center', marginTop: 8 },
  footerLoader: { paddingVertical: 20 },
});
