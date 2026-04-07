/**
 * EmptyState — Reusable empty state view with icon, title, subtitle, and optional action
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

const NAVY = '#1a237e';

interface EmptyStateProps {
  icon?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: object;
}

export default function EmptyState({
  icon = 'inbox-outline',
  iconColor = '#CFD8DC',
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={[styles.container, style]}>
      <MaterialCommunityIcons name={icon as any} size={56} color={iconColor} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction}>
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#546E7A',
    marginTop: 14,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#90A4AE',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: 18,
    backgroundColor: NAVY,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 22,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
