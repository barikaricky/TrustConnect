import { Stack } from 'expo-router';
import ConversationsScreen from '../src/screens/ConversationsScreen';

export default function ConversationsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ConversationsScreen />
    </>
  );
}
