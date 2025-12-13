import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../common';
import type { SkillTreeResponse } from './types';

interface UseSkillTreeOptions {
  enabled?: boolean;
}

export const useSkillTree = ({ enabled = true }: UseSkillTreeOptions = {}) => {
  return useQuery<SkillTreeResponse>({
    queryKey: ['skill-tree'] as const,
    queryFn: async () => {
      const response = await apiClient.get('/users/me/skill-tree');
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
