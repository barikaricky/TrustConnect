import React from 'react';
import { Stack } from 'expo-router';
import CompanyDashboardScreen from '../src/screens/CompanyDashboardScreen';

export default function CompanyDashboard() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <CompanyDashboardScreen />
    </>
  );
}
