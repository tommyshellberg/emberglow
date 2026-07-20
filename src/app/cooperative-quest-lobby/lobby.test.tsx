import React from 'react';
import { Alert } from 'react-native';

import { fireEvent, render, screen, waitFor } from '@/lib/test-utils';
import { useCooperativeLobbyStore } from '@/store/cooperative-lobby-store';
import { useUserStore } from '@/store/user-store';

// Import the component
import CooperativeQuestLobby from './[lobbyId]';

// Mock the router
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: mockReplace,
    back: mockBack,
  },
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
  }),
  useLocalSearchParams: () => ({
    lobbyId: 'test-lobby-123',
  }),
}));

// Mock the WebSocket
const mockEmit = jest.fn();
const mockOn = jest.fn();
const mockOff = jest.fn();

jest.mock('@/components/providers/lazy-websocket-provider', () => ({
  useLazyWebSocket: () => ({
    emit: mockEmit,
    on: mockOn,
    off: mockOff,
    joinQuestRoom: jest.fn(),
    leaveQuestRoom: jest.fn(),
    isConnected: true,
    isEnabled: true,
    connect: jest.fn(),
    disconnect: jest.fn(),
    forceReconnect: jest.fn(),
  }),
  LazyWebSocketProvider: ({ children }: { children: any }) => children,
}));

// Mock the invitation API
jest.mock('@/api/invitation', () => ({
  invitationApi: {
    respondToInvitation: jest.fn(),
  },
}));

describe('CooperativeQuestLobby', () => {
  const mockLobby = {
    lobbyId: 'test-lobby-123',
    questTitle: 'Test Quest',
    questDuration: 30,
    creatorId: 'creator-123',
    participants: [
      {
        id: 'creator-123',
        username: 'Creator',
        invitationStatus: 'accepted',
        isReady: false,
        isCreator: true,
        joinedAt: new Date(),
      },
      {
        id: 'invitee-123',
        username: 'Invitee',
        invitationStatus: 'pending',
        isReady: false,
        isCreator: false,
      },
    ],
    status: 'waiting',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  };

  const mockUser = {
    id: 'creator-123',
    email: 'creator@test.com',
    character: {
      name: 'Creator',
      type: 'knight',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up store mocks
    useCooperativeLobbyStore.setState({
      currentLobby: mockLobby,
      isInLobby: true,
      countdownSeconds: null,
    });

    useUserStore.setState({
      user: mockUser,
    });
  });

  it('should render the lobby with all participants', () => {
    render(<CooperativeQuestLobby />);

    // Check header
    expect(screen.getByText('Quest Lobby')).toBeTruthy();
    expect(screen.getByText(/Test Quest.*30.*minutes/)).toBeTruthy();

    // Check participants
    expect(screen.getByText('Creator (You) 👑')).toBeTruthy();
    expect(screen.getByText('Invitee')).toBeTruthy();
    expect(screen.getByText('Waiting for response...')).toBeTruthy();
  });

  it('should join the WebSocket room on mount', () => {
    render(<CooperativeQuestLobby />);

    expect(mockEmit).toHaveBeenCalledWith('lobby:join', {
      lobbyId: 'test-lobby-123',
    });
  });

  it('should show Start Now button for creator when there are accepted participants', () => {
    render(<CooperativeQuestLobby />);

    const startNowButton = screen.getByText(
      'Start Now (Skip waiting for remaining invites)'
    );
    expect(startNowButton).toBeTruthy();
  });

  it('should handle invitation acceptance WebSocket event', async () => {
    render(<CooperativeQuestLobby />);

    // Get the invitation response handler
    const invitationResponseHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'invitation:response'
    )?.[1];

    expect(invitationResponseHandler).toBeDefined();

    // Simulate invitation acceptance
    invitationResponseHandler({
      userId: 'invitee-123',
      action: 'accepted',
      characterName: 'Invitee Character',
      username: 'invitee@test.com',
    });

    // Check that the store was updated
    await waitFor(() => {
      const state = useCooperativeLobbyStore.getState();
      const invitee = state.currentLobby?.participants.find(
        (p) => p.id === 'invitee-123'
      );
      expect(invitee?.invitationStatus).toBe('accepted');
    });
  });

  it('should auto-transition to ready screen when all respond', async () => {
    // Update lobby to have all participants accepted
    const allAcceptedLobby = {
      ...mockLobby,
      participants: mockLobby.participants.map((p) => ({
        ...p,
        invitationStatus: 'accepted',
      })),
    };

    useCooperativeLobbyStore.setState({
      currentLobby: allAcceptedLobby,
    });

    render(<CooperativeQuestLobby />);

    // Should show the "all responded" message
    expect(
      screen.getByText(
        'All players have responded! Preparing to start quest...'
      )
    ).toBeTruthy();

    // Should transition after delay
    await waitFor(
      () => {
        expect(mockReplace).toHaveBeenCalledWith('/cooperative-quest-ready');
      },
      { timeout: 3000 }
    );
  });

  it('should handle Start Now button click', () => {
    render(<CooperativeQuestLobby />);

    const startNowButton = screen.getByText(
      'Start Now (Skip waiting for remaining invites)'
    );
    fireEvent.press(startNowButton);

    expect(mockReplace).toHaveBeenCalledWith('/cooperative-quest-ready');
  });

  it('should show accept/decline buttons for invitee', () => {
    // Set current user as invitee
    useUserStore.setState({
      user: {
        id: 'invitee-123',
        email: 'invitee@test.com',
        character: {
          name: 'Invitee',
          type: 'druid',
        },
      },
    });

    // Mock the invitationId
    useCooperativeLobbyStore.setState({
      currentLobby: {
        ...mockLobby,
        participants: mockLobby.participants.map((p) =>
          p.id === 'invitee-123' ? { ...p, invitationStatus: 'pending' } : p
        ),
      },
    });

    render(<CooperativeQuestLobby />);

    // Should show accept/decline buttons
    const acceptButton = screen.getByText('Accept');
    const declineButton = screen.getByText('Decline');

    expect(acceptButton).toBeTruthy();
    expect(declineButton).toBeTruthy();
  });

  // The lobby -> ready screen transition unmounts this screen while the same
  // socket stays connected. A leave emitted here makes the server treat the
  // host as having abandoned the lobby and cancel it for everyone, so leaving
  // must only happen through the explicit back-out flow.
  it('should NOT emit lobby:leave on unmount', () => {
    const { unmount } = render(<CooperativeQuestLobby />);

    unmount();

    expect(mockEmit).not.toHaveBeenCalledWith('lobby:leave', expect.anything());
  });

  it('emits lobby:leave when the creator explicitly confirms leaving', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<CooperativeQuestLobby />);

    fireEvent.press(screen.getByTestId('lobby-back-button'));

    const leaveButton = alertSpy.mock.calls[0]?.[2]?.find(
      (button) => button.text === 'Leave'
    );
    expect(leaveButton).toBeTruthy();
    leaveButton?.onPress?.();

    expect(mockEmit).toHaveBeenCalledWith('lobby:leave', {
      lobbyId: 'test-lobby-123',
      userId: 'creator-123',
    });
  });
});
