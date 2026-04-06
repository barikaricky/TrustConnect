import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Platform, KeyboardAvoidingView, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import AnimatedButton from '../../components/AnimatedButton';
import { colors, spacing } from '../../config/theme';
import { RegistrationData } from './ArtisanRegistrationCoordinator';

interface Props {
  onComplete: (data: Partial<RegistrationData>) => void;
  onBack: () => void;
  initialData?: Partial<RegistrationData>;
}

const TRADES = [
  'Plumber',
  'Electrician',
  'AC Technician',
  'Welder',
  'Carpenter',
  'Mason',
  'Painter',
  'Mechanic',
  'Tailor',
  'Barber',
  'Generator Repairer',
  'Phone Repairer',
  'Other',
];

const EXPERIENCE_LEVELS = [
  'Less than 1 year',
  '1-3 years',
  '3-5 years',
  '5-10 years',
  '10+ years',
];

export default function Step3BusinessDetails({ onComplete, onBack, initialData }: Props) {
  const [primaryTrade, setPrimaryTrade] = useState(initialData?.primaryTrade || '');
  const [yearsExperience, setYearsExperience] = useState(initialData?.yearsExperience || '');
  const [workLocation, setWorkLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(initialData?.workLocation || null);
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>(initialData?.portfolioPhotos || []);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  const [errors, setErrors] = useState({
    trade: '',
    experience: '',
    location: '',
    portfolio: '',
  });

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow location access to set your work area');
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const [addressResult] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const address = `${addressResult.city || addressResult.district}, ${addressResult.region || addressResult.subregion}`;
      
      setWorkLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address,
      });
      
      setShowManualInput(false);
      Alert.alert('Location Set', address);
    } catch (error) {
      Alert.alert('Error', 'Unable to get your location. Please try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleManualLocation = () => {
    if (!manualAddress.trim()) {
      setErrors({ ...errors, location: 'Please enter your work location' });
      return;
    }

    setWorkLocation({
      latitude: 0, // Default coordinates for manual entry
      longitude: 0,
      address: manualAddress.trim(),
    });
    
    setShowManualInput(false);
    Alert.alert('Location Set', manualAddress.trim());
  };

  const pickPortfolioPhoto = async () => {
    if (portfolioPhotos.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload up to 5 photos');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - portfolioPhotos.length,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map(asset => asset.uri);
      setPortfolioPhotos([...portfolioPhotos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = portfolioPhotos.filter((_, i) => i !== index);
    setPortfolioPhotos(updatedPhotos);
  };

  const handleContinue = async () => {
    let valid = true;
    const newErrors = { trade: '', experience: '', location: '', portfolio: '' };

    if (!primaryTrade) {
      newErrors.trade = 'Please select your trade';
      valid = false;
    }

    if (!yearsExperience) {
      newErrors.experience = 'Please select your experience level';
      valid = false;
    }

    if (!workLocation) {
      newErrors.location = 'Please set your work location';
      valid = false;
    }

    if (portfolioPhotos.length === 0) {
      newErrors.portfolio = 'Please add at least one photo of your work';
      valid = false;
    }

    setErrors(newErrors);

    if (valid) {
      try {
        // Upload portfolio photos to backend
        Alert.alert('Uploading', 'Uploading your portfolio photos...');
        
        const ArtisanRegistrationService = (await import('../../services/artisanRegistrationService')).default;
        const uploadResult = await ArtisanRegistrationService.uploadPortfolioPhotos(portfolioPhotos);
        
        if (uploadResult.success) {
          onComplete({
            primaryTrade,
            yearsExperience,
            workLocation: workLocation!,
            portfolioPhotos: uploadResult.urls, // Use uploaded URLs
          });
        }
      } catch (error: any) {
        Alert.alert('Upload Failed', error.message || 'Failed to upload portfolio photos. Please try again.');
      }
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
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.stepText}>Step 3 of 4</Text>
        <Text style={styles.title}>Business Details</Text>
        <Text style={styles.subtitle}>Tell us about your skills</Text>
      </Animated.View>

      {/* Trade Selection */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.inputContainer}>
        <Text style={styles.label}>Select Your Trade *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={primaryTrade}
            onValueChange={(value) => setPrimaryTrade(value)}
            style={styles.picker}
          >
            <Picker.Item label="Choose your trade..." value="" />
            {TRADES.map((item) => (
              <Picker.Item key={item} label={item} value={item} />
            ))}
          </Picker>
        </View>
        {errors.trade ? <Text style={styles.errorText}>{errors.trade}</Text> : null}
      </Animated.View>

      {/* Experience Level */}
      <Animated.View entering={FadeInDown.delay(300)} style={styles.inputContainer}>
        <Text style={styles.label}>Years of Experience *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={yearsExperience}
            onValueChange={(value) => setYearsExperience(value)}
            style={styles.picker}
          >
            <Picker.Item label="Select experience level..." value="" />
            {EXPERIENCE_LEVELS.map((item) => (
              <Picker.Item key={item} label={item} value={item} />
            ))}
          </Picker>
        </View>
        {errors.experience ? <Text style={styles.errorText}>{errors.experience}</Text> : null}
      </Animated.View>

      {/* Work Location */}
      <Animated.View entering={FadeInDown.delay(400)} style={styles.inputContainer}>
        <Text style={styles.label}>Work Location *</Text>
        
        {!workLocation ? (
          <>
            {!showManualInput ? (
              <>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={getCurrentLocation}
                  disabled={isLoadingLocation}
                >
                  <MaterialCommunityIcons name="map-marker-radius" size={24} color="#1a237e" />
                  <Text style={styles.locationButtonText}>
                    {isLoadingLocation ? 'Getting Location...' : 'Use Current Location'}
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.orDivider}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>OR</Text>
                  <View style={styles.orLine} />
                </View>
                
                <TouchableOpacity
                  style={styles.manualLocationButton}
                  onPress={() => setShowManualInput(true)}
                >
                  <MaterialCommunityIcons name="pencil" size={24} color="#1a237e" />
                  <Text style={styles.manualLocationButtonText}>Enter Location Manually</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.manualInput}
                  value={manualAddress}
                  onChangeText={setManualAddress}
                  placeholder="e.g., Ikeja, Lagos State"
                  placeholderTextColor="#90A4AE"
                  multiline
                  numberOfLines={2}
                />
                <Text style={styles.helperText}>
                  Enter your city/area and state where you operate
                </Text>
                
                <View style={styles.manualLocationActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowManualInput(false);
                      setManualAddress('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.setLocationButton}
                    onPress={handleManualLocation}
                  >
                    <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                    <Text style={styles.setLocationButtonText}>Set Location</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        ) : (
          <View style={styles.locationDisplay}>
            <MaterialCommunityIcons name="map-marker-check" size={24} color="#4CAF50" />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationAddress}>{workLocation.address}</Text>
              <View style={styles.locationActions}>
                <TouchableOpacity onPress={getCurrentLocation}>
                  <Text style={styles.changeLocationText}>Use GPS</Text>
                </TouchableOpacity>
                <Text style={styles.locationActionsSeparator}>•</Text>
                <TouchableOpacity onPress={() => {
                  setManualAddress(workLocation.address);
                  setWorkLocation(null);
                  setShowManualInput(true);
                }}>
                  <Text style={styles.changeLocationText}>Edit Manually</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}
      </Animated.View>

      {/* Portfolio Upload */}
      <Animated.View entering={FadeInDown.delay(500)} style={styles.inputContainer}>
        <Text style={styles.label}>Portfolio Photos *</Text>
        <Text style={styles.helperText}>Add 3-5 photos of your work (Required)</Text>
        
        <View style={styles.portfolioGrid}>
          {portfolioPhotos.map((photo, index) => (
            <View key={index} style={styles.photoContainer}>
              <Image source={{ uri: photo }} style={styles.photoImage} />
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => removePhoto(index)}
              >
                <MaterialCommunityIcons name="close-circle" size={24} color="#F44336" />
              </TouchableOpacity>
            </View>
          ))}
          
          {portfolioPhotos.length < 5 && (
            <TouchableOpacity style={styles.addPhotoButton} onPress={pickPortfolioPhoto}>
              <MaterialCommunityIcons name="plus" size={32} color="#1a237e" />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
        {errors.portfolio ? <Text style={styles.errorText}>{errors.portfolio}</Text> : null}
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View entering={FadeInDown.delay(600)} style={styles.actionButtons}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#546E7A" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <View style={styles.continueButtonWrapper}>
          <AnimatedButton onPress={handleContinue} title="Next" />
        </View>
      </Animated.View>
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
  progressDotComplete: {
    backgroundColor: '#4CAF50',
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
    color: '#78909C',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#37474F',
    marginBottom: spacing.sm,
  },
  locationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  locationActionsSeparator: {
    fontSize: 14,
    color: '#78909C',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#CFD8DC',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1a237e',
    borderRadius: 8,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  manualLocationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a237e',
  },
  manualInput: {
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: '#37474F',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  manualLocationActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
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
    paddingVertical: spacing.md,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    gap: spacing.xs,
  },
  setLocationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  portfolioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#37474F',
    marginBottom: spacing.sm,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
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
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1a237e',
    borderRadius: 8,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a237e',
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
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
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  photoContainer: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1a237e',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#1a237e',
    fontWeight: '600',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
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
