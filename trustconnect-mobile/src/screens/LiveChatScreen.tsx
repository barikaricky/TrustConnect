import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, StatusBar,
  Platform, ScrollView, KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NAVY = '#1a237e';
// Brand gold available: #FFC107

interface ChatMessage {
  id: string;
  type: 'user' | 'support' | 'system';
  text: string;
  timestamp: Date;
}

const QUICK_RESPONSES = [
  'I need help with a booking',
  'I have a payment issue',
  'I want to report a dispute',
  'Account verification help',
  'General inquiry',
];

const AUTO_RESPONSES: Record<string, string> = {
  'booking': 'I can help with booking issues! Please describe the problem you are experiencing with your booking. Include the booking ID if you have one.',
  'payment': 'For payment issues, please provide: 1) Transaction reference, 2) Amount involved, 3) Date of transaction. Our finance team typically resolves payment issues within 24-48 hours.',
  'dispute': 'I understand you have a dispute. To help resolve this quickly, please provide: 1) Booking ID, 2) Description of the issue, 3) Any evidence (screenshots, photos). Our dispute resolution team will review within 24 hours.',
  'verification': 'For account verification, please ensure you have: 1) A valid NIN (National Identity Number), 2) A clear profile photo. You can verify your NIN in Settings > NIN Verification.',
  'general': 'Thank you for reaching out! I am here to help. Please describe your question or concern and I will assist you or connect you with the right team.',
};

export default function LiveChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    initChat();
  }, []);

  const initChat = async () => {
    const userData = await AsyncStorage.getItem('@trustconnect_user');
    const user = userData ? JSON.parse(userData) : null;

    setMessages([
      {
        id: '1',
        type: 'system',
        text: 'Chat started',
        timestamp: new Date(),
      },
      {
        id: '2',
        type: 'support',
        text: `Hello${user?.name ? ' ' + user.name.split(' ')[0] : ''}! Welcome to TrustConnect Support. How can I help you today?`,
        timestamp: new Date(),
      },
    ]);
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    Keyboard.dismiss();
    scrollToBottom();

    // Simulate agent typing
    setIsTyping(true);
    const delay = 1000 + Math.random() * 1500;

    setTimeout(() => {
      setIsTyping(false);
      const lower = text.toLowerCase();
      let responseText = '';

      if (lower.includes('booking') || lower.includes('book')) {
        responseText = AUTO_RESPONSES['booking'];
      } else if (lower.includes('payment') || lower.includes('pay') || lower.includes('money') || lower.includes('refund')) {
        responseText = AUTO_RESPONSES['payment'];
      } else if (lower.includes('dispute') || lower.includes('report') || lower.includes('complaint')) {
        responseText = AUTO_RESPONSES['dispute'];
      } else if (lower.includes('verification') || lower.includes('verify') || lower.includes('nin') || lower.includes('identity')) {
        responseText = AUTO_RESPONSES['verification'];
      } else {
        responseText = AUTO_RESPONSES['general'];
      }

      const supportMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'support',
        text: responseText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, supportMsg]);
      scrollToBottom();
    }, delay);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[NAVY, '#283593']} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.agentRow}>
              <View style={styles.agentAvatar}>
                <MaterialCommunityIcons name="face-agent" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Live Support</Text>
                <View style={styles.statusRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.statusText}>Online</Text>
                </View>
              </View>
            </View>
          </View>
          <Pressable onPress={() => router.push('/help-center')} style={styles.backBtn}>
            <MaterialCommunityIcons name="help-circle-outline" size={22} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        >
          {messages.map((msg, index) => {
            if (msg.type === 'system') {
              return (
                <Animated.View key={msg.id} entering={FadeIn.delay(100)} style={styles.systemMsg}>
                  <Text style={styles.systemText}>{msg.text} &middot; {formatTime(msg.timestamp)}</Text>
                </Animated.View>
              );
            }

            const isUser = msg.type === 'user';
            return (
              <Animated.View
                key={msg.id}
                entering={FadeInDown.delay(index < 3 ? index * 100 : 0).springify()}
                style={[styles.msgRow, isUser && styles.msgRowUser]}
              >
                {!isUser && (
                  <View style={styles.msgAvatarSupport}>
                    <MaterialCommunityIcons name="face-agent" size={16} color="#fff" />
                  </View>
                )}
                <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleSupport]}>
                  <Text style={[styles.msgText, isUser && styles.msgTextUser]}>{msg.text}</Text>
                  <Text style={[styles.msgTime, isUser && styles.msgTimeUser]}>{formatTime(msg.timestamp)}</Text>
                </View>
              </Animated.View>
            );
          })}

          {/* Quick Responses (show only at start) */}
          {messages.length <= 2 && (
            <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.quickSection}>
              <Text style={styles.quickLabel}>Quick options:</Text>
              {QUICK_RESPONSES.map((q, i) => (
                <Pressable key={i} style={styles.quickChip} onPress={() => sendMessage(q)}>
                  <Text style={styles.quickChipText}>{q}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={NAVY} />
                </Pressable>
              ))}
            </Animated.View>
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <Animated.View entering={FadeIn} style={[styles.msgRow]}>
              <View style={styles.msgAvatarSupport}>
                <MaterialCommunityIcons name="face-agent" size={16} color="#fff" />
              </View>
              <View style={[styles.msgBubble, styles.msgBubbleSupport, styles.typingBubble]}>
                <View style={styles.typingDots}>
                  <View style={[styles.dot, { opacity: 0.4 }]} />
                  <View style={[styles.dot, { opacity: 0.7 }]} />
                  <View style={styles.dot} />
                </View>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#B0BEC5"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
          </View>
          <Pressable
            style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim()}
          >
            <MaterialCommunityIcons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 42, paddingBottom: 12, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  headerCenter: { flex: 1, marginHorizontal: 12 },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  agentAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },
  statusText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },

  chatContent: { padding: 16, paddingBottom: 8 },

  systemMsg: { alignItems: 'center', marginVertical: 8 },
  systemText: { fontSize: 11, color: '#B0BEC5', backgroundColor: '#ECEFF1', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10, gap: 6 },
  msgRowUser: { flexDirection: 'row-reverse' },
  msgAvatarSupport: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: NAVY,
    justifyContent: 'center', alignItems: 'center',
  },
  msgBubble: {
    maxWidth: '75%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
  },
  msgBubbleUser: {
    backgroundColor: NAVY, borderBottomRightRadius: 4,
  },
  msgBubbleSupport: {
    backgroundColor: '#fff', borderBottomLeftRadius: 4,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  msgText: { fontSize: 14, color: '#37474F', lineHeight: 20 },
  msgTextUser: { color: '#fff' },
  msgTime: { fontSize: 10, color: '#B0BEC5', marginTop: 4, textAlign: 'right' },
  msgTimeUser: { color: 'rgba(255,255,255,0.6)' },

  typingBubble: { paddingVertical: 14, paddingHorizontal: 18 },
  typingDots: { flexDirection: 'row', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#B0BEC5' },

  quickSection: { marginTop: 8 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: '#78909C', marginBottom: 6 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 6, borderWidth: 1, borderColor: '#E8EAF6',
  },
  quickChipText: { fontSize: 13, color: NAVY, fontWeight: '500' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EEEEEE',
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
  },
  inputContainer: {
    flex: 1, backgroundColor: '#F5F7FA', borderRadius: 20,
    borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 14, paddingVertical: 2,
    maxHeight: 100,
  },
  input: { fontSize: 14, color: '#1B2631', paddingVertical: Platform.OS === 'ios' ? 10 : 8 },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: NAVY,
    justifyContent: 'center', alignItems: 'center',
  },
});
