import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView,
  Platform, ScrollView, StatusBar, Alert, ActivityIndicator,
  Image,
} from 'react-native';
import Animated, {
  FadeInDown, FadeIn, SlideInRight,
  useSharedValue, useAnimatedStyle, withSpring, withRepeat,
  withTiming, withSequence, withDelay, Easing, interpolate,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spacing, typography } from '../config/theme';
import { loginUser, getStoredUser } from '../services/loginService';
import { useAuth } from '../services/AuthContext';
import { showLoginNotification } from '../services/notificationService';
import { API_BASE_URL } from '../config/api';

const GOLD = '#FFC107';
const GOLD_DARK = '#FFA000';
const NAVY = '#1a237e';
const NAVY_LIGHT = '#283593';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type UserType = 'customer' | 'artisan' | 'company';

export default function LoginScreen() {
  const auth = useAuth();
  const [userType, setUserType] = useState<UserType>('customer');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Animation shared values
  const logoScale = useSharedValue(0.3);
  const logoPulse = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const shieldGlow = useSharedValue(0);
  const formCardY = useSharedValue(60);
  const formCardOpacity = useSharedValue(0);

  // Animate on mount
  useEffect(() => {
    // Logo entrance with bounce
    logoScale.value = withSpring(1, { damping: 8, stiffness: 120 });
    // Subtle continuous pulse on logo
    logoPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true
    );
    // Form card slide up
    formCardY.value = withDelay(300, withSpring(0, { damping: 14, stiffness: 80 }));
    formCardOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    // Shield glow loop
    shieldGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value * logoPulse.value },
    ],
  }));

  const formCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: formCardY.value }],
    opacity: formCardOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const shieldGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shieldGlow.value, [0, 1], [0.4, 1]),
  }));

  const isValidPhone = phone.length === 10 && /^\d+$/.test(phone);
  const isValidPassword = password.length >= 6;
  const isValidOTP = otp.length === 4 && /^\d+$/.test(otp);
  
  const canSubmit = loginMethod === 'password' 
    ? (isValidPhone && isValidPassword && !loading)
    : (isValidPhone && !loading);

  const handleLogin = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    try {
      const formattedPhone = `+234${phone}`;
      console.log('🔐 Attempting login:', { userType, phone: formattedPhone });

      const response = await loginUser({
        phone: formattedPhone,
        password: password,
        userType: userType,
      });

      console.log('✅ Login successful:', response.data.user.fullName);

      // Trigger AuthContext login — this enables lock screen PIN setup for ALL user types
      await auth.login(
        {
          id: response.data.user.id as any,
          name: response.data.user.fullName || '',
          phone: response.data.user.phone,
          role: response.data.user.role as any,
        },
        response.data.token
      );

      // Show login notification
      showLoginNotification(response.data.user.fullName || 'User');

      // Navigate based on user type from backend
      if (response.data.user.role === 'customer') {
        router.replace('/customer-home');
      } else if (response.data.user.role === 'artisan') {
        router.replace('/artisan-dashboard');
      } else if (response.data.user.role === 'company') {
        router.replace('/company-dashboard');
      } else {
        throw new Error('Invalid user role');
      }
    } catch (err: any) {
      console.error('❌ Login error:', err.message);
      
      // User-friendly error messages
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (err.message.includes('User not found')) {
        errorMessage = '📱 This phone number is not registered.\n\nPlease click "Register here" below to create an account.';
      } else if (err.message.includes('Incorrect password')) {
        errorMessage = '🔒 Wrong password.\n\nPlease check your password and try again, or use "Forgot Password?" to reset it.';
      } else if (err.message.includes('connect to server') || err.message.includes('Network Error')) {
        errorMessage = '📡 Cannot connect to server.\n\nPlease check your internet connection and try again.';
      } else if (err.message.includes('timeout')) {
        errorMessage = '⏱️ Connection timeout.\n\nThe server is taking too long to respond. Please try again.';
      } else if (err.message.includes('Password not set')) {
        errorMessage = '🔐 No password set for this account.\n\nPlease use "Login with OTP" instead.';
        // Auto-switch to OTP method
        setTimeout(() => setLoginMethod('otp'), 2000);
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOTPLogin = async () => {
    if (!isValidPhone) return;

    setLoading(true);
    setError('');

    try {
      const formattedPhone = `+234${phone}`;
      
      if (!otpSent) {
        // Step 1: Request OTP via dedicated send-otp endpoint
        console.log('📲 Requesting OTP for:', formattedPhone);
        const response = await axios.post(`${API_BASE_URL}/auth/send-otp`, {
          phone: formattedPhone,
        });

        if (response.data.success) {
          setOtpSent(true);
          setResendTimer(60);
          
          // Start countdown
          const interval = setInterval(() => {
            setResendTimer(prev => {
              if (prev <= 1) {
                clearInterval(interval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          
          Alert.alert(
            'OTP Sent! 📱',
            `We've sent a 4-digit code to ${formattedPhone}.\n\nCheck your messages.`,
            [{ text: 'OK' }]
          );
        }
      } else {
        // Step 2: Verify OTP and login
        if (!isValidOTP) {
          setError('Please enter a valid 4-digit OTP');
          return;
        }

        console.log('🔐 Verifying OTP...');
        const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, {
          phone: formattedPhone,
          otp: otp,
        });

        if (response.data.success) {
          const userData = response.data.data.user;
          console.log('✅ OTP Login successful:', userData?.fullName || userData?.name);
          
          // Save token and user data
          await AsyncStorage.setItem('@trustconnect_token', response.data.data.token);
          await AsyncStorage.setItem('@trustconnect_user', JSON.stringify(userData));

          // Show login notification
          showLoginNotification(userData?.fullName || userData?.name || 'User');

          // Trigger AuthContext login — enables lock screen PIN for ALL user types
          await auth.login(
            {
              id: userData?.id as any,
              name: userData?.fullName || userData?.name || '',
              phone: userData?.phone,
              role: (userData?.role || userType) as any,
            },
            response.data.data.token
          );

          // Navigate based on user type
          if (userData?.role === 'customer' || userType === 'customer') {
            router.replace('/customer-home');
          } else if (userData?.role === 'artisan' || userType === 'artisan') {
            router.replace('/artisan-dashboard');
          } else if (userData?.role === 'company' || userType === 'company') {
            router.replace('/company-dashboard');
          }
        }
      }
    } catch (err: any) {
      console.error('❌ OTP Login error:', err.message);
      
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (err.message.includes('User not found')) {
        errorMessage = '📱 This phone number is not registered.\n\nPlease register first.';
      } else if (err.message.includes('Invalid OTP')) {
        errorMessage = '❌ Wrong OTP code.\n\nPlease check and try again.';
      } else if (err.message.includes('OTP expired')) {
        errorMessage = '⏰ OTP expired.\n\nPlease request a new code.';
        setOtpSent(false);
        setOtp('');
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      // Check if device supports biometric authentication
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert('Not Supported', 'Your device does not support biometric authentication.');
        return;
      }

      // Check if biometrics are enrolled
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert(
          'No Biometrics Enrolled',
          'Please set up Face ID or Fingerprint in your device settings first.'
        );
        return;
      }

      // Check if we have saved credentials
      const storedUser = await getStoredUser();
      if (!storedUser) {
        Alert.alert(
          'No Saved Login',
          'Please login with your phone and password first to enable biometric login.'
        );
        return;
      }

      // Authenticate with biometrics
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login to TrustConnect',
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        console.log('✅ Biometric authentication successful');
        
        // Show login notification
        showLoginNotification(storedUser.fullName || storedUser.name);
        
        // Navigate based on user role
        if (storedUser.role === 'customer') {
          router.replace('/customer-home');
        } else if (storedUser.role === 'artisan') {
          router.replace('/artisan-dashboard');
        } else if (storedUser.role === 'company') {
          router.replace('/company-dashboard');
        }
      } else {
        console.log('❌ Biometric authentication failed:', result.error);
        Alert.alert('Authentication Failed', 'Please try again or use your password.');
      }
    } catch (error) {
      console.error('Biometric error:', error);
      Alert.alert('Error', 'Failed to authenticate. Please use your password.');
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Reset Password', 'Please contact support to reset your password.');
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleRegister = () => {
    handleGoBack();
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={[NAVY, '#1E2D8B', NAVY_LIGHT]}
          style={styles.gradient}
          locations={[0, 0.5, 1]}
        >
          {/* Decorative gold glow blob */}
          <Animated.View style={[styles.glowBlob, shieldGlowStyle]} pointerEvents="none" />

          {/* Dot grid overlay */}
          <View style={styles.dotGrid} pointerEvents="none">
            {Array.from({ length: 80 }).map((_, i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <Animated.View entering={FadeIn.duration(400)} style={styles.backButtonRow}>
              <Pressable onPress={handleGoBack} style={styles.backButton} hitSlop={12}>
                <MaterialCommunityIcons name="arrow-left" size={20} color={GOLD} />
              </Pressable>
            </Animated.View>

            {/* Brand Header */}
            <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.brandSection}>
              <Animated.View style={[styles.logoShieldBox, logoAnimatedStyle]}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
              </Animated.View>
              <Text style={styles.brandName}>TrustConnect</Text>
              <Text style={styles.brandTagline}>Nigeria{"'"}s Most Trusted Platform</Text>
            </Animated.View>

            {/* Hero Text */}
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.heroSection}>
              <Text style={styles.welcomeHeadline}>
                Welcome <Text style={styles.heroGold}>Back</Text>
              </Text>
              <Text style={styles.welcomeSubtext}>
                Sign in to connect with trusted professionals
              </Text>
            </Animated.View>

            {/* Glass Form Card */}
            <Animated.View style={[styles.formCard, formCardAnimatedStyle]}>

              {/* User Type Tabs */}
              <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.userTypeSelector}>
                {(['customer', 'artisan', 'company'] as UserType[]).map((type) => (
                  <Pressable
                    key={type}
                    style={[styles.userTypeTab, userType === type && styles.userTypeTabActive]}
                    onPress={() => setUserType(type)}
                  >
                    <MaterialCommunityIcons
                      name={type === 'customer' ? 'account' : type === 'artisan' ? 'hammer-wrench' : 'office-building'}
                      size={16}
                      color={userType === type ? NAVY : 'rgba(255,255,255,0.5)'}
                    />
                    <Text style={[styles.userTypeText, userType === type && styles.userTypeTextActive]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </Animated.View>

              {/* Error Banner */}
              {error ? (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.errorBanner}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#FF6B6B" />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              ) : null}

              {/* Phone Field */}
              <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={[styles.inputWrapper, phone.length > 0 && isValidPhone && styles.inputWrapperValid]}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixFlag}>🇳🇬</Text>
                    <Text style={styles.phonePrefixCode}>+234</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="8012345678"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={phone}
                    onChangeText={(t) => { setPhone(t.replace(/\D/g, '')); setError(''); }}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!otpSent}
                  />
                  {isValidPhone && (
                    <MaterialCommunityIcons name="check-circle" size={18} color={GOLD} style={{ marginRight: 12 }} />
                  )}
                </View>
              </Animated.View>

              {/* Login Method Tabs */}
              <Animated.View entering={FadeInDown.delay(550).duration(400)} style={styles.methodSelector}>
                <Pressable
                  style={[styles.methodTab, loginMethod === 'password' && styles.methodTabActive]}
                  onPress={() => { setLoginMethod('password'); setOtpSent(false); setOtp(''); setError(''); }}
                >
                  <MaterialCommunityIcons name="lock-outline" size={15} color={loginMethod === 'password' ? NAVY : 'rgba(255,255,255,0.5)'} />
                  <Text style={[styles.methodText, loginMethod === 'password' && styles.methodTextActive]}>Password</Text>
                </Pressable>
                <Pressable
                  style={[styles.methodTab, loginMethod === 'otp' && styles.methodTabActive]}
                  onPress={() => { setLoginMethod('otp'); setPassword(''); setError(''); }}
                >
                  <MaterialCommunityIcons name="cellphone-message" size={15} color={loginMethod === 'otp' ? NAVY : 'rgba(255,255,255,0.5)'} />
                  <Text style={[styles.methodText, loginMethod === 'otp' && styles.methodTextActive]}>OTP Code</Text>
                </Pressable>
              </Animated.View>

              {/* Password Field */}
              {loginMethod === 'password' && (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="lock-outline" size={18} color="rgba(255,255,255,0.4)" style={{ marginLeft: 14 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your password"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={password}
                      onChangeText={(t) => { setPassword(t); setError(''); }}
                      secureTextEntry={!showPassword}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                      <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.5)" />
                    </Pressable>
                  </View>
                  <Pressable onPress={handleForgotPassword} style={styles.forgotBtn}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </Pressable>
                </Animated.View>
              )}

              {/* OTP Field */}
              {loginMethod === 'otp' && otpSent && (
                <Animated.View entering={SlideInRight.duration(300)} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Verification Code</Text>
                  <View style={[styles.inputWrapper, isValidOTP && styles.inputWrapperValid]}>
                    <MaterialCommunityIcons name="shield-key-outline" size={18} color="rgba(255,255,255,0.4)" style={{ marginLeft: 14 }} />
                    <TextInput
                      style={[styles.textInput, styles.otpInput]}
                      placeholder="1234"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={otp}
                      onChangeText={(t) => { setOtp(t.replace(/\D/g, '')); setError(''); }}
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                    {isValidOTP && (
                      <MaterialCommunityIcons name="check-circle" size={18} color={GOLD} style={{ marginRight: 12 }} />
                    )}
                  </View>
                  {resendTimer > 0 ? (
                    <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
                  ) : (
                    <Pressable onPress={() => { setOtpSent(false); setOtp(''); }} style={styles.forgotBtn}>
                      <Text style={styles.forgotText}>Resend OTP</Text>
                    </Pressable>
                  )}
                </Animated.View>
              )}

              {/* Biometric */}
              <Animated.View entering={FadeInDown.delay(650).duration(400)}>
                <Pressable style={styles.biometricBtn} onPress={handleBiometricLogin}>
                  <View style={styles.biometricIconBox}>
                    <MaterialCommunityIcons name="fingerprint" size={22} color={GOLD} />
                  </View>
                  <Text style={styles.biometricText}>Use Biometric Login</Text>
                </Pressable>
              </Animated.View>

              {/* Submit Button */}
              <Animated.View entering={FadeInDown.delay(700).duration(400)}>
                <AnimatedPressable
                  style={[styles.submitBtnWrap, !canSubmit && styles.submitBtnDisabled, buttonAnimatedStyle]}
                  onPress={loginMethod === 'password' ? handleLogin : handleOTPLogin}
                  onPressIn={() => {
                    buttonScale.value = withSpring(0.96, { damping: 15 });
                  }}
                  onPressOut={() => {
                    buttonScale.value = withSpring(1, { damping: 10 });
                  }}
                  disabled={!canSubmit}
                >
                  <LinearGradient
                    colors={canSubmit ? [GOLD_DARK, GOLD, '#FFE082'] : ['#455A64', '#546E7A', '#607D8B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtnGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color={NAVY} />
                    ) : (
                      <View style={styles.submitBtnInner}>
                        <Text style={styles.submitBtnText}>
                          {loginMethod === 'otp' && !otpSent ? 'Send OTP Code' :
                           loginMethod === 'otp' && otpSent ? 'Verify & Sign In' :
                           'Sign In'}
                        </Text>
                        <MaterialCommunityIcons name="arrow-right" size={20} color={NAVY} />
                      </View>
                    )}
                  </LinearGradient>
                </AnimatedPressable>
              </Animated.View>

              {/* Register Link */}
              <Animated.View entering={FadeInDown.delay(750).duration(400)} style={styles.registerRow}>
                <Text style={styles.registerText}>Don{"'"}t have an account? </Text>
                <Pressable onPress={handleRegister}>
                  <Text style={styles.registerLink}>Register here</Text>
                </Pressable>
              </Animated.View>

            </Animated.View>

            {/* Security Badge */}
            <Animated.View style={[styles.securityRow, shieldGlowStyle]}>
              <MaterialCommunityIcons name="shield-lock-outline" size={14} color="rgba(255,255,255,0.5)" />
              <Text style={styles.securityText}>End-to-end encrypted • 256-bit SSL</Text>
            </Animated.View>

          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },

  // Decorations
  glowBlob: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: GOLD,
    opacity: 0.18,
  },
  dotGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 22,
    padding: 16,
    opacity: 0.07,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'ios' ? 55 : 45,
    paddingBottom: spacing.xxl + 8,
  },

  // Back Button
  backButtonRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Brand
  brandSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  logoShieldBox: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: 'rgba(255,193,7,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,193,7,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoImg: { width: 50, height: 50 },
  brandName: {
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.3,
  },

  // Hero
  heroSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  welcomeHeadline: {
    fontSize: 32,
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroGold: { color: GOLD },
  welcomeSubtext: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 22,
    textAlign: 'center',
  },

  // Glass Form Card
  formCard: {
    marginHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },

  // User Type Tabs
  userTypeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    padding: 3,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  userTypeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 5,
  },
  userTypeTabActive: {
    backgroundColor: GOLD,
    elevation: 4,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  userTypeText: {
    fontSize: 13,
    fontWeight: typography.fontWeight.semibold,
    color: 'rgba(255,255,255,0.5)',
  },
  userTypeTextActive: {
    color: NAVY,
    fontWeight: typography.fontWeight.bold,
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(211,47,47,0.15)',
    padding: 12,
    borderRadius: 12,
    marginBottom: spacing.md,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
  },
  errorText: {
    flex: 1,
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: typography.fontWeight.medium,
    lineHeight: 19,
  },

  // Inputs
  inputGroup: { marginBottom: spacing.md + 2 },
  inputLabel: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  inputWrapperValid: {
    borderColor: 'rgba(255,193,7,0.6)',
    backgroundColor: 'rgba(255,193,7,0.05)',
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.15)',
    gap: 4,
  },
  phonePrefixFlag: { fontSize: 17 },
  phonePrefixCode: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    color: 'rgba(255,255,255,0.7)',
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  otpInput: {
    fontSize: 22,
    letterSpacing: 10,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    color: GOLD,
  },
  eyeBtn: { padding: 12 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 6 },
  forgotText: { fontSize: 13, color: GOLD, fontWeight: typography.fontWeight.semibold },
  resendTimer: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginTop: 6 },

  // Method Selector
  methodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 3,
    marginBottom: spacing.md + 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    gap: 5,
  },
  methodTabActive: {
    backgroundColor: GOLD,
    elevation: 2,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  methodText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: typography.fontWeight.medium },
  methodTextActive: { color: NAVY, fontWeight: typography.fontWeight.bold },

  // Biometric
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.25)',
    borderRadius: 14,
    marginBottom: spacing.md + 4,
    gap: 10,
    backgroundColor: 'rgba(255,193,7,0.07)',
  },
  biometricIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,193,7,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: typography.fontWeight.semibold,
  },

  // Submit
  submitBtnWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.md,
    elevation: 6,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  submitBtnDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  submitBtnGradient: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: NAVY,
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.3,
  },

  // Register
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  registerText: { fontSize: 14, color: 'rgba(255,255,255,0.55)' },
  registerLink: { fontSize: 14, color: GOLD, fontWeight: typography.fontWeight.bold },

  // Security Badge
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: 6,
  },
  securityText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
});
