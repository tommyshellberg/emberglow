import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { OnboardingStep, useOnboardingStore } from '@/store/onboarding-store';
import { useSettingsStore } from '@/store/settings-store';

import OnboardingLayout from './_layout';

// Seam coverage for Task 8's music hook + Task 9's indicator + this layout.
// Every one of those passed review in isolation; the defect this file exists
// for (music still audible on /pending-quest and under story narration) lives
// only in their composition with the ROOT stack, so it can only be caught by
// mounting the layout as a screen of a real navigator and blurring it.
//
// The root navigator really is a Stack (src/app/_layout.tsx) with `onboarding`
// and `pending-quest` as siblings, and navigation-gate.tsx PUSHES
// /pending-quest — so the onboarding layout is blurred, NOT unmounted. That is
// what the stack below reproduces.

// jest-setup.ts's global react-native-safe-area-context mock omits
// SafeAreaInsetsContext / initialWindowMetrics, which @react-navigation/elements
// (pulled in by any real navigator) reads at render time. Widen it locally
// rather than touching the global mock 170+ other suites depend on.
jest.mock('react-native-safe-area-context', () => {
  const RealReact = jest.requireActual('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaInsetsContext: RealReact.createContext(inset),
    SafeAreaFrameContext: RealReact.createContext(frame),
    initialWindowMetrics: { insets: inset, frame },
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
  };
});

const Blank = () => null;
const ChildStack = createNativeStackNavigator();

// Stands in for expo-router's <Slot/>: the nested navigator that renders the
// individual onboarding screens. Real one, so that navigating BETWEEN
// onboarding screens exercises the same focus machinery the layout reads.
const mockSlot = () => (
  <ChildStack.Navigator screenOptions={{ headerShown: false }}>
    <ChildStack.Screen name="welcome" component={Blank} />
    <ChildStack.Screen name="choose-character" component={Blank} />
  </ChildStack.Navigator>
);

jest.mock('expo-router', () => ({
  __esModule: true,
  Redirect: () => null,
  Slot: () => mockSlot(),
  // NOT_STARTED short-circuits the layout's step-vs-path redirect, so this
  // value only has to be a string.
  usePathname: () => '/onboarding/welcome',
}));

jest.mock('expo-audio');
const audioMock = jest.requireMock(
  'expo-audio'
) as typeof import('../../../__mocks__/expo-audio');
const { mockPlayer, __resetAudioMock } = audioMock;

const RootStack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

const renderRootStack = () =>
  render(
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="onboarding" component={OnboardingLayout} />
        <RootStack.Screen name="pending-quest" component={Blank} />
      </RootStack.Navigator>
    </NavigationContainer>
  );

beforeEach(() => {
  // Delete BEFORE __resetAudioMock(): `loop`/`volume` are plain properties the
  // hook writes onto the shared mockPlayer, and __resetAudioMock() calls
  // .mockClear() on every own property. See use-onboarding-music.test.ts.
  delete (mockPlayer as Partial<Record<'loop' | 'volume', unknown>>).loop;
  delete (mockPlayer as Partial<Record<'loop' | 'volume', unknown>>).volume;
  __resetAudioMock();
  useSettingsStore.setState(useSettingsStore.getInitialState());
  useOnboardingStore.setState({ currentStep: OnboardingStep.NOT_STARTED });
});

describe('OnboardingLayout', () => {
  it('keeps the layout mounted when a sibling route is pushed on top', async () => {
    renderRootStack();
    await waitFor(() => expect(mockPlayer.play).toHaveBeenCalled());

    act(() => {
      navigationRef.navigate('pending-quest' as never);
    });

    // The premise of the whole file: a blurred screen of a native stack is
    // detached, not unmounted, so its music player outlives the navigation.
    // includeHiddenElements because the blurred screen is hidden from
    // accessibility while it stays in the tree.
    expect(
      screen.queryByTestId('audio-indicator', { includeHiddenElements: true })
    ).not.toBeNull();
  });

  it('stops the music when the onboarding flow is no longer the focused route', async () => {
    renderRootStack();
    await waitFor(() => expect(mockPlayer.play).toHaveBeenCalled());
    mockPlayer.pause.mockClear();

    act(() => {
      navigationRef.navigate('pending-quest' as never);
    });

    await waitFor(() => expect(mockPlayer.pause).toHaveBeenCalled());
  });

  it('keeps the music running when navigating between onboarding screens', async () => {
    renderRootStack();
    await waitFor(() => expect(mockPlayer.play).toHaveBeenCalled());
    mockPlayer.pause.mockClear();

    act(() => {
      navigationRef.navigate(
        'onboarding' as never,
        {
          screen: 'choose-character',
        } as never
      );
    });

    // The other direction of the focus gate, and the reason the player is
    // owned by the layout at all: a pause here would mean the track stops (and
    // then restarts) on every step of the flow. The layout's route stays
    // focused while its CHILD route changes, so the gate must not fire.
    expect(mockPlayer.pause).not.toHaveBeenCalled();
  });
});
