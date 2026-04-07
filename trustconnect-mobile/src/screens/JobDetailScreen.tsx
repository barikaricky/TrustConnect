import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, ScrollView, Pressable,
  ActivityIndicator, Alert, Dimensions, Platform,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../services/AuthContext';
import {
  getBookingById, updateBookingStatus, getClientDetails,
  AvailableJob,
} from '../services/bookingService';
import { colors } from '../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NAVY = '#1a237e';
const NAVY_LIGHT = '#283593';
const GOLD = '#FFC107';
const BG = '#F0F2F8';
const SUCCESS = '#4CAF50';

export default function JobDetailScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState(false);
  const [clientInfo, setClientInfo] = useState<any>(null);

  // Video player
  const player = useVideoPlayer(job?.jobVideoUrl || '', (p) => {
    p.loop = false;
  });

  const fetchJob = useCallback(async () => {
    if (!bookingId) return;
    const numericId = Number(bookingId);
    try {
      setLoading(true);
      const data = await getBookingById(numericId);
      setJob(data);

      // If already accepted by this artisan, load client details
      if (data.status !== 'pending' && data.artisanId === user?.id) {
        try {
          const details = await getClientDetails(numericId, user!.id);
          setClientInfo(details);
          setPicked(true);
        } catch {
          // Not picked by this artisan
        }
      }
    } catch (error) {
      console.error('Failed to fetch job details:', error);
      Alert.alert('Error', 'Failed to load job details.');
    } finally {
      setLoading(false);
    }
  }, [bookingId, user?.id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const handlePickJob = async () => {
    if (!user || !bookingId) return;
    const numericId = Number(bookingId);

    Alert.alert(
      'Pick This Job?',
      'You will be assigned to this job and the customer will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pick Job',
          onPress: async () => {
            try {
              setPicking(true);
              await updateBookingStatus(numericId, 'accepted');

              // Get client details after picking
              const details = await getClientDetails(numericId, user.id);
              setClientInfo(details);
              setPicked(true);

              Alert.alert('Job Picked!', 'You can now see the customer\'s contact details.');
              fetchJob();
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.error || 'Failed to pick job.');
            } finally {
              setPicking(false);
            }
          },
        },
      ]
    );
  };

  const formatBudget = (price?: number) => {
    if (!price) return 'Open Budget';
    return `₦${price.toLocaleString()}`;
  };

  const formatDate = (date?: string) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString('en-NG', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerLoader]}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.container, styles.centerLoader]}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />
        <MaterialCommunityIcons name="alert-circle" size={48} color="#ccc" />
        <Text style={styles.loadingText}>Job not found</Text>
        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const descParts = (job.description || '').split('\n\n');
  const jobTitle = descParts[0] || 'Untitled Job';
  const jobDesc = descParts.slice(1).join('\n\n') || '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Video Player */}
      <View style={styles.videoSection}>
        {job.jobVideoUrl ? (
          <VideoView
            style={styles.videoPlayer}
            player={player}
            nativeControls
            contentFit="contain"
          />
        ) : (
          <View style={[styles.videoPlayer, styles.noVideo]}>
            <MaterialCommunityIcons name="video-off" size={48} color="#999" />
            <Text style={styles.noVideoText}>No video attached</Text>
          </View>
        )}

        {/* Back button overlay */}
        <Pressable style={styles.backOverlay} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Job Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <View style={styles.titleRow}>
            <View style={styles.tradeBadge}>
              <Text style={styles.tradeBadgeText}>{job.serviceType}</Text>
            </View>
            <Text style={styles.budgetText}>{formatBudget(job.estimatedPrice)}</Text>
          </View>

          <Text style={styles.jobTitle}>{jobTitle}</Text>

          {jobDesc ? (
            <Text style={styles.jobDescription}>{jobDesc}</Text>
          ) : null}

          {/* Status */}
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, picked && styles.statusBadgeAccepted]}>
              <MaterialCommunityIcons
                name={picked ? 'check-circle' : 'clock-outline'}
                size={16}
                color={picked ? '#fff' : NAVY}
              />
              <Text style={[styles.statusText, picked && styles.statusTextAccepted]}>
                {picked ? 'Accepted' : job.status?.charAt(0).toUpperCase() + job.status?.slice(1)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Job Details */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Job Details</Text>

          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="map-marker" size={20} color={NAVY} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{job.location?.address || 'TBD'}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="calendar" size={20} color={NAVY} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Scheduled Date</Text>
              <Text style={styles.detailValue}>{formatDate(job.scheduledDate)}</Text>
            </View>
          </View>

          {job.scheduledTime && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={NAVY} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{job.scheduledTime}</Text>
              </View>
            </View>
          )}

          {job.customerNotes && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="note-text" size={20} color={NAVY} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{job.customerNotes}</Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Client Details (only after pick) */}
        {picked && clientInfo && (
          <Animated.View entering={FadeIn.springify()} style={[styles.section, styles.clientSection]}>
            <Text style={styles.sectionTitle}>Customer Contact</Text>

            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="account" size={20} color={SUCCESS} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{clientInfo.name}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="phone" size={20} color={SUCCESS} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{clientInfo.phone}</Text>
              </View>
            </View>

            {clientInfo.address && (
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="home" size={20} color={SUCCESS} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>{clientInfo.address}</Text>
                </View>
              </View>
            )}

            <Pressable
              style={styles.chatBtn}
              onPress={() => router.push({ pathname: '/chat', params: { bookingId } })}
            >
              <MaterialCommunityIcons name="message-text" size={20} color="#fff" />
              <Text style={styles.chatBtnText}>Message Customer</Text>
            </Pressable>
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action */}
      {!picked && (
        <Animated.View entering={FadeInUp.delay(300)} style={styles.bottomBar}>
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomBudget}>{formatBudget(job.estimatedPrice)}</Text>
            <Text style={styles.bottomLabel}>{job.serviceType}</Text>
          </View>
          <Pressable
            style={[styles.pickBtn, picking && styles.pickBtnDisabled]}
            onPress={handlePickJob}
            disabled={picking}
          >
            {picking ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="hand-pointing-right" size={20} color={NAVY} />
                <Text style={styles.pickBtnText}>Pick This Job</Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centerLoader: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15, color: colors.text.secondary },
  backLink: { marginTop: 16 },
  backLinkText: { fontSize: 15, color: NAVY, fontWeight: '700' },
  // Video
  videoSection: {
    height: 280,
    backgroundColor: '#000',
    position: 'relative',
  },
  videoPlayer: { width: '100%', height: '100%' },
  noVideo: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1a1a2e',
  },
  noVideoText: { color: '#999', marginTop: 8, fontSize: 14 },
  backOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 44,
    left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  // Content
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  clientSection: { borderLeftWidth: 4, borderLeftColor: SUCCESS },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 14 },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  tradeBadge: {
    backgroundColor: `${NAVY}15`,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8,
  },
  tradeBadgeText: { fontSize: 13, fontWeight: '700', color: NAVY },
  budgetText: { fontSize: 20, fontWeight: '800', color: GOLD },
  jobTitle: { fontSize: 22, fontWeight: '800', color: colors.text.primary, marginBottom: 8 },
  jobDescription: { fontSize: 15, color: colors.text.secondary, lineHeight: 22 },
  statusRow: { marginTop: 12 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: `${NAVY}10`,
  },
  statusBadgeAccepted: { backgroundColor: SUCCESS },
  statusText: { fontSize: 13, fontWeight: '700', color: NAVY },
  statusTextAccepted: { color: '#fff' },
  // Details
  detailItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 12, marginBottom: 14,
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: colors.text.tertiary, fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: 15, color: colors.text.primary, fontWeight: '500' },
  // Chat button
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: NAVY,
    paddingVertical: 12, borderRadius: 12, marginTop: 8,
  },
  chatBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1, borderTopColor: colors.neutral.lightGray,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  bottomInfo: {},
  bottomBudget: { fontSize: 18, fontWeight: '800', color: colors.text.primary },
  bottomLabel: { fontSize: 13, color: colors.text.tertiary },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GOLD,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
  },
  pickBtnDisabled: { opacity: 0.5 },
  pickBtnText: { fontSize: 16, fontWeight: '800', color: NAVY },
});
