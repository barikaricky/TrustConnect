import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, StatusBar,
  Platform, Alert, ActivityIndicator, Switch,
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

interface NotificationPrefs {
  pushEnabled: boolean;
  bookingUpdates: boolean;
  promotions: boolean;
  chatMessages: boolean;
  paymentAlerts: boolean;
  securityAlerts: boolean;
  weeklyReport: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  pushEnabled: true,
  bookingUpdates: true,
  promotions: false,
  chatMessages: true,
  paymentAlerts: true,
  securityAlerts: true,
  weeklyReport: false,
};

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: (val: boolean) => void;
  iconColor?: string;
  disabled?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon, title, subtitle, value, onToggle, iconColor = NAVY, disabled,
}) => (
  <View style={[styles.settingItem, disabled && styles.settingDisabled]}>
    <View style={[styles.settingIconBox, { backgroundColor: iconColor + '18' }]}>
      <MaterialCommunityIcons name={icon as any} size={22} color={iconColor} />
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingSubtitle}>{subtitle}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={(v) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle(v);
      }}
      trackColor={{ false: '#E0E0E0', true: NAVY + '60' }}
      thumbColor={value ? NAVY : '#BDBDBD'}
      disabled={disabled}
    />
  </View>
);

export default function NotificationSettingsScreen() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      const res = await axios.get(`${API_BASE_URL}/settings/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setPrefs({ ...DEFAULT_PREFS, ...res.data.data.preferences });
      }
    } catch (err) {
      console.log('Using default notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePref = (key: keyof NotificationPrefs, value: boolean) => {
    // If disabling push, disable all
    if (key === 'pushEnabled' && !value) {
      setPrefs({
        pushEnabled: false,
        bookingUpdates: false,
        promotions: false,
        chatMessages: false,
        paymentAlerts: false,
        securityAlerts: false,
        weeklyReport: false,
      });
    } else {
      setPrefs(prev => ({ ...prev, [key]: value }));
    }
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      await axios.put(
        `${API_BASE_URL}/settings/notifications`,
        { preferences: prefs },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHasChanges(false);
      Alert.alert('Saved', 'Notification preferences updated.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[NAVY, '#283593']} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Master Toggle */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={styles.masterCard}>
            <LinearGradient colors={[NAVY, '#303F9F']} style={styles.masterGradient}>
              <View style={styles.masterContent}>
                <MaterialCommunityIcons name="bell-ring-outline" size={28} color={GOLD} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.masterTitle}>Push Notifications</Text>
                  <Text style={styles.masterSubtitle}>
                    {prefs.pushEnabled ? 'Notifications are enabled' : 'All notifications are off'}
                  </Text>
                </View>
                <Switch
                  value={prefs.pushEnabled}
                  onValueChange={(v) => updatePref('pushEnabled', v)}
                  trackColor={{ false: 'rgba(255,255,255,0.3)', true: GOLD + '80' }}
                  thumbColor={prefs.pushEnabled ? GOLD : '#fff'}
                />
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Activity Notifications */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon="calendar-check-outline"
              title="Booking Updates"
              subtitle="Status changes, confirmations, reminders"
              value={prefs.bookingUpdates}
              onToggle={(v) => updatePref('bookingUpdates', v)}
              iconColor="#4CAF50"
              disabled={!prefs.pushEnabled}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="message-text-outline"
              title="Chat Messages"
              subtitle="New messages from artisans and customers"
              value={prefs.chatMessages}
              onToggle={(v) => updatePref('chatMessages', v)}
              iconColor="#2196F3"
              disabled={!prefs.pushEnabled}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="cash-multiple"
              title="Payment Alerts"
              subtitle="Payments, escrow releases, wallet updates"
              value={prefs.paymentAlerts}
              onToggle={(v) => updatePref('paymentAlerts', v)}
              iconColor="#FF9800"
              disabled={!prefs.pushEnabled}
            />
          </View>
        </Animated.View>

        {/* Security */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon="shield-alert-outline"
              title="Security Alerts"
              subtitle="Login attempts, password changes, suspicious activity"
              value={prefs.securityAlerts}
              onToggle={(v) => updatePref('securityAlerts', v)}
              iconColor="#E53935"
              disabled={!prefs.pushEnabled}
            />
          </View>
        </Animated.View>

        {/* Marketing */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Text style={styles.sectionTitle}>Marketing</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon="tag-outline"
              title="Promotions"
              subtitle="Special offers, discounts, and deals"
              value={prefs.promotions}
              onToggle={(v) => updatePref('promotions', v)}
              iconColor="#9C27B0"
              disabled={!prefs.pushEnabled}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="chart-line"
              title="Weekly Report"
              subtitle="Weekly summary of your activity and earnings"
              value={prefs.weeklyReport}
              onToggle={(v) => updatePref('weeklyReport', v)}
              iconColor="#00BCD4"
              disabled={!prefs.pushEnabled}
            />
          </View>
        </Animated.View>

        {/* Save Button */}
        {hasChanges && (
          <Animated.View entering={FadeInDown.springify()} style={styles.saveContainer}>
            <Pressable
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <LinearGradient colors={[NAVY, '#283593']} style={styles.saveBtnGradient}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 42, paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },

  masterCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  masterGradient: { padding: 20, borderRadius: 16 },
  masterContent: { flexDirection: 'row', alignItems: 'center' },
  masterTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  masterSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#78909C', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 8, marginLeft: 4 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },

  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  settingDisabled: { opacity: 0.4 },
  settingIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '600', color: '#37474F' },
  settingSubtitle: { fontSize: 12, color: '#90A4AE', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 14 },

  saveContainer: { marginTop: 8 },
  saveBtn: { borderRadius: 14, overflow: 'hidden' },
  saveBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
