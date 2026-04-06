import { Stack } from 'expo-router';
import FavoriteArtisansScreen from '../src/screens/FavoriteArtisansScreen';

export default function FavoriteArtisansRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <FavoriteArtisansScreen />
    </>
  );
}
