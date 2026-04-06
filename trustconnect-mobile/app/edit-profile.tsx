import { Stack } from 'expo-router';
import EditProfileScreen from '../src/screens/EditProfileScreen';

export default function EditProfileRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EditProfileScreen />
    </>
  );
}
