import { useIsFocused } from '@react-navigation/native';
import { type Href, Redirect, Slot, usePathname } from 'expo-router';
import React from 'react';

import { AudioIndicator } from '@/components/onboarding/audio-indicator';
import { useOnboardingMusic } from '@/hooks/use-onboarding-music';
import { OnboardingStep, useOnboardingStore } from '@/store/onboarding-store';

export default function OnboardingLayout() {
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const isComplete = useOnboardingStore((s) => s.isOnboardingComplete());
  const path = usePathname();
  // Focus of THIS layout's route in the root stack (`onboarding`), not of the
  // onboarding screen currently showing: the layout renders above its own
  // <Slot/> navigator, so the nearest navigation context is the root stack's.
  // Navigating between onboarding screens therefore leaves this `true`, while
  // pushing a sibling root route (/pending-quest, /first-quest-result) flips
  // it to `false`.
  const isFocused = useIsFocused();

  // Owns the single looping music player for the whole onboarding flow (see
  // use-onboarding-music.ts). Must sit above both early returns below (rules
  // of hooks); `!isComplete` keeps it silent on the branch where this layout
  // is about to redirect away rather than briefly starting playback first.
  //
  // `isFocused` is what stops the music from outliving the flow. The root
  // navigator is a Stack and navigation-gate.tsx PUSHES /pending-quest, so
  // this layout is only blurred — never unmounted — while the user reads
  // "lock your phone", completes the quest, and hears the story narration on
  // /first-quest-result. Without this gate the ambient track plays under all
  // of it, with the AudioIndicator below rendered underneath the pushed screen
  // where it can't be tapped. Gating on focus also keeps the indicator honest:
  // the music is audible exactly when the control that mutes it is reachable.
  const { isPlaying } = useOnboardingMusic(!isComplete && isFocused);

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

  return (
    <>
      <Slot />
      <AudioIndicator isPlaying={isPlaying} />
    </>
  );
}
