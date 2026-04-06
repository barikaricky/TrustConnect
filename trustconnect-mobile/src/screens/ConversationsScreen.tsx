import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../services/AuthContext';
import { getConversations, Conversation } from '../services/chatService';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

export default function ConversationsScreen() {
  const { user, userRole } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.id || user?.userId;
  const role = userRole || 'customer';

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [userId, role])
  );

  const loadConversations = async () => {
    try {
      setLoading(true);
      const convs = await getConversations(userId, role as 'customer' | 'artisan');
      setConversations(convs);
    } catch (error) {
      console.error('Load conversations error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openConversation = (conv: Conversation) => {
    const isCustomer = role === 'customer';
    router.push({
      pathname: '/chat',
      params: {
        conversationId: String(conv.id),
        artisanUserId: String(conv.artisanUserId),
        artisanName: isCustomer ? conv.artisanName : conv.customerName,
        artisanPhoto: isCustomer ? (conv.artisanAvatar || '') : (conv.customerAvatar || ''),
        artisanTrade: conv.artisanTrade || '',
        ...(conv.bookingId ? { bookingId: String(conv.bookingId) } : {}),
      },
    });
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (hours < 48) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const isCustomer = role === 'customer';
    const name = isCustomer ? item.artisanName : item.customerName;
    const avatar = isCustomer ? item.artisanAvatar : item.customerAvatar;
    const unread = item.unreadCount || 0;

    return (
      <TouchableOpacity style={styles.convItem} onPress={() => openConversation(item)} activeOpacity={0.7}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.convAvatar} />
        ) : (
          <LinearGradient colors={[NAVY, '#303F9F']} style={styles.convAvatar}>
            <Text style={styles.convAvatarText}>{name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </LinearGradient>
        )}

        <View style={styles.convInfo}>
          <View style={styles.convTopRow}>
            <Text style={[styles.convName, unread > 0 && { fontWeight: '800' }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.convTime, unread > 0 && { color: NAVY }]}>
              {formatTime(item.lastMessageAt || item.updatedAt)}
            </Text>
          </View>
          <View style={styles.convBottomRow}>
            <Text
              style={[styles.convPreview, unread > 0 && { color: '#1B2631', fontWeight: '600' }]}
              numberOfLines={1}
            >
              {item.lastMessage || 'Start chatting...'}
            </Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
          {item.artisanTrade && isCustomer && (
            <Text style={styles.convTrade}>{item.artisanTrade}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[NAVY, '#283593']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={56} color="#CFD8DC" />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySub}>
            Start a conversation by visiting an artisan's profile
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 42, paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  listContent: { paddingTop: 4 },

  convItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  convAvatar: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
  },
  convAvatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  convInfo: { flex: 1 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, fontWeight: '600', color: '#1B2631', flex: 1, marginRight: 8 },
  convTime: { fontSize: 12, color: '#90A4AE' },
  convBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
  convPreview: { fontSize: 13, color: '#78909C', flex: 1, marginRight: 8 },
  unreadBadge: {
    backgroundColor: NAVY, borderRadius: 10, minWidth: 20, height: 20,
    paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center',
  },
  unreadText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  convTrade: { fontSize: 11, color: '#B0BEC5', marginTop: 2 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#546E7A', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#90A4AE', textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
