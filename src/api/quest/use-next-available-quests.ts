import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { getItem } from '@/lib/storage';

import { apiClient } from '../common';
import { provisionalApiClient } from '../common/provisional-client';
import { isNextQuestsResponseStale } from './is-next-quests-response-stale';
import type { NextAvailableQuestsResponse } from './types';

// The server marks a quest complete on its own scheduled job, not when the
// client's timer ends. A refetch fired right after local completion can land
// before that job runs and get the old options back. While the response still
// offers the quest the user just completed, poll briefly for the server to
// catch up. Typical skew is well under a second; the cap keeps a never-catching-up
// server (e.g. a dropped job) from polling forever.
export const STALE_POLL_INTERVAL_MS = 2000;
export const STALE_POLL_MAX_ATTEMPTS = 5;

interface UseNextAvailableQuestsOptions {
  storylineId?: string;
  includeOptions?: boolean;
  enabled?: boolean;
  /** customId of the story quest most recently completed on this device. */
  lastCompletedQuestId?: string;
}

export const useNextAvailableQuests = ({
  storylineId = 'vaedros',
  includeOptions = true,
  enabled = true,
  lastCompletedQuestId,
}: UseNextAvailableQuestsOptions = {}) => {
  // Fetches since the last local completion. Counted in queryFn (once per
  // request) rather than in refetchInterval, which runs on every state update.
  const fetchesSinceCompletion = useRef(0);
  useEffect(() => {
    fetchesSinceCompletion.current = 0;
  }, [lastCompletedQuestId]);

  return useQuery<NextAvailableQuestsResponse>({
    queryKey: ['next-available-quests', storylineId, includeOptions],
    queryFn: async () => {
      fetchesSinceCompletion.current += 1;
      const params = new URLSearchParams({
        storylineId,
        includeOptions: includeOptions.toString(),
      });

      // Check if we're using a provisional user
      const hasProvisionalToken = !!getItem('provisionalAccessToken');
      const client = hasProvisionalToken ? provisionalApiClient : apiClient;

      const response = await client.get(
        `/quest-templates/next-available?${params.toString()}`
      );
      return response.data;
    },
    enabled,
    refetchInterval: (query) => {
      const stale = isNextQuestsResponseStale(
        query.state.data,
        lastCompletedQuestId
      );
      // The first fetch after completion is not a poll; allow MAX polls after it.
      if (!stale || fetchesSinceCompletion.current > STALE_POLL_MAX_ATTEMPTS) {
        return false;
      }
      return STALE_POLL_INTERVAL_MS;
    },
    // Always refetch when the app returns to the foreground (focusManager is
    // bound to AppState in api-provider) so a quest finished while the app was
    // backgrounded shows fresh options on return.
    refetchOnWindowFocus: 'always',
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 3, // Limit retries to 3 attempts
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};
