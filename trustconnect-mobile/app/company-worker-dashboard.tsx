import { Stack } from 'expo-router';
import CompanyWorkerDashboardScreen from '../src/screens/CompanyWorkerDashboardScreen';

export default function CompanyWorkerDashboardRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CompanyWorkerDashboardScreen />
    </>
  );
}
