import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { apiClient } from '../common';
import { provisionalApiClient } from '../common/provisional-client';
import type { QuestRewardPreviewResponse } from './types';
import { useQuestRewardPreview } from './use-quest-reward-preview';

// Mock the API clients
jest.mock('../common', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

jest.mock('../common/provisional-client', () => ({
  provisionalApiClient: {
    post: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockProvisionalApiClient = provisionalApiClient as jest.Mocked<
  typeof provisionalApiClient
>;

describe('useQuestRewardPreview', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  const mockPreviewResponse: QuestRewardPreviewResponse = {
    participantRewards: [
      {
        userId: 'user-1',
        baseXP: 90,
        adjustedXP: 135,
        multiplier: 1.5,
        perksApplied: ['endurance_focus'],
      },
    ],
    effects: {
      duration: 27,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('when fetching preview', () => {
    it('calls POST endpoint with questTemplateId', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockPreviewResponse });

      const { result } = renderHook(
        () => useQuestRewardPreview({ questTemplateId: 'quest-3' }),
        {
          wrapper: createWrapper(),
        }
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/quest-runs/preview-rewards',
        {
          questTemplateId: 'quest-3',
        }
      );
      expect(result.current.data).toEqual(mockPreviewResponse);
    });

    it('includes participantIds when provided', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockPreviewResponse });

      const { result } = renderHook(
        () =>
          useQuestRewardPreview({
            questTemplateId: 'quest-3',
            participantIds: ['user-1', 'user-2'],
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/quest-runs/preview-rewards',
        {
          questTemplateId: 'quest-3',
          participantIds: ['user-1', 'user-2'],
        }
      );
    });

    it('does not fetch when enabled is false', () => {
      const { result } = renderHook(
        () =>
          useQuestRewardPreview({ questTemplateId: 'quest-3', enabled: false }),
        {
          wrapper: createWrapper(),
        }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('does not fetch when questTemplateId is not provided', () => {
      const { result } = renderHook(
        () => useQuestRewardPreview({ questTemplateId: undefined }),
        {
          wrapper: createWrapper(),
        }
      );

      expect(result.current.isLoading).toBe(false);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('caching', () => {
    it('uses staleTime of 5 minutes', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockPreviewResponse });

      const { result, rerender } = renderHook(
        () => useQuestRewardPreview({ questTemplateId: 'quest-3' }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledTimes(1);

      // Rerender - should use cached data within staleTime
      rerender();

      expect(mockApiClient.post).toHaveBeenCalledTimes(1); // Still 1, using cache
    });

    it('uses different cache keys for different quest IDs', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockPreviewResponse });

      const { result: result1 } = renderHook(
        () => useQuestRewardPreview({ questTemplateId: 'quest-1' }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      const { result: result2 } = renderHook(
        () => useQuestRewardPreview({ questTemplateId: 'quest-2' }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result2.current.isSuccess).toBe(true));

      // Should have made 2 separate API calls for different quest IDs
      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('handles API errors correctly', async () => {
      const error = new Error('Network error');
      mockApiClient.post.mockRejectedValue(error);

      const { result } = renderHook(
        () => useQuestRewardPreview({ questTemplateId: 'quest-3' }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeUndefined();
    });
  });
});
