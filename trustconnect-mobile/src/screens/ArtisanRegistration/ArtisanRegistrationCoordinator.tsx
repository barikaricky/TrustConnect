import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../services/AuthContext';
import Step1ContactSecurity from './Step1ContactSecurity';
import Step2LegalIdentity from './Step2LegalIdentity';
import Step3BusinessDetails from './Step3BusinessDetails';
import Step4BankDetails from './Step4BankDetails';
import SuccessScreen from './SuccessScreen';

export interface RegistrationData {
  // Step 1
  phone: string;
  email?: string;
  password: string;
  agreedToTerms: boolean;
  
  // Step 2
  idType: 'NIN' | 'BVN';
  idNumber: string;
  fullName: string;
  selfieUrl: string;
  
  // Step 3
  primaryTrade: string;
  yearsExperience: string;
  workLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  portfolioPhotos: string[];
  
  // Step 4
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export default function ArtisanRegistrationCoordinator() {
  const { login } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [registrationData, setRegistrationData] = useState<Partial<RegistrationData>>({});

  const handleStep1Complete = (data: Partial<RegistrationData>) => {
    setRegistrationData({ ...registrationData, ...data });
    setCurrentStep(2);
  };

  const handleStep2Complete = (data: Partial<RegistrationData>) => {
    setRegistrationData({ ...registrationData, ...data });
    setCurrentStep(3);
  };

  const handleStep3Complete = (data: Partial<RegistrationData>) => {
    setRegistrationData({ ...registrationData, ...data });
    setCurrentStep(4);
  };

  const handleStep4Complete = async (data: Partial<RegistrationData>) => {
    const completeData = { ...registrationData, ...data } as RegistrationData;
    setRegistrationData(completeData);
    
    // Submit to backend
    try {
      const ArtisanRegistrationService = (await import('../../services/artisanRegistrationService')).default;
      
      const result = await ArtisanRegistrationService.submitRegistration({
        ...completeData,
        idDocumentUrl: completeData.selfieUrl,
        trustAccepted: completeData.agreedToTerms,
        workshopAddress: completeData.workLocation.address,
      });
      
      if (result.success) {
        console.log('Registration successful:', result.artisanId);

        // Auto-login: update AuthContext so _layout.tsx shows PIN setup
        if (result.token && result.user) {
          await login(result.user, result.token);
        } else {
          // Fallback: store to AsyncStorage directly if no user/token returned
          if (result.token) await AsyncStorage.setItem('@trustconnect_token', result.token);
          if (result.user) await AsyncStorage.setItem('@trustconnect_user', JSON.stringify(result.user));
        }

        setCurrentStep(5);
      } else {
        throw new Error(result.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      const msg = error.message || 'Registration failed. Please try again.';
      Alert.alert(
        'Registration Error',
        msg,
        [{ text: 'OK' }],
      );
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <View style={styles.container}>
      {currentStep === 1 && (
        <Step1ContactSecurity
          onComplete={handleStep1Complete}
          initialData={registrationData}
        />
      )}
      
      {currentStep === 2 && (
        <Step2LegalIdentity
          onComplete={handleStep2Complete}
          onBack={handleBack}
          initialData={registrationData}
        />
      )}
      
      {currentStep === 3 && (
        <Step3BusinessDetails
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
          fullName={registrationData.fullName || ''}
        />
      )}
      
      {currentStep === 5 && <SuccessScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
});
