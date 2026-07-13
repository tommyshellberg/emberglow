import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import React from 'react';

import { useWebSocket } from '@/components/providers/websocket-provider';
import { useScheduledQuestsStore } from '@/store/scheduled-quests-store';

import { useScheduledQuestRoom } from './use-scheduled-quest-room';

jest.mock('@/components/providers/websocket-provider', () => ({
  useWebSocket: jest.fn(),
}));

describe('useScheduledQuestRoom', () => {
  const listeners: Record<string, (p: any) => void> = {};
  const mockWebSocket = {
    isConnected: true,
    joinQuestRoom: jest.fn(),
    leaveQuestRoom: jest.fn(),
    addListener: jest.fn((event: string, handler: (p: any) => void) => {
      listeners[event] = handler;
    }),
    removeListener: jest.fn(),
  };
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    (useWebSocket as jest.Mock).mockReturnValue(mockWebSocket);
    useScheduledQuestsStore.getState().reset();
  });

  it('joins the room and registers the event listeners', () => {
    renderHook(() => useScheduledQuestRoom('r1'), { wrapper });
    expect(mockWebSocket.joinQuestRoom).toHaveBeenCalledWith('r1');
    for (const event of [
      'quest:participant-joined',
      'quest:participant-left',
      'quest:participant-failed',
      'questStarted',
      'quest:settled',
      'quest:cancelled',
    ]) {
      expect(mockWebSocket.addListener).toHaveBeenCalledWith(
        event,
        expect.any(Function)
      );
    }
  });

  it('invalidates the detail query on roster events for this run only', () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useScheduledQuestRoom('r1'), { wrapper });
    listeners['quest:participant-joined']({
      questRunId: 'other',
      userId: 'u2',
      participantCount: 3,
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
    listeners['quest:participant-joined']({
      questRunId: 'r1',
      userId: 'u2',
      participantCount: 3,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['scheduled-quests', 'detail', 'r1'],
    });
  });

  it('records settlements and fires onCancelled', () => {
    const onCancelled = jest.fn();
    renderHook(() => useScheduledQuestRoom('r1', { onCancelled }), {
      wrapper,
    });
    const settlement = { questRunId: 'r1', completedAt: 'x', participants: [] };
    listeners['quest:settled'](settlement);
    expect(useScheduledQuestsStore.getState().settlements.r1).toEqual(
      settlement
    );
    listeners['quest:cancelled']({
      questRunId: 'r1',
      reason: 'creator_cancelled',
    });
    expect(onCancelled).toHaveBeenCalledWith({
      questRunId: 'r1',
      reason: 'creator_cancelled',
    });
  });

  it('cleans up listeners and leaves the room on unmount', () => {
    const { unmount } = renderHook(() => useScheduledQuestRoom('r1'), {
      wrapper,
    });
    unmount();
    expect(mockWebSocket.leaveQuestRoom).toHaveBeenCalledWith('r1');
    expect(mockWebSocket.removeListener).toHaveBeenCalledTimes(6);
  });
});
