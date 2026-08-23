import { useRouter } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { type QuestOption, type QuestTemplate } from '@/api/quest/types';
import { AVAILABLE_QUESTS } from '@/app/data/quests';
import QuestTimer from '@/lib/services/quest-timer';
import {
  type CustomQuestTemplate,
  type StoryQuestTemplate,
} from '@/store/types';

// The server-provided quest shape (matches the API's QuestTemplate, which
// already carries the story-specific fields like poiSlug/story/recap/options
// as well as durationMinutes/reward needed by LocalQuestTemplate).
type ServerQuest = QuestTemplate;

interface UseQuestSelectionProps {
  serverQuests: ServerQuest[];
  serverOptions: QuestOption[];
}

export function useQuestSelection({
  serverQuests,
  serverOptions,
}: UseQuestSelectionProps) {
  const router = useRouter();
  const posthog = usePostHog();

  // startPresenceQuest refuses to start without a server run (a presence run
  // with no questRunId can never complete). The tap handlers discard this
  // promise, so the failure must be shown here or the user sees nothing.
  const startPresenceQuestOrAlert = useCallback(
    async (template: StoryQuestTemplate | CustomQuestTemplate) => {
      try {
        await QuestTimer.startPresenceQuest(template);
        posthog.capture('success_start_quest');
      } catch (error) {
        console.error(
          '[useQuestSelection] QuestTimer.startPresenceQuest failed:',
          error
        );
        posthog.capture('start_quest_failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        Alert.alert(
          "Couldn't start the quest",
          'Check your connection and try again.'
        );
      }
    },
    [posthog]
  );

  const handleQuestOptionSelect = useCallback(
    async (nextQuestId: string | null) => {
      posthog.capture('try_trigger_start_quest');

      if (!nextQuestId) {
        return;
      }

      // First check if this is an option quest (from serverOptions)
      let selectedQuest = null;
      const selectedOption = serverOptions.find(
        (opt) => opt.nextQuestId === nextQuestId
      );

      if (selectedOption && selectedOption.nextQuest) {
        selectedQuest = selectedOption.nextQuest;
      } else {
        // Then check server quests
        selectedQuest = serverQuests.find(
          (quest) => quest.customId === nextQuestId
        );
      }

      // Convert server quest to client format if found
      if (selectedQuest) {
        const clientQuest = {
          ...selectedQuest,
          id: selectedQuest.customId,
          _id: selectedQuest._id, // Preserve MongoDB ID
          mode: (selectedQuest.mode as 'story' | 'custom') || 'story',
        };

        posthog.capture('trigger_start_quest');

        // Presence runs start immediately on tap - no more waiting for phone
        // lock. Navigation to the active-quest screen is wired by the
        // resolver in a later task.
        // Solo runs only: mode is forced to 'story' | 'custom' above, so the
        // cooperative arm of LocalQuestTemplate is excluded by construction.
        await startPresenceQuestOrAlert(
          clientQuest as StoryQuestTemplate | CustomQuestTemplate
        );
      } else {
        // Fallback to local quest data
        const localQuest = AVAILABLE_QUESTS.find(
          (quest) => quest.id === nextQuestId
        );

        if (localQuest) {
          posthog.capture('trigger_start_quest');
          await startPresenceQuestOrAlert(localQuest);
        }
      }
    },
    [serverQuests, serverOptions, posthog, startPresenceQuestOrAlert]
  );

  const handleStartCustomQuest = useCallback(() => {
    try {
      router.push('/custom-quest');
    } catch (error) {
      console.error(
        '[useQuestSelection] Error navigating to custom quest:',
        error
      );
    }
  }, [router]);

  const handleCooperativeQuest = useCallback(() => {
    try {
      posthog.capture('cooperative_quest_card_clicked');
      router.push('/cooperative-quest-menu');
    } catch (error) {
      console.error(
        '[useQuestSelection] Error navigating to cooperative quest menu:',
        error
      );
    }
  }, [router, posthog]);

  return {
    handleQuestOptionSelect,
    handleStartCustomQuest,
    handleCooperativeQuest,
  };
}
