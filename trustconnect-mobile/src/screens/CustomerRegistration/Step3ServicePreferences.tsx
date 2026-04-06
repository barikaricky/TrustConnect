import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing } from '../../config/theme';
import AnimatedButton from '../../components/AnimatedButton';
import { CustomerRegistrationData } from '../../services/customerRegistrationService';

interface Step3Props {
  onComplete: (data: Partial<CustomerRegistrationData>) => void;
  onBack: () => void;
  initialData?: Partial<CustomerRegistrationData>;
  loading?: boolean;
}

const SERVICES = [
  { id: 'plumbing', name: 'Plumber', icon: 'pipe-wrench', color: '#2196F3' },
  { id: 'electrical', name: 'Electrician', icon: 'flash', color: '#FFC107' },
  { id: 'painting', name: 'Painter', icon: 'format-paint', color: '#9C27B0' },
  { id: 'ac-repair', name: 'AC Repair', icon: 'air-conditioner', color: '#00BCD4' },
  { id: 'carpentry', name: 'Carpenter', icon: 'hammer', color: '#795548' },
  { id: 'cleaning', name: 'Cleaning', icon: 'broom', color: '#4CAF50' },
  { id: 'mechanic', name: 'Mechanic', icon: 'car-wrench', color: '#F44336' },
  { id: 'general', name: 'General Help', icon: 'account-wrench', color: '#607D8B' },
];

export default function Step3ServicePreferences({ onComplete, onBack, initialData, loading }: Step3Props) {
  const [selectedServices, setSelectedServices] = useState<string[]>(
    initialData?.servicePreferences || []
  );

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleContinue = () => {
    onComplete({
      servicePreferences: selectedServices.length > 0 ? selectedServices : undefined,
    });
  };

  const handleSkip = () => {
    onComplete({
      servicePreferences: undefined,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Progress Indicator */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.progressContainer}>
        <View style={styles.progressDots}>
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotComplete]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
        </View>
        <Text style={styles.stepText}>Step 3 of 3</Text>
      </Animated.View>

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.headerSection}>
        <Text style={styles.title}>What are you looking for today?</Text>
        <Text style={styles.subtitle}>
          Select the services you need. This helps us show you the right professionals.
        </Text>
      </Animated.View>

      {/* Service Grid */}
      <Animated.View entering={FadeInDown.delay(300)} style={styles.servicesGrid}>
        {SERVICES.map((service, index) => {
          const isSelected = selectedServices.includes(service.id);
          return (
            <Animated.View
              key={service.id}
              entering={FadeInDown.delay(400 + index * 50)}
              style={styles.serviceCardWrapper}
            >
              <Pressable
                style={[
                  styles.serviceCard,
                  isSelected && styles.serviceCardSelected,
                ]}
                onPress={() => toggleService(service.id)}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: isSelected ? service.color : `${service.color}20` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={service.icon as any}
                    size={32}
                    color={isSelected ? '#FFFFFF' : service.color}
                  />
                </View>
                <Text
                  style={[
                    styles.serviceName,
                    isSelected && styles.serviceNameSelected,
                  ]}
                >
                  {service.name}
                </Text>
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </Animated.View>

      {/* Selected Count */}
      {selectedServices.length > 0 && (
        <Animated.View entering={FadeInUp} style={styles.selectedBadge}>
          <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.selectedText}>
            {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
          </Text>
        </Animated.View>
      )}

      {/* Action Buttons */}
      <Animated.View entering={FadeInUp.delay(600)} style={styles.actionButtons}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#546E7A" />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <View style={styles.continueButtonWrapper}>
          {selectedServices.length > 0 ? (
            <AnimatedButton
              variant="primary"
              onPress={handleContinue}
              loading={loading}
              icon={<MaterialCommunityIcons name="check" size={24} color="#FFFFFF" />}
            >
              Finish & Explore
            </AnimatedButton>
          ) : (
            <AnimatedButton
              variant="secondary"
              onPress={handleSkip}
              loading={loading}
            >
              Skip for Now
            </AnimatedButton>
          )}
        </View>
      </Animated.View>

      {/* Helper Text */}
      <Animated.View entering={FadeInUp.delay(700)} style={styles.helperSection}>
        <Text style={styles.helperText}>
          Don't worry, you can always update your preferences later in settings.
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  progressDots: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  progressDot: {
    width: 32,
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
  },
  headerSection: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a237e',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: '#78909C',
    lineHeight: 24,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  serviceCardWrapper: {
    width: '47%',
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    position: 'relative',
  },
  serviceCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8F4',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#37474F',
    textAlign: 'center',
  },
  serviceNameSelected: {
    color: '#1a237e',
  },
  checkBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 12,
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
  helperSection: {
    alignItems: 'center',
  },
  helperText: {
    fontSize: 13,
    color: '#78909C',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
