import React from 'react';
import { useKeepAwake } from 'expo-keep-awake';

import { render, screen } from '@/lib/test-utils';
import type { QuestPresenceView } from '@/lib/hooks/use-quest-presence';
import { useQuestPresence } from '@/lib/hooks/use-quest-presence';

import ActiveQuestScreen from './active-quest';

jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
// Explicit factory (not bare `jest.mock(path)`) — auto-mocking would still
// require the real module to introspect its shape, which transitively pulls
// in the native LockState module (Task 11) that isn't mockable under jest.
jest.mock('@/lib/hooks/use-quest-presence', () => ({
  useQuestPresence: jest.fn(),
}));

// lucide-react-native renders SVG icons (User/Flag/Lock) via react-native-svg,
// which needs a native view manager not present under the test renderer.
jest.mock('lucide-react-native', () => ({
  User: () => null,
  Flag: () => null,
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
    expect(screen.getByText(/62 XP/)).toBeTruthy();
    expect(screen.getByText(/up to 93 if locked/)).toBeTruthy();
    expect(screen.getByText(/1\.18× XP/)).toBeTruthy();
    expect(screen.getByText(/Lock your phone anytime/)).toBeTruthy();
    expect(
      screen.getByText(/Leaving the app will end the quest early/)
    ).toBeTruthy();
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
});
