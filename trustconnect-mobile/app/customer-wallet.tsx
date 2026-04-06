import { useEffect } from 'react';
import { router } from 'expo-router';
import { Stack } from 'expo-router';

export default function CustomerWalletRoute() {
  useEffect(() => {
    router.replace('/wallet');
  }, []);

  return <Stack.Screen options={{ headerShown: false }} />;
}
