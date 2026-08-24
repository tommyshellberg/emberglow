import {
  MIN_COMPLETED_QUESTS,
  REVIEW_COOLDOWN_MS,
  shouldRequestReview,
  useReviewPromptStore,
} from '@/store/review-prompt-store';

const DAY_MS = 24 * 60 * 60 * 1000;
// Arbitrary fixed "now". Not derived from Date.now() so tests are deterministic.
const NOW = 1_756_000_000_000;

describe('shouldRequestReview', () => {
  it('returns false below the quest threshold even with no prior request', () => {
    expect(
      shouldRequestReview({
        completedQuestCount: 2,
        lastRequestedAt: null,
        now: NOW,
      })
    ).toBe(false);
  });

  it('returns true at exactly the quest threshold with no prior request', () => {
    expect(
      shouldRequestReview({
        completedQuestCount: MIN_COMPLETED_QUESTS,
        lastRequestedAt: null,
        now: NOW,
      })
    ).toBe(true);
  });

  it('returns false when the cooldown has not elapsed', () => {
    expect(
      shouldRequestReview({
        completedQuestCount: 5,
        lastRequestedAt: NOW - (REVIEW_COOLDOWN_MS - DAY_MS),
        now: NOW,
      })
    ).toBe(false);
  });

  it('returns true when the cooldown has exactly elapsed', () => {
    expect(
      shouldRequestReview({
        completedQuestCount: 5,
        lastRequestedAt: NOW - REVIEW_COOLDOWN_MS,
        now: NOW,
      })
    ).toBe(true);
  });

  it('returns false when below threshold even though the cooldown elapsed', () => {
    expect(
      shouldRequestReview({
        completedQuestCount: 2,
        lastRequestedAt: NOW - (REVIEW_COOLDOWN_MS + DAY_MS),
        now: NOW,
      })
    ).toBe(false);
  });
});

describe('useReviewPromptStore', () => {
  it('starts with no recorded request and records the given timestamp', () => {
    expect(useReviewPromptStore.getState().lastRequestedAt).toBeNull();
    useReviewPromptStore.getState().recordReviewRequested(NOW);
    expect(useReviewPromptStore.getState().lastRequestedAt).toBe(NOW);
  });
});
