import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, ScrollView, TextInput,
  Pressable, ActivityIndicator, Alert, Dimensions, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useAuth } from '../services/AuthContext';
import { uploadJobVideo, createBooking } from '../services/bookingService';
import { spacing, colors } from '../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NAVY = '#1a237e';
const NAVY_LIGHT = '#283593';
const GOLD = '#FFC107';
const BG = '#F0F2F8';

const TRADE_CATEGORIES = [
  'Plumbing', 'Electrician', 'Carpentry', 'Painting', 'Tiling',
  'Welding', 'AC Repair', 'Generator Repair', 'Cleaning', 'Fumigation',
  'Roofing', 'Masonry', 'Interior Design', 'Landscaping', 'Other',
];

export default function PostJobScreen() {
  const { user } = useAuth();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [address, setAddress] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Video state
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Video player for preview
  const player = useVideoPlayer(videoUri || '', (p) => {
    p.loop = true;
  });

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your media library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      videoMaxDuration: 300, // 5 minutes
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // Check file size (~50MB)
      if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
        Alert.alert('Video Too Large', 'Please select a video under 50MB.');
        return;
      }
      setVideoUri(asset.uri);
    }
  };

  const recordVideo = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 300,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!videoUri) {
      Alert.alert('Video Required', 'Please record or select a video showing the job.');
      return;
    }
    if (!title.trim() || !description.trim() || !category || !address.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (!scheduledDate.trim() || !scheduledTime.trim()) {
      Alert.alert('Missing Fields', 'Please provide a scheduled date and time.');
      return;
    }

    try {
      setSubmitting(true);

      // 1. Upload video
      setUploading(true);
      const jobVideoUrl = await uploadJobVideo(videoUri);
      setUploading(false);

      // 2. Create booking (open job — no specific artisan)
      const booking = await createBooking({
        customerId: user.id,
        artisanId: '0', // Open job — any worker can pick
        serviceType: category,
        description: `${title}\n\n${description}`,
        scheduledDate,
        scheduledTime,
        location: { address },
        estimatedPrice: budgetMax ? parseFloat(budgetMax) : undefined,
        customerNotes: budgetMin ? `Budget range: ₦${budgetMin} - ₦${budgetMax}` : undefined,
      });

      Alert.alert(
        'Job Posted!',
        'Workers can now see your job and submit quotes.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to post job. Please try again.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <LinearGradient colors={[NAVY, NAVY_LIGHT]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Post a Job</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* Video Section */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
            <Text style={styles.sectionTitle}>Job Video *</Text>
            <Text style={styles.sectionHint}>Record or upload a video showing the work needed (max 5 min)</Text>

            {videoUri ? (
              <View style={styles.videoContainer}>
                <VideoView
                  style={styles.videoPreview}
                  player={player}
                  nativeControls
                  contentFit="contain"
                />
                <Pressable style={styles.removeVideoBtn} onPress={() => setVideoUri(null)}>
                  <MaterialCommunityIcons name="close-circle" size={28} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.videoActions}>
                <Pressable style={styles.videoBtn} onPress={recordVideo}>
                  <MaterialCommunityIcons name="video-plus" size={32} color={NAVY} />
                  <Text style={styles.videoBtnText}>Record</Text>
                </Pressable>
                <Pressable style={styles.videoBtn} onPress={pickVideo}>
                  <MaterialCommunityIcons name="file-video" size={32} color={NAVY} />
                  <Text style={styles.videoBtnText}>Gallery</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>

          {/* Job Details */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>Job Details</Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Fix leaking kitchen pipe"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />

            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe what needs to be done..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <Text style={styles.label}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {TRADE_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Budget & Location */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Budget & Location</Text>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Min Budget (₦)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="3,000"
                  placeholderTextColor="#999"
                  value={budgetMin}
                  onChangeText={setBudgetMin}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Max Budget (₦)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="15,000"
                  placeholderTextColor="#999"
                  value={budgetMax}
                  onChangeText={setBudgetMax}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter job location"
              placeholderTextColor="#999"
              value={address}
              onChangeText={setAddress}
              maxLength={200}
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Date *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#999"
                  value={scheduledDate}
                  onChangeText={setScheduledDate}
                  maxLength={10}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Time *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10:00 AM"
                  placeholderTextColor="#999"
                  value={scheduledTime}
                  onChangeText={setScheduledTime}
                  maxLength={10}
                />
              </View>
            </View>
          </Animated.View>

          {/* Submit */}
          <Animated.View entering={FadeInUp.delay(400)}>
            <Pressable
              style={[styles.submitBtn, (submitting || !videoUri) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <View style={styles.submitRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.submitBtnText}>
                    {uploading ? 'Uploading Video...' : 'Creating Job...'}
                  </Text>
                </View>
              ) : (
                <View style={styles.submitRow}>
                  <MaterialCommunityIcons name="send" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Post Job</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 4 },
  sectionHint: { fontSize: 13, color: colors.text.tertiary, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text.secondary, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: colors.neutral.lightGray, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.text.primary, backgroundColor: colors.background.secondary,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  // Video
  videoContainer: {
    borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#000', height: 220,
  },
  videoPreview: { width: '100%', height: '100%' },
  removeVideoBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14,
  },
  videoActions: {
    flexDirection: 'row', gap: 16,
    justifyContent: 'center', paddingVertical: 24,
  },
  videoBtn: {
    width: 120, height: 100, borderRadius: 16,
    backgroundColor: colors.background.secondary,
    borderWidth: 2, borderColor: colors.neutral.lightGray, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  videoBtnText: { fontSize: 14, fontWeight: '600', color: NAVY },
  // Categories
  categoryScroll: { marginTop: 8 },
  categoryChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: colors.background.secondary,
    borderWidth: 1, borderColor: colors.neutral.lightGray,
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  categoryChipTextActive: { color: '#fff' },
  // Submit
  submitBtn: {
    backgroundColor: NAVY,
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
