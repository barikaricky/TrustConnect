import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../services/AuthContext';
import Step1BasicInfo from './Step1BasicInfo';
import Step2LocationSecurity from './Step2LocationSecurity';
import Step3ServicePreferences from './Step3ServicePreferences';
import SuccessScreen from './SuccessScreen';
import { CustomerRegistrationData, registerCustomer, updateLocation, saveServicePreferences } from '../../services/customerRegistrationService';

export default function CustomerRegistrationCoordinator() {
  const { login } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [registrationData, setRegistrationData] = useState<Partial<CustomerRegistrationData>>({});
  const [customerId, setCustomerId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleStep1Complete = (data: Partial<CustomerRegistrationData>) => {
    console.log('Step 1 complete:', data);
    setRegistrationData((prev) => ({ ...prev, ...data }));
    setCurrentStep(2);
  };

  const handleStep2Complete = async (data: Partial<CustomerRegistrationData>) => {
    console.log('Step 2 complete:', data);
    setLoading(true);
    
    try {
      // Combine all data and register customer
      const completeData: CustomerRegistrationData = {
        ...registrationData,
        ...data,
      } as CustomerRegistrationData;

      const result = await registerCustomer(completeData);
      
      if (result.success && result.customerId) {
        setCustomerId(result.customerId);
        setRegistrationData((prev) => ({ ...prev, ...data }));
        
        // Update location if provided
        if (data.location) {
          await updateLocation(result.customerId, data.location);
        }

        // Trigger AuthContext so _layout.tsx shows PIN setup
        if (result.user && result.token) {
          await login(result.user, result.token);
        }
        
        setCurrentStep(3);
      } else {
        Alert.alert(
          '❌ Registration Failed',
          'Unable to create your account. Please check your information and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error.message.includes('already exists')) {
        errorMessage = '📱 This phone number is already registered.\n\nPlease use a different number or try logging in instead.';
      } else if (error.message.includes('connect to server') || error.message.includes('Network Error')) {
        errorMessage = '📡 Cannot connect to server.\n\nPlease check your internet connection and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = '⏱️ Connection timeout.\n\nThe server is taking too long to respond. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Registration Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Complete = async (data: Partial<CustomerRegistrationData>) => {
    console.log('Step 3 complete:', data);
    setLoading(true);
    
    try {
      // Save service preferences
      if (data.servicePreferences && customerId) {
        await saveServicePreferences(customerId, data.servicePreferences);
      }
      
      setRegistrationData((prev) => ({ ...prev, ...data }));
      setCurrentStep(4);
    } catch (error) {
      console.error('Error saving preferences:', error);
      // Continue anyway - preferences are optional
      setCurrentStep(4);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1 && currentStep < 4) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {currentStep === 1 && (
        <Step1BasicInfo
          onComplete={handleStep1Complete}
          initialData={registrationData}
        />
      )}
      
      {currentStep === 2 && (
        <Step2LocationSecurity
          onComplete={handleStep2Complete}
          onBack={handleBack}
          initialData={registrationData}
          loading={loading}
        />
      )}
      
      {currentStep === 3 && (
        <Step3ServicePreferences
          onComplete={handleStep3Complete}
          onBack={handleBack}
          initialData={registrationData}
          loading={loading}
        />
      )}
      
      {currentStep === 4 && (
        <SuccessScreen
          customerName={registrationData.fullName || 'Customer'}
          location={registrationData.location?.address || 'your area'}
        />
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
