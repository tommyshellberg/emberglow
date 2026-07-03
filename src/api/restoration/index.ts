import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/api';
import { provisionalApiClient } from '@/api/common/provisional-client';
import { getItem } from '@/lib/storage';

export type RestorationBody = {
  challenges: string[];
  challengeText?: string;
  journalText?: string;
  commitmentHour: number;
  commitmentMinute: number;
};
export type RestorationResponse = {
  id: string;
  restorationNumber: number;
  spiritRestoredAt: string;
  restorationCount: number;
  spirit: number;
};

export async function createRestoration(
  body: RestorationBody
): Promise<RestorationResponse> {
  const client = getItem('provisionalAccessToken')
    ? provisionalApiClient
    : apiClient;
  const res = await client.post<RestorationResponse>('/restorations/', body);
  return res.data;
}

export function useCreateRestoration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRestoration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'details'] as const });
    },
  });
}
