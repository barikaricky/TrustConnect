import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, StatusBar,
  Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

export default function NINVerificationScreen() {
  const [nin, setNin] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
  const [verifiedData, setVerifiedData] = useState<any>(null);

  const isValidNIN = /^\d{11}$/.test(nin);

  const handleVerify = async () => {
    if (!isValidNIN) {
      Alert.alert('Invalid NIN', 'NIN must be exactly 11 digits.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setStatus('verifying');

    try {
      const res = await axios.post(`${API_BASE_URL}/verification/verify-id`, {
        type: 'NIN',
        idNumber: nin,
      });

      if (res.data.success) {
        setStatus('verified');
        setVerifiedData(res.data.data);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setStatus('failed');
        Alert.alert('Verification Failed', res.data.message || 'Could not verify NIN.');
      }
    } catch (err: any) {
      setStatus('failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err?.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[NAVY, '#283593']} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>NIN Verification</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.infoBanner}>
          <View style={styles.infoIconBox}>
            <MaterialCommunityIcons name="card-account-details-outline" size={28} color={NAVY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>National Identification Number</Text>
            <Text style={styles.infoSubtitle}>
              Verify your identity using your 11-digit NIN to unlock all TrustConnect features and build trust.
            </Text>
          </View>
        </Animated.View>

        {/* Benefits */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.sectionTitle}>Benefits of Verification</Text>
          <View style={styles.benefitsCard}>
            {[
              { icon: 'shield-check', text: 'Verified badge on your profile', color: '#4CAF50' },
              { icon: 'star-circle', text: 'Higher trust score & priority matching', color: '#FF9800' },
              { icon: 'cash-fast', text: 'Faster payment processing', color: '#2196F3' },
              { icon: 'account-group', text: 'Access to premium artisans', color: '#9C27B0' },
            ].map((benefit, i) => (
              <View key={i} style={styles.benefitRow}>
                <MaterialCommunityIcons name={benefit.icon as any} size={20} color={benefit.color} />
                <Text style={styles.benefitText}>{benefit.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* NIN Input */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Text style={styles.label}>Enter NIN</Text>
          <View style={[styles.inputRow, nin.length > 0 && (isValidNIN ? styles.inputValid : styles.inputWarning)]}>
            <MaterialCommunityIcons name="numeric" size={20} color="#78909C" />
            <TextInput
              style={styles.input}
              placeholder="12345678901"
              placeholderTextColor="#B0BEC5"
              keyboardType="number-pad"
              maxLength={11}
              value={nin}
              onChangeText={(t) => { setNin(t.replace(/\D/g, '')); setStatus('idle'); }}
            />
            <Text style={styles.charCount}>{nin.length}/11</Text>
            {isValidNIN && (
              <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
            )}
          </View>
          <Text style={styles.hintText}>Your NIN is a unique 11-digit number on your NIMC slip or ID card</Text>
        </Animated.View>

        {/* Status */}
        {status === 'verified' && (
          <Animated.View entering={FadeInDown.springify()} style={styles.successCard}>
            <MaterialCommunityIcons name="check-decagram" size={40} color="#4CAF50" />
            <Text style={styles.successTitle}>NIN Verified Successfully!</Text>
            <Text style={styles.successSubtitle}>
              Your identity has been verified. Your profile now shows a verified badge.
            </Text>
          </Animated.View>
        )}

        {status === 'failed' && (
          <Animated.View entering={FadeInDown.springify()} style={styles.failCard}>
            <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#E53935" />
            <Text style={styles.failTitle}>Verification Failed</Text>
            <Text style={styles.failSubtitle}>
              The NIN could not be verified. Please check the number and try again, or contact support.
            </Text>
          </Animated.View>
        )}

        {/* Verify Button */}
        {status !== 'verified' && (
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <Pressable
              style={[styles.verifyBtn, (!isValidNIN || loading) && styles.verifyBtnDisabled]}
              onPress={handleVerify}
              disabled={!isValidNIN || loading}
            >
              <LinearGradient
                colors={(!isValidNIN || loading) ? ['#B0BEC5', '#90A4AE'] : [NAVY, '#283593']}
                style={styles.verifyBtnGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="shield-search" size={20} color="#fff" />
                    <Text style={styles.verifyBtnText}>Verify NIN</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* Security Note */}
        <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.securityNote}>
          <MaterialCommunityIcons name="lock-outline" size={16} color="#78909C" />
          <Text style={styles.securityText}>
            Your NIN is encrypted and stored securely. We comply with NDPR regulations for data protection.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 42, paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { padding: 20, paddingBottom: 40 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#E8EAF6', borderRadius: 14, padding: 16, marginBottom: 20,
  },
  infoIconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#C5CAE9', justifyContent: 'center', alignItems: 'center',
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: NAVY },
  infoSubtitle: { fontSize: 12, color: '#546E7A', lineHeight: 18, marginTop: 2 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#78909C', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  benefitsCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 24,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  benefitText: { fontSize: 14, color: '#37474F' },

  label: { fontSize: 14, fontWeight: '600', color: '#37474F', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 2, borderColor: '#E0E0E0',
    paddingHorizontal: 14,
  },
  inputValid: { borderColor: '#4CAF50' },
  inputWarning: { borderColor: '#FF9800' },
  input: { flex: 1, paddingVertical: 14, fontSize: 18, color: '#1B2631', fontWeight: '600', letterSpacing: 2 },
  charCount: { fontSize: 12, color: '#90A4AE', fontWeight: '600' },
  hintText: { fontSize: 11, color: '#90A4AE', marginTop: 6, marginLeft: 4 },

  successCard: {
    backgroundColor: '#E8F5E9', borderRadius: 14, padding: 24, alignItems: 'center', marginTop: 20,
    borderWidth: 1, borderColor: '#C8E6C9',
  },
  successTitle: { fontSize: 18, fontWeight: '700', color: '#2E7D32', marginTop: 12 },
  successSubtitle: { fontSize: 13, color: '#4CAF50', textAlign: 'center', marginTop: 8, lineHeight: 18 },

  failCard: {
    backgroundColor: '#FFEBEE', borderRadius: 14, padding: 24, alignItems: 'center', marginTop: 20,
    borderWidth: 1, borderColor: '#FFCDD2',
  },
  failTitle: { fontSize: 18, fontWeight: '700', color: '#C62828', marginTop: 12 },
  failSubtitle: { fontSize: 13, color: '#E53935', textAlign: 'center', marginTop: 8, lineHeight: 18 },

  verifyBtn: { marginTop: 24, borderRadius: 14, overflow: 'hidden' },
  verifyBtnDisabled: { opacity: 0.6 },
  verifyBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 14,
  },
  verifyBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  securityNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 24, paddingHorizontal: 4,
  },
  securityText: { flex: 1, fontSize: 11, color: '#90A4AE', lineHeight: 16 },
});
