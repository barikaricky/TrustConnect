import React from 'react';
import { Stack } from 'expo-router';
import CustomerProfileScreen from '../src/screens/CustomerProfileScreen';

export default function CustomerProfile() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right',
        }} 
      />
      <CustomerProfileScreen />
    </>
  );
}
