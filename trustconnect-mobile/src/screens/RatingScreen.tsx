import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../services/AuthContext';
import { createReview, REVIEW_TAGS, ReviewTag } from '../services/reviewService';

const NAVY = '#1a237e';
const GOLD = '#FFC107';
const GOLD_DARK = '#FFA000';

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
const STAR_COLORS = ['', '#E53935', '#FF9800', '#FFC107', '#8BC34A', '#4CAF50'];

export default function RatingScreen() {
  const params = useLocalSearchParams<{
    bookingId: string;
    artisanUserId: string;
    artisanName?: string;
    artisanPhoto?: string;
    artisanTrade?: string;
    serviceType?: string;
  }>();

  const { user } = useAuth();
  const currentUserId = user?.userId || user?.id;
  const bookingId = Number(params.bookingId);
  const artisanUserId = Number(params.artisanUserId);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<ReviewTag[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ─── Star Rating ──────────────────────────────────────────
  const handleStarPress = (star: number) => {
    setRating(star);
  };

  // ─── Tag Toggle ───────────────────────────────────────────
  const toggleTag = (tag: ReviewTag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // ─── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating.');
      return;
    }
    if (!comment.trim() || comment.trim().length < 10) {
      Alert.alert('Review Required', 'Please write a review (at least 10 characters).');
      return;
    }
    if (!currentUserId || !bookingId || !artisanUserId) {
      Alert.alert('Error', 'Missing booking information.');
      return;
    }

    setSubmitting(true);
    try {
      await createReview({
        bookingId,
        reviewerId: currentUserId,
        artisanUserId,
        rating,
        comment: comment.trim(),
        tags: selectedTags,
      });
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to submit review. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success Screen ───────────────────────────────────────
  if (submitted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[NAVY, '#283593']} style={styles.successContainer}>
          <View style={styles.successContent}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={72} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>Thank You!</Text>
            <Text style={styles.successSubtitle}>
              Your {rating}-star review has been submitted successfully.
            </Text>

            {/* Star display */}
            <View style={styles.successStars}>
              {[1, 2, 3, 4, 5].map(s => (
                <Ionicons
                  key={s}
                  name={s <= rating ? 'star' : 'star-outline'}
                  size={32}
                  color={s <= rating ? GOLD : '#78909C'}
                />
              ))}
            </View>

            {selectedTags.length > 0 && (
              <View style={styles.successTags}>
                {selectedTags.map(tag => {
                  const tagData = REVIEW_TAGS.find(t => t.value === tag);
                  return (
                    <View key={tag} style={styles.successTag}>
                      <Text style={styles.successTagText}>{tagData?.label || tag}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={styles.successNote}>
              Your feedback helps build trust in the TrustConnect community and helps other customers make informed decisions.
            </Text>

            <TouchableOpacity style={styles.successBtn} onPress={() => router.back()}>
              <LinearGradient colors={[GOLD_DARK, GOLD]} style={styles.successBtnGrad}>
                <Ionicons name="home" size={18} color={NAVY} />
                <Text style={styles.successBtnText}>Back to Home</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={[NAVY, '#283593']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Rate & Review</Text>
          <Text style={styles.headerSub}>Share your experience</Text>
        </View>
        <MaterialCommunityIcons name="star-circle" size={32} color={GOLD} />
      </LinearGradient>

      <ScrollView
        style={styles.body}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Artisan Card */}
        <View style={styles.artisanCard}>
          <View style={styles.artisanRow}>
            {params.artisanPhoto ? (
              <Image source={{ uri: params.artisanPhoto }} style={styles.artisanAvatar} />
            ) : (
              <LinearGradient colors={[NAVY, '#303F9F']} style={styles.artisanAvatar}>
                <Text style={styles.artisanAvatarText}>
                  {(params.artisanName || 'A').charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.artisanInfo}>
              <Text style={styles.artisanName}>{params.artisanName || 'Artisan'}</Text>
              <Text style={styles.artisanTrade}>{params.artisanTrade || params.serviceType || ''}</Text>
              <Text style={styles.bookingRef}>Booking #{bookingId}</Text>
            </View>
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.completedText}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Star Rating */}
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>How would you rate this service?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity
                key={star}
                onPress={() => handleStarPress(star)}
                activeOpacity={0.7}
                style={styles.starBtn}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={44}
                  color={star <= rating ? GOLD : '#CFD8DC'}
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <View style={[styles.ratingLabel, { backgroundColor: STAR_COLORS[rating] + '20' }]}>
              <Text style={[styles.ratingLabelText, { color: STAR_COLORS[rating] }]}>
                {STAR_LABELS[rating]}
              </Text>
            </View>
          )}
        </View>

        {/* Tags */}
        <View style={styles.tagsSection}>
          <Text style={styles.sectionTitle}>What stood out? <Text style={styles.optional}>(optional)</Text></Text>
          <View style={styles.tagsGrid}>
            {REVIEW_TAGS.map(tag => {
              const active = selectedTags.includes(tag.value);
              return (
                <TouchableOpacity
                  key={tag.value}
                  style={[styles.tagChip, active && styles.tagChipActive]}
                  onPress={() => toggleTag(tag.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={tag.icon as any}
                    size={16}
                    color={active ? '#fff' : NAVY}
                  />
                  <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>
                    {tag.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Written Review */}
        <View style={styles.reviewSection}>
          <Text style={styles.sectionTitle}>Write your review</Text>
          <TextInput
            style={styles.reviewInput}
            placeholder="Tell others about your experience. Was the work done well? Was the artisan professional? Would you recommend them?"
            placeholderTextColor="#90A4AE"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            maxLength={500}
            textAlignVertical="top"
          />
          <View style={styles.charRow}>
            <Text style={[styles.charCount, comment.length < 10 && { color: '#E53935' }]}>
              {comment.length < 10 ? `${10 - comment.length} more characters needed` : `${comment.length}/500`}
            </Text>
          </View>
        </View>

        {/* Guidelines */}
        <View style={styles.guidelinesCard}>
          <Ionicons name="information-circle" size={20} color="#1565C0" />
          <View style={{ flex: 1 }}>
            <Text style={styles.guidelinesTitle}>Review Guidelines</Text>
            <Text style={styles.guidelinesText}>
              {'\u2022'} Be honest and specific about your experience{'\n'}
              {'\u2022'} Focus on the quality of work and professionalism{'\n'}
              {'\u2022'} Avoid personal attacks or offensive language{'\n'}
              {'\u2022'} Your review helps other customers make informed decisions
            </Text>
          </View>
        </View>

        {/* Summary Card */}
        {rating > 0 && comment.trim().length >= 10 && (
          <View style={styles.summaryCard}>
            <LinearGradient colors={['#F5F7FA', '#ECEFF1']} style={styles.summaryGradient}>
              <Text style={styles.summaryTitle}>Review Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Rating</Text>
                <View style={styles.summaryStars}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Ionicons
                      key={s}
                      name={s <= rating ? 'star' : 'star-outline'}
                      size={16}
                      color={s <= rating ? GOLD : '#CFD8DC'}
                    />
                  ))}
                  <Text style={styles.summaryRatingText}>{rating}.0</Text>
                </View>
              </View>
              {selectedTags.length > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tags</Text>
                  <Text style={styles.summaryValue}>
                    {selectedTags.map(t => REVIEW_TAGS.find(rt => rt.value === t)?.label).join(', ')}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Review</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>{comment.trim()}</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (rating === 0 || comment.trim().length < 10 || submitting) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={rating === 0 || comment.trim().length < 10 || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <LinearGradient colors={[GOLD_DARK, GOLD]} style={styles.submitBtnGrad}>
              <Ionicons name="star" size={18} color={NAVY} />
              <Text style={styles.submitBtnText}>Submit Review</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  body: { flex: 1, padding: 16 },

  // Artisan Card
  artisanCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  artisanRow: { flexDirection: 'row', alignItems: 'center' },
  artisanAvatar: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  artisanAvatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  artisanInfo: { flex: 1, marginLeft: 12 },
  artisanName: { fontSize: 17, fontWeight: '700', color: '#1B2631' },
  artisanTrade: { fontSize: 13, color: '#546E7A', marginTop: 2 },
  bookingRef: { fontSize: 11, color: '#90A4AE', marginTop: 2 },
  completedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  completedText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },

  // Star Rating
  ratingSection: { alignItems: 'center', marginBottom: 24 },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: NAVY,
    marginBottom: 12, alignSelf: 'flex-start',
  },
  optional: { fontSize: 12, fontWeight: '400', color: '#90A4AE' },
  starsRow: {
    flexDirection: 'row', gap: 8, justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 24,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    width: '100%',
  },
  starBtn: { padding: 4 },
  ratingLabel: {
    marginTop: 12, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
  },
  ratingLabelText: { fontSize: 15, fontWeight: '700' },

  // Tags
  tagsSection: { marginBottom: 24 },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  tagChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  tagChipText: { fontSize: 13, fontWeight: '600', color: NAVY },
  tagChipTextActive: { color: '#fff' },

  // Written Review
  reviewSection: { marginBottom: 20 },
  reviewInput: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    fontSize: 14, color: '#1B2631', minHeight: 120, lineHeight: 22,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  charRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  charCount: { fontSize: 11, color: '#90A4AE' },

  // Guidelines
  guidelinesCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#E3F2FD', borderRadius: 14, padding: 14,
    marginBottom: 20, borderWidth: 1, borderColor: '#BBDEFB',
  },
  guidelinesTitle: { fontSize: 13, fontWeight: '700', color: '#1565C0', marginBottom: 4 },
  guidelinesText: { fontSize: 12, color: '#37474F', lineHeight: 20 },

  // Summary
  summaryCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  summaryGradient: { padding: 16 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: NAVY, marginBottom: 12 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: { fontSize: 13, color: '#78909C', fontWeight: '500' },
  summaryValue: { fontSize: 13, color: '#37474F', fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  summaryStars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  summaryRatingText: { fontSize: 14, fontWeight: '700', color: NAVY, marginLeft: 6 },

  // Submit
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnGrad: {
    flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16,
  },
  submitBtnText: { fontSize: 17, fontWeight: '800', color: NAVY },

  // ── Success Screen ────────────────────────────────────────
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  successContent: { alignItems: 'center', paddingHorizontal: 32 },
  successIconCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
  successSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 24 },
  successStars: { flexDirection: 'row', gap: 4, marginVertical: 20 },
  successTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  successTag: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14,
  },
  successTagText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  successNote: {
    fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center',
    lineHeight: 20, marginTop: 8, marginBottom: 28,
  },
  successBtn: { borderRadius: 14, overflow: 'hidden' },
  successBtnGrad: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    paddingHorizontal: 32, paddingVertical: 14,
  },
  successBtnText: { fontSize: 16, fontWeight: '700', color: NAVY },
});
