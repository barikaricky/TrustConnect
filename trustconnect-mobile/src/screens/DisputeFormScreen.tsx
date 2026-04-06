import React, { useState, useCallback } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../services/AuthContext';
import {
  raiseDispute,
  uploadDisputeEvidence,
  DISPUTE_CATEGORIES,
  DisputeCategory,
} from '../services/disputeService';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

export default function DisputeFormScreen() {
  const params = useLocalSearchParams<{ bookingId: string }>();
  const { user, userRole } = useAuth();
  const currentUserId = user?.userId || user?.id;
  const bookingId = Number(params.bookingId);

  const [category, setCategory] = useState<DisputeCategory | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ─── Pick Photo ────────────────────────────────────────────
  const handlePickPhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Maximum Photos', 'You can upload up to 5 photos as evidence.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Allow photo library access to upload evidence.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5 - photos.length,
    });
    if (!result.canceled && result.assets.length > 0) {
      setUploading(true);
      const uploaded: string[] = [];
      for (const asset of result.assets) {
        try {
          const url = await uploadDisputeEvidence(asset.uri);
          uploaded.push(url);
        } catch (err) {
          console.error('Upload failed:', err);
        }
      }
      setPhotos(prev => [...prev, ...uploaded]);
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Submit Dispute ────────────────────────────────────────
  const handleSubmit = async () => {
    if (!category) {
      Alert.alert('Select Category', 'Please select a dispute category.');
      return;
    }
    if (!description.trim() || description.trim().length < 20) {
      Alert.alert('Description Required', 'Please provide a detailed description (at least 20 characters).');
      return;
    }
    if (photos.length < 2) {
      Alert.alert('Evidence Required', 'Please upload at least 2 photos as evidence.');
      return;
    }
    if (!currentUserId || !bookingId) return;

    setSubmitting(true);
    try {
      const dispute = await raiseDispute({
        bookingId,
        raisedBy: currentUserId,
        raisedByRole: (userRole || 'customer') as 'customer' | 'artisan',
        category,
        description: description.trim(),
        evidenceUrls: photos,
      });
      Alert.alert(
        'Dispute Filed',
        'Your dispute has been filed. A 48-hour negotiation period has started. The artisan will be notified.',
        [
          {
            text: 'View Dispute',
            onPress: () => router.replace(`/dispute-detail?disputeId=${dispute.id}`),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to file dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#B71C1C', '#C62828']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Raise a Dispute</Text>
          <Text style={styles.headerSub}>Booking #{bookingId}</Text>
        </View>
        <Ionicons name="warning" size={28} color="#FFCDD2" />
      </LinearGradient>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Category Selection */}
        <Text style={styles.sectionTitle}>What's the issue?</Text>
        <View style={styles.categoryGrid}>
          {DISPUTE_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.value}
              style={[styles.categoryCard, category === cat.value && styles.categoryCardActive]}
              onPress={() => setCategory(cat.value)}
            >
              <Ionicons
                name={cat.icon as any}
                size={24}
                color={category === cat.value ? '#fff' : NAVY}
              />
              <Text style={[styles.categoryLabel, category === cat.value && styles.categoryLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.sectionTitle}>Describe the issue</Text>
        <TextInput
          style={styles.descInput}
          placeholder="Provide detailed information about the problem. Include dates, specifics of what went wrong, and what resolution you're seeking..."
          placeholderTextColor="#90A4AE"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          maxLength={1000}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.length}/1000</Text>

        {/* Evidence Photos */}
        <Text style={styles.sectionTitle}>
          Evidence Photos <Text style={styles.required}>(minimum 2)</Text>
        </Text>
        <Text style={styles.photoHint}>
          Upload clear photos showing the issue. This helps us resolve your dispute faster.
        </Text>

        <View style={styles.photoGrid}>
          {photos.map((uri, index) => (
            <View key={index} style={styles.photoContainer}>
              <Image source={{ uri }} style={styles.photoThumb} />
              <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(index)}>
                <Ionicons name="close-circle" size={22} color="#E53935" />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 5 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePickPhoto} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator size="small" color={NAVY} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={28} color={NAVY} />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Counter badge */}
        <View style={styles.photoBadge}>
          <Ionicons
            name={photos.length >= 2 ? 'checkmark-circle' : 'alert-circle'}
            size={16}
            color={photos.length >= 2 ? '#4CAF50' : '#F57C00'}
          />
          <Text style={[styles.photoBadgeText, { color: photos.length >= 2 ? '#4CAF50' : '#F57C00' }]}>
            {photos.length}/5 photos uploaded {photos.length < 2 && '(need at least 2)'}
          </Text>
        </View>

        {/* Warning Notice */}
        <View style={styles.warningCard}>
          <Ionicons name="information-circle" size={24} color="#F57C00" />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Important Information</Text>
            <Text style={styles.warningText}>
              • A 48-hour negotiation period will begin{'\n'}
              • The artisan will be notified and can respond{'\n'}
              • Settlement offers can be made during negotiation{'\n'}
              • After 48 hours, the dispute escalates to admin review{'\n'}
              • False claims may affect your trust score
            </Text>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!category || description.length < 20 || photos.length < 2 || submitting) && styles.btnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!category || description.length < 20 || photos.length < 2 || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="alert-circle" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>File Dispute</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  body: { flex: 1, padding: 16 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: NAVY, marginBottom: 10, marginTop: 16 },
  required: { fontSize: 12, color: '#E53935', fontWeight: '400' },

  // Categories
  categoryGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  categoryCard: {
    width: '31%', paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', gap: 6,
    borderWidth: 2, borderColor: '#E0E0E0',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  categoryCardActive: { backgroundColor: NAVY, borderColor: NAVY },
  categoryLabel: { fontSize: 11, fontWeight: '600', color: '#37474F', textAlign: 'center' },
  categoryLabelActive: { color: '#fff' },

  // Description
  descInput: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    fontSize: 14, color: '#1B2631', minHeight: 120,
    borderWidth: 1, borderColor: '#E0E0E0', lineHeight: 20,
  },
  charCount: { fontSize: 11, color: '#B0BEC5', textAlign: 'right', marginTop: 4 },

  // Photos
  photoHint: { fontSize: 13, color: '#78909C', marginBottom: 10 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoContainer: { position: 'relative' },
  photoThumb: { width: 90, height: 90, borderRadius: 10 },
  photoRemove: { position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 11 },
  addPhotoBtn: {
    width: 90, height: 90, borderRadius: 10,
    borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  addPhotoText: { fontSize: 10, color: NAVY, fontWeight: '600' },

  photoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  photoBadgeText: { fontSize: 13, fontWeight: '500' },

  // Warning
  warningCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14,
    marginTop: 20, borderWidth: 1, borderColor: '#FFE082',
  },
  warningTitle: { fontSize: 14, fontWeight: '700', color: '#E65100' },
  warningText: { fontSize: 12, color: '#795548', lineHeight: 20, marginTop: 4 },

  // Submit
  submitBtn: {
    flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#C62828', paddingVertical: 16, borderRadius: 14, marginTop: 20,
  },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
