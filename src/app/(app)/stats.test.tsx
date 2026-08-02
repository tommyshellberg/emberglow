import React from 'react';

import { cleanup, render, screen, setup, waitFor } from '@/lib/test-utils';
import { useQuestStore } from '@/store/quest-store';
import { useUserStore } from '@/store/user-store';

import StatsScreen from './stats';

const mockCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({ capture: mockCapture }),
}));

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
}));

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

// A quest completed today, 45 minutes. Store fixture is minimal but must
// satisfy the Quest type used by getCompletedQuests.
const makeCompletedQuest = () => ({
  id: 'q1',
  mode: 'custom' as const,
  category: 'chores',
  title: 'Test quest',
  durationMinutes: 45,
  reward: { xp: 10 },
  startTime: Date.now() - 46 * 60 * 1000,
  stopTime: Date.now(),
  status: 'completed' as const,
});

describe('StatsScreen', () => {
  it('renders chart, summary, and milestone sections from store data', () => {
    useQuestStore.setState({ completedQuests: [makeCompletedQuest()] });
    useUserStore.setState({ user: null } as any);

    render(<StatsScreen />);

    expect(screen.getByText('Your Stats')).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^activity-bar-/)).toHaveLength(7);
    expect(screen.getByText('Next: 1 hour reclaimed')).toBeOnTheScreen();
    expect(screen.getByText('45m reclaimed so far')).toBeOnTheScreen();
  });

  it('prefers the server lifetime total over the local sum', () => {
    // Server total (1080 = 18h) deliberately != local sum (45m): if the
    // precedence flips, BOTH assertions below fail — the fixture cannot
    // pass vacuously.
    useQuestStore.setState({ completedQuests: [makeCompletedQuest()] });
    useUserStore.setState({
      user: { totalMinutesOffPhone: 1080 },
    } as any);

    render(<StatsScreen />);

    expect(screen.getByText('Next: 24 hours reclaimed')).toBeOnTheScreen();
    expect(screen.getByText('18h reclaimed so far')).toBeOnTheScreen();
  });

  it('shows invitational empty state for a user with no quests', () => {
    useQuestStore.setState({ completedQuests: [] });
    useUserStore.setState({ user: null } as any);

    render(<StatsScreen />);

    expect(
      screen.getByText('Complete a quest to light up your week')
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Your first milestone: 1 hour reclaimed')
    ).toBeOnTheScreen();
  });

  it('captures stats_screen_viewed exactly once on mount', () => {
    useQuestStore.setState({ completedQuests: [] });
    useUserStore.setState({ user: null } as any);

    render(<StatsScreen />);

    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockCapture).toHaveBeenCalledWith('stats_screen_viewed');
  });

  it('renders a back button that navigates to profile', async () => {
    useQuestStore.setState({ completedQuests: [] });
    useUserStore.setState({ user: null } as any);

    const { user } = setup(<StatsScreen />);

    const backButton = screen.getByLabelText('Go back');
    await user.press(backButton);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/profile');
    });
  });
});
