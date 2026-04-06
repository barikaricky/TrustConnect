import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, StatusBar, Platform,
  Alert, ActivityIndicator, ScrollView, RefreshControl, Image,
} from 'react-native';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

interface FavoriteArtisan {
  _id: string;
  name: string;
  phone: string;
  avatar?: string;
  serviceType?: string;
  rating?: number;
  totalJobs?: number;
  location?: string;
  verified?: boolean;
}

export default function FavoriteArtisansScreen() {
  const [favorites, setFavorites] = useState<FavoriteArtisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => { loadFavorites(); }, []);

  const loadFavorites = async () => {
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      const userData = await AsyncStorage.getItem('@trustconnect_user');
      const user = userData ? JSON.parse(userData) : null;
      if (!user) return;

      const res = await axios.get(`${API_BASE_URL}/reviews/favorites/${user._id || user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setFavorites(res.data.data.favorites || res.data.data || []);
      }
    } catch {
      // May not have favorites endpoint, show empty
      console.log('Could not load favorites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); loadFavorites(); }, []);

  const handleRemoveFavorite = (artisan: FavoriteArtisan) => {
    Alert.alert(
      'Remove Favorite',
      `Remove ${artisan.name} from your favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            setRemovingId(artisan._id);
            try {
              const token = await AsyncStorage.getItem('@trustconnect_token');
              await axios.delete(`${API_BASE_URL}/reviews/favorites/${artisan._id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setFavorites(prev => prev.filter(f => f._id !== artisan._id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              Alert.alert('Error', 'Failed to remove from favorites.');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const handleViewProfile = (artisan: FavoriteArtisan) => {
    router.push({ pathname: '/artisan-profile', params: { artisanId: artisan._id } });
  };

  const handleBookNow = (artisan: FavoriteArtisan) => {
    router.push({ pathname: '/booking', params: { artisanId: artisan._id } });
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <MaterialCommunityIcons
        key={i}
        name={i < Math.floor(rating) ? 'star' : i < rating ? 'star-half-full' : 'star-outline'}
        size={13}
        color={GOLD}
      />
    ));
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={NAVY} /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[NAVY, '#283593']} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Favorite Artisans</Text>
            {favorites.length > 0 && <Text style={styles.headerCount}>{favorites.length} saved</Text>}
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[NAVY]} />}
      >
        {favorites.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.emptyState}>
            <View style={styles.emptyIconParent}>
              <MaterialCommunityIcons name="heart-outline" size={48} color="#CFD8DC" />
            </View>
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptySubtext}>
              When you find artisans you love, tap the heart icon to save them here for easy access
            </Text>
            <Pressable style={styles.browseBtn} onPress={() => router.push('/')}>
              <MaterialCommunityIcons name="magnify" size={18} color="#fff" />
              <Text style={styles.browseBtnText}>Browse Artisans</Text>
            </Pressable>
          </Animated.View>
        ) : (
          favorites.map((artisan, index) => (
            <Animated.View key={artisan._id} entering={SlideInRight.delay(index * 80).springify()}>
              <Pressable style={styles.artisanCard} onPress={() => handleViewProfile(artisan)}>
                {/* Avatar */}
                <View style={styles.avatarSection}>
                  {artisan.avatar ? (
                    <Image source={{ uri: artisan.avatar }} style={styles.avatar} />
                  ) : (
                    <LinearGradient colors={[NAVY, '#3949AB']} style={styles.avatar}>
                      <Text style={styles.avatarText}>{getInitials(artisan.name)}</Text>
                    </LinearGradient>
                  )}
                  {artisan.verified && (
                    <View style={styles.verifiedBadge}>
                      <MaterialCommunityIcons name="check-decagram" size={16} color="#4CAF50" />
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.artisanInfo}>
                  <Text style={styles.artisanName}>{artisan.name}</Text>
                  {artisan.serviceType && (
                    <View style={styles.serviceRow}>
                      <MaterialCommunityIcons name="wrench-outline" size={13} color="#78909C" />
                      <Text style={styles.serviceText}>{artisan.serviceType}</Text>
                    </View>
                  )}
                  {artisan.location && (
                    <View style={styles.serviceRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={13} color="#78909C" />
                      <Text style={styles.serviceText}>{artisan.location}</Text>
                    </View>
                  )}
                  <View style={styles.ratingRow}>
                    {renderStars(artisan.rating || 0)}
                    <Text style={styles.ratingNum}>{(artisan.rating || 0).toFixed(1)}</Text>
                    {artisan.totalJobs !== undefined && (
                      <Text style={styles.jobsText}> &middot; {artisan.totalJobs} jobs</Text>
                    )}
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.artisanActions}>
                  <Pressable
                    style={[styles.heartBtn, removingId === artisan._id && { opacity: 0.4 }]}
                    onPress={() => handleRemoveFavorite(artisan)}
                    disabled={removingId === artisan._id}
                  >
                    {removingId === artisan._id ? (
                      <ActivityIndicator size="small" color="#E53935" />
                    ) : (
                      <MaterialCommunityIcons name="heart" size={20} color="#E53935" />
                    )}
                  </Pressable>
                  <Pressable style={styles.bookBtn} onPress={() => handleBookNow(artisan)}>
                    <Text style={styles.bookBtnText}>Book</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 42, paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  headerCount: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },

  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyIconParent: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#546E7A', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#90A4AE', textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 260 },
  browseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: NAVY, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20,
  },
  browseBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  artisanCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  avatarSection: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  verifiedBadge: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: '#fff', borderRadius: 10, padding: 1,
  },
  artisanInfo: { flex: 1 },
  artisanName: { fontSize: 15, fontWeight: '700', color: '#263238' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  serviceText: { fontSize: 12, color: '#78909C' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  ratingNum: { fontSize: 12, fontWeight: '600', color: '#546E7A', marginLeft: 3 },
  jobsText: { fontSize: 11, color: '#B0BEC5' },
  artisanActions: { alignItems: 'center', gap: 8 },
  heartBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFEBEE',
    justifyContent: 'center', alignItems: 'center',
  },
  bookBtn: {
    backgroundColor: NAVY, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6,
  },
  bookBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
