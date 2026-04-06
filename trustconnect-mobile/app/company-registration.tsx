import React from 'react';
import { Stack } from 'expo-router';
import CompanyRegistrationCoordinator from '../src/screens/CompanyRegistration/CompanyRegistrationCoordinator';

export default function CompanyRegistrationScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <CompanyRegistrationCoordinator />
    </>
  );
}
