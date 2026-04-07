/**
 * CompanyWorkerDashboardScreen — Dashboard for companies that provide services
 * Features: Team management, active jobs overview, earnings, job feed,
 *           company branding, worker dispatch, and professional analytics.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, ScrollView, ActivityIndicator,
  Pressable, RefreshControl, Platform, Alert, Image, Dimensions,
  FlatList, TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn, SlideInRight, ZoomIn } from 'react-native-reanimated';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../services/AuthContext';
import { API_BASE_URL } from '../config/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GOLD = '#FFC107';
const GOLD_DARK = '#FFA000';
const GOLD_LIGHT = '#FFD54F';
const NAVY = '#1a237e';
const NAVY_LIGHT = '#283593';
const NAVY_DARK = '#0d1642';
const SUCCESS = '#4CAF50';
const WARNING = '#FF9800';
const DANGER = '#F44336';
const INFO = '#2196F3';
const PURPLE = '#7C4DFF';
const BG = '#F0F2F8';

type BottomTab = 'dashboard' | 'jobs' | 'team' | 'messages' | 'profile';
type JobFilter = 'all' | 'active' | 'pending' | 'completed';

interface TeamMember {
  id: number;
  name: string;
  phone: string;
  skill: string;
  activeJobs: number;
  rating: number;
  avatar?: string;
}

interface JobItem {
  id: number;
  customerName: string;
  service: string;
  description?: string;
  status: string;
  scheduledDate: string;
  amount: number;
  location: string | { address?: string };
  assignedWorker?: string;
  createdAt?: string;
}

interface CompanyStats {
  totalRevenue: number;
  monthlyRevenue: number;
  activeJobs: number;
  completedJobs: number;
  teamSize: number;
  averageRating: number;
}

// ─── Floating Orb Decoration ───
const FloatingOrb = ({ size, color, style }: { size: number; color: string; style?: object }) => (
  <View
    pointerEvents="none"
    style={[
      { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      style,
    ]}
  />
);

export default function CompanyWorkerDashboardScreen() {
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('dashboard');
  const [jobFilter, setJobFilter] = useState<JobFilter>('all');
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<CompanyStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeJobs: 0,
    completedJobs: 0,
    teamSize: 0,
    averageRating: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      const userData = await AsyncStorage.getItem('@trustconnect_user');
      const userId = userData ? JSON.parse(userData).id : null;

      if (!userId || !token) {
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Fetch bookings for this company (artisan role)
      try {
        const bookingsRes = await axios.get(
          `${API_BASE_URL}/booking/artisan/${userId}/bookings`,
          { headers, timeout: 8000 }
        );
        const bdata = bookingsRes.data.bookings || bookingsRes.data.data || [];
        setJobs(bdata);

        const completed = bdata.filter((b: any) => b.status === 'completed' || b.status === 'released');
        const active = bdata.filter((b: any) =>
          ['accepted', 'confirmed', 'funded', 'on-the-way', 'in-progress', 'in_progress', 'job-done'].includes(b.status)
        );
        const total = completed.reduce((sum: number, b: any) => sum + (b.amount || b.estimatedPrice || 0), 0);

        setStats(prev => ({
          ...prev,
          totalRevenue: total,
          monthlyRevenue: total * 0.4,
          activeJobs: active.length,
          completedJobs: completed.length,
        }));
      } catch (e) {
        console.log('Jobs fetch error:', e);
      }

      // Fetch conversations for unread count
      try {
        const convRes = await axios.get(
          `${API_BASE_URL}/chat/conversations/${userId}`,
          { headers, timeout: 8000 }
        );
        const conversations = convRes.data.data || convRes.data.conversations || [];
        const totalUnread = conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
        setUnreadCount(totalUnread);
      } catch (e) {
        console.log('Conversations fetch error:', e);
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getLocationString = (loc: string | { address?: string } | undefined): string => {
    if (!loc) return 'Not specified';
    if (typeof loc === 'string') return loc;
    return loc.address || 'Not specified';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': case 'released': return SUCCESS;
      case 'in-progress': case 'in_progress': case 'on-the-way': return INFO;
      case 'funded': case 'accepted': case 'confirmed': return WARNING;
      case 'cancelled': case 'disputed': return DANGER;
      default: return '#90A4AE';
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (jobFilter === 'all') return true;
    if (jobFilter === 'active') return ['accepted', 'confirmed', 'funded', 'on-the-way', 'in-progress', 'in_progress'].includes(job.status);
    if (jobFilter === 'pending') return ['pending', 'quoted', 'negotiating'].includes(job.status);
    if (jobFilter === 'completed') return ['completed', 'released'].includes(job.status);
    return true;
  });

  // ─── RENDER: Dashboard Tab ─────────────────────────────────────────
  const renderDashboardTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Company Header */}
      <Animated.View entering={FadeInDown.delay(100).duration(500)}>
        <LinearGradient colors={[NAVY, NAVY_LIGHT]} style={styles.companyHeader}>
          <FloatingOrb size={80} color="rgba(255,193,7,0.08)" style={{ top: -20, right: -10 }} />
          <FloatingOrb size={50} color="rgba(255,255,255,0.05)" style={{ bottom: 10, left: 20 }} />

          <View style={styles.companyHeaderTop}>
            <View style={styles.companyAvatar}>
              <MaterialCommunityIcons name="domain" size={32} color={GOLD} />
            </View>
            <View style={styles.companyHeaderInfo}>
              <Text style={styles.companyName}>{user?.name || 'Company'}</Text>
              <View style={styles.companyBadge}>
                <MaterialCommunityIcons name="briefcase-check" size={14} color={GOLD} />
                <Text style={styles.companyBadgeText}>Service Provider</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>₦{(stats.totalRevenue / 1000).toFixed(0)}k</Text>
              <Text style={styles.statLabel}>Total Revenue</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.activeJobs}</Text>
              <Text style={styles.statLabel}>Active Jobs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.completedJobs}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.averageRating || '—'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Revenue Card */}
      <Animated.View entering={FadeInDown.delay(200).duration(500)}>
        <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.revenueCard}>
          <View style={styles.revenueHeader}>
            <MaterialCommunityIcons name="cash-multiple" size={24} color="#A5D6A7" />
            <Text style={styles.revenueTitle}>Monthly Revenue</Text>
          </View>
          <Text style={styles.revenueAmount}>₦{stats.monthlyRevenue.toLocaleString()}</Text>
          <View style={styles.revenueFooter}>
            <Text style={styles.revenueFooterText}>10% platform commission deducted</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(300).duration(500)}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/job-feed' as any)}
          >
            <LinearGradient colors={[INFO, '#1976D2']} style={styles.quickActionIcon}>
              <MaterialCommunityIcons name="briefcase-search" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.quickActionLabel}>Browse Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => setBottomTab('messages')}
          >
            <LinearGradient colors={[PURPLE, '#512DA8']} style={styles.quickActionIcon}>
              <MaterialCommunityIcons name="message-text" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.quickActionLabel}>Messages</Text>
            {unreadCount > 0 && (
              <View style={styles.quickActionBadge}>
                <Text style={styles.quickActionBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => setBottomTab('jobs')}
          >
            <LinearGradient colors={[WARNING, '#F57C00']} style={styles.quickActionIcon}>
              <MaterialCommunityIcons name="clipboard-list" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.quickActionLabel}>Active Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/wallet' as any)}
          >
            <LinearGradient colors={[SUCCESS, '#388E3C']} style={styles.quickActionIcon}>
              <MaterialCommunityIcons name="wallet" size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.quickActionLabel}>Wallet</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Recent Jobs */}
      <Animated.View entering={FadeInDown.delay(400).duration(500)}>
        <Text style={styles.sectionTitle}>Recent Jobs</Text>
        {jobs.slice(0, 5).map((job, index) => (
          <Animated.View key={job.id} entering={SlideInRight.delay(100 * index).duration(400)}>
            <TouchableOpacity
              style={styles.jobCard}
              onPress={() => router.push(`/chat?bookingId=${job.id}` as any)}
            >
              <View style={styles.jobCardHeader}>
                <View style={styles.jobCardTitle}>
                  <Text style={styles.jobCustomerName}>{job.customerName}</Text>
                  <Text style={styles.jobService}>{job.service}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                    {job.status.replace(/-|_/g, ' ')}
                  </Text>
                </View>
              </View>
              <View style={styles.jobCardFooter}>
                <View style={styles.jobCardDetail}>
                  <Ionicons name="location-outline" size={14} color="#90A4AE" />
                  <Text style={styles.jobCardDetailText} numberOfLines={1}>
                    {getLocationString(job.location)}
                  </Text>
                </View>
                <Text style={styles.jobAmount}>₦{(job.amount || 0).toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
        {jobs.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="briefcase-outline" size={48} color="#CFD8DC" />
            <Text style={styles.emptyTitle}>No jobs yet</Text>
            <Text style={styles.emptySubtitle}>Browse the job feed to find available work</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/job-feed' as any)}
            >
              <Text style={styles.emptyBtnText}>Browse Jobs</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // ─── RENDER: Jobs Tab ──────────────────────────────────────────────
  const renderJobsTab = () => (
    <View style={styles.tabContent}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        {(['all', 'active', 'pending', 'completed'] as JobFilter[]).map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, jobFilter === filter && styles.filterChipActive]}
            onPress={() => setJobFilter(filter)}
          >
            <Text style={[styles.filterChipText, jobFilter === filter && styles.filterChipTextActive]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredJobs}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
            <TouchableOpacity
              style={styles.jobCard}
              onPress={() => router.push(`/chat?bookingId=${item.id}` as any)}
            >
              <View style={styles.jobCardHeader}>
                <View style={styles.jobCardTitle}>
                  <Text style={styles.jobCustomerName}>{item.customerName}</Text>
                  <Text style={styles.jobService}>{item.service}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {item.status.replace(/-|_/g, ' ')}
                  </Text>
                </View>
              </View>
              <View style={styles.jobCardFooter}>
                <View style={styles.jobCardDetail}>
                  <Ionicons name="location-outline" size={14} color="#90A4AE" />
                  <Text style={styles.jobCardDetailText} numberOfLines={1}>
                    {getLocationString(item.location)}
                  </Text>
                </View>
                <Text style={styles.jobAmount}>₦{(item.amount || 0).toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#CFD8DC" />
            <Text style={styles.emptyTitle}>No {jobFilter !== 'all' ? jobFilter : ''} jobs</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );

  // ─── RENDER: Team Tab ──────────────────────────────────────────────
  const renderTeamTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(100).duration(500)}>
        <View style={styles.teamHeader}>
          <Text style={styles.sectionTitle}>Your Team</Text>
          <View style={styles.teamCountBadge}>
            <Text style={styles.teamCountText}>{team.length} workers</Text>
          </View>
        </View>

        {team.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-group-outline" size={48} color="#CFD8DC" />
            <Text style={styles.emptyTitle}>No team members yet</Text>
            <Text style={styles.emptySubtitle}>
              Team management will be available in a future update.
              For now, jobs are managed by the company account.
            </Text>
          </View>
        ) : (
          team.map((member, index) => (
            <Animated.View key={member.id} entering={SlideInRight.delay(100 * index).duration(400)}>
              <View style={styles.teamMemberCard}>
                <View style={styles.teamMemberAvatar}>
                  {member.avatar ? (
                    <Image source={{ uri: member.avatar }} style={styles.teamMemberAvatarImg} />
                  ) : (
                    <MaterialCommunityIcons name="account" size={28} color={NAVY} />
                  )}
                </View>
                <View style={styles.teamMemberInfo}>
                  <Text style={styles.teamMemberName}>{member.name}</Text>
                  <Text style={styles.teamMemberSkill}>{member.skill}</Text>
                  <View style={styles.teamMemberStats}>
                    <View style={styles.teamMemberStat}>
                      <MaterialCommunityIcons name="briefcase" size={12} color="#90A4AE" />
                      <Text style={styles.teamMemberStatText}>{member.activeJobs} active</Text>
                    </View>
                    <View style={styles.teamMemberStat}>
                      <MaterialCommunityIcons name="star" size={12} color={GOLD} />
                      <Text style={styles.teamMemberStatText}>{member.rating}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Animated.View>
          ))
        )}
      </Animated.View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // ─── RENDER: Messages Tab ──────────────────────────────────────────
  const renderMessagesTab = () => (
    <View style={styles.tabContent}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.messagesRedirect}>
        <MaterialCommunityIcons name="message-text-outline" size={48} color={NAVY} />
        <Text style={styles.messagesRedirectTitle}>Messages</Text>
        <Text style={styles.messagesRedirectSub}>View all your conversations</Text>
        <TouchableOpacity
          style={styles.messagesRedirectBtn}
          onPress={() => router.push('/conversations' as any)}
        >
          <LinearGradient colors={[NAVY, NAVY_LIGHT]} style={styles.messagesRedirectBtnGrad}>
            <Text style={styles.messagesRedirectBtnText}>Open Messages</Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  // ─── RENDER: Profile Tab ───────────────────────────────────────────
  const renderProfileTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.delay(100).duration(500)}>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <MaterialCommunityIcons name="domain" size={40} color={GOLD} />
          </View>
          <Text style={styles.profileName}>{user?.name || 'Company'}</Text>
          <Text style={styles.profilePhone}>{user?.phone}</Text>
          <View style={styles.profileBadge}>
            <MaterialCommunityIcons name="shield-check" size={16} color={SUCCESS} />
            <Text style={styles.profileBadgeText}>Verified Service Provider</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(500)}>
        {[
          { icon: 'account-edit', label: 'Edit Company Profile', route: '/edit-profile' },
          { icon: 'wallet', label: 'Wallet & Payments', route: '/wallet' },
          { icon: 'bell-outline', label: 'Notifications', route: '/notifications' },
          { icon: 'shield-lock', label: 'Change PIN', route: '/change-pin' },
          { icon: 'lock-reset', label: 'Change Password', route: '/change-password' },
          { icon: 'help-circle-outline', label: 'Help Center', route: '/help-center' },
          { icon: 'file-document-outline', label: 'Terms of Service', route: '/terms-of-service' },
        ].map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={styles.profileMenuItem}
            onPress={() => router.push(item.route as any)}
          >
            <MaterialCommunityIcons name={item.icon as any} size={22} color={NAVY} />
            <Text style={styles.profileMenuLabel}>{item.label}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#CFD8DC" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.profileMenuItem, { borderBottomWidth: 0, marginTop: 12 }]}
          onPress={() => {
            Alert.alert('Logout', 'Are you sure you want to logout?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                  await logout();
                  router.replace('/');
                },
              },
            ]);
          }}
        >
          <MaterialCommunityIcons name="logout" size={22} color={DANGER} />
          <Text style={[styles.profileMenuLabel, { color: DANGER }]}>Logout</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={DANGER} />
        </TouchableOpacity>
      </Animated.View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // ─── BOTTOM TAB BAR ────────────────────────────────────────────────
  const TABS: { key: BottomTab; icon: string; label: string }[] = [
    { key: 'dashboard', icon: 'view-dashboard', label: 'Dashboard' },
    { key: 'jobs', icon: 'briefcase', label: 'Jobs' },
    { key: 'team', icon: 'account-group', label: 'Team' },
    { key: 'messages', icon: 'message-text', label: 'Messages' },
    { key: 'profile', icon: 'account-circle', label: 'Profile' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />
        <LinearGradient colors={[NAVY, NAVY_LIGHT]} style={styles.loadingGradient}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY_DARK} />

      {/* Content */}
      {bottomTab === 'dashboard' && renderDashboardTab()}
      {bottomTab === 'jobs' && renderJobsTab()}
      {bottomTab === 'team' && renderTeamTab()}
      {bottomTab === 'messages' && renderMessagesTab()}
      {bottomTab === 'profile' && renderProfileTab()}

      {/* Bottom Tab Bar */}
      <View style={styles.bottomBar}>
        {TABS.map(tab => {
          const isActive = bottomTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={styles.bottomTab}
              onPress={() => setBottomTab(tab.key)}
            >
              <View style={[styles.bottomTabIcon, isActive && styles.bottomTabIconActive]}>
                <MaterialCommunityIcons
                  name={tab.icon as any}
                  size={22}
                  color={isActive ? GOLD : '#90A4AE'}
                />
                {tab.key === 'messages' && unreadCount > 0 && (
                  <View style={styles.bottomTabBadge}>
                    <Text style={styles.bottomTabBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.bottomTabLabel, isActive && styles.bottomTabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  tabContent: { flex: 1 },

  // Loading
  loadingContainer: { flex: 1 },
  loadingGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', fontSize: 15, marginTop: 12, fontWeight: '500' },

  // Company Header
  companyHeader: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  companyHeaderTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  companyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,193,7,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  companyHeaderInfo: { flex: 1 },
  companyName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  companyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  companyBadgeText: { fontSize: 12, color: GOLD_LIGHT, fontWeight: '500' },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Revenue Card
  revenueCard: { margin: 16, padding: 20, borderRadius: 16, overflow: 'hidden' },
  revenueHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revenueTitle: { fontSize: 14, color: '#A5D6A7', fontWeight: '600' },
  revenueAmount: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 8 },
  revenueFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  revenueFooterText: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  // Section
  sectionTitle: { fontSize: 17, fontWeight: '700', color: NAVY, marginHorizontal: 16, marginTop: 20, marginBottom: 12 },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  quickAction: {
    width: (SCREEN_WIDTH - 60) / 4,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: { fontSize: 11, color: '#546E7A', marginTop: 6, textAlign: 'center', fontWeight: '500' },
  quickActionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: DANGER,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Job Card
  jobCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  jobCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  jobCardTitle: { flex: 1, marginRight: 8 },
  jobCustomerName: { fontSize: 15, fontWeight: '600', color: NAVY },
  jobService: { fontSize: 12, color: '#78909C', marginTop: 2 },
  jobCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  jobCardDetail: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  jobCardDetailText: { fontSize: 12, color: '#90A4AE' },
  jobAmount: { fontSize: 15, fontWeight: '700', color: SUCCESS },

  // Status Badge
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },

  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E8EAF6',
  },
  filterChipActive: { backgroundColor: NAVY },
  filterChipText: { fontSize: 13, color: NAVY, fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },

  // Team
  teamHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16 },
  teamCountBadge: { backgroundColor: NAVY + '15', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  teamCountText: { fontSize: 12, color: NAVY, fontWeight: '600' },
  teamMemberCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  teamMemberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: GOLD + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teamMemberAvatarImg: { width: 44, height: 44, borderRadius: 12 },
  teamMemberInfo: { flex: 1 },
  teamMemberName: { fontSize: 15, fontWeight: '600', color: NAVY },
  teamMemberSkill: { fontSize: 12, color: '#78909C', marginTop: 2 },
  teamMemberStats: { flexDirection: 'row', gap: 12, marginTop: 6 },
  teamMemberStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  teamMemberStatText: { fontSize: 11, color: '#90A4AE' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#546E7A', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#90A4AE', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  emptyBtn: { marginTop: 16, backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Messages Redirect
  messagesRedirect: { alignItems: 'center', paddingVertical: 60 },
  messagesRedirectTitle: { fontSize: 20, fontWeight: '700', color: NAVY, marginTop: 16 },
  messagesRedirectSub: { fontSize: 14, color: '#78909C', marginTop: 4 },
  messagesRedirectBtn: { marginTop: 20, borderRadius: 24, overflow: 'hidden' },
  messagesRedirectBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 12 },
  messagesRedirectBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Profile
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginTop: Platform.OS === 'ios' ? 56 : 40,
    padding: 24,
    borderRadius: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: NAVY + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: { fontSize: 20, fontWeight: '700', color: NAVY },
  profilePhone: { fontSize: 14, color: '#78909C', marginTop: 2 },
  profileBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  profileBadgeText: { fontSize: 12, color: SUCCESS, fontWeight: '500' },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  profileMenuLabel: { flex: 1, fontSize: 15, color: NAVY, marginLeft: 14, fontWeight: '500' },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8EAF6',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  bottomTab: { flex: 1, alignItems: 'center' },
  bottomTabIcon: { position: 'relative', padding: 4 },
  bottomTabIconActive: {
    backgroundColor: NAVY + '10',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  bottomTabLabel: { fontSize: 10, color: '#90A4AE', marginTop: 2, fontWeight: '500' },
  bottomTabLabelActive: { color: NAVY, fontWeight: '600' },
  bottomTabBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: DANGER,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomTabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
