import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useJoinScheduledQuest } from './use-scheduled-quest-mutations';

jest.mock('@/lib/services/scheduled-quest-service', () => ({
  joinScheduledQuest: jest.fn().mockResolvedValue({ id: 'r1', status: 'pending' }),
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
