import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { spacing } from '../../config/theme';
import AnimatedButton from '../../components/AnimatedButton';

interface SuccessScreenProps {
  customerName: string;
  location: string;
}

export default function SuccessScreen({ customerName, location }: SuccessScreenProps) {
  const firstName = customerName.split(' ')[0];

  return (
    <View style={styles.container}>
      {/* Success Icon */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="check-circle" size={80} color="#4CAF50" />
        </View>
      </Animated.View>

      {/* Success Message */}
      <Animated.View entering={FadeInUp.delay(400)} style={styles.messageContainer}>
        <Text style={styles.title}>Welcome, {firstName}! 👋</Text>
        <Text style={styles.subtitle}>
          We've found verified professionals near you in {location}
        </Text>
      </Animated.View>

      {/* Welcome Gift */}
      <Animated.View entering={FadeInUp.delay(600)} style={styles.giftCard}>
        <MaterialCommunityIcons name="gift" size={32} color="#FFC107" />
        <View style={styles.giftTextContainer}>
          <Text style={styles.giftTitle}>Welcome Gift! 🎁</Text>
          <Text style={styles.giftText}>
            Enjoy 10% off your first booking as a welcome gift!
          </Text>
        </View>
      </Animated.View>

      {/* Benefits List */}
      <Animated.View entering={FadeInUp.delay(800)} style={styles.benefitsContainer}>
        <Text style={styles.benefitsTitle}>What's Next?</Text>
        
        <View style={styles.benefitItem}>
          <View style={styles.benefitIcon}>
            <MaterialCommunityIcons name="magnify" size={24} color="#2196F3" />
          </View>
          <Text style={styles.benefitText}>Browse verified professionals in your area</Text>
        </View>

        <View style={styles.benefitItem}>
          <View style={styles.benefitIcon}>
            <MaterialCommunityIcons name="chat" size={24} color="#4CAF50" />
          </View>
          <Text style={styles.benefitText}>Chat directly with artisans</Text>
        </View>

        <View style={styles.benefitItem}>
          <View style={styles.benefitIcon}>
            <MaterialCommunityIcons name="shield-check" size={24} color="#FFC107" />
          </View>
          <Text style={styles.benefitText}>Pay securely with escrow protection</Text>
        </View>
      </Animated.View>

      {/* Continue Button */}
      <Animated.View entering={FadeInUp.delay(1000)} style={styles.buttonContainer}>
        <AnimatedButton
          variant="primary"
          onPress={() => router.replace('/customer-home')}
          icon={<MaterialCommunityIcons name="home" size={24} color="#FFFFFF" />}
        >
          Explore Now
        </AnimatedButton>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: spacing.xl,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a237e',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  giftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: '#FFC107',
    gap: spacing.md,
  },
  giftTextContainer: {
    flex: 1,
  },
  giftTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F57F17',
    marginBottom: 4,
  },
  giftText: {
    fontSize: 14,
    color: '#F57F17',
    lineHeight: 20,
  },
  benefitsContainer: {
    marginBottom: spacing.xl,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#37474F',
    marginBottom: spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: '#546E7A',
    lineHeight: 22,
  },
  buttonContainer: {
    marginTop: spacing.lg,
  },
});
