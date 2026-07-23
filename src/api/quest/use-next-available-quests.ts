import { useQuery } from '@tanstack/react-query';

import { getProvisionalAccessToken } from '@/api/token';

import { apiClient } from '../common';
import { provisionalApiClient } from '../common/provisional-client';
import type { NextAvailableQuestsResponse } from './types';

interface UseNextAvailableQuestsOptions {
  storylineId?: string;
  includeOptions?: boolean;
  enabled?: boolean;
}

export const useNextAvailableQuests = ({
  storylineId = 'vaedros',
  includeOptions = true,
  enabled = true,
}: UseNextAvailableQuestsOptions = {}) => {
  return useQuery<NextAvailableQuestsResponse>({
    queryKey: ['next-available-quests', storylineId, includeOptions],
    queryFn: async () => {
      const params = new URLSearchParams({
        storylineId,
        includeOptions: includeOptions.toString(),
      });

      // Check if we're using a provisional user
      const hasProvisionalToken = !!getProvisionalAccessToken();
      const client = hasProvisionalToken ? provisionalApiClient : apiClient;

      const response = await client.get(
        `/quest-templates/next-available?${params.toString()}`
      );
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 3, // Limit retries to 3 attempts
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};
