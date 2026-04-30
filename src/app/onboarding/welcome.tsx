// src/app/index.tsx
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, TouchableOpacity } from 'react-native';

import {
  BackgroundImage,
  Button,
  Eyebrow,
  FocusAwareStatusBar,
  Text,
  Title,
  View,
} from '@/components/ui';
import { OnboardingStep, useOnboardingStore } from '@/store/onboarding-store';

export default function WelcomeScreen() {
  const router = useRouter();
  const { setCurrentStep } = useOnboardingStore();

  const handleGetStarted = () => {
    // Update the onboarding step to SELECTING_CHARACTER which will trigger navigation
    setCurrentStep(OnboardingStep.SELECTING_CHARACTER);
  };

  const handleLogin = () => {
    // Navigate to the login screen
    router.replace('/login');
  };

  return (
    <View className="flex h-full">
      <FocusAwareStatusBar />

      {/* Full-screen background image */}
      <BackgroundImage />

      {/* Content */}
      <View className="flex-1 px-6 py-4">
        <View className="mb-20 mt-8 items-center">
          <Image
            source={require('@/../assets/images/icon.png')}
            style={{ width: 120, height: 120 }}
            resizeMode="contain"
          />
          <Eyebrow text="Begin Your Journey" className="mt-2" />
          <Title className="text-4xl" variant="centered">
            emberglow
          </Title>
          <Text className="text-md font-semibold">Level Up By Logging Off</Text>
        </View>

        {/* Middle description section */}
        <View className="mt-20 flex-1">
          <Text className="mt-20 text-center text-lg text-white">
            Turn phone breaks into epic adventures
          </Text>
        </View>

        <View className="mb-10">
          <Button
            testID="get-started-button"
            label="Begin New Journey"
            onPress={handleGetStarted}
          />
          <TouchableOpacity
            onPress={handleLogin}
            className="mt-4 items-center"
            accessibilityRole="button"
            accessibilityLabel="Log in to existing account"
          >
            <Text className="text-base text-white underline shadow-md">
              Have an account? Log In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
