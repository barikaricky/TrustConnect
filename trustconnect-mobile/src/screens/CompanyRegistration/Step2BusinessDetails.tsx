import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing } from '../../config/theme';
import AnimatedButton from '../../components/AnimatedButton';
import {
  CompanyRegistrationData,
  COMPANY_TYPES,
  INDUSTRY_CATEGORIES,
  EMPLOYEE_RANGES,
} from '../../services/companyRegistrationService';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

interface Props {
  onComplete: (data: Partial<CompanyRegistrationData>) => void;
  onBack: () => void;
  initialData?: Partial<CompanyRegistrationData>;
}

export default function Step2BusinessDetails({ onComplete, onBack, initialData }: Props) {
  const [companyName, setCompanyName] = useState(initialData?.companyName || '');
  const [rcNumber, setRcNumber] = useState(initialData?.rcNumber || '');
  const [companyType, setCompanyType] = useState<CompanyRegistrationData['companyType'] | ''>(initialData?.companyType || '');
  const [industry, setIndustry] = useState(initialData?.industry || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [yearEstablished, setYearEstablished] = useState(initialData?.yearEstablished?.toString() || '');
  const [numberOfEmployees, setNumberOfEmployees] = useState(initialData?.numberOfEmployees || '');
  const [tin, setTin] = useState(initialData?.tin || '');
  const [showIndustryPicker, setShowIndustryPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showEmpPicker, setShowEmpPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (companyName.trim().length < 2) e.companyName = 'Enter your company/business name';
    if (rcNumber.trim().length < 4) e.rcNumber = 'Enter a valid CAC RC number';
    if (!companyType) e.companyType = 'Select a company type';
    if (!industry) e.industry = 'Select an industry';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    onComplete({
      companyName: companyName.trim(),
      rcNumber: rcNumber.trim().toUpperCase(),
      companyType: companyType as CompanyRegistrationData['companyType'],
      industry,
      description: description.trim(),
      yearEstablished: yearEstablished ? parseInt(yearEstablished) : undefined,
      numberOfEmployees: numberOfEmployees || undefined,
      tin: tin.trim() || undefined,
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
              <View key={s} style={[styles.stepDot, s <= 2 && styles.stepDotActive]} />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="briefcase-outline" size={36} color={GOLD} />
          </View>
          <Text style={styles.title}>Business Details</Text>
          <Text style={styles.subtitle}>Step 2: CAC & Business Information</Text>
        </Animated.View>

        {/* Company Name */}
        <Animated.View entering={FadeInUp.delay(250).springify()} style={styles.field}>
          <Text style={styles.label}>Company / Business Name *</Text>
          <View style={[styles.inputRow, errors.companyName ? styles.inputError : null]}>
            <MaterialCommunityIcons name="domain" size={20} color="#78909C" />
            <TextInput
              style={styles.input}
              placeholder="e.g. TechBuild Nigeria Ltd"
              value={companyName}
              onChangeText={setCompanyName}
              placeholderTextColor="#B0BEC5"
            />
          </View>
          {errors.companyName ? <Text style={styles.errorText}>{errors.companyName}</Text> : null}
        </Animated.View>

        {/* RC Number */}
        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.field}>
          <Text style={styles.label}>CAC RC Number *</Text>
          <View style={[styles.inputRow, errors.rcNumber ? styles.inputError : null]}>
            <MaterialCommunityIcons name="file-document-outline" size={20} color="#78909C" />
            <TextInput
              style={styles.input}
              placeholder="e.g. RC1234567 or BN1234567"
              value={rcNumber}
              onChangeText={(t) => setRcNumber(t.toUpperCase())}
              autoCapitalize="characters"
              placeholderTextColor="#B0BEC5"
            />
          </View>
          <Text style={styles.hint}>Your Corporate Affairs Commission registration number</Text>
          {errors.rcNumber ? <Text style={styles.errorText}>{errors.rcNumber}</Text> : null}
        </Animated.View>

        {/* Company Type */}
        <Animated.View entering={FadeInUp.delay(350).springify()} style={styles.field}>
          <Text style={styles.label}>Company Type *</Text>
          <Pressable
            onPress={() => setShowTypePicker(!showTypePicker)}
            style={[styles.inputRow, errors.companyType ? styles.inputError : null]}
          >
            <MaterialCommunityIcons name="office-building-cog-outline" size={20} color="#78909C" />
            <Text style={[styles.input, !companyType && { color: '#B0BEC5' }]}>
              {companyType ? COMPANY_TYPES.find((t) => t.value === companyType)?.label : 'Select type'}
            </Text>
            <MaterialCommunityIcons name={showTypePicker ? 'chevron-up' : 'chevron-down'} size={22} color="#78909C" />
          </Pressable>
          {showTypePicker && (
            <Animated.View entering={FadeInDown.springify()} style={styles.picker}>
              {COMPANY_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => { setCompanyType(t.value); setShowTypePicker(false); }}
                  style={[styles.pickerItem, companyType === t.value && styles.pickerItemActive]}
                >
                  <Text style={[styles.pickerItemText, companyType === t.value && styles.pickerItemTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </Animated.View>
          )}
          {errors.companyType ? <Text style={styles.errorText}>{errors.companyType}</Text> : null}
        </Animated.View>

        {/* Industry */}
        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.field}>
          <Text style={styles.label}>Industry / Sector *</Text>
          <Pressable
            onPress={() => setShowIndustryPicker(!showIndustryPicker)}
            style={[styles.inputRow, errors.industry ? styles.inputError : null]}
          >
            <MaterialCommunityIcons name="factory" size={20} color="#78909C" />
            <Text style={[styles.input, !industry && { color: '#B0BEC5' }]}>
              {industry || 'Select industry'}
            </Text>
            <MaterialCommunityIcons name={showIndustryPicker ? 'chevron-up' : 'chevron-down'} size={22} color="#78909C" />
          </Pressable>
          {showIndustryPicker && (
            <Animated.View entering={FadeInDown.springify()} style={[styles.picker, { maxHeight: 250 }]}>
              <ScrollView nestedScrollEnabled>
                {INDUSTRY_CATEGORIES.map((ind) => (
                  <Pressable
                    key={ind}
                    onPress={() => { setIndustry(ind); setShowIndustryPicker(false); }}
                    style={[styles.pickerItem, industry === ind && styles.pickerItemActive]}
                  >
                    <Text style={[styles.pickerItemText, industry === ind && styles.pickerItemTextActive]}>
                      {ind}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>
          )}
          {errors.industry ? <Text style={styles.errorText}>{errors.industry}</Text> : null}
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInUp.delay(450).springify()} style={styles.field}>
          <Text style={styles.label}>Company Description</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
              placeholder="Brief description of your company..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholderTextColor="#B0BEC5"
            />
          </View>
        </Animated.View>

        {/* Year Established */}
        <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.field}>
          <Text style={styles.label}>Year Established</Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="calendar" size={20} color="#78909C" />
            <TextInput
              style={styles.input}
              placeholder="e.g. 2015"
              value={yearEstablished}
              onChangeText={(t) => setYearEstablished(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={4}
              placeholderTextColor="#B0BEC5"
            />
          </View>
        </Animated.View>

        {/* Number of Employees */}
        <Animated.View entering={FadeInUp.delay(550).springify()} style={styles.field}>
          <Text style={styles.label}>Number of Employees</Text>
          <Pressable onPress={() => setShowEmpPicker(!showEmpPicker)} style={styles.inputRow}>
            <MaterialCommunityIcons name="account-group-outline" size={20} color="#78909C" />
            <Text style={[styles.input, !numberOfEmployees && { color: '#B0BEC5' }]}>
              {numberOfEmployees || 'Select range'}
            </Text>
            <MaterialCommunityIcons name={showEmpPicker ? 'chevron-up' : 'chevron-down'} size={22} color="#78909C" />
          </Pressable>
          {showEmpPicker && (
            <Animated.View entering={FadeInDown.springify()} style={styles.picker}>
              {EMPLOYEE_RANGES.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => { setNumberOfEmployees(r); setShowEmpPicker(false); }}
                  style={[styles.pickerItem, numberOfEmployees === r && styles.pickerItemActive]}
                >
                  <Text style={[styles.pickerItemText, numberOfEmployees === r && styles.pickerItemTextActive]}>
                    {r} employees
                  </Text>
                </Pressable>
              ))}
            </Animated.View>
          )}
        </Animated.View>

        {/* TIN */}
        <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.field}>
          <Text style={styles.label}>Tax Identification Number (TIN)</Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="card-account-details-outline" size={20} color="#78909C" />
            <TextInput
              style={styles.input}
              placeholder="Optional"
              value={tin}
              onChangeText={setTin}
              placeholderTextColor="#B0BEC5"
            />
          </View>
          <Text style={styles.hint}>FIRS Tax Identification Number (optional)</Text>
        </Animated.View>

        {/* Buttons */}
        <Animated.View entering={FadeInUp.delay(650).springify()} style={styles.btnContainer}>
          <AnimatedButton variant="primary" onPress={handleContinue}>
            Continue to Location
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
  field: { marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: '#37474F', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10, borderWidth: 1.5, borderColor: '#E8EAEF', gap: 10 },
  inputError: { borderColor: '#E53935' },
  input: { flex: 1, fontSize: 16, color: '#1f2128' },
  hint: { fontSize: 12, color: '#90A4AE', marginTop: 4 },
  errorText: { fontSize: 12, color: '#E53935', marginTop: 4 },
  picker: { backgroundColor: '#F8F9FA', borderRadius: 12, marginTop: 6, borderWidth: 1, borderColor: '#E8EAEF', overflow: 'hidden' },
  pickerItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#E8EAEF' },
  pickerItemActive: { backgroundColor: '#E8EAF6' },
  pickerItemText: { fontSize: 15, color: '#37474F' },
  pickerItemTextActive: { color: NAVY, fontWeight: '600' },
  btnContainer: { marginTop: spacing.lg },
});
