import React from 'react';
import { useKeepAwake } from 'expo-keep-awake';

import { fireEvent, render, screen } from '@/lib/test-utils';
import type { QuestPresenceView } from '@/lib/hooks/use-quest-presence';
import { useQuestPresence } from '@/lib/hooks/use-quest-presence';
import { questAudio } from '@/lib/services/quest-audio.service';

import ActiveQuestScreen from './active-quest';

jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
// Explicit factory (not bare `jest.mock(path)`) — auto-mocking would still
// require the real module to introspect its shape, which transitively pulls
// in the native LockState module (Task 11) that isn't mockable under jest.
jest.mock('@/lib/hooks/use-quest-presence', () => ({
  useQuestPresence: jest.fn(),
}));

// The audio engine (Task 14) is exercised by its own service tests; here we
// just verify the screen wires state transitions and the pill's toggle to
// it, without touching real expo-audio.
jest.mock('@/lib/services/quest-audio.service', () => ({
  questAudio: {
    playAmbient: jest.fn(),
    fadeOut: jest.fn(),
    resume: jest.fn(),
    setMuted: jest.fn(),
    teardown: jest.fn(),
  },
}));

// lucide-react-native renders SVG icons (the footer's Lock) via
// react-native-svg, which needs a native view manager not present under the
// test renderer.
jest.mock('lucide-react-native', () => ({
  Lock: () => null,
}));
jest.mock('react-native-svg', () => ({
  Svg: () => null,
  Path: () => null,
  Circle: () => null,
  Rect: () => null,
  Line: () => null,
  Polygon: () => null,
  Polyline: () => null,
  G: () => null,
}));

const DEFAULT_VIEW: QuestPresenceView = {
  state: null,
  remainingMs: 0,
  lockedMs: 0,
  liveMultiplier: 1,
  forecast: { current: 0, maxIfLocked: 0 },
  isMuted: false,
  questTitle: undefined,
  mode: undefined,
};

function mockUseQuestPresence(overrides: Partial<QuestPresenceView>) {
  (useQuestPresence as jest.Mock).mockReturnValue({
    ...DEFAULT_VIEW,
    ...overrides,
  });
}

describe('ActiveQuestScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders countdown, forecast, live multiplier, and both footer lines from presence state', () => {
    mockUseQuestPresence({
      state: 'IN_APP',
      remainingMs: 23 * 60_000 + 41_000,
      liveMultiplier: 1.18,
      forecast: { current: 62, maxIfLocked: 93 },
      questTitle: 'The Whispering Glade',
      mode: 'story',
      lockedMs: 0,
      isMuted: false,
    });

    render(<ActiveQuestScreen />);

    expect(screen.getByText('23:41')).toBeTruthy();
    // The quest store isn't seeded here, so the screen falls back to
    // remainingMs as the total — the sublabel mirrors the countdown.
    expect(screen.getByText('Of 23:41')).toBeTruthy();
    expect(screen.getByText(/62 XP/)).toBeTruthy();
    expect(screen.getByText(/up to 93 if locked/)).toBeTruthy();
    expect(screen.getByText(/1\.18× XP/)).toBeTruthy();
    expect(screen.getByText(/Lock your phone anytime/)).toBeTruthy();
    expect(
      screen.getByText(/Leaving the app will end the quest early/)
    ).toBeTruthy();
  });

  it('draws the countdown inside the ember ring over full-bleed art, with the journey caption below', () => {
    mockUseQuestPresence({
      state: 'IN_APP',
      remainingMs: 23 * 60_000 + 41_000,
      liveMultiplier: 1.18,
      forecast: { current: 62, maxIfLocked: 93 },
      questTitle: 'The Whispering Glade',
      mode: 'story',
      lockedMs: 0,
      isMuted: false,
    });

    render(<ActiveQuestScreen />);

    expect(screen.getByTestId('quest-progress-ring')).toBeTruthy();
    expect(screen.getByTestId('active-quest-art')).toBeTruthy();
    expect(screen.getByTestId('journey-caption')).toBeTruthy();
  });

  it('calls useKeepAwake so the screen never idle-dims', () => {
    mockUseQuestPresence({
      state: 'IN_APP',
      remainingMs: 60_000,
      lockedMs: 0,
      liveMultiplier: 1,
      forecast: { current: 10, maxIfLocked: 15 },
      isMuted: false,
    });

    render(<ActiveQuestScreen />);

    expect(useKeepAwake).toHaveBeenCalled();
  });

  it('renders a minimal placeholder without crashing when there is no active run', () => {
    mockUseQuestPresence({ state: null });

    render(<ActiveQuestScreen />);

    expect(useKeepAwake).toHaveBeenCalled();
  });

  it('plays ambient music while IN_APP and fades out for other presence states', () => {
    mockUseQuestPresence({
      state: 'IN_APP',
      remainingMs: 60_000,
      lockedMs: 0,
      liveMultiplier: 1,
      forecast: { current: 10, maxIfLocked: 15 },
      isMuted: false,
    });

    const { rerender } = render(<ActiveQuestScreen />);
    expect(questAudio.playAmbient).toHaveBeenCalled();
    expect(questAudio.fadeOut).not.toHaveBeenCalled();

    mockUseQuestPresence({
      state: 'LOCKED',
      remainingMs: 60_000,
      lockedMs: 0,
      liveMultiplier: 1,
      forecast: { current: 10, maxIfLocked: 15 },
      isMuted: false,
    });
    rerender(<ActiveQuestScreen />);

    expect(questAudio.fadeOut).toHaveBeenCalled();
  });

  it('tears down the audio player on unmount', () => {
    mockUseQuestPresence({
      state: 'IN_APP',
      remainingMs: 60_000,
      lockedMs: 0,
      liveMultiplier: 1,
      forecast: { current: 10, maxIfLocked: 15 },
      isMuted: false,
    });

    const { unmount } = render(<ActiveQuestScreen />);
    unmount();

    expect(questAudio.teardown).toHaveBeenCalled();
  });

  it('tapping the ambient music pill toggles and persists mute via questAudio', () => {
    mockUseQuestPresence({
      state: 'IN_APP',
      remainingMs: 60_000,
      lockedMs: 0,
      liveMultiplier: 1,
      forecast: { current: 10, maxIfLocked: 15 },
      isMuted: false,
    });

    render(<ActiveQuestScreen />);

    fireEvent.press(screen.getByLabelText('Mute ambient music'));
    expect(questAudio.setMuted).toHaveBeenCalledWith(true);

    // The pill flips its own label immediately from local state, without
    // waiting on a re-render of the (non-reactive) presence hook.
    expect(screen.getByLabelText('Unmute ambient music')).toBeTruthy();
  });
});
