import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../common';
import type { UnlockPerkRequest, UnlockPerkResponse } from './types';

export const useUnlockPerk = () => {
  const queryClient = useQueryClient();

  return useMutation<UnlockPerkResponse, Error, UnlockPerkRequest>({
    mutationFn: async ({ nodeId, choice }) => {
      const response = await apiClient.post('/users/me/skill-tree/unlock', {
        nodeId,
        ...(choice && { choice }),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-tree'] });
      queryClient.invalidateQueries({ queryKey: ['quest-reward-preview'] });
    },
  });
};
