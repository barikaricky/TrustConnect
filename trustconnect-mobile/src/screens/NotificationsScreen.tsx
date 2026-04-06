/**
 * NotificationsScreen — Full in-app notification inbox
 * Features: type-based icons/colors, mark all read, swipe-to-delete,
 *           empty state, pull-to-refresh, unread badge counts.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, ScrollView, Pressable,
  RefreshControl, Platform, ActivityIndicator, Alert,
} from 'react-native';
import Animated, { SlideInRight, FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getNotifications,
  markAllRead,
  markOneRead,
  deleteNotification,
  type AppNotification,
} from '../services/notificationService';

const NAVY = '#1a237e';
const NAVY_LIGHT = '#283593';
const GOLD = '#FFC107';
const SUCCESS = '#4CAF50';
const DANGER = '#F44336';
const INFO = '#2196F3';
const PURPLE = '#7C4DFF';
const TEAL = '#009688';
const BG = '#F0F2F8';

// ─── Per-type visual config ──────────────────────────────────────────
const TYPE_CONFIG: Record<
  AppNotification['type'],
  { icon: string; color: string; bg: string; label: string }
> = {
  booking:      { icon: 'briefcase-outline',       color: INFO,    bg: '#E3F2FD', label: 'Booking'  },
  escrow:       { icon: 'cash-lock',               color: SUCCESS, bg: '#E8F5E9', label: 'Escrow'   },
  chat:         { icon: 'message-outline',          color: PURPLE,  bg: '#EDE7F6', label: 'Message'  },
  dispute:      { icon: 'shield-alert-outline',     color: DANGER,  bg: '#FFEBEE', label: 'Dispute'  },
  system:       { icon: 'information-outline',      color: NAVY,    bg: '#E8EAF6', label: 'System'   },
  promotion:    { icon: 'tag-outline',              color: TEAL,    bg: '#E0F2F1', label: 'Promo'    },
  review:       { icon: 'star-outline',             color: GOLD,    bg: '#FFF8E1', label: 'Review'   },
  verification: { icon: 'check-decagram-outline',  color: SUCCESS, bg: '#E8F5E9', label: 'Verified' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { init(); }, []);

  const init = async () => {
    const userData = await AsyncStorage.getItem('@trustconnect_user');
    const parsed = userData ? JSON.parse(userData) : null;
    const uid = parsed?.id || parsed?.userId;
    setUserId(uid);
    if (uid) await fetchNotifications(uid);
  };

  const fetchNotifications = async (uid: number) => {
    const res = await getNotifications(uid, 1, 50);
    setNotifications(res.notifications);
    setUnreadCount(res.unreadCount);
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (userId) fetchNotifications(userId);
  }, [userId]);

  const handleMarkAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    setMarkingAll(true);
    await markAllRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    setMarkingAll(false);
  };

  const handleMarkOne = async (notif: AppNotification) => {
    if (notif.read) return;
    await markOneRead(notif.id);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleDelete = (notif: AppNotification) => {
    Alert.alert('Delete Notification', 'Remove this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteNotification(notif.id);
          setNotifications(prev => prev.filter(n => n.id !== notif.id));
          if (!notif.read) setUnreadCount(prev => Math.max(0, prev - 1));
        },
      },
    ]);
  };

  const handleTapNotif = (notif: AppNotification) => {
    handleMarkOne(notif);
    // Navigate based on type
    if (notif.type === 'chat' && notif.data?.bookingId) {
      router.push({ pathname: '/chat', params: { bookingId: String(notif.data.bookingId) } } as any);
    } else if (notif.type === 'booking' && notif.data?.bookingId) {
      router.push('/company-dashboard' as any);
    } else if (notif.type === 'escrow') {
      router.push('/wallet' as any);
    } else if (notif.type === 'dispute') {
      router.push('/dispute' as any);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={[NAVY, '#0d1642']} style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <LinearGradient colors={[NAVY, NAVY_LIGHT]} style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable
            style={[styles.markAllBtn, markingAll && { opacity: 0.6 }]}
            onPress={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll ? (
              <ActivityIndicator size={14} color={GOLD} />
            ) : (
              <>
                <MaterialCommunityIcons name="check-all" size={16} color={GOLD} />
                <Text style={styles.markAllText}>Mark all read</Text>
              </>
            )}
          </Pressable>
        )}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <Animated.View entering={FadeIn.delay(200)} style={styles.emptyState}>
            <LinearGradient colors={[NAVY + '15', NAVY + '05']} style={styles.emptyIconWrap}>
              <MaterialCommunityIcons name="bell-off-outline" size={60} color="#B0BEC5" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptySubtext}>{"No notifications right now. We'll alert you when something important happens."}</Text>
          </Animated.View>
        ) : (
          <>
            {/* Unread section */}
            {notifications.some(n => !n.read) && (
              <Text style={styles.sectionLabel}>NEW</Text>
            )}
            {notifications.filter(n => !n.read).map((notif, idx) => (
              <NotifCard key={notif.id} notif={notif} idx={idx} onTap={handleTapNotif} onDelete={handleDelete} />
            ))}

            {/* Read section */}
            {notifications.some(n => n.read) && (
              <Text style={[styles.sectionLabel, { marginTop: 8 }]}>EARLIER</Text>
            )}
            {notifications.filter(n => n.read).map((notif, idx) => (
              <NotifCard key={notif.id} notif={notif} idx={idx} onTap={handleTapNotif} onDelete={handleDelete} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Notification Card Component ─────────────────────────────────────
function NotifCard({
  notif, idx, onTap, onDelete,
}: {
  notif: AppNotification;
  idx: number;
  onTap: (n: AppNotification) => void;
  onDelete: (n: AppNotification) => void;
}) {
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;

  return (
    <Animated.View entering={SlideInRight.delay(idx * 55).springify()}>
      <Pressable
        style={[
          styles.notifCard,
          !notif.read && styles.notifCardUnread,
        ]}
        onPress={() => onTap(notif)}
      >
        {/* Unread indicator line */}
        {!notif.read && <View style={[styles.unreadBar, { backgroundColor: cfg.color }]} />}

        {/* Icon */}
        <View style={[styles.notifIconWrap, { backgroundColor: cfg.bg }]}>
          <MaterialCommunityIcons name={cfg.icon as any} size={22} color={cfg.color} />
        </View>

        {/* Body */}
        <View style={styles.notifBody}>
          <View style={styles.notifTopRow}>
            <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <Text style={styles.notifTime}>{timeAgo(notif.createdAt)}</Text>
          </View>
          <Text style={[styles.notifTitle, !notif.read && styles.notifTitleUnread]} numberOfLines={1}>
            {notif.title}
          </Text>
          <Text style={styles.notifBodyText} numberOfLines={2}>
            {notif.body}
          </Text>
        </View>

        {/* Delete button */}
        <Pressable style={styles.deleteBtn} onPress={() => onDelete(notif)} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={16} color="#B0BEC5" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 52,
    paddingBottom: 14, gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: GOLD, marginTop: 1, fontWeight: '600' },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  markAllText: { fontSize: 12, fontWeight: '700', color: GOLD },

  content: { padding: 14, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#90A4AE',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4,
  },

  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    marginBottom: 8, overflow: 'hidden',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  notifCardUnread: {
    elevation: 3, shadowOpacity: 0.1, backgroundColor: '#FAFEFF',
    borderWidth: 1, borderColor: '#E3F0FF',
  },
  unreadBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: 2 },

  notifIconWrap: {
    width: 46, height: 46, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, flexShrink: 0,
  },
  notifBody: { flex: 1 },
  notifTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  typeBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  notifTime: { fontSize: 11, color: '#90A4AE' },
  notifTitle: { fontSize: 13, fontWeight: '600', color: '#37474F', marginBottom: 3 },
  notifTitleUnread: { fontWeight: '800', color: '#1f2128' },
  notifBodyText: { fontSize: 12, color: '#78909C', lineHeight: 17 },

  deleteBtn: { padding: 2, marginLeft: 4, alignSelf: 'flex-start' },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyIconWrap: {
    width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#546E7A', marginBottom: 10 },
  emptySubtext: { fontSize: 14, color: '#90A4AE', textAlign: 'center', lineHeight: 21 },
});
