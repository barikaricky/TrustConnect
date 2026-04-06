import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, StatusBar,
  Platform, Alert, ActivityIndicator, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!currentPassword) e.current = 'Current password is required';
    if (!newPassword) e.new = 'New password is required';
    else if (newPassword.length < 6) e.new = 'Password must be at least 6 characters';
    else if (!/[A-Z]/.test(newPassword)) e.new = 'Include at least one uppercase letter';
    else if (!/[0-9]/.test(newPassword)) e.new = 'Include at least one number';
    if (newPassword !== confirmPassword) e.confirm = 'Passwords do not match';
    if (currentPassword === newPassword && currentPassword) e.new = 'New password must be different';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const getStrength = (): { label: string; color: string; width: string } => {
    if (!newPassword) return { label: '', color: '#E0E0E0', width: '0%' };
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 10) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    if (score <= 2) return { label: 'Weak', color: '#E53935', width: '33%' };
    if (score <= 3) return { label: 'Medium', color: '#F57C00', width: '66%' };
    return { label: 'Strong', color: '#4CAF50', width: '100%' };
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      await axios.post(
        `${API_BASE_URL}/settings/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Your password has been changed successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err?.response?.data?.message || 'Failed to change password';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[NAVY, '#283593']} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.infoCard}>
            <MaterialCommunityIcons name="shield-lock-outline" size={24} color={NAVY} />
            <Text style={styles.infoText}>
              Choose a strong password with uppercase letters, numbers, and special characters.
            </Text>
          </Animated.View>

          {/* Current Password */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#78909C" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter current password"
                placeholderTextColor="#B0BEC5"
                secureTextEntry={!showCurrent}
                value={currentPassword}
                onChangeText={(t) => { setCurrentPassword(t); setErrors({}); }}
              />
              <Pressable onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                <MaterialCommunityIcons name={showCurrent ? 'eye-off' : 'eye'} size={20} color="#78909C" />
              </Pressable>
            </View>
            {errors.current ? <Text style={styles.errorText}>{errors.current}</Text> : null}
          </Animated.View>

          {/* New Password */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="lock-plus-outline" size={20} color="#78909C" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#B0BEC5"
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); setErrors({}); }}
              />
              <Pressable onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                <MaterialCommunityIcons name={showNew ? 'eye-off' : 'eye'} size={20} color="#78909C" />
              </Pressable>
            </View>
            {errors.new ? <Text style={styles.errorText}>{errors.new}</Text> : null}

            {/* Strength Meter */}
            {newPassword.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  <View style={[styles.strengthFill, { width: strength.width as any, backgroundColor: strength.color }]} />
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}
          </Animated.View>

          {/* Confirm Password */}
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="lock-check-outline" size={20} color="#78909C" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Re-enter new password"
                placeholderTextColor="#B0BEC5"
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setErrors({}); }}
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                <MaterialCommunityIcons name={showConfirm ? 'eye-off' : 'eye'} size={20} color="#78909C" />
              </Pressable>
            </View>
            {errors.confirm ? <Text style={styles.errorText}>{errors.confirm}</Text> : null}
            {confirmPassword.length > 0 && confirmPassword === newPassword && (
              <View style={styles.matchRow}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.matchText}>Passwords match</Text>
              </View>
            )}
          </Animated.View>

          {/* Requirements */}
          <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.requirementsCard}>
            <Text style={styles.requirementsTitle}>Password Requirements</Text>
            {[
              { text: 'At least 6 characters', met: newPassword.length >= 6 },
              { text: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(newPassword) },
              { text: 'One number (0-9)', met: /[0-9]/.test(newPassword) },
              { text: 'Different from current password', met: newPassword !== currentPassword && newPassword.length > 0 },
            ].map((req, i) => (
              <View key={i} style={styles.requirementRow}>
                <MaterialCommunityIcons
                  name={req.met ? 'check-circle' : 'circle-outline'}
                  size={16}
                  color={req.met ? '#4CAF50' : '#B0BEC5'}
                />
                <Text style={[styles.requirementText, req.met && styles.requirementMet]}>{req.text}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Submit Button */}
          <Animated.View entering={FadeInDown.delay(600).springify()}>
            <Pressable
              style={[styles.submitBtn, (!currentPassword || !newPassword || !confirmPassword || loading) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!currentPassword || !newPassword || !confirmPassword || loading}
            >
              <LinearGradient
                colors={(!currentPassword || !newPassword || !confirmPassword || loading)
                  ? ['#B0BEC5', '#90A4AE'] : [NAVY, '#283593']}
                style={styles.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="lock-reset" size={20} color="#fff" />
                    <Text style={styles.submitText}>Change Password</Text>
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
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 42, paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#E8EAF6', borderRadius: 12, padding: 14, marginBottom: 24,
  },
  infoText: { flex: 1, fontSize: 13, color: NAVY, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#37474F', marginBottom: 8, marginTop: 16 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1B2631' },
  eyeBtn: { padding: 8 },
  errorText: { color: '#E53935', fontSize: 12, marginTop: 4, marginLeft: 4 },
  strengthContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  strengthBar: { flex: 1, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '600', width: 50 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  matchText: { fontSize: 12, color: '#4CAF50' },
  requirementsCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 24,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  requirementsTitle: { fontSize: 14, fontWeight: '600', color: '#37474F', marginBottom: 12 },
  requirementRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  requirementText: { fontSize: 13, color: '#90A4AE' },
  requirementMet: { color: '#4CAF50' },
  submitBtn: { marginTop: 24, borderRadius: 14, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.6 },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 14,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
