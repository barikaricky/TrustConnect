import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { colors, spacing, typography } from '../config/theme';

interface DocumentUploadProps {
  label: string;
  description: string;
  type: 'photo' | 'document';
  value?: string;
  onUpload: (uri: string) => void;
  error?: string;
}

/**
 * DocumentUpload - Professional document upload component
 * Handles photos and ID documents
 */

export default function DocumentUpload({ label, description, type, value, onUpload, error }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  
  const handlePhotoUpload = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos');
        return;
      }
      
      // Show options
      Alert.alert(
        'Upload Photo',
        'Choose an option',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: type === 'photo' ? [1, 1] : [4, 3],
                quality: 0.8,
              });
              
              if (!result.canceled) {
                onUpload(result.assets[0].uri);
              }
            },
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: type === 'photo' ? [1, 1] : [4, 3],
                quality: 0.8,
              });
              
              if (!result.canceled) {
                onUpload(result.assets[0].uri);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Photo upload error:', error);
      Alert.alert('Error', 'Failed to upload photo');
    }
  };
  
  const handleDocumentUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled) {
        onUpload(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Document upload error:', error);
      Alert.alert('Error', 'Failed to upload document');
    }
  };
  
  const handleUpload = () => {
    if (type === 'photo') {
      handlePhotoUpload();
    } else {
      handleDocumentUpload();
    }
  };
  
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.description}>{description}</Text>
      
      <TouchableOpacity
        style={[styles.uploadBox, error && styles.uploadBoxError, value && styles.uploadBoxSuccess]}
        onPress={handleUpload}
        activeOpacity={0.7}
      >
        {value ? (
          <View style={styles.uploadedContainer}>
            <Image source={{ uri: value }} style={styles.thumbnail} />
            <View style={styles.uploadedInfo}>
              <Text style={styles.uploadedText}>✓ Uploaded</Text>
              <TouchableOpacity onPress={handleUpload}>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.uploadIcon}>📤</Text>
            <Text style={styles.uploadText}>
              {type === 'photo' ? 'Take or Upload Photo' : 'Upload Document'}
            </Text>
            <Text style={styles.uploadHint}>
              {type === 'photo' ? 'Clear face photo required' : 'NIN or BVN document'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      
      {error && <Text style={styles.error}>{error}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  
  uploadBox: {
    borderWidth: 2,
    borderColor: colors.neutral.lightGray,
    borderRadius: 12,
    borderStyle: 'dashed',
    padding: spacing.lg,
    backgroundColor: colors.background.secondary,
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  uploadBoxError: {
    borderColor: colors.error,
  },
  
  uploadBoxSuccess: {
    borderColor: colors.success,
    borderStyle: 'solid',
  },
  
  emptyContainer: {
    alignItems: 'center',
  },
  
  uploadIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  
  uploadText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary.main,
    marginBottom: spacing.xs,
  },
  
  uploadHint: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  
  uploadedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  
  uploadedInfo: {
    flex: 1,
  },
  
  uploadedText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  
  changeText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.main,
    fontWeight: typography.fontWeight.semibold,
  },
  
  error: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
