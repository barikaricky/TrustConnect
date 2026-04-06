import { Stack } from 'expo-router';
import HelpCenterScreen from '../src/screens/HelpCenterScreen';

export default function HelpCenterRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <HelpCenterScreen />
    </>
  );
}
