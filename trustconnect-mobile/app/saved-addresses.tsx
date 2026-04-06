import { Stack } from 'expo-router';
import SavedAddressesScreen from '../src/screens/SavedAddressesScreen';

export default function SavedAddressesRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SavedAddressesScreen />
    </>
  );
}
