import { useQuery } from '@tanstack/react-query';

import { getItem } from '@/lib/storage';

import { apiClient } from '../common';
import { provisionalApiClient } from '../common/provisional-client';
import type { SkillTreeResponse } from './types';

interface UseSkillTreeOptions {
  enabled?: boolean;
}

export const useSkillTree = ({ enabled = true }: UseSkillTreeOptions = {}) => {
  return useQuery<SkillTreeResponse>({
    queryKey: ['skill-tree'] as const,
    queryFn: async () => {
      // Check if we're using a provisional user
      const hasProvisionalToken = !!getItem('provisionalAccessToken');
      const client = hasProvisionalToken ? provisionalApiClient : apiClient;

      const response = await client.get('/users/me/skill-tree');
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 3, // Limit retries to 3 attempts
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};
