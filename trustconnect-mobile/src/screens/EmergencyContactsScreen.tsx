import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, StatusBar,
  Platform, Alert, ActivityIndicator, ScrollView, FlatList,
} from 'react-native';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

const RELATIONSHIPS = ['Parent', 'Spouse', 'Sibling', 'Child', 'Friend', 'Colleague', 'Neighbor', 'Other'];

export default function EmergencyContactsScreen() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRelationship, setFormRelationship] = useState('');
  const [showRelPicker, setShowRelPicker] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      const res = await axios.get(`${API_BASE_URL}/settings/emergency-contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setContacts(res.data.data.contacts || []);
      }
    } catch (err) {
      console.log('No emergency contacts yet');
    } finally {
      setLoading(false);
    }
  };

  const saveContacts = async (updated: EmergencyContact[]) => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      await axios.put(
        `${API_BASE_URL}/settings/emergency-contacts`,
        { contacts: updated },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setContacts(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert('Error', 'Failed to save contacts.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormRelationship('');
    setEditId(null);
    setShowForm(false);
    setShowRelPicker(false);
  };

  const handleAddOrUpdate = () => {
    if (!formName.trim()) { Alert.alert('Error', 'Name is required'); return; }
    if (!formPhone.trim() || formPhone.length < 10) { Alert.alert('Error', 'Valid phone number is required'); return; }
    if (!formRelationship) { Alert.alert('Error', 'Select a relationship'); return; }

    const contact: EmergencyContact = {
      id: editId || Date.now().toString(),
      name: formName.trim(),
      phone: formPhone.trim(),
      relationship: formRelationship,
    };

    let updated: EmergencyContact[];
    if (editId) {
      updated = contacts.map(c => c.id === editId ? contact : c);
    } else {
      if (contacts.length >= 5) {
        Alert.alert('Limit Reached', 'You can add up to 5 emergency contacts.');
        return;
      }
      updated = [...contacts, contact];
    }

    saveContacts(updated);
    resetForm();
  };

  const handleEdit = (contact: EmergencyContact) => {
    setFormName(contact.name);
    setFormPhone(contact.phone);
    setFormRelationship(contact.relationship);
    setEditId(contact.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Contact', 'Are you sure you want to remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          const updated = contacts.filter(c => c.id !== id);
          saveContacts(updated);
        },
      },
    ]);
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
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.infoBanner}>
          <MaterialCommunityIcons name="phone-alert-outline" size={24} color="#E65100" />
          <Text style={styles.infoText}>
            These contacts will be notified in case of an emergency during a service appointment.
          </Text>
        </Animated.View>

        {/* Contact List */}
        {contacts.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Text style={styles.sectionTitle}>Your Contacts ({contacts.length}/5)</Text>
            {contacts.map((contact, index) => (
              <Animated.View key={contact.id} entering={SlideInRight.delay(index * 100).springify()} style={styles.contactCard}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactInitial}>{contact.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                  <View style={styles.relBadge}>
                    <Text style={styles.relText}>{contact.relationship}</Text>
                  </View>
                </View>
                <View style={styles.contactActions}>
                  <Pressable onPress={() => handleEdit(contact)} style={styles.actionBtn}>
                    <MaterialCommunityIcons name="pencil-outline" size={18} color={NAVY} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(contact.id)} style={styles.actionBtn}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#E53935" />
                  </Pressable>
                </View>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {contacts.length === 0 && !showForm && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyState}>
            <MaterialCommunityIcons name="account-alert-outline" size={56} color="#CFD8DC" />
            <Text style={styles.emptyTitle}>No Emergency Contacts</Text>
            <Text style={styles.emptySubtext}>Add contacts who should be notified in an emergency</Text>
          </Animated.View>
        )}

        {/* Add/Edit Form */}
        {showForm ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.formCard}>
            <Text style={styles.formTitle}>{editId ? 'Edit Contact' : 'Add Contact'}</Text>

            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="account-outline" size={18} color="#78909C" />
              <TextInput style={styles.input} placeholder="Contact name" placeholderTextColor="#B0BEC5"
                value={formName} onChangeText={setFormName} />
            </View>

            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputRow}>
              <Text style={styles.prefix}>+234</Text>
              <TextInput style={styles.input} placeholder="8012345678" placeholderTextColor="#B0BEC5"
                keyboardType="phone-pad" maxLength={11} value={formPhone} onChangeText={setFormPhone} />
            </View>

            <Text style={styles.label}>Relationship</Text>
            <Pressable style={styles.inputRow} onPress={() => setShowRelPicker(!showRelPicker)}>
              <MaterialCommunityIcons name="account-group-outline" size={18} color="#78909C" />
              <Text style={[styles.input, { paddingVertical: 14, color: formRelationship ? '#1B2631' : '#B0BEC5' }]}>
                {formRelationship || 'Select relationship'}
              </Text>
              <MaterialCommunityIcons name={showRelPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#78909C" />
            </Pressable>
            {showRelPicker && (
              <View style={styles.pickerDropdown}>
                {RELATIONSHIPS.map(rel => (
                  <Pressable key={rel} style={styles.pickerItem} onPress={() => {
                    setFormRelationship(rel); setShowRelPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}>
                    <Text style={[styles.pickerItemText, formRelationship === rel && { color: NAVY, fontWeight: '700' }]}>{rel}</Text>
                    {formRelationship === rel && <MaterialCommunityIcons name="check" size={18} color={NAVY} />}
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.formActions}>
              <Pressable style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.formSaveBtn, saving && { opacity: 0.6 }]} onPress={handleAddOrUpdate} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.formSaveBtnText}>{editId ? 'Update' : 'Add Contact'}</Text>
                )}
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          contacts.length < 5 && (
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <Pressable style={styles.addBtn} onPress={() => setShowForm(true)}>
                <MaterialCommunityIcons name="plus-circle-outline" size={20} color={NAVY} />
                <Text style={styles.addBtnText}>Add Emergency Contact</Text>
              </Pressable>
            </Animated.View>
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

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF3E0', borderRadius: 12, padding: 14, marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 13, color: '#E65100', lineHeight: 18 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#78909C', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },

  contactCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  contactAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E8EAF6', justifyContent: 'center', alignItems: 'center',
  },
  contactInitial: { fontSize: 18, fontWeight: '700', color: NAVY },
  contactName: { fontSize: 15, fontWeight: '600', color: '#37474F' },
  contactPhone: { fontSize: 13, color: '#78909C', marginTop: 2 },
  relBadge: {
    alignSelf: 'flex-start', backgroundColor: '#F5F5F5',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4,
  },
  relText: { fontSize: 11, color: '#607D8B', fontWeight: '500' },
  contactActions: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center',
  },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#78909C', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#B0BEC5', marginTop: 4, textAlign: 'center' },

  formCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 20, marginTop: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: NAVY, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#546E7A', marginBottom: 6, marginTop: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F7FA', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 12,
  },
  prefix: { fontSize: 14, fontWeight: '600', color: '#78909C' },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#1B2631' },
  pickerDropdown: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0',
    marginTop: 4, overflow: 'hidden',
  },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  pickerItemText: { fontSize: 14, color: '#37474F' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
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
