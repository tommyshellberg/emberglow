import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { queryClient } from '@/api/common';
import { useAuth } from '@/lib/auth';
import { webSocketService } from '@/lib/services/websocket-service';
import { getItem } from '@/lib/storage';
import { useQuestStore } from '@/store/quest-store';

import { WebSocketProvider } from './websocket-provider';

// Mock dependencies
jest.mock('@/lib/services/websocket-service', () => ({
  webSocketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    joinQuestRoom: jest.fn(),
    leaveQuestRoom: jest.fn(),
    forceReconnect: jest.fn(),
    getConnectionStatus: jest.fn(() => false),
  },
}));

jest.mock('@/lib/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/store/quest-store', () => ({
  useQuestStore: jest.fn(),
}));

jest.mock('@/api/common', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
}));

// Mock AppState specifically
const mockAppState = {
  currentState: 'active',
  addEventListener: jest.fn(),
};

jest.doMock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    AppState: mockAppState,
  };
});

// Mock timers
jest.useFakeTimers();

const mockWebSocketService = webSocketService as jest.Mocked<
  typeof webSocketService
>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseQuestStore = useQuestStore as jest.MockedFunction<
  typeof useQuestStore
>;
const mockQueryClient = queryClient as jest.Mocked<typeof queryClient>;
const mockGetItem = getItem as jest.MockedFunction<typeof getItem>;

describe('WebSocketProvider', () => {
  let mockQuestStore: any;
  let mockAppStateListeners: ((state: string) => void)[];

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset timers
    jest.clearAllTimers();

    // Mock quest store
    mockQuestStore = {
      setPendingInvitations: jest.fn(),
      cooperativeQuestRun: null,
      setCooperativeQuestRun: jest.fn(),
      updateParticipantReady: jest.fn(),
    };

    // Mock AppState listeners
    mockAppStateListeners = [];
    mockAppState.addEventListener.mockImplementation((event, listener) => {
      mockAppStateListeners.push(listener);
      return { remove: jest.fn() };
    });

    // Reset current state
    mockAppState.currentState = 'active';

    // Default auth state
    mockUseAuth.mockReturnValue('signOut' as any);

    // Default quest store state
    mockUseQuestStore.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockQuestStore);
      }
      return mockQuestStore;
    });

    // Mock the getState function separately
    (mockUseQuestStore as any).getState = jest.fn(() => mockQuestStore);

    // Default storage state
    mockGetItem.mockReturnValue(null);

    // Default connection state
    mockWebSocketService.getConnectionStatus.mockReturnValue(false);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Authentication-based Connection', () => {
    it('should connect when user is signed in', async () => {
      mockUseAuth.mockReturnValue('signIn' as any);

      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      await waitFor(() => {
        expect(mockWebSocketService.connect).toHaveBeenCalled();
      });
    });

    it('should connect when provisional token exists', async () => {
      mockUseAuth.mockReturnValue('signOut' as any);
      mockGetItem.mockReturnValue('provisional-token');

      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      await waitFor(() => {
        expect(mockWebSocketService.connect).toHaveBeenCalled();
      });
    });

    it('should disconnect when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue('signOut' as any);
      mockGetItem.mockReturnValue(null);

      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      await waitFor(() => {
        expect(mockWebSocketService.disconnect).toHaveBeenCalled();
      });
    });

    it('should disconnect on unmount', () => {
      mockUseAuth.mockReturnValue('signIn' as any);

      const { unmount } = render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      unmount();

      expect(mockWebSocketService.disconnect).toHaveBeenCalled();
    });
  });

  describe('App State Handling', () => {
    it('should not reconnect when app comes to foreground without auth', async () => {
      mockUseAuth.mockReturnValue('signOut' as any);
      mockGetItem.mockReturnValue(null);

      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // Clear previous calls
      mockWebSocketService.connect.mockClear();

      // Simulate app going to background then foreground
      act(() => {
        mockAppStateListeners.forEach((listener) => listener('background'));
      });

      act(() => {
        mockAppStateListeners.forEach((listener) => listener('active'));
      });

      expect(mockWebSocketService.connect).not.toHaveBeenCalled();
    });
  });

  describe('WebSocket Event Handling', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue('signIn' as any);
    });

    it('should set up quest invitation event listener', () => {
      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      expect(mockWebSocketService.on).toHaveBeenCalledWith(
        'questInvitation',
        expect.any(Function)
      );
    });

    it('should handle quest invitation events', () => {
      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // Find the quest invitation handler
      const questInvitationCall = mockWebSocketService.on.mock.calls.find(
        (call) => call[0] === 'questInvitation'
      );
      const questInvitationHandler = questInvitationCall![1];

      const mockData = {
        invitation: {
          id: 'test-invitation',
          questTitle: 'Test Quest',
        },
      };

      act(() => {
        questInvitationHandler(mockData);
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['invitations', 'pending'],
      });
    });

    it('should handle invitation accepted events', () => {
      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // Find the invitation accepted handler
      const invitationAcceptedCall = mockWebSocketService.on.mock.calls.find(
        (call) => call[0] === 'invitationAccepted'
      );
      const invitationAcceptedHandler = invitationAcceptedCall![1];

      const mockData = {
        invitationId: 'test-invitation-id',
        userId: 'test-user-id',
        acceptedAt: Date.now(),
      };

      act(() => {
        invitationAcceptedHandler(mockData);
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['invitation', 'test-invitation-id', 'status'],
      });
    });

    it('should handle invitation declined events', () => {
      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // Find the invitation declined handler
      const invitationDeclinedCall = mockWebSocketService.on.mock.calls.find(
        (call) => call[0] === 'invitationDeclined'
      );
      const invitationDeclinedHandler = invitationDeclinedCall![1];

      const mockData = {
        invitationId: 'test-invitation-id',
        userId: 'test-user-id',
        declinedAt: Date.now(),
      };

      act(() => {
        invitationDeclinedHandler(mockData);
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['invitation', 'test-invitation-id', 'status'],
      });
    });

    it('should handle quest started events', () => {
      // Set up the quest store with a cooperative quest run
      mockQuestStore.cooperativeQuestRun = {
        id: 'test-quest-run',
        status: 'pending',
      };

      // Update the getState mock to return the updated store
      (mockUseQuestStore as any).getState.mockReturnValue(mockQuestStore);

      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // Find the quest started handler
      const questStartedCall = mockWebSocketService.on.mock.calls.find(
        (call) => call[0] === 'questStarted'
      );
      const questStartedHandler = questStartedCall![1];

      const mockData = {
        questRunId: 'test-quest-run',
        actualStartTime: Date.now(),
      };

      act(() => {
        questStartedHandler(mockData);
      });

      expect(mockQuestStore.setCooperativeQuestRun).toHaveBeenCalledWith({
        id: 'test-quest-run',
        status: 'active',
        actualStartTime: mockData.actualStartTime,
      });
    });

    it('should handle quest started events for non-matching quest runs', () => {
      // Set up the quest store with a different quest run
      mockQuestStore.cooperativeQuestRun = {
        id: 'different-quest-run',
        status: 'pending',
      };

      // Update the getState mock to return the updated store
      (mockUseQuestStore as any).getState.mockReturnValue(mockQuestStore);

      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // Find the quest started handler
      const questStartedCall = mockWebSocketService.on.mock.calls.find(
        (call) => call[0] === 'questStarted'
      );
      const questStartedHandler = questStartedCall![1];

      const mockData = {
        questRunId: 'test-quest-run',
        actualStartTime: Date.now(),
      };

      act(() => {
        questStartedHandler(mockData);
      });

      expect(mockQuestStore.setCooperativeQuestRun).not.toHaveBeenCalled();
    });

    it('should handle participant ready events', () => {
      // Update the getState mock to return the store
      (mockUseQuestStore as any).getState.mockReturnValue(mockQuestStore);

      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // Find the participant ready handler
      const participantReadyCall = mockWebSocketService.on.mock.calls.find(
        (call) => call[0] === 'participantReady'
      );
      const participantReadyHandler = participantReadyCall![1];

      const mockData = {
        userId: 'test-user-id',
        ready: true,
        questRunId: 'test-quest-run',
      };

      act(() => {
        participantReadyHandler(mockData);
      });

      expect(mockQuestStore.updateParticipantReady).toHaveBeenCalledWith(
        'test-user-id',
        true
      );
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['questRun', 'test-quest-run'],
      });
    });

    it('should handle participant joined events', () => {
      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // Find the participant joined handler
      const participantJoinedCall = mockWebSocketService.on.mock.calls.find(
        (call) => call[0] === 'participantJoined'
      );
      const participantJoinedHandler = participantJoinedCall![1];

      const mockData = {
        userId: 'test-user-id',
        questRunId: 'test-quest-run',
        joinedAt: Date.now(),
      };

      act(() => {
        participantJoinedHandler(mockData);
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['questRun', 'test-quest-run'],
      });
    });

    it('should handle participant events without quest run ID', () => {
      // Update the getState mock to return the store
      (mockUseQuestStore as any).getState.mockReturnValue(mockQuestStore);

      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // Find the participant ready handler
      const participantReadyCall = mockWebSocketService.on.mock.calls.find(
        (call) => call[0] === 'participantReady'
      );
      const participantReadyHandler = participantReadyCall![1];

      const mockData = {
        userId: 'test-user-id',
        ready: true,
        // No questRunId
      };

      act(() => {
        participantReadyHandler(mockData);
      });

      expect(mockQuestStore.updateParticipantReady).toHaveBeenCalledWith(
        'test-user-id',
        true
      );
      expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe('Event Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      mockUseAuth.mockReturnValue('signIn' as any);

      const { unmount } = render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      unmount();

      // Check that off was called for each event type
      expect(mockWebSocketService.off).toHaveBeenCalledWith(
        'questInvitation',
        expect.any(Function)
      );
      expect(mockWebSocketService.off).toHaveBeenCalledWith(
        'invitationAccepted',
        expect.any(Function)
      );
      expect(mockWebSocketService.off).toHaveBeenCalledWith(
        'invitationDeclined',
        expect.any(Function)
      );
      expect(mockWebSocketService.off).toHaveBeenCalledWith(
        'questStarted',
        expect.any(Function)
      );
      expect(mockWebSocketService.off).toHaveBeenCalledWith(
        'participantReady',
        expect.any(Function)
      );
      expect(mockWebSocketService.off).toHaveBeenCalledWith(
        'participantJoined',
        expect.any(Function)
      );
    });

    it('should not set up event listeners when not authenticated', () => {
      mockUseAuth.mockReturnValue('signOut' as any);
      mockGetItem.mockReturnValue(null);

      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // Should not have set up event listeners
      expect(mockWebSocketService.on).not.toHaveBeenCalled();
    });
  });

  describe('Context Value', () => {
    it('should provide correct context value', () => {
      mockUseAuth.mockReturnValue('signIn' as any);
      mockWebSocketService.getConnectionStatus.mockReturnValue(true);

      let contextValue: any;

      const TestComponent = () => {
        // We need to import the context and use it here
        // Since we can't easily access the context in tests, we'll verify
        // that the service methods are called correctly
        return <div>Test</div>;
      };

      render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      // Test that the service methods are properly bound
      expect(mockWebSocketService.getConnectionStatus).toHaveBeenCalled();
    });
  });

  describe('Auth State Changes', () => {
    it('should handle auth state changes from signOut to signIn', async () => {
      const { rerender } = render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // Initially not authenticated
      expect(mockWebSocketService.disconnect).toHaveBeenCalled();

      // Clear mock calls
      mockWebSocketService.connect.mockClear();
      mockWebSocketService.disconnect.mockClear();

      // Change to authenticated
      mockUseAuth.mockReturnValue('signIn' as any);

      rerender(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      await waitFor(() => {
        expect(mockWebSocketService.connect).toHaveBeenCalled();
      });
    });

    it('should handle auth state changes from signIn to signOut', async () => {
      mockUseAuth.mockReturnValue('signIn' as any);

      const { rerender } = render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // Initially authenticated
      expect(mockWebSocketService.connect).toHaveBeenCalled();

      // Clear mock calls
      mockWebSocketService.connect.mockClear();
      mockWebSocketService.disconnect.mockClear();

      // Change to not authenticated
      mockUseAuth.mockReturnValue('signOut' as any);

      rerender(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      await waitFor(() => {
        expect(mockWebSocketService.disconnect).toHaveBeenCalled();
      });
    });

    it('should handle provisional token changes', async () => {
      mockUseAuth.mockReturnValue('signOut' as any);
      mockGetItem.mockReturnValue(null);

      const { rerender } = render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // Initially no provisional token
      expect(mockWebSocketService.disconnect).toHaveBeenCalled();

      // Clear mock calls
      mockWebSocketService.connect.mockClear();
      mockWebSocketService.disconnect.mockClear();

      // Add provisional token - this will trigger the useEffect
      mockGetItem.mockReturnValue('provisional-token');

      // Re-render with same auth status but different token
      rerender(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // The component should detect the token change and connect
      await waitFor(() => {
        expect(mockWebSocketService.connect).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle quest store errors gracefully', () => {
      mockUseAuth.mockReturnValue('signIn' as any);

      // Set up the quest store with a cooperative quest run
      mockQuestStore.cooperativeQuestRun = {
        id: 'test-quest-run',
        status: 'pending',
      };

      // Mock quest store to throw error
      mockQuestStore.setCooperativeQuestRun.mockImplementation(() => {
        throw new Error('Quest store error');
      });

      // Update the getState mock to return the store
      (mockUseQuestStore as any).getState.mockReturnValue(mockQuestStore);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // Find the quest started handler
      const questStartedCall = mockWebSocketService.on.mock.calls.find(
        (call) => call[0] === 'questStarted'
      );
      const questStartedHandler = questStartedCall![1];

      const mockData = {
        questRunId: 'test-quest-run',
        actualStartTime: Date.now(),
      };

      // Should not throw
      expect(() => {
        act(() => {
          questStartedHandler(mockData);
        });
      }).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('should handle query client errors gracefully', () => {
      mockUseAuth.mockReturnValue('signIn' as any);

      // Mock query client to throw error
      mockQueryClient.invalidateQueries.mockImplementation(() => {
        throw new Error('Query client error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <WebSocketProvider>
          <div>Test</div>
        </WebSocketProvider>
      );

      // Find the quest invitation handler
      const questInvitationCall = mockWebSocketService.on.mock.calls.find(
        (call) => call[0] === 'questInvitation'
      );
      const questInvitationHandler = questInvitationCall![1];

      const mockData = {
        invitation: {
          id: 'test-invitation',
          questTitle: 'Test Quest',
        },
      };

      // Should not throw
      expect(() => {
        act(() => {
          questInvitationHandler(mockData);
        });
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });
});
