import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, Image, Pressable,
  useWindowDimensions, ScrollView, Platform,
} from 'react-native';
import { openURL } from 'expo-linking';
import Animated, {
  FadeInDown, FadeInUp, FadeIn, SlideInLeft, SlideInRight, ZoomIn,
  useAnimatedStyle, useSharedValue, withRepeat, withSequence,
  withTiming, withDelay, withSpring, Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, typography } from '../config/theme';

const GOLD = '#FFC107';
const GOLD_LIGHT = '#FFE082';
const GOLD_DARK = '#FF8F00';
const NAVY = '#1a237e';
const NAVY_LIGHT = '#283593';
const NAVY_MID = '#3949AB';

interface WelcomeScreenProps {
  onHirePress: () => void;
  onRegisterPress: () => void;
  onCompanyPress: () => void;
  onLoginPress: () => void;
}

// Featured artisans (Nigerian names + services)
const ARTISANS = [
  { initials: 'EO', name: 'Emeka O.', service: 'Electrician',    svcIcon: 'lightning-bolt' as const,  rating: '4.9', color: '#E65100', jobs: '142', image: 'https://i.pravatar.cc/200?img=12' },
  { initials: 'BF', name: 'Bisi F.',  service: 'Interior Design', svcIcon: 'floor-lamp' as const,       rating: '4.8', color: '#6A1B9A', jobs: '98',  image: 'https://i.pravatar.cc/200?img=32' },
  { initials: 'KA', name: 'Kunle A.', service: 'Plumber',         svcIcon: 'pipe-wrench' as const,      rating: '5.0', color: '#0D47A1', jobs: '203', image: 'https://i.pravatar.cc/200?img=53' },
  { initials: 'AN', name: 'Ada N.',   service: 'Fashion/Tailor',  svcIcon: 'content-cut' as const,      rating: '4.9', color: '#880E4F', jobs: '167', image: 'https://i.pravatar.cc/200?img=25' },
  { initials: 'TM', name: 'Tunde M.', service: 'Carpenter',       svcIcon: 'hammer' as const,           rating: '4.7', color: '#4E342E', jobs: '89',  image: 'https://i.pravatar.cc/200?img=59' },
  { initials: 'CN', name: 'Chidi N.', service: 'AC Technician',   svcIcon: 'snowflake' as const,        rating: '4.8', color: '#006064', jobs: '114', image: 'https://i.pravatar.cc/200?img=60' },
];

const SERVICES = [
  { icon: 'lightning-bolt' as const,   label: 'Electrician',    color: '#FF9800' },
  { icon: 'pipe-wrench' as const,       label: 'Plumbing',       color: '#2196F3' },
  { icon: 'hammer' as const,            label: 'Carpentry',      color: '#795548' },
  { icon: 'format-paint' as const,      label: 'Painting',       color: '#9C27B0' },
  { icon: 'snowflake' as const,         label: 'AC Repair',      color: '#00BCD4' },
  { icon: 'content-cut' as const,       label: 'Tailoring',      color: '#E91E63' },
  { icon: 'broom' as const,             label: 'Cleaning',       color: '#4CAF50' },
  { icon: 'truck' as const,             label: 'Movers',         color: '#FF5722' },
];

const STEPS = [
  { icon: 'magnify' as const,      num: '1', title: 'Search',   desc: 'Browse verified professionals near you' },
  { icon: 'handshake' as const,    num: '2', title: 'Book',     desc: 'Request, negotiate, & confirm the job' },
  { icon: 'shield-check' as const, num: '3', title: 'Pay Safe', desc: 'Escrow holds funds until you\'re satisfied' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Artisan card with real photo + fallback to initials
function ArtisanCard({ artisan: a, idx, shimmerStyle }: { artisan: typeof ARTISANS[0]; idx: number; shimmerStyle: any }) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <Animated.View
      entering={FadeInDown.delay(450 + idx * 90).springify()}
      style={styles.artisanCard}
    >
      <LinearGradient
        colors={[a.color + 'FF', a.color + 'AA', NAVY_MID + 'DD']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1.2 }}
        style={styles.artisanPhotoArea}
      >
        <View style={styles.artisanPhotoBgCircle} />
        {!imgFailed && a.image ? (
          <Image
            source={{ uri: a.image }}
            style={styles.artisanAvatarImage}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <View style={styles.artisanAvatarLarge}>
            <Text style={styles.artisanInitialsLarge}>{a.initials}</Text>
          </View>
        )}
        <View style={styles.artisanSvcBadge}>
          <MaterialCommunityIcons name={a.svcIcon} size={12} color="#FFFFFF" />
        </View>
        <View style={styles.onlineDot} />
        {idx === 0 && <Animated.View style={[styles.shimmer, shimmerStyle]} />}
      </LinearGradient>
      <View style={styles.artisanInfoStrip}>
        <Text style={styles.artisanName}>{a.name}</Text>
        <Text style={styles.artisanServiceLabel}>{a.service}</Text>
        <View style={styles.artisanMeta}>
          <MaterialCommunityIcons name="star" size={10} color={GOLD} />
          <Text style={styles.artisanRating}>{a.rating}</Text>
          <Text style={styles.artisanJobs}> · {a.jobs}j</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// A free-to-use carpenter work sample video
const CARPENTER_VIDEO_URI =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

export default function WelcomeScreen({ onHirePress, onRegisterPress, onCompanyPress, onLoginPress }: WelcomeScreenProps) {
  const { width } = useWindowDimensions();
  // Brand card animation values
  const endLogoScale   = useSharedValue(0.3);
  const endLogoOpacity = useSharedValue(0);
  const endTextOpacity = useSharedValue(0);
  const endRingScale   = useSharedValue(0.6);

  const triggerEndCard = () => {
    endLogoOpacity.value = withTiming(1, { duration: 400 });
    endLogoScale.value   = withSpring(1, { damping: 10, stiffness: 120 });
    endRingScale.value   = withSequence(
      withTiming(1.4, { duration: 600, easing: Easing.out(Easing.exp) }),
      withTiming(1,   { duration: 400 }),
    );
    endTextOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
  };

  const endLogoStyle = useAnimatedStyle(() => ({
    opacity: endLogoOpacity.value,
    transform: [{ scale: endLogoScale.value }],
  }));
  const endRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: endRingScale.value }],
    opacity: endLogoOpacity.value,
  }));
  const endTextStyle = useAnimatedStyle(() => ({ opacity: endTextOpacity.value }));

  const handleVideoPress = () => {
    openURL(CARPENTER_VIDEO_URI);
  };

  // Pulse glow animation
  const glowOpacity  = useSharedValue(0.4);
  const glowScale    = useSharedValue(1);
  const floatY       = useSharedValue(0);
  const shimmerX     = useSharedValue(-200);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(withTiming(0.85, { duration: 2200 }), withTiming(0.4, { duration: 2200 })),
      -1, false,
    );
    glowScale.value = withRepeat(
      withSequence(withTiming(1.18, { duration: 2400 }), withTiming(1, { duration: 2400 })),
      -1, false,
    );
    floatY.value = withRepeat(
      withSequence(withTiming(-10, { duration: 2000 }), withTiming(0, { duration: 2000 })),
      -1, false,
    );
    shimmerX.value = withRepeat(
      withDelay(1200, withTiming(width + 200, { duration: 2000 })),
      -1, false,
    );
    // Animate TrustConnect brand card in after mount
    const brandTimer = setTimeout(triggerEndCard, 1600);
    return () => clearTimeout(brandTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glowStyle  = useAnimatedStyle(() => ({ opacity: glowOpacity.value, transform: [{ scale: glowScale.value }] }));
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: floatY.value }] }));
  const shimmerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shimmerX.value }] }));

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Full-screen gradient background */}
      <LinearGradient
        colors={[NAVY, '#1E2D8B', NAVY_LIGHT, '#1F3A8F']}
        locations={[0, 0.35, 0.7, 1]}
        style={styles.container}
      >
        {/* Decorative blobs */}
        <Animated.View style={[styles.blob1, glowStyle]} pointerEvents="none" />
        <Animated.View style={[styles.blob2, { opacity: 0.25 }]} pointerEvents="none" />
        <View style={styles.dotGrid} pointerEvents="none">
          {Array.from({ length: 35 }).map((_, i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ─── TOP BAR ─── */}
          <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.logoShield}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.brandText}>
                <Text style={styles.brandName}>TrustConnect</Text>
                <Text style={styles.brandTagline}>Nigeria's #1 Artisan Platform</Text>
              </View>
            </View>
            <Pressable onPress={onLoginPress} style={styles.signInPill}>
              <Text style={styles.signInPillText}>Sign In</Text>
              <MaterialCommunityIcons name="arrow-right" size={14} color={GOLD} />
            </Pressable>
          </Animated.View>

          {/* ─── HERO ─── */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.hero}>
            {/* Verified badge */}
            <Animated.View entering={ZoomIn.delay(350).springify()} style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="shield-check" size={13} color={GOLD} />
              <Text style={styles.verifiedBadgeText}>100% NIN-Verified Professionals</Text>
              <View style={styles.badgeDot} />
              <Text style={styles.verifiedBadgeText}>Lagos, Abuja & More</Text>
            </Animated.View>

            <Text style={styles.heroTitle}>
              Find Skilled{'\n'}
              <Text style={styles.heroTitleAccent}>Artisans</Text>
              {' '}You Can{'\n'}
              <Text style={styles.heroTitleAccent}>Trust.</Text>
            </Text>
            <Text style={styles.heroSub}>
              From electricians to tailors — book NIN-verified experts, pay safely through escrow, and get the job done right.
            </Text>
          </Animated.View>

          {/* ─── ARTISAN SHOWCASE CARDS ─── */}
          <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.showcaseLabel}>
            <View style={styles.showcaseLine} />
            <Text style={styles.showcaseLabelText}>Top Rated Professionals</Text>
            <View style={styles.showcaseLine} />
          </Animated.View>

          {/* ─── WORK SCENE PHOTOS ─── */}
          <View style={styles.workScenesGrid}>
            <Animated.View entering={SlideInLeft.delay(480).springify()} style={styles.workSceneCard}>
              <LinearGradient
                colors={['#0A2472', '#0D47A1', '#1976D2']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.workSceneBg}
              >
                <View style={styles.wsCircle1} />
                <View style={styles.wsCircle2} />
                <View style={styles.wsIconWrap}>
                  <MaterialCommunityIcons name="pipe-wrench" size={52} color="rgba(255,255,255,0.95)" />
                </View>
                <View style={styles.wsDropA} />
                <View style={styles.wsDropB} />
                <View style={styles.wsBadge}>
                  <MaterialCommunityIcons name="account-hard-hat" size={11} color={NAVY} />
                  <Text style={styles.wsBadgeText}>On the job</Text>
                </View>
              </LinearGradient>
              <View style={styles.workSceneInfo}>
                <Text style={styles.workSceneTitle}>Plumbing Pro</Text>
                <Text style={styles.workSceneTag}>Pipes · Leaks · Drains</Text>
              </View>
            </Animated.View>

            <Animated.View entering={SlideInRight.delay(480).springify()} style={styles.workSceneCard}>
              <LinearGradient
                colors={['#4A0030', '#880E4F', '#C2185B']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.workSceneBg}
              >
                <View style={[styles.wsCircle1, { backgroundColor: 'rgba(255,255,255,0.07)' }]} />
                <View style={[styles.wsCircle2, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />
                <View style={styles.wsIconWrap}>
                  <MaterialCommunityIcons name="content-cut" size={52} color="rgba(255,255,255,0.95)" />
                </View>
                <View style={[styles.wsDropA, { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4 }]} />
                <View style={[styles.wsDropB, { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3 }]} />
                <View style={[styles.wsBadge, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
                  <MaterialCommunityIcons name="star-circle" size={11} color="#880E4F" />
                  <Text style={[styles.wsBadgeText, { color: '#880E4F' }]}>Top Rated</Text>
                </View>
              </LinearGradient>
              <View style={[styles.workSceneInfo, { backgroundColor: 'rgba(136,14,79,0.55)' }]}>
                <Text style={styles.workSceneTitle}>Fashion & Tailor</Text>
                <Text style={styles.workSceneTag}>Sewing · Design · Alters</Text>
              </View>
            </Animated.View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.artisanRow}
          >
            {ARTISANS.map((a, idx) => (
              <ArtisanCard key={a.name} artisan={a} idx={idx} shimmerStyle={shimmerStyle} />
            ))}
          </ScrollView>

          {/* ─── STATS ─── */}
          <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.statsRow}>
            {[
              { num: '500+', label: 'Verified\nArtisans', icon: 'account-check' as const },
              { num: '2,000+', label: 'Jobs\nCompleted', icon: 'briefcase-check' as const },
              { num: '4.9★', label: 'Average\nRating', icon: 'star-circle' as const },
            ].map((s, i) => (
              <React.Fragment key={s.num}>
                {i > 0 && <View style={styles.statDivider} />}
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name={s.icon} size={18} color={GOLD} style={{ marginBottom: 4 }} />
                  <Text style={styles.statNum}>{s.num}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </Animated.View>

          {/* ─── CARPENTER VIDEO SHOWCASE ─── */}
          <Animated.View entering={FadeInUp.delay(650).springify()} style={styles.videoSection}>
            <View style={styles.videoSectionHeader}>
              <MaterialCommunityIcons name="play-circle" size={18} color={GOLD} />
              <Text style={styles.videoSectionTitle}>See Our Artisans at Work</Text>
            </View>
            <View style={styles.videoCard}>
              {/* Static carpenter scene — tap to open video in browser */}
              <Pressable style={styles.videoThumbnail} onPress={handleVideoPress}>
                <LinearGradient
                  colors={['#0A0F1E', '#101828', '#0D1B4E']}
                  style={StyleSheet.absoluteFill}
                />
                {/* Decorative carpenter tool icons */}
                <MaterialCommunityIcons
                  name="hammer"
                  size={90}
                  color="rgba(255,193,7,0.09)"
                  style={{ position: 'absolute', right: 14, top: 8, transform: [{ rotate: '25deg' }] }}
                />
                <MaterialCommunityIcons
                  name="toolbox"
                  size={58}
                  color="rgba(255,255,255,0.05)"
                  style={{ position: 'absolute', left: 18, bottom: 16 }}
                />
                <MaterialCommunityIcons
                  name="saw-blade"
                  size={46}
                  color="rgba(255,255,255,0.04)"
                  style={{ position: 'absolute', right: 46, bottom: 26, transform: [{ rotate: '-15deg' }] }}
                />
                {/* Play overlay */}
                <LinearGradient
                  colors={['rgba(26,35,126,0.2)', 'rgba(26,35,126,0.6)', 'rgba(26,35,126,0.9)']}
                  style={styles.videoOverlay}
                >
                  <View style={styles.videoPlayBtn}>
                    <MaterialCommunityIcons name="play" size={34} color="#FFFFFF" />
                  </View>
                  <View style={styles.videoLiveBadge}>
                    <View style={styles.videoLiveDot} />
                    <Text style={styles.videoLiveBadgeText}>Tap to Watch</Text>
                  </View>
                </LinearGradient>
              </Pressable>

              {/* TrustConnect brand card — animates in on mount */}
              <LinearGradient
                colors={[NAVY, '#1E2D8B', '#0D1B4E']}
                style={styles.videoBrandStrip}
              >
                <Animated.View style={[styles.endRing, endRingStyle]} />
                <Animated.View style={[styles.endLogoWrap, endLogoStyle]}>
                  <Image
                    source={require('../../assets/images/logo.png')}
                    style={styles.endLogoImg}
                    resizeMode="contain"
                  />
                </Animated.View>
                <Animated.View style={[styles.endTextWrap, endTextStyle]}>
                  <Text style={styles.endBrandName}>TrustConnect</Text>
                  <Text style={styles.endBrandSub}>Nigeria{"'"}s Most Trusted Artisan Platform</Text>
                </Animated.View>
              </LinearGradient>

              <View style={styles.videoInfoBar}>
                <View style={styles.videoInfoLeft}>
                  <MaterialCommunityIcons name="hammer" size={16} color={GOLD} />
                  <View>
                    <Text style={styles.videoInfoTitle}>Carpenter at Work</Text>
                    <Text style={styles.videoInfoSub}>Tap to watch verified artisans in action</Text>
                  </View>
                </View>
                <View style={styles.videoInfoBadge}>
                  <Image
                    source={require('../../assets/images/logo.png')}
                    style={styles.videoInfoLogo}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ─── SERVICES GRID ─── */}
          <Animated.View entering={FadeInUp.delay(700).springify()} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popular Services</Text>
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>All Categories</Text>
              </View>
            </View>
            <View style={styles.servicesGrid}>
              {SERVICES.map((svc, idx) => (
                <Animated.View
                  key={svc.label}
                  entering={ZoomIn.delay(750 + idx * 60).springify()}
                  style={styles.serviceChip}
                >
                  <LinearGradient
                    colors={[svc.color + '22', svc.color + '08']}
                    style={styles.serviceChipGrad}
                  >
                    <View style={[styles.serviceIconCircle, { backgroundColor: svc.color + '28' }]}>
                      <MaterialCommunityIcons name={svc.icon} size={20} color={svc.color} />
                    </View>
                    <Text style={styles.serviceLabel}>{svc.label}</Text>
                  </LinearGradient>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* ─── HOW IT WORKS ─── */}
          <Animated.View entering={FadeInUp.delay(800).springify()} style={styles.section}>
            <Text style={[styles.sectionTitle, { marginBottom: spacing.lg }]}>How It Works</Text>
            {STEPS.map((step, idx) => (
              <Animated.View
                key={step.num}
                entering={SlideInLeft.delay(850 + idx * 120).springify()}
                style={styles.stepRow}
              >
                <LinearGradient
                  colors={[GOLD_DARK, GOLD]}
                  style={styles.stepNumBg}
                >
                  <Text style={styles.stepNum}>{step.num}</Text>
                </LinearGradient>
                <View style={styles.stepConnector}>
                  {idx < STEPS.length - 1 && <View style={styles.stepLine} />}
                </View>
                <View style={[styles.stepIconBg, { marginRight: 12 }]}>
                  <MaterialCommunityIcons name={step.icon} size={22} color={GOLD} />
                </View>
                <View style={styles.stepText}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </Animated.View>
            ))}
          </Animated.View>

          {/* ─── TRUST FEATURES ─── */}
          <Animated.View entering={FadeInUp.delay(900).springify()} style={styles.trustRow}>
            {[
              { icon: 'shield-lock' as const,  label: 'NIN\nVerified' },
              { icon: 'cash-lock' as const,     label: 'Escrow\nProtection' },
              { icon: 'star-circle' as const,   label: 'Reviewed\n& Rated' },
              { icon: 'headset' as const,       label: '24/7\nSupport' },
            ].map((t, i) => (
              <Animated.View key={t.label} entering={FadeInDown.delay(950 + i * 80).springify()} style={styles.trustItem}>
                <View style={styles.trustIconRing}>
                  <MaterialCommunityIcons name={t.icon} size={20} color={GOLD} />
                </View>
                <Text style={styles.trustLabel}>{t.label}</Text>
              </Animated.View>
            ))}
          </Animated.View>

          {/* ─── CTA BUTTONS ─── */}
          <Animated.View entering={FadeInUp.delay(1000).springify()} style={styles.ctaSection}>
            {/* Primary — Hire */}
            <AnimatedPressable
              onPress={onHirePress}
              style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            >
              <LinearGradient
                colors={[GOLD_DARK, GOLD, GOLD_LIGHT]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.btnPrimaryInner}
              >
                <View style={styles.btnIconCircle}>
                  <MaterialCommunityIcons name="account-search" size={20} color={GOLD_DARK} />
                </View>
                <Text style={styles.btnPrimaryText}>Hire a Professional</Text>
                <MaterialCommunityIcons name="arrow-right-circle" size={22} color={NAVY} />
              </LinearGradient>
            </AnimatedPressable>

            {/* Action Cards — Artisan & Company */}
            <Animated.View entering={FadeInUp.delay(1060).springify()} style={styles.btnCardsGroup}>
              <AnimatedPressable
                onPress={onRegisterPress}
                style={({ pressed }) => [styles.btnActionCard, pressed && styles.btnActionCardPressed]}
              >
                <LinearGradient
                  colors={['#BF360C', '#E64A19', '#FF7043']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.btnActionIconBox}
                >
                  <MaterialCommunityIcons name="tools" size={26} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.btnActionBody}>
                  <Text style={styles.btnActionTitle}>Join as an Artisan</Text>
                  <Text style={styles.btnActionSub}>Earn money doing what you love</Text>
                </View>
                <View style={styles.btnActionArrow}>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={GOLD} />
                </View>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={onCompanyPress}
                style={({ pressed }) => [styles.btnActionCard, pressed && styles.btnActionCardPressed]}
              >
                <LinearGradient
                  colors={['#0A237E', '#1565C0', '#1E88E5']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.btnActionIconBox}
                >
                  <MaterialCommunityIcons name="office-building-outline" size={26} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.btnActionBody}>
                  <Text style={styles.btnActionTitle}>Register a Company</Text>
                  <Text style={styles.btnActionSub}>Manage teams & hire verified pros</Text>
                </View>
                <View style={styles.btnActionArrow}>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={GOLD} />
                </View>
              </AnimatedPressable>
            </Animated.View>
          </Animated.View>

          {/* ─── FOOTER ─── */}
          <Animated.View entering={FadeIn.delay(1100).duration(500)} style={styles.footer}>
            <View style={styles.footerDivider}>
              <View style={styles.footerLine} />
              <Text style={styles.footerOr}>Already have an account?</Text>
              <View style={styles.footerLine} />
            </View>
            <Pressable onPress={onLoginPress} style={styles.footerLoginBtn}>
              <MaterialCommunityIcons name="login-variant" size={18} color={GOLD} />
              <Text style={styles.footerLoginText}>Sign in to your account</Text>
              <MaterialCommunityIcons name="arrow-right" size={16} color={GOLD} />
            </Pressable>

            {/* TrustConnect footer logo */}
            <View style={styles.footerLogo}>
              <View style={styles.footerLogoShield}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.footerLogoImg}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.footerBrandName}>TrustConnect</Text>
              <Text style={styles.footerBrandSub}>Nigeria{"'"}s Most Trusted Artisan Platform</Text>
            </View>

            <Text style={styles.copyright}>© 2026 TrustConnect Nigeria Ltd. All rights reserved.</Text>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 58 : 46,
    paddingBottom: 40,
  },

  // Decorative
  blob1: {
    position: 'absolute', top: -80, right: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: GOLD, opacity: 0.08,
  },
  blob2: {
    position: 'absolute', bottom: 120, left: -80,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: '#3F51B5',
  },
  dotGrid: {
    position: 'absolute', top: 80, left: 0,
    flexDirection: 'row', flexWrap: 'wrap',
    width: 180, opacity: 0.06,
    gap: 18,
    paddingLeft: 16,
  },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },

  // Top Bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, marginBottom: spacing.xl,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoShield: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(255,193,7,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(255,193,7,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
  },
  logo: { width: 30, height: 30 },
  brandText: {},
  brandName: {
    fontSize: 18, fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF', letterSpacing: 0.3,
  },
  brandTagline: {
    fontSize: 10, color: GOLD_LIGHT, fontWeight: typography.fontWeight.medium,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  signInPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 24, borderWidth: 1.5,
    borderColor: 'rgba(255,193,7,0.45)',
    backgroundColor: 'rgba(255,193,7,0.08)',
  },
  signInPillText: {
    color: '#FFFFFF', fontSize: 13,
    fontWeight: typography.fontWeight.semibold,
  },

  // Hero
  hero: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,193,7,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,193,7,0.28)',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 30, marginBottom: spacing.lg,
  },
  verifiedBadgeText: {
    color: GOLD_LIGHT, fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
  },
  badgeDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: GOLD, opacity: 0.6,
  },
  heroTitle: {
    fontSize: 38, fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF', lineHeight: 48,
    marginBottom: spacing.md,
    letterSpacing: -0.5,
  },
  heroTitleAccent: { color: GOLD },
  heroSub: {
    fontSize: 15, color: 'rgba(255,255,255,0.7)',
    lineHeight: 23,
  },

  // Artisan showcase
  showcaseLabel: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
    gap: 12,
  },
  showcaseLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  showcaseLabelText: {
    color: 'rgba(255,255,255,0.5)', fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase', letterSpacing: 1.2,
  },
  // Work scene photo cards
  workScenesGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: 12,
    marginBottom: spacing.md,
  },
  workSceneCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  workSceneBg: {
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  wsCircle1: {
    position: 'absolute', top: -22, right: -22,
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  wsCircle2: {
    position: 'absolute', bottom: -14, left: -18,
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  wsIconWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  wsDropA: {
    position: 'absolute', top: 18, left: 14,
    width: 9, height: 14, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  wsDropB: {
    position: 'absolute', top: 36, left: 26,
    width: 6, height: 9, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  wsBadge: {
    position: 'absolute', bottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  wsBadgeText: {
    color: NAVY, fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
  workSceneInfo: {
    backgroundColor: 'rgba(13,71,161,0.55)',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  workSceneTitle: {
    color: '#FFFFFF', fontSize: 13,
    fontWeight: typography.fontWeight.bold, marginBottom: 2,
  },
  workSceneTag: {
    color: 'rgba(255,255,255,0.65)', fontSize: 10,
  },

  // Artisan showcase cards
  artisanRow: {
    paddingHorizontal: spacing.lg, paddingBottom: 8,
    gap: 12, marginBottom: spacing.xl,
  },
  artisanCard: {
    width: 118,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  artisanPhotoArea: {
    height: 118,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artisanPhotoBgCircle: {
    position: 'absolute', bottom: -20, right: -20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  artisanAvatarLarge: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.45)',
  },
  artisanAvatarImage: {
    width: 66, height: 66, borderRadius: 33,
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.45)',
  },
  artisanInitialsLarge: {
    color: '#FFFFFF', fontSize: 22,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  artisanSvcBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  onlineDot: {
    position: 'absolute', bottom: 8, left: 10,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2, borderColor: 'rgba(26,35,126,0.6)',
  },
  artisanInfoStrip: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10, paddingVertical: 9,
  },
  artisanName: {
    color: '#FFFFFF', fontSize: 12,
    fontWeight: typography.fontWeight.bold, marginBottom: 1,
  },
  artisanServiceLabel: {
    color: 'rgba(255,255,255,0.6)', fontSize: 10,
    marginBottom: 4,
  },
  artisanMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
  },
  artisanRating: {
    color: GOLD_LIGHT, fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
  artisanJobs: { color: 'rgba(255,255,255,0.45)', fontSize: 10 },
  shimmer: {
    position: 'absolute', top: 0, left: 0,
    width: 60, height: '100%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    transform: [{ skewX: '-20deg' }],
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18,
    paddingVertical: spacing.lg,
    paddingHorizontal: 8,
    marginBottom: spacing.xl + 4,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.15)',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: {
    fontSize: 20, fontWeight: typography.fontWeight.bold,
    color: GOLD, marginBottom: 3,
  },
  statLabel: {
    fontSize: 11, color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', lineHeight: 15,
  },
  statDivider: {
    width: 1, backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 4,
  },

  // Section
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl + 4 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18, fontWeight: typography.fontWeight.bold, color: '#FFFFFF',
  },
  sectionPill: {
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: 'rgba(255,193,7,0.12)',
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.25)',
  },
  sectionPillText: { color: GOLD, fontSize: 11, fontWeight: typography.fontWeight.semibold },

  // Services
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceChip: {
    borderRadius: 14, overflow: 'hidden',
    width: '22%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
  },
  serviceChipGrad: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 4,
    gap: 6,
  },
  serviceIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  serviceLabel: {
    color: 'rgba(255,255,255,0.85)', fontSize: 10,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },

  // Steps
  stepRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 16, position: 'relative',
  },
  stepNumBg: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
    elevation: 4,
    shadowColor: GOLD_DARK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 6,
  },
  stepNum: { color: NAVY, fontSize: 13, fontWeight: typography.fontWeight.bold },
  stepConnector: {
    alignItems: 'center', width: 2, marginHorizontal: 3,
    paddingTop: 32, height: '100%',
  },
  stepLine: {
    flex: 1, width: 2,
    backgroundColor: 'rgba(255,193,7,0.2)',
    marginLeft: -1,
  },
  stepIconBg: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,193,7,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,193,7,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepText: { flex: 1 },
  stepTitle: {
    color: '#FFFFFF', fontSize: 15,
    fontWeight: typography.fontWeight.bold, marginBottom: 2,
  },
  stepDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 18 },

  // Trust strip
  trustRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: spacing.lg, marginBottom: spacing.xl + 4,
  },
  trustItem: { alignItems: 'center', gap: 8 },
  trustIconRing: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,193,7,0.1)',
    borderWidth: 1.5, borderColor: 'rgba(255,193,7,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  trustLabel: {
    color: 'rgba(255,255,255,0.7)', fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center', lineHeight: 15,
  },

  // CTA
  ctaSection: { paddingHorizontal: spacing.lg, gap: 14, marginBottom: spacing.xl },
  btnPrimary: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: GOLD_DARK,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
  },
  btnPrimaryInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 20, gap: 12,
  },
  btnIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(26,35,126,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: {
    flex: 1, color: NAVY, fontSize: 17,
    fontWeight: typography.fontWeight.bold, letterSpacing: 0.2,
  },
  btnCardsGroup: { gap: 12 },
  btnActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
  btnActionCardPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  btnActionIconBox: {
    width: 58, height: 58,
    alignItems: 'center', justifyContent: 'center',
    margin: 13, borderRadius: 16,
  },
  btnActionBody: { flex: 1, paddingVertical: 2 },
  btnActionTitle: {
    color: '#FFFFFF', fontSize: 15,
    fontWeight: typography.fontWeight.bold, marginBottom: 3,
  },
  btnActionSub: {
    color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 16,
  },
  btnActionArrow: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,193,7,0.15)',
    borderRadius: 10,
    marginRight: 14,
  },

  // Footer
  footer: { paddingHorizontal: spacing.lg, alignItems: 'center', gap: spacing.md },
  footerDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  footerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  footerOr: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  footerLoginBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: 'rgba(255,193,7,0.1)',
    borderWidth: 1.5, borderColor: 'rgba(255,193,7,0.3)',
  },
  footerLoginText: {
    color: GOLD, fontSize: 15, fontWeight: typography.fontWeight.bold,
  },
  copyright: {
    color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center', marginTop: 4,
  },

  // Video showcase
  videoSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl + 4,
  },
  videoSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: spacing.md,
  },
  videoSectionTitle: {
    fontSize: 16, fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  videoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  videoThumbnail: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#0D1B4E',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPauseHint: {
    position: 'absolute',
    top: 8,
    right: 10,
  },

  // Video end card
  videoEndCard: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  endRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: `rgba(255,193,7,0.4)`,
  },
  endLogoWrap: {
    width: 90,
    height: 90,
    borderRadius: 26,
    backgroundColor: 'rgba(255,193,7,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,193,7,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  endLogoImg: { width: 58, height: 58 },
  endTextWrap: { alignItems: 'center', gap: 4 },
  endBrandName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  endBrandSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  endReplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,193,7,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.25)',
  },
  endReplayText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
  },
  videoPlayBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,193,7,0.9)',
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  videoLiveBadge: {
    position: 'absolute', top: 14, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20,
  },
  videoLiveDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: GOLD,
  },
  videoLiveBadgeText: {
    color: '#FFFFFF', fontSize: 11,
    fontWeight: typography.fontWeight.bold,
  },
  videoInfoBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(26,35,126,0.85)',
    paddingHorizontal: 14, paddingVertical: 12,
    gap: 10,
  },
  videoInfoLeft: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  videoInfoTitle: {
    color: '#FFFFFF', fontSize: 13,
    fontWeight: typography.fontWeight.bold, marginBottom: 1,
  },
  videoInfoSub: {
    color: 'rgba(255,255,255,0.55)', fontSize: 10,
    lineHeight: 14,
  },
  videoInfoBadge: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,193,7,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  videoInfoLogo: { width: 22, height: 22 },

  // Video brand strip (TrustConnect logo section below thumbnail)
  videoBrandStrip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    paddingHorizontal: 16,
    gap: 10,
  },

  // Footer logo
  footerLogo: {
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 6,
  },
  footerLogoShield: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,193,7,0.1)',
    borderWidth: 1.5, borderColor: 'rgba(255,193,7,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  footerLogoImg: { width: 32, height: 32 },
  footerBrandName: {
    fontSize: 16, fontWeight: typography.fontWeight.bold,
    color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5,
  },
  footerBrandSub: {
    fontSize: 10, color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.3,
  },
});
