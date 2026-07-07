import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getMyScheduledQuests } from '@/lib/services/scheduled-quest-service';
import { useScheduledQuestsStore } from '@/store/scheduled-quests-store';

export const useMyScheduledQuests = () => {
  const setMyRegistrations = useScheduledQuestsStore(
    (s) => s.setMyRegistrations
  );
  const query = useQuery({
    queryKey: ['scheduled-quests', 'mine'],
    queryFn: async () => (await getMyScheduledQuests()).results,
    refetchOnMount: 'always', // spec §4: never trust stale registrations
  });
  useEffect(() => {
    if (query.data) setMyRegistrations(query.data);
  }, [query.data, setMyRegistrations]);
  return query;
};
