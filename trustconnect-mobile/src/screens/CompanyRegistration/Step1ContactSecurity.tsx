import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Alert,
  ActivityIndicator, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing } from '../../config/theme';
import AnimatedButton from '../../components/AnimatedButton';
import {
  CompanyRegistrationData,
  sendOTP,
  verifyOTP,
} from '../../services/companyRegistrationService';
import { router } from 'expo-router';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

interface Props {
  onComplete: (data: Partial<CompanyRegistrationData>) => void;
  initialData?: Partial<CompanyRegistrationData>;
}

export default function Step1ContactSecurity({ onComplete, initialData }: Props) {
  const [contactName, setContactName] = useState(initialData?.contactName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState(initialData?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSendOTP = async () => {
    if (phone.length < 10) {
      setErrors((p) => ({ ...p, phone: 'Enter a valid 10-digit phone number' }));
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const formatted = phone.startsWith('0') ? `+234${phone.slice(1)}` : `+234${phone}`;
      const result = await sendOTP(formatted);
      if (result.success) {
        setOtpSent(true);
        Alert.alert('✅ OTP Sent', '📲 Verification code sent.\n\nFor testing, use: 1234');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 4) {
      setErrors((p) => ({ ...p, otp: 'Enter the 4-digit code' }));
      return;
    }
    setLoading(true);
    try {
      const formatted = phone.startsWith('0') ? `+234${phone.slice(1)}` : `+234${phone}`;
      const result = await verifyOTP(formatted, otp);
      if (result.success) {
        setOtpVerified(true);
      } else {
        Alert.alert('Verification Failed', 'Incorrect code.\n\nFor testing, use: 1234');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (contactName.trim().length < 2) e.contactName = 'Enter your full name';
    if (!otpVerified) e.phone = 'Verify your phone number first';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!email) e.email = 'Company email is required';
    if (password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    const formatted = phone.startsWith('0') ? `+234${phone.slice(1)}` : `+234${phone}`;
    onComplete({ contactName: contactName.trim(), phone: formatted, email: email.trim(), password });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={NAVY} />
          </Pressable>
          <View style={styles.stepIndicator}>
            {[1, 2, 3, 4].map((s) => (
              <View key={s} style={[styles.stepDot, s === 1 && styles.stepDotActive]} />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="office-building" size={36} color={GOLD} />
          </View>
          <Text style={styles.title}>Company Registration</Text>
          <Text style={styles.subtitle}>Step 1: Contact Person & Security</Text>
        </Animated.View>

        {/* Contact Name */}
        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.field}>
          <Text style={styles.label}>Contact Person Name *</Text>
          <View style={[styles.inputRow, errors.contactName ? styles.inputError : null]}>
            <MaterialCommunityIcons name="account" size={20} color="#78909C" />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={contactName}
              onChangeText={setContactName}
              placeholderTextColor="#B0BEC5"
            />
          </View>
          {errors.contactName ? <Text style={styles.errorText}>{errors.contactName}</Text> : null}
        </Animated.View>

        {/* Phone */}
        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.field}>
          <Text style={styles.label}>Phone Number *</Text>
          <View style={[styles.inputRow, errors.phone ? styles.inputError : null]}>
            <Text style={styles.prefix}>+234</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="8012345678"
              value={phone}
              onChangeText={(t) => { setPhone(t.replace(/[^0-9]/g, '')); setOtpVerified(false); setOtpSent(false); }}
              keyboardType="phone-pad"
              maxLength={11}
              placeholderTextColor="#B0BEC5"
            />
            {otpVerified ? (
              <MaterialCommunityIcons name="check-circle" size={22} color="#4CAF50" />
            ) : (
              <Pressable onPress={handleSendOTP} disabled={loading} style={styles.otpBtn}>
                {loading && !otpSent ? <ActivityIndicator size="small" color={NAVY} /> : (
                  <Text style={styles.otpBtnText}>{otpSent ? 'Resend' : 'Send OTP'}</Text>
                )}
              </Pressable>
            )}
          </View>
          {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
        </Animated.View>

        {/* OTP */}
        {otpSent && !otpVerified && (
          <Animated.View entering={FadeInUp.springify()} style={styles.field}>
            <Text style={styles.label}>Enter OTP Code</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#78909C" />
              <TextInput
                style={styles.input}
                placeholder="1234"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={4}
                placeholderTextColor="#B0BEC5"
              />
              <Pressable onPress={handleVerifyOTP} disabled={loading} style={styles.otpBtn}>
                {loading ? <ActivityIndicator size="small" color={NAVY} /> : (
                  <Text style={styles.otpBtnText}>Verify</Text>
                )}
              </Pressable>
            </View>
            {errors.otp ? <Text style={styles.errorText}>{errors.otp}</Text> : null}
          </Animated.View>
        )}

        {/* Email */}
        <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.field}>
          <Text style={styles.label}>Company Email *</Text>
          <View style={[styles.inputRow, errors.email ? styles.inputError : null]}>
            <MaterialCommunityIcons name="email-outline" size={20} color="#78909C" />
            <TextInput
              style={styles.input}
              placeholder="info@company.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#B0BEC5"
            />
          </View>
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </Animated.View>

        {/* Password */}
        <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.field}>
          <Text style={styles.label}>Password *</Text>
          <View style={[styles.inputRow, errors.password ? styles.inputError : null]}>
            <MaterialCommunityIcons name="lock" size={20} color="#78909C" />
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor="#B0BEC5"
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <MaterialCommunityIcons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#78909C" />
            </Pressable>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(700).springify()} style={styles.btnContainer}>
          <AnimatedButton variant="primary" onPress={handleContinue}>
            Continue to Business Details
          </AnimatedButton>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  stepIndicator: { flexDirection: 'row', gap: 6 },
  stepDot: { width: 28, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0' },
  stepDotActive: { backgroundColor: NAVY, width: 40 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF8E1', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md },
  title: { fontSize: 26, fontWeight: '700', color: NAVY, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#78909C', textAlign: 'center', marginBottom: spacing.xl },
  field: { marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: '#37474F', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10, borderWidth: 1.5, borderColor: '#E8EAEF', gap: 10 },
  inputError: { borderColor: '#E53935' },
  input: { flex: 1, fontSize: 16, color: '#1f2128' },
  prefix: { fontSize: 16, fontWeight: '600', color: NAVY },
  otpBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FFF8E1' },
  otpBtnText: { fontSize: 13, fontWeight: '600', color: NAVY },
  errorText: { fontSize: 12, color: '#E53935', marginTop: 4 },
  btnContainer: { marginTop: spacing.lg },
});
