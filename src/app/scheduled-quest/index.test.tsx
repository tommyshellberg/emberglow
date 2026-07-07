import React from 'react';

import { fireEvent, render, screen } from '@/lib/test-utils';

import ScheduledQuestDiscovery from './index';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/api/scheduled-quests', () => ({
  useDiscoverScheduledQuests: jest.fn(),
  useMyScheduledQuests: jest.fn(),
}));

const { useDiscoverScheduledQuests, useMyScheduledQuests } = jest.requireMock(
  '@/api/scheduled-quests'
);

const run = (id: string, title: string) => ({
  id,
  status: 'pending',
  scheduledStartAt: new Date(Date.now() + 3_600_000).toISOString(),
  quest: {
    title,
    category: 'fitness',
    durationMinutes: 60,
    mode: 'cooperative',
    reward: { xp: 180 },
  },
  participants: [],
  completionPolicy: 'individual',
  visibility: 'public',
  maxParticipants: 10,
});

describe('ScheduledQuestDiscovery', () => {
  beforeEach(() => {
    useDiscoverScheduledQuests.mockReturnValue({
      data: [run('r1', 'Morning run')],
      isLoading: false,
      refetch: jest.fn(),
    });
    useMyScheduledQuests.mockReturnValue({
      data: [run('r2', 'My event')],
      isLoading: false,
      refetch: jest.fn(),
    });
  });

  it('renders the Discover tab feed', () => {
    render(<ScheduledQuestDiscovery />);
    expect(screen.getByText('Morning run')).toBeTruthy();
  });

  it('switches to My events', () => {
    render(<ScheduledQuestDiscovery />);
    fireEvent.press(screen.getByText('My events'));
    expect(screen.getByText('My event')).toBeTruthy();
  });

  it('shows an empty state when discovery is empty', () => {
    useDiscoverScheduledQuests.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    render(<ScheduledQuestDiscovery />);
    expect(screen.getByText(/No upcoming events/)).toBeTruthy();
  });
});
