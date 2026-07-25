import { useQuery } from '@tanstack/react-query';

import {
  type DiscoverParams,
  discoverScheduledQuests,
} from '@/lib/services/scheduled-quest-service';

export const useDiscoverScheduledQuests = (params?: DiscoverParams) =>
  useQuery({
    queryKey: ['scheduled-quests', 'discover', params ?? {}],
    queryFn: async () => (await discoverScheduledQuests(params)).results,
    refetchInterval: 30_000,
    refetchOnMount: 'always', // never mask an event another device just created
  });
