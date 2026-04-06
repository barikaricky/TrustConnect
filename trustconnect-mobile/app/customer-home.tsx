import React from 'react';
import { Stack } from 'expo-router';
import CustomerHomeScreen from '../src/screens/CustomerHomeScreen';

export default function CustomerHome() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      <CustomerHomeScreen />
    </>
  );
}
