import { useEffect } from 'react';
import { router } from 'expo-router';
import { Stack } from 'expo-router';

export default function TermsOfServiceRoute() {
  useEffect(() => {
    router.replace({ pathname: '/about', params: { section: 'terms' } });
  }, []);

  return <Stack.Screen options={{ headerShown: false }} />;
}
