import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../config/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedButtonProps {
  onPress: () => void;
  title?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  loading?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

/**
 * AnimatedButton - Smooth 60fps animated button with haptic feedback
 */

export default function AnimatedButton({
  onPress,
  title,
  children,
  variant = 'primary',
  loading = false,
  isLoading,
  disabled = false,
  style,
  icon,
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const handlePressIn = () => {
    scale.value = withSpring(0.96, {
      damping: 15,
      stiffness: 150,
    });
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
    });
  };
  
  const handlePress = () => {
    if (!loading && !disabled) {
      onPress();
    }
  };
  
  const resolvedLoading = loading || isLoading;
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isSuccess = variant === 'success';
  const isDanger = variant === 'danger';
  const isDisabled = disabled || resolvedLoading;
  
  return (
    <AnimatedTouchable
      style={[
        styles.button,
        isPrimary && styles.buttonPrimary,
        isSecondary && styles.buttonSecondary,
        isSuccess && styles.buttonSuccess,
        isDanger && styles.buttonDanger,
        isDisabled && styles.buttonDisabled,
        animatedStyle,
        style,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      disabled={isDisabled}
    >
      {resolvedLoading ? (
        <ActivityIndicator color={isPrimary || isSuccess || isDanger ? colors.text.inverse : colors.primary.main} />
      ) : (
        <View style={styles.content}>
          {icon && (
            <View style={styles.icon}>
              {icon}
            </View>
          )}
          <Text style={[
            styles.buttonText,
            (isPrimary || isSuccess || isDanger) ? styles.buttonTextPrimary : styles.buttonTextSecondary,
          ]}>
            {children || title}
          </Text>
        </View>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  
  buttonPrimary: {
    backgroundColor: colors.primary.main,
  },
  
  buttonSecondary: {
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  buttonSuccess: {
    backgroundColor: colors.success,
  },
  buttonDanger: {
    backgroundColor: colors.error,
  },
  
  buttonDisabled: {
    opacity: 0.5,
  },
  
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  
  buttonTextPrimary: {
    color: colors.text.inverse,
  },
  
  buttonTextSecondary: {
    color: colors.primary.main,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.sm,
  },
});
