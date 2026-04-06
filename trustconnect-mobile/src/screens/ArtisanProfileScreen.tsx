import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Linking,
  StatusBar,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { getArtisanDetail, getArtisanReviews, ArtisanDetail, ArtisanReview } from '../services/bookingService';
import { useAuth } from '../services/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NAVY = '#1a237e';
const GOLD = '#FFC107';
const GOLD_DARK = '#FFA000';
const PORTFOLIO_TILE = (SCREEN_WIDTH - 32 - 8) / 3; // 3 columns, 16 padding each side, 4 gap

export default function ArtisanProfileScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string; trade?: string; photo?: string; rating?: string }>();
  const { user } = useAuth();
  const [artisan, setArtisan] = useState<ArtisanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVerifiedTooltip, setShowVerifiedTooltip] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<{ reviews: ArtisanReview[]; averageRating: number; totalReviews: number }>({
    reviews: [], averageRating: 0, totalReviews: 0,
  });

  useEffect(() => {
    loadArtisanDetail();
  }, []);

  const loadArtisanDetail = async () => {
    try {
      setLoading(true);
      const [data, reviews] = await Promise.all([
        getArtisanDetail(params.id),
        getArtisanReviews(params.id),
      ]);
      setArtisan(data);
      setReviewData(reviews);
    } catch (error) {
      console.error('Failed to load artisan:', error);
      setArtisan({
        id: params.id,
        profileId: 0,
        userId: 0,
        name: params.name || 'Artisan',
        phone: '',
        email: '',
        avatar: params.photo || null,
        trade: params.trade || '',
        category: '',
        yearsExperience: 0,
        workshopAddress: '',
        portfolioPhotos: [],
        verified: false,
        verificationStatus: 'pending',
        rating: parseFloat(params.rating || '0'),
        reviewCount: 0,
        completedJobs: 0,
        startingPrice: 3000,
        reviews: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHirePress = () => {
    if (!artisan) return;
    router.push({
      pathname: '/booking',
      params: {
        artisanId: artisan.id || params.id,
        artisanName: artisan.name,
        artisanTrade: artisan.trade,
        artisanPhoto: artisan.avatar || '',
        artisanRating: String(artisan.rating),
        startingPrice: String(artisan.startingPrice),
      },
    });
  };

  const handleCallPress = () => {
    if (!artisan?.phone) return;
    Linking.openURL(`tel:${artisan.phone}`);
  };

  const handleMessagePress = () => {
    if (!artisan) return;
    // Navigate to chat — the backend will validate that a booking exists.
    // If not, ChatScreen will show an error alert.
    router.push({
      pathname: '/chat',
      params: {
        artisanUserId: String(artisan.userId),
        artisanName: artisan.name,
        artisanPhoto: artisan.avatar || '',
        artisanTrade: artisan.trade,
      },
    });
  };

  // Badge calculation
  const getBadge = (jobs: number) => {
    if (jobs >= 50) return { name: 'Gold', color: GOLD, icon: 'shield-star' as const };
    if (jobs >= 20) return { name: 'Silver', color: '#B0BEC5', icon: 'shield-star' as const };
    if (jobs >= 5) return { name: 'Bronze', color: '#A1887F', icon: 'shield-star' as const };
    return null;
  };

  const renderStars = (rating: number, size = 16) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= Math.floor(rating) ? 'star' : (i - 0.5 <= rating ? 'star-half' : 'star-outline')}
          size={size}
          color={GOLD}
        />
      );
    }
    return stars;
  };

  // Rating bar breakdown
  const getRatingDistribution = useCallback(() => {
    const dist = [0, 0, 0, 0, 0]; // 1-5 stars
    const reviews = reviewData.reviews.length > 0 ? reviewData.reviews : (artisan?.reviews || []);
    reviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
    });
    return dist.reverse(); // Show 5 stars first
  }, [reviewData, artisan]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!artisan) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
        <Text style={styles.loadingText}>Artisan not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.errorBackBtn}>
          <Text style={styles.errorBackBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badge = getBadge(artisan.completedJobs || 0);
  const allReviews = reviewData.reviews.length > 0 ? reviewData.reviews : (artisan.reviews || []);
  const avgRating = reviewData.averageRating > 0 ? reviewData.averageRating : artisan.rating;
  const totalReviews = reviewData.totalReviews > 0 ? reviewData.totalReviews : artisan.reviewCount;
  const ratingDist = getRatingDistribution();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* ─── Hero Header ─── */}
        <LinearGradient colors={[NAVY, '#283593']} style={styles.headerGradient}>
          <View style={styles.headerNav}>
            <TouchableOpacity style={styles.navBack} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navShare}>
              <Ionicons name="share-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              {artisan.avatar ? (
                <Image source={{ uri: artisan.avatar }} style={styles.avatar} />
              ) : (
                <LinearGradient colors={['#303F9F', '#5C6BC0']} style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {artisan.name?.charAt(0)?.toUpperCase() || 'A'}
                  </Text>
                </LinearGradient>
              )}
              {artisan.verified && (
                <TouchableOpacity
                  style={styles.verifiedBadge}
                  onPress={() => setShowVerifiedTooltip(true)}
                >
                  <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.nameRow}>
              <Text style={styles.name}>{artisan.name}</Text>
              {badge && (
                <View style={[styles.badgePill, { backgroundColor: badge.color }]}>
                  <MaterialCommunityIcons name={badge.icon} size={12} color="#fff" />
                  <Text style={styles.badgeText}>{badge.name}</Text>
                </View>
              )}
            </View>

            <Text style={styles.trade}>{artisan.trade}</Text>

            <View style={styles.ratingRow}>
              {renderStars(avgRating)}
              <Text style={styles.ratingText}>
                {avgRating > 0 ? avgRating.toFixed(1) : 'New'} ({totalReviews} reviews)
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ─── Stats Cards ─── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{artisan.completedJobs || 0}</Text>
            <Text style={styles.statLabel}>Jobs Done</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{artisan.yearsExperience || 0}+</Text>
            <Text style={styles.statLabel}>Years Exp.</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{avgRating > 0 ? avgRating.toFixed(1) : '-'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₦{(artisan.startingPrice || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Starting</Text>
          </View>
        </View>

        {/* ─── Verification Badge Info ─── */}
        {artisan.verified && (
          <View style={styles.verifiedBanner}>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            <View style={{ flex: 1 }}>
              <Text style={styles.verifiedBannerTitle}>Verified Artisan</Text>
              <Text style={styles.verifiedBannerSub}>
                NIN-verified and background checked by TrustConnect
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowVerifiedTooltip(true)}>
              <Ionicons name="information-circle-outline" size={22} color="#78909C" />
            </TouchableOpacity>
          </View>
        )}

        {/* ─── About ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutItem}>
            <View style={styles.aboutIcon}>
              <Ionicons name="location" size={16} color={NAVY} />
            </View>
            <Text style={styles.aboutText}>{artisan.workshopAddress || 'Location not specified'}</Text>
          </View>
          <View style={styles.aboutItem}>
            <View style={styles.aboutIcon}>
              <Ionicons name="construct" size={16} color={NAVY} />
            </View>
            <Text style={styles.aboutText}>{artisan.trade} specialist • {artisan.category || artisan.trade}</Text>
          </View>
          <View style={styles.aboutItem}>
            <View style={styles.aboutIcon}>
              <Ionicons name="time" size={16} color={NAVY} />
            </View>
            <Text style={styles.aboutText}>{artisan.yearsExperience || 0} years of experience</Text>
          </View>
        </View>

        {/* ─── Portfolio Grid ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Portfolio {artisan.portfolioPhotos?.length ? `(${artisan.portfolioPhotos.length})` : ''}
            </Text>
          </View>
          {artisan.portfolioPhotos && artisan.portfolioPhotos.length > 0 ? (
            <View style={styles.portfolioGrid}>
              {artisan.portfolioPhotos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.portfolioTile}
                  onPress={() => setSelectedPhoto(photo)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: photo }} style={styles.portfolioImage} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyPortfolio}>
              <MaterialCommunityIcons name="image-multiple-outline" size={40} color="#CFD8DC" />
              <Text style={styles.emptyPortfolioText}>No portfolio photos yet</Text>
            </View>
          )}
        </View>

        {/* ─── Rating Breakdown ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ratings & Reviews ({totalReviews})</Text>

          {totalReviews > 0 && (
            <View style={styles.ratingBreakdown}>
              <View style={styles.ratingBigCol}>
                <Text style={styles.ratingBig}>{avgRating.toFixed(1)}</Text>
                <View style={styles.ratingBigStars}>{renderStars(avgRating, 14)}</View>
                <Text style={styles.ratingBigSub}>{totalReviews} reviews</Text>
              </View>
              <View style={styles.ratingBarsCol}>
                {[5, 4, 3, 2, 1].map((star, idx) => (
                  <View key={star} style={styles.ratingBarRow}>
                    <Text style={styles.ratingBarLabel}>{star}</Text>
                    <Ionicons name="star" size={10} color={GOLD} />
                    <View style={styles.ratingBarBg}>
                      <View
                        style={[
                          styles.ratingBarFill,
                          {
                            width: totalReviews > 0
                              ? `${(ratingDist[idx] / totalReviews) * 100}%`
                              : '0%',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.ratingBarCount}>{ratingDist[idx]}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Review list */}
          {allReviews.length > 0 ? (
            allReviews.map((review, index) => (
              <View key={index} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  {review.customerAvatar ? (
                    <Image source={{ uri: review.customerAvatar }} style={styles.reviewAvatarImg} />
                  ) : (
                    <LinearGradient colors={['#E8EAF6', '#C5CAE9']} style={styles.reviewAvatarPlaceholder}>
                      <Text style={styles.reviewAvatarText}>
                        {review.customerName?.charAt(0)?.toUpperCase() || 'C'}
                      </Text>
                    </LinearGradient>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewName}>{review.customerName}</Text>
                    <View style={styles.reviewMeta}>
                      <View style={styles.reviewStars}>{renderStars(review.rating, 12)}</View>
                      <Text style={styles.reviewDate}>
                        {new Date(review.createdAt).toLocaleDateString('en-NG', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
                {review.comment ? <Text style={styles.reviewText}>{review.comment}</Text> : null}
              </View>
            ))
          ) : (
            <View style={styles.emptyReviews}>
              <Ionicons name="chatbubble-outline" size={40} color="#CFD8DC" />
              <Text style={styles.emptyReviewsText}>No reviews yet</Text>
              <Text style={styles.emptyReviewsSub}>Be the first to hire and review!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── Sticky Bottom Bar ─── */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarLeft}>
          <Text style={styles.bottomPriceLabel}>Starting from</Text>
          <Text style={styles.bottomPriceValue}>₦{(artisan.startingPrice || 3000).toLocaleString()}</Text>
        </View>

        <View style={styles.bottomActions}>
          {artisan.phone ? (
            <TouchableOpacity style={styles.callBtn} onPress={handleCallPress}>
              <Ionicons name="call" size={20} color="#4CAF50" />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.messageBtn} onPress={handleMessagePress}>
            <Ionicons name="chatbubble" size={18} color={NAVY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.hireButton} onPress={handleHirePress} activeOpacity={0.8}>
            <LinearGradient
              colors={['#4CAF50', '#2E7D32']}
              style={styles.hireButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="briefcase-outline" size={18} color="#fff" />
              <Text style={styles.hireButtonText}>Hire Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Photo Viewer Modal ─── */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedPhoto(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {selectedPhoto && (
            <Image source={{ uri: selectedPhoto }} style={styles.modalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* ─── Verified Tooltip Modal ─── */}
      <Modal visible={showVerifiedTooltip} transparent animationType="fade">
        <TouchableOpacity style={styles.tooltipOverlay} activeOpacity={1} onPress={() => setShowVerifiedTooltip(false)}>
          <View style={styles.tooltipBox}>
            <View style={styles.tooltipHeader}>
              <Ionicons name="shield-checkmark" size={28} color="#4CAF50" />
              <Text style={styles.tooltipTitle}>Verified Artisan</Text>
            </View>
            <Text style={styles.tooltipBody}>
              This artisan has been NIN-verified and background checked by TrustConnect. Their identity and credentials have been independently confirmed for your safety.
            </Text>
            <View style={styles.tooltipChecks}>
              <View style={styles.tooltipCheckRow}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.tooltipCheckText}>National Identity Number (NIN) verified</Text>
              </View>
              <View style={styles.tooltipCheckRow}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.tooltipCheckText}>Background check completed</Text>
              </View>
              <View style={styles.tooltipCheckRow}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.tooltipCheckText}>Trade certification validated</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.tooltipCloseBtn} onPress={() => setShowVerifiedTooltip(false)}>
              <Text style={styles.tooltipCloseBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  loadingText: { marginTop: 12, color: '#78909C', fontSize: 16 },
  errorBackBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 8 },
  errorBackBtnText: { color: '#fff', fontWeight: '600' },

  // Header
  headerGradient: { paddingTop: Platform.OS === 'ios' ? 56 : 42, paddingBottom: 30, alignItems: 'center' },
  headerNav: {
    flexDirection: 'row', justifyContent: 'space-between', width: '100%',
    paddingHorizontal: 16, marginBottom: 16,
  },
  navBack: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  navShare: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  profileSection: { alignItems: 'center' },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 40, fontWeight: '700', color: '#fff' },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#fff', borderRadius: 14, padding: 2,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 2 },
  badgePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  trade: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginLeft: 6 },

  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: -16, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 8,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8,
    alignItems: 'center', shadowOffset: { width: 0, height: 2 },
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: NAVY },
  statLabel: { fontSize: 11, color: '#90A4AE', marginTop: 3 },
  statDivider: { width: 1, height: 30, backgroundColor: '#ECEFF1' },

  // Verified Banner
  verifiedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 16, padding: 14,
    backgroundColor: '#E8F5E9', borderRadius: 12, borderWidth: 1, borderColor: '#C8E6C9',
  },
  verifiedBannerTitle: { fontSize: 14, fontWeight: '700', color: '#2E7D32' },
  verifiedBannerSub: { fontSize: 12, color: '#4CAF50', marginTop: 1 },

  // Section
  section: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 14, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1B2631', marginBottom: 12 },

  // About
  aboutItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  aboutIcon: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8EAF6',
    justifyContent: 'center', alignItems: 'center',
  },
  aboutText: { fontSize: 14, color: '#546E7A', flex: 1 },

  // Portfolio Grid
  portfolioGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
  },
  portfolioTile: {
    width: PORTFOLIO_TILE, height: PORTFOLIO_TILE,
    borderRadius: 8, overflow: 'hidden',
  },
  portfolioImage: { width: '100%', height: '100%' },
  emptyPortfolio: { alignItems: 'center', paddingVertical: 24 },
  emptyPortfolioText: { fontSize: 14, color: '#B0BEC5', marginTop: 8 },

  // Rating breakdown
  ratingBreakdown: {
    flexDirection: 'row', marginBottom: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#ECEFF1',
  },
  ratingBigCol: { alignItems: 'center', paddingRight: 20 },
  ratingBig: { fontSize: 40, fontWeight: '700', color: '#1B2631' },
  ratingBigStars: { flexDirection: 'row', gap: 2, marginTop: 4 },
  ratingBigSub: { fontSize: 12, color: '#90A4AE', marginTop: 4 },
  ratingBarsCol: { flex: 1, justifyContent: 'center', gap: 4 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingBarLabel: { width: 12, fontSize: 11, color: '#78909C', textAlign: 'right' },
  ratingBarBg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#ECEFF1' },
  ratingBarFill: { height: 6, borderRadius: 3, backgroundColor: GOLD },
  ratingBarCount: { width: 20, fontSize: 11, color: '#90A4AE' },

  // Reviews
  reviewCard: {
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
    paddingBottom: 14, marginBottom: 14,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatarImg: { width: 38, height: 38, borderRadius: 19 },
  reviewAvatarPlaceholder: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  reviewAvatarText: { fontSize: 16, fontWeight: '700', color: NAVY },
  reviewName: { fontSize: 14, fontWeight: '600', color: '#1B2631' },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewDate: { fontSize: 11, color: '#B0BEC5' },
  reviewText: { fontSize: 14, color: '#546E7A', lineHeight: 20, marginLeft: 48 },
  emptyReviews: { alignItems: 'center', paddingVertical: 24 },
  emptyReviewsText: { fontSize: 16, fontWeight: '600', color: '#B0BEC5', marginTop: 8 },
  emptyReviewsSub: { fontSize: 13, color: '#CFD8DC', marginTop: 4 },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#ECEFF1',
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16, shadowOffset: { width: 0, height: -2 },
  },
  bottomBarLeft: {},
  bottomPriceLabel: { fontSize: 11, color: '#90A4AE' },
  bottomPriceValue: { fontSize: 20, fontWeight: '700', color: '#1B2631' },
  bottomActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  callBtn: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 1.5, borderColor: '#4CAF50',
    justifyContent: 'center', alignItems: 'center',
  },
  messageBtn: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 1.5, borderColor: NAVY,
    justifyContent: 'center', alignItems: 'center',
  },
  hireButton: { borderRadius: 12, overflow: 'hidden' },
  hireButtonGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 22, paddingVertical: 13,
  },
  hireButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Photo Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalClose: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 42, right: 16, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  modalImage: { width: SCREEN_WIDTH - 32, height: SCREEN_WIDTH - 32 },

  // Verified Tooltip Modal
  tooltipOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  tooltipBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    width: '100%', maxWidth: 360,
  },
  tooltipHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  tooltipTitle: { fontSize: 20, fontWeight: '700', color: '#1B2631' },
  tooltipBody: { fontSize: 14, color: '#546E7A', lineHeight: 21, marginBottom: 16 },
  tooltipChecks: { gap: 10, marginBottom: 20 },
  tooltipCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tooltipCheckText: { fontSize: 13, color: '#37474F' },
  tooltipCloseBtn: {
    backgroundColor: NAVY, borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  tooltipCloseBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
