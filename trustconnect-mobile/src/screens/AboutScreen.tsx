import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, StatusBar,
  Platform, Linking, Image,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

const NAVY = '#1a237e';
const GOLD = '#FFC107';
const APP_VERSION = '1.0.0';

interface SectionItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  iconColor?: string;
}

const SectionItem: React.FC<SectionItemProps> = ({ icon, title, subtitle, onPress, iconColor = NAVY }) => (
  <Pressable style={styles.sectionItem} onPress={onPress} android_ripple={{ color: 'rgba(0,0,0,0.05)' }}>
    <View style={[styles.sectionIconBox, { backgroundColor: iconColor + '18' }]}>
      <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionItemTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionItemSubtitle}>{subtitle}</Text>}
    </View>
    {onPress && <MaterialCommunityIcons name="chevron-right" size={22} color="#BDBDBD" />}
  </Pressable>
);

export default function AboutScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>();

  // If opened as terms-of-service, scroll to that section
  const showTerms = section === 'terms';
  const showPrivacy = section === 'privacy';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[NAVY, '#283593']} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {showTerms ? 'Terms of Service' : showPrivacy ? 'Privacy Policy' : 'About TrustConnect'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Info Card */}
        {!showTerms && !showPrivacy && (
          <>
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.appCard}>
              <LinearGradient colors={[NAVY, '#303F9F']} style={styles.appCardGradient}>
                <View style={styles.logoContainer}>
                  <MaterialCommunityIcons name="handshake" size={48} color={GOLD} />
                </View>
                <Text style={styles.appName}>TrustConnect</Text>
                <Text style={styles.appTagline}>Connecting Trust, Building Communities</Text>
                <View style={styles.versionBadge}>
                  <Text style={styles.versionText}>Version {APP_VERSION}</Text>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* About Section */}
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <Text style={styles.sectionTitle}>About</Text>
              <View style={styles.card}>
                <Text style={styles.aboutText}>
                  TrustConnect is Nigeria&apos;s premier platform connecting individuals and businesses 
                  with verified, skilled artisans. Our platform ensures safe, transparent, and 
                  professional service delivery through escrow payments, identity verification, 
                  and a robust review system.
                </Text>
                <Text style={styles.aboutText}>
                  Founded in 2024, we are committed to empowering Nigerian artisans, protecting 
                  customers, and building a trusted marketplace for professional services.
                </Text>
              </View>
            </Animated.View>

            {/* Features */}
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <Text style={styles.sectionTitle}>Key Features</Text>
              <View style={styles.card}>
                {[
                  { icon: 'shield-check', title: 'Verified Artisans', subtitle: 'NIN & CAC verified professionals', color: '#4CAF50' },
                  { icon: 'lock-outline', title: 'Escrow Protection', subtitle: 'Secure payments held until job completion', color: '#2196F3' },
                  { icon: 'star-outline', title: 'Reviews & Ratings', subtitle: 'Real feedback from real customers', color: '#FF9800' },
                  { icon: 'chat-processing-outline', title: 'In-App Messaging', subtitle: 'Communicate directly with service providers', color: '#9C27B0' },
                  { icon: 'scale-balance', title: 'Dispute Resolution', subtitle: 'Fair resolution process for all parties', color: '#E53935' },
                  { icon: 'cellphone-lock', title: 'App Security', subtitle: '6-digit PIN lock & biometric authentication', color: '#00BCD4' },
                ].map((feature, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <View style={styles.divider} />}
                    <SectionItem icon={feature.icon} title={feature.title} subtitle={feature.subtitle} iconColor={feature.color} />
                  </React.Fragment>
                ))}
              </View>
            </Animated.View>

            {/* Legal */}
            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <Text style={styles.sectionTitle}>Legal</Text>
              <View style={styles.card}>
                <SectionItem
                  icon="file-document-outline"
                  title="Terms of Service"
                  subtitle="Read our terms and conditions"
                  onPress={() => router.push({ pathname: '/about', params: { section: 'terms' } })}
                  iconColor="#37474F"
                />
                <View style={styles.divider} />
                <SectionItem
                  icon="shield-lock-outline"
                  title="Privacy Policy"
                  subtitle="How we handle your data"
                  onPress={() => router.push({ pathname: '/about', params: { section: 'privacy' } })}
                  iconColor="#37474F"
                />
                <View style={styles.divider} />
                <SectionItem
                  icon="license"
                  title="Open Source Licenses"
                  subtitle="Third-party software attributions"
                  iconColor="#37474F"
                />
              </View>
            </Animated.View>

            {/* Contact */}
            <Animated.View entering={FadeInDown.delay(500).springify()}>
              <Text style={styles.sectionTitle}>Connect With Us</Text>
              <View style={styles.card}>
                <SectionItem icon="web" title="Website" subtitle="www.trustconnect.ng"
                  onPress={() => Linking.openURL('https://trustconnect.ng')} iconColor="#1976D2" />
                <View style={styles.divider} />
                <SectionItem icon="email-outline" title="Email" subtitle="support@trustconnect.ng"
                  onPress={() => Linking.openURL('mailto:support@trustconnect.ng')} iconColor="#E65100" />
                <View style={styles.divider} />
                <SectionItem icon="twitter" title="Twitter / X" subtitle="@TrustConnectNG"
                  onPress={() => Linking.openURL('https://twitter.com/TrustConnectNG')} iconColor="#1DA1F2" />
                <View style={styles.divider} />
                <SectionItem icon="instagram" title="Instagram" subtitle="@trustconnect.ng"
                  onPress={() => Linking.openURL('https://instagram.com/trustconnect.ng')} iconColor="#E4405F" />
              </View>
            </Animated.View>

            {/* Footer */}
            <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.footer}>
              <Text style={styles.footerText}>&copy; 2026 TrustConnect Technologies Ltd.</Text>
              <Text style={styles.footerText}>Made with ❤ in Nigeria 🇳🇬</Text>
            </Animated.View>
          </>
        )}

        {/* Terms of Service Content */}
        {showTerms && (
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <View style={styles.legalCard}>
              <Text style={styles.legalDate}>Last Updated: March 1, 2026</Text>
              
              {[
                { title: '1. Acceptance of Terms', body: 'By accessing or using the TrustConnect mobile application and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.' },
                { title: '2. Description of Service', body: 'TrustConnect is a platform that connects customers with verified artisans and service professionals in Nigeria. We facilitate bookings, payments, communications, and dispute resolution between parties.' },
                { title: '3. User Accounts', body: 'You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials, including your PIN and password. You must be at least 18 years old to use our services.' },
                { title: '4. Payment Terms', body: 'All payments are processed through our secure escrow system. Funds are held until the customer confirms satisfactory completion of work. Commission rates and withdrawal fees are clearly displayed before each transaction.' },
                { title: '5. Verification', body: 'Users may be required to verify their identity through NIN (National Identification Number) for customers, or CAC registration for companies. Artisans undergo additional verification including skill assessment.' },
                { title: '6. Cancellation & Refunds', body: 'Customers may cancel bookings before work commences for a full refund. Cancellation after work has started may result in partial charges. Disputes are resolved through our structured dispute resolution process.' },
                { title: '7. User Conduct', body: 'Users must not engage in fraudulent activities, harassment, discrimination, or any behavior that violates Nigerian law. Violation of these terms may result in account suspension or termination.' },
                { title: '8. Limitation of Liability', body: 'TrustConnect serves as a platform connecting parties and is not directly responsible for the quality of work performed by artisans. We facilitate dispute resolution but are not liable for losses beyond the escrow amount held.' },
                { title: '9. Data Protection', body: 'We comply with the Nigeria Data Protection Regulation (NDPR). Your personal data is collected, processed, and stored in accordance with our Privacy Policy.' },
                { title: '10. Modifications', body: 'We reserve the right to modify these terms at any time. Users will be notified of significant changes. Continued use of the service constitutes acceptance of modified terms.' },
              ].map((section, i) => (
                <View key={i} style={styles.legalSection}>
                  <Text style={styles.legalSectionTitle}>{section.title}</Text>
                  <Text style={styles.legalBody}>{section.body}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Privacy Policy Content */}
        {showPrivacy && (
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <View style={styles.legalCard}>
              <Text style={styles.legalDate}>Last Updated: March 1, 2026</Text>
              
              {[
                { title: '1. Information We Collect', body: 'We collect personal information including your name, phone number, email, location data, NIN/BVN for verification, bank account details for payments, and usage data to improve our services.' },
                { title: '2. How We Use Your Data', body: 'Your data is used to provide and improve our services, process payments, verify identity, communicate with you, personalize your experience, and comply with legal obligations under Nigerian law.' },
                { title: '3. Data Sharing', body: 'We share limited information with artisans/customers as needed for service delivery. Payment data is shared with our payment processor (Flutterwave). We do not sell your personal data to third parties.' },
                { title: '4. Data Security', body: 'We implement industry-standard security measures including encryption in transit (TLS), encrypted storage, secure authentication, and regular security audits to protect your data.' },
                { title: '5. Your Rights (NDPR)', body: 'Under the Nigeria Data Protection Regulation, you have the right to access your data, request corrections, request deletion, object to processing, and data portability. Contact our Data Protection Officer at dpo@trustconnect.ng.' },
                { title: '6. Data Retention', body: 'We retain your data for as long as your account is active. After account deletion, we may retain certain data for legal compliance for up to 7 years as required by Nigerian financial regulations.' },
                { title: '7. Cookies & Analytics', body: 'We use analytics tools to understand app usage patterns and improve our services. No third-party advertising trackers are used in our mobile application.' },
                { title: '8. Children\'s Privacy', body: 'Our services are not intended for users under 18 years of age. We do not knowingly collect data from minors.' },
                { title: '9. Changes to This Policy', body: 'We will notify you of any material changes to this privacy policy through in-app notifications. We encourage you to review this policy periodically.' },
                { title: '10. Contact', body: 'For privacy-related inquiries, contact our Data Protection Officer at dpo@trustconnect.ng or write to: TrustConnect Technologies Ltd, Victoria Island, Lagos, Nigeria.' },
              ].map((section, i) => (
                <View key={i} style={styles.legalSection}>
                  <Text style={styles.legalSectionTitle}>{section.title}</Text>
                  <Text style={styles.legalBody}>{section.body}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 42, paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },

  appCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  appCardGradient: { padding: 32, alignItems: 'center', borderRadius: 16 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  appName: { fontSize: 28, fontWeight: '800', color: '#fff' },
  appTagline: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  versionBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginTop: 12,
  },
  versionText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#78909C', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16, marginLeft: 4 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  aboutText: { fontSize: 14, color: '#546E7A', lineHeight: 22, padding: 16, paddingBottom: 0 },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 14 },

  sectionItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  sectionIconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionItemTitle: { fontSize: 15, fontWeight: '600', color: '#37474F' },
  sectionItemSubtitle: { fontSize: 12, color: '#90A4AE', marginTop: 2 },

  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { fontSize: 12, color: '#90A4AE', marginTop: 4 },

  legalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 20 },
  legalDate: { fontSize: 12, color: '#90A4AE', marginBottom: 16, fontStyle: 'italic' },
  legalSection: { marginBottom: 20 },
  legalSectionTitle: { fontSize: 15, fontWeight: '700', color: NAVY, marginBottom: 8 },
  legalBody: { fontSize: 14, color: '#546E7A', lineHeight: 22 },
});
