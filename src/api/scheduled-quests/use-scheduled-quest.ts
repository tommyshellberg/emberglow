import { useQuery } from '@tanstack/react-query';

import { getScheduledQuest } from '@/lib/services/scheduled-quest-service';

export const useScheduledQuest = (questRunId: string | undefined) =>
  useQuery({
    queryKey: ['scheduled-quests', 'detail', questRunId],
    queryFn: () => getScheduledQuest(questRunId as string),
    enabled: !!questRunId,
    // Polling backstop for missed socket events (backgrounded app, room-join
    // races). The room hook invalidates for instant updates.
    refetchInterval: 15_000,
  });
