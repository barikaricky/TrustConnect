import { StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from './theme';

/**
 * Global styles for consistent UI across the app
 * Following professional, minimal design principles
 */

export const globalStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  
  containerCentered: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  
  // Screen padding
  screenPadding: {
    padding: spacing.lg,
  },
  
  // Text styles
  heading1: {
    fontSize: typography.fontSize.display,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    lineHeight: typography.fontSize.display * typography.lineHeight.tight,
    marginBottom: spacing.md,
  },
  
  heading2: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    lineHeight: typography.fontSize.xxxl * typography.lineHeight.tight,
    marginBottom: spacing.md,
  },
  
  heading3: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    lineHeight: typography.fontSize.xxl * typography.lineHeight.normal,
    marginBottom: spacing.sm,
  },
  
  subtitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.lg * typography.lineHeight.normal,
    marginBottom: spacing.sm,
  },
  
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.regular,
    color: colors.text.primary,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  
  bodySecondary: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.regular,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  
  caption: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.text.tertiary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  
  // Card styles
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  
  cardHeader: {
    marginBottom: spacing.md,
  },
  
  // Button styles
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  buttonPrimary: {
    backgroundColor: colors.primary.main,
  },
  
  buttonSecondary: {
    backgroundColor: colors.neutral.lightGray,
  },
  
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.inverse,
  },
  
  buttonTextSecondary: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  
  // Spacing utilities
  mb8: { marginBottom: spacing.sm },
  mb16: { marginBottom: spacing.md },
  mb24: { marginBottom: spacing.lg },
  mb32: { marginBottom: spacing.xl },
  
  mt8: { marginTop: spacing.sm },
  mt16: { marginTop: spacing.md },
  mt24: { marginTop: spacing.lg },
  mt32: { marginTop: spacing.xl },
  
  // Flex utilities
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  flexBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  flexCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
