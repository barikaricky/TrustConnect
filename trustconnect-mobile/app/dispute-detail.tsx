import { Stack } from 'expo-router';
import DisputeDetailScreen from '../src/screens/DisputeDetailScreen';

export default function DisputeDetailRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <DisputeDetailScreen />
    </>
  );
}
