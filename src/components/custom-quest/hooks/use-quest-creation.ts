/**
 * Quest Creation Hook
 *
 * Handles the business logic for creating and starting custom quests.
 * Includes XP calculation, API calls, error handling with Sentry, and
 * analytics. Navigation is not handled here: `startPresenceQuest` activates
 * the quest and the resolver/NavigationGate routes to `/active-quest`.
 */

import { usePostHog } from 'posthog-react-native';
import { useState } from 'react';

import { log } from '@/lib/services/logger.service';
import QuestTimer from '@/lib/services/quest-timer';
import type { CustomQuestTemplate } from '@/store/types';

import {
  ANALYTICS_EVENTS,
  ERROR_MESSAGE_QUEST_CREATION_FAILED,
} from '../constants';
import type { CustomQuestFormData, QuestCreationState } from '../types';
import { calculateQuestXP } from '../utils';

export function useQuestCreation() {
  const posthog = usePostHog();
  const [creationState, setCreationState] = useState<QuestCreationState>({
    isCreating: false,
    error: null,
  });

  /**
   * Create a custom quest and start it
   */
  const createQuest = async (formData: CustomQuestFormData): Promise<void> => {
    try {
      // Clear any previous errors
      setCreationState({ isCreating: true, error: null });

      // Track quest creation trigger
      posthog.capture(ANALYTICS_EVENTS.START_QUEST_TRIGGER);

      // Calculate XP reward
      const xpReward = calculateQuestXP(formData.questDuration);

      // Build custom quest object
      const customQuest: CustomQuestTemplate = {
        id: `custom-${Date.now()}`,
        mode: 'custom',
        title: formData.questName,
        durationMinutes: formData.questDuration,
        category: formData.questCategory,
        reward: {
          xp: xpReward,
        },
      };

      // Presence runs start immediately on tap - no more waiting for phone
      // lock. Navigation to the active-quest screen is wired by the
      // resolver in a later task.
      await QuestTimer.startPresenceQuest(customQuest);

      // Track success
      posthog.capture(ANALYTICS_EVENTS.START_QUEST_SUCCESS);

      // Update state
      setCreationState({ isCreating: false, error: null });
    } catch (error) {
      // Log error to Sentry with context
      log.error('Failed to create custom quest', {
        questName: formData.questName,
        duration: formData.questDuration,
        category: formData.questCategory,
        error: error instanceof Error ? error.message : String(error),
      });

      // Track error in analytics
      posthog.capture(ANALYTICS_EVENTS.START_QUEST_ERROR, {
        error: error instanceof Error ? error.message : String(error),
      });

      // Update state with error
      setCreationState({
        isCreating: false,
        error: ERROR_MESSAGE_QUEST_CREATION_FAILED,
      });
    }
  };

  /**
   * Clear error state (for dismissing error message or retrying)
   */
  const clearError = () => {
    setCreationState((prev) => ({ ...prev, error: null }));
  };

  return {
    createQuest,
    clearError,
    isCreating: creationState.isCreating,
    error: creationState.error,
  };
}
