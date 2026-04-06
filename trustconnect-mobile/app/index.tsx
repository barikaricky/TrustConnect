import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WelcomeScreen from '../src/screens/WelcomeScreen';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      const userData = await AsyncStorage.getItem('@trustconnect_user');
      if (token && userData) {
        const user = JSON.parse(userData);
        if (user?.role === 'artisan') {
          router.replace('/artisan-dashboard');
        } else if (user?.role === 'company') {
          router.replace('/company-dashboard');
        } else if (user?.role === 'customer') {
          router.replace('/customer-home');
        }
      }
    } catch (e) {
      // No valid session, show welcome screen
    }
  };

  const handleHirePress = () => {
    router.push('/customer-registration');
  };

  const handleRegisterPress = () => {
    router.push('/artisan-registration');
  };

  const handleCompanyPress = () => {
    router.push('/company-registration');
  };

  const handleLoginPress = () => {
    router.push('/login');
  };

  return (
    <WelcomeScreen
      onHirePress={handleHirePress}
      onRegisterPress={handleRegisterPress}
      onCompanyPress={handleCompanyPress}
      onLoginPress={handleLoginPress}
    />
  );
}
