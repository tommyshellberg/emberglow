import { useRouter } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback } from 'react';

import { type QuestOption, type QuestTemplate } from '@/api/quest/types';
import { AVAILABLE_QUESTS } from '@/app/data/quests';
import QuestTimer from '@/lib/services/quest-timer';
import { useQuestStore } from '@/store/quest-store';
import { type LocalQuestTemplate } from '@/store/types';

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
  const prepareQuest = useQuestStore((state) => state.prepareQuest);

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
        prepareQuest(clientQuest as LocalQuestTemplate);

        try {
          // No navigation here: prepareQuest above arms NavigationGate, which
          // has already pushed /pending-quest by the time this await resolves.
          await QuestTimer.prepareQuest(clientQuest as LocalQuestTemplate);
          posthog.capture('success_start_quest');
        } catch (error) {
          console.error(
            '[useQuestSelection] QuestTimer.prepareQuest failed:',
            error
          );
          throw error;
        }
      } else {
        // Fallback to local quest data
        const localQuest = AVAILABLE_QUESTS.find(
          (quest) => quest.id === nextQuestId
        );

        if (localQuest) {
          posthog.capture('trigger_start_quest');
          // As above: prepareQuest arms NavigationGate, which owns the push.
          prepareQuest(localQuest);
          await QuestTimer.prepareQuest(localQuest);
          posthog.capture('success_start_quest');
        }
      }
    },
    [serverQuests, serverOptions, prepareQuest, posthog]
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

  const handleStartHoldoutQuest = useCallback(() => {
    try {
      router.push('/holdout-quest');
    } catch (error) {
      console.error(
        '[useQuestSelection] Error navigating to holdout quest:',
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
    handleStartHoldoutQuest,
  };
}
