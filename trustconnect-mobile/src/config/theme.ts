/**
 * TrustConnect Design System
 * 
 * Professional, trustworthy, minimal design language
 * Dark blue tones with neutral backgrounds
 */

export const colors = {
  // Primary palette - Dark blues for trust and professionalism
  primary: {
    dark: '#1a2742',      // Deep navy blue
    main: '#2c3e67',      // Main brand blue
    medium: '#3d5a9b',    // Medium blue
    light: '#5874c4',     // Light blue for accents
  },
  
  // Secondary palette - Accent colors
  secondary: {
    main: '#5874c4',      // Secondary accent color
    light: '#7a92d4',     // Light secondary
    dark: '#3d5a9b',      // Dark secondary
  },
  
  // Neutral palette - Clean backgrounds and text
  neutral: {
    white: '#ffffff',
    offWhite: '#f8f9fb',
    lightGray: '#e8eaef',
    gray: '#a8adb7',
    darkGray: '#6b7280',
    charcoal: '#3f4451',
    black: '#1f2128',
  },
  
  // Semantic colors
  success: '#2d7a4f',
  warning: '#c97c28',
  error: '#c53030',
  info: '#3d5a9b',
  
  // Backgrounds
  background: {
    primary: '#ffffff',
    secondary: '#f8f9fb',
    tertiary: '#e8eaef',
  },
  
  // Text colors
  text: {
    primary: '#1f2128',
    secondary: '#3f4451',
    tertiary: '#6b7280',
    inverse: '#ffffff',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const typography = {
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
  
  // Font weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Typography shortcuts
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 38,
    color: '#1f2128',
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 30,
    color: '#1f2128',
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
    color: '#1f2128',
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: '#1f2128',
  },
  small: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: '#6b7280',
  },
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
};

export type Theme = typeof theme;
