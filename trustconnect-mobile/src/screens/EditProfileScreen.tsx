import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, StatusBar,
  Platform, Alert, ActivityIndicator, KeyboardAvoidingView, ScrollView, Image,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../services/AuthContext';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      const res = await axios.get(`${API_BASE_URL}/settings/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const u = res.data.data.user;
        setName(u.name || '');
        setEmail(u.email || '');
        setPhone(u.phone || '');
        setLocation(u.location || '');
        setAvatar(u.avatar || null);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    else if (name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePickImage = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission Required', 'Allow access to your photos to change profile picture.');
      return;
    }

    Alert.alert('Profile Picture', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const camPerm = await ImagePicker.requestCameraPermissionsAsync();
          if (!camPerm.granted) { Alert.alert('Permission Required', 'Allow camera access.'); return; }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) {
            setAvatar(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) {
            setAvatar(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!validate()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');

      // Convert local device URI to base64 before uploading
      let avatarToSend = avatar;
      if (avatar && (avatar.startsWith('file://') || avatar.startsWith('content://'))) {
        const base64 = await FileSystem.readAsStringAsync(avatar, { encoding: 'base64' as any });
        avatarToSend = `data:image/jpeg;base64,${base64}`;
      }

      const res = await axios.put(
        `${API_BASE_URL}/settings/profile`,
        { name: name.trim(), email: email.trim(), location: location.trim(), avatar: avatarToSend },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        // Update stored user data
        const storedUser = await AsyncStorage.getItem('@trustconnect_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          parsed.name = name.trim();
          parsed.fullName = name.trim();
          parsed.email = email.trim();
          await AsyncStorage.setItem('@trustconnect_user', JSON.stringify(parsed));
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Profile updated successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update profile';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const roleLabel = user?.role === 'artisan' ? 'Artisan' : user?.role === 'company' ? 'Company' : 'Customer';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[NAVY, '#283593']} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveHeaderBtn, saving && { opacity: 0.5 }]}
          >
            <Text style={styles.saveHeaderText}>{saving ? 'Saving...' : 'Save'}</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.avatarSection}>
            <Pressable onPress={handlePickImage} style={styles.avatarContainer}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <MaterialCommunityIcons name="account" size={48} color="#B0BEC5" />
                </View>
              )}
              <View style={styles.cameraBtn}>
                <MaterialCommunityIcons name="camera" size={16} color="#fff" />
              </View>
            </Pressable>
            <Text style={styles.avatarHint}>Tap to change photo</Text>
            <View style={styles.roleBadge}>
              <MaterialCommunityIcons
                name={user?.role === 'artisan' ? 'wrench' : user?.role === 'company' ? 'office-building' : 'account'}
                size={14} color={NAVY}
              />
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>
          </Animated.View>

          {/* Form Fields */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={[styles.inputRow, errors.name ? styles.inputError : null]}>
              <MaterialCommunityIcons name="account-outline" size={20} color="#78909C" />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#B0BEC5"
                value={name}
                onChangeText={(t) => { setName(t); setErrors({}); }}
              />
            </View>
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputRow, errors.email ? styles.inputError : null]}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#78909C" />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#B0BEC5"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors({}); }}
              />
            </View>
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(350).springify()}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={[styles.inputRow, styles.inputDisabled]}>
              <MaterialCommunityIcons name="phone-outline" size={20} color="#B0BEC5" />
              <TextInput
                style={[styles.input, { color: '#90A4AE' }]}
                value={phone}
                editable={false}
              />
              <MaterialCommunityIcons name="lock-outline" size={16} color="#B0BEC5" />
            </View>
            <Text style={styles.hintText}>Phone number cannot be changed for security</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <Text style={styles.label}>Location / Address</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color="#78909C" />
              <TextInput
                style={styles.input}
                placeholder="Enter your address"
                placeholderTextColor="#B0BEC5"
                value={location}
                onChangeText={setLocation}
                multiline
              />
            </View>
          </Animated.View>

          {/* Save Button */}
          <Animated.View entering={FadeInDown.delay(500).springify()}>
            <Pressable
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <LinearGradient colors={[NAVY, '#283593']} style={styles.saveBtnGradient}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="content-save-check-outline" size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  loadingText: { marginTop: 12, color: '#78909C', fontSize: 16 },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 42, paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  saveHeaderBtn: { backgroundColor: GOLD, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  saveHeaderText: { fontSize: 14, fontWeight: '700', color: NAVY },
  content: { padding: 20, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E0E0E0' },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#ECEFF1', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed',
  },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#F5F7FA',
  },
  avatarHint: { fontSize: 12, color: '#90A4AE', marginTop: 8 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E8EAF6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8,
  },
  roleText: { fontSize: 12, fontWeight: '600', color: NAVY },

  label: { fontSize: 14, fontWeight: '600', color: '#37474F', marginBottom: 8, marginTop: 16 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 14,
  },
  inputError: { borderColor: '#E53935' },
  inputDisabled: { backgroundColor: '#F5F5F5' },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1B2631' },
  hintText: { fontSize: 11, color: '#B0BEC5', marginTop: 4, marginLeft: 4 },
  errorText: { color: '#E53935', fontSize: 12, marginTop: 4, marginLeft: 4 },

  saveBtn: { marginTop: 32, borderRadius: 14, overflow: 'hidden' },
  saveBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 14,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
