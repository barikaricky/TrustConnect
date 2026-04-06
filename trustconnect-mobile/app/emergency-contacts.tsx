import { Stack } from 'expo-router';
import EmergencyContactsScreen from '../src/screens/EmergencyContactsScreen';

export default function EmergencyContactsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EmergencyContactsScreen />
    </>
  );
}
