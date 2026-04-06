import React from 'react';
import { Stack } from 'expo-router';
import CustomerRegistrationCoordinator from '../src/screens/CustomerRegistration/CustomerRegistrationCoordinator';

export default function CustomerRegistrationScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right',
        }} 
      />
      <CustomerRegistrationCoordinator />
    </>
  );
}
