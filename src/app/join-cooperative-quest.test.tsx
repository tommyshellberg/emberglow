import React from 'react';

import { invitationApi } from '@/api/invitation';
import { fireEvent, render, screen, waitFor } from '@/lib/test-utils';

// Import the component
import JoinCooperativeQuest from './join-cooperative-quest';

// Mock the router
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
  }),
}));

// Mock the API
jest.mock('@/api/invitation', () => ({
  invitationApi: {
    getPendingInvitations: jest.fn(),
    respondToInvitation: jest.fn(),
  },
}));

// Mock the store
const mockJoinLobby = jest.fn();

jest.mock('@/store/cooperative-lobby-store', () => ({
  useCooperativeLobbyStore: jest.fn((selector) =>
    selector({
      joinLobby: mockJoinLobby,
    })
  ),
}));

// Mock lazy websocket provider
jest.mock('@/components/providers/lazy-websocket-provider', () => ({
  useLazyWebSocket: jest.fn(() => ({
    isConnected: false,
    isEnabled: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    joinQuestRoom: jest.fn(),
    leaveQuestRoom: jest.fn(),
    forceReconnect: jest.fn(),
  })),
  LazyWebSocketProvider: ({ children }: { children: any }) => children,
}));

describe('JoinCooperativeQuest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (invitationApi.getPendingInvitations as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading
    );

    render(<JoinCooperativeQuest />);

    expect(screen.getByText('Loading invitations...')).toBeTruthy();
  });

  it('should render empty state when no invitations', async () => {
    (invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue([]);

    render(<JoinCooperativeQuest />);

    await waitFor(() => {
      expect(screen.getByText('No Invitations')).toBeTruthy();
      expect(
        screen.getByText("You don't have any pending quest invitations.")
      ).toBeTruthy();
      expect(screen.getByText('Public Quests')).toBeTruthy();
      expect(screen.getByText('Coming Soon')).toBeTruthy();
    });
  });

  it('should render invitations list', async () => {
    const mockInvitations = [
      {
        id: 'inv-1',
        questTitle: 'Morning Focus Session',
        inviterName: 'John Doe',
        questDuration: 30,
        participantCount: 3,
        lobbyId: 'lobby-123',
        inviterId: 'user-123',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        inviter: {
          characterName: 'John Doe',
          username: 'johndoe',
        },
        acceptedCount: 1,
        inviteeCount: 3,
      },
      {
        id: 'inv-2',
        questTitle: 'Study Group',
        inviterName: 'Jane Smith',
        questDuration: 45,
        participantCount: 4,
        lobbyId: 'lobby-456',
        inviterId: 'user-456',
        expiresAt: new Date(Date.now() + 7200000).toISOString(),
        inviter: {
          characterName: 'Jane Smith',
          username: 'janesmith',
        },
        acceptedCount: 2,
        inviteeCount: 4,
      },
    ];

    (invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue(
      mockInvitations
    );

    render(<JoinCooperativeQuest />);

    await waitFor(() => {
      expect(screen.getByText('Pending Invitations (2)')).toBeTruthy();
      expect(screen.getByText('Morning Focus Session')).toBeTruthy();
      expect(screen.getByText('Study Group')).toBeTruthy();
      expect(screen.getByText('Invited by John Doe')).toBeTruthy();
      expect(screen.getByText('Invited by Jane Smith')).toBeTruthy();
      expect(screen.getByText('30 minutes')).toBeTruthy();
      expect(screen.getByText('45 minutes')).toBeTruthy();
    });
  });

  it('should handle accept invitation', async () => {
    const mockInvitation = {
      id: 'inv-1',
      questTitle: 'Test Quest',
      inviterName: 'Test User',
      questDuration: 30,
      participantCount: 2,
      lobbyId: 'lobby-123',
      inviterId: 'user-123',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      inviter: {
        characterName: 'Test User',
        username: 'testuser',
      },
      acceptedCount: 1,
      inviteeCount: 2,
    };

    (invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue([
      mockInvitation,
    ]);
    (invitationApi.respondToInvitation as jest.Mock).mockResolvedValue({});

    render(<JoinCooperativeQuest />);

    await waitFor(() => {
      expect(screen.getByText('Test Quest')).toBeTruthy();
    });

    const acceptButton = screen.getByText('Accept');
    fireEvent.press(acceptButton);

    await waitFor(() => {
      expect(invitationApi.respondToInvitation).toHaveBeenCalledWith(
        'inv-1',
        'accepted'
      );
      expect(mockReplace).toHaveBeenCalledWith(
        '/cooperative-quest-lobby/inv-1'
      );
    });
  });

  it('should handle decline invitation', async () => {
    const mockInvitations = [
      {
        id: 'inv-1',
        questTitle: 'Quest 1',
        inviterName: 'User 1',
        questDuration: 30,
        participantCount: 2,
        lobbyId: 'lobby-123',
        inviterId: 'user-123',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        inviter: {
          characterName: 'User 1',
          username: 'user1',
        },
        acceptedCount: 1,
        inviteeCount: 2,
      },
      {
        id: 'inv-2',
        questTitle: 'Quest 2',
        inviterName: 'User 2',
        questDuration: 45,
        participantCount: 3,
        lobbyId: 'lobby-456',
        inviterId: 'user-456',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        inviter: {
          characterName: 'User 2',
          username: 'user2',
        },
        acceptedCount: 2,
        inviteeCount: 3,
      },
    ];

    (invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue(
      mockInvitations
    );
    (invitationApi.respondToInvitation as jest.Mock).mockResolvedValue({});

    render(<JoinCooperativeQuest />);

    await waitFor(() => {
      expect(screen.getByText('Quest 1')).toBeTruthy();
      expect(screen.getByText('Quest 2')).toBeTruthy();
    });

    const declineButtons = screen.getAllByText('Decline');
    fireEvent.press(declineButtons[0]); // Decline first invitation

    await waitFor(() => {
      expect(invitationApi.respondToInvitation).toHaveBeenCalledWith(
        'inv-1',
        'declined'
      );
      // Quest 1 should be removed from the list
      expect(screen.queryByText('Quest 1')).toBeNull();
      // Quest 2 should still be visible
      expect(screen.getByText('Quest 2')).toBeTruthy();
    });
  });

  it('should show public quests preview section with mock data', async () => {
    // Test with no invitations to see the public quests section
    (invitationApi.getPendingInvitations as jest.Mock).mockResolvedValue([]);

    render(<JoinCooperativeQuest />);

    await waitFor(() => {
      expect(screen.getByText('No Invitations')).toBeTruthy();
      expect(screen.getByText('Public Quests')).toBeTruthy();
      expect(screen.getByText('Coming Soon')).toBeTruthy();

      // Check for mock public quest
      expect(screen.getByText('Morning Productivity Challenge')).toBeTruthy();

      // Check for disabled join button
      expect(screen.getByText('Join (Coming Soon)')).toBeTruthy();

      // Check for info message
      expect(screen.getByText('Public Quests are coming soon!')).toBeTruthy();
    });
  });

  it('should handle back navigation', async () => {
    render(<JoinCooperativeQuest />);

    // Wait for the component to load
    await waitFor(() => {
      const headerText = screen.getByText('Join a Quest');
      expect(headerText).toBeTruthy();
    });

    // Find the touchable back button by looking for an accessible element
    // The back button is the first accessible element in the header
    const accessibleElements = screen.root.findAll((node) => {
      return node.props?.accessible === true;
    });

    // The first accessible element should be the back button
    if (accessibleElements.length > 0) {
      fireEvent.press(accessibleElements[0]);
    }

    expect(mockBack).toHaveBeenCalled();
  });
});
