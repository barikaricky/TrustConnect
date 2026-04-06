import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { spacing } from '../../config/theme';
import AnimatedButton from '../../components/AnimatedButton';
import {
  CompanyRegistrationData,
  NIGERIAN_STATES,
  STATE_LGAS,
} from '../../services/companyRegistrationService';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

interface Props {
  onComplete: (data: Partial<CompanyRegistrationData>) => void;
  onBack: () => void;
  initialData?: Partial<CompanyRegistrationData>;
}

export default function Step3Location({ onComplete, onBack, initialData }: Props) {
  const [address, setAddress] = useState(initialData?.address || '');
  const [state, setState] = useState(initialData?.state || '');
  const [lga, setLga] = useState(initialData?.lga || '');
  const [website, setWebsite] = useState(initialData?.website || '');
  const [locationData, setLocationData] = useState(initialData?.location);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showLgaPicker, setShowLgaPicker] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredStates = stateSearch
    ? NIGERIAN_STATES.filter((s) => s.toLowerCase().includes(stateSearch.toLowerCase()))
    : NIGERIAN_STATES;

  const lgaList = STATE_LGAS[state] || ['Other'];

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location to use this feature');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const [addr] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const addrStr = [addr.street, addr.district, addr.city, addr.region].filter(Boolean).join(', ');
      setLocationData({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, address: addrStr });
      if (!address) setAddress(addrStr);
      Alert.alert('Success', 'Location detected successfully!');
    } catch {
      Alert.alert('Error', 'Failed to detect location. Please enter manually.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (address.trim().length < 5) e.address = 'Enter a valid office address';
    if (!state) e.state = 'Select a state';
    if (!lga) e.lga = 'Select a Local Government Area';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    onComplete({
      address: address.trim(),
      state,
      lga,
      website: website.trim() || undefined,
      location: locationData,
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
              <View key={s} style={[styles.stepDot, s <= 3 && styles.stepDotActive]} />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="map-marker-radius" size={36} color={GOLD} />
          </View>
          <Text style={styles.title}>Business Location</Text>
          <Text style={styles.subtitle}>Step 3: Office Address & Location</Text>
        </Animated.View>

        {/* GPS Location */}
        <Animated.View entering={FadeInUp.delay(250).springify()} style={styles.field}>
          <Pressable onPress={getCurrentLocation} style={styles.gpsBtn} disabled={loadingLocation}>
            {loadingLocation ? (
              <ActivityIndicator color={NAVY} size="small" />
            ) : (
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color={NAVY} />
            )}
            <Text style={styles.gpsBtnText}>
              {locationData ? '📍 Location Detected' : 'Detect My Location'}
            </Text>
            {locationData && <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />}
          </Pressable>
        </Animated.View>

        {/* Office Address */}
        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.field}>
          <Text style={styles.label}>Office Address *</Text>
          <View style={[styles.inputRow, errors.address ? styles.inputError : null]}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#78909C" />
            <TextInput
              style={[styles.input, { minHeight: 50, textAlignVertical: 'top' }]}
              placeholder="e.g. 15 Adeniyi Jones Ave, Ikeja"
              value={address}
              onChangeText={setAddress}
              multiline
              placeholderTextColor="#B0BEC5"
            />
          </View>
          {errors.address ? <Text style={styles.errorText}>{errors.address}</Text> : null}
        </Animated.View>

        {/* State */}
        <Animated.View entering={FadeInUp.delay(350).springify()} style={styles.field}>
          <Text style={styles.label}>State *</Text>
          <Pressable
            onPress={() => { setShowStatePicker(!showStatePicker); setShowLgaPicker(false); }}
            style={[styles.inputRow, errors.state ? styles.inputError : null]}
          >
            <MaterialCommunityIcons name="map" size={20} color="#78909C" />
            <Text style={[styles.input, !state && { color: '#B0BEC5' }]}>
              {state || 'Select state'}
            </Text>
            <MaterialCommunityIcons name={showStatePicker ? 'chevron-up' : 'chevron-down'} size={22} color="#78909C" />
          </Pressable>
          {showStatePicker && (
            <Animated.View entering={FadeInDown.springify()} style={[styles.picker, { maxHeight: 280 }]}>
              <View style={styles.searchRow}>
                <MaterialCommunityIcons name="magnify" size={18} color="#90A4AE" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search state..."
                  value={stateSearch}
                  onChangeText={setStateSearch}
                  placeholderTextColor="#B0BEC5"
                />
              </View>
              <ScrollView nestedScrollEnabled>
                {filteredStates.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => { setState(s); setLga(''); setShowStatePicker(false); setStateSearch(''); }}
                    style={[styles.pickerItem, state === s && styles.pickerItemActive]}
                  >
                    <Text style={[styles.pickerItemText, state === s && styles.pickerItemTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>
          )}
          {errors.state ? <Text style={styles.errorText}>{errors.state}</Text> : null}
        </Animated.View>

        {/* LGA */}
        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.field}>
          <Text style={styles.label}>Local Government Area (LGA) *</Text>
          <Pressable
            onPress={() => { if (!state) { setErrors((p) => ({ ...p, lga: 'Select a state first' })); return; } setShowLgaPicker(!showLgaPicker); setShowStatePicker(false); }}
            style={[styles.inputRow, errors.lga ? styles.inputError : null]}
          >
            <MaterialCommunityIcons name="map-marker-outline" size={20} color="#78909C" />
            <Text style={[styles.input, !lga && { color: '#B0BEC5' }]}>
              {lga || 'Select LGA'}
            </Text>
            <MaterialCommunityIcons name={showLgaPicker ? 'chevron-up' : 'chevron-down'} size={22} color="#78909C" />
          </Pressable>
          {showLgaPicker && (
            <Animated.View entering={FadeInDown.springify()} style={[styles.picker, { maxHeight: 250 }]}>
              <ScrollView nestedScrollEnabled>
                {lgaList.map((l) => (
                  <Pressable
                    key={l}
                    onPress={() => { setLga(l); setShowLgaPicker(false); }}
                    style={[styles.pickerItem, lga === l && styles.pickerItemActive]}
                  >
                    <Text style={[styles.pickerItemText, lga === l && styles.pickerItemTextActive]}>{l}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>
          )}
          {errors.lga ? <Text style={styles.errorText}>{errors.lga}</Text> : null}
        </Animated.View>

        {/* Website */}
        <Animated.View entering={FadeInUp.delay(450).springify()} style={styles.field}>
          <Text style={styles.label}>Website (Optional)</Text>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="web" size={20} color="#78909C" />
            <TextInput
              style={styles.input}
              placeholder="www.yourcompany.com"
              value={website}
              onChangeText={setWebsite}
              autoCapitalize="none"
              keyboardType="url"
              placeholderTextColor="#B0BEC5"
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.btnContainer}>
          <AnimatedButton variant="primary" onPress={handleContinue}>
            Continue to Bank Details
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
  errorText: { fontSize: 12, color: '#E53935', marginTop: 4 },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFF8E1', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#FFE082' },
  gpsBtnText: { fontSize: 15, fontWeight: '600', color: NAVY },
  picker: { backgroundColor: '#F8F9FA', borderRadius: 12, marginTop: 6, borderWidth: 1, borderColor: '#E8EAEF', overflow: 'hidden' },
  pickerItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#E8EAEF' },
  pickerItemActive: { backgroundColor: '#E8EAF6' },
  pickerItemText: { fontSize: 15, color: '#37474F' },
  pickerItemTextActive: { color: NAVY, fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E8EAEF', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1f2128' },
  btnContainer: { marginTop: spacing.lg },
});
