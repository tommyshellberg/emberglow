import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import {
  acceptFriendInvitation,
  type FriendDetails,
  getUserFriends,
  getUserInvitations,
  type Invitation,
  rejectFriendInvitation,
  removeFriend,
  rescindInvitation,
} from '@/lib/services/user';

type CombinedFriendEntry =
  | { type: 'invitation'; data: Invitation; id: string; incoming: true }
  | { type: 'friend'; data: FriendDetails; id: string }
  | { type: 'invitation'; data: Invitation; id: string; outgoing: true };

export function useFriendManagement(userEmail: string) {
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [rescindModalVisible, setRescindModalVisible] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState<FriendDetails | null>(
    null
  );
  const [invitationToRescind, setInvitationToRescind] =
    useState<Invitation | null>(null);

  const queryClient = useQueryClient();

  // Queries
  const {
    data: friendsData,
    isLoading: isLoadingFriends,
    refetch: refetchFriends,
  } = useQuery({
    queryKey: ['friends'],
    queryFn: () => getUserFriends(1),
  });

  const {
    data: invitationsData,
    isLoading: isLoadingInvitations,
    refetch: refetchInvitations,
  } = useQuery({
    queryKey: ['invitations', 'pending'],
    queryFn: () => getUserInvitations('pending'),
  });

  // Function to determine if an invitation is outgoing
  const isOutgoingInvitation = useCallback(
    (invitation: Invitation) => {
      return invitation.sender.email.toLowerCase() === userEmail.toLowerCase();
    },
    [userEmail]
  );

  // Combined data derived from queries
  const combinedData = useMemo(() => {
    const friends = friendsData?.friends || [];
    const invitations = invitationsData?.results || [];

    // Create a Map to track emails we've already seen
    const seenEmails = new Map<string, boolean>();
    const result: CombinedFriendEntry[] = [];

    // First process incoming invitations
    invitations
      .filter((inv) => !isOutgoingInvitation(inv))
      .forEach((inv) => {
        const email = inv.sender.email.toLowerCase();
        if (!seenEmails.has(email)) {
          seenEmails.set(email, true);
          result.push({
            type: 'invitation',
            data: inv,
            id: inv.id,
            incoming: true,
          });
        }
      });

    // Then process friends
    friends.forEach((friend) => {
      const email = friend.email.toLowerCase();
      if (!seenEmails.has(email)) {
        seenEmails.set(email, true);
        result.push({
          type: 'friend',
          data: friend,
          id: friend._id,
        });
      }
    });

    // Finally process outgoing invitations
    invitations
      .filter((inv) => isOutgoingInvitation(inv))
      .forEach((inv) => {
        const email = inv.recipient.toLowerCase();
        if (!seenEmails.has(email)) {
          seenEmails.set(email, true);
          result.push({
            type: 'invitation',
            data: inv,
            id: inv.id,
            outgoing: true,
          });
        }
      });

    return result;
  }, [friendsData, invitationsData, userEmail, isOutgoingInvitation]);

  // Mutations
  const acceptMutation = useMutation({
    mutationFn: acceptFriendInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectFriendInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: removeFriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });

  const rescindMutation = useMutation({
    mutationFn: rescindInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  // Handlers
  const handleAcceptInvitation = useCallback(
    (invitationId: string) => {
      if (
        acceptMutation.isPending &&
        acceptMutation.variables === invitationId
      ) {
        return;
      }
      acceptMutation.mutate(invitationId);
    },
    [acceptMutation]
  );

  const handleRejectInvitation = useCallback(
    (invitationId: string) => {
      if (
        rejectMutation.isPending &&
        rejectMutation.variables === invitationId
      ) {
        return;
      }
      rejectMutation.mutate(invitationId);
    },
    [rejectMutation]
  );

  const handleDeleteFriend = useCallback((friend: FriendDetails) => {
    setFriendToDelete(friend);
    setDeleteModalVisible(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (friendToDelete) {
      removeFriendMutation.mutate(friendToDelete._id);
      setDeleteModalVisible(false);
      setFriendToDelete(null);
    }
  }, [friendToDelete, removeFriendMutation]);

  const handleCancelDelete = useCallback(() => {
    setDeleteModalVisible(false);
    setFriendToDelete(null);
  }, []);

  const handleRescindInvitation = useCallback((invitation: Invitation) => {
    setInvitationToRescind(invitation);
    setRescindModalVisible(true);
  }, []);

  const handleConfirmRescind = useCallback(() => {
    if (invitationToRescind) {
      rescindMutation.mutate(invitationToRescind.id);
      setRescindModalVisible(false);
      setInvitationToRescind(null);
    }
  }, [invitationToRescind, rescindMutation]);

  const handleCancelRescind = useCallback(() => {
    setRescindModalVisible(false);
    setInvitationToRescind(null);
  }, []);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchFriends(), refetchInvitations()]);
    setRefreshing(false);
  }, [refetchFriends, refetchInvitations]);

  return {
    friendsData,
    invitationsData,
    combinedData,
    isLoadingFriends,
    isLoadingInvitations,
    refreshing,
    onRefresh,
    deleteModalVisible,
    rescindModalVisible,
    friendToDelete,
    invitationToRescind,
    handleDeleteFriend,
    handleConfirmDelete,
    handleCancelDelete,
    handleRescindInvitation,
    handleConfirmRescind,
    handleCancelRescind,
    handleAcceptInvitation,
    handleRejectInvitation,
    isOutgoingInvitation,
    acceptMutation,
    rejectMutation,
    rescindMutation,
  };
}
