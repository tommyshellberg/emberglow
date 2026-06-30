import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect } from 'react';

import {
  acceptInvitation,
  declineInvitation,
  getInvitationStatus,
} from '@/lib/services/invitation-service';
import {
  getQuestRunStatus,
  updateQuestRunStatus,
} from '@/lib/services/quest-run-service';
import { useQuestStore } from '@/store/quest-store';
import { useUserStore } from '@/store/user-store';

/**
 * Hook for managing invitation status polling
 */
export function useInvitationStatus(
  invitationId: string | undefined,
  enabled = true
) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['invitation', invitationId, 'status'],
    queryFn: async () => {
      if (!invitationId) return null;
      console.log(
        '[useInvitationStatus] Fetching status for invitation:',
        invitationId
      );
      const status = await getInvitationStatus(invitationId);
      console.log('[useInvitationStatus] Status response:', status);
      return status;
    },
    enabled: !!invitationId && enabled,
    refetchInterval: 5000, // Poll every 5 seconds as fallback
    refetchIntervalInBackground: true,
    staleTime: 1000, // Consider data stale after 1 second
  });
}

/**
 * Hook for managing quest run status polling
 */
export function useQuestRunStatus(
  questRunId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: ['questRun', questRunId],
    queryFn: () => (questRunId ? getQuestRunStatus(questRunId) : null),
    enabled: !!questRunId && enabled,
    refetchInterval: enabled ? 30000 : false, // Poll every 30 seconds as fallback
    refetchIntervalInBackground: true,
    staleTime: 1000, // Consider data stale after 1 second
  });
}

/**
 * Hook for accepting/declining invitations
 */
export function useInvitationActions() {
  const queryClient = useQueryClient();
  const setCurrentInvitation = useQuestStore(
    (state) => state.setCurrentInvitation
  );

  const acceptMutation = useMutation({
    mutationFn: acceptInvitation,
    onMutate: (invitationId) => {
      console.log(
        '[useInvitationActions] Starting accept invitation mutation for:',
        invitationId
      );
    },
    onSuccess: async (response) => {
      console.log(
        '[useInvitationActions] Accept invitation successful:',
        response
      );

      // Handle the response format from the server
      const questRunId =
        response.questRunId || (response as any).invitation?.questRunId;
      if (!questRunId) {
        throw new Error('No questRunId in invitation acceptance response');
      }

      // Fetch the quest run details to get complete quest data
      let questRun;
      try {
        questRun = await getQuestRunStatus(questRunId);
        console.log('[acceptInvitation] Quest run details:', questRun);
      } catch (error) {
        console.error(
          '[acceptInvitation] Failed to fetch quest run details:',
          error
        );
        throw error;
      }

      // Create a complete quest object for the invitee
      const questId =
        (questRun as any).questId ||
        questRun.quest?.id ||
        questRun.id ||
        `coop-${questRunId}`;
      console.log(
        '[acceptInvitation] Creating quest with ID:',
        questId,
        'from questRun:',
        questRun
      );

      const completeQuest: any = {
        id: questId,
        title: questRun.quest?.title || 'Cooperative Quest',
        durationMinutes: questRun.quest?.durationMinutes || 30,
        mode: questRun.quest?.mode || 'custom',
        category: questRun.quest?.category || 'general',
        reward: questRun.quest?.reward || {
          xp: Math.round((questRun.quest?.durationMinutes || 30) * 3),
        },
        inviteeIds: [], // Empty for invitee
      };

      // First set the cooperative quest run data
      if (questRun && questRun.participants) {
        // Determine the host ID - it's the first participant or we need to get it from somewhere else
        const firstParticipant = questRun.participants?.[0];
        const hostId =
          (typeof firstParticipant === 'string'
            ? firstParticipant
            : firstParticipant?.userId) || '';

        useQuestStore.getState().setCooperativeQuestRun({
          id: questRun.id,
          questId: questId,
          hostId: hostId,
          status: 'pending',
          participants: Array.isArray(questRun.participants)
            ? questRun.participants.map((p: any) =>
                typeof p === 'string'
                  ? { userId: p, ready: false, status: 'pending' }
                  : p
              )
            : [],
          invitationId:
            questRun.invitationId || (response as any).invitation?.id,
          actualStartTime: questRun.actualStartTime,
          scheduledEndTime: questRun.scheduledEndTime,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // Set as pending quest so the pending-quest screen can display it
      useQuestStore.getState().prepareQuest(completeQuest);

      // Prepare the quest timer (this will use the existing cooperative quest run)
      const QuestTimer = await import('@/lib/services/quest-timer').then(
        (m) => m.default
      );
      await QuestTimer.prepareQuest(completeQuest);

      // Create an invitation object for the store
      const firstInviteeParticipant = questRun?.participants?.[0];
      const hostId =
        (typeof firstInviteeParticipant === 'string'
          ? firstInviteeParticipant
          : firstInviteeParticipant?.userId) || '';
      setCurrentInvitation({
        id: (response as any).invitation?.id || '',
        questRunId: questRunId,
        questTitle: questRun.quest?.title || 'Cooperative Quest',
        questDuration: questRun.quest?.durationMinutes || 30,
        hostId: hostId,
        hostName: 'Friend',
        inviteeId: '',
        status: 'accepted' as const,
        expiresAt: Date.now() + 300000, // 5 minutes
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      queryClient.invalidateQueries({ queryKey: ['invitations', 'pending'] });

      // Don't navigate - the navigation state resolver will handle it
      // since we've set a pending quest
    },
    onError: (error) => {
      console.error('[useInvitationActions] Accept invitation failed:', error);
    },
  });

  const declineMutation = useMutation({
    mutationFn: declineInvitation,
    onMutate: (invitationId) => {
      console.log(
        '[useInvitationActions] Starting decline invitation mutation for:',
        invitationId
      );
    },
    onSuccess: () => {
      console.log('[useInvitationActions] Decline invitation successful');
      queryClient.invalidateQueries({ queryKey: ['invitations', 'pending'] });
    },
    onError: (error) => {
      console.error('[useInvitationActions] Decline invitation failed:', error);
    },
  });

  return {
    acceptInvitation: acceptMutation.mutate,
    declineInvitation: declineMutation.mutate,
    isAccepting: acceptMutation.isPending,
    isDeclining: declineMutation.isPending,
  };
}

/**
 * Hook for managing participant ready states
 */
export function useParticipantReady(questRunId: string | undefined) {
  const user = useUserStore((state) => state.user);
  const updateParticipantReady = useQuestStore(
    (state) => state.updateParticipantReady
  );
  const cooperativeQuestRun = useQuestStore(
    (state) => state.cooperativeQuestRun
  );
  const setCooperativeQuestRun = useQuestStore(
    (state) => state.setCooperativeQuestRun
  );
  const queryClient = useQueryClient();

  const setReady = useCallback(
    async (ready: boolean) => {
      if (!questRunId || !user) return;

      // Save previous state for rollback on error
      const previousReady =
        cooperativeQuestRun?.participants.find((p) => p.userId === user.id)
          ?.ready ?? false;

      try {
        // Update local state optimistically
        updateParticipantReady(user.id, ready);

        // Update server
        const response = await updateQuestRunStatus(
          questRunId,
          'active',
          null,
          ready
        );

        // Update the cooperative quest run with the server response
        if (response && cooperativeQuestRun) {
          setCooperativeQuestRun({
            ...cooperativeQuestRun,
            participants: Array.isArray(response.participants)
              ? response.participants.map((p: any) =>
                  typeof p === 'string'
                    ? { userId: p, ready: false, status: 'active' }
                    : p
                )
              : cooperativeQuestRun.participants,
            status: response.status as any,
            actualStartTime: response.actualStartTime,
            scheduledEndTime: response.scheduledEndTime,
            updatedAt: Date.now(),
          });
        }

        // Also invalidate the quest run query to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ['questRun', questRunId] });

        // Check if all participants are ready
        if (response.participants && Array.isArray(response.participants)) {
          const allReady = response.participants.every(
            (p: any) => typeof p === 'object' && p.ready === true
          );

          if (allReady && response.actualStartTime) {
            // Quest has started!
            return true;
          }
        }

        return false;
      } catch (error) {
        // Rollback optimistic update on failure
        updateParticipantReady(user.id, previousReady);
        console.error('Failed to update ready state:', error);
        throw error;
      }
    },
    [
      questRunId,
      user,
      updateParticipantReady,
      cooperativeQuestRun,
      setCooperativeQuestRun,
      queryClient,
    ]
  );

  const isUserReady =
    cooperativeQuestRun?.participants.find((p) => p.userId === user?.id)
      ?.ready || false;

  const allParticipantsReady =
    cooperativeQuestRun?.participants.every((p) => p.ready) || false;

  return {
    setReady,
    isUserReady,
    allParticipantsReady,
    participants: cooperativeQuestRun?.participants || [],
  };
}

/**
 * Main hook for cooperative quest management
 */
export function useCooperativeQuest() {
  const currentInvitation = useQuestStore((state) => state.currentInvitation);
  const cooperativeQuestRun = useQuestStore(
    (state) => state.cooperativeQuestRun
  );
  const setCooperativeQuestRun = useQuestStore(
    (state) => state.setCooperativeQuestRun
  );
  const pendingQuest = useQuestStore((state) => state.pendingQuest);

  const isCooperativeQuest =
    pendingQuest &&
    'inviteeIds' in pendingQuest &&
    pendingQuest.inviteeIds &&
    pendingQuest.inviteeIds.length > 0;

  // Monitor quest status during cooperative quest (only when pending)
  const questRunId = cooperativeQuestRun?.id;
  const { data: questRunStatus } = useQuestRunStatus(
    questRunId,
    !!questRunId && cooperativeQuestRun?.status === 'pending'
  );

  // Update local state when quest run status changes
  useEffect(() => {
    if (questRunStatus && setCooperativeQuestRun) {
      setCooperativeQuestRun({
        id: questRunStatus.id,
        questId: questRunStatus.quest?.id || `quest-${questRunStatus.id}`,
        hostId: cooperativeQuestRun?.hostId || '', // Keep existing hostId
        status: questRunStatus.status as any,
        participants: Array.isArray(questRunStatus.participants)
          ? questRunStatus.participants.map((p: any) =>
              typeof p === 'string'
                ? { userId: p, ready: false, status: 'pending' }
                : p
            )
          : [],
        invitationId: questRunStatus.invitationId,
        actualStartTime: questRunStatus.actualStartTime,
        scheduledEndTime: questRunStatus.scheduledEndTime,
        createdAt: cooperativeQuestRun?.createdAt || Date.now(),
        updatedAt: Date.now(),
      });

      // Check if quest failed by another participant
      if (
        questRunStatus.status === 'failed' &&
        cooperativeQuestRun?.status !== 'failed'
      ) {
        useQuestStore.getState().failQuest();
        router.replace('/quest-failed');
      }
    }
  }, [questRunStatus, setCooperativeQuestRun, cooperativeQuestRun?.status]);

  return {
    isCooperativeQuest,
    currentInvitation,
    cooperativeQuestRun,
    questRunStatus,
  };
}
