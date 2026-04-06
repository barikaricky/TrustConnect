import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  StatusBar,
  Platform,
  Alert,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography } from '../config/theme';
import { 
  getCustomerProfile, 
  getFavoriteArtisans,
  uploadProfilePicture,
  CustomerProfile 
} from '../services/customerService';
import { clearAuthData, getStoredUser } from '../services/loginService';

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showBadge?: boolean;
  badgeText?: string;
  rightElement?: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ 
  icon, 
  title, 
  subtitle, 
  onPress, 
  showBadge, 
  badgeText,
  rightElement,
  iconColor = '#1a237e',
  iconBg = '#E8EAF6',
}) => (
  <Pressable 
    style={styles.menuItem}
    onPress={onPress}
    android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
  >
    <View style={[styles.menuIconContainer, { backgroundColor: iconBg }]}>
      <MaterialCommunityIcons name={icon as any} size={22} color={iconColor} />
    </View>
    <View style={styles.menuContent}>
      <Text style={styles.menuTitle}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    {showBadge && badgeText && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badgeText}</Text>
      </View>
    )}
    {rightElement || <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />}
  </Pressable>
);

export default function CustomerProfileScreen() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Get the logged-in user's ID from stored data
      const storedUser = await getStoredUser();
      if (!storedUser || !storedUser.id) {
        console.error('No user data found in storage');
        Alert.alert('Error', 'Please login again');
        router.replace('/');
        return;
      }

      const customerId = storedUser.id;
      console.log('📱 Loading profile for customer ID:', customerId);
      
      const [profileData, favorites] = await Promise.all([
        getCustomerProfile(customerId),
        getFavoriteArtisans(customerId),
      ]);
      
      console.log('✅ Profile data loaded:', profileData.fullName);
      setProfile(profileData);
      setFavoriteCount(favorites.length);
    } catch (error: any) {
      console.error('❌ Error loading profile:', error);
      Alert.alert('Error', error.message || 'Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out? You won\'t receive live job updates while logged out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Logging out...');
              await clearAuthData();
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent. All your data, including transaction history and saved preferences, will be deleted. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleWalletPress = () => {
    router.push('/customer-wallet');
  };

  const handleTransactionHistory = () => {
    router.push('/transaction-history');
  };

  const handlePaymentMethods = () => {
    router.push('/payment-methods');
  };

  const handleRefunds = () => {
    router.push('/refunds');
  };

  const handleNINVerification = () => {
    if (profile?.isVerified) {
      Alert.alert('Verified', 'Your NIN is already verified.');
    } else {
      router.push('/nin-verification');
    }
  };

  const handleEmergencyContacts = () => {
    router.push('/emergency-contacts');
  };

  const handleChangePassword = () => {
    router.push('/change-password');
  };

  const handleSavedAddresses = () => {
    router.push('/saved-addresses');
  };

  const handleFavoriteArtisans = () => {
    router.push('/favorite-artisans');
  };

  const handleNotificationSettings = () => {
    router.push('/notification-settings');
  };

  const handleHelpCenter = () => {
    router.push('/help-center');
  };

  const handleLiveChat = () => {
    router.push('/live-chat');
  };

  const handleTermsOfService = () => {
    router.push('/terms-of-service');
  };

  const handleUploadProfilePicture = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', '📷 Please allow access to your photos to upload a profile picture.');
        return;
      }

      // Show action sheet
      Alert.alert(
        'Upload Profile Picture',
        'Choose an option',
        [
          {
            text: '📷 Take Photo',
            onPress: async () => {
              const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
              if (!cameraPermission.granted) {
                Alert.alert('Permission Required', '📷 Please allow camera access.');
                return;
              }
              
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              
              if (!result.canceled) {
                await uploadImage(result.assets[0].uri);
              }
            },
          },
          {
            text: '🖼️ Choose from Gallery',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              
              if (!result.canceled) {
                await uploadImage(result.assets[0].uri);
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      const storedUser = await getStoredUser();
      if (!storedUser || !storedUser.id) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      // Show loading indicator
      Alert.alert('Uploading', '⏳ Uploading profile picture...');

      // Upload to server
      await uploadProfilePicture(storedUser.id, uri);

      // Refresh profile data
      await loadProfileData();

      Alert.alert('Success', '✅ Profile picture updated successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert(
        'Upload Failed',
        '❌ Failed to upload profile picture. Please try again.'
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#1a237e" />
        <ActivityIndicator size="large" color="#1a237e" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#1a237e" />
        <Text style={styles.errorText}>Failed to load profile</Text>
        <Pressable style={styles.retryButton} onPress={loadProfileData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1a237e" />
      <View style={styles.container}>
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#1a237e', '#283593']}
          style={styles.header}
        >
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Pressable style={styles.editButton} onPress={() => router.push('/edit-profile')}>
            <MaterialCommunityIcons name="pencil" size={20} color="#FFFFFF" />
          </Pressable>
        </LinearGradient>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a237e']} />
          }
        >
          {/* Profile Identity Card */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.profileCard}>
            <Pressable style={styles.avatarContainer} onPress={handleUploadProfilePicture}>
              <Image 
                source={{ uri: profile.avatar || 'https://i.pravatar.cc/200?img=12' }} 
                style={styles.avatar} 
              />
              <View style={styles.cameraOverlay}>
                <MaterialCommunityIcons name="camera" size={24} color="#FFFFFF" />
              </View>
              {profile.isVerified && (
                <View style={styles.verifiedBadge}>
                  <MaterialCommunityIcons name="check-decagram" size={24} color="#2196F3" />
                </View>
              )}
            </Pressable>

            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{profile.fullName}</Text>
              <Text style={styles.joinDate}>Member since {formatJoinDate(profile.joinDate)}</Text>
              
              <View style={styles.trustScoreContainer}>
                <Text style={styles.trustScoreLabel}>Trust Score</Text>
                <View style={styles.trustScoreRow}>
                  <MaterialCommunityIcons name="star" size={18} color="#FFC107" />
                  <Text style={styles.trustScoreValue}>{profile.trustScore.toFixed(1)}</Text>
                  <Text style={styles.trustScoreMax}>/5.0</Text>
                </View>
                <Text style={styles.trustScoreSubtext}>Respectful & pays promptly</Text>
              </View>
            </View>
          </Animated.View>

          {/* Financial Hub Section */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Hub</Text>

            {/* Wallet Balance Card */}
            <Pressable style={styles.walletCard} onPress={handleWalletPress}>
              <LinearGradient
                colors={['#1a237e', '#3949ab']}
                style={styles.walletGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.walletHeader}>
                  <View>
                    <Text style={styles.walletLabel}>Wallet Balance</Text>
                    <Text style={styles.walletBalance}>₦{profile.walletBalance.toLocaleString()}</Text>
                  </View>
                  <MaterialCommunityIcons name="wallet" size={32} color="rgba(255,255,255,0.5)" />
                </View>
                <Pressable style={styles.addMoneyButton} onPress={() => router.push('/wallet')}>
                  <MaterialCommunityIcons name="plus-circle" size={18} color="#1a237e" />
                  <Text style={styles.addMoneyText}>Add Money</Text>
                </Pressable>
              </LinearGradient>
            </Pressable>

            <View style={styles.menuGroup}>
              <MenuItem
                icon="history"
                title="Transaction History"
                subtitle="View all transactions"
                onPress={handleTransactionHistory}
                iconColor="#2196F3"
                iconBg="#E3F2FD"
              />
              <MenuItem
                icon="credit-card"
                title="Payment Methods"
                subtitle="Manage cards & bank accounts"
                onPress={handlePaymentMethods}
                iconColor="#4CAF50"
                iconBg="#E8F5E9"
              />
              <MenuItem
                icon="cash-refund"
                title="Refunds"
                subtitle="Track returned payments"
                onPress={handleRefunds}
                showBadge={true}
                badgeText="2"
                iconColor="#FFC107"
                iconBg="#FFF8E1"
              />
            </View>
          </Animated.View>

          {/* Safety & Verification Section */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Safety & Verification</Text>
            
            <View style={styles.menuGroup}>
              <MenuItem
                icon={profile.isVerified ? "shield-check" : "shield-alert"}
                title="NIN Verification"
                subtitle={profile.isVerified ? "Verified ✅" : "Verify Now ⚠️"}
                onPress={handleNINVerification}
                iconColor={profile.isVerified ? "#4CAF50" : "#FF9800"}
                iconBg={profile.isVerified ? "#E8F5E9" : "#FFF3E0"}
              />
              <MenuItem
                icon="phone-alert"
                title="Emergency Contacts"
                subtitle="Add trusted contacts"
                onPress={handleEmergencyContacts}
                iconColor="#F44336"
                iconBg="#FFEBEE"
              />
              <MenuItem
                icon="lock-reset"
                title="Change Password"
                subtitle="Update login credentials"
                onPress={handleChangePassword}
                iconColor="#9C27B0"
                iconBg="#F3E5F5"
              />
              <MenuItem
                icon="dialpad"
                title="Change Lock PIN"
                subtitle="Update your 6-digit lock code"
                onPress={() => router.push('/change-pin')}
                iconColor="#FF6F00"
                iconBg="#FFF3E0"
              />
              <MenuItem
                icon="fingerprint"
                title="Biometric Login"
                subtitle="FaceID or Fingerprint"
                onPress={() => {}}
                iconColor="#607D8B"
                iconBg="#ECEFF1"
                rightElement={
                  <Switch
                    value={biometricEnabled}
                    onValueChange={setBiometricEnabled}
                    trackColor={{ false: '#BDBDBD', true: '#4CAF50' }}
                    thumbColor={biometricEnabled ? '#FFFFFF' : '#F5F5F5'}
                  />
                }
              />
            </View>
          </Animated.View>

          {/* Preferences & Activity Section */}
          <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences & Activity</Text>
            
            <View style={styles.menuGroup}>
              <MenuItem
                icon="home-map-marker"
                title="Saved Addresses"
                subtitle="Home, Office, Parent's House"
                onPress={handleSavedAddresses}
                iconColor="#FF5722"
                iconBg="#FBE9E7"
              />
              <MenuItem
                icon="heart"
                title="Favorite Artisans"
                subtitle="Your trusted pros"
                onPress={handleFavoriteArtisans}
                showBadge={favoriteCount > 0}
                badgeText={favoriteCount.toString()}
                iconColor="#E91E63"
                iconBg="#FCE4EC"
              />
              <MenuItem
                icon="bell"
                title="Notification Settings"
                subtitle="SMS, WhatsApp, Email alerts"
                onPress={handleNotificationSettings}
                iconColor="#00BCD4"
                iconBg="#E0F7FA"
                rightElement={
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: '#BDBDBD', true: '#4CAF50' }}
                    thumbColor={notificationsEnabled ? '#FFFFFF' : '#F5F5F5'}
                  />
                }
              />
            </View>
          </Animated.View>

          {/* Support & Legal Section */}
          <Animated.View entering={FadeInDown.delay(500)} style={styles.section}>
            <Text style={styles.sectionTitle}>Support & Legal</Text>
            
            <View style={styles.menuGroup}>
              <MenuItem
                icon="help-circle"
                title="Help Center"
                subtitle="FAQs & Guides"
                onPress={handleHelpCenter}
                iconColor="#3F51B5"
                iconBg="#E8EAF6"
              />
              <MenuItem
                icon="chat"
                title="Live Support Chat"
                subtitle="Talk to a human agent"
                onPress={handleLiveChat}
                iconColor="#009688"
                iconBg="#E0F2F1"
              />
              <MenuItem
                icon="file-document"
                title="Terms of Service"
                subtitle="Legal information"
                onPress={handleTermsOfService}
                iconColor="#795548"
                iconBg="#EFEBE9"
              />
            </View>
          </Animated.View>

          {/* Logout & Delete Actions */}
          <Animated.View entering={FadeInDown.delay(600)} style={styles.actionSection}>
            <Pressable 
              style={styles.logoutButton}
              onPress={handleLogout}
              android_ripple={{ color: 'rgba(244,67,54,0.1)' }}
            >
              <MaterialCommunityIcons name="logout" size={22} color="#F44336" />
              <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>

            <Pressable onPress={handleDeleteAccount} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Delete Account</Text>
            </Pressable>
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: '#757575',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: '#1a237e',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + spacing.sm : spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginTop: -spacing.xl,
    marginBottom: spacing.lg,
    borderRadius: 20,
    padding: spacing.xl,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0E0E0',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a237e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: '#212121',
    marginBottom: spacing.xs,
  },
  joinDate: {
    fontSize: 14,
    color: '#757575',
    marginBottom: spacing.md,
  },
  trustScoreContainer: {
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    width: '100%',
  },
  trustScoreLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: spacing.xs,
  },
  trustScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  trustScoreValue: {
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: '#212121',
  },
  trustScoreMax: {
    fontSize: 14,
    color: '#9E9E9E',
  },
  trustScoreSubtext: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: typography.fontWeight.medium,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    color: '#212121',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  walletCard: {
    marginHorizontal: spacing.lg,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginBottom: spacing.md,
  },
  walletGradient: {
    padding: spacing.lg,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  walletLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.xs,
  },
  walletBalance: {
    fontSize: 32,
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  addMoneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    gap: spacing.xs,
  },
  addMoneyText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: '#1a237e',
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: spacing.md,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: typography.fontWeight.semibold,
    color: '#212121',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#757575',
  },
  badge: {
    backgroundColor: '#F44336',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  actionSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.md + 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F44336',
    gap: spacing.sm,
    elevation: 2,
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    color: '#F44336',
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  deleteText: {
    fontSize: 13,
    color: '#F44336',
    textDecorationLine: 'underline',
  },
  bottomSpacer: {
    height: spacing.xl * 2,
  },
});
