import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  acceptFriendInvitation,
  type FriendDetails,
  getUserFriends,
  getUserInvitations,
  type Invitation,
  rejectFriendInvitation,
  removeFriend,
  rescindInvitation,
  sendBulkFriendInvites,
  sendFriendInvite,
} from '@/lib/services/user';

type InviteFormData = {
  email: string;
};

interface BulkInviteResult {
  email: string;
  success: boolean;
  reason?: string;
}

// `sendBulkFriendInvites`'s declared return type (src/lib/services/user.ts) is
// missing `invalidEmails`, even though the server always includes it
// (unquest-server src/controllers/user.controller.js `sendBulkFriendInvites`).
// Extend the type locally rather than casting to `any` at each call site.
// Ideally this field should be added to the canonical return type in
// src/lib/services/user.ts.
type BulkInviteApiResponse = Awaited<
  ReturnType<typeof sendBulkFriendInvites>
> & {
  invalidEmails?: { email: string; reason: string }[];
};

type CombinedFriendEntry =
  | { type: 'invitation'; data: Invitation; id: string; incoming: true }
  | { type: 'friend'; data: FriendDetails; id: string }
  | { type: 'invitation'; data: Invitation; id: string; outgoing: true };

export function useFriendManagement(
  userEmail: string,
  contactsModalRef?: React.RefObject<any>
) {
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [rescindModalVisible, setRescindModalVisible] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState<FriendDetails | null>(
    null
  );
  const [invitationToRescind, setInvitationToRescind] =
    useState<Invitation | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const queryClient = useQueryClient();

  // Setup react-hook-form
  const formMethods = useForm<InviteFormData>({
    defaultValues: {
      email: '',
    },
    mode: 'onChange',
  });

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

  const inviteMutation = useMutation({
    mutationFn: sendFriendInvite,
    onSuccess: () => {
      setInviteSuccess('Friend invitation sent successfully!');
      formMethods.setValue('email', '');
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (error) => {
      if (
        axios.isAxiosError<{ message?: string }>(error) &&
        error.response?.data?.message
      ) {
        setInviteError(error.response.data.message);
      } else {
        setInviteError('Failed to send friend request');
      }
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

  const handleSendFriendRequest = useCallback(
    async (data: InviteFormData) => {
      if (data.email.trim().toLowerCase() === userEmail) {
        setInviteError('You cannot invite yourself as a friend');
        return;
      }
      inviteMutation.mutate(data.email.trim());
    },
    [inviteMutation, userEmail]
  );

  // Bulk invite handler
  const sendBulkInvites = useCallback(
    async (emails: string[]): Promise<BulkInviteResult[]> => {
      try {
        // Filter out user's own email before sending (safety check)
        const emailsToSend = emails.filter(
          (email) => email.trim().toLowerCase() !== userEmail.toLowerCase()
        );

        if (emailsToSend.length === 0) {
          return [
            {
              email: emails[0],
              success: false,
              reason: 'Cannot invite yourself',
            },
          ];
        }

        // Use the bulk endpoint
        const response: BulkInviteApiResponse =
          await sendBulkFriendInvites(emailsToSend);

        // Convert response to expected format
        const results: BulkInviteResult[] = [];
        const emailToResultMap = new Map<string, BulkInviteResult>();

        // Add successful emails
        if (
          response.successfulEmails &&
          Array.isArray(response.successfulEmails)
        ) {
          response.successfulEmails.forEach((email) => {
            emailToResultMap.set(email.toLowerCase(), {
              email,
              success: true,
            });
          });
        }

        // Add failed emails
        if (response.failedEmails && Array.isArray(response.failedEmails)) {
          response.failedEmails.forEach((failedItem) => {
            // `failedItem` is always `{ email, reason }` per the server response
            // (unquest-server user.controller.js `sendBulkFriendInvites`), so
            // `.email` is always a non-empty string and this fallback never
            // actually runs; the `as string` just satisfies the `||`
            // fallback's structural union without altering behavior.
            const email = (failedItem.email || failedItem) as string;
            const reason = failedItem.reason || 'Failed to send invitation';
            emailToResultMap.set(email.toLowerCase(), {
              email,
              success: false,
              reason,
            });
          });
        }

        // Add invalid emails
        if (response.invalidEmails && Array.isArray(response.invalidEmails)) {
          response.invalidEmails.forEach((invalidItem) => {
            // Same rationale as the `failedEmails` branch above: `invalidItem`
            // is always `{ email, reason }` at runtime, so this fallback is
            // unreachable and the cast is purely to satisfy the type checker.
            const email = (invalidItem.email || invalidItem) as string;
            const reason = invalidItem.reason || 'Invalid email address';
            emailToResultMap.set(email.toLowerCase(), {
              email,
              success: false,
              reason,
            });
          });
        }

        // Return results in the same order as input emails
        emailsToSend.forEach((email) => {
          const result = emailToResultMap.get(email.toLowerCase());
          if (result) {
            results.push(result);
          } else {
            // If email is not in any response array, mark as failed
            results.push({
              email,
              success: false,
              reason: 'No response from server',
            });
          }
        });

        // Invalidate queries after bulk invites are sent
        await queryClient.invalidateQueries({ queryKey: ['invitations'] });

        return results;
      } catch (error: any) {
        console.error('Bulk invite error:', error);
        // If the bulk endpoint fails entirely, return all emails as failed
        return emails.map((email) => ({
          email,
          success: false,
          reason: error.response?.data?.message || 'Failed to send invitations',
        }));
      }
    },
    [userEmail, queryClient]
  );

  const handleInviteFriends = useCallback(() => {
    contactsModalRef?.current?.present();
  }, [contactsModalRef]);

  const handleCloseInviteModal = useCallback(() => {
    contactsModalRef?.current?.dismiss();
    setInviteError('');
    setInviteSuccess('');
    formMethods.reset();
  }, [formMethods, contactsModalRef]);

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
    inviteError,
    inviteSuccess,
    formMethods,
    handleInviteFriends,
    handleCloseInviteModal,
    handleDeleteFriend,
    handleConfirmDelete,
    handleCancelDelete,
    handleRescindInvitation,
    handleConfirmRescind,
    handleCancelRescind,
    handleSendFriendRequest,
    handleAcceptInvitation,
    handleRejectInvitation,
    isOutgoingInvitation,
    acceptMutation,
    rejectMutation,
    rescindMutation,
    inviteMutation,
    sendBulkInvites,
  };
}
