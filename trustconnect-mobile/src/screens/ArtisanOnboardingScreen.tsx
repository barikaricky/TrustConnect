import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TextInput, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, typography } from '../config/theme';
import { useAuth } from '../services/AuthContext';
import { ArtisanService } from '../services/artisanService';
import DocumentUpload from '../components/DocumentUpload';
import AnimatedButton from '../components/AnimatedButton';
import RoleSelector from '../components/RoleSelector';

/**
 * ArtisanOnboardingScreen - Sprint 4
 * 
 * Professional onboarding form for artisans
 * Collects:
 * - Skill category & primary skill
 * - Profile photo
 * - Government ID (NIN/BVN)
 * - Terms acknowledgment
 */

const SKILL_CATEGORIES = [
  'Construction',
  'Electrical',
  'Plumbing',
  'Carpentry',
  'Painting',
  'Cleaning',
  'Landscaping',
  'Other'
];

const SKILLS_BY_CATEGORY: Record<string, string[]> = {
  'Construction': ['Mason', 'Welder', 'Tiler', 'Builder'],
  'Electrical': ['Electrician', 'Wireman', 'Solar Installer'],
  'Plumbing': ['Plumber', 'Pipe Fitter', 'Drain Specialist'],
  'Carpentry': ['Carpenter', 'Furniture Maker', 'Cabinet Maker'],
  'Painting': ['Painter', 'Decorator', 'Spray Painter'],
  'Cleaning': ['Cleaner', 'Janitor', 'Deep Cleaner'],
  'Landscaping': ['Gardener', 'Landscaper', 'Tree Surgeon'],
  'Other': ['Handyman', 'General Worker']
};

export default function ArtisanOnboardingScreen() {
  const [skillCategory, setSkillCategory] = useState('');
  const [primarySkill, setPrimarySkill] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [governmentId, setGovernmentId] = useState('');
  const [idType, setIdType] = useState<'NIN' | 'BVN'>('NIN');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { user } = useAuth();
  
  const availableSkills = skillCategory ? SKILLS_BY_CATEGORY[skillCategory] || [] : [];
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!skillCategory) newErrors.skillCategory = 'Please select a skill category';
    if (!primarySkill) newErrors.primarySkill = 'Please select your primary skill';
    if (!profilePhoto) newErrors.profilePhoto = 'Profile photo is required';
    if (!governmentId) newErrors.governmentId = 'Government ID is required';
    if (!termsAccepted) {
      Alert.alert('Terms Required', 'You must accept the terms to continue');
      return false;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleProfilePhotoUpload = async (uri: string) => {
    try {
      setUploading(true);
      const result = await ArtisanService.uploadFile(uri);
      setProfilePhoto(result.fileUrl);
    } catch (error) {
      Alert.alert('Upload Failed', 'Failed to upload profile photo');
    } finally {
      setUploading(false);
    }
  };
  
  const handleIdUpload = async (uri: string) => {
    try {
      setUploading(true);
      const result = await ArtisanService.uploadFile(uri);
      setGovernmentId(result.fileUrl);
    } catch (error) {
      Alert.alert('Upload Failed', 'Failed to upload ID document');
    } finally {
      setUploading(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      await ArtisanService.submitOnboarding({
        skillCategory,
        primarySkill,
        profilePhotoUrl: profilePhoto,
        governmentIdUrl: governmentId,
        idType,
      });
      
      Alert.alert(
        'Submission Successful',
        'Your application has been submitted for verification. You will be notified once approved.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      Alert.alert('Submission Failed', 'Failed to submit onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={styles.title}>Artisan Verification</Text>
          <Text style={styles.subtitle}>
            Complete your profile to start receiving jobs
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🔒 OFFICIAL VERIFICATION</Text>
          </View>
        </Animated.View>
        
        {/* Skill Selection */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Your Skills</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Skill Category *</Text>
            <View style={styles.categoryGrid}>
              {SKILL_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    skillCategory === category && styles.categoryChipActive
                  ]}
                  onPress={() => {
                    setSkillCategory(category);
                    setPrimarySkill('');
                  }}
                >
                  <Text style={[
                    styles.categoryChipText,
                    skillCategory === category && styles.categoryChipTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.skillCategory && <Text style={styles.error}>{errors.skillCategory}</Text>}
          </View>
          
          {skillCategory && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Primary Skill *</Text>
              <View style={styles.skillGrid}>
                {availableSkills.map((skill) => (
                  <TouchableOpacity
                    key={skill}
                    style={[
                      styles.skillChip,
                      primarySkill === skill && styles.skillChipActive
                    ]}
                    onPress={() => setPrimarySkill(skill)}
                  >
                    <Text style={[
                      styles.skillChipText,
                      primarySkill === skill && styles.skillChipTextActive
                    ]}>
                      {skill}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.primarySkill && <Text style={styles.error}>{errors.primarySkill}</Text>}
            </View>
          )}
        </Animated.View>
        
        {/* Documents */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Identity Verification</Text>
          
          <DocumentUpload
            label="Profile Photo *"
            description="Upload a clear photo of your face. This will be shown to customers."
            type="photo"
            value={profilePhoto}
            onUpload={handleProfilePhotoUpload}
            error={errors.profilePhoto}
          />
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>ID Type *</Text>
            <View style={styles.idTypeContainer}>
              <TouchableOpacity
                style={[styles.idTypeOption, idType === 'NIN' && styles.idTypeOptionActive]}
                onPress={() => setIdType('NIN')}
              >
                <Text style={[styles.idTypeText, idType === 'NIN' && styles.idTypeTextActive]}>
                  NIN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.idTypeOption, idType === 'BVN' && styles.idTypeOptionActive]}
                onPress={() => setIdType('BVN')}
              >
                <Text style={[styles.idTypeText, idType === 'BVN' && styles.idTypeTextActive]}>
                  BVN
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <DocumentUpload
            label="Government ID *"
            description={`Upload your ${idType} document. Must be clear and readable.`}
            type="document"
            value={governmentId}
            onUpload={handleIdUpload}
            error={errors.governmentId}
          />
        </Animated.View>
        
        {/* Terms */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
          <TouchableOpacity
            style={styles.termsContainer}
            onPress={() => setTermsAccepted(!termsAccepted)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxActive]}>
              {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I confirm that all information provided is accurate and I agree to TrustConnect's verification process and community guidelines.
            </Text>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Submit Button */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.buttonContainer}>
          <AnimatedButton
            onPress={handleSubmit}
            title={uploading ? "Uploading..." : "Submit for Verification"}
            loading={loading || uploading}
            disabled={uploading}
          />
        </Animated.View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ℹ️ Your application will be reviewed within 24-48 hours
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  
  scrollContent: {
    padding: spacing.lg,
  },
  
  header: {
    marginBottom: spacing.xl,
  },
  
  title: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  
  badge: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary.main,
  },
  
  section: {
    marginBottom: spacing.xl,
  },
  
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  
  inputContainer: {
    marginBottom: spacing.md,
  },
  
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  
  categoryChipActive: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.main,
  },
  
  categoryChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  
  categoryChipTextActive: {
    color: colors.primary.main,
    fontWeight: typography.fontWeight.bold,
  },
  
  skillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  
  skillChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.background.secondary,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral.lightGray,
  },
  
  skillChipActive: {
    backgroundColor: colors.success + '20',
    borderColor: colors.success,
  },
  
  skillChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  
  skillChipTextActive: {
    color: colors.success,
    fontWeight: typography.fontWeight.bold,
  },
  
  idTypeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  
  idTypeOption: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  
  idTypeOptionActive: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.main,
  },
  
  idTypeText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  
  idTypeTextActive: {
    color: colors.primary.main,
  },
  
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.neutral.lightGray,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  checkboxActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  
  checkmark: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  termsText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  
  buttonContainer: {
    marginBottom: spacing.md,
  },
  
  footer: {
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  
  error: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
