/**
 * Holdout Quest Creation Hook
 *
 * Handles the business logic for creating and starting holdout quests.
 * Includes error handling and analytics. Navigation is NOT handled here:
 * arming the quest store makes NavigationGate push /pending-quest.
 */

import { usePostHog } from 'posthog-react-native';
import { useState } from 'react';

import { HOLDOUT_MIN_MINUTES } from '@/app/utils/quest-utils';
import { log } from '@/lib/services/logger.service';
import QuestTimer from '@/lib/services/quest-timer';
import { useQuestStore } from '@/store/quest-store';
import type { HoldoutQuestTemplate } from '@/store/types';

import {
  ANALYTICS_EVENTS,
  ERROR_MESSAGE_QUEST_CREATION_FAILED,
} from '../constants';

interface HoldoutQuestCreationState {
  isCreating: boolean;
  error: string | null;
}

export function useHoldoutQuestCreation() {
  const posthog = usePostHog();
  const [creationState, setCreationState] = useState<HoldoutQuestCreationState>(
    {
      isCreating: false,
      error: null,
    }
  );

  /**
   * Create a holdout quest and start it
   */
  const createQuest = async (category: string): Promise<void> => {
    try {
      // Clear any previous errors
      setCreationState({ isCreating: true, error: null });

      // Track quest creation trigger
      posthog.capture(ANALYTICS_EVENTS.START_QUEST_TRIGGER);

      // Build holdout quest object
      const holdoutQuest: HoldoutQuestTemplate = {
        id: `holdout-${Date.now()}`,
        mode: 'holdout',
        title: 'Hold Out',
        durationMinutes: HOLDOUT_MIN_MINUTES,
        category,
        reward: { xp: 0 },
      };

      // Update quest store
      useQuestStore.getState().prepareQuest(holdoutQuest);

      // Prepare quest with background timer. No navigation here: prepareQuest
      // above arms NavigationGate, which owns the push to /pending-quest.
      await QuestTimer.prepareQuest(holdoutQuest);

      // Update state
      setCreationState({ isCreating: false, error: null });
    } catch (error) {
      // Log error with context
      log.error('Failed to create holdout quest', {
        category,
        error: error instanceof Error ? error.message : String(error),
      });

      // Update state with error
      setCreationState({
        isCreating: false,
        error: ERROR_MESSAGE_QUEST_CREATION_FAILED,
      });
    }
  };

  return {
    createQuest,
    isCreating: creationState.isCreating,
    error: creationState.error,
  };
}
