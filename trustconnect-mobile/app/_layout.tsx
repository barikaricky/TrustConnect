import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../src/services/AuthContext';
import LockScreen from '../src/screens/LockScreen';

function AppContent() {
  const { isLocked, needsPinSetup, unlock, completePinSetup, isAuthenticated } = useAuth();

  // Show lock screen when app is locked (returning from background)
  if (isAuthenticated && isLocked) {
    return <LockScreen mode="verify" onSuccess={unlock} />;
  }

  // Show PIN setup after registration/login if no PIN yet
  if (isAuthenticated && needsPinSetup) {
    return <LockScreen mode="set" onSuccess={completePinSetup} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="customer-registration" />
      <Stack.Screen name="artisan-registration" />
      <Stack.Screen name="company-registration" />
      <Stack.Screen name="customer-home" />
      <Stack.Screen name="artisan-dashboard" />
      <Stack.Screen name="company-dashboard" />
      <Stack.Screen name="artisan-profile" />
      <Stack.Screen name="customer-profile" />
      <Stack.Screen name="service-search" />
      <Stack.Screen name="booking" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="conversations" />
      <Stack.Screen name="escrow-payment" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="dispute" />
      <Stack.Screen name="dispute-detail" />
      <Stack.Screen name="dispute-form" />
      <Stack.Screen name="rating" />
      <Stack.Screen name="change-pin" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="notification-settings" />
      <Stack.Screen name="help-center" />
      <Stack.Screen name="about" />
      <Stack.Screen name="nin-verification" />
      <Stack.Screen name="emergency-contacts" />
      <Stack.Screen name="saved-addresses" />
      <Stack.Screen name="payment-methods" />
      <Stack.Screen name="favorite-artisans" />
      <Stack.Screen name="live-chat" />
      <Stack.Screen name="terms-of-service" />
      <Stack.Screen name="customer-wallet" />
      <Stack.Screen name="transaction-history" />
      <Stack.Screen name="refunds" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
