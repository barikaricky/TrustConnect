import { Stack } from 'expo-router';
import EscrowPaymentScreen from '../src/screens/EscrowPaymentScreen';

export default function EscrowPaymentRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EscrowPaymentScreen />
    </>
  );
}
