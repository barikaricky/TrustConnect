import { Stack } from 'expo-router';
import DisputeFormScreen from '../src/screens/DisputeFormScreen';

export default function DisputeRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <DisputeFormScreen />
    </>
  );
}
