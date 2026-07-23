import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/api';
import { provisionalApiClient } from '@/api/common/provisional-client';
import { getProvisionalAccessToken } from '@/api/token';

export interface ReflectionData {
  questRunId: string;
  mood?: number;
  text?: string;
  activities?: string[];
}

export interface QuestReflectionResponse {
  id: string;
  questRunId: string;
  userId: string;
  mood?: number;
  text?: string;
  activities?: string[];
  createdAt: string;
  updatedAt: string;
}

export async function createQuestReflection(
  reflectionData: ReflectionData
): Promise<QuestReflectionResponse> {
  try {
    console.log('[createQuestReflection] Creating reflection:', reflectionData);

    // Check if we're using a provisional user
    const hasProvisionalToken = !!getProvisionalAccessToken();
    const client = hasProvisionalToken ? provisionalApiClient : apiClient;

    const response = await client.post<QuestReflectionResponse>(
      '/quest-reflections/',
      reflectionData
    );

    console.log(
      '[createQuestReflection] Reflection created:',
      response.data.id
    );
    return response.data;
  } catch (error) {
    console.error(
      '[createQuestReflection] Failed to create reflection:',
      error
    );
    throw error;
  }
}

export async function getQuestReflection(
  questRunId: string
): Promise<QuestReflectionResponse | null> {
  try {
    const hasProvisionalToken = !!getProvisionalAccessToken();
    const client = hasProvisionalToken ? provisionalApiClient : apiClient;

    const response = await client.get<QuestReflectionResponse>(
      '/quest-reflections/',
      {
        params: { questRunId },
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error('[getQuestReflection] Failed to get reflection:', error);
    throw error;
  }
}

// React Query hook for fetching quest reflections
export function useQuestReflection(questRunId: string | undefined) {
  return useQuery({
    queryKey: ['quest-reflection', questRunId],
    queryFn: () => getQuestReflection(questRunId!),
    enabled: !!questRunId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// React Query mutation hook for creating quest reflections
export function useCreateQuestReflection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createQuestReflection,
    onSuccess: (data) => {
      // Invalidate the specific reflection query
      queryClient.invalidateQueries({
        queryKey: ['quest-reflection', data.questRunId],
      });
      // Also invalidate any list queries if we have them
      queryClient.invalidateQueries({
        queryKey: ['quest-reflections'],
      });
    },
  });
}
