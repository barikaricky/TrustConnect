import React from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrustConnectLoadingPreview from '../components/TrustConnectLoadingPreview';

const COLORS = {
  navy: '#1a2742',
  blue: '#2c3e67',
  accent: '#5874c4',
  background: '#f5f7fa',
  white: '#ffffff',
  text: '#303b4d',
  muted: '#687386',
  border: '#e4e9f1',
};

interface WelcomeScreenProps {
  onHirePress: () => void;
  onRegisterPress: () => void;
  onCompanyPress: () => void;
  onLoginPress: () => void;
}

export default function WelcomeScreen({
  onHirePress,
  onRegisterPress,
  onCompanyPress,
  onLoginPress,
}: WelcomeScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <TrustConnectLoadingPreview inline />

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="handshake-outline" size={34} color={COLORS.blue} />
          </View>
          <Text style={styles.title}>Find the right help.{'\n'}Get the job done.</Text>
          <Text style={styles.description}>
            Connect with trusted skilled professionals for the work you need, or find new
            opportunities for your skills.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onHirePress}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="magnify" size={21} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>Find a professional</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.white} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onRegisterPress}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="account-hard-hat-outline" size={21} color={COLORS.blue} />
            <Text style={styles.secondaryButtonText}>Join as a professional</Text>
            <MaterialCommunityIcons name="arrow-right" size={19} color={COLORS.accent} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onCompanyPress}
            style={({ pressed }) => [styles.companyButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="domain" size={20} color={COLORS.blue} />
            <Text style={styles.companyButtonText}>Register your company</Text>
          </Pressable>
        </View>

        <View style={styles.trustNote}>
          <MaterialCommunityIcons name="shield-check-outline" size={18} color={COLORS.accent} />
          <Text style={styles.trustText}>A simpler, safer way to get work done</Text>
        </View>

        <View style={styles.signIn}>
          <Text style={styles.signInPrompt}>Already have an account?</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in to your account"
            onPress={onLoginPress}
            hitSlop={8}
          >
            <Text style={styles.signInLink}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 30,
  },
  heroIcon: {
    width: 64,
    height: 64,
    marginBottom: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e9eef9',
  },
  title: {
    color: COLORS.navy,
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.7,
  },
  description: {
    maxWidth: 380,
    marginTop: 12,
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    minHeight: 58,
    paddingHorizontal: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.blue,
  },
  primaryButtonText: {
    flex: 1,
    marginHorizontal: 12,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 58,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
  },
  secondaryButtonText: {
    flex: 1,
    marginHorizontal: 12,
    color: COLORS.blue,
    fontSize: 16,
    fontWeight: '700',
  },
  companyButton: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: COLORS.white,
  },
  companyButtonText: {
    color: COLORS.blue,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  trustNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 25,
  },
  trustText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  signIn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 27,
  },
  signInPrompt: {
    color: COLORS.muted,
    fontSize: 14,
  },
  signInLink: {
    color: COLORS.blue,
    fontSize: 14,
    fontWeight: '700',
  },
});
