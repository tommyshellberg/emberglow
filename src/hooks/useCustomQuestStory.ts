import { useMemo } from 'react';

import type { QuestWithMode } from '@/components/quest-complete/types';
import { getCompletionStory } from '@/lib/utils/completion-story';

/**
 * Memoized category-matched vignette for custom and hold-out quests.
 * Returns null for other modes (story quests pass their authored story to
 * the completion screen separately). Thin wrapper over getCompletionStory,
 * which owns the matching rules.
 */
export function useCustomQuestStory(quest: QuestWithMode): string | null {
  return useMemo(() => {
    if (quest.mode !== 'custom' && quest.mode !== 'holdout') {
      return null;
    }
    return getCompletionStory(quest);
  }, [quest]);
}
