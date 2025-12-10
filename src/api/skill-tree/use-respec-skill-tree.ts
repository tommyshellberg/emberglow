import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../common';
import type { RespecSkillTreeResponse } from './types';

export const useRespecSkillTree = () => {
  const queryClient = useQueryClient();

  return useMutation<RespecSkillTreeResponse, Error, void>({
    mutationFn: async () => {
      const response = await apiClient.post('/users/me/skill-tree/respec');
      return response.data;
    },
    onSuccess: () => {
      // Invalidate skill-tree query to refetch latest data
      queryClient.invalidateQueries({
        queryKey: ['skill-tree'],
      });
    },
  });
};
