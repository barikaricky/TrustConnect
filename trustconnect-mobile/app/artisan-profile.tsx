import { Stack } from 'expo-router';
import ArtisanProfileScreen from '../src/screens/ArtisanProfileScreen';

export default function ArtisanProfileRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ArtisanProfileScreen />
    </>
  );
}
