import { Stack } from 'expo-router';
import NotificationSettingsScreen from '../src/screens/NotificationSettingsScreen';

export default function NotificationSettingsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <NotificationSettingsScreen />
    </>
  );
}
