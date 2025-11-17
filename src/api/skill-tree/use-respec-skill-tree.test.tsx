import { renderHook, waitFor } from '@testing-library/react-native';
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import React from 'react';

import { apiClient } from '../common';
import type { RespecSkillTreeResponse } from './types';
import { useRespecSkillTree } from './use-respec-skill-tree';

// Mock the API client
jest.mock('../common', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('useRespecSkillTree', () => {
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

  const mockRespecResponse: RespecSkillTreeResponse = {
    success: true,
    respecsUsed: 1,
    availableSkillPoints: 8,
    message: 'Skill tree reset successfully',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('successfully respecs skill tree', async () => {
    mockApiClient.post.mockResolvedValue({ data: mockRespecResponse });

    const { result } = renderHook(() => useRespecSkillTree(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient.post).toHaveBeenCalledWith('/skill-tree/respec');
    expect(result.current.data).toEqual(mockRespecResponse);
    expect(result.current.isError).toBe(false);
  });

  it('handles API errors correctly', async () => {
    const error = new Error('Premium subscription required');
    mockApiClient.post.mockRejectedValue(error);

    const { result } = renderHook(() => useRespecSkillTree(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeUndefined();
  });

  it('invalidates skill-tree query on success', async () => {
    mockApiClient.post.mockResolvedValue({ data: mockRespecResponse });

    const { result } = renderHook(
      () => {
        const mutation = useRespecSkillTree();
        const client = useQueryClient();
        return { mutation, client };
      },
      {
        wrapper: createWrapper(),
      }
    );

    // Set up skill-tree query data
    result.current.client.setQueryData(['skill-tree'], {
      currentLevel: 10,
      unlockedNodes: ['perk1', 'perk2', 'perk3'],
    });

    // Spy on invalidateQueries
    const invalidateSpy = jest.spyOn(result.current.client, 'invalidateQueries');

    result.current.mutation.mutate();

    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['skill-tree'],
    });
  });

  it('can be called with mutateAsync', async () => {
    mockApiClient.post.mockResolvedValue({ data: mockRespecResponse });

    const { result } = renderHook(() => useRespecSkillTree(), {
      wrapper: createWrapper(),
    });

    const respecPromise = result.current.mutateAsync();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = await respecPromise;
    expect(data).toEqual(mockRespecResponse);
  });
});
