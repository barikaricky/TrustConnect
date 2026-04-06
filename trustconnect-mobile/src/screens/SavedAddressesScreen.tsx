import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, StatusBar,
  Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const NAVY = '#1a237e';
// Brand gold available: #FFC107

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  isDefault: boolean;
}

const ADDRESS_LABELS = ['Home', 'Office', 'Workshop', 'Site', 'Other'];

export default function SavedAddressesScreen() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Form
  const [formLabel, setFormLabel] = useState('Home');
  const [formAddress, setFormAddress] = useState('');


  useEffect(() => { loadAddresses(); }, []);

  const loadAddresses = async () => {
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      const res = await axios.get(`${API_BASE_URL}/settings/saved-addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setAddresses(res.data.data.addresses || []);
    } catch {
      console.log('No saved addresses');
    } finally {
      setLoading(false);
    }
  };

  const saveAddresses = async (updated: SavedAddress[]) => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      await axios.put(
        `${API_BASE_URL}/settings/saved-addresses`,
        { addresses: updated },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAddresses(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to save addresses.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormLabel('Home');
    setFormAddress('');
    setEditId(null);
    setShowForm(false);
  };

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is needed to detect your address.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (geo) {
        const parts = [geo.street, geo.district, geo.city, geo.region].filter(Boolean);
        setFormAddress(parts.join(', '));
      }
    } catch {
      Alert.alert('Error', 'Could not detect location.');
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleAddOrUpdate = () => {
    if (!formAddress.trim()) { Alert.alert('Error', 'Address is required'); return; }

    const addr: SavedAddress = {
      id: editId || Date.now().toString(),
      label: formLabel,
      address: formAddress.trim(),
      isDefault: addresses.length === 0,
    };

    let updated: SavedAddress[];
    if (editId) {
      updated = addresses.map(a => a.id === editId ? addr : a);
    } else {
      if (addresses.length >= 5) { Alert.alert('Limit Reached', 'Maximum 5 addresses allowed.'); return; }
      updated = [...addresses, addr];
    }

    saveAddresses(updated);
    resetForm();
  };

  const handleSetDefault = (id: string) => {
    const updated = addresses.map(a => ({ ...a, isDefault: a.id === id }));
    saveAddresses(updated);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Address', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          let updated = addresses.filter(a => a.id !== id);
          if (updated.length > 0 && !updated.some(a => a.isDefault)) {
            updated[0].isDefault = true;
          }
          saveAddresses(updated);
        },
      },
    ]);
  };

  const getLabelIcon = (label: string) => {
    switch (label) {
      case 'Home': return 'home-outline';
      case 'Office': return 'office-building-outline';
      case 'Workshop': return 'wrench-outline';
      case 'Site': return 'map-marker-outline';
      default: return 'map-marker-outline';
    }
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={NAVY} /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[NAVY, '#283593']} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Saved Addresses</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Address List */}
        {addresses.map((addr, index) => (
          <Animated.View key={addr.id} entering={SlideInRight.delay(index * 80).springify()} style={styles.addressCard}>
            <View style={[styles.labelIcon, { backgroundColor: addr.isDefault ? NAVY + '18' : '#F5F5F5' }]}>
              <MaterialCommunityIcons name={getLabelIcon(addr.label) as any} size={22} color={addr.isDefault ? NAVY : '#78909C'} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.labelRow}>
                <Text style={styles.addressLabel}>{addr.label}</Text>
                {addr.isDefault && (
                  <View style={styles.defaultBadge}><Text style={styles.defaultText}>Default</Text></View>
                )}
              </View>
              <Text style={styles.addressText} numberOfLines={2}>{addr.address}</Text>
            </View>
            <View style={styles.addressActions}>
              {!addr.isDefault && (
                <Pressable onPress={() => handleSetDefault(addr.id)} style={styles.miniBtn}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color="#4CAF50" />
                </Pressable>
              )}
              <Pressable onPress={() => { setEditId(addr.id); setFormLabel(addr.label); setFormAddress(addr.address); setShowForm(true); }} style={styles.miniBtn}>
                <MaterialCommunityIcons name="pencil-outline" size={16} color={NAVY} />
              </Pressable>
              <Pressable onPress={() => handleDelete(addr.id)} style={styles.miniBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={16} color="#E53935" />
              </Pressable>
            </View>
          </Animated.View>
        ))}

        {addresses.length === 0 && !showForm && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.emptyState}>
            <MaterialCommunityIcons name="map-marker-plus-outline" size={56} color="#CFD8DC" />
            <Text style={styles.emptyTitle}>No Saved Addresses</Text>
            <Text style={styles.emptySubtext}>Save addresses for quick booking</Text>
          </Animated.View>
        )}

        {/* Add/Edit Form */}
        {showForm ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.formCard}>
            <Text style={styles.formTitle}>{editId ? 'Edit Address' : 'Add Address'}</Text>

            {/* Label Picker */}
            <Text style={styles.formLabel}>Label</Text>
            <View style={styles.labelChips}>
              {ADDRESS_LABELS.map(label => (
                <Pressable key={label} style={[styles.labelChip, formLabel === label && styles.labelChipActive]}
                  onPress={() => { setFormLabel(label); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <MaterialCommunityIcons name={getLabelIcon(label) as any} size={16} color={formLabel === label ? '#fff' : '#78909C'} />
                  <Text style={[styles.labelChipText, formLabel === label && styles.labelChipTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Address Input */}
            <Text style={styles.formLabel}>Address</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={18} color="#78909C" />
              <TextInput style={styles.input} placeholder="Enter full address" placeholderTextColor="#B0BEC5"
                value={formAddress} onChangeText={setFormAddress} multiline />
            </View>

            {/* Detect Location */}
            <Pressable style={styles.detectBtn} onPress={handleDetectLocation} disabled={detectingLocation}>
              {detectingLocation ? (
                <ActivityIndicator size="small" color={NAVY} />
              ) : (
                <>
                  <MaterialCommunityIcons name="crosshairs-gps" size={16} color={NAVY} />
                  <Text style={styles.detectBtnText}>Use Current Location</Text>
                </>
              )}
            </Pressable>

            <View style={styles.formActions}>
              <Pressable style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.formSaveBtn, saving && { opacity: 0.6 }]} onPress={handleAddOrUpdate} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.formSaveBtnText}>{editId ? 'Update' : 'Save'}</Text>}
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          addresses.length < 5 && (
            <Pressable style={styles.addBtn} onPress={() => setShowForm(true)}>
              <MaterialCommunityIcons name="plus-circle-outline" size={20} color={NAVY} />
              <Text style={styles.addBtnText}>Add New Address</Text>
            </Pressable>
          )
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

  addressCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  labelIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressLabel: { fontSize: 15, fontWeight: '600', color: '#37474F' },
  defaultBadge: { backgroundColor: '#E8EAF6', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  defaultText: { fontSize: 10, fontWeight: '600', color: NAVY },
  addressText: { fontSize: 13, color: '#78909C', marginTop: 2, lineHeight: 18 },
  addressActions: { flexDirection: 'row', gap: 2 },
  miniBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#78909C', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#B0BEC5', marginTop: 4 },

  formCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 20, marginTop: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: NAVY, marginBottom: 8 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#546E7A', marginBottom: 6, marginTop: 12 },
  labelChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  labelChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0',
  },
  labelChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  labelChipText: { fontSize: 13, color: '#78909C', fontWeight: '500' },
  labelChipTextActive: { color: '#fff' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F5F7FA', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 12, paddingVertical: 2,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#1B2631' },
  detectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, marginTop: 8,
  },
  detectBtnText: { fontSize: 13, fontWeight: '600', color: NAVY },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#78909C' },
  formSaveBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  formSaveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#E8EAF6', borderRadius: 12, paddingVertical: 14, marginTop: 16,
    borderWidth: 1, borderColor: '#C5CAE9', borderStyle: 'dashed',
  },
  addBtnText: { fontSize: 14, fontWeight: '600', color: NAVY },
});
