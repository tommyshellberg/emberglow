import React from 'react';

import { act, render, screen } from '@/lib/test-utils';
import { useCooperativeLobbyStore } from '@/store/cooperative-lobby-store';
import { useUserStore } from '@/store/user-store';

import CooperativeQuestReady from './cooperative-quest-ready';

// Mock the router. The object must be referentially stable across renders
// (like the real expo-router router) — the screen keys effects on it.
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockRouter = { replace: mockReplace, back: mockBack };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

// Mock the WebSocket. The screen imports useWebSocket from
// websocket-provider, which re-exports it from lazy-websocket-provider, so
// mocking the lazy module covers both import paths.
const mockEmit = jest.fn().mockReturnValue(true);
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
  useWebSocket: () => ({
    emit: mockEmit,
    on: mockOn,
    off: mockOff,
    joinQuestRoom: jest.fn(),
    leaveQuestRoom: jest.fn(),
    isConnected: true,
    forceReconnect: jest.fn(),
    addListener: mockOn,
    removeListener: mockOff,
  }),
  LazyWebSocketProvider: ({ children }: { children: any }) => children,
}));

jest.mock('@/lib/services/quest-timer', () => ({
  __esModule: true,
  default: {
    prepareQuest: jest.fn(),
  },
}));

describe('CooperativeQuestReady', () => {
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
        invitationStatus: 'accepted',
        isReady: false,
        isCreator: false,
        joinedAt: new Date(),
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
    mockEmit.mockReturnValue(true);

    useCooperativeLobbyStore.setState({
      currentLobby: mockLobby as any,
      isInLobby: true,
      countdownSeconds: null,
    });

    useUserStore.setState({
      user: mockUser as any,
    });
  });

  it('joins the lobby room on mount', () => {
    render(<CooperativeQuestReady />);

    expect(mockEmit).toHaveBeenCalledWith('lobby:join', {
      lobbyId: 'test-lobby-123',
    });
  });

  // Every ready-status update replaces currentLobby in the store. If the
  // socket effect is keyed on anything derived from that object, the update
  // re-runs it and the cleanup fires lobby:leave — which the server treats as
  // the host abandoning the lobby and cancels it for everyone.
  it('does not emit lobby:leave when the roster updates', () => {
    render(<CooperativeQuestReady />);

    act(() => {
      useCooperativeLobbyStore.getState().markUserReady('invitee-123', true);
    });

    expect(mockEmit).not.toHaveBeenCalledWith('lobby:leave', expect.anything());
  });

  it('keeps listening for lobby:ready-status after roster updates', () => {
    render(<CooperativeQuestReady />);

    act(() => {
      useCooperativeLobbyStore.getState().markUserReady('invitee-123', true);
    });

    const registered = mockOn.mock.calls.filter(
      ([event]) => event === 'lobby:ready-status'
    ).length;
    const removed = mockOff.mock.calls.filter(
      ([event]) => event === 'lobby:ready-status'
    ).length;

    expect(registered - removed).toBe(1);
  });

  it('does not emit lobby:leave on unmount', () => {
    const { unmount } = render(<CooperativeQuestReady />);

    unmount();

    expect(mockEmit).not.toHaveBeenCalledWith('lobby:leave', expect.anything());
  });

  it('applies incoming lobby:ready-status events to the roster', () => {
    render(<CooperativeQuestReady />);

    const readyStatusHandler = mockOn.mock.calls.find(
      ([event]) => event === 'lobby:ready-status'
    )?.[1];
    expect(readyStatusHandler).toBeTruthy();

    act(() => {
      readyStatusHandler({ userId: 'invitee-123', isReady: true });
    });

    expect(screen.getByText('Ready!')).toBeTruthy();
  });
});
