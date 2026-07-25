import { Redirect } from 'expo-router';
import React from 'react';

import { OnboardingStep, useOnboardingStore } from '@/store/onboarding-store';

export default function OnboardingIndex() {
  const currentStep = useOnboardingStore((s) => s.currentStep);

  // Map each step to the matching route
  const stepToRoute: Record<OnboardingStep, string> = {
    [OnboardingStep.NOT_STARTED]: '/onboarding/welcome',
    [OnboardingStep.SELECTING_CHARACTER]: '/onboarding/choose-character',
    [OnboardingStep.VIEWING_INTRO]: '/onboarding/app-introduction',
    [OnboardingStep.REQUESTING_NOTIFICATIONS]: '/onboarding/app-introduction',
    [OnboardingStep.STARTING_FIRST_QUEST]: '/onboarding/first-quest',
    [OnboardingStep.VIEWING_SIGNUP_PROMPT]: '/quest-completed-signup',
    [OnboardingStep.COMPLETED]: '/(app)',
  };

  // Determine the correct path based on the current step
  const targetPath = stepToRoute[currentStep];

  // Redirect to the appropriate step - cast as any to handle type issues with Expo Router types
  return <Redirect href={targetPath as any} />;
}
