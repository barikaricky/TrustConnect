import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, ActivityIndicator, Alert, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing } from '../../config/theme';
import AnimatedButton from '../../components/AnimatedButton';
import { sendOTP, verifyOTP, socialLogin, CustomerRegistrationData } from '../../services/customerRegistrationService';

interface Step1Props {
  onComplete: (data: Partial<CustomerRegistrationData>) => void;
  initialData?: Partial<CustomerRegistrationData>;
}

export default function Step1BasicInfo({ onComplete, initialData }: Step1Props) {
  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ fullName: '', phone: '', otp: '' });

  const handleSendOTP = async () => {
    // Validate phone
    if (phone.length < 10) {
      setErrors((prev) => ({ ...prev, phone: '📱 Please enter a valid 10-digit phone number' }));
      return;
    }

    setLoading(true);
    setErrors({ fullName: '', phone: '', otp: '' });

    try {
      const formattedPhone = phone.startsWith('0') ? `+234${phone.slice(1)}` : `+234${phone}`;
      const result = await sendOTP(formattedPhone);
      
      if (result.success) {
        setOtpSent(true);
        Alert.alert(
          '✅ OTP Sent',
          '📲 A 4-digit verification code has been sent.\n\nFor testing, use: 1234',
          [{ text: 'OK' }]
        );
      } else {
        setErrors((prev) => ({ ...prev, phone: result.message }));
      }
    } catch (error: any) {
      console.error('Send OTP error:', error);
      Alert.alert('❌ Error', 'Failed to send OTP. Please try again.', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 4) {
      setErrors((prev) => ({ ...prev, otp: '🔢 Please enter the complete 4-digit code' }));
      return;
    }

    setLoading(true);
    setErrors({ fullName: '', phone: '', otp: '' });

    try {
      const formattedPhone = phone.startsWith('0') ? `+234${phone.slice(1)}` : `+234${phone}`;
      const result = await verifyOTP(formattedPhone, otp);
      
      if (result.success) {
        setOtpVerified(true);
      } else {
        setErrors((prev) => ({ ...prev, otp: '❌ Invalid code' }));
        Alert.alert(
          'Verification Failed', 
          '❌ Incorrect code.\n\nFor testing, use: 1234',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      Alert.alert('❌ Error', 'Failed to verify. Please try again.', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    let valid = true;
    const newErrors = { fullName: '', phone: '', otp: '' };

    if (fullName.trim().length < 2) {
      newErrors.fullName = '👤 Please enter your full name (at least 2 characters)';
      valid = false;
    }

    if (!otpVerified) {
      newErrors.phone = '📱 Please verify your phone number first';
      valid = false;
    }

    setErrors(newErrors);

    if (valid) {
      const formattedPhone = phone.startsWith('0') ? `+234${phone.slice(1)}` : `+234${phone}`;
      onComplete({
        fullName: fullName.trim(),
        phone: formattedPhone,
        otpCode: otp,
      });
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    // This is a placeholder - actual implementation would use expo-auth-session
    Alert.alert(
      'Social Login',
      `${provider === 'google' ? 'Google' : 'Apple'} login coming soon! For now, please use phone registration.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      {/* Progress Indicator */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.progressContainer}>
        <View style={styles.progressDots}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.stepText}>Step 1 of 3</Text>
      </Animated.View>

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.headerSection}>
        <Text style={styles.title}>Create Your Account</Text>
        <Text style={styles.subtitle}>Find the best hands for your home in seconds</Text>
      </Animated.View>

      {/* Social Login Buttons */}
      <Animated.View entering={FadeInDown.delay(300)} style={styles.socialSection}>
        <Pressable 
          style={styles.socialButton}
          onPress={() => handleSocialLogin('google')}
        >
          <MaterialCommunityIcons name="google" size={24} color="#DB4437" />
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </Pressable>

        <Pressable 
          style={styles.socialButton}
          onPress={() => handleSocialLogin('apple')}
        >
          <MaterialCommunityIcons name="apple" size={24} color="#000000" />
          <Text style={styles.socialButtonText}>Continue with Apple</Text>
        </Pressable>
      </Animated.View>

      {/* Divider */}
      <Animated.View entering={FadeInDown.delay(400)} style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </Animated.View>

      {/* Full Name Input */}
      <Animated.View entering={FadeInDown.delay(500)} style={styles.inputContainer}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={[styles.input, errors.fullName && styles.inputError]}
          placeholder="Enter your full name"
          value={fullName}
          onChangeText={(text) => {
            setFullName(text);
            setErrors((prev) => ({ ...prev, fullName: '' }));
          }}
          autoCapitalize="words"
          editable={!otpVerified}
        />
        {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
      </Animated.View>

      {/* Phone Number Input */}
      <Animated.View entering={FadeInDown.delay(600)} style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.phoneInputContainer}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>🇳🇬 +234</Text>
          </View>
          <TextInput
            style={[styles.phoneInput, errors.phone && styles.inputError]}
            placeholder="8012345678"
            value={phone}
            onChangeText={(text) => {
              // Remove any non-digit characters
              const cleaned = text.replace(/\D/g, '');
              setPhone(cleaned);
              setErrors((prev) => ({ ...prev, phone: '' }));
              setOtpSent(false);
              setOtpVerified(false);
            }}
            keyboardType="phone-pad"
            maxLength={11}
            editable={!otpVerified}
          />
        </View>
        <Text style={styles.helperText}>We never share your number with anyone until you hire them</Text>
        {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
        
        {!otpSent && phone.length >= 10 && (
          <AnimatedButton
            variant="secondary"
            onPress={handleSendOTP}
            loading={loading}
            style={styles.sendOtpButton}
          >
            Send Verification Code
          </AnimatedButton>
        )}
      </Animated.View>

      {/* OTP Input */}
      {otpSent && !otpVerified && (
        <Animated.View entering={FadeInDown.delay(200)} style={styles.inputContainer}>
          <Text style={styles.label}>Verification Code</Text>
          <TextInput
            style={[styles.input, styles.otpInput, errors.otp && styles.inputError]}
            placeholder="Enter 4-digit code"
            value={otp}
            onChangeText={(text) => {
              const cleaned = text.replace(/\D/g, '');
              setOtp(cleaned);
              setErrors((prev) => ({ ...prev, otp: '' }));
            }}
            keyboardType="number-pad"
            maxLength={4}
          />
          {errors.otp ? <Text style={styles.errorText}>{errors.otp}</Text> : null}
          
          <AnimatedButton
            variant="primary"
            onPress={handleVerifyOTP}
            loading={loading}
            style={styles.verifyButton}
          >
            Verify Code
          </AnimatedButton>

          <Pressable onPress={handleSendOTP}>
            <Text style={styles.resendText}>Didn't receive code? <Text style={styles.resendLink}>Resend</Text></Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Verified Badge */}
      {otpVerified && (
        <Animated.View entering={FadeInUp} style={styles.verifiedBadge}>
          <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
          <Text style={styles.verifiedText}>Phone number verified!</Text>
        </Animated.View>
      )}

      {/* Continue Button */}
      {otpVerified && (
        <Animated.View entering={FadeInUp.delay(200)} style={styles.continueButtonContainer}>
          <AnimatedButton
            variant="primary"
            onPress={handleContinue}
            icon={<MaterialCommunityIcons name="arrow-right" size={24} color="#FFFFFF" />}
          >
            Continue
          </AnimatedButton>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  progressDots: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  progressDot: {
    width: 32,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  progressDotActive: {
    backgroundColor: '#1a237e',
  },
  stepText: {
    fontSize: 14,
    color: '#546E7A',
    textAlign: 'center',
  },
  headerSection: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a237e',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: '#78909C',
    lineHeight: 24,
  },
  socialSection: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    gap: spacing.sm,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#37474F',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    fontSize: 14,
    color: '#78909C',
    marginHorizontal: spacing.md,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#37474F',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    color: '#37474F',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#F44336',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  countryCode: {
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 12,
    padding: spacing.md,
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#37474F',
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    color: '#37474F',
    backgroundColor: '#FFFFFF',
  },
  helperText: {
    fontSize: 12,
    color: '#78909C',
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: spacing.xs,
  },
  sendOtpButton: {
    marginTop: spacing.md,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
  },
  verifyButton: {
    marginTop: spacing.md,
  },
  resendText: {
    fontSize: 14,
    color: '#78909C',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  resendLink: {
    color: '#1a237e',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  verifiedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  continueButtonContainer: {
    marginTop: spacing.lg,
  },
});
