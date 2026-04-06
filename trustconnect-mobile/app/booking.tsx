import { Stack } from 'expo-router';
import BookingScreen from '../src/screens/BookingScreen';

export default function BookingRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BookingScreen />
    </>
  );
}
