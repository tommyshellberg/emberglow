import { renderHook, waitFor } from '@testing-library/react-native';
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import React from 'react';

import { apiClient } from '../common';
import type { UnlockPerkResponse } from './types';
import { useUnlockPerk } from './use-unlock-perk';

// Mock the API client
jest.mock('../common', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('useUnlockPerk', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  const mockUnlockPerkResponse: UnlockPerkResponse = {
    success: true,
    unlockedPerk: {
      nodeId: 'resilient_spirit',
      unlockedAt: '2025-01-15T10:30:00Z',
    },
    updatedSkillTree: {
      currentLevel: 5,
      characterType: 'knight',
      unlockedNodes: ['resilient_spirit'],
      availablePerks: [],
      canRespec: false,
      respecsUsed: 0,
      lastRespecAt: null,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('successfully unlocks a perk without choice', async () => {
    mockApiClient.post.mockResolvedValue({ data: mockUnlockPerkResponse });

    const { result } = renderHook(() => useUnlockPerk(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);

    result.current.mutate({
      nodeId: 'resilient_spirit',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient.post).toHaveBeenCalledWith('/skill-tree/unlock', {
      nodeId: 'resilient_spirit',
    });
    expect(result.current.data).toEqual(mockUnlockPerkResponse);
    expect(result.current.isError).toBe(false);
  });

  it('successfully unlocks a perk with choice', async () => {
    mockApiClient.post.mockResolvedValue({ data: mockUnlockPerkResponse });

    const { result } = renderHook(() => useUnlockPerk(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      nodeId: 'quest_mastery',
      choice: 'quest_mastery_quick',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient.post).toHaveBeenCalledWith('/skill-tree/unlock', {
      nodeId: 'quest_mastery',
      choice: 'quest_mastery_quick',
    });
    expect(result.current.data).toEqual(mockUnlockPerkResponse);
  });

  it('handles API errors correctly', async () => {
    const error = new Error('Insufficient level');
    mockApiClient.post.mockRejectedValue(error);

    const { result } = renderHook(() => useUnlockPerk(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      nodeId: 'streak_master',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeUndefined();
  });

  it('invalidates skill-tree query on success', async () => {
    mockApiClient.post.mockResolvedValue({ data: mockUnlockPerkResponse });

    const { result } = renderHook(
      () => {
        const mutation = useUnlockPerk();
        const client = useQueryClient();
        return { mutation, client };
      },
      {
        wrapper: createWrapper(),
      }
    );

    // Set up skill-tree query data
    result.current.client.setQueryData(['skill-tree'], {
      currentLevel: 4,
      unlockedNodes: [],
    });

    // Spy on invalidateQueries
    const invalidateSpy = jest.spyOn(result.current.client, 'invalidateQueries');

    result.current.mutation.mutate({
      nodeId: 'resilient_spirit',
    });

    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['skill-tree'],
    });
  });

  it('can be called with mutateAsync', async () => {
    mockApiClient.post.mockResolvedValue({ data: mockUnlockPerkResponse });

    const { result } = renderHook(() => useUnlockPerk(), {
      wrapper: createWrapper(),
    });

    const unlockPromise = result.current.mutateAsync({
      nodeId: 'resilient_spirit',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = await unlockPromise;
    expect(data).toEqual(mockUnlockPerkResponse);
  });
});
