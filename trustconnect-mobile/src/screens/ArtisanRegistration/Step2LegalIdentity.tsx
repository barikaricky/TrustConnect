import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import AnimatedButton from '../../components/AnimatedButton';
import { colors, spacing } from '../../config/theme';
import { RegistrationData } from './ArtisanRegistrationCoordinator';

interface Props {
  onComplete: (data: Partial<RegistrationData>) => void;
  onBack: () => void;
  initialData?: Partial<RegistrationData>;
}

export default function Step2LegalIdentity({ onComplete, onBack, initialData }: Props) {
  const [idType, setIdType] = useState<'NIN' | 'BVN'>(initialData?.idType || 'NIN');
  const [idNumber, setIdNumber] = useState(initialData?.idNumber || '');
  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [selfieUrl, setSelfieUrl] = useState(initialData?.selfieUrl || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [idVerified, setIdVerified] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  
  const [errors, setErrors] = useState({
    idNumber: '',
    selfie: '',
    fullName: '',
  });

  const verifyID = async () => {
    if (idNumber.length !== 11) {
      setErrors({ ...errors, idNumber: `${idType} must be 11 digits` });
      return;
    }

    setIsVerifying(true);
    
    try {
      const ArtisanRegistrationService = (await import('../../services/artisanRegistrationService')).default;
      const result = await ArtisanRegistrationService.verifyID(idType, idNumber);
      
      if (result.success) {
        if (result.manualEntry) {
          // API unavailable → let user type their name
          setManualEntry(true);
          setIdVerified(false);
          Alert.alert(
            'Manual Verification',
            result.message || `Please enter your full legal name as it appears on your ${idType}.`,
          );
        } else {
          // Real name returned from API
          setFullName(result.legalName);
          setManualEntry(false);
          setIdVerified(true);
          Alert.alert('Verified', `Your ${idType} has been verified successfully.\n\nName: ${result.legalName}`);
        }
      }
    } catch (error: any) {
      // Network error → offer manual entry
      setManualEntry(true);
      Alert.alert(
        'Auto-Verification Unavailable',
        'We could not reach the verification service. Please enter your full legal name manually.',
      );
    } finally {
      setIsVerifying(false);
    }
  };

  /* Manual name confirmation → mark as verified */
  const confirmManualName = () => {
    const trimmed = fullName.trim();
    if (trimmed.length < 3) {
      setErrors({ ...errors, fullName: 'Please enter your full legal name (at least 3 characters)' });
      return;
    }
    if (trimmed.split(/\s+/).length < 2) {
      setErrors({ ...errors, fullName: 'Please enter first and last name' });
      return;
    }
    setFullName(trimmed.toUpperCase());
    setIdVerified(true);
    setErrors({ ...errors, fullName: '' });
    Alert.alert('Name Confirmed', `Your name has been set to: ${trimmed.toUpperCase()}`);
  };

  const takeSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to verify your identity');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      
      try {
        const ArtisanRegistrationService = (await import('../../services/artisanRegistrationService')).default;
        const uploadResult = await ArtisanRegistrationService.uploadSelfie(imageUri, idNumber);
        
        if (uploadResult.success) {
          setSelfieUrl(uploadResult.url);
          Alert.alert('Success', 'Selfie captured successfully');
        }
      } catch (error: any) {
        Alert.alert('Upload Failed', error.message || 'Failed to upload selfie. Please try again.');
      }
    }
  };

  const handleContinue = () => {
    let valid = true;
    const newErrors = { idNumber: '', selfie: '', fullName: '' };

    if (!idVerified) {
      newErrors.idNumber = 'Please verify your ID';
      valid = false;
    }

    if (!fullName || fullName.trim().length < 3) {
      newErrors.fullName = 'Please confirm your full legal name';
      valid = false;
    }

    if (!selfieUrl) {
      newErrors.selfie = 'Please take a selfie to verify your identity';
      valid = false;
    }

    setErrors(newErrors);

    if (valid) {
      onComplete({
        idType,
        idNumber,
        fullName,
        selfieUrl,
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
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.stepText}>Step 2 of 4</Text>
        <Text style={styles.title}>Legal Identity</Text>
        <Text style={styles.subtitle}>Government Verification for Trust & Safety</Text>
      </Animated.View>

      {/* ID Type Selection */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.inputContainer}>
        <Text style={styles.label}>Choose ID Type *</Text>
        <View style={styles.idTypeContainer}>
          <TouchableOpacity
            style={[styles.idTypeButton, idType === 'NIN' && styles.idTypeButtonActive]}
            onPress={() => setIdType('NIN')}
            disabled={idVerified}
          >
            <Text style={[styles.idTypeText, idType === 'NIN' && styles.idTypeTextActive]}>
              NIN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.idTypeButton, idType === 'BVN' && styles.idTypeButtonActive]}
            onPress={() => setIdType('BVN')}
            disabled={idVerified}
          >
            <Text style={[styles.idTypeText, idType === 'BVN' && styles.idTypeTextActive]}>
              BVN
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ID Number */}
      <Animated.View entering={FadeInDown.delay(300)} style={styles.inputContainer}>
        <Text style={styles.label}>{idType} Number *</Text>
        <View style={styles.idInputWrapper}>
          <TextInput
            style={styles.idInput}
            value={idNumber}
            onChangeText={setIdNumber}
            placeholder="Enter 11 digits"
            keyboardType="number-pad"
            maxLength={11}
            editable={!idVerified}
          />
          {idVerified && (
            <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
          )}
        </View>
        <Text style={styles.helperText}>
          Your {idType} is only used to verify your name and is 100% secure
        </Text>
        {errors.idNumber ? <Text style={styles.errorText}>{errors.idNumber}</Text> : null}
        
        {!idVerified && !manualEntry && (
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={verifyID}
            disabled={isVerifying}
          >
            <Text style={styles.verifyButtonText}>
              {isVerifying ? 'Verifying...' : 'Verify ID'}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Manual Name Entry (when API is unavailable) */}
      {manualEntry && !idVerified && (
        <Animated.View entering={FadeInDown.delay(350)} style={styles.inputContainer}>
          <Text style={styles.label}>Full Legal Name *</Text>
          <View style={[styles.idInputWrapper, { borderColor: '#FF9800' }]}>
            <MaterialCommunityIcons name="account-edit" size={22} color="#FF9800" />
            <TextInput
              style={[styles.idInput, { marginLeft: 8 }]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter name as on your ID"
              autoCapitalize="characters"
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
            <MaterialCommunityIcons name="information-outline" size={14} color="#FF9800" />
            <Text style={[styles.helperText, { color: '#FF9800' }]}>
              Enter your FULL name exactly as it appears on your {idType}
            </Text>
          </View>
          {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
          <TouchableOpacity
            style={[styles.verifyButton, { backgroundColor: '#FF9800' }]}
            onPress={confirmManualName}
          >
            <Text style={styles.verifyButtonText}>Confirm Name</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Legal Name (Auto-filled or manually confirmed) */}
      {idVerified && (
        <>
          <Animated.View entering={FadeInDown.delay(400)} style={styles.inputContainer}>
            <Text style={styles.label}>
              Full Name ({manualEntry ? 'Manual Entry' : 'Verified'}) *
            </Text>
            <View style={styles.verifiedNameContainer}>
              <MaterialCommunityIcons
                name={manualEntry ? 'account-check' : 'check-decagram'}
                size={24}
                color={manualEntry ? '#FF9800' : '#4CAF50'}
              />
              <Text style={[styles.verifiedName, manualEntry && { color: '#E65100' }]}>
                {fullName}
              </Text>
            </View>
            <Text style={styles.helperText}>
              {manualEntry
                ? 'Name entered manually — must match your bank account name'
                : `This name matches your ${idType} records`}
            </Text>
          </Animated.View>

          {/* Live Selfie */}
          <Animated.View entering={FadeInDown.delay(500)} style={styles.inputContainer}>
            <Text style={styles.label}>Live Selfie Verification *</Text>
            {!selfieUrl ? (
              <TouchableOpacity style={styles.selfieButton} onPress={takeSelfie}>
                <MaterialCommunityIcons name="camera-iris" size={48} color="#1a237e" />
                <Text style={styles.selfieButtonText}>Verify My Face</Text>
                <Text style={styles.selfieHint}>Tap to open camera</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.selfiePreview}>
                <MaterialCommunityIcons name="check-circle" size={48} color="#4CAF50" />
                <Text style={styles.selfieSuccess}>Selfie Captured ✓</Text>
                <TouchableOpacity onPress={takeSelfie}>
                  <Text style={styles.retakeText}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            )}
            {errors.selfie ? <Text style={styles.errorText}>{errors.selfie}</Text> : null}
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View entering={FadeInDown.delay(600)} style={styles.actionButtons}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#546E7A" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            
            <View style={styles.continueButtonWrapper}>
              <AnimatedButton onPress={handleContinue} title="Verify & Continue" />
            </View>
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
    color: '#546E7A',
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
  idTypeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  idTypeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  idTypeButtonActive: {
    borderColor: '#1a237e',
    backgroundColor: '#E8EAF6',
  },
  idTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#546E7A',
  },
  idTypeTextActive: {
    color: '#1a237e',
  },
  idInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    height: 50,
  },
  idInput: {
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
  verifiedNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
  },
  verifiedName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  selfieButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1a237e',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  selfieButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a237e',
    marginTop: spacing.md,
  },
  selfieHint: {
    fontSize: 14,
    color: '#546E7A',
    marginTop: spacing.xs,
  },
  selfiePreview: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  selfieSuccess: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    marginTop: spacing.md,
  },
  retakeText: {
    fontSize: 14,
    color: '#1a237e',
    marginTop: spacing.md,
    textDecorationLine: 'underline',
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
