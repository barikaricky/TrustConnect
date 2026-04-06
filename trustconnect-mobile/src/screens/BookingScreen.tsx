import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBooking } from '../services/bookingService';

export default function BookingScreen() {
  const params = useLocalSearchParams<{
    artisanId: string;
    artisanName: string;
    artisanTrade: string;
    artisanPhoto: string;
    artisanRating: string;
    startingPrice: string;
  }>();

  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [bookingArtisanUserId, setBookingArtisanUserId] = useState<number | null>(null);

  // Generate date options (next 7 days)
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      value: date.toISOString().split('T')[0],
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNum: date.getDate(),
    };
  });

  const timeSlots = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
    '04:00 PM', '05:00 PM', '06:00 PM',
  ];

  const handleSubmitBooking = async () => {
    if (!description.trim()) {
      Alert.alert('Required', 'Please describe the service you need');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Required', 'Please enter your location/address');
      return;
    }
    if (!selectedDate) {
      Alert.alert('Required', 'Please select a date');
      return;
    }
    if (!selectedTime) {
      Alert.alert('Required', 'Please select a time');
      return;
    }

    try {
      setLoading(true);

      // Get current user from storage
      const userStr = await AsyncStorage.getItem('@trustconnect_user');
      let customerId = 1;
      if (userStr) {
        const user = JSON.parse(userStr);
        customerId = user.id || user.userId || 1;
      }

      const booking = await createBooking({
        customerId,
        artisanId: params.artisanId,
        serviceType: params.artisanTrade || 'General',
        description: description.trim(),
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
        location: { address: address.trim() },
        estimatedPrice: parseFloat(params.startingPrice || '3000'),
        customerNotes: notes.trim() || undefined,
      });

      setBookingId(booking.id);
      setBookingArtisanUserId(booking.artisanUserId || null);
      setSuccess(true);
    } catch (error: any) {
      console.error('Booking error:', error);
      const errData = error?.response?.data;
      if (errData?.code === 'INSUFFICIENT_BALANCE') {
        Alert.alert(
          'Insufficient Balance',
          `You need ₦${(errData.required || 0).toLocaleString()} but only have ₦${(errData.available || 0).toLocaleString()} in your wallet.\n\nPlease top up your wallet before booking.`,
          [
            { text: 'Top Up Wallet', onPress: () => router.push('/wallet') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Booking Failed', errData?.message || error.message || 'Please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSubtitle}>
            Your booking request has been sent to {params.artisanName}
          </Text>

          <View style={styles.successInfo}>
            <View style={styles.successInfoRow}>
              <Ionicons name="construct-outline" size={20} color="#1a73e8" />
              <Text style={styles.successInfoText}>{params.artisanTrade} Service</Text>
            </View>
            <View style={styles.successInfoRow}>
              <Ionicons name="calendar-outline" size={20} color="#1a73e8" />
              <Text style={styles.successInfoText}>{selectedDate} at {selectedTime}</Text>
            </View>
            <View style={styles.successInfoRow}>
              <Ionicons name="location-outline" size={20} color="#1a73e8" />
              <Text style={styles.successInfoText}>{address}</Text>
            </View>
            {bookingId && (
              <View style={styles.successInfoRow}>
                <Ionicons name="document-text-outline" size={20} color="#1a73e8" />
                <Text style={styles.successInfoText}>Booking #{bookingId}</Text>
              </View>
            )}
          </View>

          <Text style={styles.successNote}>
            The artisan will accept or respond to your request shortly. You{"'"}ll receive a notification when they respond.
          </Text>

          {/* Chat with Artisan button — only shown if we have artisanUserId */}
          {bookingArtisanUserId && bookingId && (
            <TouchableOpacity
              style={[styles.successButton, { marginBottom: 12, backgroundColor: '#E3F2FD' }]}
              onPress={() => router.replace({
                pathname: '/chat',
                params: {
                  artisanUserId: String(bookingArtisanUserId),
                  artisanName: params.artisanName,
                  artisanPhoto: params.artisanPhoto || '',
                  artisanTrade: params.artisanTrade || '',
                  bookingId: String(bookingId),
                },
              })}
            >
              <View style={[styles.successButtonGradient, { backgroundColor: '#E3F2FD', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}>
                <Ionicons name="chatbubble-outline" size={20} color="#1a237e" />
                <Text style={[styles.successButtonText, { color: '#1a237e' }]}>Chat with Artisan</Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.successButton}
            onPress={() => router.replace('/customer-home')}
          >
            <LinearGradient
              colors={['#1a73e8', '#0d47a1']}
              style={styles.successButtonGradient}
            >
              <Text style={styles.successButtonText}>Back to Home</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <LinearGradient colors={['#1a73e8', '#0d47a1']} style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Service</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Artisan Info Card */}
        <View style={styles.artisanCard}>
          <View style={styles.artisanRow}>
            {params.artisanPhoto ? (
              <Image source={{ uri: params.artisanPhoto }} style={styles.artisanPhoto} />
            ) : (
              <View style={[styles.artisanPhoto, styles.artisanPhotoPlaceholder]}>
                <Text style={styles.artisanPhotoText}>
                  {params.artisanName?.charAt(0) || 'A'}
                </Text>
              </View>
            )}
            <View style={styles.artisanInfo}>
              <Text style={styles.artisanName}>{params.artisanName}</Text>
              <Text style={styles.artisanTrade}>{params.artisanTrade}</Text>
              <View style={styles.artisanRating}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text style={styles.artisanRatingText}>{params.artisanRating || '4.8'}</Text>
              </View>
            </View>
            <Text style={styles.artisanPrice}>
              ₦{parseInt(params.startingPrice || '3000').toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.formSection}>
          <Text style={styles.label}>
            <Ionicons name="document-text-outline" size={16} color="#1a73e8" /> Describe Your Need *
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="E.g., My kitchen sink is leaking and needs repair..."
            placeholderTextColor="#aaa"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
        </View>

        {/* Location */}
        <View style={styles.formSection}>
          <Text style={styles.label}>
            <Ionicons name="location-outline" size={16} color="#1a73e8" /> Your Address *
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full address"
            placeholderTextColor="#aaa"
            value={address}
            onChangeText={setAddress}
          />
        </View>

        {/* Date Selection */}
        <View style={styles.formSection}>
          <Text style={styles.label}>
            <Ionicons name="calendar-outline" size={16} color="#1a73e8" /> Select Date *
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
            {dateOptions.map((date) => (
              <TouchableOpacity
                key={date.value}
                style={[
                  styles.dateChip,
                  selectedDate === date.value && styles.dateChipSelected,
                ]}
                onPress={() => setSelectedDate(date.value)}
              >
                <Text
                  style={[
                    styles.dateChipDay,
                    selectedDate === date.value && styles.dateChipTextSelected,
                  ]}
                >
                  {date.day}
                </Text>
                <Text
                  style={[
                    styles.dateChipNum,
                    selectedDate === date.value && styles.dateChipTextSelected,
                  ]}
                >
                  {date.dateNum}
                </Text>
                {date.label === 'Today' && (
                  <Text style={[
                    styles.dateChipToday,
                    selectedDate === date.value && styles.dateChipTextSelected,
                  ]}>
                    Today
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time Selection */}
        <View style={styles.formSection}>
          <Text style={styles.label}>
            <Ionicons name="time-outline" size={16} color="#1a73e8" /> Select Time *
          </Text>
          <View style={styles.timeGrid}>
            {timeSlots.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeChip,
                  selectedTime === time && styles.timeChipSelected,
                ]}
                onPress={() => setSelectedTime(time)}
              >
                <Text
                  style={[
                    styles.timeChipText,
                    selectedTime === time && styles.timeChipTextSelected,
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Additional Notes */}
        <View style={styles.formSection}>
          <Text style={styles.label}>
            <Ionicons name="chatbubble-outline" size={16} color="#1a73e8" /> Additional Notes (Optional)
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="Any extra info (e.g., gate code, parking instructions)..."
            placeholderTextColor="#aaa"
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service</Text>
            <Text style={styles.summaryValue}>{params.artisanTrade}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date</Text>
            <Text style={styles.summaryValue}>{selectedDate || 'Not selected'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time</Text>
            <Text style={styles.summaryValue}>{selectedTime || 'Not selected'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated Price</Text>
            <Text style={styles.summaryPrice}>
              ₦{parseInt(params.startingPrice || '3000').toLocaleString()}
            </Text>
          </View>
          <Text style={styles.summaryNote}>
            Final price will be confirmed by the artisan after assessment
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Submit */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmitBooking}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={loading ? ['#ccc', '#aaa'] : ['#4CAF50', '#2E7D32']}
            style={styles.submitButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                <Text style={styles.submitButtonText}>Confirm Booking</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16,
  },
  headerBack: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },

  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  // Artisan Card
  artisanCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  artisanRow: { flexDirection: 'row', alignItems: 'center' },
  artisanPhoto: { width: 56, height: 56, borderRadius: 28 },
  artisanPhotoPlaceholder: { backgroundColor: '#e8eaf6', justifyContent: 'center', alignItems: 'center' },
  artisanPhotoText: { fontSize: 24, fontWeight: 'bold', color: '#1a73e8' },
  artisanInfo: { flex: 1, marginLeft: 12 },
  artisanName: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  artisanTrade: { fontSize: 13, color: '#666', marginTop: 2 },
  artisanRating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  artisanRatingText: { fontSize: 13, color: '#333', fontWeight: '600' },
  artisanPrice: { fontSize: 18, fontWeight: 'bold', color: '#1a73e8' },

  // Form
  formSection: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#222', borderWidth: 1, borderColor: '#e0e0e0',
  },
  textArea: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#222', borderWidth: 1, borderColor: '#e0e0e0',
    minHeight: 80,
  },

  // Date chips
  dateScroll: { flexDirection: 'row' },
  dateChip: {
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: '#fff', borderRadius: 12, marginRight: 10,
    borderWidth: 1.5, borderColor: '#e0e0e0', minWidth: 60,
  },
  dateChipSelected: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  dateChipDay: { fontSize: 12, color: '#888', fontWeight: '500' },
  dateChipNum: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 2 },
  dateChipToday: { fontSize: 10, color: '#1a73e8', fontWeight: '600', marginTop: 2 },
  dateChipTextSelected: { color: '#fff' },

  // Time grid
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: '#fff', borderRadius: 8,
    borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  timeChipSelected: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  timeChipText: { fontSize: 13, color: '#555', fontWeight: '500' },
  timeChipTextSelected: { color: '#fff' },

  // Summary
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#888' },
  summaryValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  summaryDivider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  summaryPrice: { fontSize: 18, fontWeight: 'bold', color: '#1a73e8' },
  summaryNote: { fontSize: 12, color: '#aaa', marginTop: 4, fontStyle: 'italic' },

  // Bottom
  bottomBar: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#eee', paddingBottom: 28,
  },
  submitButton: { borderRadius: 12, overflow: 'hidden' },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  submitButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  // Success
  successContainer: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', padding: 24 },
  successContent: { alignItems: 'center' },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 26, fontWeight: 'bold', color: '#222', marginBottom: 8 },
  successSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24 },
  successInfo: {
    backgroundColor: '#f5f8ff', borderRadius: 12, padding: 16, width: '100%', marginBottom: 16,
  },
  successInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  successInfoText: { fontSize: 14, color: '#333' },
  successNote: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  successButton: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  successButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  successButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
});
