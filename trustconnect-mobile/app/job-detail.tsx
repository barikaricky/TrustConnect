import { Stack } from 'expo-router';
import JobDetailScreen from '../src/screens/JobDetailScreen';

export default function JobDetail() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <JobDetailScreen />
    </>
  );
}
