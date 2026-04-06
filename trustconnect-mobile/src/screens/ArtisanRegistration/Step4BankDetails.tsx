import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Picker } from '@react-native-picker/picker';
import AnimatedButton from '../../components/AnimatedButton';
import { colors, spacing } from '../../config/theme';
import { RegistrationData } from './ArtisanRegistrationCoordinator';

interface Props {
  onComplete: (data: Partial<RegistrationData>) => void;
  onBack: () => void;
  initialData?: Partial<RegistrationData>;
  fullName: string;
}

const NIGERIAN_BANKS = [
  'Access Bank',
  'Citibank',
  'Ecobank Nigeria',
  'Fidelity Bank',
  'First Bank of Nigeria',
  'First City Monument Bank (FCMB)',
  'Globus Bank',
  'Guaranty Trust Bank (GTBank)',
  'Heritage Bank',
  'Keystone Bank',
  'Kuda Bank',
  'Polaris Bank',
  'Providus Bank',
  'Stanbic IBTC Bank',
  'Standard Chartered Bank',
  'Sterling Bank',
  'SunTrust Bank',
  'Union Bank',
  'United Bank for Africa (UBA)',
  'Unity Bank',
  'Wema Bank',
  'Zenith Bank',
  'OPay',
  'PalmPay',
  'Moniepoint',
];

export default function Step4BankDetails({ onComplete, onBack, initialData, fullName }: Props) {
  const [bankName, setBankName] = useState(initialData?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber || '');
  const [accountName, setAccountName] = useState(initialData?.accountName || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [accountVerified, setAccountVerified] = useState(false);
  const [manualBankEntry, setManualBankEntry] = useState(false);
  
  const [errors, setErrors] = useState({
    bank: '',
    accountNumber: '',
    accountName: '',
  });

  useEffect(() => {
    if (accountNumber.length === 10 && bankName) {
      verifyAccount();
    }
  }, [accountNumber, bankName]);

  const verifyAccount = async () => {
    if (accountNumber.length !== 10) {
      return;
    }

    if (!bankName) {
      setErrors({ ...errors, bank: 'Please select a bank first' });
      return;
    }

    setIsVerifying(true);
    
    try {
      const ArtisanRegistrationService = (await import('../../services/artisanRegistrationService')).default;
      const result = await ArtisanRegistrationService.verifyBankAccount(bankName, accountNumber, fullName);
      
      if (result.success) {
        if (result.manualEntry || !result.accountName) {
          // Flutterwave API unavailable → let user enter account name manually
          setManualBankEntry(true);
          setAccountVerified(false);
          setAccountName('');
        } else {
          setAccountName(result.accountName);
          setManualBankEntry(false);

          // Backend already compared names if ninName was supplied
          if (result.nameMatch === true) {
            setAccountVerified(true);
            setErrors({ ...errors, accountName: '' });
          } else if (result.nameMatch === false) {
            setAccountVerified(false);
            setErrors({
              ...errors,
              accountName: 'Account name does NOT match your ID name. Please use the same account.',
            });
          } else {
            // Fallback local check
            const normalizedAccountName = result.accountName.toLowerCase().replace(/\s+/g, '');
            const normalizedFullName = fullName.toLowerCase().replace(/\s+/g, '');
            if (normalizedAccountName !== normalizedFullName) {
              setErrors({ ...errors, accountName: 'Account name must match your ID name for security' });
              setAccountVerified(false);
            } else {
              setAccountVerified(true);
              setErrors({ ...errors, accountName: '' });
            }
          }
        }
      }
    } catch (error: any) {
      // Network error → allow manual entry
      setManualBankEntry(true);
      setAccountVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  /* Manual bank account name confirmation */
  const confirmManualAccountName = () => {
    const trimmed = accountName.trim().toUpperCase();
    if (trimmed.length < 3) {
      setErrors({ ...errors, accountName: 'Please enter your account name' });
      return;
    }
    // Local fuzzy compare with NIN name
    const a = trimmed.split(/\s+/).sort();
    const b = fullName.toUpperCase().split(/\s+/).filter(Boolean).sort();
    let matches = 0;
    for (const token of a) {
      if (b.some((bt: string) => bt === token || bt.startsWith(token) || token.startsWith(bt))) matches++;
    }
    const minLen = Math.min(a.length, b.length);
    const nameOk = matches >= 2 || (minLen > 0 && matches / minLen >= 0.6);

    if (!nameOk) {
      setErrors({ ...errors, accountName: 'Account name must match your verified ID name' });
      setAccountVerified(false);
      return;
    }

    setAccountName(trimmed);
    setAccountVerified(true);
    setErrors({ ...errors, accountName: '' });
  };

  const handleComplete = async () => {
    let valid = true;
    const newErrors = { bank: '', accountNumber: '', accountName: '' };

    if (!bankName) {
      newErrors.bank = 'Please select your bank';
      valid = false;
    }

    if (accountNumber.length !== 10) {
      newErrors.accountNumber = 'Account number must be 10 digits';
      valid = false;
    }

    if (!accountVerified) {
      newErrors.accountName = 'Account name must match your verified ID name';
      valid = false;
    }

    setErrors(newErrors);

    if (valid) {
      // Show loading indicator
      Alert.alert('Submitting', 'Please wait while we process your registration...');
      
      onComplete({
        bankName,
        accountNumber,
        accountName,
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
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
        </View>
        <Text style={styles.stepText}>Step 4 of 4</Text>
        <Text style={styles.title}>Bank Details</Text>
        <Text style={styles.subtitle}>How you'll receive payments</Text>
      </Animated.View>

      {/* Security Notice */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.securityNotice}>
        <MaterialCommunityIcons name="shield-check" size={24} color="#4CAF50" />
        <Text style={styles.securityText}>
          Your bank details are encrypted and secure. We never store your full account information.
        </Text>
      </Animated.View>

      {/* Bank Selection */}
      <Animated.View entering={FadeInDown.delay(300)} style={styles.inputContainer}>
        <Text style={styles.label}>Select Your Bank *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={bankName}
            onValueChange={(value) => {
              setBankName(value);
              setAccountVerified(false);
              setAccountName('');
            }}
            style={styles.picker}
          >
            <Picker.Item label="Choose your bank..." value="" />
            {NIGERIAN_BANKS.map((bank) => (
              <Picker.Item key={bank} label={bank} value={bank} />
            ))}
          </Picker>
        </View>
        {errors.bank ? <Text style={styles.errorText}>{errors.bank}</Text> : null}
      </Animated.View>

      {/* Account Number */}
      <Animated.View entering={FadeInDown.delay(400)} style={styles.inputContainer}>
        <Text style={styles.label}>Account Number *</Text>
        <View style={styles.accountInputWrapper}>
          <TextInput
            style={styles.accountInput}
            value={accountNumber}
            onChangeText={(text) => {
              setAccountNumber(text);
              setAccountVerified(false);
              setAccountName('');
            }}
            placeholder="Enter 10 digits"
            keyboardType="number-pad"
            maxLength={10}
          />
          {isVerifying && <ActivityIndicator size="small" color="#1a237e" />}
          {accountVerified && (
            <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
          )}
        </View>
        {errors.accountNumber ? <Text style={styles.errorText}>{errors.accountNumber}</Text> : null}
      </Animated.View>

      {/* Account Name (auto-resolved or manual) */}
      {(accountName || manualBankEntry) && (
        <Animated.View entering={FadeInDown.delay(500)} style={styles.inputContainer}>
          <Text style={styles.label}>Account Name {manualBankEntry && !accountVerified ? '(Enter Manually)' : ''}</Text>

          {manualBankEntry && !accountVerified ? (
            /* ── Manual entry mode ─────────────────── */
            <>
              <View style={[styles.accountInputWrapper, { borderColor: '#FF9800' }]}>
                <MaterialCommunityIcons name="account-edit" size={22} color="#FF9800" />
                <TextInput
                  style={[styles.accountInput, { marginLeft: 8 }]}
                  value={accountName}
                  onChangeText={setAccountName}
                  placeholder="Enter account holder name"
                  autoCapitalize="characters"
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                <MaterialCommunityIcons name="information-outline" size={14} color="#FF9800" />
                <Text style={[styles.errorText, { color: '#FF9800', fontSize: 12 }]}>
                  Enter the name exactly as it appears on your bank account
                </Text>
              </View>
              {errors.accountName ? <Text style={styles.errorText}>{errors.accountName}</Text> : null}
              <TouchableOpacity
                style={[styles.backButton, { backgroundColor: '#FF9800', borderColor: '#FF9800', marginTop: 10, justifyContent: 'center' }]}
                onPress={confirmManualAccountName}
              >
                <Text style={[styles.backButtonText, { color: '#fff' }]}>Confirm Account Name</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* ── Auto-resolved display ─────────────── */
            <>
              <View style={[
                styles.accountNameContainer,
                accountVerified ? styles.accountNameVerified : styles.accountNameMismatch
              ]}>
                <MaterialCommunityIcons
                  name={accountVerified ? 'check-decagram' : 'alert-circle'}
                  size={24}
                  color={accountVerified ? '#4CAF50' : '#F44336'}
                />
                <Text style={[
                  styles.accountNameText,
                  accountVerified ? styles.accountNameTextVerified : styles.accountNameTextMismatch
                ]}>
                  {accountName}
                </Text>
              </View>
              
              {accountVerified ? (
                <Text style={styles.successText}>
                  ✓ Account name matches your verified ID
                </Text>
              ) : (
                <View style={styles.warningBox}>
                  <MaterialCommunityIcons name="alert" size={20} color="#F44336" />
                  <Text style={styles.warningText}>
                    Account name must match your ID name for security
                  </Text>
                </View>
              )}
              
              {errors.accountName ? <Text style={styles.errorText}>{errors.accountName}</Text> : null}
            </>
          )}
        </Animated.View>
      )}

      {/* ID Name Reference */}
      <Animated.View entering={FadeInDown.delay(600)} style={styles.referenceBox}>
        <Text style={styles.referenceLabel}>Your Verified ID Name:</Text>
        <Text style={styles.referenceName}>{fullName}</Text>
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View entering={FadeInDown.delay(700)} style={styles.actionButtons}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#546E7A" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <View style={styles.continueButtonWrapper}>
          <AnimatedButton
            onPress={handleComplete}
            title="Complete Registration"
            disabled={!accountVerified}
          />
        </View>
      </Animated.View>
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
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
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
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: spacing.xs,
  },
  accountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    height: 50,
    gap: spacing.sm,
  },
  accountInput: {
    flex: 1,
    fontSize: 16,
    color: '#37474F',
  },
  accountNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
  },
  accountNameVerified: {
    backgroundColor: '#E8F5E9',
  },
  accountNameMismatch: {
    backgroundColor: '#FFEBEE',
  },
  accountNameText: {
    fontSize: 16,
    fontWeight: '700',
  },
  accountNameTextVerified: {
    color: '#2E7D32',
  },
  accountNameTextMismatch: {
    color: '#C62828',
  },
  successText: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: spacing.xs,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  referenceBox: {
    backgroundColor: '#E3F2FD',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  referenceLabel: {
    fontSize: 12,
    color: '#546E7A',
    marginBottom: 4,
  },
  referenceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1565C0',
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
