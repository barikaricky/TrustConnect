import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing } from '../../config/theme';
import AnimatedButton from '../../components/AnimatedButton';
import { CompanyRegistrationData } from '../../services/companyRegistrationService';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

const NIGERIAN_BANKS = [
  'Access Bank', 'Citibank Nigeria', 'Ecobank Nigeria', 'Fidelity Bank',
  'First Bank of Nigeria', 'First City Monument Bank (FCMB)', 'Globus Bank',
  'Guaranty Trust Bank (GTBank)', 'Heritage Bank', 'Jaiz Bank', 'Keystone Bank',
  'Kuda Bank', 'Opay', 'Palmpay', 'Polaris Bank', 'Providus Bank',
  'Stanbic IBTC Bank', 'Standard Chartered Bank', 'Sterling Bank', 'SunTrust Bank',
  'Titan Trust Bank', 'Union Bank of Nigeria', 'United Bank for Africa (UBA)',
  'Unity Bank', 'VFD Microfinance Bank', 'Wema Bank', 'Zenith Bank',
];

interface Props {
  onComplete: (data: Partial<CompanyRegistrationData>) => void;
  onBack: () => void;
  initialData?: Partial<CompanyRegistrationData>;
  loading?: boolean;
}

export default function Step4BankDetails({ onComplete, onBack, initialData, loading }: Props) {
  const [bankName, setBankName] = useState(initialData?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber || '');
  const [accountName, setAccountName] = useState(initialData?.accountName || '');
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredBanks = bankSearch
    ? NIGERIAN_BANKS.filter((b) => b.toLowerCase().includes(bankSearch.toLowerCase()))
    : NIGERIAN_BANKS;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!bankName) e.bankName = 'Select your bank';
    if (accountNumber.length !== 10) e.accountNumber = 'Enter a valid 10-digit account number';
    if (accountName.trim().length < 2) e.accountName = 'Enter the account holder name';
    if (!agreedToTerms) e.terms = 'You must agree to the terms and conditions';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onComplete({
      bankName,
      accountNumber,
      accountName: accountName.trim(),
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={NAVY} />
          </Pressable>
          <View style={styles.stepIndicator}>
            {[1, 2, 3, 4].map((s) => (
              <View key={s} style={[styles.stepDot, styles.stepDotActive]} />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="bank" size={36} color={GOLD} />
          </View>
          <Text style={styles.title}>Bank Details</Text>
          <Text style={styles.subtitle}>Step 4: Payment Information</Text>
        </Animated.View>

        {/* Info Card */}
        <Animated.View entering={FadeInUp.delay(250).springify()} style={styles.infoCard}>
          <MaterialCommunityIcons name="shield-check" size={22} color="#4CAF50" />
          <Text style={styles.infoText}>
            Your bank details are securely stored and only used for service payments via escrow.
          </Text>
        </Animated.View>

        {/* Bank Name */}
        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.field}>
          <Text style={styles.label}>Bank Name *</Text>
          <Pressable
            onPress={() => setShowBankPicker(!showBankPicker)}
            style={[styles.inputRow, errors.bankName ? styles.inputError : null]}
          >
            <MaterialCommunityIcons name="bank-outline" size={20} color="#78909C" />
            <Text style={[styles.input, !bankName && { color: '#B0BEC5' }]}>
              {bankName || 'Select your bank'}
            </Text>
            <MaterialCommunityIcons name={showBankPicker ? 'chevron-up' : 'chevron-down'} size={22} color="#78909C" />
          </Pressable>
          {showBankPicker && (
            <Animated.View entering={FadeInDown.springify()} style={[styles.picker, { maxHeight: 280 }]}>
              <View style={styles.searchRow}>
                <MaterialCommunityIcons name="magnify" size={18} color="#90A4AE" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search bank..."
                  value={bankSearch}
                  onChangeText={setBankSearch}
                  placeholderTextColor="#B0BEC5"
                />
              </View>
              <ScrollView nestedScrollEnabled>
                {filteredBanks.map((b) => (
                  <Pressable
                    key={b}
                    onPress={() => { setBankName(b); setShowBankPicker(false); setBankSearch(''); }}
                    style={[styles.pickerItem, bankName === b && styles.pickerItemActive]}
                  >
                    <Text style={[styles.pickerItemText, bankName === b && styles.pickerItemTextActive]}>{b}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>
          )}
          {errors.bankName ? <Text style={styles.errorText}>{errors.bankName}</Text> : null}
        </Animated.View>

        {/* Account Number */}
        <Animated.View entering={FadeInUp.delay(350).springify()} style={styles.field}>
          <Text style={styles.label}>Account Number *</Text>
          <View style={[styles.inputRow, errors.accountNumber ? styles.inputError : null]}>
            <MaterialCommunityIcons name="numeric" size={20} color="#78909C" />
            <TextInput
              style={styles.input}
              placeholder="0123456789"
              value={accountNumber}
              onChangeText={(t) => setAccountNumber(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={10}
              placeholderTextColor="#B0BEC5"
            />
            {accountNumber.length === 10 && (
              <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
            )}
          </View>
          {errors.accountNumber ? <Text style={styles.errorText}>{errors.accountNumber}</Text> : null}
        </Animated.View>

        {/* Account Name */}
        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.field}>
          <Text style={styles.label}>Account Name *</Text>
          <View style={[styles.inputRow, errors.accountName ? styles.inputError : null]}>
            <MaterialCommunityIcons name="account-outline" size={20} color="#78909C" />
            <TextInput
              style={styles.input}
              placeholder="Company / Account Holder Name"
              value={accountName}
              onChangeText={setAccountName}
              placeholderTextColor="#B0BEC5"
            />
          </View>
          {errors.accountName ? <Text style={styles.errorText}>{errors.accountName}</Text> : null}
        </Animated.View>

        {/* Terms */}
        <Animated.View entering={FadeInUp.delay(450).springify()} style={styles.termsRow}>
          <Pressable
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}
          >
            {agreedToTerms && <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />}
          </Pressable>
          <Text style={styles.termsText}>
            I agree to TrustConnect&apos;s{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
            I confirm that the business information provided is accurate.
          </Text>
        </Animated.View>
        {errors.terms ? <Text style={[styles.errorText, { marginTop: -8, marginBottom: spacing.md }]}>{errors.terms}</Text> : null}

        {/* Submit */}
        <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.btnContainer}>
          <AnimatedButton variant="primary" onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Registering...</Text>
              </View>
            ) : (
              'Complete Registration'
            )}
          </AnimatedButton>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  stepIndicator: { flexDirection: 'row', gap: 6 },
  stepDot: { width: 28, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0' },
  stepDotActive: { backgroundColor: NAVY, width: 40 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF8E1', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md },
  title: { fontSize: 26, fontWeight: '700', color: NAVY, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#78909C', textAlign: 'center', marginBottom: spacing.xl },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 14, borderRadius: 12, marginBottom: spacing.lg, gap: 10, borderWidth: 1, borderColor: '#C8E6C9' },
  infoText: { flex: 1, fontSize: 13, color: '#2E7D32', lineHeight: 19 },
  field: { marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: '#37474F', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10, borderWidth: 1.5, borderColor: '#E8EAEF', gap: 10 },
  inputError: { borderColor: '#E53935' },
  input: { flex: 1, fontSize: 16, color: '#1f2128' },
  errorText: { fontSize: 12, color: '#E53935', marginTop: 4 },
  picker: { backgroundColor: '#F8F9FA', borderRadius: 12, marginTop: 6, borderWidth: 1, borderColor: '#E8EAEF', overflow: 'hidden' },
  pickerItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#E8EAEF' },
  pickerItemActive: { backgroundColor: '#E8EAF6' },
  pickerItemText: { fontSize: 15, color: '#37474F' },
  pickerItemTextActive: { color: NAVY, fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E8EAEF', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1f2128' },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg, gap: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#B0BEC5', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxActive: { backgroundColor: NAVY, borderColor: NAVY },
  termsText: { flex: 1, fontSize: 13, color: '#546E7A', lineHeight: 20 },
  termsLink: { color: NAVY, fontWeight: '600' },
  btnContainer: { marginTop: spacing.md },
});
