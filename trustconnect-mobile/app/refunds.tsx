import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, StatusBar, Platform,
  ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/config/api';

const NAVY = '#1a237e';

interface Refund {
  _id: string;
  bookingId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  pending: { color: '#E65100', bg: '#FFF3E0', icon: 'clock-outline' },
  approved: { color: '#2E7D32', bg: '#E8F5E9', icon: 'check-circle-outline' },
  rejected: { color: '#C62828', bg: '#FFEBEE', icon: 'close-circle-outline' },
  processed: { color: '#1565C0', bg: '#E3F2FD', icon: 'check-all' },
};

export default function RefundsRoute() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadRefunds(); }, []);

  const loadRefunds = async () => {
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      const res = await axios.get(`${API_BASE_URL}/wallet/refunds`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setRefunds(res.data.data.refunds || res.data.data || []);
      }
    } catch {
      console.log('Could not load refunds');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); loadRefunds(); }, []);

  const formatAmount = (amount: number) => '\u20A6' + amount.toLocaleString('en-NG');
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={NAVY} /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[NAVY, '#283593']} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Refunds</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[NAVY]} />}
      >
        {/* Info */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.infoCard}>
          <MaterialCommunityIcons name="information-outline" size={18} color="#1565C0" />
          <Text style={styles.infoText}>
            Approved refunds are typically processed within 3-5 business days and credited to your wallet.
          </Text>
        </Animated.View>

        {refunds.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.emptyState}>
            <MaterialCommunityIcons name="cash-refund" size={56} color="#CFD8DC" />
            <Text style={styles.emptyTitle}>No Refunds</Text>
            <Text style={styles.emptySubtext}>Your refund requests will appear here</Text>
            <Pressable style={styles.disputeBtn} onPress={() => router.push('/dispute')}>
              <MaterialCommunityIcons name="shield-alert-outline" size={16} color="#fff" />
              <Text style={styles.disputeBtnText}>File a Dispute</Text>
            </Pressable>
          </Animated.View>
        ) : (
          refunds.map((refund, index) => {
            const config = STATUS_CONFIG[refund.status] || STATUS_CONFIG.pending;
            return (
              <Animated.View key={refund._id} entering={SlideInRight.delay(index * 70).springify()} style={styles.refundCard}>
                <View style={[styles.statusIcon, { backgroundColor: config.bg }]}>
                  <MaterialCommunityIcons name={config.icon as any} size={22} color={config.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.refundAmount}>{formatAmount(refund.amount)}</Text>
                  <Text style={styles.refundReason} numberOfLines={2}>{refund.reason}</Text>
                  <Text style={styles.refundDate}>{formatDate(refund.createdAt)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                  <Text style={[styles.statusText, { color: config.color }]}>{refund.status}</Text>
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 42, paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#E3F2FD', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  infoText: { fontSize: 12, color: '#1565C0', flex: 1, lineHeight: 17 },

  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#78909C', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#B0BEC5', marginTop: 4 },
  disputeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: NAVY, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20,
  },
  disputeBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  refundCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  statusIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  refundAmount: { fontSize: 16, fontWeight: '700', color: '#263238' },
  refundReason: { fontSize: 12, color: '#78909C', marginTop: 2, lineHeight: 16 },
  refundDate: { fontSize: 11, color: '#B0BEC5', marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
