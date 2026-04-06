import { Stack } from 'expo-router';
import NINVerificationScreen from '../src/screens/NINVerificationScreen';

export default function NINVerificationRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <NINVerificationScreen />
    </>
  );
}
