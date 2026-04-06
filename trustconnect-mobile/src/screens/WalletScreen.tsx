import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../services/AuthContext';
import { verifyPin, hasPinSet } from '../services/lockScreenService';
import {
  WalletInfo,
  Transaction,
  getWalletBalance,
  getTransactionHistory,
  requestWithdrawal,
  fundWallet,
} from '../services/escrowService';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

export default function WalletScreen() {
  const { user } = useAuth();
  const currentUserId = user?.userId || user?.id;

  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawPin, setShowWithdrawPin] = useState(false);
  const [withdrawPinInput, setWithdrawPinInput] = useState('');
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);

  const loadWallet = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const w = await getWalletBalance(currentUserId);
      setWallet(w);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to load wallet');
    }
  }, [currentUserId]);

  const loadTransactions = useCallback(async (p: number, type?: string) => {
    if (!currentUserId) return;
    try {
      const res = await getTransactionHistory(currentUserId, type, p, 20);
      if (p === 1) {
        setTransactions(res.transactions);
      } else {
        setTransactions(prev => [...prev, ...res.transactions]);
      }
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
    }
  }, [currentUserId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWallet();
    await loadTransactions(1, filter);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (page < totalPages) {
      loadTransactions(page + 1, filter);
    }
  };

  const handleFilter = (type?: string) => {
    setFilter(type);
    setLoading(true);
    loadTransactions(1, type).finally(() => setLoading(false));
  };

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount < 500) {
      Alert.alert('Invalid Amount', 'Minimum withdrawal is ₦500');
      return;
    }
    if (wallet && amount > wallet.balance) {
      Alert.alert('Insufficient Balance', `Your available balance is ₦${wallet.balance.toLocaleString()}`);
      return;
    }
    if (!currentUserId) return;

    // Check if PIN is set — require PIN verification before withdrawal
    const pinSet = await hasPinSet();
    if (pinSet) {
      setShowWithdrawPin(true);
      setWithdrawPinInput('');
      return;
    }

    // No PIN set — proceed directly
    await executeWithdrawal();
  };

  const executeWithdrawal = async () => {
    if (!currentUserId) return;
    const amount = Number(withdrawAmount);
    setShowWithdrawPin(false);
    setWithdrawing(true);
    try {
      const tx = await requestWithdrawal(currentUserId, amount);
      Alert.alert('Withdrawal Initiated', `₦${amount.toLocaleString()} withdrawal is being processed.\nRef: ${tx.paymentRef}`);
      setShowWithdraw(false);
      setWithdrawAmount('');
      await loadWallet();
      await loadTransactions(1, filter);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleWithdrawPinKey = async (key: string) => {
    if (key === 'delete') {
      setWithdrawPinInput(prev => prev.slice(0, -1));
      return;
    }
    const newPin = withdrawPinInput + key;
    setWithdrawPinInput(newPin);
    if (newPin.length === 6) {
      const ok = await verifyPin(newPin);
      if (ok) {
        await executeWithdrawal();
      } else {
        setWithdrawPinInput('');
        Alert.alert('Wrong PIN', 'Incorrect PIN. Please try again.');
      }
    }
  };

  const handleTopUp = async () => {
    const amount = Number(topUpAmount);
    if (!amount || amount < 100) {
      Alert.alert('Invalid Amount', 'Minimum top-up is ₦100');
      return;
    }
    if (!currentUserId) return;
    setTopUpLoading(true);
    try {
      const email = user?.email || 'user@trustconnect.com';
      const result = await fundWallet(currentUserId, amount, email);
      
      if (result.devMode) {
        // Dev mode - wallet funded directly
        Alert.alert('Wallet Funded', `₦${amount.toLocaleString()} added to your wallet.\nNew Balance: ₦${result.newBalance?.toLocaleString()}`);
        setShowTopUp(false);
        setTopUpAmount('');
        await loadWallet();
        await loadTransactions(1, filter);
      } else if (result.paymentUrl) {
        // Redirect to Flutterwave payment page
        setShowTopUp(false);
        setTopUpAmount('');
        const { Linking } = require('react-native');
        await Linking.openURL(result.paymentUrl);
        // Wallet will be credited after Flutterwave callback
        setTimeout(async () => {
          await loadWallet();
          await loadTransactions(1, filter);
        }, 5000);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Top-up failed. Please try again.');
    } finally {
      setTopUpLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUserId) return;
    setLoading(true);
    Promise.all([loadWallet(), loadTransactions(1)]).finally(() => setLoading(false));
  }, [loadWallet, loadTransactions]);

  const getIcon = (type: string): string => {
    switch (type) {
      case 'escrow_fund': return 'lock-closed';
      case 'escrow_release': return 'lock-open';
      case 'commission': return 'business';
      case 'withdrawal': return 'arrow-down-circle';
      case 'refund': return 'refresh-circle';
      case 'dispute_split': return 'git-branch';
      default: return 'cash';
    }
  };

  const getColor = (direction?: string) => direction === 'credit' ? '#4CAF50' : '#E53935';

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.txItem}>
      <View style={[styles.txIconBox, { backgroundColor: item.direction === 'credit' ? '#E8F5E9' : '#FFEBEE' }]}>
        <Ionicons name={getIcon(item.type) as any} size={18} color={getColor(item.direction)} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txType}>{item.type.replace(/_/g, ' ').toUpperCase()}</Text>
        <Text style={styles.txDate}>{new Date(item.createdAt).toLocaleDateString()} · {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        <Text style={styles.txStatus}>{item.status}</Text>
      </View>
      <Text style={[styles.txAmount, { color: getColor(item.direction) }]}>
        {item.direction === 'credit' ? '+' : '-'}₦{item.amount.toLocaleString()}
      </Text>
    </View>
  );

  if (loading && !wallet) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header with Balance */}
      <LinearGradient colors={[NAVY, '#283593']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Wallet</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {wallet && (
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>₦{wallet.balance.toLocaleString()}</Text>

            <View style={styles.balanceGrid}>
              <View style={styles.balanceCard}>
                <Ionicons name="lock-closed" size={16} color={GOLD} />
                <Text style={styles.balanceCardLabel}>In Escrow</Text>
                <Text style={styles.balanceCardValue}>₦{wallet.escrowHeld.toLocaleString()}</Text>
              </View>
              <View style={styles.balanceCard}>
                <Ionicons name="trending-up" size={16} color="#4CAF50" />
                <Text style={styles.balanceCardLabel}>Total Earned</Text>
                <Text style={styles.balanceCardValue}>₦{wallet.totalEarnings.toLocaleString()}</Text>
              </View>
              <View style={styles.balanceCard}>
                <Ionicons name="arrow-down-circle" size={16} color="#F57C00" />
                <Text style={styles.balanceCardLabel}>Withdrawn</Text>
                <Text style={styles.balanceCardValue}>₦{wallet.totalWithdrawals.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.actionBtns}>
              <TouchableOpacity
                style={styles.topUpBtn}
                onPress={() => setShowTopUp(true)}
              >
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.topUpBtnText}>Top Up</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.withdrawBtn}
                onPress={() => setShowWithdraw(true)}
              >
                <Ionicons name="arrow-down-circle" size={18} color={NAVY} />
                <Text style={styles.withdrawBtnText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {[
          { label: 'All', value: undefined },
          { label: 'Escrow', value: 'escrow_fund' },
          { label: 'Releases', value: 'escrow_release' },
          { label: 'Withdrawals', value: 'withdrawal' },
        ].map(f => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => handleFilter(f.value)}
          >
            <Text style={[styles.filterChipText, filter === f.value && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transaction List */}
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.txList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[NAVY]} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="receipt" size={48} color="#CFD8DC" />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        }
      />

      {/* Withdraw Modal */}
      <Modal visible={showWithdraw} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw Funds</Text>
              <TouchableOpacity onPress={() => setShowWithdraw(false)}>
                <Ionicons name="close" size={24} color="#37474F" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Available: ₦{wallet?.balance.toLocaleString()}</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter amount (min ₦500)"
              placeholderTextColor="#90A4AE"
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />

            <Text style={styles.modalNote}>
              Funds will be sent to your registered bank account. Processing typically takes 1-2 business days.
            </Text>

            <TouchableOpacity
              style={[styles.modalBtn, withdrawing && { opacity: 0.7 }]}
              onPress={handleWithdraw}
              disabled={withdrawing}
            >
              {withdrawing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalBtnText}>Withdraw ₦{Number(withdrawAmount || 0).toLocaleString()}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Top Up Modal */}
      <Modal visible={showTopUp} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Top Up Wallet</Text>
              <TouchableOpacity onPress={() => setShowTopUp(false)}>
                <Ionicons name="close" size={24} color="#37474F" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Add funds to your wallet via Flutterwave</Text>

            {/* Quick Amount Chips */}
            <View style={styles.quickAmounts}>
              {[1000, 2000, 5000, 10000, 20000].map(amt => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickChip, topUpAmount === String(amt) && styles.quickChipActive]}
                  onPress={() => setTopUpAmount(String(amt))}
                >
                  <Text style={[styles.quickChipText, topUpAmount === String(amt) && styles.quickChipTextActive]}>
                    ₦{amt.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter amount (min ₦100)"
              placeholderTextColor="#90A4AE"
              keyboardType="numeric"
              value={topUpAmount}
              onChangeText={setTopUpAmount}
            />

            <Text style={styles.modalNote}>
              You'll be redirected to Flutterwave to complete payment securely.
            </Text>

            <TouchableOpacity
              style={[styles.topUpModalBtn, topUpLoading && { opacity: 0.7 }]}
              onPress={handleTopUp}
              disabled={topUpLoading}
            >
              {topUpLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalBtnText}>Fund ₦{Number(topUpAmount || 0).toLocaleString()}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Withdrawal PIN Verification Modal */}
      <Modal visible={showWithdrawPin} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center', paddingVertical: 32 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Withdrawal</Text>
              <TouchableOpacity onPress={() => setShowWithdrawPin(false)}>
                <Ionicons name="close" size={24} color="#37474F" />
              </TouchableOpacity>
            </View>

            <MaterialCommunityIcons name="shield-lock" size={48} color={NAVY} style={{ marginBottom: 8 }} />
            <Text style={{ color: '#546E7A', marginBottom: 20, textAlign: 'center' }}>
              Enter your 6-digit PIN to authorise{'\n'}₦{Number(withdrawAmount || 0).toLocaleString()} withdrawal
            </Text>

            {/* PIN dots */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={{
                  width: 14, height: 14, borderRadius: 7,
                  backgroundColor: i < withdrawPinInput.length ? NAVY : '#CFD8DC',
                }} />
              ))}
            </View>

            {/* Keypad */}
            {[['1','2','3'],['4','5','6'],['7','8','9'],['','0','delete']].map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
                {row.map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={{
                      width: 64, height: 64, borderRadius: 32,
                      backgroundColor: key === '' ? 'transparent' : '#EEF2FF',
                      justifyContent: 'center', alignItems: 'center',
                    }}
                    onPress={() => key !== '' && handleWithdrawPinKey(key)}
                    disabled={key === ''}
                  >
                    {key === 'delete' ? (
                      <Ionicons name="backspace-outline" size={22} color={NAVY} />
                    ) : (
                      <Text style={{ fontSize: 22, fontWeight: '600', color: NAVY }}>{key}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  loadingText: { marginTop: 12, color: '#78909C', fontSize: 16 },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingHorizontal: 16, paddingBottom: 20,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  balanceSection: { alignItems: 'center', gap: 8 },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: GOLD },

  balanceGrid: {
    flexDirection: 'row', gap: 10, marginTop: 16, width: '100%',
  },
  balanceCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, padding: 10, alignItems: 'center', gap: 4,
  },
  balanceCardLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },
  balanceCardValue: { fontSize: 14, fontWeight: '700', color: '#fff' },

  actionBtns: {
    flexDirection: 'row', gap: 12, marginTop: 16, width: '100%',
  },
  topUpBtn: {
    flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#4CAF50', paddingVertical: 12,
    borderRadius: 12,
  },
  topUpBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  withdrawBtn: {
    flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: GOLD, paddingVertical: 12,
    borderRadius: 12,
  },
  withdrawBtnText: { fontSize: 15, fontWeight: '700', color: NAVY },

  // Filters
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#ECEFF1', borderWidth: 1, borderColor: '#E0E0E0',
  },
  filterChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  filterChipText: { fontSize: 13, color: '#78909C', fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },

  // Transactions
  txList: { paddingHorizontal: 16, paddingBottom: 40 },
  txItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  txIconBox: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  txType: { fontSize: 13, fontWeight: '600', color: '#37474F' },
  txDate: { fontSize: 11, color: '#90A4AE', marginTop: 2 },
  txStatus: { fontSize: 10, color: '#B0BEC5', marginTop: 1, textTransform: 'uppercase' },
  txAmount: { fontSize: 16, fontWeight: '700' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#90A4AE', marginTop: 12 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: NAVY },
  modalLabel: { fontSize: 14, color: '#78909C', marginBottom: 12 },
  modalInput: {
    backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 18, fontWeight: '600', color: '#1B2631',
    borderWidth: 1, borderColor: '#E0E0E0', textAlign: 'center',
  },
  modalNote: { fontSize: 12, color: '#90A4AE', lineHeight: 18, marginTop: 12, textAlign: 'center' },
  modalBtn: {
    backgroundColor: NAVY, paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 20,
  },
  topUpModalBtn: {
    backgroundColor: '#4CAF50', paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 20,
  },
  modalBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Quick amount chips
  quickAmounts: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12,
  },
  quickChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0',
  },
  quickChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  quickChipText: { fontSize: 13, color: '#78909C', fontWeight: '600' },
  quickChipTextActive: { color: '#fff' },
});
