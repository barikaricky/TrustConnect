import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, StatusBar,
  Platform, Linking, TextInput,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

interface FAQ {
  question: string;
  answer: string;
  icon: string;
  category: string;
}

const FAQ_DATA: FAQ[] = [
  {
    question: 'How do I book an artisan?',
    answer: 'Search for a service category, browse verified artisans, view their profiles and reviews, then tap "Book Now" to create a booking. You can chat with the artisan before confirming.',
    icon: 'calendar-plus',
    category: 'Bookings',
  },
  {
    question: 'How does escrow payment work?',
    answer: 'When you book an artisan, your payment is held securely in escrow. The artisan only receives payment after you confirm the job is completed satisfactorily. This protects both parties.',
    icon: 'shield-check',
    category: 'Payments',
  },
  {
    question: 'How do I withdraw my earnings?',
    answer: 'Go to your Wallet, tap "Withdraw", enter the amount (minimum \u20A6500), and your funds will be sent to your registered bank account within 1-2 business days.',
    icon: 'bank-transfer-out',
    category: 'Payments',
  },
  {
    question: 'What if I have a dispute?',
    answer: 'Go to your booking details and tap "Raise Dispute". Provide evidence and description. Both parties can negotiate a resolution, or escalate to our admin team for a final verdict.',
    icon: 'gavel',
    category: 'Disputes',
  },
  {
    question: 'How is my identity verified?',
    answer: 'We use NIN (National Identification Number) verification for customers and CAC registration for companies. Artisans undergo additional skill verification and background checks.',
    icon: 'card-account-details',
    category: 'Verification',
  },
  {
    question: 'Can I cancel a booking?',
    answer: 'Yes, you can cancel a booking before the artisan starts work. If payment was made via escrow, a refund will be processed. Cancellation after work has started may involve partial charges.',
    icon: 'close-circle-outline',
    category: 'Bookings',
  },
  {
    question: 'How do I change my lock PIN?',
    answer: 'Go to Settings > Change Lock PIN. You will need to enter your current 6-digit PIN and then set a new one. This PIN protects your app when it goes to background.',
    icon: 'lock-reset',
    category: 'Security',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. We use industry-standard encryption for all data in transit and at rest. Your payment information is handled through secure third-party providers. We never store your full card details.',
    icon: 'security',
    category: 'Security',
  },
  {
    question: 'How do I contact support?',
    answer: 'You can reach us through the Live Chat feature in the app, email us at support@trustconnect.ng, or call our helpline at +234 800 TRUST (87878).',
    icon: 'headset',
    category: 'Support',
  },
  {
    question: 'How do I edit my profile?',
    answer: 'Go to your Profile tab and tap "Edit Profile" or the pencil icon. You can update your name, email, profile picture, and other details.',
    icon: 'account-edit',
    category: 'Account',
  },
];

export default function HelpCenterScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(FAQ_DATA.map(f => f.category))];

  const filteredFAQs = FAQ_DATA.filter(faq => {
    const matchesSearch = !searchQuery ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleExpand = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[NAVY, '#283593']} style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Help Center</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="rgba(255,255,255,0.6)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for help..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color="rgba(255,255,255,0.6)" />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.quickActions}>
          <Pressable
            style={styles.quickAction}
            onPress={() => router.push('/live-chat')}
          >
            <View style={[styles.quickIconBox, { backgroundColor: '#E3F2FD' }]}>
              <MaterialCommunityIcons name="chat-processing-outline" size={24} color="#1976D2" />
            </View>
            <Text style={styles.quickTitle}>Live Chat</Text>
            <Text style={styles.quickSubtitle}>Chat with us</Text>
          </Pressable>

          <Pressable
            style={styles.quickAction}
            onPress={() => Linking.openURL('mailto:support@trustconnect.ng')}
          >
            <View style={[styles.quickIconBox, { backgroundColor: '#FFF3E0' }]}>
              <MaterialCommunityIcons name="email-outline" size={24} color="#E65100" />
            </View>
            <Text style={styles.quickTitle}>Email Us</Text>
            <Text style={styles.quickSubtitle}>Get a reply</Text>
          </Pressable>

          <Pressable
            style={styles.quickAction}
            onPress={() => Linking.openURL('tel:+2348001234567')}
          >
            <View style={[styles.quickIconBox, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons name="phone-outline" size={24} color="#2E7D32" />
            </View>
            <Text style={styles.quickTitle}>Call Us</Text>
            <Text style={styles.quickSubtitle}>24/7 support</Text>
          </Pressable>
        </Animated.View>

        {/* Category Filter */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            <Pressable
              style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>All</Text>
            </Pressable>
            {categories.map(cat => (
              <Pressable
                key={cat}
                style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              >
                <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {/* FAQ List */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {filteredFAQs.map((faq, index) => (
            <Pressable
              key={index}
              style={styles.faqCard}
              onPress={() => toggleExpand(index)}
            >
              <View style={styles.faqHeader}>
                <View style={styles.faqIconBox}>
                  <MaterialCommunityIcons name={faq.icon as any} size={20} color={NAVY} />
                </View>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <MaterialCommunityIcons
                  name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color="#90A4AE"
                />
              </View>
              {expandedIndex === index && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  <View style={styles.faqTag}>
                    <Text style={styles.faqTagText}>{faq.category}</Text>
                  </View>
                </View>
              )}
            </Pressable>
          ))}

          {filteredFAQs.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="help-circle-outline" size={48} color="#CFD8DC" />
              <Text style={styles.emptyText}>No results found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          )}
        </Animated.View>

        {/* Contact Card */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.contactCard}>
          <LinearGradient colors={[NAVY, '#303F9F']} style={styles.contactGradient}>
            <MaterialCommunityIcons name="face-agent" size={40} color={GOLD} />
            <Text style={styles.contactTitle}>Still need help?</Text>
            <Text style={styles.contactSubtitle}>
              Our support team is available 24/7 to assist you with any questions or issues.
            </Text>
            <Pressable
              style={styles.contactBtn}
              onPress={() => router.push('/live-chat')}
            >
              <MaterialCommunityIcons name="chat-outline" size={18} color={NAVY} />
              <Text style={styles.contactBtnText}>Start Live Chat</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 42, paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#fff' },

  content: { padding: 16, paddingBottom: 40 },

  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  quickAction: {
    flex: 1, alignItems: 'center', backgroundColor: '#fff', borderRadius: 14,
    padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  quickIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickTitle: { fontSize: 13, fontWeight: '700', color: '#37474F' },
  quickSubtitle: { fontSize: 11, color: '#90A4AE', marginTop: 2 },

  categoryRow: { paddingBottom: 12, gap: 8 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#ECEFF1', borderWidth: 1, borderColor: '#E0E0E0',
  },
  categoryChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  categoryText: { fontSize: 13, color: '#78909C', fontWeight: '500' },
  categoryTextActive: { color: '#fff' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#37474F', marginBottom: 12, marginTop: 8 },

  faqCard: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 8,
    overflow: 'hidden', elevation: 1, shadowColor: '#000',
    shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  faqHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  faqIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#E8EAF6', justifyContent: 'center', alignItems: 'center',
  },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '600', color: '#37474F', lineHeight: 20 },
  faqAnswer: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 0, paddingLeft: 60 },
  faqAnswerText: { fontSize: 13, color: '#607D8B', lineHeight: 20 },
  faqTag: {
    alignSelf: 'flex-start', backgroundColor: '#E8EAF6',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8,
  },
  faqTagText: { fontSize: 11, color: NAVY, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#78909C', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#B0BEC5', marginTop: 4 },

  contactCard: { borderRadius: 16, overflow: 'hidden', marginTop: 16 },
  contactGradient: { padding: 24, alignItems: 'center', borderRadius: 16 },
  contactTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 12 },
  contactSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 8, lineHeight: 18 },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: GOLD, borderRadius: 12, paddingHorizontal: 20,
    paddingVertical: 12, marginTop: 16,
  },
  contactBtnText: { fontSize: 14, fontWeight: '700', color: NAVY },
});
