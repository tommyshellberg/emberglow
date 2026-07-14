import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useWebSocket } from '@/components/providers/websocket-provider';
import {
  type QuestCancelledPayload,
  type QuestSettledPayload,
} from '@/lib/services/websocket-events.types';
import { useScheduledQuestsStore } from '@/store/scheduled-quests-store';

interface Options {
  onCancelled?: (payload: QuestCancelledPayload) => void;
}

/**
 * Scoped questRun-room subscription for the event screen. Joins the socket
 * room while mounted and turns room events into query invalidations (the
 * joined/left payloads carry no display data, so refetch beats upsert).
 * Only participants pass the server's room gate - for non-participants the
 * join is harmless (server replies `quest:error`) and the detail query's
 * 15s poll covers them. `questStarted` also arrives on the per-user room,
 * so participants get it even if the room join raced.
 */
export function useScheduledQuestRoom(
  questRunId: string | undefined,
  options?: Options
) {
  const {
    isConnected,
    joinQuestRoom,
    leaveQuestRoom,
    addListener,
    removeListener,
  } = useWebSocket();
  const queryClient = useQueryClient();
  const recordSettlement = useScheduledQuestsStore((s) => s.recordSettlement);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!questRunId || !isConnected) return;

    joinQuestRoom(questRunId);

    const forThisRun =
      (handler: (payload: any) => void) =>
      (payload: { questRunId?: string }) => {
        if (payload?.questRunId === questRunId) handler(payload);
      };
    const invalidate = () =>
      queryClient.invalidateQueries({
        queryKey: ['scheduled-quests', 'detail', questRunId],
      });

    const handlers: [string, (payload: any) => void][] = [
      ['quest:participant-joined', forThisRun(invalidate)],
      ['quest:participant-left', forThisRun(invalidate)],
      ['quest:participant-failed', forThisRun(invalidate)],
      ['questStarted', forThisRun(invalidate)],
      [
        'quest:settled',
        forThisRun((payload: QuestSettledPayload) => {
          recordSettlement(payload);
          invalidate();
        }),
      ],
      [
        'quest:cancelled',
        forThisRun((payload: QuestCancelledPayload) => {
          invalidate();
          optionsRef.current?.onCancelled?.(payload);
        }),
      ],
    ];
    handlers.forEach(([event, handler]) => addListener(event, handler));

    return () => {
      handlers.forEach(([event, handler]) => removeListener(event, handler));
      leaveQuestRoom(questRunId);
    };
  }, [
    questRunId,
    isConnected,
    joinQuestRoom,
    leaveQuestRoom,
    addListener,
    removeListener,
    queryClient,
    recordSettlement,
  ]);
}
