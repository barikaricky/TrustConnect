import { Stack } from 'expo-router';
import WalletScreen from '../src/screens/WalletScreen';

export default function WalletRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WalletScreen />
    </>
  );
}
