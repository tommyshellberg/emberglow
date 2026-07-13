import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  cancelScheduledQuest,
  createScheduledQuest,
  type CreateScheduledQuestInput,
  joinScheduledQuest,
  kickParticipant,
  leaveScheduledQuest,
} from '@/lib/services/scheduled-quest-service';
import { useScheduledQuestsStore } from '@/store/scheduled-quests-store';

const useInvalidateScheduledQuests = () => {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ['scheduled-quests'] });
};

export const useCreateScheduledQuest = () => {
  const invalidate = useInvalidateScheduledQuests();
  const upsertRegistration = useScheduledQuestsStore(
    (s) => s.upsertRegistration
  );
  return useMutation({
    mutationFn: (input: CreateScheduledQuestInput) =>
      createScheduledQuest(input),
    onSuccess: (run) => {
      upsertRegistration(run);
      invalidate();
    },
  });
};

export const useJoinScheduledQuest = () => {
  const invalidate = useInvalidateScheduledQuests();
  const upsertRegistration = useScheduledQuestsStore(
    (s) => s.upsertRegistration
  );
  return useMutation({
    mutationFn: (questRunId: string) => joinScheduledQuest(questRunId),
    onSuccess: (run) => {
      upsertRegistration(run);
      invalidate();
    },
  });
};

export const useLeaveScheduledQuest = () => {
  const invalidate = useInvalidateScheduledQuests();
  const removeRegistration = useScheduledQuestsStore(
    (s) => s.removeRegistration
  );
  return useMutation({
    mutationFn: (questRunId: string) => leaveScheduledQuest(questRunId),
    onSuccess: (_void, questRunId) => {
      removeRegistration(questRunId);
      invalidate();
    },
  });
};

export const useCancelScheduledQuest = () => {
  const invalidate = useInvalidateScheduledQuests();
  const removeRegistration = useScheduledQuestsStore(
    (s) => s.removeRegistration
  );
  return useMutation({
    mutationFn: (questRunId: string) => cancelScheduledQuest(questRunId),
    onSuccess: (_void, questRunId) => {
      removeRegistration(questRunId);
      invalidate();
    },
  });
};

export const useKickParticipant = () => {
  const invalidate = useInvalidateScheduledQuests();
  return useMutation({
    mutationFn: ({
      questRunId,
      userId,
    }: {
      questRunId: string;
      userId: string;
    }) => kickParticipant(questRunId, userId),
    onSuccess: () => invalidate(),
  });
};
