import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../services/AuthContext';
import {
  Quote,
  EscrowStatus,
  getQuote,
  fundEscrow,
  verifyPayment,
  getEscrowStatus,
  devSimulatePayment,
  markJobDone,
  confirmAndRelease,
} from '../services/escrowService';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

type PaymentStep = 'quote-review' | 'paying' | 'funded' | 'in-progress' | 'job-done' | 'released';

export default function EscrowPaymentScreen() {
  const params = useLocalSearchParams<{ quoteId?: string; bookingId?: string }>();
  const { user } = useAuth();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [escrow, setEscrow] = useState<EscrowStatus | null>(null);
  const [step, setStep] = useState<PaymentStep>('quote-review');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [payoutInfo, setPayoutInfo] = useState<any>(null);

  const currentUserId = user?.userId || user?.id;
  const currentRole = user?.role;
  const quoteId = params.quoteId ? Number(params.quoteId) : undefined;
  const bookingId = params.bookingId ? Number(params.bookingId) : undefined;

  // Load quote & escrow data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (quoteId) {
        const q = await getQuote(quoteId);
        setQuote(q);
        // If there's a booking, load escrow status
        if (q.bookingId) {
          try {
            const es = await getEscrowStatus(q.bookingId);
            setEscrow(es);
            determineStep(es.status);
          } catch {
            setStep('quote-review');
          }
        }
      } else if (bookingId) {
        const es = await getEscrowStatus(bookingId);
        setEscrow(es);
        determineStep(es.status);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [quoteId, bookingId]);

  const determineStep = (status: string) => {
    switch (status) {
      case 'funded': setStep('funded'); break;
      case 'in-progress': setStep('in-progress'); break;
      case 'job-done': setStep('job-done'); break;
      case 'released': setStep('released'); break;
      case 'completed': setStep('released'); break;
      default: setStep('quote-review');
    }
  };

  // ─── Fund Escrow ────────────────────────────────────────────
  const handleFundEscrow = async () => {
    if (!quoteId || !currentUserId) return;
    setProcessing(true);
    try {
      const idemKey = `idem-${quoteId}-${currentUserId}-${Date.now()}`;
      const result = await fundEscrow(quoteId, currentUserId, idemKey);
      setPaymentRef(result.transaction.paymentRef);

      // Use Flutterwave payment link if available, fallback to paystack shape
      const payUrl =
        result.flutterwave?.payment_link ||
        result.paystack?.authorization_url ||
        '';

      if (payUrl.includes('dev-pay') || payUrl.includes('dev-sim') || payUrl.includes('localhost')) {
        // Dev mode: simulate payment
        Alert.alert(
          'DEV Mode Payment',
          `Amount: ₦${result.transaction.amount.toLocaleString()}\n\nSimulate payment?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setProcessing(false) },
            {
              text: 'Pay Now',
              onPress: async () => {
                try {
                  await devSimulatePayment(result.transaction.paymentRef);
                  Alert.alert('Success', 'Payment simulated successfully!');
                  await loadData();
                } catch (err: any) {
                  Alert.alert('Error', err?.response?.data?.error || 'Payment simulation failed');
                } finally {
                  setProcessing(false);
                }
              },
            },
          ]
        );
      } else {
        // Production: open Flutterwave checkout page
        await Linking.openURL(payUrl);
        setStep('paying');
        setProcessing(false);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to initiate payment');
      setProcessing(false);
    }
  };

  // ─── Verify Payment ────────────────────────────────────────
  const handleVerifyPayment = async () => {
    if (!paymentRef) return;
    setProcessing(true);
    try {
      await verifyPayment(paymentRef);
      Alert.alert('Success', 'Payment verified! Funds are now held in escrow.');
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Payment verification failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // ─── Mark Job Done (Artisan) ───────────────────────────────
  const handleMarkJobDone = async () => {
    const bId = bookingId || escrow?.bookingId;
    if (!bId || !currentUserId) return;
    Alert.alert(
      'Mark as Complete?',
      'Confirm that you have finished this job. The customer will be asked to verify and release payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Job Done',
          onPress: async () => {
            setProcessing(true);
            try {
              await markJobDone(bId, currentUserId);
              Alert.alert('Success', 'Job marked as complete! Waiting for customer confirmation.');
              await loadData();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed to update status');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  // ─── Confirm & Release (Customer) ─────────────────────────
  const handleConfirmRelease = async () => {
    const bId = bookingId || escrow?.bookingId;
    if (!bId || !currentUserId) return;
    Alert.alert(
      'Release Payment?',
      'Confirm you are satisfied with the work. Funds will be released to the artisan (minus 10% platform commission).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release Funds',
          style: 'default',
          onPress: async () => {
            setProcessing(true);
            try {
              const payout = await confirmAndRelease(bId, currentUserId);
              setPayoutInfo(payout);
              Alert.alert('Payment Released!', `Artisan will receive ₦${payout.artisanPayout.toLocaleString()}`);
              await loadData();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed to release payment');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  // ─── Render ─────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={styles.loadingText}>Loading escrow details...</Text>
      </View>
    );
  }

  const q = quote || (escrow?.quote ? { ...escrow.quote, workDescription: '', duration: '' } as any : null);

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={[NAVY, '#283593']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Escrow Payment</Text>
          <Text style={styles.headerSub}>Secure payment protection</Text>
        </View>
        <MaterialCommunityIcons name="shield-lock" size={28} color={GOLD} />
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          {renderProgressStep('Quote', 'document-text', true)}
          {renderProgressLine(step !== 'quote-review')}
          {renderProgressStep('Payment', 'card', ['funded', 'in-progress', 'job-done', 'released'].includes(step))}
          {renderProgressLine(['in-progress', 'job-done', 'released'].includes(step))}
          {renderProgressStep('Work', 'construct', ['in-progress', 'job-done', 'released'].includes(step))}
          {renderProgressLine(['job-done', 'released'].includes(step))}
          {renderProgressStep('Complete', 'checkmark-circle', step === 'released')}
        </View>

        {/* Quote Summary Card */}
        {q && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="file-document-outline" size={20} color={NAVY} />
              <Text style={styles.cardTitle}>Quote Summary</Text>
            </View>
            {quote?.workDescription ? (
              <Text style={styles.workDesc}>{quote.workDescription}</Text>
            ) : null}
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Labor</Text>
              <Text style={styles.costValue}>₦{q.laborCost.toLocaleString()}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Materials</Text>
              <Text style={styles.costValue}>₦{q.materialsCost.toLocaleString()}</Text>
            </View>
            <View style={[styles.costRow, styles.subtotalRow]}>
              <Text style={styles.costLabelBold}>Subtotal</Text>
              <Text style={styles.costValueBold}>₦{q.totalCost.toLocaleString()}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Service Fee (5%)</Text>
              <Text style={styles.costValue}>₦{q.serviceFee.toLocaleString()}</Text>
            </View>
            <View style={[styles.costRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL TO PAY</Text>
              <Text style={styles.totalValue}>₦{q.grandTotal.toLocaleString()}</Text>
            </View>
            {quote?.duration && (
              <View style={styles.durationRow}>
                <Ionicons name="time-outline" size={16} color="#78909C" />
                <Text style={styles.durationText}>Est. Duration: {quote.duration}</Text>
              </View>
            )}
          </View>
        )}

        {/* Escrow Protection Notice */}
        <View style={styles.protectionCard}>
          <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
          <View style={{ flex: 1 }}>
            <Text style={styles.protectionTitle}>Escrow Protection</Text>
            <Text style={styles.protectionText}>
              Your payment is securely held until you confirm the work is complete.
              You can raise a dispute at any time.
            </Text>
          </View>
        </View>

        {/* Action Buttons based on step */}
        {step === 'quote-review' && currentRole === 'customer' && (
          <TouchableOpacity
            style={[styles.primaryBtn, processing && styles.btnDisabled]}
            onPress={handleFundEscrow}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Fund Escrow - ₦{q?.grandTotal?.toLocaleString()}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {step === 'paying' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Awaiting Payment</Text>
            <Text style={styles.cardSubText}>Complete payment in your browser, then tap below to verify.</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, processing && styles.btnDisabled]}
              onPress={handleVerifyPayment}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>I've Paid - Verify</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 'funded' && (
          <View style={styles.statusCard}>
            <LinearGradient colors={['#E8F5E9', '#C8E6C9']} style={styles.statusGradient}>
              <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />
              <Text style={styles.statusTitle}>Escrow Funded!</Text>
              <Text style={styles.statusText}>
                ₦{escrow?.escrowAmount?.toLocaleString()} is held securely in escrow.
                {currentRole === 'artisan'
                  ? ' You can now begin working on the job.'
                  : ' The artisan can now begin working.'}
              </Text>
              {currentRole === 'artisan' && (
                <TouchableOpacity
                  style={[styles.actionBtn, processing && styles.btnDisabled]}
                  onPress={handleMarkJobDone}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="hammer" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Mark Job as Done</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>
        )}

        {step === 'in-progress' && (
          <View style={styles.statusCard}>
            <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.statusGradient}>
              <MaterialCommunityIcons name="progress-wrench" size={40} color="#1565C0" />
              <Text style={styles.statusTitle}>Work In Progress</Text>
              <Text style={styles.statusText}>
                {currentRole === 'artisan'
                  ? 'Complete the job and mark it as done when finished.'
                  : 'The artisan is working on your job.'}
              </Text>
              {currentRole === 'artisan' && (
                <TouchableOpacity
                  style={[styles.actionBtn, processing && styles.btnDisabled]}
                  onPress={handleMarkJobDone}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Mark Job as Done</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>
        )}

        {step === 'job-done' && (
          <View style={styles.statusCard}>
            <LinearGradient colors={['#FFF3E0', '#FFE0B2']} style={styles.statusGradient}>
              <Ionicons name="checkmark-done-circle" size={40} color="#F57C00" />
              <Text style={styles.statusTitle}>Job Completed</Text>
              <Text style={styles.statusText}>
                {currentRole === 'customer'
                  ? 'The artisan has marked the job as complete. Please review the work and release payment.'
                  : 'Waiting for customer to confirm and release payment.'}
              </Text>
              {currentRole === 'customer' && (
                <View style={styles.jobDoneActions}>
                  <TouchableOpacity
                    style={styles.disputeLink}
                    onPress={() => {
                      const bId = bookingId || escrow?.bookingId;
                      if (bId) router.push(`/dispute?bookingId=${bId}`);
                    }}
                  >
                    <Ionicons name="warning" size={16} color="#E53935" />
                    <Text style={styles.disputeLinkText}>Raise Dispute</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.releaseBtn, processing && styles.btnDisabled]}
                    onPress={handleConfirmRelease}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="lock-open" size={18} color="#fff" />
                        <Text style={styles.releaseBtnText}>Release Payment</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        {step === 'released' && (
          <View style={styles.statusCard}>
            <LinearGradient colors={['#E8F5E9', '#A5D6A7']} style={styles.statusGradient}>
              <Ionicons name="checkmark-circle" size={48} color="#2E7D32" />
              <Text style={styles.statusTitle}>Payment Released!</Text>
              {payoutInfo ? (
                <View style={styles.payoutCard}>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Total Cost</Text>
                    <Text style={styles.costValue}>₦{payoutInfo.totalCost.toLocaleString()}</Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Commission ({payoutInfo.commissionRate})</Text>
                    <Text style={styles.costValue}>-₦{payoutInfo.commission.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.costRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Artisan Payout</Text>
                    <Text style={styles.totalValue}>₦{payoutInfo.artisanPayout.toLocaleString()}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.statusText}>
                  {currentRole === 'artisan'
                    ? 'Payment has been credited to your wallet!'
                    : 'The artisan has received their payment. Thank you!'}
                </Text>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Transaction History */}
        {escrow?.transactions && escrow.transactions.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="receipt-outline" size={20} color={NAVY} />
              <Text style={styles.cardTitle}>Transactions</Text>
            </View>
            {escrow.transactions.map((tx, i) => (
              <View key={i} style={styles.txRow}>
                <View style={styles.txIcon}>
                  <Ionicons
                    name={tx.type === 'escrow_fund' ? 'lock-closed' : tx.type === 'escrow_release' ? 'lock-open' : 'cash'}
                    size={16}
                    color={tx.status === 'completed' || tx.status === 'released' ? '#4CAF50' : '#F57C00'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txType}>{tx.type.replace(/_/g, ' ').toUpperCase()}</Text>
                  <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleString()}</Text>
                </View>
                <Text style={styles.txAmount}>₦{tx.amount.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Progress Step Component ────────────────────────────────
function renderProgressStep(label: string, icon: string, active: boolean) {
  return (
    <View style={styles.progressStep}>
      <View style={[styles.progressIcon, active && styles.progressIconActive]}>
        <Ionicons name={icon as any} size={18} color={active ? '#fff' : '#B0BEC5'} />
      </View>
      <Text style={[styles.progressLabel, active && styles.progressLabelActive]}>{label}</Text>
    </View>
  );
}

function renderProgressLine(active: boolean) {
  return <View style={[styles.progressLine, active && styles.progressLineActive]} />;
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  loadingText: { marginTop: 12, color: '#78909C', fontSize: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  body: { flex: 1, padding: 16 },

  // Progress
  progressContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, marginBottom: 12,
  },
  progressStep: { alignItems: 'center', gap: 4 },
  progressIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#ECEFF1', justifyContent: 'center', alignItems: 'center',
  },
  progressIconActive: { backgroundColor: NAVY },
  progressLabel: { fontSize: 11, color: '#B0BEC5', fontWeight: '500' },
  progressLabelActive: { color: NAVY, fontWeight: '700' },
  progressLine: { width: 30, height: 3, backgroundColor: '#ECEFF1', marginHorizontal: 2 },
  progressLineActive: { backgroundColor: NAVY },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 16, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: NAVY },
  cardSubText: { fontSize: 14, color: '#78909C', marginBottom: 12, lineHeight: 20 },

  workDesc: { fontSize: 14, color: '#37474F', lineHeight: 20, marginBottom: 12 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  costLabel: { fontSize: 14, color: '#78909C' },
  costValue: { fontSize: 14, color: '#37474F', fontWeight: '500' },
  costLabelBold: { fontSize: 14, color: '#37474F', fontWeight: '600' },
  costValueBold: { fontSize: 14, color: '#37474F', fontWeight: '700' },
  subtotalRow: { borderTopWidth: 1, borderTopColor: '#ECEFF1', paddingTop: 8, marginTop: 4 },
  totalRow: { borderTopWidth: 2, borderTopColor: NAVY, paddingTop: 10, marginTop: 6 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: NAVY },
  totalValue: { fontSize: 18, fontWeight: '800', color: NAVY },

  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  durationText: { fontSize: 13, color: '#78909C' },

  // Protection card
  protectionCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#C8E6C9',
  },
  protectionTitle: { fontSize: 14, fontWeight: '700', color: '#2E7D32' },
  protectionText: { fontSize: 12, color: '#388E3C', lineHeight: 18, marginTop: 2 },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: NAVY, paddingVertical: 16, borderRadius: 14,
    marginBottom: 16, elevation: 3,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  btnDisabled: { opacity: 0.7 },

  actionBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: NAVY, paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 12, marginTop: 14,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Status cards
  statusCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  statusGradient: { padding: 24, alignItems: 'center', gap: 10 },
  statusTitle: { fontSize: 20, fontWeight: '800', color: '#1B2631' },
  statusText: { fontSize: 14, color: '#37474F', textAlign: 'center', lineHeight: 20, marginTop: 4 },

  // Job done actions
  jobDoneActions: { flexDirection: 'row', gap: 12, marginTop: 14, alignItems: 'center' },
  disputeLink: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#E53935',
  },
  disputeLinkText: { color: '#E53935', fontWeight: '600', fontSize: 13 },
  releaseBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: '#4CAF50', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10,
  },
  releaseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Payout
  payoutCard: { width: '100%', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: 12 },

  // Transactions
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  txIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center',
  },
  txType: { fontSize: 12, fontWeight: '600', color: '#37474F' },
  txDate: { fontSize: 11, color: '#90A4AE' },
  txAmount: { fontSize: 14, fontWeight: '700', color: NAVY },
});
