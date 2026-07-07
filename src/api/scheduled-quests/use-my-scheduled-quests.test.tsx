import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useScheduledQuestsStore } from '@/store/scheduled-quests-store';

import { useMyScheduledQuests } from './use-my-scheduled-quests';

jest.mock('@/lib/services/scheduled-quest-service', () => ({
  getMyScheduledQuests: jest.fn().mockResolvedValue({
    results: [
      {
        id: 'r1',
        status: 'pending',
        scheduledStartAt: '2030-01-01T05:00:00.000Z',
        quest: {
          title: 't',
          category: 'fitness',
          durationMinutes: 60,
          mode: 'cooperative',
          reward: { xp: 180 },
        },
        participants: [],
        completionPolicy: 'individual',
        visibility: 'public',
        maxParticipants: 10,
      },
    ],
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMyScheduledQuests', () => {
  it('fetches and syncs registrations into the store', async () => {
    useScheduledQuestsStore.getState().reset();
    const { result } = renderHook(() => useMyScheduledQuests(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(
      useScheduledQuestsStore.getState().myRegistrations.map((r) => r.id)
    ).toEqual(['r1']);
  });
});
