import React from 'react';

import { fireEvent, render, screen } from '@/lib/test-utils';
import { useScheduledQuestsStore } from '@/store/scheduled-quests-store';
import { useUserStore } from '@/store/user-store';

import EventScreen from './[id]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'r1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/features/scheduled-quests/hooks/use-scheduled-quest-room', () => ({
  useScheduledQuestRoom: jest.fn(),
}));
jest.mock('@/features/scheduled-quests/hooks/use-take-part', () => ({
  useTakePart: () => ({ takePart: jest.fn(), isArming: false }),
}));
jest.mock('@/api/scheduled-quests', () => ({
  useScheduledQuest: jest.fn(),
  useJoinScheduledQuest: () => ({
    mutate: jest.fn(),
    isPending: false,
    error: null,
  }),
  useLeaveScheduledQuest: () => ({ mutate: jest.fn(), isPending: false }),
  useCancelScheduledQuest: () => ({ mutate: jest.fn(), isPending: false }),
  useKickParticipant: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

const { useScheduledQuest, useKickParticipant } = jest.requireMock(
  '@/api/scheduled-quests'
);

const baseRun = (overrides = {}) => ({
  id: 'r1',
  status: 'pending',
  scheduledStartAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  quest: {
    title: '5am run club',
    category: 'fitness',
    durationMinutes: 60,
    mode: 'cooperative',
    reward: { xp: 180 },
  },
  participants: [
    {
      userId: {
        id: 'creator',
        character: { name: 'Thorin', type: 'knight', level: 4 },
      },
      ready: false,
      phoneLocked: false,
      status: 'active',
    },
  ],
  completionPolicy: 'individual',
  visibility: 'public',
  maxParticipants: 10,
  ...overrides,
});

describe('EventScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useScheduledQuestsStore.getState().reset();
    useUserStore.setState({ user: { id: 'me' } } as any);
  });

  it('renders countdown, roster and Register for a pending event I have not joined', () => {
    useScheduledQuest.mockReturnValue({ data: baseRun(), isLoading: false });
    render(<EventScreen />);
    expect(screen.getByText('5am run club')).toBeTruthy();
    expect(screen.getByText(/Starts in/)).toBeTruthy();
    // Thorin is the event creator (index 0), so his row shows "· Host"
    // regardless of who's viewing — row identity, not viewer identity.
    expect(screen.getByText(/Thorin/)).toBeTruthy();
    expect(screen.getByText('Register')).toBeTruthy();
  });

  it('shows Leave (not Register) when I am already registered, and Cancel when I am the creator', () => {
    useUserStore.setState({ user: { id: 'creator' } } as any);
    useScheduledQuest.mockReturnValue({ data: baseRun(), isLoading: false });
    render(<EventScreen />);
    expect(screen.getByText('Cancel event')).toBeTruthy();
    expect(screen.queryByText('Register')).toBeNull();
  });

  it('offers late join for an active run inside the window when I am not a participant', () => {
    useScheduledQuest.mockReturnValue({
      data: baseRun({
        status: 'active',
        scheduledStartAt: new Date(Date.now() - 5 * 60_000).toISOString(),
      }),
      isLoading: false,
    });
    render(<EventScreen />);
    expect(screen.getByText(/Happening now/)).toBeTruthy();
    expect(screen.getByText('Join and take part')).toBeTruthy();
  });

  it('shows too-late state for an active run past the window', () => {
    useScheduledQuest.mockReturnValue({
      data: baseRun({
        status: 'active',
        scheduledStartAt: new Date(Date.now() - 20 * 60_000).toISOString(),
      }),
      isLoading: false,
    });
    render(<EventScreen />);
    expect(screen.getByText(/too late to join/i)).toBeTruthy();
  });

  it('labels only the actual host as Host and offers kick only for the other participant, for a creator viewer with two participants', () => {
    const kickMutate = jest.fn();
    useKickParticipant.mockReturnValue({
      mutate: kickMutate,
      isPending: false,
    });
    useUserStore.setState({ user: { id: 'creator' } } as any);
    useScheduledQuest.mockReturnValue({
      data: baseRun({
        participants: [
          {
            userId: {
              id: 'creator',
              character: { name: 'Thorin', type: 'knight', level: 4 },
            },
            ready: false,
            phoneLocked: false,
            status: 'active',
          },
          {
            userId: {
              id: 'p2',
              character: { name: 'Kara', type: 'ranger', level: 2 },
            },
            ready: false,
            phoneLocked: false,
            status: 'active',
          },
        ],
      }),
      isLoading: false,
    });
    render(<EventScreen />);

    // Exactly one "Host" label, and it belongs to the creator's row, not Kara's.
    const hostLabels = screen.getAllByText(/Host/);
    expect(hostLabels).toHaveLength(1);
    expect(hostLabels[0].props.children).toEqual(['Thorin', '  ·  Host']);
    // Kara's name renders with no "Host" suffix attached (exact match would
    // fail if the label had leaked onto her row).
    expect(screen.getByText('Kara')).toBeTruthy();

    // Exactly one kick action, and it targets the non-host participant.
    const kickButtons = screen.getAllByTestId('kick-button');
    expect(kickButtons).toHaveLength(1);
    fireEvent.press(kickButtons[0]);
    expect(kickMutate).toHaveBeenCalledWith({
      questRunId: 'r1',
      userId: 'p2',
    });
  });
});
