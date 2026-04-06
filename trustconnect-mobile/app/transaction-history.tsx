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
// Brand gold available: #FFC107

interface Transaction {
  _id: string;
  type: 'credit' | 'debit' | 'escrow' | 'refund' | 'withdrawal';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
  reference?: string;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  credit: { icon: 'arrow-down-circle', color: '#4CAF50', label: 'Credit' },
  debit: { icon: 'arrow-up-circle', color: '#E53935', label: 'Debit' },
  escrow: { icon: 'shield-lock-outline', color: '#FF9800', label: 'Escrow' },
  refund: { icon: 'cash-refund', color: '#2196F3', label: 'Refund' },
  withdrawal: { icon: 'bank-transfer-out', color: '#9C27B0', label: 'Withdrawal' },
};

const FILTERS = ['All', 'Credit', 'Debit', 'Escrow', 'Refund', 'Withdrawal'];

export default function TransactionHistoryRoute() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');

  useEffect(() => { loadTransactions(); }, []);

  const loadTransactions = async () => {
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      const res = await axios.get(`${API_BASE_URL}/wallet/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setTransactions(res.data.data.transactions || res.data.data || []);
      }
    } catch {
      console.log('Could not load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); loadTransactions(); }, []);

  const filtered = filter === 'All'
    ? transactions
    : transactions.filter(t => t.type === filter.toLowerCase());

  const formatAmount = (amount: number) => {
    return '\u20A6' + amount.toLocaleString('en-NG', { minimumFractionDigits: 0 });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
          <Text style={styles.headerTitle}>Transaction History</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map(f => (
          <Pressable key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[NAVY]} />}
      >
        {filtered.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.emptyState}>
            <MaterialCommunityIcons name="receipt" size={56} color="#CFD8DC" />
            <Text style={styles.emptyTitle}>No Transactions</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'All' ? 'Your transaction history will appear here' : `No ${filter.toLowerCase()} transactions found`}
            </Text>
          </Animated.View>
        ) : (
          filtered.map((txn, index) => {
            const config = TYPE_CONFIG[txn.type] || TYPE_CONFIG.credit;
            const isCredit = txn.type === 'credit' || txn.type === 'refund';

            return (
              <Animated.View key={txn._id} entering={SlideInRight.delay(index * 50).springify()} style={styles.txnCard}>
                <View style={[styles.txnIcon, { backgroundColor: config.color + '15' }]}>
                  <MaterialCommunityIcons name={config.icon as any} size={22} color={config.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnDesc} numberOfLines={1}>{txn.description}</Text>
                  <View style={styles.txnMeta}>
                    <Text style={styles.txnDate}>{formatDate(txn.createdAt)}</Text>
                    <Text style={styles.txnDot}>&middot;</Text>
                    <Text style={styles.txnDate}>{formatTime(txn.createdAt)}</Text>
                  </View>
                  {txn.reference && <Text style={styles.txnRef}>Ref: {txn.reference}</Text>}
                </View>
                <View style={styles.txnRight}>
                  <Text style={[styles.txnAmount, { color: isCredit ? '#4CAF50' : '#E53935' }]}>
                    {isCredit ? '+' : '-'}{formatAmount(txn.amount)}
                  </Text>
                  <View style={[styles.statusBadge, {
                    backgroundColor: txn.status === 'completed' ? '#E8F5E9' :
                      txn.status === 'pending' ? '#FFF3E0' : '#FFEBEE'
                  }]}>
                    <Text style={[styles.statusText, {
                      color: txn.status === 'completed' ? '#2E7D32' :
                        txn.status === 'pending' ? '#E65100' : '#C62828'
                    }]}>{txn.status}</Text>
                  </View>
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

  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0',
  },
  filterChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  filterText: { fontSize: 13, fontWeight: '500', color: '#78909C' },
  filterTextActive: { color: '#fff' },

  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#78909C', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#B0BEC5', marginTop: 4, textAlign: 'center' },

  txnCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  txnIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txnDesc: { fontSize: 14, fontWeight: '600', color: '#37474F' },
  txnMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  txnDate: { fontSize: 11, color: '#B0BEC5' },
  txnDot: { fontSize: 11, color: '#B0BEC5' },
  txnRef: { fontSize: 10, color: '#CFD8DC', marginTop: 1 },
  txnRight: { alignItems: 'flex-end', gap: 4 },
  txnAmount: { fontSize: 14, fontWeight: '700' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
});
