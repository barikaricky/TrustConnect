import { Stack } from 'expo-router';
import ServiceSearchScreen from '../src/screens/ServiceSearchScreen';

export default function ServiceSearchRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ServiceSearchScreen />
    </>
  );
}
