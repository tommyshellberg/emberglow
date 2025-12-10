import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../common';
import type { QuestRewardPreviewResponse } from './types';

interface UseQuestRewardPreviewOptions {
  questTemplateId?: string;
  questData?: any;
  participantIds?: string[];
  enabled?: boolean;
}

export const useQuestRewardPreview = ({
  questTemplateId,
  questData,
  participantIds,
  enabled = true,
}: UseQuestRewardPreviewOptions) => {
  return useQuery<QuestRewardPreviewResponse>({
    queryKey: ['quest-reward-preview', questTemplateId, questData, participantIds],
    queryFn: async () => {
      const body: any = {};

      if (questTemplateId) {
        body.questTemplateId = questTemplateId;
      }

      if (questData) {
        body.questData = questData;
      }

      if (participantIds) {
        body.participantIds = participantIds;
      }

      const response = await apiClient.post('/quest-runs/preview-rewards', body);
      return response.data;
    },
    enabled: enabled && (!!questTemplateId || !!questData),
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};
