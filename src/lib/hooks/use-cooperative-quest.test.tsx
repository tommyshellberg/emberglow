import { useQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { getQuestRunStatus } from '@/lib/services/quest-run-service';
import { useQuestStore } from '@/store/quest-store';

import {
  useCooperativeQuest,
  useInvitationActions,
  useQuestRunStatus,
} from './use-cooperative-quest';

// Controllable faded flag (mock-prefixed so jest.mock factory can reference it)
let mockFaded = false;

// Mock dependencies
jest.mock('@tanstack/react-query');
jest.mock('@/lib/services/quest-run-service');
jest.mock('@/lib/services/invitation-service');
jest.mock('@/store/quest-store');
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
}));
jest.mock('@/lib/services/quest-timer', () => ({
  __esModule: true,
  default: { prepareQuest: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('@/hooks/use-spirit', () => ({
  isFadedNow: () => mockFaded,
}));

describe('use-cooperative-quest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useQuestRunStatus', () => {
    it('should poll quest status every 30 seconds when enabled', () => {
      // Arrange
      const mockQueryFn = jest.fn();
      (useQuery as jest.Mock).mockImplementation(({ queryFn, ...options }) => {
        mockQueryFn.mockImplementation(queryFn);
        return {
          data: null,
          isLoading: false,
          error: null,
        };
      });

      // Act
      renderHook(() => useQuestRunStatus('quest-123', true));

      // Assert
      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['questRun', 'quest-123'],
          enabled: true,
          refetchInterval: 30000, // 30 seconds
          refetchIntervalInBackground: true,
          staleTime: 1000,
        })
      );
    });

    it('should not poll when disabled', () => {
      // Arrange
      (useQuery as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      // Act
      renderHook(() => useQuestRunStatus('quest-123', false));

      // Assert
      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
          refetchInterval: false,
        })
      );
    });

    it('should fetch quest run status when questRunId is provided', () => {
      // Arrange
      const mockQuestRun = {
        id: 'quest-123',
        status: 'active',
        quest: { id: 'quest-1', title: 'Test Quest' },
      };

      (getQuestRunStatus as jest.Mock).mockResolvedValue(mockQuestRun);
      (useQuery as jest.Mock).mockImplementation(({ queryFn }) => {
        const result = queryFn();
        return {
          data: mockQuestRun,
          isLoading: false,
          error: null,
        };
      });

      // Act
      const { result } = renderHook(() => useQuestRunStatus('quest-123', true));

      // Assert
      expect(getQuestRunStatus).toHaveBeenCalledWith('quest-123');
    });
  });

  describe('useCooperativeQuest', () => {
    it('should handle quest failure detection', async () => {
      // Arrange
      const mockRouter = require('expo-router').router;
      const mockQuestStore = {
        cooperativeQuestRun: {
          id: 'quest-123',
          status: 'active',
        },
        failQuest: jest.fn(),
        setCooperativeQuestRun: jest.fn(),
      };

      (useQuestStore as jest.Mock).mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockQuestStore);
        }
        return mockQuestStore;
      });

      // Mock useQuestStore.getState()
      (useQuestStore as any).getState = jest
        .fn()
        .mockReturnValue(mockQuestStore);

      // Mock the query to return failed status
      (useQuery as jest.Mock).mockReturnValue({
        data: {
          id: 'quest-123',
          status: 'failed',
          participants: [],
        },
        isLoading: false,
        error: null,
      });

      // Act
      renderHook(() => useCooperativeQuest());

      // Assert - should detect failure and update state
      await waitFor(() => {
        expect(mockQuestStore.failQuest).toHaveBeenCalled();
        expect(mockRouter.replace).toHaveBeenCalledWith('/quest-failed');
      });
    });

    it('should not fail quest if status has not changed', () => {
      // Arrange
      const mockQuestStore = {
        cooperativeQuestRun: {
          id: 'quest-123',
          status: 'active',
        },
        failQuest: jest.fn(),
        setCooperativeQuestRun: jest.fn(),
      };

      (useQuestStore as jest.Mock).mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockQuestStore);
        }
        return mockQuestStore;
      });

      // Mock the query to return active status (no change)
      (useQuery as jest.Mock).mockReturnValue({
        data: {
          id: 'quest-123',
          status: 'active',
          participants: [],
        },
        isLoading: false,
        error: null,
      });

      // Act
      renderHook(() => useCooperativeQuest());

      // Assert - should not fail quest
      expect(mockQuestStore.failQuest).not.toHaveBeenCalled();
    });

    it('should only poll when cooperative quest is pending', () => {
      // Arrange
      const mockQuestStore = {
        cooperativeQuestRun: {
          id: 'quest-123',
          status: 'pending',
        },
        pendingQuest: { id: 'quest-1' },
      };

      (useQuestStore as jest.Mock).mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockQuestStore);
        }
        return mockQuestStore;
      });

      let queryOptions: any;
      (useQuery as jest.Mock).mockImplementation((options) => {
        queryOptions = options;
        return { data: null, isLoading: false, error: null };
      });

      // Act
      renderHook(() => useCooperativeQuest());

      // Find the call to useQuery for quest run status
      const questRunStatusCall = (useQuery as jest.Mock).mock.calls.find(
        (call) => call[0].queryKey?.[0] === 'questRun'
      );

      // Assert - should enable polling for pending quest
      expect(questRunStatusCall).toBeDefined();
      expect(questRunStatusCall[0].enabled).toBe(true);
    });

    it('should not poll when cooperative quest is active', () => {
      // Arrange
      const mockQuestStore = {
        cooperativeQuestRun: {
          id: 'quest-123',
          status: 'active',
        },
        pendingQuest: null,
      };

      (useQuestStore as jest.Mock).mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return selector(mockQuestStore);
        }
        return mockQuestStore;
      });

      (useQuery as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      // Act
      renderHook(() => useCooperativeQuest());

      // Find the call to useQuery for quest run status
      const questRunStatusCall = (useQuery as jest.Mock).mock.calls.find(
        (call) => call[0]?.queryKey?.[0] === 'questRun'
      );

      // Assert - should disable polling for active quest (polling only for 'pending' status)
      expect(questRunStatusCall).toBeDefined();
      expect(questRunStatusCall[0].enabled).toBe(false);
    });
  });

  describe('useInvitationActions - spirit fading gate', () => {
    const { useMutation, useQueryClient } = require('@tanstack/react-query');
    const { acceptInvitation } = require('@/lib/services/invitation-service');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const routerPush = () => require('expo-router').router.push;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const questTimerPrepareQuest = () =>
      require('@/lib/services/quest-timer').default.prepareQuest;

    const setupMutationCapture = () => {
      const captured: any[] = [];
      (useMutation as jest.Mock).mockImplementation((options: any) => {
        captured.push(options);
        return { mutate: jest.fn(), isPending: false, isError: false };
      });
      (useQueryClient as jest.Mock).mockReturnValue({
        invalidateQueries: jest.fn(),
      });
      return captured;
    };

    beforeEach(() => {
      mockFaded = false;
      routerPush().mockClear();
      questTimerPrepareQuest().mockClear();
    });

    it('routes home and does not call prepareQuest when faded', async () => {
      // Arrange
      mockFaded = true;
      const captured = setupMutationCapture();

      const mockQuestStore = {
        setCurrentInvitation: jest.fn(),
        setCooperativeQuestRun: jest.fn(),
        prepareQuest: jest.fn(),
      };
      (useQuestStore as unknown as jest.Mock).mockImplementation(
        (selector: any) => {
          if (typeof selector === 'function') {
            return selector(mockQuestStore);
          }
          return mockQuestStore;
        }
      );
      (useQuestStore as any).getState = jest
        .fn()
        .mockReturnValue(mockQuestStore);

      (getQuestRunStatus as jest.Mock).mockResolvedValue({
        id: 'quest-run-1',
        status: 'pending',
        quest: { id: 'q-1', title: 'Coop', durationMinutes: 30 },
        participants: [{ userId: 'host', ready: false, status: 'pending' }],
      });

      // Act
      renderHook(() => useInvitationActions());

      // The first captured mutation is the accept mutation
      const acceptOptions = captured.find(
        (o) => o.mutationFn === acceptInvitation
      );
      expect(acceptOptions).toBeDefined();

      await act(async () => {
        await acceptOptions.onSuccess({ questRunId: 'quest-run-1' });
      });

      // Assert
      expect(routerPush()).toHaveBeenCalledWith('/(app)');
      expect(mockQuestStore.prepareQuest).not.toHaveBeenCalled();
      expect(questTimerPrepareQuest()).not.toHaveBeenCalled();
    });

    it('does not route home and reaches prepareQuest when not faded', async () => {
      // Arrange — mockFaded is false (set in beforeEach)
      const captured = setupMutationCapture();

      const mockQuestStore = {
        setCurrentInvitation: jest.fn(),
        setCooperativeQuestRun: jest.fn(),
        prepareQuest: jest.fn(),
      };
      (useQuestStore as unknown as jest.Mock).mockImplementation(
        (selector: any) => {
          if (typeof selector === 'function') {
            return selector(mockQuestStore);
          }
          return mockQuestStore;
        }
      );
      (useQuestStore as any).getState = jest
        .fn()
        .mockReturnValue(mockQuestStore);

      (getQuestRunStatus as jest.Mock).mockResolvedValue({
        id: 'quest-run-1',
        status: 'pending',
        quest: { id: 'q-1', title: 'Coop', durationMinutes: 30 },
        participants: [{ userId: 'host', ready: false, status: 'pending' }],
      });

      // Act
      renderHook(() => useInvitationActions());

      const acceptOptions = captured.find(
        (o) => o.mutationFn === acceptInvitation
      );
      expect(acceptOptions).toBeDefined();

      // The non-faded path proceeds past the gate to prepareQuest. A pre-existing
      // native dynamic import() in onSuccess (not transpiled by Jest's CJS babel
      // config) rejects in the test env, so we assert the guard's conditionality
      // via what ran BEFORE that import: the gate did not route home, and
      // prepareQuest was reached.
      await expect(
        act(async () => {
          await acceptOptions.onSuccess({ questRunId: 'quest-run-1' });
        })
      ).rejects.toThrow(/dynamic import/);

      // Assert — gate did NOT fire; the quest reached prepareQuest
      expect(routerPush()).not.toHaveBeenCalledWith('/(app)');
      expect(mockQuestStore.prepareQuest).toHaveBeenCalled();
    });
  });
});
