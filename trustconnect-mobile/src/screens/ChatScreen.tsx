import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useAuth } from '../services/AuthContext';
import { containsProfanity, PROFANITY_ALERT_TITLE, PROFANITY_ALERT_BODY } from '../utils/profanityFilter';
import {
  getOrCreateConversation,
  sendMessage as sendMessageApi,
  getMessages,
  markAsRead,
  uploadChatImage,
  uploadChatVideo,
  submitWorkProof,
  getBookingForChat,
  sendInvoice,
  respondToInvoice,
  InvoiceData,
  ChatMessage,
  Conversation,
} from '../services/chatService';
import {
  createQuote,
  getQuote,
  acceptQuote,
  rejectQuote,
  requestNegotiation,
  getWalletBalance,
  getEscrowStatus,
  requestRevision as requestRevisionApi,
  releaseMilestone as releaseMilestoneApi,
  Quote,
  Milestone,
} from '../services/escrowService';
import { releaseFund, uploadProofVideo as uploadProofVideoApi } from '../services/bookingService';
import { EscrowStatusCard, MilestoneCard, MilestoneProgress, QuotePdfButton } from '../components/EscrowChatCard';
import { API_BASE_URL } from '../config/api';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

// Socket.io client - lazy loaded
let socket: any = null;
const getSocket = () => {
  if (!socket) {
    try {
      const { io } = require('socket.io-client');
      const baseUrl = API_BASE_URL.replace('/api', '');
      socket = io(baseUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });
    } catch (e) {
      console.log('Socket.io client not available');
    }
  }
  return socket;
};

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    artisanUserId?: string;
    artisanName?: string;
    artisanPhoto?: string;
    artisanTrade?: string;
    conversationId?: string;
    bookingId?: string;
  }>();

  const { user, userRole } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI voice note playback
  const [playingAiId, setPlayingAiId] = useState<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Quote form state (artisan)
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteDesc, setQuoteDesc] = useState('');
  const [quoteLaborCost, setQuoteLaborCost] = useState('');
  const [quoteMaterialsCost, setQuoteMaterialsCost] = useState('');
  const [quoteDuration, setQuoteDuration] = useState('');
  const [sendingQuote, setSendingQuote] = useState(false);
  // Quote data cache for rendering
  const [quoteCache, setQuoteCache] = useState<Record<number, Quote>>({});

  // ── Escrow / Work Proof state ────────────────────────────────
  const [activeBookingId, setActiveBookingId] = useState<string | null>(params.bookingId || null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [bookingEscrowAmount, setBookingEscrowAmount] = useState(0);
  const [showWorkProofModal, setShowWorkProofModal] = useState(false);
  const [workProofPhotos, setWorkProofPhotos] = useState<(string | null)[]>([null, null, null]);
  const [uploadingProofIndex, setUploadingProofIndex] = useState<number | null>(null);
  const [submittingWork, setSubmittingWork] = useState(false);
  const [releasingFunds, setReleasingFunds] = useState(false);
  const [showRulesBanner, setShowRulesBanner] = useState(true);
  const [bookingMilestones, setBookingMilestones] = useState<Milestone[] | null>(null);
  const [currentMilestoneIndex, setCurrentMilestoneIndex] = useState<number | undefined>(undefined);
  const [autoReleaseAt, setAutoReleaseAt] = useState<string | null>(null);

  // ── Negotiation state ────────────────────────────────────────
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [negotiatingQuoteId, setNegotiatingQuoteId] = useState<number | null>(null);
  const [negotiationReason, setNegotiationReason] = useState('');
  const [sendingNegotiation, setSendingNegotiation] = useState(false);

  // ── Work proof declaration ───────────────────────────────────
  const [declarationAgreed, setDeclarationAgreed] = useState(false);

  // ── Invoice state (artisan sends, customer responds) ────────
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceDesc, setInvoiceDesc] = useState('');
  const [invoiceLaborCost, setInvoiceLaborCost] = useState('');
  const [invoiceMaterialsCost, setInvoiceMaterialsCost] = useState('');
  const [invoiceDuration, setInvoiceDuration] = useState('');
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [respondingInvoice, setRespondingInvoice] = useState<number | null>(null);

  // ── Video message state ──────────────────────────────────────
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // ── Video proof state ────────────────────────────────────────
  const [proofVideoUri, setProofVideoUri] = useState<string | null>(null);
  const [uploadingProofVideo, setUploadingProofVideo] = useState(false);

  const currentUserId = user?.id || user?.userId;
  const currentRole = userRole || 'customer';

  useEffect(() => {
    initChat();
    return () => {
      // Leave conversation room on unmount
      const s = getSocket();
      if (s && conversation) {
        s.emit('leave_conversation', String(conversation.id));
      }
      // Stop AI voice playback on unmount
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const initChat = async () => {
    try {
      setLoading(true);

      let conv: Conversation;

      if (params.conversationId) {
        // Coming from conversation list - load existing
        const result = await getMessages(parseInt(params.conversationId));
        setMessages(result.messages);
        setHasMore(result.hasMore);
        conv = {
          id: parseInt(params.conversationId),
          customerId: 0,
          artisanUserId: parseInt(params.artisanUserId || '0'),
          bookingId: params.bookingId ? parseInt(params.bookingId) : undefined,
          customerUnread: 0,
          artisanUnread: 0,
          customerName: '',
          customerAvatar: null,
          artisanName: params.artisanName || 'Artisan',
          artisanAvatar: params.artisanPhoto || null,
          artisanTrade: params.artisanTrade || '',
          unreadCount: 0,
          createdAt: '',
          updatedAt: '',
        };
        setConversation(conv);
      } else {
        // Coming from artisan profile / booking — get or create conversation
        // Backend enforces: a booking must exist before messaging
        try {
          const result = await getOrCreateConversation(
            currentUserId,
            params.artisanUserId || '0',
            params.bookingId   // Pass bookingId so backend can authorize via booking
          );
          conv = result.conversation;
          setConversation(conv);

          // Load messages
          const msgResult = await getMessages(conv.id);
          setMessages(msgResult.messages);
          setHasMore(msgResult.hasMore);
        } catch (chatErr: any) {
          const status = chatErr?.response?.status;
          const code = chatErr?.response?.data?.code;
          if (status === 403 && code === 'NO_BOOKING') {
            Alert.alert(
              'Booking Required',
              'You need to hire this artisan before you can send them a message.',
              [{ text: 'OK', onPress: () => router.back() }]
            );
          } else {
            Alert.alert('Error', 'Could not open chat. Please try again.');
            router.back();
          }
          return;
        }
      }

      // Mark as read
      if (conv.id) {
        await markAsRead(conv.id, currentUserId, currentRole as 'customer' | 'artisan');
      }

      // Load booking escrow state — try params.bookingId first, then conv.bookingId
      const effectiveBookingId = params.bookingId || (conv as any).bookingId;
      if (effectiveBookingId) {
        try {
          const booking = await getBookingForChat(effectiveBookingId);
          if (booking) {
            setBookingStatus(booking.status);
            setBookingEscrowAmount(booking.escrowAmount || 0);
            setActiveBookingId(String(booking.id));
          }
          // Also load milestone & auto-release info
          try {
            const escrow = await getEscrowStatus(Number(effectiveBookingId));
            if (escrow.milestones) setBookingMilestones(escrow.milestones);
            if (escrow.currentMilestone !== undefined) setCurrentMilestoneIndex(escrow.currentMilestone);
            if (escrow.autoReleaseAt) setAutoReleaseAt(escrow.autoReleaseAt);
          } catch { /* escrow status fetch is optional */ }
        } catch (bookErr) {
          console.log('Could not load booking state:', bookErr);
        }
      }

      // Setup Socket.io
      setupSocket(conv.id);
    } catch (error) {
      console.error('Init chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = (conversationId: number) => {
    const s = getSocket();
    if (!s) return;

    s.emit('join_user', String(currentUserId));
    s.emit('join_conversation', String(conversationId));

    // Listen for new messages
    s.on('new_message', (msg: ChatMessage) => {
      if (msg.conversationId === conversationId && msg.senderId !== currentUserId) {
        setMessages(prev => [...prev, msg]);
        // Mark as read immediately since we're viewing
        markAsRead(conversationId, currentUserId, currentRole as 'customer' | 'artisan');
      }
    });

    // Listen for typing
    s.on('user_typing', (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== String(currentUserId)) {
        setTypingUser(data.isTyping ? 'typing...' : null);
      }
    });

    // Listen for read receipts
    s.on('messages_read', (data: { readBy: number; readByRole: string }) => {
      if (data.readBy !== currentUserId) {
        setMessages(prev =>
          prev.map(m =>
            m.senderId === currentUserId && m.status !== 'read'
              ? { ...m, status: 'read' }
              : m
          )
        );
      }
    });
  };

  const handleSend = async () => {
    if (!inputText.trim() || !conversation || sending) return;

    const text = inputText.trim();

    // ── Profanity / Conduct Filter ────────────────────────────
    if (containsProfanity(text)) {
      Alert.alert(PROFANITY_ALERT_TITLE, PROFANITY_ALERT_BODY, [{ text: 'OK' }]);
      return;
    }
    setInputText('');
    setSending(true);

    // Optimistic update
    const optimisticMsg: ChatMessage = {
      id: Date.now(),
      conversationId: conversation.id,
      senderId: currentUserId,
      senderRole: currentRole as 'customer' | 'artisan',
      type: 'text',
      content: text,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const sentMsg = await sendMessageApi(
        conversation.id,
        currentUserId,
        currentRole as 'customer' | 'artisan',
        text
      );
      // Replace optimistic message with real one
      setMessages(prev =>
        prev.map(m => m.id === optimisticMsg.id ? sentMsg : m)
      );
    } catch (error) {
      console.error('Send failed:', error);
      // Mark as failed
      setMessages(prev =>
        prev.map(m => m.id === optimisticMsg.id ? { ...m, status: 'sent' as const } : m)
      );
    } finally {
      setSending(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0] && conversation) {
        const asset = result.assets[0];

        // Optimistic message with local URI so user sees it immediately
        const optimisticMsg: ChatMessage = {
          id: Date.now(),
          conversationId: conversation.id,
          senderId: currentUserId,
          senderRole: currentRole as 'customer' | 'artisan',
          type: 'image',
          content: '📷 Image',
          imageUrl: asset.uri,
          status: 'sent',
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
          // Upload image
          const imageUrl = await uploadChatImage(asset.uri);

          // Send message with image
          const sentMsg = await sendMessageApi(
            conversation.id,
            currentUserId,
            currentRole as 'customer' | 'artisan',
            '📷 Image',
            'image',
            imageUrl
          );
          // Replace optimistic message with real one
          setMessages(prev =>
            prev.map(m => m.id === optimisticMsg.id ? sentMsg : m)
          );
        } catch (uploadErr) {
          // Remove failed optimistic message
          setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
          Alert.alert('Error', 'Failed to send image. Please try again.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open photo library');
    }
  };

  const handleTyping = () => {
    const s = getSocket();
    if (!s || !conversation) return;

    s.emit('typing', {
      conversationId: String(conversation.id),
      userId: String(currentUserId),
      isTyping: true,
    });

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      s.emit('typing', {
        conversationId: String(conversation.id),
        userId: String(currentUserId),
        isTyping: false,
      });
    }, 2000);
  };

  const loadMore = async () => {
    if (!hasMore || !conversation || messages.length === 0) return;
    const oldest = messages[0]?.createdAt;
    const result = await getMessages(conversation.id, oldest);
    setMessages(prev => [...result.messages, ...prev]);
    setHasMore(result.hasMore);
  };

  // ─── Quote Handlers ──────────────────────────────────────────
  const handleSendQuote = async () => {
    if (!conversation || sendingQuote) return;
    const labor = Number(quoteLaborCost);
    const materials = Number(quoteMaterialsCost);
    if (!quoteDesc.trim() || isNaN(labor) || isNaN(materials) || labor < 0 || materials < 0 || !quoteDuration.trim()) {
      Alert.alert('Invalid', 'Please fill all fields with valid values');
      return;
    }
    setSendingQuote(true);
    try {
      const otherUserId = currentRole === 'artisan'
        ? (conversation.customerId || parseInt(params.artisanUserId || '0'))
        : (conversation.artisanUserId || parseInt(params.artisanUserId || '0'));
      const result = await createQuote({
        conversationId: conversation.id,
        artisanUserId: currentUserId,
        customerId: otherUserId,
        workDescription: quoteDesc.trim(),
        laborCost: labor,
        materialsCost: materials,
        duration: quoteDuration.trim(),
      });
      // Cache the quote data
      setQuoteCache(prev => ({ ...prev, [result.quote.id]: result.quote }));
      // Add message to chat
      setMessages(prev => [...prev, result.chatMessage]);
      // Scroll to the new quote message
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
      // Reset form
      setShowQuoteForm(false);
      setQuoteDesc('');
      setQuoteLaborCost('');
      setQuoteMaterialsCost('');
      setQuoteDuration('');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to send quote');
    } finally {
      setSendingQuote(false);
    }
  };

  const handleAcceptQuote = async (quoteId: number) => {
    // Check wallet balance before accepting
    const q = quoteCache[quoteId];
    const requiredAmount = q?.grandTotal || 0;
    if (requiredAmount > 0) {
      try {
        const wallet = await getWalletBalance(currentUserId);
        if (wallet.balance < requiredAmount) {
          Alert.alert(
            '💳 Insufficient Wallet Balance',
            `You need ₦${requiredAmount.toLocaleString()} to accept this quote.\nYour balance: ₦${wallet.balance.toLocaleString()}\n\nPlease top up your wallet first.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Top Up Wallet', onPress: () => router.push('/wallet' as any) },
            ]
          );
          return;
        }
      } catch {
        // If balance check fails, proceed anyway and let escrow handle it
      }
    }
    Alert.alert('Accept Quote', `Accept this quote (₦${requiredAmount.toLocaleString()}) and proceed to fund escrow?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept & Fund', style: 'default', onPress: async () => {
          try {
            const updated = await acceptQuote(quoteId, currentUserId);
            setQuoteCache(prev => ({ ...prev, [quoteId]: { ...prev[quoteId], ...updated, status: 'accepted' } }));
            // Navigate to escrow payment
            router.push({
              pathname: '/escrow-payment' as any,
              params: { quoteId: String(quoteId), conversationId: String(conversation?.id) },
            });
          } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to accept quote');
          }
        },
      },
    ]);
  };

  const handleRejectQuote = async (quoteId: number) => {
    Alert.alert('Reject Quote', 'Reject this quote? The artisan can send a revised one.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          try {
            await rejectQuote(quoteId, currentUserId);
            setQuoteCache(prev => ({ ...prev, [quoteId]: { ...prev[quoteId], status: 'rejected' } }));
          } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to reject quote');
          }
        },
      },
    ]);
  };

  const handleNegotiateQuote = (quoteId: number) => {
    setNegotiatingQuoteId(quoteId);
    setNegotiationReason('');
    setShowNegotiateModal(true);
  };

  const submitNegotiation = async () => {
    if (!negotiatingQuoteId || sendingNegotiation) return;
    if (!negotiationReason.trim()) {
      Alert.alert('Reason Required', 'Please explain what you\'d like revised.');
      return;
    }
    setSendingNegotiation(true);
    try {
      const result = await requestNegotiation(negotiatingQuoteId, currentUserId, negotiationReason.trim());
      // Mark quote as superseded in cache (artisan needs to resubmit)
      setQuoteCache(prev => ({ ...prev, [negotiatingQuoteId]: { ...prev[negotiatingQuoteId], status: 'superseded' } }));
      if (result.bookingStatus) setBookingStatus(result.bookingStatus);
      setShowNegotiateModal(false);
      Alert.alert(
        '✅ Revision Requested',
        'The artisan has been notified and will submit a revised quote shortly.'
      );
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to send revision request');
    } finally {
      setSendingNegotiation(false);
    }
  };

  // Load quote data when a quote message is encountered
  const loadQuoteData = async (quoteId: number) => {
    if (quoteCache[quoteId]) return;
    try {
      const q = await getQuote(quoteId);
      setQuoteCache(prev => ({ ...prev, [quoteId]: q }));
    } catch (e) { /* ignore */ }
  };

  // ─── Video Message Handler ───────────────────────────────────
  const handleVideoPick = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to your media library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 300,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
          Alert.alert('Video Too Large', 'Please select a video under 50MB.');
          return;
        }
        setUploadingVideo(true);
        try {
          const videoUrl = await uploadChatVideo(asset.uri);
          // Send as video message
          if (conversation) {
            await sendMessageApi(
              conversation.id,
              currentUserId,
              currentRole as 'customer' | 'artisan',
              '🎥 Video message',
              'video' as any,
              videoUrl
            );
            const msgs = await getMessages(conversation.id);
            setMessages(msgs.messages);
          }
        } catch {
          Alert.alert('Error', 'Failed to send video. Please try again.');
        } finally {
          setUploadingVideo(false);
        }
      }
    } catch {
      Alert.alert('Error', 'Could not open video library');
    }
  };

  // ─── Invoice Handlers ───────────────────────────────────────
  const handleSendInvoice = async () => {
    if (sendingInvoice) return;
    const labor = parseFloat(invoiceLaborCost);
    const materials = parseFloat(invoiceMaterialsCost);
    if (!labor || isNaN(labor)) {
      Alert.alert('Invalid', 'Please enter a valid labor cost.');
      return;
    }
    setSendingInvoice(true);
    try {
      await sendInvoice(
        conversation!.id,
        currentUserId,
        activeBookingId || undefined,
        {
          description: invoiceDesc.trim(),
          laborCost: labor,
          materialsCost: isNaN(materials) ? 0 : materials,
          duration: invoiceDuration.trim(),
        }
      );
      setShowInvoiceForm(false);
      setInvoiceDesc('');
      setInvoiceLaborCost('');
      setInvoiceMaterialsCost('');
      setInvoiceDuration('');
      // Refresh messages
      if (conversation) {
        const msgs = await getMessages(conversation.id);
        setMessages(msgs.messages);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to send invoice.');
    } finally {
      setSendingInvoice(false);
    }
  };

  const handleInvoiceResponse = async (messageId: number, action: 'accepted' | 'rejected' | 'revision_requested') => {
    if (action === 'rejected' || action === 'revision_requested') {
      Alert.alert(
        action === 'rejected' ? 'Reject Invoice' : 'Request Revision',
        action === 'rejected' ? 'Are you sure you want to reject this invoice?' : 'Provide a reason for the revision:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: action === 'rejected' ? 'Reject' : 'Request Revision',
            style: action === 'rejected' ? 'destructive' : 'default',
            onPress: async () => {
              setRespondingInvoice(messageId);
              try {
                await respondToInvoice(messageId, action);
                if (conversation) {
                  const msgs = await getMessages(conversation.id);
                  setMessages(msgs.messages);
                }
              } catch {
                Alert.alert('Error', 'Failed to respond to invoice.');
              } finally {
                setRespondingInvoice(null);
              }
            },
          },
        ]
      );
    } else {
      setRespondingInvoice(messageId);
      try {
        await respondToInvoice(messageId, action);
        if (conversation) {
          const msgs = await getMessages(conversation.id);
          setMessages(msgs.messages);
        }
      } catch {
        Alert.alert('Error', 'Failed to accept invoice.');
      } finally {
        setRespondingInvoice(null);
      }
    }
  };

  // ─── Work Proof Handlers ──────────────────────────────────────
  const handlePickProofPhoto = async (index: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        setUploadingProofIndex(index);
        try {
          const url = await uploadChatImage(result.assets[0].uri);
          setWorkProofPhotos(prev => {
            const updated = [...prev];
            updated[index] = url;
            return updated;
          });
        } catch {
          Alert.alert('Upload Failed', 'Could not upload photo. Please try again.');
        } finally {
          setUploadingProofIndex(null);
        }
      }
    } catch {
      Alert.alert('Error', 'Could not open photo library');
    }
  };

  const handlePickProofVideo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to your media library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 300,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
          Alert.alert('Video Too Large', 'Please select a video under 50MB.');
          return;
        }
        setProofVideoUri(asset.uri);
      }
    } catch {
      Alert.alert('Error', 'Could not open video library');
    }
  };

  const handleSubmitWorkProof = async () => {
    const validPhotos = workProofPhotos.filter(Boolean) as string[];
    // Accept either 3 photos OR a proof video
    if (validPhotos.length < 3 && !proofVideoUri) {
      Alert.alert('Proof Required', 'Please upload 3 photos or a proof video before submitting.');
      return;
    }
    if (!activeBookingId) {
      Alert.alert('Error', 'No booking linked to this chat.');
      return;
    }
    setSubmittingWork(true);
    try {
      if (proofVideoUri) {
        // Upload proof video
        setUploadingProofVideo(true);
        await uploadProofVideoApi(activeBookingId, currentUserId, proofVideoUri);
        setUploadingProofVideo(false);
      } else {
        await submitWorkProof(activeBookingId, currentUserId, validPhotos);
      }
      setBookingStatus('job-done');
      setShowWorkProofModal(false);
      setWorkProofPhotos([null, null, null]);
      setProofVideoUri(null);
      setDeclarationAgreed(false);
      // Refresh messages to show work_proof bubble
      if (conversation) {
        const msgs = await getMessages(conversation.id);
        setMessages(msgs.messages);
      }
      Alert.alert(
        '✅ Work Proof Submitted',
        'Your work proof has been submitted. Waiting for the client to review and release payment.'
      );
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to submit work proof. Try again.');
    } finally {
      setSubmittingWork(false);
      setUploadingProofVideo(false);
    }
  };

  const handleReleaseFundInChat = async () => {
    Alert.alert(
      '💰 Release Payment',
      `Release ₦${bookingEscrowAmount.toLocaleString()} to the artisan? This confirms the work is complete and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release Payment',
          onPress: async () => {
            setReleasingFunds(true);
            try {
              await releaseFund(parseInt(activeBookingId!), currentUserId);
              setBookingStatus('released');
              Alert.alert(
                '✅ Payment Released!',
                'The payment has been released to the artisan. Would you like to rate their service?',
                [
                  { text: 'Later', style: 'cancel' },
                  {
                    text: 'Rate Now',
                    onPress: () => {
                      router.push({
                        pathname: '/rating' as any,
                        params: {
                          bookingId: activeBookingId,
                          artisanUserId: params.artisanUserId || String(conversation?.artisanUserId || ''),
                          artisanName: conversation?.artisanName || params.artisanName || '',
                          artisanPhoto: conversation?.artisanAvatar || params.artisanPhoto || '',
                          artisanTrade: conversation?.artisanTrade || params.artisanTrade || '',
                        },
                      });
                    },
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.error || 'Failed to release funds. Please try again.');
            } finally {
              setReleasingFunds(false);
            }
          },
        },
      ]
    );
  };

  const handleDisputeFromChat = () => {
    Alert.alert(
      '⚠️ Raise a Dispute',
      'You are about to raise a dispute. Payment will be frozen until TrustConnect Support resolves it. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Raise Dispute',
          style: 'destructive',
          onPress: () => {
            router.push({
              pathname: '/dispute' as any,
              params: { bookingId: activeBookingId },
            });
          },
        },
      ]
    );
  };

  // ─── Read Receipt Ticks ────────────────────────────────────
  const ReadReceipt = ({ status }: { status: string }) => {
    if (status === 'read') {
      return (
        <View style={styles.tickRow}>
          <Ionicons name="checkmark-done" size={14} color="#2196F3" />
        </View>
      );
    }
    if (status === 'delivered') {
      return (
        <View style={styles.tickRow}>
          <Ionicons name="checkmark-done" size={14} color="#90A4AE" />
        </View>
      );
    }
    return (
      <View style={styles.tickRow}>
        <Ionicons name="checkmark" size={14} color="#90A4AE" />
      </View>
    );
  };

  // ─── AI Voice Note Playback ─────────────────────────────────
  const playAiVoiceNote = async (msgId: number, audioUrl: string) => {
    try {
      // Stop current playback if any
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      if (playingAiId === msgId) {
        setPlayingAiId(null);
        return;
      }

      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const uri = audioUrl.startsWith('http')
        ? audioUrl
        : `${API_BASE_URL.replace('/api', '')}${audioUrl}`;
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      setPlayingAiId(msgId);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingAiId(null);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
      await sound.playAsync();
    } catch (err) {
      console.error('AI voice playback error:', err);
      setPlayingAiId(null);
    }
  };

  // ─── Message Bubble ─────────────────────────────────────────
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // System message
    if (item.senderRole === 'system' || item.type === 'system') {
      return (
        <View style={styles.systemMsgContainer}>
          <View style={styles.systemMsgBubble}>
            <Ionicons name="shield-checkmark" size={14} color={GOLD} />
            <Text style={styles.systemMsgText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    // AI Moderator voice note
    if (item.type === 'ai_voice_note') {
      const isPlaying = playingAiId === item.id;
      return (
        <View style={styles.aiMsgContainer}>
          <LinearGradient colors={['#0D47A1', '#1565C0']} style={styles.aiMsgBubble}>
            <View style={styles.aiMsgHeader}>
              <MaterialCommunityIcons name="robot-outline" size={16} color="#64B5F6" />
              <Text style={styles.aiMsgLabel}>TrustConnect AI</Text>
            </View>
            <Text style={styles.aiMsgText}>{item.content}</Text>
            {item.audioUrl && (
              <TouchableOpacity
                style={styles.aiPlayBtn}
                onPress={() => playAiVoiceNote(item.id, item.audioUrl!)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isPlaying ? 'stop-circle' : 'play-circle'}
                  size={28}
                  color="#64B5F6"
                />
                <View style={styles.aiWaveform}>
                  {[...Array(12)].map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.aiWaveBar,
                        { height: 4 + Math.random() * 14, opacity: isPlaying ? 1 : 0.4 },
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.aiPlayLabel}>
                  {isPlaying ? 'Playing...' : 'Play Voice Note'}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.aiMsgTime}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </LinearGradient>
        </View>
      );
    }

    // Quote message
    if (item.type === 'quote' && item.quoteId) {
      const q = quoteCache[item.quoteId];
      if (!q) {
        loadQuoteData(item.quoteId);
      }
      const isMine = item.senderId === currentUserId;
      const isCustomer = currentRole === 'customer' || currentRole === 'company';
      const quoteStatus = q?.status || 'sent';
      return (
        <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
          <View style={styles.quoteBubble}>
            <LinearGradient colors={['#1a237e', '#283593']} style={styles.quoteHeader}>
              <MaterialCommunityIcons name="file-document-outline" size={18} color={GOLD} />
              <Text style={styles.quoteHeaderText}>Quotation{q?.version && q.version > 1 ? ` v${q.version}` : ''}</Text>
              {quoteStatus === 'accepted' && (
                <View style={styles.quoteStatusBadge}>
                  <Text style={styles.quoteStatusText}>ACCEPTED</Text>
                </View>
              )}
              {quoteStatus === 'rejected' && (
                <View style={[styles.quoteStatusBadge, { backgroundColor: '#E53935' }]}>
                  <Text style={styles.quoteStatusText}>REJECTED</Text>
                </View>
              )}
              {quoteStatus === 'superseded' && (
                <View style={[styles.quoteStatusBadge, { backgroundColor: '#F57F17' }]}>
                  <Text style={styles.quoteStatusText}>REVISION REQ.</Text>
                </View>
              )}
            </LinearGradient>
            {q ? (
              <View style={styles.quoteBody}>
                <Text style={styles.quoteWorkDesc}>{q.workDescription}</Text>
                <View style={styles.quoteLine}>
                  <Text style={styles.quoteLabel}>Labor</Text>
                  <Text style={styles.quoteValue}>₦{q.laborCost.toLocaleString()}</Text>
                </View>
                <View style={styles.quoteLine}>
                  <Text style={styles.quoteLabel}>Materials</Text>
                  <Text style={styles.quoteValue}>₦{q.materialsCost.toLocaleString()}</Text>
                </View>
                <View style={[styles.quoteLine, styles.quoteSubtotal]}>
                  <Text style={styles.quoteLabelBold}>Subtotal</Text>
                  <Text style={styles.quoteValueBold}>₦{q.totalCost.toLocaleString()}</Text>
                </View>
                <View style={styles.quoteLine}>
                  <Text style={styles.quoteLabel}>Service Fee (5%)</Text>
                  <Text style={styles.quoteValue}>₦{q.serviceFee.toLocaleString()}</Text>
                </View>
                <View style={[styles.quoteLine, styles.quoteTotal]}>
                  <Text style={styles.quoteTotalLabel}>TOTAL</Text>
                  <Text style={styles.quoteTotalValue}>₦{q.grandTotal.toLocaleString()}</Text>
                </View>
                <View style={styles.quoteLine}>
                  <Ionicons name="time-outline" size={14} color="#78909C" />
                  <Text style={[styles.quoteLabel, { marginLeft: 4, flex: 1 }]}>Duration: {q.duration}</Text>
                </View>
                {/* Milestones summary */}
                {q.milestones && q.milestones.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={[styles.quoteLabel, { color: NAVY, fontWeight: '600', marginBottom: 4 }]}>
                      Milestones ({q.milestones.length})
                    </Text>
                    {q.milestones.map((ms, i) => (
                      <Text key={i} style={[styles.quoteLabel, { fontSize: 11, marginLeft: 6 }]}>
                        • {ms.label} ({ms.percent}%) — ₦{ms.amount.toLocaleString()}
                      </Text>
                    ))}
                  </View>
                )}
                {/* View PDF button */}
                {q.pdfUrl && <QuotePdfButton quoteId={q.id} securityHash={q.securityHash} />}
                {/* Customer action buttons */}
                {isCustomer && quoteStatus === 'sent' && (
                  <View style={styles.quoteActions}>
                    <TouchableOpacity style={styles.quoteRejectBtn} onPress={() => handleRejectQuote(item.quoteId!)}>
                      <Text style={styles.quoteRejectText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quoteNegotiateBtn} onPress={() => handleNegotiateQuote(item.quoteId!)}>
                      <Ionicons name="chatbubble-ellipses-outline" size={14} color="#F57F17" />
                      <Text style={styles.quoteNegotiateText}>Negotiate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quoteAcceptBtn} onPress={() => handleAcceptQuote(item.quoteId!)}>
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={styles.quoteAcceptText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {/* Artisan hint when client requested revision */}
                {!isCustomer && quoteStatus === 'superseded' && (
                  <View style={styles.quoteRevisionHint}>
                    <Ionicons name="chatbubble-ellipses" size={14} color="#F57F17" />
                    <Text style={styles.quoteRevisionHintText}>Client requested a revision — tap 📄 to send a new quote</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.quoteBody}>
                <ActivityIndicator size="small" color={NAVY} />
                <Text style={styles.quoteLabel}>Loading quote details...</Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    const isMine = item.senderId === currentUserId;

    // Escrow status message (funds secured, released, auto-release, revision, etc.)
    if (item.type === 'escrow_status') {
      return <EscrowStatusCard content={item.content} createdAt={item.createdAt} />;
    }

    // Milestone message
    if (item.type === 'milestone') {
      return <MilestoneCard content={item.content} milestoneIndex={(item as any).milestoneIndex} createdAt={item.createdAt} />;
    }

    // Work proof message
    if (item.type === 'work_proof' && item.workProofPhotos && item.workProofPhotos.length > 0) {
      return (
        <View style={styles.workProofMsgContainer}>
          <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.workProofMsgHeader}>
            <MaterialCommunityIcons name="check-decagram" size={18} color="#A5D6A7" />
            <Text style={styles.workProofMsgTitle}>Work Proof Submitted</Text>
          </LinearGradient>
          <View style={styles.workProofMsgBody}>
            <Text style={styles.workProofMsgSubtitle}>{item.content}</Text>
            <View style={styles.workProofPhotoRow}>
              {item.workProofPhotos.map((uri, idx) => (
                <Image
                  key={idx}
                  source={{ uri: uri.startsWith('http') ? uri : `${API_BASE_URL.replace('/api', '')}${uri}` }}
                  style={styles.workProofMsgPhoto}
                  resizeMode="cover"
                />
              ))}
            </View>
            {currentRole === 'customer' && bookingStatus === 'job-done' && (
              <View style={styles.workProofMsgActions}>
                <TouchableOpacity style={styles.workProofDisputeBtn} onPress={handleDisputeFromChat}>
                  <Ionicons name="alert-circle-outline" size={15} color="#E53935" />
                  <Text style={styles.workProofDisputeText}>Dispute</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.workProofDisputeBtn, { borderColor: '#F57F17' }]}
                  onPress={() => {
                    Alert.prompt
                      ? Alert.prompt('Request Revision', 'Describe what needs to be fixed:', (reason) => {
                          if (reason && activeBookingId) {
                            requestRevisionApi(parseInt(activeBookingId), currentUserId, reason)
                              .then(() => { setBookingStatus('in-progress'); Alert.alert('✅', 'Revision requested.'); })
                              .catch(() => Alert.alert('Error', 'Failed to request revision'));
                          }
                        })
                      : Alert.alert(
                          '🔄 Request Revision',
                          'Send the job back to the artisan for fixes? Funds remain locked.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Request Revision',
                              onPress: () => {
                                if (activeBookingId) {
                                  requestRevisionApi(parseInt(activeBookingId), currentUserId, 'Work needs revision')
                                    .then(() => { setBookingStatus('in-progress'); setAutoReleaseAt(null); })
                                    .catch(() => Alert.alert('Error', 'Failed to request revision'));
                                }
                              },
                            },
                          ]
                        );
                  }}
                >
                  <Ionicons name="refresh-circle-outline" size={15} color="#F57F17" />
                  <Text style={[styles.workProofDisputeText, { color: '#F57F17' }]}>Revision</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.workProofReleaseBtn}
                  onPress={handleReleaseFundInChat}
                  disabled={releasingFunds}
                >
                  {releasingFunds ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Ionicons name="checkmark-circle" size={15} color="#fff" />
                      <Text style={styles.workProofReleaseText}>Release Payment</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
          <Text style={styles.workProofTime}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      );
    }

    // ── Invoice message ──────────────────────────────────────────
    if (item.type === 'invoice') {
      let invoice: InvoiceData | null = null;
      try { invoice = JSON.parse(item.content); } catch { /* ignore */ }
      if (invoice) {
        const isCustomer = currentRole === 'customer';
        const isPending = invoice.status === 'pending';
        const isResponding = respondingInvoice === item.id;
        return (
          <View style={styles.systemMsgContainer}>
            <View style={invoiceStyles.card}>
              <LinearGradient colors={[NAVY, '#283593']} style={invoiceStyles.header}>
                <MaterialCommunityIcons name="receipt" size={18} color={GOLD} />
                <Text style={invoiceStyles.headerTitle}>Invoice</Text>
                <View style={[
                  invoiceStyles.statusBadge,
                  invoice.status === 'accepted' && { backgroundColor: '#4CAF50' },
                  invoice.status === 'rejected' && { backgroundColor: '#E53935' },
                  invoice.status === 'revision_requested' && { backgroundColor: '#F57F17' },
                ]}>
                  <Text style={invoiceStyles.statusText}>
                    {invoice.status === 'pending' ? 'Pending' : invoice.status === 'accepted' ? 'Accepted' : invoice.status === 'rejected' ? 'Rejected' : 'Revision'}
                  </Text>
                </View>
              </LinearGradient>
              <View style={invoiceStyles.body}>
                {invoice.description ? <Text style={invoiceStyles.desc}>{invoice.description}</Text> : null}
                <View style={invoiceStyles.line}>
                  <Text style={invoiceStyles.label}>Labor</Text>
                  <Text style={invoiceStyles.value}>₦{invoice.laborCost.toLocaleString()}</Text>
                </View>
                <View style={invoiceStyles.line}>
                  <Text style={invoiceStyles.label}>Materials</Text>
                  <Text style={invoiceStyles.value}>₦{invoice.materialsCost.toLocaleString()}</Text>
                </View>
                <View style={[invoiceStyles.line, { borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 6 }]}>
                  <Text style={invoiceStyles.label}>Service Fee (5%)</Text>
                  <Text style={invoiceStyles.value}>₦{invoice.serviceFee.toLocaleString()}</Text>
                </View>
                <View style={[invoiceStyles.line, { borderTopWidth: 2, borderTopColor: NAVY, paddingTop: 8 }]}>
                  <Text style={[invoiceStyles.label, { fontWeight: '800', color: NAVY }]}>TOTAL</Text>
                  <Text style={[invoiceStyles.value, { fontWeight: '800', color: NAVY, fontSize: 18 }]}>₦{invoice.grandTotal.toLocaleString()}</Text>
                </View>
                {invoice.duration ? (
                  <View style={invoiceStyles.durationRow}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color="#78909C" />
                    <Text style={invoiceStyles.durationText}>{invoice.duration}</Text>
                  </View>
                ) : null}
                {/* Actions for customer */}
                {isCustomer && isPending && (
                  <View style={invoiceStyles.actions}>
                    <TouchableOpacity
                      style={invoiceStyles.rejectBtn}
                      onPress={() => handleInvoiceResponse(item.id, 'rejected')}
                      disabled={isResponding}
                    >
                      <Ionicons name="close-circle-outline" size={14} color="#E53935" />
                      <Text style={invoiceStyles.rejectText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={invoiceStyles.revisionBtn}
                      onPress={() => handleInvoiceResponse(item.id, 'revision_requested')}
                      disabled={isResponding}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={14} color="#F57F17" />
                      <Text style={invoiceStyles.revisionText}>Revise</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={invoiceStyles.acceptBtn}
                      onPress={() => handleInvoiceResponse(item.id, 'accepted')}
                      disabled={isResponding}
                    >
                      {isResponding ? <ActivityIndicator size="small" color="#fff" /> : (
                        <>
                          <Ionicons name="checkmark-circle" size={14} color="#fff" />
                          <Text style={invoiceStyles.acceptText}>Accept</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                {invoice.revisionReason && (
                  <View style={invoiceStyles.revisionReasonBox}>
                    <Text style={invoiceStyles.revisionReasonText}>💬 {invoice.revisionReason}</Text>
                  </View>
                )}
              </View>
              <Text style={invoiceStyles.time}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        );
      }
    }

    // ── Invoice revision system message ──────────────────────────
    if (item.type === 'invoice_revision') {
      return (
        <View style={styles.systemMsgContainer}>
          <View style={[styles.systemMsgBubble, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="refresh-circle" size={14} color="#F57F17" />
            <Text style={styles.systemMsgText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    // ── Video message ──────────────────────────────────────────
    if (item.type === 'video' && (item.videoUrl || item.imageUrl)) {
      const videoSrc = item.videoUrl || item.imageUrl || '';
      const fullUrl = videoSrc.startsWith('http') ? videoSrc : `${API_BASE_URL.replace('/api', '')}${videoSrc}`;
      return (
        <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs, { padding: 4, overflow: 'hidden' }]}>
            <Pressable
              style={videoMsgStyles.container}
              onPress={() => {
                // Navigate to a full-screen player or open in-place
                Alert.alert('Video', 'Video playback', [{ text: 'OK' }]);
              }}
            >
              <View style={videoMsgStyles.placeholder}>
                <MaterialCommunityIcons name="play-circle-outline" size={48} color="#fff" />
                <Text style={videoMsgStyles.label}>Tap to play video</Text>
              </View>
            </Pressable>
            <View style={styles.msgFooter}>
              <Text style={[styles.msgTime, isMine && { color: 'rgba(255,255,255,0.6)' }]}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {isMine && <ReadReceipt status={item.status} />}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {/* Image message */}
          {item.type === 'image' && item.imageUrl && (
            <Image
              source={{ uri: item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL.replace('/api', '')}${item.imageUrl}` }}
              style={styles.chatImage}
              resizeMode="cover"
            />
          )}

          {/* Text content */}
          {item.content && item.type !== 'image' && (
            <Text style={[styles.msgText, isMine ? styles.msgTextMine : styles.msgTextTheirs]}>
              {item.content}
            </Text>
          )}

          <View style={styles.msgFooter}>
            <Text style={[styles.msgTime, isMine && { color: 'rgba(255,255,255,0.6)' }]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMine && <ReadReceipt status={item.status} />}
          </View>
        </View>
      </View>
    );
  };

  const otherName = currentRole === 'customer'
    ? (conversation?.artisanName || params.artisanName || 'Artisan')
    : (conversation?.customerName || 'Customer');
  const otherPhoto = currentRole === 'customer'
    ? (conversation?.artisanAvatar || params.artisanPhoto)
    : conversation?.customerAvatar;
  const otherTrade = conversation?.artisanTrade || params.artisanTrade || '';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={[NAVY, '#283593']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          {otherPhoto ? (
            <Image source={{ uri: otherPhoto }} style={styles.headerAvatar} />
          ) : (
            <LinearGradient colors={['#303F9F', '#5C6BC0']} style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{otherName.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          )}
          <View>
            <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
            {typingUser ? (
              <Text style={styles.headerSub}>{typingUser}</Text>
            ) : otherTrade ? (
              <Text style={styles.headerSub}>{otherTrade}</Text>
            ) : null}
          </View>
        </View>

        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="call" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          showRulesBanner ? (
            <View style={styles.rulesBanner}>
              <View style={styles.rulesBannerLeft}>
                <Ionicons name="shield-checkmark" size={16} color={GOLD} />
                <Text style={styles.rulesBannerText}>
                  TrustConnect P2P Rules: Keep all communication professional. No outside payments. No harassment. All transactions are protected by escrow.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowRulesBanner(false)}>
                <Ionicons name="close-circle" size={18} color="#90A4AE" />
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <MaterialCommunityIcons name="message-text-outline" size={48} color="#CFD8DC" />
            <Text style={styles.emptyChatText}>Start a conversation</Text>
            <Text style={styles.emptyChatSub}>Send a message to {otherName}</Text>
          </View>
        }
      />

      {/* ── Escrow Action Panel ─────────────────────────────────── */}
      {activeBookingId && bookingStatus && bookingStatus !== 'pending' && bookingStatus !== 'rejected' && (
        <View style={styles.escrowPanel}>
          {/* Status badge */}
          <View style={styles.escrowStatusRow}>
            <View style={[
              styles.escrowStatusBadge,
              bookingStatus === 'released' && { backgroundColor: '#4CAF50' },
              bookingStatus === 'job-done' && { backgroundColor: GOLD },
              bookingStatus === 'in-progress' && { backgroundColor: '#1565C0' },
              bookingStatus === 'disputed' && { backgroundColor: '#E53935' },
            ]}>
              <Text style={styles.escrowStatusText}>
                {bookingStatus === 'in-progress' ? '🔵 In Progress'
                  : bookingStatus === 'job-done' ? '🟡 Awaiting Payment Release'
                  : bookingStatus === 'released' ? '✅ Completed'
                  : bookingStatus === 'disputed' ? '🔴 Disputed'
                  : bookingStatus === 'accepted' ? '🟢 Accepted'
                  : bookingStatus === 'on-the-way' ? '🚗 On The Way'
                  : bookingStatus.replace(/-/g, ' ').toUpperCase()}
              </Text>
            </View>
            {bookingEscrowAmount > 0 && (
              <Text style={styles.escrowAmount}>₦{bookingEscrowAmount.toLocaleString()} in escrow</Text>
            )}
          </View>

          {/* Auto-release countdown */}
          {autoReleaseAt && bookingStatus === 'job-done' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 4, gap: 4 }}>
              <Ionicons name="time-outline" size={13} color="#F57C00" />
              <Text style={{ color: '#F57C00', fontSize: 11 }}>
                Auto-release: {new Date(autoReleaseAt).toLocaleDateString()}
              </Text>
            </View>
          )}

          {/* Milestone progress */}
          {bookingMilestones && bookingMilestones.length > 0 && (
            <MilestoneProgress milestones={bookingMilestones} currentMilestone={currentMilestoneIndex} />
          )}

          {/* Artisan: submit work proof */}
          {currentRole === 'artisan' && ['in-progress', 'accepted', 'on-the-way'].includes(bookingStatus) && (
            <TouchableOpacity
              style={styles.escrowActionBtn}
              onPress={() => setShowWorkProofModal(true)}
            >
              <LinearGradient colors={['#F57F17', '#F9A825']} style={styles.escrowActionGradient}>
                <MaterialCommunityIcons name="camera" size={18} color="#fff" />
                <Text style={styles.escrowActionText}>Submit Work Proof</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Artisan: negotiation pending — hint to submit new quote */}
          {currentRole === 'artisan' && bookingStatus === 'negotiating' && (
            <View style={styles.negotiatingBanner}>
              <Ionicons name="chatbubble-ellipses" size={16} color="#F57F17" />
              <Text style={styles.negotiatingBannerText}>Client requested a revision — tap 📄 below to send a new quote</Text>
            </View>
          )}

          {/* Customer: release, revision, or dispute after job-done */}
          {currentRole === 'customer' && bookingStatus === 'job-done' && (
            <View style={styles.escrowCustomerActions}>
              <TouchableOpacity
                style={styles.escrowDisputeBtn}
                onPress={handleDisputeFromChat}
              >
                <Ionicons name="alert-circle-outline" size={16} color="#E53935" />
                <Text style={styles.escrowDisputeText}>Dispute</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.escrowDisputeBtn, { borderColor: '#F57F17' }]}
                onPress={() => {
                  Alert.alert(
                    '🔄 Request Revision',
                    'Send the job back to the artisan for fixes? Funds remain locked in escrow.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Request Revision',
                        onPress: () => {
                          if (activeBookingId) {
                            requestRevisionApi(parseInt(activeBookingId), currentUserId, 'Work needs revision')
                              .then(() => { setBookingStatus('in-progress'); setAutoReleaseAt(null); })
                              .catch(() => Alert.alert('Error', 'Failed to request revision'));
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="refresh-circle-outline" size={16} color="#F57F17" />
                <Text style={[styles.escrowDisputeText, { color: '#F57F17' }]}>Revision</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.escrowReleaseBtn}
                onPress={handleReleaseFundInChat}
                disabled={releasingFunds}
              >
                {releasingFunds ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="lock-open-outline" size={16} color="#fff" />
                    <Text style={styles.escrowReleaseText}>Release Payment</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Completed banner with rate button */}
          {bookingStatus === 'released' && (
            <View style={styles.escrowCompletedBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              <Text style={styles.escrowCompletedText}>Job Complete — Payment Released</Text>
              {currentRole === 'customer' && (
                <TouchableOpacity
                  style={styles.rateBtn}
                  onPress={() => {
                    router.push({
                      pathname: '/rating' as any,
                      params: {
                        bookingId: activeBookingId,
                        artisanUserId: params.artisanUserId || String(conversation?.artisanUserId || ''),
                        artisanName: conversation?.artisanName || params.artisanName || '',
                        artisanPhoto: conversation?.artisanAvatar || params.artisanPhoto || '',
                        artisanTrade: conversation?.artisanTrade || params.artisanTrade || '',
                      },
                    });
                  }}
                >
                  <Ionicons name="star" size={14} color={GOLD} />
                  <Text style={styles.rateBtnText}>Rate</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Quote Form Modal */}
      <Modal visible={showQuoteForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.quoteFormContainer}>
            <LinearGradient colors={['#1a237e', '#283593']} style={styles.quoteFormHeader}>
              <MaterialCommunityIcons name="file-document-edit-outline" size={22} color={GOLD} />
              <Text style={styles.quoteFormTitle}>Create Quotation</Text>
              <TouchableOpacity onPress={() => setShowQuoteForm(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView style={styles.quoteFormBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.quoteFieldLabel}>Work Description *</Text>
              <TextInput
                style={styles.quoteFieldInput}
                placeholder="Describe the work you'll perform..."
                placeholderTextColor="#90A4AE"
                value={quoteDesc}
                onChangeText={setQuoteDesc}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.quoteFieldLabel}>Labor Cost (₦) *</Text>
              <TextInput
                style={styles.quoteFieldInput}
                placeholder="e.g. 5000"
                placeholderTextColor="#90A4AE"
                value={quoteLaborCost}
                onChangeText={setQuoteLaborCost}
                keyboardType="numeric"
              />

              <Text style={styles.quoteFieldLabel}>Materials Cost (₦) *</Text>
              <TextInput
                style={styles.quoteFieldInput}
                placeholder="e.g. 3500"
                placeholderTextColor="#90A4AE"
                value={quoteMaterialsCost}
                onChangeText={setQuoteMaterialsCost}
                keyboardType="numeric"
              />

              <Text style={styles.quoteFieldLabel}>Duration *</Text>
              <TextInput
                style={styles.quoteFieldInput}
                placeholder="e.g. 2 hours, 3 days"
                placeholderTextColor="#90A4AE"
                value={quoteDuration}
                onChangeText={setQuoteDuration}
              />

              {/* Preview */}
              {quoteLaborCost && quoteMaterialsCost && (
                <View style={styles.quotePreview}>
                  <Text style={styles.quotePreviewTitle}>Preview</Text>
                  <View style={styles.quoteLine}>
                    <Text style={styles.quoteLabel}>Labor</Text>
                    <Text style={styles.quoteValue}>₦{Number(quoteLaborCost || 0).toLocaleString()}</Text>
                  </View>
                  <View style={styles.quoteLine}>
                    <Text style={styles.quoteLabel}>Materials</Text>
                    <Text style={styles.quoteValue}>₦{Number(quoteMaterialsCost || 0).toLocaleString()}</Text>
                  </View>
                  <View style={[styles.quoteLine, styles.quoteSubtotal]}>
                    <Text style={styles.quoteLabelBold}>Subtotal</Text>
                    <Text style={styles.quoteValueBold}>
                      ₦{(Number(quoteLaborCost || 0) + Number(quoteMaterialsCost || 0)).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.quoteLine}>
                    <Text style={styles.quoteLabel}>Service Fee (5%)</Text>
                    <Text style={styles.quoteValue}>
                      ₦{Math.round((Number(quoteLaborCost || 0) + Number(quoteMaterialsCost || 0)) * 0.05).toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.quoteLine, styles.quoteTotal]}>
                    <Text style={styles.quoteTotalLabel}>TOTAL</Text>
                    <Text style={styles.quoteTotalValue}>
                      ₦{Math.round((Number(quoteLaborCost || 0) + Number(quoteMaterialsCost || 0)) * 1.05).toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.quoteSubmitBtn, sendingQuote && { opacity: 0.7 }]}
                onPress={handleSendQuote}
                disabled={sendingQuote}
              >
                {sendingQuote ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#fff" />
                    <Text style={styles.quoteSubmitText}>Send Quote</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Negotiation Modal (Customer → request revision) ──── */}
      <Modal visible={showNegotiateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.negotiateModalContainer}>
            <LinearGradient colors={['#E65100', '#F57F17']} style={styles.negotiateModalHeader}>
              <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
              <Text style={styles.negotiateModalTitle}>Request Revision</Text>
              <TouchableOpacity onPress={() => setShowNegotiateModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView style={styles.negotiateModalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.negotiateInfoBox}>
                <Ionicons name="information-circle-outline" size={18} color="#F57F17" />
                <Text style={styles.negotiateInfoText}>
                  Explain what you'd like revised. The artisan will be notified to send an updated quote.
                </Text>
              </View>

              <Text style={styles.quoteFieldLabel}>Reason for requesting a revision *</Text>
              <TextInput
                style={[styles.quoteFieldInput, { minHeight: 100, textAlignVertical: 'top' }]}
                placeholder="e.g. The labor cost seems high. Can we reduce it to ₦3,500? Materials are also available locally."
                placeholderTextColor="#90A4AE"
                value={negotiationReason}
                onChangeText={setNegotiationReason}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                style={[
                  styles.quoteSubmitBtn,
                  { backgroundColor: '#E65100', marginTop: 20 },
                  (sendingNegotiation || !negotiationReason.trim()) && { opacity: 0.5 },
                ]}
                onPress={submitNegotiation}
                disabled={sendingNegotiation || !negotiationReason.trim()}
              >
                {sendingNegotiation ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#fff" />
                    <Text style={styles.quoteSubmitText}>Send Revision Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Work Proof Upload Modal (Artisan) ─────────────────── */}
      <Modal visible={showWorkProofModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.proofModalContainer}>
            <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.proofModalHeader}>
              <MaterialCommunityIcons name="camera" size={22} color="#A5D6A7" />
              <Text style={styles.proofModalTitle}>Submit Work Proof</Text>
              <TouchableOpacity onPress={() => { setShowWorkProofModal(false); setWorkProofPhotos([null, null, null]); setDeclarationAgreed(false); }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView style={styles.proofModalBody} keyboardShouldPersistTaps="handled">
              {/* Guidelines */}
              <View style={styles.proofGuideBox}>
                <Text style={styles.proofGuideTitle}>📋 Professional Guidelines</Text>
                {[
                  'Upload 3 clear photos showing all completed work',
                  'Photos must clearly show the work area before and after',
                  'Ensure photos are well-lit and not blurry',
                  'Photos will be visible to the client for verification',
                  'Submitting confirms you have completed the job as agreed',
                ].map((rule, i) => (
                  <View key={i} style={styles.proofGuideRow}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="#4CAF50" />
                    <Text style={styles.proofGuideText}>{rule}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.proofSectionTitle}>Option 1: Upload Proof Video</Text>
              <TouchableOpacity
                style={[styles.proofPhotoSlot, { width: '100%', height: 100, marginBottom: 12 }, proofVideoUri && styles.proofPhotoSlotFilled]}
                onPress={handlePickProofVideo}
                disabled={uploadingProofVideo}
              >
                {uploadingProofVideo ? (
                  <ActivityIndicator size="small" color={NAVY} />
                ) : proofVideoUri ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name="video-check" size={28} color="#4CAF50" />
                    <Text style={{ fontSize: 14, color: '#4CAF50', fontWeight: '600' }}>Video selected</Text>
                    <TouchableOpacity onPress={() => setProofVideoUri(null)}>
                      <Ionicons name="close-circle" size={22} color="#E53935" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <MaterialCommunityIcons name="video-plus" size={28} color="#90A4AE" />
                    <Text style={styles.proofPhotoLabel}>Select proof video (max 5 min)</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: '#90A4AE', fontWeight: '600' }}>— OR —</Text>
              </View>

              <Text style={styles.proofSectionTitle}>Option 2: Upload 3 Photos</Text>
              <View style={styles.proofPhotoGrid}>
                {[0, 1, 2].map((index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.proofPhotoSlot, workProofPhotos[index] && styles.proofPhotoSlotFilled]}
                    onPress={() => handlePickProofPhoto(index)}
                    disabled={uploadingProofIndex !== null}
                  >
                    {uploadingProofIndex === index ? (
                      <ActivityIndicator size="small" color={NAVY} />
                    ) : workProofPhotos[index] ? (
                      <>
                        <Image
                          source={{ uri: (workProofPhotos[index] as string).startsWith('http')
                            ? workProofPhotos[index] as string
                            : `${API_BASE_URL.replace('/api', '')}${workProofPhotos[index]}` }}
                          style={styles.proofPhotoPreview}
                          resizeMode="cover"
                        />
                        <View style={styles.proofPhotoBadge}>
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        </View>
                      </>
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={28} color="#90A4AE" />
                        <Text style={styles.proofPhotoLabel}>Photo {index + 1}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.proofPhotoCount}>
                {proofVideoUri ? '✅ Video selected' : `${workProofPhotos.filter(Boolean).length}/3 photos uploaded`}
              </Text>

              {/* Declaration checkbox */}
              <TouchableOpacity
                style={styles.declarationRow}
                onPress={() => setDeclarationAgreed(!declarationAgreed)}
                activeOpacity={0.7}
              >
                <View style={[styles.declarationCheckbox, declarationAgreed && styles.declarationCheckboxChecked]}>
                  {declarationAgreed && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.declarationText}>
                  I confirm that I have completed all agreed work professionally and the evidence above accurately represents the finished job.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.proofSubmitBtn,
                  ((workProofPhotos.filter(Boolean).length < 3 && !proofVideoUri) || !declarationAgreed || submittingWork) && styles.proofSubmitBtnDisabled,
                ]}
                onPress={handleSubmitWorkProof}
                disabled={(workProofPhotos.filter(Boolean).length < 3 && !proofVideoUri) || !declarationAgreed || submittingWork}
              >
                {submittingWork ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={18} color="#fff" />
                    <Text style={styles.proofSubmitText}>Submit & Mark Job Done</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Invoice Form Modal (Artisan) ──────────────────────── */}
      <Modal visible={showInvoiceForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.quoteFormContainer}>
            <LinearGradient colors={['#1a237e', '#283593']} style={styles.quoteFormHeader}>
              <MaterialCommunityIcons name="receipt" size={22} color={GOLD} />
              <Text style={styles.quoteFormTitle}>Send Invoice</Text>
              <TouchableOpacity onPress={() => setShowInvoiceForm(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView style={styles.quoteFormBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.quoteFieldLabel}>Description</Text>
              <TextInput
                style={styles.quoteFieldInput}
                placeholder="Describe the work and charges..."
                placeholderTextColor="#90A4AE"
                value={invoiceDesc}
                onChangeText={setInvoiceDesc}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.quoteFieldLabel}>Labor Cost (₦) *</Text>
              <TextInput
                style={styles.quoteFieldInput}
                placeholder="e.g. 5000"
                placeholderTextColor="#90A4AE"
                value={invoiceLaborCost}
                onChangeText={setInvoiceLaborCost}
                keyboardType="numeric"
              />

              <Text style={styles.quoteFieldLabel}>Materials Cost (₦)</Text>
              <TextInput
                style={styles.quoteFieldInput}
                placeholder="e.g. 3500"
                placeholderTextColor="#90A4AE"
                value={invoiceMaterialsCost}
                onChangeText={setInvoiceMaterialsCost}
                keyboardType="numeric"
              />

              <Text style={styles.quoteFieldLabel}>Duration</Text>
              <TextInput
                style={styles.quoteFieldInput}
                placeholder="e.g. 2 hours"
                placeholderTextColor="#90A4AE"
                value={invoiceDuration}
                onChangeText={setInvoiceDuration}
              />

              {/* Preview */}
              {invoiceLaborCost && (
                <View style={styles.quotePreview}>
                  <Text style={styles.quotePreviewTitle}>Invoice Preview</Text>
                  <View style={styles.quoteLine}>
                    <Text style={styles.quoteLabel}>Labor</Text>
                    <Text style={styles.quoteValue}>₦{Number(invoiceLaborCost || 0).toLocaleString()}</Text>
                  </View>
                  <View style={styles.quoteLine}>
                    <Text style={styles.quoteLabel}>Materials</Text>
                    <Text style={styles.quoteValue}>₦{Number(invoiceMaterialsCost || 0).toLocaleString()}</Text>
                  </View>
                  <View style={[styles.quoteLine, styles.quoteSubtotal]}>
                    <Text style={styles.quoteLabelBold}>Subtotal</Text>
                    <Text style={styles.quoteValueBold}>
                      ₦{(Number(invoiceLaborCost || 0) + Number(invoiceMaterialsCost || 0)).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.quoteLine}>
                    <Text style={styles.quoteLabel}>Service Fee (5%)</Text>
                    <Text style={styles.quoteValue}>
                      ₦{Math.round((Number(invoiceLaborCost || 0) + Number(invoiceMaterialsCost || 0)) * 0.05).toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.quoteLine, styles.quoteTotal]}>
                    <Text style={styles.quoteTotalLabel}>TOTAL</Text>
                    <Text style={styles.quoteTotalValue}>
                      ₦{Math.round((Number(invoiceLaborCost || 0) + Number(invoiceMaterialsCost || 0)) * 1.05).toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.quoteSubmitBtn, sendingInvoice && { opacity: 0.7 }]}
                onPress={handleSendInvoice}
                disabled={sendingInvoice}
              >
                {sendingInvoice ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#fff" />
                    <Text style={styles.quoteSubmitText}>Send Invoice</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.attachBtn} onPress={handleImagePick}>
          <Ionicons name="image-outline" size={22} color="#78909C" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.attachBtn} onPress={handleVideoPick} disabled={uploadingVideo}>
          {uploadingVideo ? (
            <ActivityIndicator size="small" color={GOLD} />
          ) : (
            <MaterialCommunityIcons name="video-outline" size={22} color="#78909C" />
          )}
        </TouchableOpacity>

        {currentRole === 'artisan' && (
          <>
            <TouchableOpacity style={styles.attachBtn} onPress={() => setShowQuoteForm(true)}>
              <MaterialCommunityIcons name="file-document-outline" size={22} color={GOLD} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachBtn} onPress={() => setShowInvoiceForm(true)}>
              <MaterialCommunityIcons name="receipt" size={22} color={GOLD} />
            </TouchableOpacity>
          </>
        )}

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#90A4AE"
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              handleTyping();
            }}
            multiline
            maxLength={1000}
          />
        </View>

        <TouchableOpacity
          style={[styles.sendBtn, inputText.trim() ? styles.sendBtnActive : {}]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color={inputText.trim() ? '#fff' : '#B0BEC5'} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECE5DD' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ECE5DD' },
  loadingText: { marginTop: 12, color: '#78909C', fontSize: 16 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingHorizontal: 12, paddingBottom: 12, gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerName: { fontSize: 16, fontWeight: '700', color: '#fff', maxWidth: 180 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  headerAction: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Messages
  messagesContent: { padding: 12, paddingBottom: 8, flexGrow: 1 },

  // System message
  systemMsgContainer: { alignItems: 'center', marginVertical: 8 },
  systemMsgBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF9C4', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, maxWidth: '85%',
  },
  systemMsgText: { fontSize: 12, color: '#5D4037', lineHeight: 16, flex: 1 },

  // AI Moderator voice note
  aiMsgContainer: { alignItems: 'center', marginVertical: 8, paddingHorizontal: 12 },
  aiMsgBubble: {
    borderRadius: 16, padding: 14, width: '92%',
    elevation: 3, shadowColor: '#0D47A1', shadowOpacity: 0.15, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  aiMsgHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8,
  },
  aiMsgLabel: { fontSize: 11, color: '#64B5F6', fontWeight: '700', letterSpacing: 0.5 },
  aiMsgText: { fontSize: 13, color: '#E3F2FD', lineHeight: 19 },
  aiPlayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 10, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12,
  },
  aiWaveform: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
  aiWaveBar: { width: 3, borderRadius: 2, backgroundColor: '#64B5F6' },
  aiPlayLabel: { fontSize: 11, color: '#90CAF9', fontWeight: '600' },
  aiMsgTime: { fontSize: 10, color: 'rgba(144,202,249,0.6)', marginTop: 6, alignSelf: 'flex-end' },

  // Message bubbles
  msgRow: { marginBottom: 4 },
  msgRowRight: { alignItems: 'flex-end' },
  msgRowLeft: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%', borderRadius: 16, padding: 10,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  bubbleMine: {
    backgroundColor: NAVY, borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#fff', borderBottomLeftRadius: 4,
  },
  chatImage: { width: 200, height: 200, borderRadius: 10, marginBottom: 4 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTextMine: { color: '#fff' },
  msgTextTheirs: { color: '#1B2631' },
  msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 3 },
  msgTime: { fontSize: 10, color: '#90A4AE' },
  tickRow: { flexDirection: 'row' },

  // Empty state
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyChatText: { fontSize: 18, fontWeight: '600', color: '#90A4AE', marginTop: 12 },
  emptyChatSub: { fontSize: 14, color: '#B0BEC5', marginTop: 4 },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#F5F5F5',
  },
  attachBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  inputWrapper: {
    flex: 1, backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 14, minHeight: 40, maxHeight: 100,
    justifyContent: 'center',
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  input: { fontSize: 15, color: '#1B2631', paddingVertical: 8 },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#CFD8DC',
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnActive: { backgroundColor: NAVY },

  // Quote Bubble
  quoteBubble: {
    width: '90%', borderRadius: 12, overflow: 'hidden',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, backgroundColor: '#fff', marginVertical: 4,
  },
  quoteHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  quoteHeaderText: { fontSize: 14, fontWeight: '700', color: GOLD, flex: 1 },
  quoteStatusBadge: {
    backgroundColor: '#4CAF50', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  quoteStatusText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  quoteBody: { padding: 14, gap: 6 },
  quoteWorkDesc: { fontSize: 14, color: '#37474F', lineHeight: 20, marginBottom: 8 },
  quoteLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  quoteLabel: { fontSize: 13, color: '#78909C' },
  quoteValue: { fontSize: 13, color: '#37474F', fontWeight: '500' },
  quoteLabelBold: { fontSize: 13, color: '#37474F', fontWeight: '600' },
  quoteValueBold: { fontSize: 13, color: '#37474F', fontWeight: '700' },
  quoteSubtotal: { borderTopWidth: 1, borderTopColor: '#ECEFF1', paddingTop: 6, marginTop: 4 },
  quoteTotal: {
    borderTopWidth: 2, borderTopColor: NAVY, paddingTop: 8, marginTop: 6,
  },
  quoteTotalLabel: { fontSize: 15, fontWeight: '800', color: NAVY },
  quoteTotalValue: { fontSize: 16, fontWeight: '800', color: NAVY },
  quoteActions: {
    flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'flex-end',
  },
  quoteRejectBtn: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#E53935',
  },
  quoteRejectText: { color: '#E53935', fontWeight: '600', fontSize: 12 },
  quoteNegotiateBtn: {
    flexDirection: 'row', gap: 4, alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#F57F17', backgroundColor: '#FFF8E1',
  },
  quoteNegotiateText: { color: '#F57F17', fontWeight: '600', fontSize: 12 },
  quoteAcceptBtn: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  quoteAcceptText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  quoteRevisionHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF3E0', borderRadius: 8, padding: 8, marginTop: 8,
    borderWidth: 1, borderColor: '#FFE0B2',
  },
  quoteRevisionHintText: { color: '#E65100', fontSize: 12, flex: 1, lineHeight: 16 },

  // Quote Form Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  quoteFormContainer: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  quoteFormHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  quoteFormTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 },
  quoteFormBody: { padding: 20, paddingBottom: 40 },
  quoteFieldLabel: { fontSize: 13, fontWeight: '600', color: '#37474F', marginTop: 12, marginBottom: 6 },
  quoteFieldInput: {
    backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: '#1B2631',
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  quotePreview: {
    backgroundColor: '#F5F7FA', borderRadius: 12, padding: 14, marginTop: 16,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  quotePreviewTitle: { fontSize: 13, fontWeight: '700', color: NAVY, marginBottom: 8 },
  quoteSubmitBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: NAVY, paddingVertical: 14, borderRadius: 12, marginTop: 20,
  },
  quoteSubmitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // ── Rules Banner ────────────────────────────────────────────
  rulesBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF8E1', borderRadius: 10, padding: 10,
    marginBottom: 8, borderWidth: 1, borderColor: '#FFE082',
  },
  rulesBannerLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  rulesBannerText: { fontSize: 11, color: '#5D4037', lineHeight: 16, flex: 1 },

  // ── Escrow Action Panel ──────────────────────────────────────
  escrowPanel: {
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E0E0E0',
    paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  escrowStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  escrowStatusBadge: {
    backgroundColor: '#78909C', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  escrowStatusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  escrowAmount: { fontSize: 12, color: '#37474F', fontWeight: '600' },
  escrowActionBtn: { borderRadius: 10, overflow: 'hidden' },
  escrowActionGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center',
  },
  escrowActionText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  escrowCustomerActions: { flexDirection: 'row', gap: 10 },
  escrowDisputeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 10, paddingVertical: 10,
    borderWidth: 1.5, borderColor: '#E53935',
  },
  escrowDisputeText: { color: '#E53935', fontWeight: '700', fontSize: 13 },
  escrowReleaseBtn: {
    flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#2E7D32', borderRadius: 10, paddingVertical: 10,
  },
  escrowReleaseText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  escrowCompletedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    paddingVertical: 6, flexWrap: 'wrap',
  },
  escrowCompletedText: { color: '#2E7D32', fontSize: 13, fontWeight: '700' },
  rateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF8E1', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1, borderColor: '#FFE082', marginLeft: 8,
  },
  rateBtnText: { fontSize: 12, fontWeight: '700', color: '#F57F17' },

  // ── Work Proof Message Bubble ────────────────────────────────
  workProofMsgContainer: {
    marginHorizontal: 8, marginVertical: 6, borderRadius: 14, overflow: 'hidden',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, backgroundColor: '#fff',
  },
  workProofMsgHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  workProofMsgTitle: { fontSize: 14, fontWeight: '700', color: '#A5D6A7', flex: 1 },
  workProofMsgBody: { padding: 12, gap: 8 },
  workProofMsgSubtitle: { fontSize: 13, color: '#37474F', lineHeight: 18 },
  workProofPhotoRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  workProofMsgPhoto: { flex: 1, height: 100, borderRadius: 8 },
  workProofMsgActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  workProofDisputeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderRadius: 8, paddingVertical: 8, borderWidth: 1.5, borderColor: '#E53935',
  },
  workProofDisputeText: { color: '#E53935', fontWeight: '700', fontSize: 12 },
  workProofReleaseBtn: {
    flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: '#2E7D32', borderRadius: 8, paddingVertical: 8,
  },
  workProofReleaseText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  workProofTime: { fontSize: 10, color: '#90A4AE', textAlign: 'right', paddingRight: 10, paddingBottom: 6 },

  // ── Work Proof Upload Modal ──────────────────────────────────
  proofModalContainer: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  proofModalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  proofModalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 },
  proofModalBody: { padding: 20, paddingBottom: 40 },
  proofGuideBox: {
    backgroundColor: '#F1F8E9', borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#C8E6C9',
  },
  proofGuideTitle: { fontSize: 13, fontWeight: '700', color: '#2E7D32', marginBottom: 10 },
  proofGuideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  proofGuideText: { fontSize: 12, color: '#37474F', flex: 1, lineHeight: 17 },
  proofSectionTitle: { fontSize: 14, fontWeight: '700', color: '#37474F', marginBottom: 12 },
  proofPhotoGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  proofPhotoSlot: {
    flex: 1, height: 100, borderRadius: 12, borderWidth: 2, borderColor: '#CFD8DC',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FAFAFA', overflow: 'hidden',
  },
  proofPhotoSlotFilled: { borderColor: '#4CAF50', borderStyle: 'solid' },
  proofPhotoPreview: { width: '100%', height: '100%' },
  proofPhotoBadge: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: '#fff', borderRadius: 10,
  },
  proofPhotoLabel: { fontSize: 11, color: '#90A4AE', marginTop: 4 },
  proofPhotoCount: { fontSize: 12, color: '#78909C', textAlign: 'center', marginBottom: 16 },
  proofSubmitBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2E7D32', paddingVertical: 14, borderRadius: 12,
  },
  proofSubmitBtnDisabled: { backgroundColor: '#BDBDBD' },
  proofSubmitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // ── Declaration Checkbox ─────────────────────────────────────
  declarationRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#F1F8E9', borderRadius: 10, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#C8E6C9',
  },
  declarationCheckbox: {
    width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: '#90A4AE',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1,
  },
  declarationCheckboxChecked: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  declarationText: { fontSize: 13, color: '#37474F', flex: 1, lineHeight: 19 },

  // ── Negotiation Modal ────────────────────────────────────────
  negotiateModalContainer: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  negotiateModalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  negotiateModalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 },
  negotiateModalBody: { padding: 20, paddingBottom: 40 },
  negotiateInfoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF3E0', borderRadius: 10, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#FFE0B2',
  },
  negotiateInfoText: { fontSize: 13, color: '#E65100', flex: 1, lineHeight: 19 },

  // ── Artisan Negotiating Banner (Escrow Panel) ────────────────
  negotiatingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF8E1', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#FFE082',
  },
  negotiatingBannerText: { color: '#E65100', fontSize: 13, fontWeight: '600', flex: 1 },
});

// ── Invoice Card Styles ──────────────────────────────────────
const invoiceStyles = StyleSheet.create({
  card: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' },
  statusBadge: {
    backgroundColor: '#78909C',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  body: { padding: 14 },
  desc: { fontSize: 14, color: '#546E7A', marginBottom: 10, lineHeight: 20 },
  line: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  label: { fontSize: 13, color: '#78909C' },
  value: { fontSize: 14, fontWeight: '600', color: '#263238' },
  durationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8,
  },
  durationText: { fontSize: 12, color: '#78909C' },
  actions: {
    flexDirection: 'row', gap: 8, marginTop: 14,
    justifyContent: 'flex-end',
  },
  rejectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#E53935',
  },
  rejectText: { fontSize: 12, fontWeight: '700', color: '#E53935' },
  revisionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#F57F17',
  },
  revisionText: { fontSize: 12, fontWeight: '700', color: '#F57F17' },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 10, backgroundColor: '#4CAF50',
  },
  acceptText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  revisionReasonBox: {
    marginTop: 10, backgroundColor: '#FFF3E0',
    padding: 10, borderRadius: 8,
  },
  revisionReasonText: { fontSize: 12, color: '#E65100', fontStyle: 'italic' },
  time: {
    fontSize: 11, color: '#90A4AE',
    textAlign: 'right', paddingHorizontal: 14, paddingBottom: 8,
  },
});

// ── Video Message Styles ──────────────────────────────────────
const videoMsgStyles = StyleSheet.create({
  container: {
    width: 220, height: 160,
    borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 12, color: '#ccc', marginTop: 4 },
});
