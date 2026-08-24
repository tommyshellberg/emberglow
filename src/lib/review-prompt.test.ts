import * as StoreReview from 'expo-store-review';

import { posthogClient } from '@/lib/posthog';
import { maybeRequestStoreReview } from '@/lib/review-prompt';
import { useQuestStore } from '@/store/quest-store';
import { useReviewPromptStore } from '@/store/review-prompt-store';

const mockHasAction = jest.mocked(StoreReview.hasAction);
const mockRequestReview = jest.mocked(StoreReview.requestReview);

// Only .length is read from completedQuests — minimal casts are fine.
const quests = (count: number) => Array(count).fill({}) as never[];

describe('maybeRequestStoreReview', () => {
  let captureSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasAction.mockResolvedValue(true);
    mockRequestReview.mockResolvedValue(undefined);
    useQuestStore.setState({ completedQuests: quests(5) });
    useReviewPromptStore.setState({ lastRequestedAt: null });
    captureSpy = jest.spyOn(posthogClient, 'capture').mockImplementation();
  });

  afterEach(() => {
    captureSpy.mockRestore();
  });

  it('does nothing when the eligibility gate is closed', async () => {
    useQuestStore.setState({ completedQuests: quests(2) });

    await maybeRequestStoreReview();

    expect(mockRequestReview).not.toHaveBeenCalled();
    expect(useReviewPromptStore.getState().lastRequestedAt).toBeNull();
    expect(captureSpy).not.toHaveBeenCalled();
  });

  it('does nothing when the platform has no review action', async () => {
    mockHasAction.mockResolvedValue(false);

    await maybeRequestStoreReview();

    expect(mockRequestReview).not.toHaveBeenCalled();
    expect(useReviewPromptStore.getState().lastRequestedAt).toBeNull();
  });

  it('requests a review, records the timestamp, and fires analytics when eligible', async () => {
    await maybeRequestStoreReview();

    expect(mockRequestReview).toHaveBeenCalledTimes(1);
    expect(useReviewPromptStore.getState().lastRequestedAt).not.toBeNull();
    expect(captureSpy).toHaveBeenCalledWith('review_prompt_requested', {
      completedQuestCount: 5,
    });
  });

  it('records the timestamp BEFORE calling requestReview', async () => {
    // If requestReview throws mid-call on a real device, the timestamp must
    // already be stored — otherwise the user is re-prompted on every quest.
    let timestampAtCallTime: number | null = null;
    mockRequestReview.mockImplementation(async () => {
      timestampAtCallTime = useReviewPromptStore.getState().lastRequestedAt;
    });

    await maybeRequestStoreReview();

    expect(timestampAtCallTime).not.toBeNull();
  });

  it('swallows errors from the native module', async () => {
    mockRequestReview.mockRejectedValue(new Error('native boom'));

    await expect(maybeRequestStoreReview()).resolves.toBeUndefined();
  });

  it('respects the cooldown recorded by a previous run', async () => {
    await maybeRequestStoreReview();
    mockRequestReview.mockClear();

    await maybeRequestStoreReview();

    expect(mockRequestReview).not.toHaveBeenCalled();
  });
});
