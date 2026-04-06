import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, ActivityIndicator, Alert, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { spacing } from '../../config/theme';
import AnimatedButton from '../../components/AnimatedButton';
import { CustomerRegistrationData } from '../../services/customerRegistrationService';

interface Step2Props {
  onComplete: (data: Partial<CustomerRegistrationData>) => void;
  onBack: () => void;
  initialData?: Partial<CustomerRegistrationData>;
  loading?: boolean;
}

export default function Step2LocationSecurity({ onComplete, onBack, initialData, loading: externalLoading }: Step2Props) {
  const [location, setLocation] = useState(initialData?.location);
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState(initialData?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [errors, setErrors] = useState({ location: '', email: '', password: '' });

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    setErrors((prev) => ({ ...prev, location: '' }));

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location access to use this feature');
        setLoadingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      const addressString = [
        address.street,
        address.district,
        address.city,
        address.region,
      ]
        .filter(Boolean)
        .join(', ');

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        address: addressString,
      });

      Alert.alert('Success', 'Location detected successfully!');
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get your location. Please try manual entry.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleManualLocation = () => {
    if (manualAddress.trim().length < 5) {
      setErrors((prev) => ({ ...prev, location: 'Please enter a valid address' }));
      return;
    }

    setLocation({
      latitude: 0,
      longitude: 0,
      address: manualAddress.trim(),
    });
    setShowManualInput(false);
    Alert.alert('Success', 'Location set successfully!');
  };

  const handleContinue = () => {
    let valid = true;
    const newErrors = { location: '', email: '', password: '' };

    if (!location) {
      newErrors.location = 'Please set your location';
      valid = false;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      valid = false;
    }

    if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }

    setErrors(newErrors);

    if (valid) {
      onComplete({
        location,
        email: email || undefined,
        password,
      });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      {/* Progress Indicator */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.progressContainer}>
        <View style={styles.progressDots}>
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.stepText}>Step 2 of 3</Text>
      </Animated.View>

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.headerSection}>
        <Text style={styles.title}>Location & Safety</Text>
        <Text style={styles.subtitle}>We need to know where you are to show you the right artisans</Text>
      </Animated.View>

      {/* Location Section */}
      <Animated.View entering={FadeInDown.delay(300)} style={styles.inputContainer}>
        <Text style={styles.label}>Set Your Location</Text>
        
        {!location && !showManualInput && (
          <>
            <AnimatedButton
              variant="primary"
              onPress={getCurrentLocation}
              loading={loadingLocation}
              icon={<MaterialCommunityIcons name="crosshairs-gps" size={24} color="#FFFFFF" />}
              style={styles.locationButton}
            >
              Use Current Location
            </AnimatedButton>

            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            <Pressable 
              style={styles.manualLocationButton}
              onPress={() => setShowManualInput(true)}
            >
              <MaterialCommunityIcons name="map-marker-plus" size={24} color="#1a237e" />
              <Text style={styles.manualLocationButtonText}>Enter Location Manually</Text>
            </Pressable>
          </>
        )}

        {showManualInput && !location && (
          <Animated.View entering={FadeInDown}>
            <TextInput
              style={[styles.input, errors.location && styles.inputError]}
              placeholder="E.g., Surulere, Lagos"
              value={manualAddress}
              onChangeText={(text) => {
                setManualAddress(text);
                setErrors((prev) => ({ ...prev, location: '' }));
              }}
              multiline
              numberOfLines={3}
            />
            <View style={styles.manualLocationActions}>
              <Pressable 
                style={styles.cancelButton}
                onPress={() => {
                  setShowManualInput(false);
                  setManualAddress('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={styles.setLocationButton}
                onPress={handleManualLocation}
              >
                <MaterialCommunityIcons name="check" size={24} color="#FFFFFF" />
                <Text style={styles.setLocationButtonText}>Set Location</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {location && (
          <Animated.View entering={FadeInUp} style={styles.locationDisplay}>
            <MaterialCommunityIcons name="map-marker-check" size={32} color="#2E7D32" />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationAddress}>{location.address}</Text>
              <Pressable onPress={() => setLocation(undefined)}>
                <Text style={styles.changeLocationText}>Change Location</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
        
        {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}
      </Animated.View>

      {/* Email Input (Optional) */}
      <Animated.View entering={FadeInDown.delay(400)} style={styles.inputContainer}>
        <Text style={styles.label}>Email Address <Text style={styles.optionalText}>(Optional)</Text></Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="your.email@example.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrors((prev) => ({ ...prev, email: '' }));
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.helperText}>For receipts and security alerts</Text>
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
      </Animated.View>

      {/* Password Input */}
      <Animated.View entering={FadeInDown.delay(500)} style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.passwordInput, errors.password && styles.inputError]}
            placeholder="Create a secure password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors((prev) => ({ ...prev, password: '' }));
            }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <Pressable 
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <MaterialCommunityIcons 
              name={showPassword ? 'eye-off' : 'eye'} 
              size={24} 
              color="#78909C" 
            />
          </Pressable>
        </View>
        <Text style={styles.helperText}>At least 6 characters</Text>
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View entering={FadeInUp.delay(600)} style={styles.actionButtons}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#546E7A" />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <View style={styles.continueButtonWrapper}>
          <AnimatedButton
            variant="primary"
            onPress={handleContinue}
            loading={externalLoading}
            icon={<MaterialCommunityIcons name="arrow-right" size={24} color="#FFFFFF" />}
          >
            Continue
          </AnimatedButton>
        </View>
      </Animated.View>
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
  progressDotComplete: {
    backgroundColor: '#4CAF50',
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
  inputContainer: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#37474F',
    marginBottom: spacing.sm,
  },
  optionalText: {
    color: '#78909C',
    fontWeight: '400',
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
  locationButton: {
    marginBottom: spacing.md,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  orText: {
    fontSize: 14,
    color: '#78909C',
    marginHorizontal: spacing.md,
    fontWeight: '600',
  },
  manualLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#1a237e',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    gap: spacing.sm,
  },
  manualLocationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a237e',
  },
  manualLocationActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#546E7A',
  },
  setLocationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    gap: spacing.xs,
  },
  setLocationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.md,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  changeLocationText: {
    fontSize: 14,
    color: '#1a237e',
    textDecorationLine: 'underline',
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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 12,
    padding: spacing.md,
    paddingRight: 56,
    fontSize: 16,
    color: '#37474F',
    backgroundColor: '#FFFFFF',
  },
  eyeIcon: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 12,
    gap: spacing.xs,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#546E7A',
  },
  continueButtonWrapper: {
    flex: 1,
  },
});
