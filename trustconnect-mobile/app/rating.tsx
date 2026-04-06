import { Stack } from 'expo-router';
import RatingScreen from '../src/screens/RatingScreen';

export default function RatingRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <RatingScreen />
    </>
  );
}
