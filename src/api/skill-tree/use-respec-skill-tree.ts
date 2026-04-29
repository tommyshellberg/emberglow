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
      queryClient.invalidateQueries({ queryKey: ['skill-tree'] });
      queryClient.invalidateQueries({ queryKey: ['quest-reward-preview'] });
    },
  });
};
