import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { spacing } from '../../config/theme';
import AnimatedButton from '../../components/AnimatedButton';

const NAVY = '#1a237e';
const _GOLD = '#FFC107';

interface Props {
  companyName: string;
}

export default function SuccessScreen({ companyName }: Props) {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="check-circle" size={80} color="#4CAF50" />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(400)} style={styles.messageContainer}>
        <Text style={styles.title}>Welcome, {companyName}! 🏢</Text>
        <Text style={styles.subtitle}>
          Your company has been registered successfully.{'\n'}Verification is in progress.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(600)} style={styles.verifyCard}>
        <MaterialCommunityIcons name="shield-check-outline" size={32} color={NAVY} />
        <View style={styles.verifyTextContainer}>
          <Text style={styles.verifyTitle}>Verification Pending</Text>
          <Text style={styles.verifyText}>
            Our team will verify your CAC documents within 24-48 hours. You can still explore the platform.
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(800)} style={styles.benefitsContainer}>
        <Text style={styles.benefitsTitle}>What You Can Do</Text>

        {[
          { icon: 'magnify' as const, text: 'Browse and hire verified professionals', color: '#2196F3' },
          { icon: 'cash-lock' as const, text: 'Use escrow for secure payments', color: '#4CAF50' },
          { icon: 'chart-line' as const, text: 'Access your company dashboard', color: '#FF9800' },
          { icon: 'account-group' as const, text: 'Manage team and service requests', color: '#9C27B0' },
        ].map((item, idx) => (
          <Animated.View key={idx} entering={FadeInUp.delay(900 + idx * 100)} style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: item.color + '15' }]}>
              <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
            </View>
            <Text style={styles.benefitText}>{item.text}</Text>
          </Animated.View>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(1200)} style={styles.buttonContainer}>
        <AnimatedButton
          variant="primary"
          onPress={() => router.replace('/company-dashboard')}
          icon={<MaterialCommunityIcons name="view-dashboard" size={22} color="#FFFFFF" />}
        >
          Go to Dashboard
        </AnimatedButton>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: spacing.xl, justifyContent: 'center' },
  iconContainer: { alignItems: 'center', marginBottom: spacing.xl },
  iconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  messageContainer: { alignItems: 'center', marginBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: '700', color: NAVY, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { fontSize: 15, color: '#78909C', textAlign: 'center', lineHeight: 22 },
  verifyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8EAF6', padding: spacing.lg, borderRadius: 16, marginBottom: spacing.xl, gap: spacing.md, borderWidth: 1, borderColor: '#C5CAE9' },
  verifyTextContainer: { flex: 1 },
  verifyTitle: { fontSize: 16, fontWeight: '700', color: NAVY, marginBottom: 4 },
  verifyText: { fontSize: 13, color: '#5C6BC0', lineHeight: 19 },
  benefitsContainer: { marginBottom: spacing.xl },
  benefitsTitle: { fontSize: 18, fontWeight: '700', color: '#37474F', marginBottom: spacing.md },
  benefitItem: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.md },
  benefitIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  benefitText: { flex: 1, fontSize: 14, color: '#546E7A', lineHeight: 20 },
  buttonContainer: { marginTop: spacing.md },
});
