import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ChooseCharacterScreen from '../choose-character';
import { getAccessToken } from '@/api/token';
import {
  createProvisionalUser,
  updateUserCharacter,
} from '@/lib/services/user';
import { Dimensions } from 'react-native';
import { useOnboardingStore, OnboardingStep } from '@/store/onboarding-store';
import { useCharacterStore } from '@/store/character-store';
import { useSettingsStore } from '@/store/settings-store';
import CHARACTERS from '@/app/data/characters';

// Mock createProvisionalUser so we can simulate both success and failure.
jest.mock('@/lib/services/user', () => ({
  createProvisionalUser: jest.fn(),
  updateUserCharacter: jest.fn(),
}));

// Manual mock (see __mocks__/expo-audio.ts) — a single module-scoped
// mockPlayer shared by every useAudioPlayer() call, matching StoryNarration's
// pattern. __resetAudioMock() must run in beforeEach: mockPlayer is shared
// module state, so replace/play calls would otherwise leak between tests and
// poison every not.toHaveBeenCalled() assertion below.
jest.mock('expo-audio');
const audioMock = jest.requireMock(
  'expo-audio'
) as typeof import('../../../../__mocks__/expo-audio');
const { mockPlayer, __resetAudioMock } = audioMock;

// Real-session discriminator: null = onboarding-from-scratch (provisional
// path), a token = authenticated hero-less account (PATCH path).
jest.mock('@/api/token', () => ({ getAccessToken: jest.fn(() => null) }));

// Mock UI components
jest.mock('@/components/ui/focus-aware-status-bar', () => ({
  FocusAwareStatusBar: () => null,
}));

// Mock posthog
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: jest.fn(),
  }),
}));

// Mock the characters data. Only two entries (the real CHARACTERS order is
// alchemist, knight, bard, scout, druid, wizard, but this screen's tests only
// ever exercise this two-entry mock).
// introAudio sentinels are distinct on purpose: asserting
// toHaveBeenCalledWith(CHARACTERS[n].introAudio) against a shared/undefined
// value would pass even if the implementation looked up the wrong character.
jest.mock('@/app/data/characters', () => ({
  __esModule: true,
  default: [
    {
      id: 'alchemist',
      type: 'Alchemist',
      title: 'Master of Transformation',
      description: 'Turns idle hours into gold.',
      image: 'mock-image-path',
      profileImage: 'mock-profile-path',
      introAudio: 'mock-alchemist-intro',
    },
    {
      id: 'knight',
      type: 'Knight',
      title: 'Paragon of Discipline',
      description: 'Holds the line, one quest at a time.',
      image: 'mock-image-path',
      profileImage: 'mock-profile-path',
      introAudio: 'mock-knight-intro',
    },
  ],
}));

// Mock character store
const mockCharacterStore = {
  character: null,
  createCharacter: jest.fn(),
  resetCharacter: jest.fn(),
};

jest.mock('@/store/character-store', () => ({
  useCharacterStore: jest.fn((selector) =>
    selector ? selector(mockCharacterStore) : mockCharacterStore
  ),
}));

// Add getState method to the mock for direct access
(useCharacterStore as any).getState = () => mockCharacterStore;

// Get screen dimensions and define card dimensions
const screenWidth = Dimensions.get('window').width;
const cardWidth = screenWidth * 0.65; // 65% of screen width
const cardSpacing = 16;
const snapInterval = cardWidth + cardSpacing;

describe('ChooseCharacterScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Stub the store setter:
    useOnboardingStore.getState().setCurrentStep = jest.fn();
    (createProvisionalUser as jest.Mock).mockClear();
    (updateUserCharacter as jest.Mock).mockClear();
    (getAccessToken as jest.Mock).mockReset().mockReturnValue(null);
    mockCharacterStore.createCharacter.mockClear();
    mockCharacterStore.resetCharacter.mockClear();
    __resetAudioMock();
    // Without this, a test that sets onboardingSoundEnabled: false would leak
    // that value into every later test in the file (assertion-hygiene rule 3
    // — reset from the real default, not a hand-written literal).
    useSettingsStore.setState(useSettingsStore.getInitialState());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Types name + advances the debounce + presses Continue, landing on the
  // character-selection step with CHARACTERS[0] (alchemist) selected.
  const goToCharacterSelectionStep = async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <ChooseCharacterScreen />
    );
    fireEvent.changeText(getByPlaceholderText('e.g. Rowan'), 'Arthur');
    act(() => {
      jest.advanceTimersByTime(500);
    });
    fireEvent.press(getByText('Continue'));
    return { getByText, getByTestId };
  };

  describe('character intro voice clips', () => {
    it('plays the initially selected character intro on entering the selection step', async () => {
      await goToCharacterSelectionStep();

      expect(mockPlayer.replace).toHaveBeenCalledWith(CHARACTERS[0].introAudio);
      expect(mockPlayer.play).toHaveBeenCalled();
    });

    it('plays the newly snapped character intro and replaces the previous clip', async () => {
      const { getByTestId } = await goToCharacterSelectionStep();
      mockPlayer.replace.mockClear();
      mockPlayer.play.mockClear();

      fireEvent(getByTestId('character-carousel'), 'onMomentumScrollEnd', {
        nativeEvent: { contentOffset: { x: snapInterval } }, // index 1 = knight (this mock)
      });

      expect(mockPlayer.replace).toHaveBeenCalledWith(CHARACTERS[1].introAudio);
      expect(mockPlayer.play).toHaveBeenCalled();
    });

    it('does not replay when the carousel settles on the same card', async () => {
      const { getByTestId } = await goToCharacterSelectionStep();
      mockPlayer.replace.mockClear();

      fireEvent(getByTestId('character-carousel'), 'onMomentumScrollEnd', {
        nativeEvent: { contentOffset: { x: 0 } }, // still index 0
      });

      expect(mockPlayer.replace).not.toHaveBeenCalled();
    });

    it('plays no intro clip when the user has muted onboarding audio', async () => {
      useSettingsStore.setState({ onboardingSoundEnabled: false });

      await goToCharacterSelectionStep();

      expect(mockPlayer.replace).not.toHaveBeenCalled();
    });

    // "One flag governs music AND intro clips" has to hold for the clip that
    // is already speaking too: playIntroClip reads the flag through
    // getState(), so on its own it only ever governs the NEXT clip, leaving up
    // to ~9 seconds of voice-over running after the user hits mute.
    it('stops a clip that is already speaking when the user mutes', async () => {
      await goToCharacterSelectionStep();
      mockPlayer.pause.mockClear();

      act(() => {
        useSettingsStore.setState({ onboardingSoundEnabled: false });
      });

      expect(mockPlayer.pause).toHaveBeenCalled();
    });

    it('leaves a playing clip alone while onboarding sound stays enabled', async () => {
      const { getByTestId } = await goToCharacterSelectionStep();

      fireEvent(getByTestId('character-carousel'), 'onMomentumScrollEnd', {
        nativeEvent: { contentOffset: { x: snapInterval } },
      });

      // Deliberately NOT cleared first: a pause at any point while the flag is
      // on — mount, re-render, swipe — cuts the voice-over short. Clearing
      // here would let an unconditional `introPlayer.pause()` pass.
      expect(mockPlayer.pause).not.toHaveBeenCalled();
    });
  });

  it('should create provisional user with correct data and navigate on success', async () => {
    // Set up the mock to resolve successfully
    (createProvisionalUser as jest.Mock).mockResolvedValue({ success: true });

    const { getByPlaceholderText, getByText, getByTestId } = render(
      <ChooseCharacterScreen />
    );

    // Step 1: Should start on intro and name input screen
    expect(getByText('Every legend needs a name')).toBeTruthy();
    expect(
      getByText('This is who quests while your phone rests.')
    ).toBeTruthy();
    expect(getByText('Hero name')).toBeTruthy();

    // Enter character name
    const input = getByPlaceholderText('e.g. Rowan');
    fireEvent.changeText(input, 'Arthur');

    // Flush debounce by advancing timers.
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Click Continue to go to character selection step
    fireEvent.press(getByText('Continue'));

    // Step 2: Should now be on character selection step
    expect(getByText("Choose Arthur's path")).toBeTruthy();

    // Get the FlatList component and simulate swipe to knight (second character)
    const flatList = getByTestId('character-carousel');
    fireEvent(flatList, 'onMomentumScrollEnd', {
      nativeEvent: {
        contentOffset: {
          x: snapInterval, // This is the second card position (index 1)
        },
      },
    });

    // Tap the Create character button.
    const createButton = getByText('Create character');

    // We need to handle promise resolution manually in tests
    await act(async () => {
      fireEvent.press(createButton);
      // Flush promises
      await Promise.resolve();
      // Advance any timers that may be used internally
      jest.runAllTimers();
    });

    // Now verify the expectations
    expect(createProvisionalUser).toHaveBeenCalledWith({
      type: 'knight',
      name: 'Arthur',
    });

    expect(mockCharacterStore.createCharacter).toHaveBeenCalledWith(
      'knight',
      'Arthur'
    );
    expect(useOnboardingStore.getState().setCurrentStep).toHaveBeenCalledWith(
      OnboardingStep.VIEWING_INTRO
    );
  });

  it('PATCHes the character onto the real account (no provisional user) when a session exists', async () => {
    // Named bug: Google-first signup landed here with a live session;
    // creating a provisional user split quest data across two accounts.
    (getAccessToken as jest.Mock).mockReturnValue('real-access-token');
    (updateUserCharacter as jest.Mock).mockResolvedValue({ success: true });

    const { getByPlaceholderText, getByText, getByTestId } = render(
      <ChooseCharacterScreen />
    );

    fireEvent.changeText(getByPlaceholderText('e.g. Rowan'), 'Arthur');
    act(() => {
      jest.advanceTimersByTime(500);
    });
    fireEvent.press(getByText('Continue'));

    const flatList = getByTestId('character-carousel');
    fireEvent(flatList, 'onMomentumScrollEnd', {
      nativeEvent: { contentOffset: { x: snapInterval } },
    });

    await act(async () => {
      fireEvent.press(getByText('Create character'));
      await Promise.resolve();
      jest.runAllTimers();
    });

    expect(updateUserCharacter).toHaveBeenCalledWith({
      type: 'knight',
      name: 'Arthur',
    });
    expect(createProvisionalUser).not.toHaveBeenCalled();
    expect(mockCharacterStore.createCharacter).toHaveBeenCalledWith(
      'knight',
      'Arthur'
    );
    expect(useOnboardingStore.getState().setCurrentStep).toHaveBeenCalledWith(
      OnboardingStep.VIEWING_INTRO
    );
  });

  it('should handle PROVISIONAL_EMAIL_TAKEN error and still navigate', async () => {
    // Set up the mock to reject with the specific recoverable error
    (createProvisionalUser as jest.Mock).mockRejectedValue(
      new Error('PROVISIONAL_EMAIL_TAKEN')
    );

    const { getByPlaceholderText, getByText } = render(
      <ChooseCharacterScreen />
    );

    // Step 1: Enter name on intro screen
    const input = getByPlaceholderText('e.g. Rowan');
    fireEvent.changeText(input, 'Merlin');

    // Flush debounce.
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Click Continue to go to character selection
    fireEvent.press(getByText('Continue'));

    // Step 2: Character selection (default is alchemist)
    const createButton = getByText('Create character');

    // We need to handle promise rejection manually in tests
    await act(async () => {
      fireEvent.press(createButton);
      // Flush promises
      await Promise.resolve();
      // Advance any timers that may be used internally
      jest.runAllTimers();
    });

    // Verify the API was called
    expect(createProvisionalUser).toHaveBeenCalledWith({
      type: 'alchemist', // The default selected character
      name: 'Merlin',
    });

    // Should still create character locally and proceed
    expect(mockCharacterStore.createCharacter).toHaveBeenCalledWith(
      'alchemist',
      'Merlin'
    );
    expect(useOnboardingStore.getState().setCurrentStep).toHaveBeenCalledWith(
      OnboardingStep.VIEWING_INTRO
    );

    // Should not reset character store for this recoverable error
    expect(mockCharacterStore.resetCharacter).not.toHaveBeenCalled();
  });

  it('should handle general API failure and not navigate', async () => {
    // Set up the mock to reject with a general error
    (createProvisionalUser as jest.Mock).mockRejectedValue(
      new Error('network error')
    );

    const { getByPlaceholderText, getByText, queryByText } = render(
      <ChooseCharacterScreen />
    );

    // Step 1: Enter name
    const input = getByPlaceholderText('e.g. Rowan');
    fireEvent.changeText(input, 'Gandalf');

    // Flush debounce.
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Click Continue to go to character selection
    fireEvent.press(getByText('Continue'));

    // Step 2: Try to create character
    const createButton = getByText('Create character');

    // We need to handle promise rejection manually in tests
    await act(async () => {
      fireEvent.press(createButton);
      // Flush promises
      await Promise.resolve();
      // Advance any timers that may be used internally
      jest.runAllTimers();
    });

    // Verify the API was called
    expect(createProvisionalUser).toHaveBeenCalledWith({
      type: 'alchemist',
      name: 'Gandalf',
    });

    // Should create character locally first
    expect(mockCharacterStore.createCharacter).toHaveBeenCalledWith(
      'alchemist',
      'Gandalf'
    );

    // Should reset character store due to failure
    expect(mockCharacterStore.resetCharacter).toHaveBeenCalled();

    // Should NOT proceed to next step
    expect(useOnboardingStore.getState().setCurrentStep).not.toHaveBeenCalled();

    // Should show error message
    await waitFor(() => {
      expect(
        queryByText(
          /Network error. Please check your connection and try again./
        )
      ).toBeTruthy();
    });
  });

  it('should show loading state during creation', async () => {
    // Set up a promise that we can control
    let resolvePromise: ((value: any) => void) | undefined;
    const controlledPromise = new Promise<any>((resolve) => {
      resolvePromise = resolve;
    });
    (createProvisionalUser as jest.Mock).mockReturnValue(controlledPromise);

    const { getByPlaceholderText, getByText, queryByText } = render(
      <ChooseCharacterScreen />
    );

    // Step 1: Enter name
    const input = getByPlaceholderText('e.g. Rowan');
    fireEvent.changeText(input, 'TestUser');

    // Flush debounce.
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Click Continue to go to character selection
    fireEvent.press(getByText('Continue'));

    // Step 2: Try to create character
    const createButton = getByText('Create character');

    // Press the button but don't resolve the promise yet
    act(() => {
      fireEvent.press(createButton);
    });

    // Should show loading state with different button text
    expect(queryByText('Forging your legend…')).toBeTruthy();
    expect(queryByText('Create character')).toBeFalsy();

    // Resolve the promise
    await act(async () => {
      resolvePromise!({ success: true });
      await Promise.resolve();
    });

    // Should return to normal state (but actually it will navigate away after success)
    // The component should have processed the success and updated the onboarding state
    expect(useOnboardingStore.getState().setCurrentStep).toHaveBeenCalledWith(
      OnboardingStep.VIEWING_INTRO
    );
  });

  it('should not allow continuing without entering a name', () => {
    const { getByText, getByPlaceholderText } = render(
      <ChooseCharacterScreen />
    );

    // Step 1: Should start with Continue button disabled
    const continueButton = getByText('Continue');

    // Try to press without entering name - nothing should happen
    fireEvent.press(continueButton);

    // Should still be on the same screen
    expect(getByText('Every legend needs a name')).toBeTruthy();
    expect(getByText('Hero name')).toBeTruthy();

    // Now enter a name that satisfies the 2-16 char rule
    const input = getByPlaceholderText('e.g. Rowan');
    fireEvent.changeText(input, 'Al');

    // Flush debounce
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Now should be able to continue
    fireEvent.press(continueButton);

    // Should be on character selection screen
    expect(getByText("Choose Al's path")).toBeTruthy();
  });

  it('should keep continue disabled for a 1-character name (2-16 char rule regression guard)', () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <ChooseCharacterScreen />
    );

    const continueButton = getByText('Continue');
    const input = getByPlaceholderText('e.g. Rowan');

    // A single-character name no longer satisfies the 2-16 char rule.
    fireEvent.changeText(input, 'A');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    fireEvent.press(continueButton);

    // Should still be on the name step — Continue stayed disabled.
    expect(getByText('Every legend needs a name')).toBeTruthy();
    expect(queryByText("Choose A's path")).toBeFalsy();
  });

  it('should enforce the 16-character maximum (2-16 char rule regression guard)', () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <ChooseCharacterScreen />
    );

    const continueButton = getByText('Continue');
    const input = getByPlaceholderText('e.g. Rowan');

    // The input filter only strips disallowed characters — it does NOT cap
    // length, so a 17-character value is typeable and must be blocked by
    // the length validation instead.
    const seventeenChars = 'A'.repeat(17);
    fireEvent.changeText(input, seventeenChars);
    expect(input.props.value).toBe(seventeenChars);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    fireEvent.press(continueButton);

    // Still on the name step — 17 characters exceeds the maximum.
    expect(getByText('Every legend needs a name')).toBeTruthy();
    expect(queryByText(`Choose ${seventeenChars}'s path`)).toBeFalsy();

    // Exactly 16 characters sits on the boundary and is valid.
    const sixteenChars = 'A'.repeat(16);
    fireEvent.changeText(input, sixteenChars);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    fireEvent.press(continueButton);

    expect(getByText(`Choose ${sixteenChars}'s path`)).toBeTruthy();
  });

  it('should filter out special characters from name input', () => {
    const { getByPlaceholderText } = render(<ChooseCharacterScreen />);

    const input = getByPlaceholderText('e.g. Rowan');

    // Try to enter special characters
    fireEvent.changeText(input, 'Test@Name#123!');

    // Should only keep alphanumeric and spaces
    expect(input.props.value).toBe('TestName123');
  });
});
