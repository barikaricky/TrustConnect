import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../services/AuthContext';
import {
  Dispute,
  getDispute,
  respondToDispute,
  makeSettlementOffer,
  acceptSettlementOffer,
  escalateDispute,
  uploadDisputeEvidence,
} from '../services/disputeService';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

export default function DisputeDetailScreen() {
  const params = useLocalSearchParams<{ disputeId: string }>();
  const { user } = useAuth();
  const currentUserId = user?.userId || user?.id;
  const currentRole = user?.role;
  const disputeId = Number(params.disputeId);

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Response form
  const [showResponse, setShowResponse] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responsePhotos, setResponsePhotos] = useState<string[]>([]);
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Settlement form
  const [showOffer, setShowOffer] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadDispute();
  }, []);

  const loadDispute = useCallback(async () => {
    try {
      const d = await getDispute(disputeId);
      setDispute(d);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to load dispute');
    } finally {
      setLoading(false);
    }
  }, [disputeId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDispute();
    setRefreshing(false);
  };

  // ─── Countdown Timer ──────────────────────────────────────
  const getTimeRemaining = () => {
    if (!dispute?.negotiationDeadline) return null;
    const deadline = new Date(dispute.negotiationDeadline).getTime();
    const now = Date.now();
    const diff = deadline - now;
    if (diff <= 0) return { expired: true, text: 'Negotiation period expired' };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { expired: false, text: `${hours}h ${minutes}m remaining` };
  };

  // ─── Artisan Response ─────────────────────────────────────
  const handlePickResponsePhoto = async () => {
    if (responsePhotos.length >= 5) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        const url = await uploadDisputeEvidence(result.assets[0].uri);
        setResponsePhotos(prev => [...prev, url]);
      } catch {
        Alert.alert('Error', 'Failed to upload photo');
      }
    }
  };

  const handleSubmitResponse = async () => {
    if (!responseText.trim()) {
      Alert.alert('Response Required', 'Please provide your response.');
      return;
    }
    setSubmittingResponse(true);
    try {
      await respondToDispute(disputeId, currentUserId!, responseText.trim(), responsePhotos);
      Alert.alert('Response Submitted', 'Your response has been recorded.');
      setShowResponse(false);
      setResponseText('');
      setResponsePhotos([]);
      await loadDispute();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to submit response');
    } finally {
      setSubmittingResponse(false);
    }
  };

  // ─── Settlement Offer ─────────────────────────────────────
  const handleMakeOffer = async () => {
    const amount = Number(offerAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Enter a valid settlement amount.');
      return;
    }
    setSubmittingOffer(true);
    try {
      await makeSettlementOffer(disputeId, currentUserId!, currentRole as 'customer' | 'artisan', amount, offerMessage.trim() || undefined);
      Alert.alert('Offer Sent', `Settlement offer of ₦${amount.toLocaleString()} has been sent.`);
      setShowOffer(false);
      setOfferAmount('');
      setOfferMessage('');
      await loadDispute();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to make offer');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleAcceptOffer = async (offerIndex: number) => {
    Alert.alert(
      'Accept Settlement?',
      'This will finalize the dispute and distribute funds accordingly.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setProcessing(true);
            try {
              await acceptSettlementOffer(disputeId, currentUserId!, offerIndex);
              Alert.alert('Settlement Accepted', 'The dispute has been resolved.');
              await loadDispute();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed to accept offer');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleEscalate = async () => {
    Alert.alert(
      'Escalate to Admin?',
      'This will send the dispute to our admin team for a final verdict.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Escalate',
          onPress: async () => {
            setProcessing(true);
            try {
              await escalateDispute(disputeId);
              Alert.alert('Escalated', 'The dispute has been escalated to admin review.');
              await loadDispute();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed to escalate');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  // ─── Render ───────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={styles.loadingText}>Loading dispute...</Text>
      </View>
    );
  }

  if (!dispute) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle" size={48} color="#E53935" />
        <Text style={styles.loadingText}>Dispute not found</Text>
      </View>
    );
  }

  const timer = getTimeRemaining();
  const isArtisan = currentUserId === dispute.artisanUserId;
  const isCustomer = currentUserId === dispute.raisedBy;
  const isNegotiating = dispute.status === 'open' || dispute.status === 'negotiating';
  const hasResponded = !!dispute.artisanResponse;

  const statusColors: Record<string, string> = {
    open: '#F57C00',
    negotiating: '#1565C0',
    escalated: '#7B1FA2',
    resolved: '#2E7D32',
    closed: '#78909C',
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#B71C1C', '#C62828']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Dispute #{dispute.id}</Text>
          <Text style={styles.headerSub}>{dispute.category.replace(/_/g, ' ').toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[dispute.status] || '#78909C' }]}>
          <Text style={styles.statusBadgeText}>{dispute.status.toUpperCase()}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[NAVY]} />}
      >
        {/* Timer */}
        {isNegotiating && timer && (
          <View style={[styles.timerCard, timer.expired && styles.timerExpired]}>
            <Ionicons name="timer" size={24} color={timer.expired ? '#E53935' : '#F57C00'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.timerTitle}>Negotiation Period</Text>
              <Text style={[styles.timerText, timer.expired && { color: '#E53935' }]}>{timer.text}</Text>
            </View>
            {timer.expired && isNegotiating && (
              <TouchableOpacity style={styles.escalateBtn} onPress={handleEscalate} disabled={processing}>
                <Text style={styles.escalateBtnText}>Escalate</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Description Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text" size={18} color={NAVY} />
            <Text style={styles.cardTitle}>Customer's Complaint</Text>
          </View>
          <Text style={styles.description}>{dispute.description}</Text>
          <Text style={styles.raisedBy}>
            Filed by {dispute.customerName || `User #${dispute.raisedBy}`} · {new Date(dispute.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Customer Evidence */}
        {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="camera" size={18} color={NAVY} />
              <Text style={styles.cardTitle}>Customer Evidence ({dispute.evidenceUrls.length})</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evidenceScroll}>
              {dispute.evidenceUrls.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.evidencePhoto} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Artisan Response */}
        {hasResponded ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="message-reply-text" size={18} color={NAVY} />
              <Text style={styles.cardTitle}>Artisan's Response</Text>
            </View>
            <Text style={styles.description}>{dispute.artisanResponse}</Text>
            {dispute.artisanEvidenceUrls && dispute.artisanEvidenceUrls.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evidenceScroll}>
                {dispute.artisanEvidenceUrls.map((url, i) => (
                  <Image key={i} source={{ uri: url }} style={styles.evidencePhoto} />
                ))}
              </ScrollView>
            )}
          </View>
        ) : isArtisan && isNegotiating ? (
          !showResponse ? (
            <TouchableOpacity style={styles.actionCard} onPress={() => setShowResponse(true)}>
              <MaterialCommunityIcons name="message-reply" size={24} color={NAVY} />
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>Submit Your Response</Text>
                <Text style={styles.actionCardSub}>Share your side and upload evidence</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#B0BEC5" />
            </TouchableOpacity>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your Response</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Explain your side..."
                placeholderTextColor="#90A4AE"
                value={responseText}
                onChangeText={setResponseText}
                multiline
                textAlignVertical="top"
              />
              <View style={styles.responsePhotos}>
                {responsePhotos.map((url, i) => (
                  <Image key={i} source={{ uri: url }} style={styles.smallPhoto} />
                ))}
                <TouchableOpacity style={styles.addSmallPhoto} onPress={handlePickResponsePhoto}>
                  <Ionicons name="camera-outline" size={20} color={NAVY} />
                </TouchableOpacity>
              </View>
              <View style={styles.responseActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowResponse(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, submittingResponse && styles.btnDisabled]}
                  onPress={handleSubmitResponse}
                  disabled={submittingResponse}
                >
                  {submittingResponse ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Submit Response</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )
        ) : (
          <View style={styles.waitingCard}>
            <MaterialCommunityIcons name="clock-outline" size={24} color="#78909C" />
            <Text style={styles.waitingText}>Waiting for artisan's response...</Text>
          </View>
        )}

        {/* Settlement Offers */}
        {dispute.settlementOffers && dispute.settlementOffers.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="swap-horizontal" size={18} color={NAVY} />
              <Text style={styles.cardTitle}>Settlement Offers</Text>
            </View>
            {dispute.settlementOffers.map((offer, i) => {
              const isMine = offer.offeredBy === currentUserId;
              const canAccept = !isMine && offer.status === 'pending' && isNegotiating;
              return (
                <View key={i} style={styles.offerRow}>
                  <View style={styles.offerInfo}>
                    <Text style={styles.offerFrom}>{isMine ? 'You' : (isArtisan ? 'Customer' : 'Artisan')}</Text>
                    <Text style={styles.offerAmount}>₦{offer.amount.toLocaleString()}</Text>
                    {offer.message && <Text style={styles.offerMsg}>{offer.message}</Text>}
                    <Text style={[styles.offerStatus, {
                      color: offer.status === 'accepted' ? '#4CAF50' : offer.status === 'rejected' ? '#E53935' : '#F57C00'
                    }]}>
                      {offer.status.toUpperCase()}
                    </Text>
                  </View>
                  {canAccept && (
                    <TouchableOpacity
                      style={styles.acceptOfferBtn}
                      onPress={() => handleAcceptOffer(i)}
                      disabled={processing}
                    >
                      <Text style={styles.acceptOfferText}>Accept</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Make Offer / Escalate actions */}
        {isNegotiating && (
          <View style={styles.actionRow}>
            {!showOffer ? (
              <>
                <TouchableOpacity style={styles.offerBtn} onPress={() => setShowOffer(true)}>
                  <Ionicons name="cash-outline" size={18} color={NAVY} />
                  <Text style={styles.offerBtnText}>Make Offer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.escalateActionBtn} onPress={handleEscalate} disabled={processing}>
                  <Ionicons name="arrow-up-circle" size={18} color="#C62828" />
                  <Text style={styles.escalateActionText}>Escalate</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={[styles.card, { width: '100%' }]}>
                <Text style={styles.cardTitle}>Settlement Offer</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Amount (₦)"
                  keyboardType="numeric"
                  value={offerAmount}
                  onChangeText={setOfferAmount}
                />
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  placeholder="Message (optional)"
                  value={offerMessage}
                  onChangeText={setOfferMessage}
                />
                <View style={styles.responseActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowOffer(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtn, submittingOffer && styles.btnDisabled]}
                    onPress={handleMakeOffer}
                    disabled={submittingOffer}
                  >
                    {submittingOffer ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Send Offer</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Admin Verdict */}
        {dispute.adminVerdict && (
          <View style={styles.verdictCard}>
            <LinearGradient colors={[NAVY, '#283593']} style={styles.verdictGradient}>
              <MaterialCommunityIcons name="gavel" size={32} color={GOLD} />
              <Text style={styles.verdictTitle}>Admin Verdict</Text>
              <Text style={styles.verdictType}>
                {dispute.adminVerdict.replace(/_/g, ' ').toUpperCase()}
              </Text>
              {dispute.adminVerdictNote && (
                <Text style={styles.verdictNote}>{dispute.adminVerdictNote}</Text>
              )}
              {dispute.splitPercentage && (
                <Text style={styles.verdictSplit}>
                  Split: {dispute.splitPercentage}% Customer / {100 - dispute.splitPercentage}% Artisan
                </Text>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Resolved Notice */}
        {(dispute.status === 'resolved' || dispute.status === 'closed') && (
          <View style={styles.resolvedCard}>
            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
            <Text style={styles.resolvedText}>This dispute has been resolved.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  loadingText: { marginTop: 12, color: '#78909C', fontSize: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  statusBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  body: { flex: 1, padding: 16 },

  // Timer
  timerCard: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: '#FFF3E0', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#FFE082',
  },
  timerExpired: { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' },
  timerTitle: { fontSize: 13, fontWeight: '700', color: '#E65100' },
  timerText: { fontSize: 14, fontWeight: '600', color: '#F57C00' },
  escalateBtn: {
    backgroundColor: '#C62828', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  escalateBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 16, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: NAVY },

  description: { fontSize: 14, color: '#37474F', lineHeight: 22 },
  raisedBy: { fontSize: 12, color: '#90A4AE', marginTop: 8 },

  // Evidence
  evidenceScroll: { marginTop: 10 },
  evidencePhoto: { width: 160, height: 120, borderRadius: 10, marginRight: 10 },

  // Action card
  actionCard: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 2, borderColor: NAVY, borderStyle: 'dashed',
  },
  actionCardTitle: { fontSize: 14, fontWeight: '700', color: NAVY },
  actionCardSub: { fontSize: 12, color: '#78909C' },

  // Waiting
  waitingCard: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: '#ECEFF1', borderRadius: 12, padding: 14, marginBottom: 16,
  },
  waitingText: { fontSize: 13, color: '#78909C', fontStyle: 'italic' },

  // Response form
  textArea: {
    backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#1B2631', minHeight: 100, marginTop: 10,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  responsePhotos: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  smallPhoto: { width: 60, height: 60, borderRadius: 8 },
  addSmallPhoto: {
    width: 60, height: 60, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#E0E0E0', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  responseActions: { flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'flex-end' },
  cancelBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#B0BEC5',
  },
  cancelBtnText: { color: '#78909C', fontWeight: '600' },
  primaryBtn: {
    backgroundColor: NAVY, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  // Offers
  offerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  offerInfo: { flex: 1 },
  offerFrom: { fontSize: 12, color: '#78909C', fontWeight: '500' },
  offerAmount: { fontSize: 18, fontWeight: '800', color: NAVY },
  offerMsg: { fontSize: 12, color: '#78909C', marginTop: 2 },
  offerStatus: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  acceptOfferBtn: {
    backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
  },
  acceptOfferText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Action row
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  offerBtn: {
    flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', paddingVertical: 14, borderRadius: 12,
    borderWidth: 2, borderColor: NAVY,
  },
  offerBtnText: { fontSize: 14, fontWeight: '700', color: NAVY },
  escalateActionBtn: {
    flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', paddingVertical: 14, borderRadius: 12,
    borderWidth: 2, borderColor: '#C62828',
  },
  escalateActionText: { fontSize: 14, fontWeight: '700', color: '#C62828' },

  input: {
    backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1B2631', borderWidth: 1, borderColor: '#E0E0E0', marginTop: 10,
  },

  // Verdict
  verdictCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  verdictGradient: { padding: 24, alignItems: 'center', gap: 10 },
  verdictTitle: { fontSize: 14, color: GOLD, fontWeight: '700' },
  verdictType: { fontSize: 22, fontWeight: '800', color: '#fff' },
  verdictNote: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20 },
  verdictSplit: { fontSize: 14, color: GOLD, fontWeight: '600', marginTop: 4 },

  // Resolved
  resolvedCard: {
    alignItems: 'center', gap: 10, padding: 24,
    backgroundColor: '#E8F5E9', borderRadius: 16, marginBottom: 16,
  },
  resolvedText: { fontSize: 16, fontWeight: '700', color: '#2E7D32' },
});
