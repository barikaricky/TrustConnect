import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../config/theme';

export default function SuccessScreen() {
  const router = useRouter();

  const handleGoToDashboard = () => {
    router.replace('/artisan-dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.delay(200)} style={styles.content}>
          {/* Success Icon */}
          <Animated.View entering={FadeInUp.delay(400)} style={styles.iconContainer}>
            <MaterialCommunityIcons name="check-circle" size={100} color="#4CAF50" />
          </Animated.View>

        {/* Success Message */}
        <Animated.View entering={FadeInDown.delay(600)} style={styles.messageContainer}>
          <Text style={styles.title}>Application Submitted!</Text>
          <Text style={styles.subtitle}>
            Your artisan registration has been successfully submitted
          </Text>
        </Animated.View>

        {/* What's Next */}
        <Animated.View entering={FadeInDown.delay(800)} style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <MaterialCommunityIcons name="clock-outline" size={24} color="#1a237e" />
            <Text style={styles.infoTitle}>What's Next?</Text>
          </View>
          <View style={styles.infoContent}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="check" size={20} color="#4CAF50" />
              <Text style={styles.infoText}>
                Our team is verifying your details
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="bell-ring" size={20} color="#FFC107" />
              <Text style={styles.infoText}>
                You'll receive a notification within 24 hours
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="briefcase" size={20} color="#1a237e" />
              <Text style={styles.infoText}>
                Once approved, you can start taking jobs immediately
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Benefits Card */}
        <Animated.View entering={FadeInDown.delay(1000)} style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>While You Wait...</Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <MaterialCommunityIcons name="shield-star" size={20} color="#FFC107" />
              <Text style={styles.benefitText}>Get access to verified customers</Text>
            </View>
            <View style={styles.benefitItem}>
              <MaterialCommunityIcons name="cash-multiple" size={20} color="#FFC107" />
              <Text style={styles.benefitText}>Set your own prices</Text>
            </View>
            <View style={styles.benefitItem}>
              <MaterialCommunityIcons name="calendar-check" size={20} color="#FFC107" />
              <Text style={styles.benefitText}>Flexible working hours</Text>
            </View>
          </View>
        </Animated.View>

        {/* Action Button */}
        <Animated.View entering={FadeInDown.delay(1200)} style={styles.buttonContainer}>
          <TouchableOpacity style={styles.dashboardButton} onPress={handleGoToDashboard}>
            <Text style={styles.dashboardButtonText}>Go to Dashboard (Preview)</Text>
            <MaterialCommunityIcons name="arrow-right" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Support Note */}
        <Animated.View entering={FadeInDown.delay(1400)} style={styles.supportNote}>
          <Text style={styles.supportText}>
            Need help? Contact our support team at{' '}
            <Text style={styles.supportLink}>support@trustconnect.ng</Text>
          </Text>
        </Animated.View>
      </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a237e',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#546E7A',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a237e',
  },
  infoContent: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#37474F',
    lineHeight: 22,
  },
  benefitsCard: {
    width: '100%',
    backgroundColor: '#E8EAF6',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a237e',
    marginBottom: spacing.md,
  },
  benefitsList: {
    gap: spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  benefitText: {
    fontSize: 14,
    color: '#37474F',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a237e',
    paddingVertical: spacing.md + 4,
    borderRadius: 8,
    gap: spacing.sm,
    shadowColor: '#1a237e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  dashboardButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  supportNote: {
    paddingHorizontal: spacing.lg,
  },
  supportText: {
    fontSize: 13,
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 20,
  },
  supportLink: {
    color: '#1a237e',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
