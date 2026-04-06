import { Stack } from 'expo-router';
import LiveChatScreen from '../src/screens/LiveChatScreen';

export default function LiveChatRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LiveChatScreen />
    </>
  );
}
