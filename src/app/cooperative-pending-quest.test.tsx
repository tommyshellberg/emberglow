import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import { useWebSocket } from '@/components/providers/websocket-provider';
import { render } from '@/lib/test-utils';
import { useQuestStore } from '@/store/quest-store';
import { useUserStore } from '@/store/user-store';

import CooperativePendingQuestScreen from './cooperative-pending-quest';

// Mock dependencies
jest.mock('expo-router');
jest.mock('@/components/providers/websocket-provider', () => ({
  useWebSocket: jest.fn(() => ({
    isConnected: true,
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  })),
}));
jest.mock('@/lib/hooks/use-cooperative-quest', () => ({
  useCooperativeQuest: jest.fn(() => ({
    isCooperativeQuest: true,
    currentInvitation: null,
    cooperativeQuestRun: {
      id: 'quest-run-1',
      questId: 'quest-1',
      hostId: 'host-1',
      status: 'pending',
      participants: [
        { userId: 'user-1', ready: false, status: 'pending' },
        { userId: 'user-2', ready: false, status: 'pending' },
      ],
      invitationId: 'invitation-1',
      actualStartTime: null,
      scheduledEndTime: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    questRunStatus: {
      id: 'quest-run-1',
      status: 'pending',
      participants: [
        { userId: 'user-1', ready: false, status: 'pending' },
        { userId: 'user-2', ready: false, status: 'pending' },
      ],
    },
  })),
}));
jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));
jest.mock('@/../assets/images/background/active-quest.jpg', () => ({}));

// Mock the quest components
jest.mock('@/components/quest', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');

  return {
    QuestCard: ({ title, duration, children, ...props }: any) =>
      React.createElement(RN.View, { testID: 'quest-card', ...props }, [
        React.createElement(RN.Text, { key: 'title' }, title),
        React.createElement(
          RN.Text,
          { key: 'duration' },
          `${duration} minutes`
        ),
        children,
      ]),
    LockInstructions: ({ variant, delay }: any) =>
      React.createElement(RN.View, {
        testID: 'lock-instructions',
        variant,
        delay,
      }),
  };
});

// Helper to create mock view component
const MockView = ({ children, ...props }: any) => {
  const View = require('react-native').View;
  return <View {...props}>{children}</View>;
};

describe('CooperativePendingQuestScreen', () => {
  const mockPendingQuest = {
    id: 'quest-1',
    title: 'Test Cooperative Quest',
    durationMinutes: 10,
    mode: 'custom' as const,
    category: 'cooperative',
    reward: { xp: 50 },
  };

  const mockCooperativeQuestRun = {
    id: 'run-1',
    questId: 'quest-1',
    hostId: 'user-1',
    participants: [
      { userId: 'user-1', ready: true, status: 'active' as const },
      {
        userId: 'user-2',
        ready: true,
        status: 'active' as const,
        userName: 'Friend',
      },
    ],
    status: 'pending' as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    type: 'knight',
    level: 1,
    xp: 0,
    friends: [],
    pendingFriends: [],
    blockedUsers: [],
    inventory: [],
    completedQuests: [],
    dailyQuestStreak: 0,
    featureFlags: ['coop_mode'],
  };

  const mockWebSocket = {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    joinQuestRoom: jest.fn(),
    leaveQuestRoom: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset stores
    useQuestStore.setState({
      pendingQuest: mockPendingQuest,
      cooperativeQuestRun: mockCooperativeQuestRun,
      cancelQuest: jest.fn(),
    });

    useUserStore.setState({
      user: mockUser,
    });

    (useWebSocket as jest.Mock).mockReturnValue(mockWebSocket);
    (router.back as jest.Mock).mockImplementation(() => {});
  });

  it('shows countdown screen initially', () => {
    const { getByText } = render(<CooperativePendingQuestScreen />);

    expect(getByText('Get Ready!')).toBeTruthy();
    expect(getByText('Lock your phone in...')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
    expect(getByText('All companions must lock together')).toBeTruthy();
  });

  it('updates countdown timer', async () => {
    jest.useFakeTimers();
    const { getByText, queryByText } = render(
      <CooperativePendingQuestScreen />
    );

    expect(getByText('5')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(getByText('4')).toBeTruthy();
    });

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    await waitFor(() => {
      expect(getByText('0')).toBeTruthy();
    });

    // After showing 0, it should transition to main screen
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(queryByText('Get Ready!')).toBeFalsy();
    });

    jest.useRealTimers();
  });

  it('shows main quest screen after countdown', async () => {
    jest.useFakeTimers();
    const { getByText, getByTestId, queryByText } = render(
      <CooperativePendingQuestScreen />
    );

    // Verify countdown starts
    expect(getByText('5')).toBeTruthy();

    // Fast forward through countdown - need to advance in steps to trigger React updates
    for (let i = 0; i < 5; i++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }

    // Wait for countdown to show 0
    await waitFor(() => {
      expect(getByText('0')).toBeTruthy();
    });

    // Advance timer for the transition delay
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Now the main screen should be visible
    await waitFor(() => {
      expect(queryByText('Get Ready!')).toBeFalsy();
      expect(getByText('COOPERATIVE QUEST')).toBeTruthy();
      expect(getByText('Start Quest')).toBeTruthy();
      expect(getByTestId('quest-card')).toBeTruthy();
      expect(getByText('Test Cooperative Quest')).toBeTruthy();
      expect(getByText('10 minutes')).toBeTruthy();
    });

    jest.useRealTimers();
  });

  it('displays participant list correctly', async () => {
    jest.useFakeTimers();
    const { getByText } = render(<CooperativePendingQuestScreen />);

    // Fast forward through countdown in steps
    for (let i = 0; i < 5; i++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }

    // Advance timer for the transition delay
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(getByText('Stronger Together')).toBeTruthy();
      expect(getByText('2 companions embarking on this journey')).toBeTruthy();
      expect(getByText('✨ You')).toBeTruthy();
      expect(getByText('⚔️ Friend')).toBeTruthy();
    });

    jest.useRealTimers();
  });

  it('joins quest room on mount', () => {
    render(<CooperativePendingQuestScreen />);

    expect(mockWebSocket.joinQuestRoom).toHaveBeenCalledWith('run-1');
  });

  it('leaves quest room on unmount', () => {
    const { unmount } = render(<CooperativePendingQuestScreen />);

    unmount();

    expect(mockWebSocket.leaveQuestRoom).toHaveBeenCalledWith('run-1');
  });

  it('registers WebSocket event listeners', () => {
    render(<CooperativePendingQuestScreen />);

    expect(mockWebSocket.addListener).toHaveBeenCalledWith(
      'questStarted',
      expect.any(Function)
    );
    expect(mockWebSocket.addListener).toHaveBeenCalledWith(
      'participantReady',
      expect.any(Function)
    );
  });

  it('handles cancel quest button', async () => {
    jest.useFakeTimers();
    const mockCancelQuest = jest.fn();
    useQuestStore.setState({
      ...useQuestStore.getState(),
      cancelQuest: mockCancelQuest,
    });

    const { getByText } = render(<CooperativePendingQuestScreen />);

    // Fast forward through countdown in steps
    for (let i = 0; i < 5; i++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }

    // Advance timer for the transition delay
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(getByText('Cancel Quest')).toBeTruthy();
    });

    fireEvent.press(getByText('Cancel Quest'));

    expect(mockCancelQuest).toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('shows loading when no pending quest', () => {
    useQuestStore.setState({
      pendingQuest: null,
      cooperativeQuestRun: mockCooperativeQuestRun,
      cancelQuest: jest.fn(),
    });

    const { getByTestId } = render(<CooperativePendingQuestScreen />);

    expect(() => getByTestId('activity-indicator')).toBeTruthy();
  });

  it('shows loading when no cooperative quest run', () => {
    useQuestStore.setState({
      pendingQuest: mockPendingQuest,
      cooperativeQuestRun: null,
      cancelQuest: jest.fn(),
    });

    const { getByTestId } = render(<CooperativePendingQuestScreen />);

    expect(() => getByTestId('activity-indicator')).toBeTruthy();
  });

  it('handles participants without names', async () => {
    jest.useFakeTimers();

    const runWithoutNames = {
      ...mockCooperativeQuestRun,
      participants: [
        { userId: 'user-1', ready: true, status: 'active' as const },
        { userId: 'user-2', ready: true, status: 'active' as const },
      ],
    };

    useQuestStore.setState({
      pendingQuest: mockPendingQuest,
      cooperativeQuestRun: runWithoutNames,
      cancelQuest: jest.fn(),
    });

    const { getByText } = render(<CooperativePendingQuestScreen />);

    // Fast forward through countdown in steps
    for (let i = 0; i < 5; i++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }

    // Advance timer for the transition delay
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(getByText('✨ You')).toBeTruthy();
      expect(getByText('⚔️ Quest Companion')).toBeTruthy();
    });

    jest.useRealTimers();
  });
});
