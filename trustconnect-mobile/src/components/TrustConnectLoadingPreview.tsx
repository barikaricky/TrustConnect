import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const BRAND = {
  deepNavy: '#1a2742',
  primaryBlue: '#2c3e67',
  accentBlue: '#5874c4',
  softGray: '#f5f7fa',
  white: '#ffffff',
};

const CYCLE_DURATION = 3400;

type Props = {
  loop?: boolean;
  onFinish?: () => void;
  inline?: boolean;
};

function WorkerCharacter() {
  return (
    <View style={styles.characterBody}>
      <View style={styles.workerHelmet}>
        <View style={styles.helmetBrim} />
      </View>
      <View style={styles.workerHead} />
      <View style={[styles.neck, styles.workerNeck]} />
      <View style={[styles.arm, styles.workerArmLeft]} />
      <View style={[styles.arm, styles.workerArmRight]} />
      <View style={[styles.torso, styles.workerTorso]}>
        <View style={styles.shirtSeam} />
        <View style={styles.pocket} />
      </View>
      <View style={styles.workerBelt} />
      <View style={[styles.leg, styles.leftLeg, styles.workerLeg]} />
      <View style={[styles.leg, styles.rightLeg, styles.workerLeg]} />
      <View style={[styles.boot, styles.leftBoot]} />
      <View style={[styles.boot, styles.rightBoot]} />
      <View style={styles.toolHandle} />
      <View style={styles.toolHead} />
    </View>
  );
}

function ClientCharacter() {
  return (
    <View style={styles.characterBody}>
      <View style={styles.clientHair} />
      <View style={styles.clientHead} />
      <View style={[styles.neck, styles.clientNeck]} />
      <View style={[styles.arm, styles.clientArmLeft]} />
      <View style={[styles.arm, styles.clientArmRight]} />
      <View style={[styles.torso, styles.clientTorso]} />
      <View style={[styles.leg, styles.leftLeg, styles.clientLeg]} />
      <View style={[styles.leg, styles.rightLeg, styles.clientLeg]} />
      <View style={[styles.boot, styles.leftBoot]} />
      <View style={[styles.boot, styles.rightBoot]} />
      <View style={styles.phone}>
        <View style={styles.phoneScreen} />
      </View>
      <View style={styles.homeCue}>
        <View style={styles.homeDoor} />
      </View>
    </View>
  );
}

export default function TrustConnectLoadingPreview({
  loop = true,
  onFinish,
  inline = false,
}: Props) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [runId, setRunId] = useState(0);

  const workerX = useRef(new Animated.Value(-28)).current;
  const clientX = useRef(new Animated.Value(28)).current;
  const workerOpacity = useRef(new Animated.Value(0)).current;
  const clientOpacity = useRef(new Animated.Value(0)).current;
  const connectionScale = useRef(new Animated.Value(0)).current;
  const connectionOpacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const ambientOpacity = useRef(new Animated.Value(0)).current;
  const ambientScale = useRef(new Animated.Value(0.7)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandY = useRef(new Animated.Value(14)).current;
  const brandScale = useRef(new Animated.Value(0.96)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    const updateMotionPreference = (value: boolean) => {
      if (mounted) setReducedMotion(value);
    };
    AccessibilityInfo.isReduceMotionEnabled().then(updateMotionPreference);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      updateMotionPreference
    );
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    const duration = reducedMotion ? 1200 : CYCLE_DURATION;
    const timing = (value: Animated.Value, toValue: number, fraction: number) =>
      Animated.timing(value, {
        toValue,
        duration: duration * fraction,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      });

    const reset = Animated.parallel([
      Animated.timing(workerX, { toValue: -28, duration: 1, useNativeDriver: true }),
      Animated.timing(clientX, { toValue: 28, duration: 1, useNativeDriver: true }),
      Animated.timing(workerOpacity, { toValue: 0, duration: 1, useNativeDriver: true }),
      Animated.timing(clientOpacity, { toValue: 0, duration: 1, useNativeDriver: true }),
      Animated.timing(connectionScale, { toValue: 0, duration: 1, useNativeDriver: true }),
      Animated.timing(connectionOpacity, { toValue: 0, duration: 1, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1, useNativeDriver: true }),
      Animated.timing(ambientOpacity, { toValue: 0, duration: 1, useNativeDriver: true }),
      Animated.timing(ambientScale, { toValue: 0.7, duration: 1, useNativeDriver: true }),
      Animated.timing(brandOpacity, { toValue: 0, duration: 1, useNativeDriver: true }),
      Animated.timing(brandY, { toValue: 14, duration: 1, useNativeDriver: true }),
      Animated.timing(brandScale, { toValue: 0.96, duration: 1, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration: 1, useNativeDriver: true }),
    ]);

    const sequence = Animated.sequence([
      reset,
      Animated.delay(duration * 0.07),
      Animated.parallel([
        timing(workerX, 0, 0.11),
        timing(clientX, 0, 0.11),
        timing(workerOpacity, 1, 0.11),
        timing(clientOpacity, 1, 0.11),
      ]),
      Animated.delay(duration * 0.07),
      Animated.parallel([
        timing(connectionScale, 1, 0.18),
        timing(connectionOpacity, 1, 0.12),
        timing(progress, 0.55, 0.34),
      ]),
      Animated.parallel([
        timing(pulse, 1, 0.18),
        timing(ambientOpacity, 1, 0.1),
        timing(ambientScale, 1, 0.2),
      ]),
      Animated.parallel([
        timing(brandOpacity, 1, 0.12),
        timing(brandY, 0, 0.12),
        timing(brandScale, 1, 0.12),
      ]),
      timing(progress, 1, 0.18),
      Animated.delay(duration * 0.09),
    ]);

    const animation = loop ? Animated.loop(sequence, { iterations: -1 }) : sequence;
    animation.start(({ finished }) => {
      if (finished) onFinish?.();
    });
    return () => animation.stop();
  }, [
    loop,
    onFinish,
    reducedMotion,
    runId,
    workerX,
    clientX,
    workerOpacity,
    clientOpacity,
    connectionScale,
    connectionOpacity,
    pulse,
    ambientOpacity,
    ambientScale,
    brandOpacity,
    brandY,
    brandScale,
    progress,
  ]);

  const replayAnimation = () => setRunId((current) => current + 1);
  const sceneWidth = Math.min(windowWidth - 48, 360);
  const sceneHeight = inline ? 300 : Math.min(Math.max(windowHeight * 0.57, 340), 390);
  const progressTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-48, 118],
  });

  return (
    <View style={inline ? styles.inlineScreen : styles.screen}>
      <LinearGradient
        colors={[BRAND.white, '#f7f9fc']}
        style={[styles.splash, inline && styles.inlineSplash]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ambient,
            inline && styles.inlineAmbient,
            {
              opacity: ambientOpacity,
              transform: [{ scale: ambientScale }],
            },
          ]}
        />

        <View style={[styles.scene, { width: sceneWidth, height: sceneHeight }]}>
          <Animated.View
            style={[
              styles.worker,
              inline && styles.inlineWorker,
              {
                opacity: workerOpacity,
                transform: [{ translateX: workerX }, { scale: inline ? 0.72 : 1 }],
              },
            ]}
          >
            <WorkerCharacter />
          </Animated.View>

          <Animated.View
            style={[
              styles.client,
              inline && styles.inlineClient,
              {
                opacity: clientOpacity,
                transform: [{ translateX: clientX }, { scale: inline ? 0.72 : 1 }],
              },
            ]}
          >
            <ClientCharacter />
          </Animated.View>

          <View style={[styles.connection, inline && styles.inlineConnection]}>
            <Animated.View
              style={[
                styles.connectionStroke,
                {
                  opacity: connectionOpacity,
                  transform: [{ scaleX: connectionScale }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.connectionPulse,
                {
                  opacity: connectionOpacity,
                  transform: [
                    {
                      translateX: pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: inline ? [-78, 78] : [-92, 92],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>

          <Animated.View
            style={[
              styles.brand,
              inline && styles.inlineBrand,
              {
                opacity: brandOpacity,
                transform: [
                  { translateY: brandY },
                  { scale: brandScale },
                  { scale: inline ? 0.78 : 1 },
                ],
              },
            ]}
          >
            <View style={styles.logo}>
              <View style={[styles.logoLink, styles.logoLinkFirst]} />
              <View style={[styles.logoLink, styles.logoLinkSecond]} />
            </View>
            <Text style={styles.brandName}>
              <Text style={styles.brandTrust}>Trust</Text>
              <Text style={styles.brandConnect}>Connect</Text>
            </Text>
            <Text style={styles.tagline}>Connecting skills to opportunity.</Text>
          </Animated.View>
        </View>

        <View style={[styles.progressTrack, inline && styles.inlineProgressTrack]}>
          <Animated.View
            style={[
              styles.progressBar,
              { transform: [{ translateX: progressTranslate }] },
            ]}
          />
        </View>

        {loop && !inline && (
          <Pressable accessibilityRole="button" onPress={replayAnimation} style={styles.replay}>
            <Text style={styles.replayText}>Replay</Text>
          </Pressable>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  inlineScreen: {
    width: '100%',
    height: 300,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e9edf3',
  },
  splash: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    minHeight: 620,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND.white,
  },
  inlineSplash: {
    flex: 1,
    minHeight: 0,
    borderRadius: 20,
    backgroundColor: BRAND.white,
  },
  ambient: {
    position: 'absolute',
    top: '25%',
    width: 300,
    height: 220,
    borderRadius: 180,
    backgroundColor: 'rgba(88, 116, 196, 0.11)',
  },
  inlineAmbient: {
    top: 6,
    width: 250,
    height: 150,
  },
  scene: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  worker: {
    position: 'absolute',
    zIndex: 3,
    left: 0,
    top: 52,
    width: 112,
    height: 170,
  },
  inlineWorker: {
    top: 8,
  },
  client: {
    position: 'absolute',
    zIndex: 3,
    right: 0,
    top: 52,
    width: 112,
    height: 170,
  },
  inlineClient: {
    top: 8,
  },
  characterBody: {
    position: 'absolute',
    width: 112,
    height: 170,
    alignItems: 'center',
  },
  workerHead: {
    position: 'absolute',
    top: 17,
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: '#d6a27d',
    zIndex: 2,
  },
  workerHelmet: {
    position: 'absolute',
    top: 0,
    zIndex: 4,
    width: 49,
    height: 29,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: BRAND.accentBlue,
  },
  helmetBrim: {
    position: 'absolute',
    bottom: 0,
    left: -4,
    width: 57,
    height: 6,
    borderRadius: 4,
    backgroundColor: BRAND.primaryBlue,
  },
  clientHead: {
    position: 'absolute',
    top: 17,
    zIndex: 2,
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: '#c99270',
  },
  clientHair: {
    position: 'absolute',
    zIndex: 3,
    top: 10,
    width: 42,
    height: 25,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 22,
    backgroundColor: '#2f3540',
  },
  neck: {
    position: 'absolute',
    top: 49,
    width: 17,
    height: 15,
  },
  workerNeck: { backgroundColor: '#c38c69' },
  clientNeck: { backgroundColor: '#b98162' },
  torso: {
    position: 'absolute',
    top: 58,
    width: 66,
    height: 61,
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,
  },
  workerTorso: {
    backgroundColor: BRAND.deepNavy,
    borderBottomWidth: 9,
    borderBottomColor: BRAND.accentBlue,
  },
  clientTorso: {
    backgroundColor: BRAND.white,
    borderWidth: 2,
    borderColor: '#d9e0eb',
  },
  shirtSeam: {
    position: 'absolute',
    top: 8,
    bottom: 3,
    left: 32,
    width: 2,
    backgroundColor: BRAND.accentBlue,
  },
  pocket: {
    position: 'absolute',
    left: 9,
    top: 18,
    width: 12,
    height: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  arm: {
    position: 'absolute',
    top: 64,
    zIndex: 1,
    width: 14,
    height: 51,
    borderRadius: 8,
  },
  workerArmLeft: {
    left: 20,
    backgroundColor: BRAND.primaryBlue,
    transform: [{ rotate: '24deg' }],
  },
  workerArmRight: {
    right: 20,
    backgroundColor: BRAND.deepNavy,
    transform: [{ rotate: '-24deg' }],
  },
  clientArmLeft: {
    left: 19,
    backgroundColor: BRAND.white,
    borderWidth: 2,
    borderColor: '#d9e0eb',
    transform: [{ rotate: '24deg' }],
  },
  clientArmRight: {
    right: 19,
    backgroundColor: BRAND.white,
    borderWidth: 2,
    borderColor: '#d9e0eb',
    transform: [{ rotate: '-24deg' }],
  },
  workerBelt: {
    position: 'absolute',
    top: 111,
    zIndex: 2,
    width: 62,
    height: 10,
    backgroundColor: BRAND.accentBlue,
  },
  leg: {
    position: 'absolute',
    top: 115,
    width: 22,
    height: 44,
  },
  leftLeg: { left: 36 },
  rightLeg: { right: 36 },
  workerLeg: { backgroundColor: '#303d55' },
  clientLeg: { backgroundColor: BRAND.primaryBlue },
  boot: {
    position: 'absolute',
    top: 158,
    width: 25,
    height: 8,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: BRAND.deepNavy,
  },
  leftBoot: { left: 34 },
  rightBoot: { right: 34 },
  toolHandle: {
    position: 'absolute',
    right: 1,
    top: 95,
    zIndex: 5,
    width: 7,
    height: 29,
    borderRadius: 3,
    backgroundColor: BRAND.deepNavy,
  },
  toolHead: {
    position: 'absolute',
    right: -4,
    top: 91,
    zIndex: 5,
    width: 19,
    height: 12,
    borderRadius: 3,
    backgroundColor: BRAND.accentBlue,
  },
  phone: {
    position: 'absolute',
    top: 100,
    left: 7,
    zIndex: 6,
    width: 15,
    height: 27,
    padding: 3,
    borderRadius: 3,
    backgroundColor: BRAND.deepNavy,
  },
  phoneScreen: {
    flex: 1,
    borderRadius: 1,
    backgroundColor: BRAND.accentBlue,
  },
  homeCue: {
    position: 'absolute',
    right: -2,
    top: 42,
    zIndex: 5,
    width: 25,
    height: 24,
    borderTopLeftRadius: 2,
    backgroundColor: BRAND.accentBlue,
    transform: [{ rotate: '45deg' }],
  },
  homeDoor: {
    position: 'absolute',
    bottom: 0,
    left: 9,
    width: 7,
    height: 12,
    backgroundColor: BRAND.white,
    transform: [{ rotate: '-45deg' }],
  },
  connection: {
    position: 'absolute',
    top: 124,
    left: '50%',
    width: 208,
    height: 70,
    marginLeft: -104,
    justifyContent: 'center',
    zIndex: 2,
  },
  inlineConnection: {
    top: 76,
    width: 180,
    marginLeft: -90,
  },
  connectionStroke: {
    width: '100%',
    height: 3,
    borderRadius: 3,
    backgroundColor: BRAND.accentBlue,
    shadowColor: BRAND.accentBlue,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 1 },
  },
  connectionPulse: {
    position: 'absolute',
    left: '50%',
    top: 28,
    width: 13,
    height: 13,
    marginLeft: -6,
    borderRadius: 7,
    backgroundColor: BRAND.accentBlue,
    borderWidth: 4,
    borderColor: '#e4e9f7',
  },
  brand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 230,
    alignItems: 'center',
    zIndex: 5,
  },
  inlineBrand: {
    top: 166,
  },
  logo: {
    width: 58,
    height: 58,
    marginBottom: 13,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.primaryBlue,
    shadowColor: BRAND.primaryBlue,
    shadowOpacity: 0.18,
    shadowRadius: 17,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  logoLink: {
    position: 'absolute',
    width: 29,
    height: 9,
    borderRadius: 9,
    backgroundColor: BRAND.white,
  },
  logoLinkFirst: { transform: [{ rotate: '45deg' }] },
  logoLinkSecond: { transform: [{ rotate: '-45deg' }] },
  brandName: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -1.4,
  },
  brandTrust: { color: BRAND.deepNavy },
  brandConnect: { color: BRAND.primaryBlue },
  tagline: {
    marginTop: 10,
    color: '#667085',
    fontSize: 13,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  progressTrack: {
    position: 'absolute',
    bottom: 40,
    left: '50%',
    width: 118,
    height: 3,
    marginLeft: -59,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#e1e6ef',
  },
  inlineProgressTrack: {
    bottom: 10,
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    width: 48,
    height: 3,
    borderRadius: 20,
    backgroundColor: BRAND.accentBlue,
  },
  replay: {
    position: 'absolute',
    bottom: 62,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(42, 62, 103, 0.07)',
  },
  replayText: {
    color: BRAND.deepNavy,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
});
