/**
 * LockScreen — 6 digit PIN entry
 * Used for:
 *  1. Setting PIN after first registration
 *  2. Unlocking app when returning from background
 *  3. Changing PIN from settings
 *
 * Props:
 *  mode: 'set' | 'verify' | 'change'
 *  onSuccess: () => void
 *  onBack?: () => void — only for 'change' mode
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, StatusBar,
  Dimensions, Vibration,
} from 'react-native';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useAnimatedStyle, useSharedValue, withSequence, withTiming,
  withSpring, withDelay, Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { savePin, verifyPin } from '../services/lockScreenService';
import * as LocalAuthentication from 'expo-local-authentication';
import { spacing } from '../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GOLD = '#FFC107';
const GOLD_DARK = '#FFA000';
const NAVY = '#1a237e';
const NAVY_LIGHT = '#283593';
const PIN_LENGTH = 6;

type LockScreenMode = 'set' | 'confirm' | 'verify' | 'change_old' | 'change_new' | 'change_confirm';

interface LockScreenProps {
  mode: 'set' | 'verify' | 'change';
  onSuccess: () => void;
  onBack?: () => void;
}

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'delete'],
];

export default function LockScreen({ mode, onSuccess, onBack }: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [currentMode, setCurrentMode] = useState<LockScreenMode>(
    mode === 'set' ? 'set' : mode === 'verify' ? 'verify' : 'change_old'
  );
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const shakeX = useSharedValue(0);
  const dotScales = useRef(Array.from({ length: PIN_LENGTH }, () => useSharedValue(0))).current;

  // Lock timer countdown
  useEffect(() => {
    if (lockTimer > 0) {
      const interval = setInterval(() => {
        setLockTimer(prev => {
          if (prev <= 1) {
            setLocked(false);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockTimer]);

  // Biometric: check availability and auto-prompt when in verify mode
  useEffect(() => {
    if (mode !== 'verify') return;
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        setBiometricAvailable(true);
        // Auto-trigger biometric prompt when the screen opens
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock TrustConnect',
          fallbackLabel: 'Use PIN',
          disableDeviceFallback: false,
        });
        if (result.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSuccess();
        }
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate dots when pin changes
  useEffect(() => {
    dotScales.forEach((scale, i) => {
      if (i < pin.length) {
        scale.value = withSpring(1, { damping: 8, stiffness: 200 });
      } else {
        scale.value = withTiming(0, { duration: 150 });
      }
    });
  }, [pin]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-4, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  };

  const triggerBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock TrustConnect',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAttempts(0);
        onSuccess();
      }
    } catch {
      // Biometric failed silently — user can still enter PIN
    }
  };

  const handleKeyPress = async (key: string) => {
    if (locked) return;

    if (key === 'delete') {
      setPin(prev => prev.slice(0, -1));
      setError('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    if (pin.length >= PIN_LENGTH) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      // PIN complete — process based on mode
      setTimeout(() => processPin(newPin), 200);
    }
  };

  const processPin = async (enteredPin: string) => {
    switch (currentMode) {
      case 'set':
        setFirstPin(enteredPin);
        setPin('');
        setCurrentMode('confirm');
        setError('');
        break;

      case 'confirm':
        if (enteredPin === firstPin) {
          await savePin(enteredPin);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSuccess();
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          triggerShake();
          setError('PINs do not match. Try again.');
          setPin('');
          setFirstPin('');
          setCurrentMode('set');
        }
        break;

      case 'verify':
        const valid = await verifyPin(enteredPin);
        if (valid) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setAttempts(0);
          onSuccess();
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          triggerShake();
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          if (newAttempts >= 5) {
            setLocked(true);
            setLockTimer(30);
            setError('Too many attempts. Try again in 30 seconds.');
          } else {
            setError(`Incorrect PIN. ${5 - newAttempts} attempts remaining.`);
          }
          setPin('');
        }
        break;

      case 'change_old':
        const oldValid = await verifyPin(enteredPin);
        if (oldValid) {
          setPin('');
          setCurrentMode('change_new');
          setError('');
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          triggerShake();
          setError('Incorrect current PIN');
          setPin('');
        }
        break;

      case 'change_new':
        setFirstPin(enteredPin);
        setPin('');
        setCurrentMode('change_confirm');
        setError('');
        break;

      case 'change_confirm':
        if (enteredPin === firstPin) {
          await savePin(enteredPin);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSuccess();
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          triggerShake();
          setError('PINs do not match. Try again.');
          setPin('');
          setFirstPin('');
          setCurrentMode('change_new');
        }
        break;
    }
  };

  const getTitle = (): string => {
    switch (currentMode) {
      case 'set': return 'Create Your PIN';
      case 'confirm': return 'Confirm Your PIN';
      case 'verify': return 'Enter Your PIN';
      case 'change_old': return 'Current PIN';
      case 'change_new': return 'New PIN';
      case 'change_confirm': return 'Confirm New PIN';
    }
  };

  const getSubtitle = (): string => {
    switch (currentMode) {
      case 'set': return 'Set a 6-digit PIN to secure your account';
      case 'confirm': return 'Enter the same PIN again to confirm';
      case 'verify': return 'Enter your 6-digit PIN to continue';
      case 'change_old': return 'Enter your current PIN';
      case 'change_new': return 'Enter your new 6-digit PIN';
      case 'change_confirm': return 'Confirm your new PIN';
    }
  };

  const getIcon = (): keyof typeof MaterialCommunityIcons.glyphMap => {
    switch (currentMode) {
      case 'set':
      case 'confirm': return 'shield-lock-outline';
      case 'verify': return 'lock-outline';
      case 'change_old':
      case 'change_new':
      case 'change_confirm': return 'lock-reset';
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[NAVY, NAVY_LIGHT, '#1e3078']}
        style={styles.container}
      >
        {/* Back button for change mode */}
        {onBack && (
          <Animated.View entering={FadeIn.delay(100)} style={styles.backBtnContainer}>
            <Pressable onPress={onBack} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        )}

        {/* Icon */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name={getIcon()} size={40} color={GOLD} />
          </View>
        </Animated.View>

        {/* Title & Subtitle */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.headerSection}>
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.subtitle}>{getSubtitle()}</Text>
        </Animated.View>

        {/* PIN Dots */}
        <Animated.View style={[styles.dotsRow, shakeStyle]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => {
            const dotStyle = useAnimatedStyle(() => ({
              transform: [{ scale: dotScales[i].value }],
            }));
            return (
              <View key={i} style={styles.dotOuter}>
                <Animated.View style={[styles.dotFilled, dotStyle]} />
              </View>
            );
          })}
        </Animated.View>

        {/* Error */}
        {error ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#FF5252" />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        ) : null}

        {/* Lock timer */}
        {locked && (
          <Text style={styles.lockTimerText}>
            Locked for {lockTimer}s
          </Text>
        )}

        {/* Keypad */}
        <View style={styles.keypad}>
          {KEYPAD.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.keypadRow}>
              {row.map((key) => {
                if (key === '') {
                  // Show biometric button in verify mode, otherwise empty space
                  if (currentMode === 'verify' && biometricAvailable) {
                    return (
                      <Pressable
                        key="biometric"
                        style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                        onPress={triggerBiometric}
                      >
                        <MaterialCommunityIcons name="fingerprint" size={28} color={GOLD} />
                      </Pressable>
                    );
                  }
                  return <View key="empty" style={styles.keyPlaceholder} />;
                }
                if (key === 'delete') {
                  return (
                    <Pressable
                      key="delete"
                      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                      onPress={() => handleKeyPress('delete')}
                    >
                      <MaterialCommunityIcons name="backspace-outline" size={26} color="#FFFFFF" />
                    </Pressable>
                  );
                }
                return (
                  <Pressable
                    key={key}
                    style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                    onPress={() => handleKeyPress(key)}
                  >
                    <Text style={styles.keyText}>{key}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Brand footer */}
        <Animated.View entering={FadeIn.delay(800)} style={styles.footer}>
          <MaterialCommunityIcons name="shield-check" size={14} color="rgba(255,255,255,0.3)" />
          <Text style={styles.footerText}>TrustConnect • Secured</Text>
        </Animated.View>
      </LinearGradient>
    </>
  );
}

const KEY_SIZE = Math.min((SCREEN_WIDTH - 120) / 3, 72);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  backBtnContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 44,
    left: spacing.md,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,193,7,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,193,7,0.25)',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl + spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: spacing.lg,
  },
  dotOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotFilled: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GOLD,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,82,82,0.12)',
    borderRadius: 8,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 13,
    fontWeight: '500',
  },
  lockTimerText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  keypad: {
    gap: 12,
    marginTop: spacing.md,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  keyPressed: {
    backgroundColor: 'rgba(255,193,7,0.2)',
    borderColor: GOLD,
  },
  keyPlaceholder: {
    width: KEY_SIZE,
    height: KEY_SIZE,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
});
