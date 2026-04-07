import { Stack } from 'expo-router';
import PostJobScreen from '../src/screens/PostJobScreen';

export default function PostJob() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PostJobScreen />
    </>
  );
}
