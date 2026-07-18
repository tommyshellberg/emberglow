import { type Href, Redirect, Slot, usePathname } from 'expo-router';
import React from 'react';

import { OnboardingStep, useOnboardingStore } from '@/store/onboarding-store';

export default function OnboardingLayout() {
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const isComplete = useOnboardingStore((s) => s.isOnboardingComplete());
  const path = usePathname();

  // If onboarding is complete, redirect to root for re-evaluation
  if (isComplete) {
    return <Redirect href="/" />;
  }

  // Handle onboarding step navigation only
  const stepToRoute: Record<OnboardingStep, Href> = {
    [OnboardingStep.NOT_STARTED]: '/onboarding/welcome',
    [OnboardingStep.SELECTING_CHARACTER]: '/onboarding/choose-character',
    [OnboardingStep.VIEWING_INTRO]: '/onboarding/app-introduction',
    [OnboardingStep.REQUESTING_NOTIFICATIONS]: '/onboarding/app-introduction',
    [OnboardingStep.STARTING_FIRST_QUEST]: '/onboarding/first-quest',
    [OnboardingStep.VIEWING_SIGNUP_PROMPT]: '/quest-completed-signup',
    [OnboardingStep.COMPLETED]: '/',
  };

  const target = stepToRoute[currentStep];
  if (path !== target && currentStep !== OnboardingStep.NOT_STARTED) {
    return <Redirect href={target} />;
  }

  return <Slot />;
}
