import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useScheduledQuestsStore } from '@/store/scheduled-quests-store';

import {
  useJoinScheduledQuest,
  useLeaveScheduledQuest,
} from './use-scheduled-quest-mutations';

jest.mock('@/lib/services/scheduled-quest-service', () => ({
  joinScheduledQuest: jest.fn().mockResolvedValue({ id: 'r1', status: 'pending' }),
  leaveScheduledQuest: jest.fn().mockResolvedValue(undefined),
}));

describe('useJoinScheduledQuest', () => {
  it('joins then invalidates scheduled-quests queries', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useJoinScheduledQuest(), { wrapper });
    act(() => {
      result.current.mutate('r1');
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['scheduled-quests'] });
  });
});

describe('useLeaveScheduledQuest', () => {
  it('removes the registration by the mutation input variable, then invalidates', async () => {
    useScheduledQuestsStore.getState().setMyRegistrations([
      {
        id: 'r1',
        status: 'pending',
        scheduledStartAt: '2030-01-01T05:00:00.000Z',
        completionPolicy: 'individual',
        visibility: 'public',
        maxParticipants: 10,
        quest: {
          title: 't',
          category: 'fitness',
          durationMinutes: 60,
          mode: 'cooperative',
          reward: { xp: 180 },
        },
        participants: [],
      },
    ]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useLeaveScheduledQuest(), { wrapper });
    act(() => {
      result.current.mutate('r1');
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      useScheduledQuestsStore.getState().myRegistrations.map((r) => r.id)
    ).not.toContain('r1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['scheduled-quests'] });
  });
});
