import { Stack } from 'expo-router';
import PaymentMethodsScreen from '../src/screens/PaymentMethodsScreen';

export default function PaymentMethodsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PaymentMethodsScreen />
    </>
  );
}
