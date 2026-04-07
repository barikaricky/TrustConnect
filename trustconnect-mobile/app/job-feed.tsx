import { Stack } from 'expo-router';
import JobFeedScreen from '../src/screens/JobFeedScreen';

export default function JobFeed() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <JobFeedScreen />
    </>
  );
}
