import * as React from 'react';

import { fireEvent, render, screen } from '@/lib/test-utils';
import { useSettingsStore } from '@/store/settings-store';

import { AudioIndicator } from './audio-indicator';

// The repo-wide __mocks__/@expo/vector-icons.js stub hardcodes every icon's
// testID to `${familyName}-icon` and renders `props.name` as text content,
// which stomps the explicit testIDs this component relies on
// (audio-indicator-playing/-muted). Override locally with the same
// string-as-host-component trick settings.test.tsx uses, so `testID` and
// `name` pass through untouched.
jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
}));

// Reset from the real initial state (not a hand-written literal) so the
// "unmuted by default" assertions below stay honest — assertion hygiene
// rule 3. Reset in beforeEach (not afterEach) per the ordering hazard noted
// against src/app/(app)/settings.test.tsx's module-scoped store.
beforeEach(() => {
  useSettingsStore.setState(useSettingsStore.getInitialState());
});

describe('AudioIndicator', () => {
  // --- Plan's Step 1 sketch tests (co-vary both inputs) -------------------
  it('shows the playing icon while audio is playing', () => {
    render(<AudioIndicator isPlaying />);

    expect(screen.getByTestId('audio-indicator-playing')).toBeOnTheScreen();
  });

  it('shows the muted icon when the user has muted', () => {
    useSettingsStore.setState({ onboardingSoundEnabled: false });
    render(<AudioIndicator isPlaying={false} />);

    expect(screen.getByTestId('audio-indicator-muted')).toBeOnTheScreen();
  });

  it('toggles the stored preference when pressed', () => {
    render(<AudioIndicator isPlaying />);

    fireEvent.press(screen.getByTestId('audio-indicator'));
    expect(useSettingsStore.getState().onboardingSoundEnabled).toBe(false);

    fireEvent.press(screen.getByTestId('audio-indicator'));
    expect(useSettingsStore.getState().onboardingSoundEnabled).toBe(true);
  });

  // --- Resolution #2 (mandatory): isolate preference from isPlaying so the
  // two tests above can't pass against an isPlaying-driven icon design too.
  it('shows the unmuted icon even when the player is not yet playing', () => {
    // preference ON (the getInitialState default), player NOT playing
    render(<AudioIndicator isPlaying={false} />);

    expect(screen.getByTestId('audio-indicator-playing')).toBeOnTheScreen();
  });

  it('shows the muted icon even while the player still reports playing', () => {
    useSettingsStore.setState({ onboardingSoundEnabled: false });
    render(<AudioIndicator isPlaying />);

    expect(screen.getByTestId('audio-indicator-muted')).toBeOnTheScreen();
  });

  // --- Resolution #3 (mandatory): isPlaying must drive something real, or
  // it's a dead prop.
  it('animates only while the player reports playing', () => {
    render(<AudioIndicator isPlaying />);

    expect(screen.getByTestId('audio-indicator-pulse')).toBeOnTheScreen();
  });

  it('does not show the pulse when the player is not playing', () => {
    render(<AudioIndicator isPlaying={false} />);

    expect(screen.queryByTestId('audio-indicator-pulse')).not.toBeOnTheScreen();
  });

  // --- Resolution #4: accessibility worded as action/preference, never a
  // claim about audibility (the phone may be on silent).
  it('labels the control "Mute onboarding sound" when sound is on', () => {
    render(<AudioIndicator isPlaying />);

    expect(
      screen.getByRole('button', { name: 'Mute onboarding sound' })
    ).toBeOnTheScreen();
  });

  it('labels the control "Unmute onboarding sound" when sound is off', () => {
    useSettingsStore.setState({ onboardingSoundEnabled: false });
    render(<AudioIndicator isPlaying={false} />);

    expect(
      screen.getByRole('button', { name: 'Unmute onboarding sound' })
    ).toBeOnTheScreen();
  });
});
