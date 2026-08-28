import type { NextAvailableQuestsResponse } from './types';

/**
 * The server only advances the story when its own scheduled job fires at the
 * quest's end time. The client's timer fires on its own clock, so a refetch
 * right after local completion can land before the server has caught up and
 * return the options the user already chose from. That response is "stale":
 * the quest the user just finished is still being offered as a next step.
 */
export function isNextQuestsResponseStale(
  data: NextAvailableQuestsResponse | undefined,
  lastCompletedQuestId: string | undefined
): boolean {
  if (!data || !lastCompletedQuestId) return false;
  return data.quests.some((quest) => quest.customId === lastCompletedQuestId);
}
