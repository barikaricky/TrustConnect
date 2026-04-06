import React from 'react';
import { Stack } from 'expo-router';
import ArtisanHomeScreen from '../src/screens/ArtisanHomeScreen';

export default function ArtisanDashboard() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      <ArtisanHomeScreen />
    </>
  );
}
