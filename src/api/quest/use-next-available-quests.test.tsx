import {
  focusManager,
  notifyManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import { apiClient } from '../common';
import {
  STALE_POLL_INTERVAL_MS,
  STALE_POLL_MAX_ATTEMPTS,
  useNextAvailableQuests,
} from './use-next-available-quests';

jest.mock('../common', () => ({
  apiClient: { get: jest.fn() },
}));
jest.mock('../common/provisional-client', () => ({
  provisionalApiClient: { get: jest.fn() },
}));
jest.mock('@/lib/storage', () => ({ getItem: jest.fn(() => null) }));

const mockGet = apiClient.get as jest.Mock;

const response = (customIds: string[]) => ({
  data: {
    quests: customIds.map((customId) => ({ customId })),
    hasMoreQuests: true,
    storylineComplete: false,
  },
});

// Advance well past the poll cap, settling each in-flight fetch so the next
// interval can re-arm.
const exhaustPolling = async () => {
  for (let i = 0; i < STALE_POLL_MAX_ATTEMPTS + 3; i++) {
    await act(async () => {
      jest.advanceTimersByTime(STALE_POLL_INTERVAL_MS);
    });
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useNextAvailableQuests after a completion', () => {
  beforeAll(() => {
    // React Query batches notifications via setTimeout(0); under fake timers
    // that never fires, so flush synchronously.
    notifyManager.setScheduler((cb) => cb());
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ advanceTimers: true });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('refetches until the just-completed quest is no longer offered', async () => {
    mockGet
      .mockResolvedValueOnce(response(['quest-1a', 'quest-1b']))
      .mockResolvedValueOnce(response(['quest-2']));

    const { result } = renderHook(
      () => useNextAvailableQuests({ lastCompletedQuestId: 'quest-1a' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockGet).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(STALE_POLL_INTERVAL_MS);
    });
    await waitFor(() =>
      expect(result.current.data?.quests).toEqual([{ customId: 'quest-2' }])
    );
    expect(mockGet).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(STALE_POLL_INTERVAL_MS * 3);
    });
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('does not poll when the response is already fresh', async () => {
    mockGet.mockResolvedValue(response(['quest-2']));

    const { result } = renderHook(
      () => useNextAvailableQuests({ lastCompletedQuestId: 'quest-1a' }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.data).toBeDefined());

    await act(async () => {
      jest.advanceTimersByTime(STALE_POLL_INTERVAL_MS * 3);
    });
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('starts polling again when a different quest is completed', async () => {
    mockGet.mockResolvedValue(response(['quest-1a', 'quest-1b']));

    const { result, rerender } = renderHook(
      ({ lastCompletedQuestId }: { lastCompletedQuestId: string }) =>
        useNextAvailableQuests({ lastCompletedQuestId }),
      {
        wrapper: createWrapper(),
        initialProps: { lastCompletedQuestId: 'quest-1a' },
      }
    );
    await waitFor(() => expect(result.current.data).toBeDefined());
    await exhaustPolling();
    const callsAfterFirstCap = mockGet.mock.calls.length;
    expect(callsAfterFirstCap).toBe(1 + STALE_POLL_MAX_ATTEMPTS);

    // Server now says quest-1b is the only option; user completes it.
    mockGet.mockResolvedValue(response(['quest-1b']));
    rerender({ lastCompletedQuestId: 'quest-1b' });
    await act(async () => {
      jest.advanceTimersByTime(STALE_POLL_INTERVAL_MS);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGet.mock.calls.length).toBeGreaterThan(callsAfterFirstCap);
  });

  it('refetches when the app comes back to the foreground, even if cached data is fresh', async () => {
    mockGet.mockResolvedValue(response(['quest-2']));

    const { result } = renderHook(
      () => useNextAvailableQuests({ lastCompletedQuestId: 'quest-1a' }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockGet).toHaveBeenCalledTimes(1);

    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  });

  it('gives up after the attempt cap if the server never catches up', async () => {
    mockGet.mockResolvedValue(response(['quest-1a', 'quest-1b']));

    const { result } = renderHook(
      () => useNextAvailableQuests({ lastCompletedQuestId: 'quest-1a' }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.data).toBeDefined());

    await exhaustPolling();
    expect(mockGet).toHaveBeenCalledTimes(1 + STALE_POLL_MAX_ATTEMPTS);
  });
});
