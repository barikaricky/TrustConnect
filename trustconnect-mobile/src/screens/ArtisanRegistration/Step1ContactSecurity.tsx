import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AnimatedButton from '../../components/AnimatedButton';
import { colors, spacing, typography } from '../../config/theme';
import { RegistrationData } from './ArtisanRegistrationCoordinator';

interface Props {
  onComplete: (data: Partial<RegistrationData>) => void;
  initialData?: Partial<RegistrationData>;
}

export default function Step1ContactSecurity({ onComplete, initialData }: Props) {
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [otp, setOtp] = useState('');
  const [showOtpField, setShowOtpField] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const [errors, setErrors] = useState({
    phone: '',
    otp: '',
    password: '',
    terms: '',
  });

  const sendOTP = async () => {
    if (phone.length < 10) {
      setErrors({ ...errors, phone: 'Please enter a valid phone number' });
      return;
    }
    
    try {
      const ArtisanRegistrationService = (await import('../../services/artisanRegistrationService')).default;
      const result = await ArtisanRegistrationService.sendOTP(`+234${phone}`);
      
      if (result.success) {
        setShowOtpField(true);
        Alert.alert('OTP Sent', result.message || 'Check your phone for the verification code');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP. Please try again.');
    }
  };

  const verifyOTP = async () => {
    if (otp.length < 4) {
      setErrors({ ...errors, otp: 'Please enter the 4-digit code' });
      return;
    }
    
    try {
      const ArtisanRegistrationService = (await import('../../services/artisanRegistrationService')).default;
      const result = await ArtisanRegistrationService.verifyOTP(`+234${phone}`, otp);
      
      if (result.success) {
        setOtpVerified(true);
        Alert.alert('Success', 'Phone number verified!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid OTP. Please try again.');
      setErrors({ ...errors, otp: 'Invalid verification code' });
    }
  };

  const handleContinue = () => {
    let valid = true;
    const newErrors = { phone: '', otp: '', password: '', terms: '' };

    if (!otpVerified) {
      newErrors.phone = 'Please verify your phone number';
      valid = false;
    }

    if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }

    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the terms';
      valid = false;
    }

    setErrors(newErrors);

    if (valid) {
      onComplete({
        phone: `+234${phone}`,
        email: email || undefined,
        password,
        agreedToTerms,
      });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 80 }}
        >
      {/* Progress Header */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.stepText}>Step 1 of 4</Text>
        <Text style={styles.title}>Create your Professional Profile</Text>
        <Text style={styles.subtitle}>Takes only 3 minutes to get started</Text>
      </Animated.View>

      {/* Phone Number */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number *</Text>
        <View style={styles.phoneInputWrapper}>
          <View style={styles.flagContainer}>
            <Text style={styles.flag}>🇳🇬</Text>
            <Text style={styles.countryCode}>+234</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={setPhone}
            placeholder="8012345678"
            keyboardType="phone-pad"
            maxLength={10}
            editable={!otpVerified}
          />
          {otpVerified && (
            <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
          )}
        </View>
        {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
        
        {!showOtpField && !otpVerified && (
          <TouchableOpacity style={styles.sendOtpButton} onPress={sendOTP}>
            <Text style={styles.sendOtpText}>Send Verification Code</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* OTP Field */}
      {showOtpField && !otpVerified && (
        <Animated.View entering={FadeInDown.delay(300)} style={styles.inputContainer}>
          <Text style={styles.label}>Enter 4-Digit Code *</Text>
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
            placeholder="1234"
            keyboardType="number-pad"
            maxLength={4}
          />
          {errors.otp ? <Text style={styles.errorText}>{errors.otp}</Text> : null}
          <TouchableOpacity style={styles.verifyButton} onPress={verifyOTP}>
            <Text style={styles.verifyButtonText}>Verify Code</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Email (Optional) */}
      {otpVerified && (
        <>
          <Animated.View entering={FadeInDown.delay(400)} style={styles.inputContainer}>
            <Text style={styles.label}>Email Address (Optional)</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>For receipts and monthly earnings reports</Text>
          </Animated.View>

          {/* Password */}
          <Animated.View entering={FadeInDown.delay(500)} style={styles.inputContainer}>
            <Text style={styles.label}>Create Password *</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Minimum 6 characters"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color="#546E7A"
                />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </Animated.View>

          {/* Terms Checkbox */}
          <Animated.View entering={FadeInDown.delay(600)} style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
            >
              <MaterialCommunityIcons
                name={agreedToTerms ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={24}
                color={agreedToTerms ? colors.primary.main : '#546E7A'}
              />
            </TouchableOpacity>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink}>TrustConnect Quality Guarantee</Text>
            </Text>
          </Animated.View>
          {errors.terms ? <Text style={styles.errorText}>{errors.terms}</Text> : null}

          {/* Continue Button */}
          <Animated.View entering={FadeInDown.delay(700)} style={styles.buttonContainer}>
            <AnimatedButton onPress={handleContinue} title="Continue" />
          </Animated.View>
        </>
      )}
    </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: spacing.xl,
  },
  header: {
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  progressDot: {
    width: 40,
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
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a237e',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
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
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    height: 50,
  },
  flagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: '#CFD8DC',
    paddingRight: spacing.sm,
  },
  flag: {
    fontSize: 24,
    marginRight: 4,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#37474F',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#37474F',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    height: 50,
    fontSize: 16,
    color: '#37474F',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    height: 50,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#37474F',
  },
  helperText: {
    fontSize: 12,
    color: '#78909C',
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: spacing.xs,
  },
  sendOtpButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendOtpText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a237e',
    textAlign: 'center',
  },
  verifyButton: {
    marginTop: spacing.md,
    backgroundColor: '#4CAF50',
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  checkbox: {
    marginRight: spacing.sm,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 20,
  },
  termsLink: {
    color: '#1a237e',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    marginBottom: spacing.xxl,
  },
});
