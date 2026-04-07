import { Stack } from 'expo-router';
import ChatScreen from '../src/screens/ChatScreen';

export default function ChatRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ChatScreen />
    </>
  );
}
