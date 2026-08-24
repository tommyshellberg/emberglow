import * as StoreReview from 'expo-store-review';

import { posthogClient } from '@/lib/posthog';
import { useQuestStore } from '@/store/quest-store';
import {
  shouldRequestReview,
  useReviewPromptStore,
} from '@/store/review-prompt-store';

/**
 * Ask the OS for a native store-review dialog if the user is eligible.
 *
 * The OS decides whether the dialog actually appears (iOS caps it at ~3 per
 * 365 days) and never reports the outcome — so the analytics event means
 * "we asked the OS", nothing more. Never throws: a review prompt must not
 * be able to break the quest-complete celebration screen.
 */
export async function maybeRequestStoreReview(): Promise<void> {
  try {
    const completedQuestCount = useQuestStore.getState().completedQuests.length;
    const { lastRequestedAt, recordReviewRequested } =
      useReviewPromptStore.getState();

    if (
      !shouldRequestReview({
        completedQuestCount,
        lastRequestedAt,
        now: Date.now(),
      })
    ) {
      return;
    }

    if (!(await StoreReview.hasAction())) {
      return;
    }

    // Record BEFORE the native call: if requestReview dies mid-flight we
    // lose one opportunity instead of re-prompting on every completion.
    recordReviewRequested(Date.now());
    await StoreReview.requestReview();
    posthogClient.capture('review_prompt_requested', { completedQuestCount });
  } catch (error) {
    console.warn('[review-prompt] requestReview failed:', error);
  }
}
