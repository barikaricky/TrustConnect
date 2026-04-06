import React from 'react';
import { Stack, router } from 'expo-router';
import LockScreen from '../src/screens/LockScreen';
import { Alert } from 'react-native';

export default function ChangePin() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LockScreen
        mode="change"
        onSuccess={() => {
          Alert.alert('Success', 'Your PIN has been changed successfully.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        }}
        onBack={() => router.back()}
      />
    </>
  );
}
