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
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const NAVY = '#1a237e';
// Brand gold available: #FFC107

interface PaymentMethod {
  id: string;
  type: 'bank' | 'card';
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}

const NIGERIAN_BANKS = [
  'Access Bank', 'First Bank of Nigeria', 'Guaranty Trust Bank', 'United Bank for Africa',
  'Zenith Bank', 'Stanbic IBTC', 'Fidelity Bank', 'Union Bank', 'Wema Bank',
  'Sterling Bank', 'Polaris Bank', 'Keystone Bank', 'Ecobank Nigeria', 'FCMB',
  'Jaiz Bank', 'Heritage Bank', 'Providus Bank', 'Kuda Bank', 'OPay', 'PalmPay',
];

export default function PaymentMethodsScreen() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showBankPicker, setShowBankPicker] = useState(false);

  // Form
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankSearch, setBankSearch] = useState('');

  useEffect(() => { loadMethods(); }, []);

  const loadMethods = async () => {
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      const res = await axios.get(`${API_BASE_URL}/settings/payment-methods`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setMethods(res.data.data.methods || res.data.data.paymentMethods || []);
    } catch {
      console.log('No payment methods');
    } finally {
      setLoading(false);
    }
  };

  const saveMethods = async (updated: PaymentMethod[]) => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      await axios.put(
        `${API_BASE_URL}/settings/payment-methods`,
        { methods: updated },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMethods(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to save payment methods.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setBankName('');
    setAccountNumber('');
    setAccountName('');
    setBankSearch('');
    setEditId(null);
    setShowForm(false);
    setShowBankPicker(false);
  };

  const handleAddOrUpdate = () => {
    if (!bankName) { Alert.alert('Error', 'Please select a bank'); return; }
    if (accountNumber.length < 10) { Alert.alert('Error', 'Account number must be 10 digits'); return; }
    if (!accountName.trim()) { Alert.alert('Error', 'Account name is required'); return; }

    const method: PaymentMethod = {
      id: editId || Date.now().toString(),
      type: 'bank',
      bankName,
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
      isDefault: methods.length === 0,
    };

    let updated: PaymentMethod[];
    if (editId) {
      updated = methods.map(m => m.id === editId ? method : m);
    } else {
      if (methods.length >= 3) { Alert.alert('Limit Reached', 'Maximum 3 payment methods allowed.'); return; }
      updated = [...methods, method];
    }
    saveMethods(updated);
    resetForm();
  };

  const handleSetDefault = (id: string) => {
    const updated = methods.map(m => ({ ...m, isDefault: m.id === id }));
    saveMethods(updated);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Payment Method', 'Are you sure you want to remove this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          let updated = methods.filter(m => m.id !== id);
          if (updated.length > 0 && !updated.some(m => m.isDefault)) updated[0].isDefault = true;
          saveMethods(updated);
        },
      },
    ]);
  };

  const getBankInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const maskAccount = (num: string) => {
    if (num.length <= 4) return num;
    return '*'.repeat(num.length - 4) + num.slice(-4);
  };

  const filteredBanks = NIGERIAN_BANKS.filter(b => b.toLowerCase().includes(bankSearch.toLowerCase()));

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
          <Text style={styles.headerTitle}>Payment Methods</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.infoBanner}>
          <MaterialCommunityIcons name="shield-check-outline" size={18} color="#2E7D32" />
          <Text style={styles.infoText}>Your bank details are encrypted and stored securely</Text>
        </Animated.View>

        {/* Payment Methods List */}
        {methods.map((method, index) => (
          <Animated.View key={method.id} entering={SlideInRight.delay(index * 80).springify()} style={styles.methodCard}>
            <View style={[styles.bankBadge, { backgroundColor: method.isDefault ? NAVY + '15' : '#F5F5F5' }]}>
              <Text style={[styles.bankInitials, { color: method.isDefault ? NAVY : '#78909C' }]}>
                {getBankInitials(method.bankName)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.methodHeader}>
                <Text style={styles.bankNameText}>{method.bankName}</Text>
                {method.isDefault && (
                  <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>Default</Text></View>
                )}
              </View>
              <Text style={styles.accountNum}>{maskAccount(method.accountNumber)}</Text>
              <Text style={styles.accountNameText}>{method.accountName}</Text>
            </View>
            <View style={styles.methodActions}>
              {!method.isDefault && (
                <Pressable onPress={() => handleSetDefault(method.id)} style={styles.miniBtn}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color="#4CAF50" />
                </Pressable>
              )}
              <Pressable onPress={() => { setEditId(method.id); setBankName(method.bankName); setAccountNumber(method.accountNumber); setAccountName(method.accountName); setShowForm(true); }} style={styles.miniBtn}>
                <MaterialCommunityIcons name="pencil-outline" size={16} color={NAVY} />
              </Pressable>
              <Pressable onPress={() => handleDelete(method.id)} style={styles.miniBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={16} color="#E53935" />
              </Pressable>
            </View>
          </Animated.View>
        ))}

        {methods.length === 0 && !showForm && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.emptyState}>
            <MaterialCommunityIcons name="credit-card-plus-outline" size={56} color="#CFD8DC" />
            <Text style={styles.emptyTitle}>No Payment Methods</Text>
            <Text style={styles.emptySubtext}>Add a bank account for payouts and transactions</Text>
          </Animated.View>
        )}

        {/* Add/Edit Form */}
        {showForm ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.formCard}>
            <Text style={styles.formTitle}>{editId ? 'Edit Payment Method' : 'Add Bank Account'}</Text>

            {/* Bank Selector */}
            <Text style={styles.fieldLabel}>Bank</Text>
            <Pressable style={styles.selectorBtn} onPress={() => setShowBankPicker(!showBankPicker)}>
              <MaterialCommunityIcons name="bank-outline" size={18} color="#78909C" />
              <Text style={[styles.selectorText, bankName ? { color: '#1B2631' } : {}]}>{bankName || 'Select bank'}</Text>
              <MaterialCommunityIcons name={showBankPicker ? 'chevron-up' : 'chevron-down'} size={18} color="#78909C" />
            </Pressable>
            {showBankPicker && (
              <View style={styles.bankDropdown}>
                <View style={styles.searchRow}>
                  <MaterialCommunityIcons name="magnify" size={16} color="#B0BEC5" />
                  <TextInput style={styles.searchInput} placeholder="Search banks..." value={bankSearch}
                    onChangeText={setBankSearch} placeholderTextColor="#B0BEC5" />
                </View>
                <ScrollView style={styles.bankList} nestedScrollEnabled>
                  {filteredBanks.map(bank => (
                    <Pressable key={bank} style={[styles.bankOption, bankName === bank && styles.bankOptionActive]}
                      onPress={() => { setBankName(bank); setShowBankPicker(false); setBankSearch(''); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                      <Text style={[styles.bankOptionText, bankName === bank && { color: NAVY, fontWeight: '600' }]}>{bank}</Text>
                      {bankName === bank && <MaterialCommunityIcons name="check" size={16} color={NAVY} />}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Account Number */}
            <Text style={styles.fieldLabel}>Account Number</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="numeric" size={18} color="#78909C" />
              <TextInput style={styles.input} placeholder="10-digit account number" placeholderTextColor="#B0BEC5"
                value={accountNumber} onChangeText={t => setAccountNumber(t.replace(/\D/g, '').slice(0, 10))}
                keyboardType="number-pad" maxLength={10} />
              <Text style={styles.charCount}>{accountNumber.length}/10</Text>
            </View>

            {/* Account Name */}
            <Text style={styles.fieldLabel}>Account Name</Text>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="account-outline" size={18} color="#78909C" />
              <TextInput style={styles.input} placeholder="As shown on bank account" placeholderTextColor="#B0BEC5"
                value={accountName} onChangeText={setAccountName} autoCapitalize="words" />
            </View>

            <View style={styles.formActions}>
              <Pressable style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.formSaveBtn, saving && { opacity: 0.6 }]} onPress={handleAddOrUpdate} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.formSaveBtnText}>{editId ? 'Update' : 'Add'}</Text>}
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          methods.length < 3 && (
            <Pressable style={styles.addBtn} onPress={() => setShowForm(true)}>
              <MaterialCommunityIcons name="plus-circle-outline" size={20} color={NAVY} />
              <Text style={styles.addBtnText}>Add Bank Account</Text>
            </Pressable>
          )
        )}

        {/* Security Note */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.securityNote}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#78909C" />
          <Text style={styles.securityText}>
            Bank details are used for receiving payments. TrustConnect complies with CBN and NDPR regulations for financial data protection.
          </Text>
        </Animated.View>
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
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  infoText: { fontSize: 12, color: '#2E7D32', flex: 1 },

  methodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  bankBadge: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  bankInitials: { fontSize: 16, fontWeight: '700' },
  methodHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bankNameText: { fontSize: 14, fontWeight: '600', color: '#37474F' },
  defaultBadge: { backgroundColor: '#E8EAF6', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  defaultBadgeText: { fontSize: 10, fontWeight: '600', color: NAVY },
  accountNum: { fontSize: 13, color: '#78909C', marginTop: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  accountNameText: { fontSize: 12, color: '#B0BEC5', marginTop: 1 },
  methodActions: { flexDirection: 'row', gap: 2 },
  miniBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#78909C', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#B0BEC5', marginTop: 4, textAlign: 'center' },

  formCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 20, marginTop: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: NAVY },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#546E7A', marginBottom: 6, marginTop: 14 },
  selectorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F7FA', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 12, paddingVertical: 13,
  },
  selectorText: { flex: 1, fontSize: 14, color: '#B0BEC5' },
  bankDropdown: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0',
    marginTop: 4, maxHeight: 200, overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 13, color: '#1B2631' },
  bankList: { maxHeight: 160 },
  bankOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#F5F5F5' },
  bankOptionActive: { backgroundColor: '#E8EAF6' },
  bankOptionText: { fontSize: 13, color: '#37474F' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F7FA', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 12, paddingVertical: 2,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#1B2631' },
  charCount: { fontSize: 11, color: '#B0BEC5' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 18 },
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

  securityNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    paddingHorizontal: 4, paddingVertical: 12, marginTop: 8,
  },
  securityText: { fontSize: 11, color: '#90A4AE', flex: 1, lineHeight: 16 },
});
