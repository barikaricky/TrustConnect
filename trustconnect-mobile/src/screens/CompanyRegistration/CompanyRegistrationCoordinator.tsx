import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../services/AuthContext';
import Step1ContactSecurity from './Step1ContactSecurity';
import Step2BusinessDetails from './Step2BusinessDetails';
import Step3Location from './Step3Location';
import Step4BankDetails from './Step4BankDetails';
import SuccessScreen from './SuccessScreen';
import { CompanyRegistrationData, registerCompany } from '../../services/companyRegistrationService';

export default function CompanyRegistrationCoordinator() {
  const { login } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [registrationData, setRegistrationData] = useState<Partial<CompanyRegistrationData>>({});
  const [loading, setLoading] = useState(false);

  const handleStep1Complete = (data: Partial<CompanyRegistrationData>) => {
    setRegistrationData((prev) => ({ ...prev, ...data }));
    setCurrentStep(2);
  };

  const handleStep2Complete = (data: Partial<CompanyRegistrationData>) => {
    setRegistrationData((prev) => ({ ...prev, ...data }));
    setCurrentStep(3);
  };

  const handleStep3Complete = (data: Partial<CompanyRegistrationData>) => {
    setRegistrationData((prev) => ({ ...prev, ...data }));
    setCurrentStep(4);
  };

  const handleStep4Complete = async (data: Partial<CompanyRegistrationData>) => {
    const completeData = { ...registrationData, ...data } as CompanyRegistrationData;
    setRegistrationData(completeData);
    setLoading(true);

    try {
      const result = await registerCompany(completeData);

      if (result.success && result.companyId) {

        // Update AuthContext so _layout.tsx shows PIN setup after registration
        if (result.token && result.user) {
          await login(result.user, result.token);
        } else {
          // Fallback: store directly if service doesn't return user/token
          if (result.token) await AsyncStorage.setItem('@trustconnect_token', result.token);
          if (result.user) await AsyncStorage.setItem('@trustconnect_user', JSON.stringify(result.user));
        }

        setCurrentStep(5);
      } else {
        throw new Error(result.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Company registration failed:', error);

      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (error.message?.includes('already exists')) {
        errorMessage = '📱 This phone number is already registered.\n\nPlease use a different number or try logging in instead.';
      } else if (error.message?.includes('connect to server') || error.message?.includes('Network Error')) {
        errorMessage = '📡 Cannot connect to server.\n\nPlease check your internet connection and try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = '⏱️ Connection timeout.\n\nThe server is taking too long. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Registration Error', errorMessage, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1 && currentStep < 5) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {currentStep === 1 && (
        <Step1ContactSecurity
          onComplete={handleStep1Complete}
          initialData={registrationData}
        />
      )}

      {currentStep === 2 && (
        <Step2BusinessDetails
          onComplete={handleStep2Complete}
          onBack={handleBack}
          initialData={registrationData}
        />
      )}

      {currentStep === 3 && (
        <Step3Location
          onComplete={handleStep3Complete}
          onBack={handleBack}
          initialData={registrationData}
        />
      )}

      {currentStep === 4 && (
        <Step4BankDetails
          onComplete={handleStep4Complete}
          onBack={handleBack}
          initialData={registrationData}
          loading={loading}
        />
      )}

      {currentStep === 5 && (
        <SuccessScreen companyName={registrationData.companyName || 'Company'} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
