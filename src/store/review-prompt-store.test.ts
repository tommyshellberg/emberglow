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

  it('REVIEW_COOLDOWN_MS is exactly 90 days', () => {
    // Hardcoded literal to catch arithmetic mutations in the constant definition
    expect(REVIEW_COOLDOWN_MS).toBe(7_776_000_000);
  });

  it('returns true for null lastRequestedAt with small elapsed time', () => {
    // Use small 'now' value where the fallback calculation would return false.
    // This isolates the null-branch behavior: if the mutation removes the
    // early return (if (lastRequestedAt === null)), the test fails because
    // small_now - 0 >= REVIEW_COOLDOWN_MS would be false.
    expect(
      shouldRequestReview({
        completedQuestCount: 3,
        lastRequestedAt: null,
        now: 1000, // Far less than REVIEW_COOLDOWN_MS
      })
    ).toBe(true);
  });

  it('kills arithmetic mutations: one ms before cooldown boundary', () => {
    // Hardcoded millisecond literal independent of REVIEW_COOLDOWN_MS import.
    // If constant arithmetic is wrong, this test fails because the boundary
    // moves.
    const ninetyDaysMs = 7_776_000_000;
    expect(
      shouldRequestReview({
        completedQuestCount: 5,
        lastRequestedAt: NOW - (ninetyDaysMs - 1),
        now: NOW,
      })
    ).toBe(false);
  });

  it('kills arithmetic mutations: exactly at cooldown boundary with hardcoded value', () => {
    // Hardcoded millisecond literal to catch mutations.
    const ninetyDaysMs = 7_776_000_000;
    expect(
      shouldRequestReview({
        completedQuestCount: 5,
        lastRequestedAt: NOW - ninetyDaysMs,
        now: NOW,
      })
    ).toBe(true);
  });
});

describe('useReviewPromptStore', () => {
  it('starts with no recorded request and records the given timestamp', () => {
    expect(useReviewPromptStore.getState().lastRequestedAt).toBeNull();
    useReviewPromptStore.getState().recordReviewRequested(NOW);
    expect(useReviewPromptStore.getState().lastRequestedAt).toBe(NOW);
  });
});
