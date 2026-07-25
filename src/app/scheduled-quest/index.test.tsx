import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { RefreshControl } from 'react-native';

import { fireEvent, render, screen } from '@/lib/test-utils';

import ScheduledQuestDiscovery from './index';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useRouter: () => ({ push: mockPush }),
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
    mockPush.mockClear();
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

  it('shows a back button, consistent with other pushed screens', () => {
    render(<ScheduledQuestDiscovery />);
    expect(screen.UNSAFE_queryByType(ArrowLeft)).toBeTruthy();
  });

  it('shows the pull-to-refresh spinner while a manual refetch is in flight, even after the initial load has completed', () => {
    useDiscoverScheduledQuests.mockReturnValue({
      data: [run('r1', 'Morning run')],
      isLoading: false,
      isFetching: true,
      refetch: jest.fn(),
    });
    render(<ScheduledQuestDiscovery />);
    expect(screen.UNSAFE_getByType(RefreshControl).props.refreshing).toBe(true);
  });

  it('switches to My events', () => {
    render(<ScheduledQuestDiscovery />);
    fireEvent.press(screen.getByText('My events'));
    expect(screen.getByText('My event')).toBeTruthy();
  });

  it('shows an empty state when discovery is empty, with a CTA that opens the create screen', () => {
    useDiscoverScheduledQuests.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    render(<ScheduledQuestDiscovery />);
    expect(screen.getByText('No events found')).toBeTruthy();
    fireEvent.press(screen.getByText('Create event'));
    expect(mockPush).toHaveBeenCalledWith('/scheduled-quest/create');
  });

  it('shows an empty state on My events, with a CTA that switches back to Discover', () => {
    useMyScheduledQuests.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    render(<ScheduledQuestDiscovery />);
    fireEvent.press(screen.getByText('My events'));
    expect(screen.getByText("You're not signed up for anything")).toBeTruthy();
    fireEvent.press(screen.getByText('Discover events'));
    expect(screen.getByText('Morning run')).toBeTruthy();
  });

  it('shows a floating create-event button when the active list has entries', () => {
    render(<ScheduledQuestDiscovery />);
    fireEvent.press(screen.getByTestId('create-event-button'));
    expect(mockPush).toHaveBeenCalledWith('/scheduled-quest/create');
  });

  it('hides the floating create-event button when the active list is empty, to avoid a duplicate CTA', () => {
    useDiscoverScheduledQuests.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    render(<ScheduledQuestDiscovery />);
    expect(screen.queryByTestId('create-event-button')).toBeNull();
  });

  it("flags a Discover result that overlaps one of the user's own registrations", () => {
    const discoverRun = run('r1', 'Morning run');
    const myRun = run('r2', 'My event');
    useDiscoverScheduledQuests.mockReturnValue({
      data: [discoverRun],
      isLoading: false,
      refetch: jest.fn(),
    });
    useMyScheduledQuests.mockReturnValue({
      data: [myRun],
      isLoading: false,
      refetch: jest.fn(),
    });
    render(<ScheduledQuestDiscovery />);
    expect(screen.getByText('Overlaps one of your events')).toBeTruthy();
  });
});
